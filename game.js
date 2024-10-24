const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game Variables
let player;
let platforms = [];
let colliders = [];
let lavaY;
let spawn = { x: 50, y: 220 }; // Default spawn point
let levelWidth; // Set based on loaded level
let levelHeight; // Set based on loaded level
let camera; // Declare camera variable

// Key status
const keys = {};
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.speed = 5;
        this.dy = 0;
        this.gravity = 0.5; // Gravity
        this.jumpStrength = -12;
        this.grounded = false;
        this.currentPlatform = null; // Keep track of the current platform
    }

    update() {
        // Collision with the lava
        if (this.y + this.height >= lavaY) {
            this.reset();
        }
    
        this.dy += this.gravity; // Apply gravity
        this.y += this.dy; // Update player position
    
        // Reset grounded status
        this.grounded = false;
        this.currentPlatform = null; // Reset current platform
    
        for (let platform of platforms) {
            if (this.checkCollision(platform)) {
                // Check if the player falls onto the platform
                if (this.dy > 0 && this.y + this.height <= platform.y + this.dy) {
                    this.y = platform.y - this.height; // Set player on platform
                    this.dy = 0; // Reset vertical speed
                    this.grounded = true; // Player is now on the ground
                    this.currentPlatform = platform; // Set current platform
                } else if (this.dy < 0) {
                    // Player jumps and hits the platform from below
                    this.y = platform.y + platform.height; // Set player above platform
                    this.dy = 0; // Reset vertical speed
                }
    
                // Adjust player's horizontal position based on platform movement
                if (this.grounded && this.currentPlatform.type === "moving") {
                    // Move player with platform based on its direction
                    if (this.currentPlatform.movingForward) {
                        this.x += this.currentPlatform.speed; // Moving right
                    } else {
                        this.x -= this.currentPlatform.speed; // Moving left
                    }
                }
                break; // Exit loop if collision is detected
            }
        }
    
        // Draw player
        ctx.fillStyle = '#FF0000'; // Player color
        ctx.fillRect(this.x - camera.x, this.y - camera.y, this.width, this.height); // Draw player considering camera offset
    }
    
    

    checkCollision(platform) {
        const isCollidingFromAbove = this.x < platform.x + platform.width &&
                                      this.x + this.width > platform.x &&
                                      this.y + this.height <= platform.y + this.dy &&
                                      this.y + this.height >= platform.y;
        
        const isCollidingFromBelow = this.x < platform.x + platform.width &&
                                      this.x + this.width > platform.x &&
                                      this.y >= platform.y + platform.height &&
                                      this.y <= platform.y + platform.height + this.dy;
    
        const isCollidingFromSides = this.x < platform.x + platform.width &&
                                      this.x + this.width > platform.x &&
                                      this.y < platform.y + platform.height &&
                                      this.y + this.height > platform.y;
    
        return isCollidingFromAbove || isCollidingFromBelow || isCollidingFromSides;
    }
    

    jump() {
        if (this.grounded) {
            this.dy = this.jumpStrength; // Apply jump strength
            this.grounded = false; // Player is no longer grounded
        }
    }

    reset() {
        // Reset player position to spawn point
        this.x = spawn.x;
        this.y = spawn.y;
        this.dy = 0;
    }
}


// Collider Class
class Collider {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    checkCollision(player) {
        return (
            player.x < this.x + this.width &&
            player.x + player.width > this.x &&
            player.y < this.y + this.height &&
            player.y + player.height > this.y
        );
    }
}

// Platform Class (inherits from Collider)
class Platform extends Collider {
    constructor(x, y, width, height, tileSrc, tileSize, type, speed, direction, range) {
        super(x, y, width, height);
        this.tile = new Image(); // Create a new Image object for the tile
        this.tile.src = tileSrc; // Load the tile texture
        this.tileSize = tileSize; // Size of each tile (assuming square tiles)
        this.type = type; // Platform type
        this.speed = speed || 0; // Movement speed for moving platforms
        this.direction = direction || "horizontal"; // Movement direction
        this.range = range || { start: x, end: x }; // Movement range
        this.movingForward = true; // Movement state
    }

