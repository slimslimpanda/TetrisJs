/**
 * DOM要素の取得
 */
const canvas = document.getElementById('game-canvas');
const context = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextContext = nextCanvas.getContext('2d');
const scoreElement = document.getElementById('score');
const linesElement = document.getElementById('lines');
const levelElement = document.getElementById('level');
const gameOverModal = document.getElementById('game-over-modal');

// オーディオ関連の要素
const bgm = document.getElementById('bgm');
const playPauseButton = document.getElementById('play-pause-button');
const gameWrapper = document.querySelector('.game-wrapper');
const tetrisFlashEffect = document.getElementById('tetris-flash-effect');
const fireworksContainer = document.getElementById('fireworks-container');
const newsMarqueeContainer = document.getElementById('news-marquee-container');

/**
 * ゲームの設定
 */
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const NEXT_BLOCK_SIZE = 20;

// キャンバスのサイズ設定
canvas.width = COLS * BLOCK_SIZE;
canvas.height = ROWS * BLOCK_SIZE;
nextCanvas.width = 6 * NEXT_BLOCK_SIZE;
nextCanvas.height = 6 * NEXT_BLOCK_SIZE;


/**
 * テトリミノ（ブロック）の色
 * @type {Array<string|null>}
 */
const COLORS = [
    null,
    '#FF0D72', // Z
    '#0DC2FF', // S
    '#0DFF72', // T
    '#F538FF', // O
    '#FF8E0D', // L
    '#FFE138', // J
    '#3877FF'  // I
];

/**
 * テトリミノの形状
 * @type {Array<Array<Array<number>>>}
 */
const SHAPES = [
    [], // 空
    [[1, 1, 0], [0, 1, 1], [0, 0, 0]], // Z
    [[0, 2, 2], [2, 2, 0], [0, 0, 0]], // S
    [[0, 3, 0], [3, 3, 3], [0, 0, 0]], // T
    [[4, 4], [4, 4]],                   // O
    [[0, 0, 5], [5, 5, 5], [0, 0, 0]], // L
    [[6, 0, 0], [6, 6, 6], [0, 0, 0]], // J
    [[0, 0, 0, 0], [7, 7, 7, 7], [0, 0, 0, 0], [0, 0, 0, 0]] // I
];

/**
 * ゲームの状態変数
 */
let board;
let currentPiece;
let nextPiece;
let score;
let lines;
let level;
let dropCounter;
let dropInterval;
let gameOver;
let requestId;

/**
 * ゲームを初期化する関数
 */
function init() {
    // ボードを空にする
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    
    // スコアなどのリセット
    score = 0;
    lines = 0;
    level = 1;
    updateInfo();

    // 最初のピースと次のピースを生成
    nextPiece = createPiece();
    spawnNewPiece();

    // ゲームループの初期設定
    dropCounter = 0;
    dropInterval = 1000; // 1秒
    gameOver = false;
    
    // ゲームオーバー画面を非表示
    gameOverModal.style.display = 'none';

    // ゲームループを開始
    if (requestId) {
        cancelAnimationFrame(requestId);
    }
    animate();
    adjustGameScale(); // ゲーム初期化時にスケール調整
    fetchNews(); // ニュースを取得
}

/**
 * ゲームのスケールを調整する関数
 */
function adjustGameScale() {
    const gameContainer = document.querySelector('.game-container');
    const gameContainerWidth = gameContainer.offsetWidth;
    const gameContainerHeight = gameContainer.offsetHeight;

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // 左右に20px、上下に20pxの余白を考慮
    const scaleX = (windowWidth - 40) / gameContainerWidth;
    const scaleY = (windowHeight - 40) / gameContainerHeight;

    const scale = Math.min(scaleX, scaleY, 1); // 1より大きくしない

    gameWrapper.style.transform = `scale(${scale})`;
}

// ウィンドウのリサイズ時にスケールを調整
window.addEventListener('resize', adjustGameScale);

// 初期ロード時にスケールを調整
window.addEventListener('load', adjustGameScale);

/**
 * 新しいピースを生成して盤面の上部に配置する
 */
function spawnNewPiece() {
    currentPiece = nextPiece;
    nextPiece = createPiece();
    drawNextPiece();
    
    // 中央上部に配置
    currentPiece.x = Math.floor(COLS / 2) - Math.floor(currentPiece.shape[0].length / 2);
    currentPiece.y = 0;

    // ピースが初期位置で衝突する場合、ゲームオーバー
    if (!isValidMove(currentPiece.shape, currentPiece.x, currentPiece.y)) {
        gameOver = true;
        showGameOver();
    }
}

/**
 * ランダムなピースを生成する
 * @returns {{x: number, y: number, shape: Array<Array<number>>, color: string, typeId: number}}
 */
