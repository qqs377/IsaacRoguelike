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
    health: 50,
    maxHealth: 50,
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
let xpToNextLevel = 50; // Reduced from 100
let xpGainedThisLevel = 0;

// Active skills and special abilities
let activeSkills = [];
let removedCards = new Set(); // Track removed cards

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

// Enemy types - Increased XP rewards, removed speed scaling
const enemyTypes = [
    { radius: 12, speed: 1, health: 2, color: '#FF5722', points: 10, xp: 25 },
    { radius: 18, speed: 0.5, health: 4, color: '#9C27B0', points: 25, xp: 40 },
    { radius: 10, speed: 2, health: 1, color: '#FFC107', points: 5, xp: 15 },
    { radius: 25, speed: 0.3, health: 8, color: '#607D8B', points: 50, xp: 70 }
];

// Upgrade card definitions with rarity system
const upgradeCards = [
    // Common Cards
    {
        id: 'health_small',
        name: 'Vitality',
        icon: '❤️',
        rarity: 'common',
        description: 'Small health improvements',
        variants: [
            { name: 'Health Boost', effect: () => { player.health = Math.min(player.maxHealth, player.health + 15); }, display: '+15 Health' },
            { name: 'Tough Skin', effect: () => { playerStats.armor += 1; }, display: '+1 Armor' }
        ]
    },
    {
        id: 'damage_small',
        name: 'Power',
        icon: '⚔️',
        rarity: 'common',
        description: 'Small damage improvements',
        variants: [
            { name: 'Sharp Edge', effect: () => { playerStats.damage += 0.3; }, display: '+0.3 Damage' },
            { name: 'Quick Strike', effect: () => { playerStats.damage += 0.2; playerStats.fireRate = Math.max(2, playerStats.fireRate - 1); }, display: '+0.2 Damage, Faster Shooting' }
        ]
    },
    {
        id: 'speed_small',
        name: 'Agility',
        icon: '💨',
        rarity: 'common',
        description: 'Small speed improvements',
        variants: [
            { name: 'Light Steps', effect: () => { player.speed += 0.5; }, display: '+0.5 Movement Speed' },
            { name: 'Quick Draw', effect: () => { playerStats.fireRate = Math.max(2, playerStats.fireRate - 2); }, display: 'Faster Shooting' }
        ]
    },
    
    // Rare Cards
    {
        id: 'health_medium',
        name: 'Greater Vitality',
        icon: '💗',
        rarity: 'rare',
        description: 'Medium health improvements',
        variants: [
            { name: 'Max Health Up', effect: () => { const increase = 25; player.maxHealth += increase; player.health += increase; }, display: '+25 Max Health' },
            { name: 'Fortified', effect: () => { playerStats.armor += 2; const heal = 15; player.health = Math.min(player.maxHealth, player.health + heal); }, display: '+2 Armor, +15 Health' }
        ]
    },
    {
        id: 'damage_medium',
        name: 'Greater Power',
        icon: '⚡',
        rarity: 'rare',
        description: 'Medium damage improvements',
        variants: [
            { name: 'Heavy Strike', effect: () => { playerStats.damage += 0.7; }, display: '+0.7 Damage' },
            { name: 'Berserker', effect: () => { playerStats.damage += 0.5; playerStats.fireRate = Math.max(2, playerStats.fireRate - 2); }, display: '+0.5 Damage, Much Faster Shooting' }
        ]
    },
    {
        id: 'critical_rare',
        name: 'Precision',
        icon: '🎯',
        rarity: 'rare',
        description: 'Critical hit improvements',
        variants: [
            { name: 'Sharp Eye', effect: () => { playerStats.critChance += 0.008; }, display: '+0.8% Critical Chance' },
            { name: 'Deadly Aim', effect: () => { playerStats.critChance += 0.005; playerStats.damage += 0.4; }, display: '+0.5% Crit, +0.4 Damage' }
        ]
    },
    {
        id: 'healing',
        name: 'Restoration',
        icon: '✨',
        rarity: 'rare',
        description: 'Healing abilities',
        variants: [
            { name: 'Greater Heal', effect: () => { player.health = Math.min(player.maxHealth, player.health + 40); }, display: '+40 Health' },
            { name: 'Regeneration Boost', effect: () => { player.health = Math.min(player.maxHealth, player.health + 25); player.maxHealth += 10; player.health += 10; }, display: '+25 Health, +10 Max Health' }
        ]
    },
    
    // Epic Cards
    {
        id: 'health_large',
        name: 'Supreme Vitality',
        icon: '💖',
        rarity: 'epic',
        description: 'Large health improvements',
        variants: [
            { name: 'Massive Health Up', effect: () => { const increase = 40; player.maxHealth += increase; player.health += increase; }, display: '+40 Max Health' },
            { name: 'Iron Constitution', effect: () => { playerStats.armor += 4; const heal = 30; player.health = Math.min(player.maxHealth, player.health + heal); }, display: '+4 Armor, +30 Health' }
        ]
    },
    {
        id: 'damage_large',
        name: 'Supreme Power',
        icon: '💥',
        rarity: 'epic',
        description: 'Large damage improvements',
        variants: [
            { name: 'Devastating Strike', effect: () => { playerStats.damage += 1.2; }, display: '+1.2 Damage' },
            { name: 'Fury', effect: () => { playerStats.damage += 0.8; playerStats.fireRate = Math.max(1, Math.floor(playerStats.fireRate * 0.6)); }, display: '+0.8 Damage, Much Faster Shooting' }
        ]
    },
    {
        id: 'critical_epic',
        name: 'Master Precision',
        icon: '🏹',
        rarity: 'epic',
        description: 'Advanced critical abilities',
        variants: [
            { name: 'Critical Master', effect: () => { playerStats.critChance += 0.012; playerStats.bulletSpeed += 2; }, display: '+1.2% Crit, +2 Bullet Speed' },
            { name: 'Lethal Precision', effect: () => { playerStats.critChance += 0.009; playerStats.damage += 0.6; }, display: '+0.9% Crit, +0.6 Damage' }
        ]
    },
    
    // Legendary Special Ammo (removed after selection)
    {
        id: 'explosive_ammo',
        name: 'Explosive Rounds',
        icon: '🔥',
        rarity: 'legendary',
        description: 'Bullets explode on impact',
        removeAfterUse: true,
        variants: [
            { name: 'Explosive Rounds', effect: () => { 
                playerStats.bulletType = 'explosive'; 
                playerStats.damage += 0.5; 
                addActiveSkill('explosive', '🔥', 'Explosive Rounds: Bullets explode on impact');
            }, display: 'Explosive Bullets, +0.5 Damage' }
        ]
    },
    {
        id: 'piercing_ammo',
        name: 'Piercing Shots',
        icon: '🎯',
        rarity: 'legendary',
        description: 'Bullets pierce through enemies',
        removeAfterUse: true,
        variants: [
            { name: 'Piercing Shots', effect: () => { 
                playerStats.bulletType = 'piercing'; 
                playerStats.damage += 0.3; 
                addActiveSkill('piercing', '🎯', 'Piercing Shots: Bullets pierce through enemies');
            }, display: 'Piercing Bullets, +0.3 Damage' }
        ]
    },
    {
        id: 'rapid_ammo',
        name: 'Rapid Fire',
        icon: '💨',
        rarity: 'legendary',
        description: 'Shoots multiple bullets',
        removeAfterUse: true,
        variants: [
            { name: 'Rapid Fire', effect: () => { 
                playerStats.bulletType = 'rapid'; 
                playerStats.fireRate = Math.max(1, Math.floor(playerStats.fireRate / 2)); 
                addActiveSkill('rapid', '💨', 'Rapid Fire: Shoots 3 bullets at once');
            }, display: 'Multi-shot Bullets' }
        ]
    },
    
    // Legendary Special Skills (removed after selection)
    {
        id: 'lifesteal',
        name: 'Vampiric',
        icon: '🧛',
        rarity: 'legendary',
        description: 'Life steal ability',
        removeAfterUse: true,
        variants: [
            { name: 'Vampiric', effect: () => { 
                addActiveSkill('lifesteal', '🧛', 'Vampiric: Killing enemies heals 8 health');
            }, display: 'Killing enemies heals 8 health' }
        ]
    },
    {
        id: 'regeneration',
        name: 'Meditation',
        icon: '🧘',
        rarity: 'legendary',
        description: 'Regeneration when stationary',
        removeAfterUse: true,
        variants: [
            { name: 'Meditation', effect: () => { 
                addActiveSkill('regeneration', '🧘', 'Meditation: Slowly heal when not moving');
            }, display: 'Slowly heal when not moving' }
        ]
    },
    {
        id: 'dodge',
        name: 'Evasion',
        icon: '👻',
        rarity: 'legendary',
        description: 'Chance to dodge attacks',
        removeAfterUse: true,
        variants: [
            { name: 'Evasion', effect: () => { 
                addActiveSkill('dodge', '👻', 'Evasion: 5% chance to dodge attacks');
            }, display: '5% chance to dodge attacks' }
        ]
    },
    
    // New Legendary Items (same rarity as special skills)
    {
        id: 'time_dilation',
        name: 'Time Dilation',
        icon: '⏰',
        rarity: 'legendary',
        description: 'Slows down time during combat',
        removeAfterUse: true,
        variants: [
            { name: 'Time Dilation', effect: () => { 
                addActiveSkill('time_dilation', '⏰', 'Time Dilation: Enemies move 20% slower');
            }, display: 'Enemies move 20% slower' }
        ]
    },
    {
        id: 'berserker_rage',
        name: 'Berserker Rage',
        icon: '😡',
        rarity: 'legendary',
        description: 'More damage when low on health',
        removeAfterUse: true,
        variants: [
            { name: 'Berserker Rage', effect: () => { 
                addActiveSkill('berserker_rage', '😡', 'Berserker Rage: +50% damage when below 30% health');
            }, display: '+50% damage when below 30% health' }
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
    
    // Mouse events for aiming and shooting
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
    });
    
    // Mouse click for shooting
    canvas.addEventListener('mousedown', (e) => {
        if (gameState === 'playing') {
            mouse.down = true;
            shoot();
        }
    });
    
    canvas.addEventListener('mouseup', (e) => {
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
    
    const enemyCount = Math.min(5 + floor * 2, 20); // Increased max enemies
    
    // Generate enemies with scaling difficulty
    for (let i = 0; i < enemyCount; i++) {
        const enemyType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
        let x, y;
        
        // Ensure enemies don't spawn too close to player
        do {
            x = Math.random() * (canvas.width - enemyType.radius * 2) + enemyType.radius;
            y = Math.random() * (canvas.height - enemyType.radius * 2) + enemyType.radius;
        } while (Math.hypot(x - player.x, y - player.y) < 100);
        
        // Scale enemy stats based on floor
        const healthBonus = Math.floor(floor * 0.8); // More health per floor
        const speedBonus = Math.min(floor * 0.05, 1.5); // Speed bonus caps at +1.5
        const xpMultiplier = 1 + (floor - 1) * 0.15; // 15% more XP per floor
        
        enemies.push({
            x: x,
            y: y,
            radius: enemyType.radius,
            speed: enemyType.speed + speedBonus,
            health: enemyType.health + healthBonus,
            maxHealth: enemyType.health + healthBonus,
            color: enemyType.color,
            points: enemyType.points * Math.floor(1 + floor * 0.1),
            xp: Math.floor(enemyType.xp * xpMultiplier),
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

// FIXED: Manual shooting function with proper bullet combination logic
function shoot() {
    const currentTime = Date.now();
    if (currentTime - lastShotTime < playerStats.fireRate * 16.67) return;
    
    const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    const isCrit = Math.random() < playerStats.critChance;
    
    // Check if we have rapid fire skill
    const hasRapidFire = activeSkills.find(skill => skill.id === 'rapid') !== undefined;
    
    if (hasRapidFire) {
        // Shoot 3 bullets in a spread - each inherits ALL active bullet properties
        for (let i = -1; i <= 1; i++) {
            const spreadAngle = angle + (i * 0.2);
            createBullet(spreadAngle, isCrit);
        }
    } else {
        createBullet(angle, isCrit);
    }
    
    lastShotTime = currentTime;
}

// FIXED: Create bullet function with proper combination of all active bullet types
function createBullet(angle, isCrit) {
    // Check for all active bullet skills
    const hasPiercing = activeSkills.find(skill => skill.id === 'piercing') !== undefined;
    const hasExplosive = activeSkills.find(skill => skill.id === 'explosive') !== undefined;
    const hasRapid = activeSkills.find(skill => skill.id === 'rapid') !== undefined;
    
    const bullet = {
        x: player.x,
        y: player.y,
        vx: Math.cos(angle) * playerStats.bulletSpeed,
        vy: Math.sin(angle) * playerStats.bulletSpeed,
        radius: isCrit ? 6 : 4,
        life: 100,
        damage: playerStats.damage * (isCrit ? 2 : 1),
        isCrit: isCrit,
        color: getBulletColor(isCrit, hasPiercing, hasExplosive, hasRapid),
        pierced: 0,
        // FIXED: Now properly combines all bullet effects
        canPierce: hasPiercing,
        canExplode: hasExplosive,
        isRapidFire: hasRapid
    };
    
    bullets.push(bullet);
}

// FIXED: Get bullet color based on all active effects
function getBulletColor(isCrit, hasPiercing, hasExplosive, hasRapid) {
    if (isCrit) return '#FF0000';
    
    // Combine colors when multiple effects are active
    if (hasExplosive && hasPiercing && hasRapid) {
        return '#FFAA44'; // Mixed orange-yellow for all three
    } else if (hasExplosive && hasPiercing) {
        return '#FF4444'; // Red-orange for explosive + piercing
    } else if (hasExplosive && hasRapid) {
        return '#AA44FF'; // Purple-orange for explosive + rapid
    } else if (hasPiercing && hasRapid) {
        return '#44AAFF'; // Blue-green for piercing + rapid
    } else if (hasExplosive) {
        return '#FF8800'; // Orange for explosive
    } else if (hasPiercing) {
        return '#00FF88'; // Green for piercing
    } else if (hasRapid) {
        return '#8800FF'; // Purple for rapid
    }
    
    return '#FFD700'; // Default gold
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

// Rarity weights for card selection
const rarityWeights = {
    common: 64,
    rare: 25,
    epic: 10,
    legendary: 1
};

function getRandomRarity() {
    const totalWeight = Object.values(rarityWeights).reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const [rarity, weight] of Object.entries(rarityWeights)) {
        random -= weight;
        if (random <= 0) return rarity;
    }
    return 'common';
}

function addActiveSkill(id, icon, description) {
    if (!activeSkills.find(skill => skill.id === id)) {
        activeSkills.push({ id, icon, description });
        updateActiveSkillsDisplay();
    }
}

function updateActiveSkillsDisplay() {
    const activeSkillsContainer = document.getElementById('activeSkills');
    activeSkillsContainer.innerHTML = '';
    
    activeSkills.forEach(skill => {
        const skillIcon = document.createElement('div');
        skillIcon.className = 'skill-icon legendary';
        skillIcon.innerHTML = `
            ${skill.icon}
            <div class="tooltip">${skill.description}</div>
        `;
        activeSkillsContainer.appendChild(skillIcon);
    });
}

function showLevelUpScreen() {
    // Filter out removed cards
    const availableCards = upgradeCards.filter(card => !removedCards.has(card.id));
    const cardOptions = [];
    
    for (let i = 0; i < 5; i++) {
        if (availableCards.length === 0) break;
        
        // Get random rarity based on weights
        const targetRarity = getRandomRarity();
        let possibleCards = availableCards.filter(card => card.rarity === targetRarity);
        
        // Fallback to any available card if no cards of target rarity
        if (possibleCards.length === 0) {
            possibleCards = availableCards;
        }
        
        if (possibleCards.length === 0) break;
        
        const randomIndex = Math.floor(Math.random() * possibleCards.length);
        const baseCard = possibleCards[randomIndex];
        
        // Pick a random variant
        const randomVariant = baseCard.variants[Math.floor(Math.random() * baseCard.variants.length)];
        
        cardOptions.push({
            ...baseCard,
            variant: randomVariant,
            displayName: randomVariant.name,
            effect: randomVariant.effect,
            effectDisplay: randomVariant.display
        });
        
        // Remove card temporarily to avoid duplicates in this selection
        const cardIndex = availableCards.indexOf(baseCard);
        availableCards.splice(cardIndex, 1);
    }
    
    // Show the level up screen
    const levelUpScreen = document.getElementById('levelUpScreen');
    const cardContainer = document.getElementById('cardContainer');
    
    // Clear previous cards
    cardContainer.innerHTML = '';
    
    // Create card elements
    cardOptions.forEach((card, index) => {
        const cardElement = document.createElement('div');
        cardElement.className = `upgrade-card ${card.rarity}`;
        cardElement.innerHTML = `
            <div class="card-icon">${card.icon}</div>
            <div class="card-title">${card.displayName}</div>
            <div class="card-description">${card.description}</div>
            <div class="card-effect">${card.effectDisplay}</div>
        `;
        
        // Add CSS for selected state
        const style = document.createElement('style');
        if (!document.getElementById('cardSelectionStyles')) {
            style.id = 'cardSelectionStyles';
            style.textContent = `
                .upgrade-card.selected {
                    border: 3px solid #4CAF50 !important;
                    box-shadow: 0 0 20px rgba(76, 175, 80, 0.6) !important;
                    transform: scale(1.02) translateY(-5px) !important;
                }
                .upgrade-card {
                    transition: all 0.3s ease;
                }
                .level-up-content {
                    position: relative;
                    min-height: 500px;
                }
            `;
            document.head.appendChild(style);
        }
        
        cardElement.addEventListener('click', () => {
            selectUpgrade(card);
        });
        
        cardContainer.appendChild(cardElement);
    });
    
    levelUpScreen.style.display = 'flex';
}

let selectedCard = null;

function selectUpgrade(card) {
    selectedCard = card;
    
    // Highlight selected card and show confirmation
    const allCards = document.querySelectorAll('.upgrade-card');
    allCards.forEach(cardEl => cardEl.classList.remove('selected'));
    
    // Find and highlight the clicked card
    allCards.forEach(cardEl => {
        if (cardEl.querySelector('.card-title').textContent === card.displayName) {
            cardEl.classList.add('selected');
        }
    });
    
    // Show or update confirmation button
    showConfirmationButton();
}

function showConfirmationButton() {
    let confirmBtn = document.getElementById('confirmUpgrade');
    if (!confirmBtn) {
        confirmBtn = document.createElement('button');
        confirmBtn.id = 'confirmUpgrade';
        confirmBtn.textContent = 'Confirm Selection';
        confirmBtn.style.cssText = `
            display: block;
            margin: 20px auto 0; /* centers horizontally */
            padding: 12px 24px;
            font-size: 16px;
            font-family: 'Courier New', monospace;
            background: #4CAF50;
            color: white;
            border: 2px solid #45a049;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
            z-index: 300;
        `;
        confirmBtn.addEventListener('click', confirmUpgrade);
        document.getElementById('levelUpScreen').appendChild(confirmBtn);
    }
    confirmBtn.style.display = 'block';
}

function confirmUpgrade() {
    if (!selectedCard) return;
    
    // Apply the upgrade effect
    selectedCard.effect();
    
    // Remove card from pool if it's a special card
    if (selectedCard.removeAfterUse) {
        removedCards.add(selectedCard.id);
    }
    
    // Hide level up screen and resume game
    document.getElementById('levelUpScreen').style.display = 'none';
    gameState = 'playing';
    
    // Clean up
    selectedCard = null;
    const confirmBtn = document.getElementById('confirmUpgrade');
    if (confirmBtn) {
        confirmBtn.style.display = 'none';
    }
    
    // Update UI to reflect changes
    updateUI();
}

// Player movement and regeneration tracking
let playerLastPosition = { x: 400, y: 300 };
let standingStillTime = 0;

function update() {
    if (gameState !== 'playing') return;
    
    updatePlayer();
    updateBullets();
    updateEnemies();
    updateParticles();
    updateSpecialSkills();
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

function updateSpecialSkills() {
    // Check if player is standing still for regeneration
    const currentPos = { x: player.x, y: player.y };
    const distance = Math.hypot(currentPos.x - playerLastPosition.x, currentPos.y - playerLastPosition.y);
    
    if (distance < 0.5) { // Player is standing still
        standingStillTime++;
        
        // Regeneration skill: heal slowly when not moving
        if (activeSkills.find(skill => skill.id === 'regeneration') && standingStillTime > 60) { // After 1 second
            if (standingStillTime % 30 === 0) { // Every 0.5 seconds
                player.health = Math.min(player.maxHealth, player.health + 1);
            }
        }
    } else {
        standingStillTime = 0;
    }
    
    playerLastPosition = { ...currentPos };
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
        // Time dilation effect - slow down enemies
        let speedMultiplier = 1;
        if (activeSkills.find(skill => skill.id === 'time_dilation')) {
            speedMultiplier = 0.8; // 20% slower
        }
        
        // Move towards player
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const distance = Math.hypot(dx, dy);
        
        if (distance > 0) {
            enemy.x += (dx / distance) * enemy.speed * speedMultiplier;
            enemy.y += (dy / distance) * enemy.speed * speedMultiplier;
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

// FIXED: Collision detection with proper combined bullet effects
function checkCollisions() {
    // Bullet-enemy collisions
    bullets.forEach((bullet, bulletIndex) => {
        enemies.forEach((enemy, enemyIndex) => {
            const dx = bullet.x - enemy.x;
            const dy = bullet.y - enemy.y;
            const distance = Math.hypot(dx, dy);
            
            if (distance < bullet.radius + enemy.radius) {
                // Apply berserker rage damage bonus
                let finalDamage = bullet.damage;
                if (activeSkills.find(skill => skill.id === 'berserker_rage')) {
                    if (player.health / player.maxHealth < 0.3) {
                        finalDamage *= 1.5; // +50% damage when below 30% health
                    }
                }
                
                // Hit enemy
                enemy.health -= finalDamage;
                enemy.lastHit = Date.now();
                enemy.hitColor = bullet.isCrit ? '#FF0000' : '#FFFFFF';
                
                // Create hit particles
                createParticles(enemy.x, enemy.y, bullet.isCrit ? '#FF0000' : enemy.color);
                
                // FIXED: Handle combined bullet effects properly
                let removeBullet = true;
                
                // Explosive effect
                if (bullet.canExplode) {
                    createExplosion(bullet.x, bullet.y);
                }
                
                // Piercing effect - bullets continue through enemies
                if (bullet.canPierce && bullet.pierced < 3) {
                    bullet.pierced++;
                    removeBullet = false; // Don't remove piercing bullets until they've pierced enough
                }
                
                if (removeBullet) {
                    bullets.splice(bulletIndex, 1);
                }
                
                // Check if enemy is dead
                if (enemy.health <= 0) {
                    score += enemy.points;
                    enemiesKilled++;
                    gainXP(enemy.xp);
                    
                    // Lifesteal skill: heal on kill
                    if (activeSkills.find(skill => skill.id === 'lifesteal')) {
                        player.health = Math.min(player.maxHealth, player.health + 8);
                    }
                    
                    createParticles(enemy.x, enemy.y, enemy.color, 10);
                    enemies.splice(enemyIndex, 1);
                }
            }
        });
    });
    
    // Player-enemy collisions with dodge chance
    enemies.forEach(enemy => {
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const distance = Math.hypot(dx, dy);
        
        if (distance < player.radius + enemy.radius) {
            // Check for dodge skill
            if (activeSkills.find(skill => skill.id === 'dodge') && Math.random() < 0.05) {
                // Dodge successful - create dodge particles and skip damage
                createParticles(player.x, player.y, '#00FFFF', 5);
                return;
            }
            
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
        if (bullet.isCrit || bullet.canPierce || bullet.canExplode || bullet.isRapidFire) {
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
