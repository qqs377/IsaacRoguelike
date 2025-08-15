// Supabase configuration
const SUPABASE_URL = 'https://dpopxtljjdkkzcnxwyfx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwb3B4dGxqamRra3pjbnh3eWZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwODAyMjIsImV4cCI6MjA2OTY1NjIyMn0.udAGcJa2CjZfKec34_QL-uBymgu2g9x9mWRrelwr11I';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Game state
let gameState = 'menu'; // menu, playing, levelUp, gameOver
let canvas, ctx;
let gameLoop;

// Player object
let player = {
    x: 400,
    y: 300,
    radius: 15,
    speed: 3,
    health: 100,
    maxHealth: 100,
    color: '#4CAF50'
};

// Game variables
let bullets = [];
let enemies = [];
let particles = [];
let keys = {};
let mouse = { x: 0, y: 0, down: false };
let score = 0;
let floor = 1;
let enemiesKilled = 0;
let floorCompleted = false;

// XP and Leveling system
let playerLevel = 1;
let currentXP = 0;
let xpToNextLevel = 100;
let xpGainedThisLevel = 0;

// Player stats and equipment
let playerStats = {
    damage: 1,
    fireRate: 10, // frames between shots
    bulletSpeed: 8,
    armor: 0,
    critChance: 0.05,
    bulletType: 'normal'
};

let lastShotTime = 0;

// Enemy types
const enemyTypes = [
    { radius: 12, speed: 1, health: 2, color: '#FF5722', points: 10, xp: 15 },
    { radius: 18, speed: 0.5, health: 4, color: '#9C27B0', points: 25, xp: 30 },
    { radius: 10, speed: 2, health: 1, color: '#FFC107', points: 5, xp: 10 },
    { radius: 25, speed: 0.3, health: 8, color: '#607D8B', points: 50, xp: 50 }
];

