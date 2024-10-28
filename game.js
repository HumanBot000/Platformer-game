const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
// Game Variables
let levelCompleted = false;
let timer = 0; // Elapsed time in seconds
let timerActive = false; // Timer state
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
let endX = 10**10**10;
let currentLevel = "gpt"
let highScore = parseFloat(localStorage.getItem(`highScore${currentLevel}`)) || 50000;
// Key status
const keys = {};

class Player {
    constructor(x, y, width = 30, height = 30, textureSrc = null) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.speed = 5;
        this.originalSpeed = this.speed; // Store original speed
        this.speedBoostActive = false; // Track if speed boost is active
        this.speedBoostDuration = 0; // Duration for the boost
        this.jumpBoostActive = false; // Track if speed boost is active
        this.jumpBoostDuration = 0; // Duration for the boost
        this.dy = 0;
        this.gravity = 0.5;
        this.jumpStrength = -12;
        this.grounded = false;
        this.lastCheckpoint = null;
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
                continue;
            }
            platform.touched = true;
            // Handle vertical collisions
            if (this.dy > 0 && playerBottom <= platform.y + this.dy) {
                // Colliding from above
                this.y = platform.y - this.height; // Place player on top of the platform
                this.dy = 0; // Reset vertical speed
                this.grounded = true;
                if (platform instanceof BreakingPlatform) {
                    platform.update(1000 / 60); // Update the platform's state (assuming 60 FPS)
                }
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
                const isNearRight = playerLeft < platformRight && playerRight > platformRight;
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
        if (this.lastCheckpoint) {
            loadLevel(currentLevel, { x: this.lastCheckpoint.x, y: this.lastCheckpoint.y });
            this.dy = 0;
        } else {
            loadLevel(currentLevel, null);
        }
    }



    collectSpeedBoost(boostAmount, duration) {
        if (!this.speedBoostActive) {
            this.speed += boostAmount; // Increase speed
            this.speedBoostActive = true; // Activate speed boost
            this.speedBoostDuration = duration; // Set boost duration
            setTimeout(() => {
                this.speed -= boostAmount; // Revert speed after duration
                this.speedBoostActive = false; // Deactivate speed boost
            }, duration);
        }
    }

    collectJumpBoost(boostAmount,duration){
        if (!this.jumpBoostActive) {
            this.jumpStrength -= boostAmount; // Increase speed
            this.jumpBoostBoostActive = true; // Activate speed boost
            this.jumpBoostDuration = duration; // Set boost duration
            setTimeout(() => {
                this.jumpStrength += boostAmount; // Revert speed after duration
                this.jumpBoostActive = false; // Deactivate speed boost
            }, duration);
        }
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
class BreakingPlatform extends Platform {
    constructor(x, y, width, height, tileSrc, tileSize, breakTime) {
        super(x, y, width, height, tileSrc, tileSize);
        this.breakTime = breakTime; // Time in milliseconds before the platform breaks
        this.timer = 0; // Timer for the breaking state
        this.broken = false; // Track if the platform is broken
        this.touched = false;
    }

    update(deltaTime) {
        if (this.broken) return; // Do nothing if the platform is broken

        // Increment timer
        if (this.touched) this.timer += deltaTime;

        // Check if the timer exceeds the break time
        if (this.timer >= this.breakTime) {
            this.broken = true; // Mark as broken
        }
    }

    draw(cameraOffsetX, cameraOffsetY) {
        if (this.broken) return; // Do not draw if broken

        // Calculate the damage level based on the timer
        const damageLevel = Math.min(this.timer / this.breakTime, 1); // Value between 0 and 1
        const alpha = 1 - damageLevel; // Fade out as it breaks

        ctx.globalAlpha = alpha; // Set transparency based on damage level
        super.draw(cameraOffsetX, cameraOffsetY); // Call the base class draw method
        ctx.globalAlpha = 1; // Reset transparency
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
// Load Level from JSON
async function loadLevel(level, customSpawn = null) {
    const response = await fetch(`./levels/${level}.json`);
    const data = await response.json();

    // Set spawn point
    spawn = customSpawn || data.spawn;

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
     endX = levelWidth-10;
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
        if (p.type === "breaking") {
            return new BreakingPlatform(
                p.x,
                p.y,
                p.width,
                p.height,
                p.tileSrc,
                tileSize,
                p.breakTime
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

    speedItems = data.speedItems.map(item => new SpeedItem(item.x, item.y, item.duration, item.speedBoost, "textures/speed-boost.png"));
    jumpItems = data.jumpItems.map(item => new JumpBoostItem(item.x, item.y, item.duration, item.jumpBoost, "textures/jump-boost.png"));
    checkpoints = data.checkpoints.map(cp => new Checkpoint(
        cp.x,
        cp.y,
        cp.width,
        cp.height,
    ));
    colliders = platforms;
}


class SpeedItem extends Collider {
    constructor(x, y, duration, speedBoost, imageSrc) {
        super(x, y, 20, 20); // Set the size of the item
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.duration = duration; // Duration of speed boost
        this.speedBoost = speedBoost; // Amount of speed boost
        this.collected = false; // Track if collected

        // Load the image for the speed item
        this.image = new Image();
        this.image.src = imageSrc;
    }

    update(player) {
        if (this.collected) return; // Do nothing if already collected

        // Check for collision with the player
        if (this.checkCollision(player)) {
            player.collectSpeedBoost(this.speedBoost, this.duration); // Apply speed boost
            this.collected = true; // Mark as collected
        }
    }

    draw(cameraOffsetX, cameraOffsetY) {
        if (this.collected) return; // Don't draw if collected

        // Draw the image instead of a rectangle
        if (this.image.complete) { // Ensure the image is loaded
            ctx.drawImage(
                this.image,
                this.x - cameraOffsetX,
                this.y - cameraOffsetY,
                this.width,
                this.height
            );
        } else {
            // If the image isn’t loaded yet, you could display a temporary placeholder
            ctx.fillStyle = 'gold';
            ctx.fillRect(this.x - cameraOffsetX, this.y - cameraOffsetY, this.width, this.height);
        }
    }
}

class JumpBoostItem extends Collider{
    constructor(x, y, duration, jumpBoost, imageSrc) {
        super(x, y, 20, 20); // Set the size of the item
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.duration = duration; // Duration of speed boost
        this.jumpBoost = jumpBoost; // Amount of speed boost
        this.collected = false; // Track if collected
        // Load the image for the speed item
        this.image = new Image();
        this.image.src = imageSrc;
    }

    update(player) {
        if (this.collected) return; // Do nothing if already collected
        // Check for collision with the player
        if (this.checkCollision(player)) {
            player.collectJumpBoost(this.jumpBoost, this.duration); // Apply speed boost
            this.collected = true; // Mark as collected
        }
    }

    draw(cameraOffsetX, cameraOffsetY) {
        if (this.collected) return; // Don't draw if collected

        // Draw the image instead of a rectangle
        if (this.image.complete) { // Ensure the image is loaded
            ctx.drawImage(
                this.image,
                this.x - cameraOffsetX,
                this.y - cameraOffsetY,
                this.width,
                this.height
            );
        } else {
            // If the image isn’t loaded yet, you could display a temporary placeholder
            ctx.fillStyle = 'gold';
            ctx.fillRect(this.x - cameraOffsetX, this.y - cameraOffsetY, this.width, this.height);
        }
    }
}
class Checkpoint extends Collider {
    constructor(x, y, width, height) {
        super(x, y, width, height);
        this.touched = false; // Track if the checkpoint has been touched
        this.touchedImage = new Image();
        this.untouchedImage = new Image();
        this.touchedImage.src = "textures/checkpoint-touched.png"; // Image for touched checkpoint
        this.untouchedImage.src = "textures/checkpoint-untouched.png"; // Image for untouched checkpoint
    }

    update(player) {
        // Check for collision with the player
        if (!this.touched && this.checkCollision(player)) {
            this.touched = true; // Mark as touched
        }
    }

    draw(cameraOffsetX, cameraOffsetY) {
        const imageToDraw = this.touched ? this.touchedImage : this.untouchedImage;
        if (imageToDraw.complete) { // Ensure the image is loaded before drawing
            ctx.drawImage(imageToDraw, this.x - cameraOffsetX, this.y - cameraOffsetY, this.width, this.height);
        }
    }
}



// Move Player
function movePlayer() {
    if (keys['ArrowRight'] || keys["KeyD"]) {
        player.x += player.speed; // Move right
    }
    if (keys['ArrowLeft'] || keys["KeyA"]) {
        player.x -= player.speed; // Move left
    }

    // Limit player position to prevent leaving the canvas
    player.x = Math.max(0, player.x);
    player.x = Math.min(levelWidth, player.x); // Keep player within level bounds
}

// Update Game State
function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Move player
    movePlayer();
    if (player.x >= endX) {
        timerActive = false;
        ctx.fillStyle = 'black';
        ctx.font = '30px Arial';
        ctx.fillText('Level Completed!', canvas.width / 2 - 100, canvas.height / 2);
        ctx.fillText(`Time: ${timer.toFixed(2)} seconds`, canvas.width / 2 - 100, canvas.height / 2 + 40);
        if (parseFloat(timer) < parseFloat(highScore)) {
            localStorage.setItem(`highScore${currentLevel}`, timer);
        }
        highScore = parseFloat(localStorage.getItem(`highScore${currentLevel}`));
        if (!levelCompleted){
            levelCompleted = true;
            setTimeout(() => {
                alert(`Your best Time: ${highScore.toFixed(2)} seconds`);
                console.log("reload");
                location.reload();
            }, 200); 
        }
        return;
    }

    // Update camera based on player position
    camera.update(player, canvas.width, canvas.height);

    // Update platforms and colliders, and draw them
    for (let i = platforms.length - 1; i >= 0; i--) {
        const platform = platforms[i];
        const deltaTime = 1000 / 60; // Assuming 60 FPS, calculate delta time
        platform.update(deltaTime); // Update the platform's state
        if (platform.broken) {
            platforms.splice(i, 1);
            continue;
        }
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
    for (let speedItem of speedItems) {
        speedItem.update(player); // Update each speed item
        speedItem.draw(camera.x, camera.y); // Draw each speed item
    }
    for (let jumpItem of jumpItems){
        jumpItem.update(player);
        jumpItem.draw(camera.x,camera.y)
    }
    for (let checkpoint of checkpoints) {
        checkpoint.update(player); // Update checkpoint state
        checkpoint.draw(camera.x, camera.y); // Draw checkpoint
        if (checkpoint.touched) {
            player.lastCheckpoint = checkpoint; // Update player's last touched checkpoint
        }
    }
    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.fillText(`Time: ${timer.toFixed(2)} seconds`, 10, 20); // Display timer at top-left corner
}

// Capture Key Inputs
window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Space' || e.code === "ArrowUp" || e.code === "KeyW") {
        player.jump();
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.code] = false; // Key released
});

// Initialize Game
async function init() {
    camera = new Camera(); // Create camera instance
    await loadLevel(currentLevel); // Load the level
    timerActive = true; // Start the timer
    setInterval(() => {
        if (timerActive) {
            timer += 1 / 60; // Increment timer by 1/60 seconds
        }
    }, 1000 / 60); // Update every frame (assuming 60 FPS)

    update();
    setInterval(update, 1000 / 60); // 60 FPS
}

init();
