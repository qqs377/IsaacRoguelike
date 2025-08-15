// Supabase configuration
const SUPABASE_URL = 'https://dpopxtljjdkkzcnxwyfx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwb3B4dGxqamRra3pjbnh3eWZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwODAyMjIsImV4cCI6MjA2OTY1NjIyMn0.udAGcJa2CjZfKec34_QL-uBymgu2g9x9mWRrelwr11I';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Game state
let gameState = 'menu'; // menu, playing, gameOver
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
let chests = [];
let items = [];
let keys = {};
let mouse = { x: 0, y: 0, down: false };
let score = 0;
let floor = 1;
let enemiesKilled = 0;
let floorCompleted = false;

// Player stats and equipment
let playerStats = {
    damage: 1,
    fireRate: 10, // frames between shots
    bulletSpeed: 8,
    armor: 0,
    luck: 0,
    critChance: 0.05
};

let lastShotTime = 0;

// Enemy types
const enemyTypes = [
    { radius: 12, speed: 1, health: 2, color: '#FF5722', points: 10 },
    { radius: 18, speed: 0.5, health: 4, color: '#9C27B0', points: 25 },
    { radius: 10, speed: 2, health: 1, color: '#FFC107', points: 5 },
    { radius: 25, speed: 0.3, health: 8, color: '#607D8B', points: 50 }
];

// Item definitions
const itemTypes = {
    'Heart': { color: '#FF69B4', effect: () => { player.health = Math.min(player.maxHealth, player.health + 20); }, description: '+20 Health' },
    'Speed Boots': { color: '#00BFFF', effect: () => { player.speed += 0.5; }, description: '+0.5 Speed' },
    'Damage Up': { color: '#FF4500', effect: () => { playerStats.damage += 0.5; }, description: '+0.5 Damage' },
    'Fire Rate Up': { color: '#FFD700', effect: () => { playerStats.fireRate = Math.max(3, playerStats.fireRate - 2); }, description: 'Faster Shooting' },
    'Lucky Charm': { color: '#32CD32', effect: () => { playerStats.luck += 1; playerStats.critChance += 0.05; }, description: '+1 Luck, +5% Crit' },
    'Armor Plate': { color: '#708090', effect: () => { playerStats.armor += 1; }, description: '+1 Armor' },
    'Max Health Up': { color: '#DC143C', effect: () => { player.maxHealth += 10; player.health += 10; }, description: '+10 Max Health' },
    'Rapid Fire': { color: '#FF6347', effect: () => { playerStats.fireRate = Math.max(1, playerStats.fireRate - 3); }, description: 'Much Faster Shooting' },
    'Power Shot': { color: '#800080', effect: () => { playerStats.damage += 1; playerStats.bulletSpeed += 2; }, description: '+1 Damage, Faster Bullets' }
};

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
        luck: 0,
        critChance: 0.05
    };
    
    bullets = [];
    enemies = [];
    particles = [];
    chests = [];
    items = [];
    score = 0;
    floor = 1;
    enemiesKilled = 0;
    floorCompleted = false;
    lastShotTime = 0;
    updateUI();
}