// Upgrade card definitions
const upgradeCards = [
    {
        id: 'health',
        name: 'Vitality',
        icon: '❤️',
        description: 'Increases your survivability',
        variants: [
            { name: 'Health Boost', effect: () => { player.health = Math.min(player.maxHealth, player.health + 30); }, display: '+30 Health' },
            { name: 'Max Health Up', effect: () => { player.maxHealth += 20; player.health += 20; }, display: '+20 Max Health' },
            { name: 'Armor Plating', effect: () => { playerStats.armor += 2; }, display: '+2 Armor' }
        ]
    },
    {
        id: 'speed',
        name: 'Agility',
        icon: '💨',
        description: 'Increases movement or projectile speed',
        variants: [
            { name: 'Swift Feet', effect: () => { player.speed += 1; }, display: '+1 Movement Speed' },
            { name: 'Faster Bullets', effect: () => { playerStats.bulletSpeed += 3; }, display: '+3 Bullet Speed' },
            { name: 'Quick Reload', effect: () => { playerStats.fireRate = Math.max(2, playerStats.fireRate - 3); }, display: 'Much Faster Shooting' }
        ]
    },
    {
        id: 'damage',
        name: 'Power',
        icon: '⚔️',
        description: 'Increases your damage output',
        variants: [
            { name: 'Sharp Blade', effect: () => { playerStats.damage += 0.8; }, display: '+0.8 Damage' },
            { name: 'Heavy Strike', effect: () => { playerStats.damage += 1.2; }, display: '+1.2 Damage' },
            { name: 'Berserker', effect: () => { playerStats.damage += 0.5; playerStats.fireRate = Math.max(2, playerStats.fireRate - 1); }, display: '+0.5 Damage, Faster Shooting' }
        ]
    },
    {
        id: 'defense',
        name: 'Defense',
        icon: '🛡️',
        description: 'Improves your defensive capabilities',
        variants: [
            { name: 'Iron Skin', effect: () => { playerStats.armor += 3; }, display: '+3 Armor' },
            { name: 'Reinforced Plating', effect: () => { playerStats.armor += 2; player.maxHealth += 15; player.health += 15; }, display: '+2 Armor, +15 Max Health' },
            { name: 'Damage Reduction', effect: () => { playerStats.armor += 1; player.speed += 0.3; }, display: '+1 Armor, +0.3 Speed' }
        ]
    },
    {
        id: 'critical',
        name: 'Precision',
        icon: '🎯',
        description: 'Improves critical hit capabilities',
        variants: [
            { name: 'Sharp Eye', effect: () => { playerStats.critChance += 0.08; }, display: '+8% Critical Chance' },
            { name: 'Deadly Aim', effect: () => { playerStats.critChance += 0.05; playerStats.damage += 0.3; }, display: '+5% Crit, +0.3 Damage' },
            { name: 'Lucky Shot', effect: () => { playerStats.critChance += 0.12; playerStats.bulletSpeed += 1; }, display: '+12% Crit, +1 Bullet Speed' }
        ]
    },
    {
        id: 'special_bullet',
        name: 'Special Ammo',
        icon: '🔥',
        description: 'Upgrades your bullet type',
        variants: [
            { name: 'Explosive Rounds', effect: () => { playerStats.bulletType = 'explosive'; playerStats.damage += 0.5; }, display: 'Explosive Bullets, +0.5 Damage' },
            { name: 'Piercing Shots', effect: () => { playerStats.bulletType = 'piercing'; playerStats.damage += 0.3; }, display: 'Piercing Bullets, +0.3 Damage' },
            { name: 'Rapid Fire', effect: () => { playerStats.bulletType = 'rapid'; playerStats.fireRate = Math.max(1, Math.floor(playerStats.fireRate / 2)); }, display: 'Multi-shot Bullets' }
        ]
    }
];

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
    
    // Mouse events
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
    });
    
    canvas.addEventListener('mousedown', (e) => {
        if (gameState === 'playing') {
            mouse.down = true;
            shootBullet();
        }
    });
    
    canvas.addEventListener('mouseup', () => {
        mouse.down = false;
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
    xpToNextLevel = 100;
    xpGainedThisLevel = 0;
    
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
            speed: enemyType.speed + (floor - 1) * 0.1,
            health: enemyType.health + Math.floor(floor / 3),
            maxHealth: enemyType.health + Math.floor(floor / 3),
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

function shootBullet() {
    const currentTime = Date.now();
    if (currentTime - lastShotTime < playerStats.fireRate * 16.67) return; // Convert frames to milliseconds
    
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
    xpToNextLevel = Math.floor(xpToNextLevel * 1.5); // Increase XP requirement by 50%
    xpGainedThisLevel = 0;
    
    // Pause the game and show level up screen
    gameState = 'levelUp';
    showLevelUpScreen();
}

function showLevelUpScreen() {
    // Generate 5 random upgrade options
    const availableCards = [...upgradeCards];
    const cardOptions = [];
    
    for (let i = 0; i < 5; i++) {
        if (availableCards.length === 0) break;
        
        const randomIndex = Math.floor(Math.random() * availableCards.length);
        const baseCard = availableCards[randomIndex];
        
        // Pick a random variant
        const randomVariant = baseCard.variants[Math.floor(Math.random() * baseCard.variants.length)];
        
        cardOptions.push({
            ...baseCard,
            variant: randomVariant,
            displayName: randomVariant.name,
            effect: randomVariant.effect,
            effectDisplay: randomVariant.display
        });
        
        // Remove card to avoid duplicates (comment this out if you want potential duplicates)
        // availableCards.splice(randomIndex, 1);
    }
    
    // Show the level up screen
    const levelUpScreen = document.getElementById('levelUpScreen');
    const cardContainer = document.getElementById('cardContainer');
    
    // Clear previous cards
    cardContainer.innerHTML = '';

    let selectedCard = null;
    
    // Create card elements
    cardOptions.forEach((card, index) => {
        const cardElement = document.createElement('div');
        cardElement.className = 'upgrade-card';
        cardElement.innerHTML = `
            <div class="card-icon">${card.icon}</div>
            <div class="card-title">${card.displayName}</div>
            <div class="card-description">${card.description}</div>
            <div class="card-effect">${card.effectDisplay}</div>
        `;
        
        cardElement.addEventListener('click', () => {
            // Remove highlight from all cards
            document.querySelectorAll('.upgrade-card').forEach(el => el.classList.remove('selected'));
            // Highlight the clicked card
            cardElement.classList.add('selected');
            selectedCard = card;
        });
        
        cardContainer.appendChild(cardElement);
    });

    // Create Confirm button
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = "Confirm Selection";
    confirmBtn.className = 'confirm-button';
    confirmBtn.addEventListener('click', () => {
        if (!selectedCard) {
            alert("Please select a card first!");
            return;
        }
        selectUpgrade(selectedCard);
    });
    cardContainer.appendChild(confirmBtn);
    
    levelUpScreen.style.display = 'flex';
}

function selectUpgrade(card) {
    // Apply the upgrade effect
    card.effect();
    
    // Hide level up screen and resume game
    document.getElementById('levelUpScreen').style.display = 'none';
    gameState = 'playing';
    
    // Update UI to reflect changes
    updateUI();
}

function update() {
    if (gameState !== 'playing') return;
    
    updatePlayer();
    updateBullets();
    updateEnemies();
    updateParticles();
    checkCollisions();
    render();
    updateUI();
    
    if (player.health <= 0) {
        gameOver();
    }
    
    if (enemies.length === 0 && !floorCompleted) {
        floorCompleted = true;
        score += floor * 100; // Bonus for completing floor
    }
}

function updatePlayer() {
    let dx = 0, dy = 0;
    
    if (keys['a'] || keys['arrowleft']) dx -= 1;
    if (keys['d'] || keys['arrowright']) dx += 1;
    if (keys['w'] || keys['arrowup']) dy -= 1;
    if (keys['s'] || keys['arrowdown']) dy += 1;
    
    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
        dx *= 0.707;
        dy *= 0.707;
    }
    
    player.x += dx * player.speed;
    player.y += dy * player.speed;
    
    // Keep player in bounds
    player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y));
}