    draw(cameraOffsetX, cameraOffsetY) {
        const numTiles = Math.ceil(this.width / this.tileSize); // Number of tiles needed for the platform
        for (let i = 0; i < numTiles; i++) {
            ctx.drawImage(this.tile, this.x - cameraOffsetX + i * this.tileSize, this.y - cameraOffsetY, this.tileSize, this.tileSize);
        }
    }

    update() {
        // Update the position of the platform if it's moving
        if (this.type === "moving") {
            if (this.direction === "horizontal") {
                if (this.movingForward) {
                    this.x += this.speed;
                    if (this.x >= this.range.end) {
                        this.movingForward = false; // Change direction
                    }
                } else {
                    this.x -= this.speed;
                    if (this.x <= this.range.start) {
                        this.movingForward = true; // Change direction
                    }
                }
            } else if (this.direction === "vertical") {
                if (this.movingForward) {
                    this.y += this.speed;
                    if (this.y >= this.range.end) {
                        this.movingForward = false; // Change direction
                    }
                } else {
                    this.y -= this.speed;
                    if (this.y <= this.range.start) {
                        this.movingForward = true; // Change direction
                    }
                }
            }
        }
    }
    
}

// Camera Class
class Camera {
    constructor() {
        this.x = 0;
        this.y = 0;
    }

    update(player, canvasWidth, canvasHeight) {
        // Center camera on player both horizontally and vertically
        this.x = player.x - canvasWidth / 2 + player.width / 2;
        this.y = player.y - canvasHeight / 2 + player.height / 2; // Center camera vertically on player
    }
}

// Load Level from JSON
async function loadLevel(level) {
    const response = await fetch(`levels/${level}.json`);
    const data = await response.json();

    spawn = data.spawn; // Set spawn point
    player = new Player(spawn.x, spawn.y); // Create player with spawn point
    lavaY = canvas.height - 30; // Set lava height
    levelWidth = data.width || 2000; // Set level width, or default to 2000
    levelHeight = data.height || 1000; // Set level height, or default to 1000

    // Create platforms and colliders with textures
    platforms = data.platforms.map(p => new Platform(
        p.x,
        p.y,
        p.width,
        p.height,
        p.tileSrc,
        48, // Tile size
        p.type || "static", // Default to static if not specified
        p.speed || 0, // Default speed to 0 for static
        p.direction || "horizontal", // Default direction
        p.range || { start: p.x, end: p.x } // Default range to its own position
    ));
    colliders = platforms; // In this case, colliders are the platforms
}

// Move Player
function movePlayer() {
    if (keys['ArrowRight']) {
        player.x += player.speed; // Move right
    }
    if (keys['ArrowLeft']) {
        player.x -= player.speed; // Move left
    }

    // Limit player position to prevent leaving the canvas
    player.x = Math.max(0, player.x);
    player.x = Math.min(levelWidth - player.width, player.x); // Keep player within level bounds
}

// Update Game State
function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Move player
    movePlayer();

    // Update camera based on player position
    camera.update(player, canvas.width, canvas.height);

    // Update platforms and colliders, and draw them
    for (let platform of platforms) {
        platform.update(); // Update the platform's position if moving
        // Only draw if within visible bounds (for optimization)
        if (platform.y + platform.height > camera.y && platform.y < camera.y + canvas.height &&
            platform.x + platform.width > camera.x && platform.x < camera.x + canvas.width) {
            platform.draw(camera.x, camera.y); // Draw platforms with camera offset
        }
    }

    // Update player and draw
    player.update();

    // Draw lava
    if (lavaY > 0 && lavaY < canvas.height) {
        ctx.fillStyle = '#FF4500'; // Lava color
        ctx.fillRect(0, lavaY - camera.y, canvas.width, canvas.height - (lavaY - camera.y));
    }
}

// Capture Key Inputs
window.addEventListener('keydown', (e) => {
    keys[e.code] = true; // Key pressed
    if (e.code === 'Space') {
        player.jump(); // Jump
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.code] = false; // Key released
});

// Initialize Game
async function init() {
    camera = new Camera(); // Create camera instance
    await loadLevel('level1'); // Load the level
    setInterval(update, 1000 / 60); // 60 FPS
}

init();
