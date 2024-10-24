const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game Variables
let player;
let platforms = [];
let colliders = [];
let lavaY;
let spawn = { x: 50, y: 220 }; // Default spawn point
let camera = { x: 0, y: 0 }; // Camera position
let levelWidth; // Set based on loaded level

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
        ctx.fillRect(this.x - camera.x, this.y, this.width, this.height); // Draw player considering camera offset
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

    draw(cameraOffsetX) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; // Collider color
        ctx.fillRect(this.x - cameraOffsetX, this.y, this.width, this.height); // Draw collider with camera offset
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
    draw(cameraOffsetX) {
        ctx.fillStyle = '#0000FF'; // Platform color
        ctx.fillRect(this.x - cameraOffsetX, this.y, this.width, this.height); // Draw platform with camera offset
        super.draw(cameraOffsetX); // Draw collider for debugging
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

    // Create platforms and colliders
    platforms = data.platforms.map(p => new Platform(p.x, p.y, p.width, p.height));
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

// Update Camera
function updateCamera() {
    // Center camera on player
    camera.x = player.x - canvas.width / 2 + player.width / 2;

    // Keep camera within level bounds
    camera.x = Math.max(0, camera.x);
    camera.x = Math.min(levelWidth - canvas.width, camera.x);
}

// Update Game State
function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Move player
    movePlayer();

    // Update camera based on player position
    updateCamera();

    // Draw platforms and colliders
    for (let platform of platforms) {
        platform.draw(camera.x); // Draw platforms with camera offset
    }

    // Update and draw player
    player.update();

    // Draw lava
    if (lavaY > 0 && lavaY < canvas.height) {
        ctx.fillStyle = '#FF4500'; // Lava color
        ctx.fillRect(0, lavaY, canvas.width, canvas.height - lavaY);
    }
}

// Handle Key Inputs
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
    await loadLevel('level1'); // Load the level
    setInterval(update, 1000 / 60); // 60 FPS
}

init();