function updateBullets() {
    bullets = bullets.filter(bullet => {
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;
        bullet.life--;
        
        return bullet.life > 0 && 
               bullet.x > 0 && bullet.x < canvas.width &&
               bullet.y > 0 && bullet.y < canvas.height;
    });
}

function updateEnemies() {
    enemies.forEach(enemy => {
        // Move towards player
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const distance = Math.hypot(dx, dy);
        
        if (distance > 0) {
            enemy.x += (dx / distance) * enemy.speed;
            enemy.y += (dy / distance) * enemy.speed;
        }
        
        // Reset hit color
        if (Date.now() - enemy.lastHit > 100) {
            enemy.hitColor = null;
        }
    });
}

function updateParticles() {
    particles = particles.filter(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life--;
        particle.alpha = particle.life / particle.maxLife;
        return particle.life > 0;
    });
}

function checkCollisions() {
    // Bullet-enemy collisions
    bullets.forEach((bullet, bulletIndex) => {
        enemies.forEach((enemy, enemyIndex) => {
            const dx = bullet.x - enemy.x;
            const dy = bullet.y - enemy.y;
            const distance = Math.hypot(dx, dy);
            
            if (distance < bullet.radius + enemy.radius) {
                // Hit enemy
                enemy.health -= bullet.damage;
                enemy.lastHit = Date.now();
                enemy.hitColor = bullet.isCrit ? '#FF0000' : '#FFFFFF';
                
                // Create hit particles
                createParticles(enemy.x, enemy.y, bullet.isCrit ? '#FF0000' : enemy.color);
                
                // Handle special bullet effects
                if (bullet.type === 'explosive') {
                    // Explosive bullets create explosion
                    createExplosion(bullet.x, bullet.y);
                    bullets.splice(bulletIndex, 1);
                } else if (bullet.type === 'piercing' && bullet.pierced < 3) {
                    // Piercing bullets can hit multiple enemies
                    bullet.pierced++;
                } else {
                    // Normal bullets are removed after hit
                    bullets.splice(bulletIndex, 1);
                }
                
                // Check if enemy is dead
                if (enemy.health <= 0) {
                    score += enemy.points;
                    enemiesKilled++;
                    gainXP(enemy.xp); // Gain XP from killed enemy
                    createParticles(enemy.x, enemy.y, enemy.color, 10);
                    enemies.splice(enemyIndex, 1);
                }
            }
        });
    });
    
    // Player-enemy collisions
    enemies.forEach(enemy => {
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const distance = Math.hypot(dx, dy);
        
        if (distance < player.radius + enemy.radius) {
            // Calculate damage after armor
            const damage = Math.max(0.1, 1.0 - playerStats.armor * 0.15);
            player.health -= damage;
            
            // Push player away
            const pushForce = 3;
            player.x += (dx / distance) * pushForce;
            player.y += (dy / distance) * pushForce;
        }
    });
}

