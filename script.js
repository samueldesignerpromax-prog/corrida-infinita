/**
 * Endless Runner - Jogo estilo Subway Surfers
 * Controles: ← → (mover), ↑ (pular), ↓ (deslizar) | Swipes no mobile
 * Características: Velocidade crescente, 3 faixas, obstáculos aleatórios
 */

// ==================== CONFIGURAÇÕES INICIAIS ====================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Dimensões do canvas
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// Configurações do jogo
const LANE_COUNT = 3;
const LANE_WIDTH = CANVAS_WIDTH / LANE_COUNT;
const LANE_POSITIONS = [
    LANE_WIDTH / 2,           // Faixa esquerda
    LANE_WIDTH * 1.5,         // Faixa central
    LANE_WIDTH * 2.5          // Faixa direita
];

// ==================== VARIÁVEIS GLOBAIS ====================
let gameRunning = true;
let score = 0;
let highScore = localStorage.getItem('runnerHighScore') || 0;
let gameSpeed = 3; // Velocidade base (aumenta com o tempo)
let distance = 0;
let frame = 0;
let animationId = null;

// Elementos DOM
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const speedElement = document.getElementById('speed');
const gameOverlay = document.getElementById('gameOverlay');
const finalScoreElement = document.getElementById('finalScore');
const finalDistanceElement = document.getElementById('finalDistance');
const restartButton = document.getElementById('restartButton');
const floatingRestart = document.getElementById('floatingRestart');

// Atualizar recorde
highScoreElement.textContent = highScore;

// ==================== CLASSE DO PERSONAGEM ====================
class Player {
    constructor() {
        this.width = 40;
        this.height = 45;
        this.lane = 1; // 0-esquerda, 1-centro, 2-direita
        this.x = LANE_POSITIONS[this.lane] - this.width / 2;
        this.y = CANVAS_HEIGHT - 100;
        this.isJumping = false;
        this.isSliding = false;
        this.velocityY = 0;
        this.gravity = 0.8;
        this.jumpPower = -12;
        this.slideTimer = 0;
        
        // Animação
        this.animationFrame = 0;
        this.animStep = 0;
    }
    
    // Mover entre faixas
    moveLeft() {
        if (!gameRunning) return;
        if (this.lane > 0) {
            this.lane--;
            this.updateX();
        }
    }
    
    moveRight() {
        if (!gameRunning) return;
        if (this.lane < LANE_COUNT - 1) {
            this.lane++;
            this.updateX();
        }
    }
    
    updateX() {
        this.x = LANE_POSITIONS[this.lane] - this.width / 2;
    }
    
    // Pular
    jump() {
        if (!gameRunning) return;
        if (!this.isJumping && !this.isSliding) {
            this.isJumping = true;
            this.velocityY = this.jumpPower;
            playJumpSound();
            
            // Animação de pulo
            this.animationFrame = 10;
        }
    }
    
    // Deslizar
    slide() {
        if (!gameRunning) return;
        if (!this.isJumping && !this.isSliding) {
            this.isSliding = true;
            this.slideTimer = 20; // Duração do deslize (frames)
            this.height = 30; // Reduz altura durante deslize
            this.y = CANVAS_HEIGHT - 85;
            playSlideSound();
        }
    }
    
    // Atualizar física
    update() {
        // Gravidade e pulo
        if (this.isJumping) {
            this.velocityY += this.gravity;
            this.y += this.velocityY;
            
            // Verificar se atingiu o chão
            if (this.y >= CANVAS_HEIGHT - 100) {
                this.y = CANVAS_HEIGHT - 100;
                this.isJumping = false;
                this.velocityY = 0;
            }
        }
        
        // Atualizar deslize
        if (this.isSliding) {
            this.slideTimer--;
            if (this.slideTimer <= 0) {
                this.isSliding = false;
                this.height = 45;
                this.y = CANVAS_HEIGHT - 100;
            }
        }
        
        // Animação de caminhada
        if (!this.isJumping && !this.isSliding && gameRunning) {
            this.animStep = (this.animStep + 0.2) % (Math.PI * 2);
        }
    }
    
    // Desenhar personagem
    draw() {
        ctx.save();
        
        // Efeito de pulo (ligeira rotação)
        if (this.isJumping) {
            ctx.translate(this.x + this.width/2, this.y + this.height/2);
            ctx.rotate(this.velocityY * 0.03);
            ctx.translate(-(this.x + this.width/2), -(this.y + this.height/2));
        }
        
        // Corpo (varia com estado)
        let bodyColor = '#FF6B6B';
        let emblemColor = '#FFE066';
        
        if (this.isSliding) {
            bodyColor = '#FF8E8E';
            emblemColor = '#FFD700';
        }
        
        // Sombra
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        
        // Corpo principal
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.width, this.height, 10);
        ctx.fill();
        
