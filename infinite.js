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
            const colliderLeft = collider.x;
            const colliderRight = collider.x + collider.width;
    
            // Handle vertical collisions
            if (playerBottom <= colliderBottom && playerBottom + this.dy >= colliderTop) {
                // Colliding from above
                this.y = colliderTop - this.height; // Place player on top of the collider
                this.dy = 0; // Reset vertical speed
                this.grounded = true; // Set grounded status
            } else if (playerTop < colliderBottom && playerTop + this.dy <= colliderBottom) {
                // Colliding from below (if necessary)
                this.y = colliderBottom; // Position below the collider
                this.dy = 0; // Reset vertical speed
                console.log("Bottom Colission");
            } else {
                // Handle horizontal collisions
                const isCollidingFromLeft = playerRight> colliderLeft && playerLeft < colliderLeft && playerBottom >= colliderTop && playerTop <= colliderBottom;
                const isCollidingFromRight = playerLeft < colliderRight && playerRight > colliderRight && playerBottom > colliderTop && playerTop < colliderBottom;
    
                // Handle collision from the sides
                if (isCollidingFromLeft) {
                    console.log("Left colission");
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
    const lastX = lastPlatform ? lastPlatform.x : spawn.x;
    const lastY = lastPlatform ? lastPlatform.y : spawn.y;
    const lastPlatformWidth = lastPlatform ? lastPlatform.width : 0;

    // Mindest- und Maximalwerte für die Plattformen
    const minPlatformWidth = 50; // Minimale Plattformbreite
    const maxPlatformWidth = 200; // Maximale Plattformbreite
    const minDeltaX = 80; // Mindestabstand in X-Richtung von der rechten Seite der letzten Plattform

    // Zufälliger Höhenversatz (deltaY) für die nächste Plattform im Bereich [-200, +200]
    let deltaY = Math.floor(Math.random() * 401) - 200;
    deltaY = Math.min(MAX_JUMP_HEIGHT,deltaY);
    // Berechnung der maximalen horizontalen Distanz basierend auf dem angepassten deltaY-Wert
    const maxDeltaX = calculateMaxHorizontalDistance(deltaY);

    // Berechnen des horizontalen Abstands, wobei minDeltaX berücksichtigt wird
    const deltaX = Math.max(minDeltaX, Math.random() * maxDeltaX);
    console.log(`DeltaY: ${deltaY};DeltaX: ${deltaX}`);
    
    // Positionierung der neuen Plattform relativ zur letzten Plattform, um Überschneidungen zu vermeiden
    const newPlatformX = lastX + lastPlatformWidth + deltaX; // Startposition links von der neuen Plattform
    const newPlatformY = lastY - deltaY; // Veränderte Berechnung für die Y-Position

    // Zufällige Breite der neuen Plattform im Bereich von min bis max
    const platformWidth = Math.floor(Math.random() * (maxPlatformWidth - minPlatformWidth + 1)) + minPlatformWidth;

    // Neue Plattform erstellen und zur Liste hinzufügen
    const newPlatform = new Platform(newPlatformX, newPlatformY, platformWidth);
    platforms.push(newPlatform);
    FALL_THRESHOLD=newPlatform.y+5000;
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
