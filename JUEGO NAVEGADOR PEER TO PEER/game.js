// Configuración del juego
const PLAYER_SPEED = 5;
const PLAYER_SPRINT_MULTIPLIER = 2.0; // Velocidad de sprint = velocidad normal * este valor
const PLAYER_DASH_MULTIPLIER = 3.0; // Velocidad del dash
const DASH_DURATION = 0.2; // Duración del dash en segundos
const DASH_COOLDOWN_DELAY = 1.0; // Tiempo antes de que empiece el cooldown
const DASH_COOLDOWN = 2.0; // Tiempo de espera entre dashes en segundos
const DASH_DISTANCE = 200; // Distancia total por dash en píxeles
const STAMINA_MAX = 100;
const PLAYER_ROTATION_OFFSET = 0; // sprite base apunta a la derecha; sin offset
const STAMINA_DECREASE_RATE = 3.0; // Aumentado para que se gaste más rápido
const STAMINA_INCREASE_RATE = 1.2; // Aumentado para que se recupere un poco más rápido
const STAMINA_MIN_TO_SPRINT = 10; // Mínimo de estamina necesario para hacer sprint

// Salud y enemigos
const HEALTH_MAX = 100;
let playerMaxHealth = HEALTH_MAX;
const ENEMY_SPEED = 2.2;
// Daño al contacto y cooldown de daño
const ENEMY_HIT_DAMAGE = 15; // daño por golpe
const INVULNERABLE_DURATION = 1.0; // segundos de invulnerabilidad tras recibir daño
// Sacudir pantalla al recibir daño
const SHAKE_DURATION = 1.0; // segundos
const SHAKE_MAGNITUDE = 8; // píxeles
const ENEMY_COUNT = 5;
const ENEMY_HEALTH = 40; // vida base de enemigos

// Pickups (vida y munición)
const PICKUP_SIZE = 20;
const PICKUP_HEALTH_AMOUNT = 30; // vida por pickup de vida
const PICKUP_AMMO_AMOUNT = 18; // balas a la reserva por pickup de munición
const PICKUP_SPAWN_INTERVAL = 6.0; // cada N segundos intenta aparecer uno
const PICKUP_MAX_ON_MAP = 6; // máximo simultáneo

// Arma (pistola)
const BULLET_SPEED = 600; // px/seg
const BULLET_DAMAGE = 20;
const FIRE_COOLDOWN = 0.25; // segundos

// Munición (mecánica real, HUD solo texto)
const MAG_SIZE = 12;
const AMMO_RESERVE_START = 60;
let ammoInMag = MAG_SIZE;
let ammoReserve = AMMO_RESERVE_START;
const RELOAD_DURATION = 2.0; // segundos de recarga (cooldown)
let isReloading = false;
let reloadEndTime = 0; // timestamp en segundos

// Debug de pickups
let DEBUG_PICKUPS = false;

// ===================== Dash de Enemigos y QTE =====================
// (definiciones únicas)
const ENEMY_DASH_COOLDOWN = 3.0; // s entre dashes
const ENEMY_DASH_DURATION = 0.25; // s del dash
const ENEMY_DASH_SPEED_MULT = 4.0; // multiplicador de velocidad durante dash
const ENEMY_DASH_TRIGGER_DISTANCE = 260; // distancia para intentar dash

const QTE_WINDOW = 0.9; // segundos para responder
let qteActive = false;
let qteEndTime = 0;
let qteRequiredKey = '';
let qteAttackDir = { x: 0, y: 0 };
let qteOverlay = null;
const QTE_COOLDOWN_FAIL = 1.0; // s bloqueo tras fallar
const QTE_COOLDOWN_SUCCESS = 2.0; // s bloqueo tras esquivar
let qteLockUntil = 0; // timestamp hasta el cual no se puede re-disparar QTE
let qteAttackerDamage = ENEMY_HIT_DAMAGE; // daño del enemigo que inició el QTE

// Salto
const JUMP_DURATION = 0.45; // segundos en el aire
const JUMP_SCALE = 0.35; // escala adicional máxima durante el salto (0.35 => 35% más grande)
const JUMP_COOLDOWN = 1.0; // 1 segundo total entre saltos

// Respawn
const RESPAWN_SAFE_DISTANCE = 300; // distancia mínima a enemigos al respawnear
const RESPAWN_INVULNERABLE = 1.5; // segundos de invulnerabilidad post-respawn

// Tamaño del área de juego (más grande que la ventana)
const GAME_WIDTH = Math.floor(window.innerWidth * 2);
const GAME_HEIGHT = Math.floor(window.innerHeight * 2);

// Tamaño del área visible (tamaño de la ventana)
// NOTA: usar window.innerWidth/innerHeight dinámicamente en cámara para reflejar cambios de tamaño.
const VIEWPORT_WIDTH = window.innerWidth;
const VIEWPORT_HEIGHT = window.innerHeight;

// Borde del elemento #game (en px). Debe coincidir con el CSS/estilo en startGame()
const GAME_BORDER = 8;
// Dimensiones totales del mundo considerando el borde (border-box)
const WORLD_WIDTH = GAME_WIDTH + GAME_BORDER * 2;
const WORLD_HEIGHT = GAME_HEIGHT + GAME_BORDER * 2;

// Elementos del DOM
const mainMenu = document.getElementById('main-menu');
const gameContainer = document.getElementById('game-container');
const singleplayerBtn = document.getElementById('singleplayer-btn');
const multiplayerBtn = document.getElementById('multiplayer-btn');
const backToMenuBtn = document.getElementById('back-to-menu');
const multiplayerControls = document.getElementById('multiplayer-controls');
const fullscreenBtn = document.getElementById('fullscreen-btn');

// Estado del juego
let gameMode = ''; // 'singleplayer' o 'multiplayer'
let gameRunning = false;

// Estados de estamina para cada modo de juego
const staminaStates = {
    singleplayer: STAMINA_MAX,
    multiplayer: STAMINA_MAX
};

// Estado del jugador
const player = {
    x: GAME_WIDTH / 2 - 15,
    y: GAME_HEIGHT / 2 - 15,
    width: 30,
    height: 30,
    color: '#2ecc71',
    id: '',
    isSprinting: false,
    isDashing: false,
    dashDirection: { x: 0, y: 0 },
    dashStartTime: 0,
    lastDashTime: 0,
    lastUpdate: Date.now(),
    health: HEALTH_MAX,
    isJumping: false,
    jumpStartTime: 0,
    lastJumpTime: 0,
    lastShotTime: 0
};

// Función para obtener la estamina actual según el modo de juego
function getCurrentStamina() {
    return staminaStates[gameMode] || STAMINA_MAX;
}

// ===================== Menu HUD (separada del juego) =====================
function ensureMenuHUDRoot() {
    let root = document.getElementById('menu-hud-root');
    if (!root) {
        root = document.createElement('div');
        root.id = 'menu-hud-root';
        root.style.position = 'fixed';
        root.style.left = '0';
        root.style.top = '0';
        root.style.width = '100%';
        root.style.pointerEvents = 'none';
        root.style.zIndex = '900';
        document.body.appendChild(root);
        // Contenido ejemplo: tips de controles
        const tips = document.createElement('div');
        tips.id = 'menu-tips';
        tips.style.position = 'fixed';
        tips.style.bottom = '20px';
        tips.style.left = '20px';
        tips.style.color = '#ecf0f1';
        tips.style.fontFamily = 'Arial, sans-serif';
        tips.style.fontSize = '13px';
        tips.style.textShadow = '0 2px 4px rgba(0,0,0,0.4)';
        tips.textContent = 'Controles: WASD para moverte, Click para disparar, R para recargar, CTRL para dash.';
        root.appendChild(tips);
    }
    return root;
}

function showMenuHUD() {
    const root = ensureMenuHUDRoot();
    root.style.display = 'block';
}

function hideMenuHUD() {
    const root = ensureMenuHUDRoot();
    root.style.display = 'none';
}

// ===================== HUD helpers =====================
function hideHUD() {
    const root = ensureGameHUDRoot();
    root.style.display = 'none';
    // Ocultar contenedores de HUD del juego por si fueron creados previamente fuera del root
    const healthC = document.getElementById('health-container');
    if (healthC) healthC.style.display = 'none';
    const staminaC = document.getElementById('stamina-container');
    if (staminaC) staminaC.style.display = 'none';
    const dashC = document.getElementById('dash-cooldown-container');
    if (dashC) dashC.style.display = 'none';
    const ammo = document.getElementById('ammo-text-only');
    if (ammo) ammo.style.display = 'none';
    const wave = document.getElementById('wave-hud');
    if (wave) wave.style.display = 'none';
    const minimap = document.getElementById('minimap');
    if (minimap) minimap.style.display = 'none';
    const xpC = document.getElementById('xp-container');
    if (xpC) xpC.style.display = 'none';
    const badge = document.getElementById('debug-pickups-badge');
    if (badge) badge.remove();
    if (qteOverlay) qteOverlay.style.display = 'none';
    clearPickupDebugOverlays();
}

function showHUD() {
    const root = ensureGameHUDRoot();
    root.style.display = 'block';
    ensureAmmoTextHUD();
    ensureWaveHUD();
    ensureXPBarHUD();
    setupMinimap();
    // Asegurar mostrar contenedores base
    const healthC = document.getElementById('health-container');
    if (healthC) healthC.style.display = 'block';
    const staminaC = document.getElementById('stamina-container');
    if (staminaC) staminaC.style.display = 'block';
    const dashC = document.getElementById('dash-cooldown-container');
    if (dashC) dashC.style.display = 'block';
    // refrescar textos
    updateAmmoTextHUD();
    updateWaveHUD();
    updateXPBarHUD();
}

function ensureGameHUDRoot() {
    let root = document.getElementById('game-hud-root');
    if (!root) {
        root = document.createElement('div');
        root.id = 'game-hud-root';
        root.style.position = 'fixed';
        root.style.left = '0';
        root.style.top = '0';
        root.style.width = '100%';
        root.style.height = '0';
        root.style.pointerEvents = 'none';
        root.style.zIndex = '1000';
        document.body.appendChild(root);
    }
    return root;
}

// Determinar el tipo de enemigo según la oleada actual
function getWaveEnemyType() {
    if (currentWave <= 2) return 'green';
    if (currentWave <= 4) return 'orange';
    return 'red';
}

// Stats por tipo de enemigo
function getEnemyStats(type) {
    switch (type) {
        case 'green':
            return { health: 30, damage: 8, xpReward: 1, color: '#2ecc71', border: '#27ae60', glow: 'rgba(46, 204, 113, 0.6)' };
        case 'orange':
            return { health: 60, damage: 14, xpReward: 3, color: '#e67e22', border: '#d35400', glow: 'rgba(230, 126, 34, 0.7)' };
        case 'red':
        default:
            return { health: 90, damage: 20, xpReward: 5, color: '#e74c3c', border: '#c0392b', glow: 'rgba(231, 76, 60, 0.8)' };
    }
}

// ===================== Wave HUD =====================
function ensureWaveHUD() {
    let hud = document.getElementById('wave-hud');
    if (!hud) {
        hud = document.createElement('div');
        hud.id = 'wave-hud';
        hud.style.position = 'fixed';
        hud.style.top = '140px';
        hud.style.left = '20px';
        hud.style.color = '#ecf0f1';
        hud.style.fontFamily = 'Arial, sans-serif';
        hud.style.fontSize = '14px';
        hud.style.zIndex = '1000';
        hud.style.textShadow = '0 2px 4px rgba(0,0,0,0.4)';
        ensureGameHUDRoot().appendChild(hud);
    } else {
        hud.style.display = 'block';
        if (hud.parentElement && hud.parentElement.id !== 'game-hud-root') {
            ensureGameHUDRoot().appendChild(hud);
        }
    }
}