        // Cabeça
        ctx.fillStyle = '#FF8E8E';
        ctx.beginPath();
        ctx.arc(this.x + this.width/2, this.y - 5, this.width/2.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Olhos
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(this.x + this.width*0.35, this.y - 10, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x + this.width*0.65, this.y - 10, 6, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#2C3E50';
        ctx.beginPath();
        ctx.arc(this.x + this.width*0.35, this.y - 10, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x + this.width*0.65, this.y - 10, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Brilho nos olhos
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(this.x + this.width*0.32, this.y - 12, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x + this.width*0.62, this.y - 12, 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Emblema no peito
        ctx.fillStyle = emblemColor;
        ctx.beginPath();
        ctx.rect(this.x + this.width/3, this.y + this.height/3, this.width/3, this.height/4);
        ctx.fill();
        
        // Mochila (detalhe)
        ctx.fillStyle = '#4A90E2';
        ctx.beginPath();
        ctx.roundRect(this.x - 8, this.y + 10, 10, 25, 5);
        ctx.fill();
        
        ctx.restore();
    }
}

// ==================== CLASSE DO OBSTÁCULO ====================
class Obstacle {
    constructor(lane, type = 'normal') {
        this.width = 35;
        this.height = 40;
        this.lane = lane;
        this.x = LANE_POSITIONS[lane] - this.width / 2;
        this.y = CANVAS_HEIGHT - 95;
        this.type = type; // 'normal', 'low' (low requer slide)
        this.active = true;
        
        // Cores diferentes por tipo
        this.colors = {
            normal: '#E74C3C',
            low: '#E67E22'
        };
    }
    
    update(speed) {
        // Obstáculos se movem em direção ao personagem (efeito de corrida)
        // Na verdade, eles vêm em direção à câmera
        // Vamos simular movimento fazendo eles "subirem" na tela
        // Ou melhor: o personagem está "parado" e o cenário se move
        // Para este jogo, os obstáculos se movem para baixo
        // Nova implementação: obstáculos vêm do topo em direção ao personagem
        this.y += speed;
        
        // Verificar se passou do personagem
        if (this.y > CANVAS_HEIGHT) {
            this.active = false;
        }
    }
    
    draw() {
        ctx.save();
        ctx.shadowBlur = 4;
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        
        // Corpo do obstáculo
        ctx.fillStyle = this.colors[this.type];
        ctx.beginPath();
        
        if (this.type === 'low') {
            ctx.roundRect(this.x, this.y + 10, this.width, this.height - 10, 8);
            // Listras
            ctx.fillStyle = '#D35400';
            for(let i = 0; i < 3; i++) {
                ctx.fillRect(this.x + 5, this.y + 15 + i*8, this.width - 10, 3);
            }
        } else {
            ctx.roundRect(this.x, this.y, this.width, this.height, 8);
            // Olhos malvados
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(this.x + 8, this.y + 15, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(this.x + this.width - 8, this.y + 15, 4, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = 'black';
            ctx.beginPath();
            ctx.arc(this.x + 7, this.y + 14, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(this.x + this.width - 9, this.y + 14, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.fill();
        ctx.restore();
    }
    
    checkCollision(player) {
        // Verificar se a hitbox colide
        const playerBox = {
            x: player.x,
            y: player.y,
            w: player.width,
            h: player.height
        };
        
        const obsBox = {
            x: this.x,
            y: this.y,
            w: this.width,
            h: this.height
        };
        
        // Colisão básica AABB
        if (playerBox.x < obsBox.x + obsBox.w &&
            playerBox.x + playerBox.w > obsBox.x &&
            playerBox.y < obsBox.y + obsBox.h &&
            playerBox.y + playerBox.h > obsBox.y) {
            
            // Verificar tipo especial
            if (this.type === 'low' && player.isSliding) {
                return false; // Deslize passa por cima
            }
            
            return true;
        }
        
        return false;
    }
}

// ==================== GERENCIAMENTO DE OBSTÁCULOS ====================
let obstacles = [];
let player;
let lastObstacleFrame = 0;
let obstacleInterval = 60; // Frames entre obstáculos (diminui com velocidade)

// Gerar obstáculo aleatório
function generateObstacle() {
    const lane = Math.floor(Math.random() * LANE_COUNT);
    // 30% de chance de ser obstáculo baixo (requer deslize)
    const type = Math.random() < 0.3 ? 'low' : 'normal';
    obstacles.push(new Obstacle(lane, type));
}

// Atualizar obstáculos
function updateObstacles() {
    // Gerar novos obstáculos baseado na velocidade
    const currentInterval = Math.max(20, obstacleInterval - Math.floor(gameSpeed / 2));
    
    if (frame - lastObstacleFrame > currentInterval) {
        generateObstacle();
        lastObstacleFrame = frame;
    }
    
    // Atualizar posições e verificar colisões
    for (let i = 0; i < obstacles.length; i++) {
        const obs = obstacles[i];
        obs.update(gameSpeed);
        
        // Verificar colisão
        if (obs.active && obs.checkCollision(player)) {
            gameOver();
        }
        
        // Remover obstáculos inativos
        if (!obs.active) {
            obstacles.splice(i, 1);
            i--;
        }
    }
}

// ==================== SISTEMA DE PONTUAÇÃO ====================
function updateScore() {
    // Pontuação baseada no tempo/distância
    score += Math.floor(gameSpeed * 0.5);
    distance += Math.floor(gameSpeed * 0.2);
    
    scoreElement.textContent = Math.floor(score);
    
    // Atualizar recorde
    if (Math.floor(score) > highScore) {
        highScore = Math.floor(score);
        highScoreElement.textContent = highScore;
        localStorage.setItem('runnerHighScore', highScore);
    }
}

function updateSpeed() {
    // Aumentar velocidade gradualmente (max 12)
    if (gameSpeed < 12) {
        gameSpeed += 0.002;
    }
    speedElement.textContent = Math.floor(gameSpeed * 10) / 10;
}

// ==================== SONS (Web Audio API) ====================
let audioContext = null;
let audioEnabled = false;

function initAudio() {
    if (!audioContext && !audioEnabled) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioEnabled = true;
    }
}

function playJumpSound() {
    if (!audioEnabled || !audioContext) return;
    try {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.value = 523.25;
        gain.gain.value = 0.2;
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.2);
        osc.stop(audioContext.currentTime + 0.2);
    } catch(e) {}
}

function playSlideSound() {
    if (!audioEnabled || !audioContext) return;
    try {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.value = 261.63;
        gain.gain.value = 0.15;
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.15);
        osc.stop(audioContext.currentTime + 0.15);
    } catch(e) {}
}

function playCrashSound() {
    if (!audioEnabled || !audioContext) return;
    try {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.value = 150;
        gain.gain.value = 0.3;
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.3);
        osc.stop(audioContext.currentTime + 0.3);
        
        // Segundo som de impacto
        setTimeout(() => {
            const osc2 = audioContext.createOscillator();
            const gain2 = audioContext.createGain();
            osc2.connect(gain2);
            gain2.connect(audioContext.destination);
            osc2.frequency.value = 100;
            gain2.gain.value = 0.2;
            osc2.start();
            gain2.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.3);
            osc2.stop(audioContext.currentTime + 0.3);
        }, 50);
    } catch(e) {}
}

// ==================== CENÁRIO E ANIMAÇÕES ====================
let backgroundOffset = 0;

function drawBackground() {
    // Gradiente de céu
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#1a2a6c');
    gradient.addColorStop(0.5, '#b21f1f');
    gradient.addColorStop(1, '#fdbb4d');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Trilhos (faixas)
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 3;
    for (let i = 1; i < LANE_COUNT; i++) {
        ctx.beginPath();
        ctx.moveTo(i * LANE_WIDTH, 0);
        ctx.lineTo(i * LANE_WIDTH, CANVAS_HEIGHT);
        ctx.stroke();
    }
    
    // Linhas de velocidade (efeito de movimento)
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 20; i++) {
        const x = (backgroundOffset + i * 40) % CANVAS_WIDTH;
        const y = CANVAS_HEIGHT - 50;
        ctx.fillRect(x, y, 3, 20);
    }
    backgroundOffset += gameSpeed;
    
    // Chão
    ctx.fillStyle = '#34495e';
    ctx.fillRect(0, CANVAS_HEIGHT - 50, CANVAS_WIDTH, 50);
    
    // Detalhes do chão
    ctx.fillStyle = '#2c3e50';
    for (let i = 0; i < 20; i++) {
        const x = (backgroundOffset * 2 + i * 50) % CANVAS_WIDTH;
        ctx.fillRect(x, CANVAS_HEIGHT - 30, 5, 10);
    }
}

function draw() {
    drawBackground();
    
    // Desenhar obstáculos
    for (let obs of obstacles) {
        obs.draw();
    }
    
    // Desenhar personagem
    player.draw();
    
    // Efeito de velocidade no HUD
    if (gameSpeed > 8) {
        ctx.strokeStyle = `rgba(255, 100, 100, ${(gameSpeed - 8) / 4})`;
        ctx.lineWidth = 3;
        ctx.strokeRect(5, 5, CANVAS_WIDTH - 10, CANVAS_HEIGHT - 10);
    }
}

// ==================== GAME OVER E REINÍCIO ====================
function gameOver() {
    if (!gameRunning) return;
    
    gameRunning = false;
    playCrashSound();
    
    finalScoreElement.textContent = Math.floor(score);
    finalDistanceElement.textContent = Math.floor(distance);
    gameOverlay.classList.remove('hidden');
    floatingRestart.classList.remove('hidden');
    
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
}

function restartGame() {
    gameRunning = true;
    score = 0;
    distance = 0;
    gameSpeed = 3;
    frame = 0;
    obstacles = [];
    lastObstacleFrame = 0;
    
    player = new Player();
    
    scoreElement.textContent = '0';
    speedElement.textContent = '3';
    gameOverlay.classList.add('hidden');
    floatingRestart.classList.add('hidden');
    
    // Reiniciar loop
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    gameLoop();
}

// ==================== CONTROLES (Desktop + Mobile) ====================
// Teclado
document.addEventListener('keydown', (e) => {
    if (!gameRunning) {
        if (e.code === 'Space' || e.code === 'Enter') {
            restartGame();
        }
        return;
    }
    
    switch(e.key) {
        case 'ArrowLeft': player.moveLeft(); break;
        case 'ArrowRight': player.moveRight(); break;
        case 'ArrowUp': player.jump(); break;
        case 'ArrowDown': player.slide(); break;
        case 'a': case 'A': player.moveLeft(); break;
        case 'd': case 'D': player.moveRight(); break;
        case 'w': case 'W': player.jump(); break;
        case 's': case 'S': player.slide(); break;
    }
    e.preventDefault();
});

// Mobile Swipes
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    initAudio();
});

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (!gameRunning) return;
    
    touchEndX = e.changedTouches[0].clientX;
    touchEndY = e.changedTouches[0].clientY;
    
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;
    
    // Determinar swipe (priorizar o maior eixo)
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 20) {
        // Swipe horizontal
        if (diffX > 0) {
            player.moveRight();
        } else {
            player.moveLeft();
        }
    } else if (Math.abs(diffY) > 20) {
        // Swipe vertical
        if (diffY < 0) {
            player.jump(); // Swipe para cima
        } else {
            player.slide(); // Swipe para baixo
        }
    }
});