function generateFloor() {
    enemies = [];
    chests = [];
    items = [];
    
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
            lastHit: 0
        });
    }
    
    // Generate chests (1-3 per floor, higher chance on later floors)
    const chestCount = Math.min(1 + Math.floor(Math.random() * 3) + Math.floor(floor / 5), 4);
    for (let i = 0; i < chestCount; i++) {
        let x, y;
        let attempts = 0;
        
        do {
            x = Math.random() * (canvas.width - 60) + 30;
            y = Math.random() * (canvas.height - 60) + 30;
            attempts++;
        } while (attempts < 20 && (
            Math.hypot(x - player.x, y - player.y) < 80 ||
            enemies.some(enemy => Math.hypot(x - enemy.x, y - enemy.y) < 60) ||
            chests.some(chest => Math.hypot(x - chest.x, y - chest.y) < 80)
        ));
        
        chests.push({
            x: x,
            y: y,
            width: 25,
            height: 20,
            opened: false,
            color: '#8B4513',
            lockColor: '#FFD700'
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
    
    bullets.push({
        x: player.x,
        y: player.y,
        vx: Math.cos(angle) * playerStats.bulletSpeed,
        vy: Math.sin(angle) * playerStats.bulletSpeed,
        radius: isCrit ? 6 : 4,
        life: 100,
        damage: playerStats.damage * (isCrit ? 2 : 1),
        isCrit: isCrit,
        color: isCrit ? '#FF0000' : '#FFD700'
    });
    
    lastShotTime = currentTime;
}

function update() {
    if (gameState !== 'playing') return;
    
    updatePlayer();
    updateBullets();
    updateEnemies();
    updateParticles();
    updateItems();
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

let pickupMessages = [];

function showPickupMessage(itemName) {
    pickupMessages.push({
        text: `+${itemName}`,
        x: player.x,
        y: player.y - 30,
        life: 120,
        maxLife: 120
    });
}

function updateItems() {
    items.forEach((item, index) => {
        // Check if player picks up item
        const dx = player.x - item.x;
        const dy = player.y - item.y;
        const distance = Math.hypot(dx, dy);
        
        if (distance < player.radius + item.radius) {
            // Apply item effect
            item.effect();
            createParticles(item.x, item.y, item.color, 8);
            
            // Show pickup message
            showPickupMessage(item.name);
            
            items.splice(index, 1);
        }
    });
    
    // Update pickup messages
    pickupMessages = pickupMessages.filter(msg => {
        msg.y -= 1;
        msg.life--;
        return msg.life > 0;
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
                
                // Remove bullet
                bullets.splice(bulletIndex, 1);
                
                // Check if enemy is dead
                if (enemy.health <= 0) {
                    score += enemy.points;
                    enemiesKilled++;
                    createParticles(enemy.x, enemy.y, enemy.color, 10);
                    
                    // Chance to drop item
                    if (Math.random() < 0.15 + playerStats.luck * 0.05) {
                        dropItem(enemy.x, enemy.y);
                    }
                    
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
            const damage = Math.max(0.1, 0.5 - playerStats.armor * 0.1);
            player.health -= damage;
            
            // Push player away
            const pushForce = 2;
            player.x += (dx / distance) * pushForce;
            player.y += (dy / distance) * pushForce;
        }
    });
    
    // Player-chest collisions
    chests.forEach((chest, chestIndex) => {
        if (!chest.opened) {
            const dx = player.x - chest.x;
            const dy = player.y - chest.y;
            const distance = Math.hypot(dx, dy);
            
            if (distance < player.radius + 20) {
                openChest(chest);
            }
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

function dropItem(x, y) {
    const itemNames = Object.keys(itemTypes);
    const randomItem = itemNames[Math.floor(Math.random() * itemNames.length)];
    const itemData = itemTypes[randomItem];
    
    items.push({
        x: x,
        y: y,
        radius: 8,
        name: randomItem,
        color: itemData.color,
        effect: itemData.effect,
        description: itemData.description,
        pulsePhase: Math.random() * Math.PI * 2
    });
}

function openChest(chest) {
    chest.opened = true;
    
    // Guaranteed item from chest
    const itemNames = Object.keys(itemTypes);
    const randomItem = itemNames[Math.floor(Math.random() * itemNames.length)];
    const itemData = itemTypes[randomItem];
    
    items.push({
        x: chest.x,
        y: chest.y - 15,
        radius: 10,
        name: randomItem,
        color: itemData.color,
        effect: itemData.effect,
        description: itemData.description,
        pulsePhase: Math.random() * Math.PI * 2
    });
    
    createParticles(chest.x, chest.y, '#FFD700', 15);
    score += 50; // Bonus for opening chest
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
        
        // Glow effect for crit bullets
        if (bullet.isCrit) {
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
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius + 3, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Draw pickup messages
    pickupMessages.forEach(msg => {
        const alpha = msg.life / msg.maxLife;
        ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
        ctx.font = 'bold 14px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText(msg.text, msg.x, msg.y);
    });
    
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
    const floorNumber = document.getElementById('floorNumber');
    const scoreElement = document.getElementById('score');
    const enemyCount = document.getElementById('enemyCount');
    const damageElement = document.getElementById('damage');
    const armorElement = document.getElementById('armor');
    const luckElement = document.getElementById('luck');
    const critElement = document.getElementById('crit');
    
    healthFill.style.width = `${(player.health / player.maxHealth) * 100}%`;
    healthText.textContent = `${Math.max(0, Math.floor(player.health))}/${player.maxHealth}`;
    floorNumber.textContent = floor;
    scoreElement.textContent = score;
    enemyCount.textContent = enemies.length;
    damageElement.textContent = playerStats.damage.toFixed(1);
    armorElement.textContent = playerStats.armor;
    luckElement.textContent = playerStats.luck;
    critElement.textContent = `${Math.round(playerStats.critChance * 100)}%`;
}

function gameOver() {
    gameState = 'gameOver';
    if (gameLoop) clearInterval(gameLoop);
    
    document.getElementById('finalScore').textContent = score;
    document.getElementById('finalFloor').textContent = floor;
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
}

async function submitScore() {
    const playerName = document.getElementById('playerName').value.trim();
    if (!playerName) {
        alert('Please enter your name!');
        return;
    }
    
    try {
        const { data, error } = await supabase
            .from('leaderboard')
            .insert([
                {
                    player_name: playerName,
                    score: score,
                    floor: floor,
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
            .from('leaderboard')
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