function updateWaveHUD() {
    const hud = document.getElementById('wave-hud');
    if (!hud) return;
    hud.textContent = `Oleada ${currentWave} - Progreso: ${killsThisWave} / ${killsNeeded}`;
}

function ensureQTEOverlay() {
    if (qteOverlay) return qteOverlay;
    const el = document.createElement('div');
    el.id = 'qte-overlay';
    el.style.position = 'fixed';
    el.style.left = '0';
    el.style.top = '0';
    el.style.width = '100%';
    el.style.height = '100%';
    el.style.background = 'rgba(0,0,0,0.6)';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.zIndex = '2000';
    const box = document.createElement('div');
    box.style.background = '#222';
    box.style.border = '2px solid #fff';
    box.style.borderRadius = '8px';
    box.style.padding = '16px 20px';
    box.style.color = '#fff';
    box.style.fontFamily = 'Arial, sans-serif';
    box.style.fontSize = '20px';
    box.style.textAlign = 'center';
    box.innerHTML = 'Presiona: <span id="qte-key" style="font-weight:bold;font-size:28px;"></span>\
    <div id="qte-timer" style="margin-top:12px;width:220px;height:10px;background:rgba(255,255,255,0.15);border:1px solid #fff;border-radius:6px;overflow:hidden;">\
      <div id="qte-timer-fill" style="width:100%;height:100%;background:#2ecc71;transition:width 0.05s linear;"></div>\
    </div>';
    el.appendChild(box);
    document.body.appendChild(el);
    qteOverlay = el;
    return el;
}

function startQTE(attackDir, attackerDamage) {
    if (qteActive) return;
    qteActive = true;
    qteEndTime = Date.now() / 1000 + QTE_WINDOW;
    qteAttackDir = attackDir;
    qteAttackerDamage = attackerDamage || ENEMY_HIT_DAMAGE;
    // Seleccionar flecha requerida opuesta a la dirección de ataque
    let key = 'ArrowLeft';
    if (Math.abs(attackDir.x) > Math.abs(attackDir.y)) {
        key = attackDir.x > 0 ? 'ArrowLeft' : 'ArrowRight';
    } else {
        key = attackDir.y > 0 ? 'ArrowUp' : 'ArrowDown';
    }
    qteRequiredKey = key;
    const overlay = ensureQTEOverlay();
    overlay.style.display = 'flex';
    const keySpan = overlay.querySelector('#qte-key');
    if (keySpan) keySpan.textContent = (
        key === 'ArrowUp' ? '↑' : key === 'ArrowDown' ? '↓' : key === 'ArrowLeft' ? '←' : '→'
    );
    // Asegurar que no haya inputs con foco que roben el teclado
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
    }
    console.log('[QTE] start, required:', qteRequiredKey);
}

function endQTE(success) {
    qteActive = false;
    if (qteOverlay) qteOverlay.style.display = 'none';
    if (success) {
        // Flash verde
        const flash = document.createElement('div');
        flash.style.position = 'fixed';
        flash.style.left = '0';
        flash.style.top = '0';
        flash.style.width = '100%';
        flash.style.height = '100%';
        flash.style.background = 'rgba(46, 204, 113, 0.35)';
        flash.style.zIndex = '2001';
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 120);
        // Dash del jugador en dirección opuesta al ataque
        const dx = -qteAttackDir.x;
        const dy = -qteAttackDir.y;
        // Dash de evasión que NO consume el cooldown del dash normal
        forceEvadeDash(dx, dy);
        // Cooldown de QTE más largo en éxito
        qteLockUntil = Date.now() / 1000 + QTE_COOLDOWN_SUCCESS;
    } else {
        // Aplicar daño inmediato SIN invulnerabilidad tras el golpe
        applyPlayerDamageImmediate(qteAttackerDamage);
        // Cooldown de QTE más corto en fallo
        qteLockUntil = Date.now() / 1000 + QTE_COOLDOWN_FAIL;
    }
    console.log('[QTE] end, success=', success);
}

function forcePlayerDash(dx, dy) {
    const len = Math.hypot(dx, dy) || 1;
    player.dashDirection.x = dx / len;
    player.dashDirection.y = dy / len;
    player.dashStartTime = Date.now() / 1000;
    player.isDashing = true;
    player.lastDashTime = player.dashStartTime;
}

// Dash de evasión (para QTE) que no toca el cooldown del dash normal
function forceEvadeDash(dx, dy) {
    const len = Math.hypot(dx, dy) || 1;
    player.dashDirection.x = dx / len;
    player.dashDirection.y = dy / len;
    player.dashStartTime = Date.now() / 1000;
    player.isDashing = true;
    // Nota: NO actualizar lastDashTime
}

// Círculo de depuración para radio de recolección
function drawPickupDebugOverlayCircle(cx, cy, r, type) {
    const game = document.getElementById('game');
    if (!game) return;
    const d = document.createElement('div');
    d.className = 'pickup-debug';
    d.style.position = 'absolute';
    d.style.left = (cx - r) + 'px';
    d.style.top = (cy - r) + 'px';
    d.style.width = (r * 2) + 'px';
    d.style.height = (r * 2) + 'px';
    d.style.border = `2px dashed ${type === 'health' ? '#e74c3c' : '#f1c40f'}`;
    d.style.borderRadius = '50%';
    d.style.pointerEvents = 'none';
    d.style.zIndex = '5';
    game.appendChild(d);
}

// ===================== Pickups =====================
let pickups = []; // {type:'health'|'ammo', x,y,w,h, el}
let lastPickupSpawnTime = 0; // segundos

function ensurePickupsContainer() {
    let cont = document.getElementById('pickups');
    if (!cont) {
        cont = document.createElement('div');
        cont.id = 'pickups';
        const game = document.getElementById('game');
        if (game) game.appendChild(cont);
    }

    // Actualizar badge de debug (mostrar/ocultar)
    updateDebugBadge();
    return cont;
}

function spawnPickup(type) {
    const cont = ensurePickupsContainer();
    const el = document.createElement('div');
    el.className = 'pickup ' + (type === 'health' ? 'pickup-health' : 'pickup-ammo');
    el.style.position = 'absolute';
    el.style.width = PICKUP_SIZE + 'px';
    el.style.height = PICKUP_SIZE + 'px';
    el.style.borderRadius = '4px';
    el.style.boxShadow = '0 0 10px rgba(0,0,0,0.3)';
    el.style.pointerEvents = 'none';
    if (type === 'health') {
        el.style.background = '#e74c3c';
        el.style.border = '2px solid #c0392b';
    } else {
        el.style.background = '#f1c40f';
        el.style.border = '2px solid #f39c12';
    }

    // posición aleatoria, evitando muy cerca del jugador
    let px = 0, py = 0;
    let attempts = 0;
    do {
        px = Math.floor(Math.random() * (GAME_WIDTH - PICKUP_SIZE));
        py = Math.floor(Math.random() * (GAME_HEIGHT - PICKUP_SIZE));
        attempts++;
        if (attempts > 100) break;
    } while (Math.hypot(px - player.x, py - player.y) < 150);

    el.style.left = px + 'px';
    el.style.top = py + 'px';
    cont.appendChild(el);

    pickups.push({ type, x: px, y: py, w: PICKUP_SIZE, h: PICKUP_SIZE, el });
    if (DEBUG_PICKUPS) console.log('[DEBUG_PICKUPS] spawn', type, 'at', { x: px, y: py });
}

function trySpawnPickups(currentTimeSec) {
    if (pickups.length >= PICKUP_MAX_ON_MAP) return;
    if (currentTimeSec - lastPickupSpawnTime < PICKUP_SPAWN_INTERVAL) return;
    const hasHealth = pickups.some(p => p.type === 'health');
    const hasAmmo = pickups.some(p => p.type === 'ammo');
    const missing = [];
    if (!hasHealth) missing.push('health');
    if (!hasAmmo) missing.push('ammo');
    if (missing.length === 0) return; // ya hay uno de cada tipo en el mapa
    const type = missing[Math.floor(Math.random() * missing.length)];
    spawnPickup(type);
    lastPickupSpawnTime = currentTimeSec; // solo actualizar si spawneamos
}

function updatePickups() {
    if (DEBUG_PICKUPS) {
        clearPickupDebugOverlays();
        drawPlayerDebugOverlay();
        console.log('[DEBUG_PICKUPS] frame pickups:', pickups.length);
    }
    if (!pickups.length) return;
    for (let i = pickups.length - 1; i >= 0; i--) {
        const p = pickups[i];
        // No recoger si el jugador está saltando (en el aire)
        if (player.isJumping) {
            continue;
        }
        // actualizar posición visual por si se movió la cámara (elementos absolutos ya se reposicionan con el mundo)
        if (p.el) {
            p.el.style.left = p.x + 'px';
            p.el.style.top = p.y + 'px';
        }
        // Colisión AABB ajustada a diseño: encoger un poco el área del pickup
        const shrink = 4; // px hacia adentro
        const ax1 = player.x, ay1 = player.y, ax2 = player.x + player.width, ay2 = player.y + player.height;
        const bx1 = p.x + shrink, by1 = p.y + shrink, bx2 = p.x + p.w - shrink, by2 = p.y + p.h - shrink;
        const overlap = !(ax2 < bx1 || ax1 > bx2 || ay2 < by1 || ay1 > by2);
        if (overlap) {
            if (p.type === 'health') {
                player.health = Math.min(playerMaxHealth, player.health + PICKUP_HEALTH_AMOUNT);
            } else if (p.type === 'ammo') {
                ammoReserve += PICKUP_AMMO_AMOUNT;
            }
            // Efecto visual y eliminar
            showPickupEffect(p.type, p.x + p.w / 2, p.y + p.h / 2);
            if (p.el) p.el.remove();
            pickups.splice(i, 1);
        }
    }
}

// Badge visual de debug en pantalla
function updateDebugBadge() {
    let badge = document.getElementById('debug-pickups-badge');
    if (!DEBUG_PICKUPS) {
        if (badge) badge.remove();
        return;
    }
    if (!badge) {
        badge = document.createElement('div');
        badge.id = 'debug-pickups-badge';
        badge.style.position = 'fixed';
        badge.style.top = '10px';
        badge.style.right = '10px';
        badge.style.padding = '6px 10px';
        badge.style.background = 'rgba(231, 76, 60, 0.9)';
        badge.style.border = '1px solid #c0392b';
        badge.style.borderRadius = '4px';
        badge.style.color = '#fff';
        badge.style.fontSize = '12px';
        badge.style.zIndex = '2001';
        badge.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
        document.body.appendChild(badge);
    }
    badge.textContent = `DEBUG PICKUPS ON | pickups: ${pickups.length}`;
}

function clearPickupDebugOverlays() {
    document.querySelectorAll('.pickup-debug, .player-debug').forEach(el => el.remove());
}

function drawPickupDebugOverlay(x, y, w, h, type) {
    const game = document.getElementById('game');
    if (!game) return;
    const box = document.createElement('div');
    box.className = 'pickup-debug';
    box.style.position = 'absolute';
    box.style.left = x + 'px';
    box.style.top = y + 'px';
    box.style.width = w + 'px';
    box.style.height = h + 'px';
    box.style.border = `2px dashed ${type === 'health' ? '#e74c3c' : '#f1c40f'}`;
    box.style.background = type === 'health' ? 'rgba(231,76,60,0.15)' : 'rgba(241,196,15,0.15)';
    box.style.pointerEvents = 'none';
    box.style.zIndex = '5';
    game.appendChild(box);
}