// Clique no canvas para ativar áudio
canvas.addEventListener('click', () => {
    initAudio();
});

// Botões de reinício
restartButton.addEventListener('click', () => {
    initAudio();
    restartGame();
});

floatingRestart.addEventListener('click', () => {
    initAudio();
    restartGame();
});

// ==================== LOOP PRINCIPAL ====================
function gameLoop() {
    if (!gameRunning) {
        draw();
        return;
    }
    
    frame++;
    
    // Atualizar lógica
    player.update();
    updateObstacles();
    updateScore();
    updateSpeed();
    
    // Renderizar
    draw();
    
    // Continuar loop
    animationId = requestAnimationFrame(gameLoop);
}

// Helper: roundRect para canvas
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        this.moveTo(x+r, y);
        this.lineTo(x+w-r, y);
        this.quadraticCurveTo(x+w, y, x+w, y+r);
        this.lineTo(x+w, y+h-r);
        this.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
        this.lineTo(x+r, y+h);
        this.quadraticCurveTo(x, y+h, x, y+h-r);
        this.lineTo(x, y+r);
        this.quadraticCurveTo(x, y, x+r, y);
        return this;
    };
}

// ==================== INICIALIZAÇÃO ====================
function init() {
    player = new Player();
    gameRunning = true;
    score = 0;
    distance = 0;
    gameSpeed = 3;
    obstacles = [];
    frame = 0;
    lastObstacleFrame = 0;
    
    scoreElement.textContent =
