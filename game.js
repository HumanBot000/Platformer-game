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
let lavaRising = false;
let lavaSpeed = 0;
let lavaTexture = new Image();

// Key status
const keys = {};

class Player {
    constructor(x, y, width = 30, height = 30, textureSrc = null) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.speed = 5;
        this.dy = 0;
        this.gravity = 0.5;
        this.jumpStrength = -12;
        this.grounded = false;

        // Load texture if specified
        this.texture = new Image();
        if (textureSrc) {
            this.texture.src = textureSrc;
        }
    }

    update() {
        // Collision detection variables
        const playerTop = this.y;
        const playerBottom = this.y + this.height;
        const playerLeft = this.x;
        const playerRight = this.x + this.width;
    
        // Reset grounded status
        this.grounded = false;
    
        // Apply gravity
        this.dy += this.gravity; // Apply gravity
        this.y += this.dy; // Update player vertical position
    
        // Collision with lava
        if (this.y + this.height >= lavaY) {
            this.reset(); // Reset if the player hits lava
        }
    
        for (let platform of platforms) {
            if (!this.checkCollision(platform)) {
                continue;}
            // Handle vertical collisions
            if (this.dy > 0 && playerBottom <= platform.y + this.dy) {
                // Colliding from above
                this.y = platform.y - this.height; // Place player on top of the platform
                    this.dy = 0; // Reset vertical speed
                    this.grounded = true; // Pla
                // Move player with the platform based on its direction
                if (platform instanceof MovingPlatform) {
                    if (platform.direction === "horizontal") {
                        this.x += platform.movingForward ? platform.speed : -platform.speed; // Apply platform's speed based on direction
                    } else {
                        this.y += platform.movingForward ? platform.speed : -platform.speed; // Apply platform's speed based on direction
                    }
                }
                continue
            }  
            if (this.dy < 0 && playerBottom >= platform.y) {
                // Colliding from below
                if (!(platform instanceof ScaffoldPlatform)) { 
                    this.y = platform.y + platform.height; 
                    this.dy = 0; 
                }
            } else {
                // Handle horizontal collisions
                const platformTop = platform.y;
                const platformBottom = platform.y + platform.height;
                const platformLeft = platform.x;
                const platformRight = platform.x + platform.width;
                const isCollidingFromLeft = playerRight > platformLeft && playerLeft < platformLeft && playerBottom > platformTop && playerTop < platformBottom;
                const isCollidingFromRight = playerLeft < platformRight && playerRight > platformRight && playerBottom > platformTop && playerTop < platformBottom;
                const isNearLeft = playerRight > platformLeft && playerLeft < platformLeft;
                const isNearRight = playerLeft < platformRight  && playerRight > platformRight;
                if (isCollidingFromLeft || (isNearLeft && isCollidingFromLeft)) {
                    this.x = platformLeft - this.width; // Move player to the left of the platform
                } else if (isCollidingFromRight || (isNearRight && isCollidingFromRight)) {
                    this.x = platformRight; // Move player to the right of the platform
                }
            }
        }
    
        // Draw player
        if (this.texture && this.texture.complete) {
            ctx.drawImage(this.texture, this.x - camera.x, this.y - camera.y, this.width, this.height);
        } else {
            ctx.fillStyle = '#FF0000';
            ctx.fillRect(this.x - camera.x, this.y - camera.y, this.width, this.height);
        }
    }
    




    checkCollision(platform) {
        const playerTop = this.y;
        const playerBottom = this.y + this.height;
        const playerLeft = this.x;
        const playerRight = this.x + this.width;

        const platformTop = platform.y;
        const platformBottom = platform.y + platform.height;
        const platformLeft = platform.x;
        const platformRight = platform.x + platform.width;

        const isCollidingFromAbove = playerBottom >= platformTop && playerTop < platformTop && playerRight > platformLeft && playerLeft < platformRight;
        const isCollidingFromBelow = playerTop <= platformBottom && playerBottom > platformBottom && playerRight > platformLeft && playerLeft < platformRight;

        const isCollidingFromLeft = playerRight > platformLeft && playerLeft < platformLeft && playerBottom > platformTop && playerTop < platformBottom;
        const isCollidingFromRight = playerLeft < platformRight && playerRight > platformRight && playerBottom > platformTop && playerTop < platformBottom;

        return isCollidingFromAbove || isCollidingFromBelow || isCollidingFromLeft || isCollidingFromRight;
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

class Platform extends Collider {
    constructor(x, y, width, height, tileSrc, tileSize) {
        super(x, y, Math.round(width / tileSize) * tileSize, height);
        this.width = Math.round(width / tileSize) * tileSize;
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
    update() {
    }
}

// Static Platform Class
class StaticPlatform extends Platform {
    constructor(x, y, width, height, tileSrc, tileSize) {
        super(x, y, width, height, tileSrc, tileSize,);
    }
}
class ScaffoldPlatform extends Platform {
    constructor(x, y, width, height, tileSrc, tileSize) {
        super(x, y, width, height, tileSrc, tileSize);
    }

    // Override the checkCollision method
    checkCollision(player) {
        const playerTop = player.y;
        const playerBottom = player.y + player.height;
        const playerLeft = player.x;
        const playerRight = player.x + player.width;

        const platformTop = this.y;
        const platformBottom = this.y + this.height;
        const platformLeft = this.x;
        const platformRight = this.x + this.width;

        // Allow jumping through the platform from below
        const isCollidingFromBelow = playerBottom >= platformTop && playerTop < platformTop && playerRight > platformLeft && playerLeft < platformRight;

        // Collision detection when the player is on top of the platform
        const isCollidingFromAbove = playerBottom >= platformTop && playerTop < platformTop && playerRight > platformLeft && playerLeft < platformRight;

        // Check if the player is on the platform (colliding from above)
        const isOnPlatform = isCollidingFromAbove && playerBottom <= platformBottom;

        // Return true if the player is on the platform, or if they're below it (allowing jump through)
        return isOnPlatform || (isCollidingFromBelow && !isOnPlatform);
    }
}
class MovingPlatform extends Platform {
    constructor(x, y, width, height, tileSrc, tileSize, speed, direction, range) {
        super(x, y, width, height, tileSrc, tileSize,);
        this.speed = speed || 0; // Movement speed for moving platforms
        this.direction = direction || "horizontal"; // Movement direction
        this.range = range || { start: x, end: x }; // Movement range
        this.movingForward = true; // Movement state
    }

    update() {
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

function getTextureScale(textureSrc, textureScales) {
    const textureInfo = textureScales.find(t => t.texture === textureSrc);
    return textureInfo ? textureInfo.scale : 48; // Default to 48 if not found
}

// Load Level from JSON
async function loadLevel(level) {
    const response = await fetch(`levels/${level}.json`);
    const data = await response.json();

    // Set spawn point
    spawn = data.spawn;

    // Load player with properties from JSON
    const playerData = data.player || {};
    const playerTexture = playerData.texture || null;
    const playerWidth = playerData.width || 30;
    const playerHeight = playerData.height || 30;
    player = new Player(spawn.x, spawn.y, playerWidth, playerHeight, playerTexture);

    // Lava properties
    lavaY = data.lava.initialY || canvas.height - 30;
    lavaRising = data.lava.rising || false;
    lavaSpeed = data.lava.speed || 0;
    lavaTexture.src = data.lava.lavaSrc;

    // Level boundaries
    levelWidth = data.width || 2000;
    levelHeight = data.height || 1000;

    // Create platforms
    platforms = data.platforms.map(p => {
        const tileSize = getTextureScale(p.tileSrc, data.textureScales);
        if (p.type === "moving") {
            return new MovingPlatform(
                p.x,
                p.y,
                p.width,
                p.height,
                p.tileSrc,
                tileSize,
                p.speed || 0,
                p.direction || "horizontal",
                p.range || { start: p.x, end: p.x }
            );
        }
        if (p.type == "scaffold") {
            return new ScaffoldPlatform(
                p.x,
                p.y,
                p.width,
                p.height,
                p.tileSrc,
                tileSize,
            );
        }
        return new StaticPlatform(
            p.x,
            p.y,
            p.width,
            p.height,
            p.tileSrc,
            tileSize,
        );
    });
    colliders = platforms;

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
    if (lavaRising) lavaY -= lavaSpeed; // Move lava up if rising

    if (lavaTexture.complete) { // Lava-Textur nur zeichnen, wenn geladen
        const tileWidth = 16; // Breite einer Lava-Kachel
        const tileHeight = 7; // Höhe einer Lava-Kachel
        const tilesX = Math.ceil(canvas.width / tileWidth); // Anzahl der Kacheln horizontal
        const tilesY = Math.ceil((canvas.height - lavaY) / tileHeight); // Anzahl der Kacheln vertikal

        for (let y = 0; y < tilesY; y++) {
            for (let x = 0; x < tilesX; x++) {
                ctx.drawImage(
                    lavaTexture,
                    x * tileWidth,
                    lavaY - camera.y + y * tileHeight,
                    tileWidth,
                    tileHeight
                );
            }
        }
    } else {
        // Fallback-Farbe für Lava, falls Textur nicht geladen
        ctx.fillStyle = '#FF4500';
        ctx.fillRect(0, lavaY - camera.y, canvas.width, canvas.height - lavaY);
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
    update();
    setInterval(update, 1000 / 60); // 60 FPS
}

init();
