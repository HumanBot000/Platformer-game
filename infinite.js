const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game Variables
let player;
let platforms = [];
let colliders = []; // New array for colliders
let camera;
const spawn = { x: 0, y: 220 };
const keys = {};
const FALL_THRESHOLD = canvas.height + 50; // Threshold for respawn

// Constants for jump limits
let MAX_JUMP_HEIGHT = 138;
let MAX_JUMP_LENGTH = 220;

function calculateJumpLength(height) {
    const g = 9.81; // Gravity constant
    const maxJumpVelocity = Math.sqrt(2 * g * MAX_JUMP_HEIGHT); // Initial velocity for max height
    const angle = Math.PI / 4; // Optimal angle for range is 45 degrees

    // Calculate the time to reach max height
    const timeToMaxHeight = maxJumpVelocity / g;

    // Total time of flight (up and down)
    const totalTime = 2 * timeToMaxHeight;

    // Calculate horizontal distance (range) using optimal angle
    const horizontalVelocity = maxJumpVelocity * Math.cos(angle); // Horizontal component of velocity
    const jumpLength = horizontalVelocity * totalTime; // Total horizontal distance

    // Adjust jump length based on the proportion of actual height to max height
    return Math.max(0, jumpLength * (height < MAX_JUMP_HEIGHT ? (1 - (height / MAX_JUMP_HEIGHT)) : 0));
}



// Player Class
class Player {
    /*LIMITS:
    Max Jump height (vertical):138
    Max Jump length (horizontal):220
    */
    constructor(x, y, width = 30, height = 30, textureSrc = './textures/player.png') {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.speed = 5;
        this.dy = 0;
        this.jumpStrength = -12; // A lower value for a more reasonable jump
        this.gravity = 0.5; // Slightly increased gravity        
        this.grounded = false;
        this.texture = new Image();
        this.texture.src = textureSrc;
        MAX_JUMP_HEIGHT -= height; // Adjust max jump height
        MAX_JUMP_LENGTH -= width;   // Adjust max jump length based on player width
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
    
        // Check if player has fallen below threshold
        if (this.y > FALL_THRESHOLD) {
            this.respawn();
        }
    
        // Collision with all colliders (platforms, etc.)
        for (let collider of colliders) {
            if (!this.checkCollision(collider)) continue;
    
            const colliderTop = collider.y;
            const colliderBottom = collider.y + collider.height;
            const colliderLeft = collider.x;
            const colliderRight = collider.x + collider.width;
    
            // Handle vertical collisions
            if (this.dy > 0 && playerBottom <= colliderBottom && playerBottom + this.dy >= colliderTop) {
                // Colliding from above
                this.y = colliderTop - this.height; // Place player on top of the collider
                this.dy = 0; // Reset vertical speed
                this.grounded = true; // Set grounded status
            } else if (this.dy < 0 && playerTop < colliderBottom && playerTop + this.dy <= colliderBottom) {
                // Colliding from below (if necessary)
                this.y = colliderBottom; // Position below the collider
                this.dy = 0; // Reset vertical speed
            } else {
                // Handle horizontal collisions
                const isCollidingFromLeft = playerRight > colliderLeft && playerLeft < colliderLeft && playerBottom > colliderTop && playerTop < colliderBottom;
                const isCollidingFromRight = playerLeft < colliderRight && playerRight > colliderRight && playerBottom > colliderTop && playerTop < colliderBottom;
    
                // Handle collision from the sides
                if (isCollidingFromLeft) {
                    this.x = colliderLeft - this.width; // Move player to the left of the collider
                    this.dy = 0; // Reset vertical speed to avoid jumping while colliding
                } else if (isCollidingFromRight) {
                    this.x = colliderRight; // Move player to the right of the collider
                    this.dy = 0; // Reset vertical speed to avoid jumping while colliding
                }
            }
        }
    
        // Draw player
        if (this.texture && this.texture.complete) {
            ctx.drawImage(this.texture, this.x - camera.x, this.y - camera.y, this.width, this.height);
        } else {
            ctx.fillStyle = '#FF0000'; // Fallback color if texture is not loaded
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
        const platformRight = platform.x + platform.width + 50;
        const isCollidingFromAbove = playerBottom >= platformTop && playerTop < platformTop && playerRight > platformLeft && playerLeft < platformRight;
        const isCollidingFromBelow = playerTop <= platformBottom && playerBottom > platformBottom && playerRight > platformLeft && playerLeft < platformRight;

        const isCollidingFromLeft = playerRight >= platformLeft && playerLeft < platformLeft && playerBottom > platformTop && playerTop < platformBottom;
        const isCollidingFromRight = playerLeft < platformRight && playerRight > platformRight && playerBottom > platformTop && playerTop < platformBottom;

        return isCollidingFromAbove || isCollidingFromBelow || isCollidingFromLeft || isCollidingFromRight;
    }

    jump() {
        if (this.grounded) {
            this.dy = this.jumpStrength; // This can be adjusted to increase jump strength
            this.grounded = false;
        }
    }

    respawn() {
        this.x = spawn.x;
        this.y = spawn.y;
        this.dy = 0;
    }
}

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
    constructor(x, y, width = 100, height = 20, tileSrc = './textures/grass.png', tileSize = 48) {
        const platformWidth = Math.round(width); // Ensure width is rounded as needed
        super(x, y, platformWidth, height); // Use platformWidth for collider dimensions
        colliders.push(this); // Add platform to colliders

        this.tileSize = tileSize;
        this.tile = new Image();
        this.tile.src = tileSrc;
    }