function drawPlayerDebugOverlay() {
    const game = document.getElementById('game');
    if (!game) return;
    const box = document.createElement('div');
    box.className = 'player-debug';
    box.style.position = 'absolute';
    box.style.left = player.x + 'px';
    box.style.top = player.y + 'px';
    box.style.width = player.width + 'px';
    box.style.height = player.height + 'px';
    box.style.border = '2px solid #3498db';
    box.style.pointerEvents = 'none';
    box.style.zIndex = '6';
    game.appendChild(box);
}

// Efecto visual al recoger pickups: texto flotante y brillo breve en el jugador
function showPickupEffect(type, worldX, worldY) {
    const game = document.getElementById('game');
    if (!game) return;
    const txt = document.createElement('div');
    txt.style.position = 'absolute';
    txt.style.left = worldX - 10 + 'px';
    txt.style.top = worldY - 10 + 'px';
    txt.style.fontSize = '14px';
    txt.style.fontWeight = 'bold';
    txt.style.pointerEvents = 'none';
    txt.style.textShadow = '0 2px 4px rgba(0,0,0,0.5)';
    if (type === 'health') {
        txt.textContent = '+HP';
        txt.style.color = '#e74c3c';
    } else {
        txt.textContent = '+AMMO';
        txt.style.color = '#f1c40f';
    }
    game.appendChild(txt);
    // Animar hacia arriba y desvanecer
    let t = 0;
    const dur = 600; // ms
    const startY = worldY - 10;
    const start = performance.now();
    function step(now) {
        t = Math.min(1, (now - start) / dur);
        const y = startY - t * 30;
        txt.style.top = y + 'px';
        txt.style.opacity = String(1 - t);
        if (t < 1) requestAnimationFrame(step); else txt.remove();
    }
    requestAnimationFrame(step);

    // Brillo breve en el jugador
    const playerEl = document.getElementById('player');
    if (playerEl) {
        const old = playerEl.style.boxShadow || 'none';
        playerEl.style.boxShadow = type === 'health' ? '0 0 18px rgba(231,76,60,0.9)' : '0 0 18px rgba(241,196,15,0.9)';
        setTimeout(() => { playerEl.style.boxShadow = old; }, 200);
    }
}

// ===================== HUD: Texto de munición (solo visual) =====================
function ensureAmmoTextHUD() {
    let cont = document.getElementById('ammo-text-only');
    if (!cont) {
        cont = document.createElement('div');
        cont.id = 'ammo-text-only';
        cont.style.position = 'fixed';
        cont.style.top = '110px';
        cont.style.left = '20px';
        cont.style.zIndex = '1000';
        cont.style.color = '#ecf0f1';
        cont.style.fontSize = '14px';
        cont.style.fontFamily = 'Arial, sans-serif';
        cont.textContent = `AMMO: ${ammoInMag} / ${ammoReserve}`;
        ensureGameHUDRoot().appendChild(cont);
    } else {
        cont.style.display = 'block';
        if (cont.parentElement && cont.parentElement.id !== 'game-hud-root') {
            ensureGameHUDRoot().appendChild(cont);
        }
    }
}

function updateAmmoTextHUD() {
    const cont = document.getElementById('ammo-text-only');
    if (!cont) return;
    cont.textContent = `AMMO: ${ammoInMag} / ${ammoReserve}${isReloading ? ' (recargando...)' : ''}`;
}

// ===================== Pantalla Completa =====================
function isFullscreen() {
    return document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
}

function requestFullscreen(elem) {
    if (!elem) return Promise.resolve();
    const fn = elem.requestFullscreen || elem.webkitRequestFullscreen || elem.mozRequestFullScreen || elem.msRequestFullscreen;
    if (fn) {
        try { return fn.call(elem); } catch (e) { return Promise.reject(e); }
    }
    return Promise.resolve();
}

function exitFullscreen() {
    const fn = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
    if (fn) {
        try { return fn.call(document); } catch (e) { return Promise.reject(e); }
    }
    return Promise.resolve();
}

async function enterFullscreen() {
    // Usamos el elemento raíz del documento para ocupar toda la pantalla
    const root = document.documentElement;
    if (!isFullscreen()) {
        try {
            await requestFullscreen(root);
        } catch (err) {
            console.warn('No se pudo entrar en pantalla completa:', err);
        }
    }
}

// Disparo de pistola
function shoot() {
    const now = Date.now() / 1000;
    if (now - player.lastShotTime < FIRE_COOLDOWN) return;
    // Bloquear disparo si no hay balas en el cargador
    if (isReloading) return;
    if (ammoInMag <= 0) return;
    player.lastShotTime = now;

    const mw = getMouseWorld();
    const sx = player.x + player.width / 2;
    const sy = player.y + player.height / 2;
    let dx = mw.x - sx;
    let dy = mw.y - sy;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;

    const el = document.createElement('div');
    el.className = 'bullet';
    el.style.position = 'absolute';
    el.style.width = '6px';
    el.style.height = '6px';
    el.style.background = '#ecf0f1';
    el.style.borderRadius = '50%';
    el.style.left = (sx - 3) + 'px';
    el.style.top = (sy - 3) + 'px';
    const game = document.getElementById('game');
    if (game) game.appendChild(el);

    bullets.push({ x: sx - 3, y: sy - 3, w: 6, h: 6, vx: dx * BULLET_SPEED, vy: dy * BULLET_SPEED, el, ttl: 1.5 });

    // Consumir una bala del cargador
    ammoInMag = Math.max(0, ammoInMag - 1);
}

let isFiring = false;
document.addEventListener('mousedown', (e) => {
    if (e.button === 0) { isFiring = true; shoot(); }
});
document.addEventListener('mouseup', (e) => {
    if (e.button === 0) { isFiring = false; }
});

function updateBullets(deltaTime) {
    if (!bullets.length) return;
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.x += b.vx * deltaTime;
        b.y += b.vy * deltaTime;
        b.ttl -= deltaTime;
        if (b.el) { b.el.style.left = b.x + 'px'; b.el.style.top = b.y + 'px'; }

        // eliminar si sale del mundo o sin ttl
        const out = b.x < 0 || b.y < 0 || b.x > GAME_WIDTH || b.y > GAME_HEIGHT || b.ttl <= 0;
        let hit = false;
        // colisión con enemigos
        for (let j = 0; j < enemies.length; j++) {
            const en = enemies[j];
            if (rectsOverlap(b.x, b.y, b.w, b.h, en.x, en.y, en.w, en.h)) {
                en.health -= BULLET_DAMAGE * (typeof bulletDamageMult === 'number' ? bulletDamageMult : 1);
                hit = true;
                if (en.health <= 0) {
                    if (en.el) en.el.remove();
                    if (en.hpEl) en.hpEl.remove();
                    enemies.splice(j, 1);
                    addXP(en.xpReward || 0);
                    onEnemyKilled();
                }
                break;
            }
        }
        if (out || hit) {
            if (b.el) b.el.remove();
            bullets.splice(i, 1);
        }
    }

    // Crear barra de cooldown de salto si no existe
    let jumpCooldownBar = document.getElementById('jump-cooldown-bar');
    if (!jumpCooldownBar) {
        const container = document.createElement('div');
        container.id = 'jump-cooldown-container';
        container.style.position = 'fixed';
        container.style.top = '110px'; // Debajo de salud, estamina y dash
        container.style.left = '20px';
        container.style.width = '200px';
        container.style.zIndex = '1000';

        const label = document.createElement('div');
        label.textContent = 'JUMP';
        label.style.color = '#ecf0f1';
        label.style.fontSize = '12px';
        label.style.fontWeight = 'bold';
        label.style.marginBottom = '2px';

        jumpCooldownBar = document.createElement('div');
        jumpCooldownBar.id = 'jump-cooldown-bar';
        jumpCooldownBar.style.width = '100%';
        jumpCooldownBar.style.height = '15px';
        jumpCooldownBar.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        jumpCooldownBar.style.borderRadius = '10px';
        jumpCooldownBar.style.overflow = 'hidden';

        const jumpFill = document.createElement('div');
        jumpFill.id = 'jump-cooldown-fill';
        jumpFill.style.height = '100%';
        jumpFill.style.width = '100%';
        jumpFill.style.backgroundColor = '#1abc9c';
        jumpFill.style.transition = 'width 0.1s linear';

        jumpCooldownBar.appendChild(jumpFill);
        container.appendChild(label);
        container.appendChild(jumpCooldownBar);
        document.body.appendChild(container);
    }

    // Remover HUD de cooldown de salto si existe (ya no se usa)
    const jumpCont = document.getElementById('jump-cooldown-container');
    if (jumpCont && jumpCont.parentNode) jumpCont.parentNode.removeChild(jumpCont);
}

// Recarga instantánea (solo texto): mueve balas de la reserva al cargador
function reloadAmmo() {
    if (isReloading) return;
    if (ammoInMag >= MAG_SIZE) return; // ya está lleno
    if (ammoReserve <= 0) return; // no hay reserva
    // iniciar recarga con cooldown
    isReloading = true;
    reloadEndTime = Date.now() / 1000 + RELOAD_DURATION;
}

// Manejar el salto del jugador
function handleJump() {
    const now = Date.now() / 1000;
    if (player.isJumping) return;
    // Disponibilidad: 1s desde el último salto
    if (now - player.lastJumpTime < JUMP_COOLDOWN) return;
    player.isJumping = true;
    player.jumpStartTime = now;
    player.lastJumpTime = now;
    // invulnerable durante el salto
    if (typeof invulnerableUntil !== 'undefined') {
        invulnerableUntil = Math.max(invulnerableUntil, now + JUMP_DURATION);
    }
}

// Respawn del jugador lejos de enemigos
function respawnPlayer() {
    const maxAttempts = 100;
    let rx = player.x, ry = player.y;
    for (let i = 0; i < maxAttempts; i++) {
        const tx = Math.floor(Math.random() * (GAME_WIDTH - player.width));
        const ty = Math.floor(Math.random() * (GAME_HEIGHT - player.height));
        let safe = true;
        for (const en of enemies) {
            const ecx = en.x + en.w / 2;
            const ecy = en.y + en.h / 2;
            const pcx = tx + player.width / 2;
            const pcy = ty + player.height / 2;
            if (Math.hypot(pcx - ecx, pcy - ecy) < RESPAWN_SAFE_DISTANCE) {
                safe = false; break;
            }
        }
        if (safe) { rx = tx; ry = ty; break; }
    }
    player.x = rx; player.y = ry;
    player.health = playerMaxHealth;
    const now = Date.now() / 1000;
    invulnerableUntil = now + RESPAWN_INVULNERABLE;
    shakeEndTime = now; // detener shake
    centerCameraImmediately();
}

// Función para establecer la estamina actual según el modo de juego
function setCurrentStamina(value) {
    if (gameMode) {
        staminaStates[gameMode] = Math.max(0, Math.min(STAMINA_MAX, value));
    }
    // Manejar fin de salto
    if (player.isJumping) {
        const nowSec = Date.now() / 1000;
        if (nowSec - player.jumpStartTime >= JUMP_DURATION) {
            player.isJumping = false;
        }
    }

    // Si el jugador muere, respawnear lejos de enemigos
    if (player.health <= 0) {
        respawnPlayer();
        return; // saltar el resto del update este frame
    }
    return getCurrentStamina();
}

// Almacenar otros jugadores conectados (solo en modo multijugador)
const otherPlayers = {};
let peer = null;
let conn = null;
let myId = '';
let animationId = null;

