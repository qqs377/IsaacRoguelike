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
