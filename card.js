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
            { name: 'Sharp Eye', effect: () => { playerStats.critChance += 0.10; }, display: '+10% Critical Chance' },
            { name: 'Deadly Aim', effect: () => { playerStats.critChance += 0.07; playerStats.damage += 0.4; }, display: '+7% Crit, +0.4 Damage' }
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
            { name: 'Critical Master', effect: () => { playerStats.critChance += 0.15; playerStats.bulletSpeed += 2; }, display: '+15% Crit, +2 Bullet Speed' },
            { name: 'Lethal Precision', effect: () => { playerStats.critChance += 0.12; playerStats.damage += 0.6; }, display: '+12% Crit, +0.6 Damage' }
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
    }
];