// ===================== MINIMAPA: estado =====================
let minimapInited = false;
const MINIMAP_WIDTH = 200;
const MINIMAP_HEIGHT = 200; // cuadrado simple
const MINIMAP_DOT_SIZE = 6;
// Posiciones conocidas de otros jugadores para dibujar en el minimapa
const otherPlayerPositions = {};

// ===================== Enemigos =====================
let enemies = [];
// Estado de invulnerabilidad y shake
let invulnerableUntil = 0; // timestamp en segundos
let shakeEndTime = 0; // timestamp en segundos

// Balas
let bullets = [];

// ===================== Oleadas =====================
let currentWave = 1;
const MAX_WAVES = 5;
let killsThisWave = 0;
let killsNeeded = 1; // wave 1 requiere 1 kill, luego +1 por wave

// ===================== Experiencia / Nivel =====================
let playerLevel = 1;
let playerXP = 0;
let xpRequired = 5; // Nivel 1 requiere 5 XP (más ágil para probar)
let levelUpActive = false;
let pendingLevelUps = 0;
let playerSpeedMult = 1.0;
let bulletDamageMult = 1.0;

function xpRequiredFor(level) {
    return 5 + (level - 1) * 5;
}

function addXP(amount) {
    playerXP += Math.max(0, Math.floor(amount));
    console.log('[XP] +', amount, '=>', playerXP, '/', xpRequired);
    while (playerXP >= xpRequired) {
        playerXP -= xpRequired;
        playerLevel += 1;
        xpRequired = xpRequiredFor(playerLevel);
        pendingLevelUps += 1;
        console.log('[LEVEL UP] nivel=', playerLevel, 'pendingLevelUps=', pendingLevelUps);
    }
    if (!levelUpActive && pendingLevelUps > 0) showLevelUpOverlay();
    // Actualizar HUD de XP inmediatamente
    try { updateXPBarHUD(); } catch (_) {}
}

function showLevelUpOverlay() {
    levelUpActive = true;
    pendingLevelUps = Math.max(0, pendingLevelUps - 1);
    let ov = document.getElementById('levelup-overlay');
    console.log('[LEVEL UP] mostrando overlay');
    if (!ov) {
        ov = document.createElement('div');
        ov.id = 'levelup-overlay';
        ov.style.position = 'fixed';
        ov.style.left = '0';
        ov.style.top = '0';
        ov.style.width = '100%';
        ov.style.height = '100%';
        ov.style.background = 'rgba(0,0,0,0.6)';
        ov.style.display = 'flex';
        ov.style.alignItems = 'center';
        ov.style.justifyContent = 'center';
        ov.style.zIndex = '2500';
        const box = document.createElement('div');
        box.style.background = 'linear-gradient(180deg, #ffeaa7, #fdcb6e)';
        box.style.border = '3px solid #2d3436';
        box.style.borderRadius = '14px';
        box.style.boxShadow = '0 8px 0 #636e72, 0 12px 16px rgba(0,0,0,0.2)';
        box.style.padding = '16px';
        box.style.minWidth = '520px';
        const title = document.createElement('div');
        title.textContent = 'SUBISTE DE NIVEL! ELIGE UNA MEJORA';
        title.style.textAlign = 'center';
        title.style.color = '#2c3e50';
        title.style.marginBottom = '14px';
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.gap = '12px';
        row.style.justifyContent = 'center';
        const mk = (txt, fn, bg, border) => {
            const b = document.createElement('button');
            b.textContent = txt;
            b.style.fontFamily = "'Press Start 2P', 'VT323', monospace";
            b.style.fontSize = '12px';
            b.style.color = '#2c3e50';
            b.style.background = bg;
            b.style.border = `3px solid ${border}`;
            b.style.borderRadius = '12px';
            b.style.padding = '12px 16px';
            b.style.cursor = 'pointer';
            b.onclick = () => { fn(); closeLevelUpOverlay(); };
            return b;
        };
        row.appendChild(mk('Velocidad +10%', () => { playerSpeedMult *= 1.10; }, 'linear-gradient(180deg, #81ecec, #74b9ff)', '#0984e3'));
        row.appendChild(mk('Daño +20%', () => { bulletDamageMult *= 1.20; }, 'linear-gradient(180deg, #a29bfe, #6c5ce7)', '#6c5ce7'));
        row.appendChild(mk('Vida Máx +20', () => { playerMaxHealth += 20; player.health = Math.min(player.health + 20, playerMaxHealth); }, 'linear-gradient(180deg, #55efc4, #00cec9)', '#00cec9'));
        box.appendChild(title);
        box.appendChild(row);
        ov.appendChild(box);
        document.body.appendChild(ov);
    } else {
        ov.style.display = 'flex';
    }
}

function closeLevelUpOverlay() {
    const ov = document.getElementById('levelup-overlay');
    if (ov) ov.style.display = 'none';
    levelUpActive = false;
    if (pendingLevelUps > 0) showLevelUpOverlay();
}

// ===================== Experiencia / Nivel =====================

function ensureXPBarHUD() {
    let container = document.getElementById('xp-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'xp-container';
        container.style.position = 'fixed';
        container.style.top = '10px';
        container.style.left = '50%';
        container.style.transform = 'translateX(-50%)';
        container.style.width = '320px';
        container.style.zIndex = '1000';
        container.style.pointerEvents = 'none';

        const label = document.createElement('div');
        label.id = 'xp-label';
        label.style.textAlign = 'center';
        label.style.color = '#ecf0f1';
        label.style.fontFamily = 'Arial, sans-serif';
        label.style.fontSize = '12px';
        label.style.textShadow = '0 2px 4px rgba(0,0,0,0.4)';
        label.style.marginBottom = '4px';
        container.appendChild(label);

        const bar = document.createElement('div');
        bar.id = 'xp-bar';
        bar.style.width = '100%';
        bar.style.height = '14px';
        bar.style.background = 'rgba(0,0,0,0.5)';
        bar.style.border = '1px solid #fff';
        bar.style.borderRadius = '10px';
        bar.style.overflow = 'hidden';
        const fill = document.createElement('div');
        fill.id = 'xp-fill';
        fill.style.width = '0%';
        fill.style.height = '100%';
        fill.style.background = '#3498db';
        fill.style.transition = 'width 0.2s ease';
        bar.appendChild(fill);
        container.appendChild(bar);
        ensureGameHUDRoot().appendChild(container);
    } else {
        container.style.display = 'block';
        if (container.parentElement && container.parentElement.id !== 'game-hud-root') {
            ensureGameHUDRoot().appendChild(container);
        }
    }
}

function updateXPBarHUD() {
    const label = document.getElementById('xp-label');
    const fill = document.getElementById('xp-fill');
    if (!label || !fill) return;
    label.textContent = `LVL ${playerLevel}  |  XP: ${playerXP} / ${xpRequired}`;
    const pct = Math.max(0, Math.min(1, playerXP / xpRequired));
    fill.style.width = `${pct * 100}%`;
}

// Evitar sobreescribir la versión principal de addXP
function addXP_Legacy(amount) {
    // Delegar a la función principal (definida más arriba)
    try { return addXP(amount); } catch (_) {}
}

function resetWaves() {
    currentWave = 1;
    killsThisWave = 0;
    killsNeeded = 1;
}

function onEnemyKilled() {
    killsThisWave += 1;
    if (killsThisWave >= killsNeeded) {
        if (currentWave < MAX_WAVES) {
            currentWave += 1;
            killsThisWave = 0;
            killsNeeded = currentWave; // requisito = número de oleada
            // Spawnear exactamente la cantidad necesaria para la nueva oleada
            spawnEnemies(killsNeeded);
            console.log(`[WAVES] Avanzaste a la oleada ${currentWave}. Necesitas ${killsNeeded} kills.`);
        } else {
            console.log('[WAVES] ¡Has completado todas las oleadas!');
            // Opcional: mostrar victoria
            const win = document.createElement('div');
            win.textContent = '¡VICTORIA!';
            win.style.position = 'fixed';
            win.style.top = '50%';
            win.style.left = '50%';
            win.style.transform = 'translate(-50%, -50%)';
            win.style.color = '#2ecc71';
            win.style.fontSize = '48px';
            win.style.fontFamily = 'Arial, sans-serif';
            win.style.zIndex = '2100';
            document.body.appendChild(win);
            setTimeout(() => win.remove(), 1500);
        }
    }
}

function ensureEnemiesContainer() {
    let cont = document.getElementById('enemies');
    if (!cont) {
        cont = document.createElement('div');
        cont.id = 'enemies';
        const game = document.getElementById('game');
        if (game) game.appendChild(cont);
    }
    return cont;
}

function spawnEnemies(count = ENEMY_COUNT) {
    const cont = ensureEnemiesContainer();
    // limpiar existentes
    enemies.forEach(e => {
        if (e.el) e.el.remove();
        if (e.hpEl) e.hpEl.remove();
    });
    enemies = [];
    const type = getWaveEnemyType();
    const stats = getEnemyStats(type);
    for (let i = 0; i < count; i++) {
        const en = document.createElement('div');
        en.className = 'enemy';
        en.style.position = 'absolute';
        en.style.width = '20px';
        en.style.height = '20px';
        en.style.background = stats.color;
        en.style.border = `2px solid ${stats.border}`;
        en.style.boxShadow = `0 0 10px ${stats.glow}`;
        en.style.borderRadius = '4px';
        let ex = 0, ey = 0;
        do {
            ex = Math.floor(Math.random() * (GAME_WIDTH - 26));
            ey = Math.floor(Math.random() * (GAME_HEIGHT - 26));
        } while (Math.hypot(ex - player.x, ey - player.y) < 200);

        en.style.left = ex + 'px';
        en.style.top = ey + 'px';
        cont.appendChild(en);
        // etiqueta de vida encima de la cabeza
        const hp = document.createElement('div');
        hp.className = 'enemy-hp';
        hp.style.position = 'absolute';
        hp.style.color = '#fff';
        hp.style.fontSize = '10px';
        hp.style.fontFamily = 'Arial, sans-serif';
        hp.style.textShadow = '0 1px 2px rgba(0,0,0,0.6)';
        hp.style.pointerEvents = 'none';
        hp.style.zIndex = '3';
        hp.textContent = String(stats.health);
        cont.appendChild(hp);
        enemies.push({ x: ex, y: ey, w: 20, h: 20, el: en, hpEl: hp,
            health: stats.health, damage: stats.damage, xpReward: stats.xpReward, type,
            isDashing: false, dashStartTime: 0, lastDashTime: 0, dashDir: { x: 0, y: 0 } });
    }
}

