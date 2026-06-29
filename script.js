const canvas = document.getElementById('game-board');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const finalScoreElement = document.getElementById('final-score');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// Grid size and tile size
const gridSize = 20;
const tileCount = canvas.width / gridSize;

let snake = [];
let dx = 0;
let dy = 0;
let nextDx = 0;
let nextDy = 0;
let foodX = 0;
let foodY = 0;
let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;
let gameLoop;
let isGameOver = false;
let gameStarted = false;
let speed = 120;

// Colors matching CSS variables
const colors = {
    head: '#10b981',
    body: '#34d399',
    food: '#f43f5e',
    foodGlow: 'rgba(244, 63, 94, 0.6)'
};

highScoreElement.textContent = highScore;

function initGame() {
    snake = [
        { x: 10, y: 10 },
        { x: 10, y: 11 },
        { x: 10, y: 12 }
    ];
    dx = 0;
    dy = -1;
    nextDx = 0;
    nextDy = -1;
    score = 0;
    speed = 120;
    scoreElement.textContent = score;
    isGameOver = false;
    placeFood();
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    
    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(update, speed);
}

function update() {
    if (isGameOver) return;
    
    dx = nextDx;
    dy = nextDy;
    
    moveSnake();
    
    if (checkCollision()) {
        gameOver();
        return;
    }
    
    checkFood();
    draw();
}

function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw food with glow
    ctx.shadowBlur = 15;
    ctx.shadowColor = colors.foodGlow;
    ctx.fillStyle = colors.food;
    ctx.beginPath();
    ctx.arc(foodX * gridSize + gridSize/2, foodY * gridSize + gridSize/2, gridSize/2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0; // Reset shadow for snake
    
    // Draw snake
    snake.forEach((segment, index) => {
        // Different styling for head
        if (index === 0) {
            ctx.fillStyle = colors.head;
            // Draw rounded rect for head
            drawRoundedRect(segment.x * gridSize, segment.y * gridSize, gridSize - 1, gridSize - 1, 6);
            
            // Add simple eyes based on direction
            ctx.fillStyle = '#fff';
            const eyeSize = 3;
            let eyeX1, eyeY1, eyeX2, eyeY2;
            
            if (dx === 1) { // Right
                eyeX1 = segment.x * gridSize + 12; eyeY1 = segment.y * gridSize + 4;
                eyeX2 = segment.x * gridSize + 12; eyeY2 = segment.y * gridSize + 14;
            } else if (dx === -1) { // Left
                eyeX1 = segment.x * gridSize + 6; eyeY1 = segment.y * gridSize + 4;
                eyeX2 = segment.x * gridSize + 6; eyeY2 = segment.y * gridSize + 14;
            } else if (dy === 1) { // Down
                eyeX1 = segment.x * gridSize + 4; eyeY1 = segment.y * gridSize + 12;
                eyeX2 = segment.x * gridSize + 14; eyeY2 = segment.y * gridSize + 12;
            } else { // Up
                eyeX1 = segment.x * gridSize + 4; eyeY1 = segment.y * gridSize + 6;
                eyeX2 = segment.x * gridSize + 14; eyeY2 = segment.y * gridSize + 6;
            }
            ctx.beginPath(); ctx.arc(eyeX1, eyeY1, eyeSize, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(eyeX2, eyeY2, eyeSize, 0, Math.PI*2); ctx.fill();
            
        } else {
            // Body segments
            ctx.fillStyle = colors.body;
            drawRoundedRect(segment.x * gridSize + 1, segment.y * gridSize + 1, gridSize - 3, gridSize - 3, 4);
        }
    });
}

function drawRoundedRect(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
}

function moveSnake() {
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    snake.unshift(head); // Add new head
}

function checkCollision() {
    const head = snake[0];
    
    // Wall collision
    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        return true;
    }
    
    // Self collision
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            return true;
        }
    }
    
    return false;
}

function checkFood() {
    const head = snake[0];
    
    if (head.x === foodX && head.y === foodY) {
        score += 10;
        scoreElement.textContent = score;
        placeFood();
        
        // Increase speed slightly
        if (speed > 50) {
            speed -= 3;
            clearInterval(gameLoop);
            gameLoop = setInterval(update, speed);
        }
    } else {
        snake.pop(); // Remove tail if no food eaten
    }
}

function placeFood() {
    let newX, newY;
    let onSnake = true;
    
    while (onSnake) {
        newX = Math.floor(Math.random() * tileCount);
        newY = Math.floor(Math.random() * tileCount);
        
        onSnake = snake.some(segment => segment.x === newX && segment.y === newY);
    }
    
    foodX = newX;
    foodY = newY;
}

function gameOver() {
    isGameOver = true;
    clearInterval(gameLoop);
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('snakeHighScore', highScore);
        highScoreElement.textContent = highScore;
    }
    
    finalScoreElement.textContent = score;
    gameOverScreen.classList.remove('hidden');
}

// Input handling
function changeDirection(newDx, newDy) {
    if (!gameStarted) return;
    
    // Prevent reverse gear based on current movement direction (dx/dy), 
    // not just the queued direction, to prevent fast turn death
    if ((newDx === 1 && dx === -1) || 
        (newDx === -1 && dx === 1) || 
        (newDy === 1 && dy === -1) || 
        (newDy === -1 && dy === 1)) {
        return;
    }
    
    nextDx = newDx;
    nextDy = newDy;
}

window.addEventListener('keydown', e => {
    switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            changeDirection(0, -1);
            e.preventDefault(); // Prevent scrolling
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            changeDirection(0, 1);
            e.preventDefault();
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            changeDirection(-1, 0);
            e.preventDefault();
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            changeDirection(1, 0);
            e.preventDefault();
            break;
    }
});

// Mobile Controls
document.getElementById('btn-up').addEventListener('click', () => changeDirection(0, -1));
document.getElementById('btn-down').addEventListener('click', () => changeDirection(0, 1));
document.getElementById('btn-left').addEventListener('click', () => changeDirection(-1, 0));
document.getElementById('btn-right').addEventListener('click', () => changeDirection(1, 0));

startBtn.addEventListener('click', () => {
    gameStarted = true;
    initGame();
});

restartBtn.addEventListener('click', () => {
    initGame();
});

// Initial draw to show the board
draw();