function createPiece() {
    const typeId = Math.floor(Math.random() * (SHAPES.length - 1)) + 1;
    const shape = SHAPES[typeId];
    return {
        x: 0,
        y: 0,
        shape: shape,
        color: COLORS[typeId],
        typeId: typeId
    };
}

/**
 * ゲームボードと現在のピースを描画する
 */
function draw() {
    // 全体をクリア
    context.clearRect(0, 0, canvas.width, canvas.height);
    // ボードを描画
    drawBoard();

    // 現在のピースを描画（明滅効果適用）
    // Math.sinを使って透明度を滑らかに変化させる
    const blinkAlpha = (Math.sin(lastTime / 100) + 1) / 2; // 0から1の間で変化
    context.globalAlpha = 0.5 + (blinkAlpha * 0.5); // 0.5から1.0の間で変化
    drawPiece(currentPiece, context, BLOCK_SIZE);
    context.globalAlpha = 1.0; // 透明度をリセット
}

/**
 * ゲームボードを描画する
 */
function drawBoard() {
    board.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value > 0) {
                context.fillStyle = COLORS[value];
                context.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                context.strokeStyle = '#000';
                context.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            }
        });
    });
}

/**
 * ピースを描画する
 * @param {{x: number, y: number, shape: Array<Array<number>>, color: string, typeId: number}} piece - 描画するピースオブジェクト
 * @param {CanvasRenderingContext2D} ctx - 描画コンテキスト
 * @param {number} blockSize - ブロックのサイズ
 */
function drawPiece(piece, ctx, blockSize) {
    ctx.fillStyle = piece.color;
    piece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value > 0) {
                ctx.fillRect((piece.x + x) * blockSize, (piece.y + y) * blockSize, blockSize, blockSize);
                ctx.strokeStyle = '#000';
                ctx.strokeRect((piece.x + x) * blockSize, (piece.y + y) * blockSize, blockSize, blockSize);
            }
        });
    });
}

/**
 * 次のピース表示エリアにピースを描画する
 */
function drawNextPiece() {
    nextContext.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    const piece = nextPiece;
    const shape = piece.shape;
    const size = shape.length;
    const offsetX = (nextCanvas.width - size * NEXT_BLOCK_SIZE) / 2;
    const offsetY = (nextCanvas.height - size * NEXT_BLOCK_SIZE) / 2;
    
    nextContext.fillStyle = piece.color;
    shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value > 0) {
                nextContext.fillRect(offsetX + x * NEXT_BLOCK_SIZE, offsetY + y * NEXT_BLOCK_SIZE, NEXT_BLOCK_SIZE, NEXT_BLOCK_SIZE);
                nextContext.strokeStyle = '#0f0f18';
                nextContext.strokeRect(offsetX + x * NEXT_BLOCK_SIZE, offsetY + y * NEXT_BLOCK_SIZE, NEXT_BLOCK_SIZE, NEXT_BLOCK_SIZE);
            }
        });
    });
}

/**
 * ゲームのメインループ
 * @param {DOMHighResTimeStamp} time - 現在の時刻
 */
let lastTime = 0;
function animate(time = 0) {
    if (gameOver) return;

    const deltaTime = time - lastTime;
    lastTime = time;

    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        movePieceDown();
    }

    draw();
    requestId = requestAnimationFrame(animate);
}

/**
 * ピースを1マス下に移動させる
 */
function movePieceDown() {
     if (!isValidMove(currentPiece.shape, currentPiece.x, currentPiece.y + 1)) {
        lockPiece();
        removeLines();
        spawnNewPiece();
    } else {
        currentPiece.y++;
    }
    dropCounter = 0;
}

/**
 * ピースを左に1マス移動させる
 */
function movePieceLeft() {
    if (isValidMove(currentPiece.shape, currentPiece.x - 1, currentPiece.y)) {
        currentPiece.x--;
    }
}

/**
 * ピースを右に1マス移動させる
 */
function movePieceRight() {
    if (isValidMove(currentPiece.shape, currentPiece.x + 1, currentPiece.y)) {
        currentPiece.x++;
    }
}

/**
 * ピースを一番下までハードドロップさせる
 */
function hardDrop() {
    while(isValidMove(currentPiece.shape, currentPiece.x, currentPiece.y + 1)) {
        currentPiece.y++;
        score += 2; // ハードドロップボーナス
    }
    // ピースを即座に固定し、次のピースを生成
    lockPiece();
    removeLines();
    spawnNewPiece();
    updateInfo();
}

/**
 * ピースを回転させる
 */