function updateEnemies(deltaTime) {
    if (!enemies.length) return;
    const nowSec = Date.now() / 1000;
    const px = player.x + player.width / 2;
    const py = player.y + player.height / 2;
    enemies.forEach(en => {
        // mover hacia el jugador
        const dx = px - en.x;
        const dy = py - en.y;
        const dist = Math.hypot(dx, dy) || 1;
        const dirx = dx / dist;
        const diry = dy / dist;
        // gestionar dash
        if (en.isDashing) {
            const t = nowSec - en.dashStartTime;
            const speed = ENEMY_SPEED * ENEMY_DASH_SPEED_MULT;
            en.x = Math.max(0, Math.min(GAME_WIDTH - en.w, en.x + dirx * speed));
            en.y = Math.max(0, Math.min(GAME_HEIGHT - en.h, en.y + diry * speed));
            if (en.el) en.el.style.boxShadow = '0 0 18px rgba(231, 76, 60, 0.95)';
            if (t >= ENEMY_DASH_DURATION) {
                en.isDashing = false;
                en.lastDashTime = nowSec;
                if (en.el) en.el.style.boxShadow = '0 0 10px rgba(231, 76, 60, 0.6)';
            }
        } else {
            // intentar iniciar dash si cerca y cooldown
            if (dist < ENEMY_DASH_TRIGGER_DISTANCE && (nowSec - en.lastDashTime) >= ENEMY_DASH_COOLDOWN) {
                en.isDashing = true;
                en.dashStartTime = nowSec;
                en.dashDir = { x: dirx, y: diry };
            }
            // movimiento normal
            en.x = Math.max(0, Math.min(GAME_WIDTH - en.w, en.x + dirx * ENEMY_SPEED));
            en.y = Math.max(0, Math.min(GAME_HEIGHT - en.h, en.y + diry * ENEMY_SPEED));
        }
        
        // actualizar DOM
        if (en.el) {
            en.el.style.left = en.x + 'px';
            en.el.style.top = en.y + 'px';
        }
        if (en.hpEl) {
            en.hpEl.style.left = (en.x + en.w / 2 - 8) + 'px';
            en.hpEl.style.top = (en.y - 12) + 'px';
            en.hpEl.textContent = String(Math.max(0, Math.ceil(en.health)));
        }
        
        // colisión simple AABB
        if (rectsOverlap(player.x, player.y, player.width, player.height, en.x, en.y, en.w, en.h)) {
            if (!qteActive && nowSec >= qteLockUntil) {
                // Iniciar QTE en vez de dañar de inmediato
                const attackDir = { x: dirx, y: diry };
                startQTE(attackDir, en.damage || ENEMY_HIT_DAMAGE);
            }
        }
    });
    // Evitar superposición entre enemigos (separación por pares)
    for (let i = 0; i < enemies.length; i++) {
        for (let j = i + 1; j < enemies.length; j++) {
            const a = enemies[i];
            const b = enemies[j];
            if (rectsOverlap(a.x, a.y, a.w, a.h, b.x, b.y, b.w, b.h)) {
                // vector entre centros
                const acx = a.x + a.w / 2;
                const acy = a.y + a.h / 2;
                const bcx = b.x + b.w / 2;
                const bcy = b.y + b.h / 2;
                let dx = bcx - acx;
                let dy = bcy - acy;
                let d = Math.hypot(dx, dy);
                if (d === 0) { dx = 1; dy = 0; d = 1; }
                // Profundidad de interpenetración suponiendo cuadrados similares
                const overlapX = (a.w / 2 + b.w / 2) - Math.abs(dx);
                const overlapY = (a.h / 2 + b.h / 2) - Math.abs(dy);
                // mover a ambos a partes iguales a lo largo del eje mayor
                let pushX = 0, pushY = 0;
                if (overlapX < overlapY) {
                    pushX = (dx > 0 ? -overlapX / 2 : overlapX / 2);
                } else {
                    pushY = (dy > 0 ? -overlapY / 2 : overlapY / 2);
                }
                a.x += pushX; a.y += pushY;
                b.x -= pushX; b.y -= pushY;
                a.x = Math.max(0, Math.min(GAME_WIDTH - a.w, a.x));
                a.y = Math.max(0, Math.min(GAME_HEIGHT - a.h, a.y));
                b.x = Math.max(0, Math.min(GAME_WIDTH - b.w, b.x));
                b.y = Math.max(0, Math.min(GAME_HEIGHT - b.h, b.y));
                if (a.el) { a.el.style.left = a.x + 'px'; a.el.style.top = a.y + 'px'; }
                if (b.el) { b.el.style.left = b.x + 'px'; b.el.style.top = b.y + 'px'; }
            }
        }
    }
}

function rectsOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
    return !(x1 + w1 < x2 || x1 > x2 + w2 || y1 + h1 < y2 || y1 > y2 + h2);
}

// Aplicar daño al jugador con invulnerabilidad y shake
function applyPlayerDamage(amount) {
    const nowSec = Date.now() / 1000;
    if (nowSec < invulnerableUntil) return;
    player.health = Math.max(0, player.health - amount);
    invulnerableUntil = nowSec + INVULNERABLE_DURATION;
    shakeEndTime = nowSec + SHAKE_DURATION;
}

// Daño sin invulnerabilidad (para fallo de QTE)
function applyPlayerDamageImmediate(amount) {
    const nowSec = Date.now() / 1000;
    player.health = Math.max(0, player.health - amount);
    // No tocamos invulnerableUntil para permitir daño subsecuente inmediato
    shakeEndTime = nowSec + SHAKE_DURATION;
}

// Crear el minimapa si no existe
function setupMinimap() {
    let mm = document.getElementById('minimap');
    if (mm) {
        // Asegurar que esté en el root del juego y visible
        if (mm.parentElement && mm.parentElement.id !== 'game-hud-root') {
            ensureGameHUDRoot().appendChild(mm);
        }
        mm.style.display = 'block';
        minimapInited = true;
        return;
    }

    // Crear si no existe
    mm = document.createElement('div');
    mm.id = 'minimap';
    mm.style.position = 'fixed';
    mm.style.top = '20px';
    mm.style.right = '20px';
    mm.style.width = MINIMAP_WIDTH + 'px';
    mm.style.height = MINIMAP_HEIGHT + 'px';
    mm.style.background = 'rgba(0,0,0,0.5)';
    mm.style.border = '2px solid #fff';
    mm.style.borderRadius = '8px';
    mm.style.overflow = 'hidden';
    mm.style.zIndex = '1000';

    const world = document.createElement('div');
    world.id = 'minimap-world';
    world.style.position = 'relative';
    world.style.width = '100%';
    world.style.height = '100%';

    const me = document.createElement('div');
    me.id = 'minimap-me';
    me.style.position = 'absolute';
    me.style.width = MINIMAP_DOT_SIZE + 'px';
    me.style.height = MINIMAP_DOT_SIZE + 'px';
    me.style.background = '#2ecc71';
    me.style.border = '1px solid #27ae60';
    me.style.borderRadius = '50%';

    world.appendChild(me);
    mm.appendChild(world);
    ensureGameHUDRoot().appendChild(mm);
    minimapInited = true;
}

function updateMinimap() {
    if (!minimapInited) return;
    const me = document.getElementById('minimap-me');
    const world = document.getElementById('minimap-world');
    if (!me || !world) return;

    const scaleX = MINIMAP_WIDTH / GAME_WIDTH;
    const scaleY = MINIMAP_HEIGHT / GAME_HEIGHT;
    me.style.left = Math.floor(player.x * scaleX) + 'px';
    me.style.top = Math.floor(player.y * scaleY) + 'px';

    // Remove previous peer dots
    world.querySelectorAll('.minimap-peer').forEach(el => el.remove());
    world.querySelectorAll('.minimap-enemy').forEach(el => el.remove());
    world.querySelectorAll('.minimap-pickup').forEach(el => el.remove());

    // Draw peers
    Object.keys(otherPlayerPositions).forEach(id => {
        const pos = otherPlayerPositions[id];
        if (!pos) return;
        const dot = document.createElement('div');
        dot.className = 'minimap-peer';
        dot.style.position = 'absolute';
        dot.style.width = MINIMAP_DOT_SIZE + 'px';
        dot.style.height = MINIMAP_DOT_SIZE + 'px';
        dot.style.background = '#e74c3c';
        dot.style.border = '1px solid #c0392b';
        dot.style.borderRadius = '50%';
        dot.style.left = Math.floor(pos.x * scaleX) + 'px';
        dot.style.top = Math.floor(pos.y * scaleY) + 'px';
        world.appendChild(dot);
    });

    // Draw enemies
    if (Array.isArray(enemies)) {
        enemies.forEach(en => {
            const dot = document.createElement('div');
            dot.className = 'minimap-enemy';
            dot.style.position = 'absolute';
            dot.style.width = MINIMAP_DOT_SIZE + 'px';
            dot.style.height = MINIMAP_DOT_SIZE + 'px';
            const stats = getEnemyStats(en.type || getWaveEnemyType());
            dot.style.background = stats.color;
            dot.style.border = `1px solid ${stats.border}`;
            dot.style.borderRadius = '50%';
            dot.style.left = Math.floor(en.x * scaleX) + 'px';
            dot.style.top = Math.floor(en.y * scaleY) + 'px';
            world.appendChild(dot);
        });
    }

    // Draw pickups
    if (Array.isArray(pickups)) {
        pickups.forEach(p => {
            const dot = document.createElement('div');
            dot.className = 'minimap-pickup';
            dot.style.position = 'absolute';
            dot.style.width = MINIMAP_DOT_SIZE + 'px';
            dot.style.height = MINIMAP_DOT_SIZE + 'px';
            if (p.type === 'health') {
                dot.style.background = '#e74c3c';
                dot.style.border = '1px solid #c0392b';
            } else {
                dot.style.background = '#f1c40f';
                dot.style.border = '1px solid #f39c12';
            }
            dot.style.borderRadius = '50%';
            dot.style.left = Math.floor(p.x * scaleX) + 'px';
            dot.style.top = Math.floor(p.y * scaleY) + 'px';
            world.appendChild(dot);
        });
    }
}

// Inicializar PeerJS
function initPeer() {
    // IDs simples y legibles
    function generateSimpleId() {
        const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // sin caracteres confusos
        const digits = '23456789'; // sin 0/1
        const pick = (pool, n) => Array.from({ length: n }, () => pool[Math.floor(Math.random() * pool.length)]).join('');
        return `${pick(letters, 4)}-${pick(digits, 3)}`; // ej: QWRT-583
    }

    function createPeerWithId(desiredId, attemptsLeft = 3) {
        if (peer) {
            try { peer.destroy(); } catch (_) {}
        }
        peer = new Peer(desiredId);

        peer.on('open', (id) => {
            myId = id;
            const el = document.getElementById('myIdDisplay');
            if (el) el.textContent = id;
            console.log('Mi ID es: ' + id);
        });

        peer.on('connection', (connection) => {
            console.log('Alguien se está conectando...');
            setupConnection(connection);
        });

        peer.on('error', (err) => {
            console.error('Error de conexión:', err);
            const msg = String(err && (err.type || err.message || err));
            if (attemptsLeft > 0 && /unavailable\-id|taken|already/i.test(msg)) {
                // ID tomado: reintentar con otro simple
                setTimeout(() => createPeerWithId(generateSimpleId(), attemptsLeft - 1), 150);
            }
        });
    }

    createPeerWithId(generateSimpleId());
}

// Configurar una conexión
function setupConnection(connection) {
    // Guardar la conexión actual
    const currentConn = connection;
    conn = currentConn;
    
    // Manejar la apertura de la conexión primero
    currentConn.on('open', () => {
        console.log('Conexión establecida con ' + currentConn.peer);
        
        // Configurar manejadores de datos solo después de que la conexión esté abierta
        currentConn.on('data', (data) => {
            if (data.type === 'playerUpdate') {
                updateOtherPlayer(data.id, data.position);
            } else if (data.type === 'newPlayer') {
                // Enviar nuestra posición al nuevo jugador
                sendPlayerPosition(currentConn);
            }
        });
        
        // Notificar al otro jugador sobre nuestra existencia
        try {
            currentConn.send({ type: 'newPlayer' });
        } catch (err) {
            console.error('Error al enviar mensaje de nuevo jugador:', err);
        }
    });
    
    // Manejar cierre de conexión
    currentConn.on('close', () => {
        console.log('Juego desconectado de ' + currentConn.peer);
        if (conn === currentConn) {
            removeOtherPlayer(currentConn.peer);
            conn = null;
        }
    });
    
    // Manejar errores de conexión
    currentConn.on('error', (err) => {
        console.error('Error en la conexión:', err);
        if (conn === currentConn) {
            removeOtherPlayer(currentConn.peer);
            conn = null;
        }
    });
}

