const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const nextContext = nextCanvas.getContext('2d');
const scoreElement = document.getElementById('score');
const startButton = document.getElementById('start-button');

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 24;

context.canvas.width = COLS * BLOCK_SIZE;
context.canvas.height = ROWS * BLOCK_SIZE;

nextContext.canvas.width = 4 * BLOCK_SIZE;
nextContext.canvas.height = 4 * BLOCK_SIZE;


const COLORS = [
    null,
    '#FF0D72', // T
    '#0DC2FF', // I
    '#0DFF72', // O
    '#F538FF', // L
    '#FF8E0D', // J
    '#FFE138', // S
    '#3877FF'  // Z
];

const SHAPES = [
    [], // Empty
    [[1, 1, 1], [0, 1, 0]], // T
    [[2, 2, 2, 2]], // I
    [[3, 3], [3, 3]], // O
    [[4, 0, 0], [4, 4, 4]], // L
    [[0, 0, 5], [5, 5, 5]], // J
    [[0, 6, 6], [6, 6, 0]], // S
    [[7, 7, 0], [0, 7, 7]]  // Z
];

let board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
let score = 0;
let level = 0;
let piece;
let nextPiece;
let paused = false;
let gameStarted = false;
let animationFrameId;

function drawBlock(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    ctx.strokeStyle = '#000';
    ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
}

function drawBoard() {
    board.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value > 0) {
                drawBlock(context, x, y, COLORS[value]);
            }
        });
    });
}

function drawPiece(ctx, p) {
    p.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value > 0) {
                drawBlock(ctx, p.x + x, p.y + y, COLORS[value]);
            }
        });
    });
}

function drawNextPiece() {
    nextContext.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    if (nextPiece) {
        const p = { ...nextPiece, x: 1, y: 1 };
        drawPiece(nextContext, p);
    }
}

function getRandomPiece() {
    const rand = Math.floor(Math.random() * (SHAPES.length - 1)) + 1;
    const shape = SHAPES[rand];
    return {
        x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
        y: 0,
        shape: shape,
        color: COLORS[rand]
    };
}

let lastTime = 0;
let dropCounter = 0;
let dropInterval = 1000;

function update(time = 0) {
    if (paused) {
        animationFrameId = requestAnimationFrame(update);
        return;
    }

    const deltaTime = time - lastTime;
    lastTime = time;

    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        pieceDrop();
    }

    draw();
    animationFrameId = requestAnimationFrame(update);
}

function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    drawBoard();
    if (piece) {
        drawPiece(context, piece);
    }
    drawNextPiece();
}

function pieceDrop() {
    if (!piece) return;
    piece.y++;
    if (collision()) {
        piece.y--;
        solidifyPiece();
    }
    dropCounter = 0;
}

function collision() {
    if (!piece) return false;
    for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
            if (
                piece.shape[y][x] !== 0 &&
                (
                    (board[piece.y + y] && board[piece.y + y][piece.x + x]) !== 0 ||
                    piece.x + x < 0 ||
                    piece.x + x >= COLS ||
                    piece.y + y >= ROWS
                )
            ) {
                return true;
            }
        }
    }
    return false;
}

function solidifyPiece() {
    piece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value > 0) {
                if (piece.y + y < 0) return;
                board[piece.y + y][piece.x + x] = value;
            }
        });
    });

    removeLines();

    piece = nextPiece;
    nextPiece = getRandomPiece();

    if (collision()) {
        gameOver();
    }
}

function gameOver() {
    cancelAnimationFrame(animationFrameId);
    gameStarted = false;
    context.fillStyle = 'rgba(0,0,0, 0.75)';
    context.fillRect(0, canvas.height / 2 - 30, canvas.width, 60);
    context.fillStyle = 'white';
    context.font = '30px Arial';
    context.textAlign = 'center';
    context.fillText('Game Over', canvas.width / 2, canvas.height / 2);
    startButton.innerText = 'Start Game';
}


function removeLines() {
    let linesRemoved = 0;
    outer: for (let y = ROWS - 1; y >= 0; y--) {
        for (let x = 0; x < COLS; x++) {
            if (board[y][x] === 0) {
                continue outer;
            }
        }

        const row = board.splice(y, 1)[0].fill(0);
        board.unshift(row);
        y++;
        linesRemoved++;
    }

    if (linesRemoved > 0) {
        score += linesRemoved * 10 * (level + 1);
        scoreElement.innerText = score;
        level = Math.floor(score / 100);
        dropInterval = 1000 - level * 50;
        if (dropInterval < 100) dropInterval = 100;
    }
}

function rotate() {
    if (!piece) return;
    const originalShape = piece.shape;
    const newShape = originalShape[0].map((_, colIndex) => originalShape.map(row => row[colIndex]).reverse());
    
    const originalX = piece.x;
    let offsetX = 1;
    piece.shape = newShape;

    while(collision()) {
        piece.x += offsetX;
        offsetX = -(offsetX + (offsetX > 0 ? 1 : -1));
        if (offsetX > newShape[0].length) {
            piece.shape = originalShape;
            piece.x = originalX;
            return;
        }
    }
}


document.addEventListener('keydown', event => {
    if (!gameStarted || paused) return;

    if (event.keyCode === 37) { // Left Arrow
        piece.x--;
        if (collision()) {
            piece.x++;
        }
    } else if (event.keyCode === 39) { // Right Arrow
        piece.x++;
        if (collision()) {
            piece.x--;
        }
    } else if (event.keyCode === 40) { // Down Arrow
        pieceDrop();
    } else if (event.keyCode === 38) { // Up Arrow
        rotate();
    }
});


function startGame() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    board.forEach(row => row.fill(0));
    score = 0;
    level = 0;
    dropInterval = 1000;
    scoreElement.innerText = score;
    piece = getRandomPiece();
    nextPiece = getRandomPiece();
    gameStarted = true;
    paused = false;
    startButton.innerText = 'Pause';
    update();
}

function togglePause() {
    if (!gameStarted) return;
    paused = !paused;
    startButton.innerText = paused ? 'Resume' : 'Pause';
}

startButton.addEventListener('click', () => {
    if (gameStarted && !paused) {
        togglePause();
    } else if (gameStarted && paused) {
        togglePause();
    }
    else {
        startGame();
    }
});

// Initial draw to show empty board
draw();