function rotatePiece() {
    const originalShape = currentPiece.shape;
    let newShape = originalShape.map((_, index) =>
        originalShape.map(col => col[index])
    );
    newShape = newShape.map(row => row.reverse());
    
    // 回転後の位置を調整（壁キック）
    let kick = 0;
    if (!isValidMove(newShape, currentPiece.x, currentPiece.y)) {
        kick = 1; // 右に1つずらす
        if (!isValidMove(newShape, currentPiece.x + kick, currentPiece.y)) {
            kick = -1; // 左に1つずらす
            if (!isValidMove(newShape, currentPiece.x + kick, currentPiece.y)) {
                kick = 2; // 右に2つ
                 if (!isValidMove(newShape, currentPiece.x + kick, currentPiece.y)) {
                    kick = -2; //左に2つ
                    if (!isValidMove(newShape, currentPiece.x + kick, currentPiece.y)) {
                        return; // 回転不可
                    }
                 }
            }
        }
    }
    
    currentPiece.shape = newShape;
    currentPiece.x += kick;
}

/**
 * ピースの移動が有効かどうかを判定する
 * @param {Array<Array<number>>} shape - 判定するピースの形状
 * @param {number} posX - 判定するX座標
 * @param {number} posY - 判定するY座標
 * @returns {boolean} - 移動が有効な場合はtrue、そうでない場合はfalse
 */
function isValidMove(shape, posX, posY) {
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x] > 0) {
                let newX = posX + x;
                let newY = posY + y;

                // ボードの範囲外かチェック
                if (newX < 0 || newX >= COLS || newY >= ROWS) {
                    return false;
                }
                // 他のブロックと衝突するかチェック
                if (newY >= 0 && board[newY][newX] > 0) {
                    return false;
                }
            }
        }
    }
    return true;
}

/**
 * 現在のピースをボードに固定する
 */
function lockPiece() {
    currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value > 0) {
                if (currentPiece.y + y >= 0) {
                   board[currentPiece.y + y][currentPiece.x + x] = currentPiece.typeId;
                }
            }
        });
    });
}

/**
 * 揃ったラインを削除し、スコアを更新する
 */
function removeLines() {
    let linesCleared = 0;
    outer: for (let y = ROWS - 1; y >= 0; y--) {
        for (let x = 0; x < COLS; x++) {
            if (board[y][x] === 0) {
                continue outer;
            }
        }

        // 行を削除
        const row = board.splice(y, 1)[0].fill(0);
        board.unshift(row);
        y++;
        linesCleared++;
    }
    
    // スコア計算
    if (linesCleared > 0) {
        // 基本スコア
        let lineScore = [0, 100, 300, 500, 800][linesCleared];
        score += lineScore * level;
        lines += linesCleared;
        
        // テトリス演出
        if (linesCleared === 4) {
            triggerTetrisFlash();
        }

        // レベルアップ
        level = Math.floor(lines / 10) + 1;
        dropInterval = 1000 - (level - 1) * 50;
        if (dropInterval < 100) dropInterval = 100; // 最速
        
        updateInfo();
    }
}

/**
 * テトリス時の派手な演出をトリガーする関数
 */
function triggerTetrisFlash() {
    tetrisFlashEffect.classList.add('active');
    setTimeout(() => {
        tetrisFlashEffect.classList.remove('active');
    }, 200); // 200ms後に非表示

    // 花火を数発生成
    for (let i = 0; i < 5; i++) { // 5発の花火
        setTimeout(() => {
            createFirework();
        }, i * 100); // 100msごとに花火を生成
    }
}

/**
 * 花火を生成する関数
 */