// Conectar a otro peer
function connectToPeer(peerId) {
    if (!peerId) return;
    
    console.log('Conectando a ' + peerId);
    const connection = peer.connect(peerId);
    setupConnection(connection);
}

// Enviar la posición actual del jugador
function sendPlayerPosition(connection) {
    if (!connection) return;
    
    try {
        // Verificar si la conexión está abierta antes de enviar
        if (connection.open) {
            connection.send({
                type: 'playerUpdate',
                id: myId,
                position: {
                    x: player.x,
                    y: player.y
                }
            });
        }
    } catch (err) {
        console.error('Error al enviar posición:', err);
        // Si hay un error, asumimos que la conexión está rota
        if (conn === connection) {
            removeOtherPlayer(connection.peer);
            conn = null;
        }
    }
}

// Actualizar la posición de otro jugador
function updateOtherPlayer(id, position) {
    let otherPlayer = otherPlayers[id];
    
    if (!otherPlayer) {
        // Crear un nuevo jugador si no existe
        otherPlayer = document.createElement('div');
        otherPlayer.className = 'player';
        otherPlayer.id = 'player-' + id;
        otherPlayer.style.backgroundColor = getRandomColor();
        document.getElementById('otherPlayers').appendChild(otherPlayer);
        otherPlayers[id] = otherPlayer;
        
        // Configurar un temporizador para detectar inactividad
        otherPlayer.lastUpdate = Date.now();
        otherPlayer.updateInterval = setInterval(() => {
            if (Date.now() - otherPlayer.lastUpdate > 3000) { // 3 segundos sin actualización
                removeOtherPlayer(id);
            }
        }, 1000);
    }
    
    // Actualizar posición y tiempo de última actualización
    otherPlayer.style.left = position.x + 'px';
    otherPlayer.style.top = position.y + 'px';
    // Guardar posición para el minimapa
    otherPlayerPositions[id] = { x: position.x, y: position.y };
    otherPlayer.lastUpdate = Date.now();
}

// Eliminar un jugador del juego
function removeOtherPlayer(id) {
    const otherPlayer = otherPlayers[id];
    if (otherPlayer) {
        // Detener el intervalo de verificación de inactividad
        if (otherPlayer.updateInterval) {
            clearInterval(otherPlayer.updateInterval);
        }
        
        // Eliminar el elemento del DOM
        const playerElement = document.getElementById('player-' + id);
        if (playerElement && playerElement.parentNode) {
            playerElement.parentNode.removeChild(playerElement);
        }
        
        // Eliminar del objeto de jugadores
        delete otherPlayers[id];
        console.log('Jugador eliminado:', id);
    }
    // Limpiar del minimapa
    if (otherPlayerPositions[id]) {
        delete otherPlayerPositions[id];
    }
}

// Generar un color aleatorio para los otros jugadores
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// Manejar entrada del teclado
const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    shift: false,
    space: false,
    ctrl: false
};

// Última dirección de movimiento normalizada (para usar en el dash si no hay input)
let lastMoveDir = { x: 1, y: 0 };

// Última posición del mouse en pantalla y helper para convertir a mundo según cámara actual
let lastMouseScreen = { x: 0, y: 0 };
document.addEventListener('mousemove', (e) => {
    lastMouseScreen.x = e.clientX;
    lastMouseScreen.y = e.clientY;
});

function getMouseWorld() {
    return { x: lastMouseScreen.x - cameraX, y: lastMouseScreen.y - cameraY };
}

// Escuchar teclas presionadas
document.addEventListener('keydown', (e) => {
    // Capturar entrada de QTE antes que nada
    if (qteActive) {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            const success = (e.key === qteRequiredKey);
            endQTE(success);
        }
        return; // no procesar controles normales durante QTE
    }
    const key = e.key.toLowerCase();
    if (keys.hasOwnProperty(key)) {
        keys[key] = true;
    } else if (e.key === 'Shift') {
        keys.shift = true;
    } else if (e.key === 'Control') {
        keys.ctrl = true;
        handleDash(); // Dash con CTRL
    } else if (e.code === 'Space') {
        e.preventDefault(); // Evitar scroll con Space
        keys.space = true;
        handleJump();
    } else if (e.key.toLowerCase() === 'r') {
        reloadAmmo();
    } else if (e.key === 'F2') {
        DEBUG_PICKUPS = !DEBUG_PICKUPS;
        console.log('[DEBUG_PICKUPS] =', DEBUG_PICKUPS);
        // Limpiar overlays si se apaga
        if (!DEBUG_PICKUPS) clearPickupDebugOverlays();
        updateDebugBadge();
    } else if (e.key.toLowerCase() === 'l') {
        // Forzar test: recoger todos los pickups cercanos (<= 200px)
        const pcx = player.x + player.width / 2;
        const pcy = player.y + player.height / 2;
        for (let i = pickups.length - 1; i >= 0; i--) {
            const p = pickups[i];
            const ccx = p.x + p.w / 2;
            const ccy = p.y + p.h / 2;
            const d = Math.hypot(pcx - ccx, pcy - ccy);
            if (d <= 200) {
                if (p.type === 'health') {
                    player.health = Math.min(playerMaxHealth, player.health + PICKUP_HEALTH_AMOUNT);
                } else if (p.type === 'ammo') {
                    ammoReserve += PICKUP_AMMO_AMOUNT;
                }
                showPickupEffect(p.type, ccx, ccy);
                if (p.el) p.el.remove();
                pickups.splice(i, 1);
                console.log('[DEBUG_PICKUPS] force collect (L) type=', p.type, 'dist=', Math.round(d));
            }
        }
    }
});

// Escuchar teclas liberadas
document.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (keys.hasOwnProperty(key)) {
        keys[key] = false;
    } else if (e.key === 'Shift') {
        keys.shift = false;
        player.isSprinting = false;
    } else if (e.code === 'Space') {
        keys.space = false;
    } else if (e.key === 'Control') {
        keys.ctrl = false;
    }
});

// Mantener la vista centrada en el jugador
let cameraX = 0;
let cameraY = 0;
const CAMERA_SMOOTHING = 1.0; // centrar sin retraso

function updateCamera() {
    const gameElement = document.getElementById('game');
    if (!gameElement) return;
    
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    // offsetWidth/offsetHeight incluyen el borde (border-box)
    const worldW = gameElement.offsetWidth; 
    const worldH = gameElement.offsetHeight;

    // Calcular la posición objetivo para centrar al jugador
    // Restar GAME_BORDER para alinear correctamente el contenido (jugador) dentro de un contenedor con borde
    const targetX = -(player.x + GAME_BORDER) + (viewportW / 2) - (player.width / 2);
    const targetY = -(player.y + GAME_BORDER) + (viewportH / 2) - (player.height / 2);
    
    // Limitar el movimiento de la cámara a los bordes del juego
    const maxX = 0;
    const minX = viewportW - worldW;
    const maxY = 0;
    const minY = viewportH - worldH;
    
    // Centrar la cámara directamente (sin suavizado visible)
    cameraX += (Math.min(maxX, Math.max(minX, targetX)) - cameraX) * CAMERA_SMOOTHING;
    cameraY += (Math.min(maxY, Math.max(minY, targetY)) - cameraY) * CAMERA_SMOOTHING;
    
    // Sacudir cámara si corresponde
    let shakeX = 0, shakeY = 0;
    const nowSec = Date.now() / 1000;
    if (nowSec < shakeEndTime) {
        const remaining = Math.max(0, shakeEndTime - nowSec);
        const intensity = remaining / SHAKE_DURATION; // disminuye con el tiempo
        shakeX = (Math.random() * 2 - 1) * SHAKE_MAGNITUDE * intensity;
        shakeY = (Math.random() * 2 - 1) * SHAKE_MAGNITUDE * intensity;
    }

    // Aplicar la transformación para mover el mundo + shake
    gameElement.style.transform = `translate(${cameraX + shakeX}px, ${cameraY + shakeY}px)`;
}

// Centrar cámara de inmediato sin suavizado (para inicio de partida)
function centerCameraImmediately() {
    const gameElement = document.getElementById('game');
    if (!gameElement) return;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const worldW = gameElement.offsetWidth;
    const worldH = gameElement.offsetHeight;
    const targetX = -(player.x + GAME_BORDER) + (viewportW / 2) - (player.width / 2);
    const targetY = -(player.y + GAME_BORDER) + (viewportH / 2) - (player.height / 2);
    const maxX = 0;
    const minX = viewportW - worldW;
    const maxY = 0;
    const minY = viewportH - worldH;
    cameraX = Math.min(maxX, Math.max(minX, targetX));
    cameraY = Math.min(maxY, Math.max(minY, targetY));
    // Aplicar shake también en centrado inmediato
    let shakeX = 0, shakeY = 0;
    const nowSec = Date.now() / 1000;
    if (nowSec < shakeEndTime) {
        const remaining = Math.max(0, shakeEndTime - nowSec);
        const intensity = remaining / SHAKE_DURATION;
        shakeX = (Math.random() * 2 - 1) * SHAKE_MAGNITUDE * intensity;
        shakeY = (Math.random() * 2 - 1) * SHAKE_MAGNITUDE * intensity;
    }
    gameElement.style.transform = `translate(${cameraX + shakeX}px, ${cameraY + shakeY}px)`;
}

// Actualizar el movimiento normal del jugador (solo si no está en dash)
function updatePlayerMovement() {
    if (player.isDashing) return;
    
    const currentSpeed = (player.isSprinting ? 
        PLAYER_SPEED * PLAYER_SPRINT_MULTIPLIER : 
        PLAYER_SPEED) * (typeof playerSpeedMult === 'number' ? playerSpeedMult : 1);
    
    // Mover al jugador con límites en el área de juego
    if (keys.w) player.y = Math.max(0, player.y - currentSpeed);
    if (keys.s) player.y = Math.min(GAME_HEIGHT - player.height, player.y + currentSpeed);
    if (keys.a) player.x = Math.max(0, player.x - currentSpeed);
    if (keys.d) player.x = Math.min(GAME_WIDTH - player.width, player.x + currentSpeed);
    
    // Actualizar la cámara para seguir al jugador
    updateCamera();
    
    // Actualizar posición visual del jugador
    const playerElement = document.getElementById('player');
    if (playerElement) {
        playerElement.style.left = player.x + 'px';
        playerElement.style.top = player.y + 'px';
    }
}

// Configurar el botón de conexión
document.getElementById('connect').addEventListener('click', () => {
    const peerId = document.getElementById('peerId').value.trim();
    if (peerId) {
        connectToPeer(peerId);
    } else {
        alert('Por favor ingresa un ID de amigo');
    }
});

// Inicializar el juego
function init() {
    // Configurar manejadores de eventos del menú
    singleplayerBtn.addEventListener('click', () => startGame('singleplayer'));
    multiplayerBtn.addEventListener('click', () => startGame('multiplayer'));
    backToMenuBtn.addEventListener('click', returnToMenu);
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', () => {
            enterFullscreen();
        });
    }
    // Recentrar cámara si cambian tamaño de ventana o estado de fullscreen
    ['resize', 'orientationchange'].forEach(evt => {
        window.addEventListener(evt, () => {
            centerCameraImmediately();
        });
    });
    ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(evt => {
        document.addEventListener(evt, () => {
            // pequeño timeout para permitir que el layout se estabilice
            setTimeout(() => centerCameraImmediately(), 0);
        });
    });
    
    // Configurar el botón de conexión
    document.getElementById('connect').addEventListener('click', () => {
        const peerId = document.getElementById('peerId').value.trim();
        if (peerId) {
            connectToPeer(peerId);
        } else {
            alert('Por favor ingresa un ID de amigo');
        }
    });
    
    // Inicializar PeerJS (solo se usará en modo multijugador)
    initPeer();
}

