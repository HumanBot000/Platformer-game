const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game Variables
let player;
let platforms = [];
let colliders = []; // New array for colliders
let camera;
const spawn = { x: 0, y: 220 };
const keys = {};
let FALL_THRESHOLD = canvas.height + 50; // Threshold for respawn
let score = 0;
// Constants for jump limits
let MAX_JUMP_HEIGHT = 138;
function calculateMaxHorizontalDistance(deltaY) {
    // Gravitationskonstanten
    const gravity = 0.5;          // Gravitationsbeschleunigung pro Frame
    const jumpStrength = -12;     // Anfangsgeschwindigkeit beim Sprung
    const playerSpeed = 5;        // Horizontale Geschwindigkeit in Pixel pro Frame
    
    // Positives deltaY entspricht einer Plattform höher als der aktuellen Position
    const adjustedDeltaY = -deltaY; // Anpassung der Höhe basierend auf der Y-Achse

    // Berechnung der Diskriminante
    const discriminant = Math.pow(jumpStrength, 2) + 2 * gravity * adjustedDeltaY;

    // Wenn die Diskriminante negativ ist, ist der Sprung unmöglich
    if (discriminant < 0) {
        return 0;
    }

    // Berechnung der Zeit in der Luft, um die Höhe zu erreichen
    const timeInAir = (-jumpStrength + Math.sqrt(discriminant)) / gravity;

    // Maximale horizontale Distanz berechnen
    const maxDistance = playerSpeed * timeInAir;
    
    return maxDistance;
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
    }

    update() {
        // Collision detection variables
        const playerTop = this.y;   //360
        const playerBottom = this.y + this.height; //330
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
            const colliderLeft = collider.x -collider.width;
            const colliderRight = collider.x;
        
            // Handle vertical collisions
            if (playerBottom <= colliderBottom && playerBottom + this.dy >= colliderTop) {
                // Colliding from above
                this.y = colliderTop - this.height; // Place player on top of the collider
                this.dy = 0; // Reset vertical speed
                this.grounded = true; // Set grounded status
        
                // Check if the platform is a MovingPlatform
                if (collider instanceof MovingPlatform) {
                    this.x += collider.movingForward ? collider.speed : -collider.speed; // Apply platform's horizontal speed
                }
            } else if (playerTop < colliderBottom && playerTop + this.dy <= colliderBottom) {
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
        
        // Check moving platforms adjacent to the player
        for (let platform of platforms) {
            if (platform instanceof MovingPlatform) {
                const isBesidePlatform = playerRight > platform.x && playerLeft < platform.x + platform.width && 
                                         playerBottom > platform.y && playerTop < platform.y + platform.height;
        
                if (isBesidePlatform) {
                    if (platform.direction === "horizontal") {
                        this.x += platform.movingForward ? platform.speed : -platform.speed; // Apply platform's horizontal speed
                    } else {
                        this.y += platform.movingForward ? platform.speed : -platform.speed; // Apply platform's vertical speed
                    }
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
            this.dy = this.jumpStrength; 
            this.grounded = false;
        }
    }

    respawn() {
        this.x = spawn.x;
        this.y = spawn.y;
        this.dy = 0;
        FALL_THRESHOLD = canvas.height + 50; // Threshold for respawn
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
    constructor(x, y, width = 100, height = 50, tileSrc = './textures/grass.png', tileSize = 48) {
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
    let lastX = spawn.x;
    let lastY = spawn.y;

    // Determine the last platform's end position if it's a moving platform
    if (lastPlatform instanceof MovingPlatform) {
        if (lastPlatform.direction === "horizontal") {
            lastX = lastPlatform.movingForward ? lastPlatform.range.end : lastPlatform.range.start;
            lastY = lastPlatform.y; // Y position remains the same
        } else {
            lastX = lastPlatform.x; // X position remains the same
            lastY = lastPlatform.movingForward ? lastPlatform.range.end : lastPlatform.range.start;
        }
    } else {
        lastX = lastPlatform.x + lastPlatform.width;
        lastY = lastPlatform.y;
    }

    // Minimum and maximum platform width
    const minPlatformWidth = 50; 
    const maxPlatformWidth = 200; 
    const minDeltaX = 80; 

    // Random height offset for the next platform
    let deltaY = Math.floor(Math.random() * 401) - 200;
    deltaY = Math.min(MAX_JUMP_HEIGHT, deltaY);

    // Calculate max horizontal distance based on deltaY
    const maxDeltaX = calculateMaxHorizontalDistance(deltaY);

    // Calculate the horizontal distance while considering minDeltaX
    let deltaX = Math.max(minDeltaX, Math.random() * maxDeltaX);

    // Ensure there’s a gap between platforms
    if (lastPlatform instanceof MovingPlatform && lastPlatform.direction === "horizontal") {
        // Adjust lastX to be at least minDeltaX away from the last platform's end position
        lastX = Math.max(lastX, lastPlatform.range.end + minDeltaX);
    }

    // Determine whether to create a normal or moving platform
    const createMovingPlatform = Math.random() < 0.3; // 30% chance for a moving platform
    let newPlatform;

    if (createMovingPlatform) {
        // Create a moving platform with random parameters
        const speed = Math.random() * 2 + 1; // Random speed between 1 and 3
        const direction = Math.random() < 0.5 ? "horizontal" : "vertical"; // Random direction
        const range = {
            start: lastX,
            end: lastX + (direction === "horizontal" ? Math.random() * 100 + 50 : 0)
        };
        newPlatform = new MovingPlatform(
            lastX, 
            lastY, 
            Math.floor(Math.random() * (maxPlatformWidth - minPlatformWidth + 1)) + minPlatformWidth, 
            20, 
            './textures/grass.png', 
            48, 
            speed, 
            direction, 
            range
        );
    } else {
        // Create a normal platform
        const platformWidth = Math.floor(Math.random() * (maxPlatformWidth - minPlatformWidth + 1)) + minPlatformWidth;
        newPlatform = new Platform(lastX, lastY - deltaY, platformWidth); // Place normal platform
    }

    // Add the new platform to the platforms array
    platforms.push(newPlatform);
    FALL_THRESHOLD = newPlatform.y + 5000; // Update FALL_THRESHOLD
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
    score = player.x /100;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.fillText(`Score: ${parseInt(score)}`, 10, 20); 
}

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

    // Update and draw all platforms
    platforms.forEach(platform => {
        if (platform instanceof MovingPlatform) {
            platform.update(); // Update moving platforms
        }
        platform.draw(camera.x, camera.y); // Draw all platforms
    });

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
