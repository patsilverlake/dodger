"use strict";
// src/game.ts
console.log("Game started - v2 with images");
// --- Asset Paths ---
const RABBIT_SRC = 'assets/animals/rabbit.png';
const BEAR_SRC = 'assets/animals/bear.png';
const CROCODILE_SRC = 'assets/animals/crocodile.png';
const SNAKE_SRC = 'assets/animals/snake.png';
const MUSHROOM_SRC = 'assets/animals/mushroom.png';
const BOMB_SRC = 'assets/animals/bomb.png';
// Tile assets
const TILE_SRCS = [
    'assets/maps/tile_0000.png',
    'assets/maps/tile_0001.png',
    'assets/maps/tile_0002.png',
];
// --- Game Constants ---
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const PLAYER_WIDTH = 28;
const PLAYER_HEIGHT = 30;
const PLAYER_SPEED = 7;
const PLAYER_BOOSTED_SPEED = 14; // Increased from 12 to help with faster predators
const OBSTACLE_BASE_WIDTH = 35;
const OBSTACLE_BASE_HEIGHT = 35;
const OBSTACLE_MIN_SPEED = 1.5; // Increased from 1.2
const OBSTACLE_MAX_SPEED = 5.5; // Increased from 4.8
const OBSTACLE_SPAWN_RATE = 0.05;
const MIN_OBSTACLE_GAP = 75;
const POWERUP_WIDTH = 30;
const POWERUP_HEIGHT = 30;
const POWERUP_MIN_SPEED = 2;
const POWERUP_MAX_SPEED = 3;
const POWERUP_SPAWN_RATE = 0.002;
const SPEED_BOOST_DURATION = 5000; // 5 seconds
const TILE_SIZE = 30; // Size of each background tile
// Touch controls
let touchStartX = 0;
let touchEndX = 0;
let isTouching = false;
let touchThreshold = 20; // Minimum distance to trigger a swipe
// --- Image Assets ---
let rabbitImage;
let bearImage;
let crocodileImage;
let snakeImage;
let mushroomImage;
let bombImage;
let tileImages = [];
let imagesLoaded = 0;
const TOTAL_IMAGES = 9; // 4 animals + 2 powerups + 3 tiles
// --- Game State ---
let canvas;
let ctx;
let player;
let obstacles = [];
let powerUps = [];
let backgroundTiles = [];
let score = 0;
let isGameOver = false;
let isGameRunning = false;
let animationFrameId = null;
let speedBoostActive = false;
let speedBoostTimeout = null;
// --- UI Elements ---
let scoreDisplay;
let gameOverDisplay;
let finalScoreDisplay;
let startButton;
let restartButton;
let loadingIndicator = null;
let gameModal;
let modalTitle;
let modalMessage;
// --- Input Handling ---
// Touch control handlers
function handleTouchStart(e) {
    if (!isGameRunning || isGameOver)
        return;
    // Store the initial touch position
    touchStartX = e.touches[0].clientX;
    isTouching = true;
}
function handleTouchMove(e) {
    if (!isGameRunning || isGameOver || !isTouching)
        return;
    e.preventDefault(); // Prevent scrolling while playing
    // Get current touch position
    touchEndX = e.touches[0].clientX;
    // Calculate the difference to determine direction and speed
    const touchDeltaX = touchEndX - touchStartX;
    // Determine direction based on the difference
    if (touchDeltaX > touchThreshold) {
        // Moving right
        player.dx = 1;
    }
    else if (touchDeltaX < -touchThreshold) {
        // Moving left
        player.dx = -1;
    }
    else {
        // Not moving enough to change direction
        player.dx = 0;
    }
}
function handleTouchEnd(e) {
    if (!isGameRunning || isGameOver)
        return;
    // Stop movement when touch ends
    isTouching = false;
    player.dx = 0;
    // If they tapped without moving much, toggle direction
    if (Math.abs(touchEndX - touchStartX) < touchThreshold) {
        // Simple tap control - move left if on right side, right if on left side
        const tapPosition = touchEndX || touchStartX;
        const canvasRect = canvas.getBoundingClientRect();
        const canvasCenter = canvasRect.left + canvasRect.width / 2;
        if (tapPosition > canvasCenter) {
            player.dx = 1; // Move right on tap right side
            setTimeout(() => { if (isGameRunning && !isGameOver)
                player.dx = 0; }, 300); // Stop after short time
        }
        else {
            player.dx = -1; // Move left on tap left side
            setTimeout(() => { if (isGameRunning && !isGameOver)
                player.dx = 0; }, 300); // Stop after short time
        }
    }
}
// Add mobile control instruction
function showMobileControls() {
    if ('ontouchstart' in window) {
        // Only show mobile instructions on touch devices
        modalMessage.innerHTML = `Help the rabbit dodge the wild animals!<br>
            <small>Swipe left/right or tap sides to move<br>
            🍄 Mushroom: Speed boost<br>
            💣 Bomb: Destroys all enemies</small>`;
    }
    else {
        // Desktop instructions with power-ups info
        modalMessage.innerHTML = `Help the rabbit dodge the wild animals!<br>
            <small>Use arrow keys or A/D to move<br>
            🍄 Mushroom: Speed boost<br>
            💣 Bomb: Destroys all enemies</small>`;
    }
}
// --- Initialization ---
function init() {
    canvas = document.getElementById('gameCanvas');
    const context = canvas.getContext('2d');
    if (!context) {
        throw new Error("Could not get 2D rendering context");
    }
    ctx = context;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    scoreDisplay = document.getElementById('scoreDisplay');
    gameOverDisplay = document.getElementById('gameOver');
    finalScoreDisplay = document.getElementById('finalScore');
    startButton = document.getElementById('startButton');
    restartButton = document.getElementById('restartButton');
    gameModal = document.getElementById('gameModal');
    modalTitle = document.getElementById('modalTitle');
    modalMessage = document.getElementById('modalMessage');
    loadingIndicator = document.getElementById('loadingIndicator');
    // Disable start button until images are loaded
    startButton.disabled = true;
    startButton.textContent = "Loading Assets...";
    // Load character images
    rabbitImage = loadImage(RABBIT_SRC, handleImageLoadError);
    bearImage = loadImage(BEAR_SRC, handleImageLoadError);
    crocodileImage = loadImage(CROCODILE_SRC, handleImageLoadError);
    snakeImage = loadImage(SNAKE_SRC, handleImageLoadError);
    // Load power-up images
    mushroomImage = loadImage(MUSHROOM_SRC, handleImageLoadError);
    bombImage = loadImage(BOMB_SRC, handleImageLoadError);
    // Load tile images
    for (const tileSrc of TILE_SRCS) {
        const tileImg = loadImage(tileSrc, handleImageLoadError);
        tileImages.push(tileImg);
    }
    // Add keyboard event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    // Add touch event listeners for mobile
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    // Add button event listeners
    startButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', restartGame);
    // Show modal initially with appropriate instructions
    showStartModal();
    // Draw initial loading state
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#BBDEFB';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.font = "20px 'Bubblegum Sans'";
    ctx.fillStyle = "#3F51B5";
    ctx.textAlign = "center";
    ctx.fillText("Loading animals...", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
}
// Show the start modal with welcome message
function showStartModal() {
    modalTitle.textContent = "Welcome to Animal Kingdom!";
    modalMessage.textContent = "Help the rabbit dodge the wild animals!";
    showMobileControls(); // Add mobile instructions if needed
    gameModal.classList.remove('hidden');
    gameOverDisplay.classList.add('hidden');
}
// Show the game over modal
function showGameOverModal() {
    modalTitle.textContent = "Game Over!";
    modalMessage.textContent = `You scored ${score} points!`;
    startButton.textContent = "Play Again";
    gameModal.classList.remove('hidden');
}
// --- Game Start/Reset ---
function startGame() {
    // Only start if images are loaded
    if (imagesLoaded !== TOTAL_IMAGES)
        return;
    console.log("Starting game...");
    isGameRunning = true;
    score = 0;
    obstacles = [];
    powerUps = [];
    isGameOver = false;
    // Clear any active speed boost
    if (speedBoostTimeout) {
        clearTimeout(speedBoostTimeout);
        speedBoostTimeout = null;
    }
    speedBoostActive = false;
    // Hide the modal
    gameModal.classList.add('hidden');
    player = {
        x: CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2,
        y: CANVAS_HEIGHT - PLAYER_HEIGHT - 15,
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
        speed: PLAYER_SPEED,
        dx: 0,
        image: rabbitImage
    };
    scoreDisplay.textContent = score.toString();
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    gameLoop();
}
// Separate function for restarting the game
function restartGame() {
    // Reset any game-specific settings
    startGame();
}
// --- Input Handling ---
function handleKeyDown(e) {
    if (!isGameRunning || isGameOver)
        return;
    if (e.key === 'ArrowLeft' || e.key === 'a') {
        player.dx = -1;
    }
    else if (e.key === 'ArrowRight' || e.key === 'd') {
        player.dx = 1;
    }
}
function handleKeyUp(e) {
    if (!isGameRunning || isGameOver)
        return;
    if ((e.key === 'ArrowLeft' || e.key === 'a') && player.dx === -1 ||
        (e.key === 'ArrowRight' || e.key === 'd') && player.dx === 1) {
        player.dx = 0;
    }
}
// --- Player Logic ---
function updatePlayer() {
    if (!player)
        return;
    player.x += player.dx * player.speed;
    if (player.x < 0) {
        player.x = 0;
    }
    else if (player.x + player.width > CANVAS_WIDTH) {
        player.x = CANVAS_WIDTH - player.width;
    }
}
function drawPlayer() {
    if (!player || !player.image)
        return;
    ctx.drawImage(player.image, player.x, player.y, player.width, player.height);
}
// --- Obstacle Logic ---
function spawnObstacle() {
    // Check if we can spawn an obstacle
    if (Math.random() < OBSTACLE_SPAWN_RATE) {
        // Check if there's enough vertical gap between obstacles
        let canSpawn = true;
        const mostRecentObstacle = obstacles[obstacles.length - 1];
        if (mostRecentObstacle && mostRecentObstacle.y < MIN_OBSTACLE_GAP) {
            canSpawn = false; // Don't spawn if the last obstacle is too close
        }
        if (canSpawn) {
            const x = Math.random() * (CANVAS_WIDTH - OBSTACLE_BASE_WIDTH);
            // Randomly select which enemy to spawn
            const randomValue = Math.random();
            let obstacleType;
            let image;
            let width = OBSTACLE_BASE_WIDTH;
            let height = OBSTACLE_BASE_HEIGHT;
            let speed;
            if (randomValue < 0.33) {
                obstacleType = 'bear';
                image = bearImage;
                width *= 0.95; // Slightly smaller than base size
                height *= 0.95; // Slightly smaller than base size
                // Bears are slower but more consistent
                speed = 1.5 + Math.random() * 2.0; // Speed range: 1.5-3.5 (was 1.2-3.0)
            }
            else if (randomValue < 0.66) {
                obstacleType = 'crocodile';
                image = crocodileImage;
                width *= 1.05; // Slightly wider but still smaller than before
                height *= 0.75; // Flatter
                // Crocodiles have medium speed
                speed = 1.8 + Math.random() * 2.5; // Speed range: 1.8-4.3 (was 1.5-3.8)
            }
            else {
                obstacleType = 'snake';
                image = snakeImage;
                width *= 0.75; // Smaller
                height *= 0.65; // Smaller
                // Snakes are faster and more unpredictable
                speed = 2.5 + Math.random() * 3.0; // Speed range: 2.5-5.5 (was 2.0-4.8)
            }
            obstacles.push({
                x: x,
                y: -height,
                width: width,
                height: height,
                speed: speed,
                image: image,
                type: obstacleType
            });
        }
    }
}
function updateObstacles() {
    let scoreIncrement = 0;
    obstacles = obstacles.filter(obstacle => {
        obstacle.y += obstacle.speed;
        if (obstacle.y >= CANVAS_HEIGHT) {
            scoreIncrement++;
            return false; // Remove obstacle that passed
        }
        return true; // Keep obstacle on screen
    });
    if (scoreIncrement > 0) {
        score += scoreIncrement;
        scoreDisplay.textContent = score.toString();
    }
}
function drawObstacles() {
    obstacles.forEach(obstacle => {
        if (obstacle.image) {
            ctx.drawImage(obstacle.image, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        }
        else {
            // Fallback drawing if image failed
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        }
    });
}
// --- Power-Up Logic ---
function spawnPowerUp() {
    if (Math.random() < POWERUP_SPAWN_RATE) {
        const x = Math.random() * (CANVAS_WIDTH - POWERUP_WIDTH);
        const speed = POWERUP_MIN_SPEED + Math.random() * (POWERUP_MAX_SPEED - POWERUP_MIN_SPEED);
        // Randomly select which power-up to spawn
        const isMushroom = Math.random() < 0.8; // 80% chance for mushroom, 20% for bomb (was 70/30)
        const type = isMushroom ? 'mushroom' : 'bomb';
        const image = isMushroom ? mushroomImage : bombImage;
        powerUps.push({
            x: x,
            y: -POWERUP_HEIGHT,
            width: POWERUP_WIDTH,
            height: POWERUP_HEIGHT,
            speed: speed,
            image: image,
            type: type,
            active: false
        });
    }
}
function updatePowerUps() {
    powerUps = powerUps.filter(powerUp => {
        powerUp.y += powerUp.speed;
        return powerUp.y < CANVAS_HEIGHT; // Keep only power-ups on screen
    });
}
function drawPowerUps() {
    powerUps.forEach(powerUp => {
        if (powerUp.image) {
            ctx.drawImage(powerUp.image, powerUp.x, powerUp.y, powerUp.width, powerUp.height);
        }
    });
}
function checkPowerUpCollisions() {
    if (!player)
        return;
    powerUps = powerUps.filter(powerUp => {
        // Check for collision with player
        const collision = (player.x < powerUp.x + powerUp.width &&
            player.x + player.width > powerUp.x &&
            player.y < powerUp.y + powerUp.height &&
            player.y + player.height > powerUp.y);
        if (collision) {
            // Apply power-up effect
            if (powerUp.type === 'mushroom') {
                activateSpeedBoost();
            }
            else if (powerUp.type === 'bomb') {
                activateBomb();
            }
            return false; // Remove collected power-up
        }
        return true; // Keep power-up
    });
}
// --- Collision Detection ---
function checkCollisions() {
    if (!player)
        return;
    obstacles.forEach(obstacle => {
        // AABB collision check
        if (player.x < obstacle.x + obstacle.width &&
            player.x + player.width > obstacle.x &&
            player.y < obstacle.y + obstacle.height &&
            player.y + player.height > obstacle.y) {
            endGame();
        }
    });
}
// --- Game Over ---
function endGame() {
    console.log("Game Over!");
    isGameOver = true;
    isGameRunning = false;
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    // Show game over screen
    finalScoreDisplay.textContent = score.toString();
    showGameOverModal();
}
// --- Game Loop ---
function gameLoop() {
    if (isGameOver || !isGameRunning)
        return;
    // Draw the tiled background
    drawBackground();
    // Spawn new items
    spawnObstacle();
    spawnPowerUp();
    // Update positions
    updatePlayer();
    updateObstacles();
    updatePowerUps();
    // Check for collisions
    checkCollisions();
    checkPowerUpCollisions();
    // Draw everything
    drawPlayer();
    drawObstacles();
    drawPowerUps();
    // Request next frame
    animationFrameId = requestAnimationFrame(gameLoop);
}
function drawBackground() {
    // Draw all background tiles
    backgroundTiles.forEach(tile => {
        ctx.drawImage(tile.image, tile.x, tile.y, tile.width, tile.height);
    });
}
function generateBackgroundTiles() {
    backgroundTiles = [];
    // Calculate how many tiles we need to cover the canvas
    const tilesX = Math.ceil(CANVAS_WIDTH / TILE_SIZE);
    const tilesY = Math.ceil(CANVAS_HEIGHT / TILE_SIZE);
    for (let y = 0; y < tilesY; y++) {
        for (let x = 0; x < tilesX; x++) {
            // Randomly select a tile image
            const randomTileIndex = Math.floor(Math.random() * tileImages.length);
            backgroundTiles.push({
                x: x * TILE_SIZE,
                y: y * TILE_SIZE,
                width: TILE_SIZE,
                height: TILE_SIZE,
                image: tileImages[randomTileIndex]
            });
        }
    }
}
function drawInitialMessage() {
    // Draw the background tiles first
    drawBackground();
    // Then draw the message on top
    ctx.font = "24px 'Bubblegum Sans'";
    ctx.fillStyle = "#3F51B5";
    ctx.textAlign = "center";
    ctx.fillText("Ready to play!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
}
// --- Image Loading ---
function loadImage(src, onError) {
    const img = new Image();
    img.onload = () => {
        imagesLoaded++;
        console.log(`Loaded: ${src} (${imagesLoaded}/${TOTAL_IMAGES})`);
        if (imagesLoaded === TOTAL_IMAGES) {
            console.log("All images loaded.");
            if (loadingIndicator)
                loadingIndicator.classList.add('hidden');
            startButton.disabled = false;
            startButton.textContent = "Start Game";
            generateBackgroundTiles();
            drawInitialMessage();
        }
    };
    img.onerror = () => {
        console.error(`Failed to load image: ${src}`);
        onError();
        modalMessage.textContent = `Error loading ${src}. Cannot start.`;
        modalMessage.style.color = 'red';
        startButton.disabled = true;
    };
    img.src = src;
    return img;
}
function handleImageLoadError() {
    startButton.disabled = true;
    startButton.textContent = "Loading Error";
    console.error("Essential image failed to load. Cannot start game.");
}
// --- Power-Up Effects ---
function activateSpeedBoost() {
    // Visual feedback
    showPowerUpMessage("Speed Boost!", "#4CAF50");
    // Apply speed boost
    speedBoostActive = true;
    player.speed = PLAYER_BOOSTED_SPEED;
    // Add visual effect to canvas
    canvas.classList.add('speed-boost-active');
    // Clear any existing timeout
    if (speedBoostTimeout) {
        clearTimeout(speedBoostTimeout);
    }
    // Set timeout to deactivate
    speedBoostTimeout = window.setTimeout(() => {
        speedBoostActive = false;
        player.speed = PLAYER_SPEED;
        canvas.classList.remove('speed-boost-active');
        console.log("Speed boost deactivated");
    }, SPEED_BOOST_DURATION);
}
function activateBomb() {
    // Visual feedback
    showPowerUpMessage("BOOM! All Enemies Destroyed!", "#FF5722");
    // Add explosion effect
    canvas.classList.add('bomb-active');
    setTimeout(() => {
        canvas.classList.remove('bomb-active');
    }, 500);
    // Destroy all obstacles
    const destroyedCount = obstacles.length;
    obstacles = []; // Clear all obstacles
    // Add score bonus for destroyed obstacles
    score += destroyedCount * 5;
    scoreDisplay.textContent = score.toString();
}
function showPowerUpMessage(message, color) {
    // Create floating message
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    messageElement.style.position = 'absolute';
    messageElement.style.color = color;
    messageElement.style.fontFamily = "'Bubblegum Sans', cursive";
    messageElement.style.fontSize = '24px';
    messageElement.style.fontWeight = 'bold';
    messageElement.style.textShadow = '2px 2px 0 rgba(0,0,0,0.2)';
    messageElement.style.top = '50%';
    messageElement.style.left = '50%';
    messageElement.style.transform = 'translate(-50%, -50%)';
    messageElement.style.pointerEvents = 'none';
    messageElement.style.zIndex = '100';
    messageElement.style.animation = 'float-up 1.5s forwards';
    // Add the floating message style if it doesn't exist
    if (!document.getElementById('power-up-animations')) {
        const styleElement = document.createElement('style');
        styleElement.id = 'power-up-animations';
        styleElement.textContent = `
            @keyframes float-up {
                0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                100% { opacity: 0; transform: translate(-50%, -150%) scale(1.5); }
            }
        `;
        document.head.appendChild(styleElement);
    }
    // Add to game container and remove after animation
    const gameContainer = document.querySelector('.game-container');
    gameContainer.appendChild(messageElement);
    setTimeout(() => {
        messageElement.remove();
    }, 1500);
}
// --- Run Initialization ---
document.addEventListener('DOMContentLoaded', init);
//# sourceMappingURL=game.js.map