// Crear sprite de arma dentro del jugador si no existe
function ensureWeaponSprite() {
    const playerEl = document.getElementById('player');
    if (!playerEl) return;
    let gun = document.getElementById('weapon');
    if (!gun) {
        gun = document.createElement('div');
        gun.id = 'weapon';
        gun.style.position = 'absolute';
        gun.style.width = '14px';
        gun.style.height = '6px';
        gun.style.background = '#95a5a6';
        gun.style.border = '1px solid #7f8c8d';
        gun.style.borderRadius = '3px';
        gun.style.boxShadow = '0 0 4px rgba(0,0,0,0.3)';
        // Posicionar hacia el lado derecho del jugador base (se rota junto al jugador)
        gun.style.left = '22px';
        gun.style.top = '12px';
        gun.style.pointerEvents = 'none';
        playerEl.appendChild(gun);
    }
}

// Iniciar el juego en el modo seleccionado
function startGame(mode) {
    gameMode = mode;
    
    // Mostrar el contenedor del juego y ocultar el menú
    mainMenu.classList.add('hidden');
    gameContainer.classList.remove('hidden');
    hideMenuHUD();
    
    // Ajustar el tamaño del mundo (#game) a pixeles exactos
    const gameEl = document.getElementById('game');
    if (gameEl) {
        gameEl.style.width = GAME_WIDTH + 'px';
        gameEl.style.height = GAME_HEIGHT + 'px';
        gameEl.style.border = '8px solid #000';
        gameEl.style.boxSizing = 'border-box';
        // Resetear cualquier transform previo
        gameEl.style.transform = 'translate(0px, 0px)';
    }

    // Asegurarse de que la barra de estamina exista y esté visible
    updateStaminaBar(); // Esto creará la barra si no existe
    const staminaBar = document.getElementById('stamina-bar');
    if (staminaBar) {
        staminaBar.style.display = 'block';
    }
    
    // Configurar controles según el modo
    if (mode === 'singleplayer') {
        multiplayerControls.style.display = 'none';
    } else {
        multiplayerControls.style.display = 'block';
    }
    
    // Re-centrar jugador en el medio del mundo y posicionar visualmente
    player.x = Math.floor(GAME_WIDTH / 2 - player.width / 2);
    player.y = Math.floor(GAME_HEIGHT / 2 - player.height / 2);
    player.health = playerMaxHealth;
    const playerElement = document.getElementById('player');
    playerElement.style.left = player.x + 'px';
    playerElement.style.top = player.y + 'px';

    // Asegurar sprite de arma visible
    ensureWeaponSprite();

    // Reiniciar munición
    ammoInMag = MAG_SIZE;
    ammoReserve = AMMO_RESERVE_START;

    // Asegurar HUD de munición (solo texto)
    ensureAmmoTextHUD();
    // Asegurar Wave HUD
    ensureWaveHUD();
    // Asegurar minimapa y mostrar HUD
    setupMinimap();
    showHUD();

    // Reiniciar oleadas y spawnear enemigos iniciales (exactamente los necesarios)
    resetWaves();
    spawnEnemies(killsNeeded);

    // Limpiar y crear pickups iniciales
    const pickupsCont = document.getElementById('pickups');
    if (pickupsCont) pickupsCont.innerHTML = '';
    pickups = [];
    lastPickupSpawnTime = 0;
    // Spawns iniciales: uno de vida y uno de munición
    spawnPickup('health');
    spawnPickup('ammo');
    if (DEBUG_PICKUPS) console.log('[DEBUG_PICKUPS] startGame: spawned initial pickups =', pickups.length);

    // Asegurar que el teclado reciba eventos (evita foco en inputs)
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
    }

    // Centrar cámara inmediatamente
    centerCameraImmediately();

    // Hacer un render inicial para asegurar que el jugador sea visible
    render();

    // Crear/mostrar minimapa
    setupMinimap();
    
    // Intentar entrar en pantalla completa al comenzar la partida (puede fallar si no es gesto de usuario)
    enterFullscreen().catch(() => {});

    // Iniciar el bucle del juego
    gameRunning = true;
    gameLoop();
}

// Volver al menú principal
function returnToMenu() {
    // Detener el juego
    gameRunning = false;
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    
    // Cerrar conexión si está en modo multijugador
    if (gameMode === 'multiplayer') {
        // Cerrar todas las conexiones
        if (peer) {
            peer.destroy();
        }
        
        // Limpiar todos los jugadores
        for (const id in otherPlayers) {
            removeOtherPlayer(id);
        }
        
        // Limpiar la conexión actual
        if (conn) {
            conn.close();
            conn = null;
        }
    }
    
    // Restablecer posición del jugador
    player.x = GAME_WIDTH / 2 - 15;
    player.y = GAME_HEIGHT / 2 - 15;
    
    // Ocultar HUD del juego al volver al menú
    hideHUD();
    // Mostrar menú y ocultar juego
    gameContainer.classList.add('hidden');
    mainMenu.classList.remove('hidden');
    showMenuHUD();
    
    // Ocultar la barra de estamina
    const staminaBar = document.getElementById('stamina-bar');
    if (staminaBar) staminaBar.style.display = 'none';
}

// Bucle principal del juego
function gameLoop() {
    if (!gameRunning) return;
    
    update();
    render();
    // Seguridad: procesar pickups también aquí, por si update() retorna temprano
    const nowSec = Date.now() / 1000;
    trySpawnPickups(nowSec);
    updatePickups();
    animationId = requestAnimationFrame(gameLoop);
}

// Manejar el dash del jugador
function handleDash() {
    const now = Date.now() / 1000; // Convertir a segundos
    const timeSinceLastDash = now - player.lastDashTime;
    
    // Verificar si el dash está en cooldown (incluyendo el delay inicial)
    if (timeSinceLastDash < DASH_COOLDOWN) {
        return; // No hacer nada si aún está en cooldown
    }
    
    // Calcular dirección del dash basada en las teclas WASD
    let dx = 0, dy = 0;
    if (keys.w) dy -= 1;
    if (keys.s) dy += 1;
    if (keys.a) dx -= 1;
    if (keys.d) dx += 1;
    // Si no hay input, usar la última dirección conocida
    if (dx === 0 && dy === 0) {
        dx = lastMoveDir.x;
        dy = lastMoveDir.y;
    }
    // Si todavía es cero (p.ej. al inicio absoluto), no hacer dash
    if (dx === 0 && dy === 0) return;
    
    // Normalizar la dirección
    const length = Math.sqrt(dx * dx + dy * dy);
    dx /= length;
    dy /= length;
    
    // Iniciar dash
    player.isDashing = true;
    player.dashDirection = { x: dx, y: dy };
    player.dashStartTime = now;
    player.lastDashTime = now;
}