function createExplosion(x, y) {
    // Create explosion particles
    createParticles(x, y, '#FF8800', 15);
    
    // Damage nearby enemies
    enemies.forEach(enemy => {
        const dx = enemy.x - x;
        const dy = enemy.y - y;
        const distance = Math.hypot(dx, dy);
        
        if (distance < 60) { // Explosion radius
            enemy.health -= playerStats.damage * 0.5;
            enemy.lastHit = Date.now();
            enemy.hitColor = '#FF8800';
        }
    });
}

function createParticles(x, y, color, count = 5) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            life: 30,
            maxLife: 30,
            color: color,
            alpha: 1,
            radius: Math.random() * 3 + 1
        });
    }
}

function render() {
    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    
    // Draw particles
    particles.forEach(particle => {
        ctx.globalAlpha = particle.alpha;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
    
    // Draw bullets
    bullets.forEach(bullet => {
        ctx.fillStyle = bullet.color;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Special effects for different bullet types
        if (bullet.isCrit || bullet.type !== 'normal') {
            ctx.shadowBlur = 10;
            ctx.shadowColor = bullet.color;
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    });
    
    // Draw enemies
    enemies.forEach(enemy => {
        ctx.fillStyle = enemy.hitColor || enemy.color;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Health bar for enemies
        if (enemy.health < enemy.maxHealth) {
            const barWidth = enemy.radius * 2;
            const barHeight = 4;
            const x = enemy.x - barWidth / 2;
            const y = enemy.y - enemy.radius - 10;
            
            ctx.fillStyle = '#333';
            ctx.fillRect(x, y, barWidth, barHeight);
            
            ctx.fillStyle = '#FF4444';
            ctx.fillRect(x, y, (enemy.health / enemy.maxHealth) * barWidth, barHeight);
        }
    });
    
    // Draw player
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw armor indicator
    if (playerStats.armor > 0) {
        ctx.strokeStyle = '#C0C0C0';
        ctx.lineWidth = Math.min(playerStats.armor, 5);
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius + 3, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Draw crosshair
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(mouse.x - 10, mouse.y);
    ctx.lineTo(mouse.x + 10, mouse.y);
    ctx.moveTo(mouse.x, mouse.y - 10);
    ctx.lineTo(mouse.x, mouse.y + 10);
    ctx.stroke();
    
    // Draw floor completion message
    if (floorCompleted) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, canvas.height / 2 - 40, canvas.width, 80);
        
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 24px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText(`Floor ${floor} Complete!`, canvas.width / 2, canvas.height / 2 - 10);
        ctx.fillText('Press ENTER for next floor', canvas.width / 2, canvas.height / 2 + 20);
    }
}

function updateUI() {
    const healthFill = document.getElementById('healthFill');
    const healthText = document.getElementById('healthText');
    const xpFill = document.getElementById('xpFill');
    const xpText = document.getElementById('xpText');
    const floorNumber = document.getElementById('floorNumber');
    const scoreElement = document.getElementById('score');
    const enemyCount = document.getElementById('enemyCount');
    const levelElement = document.getElementById('level');
    const damageElement = document.getElementById('damage');
    const armorElement = document.getElementById('armor');
    const speedElement = document.getElementById('speed');
    const critElement = document.getElementById('crit');
    
    healthFill.style.width = `${(player.health / player.maxHealth) * 100}%`;
    healthText.textContent = `${Math.max(0, Math.floor(player.health))}/${player.maxHealth}`;
    
    xpFill.style.width = `${(currentXP / xpToNextLevel) * 100}%`;
    xpText.textContent = `${currentXP}/${xpToNextLevel}`;
    
    floorNumber.textContent = floor;
    scoreElement.textContent = score;
    enemyCount.textContent = enemies.length;
    levelElement.textContent = playerLevel;
    damageElement.textContent = playerStats.damage.toFixed(1);
    armorElement.textContent = playerStats.armor;
    speedElement.textContent = player.speed.toFixed(1);
    critElement.textContent = `${Math.round(playerStats.critChance * 100)}%`;
}

function gameOver() {
    gameState = 'gameOver';
    if (gameLoop) clearInterval(gameLoop);
    
    document.getElementById('finalScore').textContent = score;
    document.getElementById('finalFloor').textContent = floor;
    document.getElementById('finalLevel').textContent = playerLevel;
    document.getElementById('gameOverScreen').style.display = 'flex';
}

function showMenu() {
    gameState = 'menu';
    hideAllScreens();
    document.getElementById('menuScreen').style.display = 'flex';
}

function hideAllScreens() {
    document.getElementById('menuScreen').style.display = 'none';
    document.getElementById('gameOverScreen').style.display = 'none';
    document.getElementById('leaderboard').style.display = 'none';
    document.getElementById('levelUpScreen').style.display = 'none';
}

async function submitScore() {
    const playerName = document.getElementById('playerName').value.trim();
    if (!playerName) {
        alert('Please enter your name!');
        return;
    }
    
    try {
        const { data, error } = await supabase
            .from('isaac_leaderboard')
            .insert([
                {
                    player_name: playerName,
                    score: score,
                    floor: floor,
                    level: playerLevel,
                    created_at: new Date().toISOString()
                }
            ]);
        
        if (error) throw error;
        
        alert('Score submitted successfully!');
        showLeaderboard();
    } catch (error) {
        console.error('Error submitting score:', error);
        alert('Failed to submit score. Please try again.');
    }
}

async function showLeaderboard() {
    hideAllScreens();
    document.getElementById('leaderboard').style.display = 'flex';
    
    try {
        const { data, error } = await supabase
            .from('isaac_leaderboard')
            .select('*')
            .order('score', { ascending: false })
            .limit(10);
        
        if (error) throw error;
        
        const leaderboardList = document.getElementById('leaderboardList');
        leaderboardList.innerHTML = '';
        
        data.forEach((entry, index) => {
            const entryDiv = document.createElement('div');
            entryDiv.className = 'leaderboard-entry';
            entryDiv.innerHTML = `
                <span class="rank">#${index + 1}</span>
                <span class="player-name">${entry.player_name}</span>
                <span class="score">${entry.score}</span>
                <span>Floor ${entry.floor}</span>
                <span>Lvl ${entry.level || 1}</span>
            `;
            leaderboardList.appendChild(entryDiv);
        });
        
        if (data.length === 0) {
            leaderboardList.innerHTML = '<p>No scores yet. Be the first!</p>';
        }
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        document.getElementById('leaderboardList').innerHTML = '<p>Failed to load leaderboard.</p>';
    }
}

function hideLeaderboard() {
    showMenu();
}

// Initialize game when page loads
window.addEventListener('load', init);
