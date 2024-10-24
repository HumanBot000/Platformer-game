const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game Variables
let player;
let platforms = [];
let lavaY;
let spawn = { x: 50, y: 220 }; // Default spawn point
let levelWidth; // Set based on loaded level
let levelHeight; // Set based on loaded level
let camera; // Declare camera variable

// Key status
const keys = {};

// Player Class
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
        for (let platform of platforms) {
            if (this.checkCollision(platform)) {
                // Check if the player falls onto the platform
                if (this.dy > 0 && this.y + this.height <= platform.y + this.dy) {
                    this.y = platform.y - this.height; // Set player on platform
                    this.dy = 0; // Reset vertical speed
                    this.grounded = true; // Player is now on the ground
                } else if (this.dy < 0) {
                    // Player jumps and hits the platform from below
                    this.y = platform.y + platform.height; // Set player on platform
                    this.dy = 0; // Reset vertical speed
                }
                break; // Exit loop if collision is detected
            }
        }

        // Draw player
        ctx.fillStyle = '#FF0000'; // Player color
        ctx.fillRect(this.x - camera.x, this.y - camera.y, this.width, this.height); // Draw player considering camera offset
    }

    checkCollision(platform) {
        return (
            this.x < platform.x + platform.width &&
            this.x + this.width > platform.x &&
            this.y < platform.y + platform.height &&
            this.y + this.height > platform.y
        );
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

    // No drawing of colliders
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
    constructor(x, y, width, height, tileSrc, tileSize) {
        // Check if width is divisible by tileSize, if not adjust
        const remainder = width % tileSize;
        const adjustedWidth = remainder === 0 ? width : width + (tileSize - remainder); // Adjust width to be divisible by tileSize

        super(x, y, adjustedWidth, height); // Set collider width to adjustedWidth
        this.tile = new Image(); // Create a new Image object for the tile
        this.tile.src = tileSrc; // Load the tile texture
        this.tileSize = tileSize; // Size of each tile (assuming square tiles)
    }

    draw(cameraOffsetX, cameraOffsetY) {
        const numTiles = Math.ceil(this.width / this.tileSize); // Number of tiles needed for the platform
        for (let i = 0; i < numTiles; i++) {
            ctx.drawImage(this.tile, this.x - cameraOffsetX + i * this.tileSize, this.y - cameraOffsetY, this.tileSize, this.tileSize);
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

    // Create platforms with textures
    platforms = data.platforms.map(p => new Platform(p.x, p.y, p.width, p.height, p.tileSrc, 48));
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

    // Draw platforms
    for (let platform of platforms) {
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