// Actualizar el estado del juego
function update() {
    const now = Date.now();
    const currentTime = now / 1000; // Tiempo actual en segundos
    const deltaTime = (now - player.lastUpdate) / 1000; // Tiempo en segundos desde la última actualización
    player.lastUpdate = now;

    // Si hay QTE o LevelUp activo, actualizar overlays y pausar el resto del juego
    if (qteActive || levelUpActive) {
        const overlay = qteOverlay || document.getElementById('qte-overlay');
        if (overlay) {
            const fill = overlay.querySelector('#qte-timer-fill');
            if (fill) {
                const nowSec = currentTime;
                const total = QTE_WINDOW;
                const remaining = Math.max(0, qteEndTime - nowSec);
                const pct = Math.max(0, Math.min(1, remaining / total));
                fill.style.width = `${pct * 100}%`;
                // Cambiar color cuando queda poco tiempo
                fill.style.background = pct < 0.33 ? '#e74c3c' : pct < 0.66 ? '#f1c40f' : '#2ecc71';
            }
        }
        if (qteActive && currentTime >= qteEndTime) {
            endQTE(false);
        }
        // Pausar lógica de juego mientras QTE está activo
        return;
    }
    
    // Manejar el dash
    if (player.isDashing) {
        const dashElapsed = currentTime - player.dashStartTime;
        
        if (dashElapsed < DASH_DURATION) {
            // Aplicar movimiento de dash con velocidad constante basada en distancia/tiempo
            const dashVelocity = DASH_DISTANCE / DASH_DURATION; // px/seg
            player.x = Math.max(0, Math.min(GAME_WIDTH - player.width, 
                player.x + player.dashDirection.x * dashVelocity * deltaTime));
            player.y = Math.max(0, Math.min(GAME_HEIGHT - player.height, 
                player.y + player.dashDirection.y * dashVelocity * deltaTime));

            // Centrar cámara inmediatamente durante el dash para evitar efecto de retroceso visual
            centerCameraImmediately();
            
            // Aún así, procesar pickups/spawn durante el dash para que se puedan recoger
            trySpawnPickups(currentTime);
            updatePickups();
            // No permitir otras acciones durante el dash
            return;
        } else {
            // Terminar el dash
            player.isDashing = false;
        }
    }
    
    // Calcular velocidad actual (sprint o normal)
    const isMoving = keys.w || keys.s || keys.a || keys.d;
    const currentStamina = getCurrentStamina();
    const wantsToSprint = keys.shift && isMoving && currentStamina > STAMINA_MIN_TO_SPRINT;
    
    // Actualizar estado de sprint y estamina
    if (wantsToSprint) {
        player.isSprinting = true;
        const newStamina = getCurrentStamina() - (STAMINA_DECREASE_RATE * deltaTime);
        setCurrentStamina(newStamina);
        if (getCurrentStamina() <= 0) {
            player.isSprinting = false;
        }
    } else {
        player.isSprinting = false;
        const newStamina = getCurrentStamina() + (STAMINA_INCREASE_RATE * deltaTime);
        setCurrentStamina(newStamina);
    }
    
    // Calcular velocidad actual (sprint o normal)
    const currentSpeed = (player.isSprinting ? PLAYER_SPEED * PLAYER_SPRINT_MULTIPLIER : PLAYER_SPEED) * (typeof playerSpeedMult === 'number' ? playerSpeedMult : 1);
    
    // Mover al jugador según las teclas presionadas (con límites del mundo)
    if (keys.w) player.y = Math.max(0, player.y - currentSpeed);
    if (keys.s) player.y = Math.min(GAME_HEIGHT - player.height, player.y + currentSpeed);
    if (keys.a) player.x = Math.max(0, player.x - currentSpeed);
    if (keys.d) player.x = Math.min(GAME_WIDTH - player.width, player.x + currentSpeed);

    // Actualizar última dirección de movimiento si hay entrada
    if (isMoving) {
        let mdx = 0, mdy = 0;
        if (keys.w) mdy -= 1;
        if (keys.s) mdy += 1;
        if (keys.a) mdx -= 1;
        if (keys.d) mdx += 1;
        const len = Math.hypot(mdx, mdy);
        if (len > 0) {
            lastMoveDir.x = mdx / len;
            lastMoveDir.y = mdy / len;
        }
    }

    // Disparo continuo si se mantiene el mouse
    if (isFiring) {
        shoot();
    }

    // Actualizar cámara SIEMPRE para mantener centrado y aplicar shake
    updateCamera();

    // Actualizar enemigos y aplicar daño
    updateEnemies(deltaTime);

    // Actualizar balas
    updateBullets(deltaTime);

    // Completar recarga si terminó el cooldown
    if (isReloading && currentTime >= reloadEndTime) {
        const need = MAG_SIZE - ammoInMag;
        const take = Math.min(need, ammoReserve);
        ammoInMag += take;
        ammoReserve -= take;
        isReloading = false;
    }
    
    // En modo multijugador, enviar posición a los demás jugadores
    if (gameMode === 'multiplayer' && conn && conn.open) {
        // Solo enviar actualización si no estamos en medio de un dash
        // o si es una actualización importante (como el final de un dash)
        if (!player.isDashing || (player.isDashing && !keys.space)) {
            sendPlayerPosition(conn);
        }
    }
}
function updateStaminaBar() {
    // Barra de salud
    let healthBar = document.getElementById('health-bar');
    if (!healthBar) {
        const container = document.createElement('div');
        container.id = 'health-container';
        container.style.position = 'fixed';
        container.style.top = '20px';
        container.style.left = '20px';
        container.style.width = '200px';
        container.style.zIndex = '1000';

        const label = document.createElement('div');
        label.textContent = 'HEALTH';
        label.style.color = '#ecf0f1';
        label.style.fontSize = '12px';
        label.style.fontWeight = 'bold';
        label.style.marginBottom = '2px';

        healthBar = document.createElement('div');
        healthBar.id = 'health-bar';
        healthBar.style.width = '100%';
        healthBar.style.height = '15px';
        healthBar.style.backgroundColor = 'rgba(0,0,0,0.5)';
        healthBar.style.borderRadius = '10px';
        healthBar.style.overflow = 'hidden';

        const healthFill = document.createElement('div');
        healthFill.id = 'health-fill';
        healthFill.style.height = '100%';
        healthFill.style.width = '100%';
        healthFill.style.backgroundColor = '#e74c3c';
        healthFill.style.transition = 'width 0.2s ease';

        healthBar.appendChild(healthFill);
        container.appendChild(label);
        container.appendChild(healthBar);
        ensureGameHUDRoot().appendChild(container);
    }
    // Reparent si está fuera del root
    const healthContainer = document.getElementById('health-container');
    if (healthContainer && healthContainer.parentElement && healthContainer.parentElement.id !== 'game-hud-root') {
        ensureGameHUDRoot().appendChild(healthContainer);
    }

    const healthFill = document.getElementById('health-fill');
    if (healthFill) {
        const hpPct = Math.max(0, Math.min(1, player.health / playerMaxHealth));
        healthFill.style.width = `${hpPct * 100}%`;
        // color dinámico según vida
        if (hpPct < 0.2) healthFill.style.backgroundColor = '#c0392b';
        else if (hpPct < 0.5) healthFill.style.backgroundColor = '#e67e22';
        else healthFill.style.backgroundColor = '#e74c3c';
    }

    // Barra de estamina
    let staminaBar = document.getElementById('stamina-bar');
    
    // Barra de cooldown de dash
    let dashCooldownBar = document.getElementById('dash-cooldown-bar');
    const currentTime = Date.now() / 1000; // Tiempo actual en segundos
    const timeSinceLastDash = currentTime - player.lastDashTime;
    const dashCooldownProgress = Math.min(1, timeSinceLastDash / DASH_COOLDOWN);
    
    // Crear barra de cooldown de dash si no existe
    if (!dashCooldownBar) {
        const container = document.createElement('div');
        container.id = 'dash-cooldown-container';
        container.style.position = 'fixed';
        container.style.top = '80px'; // Debajo de salud y estamina
        container.style.left = '20px';
        container.style.width = '200px';
        container.style.zIndex = '1000';
        
        const label = document.createElement('div');
        label.textContent = 'DASH';
        label.style.color = '#ecf0f1';
        label.style.fontSize = '12px';
        label.style.fontWeight = 'bold';
        label.style.marginBottom = '2px';
        
        dashCooldownBar = document.createElement('div');
        dashCooldownBar.id = 'dash-cooldown-bar';
        dashCooldownBar.style.width = '100%';
        dashCooldownBar.style.height = '15px';
        dashCooldownBar.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        dashCooldownBar.style.borderRadius = '10px';
        dashCooldownBar.style.overflow = 'hidden';
        
        const cooldownFill = document.createElement('div');
        cooldownFill.id = 'dash-cooldown-fill';
        cooldownFill.style.height = '100%';
        cooldownFill.style.width = '0%';
        cooldownFill.style.backgroundColor = '#9b59b6';
        cooldownFill.style.transition = 'width 0.1s linear';
        
        dashCooldownBar.appendChild(cooldownFill);
        container.appendChild(label);
        container.appendChild(dashCooldownBar);
        ensureGameHUDRoot().appendChild(container);
    }
    // Reparent si está fuera del root
    const dashContainer = document.getElementById('dash-cooldown-container');
    if (dashContainer && dashContainer.parentElement && dashContainer.parentElement.id !== 'game-hud-root') {
        ensureGameHUDRoot().appendChild(dashContainer);
    }
    
    // Actualizar barra de cooldown
    const cooldownFill = document.getElementById('dash-cooldown-fill');
    if (cooldownFill) {
        const timeSinceLastDash = currentTime - player.lastDashTime;
        const inCooldownDelay = timeSinceLastDash < DASH_COOLDOWN_DELAY;
        const cooldownProgress = inCooldownDelay ? 
            0 : 
            (timeSinceLastDash - DASH_COOLDOWN_DELAY) / (DASH_COOLDOWN - DASH_COOLDOWN_DELAY);
            
        cooldownFill.style.width = `${Math.min(100, cooldownProgress * 100)}%`;
        cooldownFill.style.backgroundColor = cooldownProgress >= 1 ? '#2ecc71' : '#9b59b6';
    }
    if (!staminaBar) {
        const container = document.createElement('div');
        container.id = 'stamina-container';
        container.style.position = 'fixed';
        container.style.top = '50px'; // debajo de la salud
        container.style.left = '20px';
        container.style.width = '200px';
        container.style.zIndex = '1000';
        
        // Añadir etiqueta SPRINT
        const label = document.createElement('div');
        label.textContent = 'SPRINT';
        label.style.color = '#ecf0f1';
        label.style.fontSize = '12px';
        label.style.fontWeight = 'bold';
        label.style.marginBottom = '2px';
        
        // Crear la barra de estamina
        staminaBar = document.createElement('div');
        staminaBar.id = 'stamina-bar';
        staminaBar.style.width = '100%';
        staminaBar.style.height = '15px';
        staminaBar.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        staminaBar.style.borderRadius = '10px';
        staminaBar.style.overflow = 'hidden';
        staminaBar.style.zIndex = '1000';
        staminaBar.style.display = gameRunning ? 'block' : 'none'; // Mostrar solo si el juego está activo
        
        
        const staminaFill = document.createElement('div');
        staminaFill.id = 'stamina-fill';
        staminaFill.style.height = '100%';
        staminaFill.style.width = '100%';
        staminaFill.style.backgroundColor = '#2ecc71';
        staminaFill.style.transition = 'width 0.2s ease';
        
        staminaBar.appendChild(staminaFill);
        container.appendChild(label);
        container.appendChild(staminaBar);
        ensureGameHUDRoot().appendChild(container);
    }
    // Reparent si está fuera del root
    const staminaContainer = document.getElementById('stamina-container');
    if (staminaContainer && staminaContainer.parentElement && staminaContainer.parentElement.id !== 'game-hud-root') {
        ensureGameHUDRoot().appendChild(staminaContainer);
    }
    
    const staminaFill = document.getElementById('stamina-fill');
    if (staminaFill) {
        // Actualizar el ancho de la barra de estamina
        const currentStamina = getCurrentStamina();
        const percentage = (currentStamina / STAMINA_MAX) * 100;
        staminaFill.style.width = `${percentage}%`;
            
        // Cambiar color según la estamina
        if (currentStamina < 20) {
            staminaFill.style.backgroundColor = '#e74c3c';
        } else if (currentStamina < 50) {
            staminaFill.style.backgroundColor = '#f39c12';
        } else {
            staminaFill.style.backgroundColor = '#2ecc71';
        }
    }
}

// Renderizar el juego
function render() {
    // Actualizar posición visual del jugador
    const playerElement = document.getElementById('player');
    playerElement.style.left = player.x + 'px';
    playerElement.style.top = player.y + 'px';
    
    // Rotación (si deseamos mantenerla hacia el cursor)
    const mw = getMouseWorld();
    const centerX = player.x + player.width / 2;
    const centerY = player.y + player.height / 2;
    const vdx = mw.x - centerX;
    const vdy = mw.y - centerY;
    const angleRad = Math.atan2(vdy, vdx);
    const rawAngleDeg = angleRad * 180 / Math.PI;
    // Mantener un ángulo continuo para evitar "vueltas" al cruzar -180/180
    if (player.facingAngleDeg === undefined) player.facingAngleDeg = rawAngleDeg;
    let delta = rawAngleDeg - player.facingAngleDeg;
    // Ajustar delta al rango [-180, 180] para usar el camino más corto
    while (delta > 180) delta -= 360;
    while (delta < -180) delta += 360;
    // Aplicar delta (instantáneo); si se desea suavizar, multiplicar por un factor < 1
    player.facingAngleDeg += delta;
    const angleDeg = player.facingAngleDeg;

    // Salto: calcular escala visual durante JUMP_DURATION (estilo top-down)
    let jumpScale = 1;
    if (player.isJumping) {
        const t = Math.min(1, Math.max(0, (Date.now() / 1000 - player.jumpStartTime) / JUMP_DURATION));
        // seno produce subida y bajada suave; escala máxima en la mitad del salto
        jumpScale = 1 + Math.sin(Math.PI * t) * JUMP_SCALE;
    }

    // Combinar escala (salto) con rotación
    playerElement.style.transform = `scale(${jumpScale}) rotate(${angleDeg + PLAYER_ROTATION_OFFSET}deg)`;
    
    // Blink durante invulnerabilidad (usar opacidad para que nunca desaparezca del todo)
    const nowSec = Date.now() / 1000;
    let baseOpacity = 1;
    if (player.isDashing) {
        baseOpacity = 0.8;
        playerElement.style.boxShadow = '0 0 15px rgba(155, 89, 182, 0.8)';
    } else if (player.isSprinting) {
        playerElement.style.boxShadow = '0 0 15px rgba(241, 196, 15, 0.7)';
    } else {
        playerElement.style.boxShadow = 'none';
    }

    if (nowSec < invulnerableUntil) {
        const blinkOn = Math.floor(nowSec * 10) % 2 === 0;
        const blinkOpacity = blinkOn ? 0.5 : 1; // nunca bajar demasiado la opacidad
        playerElement.style.opacity = String(baseOpacity * blinkOpacity);
    } else {
        playerElement.style.opacity = String(baseOpacity);
    }
    
    // Actualizar la barra de estamina
    updateStaminaBar();

    // Actualizar HUD de munición (solo texto)
    updateAmmoTextHUD();
    // Actualizar Wave HUD
    updateWaveHUD();
    // Actualizar barra de XP
    try { updateXPBarHUD(); } catch (_) {}

    // Actualizar minimapa
    updateMinimap();
    
    // Actualizar el borde del jugador según el estado
    if (player.isDashing) {
        playerElement.style.border = '2px solid #9b59b6';
    } else if (player.isSprinting) {
        playerElement.style.border = '2px solid #f1c40f';
        playerElement.style.boxShadow = '0 0 15px rgba(241, 196, 15, 0.7)';
    } else {
        playerElement.style.border = '2px solid #27ae60';
        playerElement.style.boxShadow = 'none';
    }
}

// Iniciar el juego cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
