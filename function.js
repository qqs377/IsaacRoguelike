// Initialize game
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    setupEventListeners();
    showMenu();
}

function setupEventListeners() {
    // Keyboard events
    document.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;
        if (e.key === 'Enter' && floorCompleted) {
            nextFloor();
        }
    });
    
    document.addEventListener('keyup', (e) => {
        keys[e.key.toLowerCase()] = false;
    });
    
    // Mouse events for aiming only
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
    });
    
    // UI buttons
    document.getElementById('startGame').addEventListener('click', startGame);
    document.getElementById('restartGame').addEventListener('click', startGame);
    document.getElementById('submitScore').addEventListener('click', submitScore);
    document.getElementById('showLeaderboard').addEventListener('click', showLeaderboard);
    document.getElementById('closeLeaderboard').addEventListener('click', hideLeaderboard);
}

function startGame() {
    gameState = 'playing';
    resetGame();
    hideAllScreens();
    generateFloor();
    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(update, 1000/60); // 60 FPS
}

function resetGame() {
    player = {
        x: 400,
        y: 300,
        radius: 15,
        speed: 3,
        health: 100,
        maxHealth: 100,
        color: '#4CAF50'
    };
    
    playerStats = {
        damage: 1,
        fireRate: 10,
        bulletSpeed: 8,
        armor: 0,
        critChance: 0.05,
        bulletType: 'normal'
    };
    
    // Reset XP and level
    playerLevel = 1;
    currentXP = 0;
    xpToNextLevel = 50; // Reset to initial value
    xpGainedThisLevel = 0;
    activeSkills = [];
    removedCards = new Set();
    
    bullets = [];
    enemies = [];
    particles = [];
    score = 0;
    floor = 1;
    enemiesKilled = 0;
    floorCompleted = false;
    lastShotTime = 0;
    updateUI();
}

function generateFloor() {
    enemies = [];
    
    const enemyCount = Math.min(5 + floor * 2, 15);
    
    // Generate enemies
    for (let i = 0; i < enemyCount; i++) {
        const enemyType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
        let x, y;
        
        // Ensure enemies don't spawn too close to player
        do {
            x = Math.random() * (canvas.width - enemyType.radius * 2) + enemyType.radius;
            y = Math.random() * (canvas.height - enemyType.radius * 2) + enemyType.radius;
        } while (Math.hypot(x - player.x, y - player.y) < 100);
        
        enemies.push({
            x: x,
            y: y,
            radius: enemyType.radius,
            speed: enemyType.speed, // No speed scaling
            health: enemyType.health + Math.floor(floor / 4), // Slower health scaling
            maxHealth: enemyType.health + Math.floor(floor / 4),
            color: enemyType.color,
            points: enemyType.points,
            xp: enemyType.xp,
            lastHit: 0
        });
    }
    
    floorCompleted = false;
    updateUI();
}

function nextFloor() {
    floor++;
    generateFloor();
}

// Auto-shooting function
let autoShootTimer = 0;

function autoShoot() {
    const currentTime = Date.now();
    if (currentTime - lastShotTime < playerStats.fireRate * 16.67) return;
    
    if (enemies.length > 0) { // Only shoot if there are enemies
        const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
        const isCrit = Math.random() < playerStats.critChance;
        
        // Handle different bullet types
        if (playerStats.bulletType === 'rapid') {
            // Shoot 3 bullets in a spread
            for (let i = -1; i <= 1; i++) {
                const spreadAngle = angle + (i * 0.2);
                createBullet(spreadAngle, isCrit);
            }
        } else {
            createBullet(angle, isCrit);
        }
        
        lastShotTime = currentTime;
    }
} 
    
    const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    const isCrit = Math.random() < playerStats.critChance;
    
    // Handle different bullet types
    if (playerStats.bulletType === 'rapid') {
        // Shoot 3 bullets in a spread
        for (let i = -1; i <= 1; i++) {
            const spreadAngle = angle + (i * 0.2);
            createBullet(spreadAngle, isCrit);
        }
    } else {
        createBullet(angle, isCrit);
    }
    
    lastShotTime = currentTime;
}

function createBullet(angle, isCrit) {
    const bullet = {
        x: player.x,
        y: player.y,
        vx: Math.cos(angle) * playerStats.bulletSpeed,
        vy: Math.sin(angle) * playerStats.bulletSpeed,
        radius: isCrit ? 6 : 4,
        life: 100,
        damage: playerStats.damage * (isCrit ? 2 : 1),
        isCrit: isCrit,
        type: playerStats.bulletType,
        color: getBulletColor(isCrit),
        pierced: 0
    };
    
    bullets.push(bullet);
}

function getBulletColor(isCrit) {
    if (isCrit) return '#FF0000';
    
    switch (playerStats.bulletType) {
        case 'explosive': return '#FF8800';
        case 'piercing': return '#00FF88';
        case 'rapid': return '#8800FF';
        default: return '#FFD700';
    }
}

function gainXP(amount) {
    currentXP += amount;
    xpGainedThisLevel += amount;
    
    // Check for level up
    if (currentXP >= xpToNextLevel) {
        levelUp();
    }
}

function levelUp() {
    playerLevel++;
    currentXP -= xpToNextLevel;
    xpToNextLevel = Math.floor(xpToNextLevel * 1.3); // Reduced from 1.5 to 1.3
    xpGainedThisLevel = 0;
    
    // Pause the game and show level up screen
    gameState = 'levelUp';
    showLevelUpScreen();
}