    draw(cameraOffsetX, cameraOffsetY) {
        const numTiles = Math.ceil(this.width / this.tileSize);
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
        this.x = player.x - canvasWidth / 2 + player.width / 2;
        this.y = player.y - canvasHeight / 2 + player.height / 2;
    }
}
function generatePlatform() {
    const lastPlatform = platforms[platforms.length - 1];
    const lastX = lastPlatform ? lastPlatform.x : spawn.x;
    const lastY = lastPlatform ? lastPlatform.y : spawn.y;

    // Set minimum and maximum platform width
    const minPlatformWidth = 50; // Minimum width
    const maxPlatformWidth = 200; // Maximum width

    // Randomize platform width between min and max, ensuring it's divisible by 50
    let platformWidth = Math.random() * (maxPlatformWidth - minPlatformWidth) + minPlatformWidth;
    platformWidth = Math.floor(platformWidth / 50) * 50; // Ensure width is a multiple of 50

    // Calculate next platform position
    let nextX = lastX + 200 + Math.random() * 150; // Increased jump distance for horizontal placement
    nextX = Math.floor(nextX / 50) * 50; // Adjust nextX to be a multiple of 50

    // Calculate jump length based on the last platform height
    const jumpLength = calculateJumpLength(lastY - spawn.y); // Calculate jump length based on height difference

    // Randomize vertical position for platform spacing, ensuring it's within jump capabilities
    let nextY = lastY - (Math.random() * (MAX_JUMP_HEIGHT - 40) + 40); // Random vertical offset

    // Ensure the nextY is within a reasonable range
    if (nextY < spawn.y - MAX_JUMP_HEIGHT) {
        nextY = lastY - MAX_JUMP_HEIGHT; // Place at max jump height limit
    } else if (nextY < 0) {
        nextY = 0; // Prevent platforms from being placed below the ground
    }

    // Ensure the gap is not too large based on calculated jump length
    const heightDifference = lastY - nextY;
    if (heightDifference > jumpLength) {
        nextY = lastY - jumpLength; // Adjust nextY to fit jump length constraints
    }

    const newPlatform = new Platform(nextX, nextY, platformWidth); // Create new platform
    platforms.push(newPlatform);
}




// Initialize Game
function init() {
    player = new Player(spawn.x, spawn.y);
    camera = new Camera();

    // Initialize with the spawn platform
    platforms.push(new Platform(spawn.x, spawn.y + 100, 200)); // Starting platform at a fixed height and width of 200

    // Generate initial platforms
    for (let i = 0; i < 3; i++) generatePlatform();

    // Start game loop
    gameLoop();
}

// Move Player based on key inputs
function movePlayer() {
    if (keys['ArrowRight'] || keys["KeyD"]) player.x += player.speed;
    if (keys['ArrowLeft'] || keys["KeyA"]) player.x -= player.speed;
    player.x = Math.max(0, player.x); // Prevent leaving the canvas
}

// Update Game State
function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    movePlayer();

    // Update camera based on player position
    camera.update(player, canvas.width, canvas.height);

    // Generate a new platform when the farthest one is within view
    const farthestPlatform = platforms[platforms.length - 1];
    if (farthestPlatform && farthestPlatform.x < player.x + canvas.width) {
        generatePlatform();
    }

    // Draw platforms and update player
    platforms.forEach((platform) => platform.draw(camera.x, camera.y));
    player.update();
}

// Key input handlers
window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Space' || e.code === "ArrowUp" || e.code === "KeyW") {
        player.jump();
    }
});
window.addEventListener('keyup', (e) => keys[e.code] = false);

// Game Loop
function gameLoop() {
    update();
    requestAnimationFrame(gameLoop);
}

// Start the game
init();