function createFirework() {
    const particle = document.createElement('div');
    particle.classList.add('firework-particle');

    // ランダムな位置とサイズ
    const size = Math.random() * 10 + 5; // 5pxから15px
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.top = `${Math.random() * 100}%`;
    particle.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 70%)`; // ランダムな色

    fireworksContainer.appendChild(particle);

    // アニメーション終了後に要素を削除
    particle.addEventListener('animationend', () => {
        particle.remove();
    });
}

/**
 * スコア、ライン数、レベルの表示を更新する
 */
function updateInfo() {
    scoreElement.textContent = score;
    linesElement.textContent = lines;
    levelElement.textContent = level;
}

/**
 * ニュースを取得して表示する関数
 */
async function fetchNews() {
    const RSS_URL = 'https://news.google.com/rss?hl=ja&gl=JP&ceid=JP:ja';
    const CORS_PROXY = 'https://api.allorigins.win/get?url='; // CORS回避のためのプロキシ

    try {
        const response = await fetch(CORS_PROXY + encodeURIComponent(RSS_URL));
        const data = await response.json();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(data.contents, 'text/xml');
        
        const items = xmlDoc.querySelectorAll('item');
        let newsContent = [];

        items.forEach((item, index) => {
            if (index < 20) { // 最新の20件を取得
                const title = item.querySelector('title').textContent;
                const link = item.querySelector('link').textContent;
                newsContent.push({ title, link });
            }
        });

        if (newsContent.length === 0) {
            newsContent.push({ title: 'ニュースの取得に失敗しました。' });
        }

        newsMarqueeContainer.innerHTML = ''; // 既存のニュースをクリア

        const numRows = 20; // ニュースの行数
        const rowHeight = newsMarqueeContainer.offsetHeight / numRows; // 各行の高さ

        for (let i = 0; i < numRows; i++) {
            const news = newsContent[i % newsContent.length];
            const newsItem = document.createElement('div');
            newsItem.classList.add('news-item');
            const anchor = document.createElement('a');
            anchor.href = news.link || '#';
            anchor.textContent = news.title;
            anchor.target = '_blank';
            newsItem.appendChild(anchor);
            newsMarqueeContainer.appendChild(newsItem);

            // 位置とアニメーション速度を設定
            newsItem.style.top = `${i * rowHeight}px`;
            const animationDuration = (newsItem.offsetWidth + newsMarqueeContainer.offsetWidth) / 50; // 50px/s の速度を想定
            newsItem.style.animationDuration = `${animationDuration}s`;
            newsItem.style.animationDelay = `-${Math.random() * animationDuration}s`; // ランダムな開始位置
        }

    } catch (error) {
        console.error('ニュースの取得に失敗しました:', error);
        const newsItem = document.createElement('div');
        newsItem.classList.add('news-item');
        newsItem.textContent = 'ニュースの取得に失敗しました。';
        newsMarqueeContainer.appendChild(newsItem);
    }
}

/**
 * ゲームオーバー画面を表示する
 */
function showGameOver() {
    cancelAnimationFrame(requestId);
    gameOver = true;
    gameOverModal.style.display = 'flex';
}

/**
 * キーボードイベントリスナー
 */
document.addEventListener('keydown', event => {
    if (gameOver) return;

    switch (event.code) {
        case 'ArrowLeft':
        case 'KeyA':
            movePieceLeft();
            break;
        case 'ArrowRight':
        case 'KeyD':
            movePieceRight();
            break;
        case 'ArrowDown':
        case 'KeyS':
            movePieceDown();
            // ソフトドロップボーナス
            score += 1;
            updateInfo();
            break;
        case 'ArrowUp':
        case 'KeyW':
            rotatePiece();
            break;
        case 'Space':
            event.preventDefault(); // ページスクロール防止
            hardDrop();
            break;
    }
});

/**
 * スマホ用ボタンのイベントリスナー
 */
document.getElementById('left-button').addEventListener('click', movePieceLeft);
document.getElementById('right-button').addEventListener('click', movePieceRight);
document.getElementById('down-button').addEventListener('click', movePieceDown);
document.getElementById('rotate-button').addEventListener('click', rotatePiece);
document.getElementById('drop-button').addEventListener('click', hardDrop);
document.getElementById('restart-button').addEventListener('click', init);

// BGMコントロールのイベントリスナー
playPauseButton.addEventListener('click', () => {
    if (bgm.paused) {
        bgm.play();
        playPauseButton.textContent = '⏸';
    } else {
        bgm.pause();
        playPauseButton.textContent = '▶';
    }
});


    



// ゲーム開始時にBGMを再生
bgm.volume = 0.2; // 初期音量を小さめに設定
bgm.play().catch(error => {
    console.log("BGMの自動再生に失敗しました。ユーザーの操作が必要です。", error);
    playPauseButton.textContent = '▶'; // 再生ボタンを再生状態にする
});

// Touch event variables
let startX, startY;
const SWIPE_THRESHOLD = 50; // Minimum distance for a swipe
const TAP_THRESHOLD = 10; // Maximum distance for a tap

canvas.addEventListener('touchstart', e => {
    if (gameOver) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    e.preventDefault(); // Prevent scrolling
}, { passive: false });

canvas.addEventListener('touchend', e => {
    if (gameOver) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;

    const diffX = endX - startX;
    const diffY = endY - startY;

    if (Math.abs(diffX) > Math.abs(diffY)) { // Horizontal swipe
        if (Math.abs(diffX) > SWIPE_THRESHOLD) {
            if (diffX > 0) {
                movePieceRight();
            } else {
                movePieceLeft();
            }
        }
    } else { // Vertical swipe or tap
        if (Math.abs(diffY) > SWIPE_THRESHOLD) {
            if (diffY > 0) {
                movePieceDown();
                score += 1; // Soft drop bonus
                updateInfo();
            } else {
                rotatePiece(); // Upward swipe to rotate
            }
        } else if (Math.abs(diffX) < TAP_THRESHOLD && Math.abs(diffY) < TAP_THRESHOLD) {
            // This is a tap, consider it a hard drop
            hardDrop();
        }
    }
}, { passive: false });

// ゲーム開始
init();