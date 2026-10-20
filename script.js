// TOWER DEFENSE GAME (script.js)
// Enemies walk along a path; the player builds towers to stop them, earns gold,
// picks an upgrade every 4 waves, and wins by beating the Grand Boss on wave 25.
// play.html loads Phaser first, then this file.

// ======================= SETTINGS (change these to rebalance) =======================
const TILE = 48, COLS = 20, ROWS = 12;                 // map: 20 x 12 tiles, each 48 pixels
const MAP_H = ROWS * TILE, SHOP_H = 84;                // map height and shop bar height (pixels)
const WIDTH = COLS * TILE, HEIGHT = MAP_H + SHOP_H;    // size of the whole game screen
const WAYPOINTS = [[0,2],[6,2],[6,8],[12,8],[12,3],[17,3],[17,10],[19,10]]; // path corners as [column, row]
const START_GOLD = 100, START_LIVES = 15, WAVE_CLEAR_BONUS = 20;
const UPGRADE_EVERY = 4; // you pick an upgrade after every 4th wave
const MAX_WAVES = 25;    // survive this many waves; the last one ends with the GRAND BOSS
const SELL_REFUND = 0.7; // selling a tower gives back 70% of its cost

// Barracks troops march: -1 = towards where enemies enter, 1 = towards the exit.
const TROOP_DIRECTION = -1;

// ---------- Tower pictures (SVG drawings, stored right here so no extra files are needed) ----------
// Barrels point UP: the game rotates the picture towards the enemy.
const TOWER_SVG = {
  gun: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96">
  <defs>
    <radialGradient id="base" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#b9c7dd"/><stop offset="1" stop-color="#46546e"/></radialGradient>
    <radialGradient id="dome" cx="38%" cy="30%" r="80%"><stop offset="0" stop-color="#9cc3ff"/><stop offset="1" stop-color="#2a56b8"/></radialGradient>
    <linearGradient id="barrel" x1="0" x2="1"><stop offset="0" stop-color="#2b3445"/><stop offset="0.45" stop-color="#6c7a93"/><stop offset="1" stop-color="#2b3445"/></linearGradient>
  </defs>
  <circle cx="48" cy="52" r="40" fill="#000" opacity="0.25"/>
  <circle cx="48" cy="48" r="40" fill="url(#base)" stroke="#232c3d" stroke-width="4"/>
  <g fill="#232c3d"><circle cx="20" cy="48" r="3"/><circle cx="76" cy="48" r="3"/><circle cx="48" cy="80" r="3"/></g>
  <rect x="41" y="2" width="14" height="48" rx="3" fill="url(#barrel)" stroke="#1b2230" stroke-width="3"/>
  <rect x="38" y="1" width="20" height="10" rx="3" fill="#1b2230"/>
  <circle cx="48" cy="48" r="22" fill="url(#dome)" stroke="#183a86" stroke-width="3"/>
  <ellipse cx="41" cy="40" rx="9" ry="6" fill="#fff" opacity="0.35"/>
  <circle cx="48" cy="52" r="6" fill="#16367a" opacity="0.7"/>
</svg>`,
  cannon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96">
  <defs>
    <radialGradient id="base" cx="38%" cy="32%" r="80%"><stop offset="0" stop-color="#6b5a4a"/><stop offset="1" stop-color="#2f261f"/></radialGradient>
    <radialGradient id="dome" cx="36%" cy="30%" r="80%"><stop offset="0" stop-color="#ffc47a"/><stop offset="1" stop-color="#d4660e"/></radialGradient>
    <linearGradient id="barrel" x1="0" x2="1"><stop offset="0" stop-color="#2a2420"/><stop offset="0.45" stop-color="#8a7766"/><stop offset="1" stop-color="#2a2420"/></linearGradient>
  </defs>
  <circle cx="48" cy="52" r="41" fill="#000" opacity="0.25"/>
  <rect x="8" y="8" width="80" height="80" rx="16" fill="url(#base)" stroke="#1c1612" stroke-width="4"/>
  <g fill="#1c1612"><circle cx="19" cy="19" r="3.5"/><circle cx="77" cy="19" r="3.5"/><circle cx="19" cy="77" r="3.5"/><circle cx="77" cy="77" r="3.5"/></g>
  <rect x="35" y="3" width="26" height="50" rx="5" fill="url(#barrel)" stroke="#161210" stroke-width="3"/>
  <rect x="32" y="3" width="32" height="10" rx="4" fill="#161210"/>
  <rect x="32" y="26" width="32" height="6" rx="2" fill="#161210" opacity="0.7"/>
  <circle cx="48" cy="52" r="24" fill="url(#dome)" stroke="#8a3d05" stroke-width="3"/>
  <ellipse cx="40" cy="43" rx="10" ry="6" fill="#fff" opacity="0.35"/>
  <circle cx="48" cy="54" r="7" fill="#8a3d05" opacity="0.7"/>
</svg>`,
  frost: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96">
  <defs>
    <radialGradient id="base" cx="40%" cy="32%" r="80%"><stop offset="0" stop-color="#eaffff"/><stop offset="1" stop-color="#6fc2d4"/></radialGradient>
    <linearGradient id="crystal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="0.5" stop-color="#8fe6f2"/><stop offset="1" stop-color="#1fa3bd"/></linearGradient>
  </defs>
  <polygon points="48,6 86,27 86,69 48,90 10,69 10,27" fill="#000" opacity="0.2" transform="translate(0 4)"/>
  <polygon points="48,6 86,27 86,69 48,90 10,69 10,27" fill="url(#base)" stroke="#2b7f93" stroke-width="4" stroke-linejoin="round"/>
  <g stroke="#2b7f93" stroke-width="2.5" stroke-linecap="round" opacity="0.55">
    <line x1="48" y1="20" x2="48" y2="76"/><line x1="24" y1="34" x2="72" y2="62"/><line x1="72" y1="34" x2="24" y2="62"/>
  </g>
  <polygon points="48,0 60,30 48,54 36,30" fill="url(#crystal)" stroke="#1b7f95" stroke-width="3" stroke-linejoin="round"/>
  <polygon points="48,0 54,30 48,54" fill="#fff" opacity="0.35"/>
  <circle cx="48" cy="48" r="13" fill="url(#crystal)" stroke="#1b7f95" stroke-width="3"/>
  <circle cx="44" cy="44" r="4" fill="#fff" opacity="0.8"/>
  <g fill="#fff" opacity="0.9"><circle cx="22" cy="30" r="2.5"/><circle cx="74" cy="66" r="2.5"/><circle cx="76" cy="32" r="2"/><circle cx="20" cy="64" r="2"/></g>
</svg>`,
  sniper: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96">
  <defs>
    <radialGradient id="base" cx="38%" cy="32%" r="80%"><stop offset="0" stop-color="#6d6290"/><stop offset="1" stop-color="#2b2542"/></radialGradient>
    <radialGradient id="dome" cx="36%" cy="30%" r="80%"><stop offset="0" stop-color="#d7c2ff"/><stop offset="1" stop-color="#6a3fd0"/></radialGradient>
    <linearGradient id="barrel" x1="0" x2="1"><stop offset="0" stop-color="#1f1b30"/><stop offset="0.45" stop-color="#7a7396"/><stop offset="1" stop-color="#1f1b30"/></linearGradient>
  </defs>
  <polygon points="30,6 66,6 90,30 90,66 66,90 30,90 6,66 6,30" fill="#000" opacity="0.25" transform="translate(0 4)"/>
  <polygon points="30,6 66,6 90,30 90,66 66,90 30,90 6,66 6,30" fill="url(#base)" stroke="#18142a" stroke-width="4" stroke-linejoin="round"/>
  <rect x="43.5" y="0" width="9" height="54" rx="2.5" fill="url(#barrel)" stroke="#120f20" stroke-width="2.5"/>
  <rect x="41" y="0" width="14" height="8" rx="2" fill="#120f20"/>
  <rect x="55" y="26" width="10" height="22" rx="3" fill="#2b2542" stroke="#120f20" stroke-width="2.5"/>
  <circle cx="60" cy="26" r="4" fill="#9ff" stroke="#120f20" stroke-width="2"/>
  <circle cx="48" cy="52" r="20" fill="url(#dome)" stroke="#3d1f8c" stroke-width="3"/>
  <ellipse cx="41" cy="45" rx="8" ry="5" fill="#fff" opacity="0.4"/>
  <circle cx="48" cy="54" r="5" fill="#3d1f8c" opacity="0.7"/>
</svg>`,
  barracks: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96">
  <defs>
    <linearGradient id="wall" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b7a98d"/><stop offset="1" stop-color="#6e6350"/></linearGradient>
    <linearGradient id="roofL" x1="0" x2="1"><stop offset="0" stop-color="#8bd18e"/><stop offset="1" stop-color="#3f8f46"/></linearGradient>
    <linearGradient id="roofR" x1="0" x2="1"><stop offset="0" stop-color="#3f8f46"/><stop offset="1" stop-color="#2a6b31"/></linearGradient>
  </defs>
  <rect x="10" y="14" width="76" height="76" rx="4" fill="#000" opacity="0.25" transform="translate(0 4)"/>
  <rect x="10" y="12" width="76" height="76" rx="4" fill="url(#wall)" stroke="#3b3426" stroke-width="4"/>
  <g fill="url(#wall)" stroke="#3b3426" stroke-width="3">
    <rect x="6" y="8" width="20" height="20" rx="2"/><rect x="70" y="8" width="20" height="20" rx="2"/>
    <rect x="6" y="72" width="20" height="20" rx="2"/><rect x="70" y="72" width="20" height="20" rx="2"/>
  </g>
  <polygon points="22,30 48,22 48,66 22,66" fill="url(#roofL)" stroke="#215226" stroke-width="3" stroke-linejoin="round"/>
  <polygon points="48,22 74,30 74,66 48,66" fill="url(#roofR)" stroke="#215226" stroke-width="3" stroke-linejoin="round"/>
  <line x1="48" y1="22" x2="48" y2="66" stroke="#215226" stroke-width="3"/>
  <path d="M38 90 v-14 a10 10 0 0 1 20 0 v14 z" fill="#4a3320" stroke="#241a10" stroke-width="3"/>
  <line x1="48" y1="22" x2="48" y2="4" stroke="#3b3426" stroke-width="3"/>
  <polygon points="48,4 70,10 48,17" fill="#e5484d" stroke="#7a1f23" stroke-width="2" stroke-linejoin="round"/>
</svg>`,
};

// ---------- Enemy pictures (SVG drawings; they turn to face the direction they walk) ----------
const ENEMY_SVG = {
  grunt: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96">
  <defs>
    <radialGradient id="b" cx="40%" cy="35%" r="75%"><stop offset="0" stop-color="#ff8a8e"/><stop offset="1" stop-color="#b3202a"/></radialGradient>
  </defs>
  <g fill="#7d1119" stroke="#3a0709" stroke-width="3">
    <ellipse cx="12" cy="40" rx="9" ry="6" transform="rotate(-25 12 40)"/><ellipse cx="84" cy="40" rx="9" ry="6" transform="rotate(25 84 40)"/>
    <ellipse cx="16" cy="70" rx="9" ry="6" transform="rotate(25 16 70)"/><ellipse cx="80" cy="70" rx="9" ry="6" transform="rotate(-25 80 70)"/>
  </g>
  <ellipse cx="48" cy="56" rx="32" ry="34" fill="url(#b)" stroke="#3a0709" stroke-width="4"/>
  <ellipse cx="48" cy="64" rx="18" ry="16" fill="#ff9a9d" opacity="0.35"/>
  <polygon points="26,26 30,4 42,22" fill="#f2e6c9" stroke="#3a0709" stroke-width="3" stroke-linejoin="round"/>
  <polygon points="70,26 66,4 54,22" fill="#f2e6c9" stroke="#3a0709" stroke-width="3" stroke-linejoin="round"/>
  <circle cx="48" cy="34" r="22" fill="url(#b)" stroke="#3a0709" stroke-width="4"/>
  <ellipse cx="38" cy="33" rx="6.5" ry="7.5" fill="#fff6a8" stroke="#3a0709" stroke-width="2.5"/>
  <ellipse cx="58" cy="33" rx="6.5" ry="7.5" fill="#fff6a8" stroke="#3a0709" stroke-width="2.5"/>
  <circle cx="39" cy="35" r="3" fill="#220"/><circle cx="57" cy="35" r="3" fill="#220"/>
  <path d="M30 24 L44 29 M66 24 L52 29" stroke="#3a0709" stroke-width="4" stroke-linecap="round"/>
  <path d="M40 46 q8 5 16 0" stroke="#3a0709" stroke-width="3" fill="none" stroke-linecap="round"/>
</svg>`,
  runner: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96">
  <defs>
    <linearGradient id="b" x1="0" x2="1"><stop offset="0" stop-color="#ff7a1a"/><stop offset="0.5" stop-color="#ffc27a"/><stop offset="1" stop-color="#ff7a1a"/></linearGradient>
  </defs>
  <g stroke="#ffd9a8" stroke-width="3" stroke-linecap="round" opacity="0.6"><line x1="30" y1="76" x2="30" y2="94"/><line x1="48" y1="80" x2="48" y2="96"/><line x1="66" y1="76" x2="66" y2="94"/></g>
  <g fill="#b34a00" stroke="#4d2000" stroke-width="3" stroke-linejoin="round">
    <path d="M30 52 L6 66 L14 74 L32 66 Z"/><path d="M66 52 L90 66 L82 74 L64 66 Z"/>
  </g>
  <path d="M48 2 C66 20 72 48 66 74 C60 82 36 82 30 74 C24 48 30 20 48 2 Z" fill="url(#b)" stroke="#4d2000" stroke-width="4" stroke-linejoin="round"/>
  <path d="M48 12 L48 74" stroke="#b34a00" stroke-width="3" opacity="0.6"/>
  <path d="M36 52 L48 46 L60 52 M37 64 L48 58 L59 64" stroke="#b34a00" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <ellipse cx="41" cy="26" rx="4" ry="6" fill="#fff" stroke="#4d2000" stroke-width="2.5"/><ellipse cx="55" cy="26" rx="4" ry="6" fill="#fff" stroke="#4d2000" stroke-width="2.5"/>
  <circle cx="41" cy="24" r="2" fill="#220"/><circle cx="55" cy="24" r="2" fill="#220"/>
</svg>`,
  tank: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96">
  <defs>
    <radialGradient id="s" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#b79af0"/><stop offset="1" stop-color="#4a2a8c"/></radialGradient>
  </defs>
  <g fill="#2b1850" stroke="#150a2b" stroke-width="3">
    <rect x="4" y="18" width="14" height="62" rx="5"/><rect x="78" y="18" width="14" height="62" rx="5"/>
  </g>
  <g stroke="#6f55ad" stroke-width="2.5" opacity="0.9"><line x1="6" y1="28" x2="16" y2="28"/><line x1="6" y1="40" x2="16" y2="40"/><line x1="6" y1="52" x2="16" y2="52"/><line x1="6" y1="64" x2="16" y2="64"/><line x1="80" y1="28" x2="90" y2="28"/><line x1="80" y1="40" x2="90" y2="40"/><line x1="80" y1="52" x2="90" y2="52"/><line x1="80" y1="64" x2="90" y2="64"/></g>
  <rect x="14" y="12" width="68" height="76" rx="22" fill="url(#s)" stroke="#150a2b" stroke-width="4"/>
  <path d="M16 38 H80 M16 62 H80" stroke="#2b1850" stroke-width="3.5" opacity="0.8"/>
  <g fill="#d9c8ff" stroke="#150a2b" stroke-width="2"><circle cx="30" cy="26" r="3.5"/><circle cx="66" cy="26" r="3.5"/><circle cx="30" cy="50" r="3.5"/><circle cx="66" cy="50" r="3.5"/><circle cx="30" cy="76" r="3.5"/><circle cx="66" cy="76" r="3.5"/></g>
  <rect x="30" y="2" width="36" height="26" rx="10" fill="#7c5cc4" stroke="#150a2b" stroke-width="4"/>
  <rect x="35" y="10" width="26" height="8" rx="3" fill="#ffd54f" stroke="#150a2b" stroke-width="2.5"/>
  <circle cx="48" cy="52" r="9" fill="#2b1850" stroke="#d9c8ff" stroke-width="2.5"/>
</svg>`,
  brood: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96">
  <defs>
    <radialGradient id="a" cx="42%" cy="38%" r="75%"><stop offset="0" stop-color="#6ee7dc"/><stop offset="1" stop-color="#0e7a74"/></radialGradient>
  </defs>
  <g stroke="#06403c" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <path d="M36 34 L12 22 L4 38"/><path d="M34 44 L8 46 L4 62"/><path d="M36 54 L10 68 L8 86"/><path d="M38 62 L22 84 L24 94"/>
    <path d="M60 34 L84 22 L92 38"/><path d="M62 44 L88 46 L92 62"/><path d="M60 54 L86 68 L88 86"/><path d="M58 62 L74 84 L72 94"/>
  </g>
  <ellipse cx="48" cy="62" rx="26" ry="30" fill="url(#a)" stroke="#fff" stroke-width="3.5"/>
  <g fill="#c8fff9" stroke="#06403c" stroke-width="2.5"><circle cx="38" cy="58" r="6"/><circle cx="58" cy="62" r="7"/><circle cx="46" cy="78" r="5.5"/><circle cx="60" cy="80" r="3.5"/><circle cx="34" cy="74" r="3.5"/></g>
  <circle cx="48" cy="30" r="15" fill="url(#a)" stroke="#fff" stroke-width="3.5"/>
  <circle cx="42" cy="26" r="4" fill="#ffef7a" stroke="#06403c" stroke-width="2"/><circle cx="54" cy="26" r="4" fill="#ffef7a" stroke="#06403c" stroke-width="2"/>
  <circle cx="48" cy="34" r="2.5" fill="#ffef7a"/>
  <path d="M41 14 L38 6 M55 14 L58 6" stroke="#06403c" stroke-width="3.5" stroke-linecap="round"/>
</svg>`,
  minion: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96">
  <defs>
    <radialGradient id="b" cx="40%" cy="35%" r="75%"><stop offset="0" stop-color="#f5a3f5"/><stop offset="1" stop-color="#9c2f9c"/></radialGradient>
  </defs>
  <path d="M38 22 C34 10 24 6 18 8 M58 22 C62 10 72 6 78 8" stroke="#4d134d" stroke-width="4" fill="none" stroke-linecap="round"/>
  <circle cx="18" cy="8" r="4" fill="#4d134d"/><circle cx="78" cy="8" r="4" fill="#4d134d"/>
  <g stroke="#4d134d" stroke-width="4" stroke-linecap="round"><line x1="16" y1="44" x2="30" y2="48"/><line x1="80" y1="44" x2="66" y2="48"/><line x1="14" y1="64" x2="30" y2="62"/><line x1="82" y1="64" x2="66" y2="62"/></g>
  <ellipse cx="48" cy="56" rx="28" ry="34" fill="url(#b)" stroke="#4d134d" stroke-width="4"/>
  <circle cx="35" cy="36" r="13" fill="#fff" stroke="#4d134d" stroke-width="3"/><circle cx="61" cy="36" r="13" fill="#fff" stroke="#4d134d" stroke-width="3"/>
  <circle cx="37" cy="33" r="6" fill="#220"/><circle cx="59" cy="33" r="6" fill="#220"/>
  <circle cx="39" cy="31" r="2" fill="#fff"/><circle cx="61" cy="31" r="2" fill="#fff"/>
  <path d="M38 66 q10 8 20 0" stroke="#4d134d" stroke-width="3.5" fill="none" stroke-linecap="round"/>
</svg>`,
  boss: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96">
  <defs>
    <radialGradient id="b" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#5a5a66"/><stop offset="1" stop-color="#101016"/></radialGradient>
  </defs>
  <g fill="#1a1a22" stroke="#ff4444" stroke-width="2.5" stroke-linejoin="round">
    <polygon points="14,40 0,34 10,54"/><polygon points="82,40 96,34 86,54"/><polygon points="12,62 0,64 14,78"/><polygon points="84,62 96,64 82,78"/>
    <polygon points="30,86 24,96 40,90"/><polygon points="66,86 72,96 56,90"/>
  </g>
  <ellipse cx="48" cy="56" rx="36" ry="36" fill="url(#b)" stroke="#ff4444" stroke-width="4"/>
  <path d="M30 70 L40 60 L36 50 M66 72 L58 62 L64 52 M48 82 L48 70" stroke="#ff4444" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>
  <path d="M26 30 C16 20 20 8 30 2 C28 12 34 18 38 22 Z" fill="#e8e0d0" stroke="#ff4444" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M70 30 C80 20 76 8 66 2 C68 12 62 18 58 22 Z" fill="#e8e0d0" stroke="#ff4444" stroke-width="2.5" stroke-linejoin="round"/>
  <circle cx="48" cy="34" r="22" fill="url(#b)" stroke="#ff4444" stroke-width="4"/>
  <path d="M30 28 L44 36 L30 38 Z" fill="#ff2a2a" stroke="#600" stroke-width="2" stroke-linejoin="round"/>
  <path d="M66 28 L52 36 L66 38 Z" fill="#ff2a2a" stroke="#600" stroke-width="2" stroke-linejoin="round"/>
  <path d="M38 46 L58 46 M41 46 v5 M48 46 v6 M55 46 v5" stroke="#e8e0d0" stroke-width="3" stroke-linecap="round"/>
</svg>`,
  grandboss: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96">
  <defs>
    <radialGradient id="b" cx="42%" cy="32%" r="80%"><stop offset="0" stop-color="#d04040"/><stop offset="1" stop-color="#4d0508"/></radialGradient>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2a0"/><stop offset="1" stop-color="#d89a10"/></linearGradient>
  </defs>
  <g fill="url(#g)" stroke="#5a3a00" stroke-width="2.5" stroke-linejoin="round">
    <polygon points="48,78 40,94 56,94" transform="translate(0 0)"/>
    <polygon points="10,30 0,14 22,22"/><polygon points="86,30 96,14 74,22"/>
    <polygon points="4,52 -2,40 14,46" transform="translate(2 4)"/><polygon points="92,52 98,40 82,46" transform="translate(-2 4)"/>
    <polygon points="12,74 2,70 14,60" transform="translate(2 4)"/><polygon points="84,74 94,70 82,60" transform="translate(-2 4)"/>
    <polygon points="26,86 22,96 36,88"/><polygon points="70,86 74,96 60,88"/>
  </g>
  <circle cx="48" cy="54" r="40" fill="url(#b)" stroke="#ffd700" stroke-width="4.5"/>
  <circle cx="48" cy="54" r="30" fill="none" stroke="#ffd700" stroke-width="2" stroke-dasharray="3 5" opacity="0.8"/>
  <path d="M22 62 L34 54 M74 62 L62 54 M30 80 L40 70 M66 80 L56 70" stroke="#ff8a3d" stroke-width="3" stroke-linecap="round" opacity="0.8"/>
  <path d="M30 26 L24 6 L38 16 L48 0 L58 16 L72 6 L66 26 Z" fill="url(#g)" stroke="#5a3a00" stroke-width="3" stroke-linejoin="round"/>
  <circle cx="48" cy="14" r="3.5" fill="#e5484d" stroke="#5a3a00" stroke-width="1.5"/>
  <circle cx="48" cy="40" r="22" fill="url(#b)" stroke="#ffd700" stroke-width="4"/>
  <path d="M30 34 L45 41 L30 44 Z" fill="#ffee55" stroke="#5a3a00" stroke-width="2" stroke-linejoin="round"/>
  <path d="M66 34 L51 41 L66 44 Z" fill="#ffee55" stroke="#5a3a00" stroke-width="2" stroke-linejoin="round"/>
  <path d="M36 54 L60 54 M39 54 v6 M45 54 v7 M51 54 v7 M57 54 v6" stroke="#f5e9c8" stroke-width="3" stroke-linecap="round"/>
</svg>`,
};

// ---------- Icons (small SVG drawings for the top-left display and the upgrade cards) ----------
const ICON_SVG = {
  gold: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><defs><radialGradient id="c" cx="40%" cy="35%" r="75%"><stop offset="0" stop-color="#fff3a0"/><stop offset="1" stop-color="#e0a010"/></radialGradient></defs><circle cx="32" cy="35" r="26" fill="#000" opacity="0.25"/><circle cx="32" cy="32" r="26" fill="url(#c)" stroke="#8a5a00" stroke-width="4"/><circle cx="32" cy="32" r="17" fill="none" stroke="#b97a05" stroke-width="3"/><rect x="28" y="20" width="8" height="24" rx="2" fill="#b97a05"/><ellipse cx="22" cy="20" rx="6" ry="3" fill="#fff" opacity="0.5" transform="rotate(-35 22 20)"/></svg>`,
  lives: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><defs><radialGradient id="h" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#ff8a8e"/><stop offset="1" stop-color="#c4202c"/></radialGradient></defs><path d="M32 58 C6 40 4 22 17 13 C25 8 32 15 32 20 C32 15 39 8 47 13 C60 22 58 40 32 58 Z" fill="url(#h)" stroke="#6b0f17" stroke-width="4" stroke-linejoin="round"/><ellipse cx="20" cy="22" rx="6" ry="4" fill="#fff" opacity="0.55" transform="rotate(-35 20 22)"/></svg>`,
  wave: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><rect x="12" y="6" width="6" height="54" rx="2" fill="#8a6a45" stroke="#3d2c18" stroke-width="3"/><path d="M18 8 L56 8 L46 22 L56 36 L18 36 Z" fill="#e5484d" stroke="#7a1f23" stroke-width="3" stroke-linejoin="round"/><circle cx="15" cy="6" r="5" fill="#ffd54f" stroke="#8a5a00" stroke-width="2"/></svg>`,
  damage: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><polygon points="32,2 40,10 40,40 24,40 24,10" fill="#dfe6ee" stroke="#4b5563" stroke-width="3" stroke-linejoin="round"/><line x1="32" y1="8" x2="32" y2="38" stroke="#9aa5b4" stroke-width="3"/><rect x="14" y="40" width="36" height="8" rx="3" fill="#e0a010" stroke="#8a5a00" stroke-width="3"/><rect x="28" y="48" width="8" height="10" fill="#7a4a22" stroke="#3d2610" stroke-width="2"/><circle cx="32" cy="60" r="4" fill="#e0a010" stroke="#8a5a00" stroke-width="2"/></svg>`,
  speed: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><polygon points="38,2 12,36 28,36 22,62 52,26 35,26" fill="#ffd93d" stroke="#b36b00" stroke-width="4" stroke-linejoin="round"/><polygon points="36,8 22,30 32,30" fill="#fff6b0" opacity="0.7"/></svg>`,
  range: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><circle cx="32" cy="32" r="27" fill="#fff" stroke="#7a1f23" stroke-width="4"/><circle cx="32" cy="32" r="19" fill="#e5484d" stroke="#7a1f23" stroke-width="3"/><circle cx="32" cy="32" r="11" fill="#fff" stroke="#7a1f23" stroke-width="3"/><circle cx="32" cy="32" r="5" fill="#e5484d" stroke="#7a1f23" stroke-width="2"/><path d="M32 0 V14 M32 50 V64 M0 32 H14 M50 32 H64" stroke="#2b2b2b" stroke-width="3" stroke-linecap="round"/></svg>`,
  bounty: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><g fill="#ffd54f" stroke="#8a5a00" stroke-width="3"><ellipse cx="32" cy="50" rx="24" ry="9"/><rect x="8" y="38" width="48" height="12" stroke="none"/><ellipse cx="32" cy="38" rx="24" ry="9"/><rect x="8" y="26" width="48" height="12" stroke="none"/><ellipse cx="32" cy="26" rx="24" ry="9"/><rect x="8" y="14" width="48" height="12" stroke="none"/><ellipse cx="32" cy="14" rx="24" ry="9" fill="#fff3a0"/></g><path d="M8 14 V50 M56 14 V50" stroke="#8a5a00" stroke-width="3"/><ellipse cx="32" cy="14" rx="12" ry="4" fill="none" stroke="#b97a05" stroke-width="2.5"/></svg>`,
  supply: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><path d="M6 26 C6 6 58 6 58 26 Z" fill="#e5484d" stroke="#7a1f23" stroke-width="3" stroke-linejoin="round"/><path d="M22 26 C22 12 42 12 42 26 Z" fill="#fff" stroke="#7a1f23" stroke-width="2.5" stroke-linejoin="round"/><path d="M8 27 L26 46 M56 27 L38 46 M32 27 V46" stroke="#3d2c18" stroke-width="2.5"/><rect x="22" y="46" width="20" height="16" rx="2" fill="#c08a4a" stroke="#5a3a18" stroke-width="3"/><path d="M22 54 H42 M32 46 V62" stroke="#5a3a18" stroke-width="2.5"/></svg>`,
  reinforce: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><defs><linearGradient id="s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6fa8ff"/><stop offset="1" stop-color="#2a56b8"/></linearGradient></defs><path d="M32 3 L56 12 V32 C56 46 46 56 32 61 C18 56 8 46 8 32 V12 Z" fill="url(#s)" stroke="#16367a" stroke-width="4" stroke-linejoin="round"/><path d="M26 18 H38 V28 H48 V38 H38 V48 H26 V38 H16 V28 H26 Z" fill="#fff" stroke="#16367a" stroke-width="2.5" stroke-linejoin="round"/></svg>`,
};

// ---------- Towers (press 1-5 or click the shop to choose) ----------
// cost = gold, range = pixels, rate = ms between shots, dmg = damage per shot.
// Optional: splash = area damage, slow = slows enemies. svg = the picture of the tower.
const TOWERS = [
  { name: "Gun",      cost: 50,  range: 150, rate: 500,  dmg: 2,  bulletSpeed: 420, color: 0x4c8dff, bullet: 0xffe066, desc: "Balanced", svg: TOWER_SVG.gun },
  { name: "Cannon",   cost: 100, range: 130, rate: 1400, dmg: 6,  bulletSpeed: 300, color: 0xff9f43, bullet: 0xff6b35, desc: "Splash",   splash: 60, svg: TOWER_SVG.cannon },
  { name: "Frost",    cost: 75,  range: 120, rate: 900,  dmg: 1,  bulletSpeed: 380, color: 0x4dd0e1, bullet: 0xb2ebf2, desc: "Slows",    slow: 0.5, slowMs: 2000, svg: TOWER_SVG.frost },
  { name: "Sniper",   cost: 150, range: 300, rate: 2000, dmg: 12, bulletSpeed: 900, color: 0xb388ff, bullet: 0xffffff, desc: "Long range", svg: TOWER_SVG.sniper },
  // Barracks: troops = how many at once, rate = ms between new troops, hitMs = ms between hits.
  { name: "Barracks", cost: 120, rate: 2500, dmg: 4, color: 0x66bb6a, desc: "Marching troops", troops: 3, troopHp: 40, troopSpeed: 70, hitMs: 600, svg: TOWER_SVG.barracks },
];

// ---------- Enemies (hp is a multiplier of the base 6 hp, which also grows each wave) ----------
// speed = pixels per second, reward = gold, dps = damage to a blocking troop, lives = lives lost at the exit,
// svg = the picture of the enemy (size = how big it is on the map).
const ENEMY_TYPES = {
  grunt:  { svg: ENEMY_SVG.grunt, name: "Grunt",  hp: 1,   speed: 80,  reward: 10,  size: 28, color: 0xe5484d, stroke: 0x000000, lives: 1, dps: 5 },
  runner: { svg: ENEMY_SVG.runner, name: "Runner", hp: 0.5, speed: 150, reward: 8,   size: 20, color: 0xffa94d, stroke: 0x000000, lives: 1, dps: 3 },
  tank:   { svg: ENEMY_SVG.tank, name: "Tank",   hp: 3,   speed: 50,  reward: 25,  size: 38, color: 0x7b4fbf, stroke: 0x000000, lives: 2, dps: 9 },
  brood:  { svg: ENEMY_SVG.brood, name: "Brood",  hp: 4,   speed: 60,  reward: 30,  size: 34, color: 0x20b2aa, stroke: 0xffffff, lives: 2, dps: 6, spawns: 3 }, // bursts into 3 minions when killed
  minion: { svg: ENEMY_SVG.minion, name: "Minion", hp: 0.4, speed: 100, reward: 3,   size: 16, color: 0xd96ad9, stroke: 0x000000, lives: 1, dps: 3 },
  boss:   { svg: ENEMY_SVG.boss, name: "Boss",   hp: 14,  speed: 40,  reward: 120, size: 48, color: 0x1a1a1a, stroke: 0xff4444, lives: 5, dps: 16 },
  // The final enemy: it also summons minions every summonEvery ms.
  grandboss: { svg: ENEMY_SVG.grandboss, name: "Grand Boss", hp: 40, speed: 30, reward: 500, size: 68, color: 0x8b0000, stroke: 0xffd700, lives: 99, dps: 30, summonEvery: 6000, summons: 2 },
};

// ---------- Upgrades (you pick 1 of 3 random ones every UPGRADE_EVERY waves) ----------
// s.mods holds the multipliers that every tower uses.
const UPGRADES = [
  { icon: "damage", name: "Sharper Bullets", desc: "+35% damage for towers and troops", apply: (s) => { s.mods.dmg *= 1.35; } },
  { icon: "speed", name: "Rapid Fire",      desc: "+25% attack speed, troops are sent faster", apply: (s) => { s.mods.rate /= 1.25; } },
  { icon: "range", name: "Eagle Eye",       desc: "+20% range for shooting towers",    apply: (s) => { s.mods.range *= 1.2; } },
  { icon: "bounty", name: "Bounty Hunter",   desc: "+35% gold from every kill",         apply: (s) => { s.mods.bounty *= 1.35; } },
  { icon: "supply", name: "Supply Drop",     desc: "+250 gold right now",               apply: (s) => { s.gold += 250; } },
  { icon: "reinforce", name: "Reinforcements",  desc: "+5 lives",                          apply: (s) => { s.lives += 5; } },
];

// ======================= Path tiles (built from the waypoints) =======================
// pathTiles is a Set of "col,row" text keys (for example "6,2") for every tile the path covers.
// The game uses it to stop the player from building on the path.
const pathTiles = new Set();
for (let i = 0; i < WAYPOINTS.length - 1; i++) {
  let [c, r] = WAYPOINTS[i];             // start corner of this piece of the path
  const [c2, r2] = WAYPOINTS[i + 1];     // end corner of this piece
  const dc = Math.sign(c2 - c), dr = Math.sign(r2 - r);   // direction: -1, 0 or 1 in each axis
  pathTiles.add(c + "," + r);
  while (c !== c2 || r !== r2) { c += dc; r += dr; pathTiles.add(c + "," + r); }   // walk tile by tile
}

// ======================= Map decorations (each one fills a whole tile, so you cannot build there) =======================
const TREES = [[1,4],[4,5],[0,9],[4,10],[9,5],[9,1],[10,6],[14,1],[16,1],[18,6],[19,3],[8,10],[13,10],[15,9],[19,7]];
const ROCKS = [[4,7],[10,9],[16,5],[8,3],[11,0],[3,8]];
const PONDS = [[1,6],[2,6],[1,7],[14,6],[15,6],[15,7]];
const decorTiles = new Set([...TREES, ...ROCKS, ...PONDS].map(([c, r]) => c + "," + r));

// rand(c, r, k): a "random" number from 0 to 1 that is always the same for the same tile,
// so the map looks identical every time the game starts.
function rand(c, r, k) {
  let h = Math.imul(c + 1, 73856093) ^ Math.imul(r + 1, 19349663) ^ Math.imul(k + 1, 83492791);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

// Converts a tile (column, row) into the pixel position of the CENTRE of that tile.
const center = (col, row) => ({ x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 });

// ======================= Path geometry (troops walk along this) =======================
// A position on the path is described by one number: the distance walked from the entrance.
const PATH = WAYPOINTS.map(([c, r]) => center(c, r));   // the corners as pixel positions
const SEG_LEN = [], SEG_START = [];   // length of each straight piece, and where each piece starts
let PATH_LEN = 0;                     // total length of the whole path in pixels
for (let i = 0; i < PATH.length - 1; i++) {
  SEG_START.push(PATH_LEN);
  const len = Math.hypot(PATH[i + 1].x - PATH[i].x, PATH[i + 1].y - PATH[i].y);   // Pythagoras
  SEG_LEN.push(len);
  PATH_LEN += len;
}

// pointAt(s): given a distance s along the path, returns the pixel position {x, y} there.
function pointAt(s) {                                   // pixel position for a distance along the path
  s = Math.max(0, Math.min(PATH_LEN, s));               // keep s between 0 and the path length
  let i = 0;
  while (i < SEG_LEN.length - 1 && s > SEG_START[i] + SEG_LEN[i]) i++;   // find the right piece
  const f = (s - SEG_START[i]) / SEG_LEN[i];            // how far (0 to 1) along that piece
  return {
    x: PATH[i].x + (PATH[i + 1].x - PATH[i].x) * f,
    y: PATH[i].y + (PATH[i + 1].y - PATH[i].y) * f,
  };
}

// nearestOnPath(x, y): the opposite of pointAt. Given a pixel position, returns the distance
// along the path of the closest point on the path. Barracks use it to find where troops join the path.
function nearestOnPath(x, y) {                          // distance along the path of the point closest to (x, y)
  let bestS = 0, bestD = Infinity;
  for (let i = 0; i < SEG_LEN.length; i++) {            // try every straight piece of the path
    const ax = PATH[i].x, ay = PATH[i].y;
    const bx = PATH[i + 1].x - ax, by = PATH[i + 1].y - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * bx + (y - ay) * by) / (bx * bx + by * by)));   // closest spot on this piece
    const d = Math.hypot(ax + bx * t - x, ay + by * t - y);   // distance to that spot
    if (d < bestD) { bestD = d; bestS = SEG_START[i] + SEG_LEN[i] * t; }   // keep the best one
  }
  return bestS;
}

// ======================= Pictures -> canvases =======================
// The browser turns each SVG text (towers, enemies and icons) into a picture, and we copy it onto a small
// canvas. The game only starts when all pictures are ready.
const PICTURES = {};                                                  // name -> SVG text
TOWERS.forEach((t, i) => { PICTURES["tower" + i] = t.svg; });
for (const k in ENEMY_TYPES) PICTURES["enemy_" + k] = ENEMY_TYPES[k].svg;
for (const k in ICON_SVG) PICTURES["icon_" + k] = ICON_SVG[k];
const pictureCanvases = {};                                           // name -> ready canvas
function loadPictures() {
  return Promise.all(Object.keys(PICTURES).map((name) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = 96; c.height = 96;
      c.getContext("2d").drawImage(img, 0, 0, 96, 96);
      pictureCanvases[name] = c;
      resolve();
    };
    img.onerror = () => { console.warn("Picture failed: " + name); resolve(); };   // that picture is simply missing
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(PICTURES[name]);
  })));
}

// ======================= The game =======================
// A Phaser "Scene" is one screen of the game. Phaser calls create() once at the start
// and update() about 60 times per second.
class Game extends Phaser.Scene {
  constructor() { super("Game"); }

  // towerPicture(): makes the picture of tower type i at (x, y). If the picture could not
  // be made, it draws a coloured square instead, so the game still works.
  towerPicture(i, x, y, size) {
    if (this.textures.exists("tower" + i)) return this.add.image(x, y, "tower" + i).setDisplaySize(size, size);
    return this.add.rectangle(x, y, size - 10, size - 10, TOWERS[i].color).setStrokeStyle(3, 0x000000, 0.5);
  }

  // enemyPicture(): makes the picture of an enemy. If the picture could not be made, it draws
  // the old coloured square instead. The picture is a bit bigger than "size" because it has legs and horns.
  enemyPicture(key, x, y) {
    const d = ENEMY_TYPES[key];
    if (this.textures.exists("enemy_" + key)) return this.add.image(x, y, "enemy_" + key).setDisplaySize(d.size * 1.3, d.size * 1.3);
    return this.add.rectangle(x, y, d.size, d.size, d.color).setStrokeStyle(2, d.stroke, 0.8);
  }

  // freeze(): gives an enemy a light-blue look while it is slowed, and its normal look again afterwards.
  freeze(e, on) {
    if (e.rect.setTint) { if (on) e.rect.setTint(0x8fdcff); else e.rect.clearTint(); }   // pictures get a blue tint
    else e.rect.setFillStyle(on ? 0x8fdcff : e.def.color);                              // squares change colour
  }

  // iconPicture(): a small icon picture (or a white square if it is missing).
  iconPicture(name, x, y, size) {
    if (this.textures.exists("icon_" + name)) return this.add.image(x, y, "icon_" + name).setDisplaySize(size, size);
    return this.add.rectangle(x, y, size * 0.6, size * 0.6, 0xffffff);
  }

  // drawMap(): paints the ground as blocks (grass and dirt). Every block has a light edge on
  // the top-left and a dark edge on the bottom-right, so it looks like a little cube.
  drawMap() {
    const g = this.add.graphics();
    const GRASS = [0x3f7d3a, 0x44853f, 0x3a7336, 0x488a43];       // four greens, picked per tile
    const DIRT = [0xa68a5b, 0x9c8154, 0xb0955f];                  // three browns for the path
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * TILE, y = r * TILE, path = pathTiles.has(c + "," + r);
        const pick = Math.floor(rand(c, r, 0) * 4);               // the same "random" number every time
        g.fillStyle(path ? DIRT[pick % 3] : GRASS[pick], 1);
        g.fillRect(x, y, TILE, TILE);
        g.fillStyle(0xffffff, 0.14); g.fillRect(x, y, TILE, 3); g.fillRect(x, y + 3, 3, TILE - 3);               // light edge
        g.fillStyle(0x000000, 0.22); g.fillRect(x, y + TILE - 3, TILE, 3); g.fillRect(x + TILE - 3, y, 3, TILE - 3);   // dark edge
        for (let k = 1; k <= 3; k++) {                            // small specks: pebbles on the path, grass blades on grass
          const sx = x + 7 + Math.floor(rand(c, r, k) * (TILE - 18));
          const sy = y + 7 + Math.floor(rand(c, r, k + 5) * (TILE - 18));
          if (path) { g.fillStyle(k % 2 ? 0xcfc3a2 : 0x7a643f, 1); g.fillRect(sx, sy, 5, 4); }
          else      { g.fillStyle(k % 2 ? 0x5fa356 : 0x2e5f2b, 1); g.fillRect(sx, sy, 2, 6); }
        }
      }
    }
  }

  // drawDecor(): everything on the map that is built from blocks and moves a little:
  // swaying trees and flowers, shimmering ponds, a portal, a castle gate, fireflies and drifting cloud shadows.
  drawDecor() {
    const sway = (obj, deg, ms) => this.tweens.add({ targets: obj, angle: { from: -deg, to: deg }, duration: ms, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    PONDS.forEach(([c, r]) => {                                   // water blocks with light spots that fade in and out
      const x = c * TILE, y = r * TILE;
      this.add.rectangle(x + TILE / 2, y + TILE / 2, TILE, TILE, 0x2f7fc4).setStrokeStyle(3, 0x1f5f9e);
      for (let k = 0; k < 2; k++) {
        const s = this.add.rectangle(x + 8 + rand(c, r, 20 + k) * 20, y + 8 + rand(c, r, 30 + k) * 28, 14, 4, 0xffffff, 0.35);
        this.tweens.add({ targets: s, alpha: { from: 0.05, to: 0.45 }, duration: 900 + rand(c, r, 40 + k) * 900, yoyo: true, repeat: -1, delay: rand(c, r, 50 + k) * 1500 });
      }
    });

    ROCKS.forEach(([c, r]) => {                                   // three grey blocks
      const x = c * TILE + TILE / 2, y = r * TILE + TILE - 6;
      this.add.rectangle(x, y, 30, 16, 0x8a8f98).setOrigin(0.5, 1).setStrokeStyle(2, 0x4b4f57);
      this.add.rectangle(x + 4, y - 14, 16, 10, 0xa4a9b2).setOrigin(0.5, 1).setStrokeStyle(2, 0x4b4f57);
      this.add.rectangle(x - 9, y - 4, 8, 5, 0xc3c7ce);
    });

    TREES.forEach(([c, r]) => {                                   // a trunk and three stacked leaf blocks, swaying slowly
      const tree = this.add.container(c * TILE + TILE / 2, r * TILE + TILE - 4, [
        this.add.ellipse(0, 0, 36, 10, 0x000000, 0.25),
        this.add.rectangle(0, -2, 10, 14, 0x6b4423).setOrigin(0.5, 1).setStrokeStyle(2, 0x3d2610),
        this.add.rectangle(0, -12, 38, 18, 0x2f6b2c).setOrigin(0.5, 1).setStrokeStyle(2, 0x1d4a1b),
        this.add.rectangle(0, -26, 30, 16, 0x3a8236).setOrigin(0.5, 1).setStrokeStyle(2, 0x1d4a1b),
        this.add.rectangle(0, -40, 20, 14, 0x4a9a44).setOrigin(0.5, 1).setStrokeStyle(2, 0x1d4a1b),
      ]);
      sway(tree, 2, 1800 + rand(c, r, 60) * 1400);
    });

    const FLOWER = [0xff5a7a, 0xffd84a, 0xffffff, 0xc77dff];      // flowers on about 1 grass tile in 10
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (pathTiles.has(c + "," + r) || decorTiles.has(c + "," + r) || rand(c, r, 9) >= 0.1) continue;
        const f = this.add.container(c * TILE + 10 + rand(c, r, 11) * 28, r * TILE + 14 + rand(c, r, 12) * 28, [
          this.add.rectangle(0, 0, 2, 7, 0x2e7a2b).setOrigin(0.5, 0),
          this.add.rectangle(0, 0, 6, 6, FLOWER[Math.floor(rand(c, r, 13) * 4)]),
        ]);
        sway(f, 8, 1200 + rand(c, r, 14) * 1200);
      }
    }

    const a = center(...WAYPOINTS[0]);                            // the entrance: a portal with two spinning squares
    this.add.rectangle(a.x, a.y, 40, 40, 0x1b0f2e).setStrokeStyle(3, 0x8a3df0);
    const p1 = this.add.rectangle(a.x, a.y, 24, 24, 0xc58bff, 0.8);
    const p2 = this.add.rectangle(a.x, a.y, 24, 24, 0x7a2fd0, 0.8);
    this.tweens.add({ targets: p1, angle: 360, duration: 3000, repeat: -1 });
    this.tweens.add({ targets: p2, angle: -360, duration: 2000, repeat: -1 });

    const b = center(...WAYPOINTS[WAYPOINTS.length - 1]);          // the exit: a stone gate with a waving flag
    this.add.rectangle(b.x, b.y + 2, 40, 36, 0x6c7280).setStrokeStyle(3, 0x3b404a);
    [-14, 0, 14].forEach((dx) => this.add.rectangle(b.x + dx, b.y - 18, 10, 8, 0x8b92a1).setStrokeStyle(2, 0x3b404a));
    this.add.rectangle(b.x, b.y + 8, 14, 20, 0x3a2515).setStrokeStyle(2, 0x1c1109);
    this.add.rectangle(b.x + 6, b.y - 30, 2, 16, 0x3b404a);
    const flag = this.add.rectangle(b.x + 7, b.y - 34, 12, 8, 0xe5484d).setOrigin(0, 0.5);
    this.tweens.add({ targets: flag, scaleX: { from: 0.6, to: 1 }, duration: 500, yoyo: true, repeat: -1 });

    for (let i = 0; i < 8; i++) {                                 // fireflies: tiny squares that wander and blink
      const f = this.add.rectangle(Math.random() * WIDTH, Math.random() * MAP_H, 4, 4, 0xfff3a0).setDepth(4);
      this.tweens.add({ targets: f, x: Math.random() * WIDTH, y: Math.random() * MAP_H, duration: 6000 + Math.random() * 6000, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      this.tweens.add({ targets: f, alpha: { from: 0.15, to: 1 }, duration: 500 + Math.random() * 700, yoyo: true, repeat: -1 });
    }

    for (let i = 0; i < 3; i++) {                                 // cloud shadows: dark blocks drifting across the map
      const cloud = this.add.container(-250, 60 + i * 190 + Math.random() * 60, [
        this.add.rectangle(0, 0, 180, 70, 0x000000, 0.09).setOrigin(0),
        this.add.rectangle(40, -20, 110, 30, 0x000000, 0.09).setOrigin(0),
      ]).setDepth(4);
      this.tweens.add({ targets: cloud, x: WIDTH + 250, duration: 48000, repeat: -1, delay: i * 16000 });
    }
  }

  // create(): sets up a fresh game. It runs again when the game restarts.
  create() {
    // Give Phaser the pictures (they were prepared before the game started)
    for (const name in pictureCanvases) if (!this.textures.exists(name)) this.textures.addCanvas(name, pictureCanvases[name]);
    this.gold = START_GOLD; this.lives = START_LIVES; this.wave = 0; this.now = 0;
    this.enemies = []; this.towers = []; this.bullets = [];     // lists of everything alive on the map
    this.occupied = new Set();                                  // tiles that already have a tower
    this.waveList = []; this.spawned = 0; this.waveActive = false;   // the wave that is being sent
    this.over = false; this.won = false; this.overAt = 0; this.choosing = false;   // game state flags
    this.offered = []; this.upgradeObjs = []; this.cardRects = [];   // data for the upgrade screen
    this.selected = 0;                                          // which tower type is chosen in the shop
    this.selTower = null; this.sellBtn = null; this.sellRect = null;   // tower chosen for selling
    this.mods = { dmg: 1, rate: 1, range: 1, bounty: 1 }; // global upgrade multipliers

    this.drawMap();                                // the ground blocks (drawn once)
    this.drawDecor();                              // trees, rocks, ponds, flowers and other living things

    this.overlay = this.add.graphics();            // hover highlight + range preview
    this.bars = this.add.graphics().setDepth(5);   // health bars

    // Shop bar under the map: one button per tower type
    this.shopGfx = this.add.graphics().setDepth(10);
    this.shopRects = []; this.shopTexts = []; this.shopIcons = [];
    const n = TOWERS.length;
    const bw = (WIDTH - (n + 1) * 8) / n;          // width of one shop button
    TOWERS.forEach((t, i) => {
      const r = { x: 8 + i * (bw + 8), y: MAP_H + 10, w: bw, h: 64 };   // the clickable rectangle
      this.shopRects.push(r);
      this.shopTexts.push(this.add.text(r.x + 52, r.y + 8,
        `${i + 1}. ${t.name}\n${t.cost} gold\n${t.desc}`,
        { fontFamily: "monospace", fontSize: "13px", color: "#ffffff", lineSpacing: 4 }).setDepth(11));
      this.shopIcons.push(this.towerPicture(i, r.x + 26, r.y + 32, 40).setDepth(11));   // the tower picture in the shop
    });

    // The display at the top left: icons with gold, lives and wave, then two small lines of text
    this.add.rectangle(8, 6, 372, 74, 0x000000, 0.6).setOrigin(0).setDepth(10);
    const font = { fontFamily: "monospace", fontSize: "18px", color: "#ffffff" };
    this.iconPicture("gold", 28, 25, 26).setDepth(11);
    this.hudGold = this.add.text(48, 14, "", font).setDepth(11);
    this.iconPicture("lives", 148, 25, 26).setDepth(11);
    this.hudLives = this.add.text(168, 14, "", font).setDepth(11);
    this.iconPicture("wave", 258, 25, 26).setDepth(11);
    this.hudWave = this.add.text(278, 14, "", font).setDepth(11);
    this.hudInfo = this.add.text(16, 42, "", { fontFamily: "monospace", fontSize: "13px", color: "#ffffff", lineSpacing: 3 }).setDepth(11);
    this.updateHud();

    // Listen for mouse clicks and key presses
    this.input.on("pointerdown", (p) => this.onClick(p));
    this.input.keyboard.on("keydown", (ev) => this.onKey(ev));
    this.time.delayedCall(1500, () => this.startWave());   // the first wave starts after 1.5 seconds
  }

  // ----- Waves -----
  // buildWave(w): returns the list of enemy types for wave number w.
  buildWave(w) {
    const list = [];
    const add = (type, n) => { for (let i = 0; i < n; i++) list.push(type); };   // add n enemies of a type
    add("grunt", 4 + w);
    if (w >= 2) add("runner", w);                              // runners from wave 2
    if (w >= 4) add("tank", Math.floor((w - 2) / 2));          // tanks from wave 4
    if (w >= 4) add("brood", 1 + Math.floor((w - 4) / 3));     // broods from wave 4
    for (let i = list.length - 1; i > 0; i--) {                // shuffle
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    if (w % 5 === 0) add("boss", Math.min(w / 5, 3));          // a boss closes every 5th wave (at most 3)
    if (w === MAX_WAVES) add("grandboss", 1);                  // the final wave ends with the GRAND BOSS
    return list;
  }

  // startWave(): starts the next wave and sends its enemies one by one.
  startWave() {
    if (this.over) return;
    this.wave++;
    this.waveList = this.buildWave(this.wave);
    this.spawned = 0;
    this.waveActive = true;
    const delay = Math.max(400, 800 - this.wave * 25);        // time between enemies (shorter in later waves)
    this.time.addEvent({ delay, repeat: this.waveList.length - 1, callback: () => this.spawnEnemy() });
    // Build the banner text, for example "Wave 3" and "8 Grunt, 3 Runner"
    const counts = {};
    this.waveList.forEach((k) => { counts[k] = (counts[k] || 0) + 1; });
    const summary = Object.keys(counts).map((k) => `${counts[k]} ${ENEMY_TYPES[k].name}`).join(", ");
    this.banner(`${this.wave === MAX_WAVES ? "FINAL WAVE " : "Wave "}${this.wave}\n${summary}`, this.wave === MAX_WAVES ? 3500 : 1800);
    this.updateHud();
  }

  // makeEnemy(): creates one enemy at a position. "target" is the number of the next corner
  // it walks to, and "traveled" is how far along the path it already is.
  makeEnemy(key, x, y, target, traveled) {
    const d = ENEMY_TYPES[key];
    const hp = Math.round(6 * d.hp * (1 + (this.wave - 1) * 0.3));   // enemies get 30% tougher every wave
    const rect = this.enemyPicture(key, x, y);
    const e = { rect, def: d, hp, maxHp: hp, target, traveled, slowUntil: 0, slowFactor: 1, slowed: false, holdUntil: 0, dead: false,
                vis: d.size * 1.3, wob: Math.random() * 6.28 };   // vis = drawn size, wob = start of the waddle
    this.enemies.push(e);
    return e;
  }

  // spawnEnemy(): takes the next enemy from the wave list and puts it at the start of the path.
  spawnEnemy() {
    const key = this.waveList[this.spawned++];
    const p = center(...WAYPOINTS[0]);
    this.makeEnemy(key, p.x, p.y, 1, 0);
  }

  // damage(): hurts an enemy and kills it when its health reaches 0.
  damage(e, amount) {
    if (e.dead) return;
    e.hp -= amount;
    if (e.hp <= 0) this.killEnemy(e);
  }

  // killEnemy(): removes the enemy, pays the reward, and handles Brood enemies.
  killEnemy(e) {
    if (e.dead) return;
    e.dead = true;
    const x = e.rect.x, y = e.rect.y;
    e.rect.destroy();                                          // remove the picture from the screen
    const i = this.enemies.indexOf(e);
    if (i >= 0) this.enemies.splice(i, 1);                     // remove it from the list
    this.gold += Math.round(e.def.reward * this.mods.bounty);
    if (e.def.spawns) {                                        // Brood: burst into minions that keep walking
      for (let k = 0; k < e.def.spawns; k++) {
        this.makeEnemy("minion", x + (Math.random() - 0.5) * 24, y + (Math.random() - 0.5) * 24, e.target, e.traveled);
      }
    }
    this.updateHud();
  }

  // ----- Input -----
  // onClick(): runs on every mouse click. p.x and p.y are the click position in game pixels.
  onClick(p) {
    // Game over or victory: a click starts a new game (clicks in the first 0.7 s are ignored)
    if (this.over) { if (this.now - this.overAt > 700) this.scene.restart(); return; }   // click = play again

    if (this.choosing) {                                // upgrade cards
      for (let i = 0; i < this.cardRects.length; i++) {
        const r = this.cardRects[i];
        if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) { this.pickUpgrade(i); break; }
      }
      return;
    }

    if (this.selTower && this.sellRect) {                // the Sell button
      const b = this.sellRect;
      if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) { this.sellTower(); return; }
    }

    if (p.y >= MAP_H) {                                 // shop buttons
      this.deselect();
      this.shopRects.forEach((r, i) => {
        if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) this.select(i);
      });
      return;
    }

    // The click was on the map: find which tile it was
    const c = Math.floor(p.x / TILE), r = Math.floor(p.y / TILE);
    const clicked = this.towers.find((tw) => tw.col === c && tw.row === r);
    if (clicked) { this.selectTower(clicked); return; }   // click a tower: offer to sell it
    this.deselect();
    if (!this.canBuild(c, r)) return;                   // not allowed (path, decoration, taken tile or not enough gold)

    // Build the chosen tower on this tile
    const t = TOWERS[this.selected];
    const pos = center(c, r);
    const body = this.towerPicture(this.selected, pos.x, pos.y, 44);
    const tw = { x: pos.x, y: pos.y, col: c, row: r, cost: t.cost, rect: body, lastShot: 0, type: t };
    if (t.troops) {                                     // Barracks: remember where its troops step onto the path
      tw.troops = [];
      tw.pathS = nearestOnPath(pos.x, pos.y);
      tw.lastSpawn = -1e9;                              // so the first troop is sent straight away
    }
    this.towers.push(tw);
    this.occupied.add(c + "," + r);
    this.gold -= t.cost;
    this.updateHud();
  }

  // onKey(): runs on every key press. S or Delete sells, the keys 1-5 choose a tower (or upgrade).
  onKey(ev) {
    if (ev.key === "s" || ev.key === "S" || ev.key === "Delete") {   // S or Delete sells the chosen tower
      if (this.selTower && !this.choosing && !this.over) this.sellTower();
      return;
    }
    const n = parseInt(ev.key, 10);
    if (isNaN(n)) return;                               // not a number key: ignore
    if (this.choosing) { if (n >= 1 && n <= this.offered.length) this.pickUpgrade(n - 1); return; }
    if (n >= 1 && n <= TOWERS.length) this.select(n - 1);
  }

  // select(): choose which tower type will be built next.
  select(i) { this.selected = i; this.renderShop(); }

  // canBuild(): true when the tile is on the map, not on the path, not a decoration, not taken, and we have the gold.
  canBuild(c, r) {
    return c >= 0 && c < COLS && r >= 0 && r < ROWS &&
      !pathTiles.has(c + "," + r) && !decorTiles.has(c + "," + r) && !this.occupied.has(c + "," + r) &&
      this.gold >= TOWERS[this.selected].cost;
  }

  // ----- Selling towers -----
  // selectTower(): marks a built tower as chosen and shows the red SELL button next to it.
  selectTower(tw) {
    this.deselect();
    this.selTower = tw;
    const refund = Math.floor(tw.cost * SELL_REFUND);
    const btn = this.add.text(0, 0, `SELL ${tw.type.name}  +${refund} gold  (S)`, {
      fontFamily: "monospace", fontSize: "15px", color: "#ffffff",
      backgroundColor: "#b3261e", padding: { x: 8, y: 5 },
    }).setDepth(20);
    const w = btn.width || 200, h = btn.height || 28;
    const x = Math.max(4, Math.min(WIDTH - w - 4, tw.x - w / 2));   // keep the button inside the screen
    const y = tw.y - 52 < 4 ? tw.y + 30 : tw.y - 52;      // above the tower, or below it near the top edge
    btn.setPosition(x, y);
    this.sellBtn = btn;
    this.sellRect = { x, y, w, h };                       // the clickable area of the button
  }

  // deselect(): removes the SELL button and forgets the chosen tower.
  deselect() {
    if (this.sellBtn) this.sellBtn.destroy();
    this.sellBtn = null; this.sellRect = null; this.selTower = null;
  }

  // sellTower(): gives back part of the cost and removes the chosen tower.
  sellTower() {
    const tw = this.selTower;
    if (!tw) return;
    this.gold += Math.floor(tw.cost * SELL_REFUND);
    tw.rect.destroy();
    if (tw.troops) tw.troops.forEach((tr) => tr.circle.destroy());   // Barracks: its troops leave with it
    this.towers.splice(this.towers.indexOf(tw), 1);
    this.occupied.delete(tw.col + "," + tw.row);          // the tile is free again
    this.deselect();
    this.updateHud();
  }

  // ----- Troops -----
  // spawnTroop(): sends out one new troop from a Barracks.
  spawnTroop(tw) {
    const t = tw.type;
    const circle = this.add.circle(tw.x, tw.y, 8, 0xa5d6a7).setStrokeStyle(2, 0x1b5e20).setDepth(3);
    // deployed = false while the troop walks from the barracks onto the path
    tw.troops.push({ circle, hp: t.troopHp, maxHp: t.troopHp, s: tw.pathS, deployed: false, done: false, lastHit: 0 });
  }

  // ----- Upgrades -----
  // showUpgrades(): pauses the game flow and shows 3 random upgrade cards.
  showUpgrades() {
    if (this.over) return;
    this.deselect();
    this.choosing = true;
    const pool = UPGRADES.slice();                       // a copy, so we can take cards out of it
    this.offered = [];
    while (this.offered.length < 3) this.offered.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);

    // A dark layer over the whole game, and the title
    const dim = this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x000000, 0.65).setOrigin(0).setDepth(30);
    const title = this.add.text(WIDTH / 2, 70,
      `Wave ${this.wave} cleared!\nChoose an upgrade (click it or press 1-3)`,
      { fontFamily: "monospace", fontSize: "26px", color: "#ffffff", align: "center" }).setOrigin(0.5, 0).setDepth(31);
    this.upgradeObjs = [dim, title];                     // remember them so we can remove them later
    this.cardRects = [];

    // Draw the 3 cards next to each other
    const cw = 260, ch = 190, gap = 30, x0 = (WIDTH - (3 * cw + 2 * gap)) / 2, y0 = 190;
    this.offered.forEach((u, i) => {
      const x = x0 + i * (cw + gap);
      this.cardRects.push({ x, y: y0, w: cw, h: ch });   // clickable area of the card
      const card = this.add.rectangle(x, y0, cw, ch, 0x1f2937).setOrigin(0).setStrokeStyle(3, 0x7aa2ff).setDepth(31);
      const icon = this.iconPicture(u.icon, x + cw / 2, y0 + 42, 56).setDepth(32);
      const name = this.add.text(x + cw / 2, y0 + 80, `${i + 1}. ${u.name}`,
        { fontFamily: "monospace", fontSize: "22px", color: "#ffe066", align: "center", wordWrap: { width: cw - 32 } }).setOrigin(0.5, 0).setDepth(32);
      const desc = this.add.text(x + cw / 2, y0 + 114, u.desc,
        { fontFamily: "monospace", fontSize: "17px", color: "#ffffff", align: "center", wordWrap: { width: cw - 32 } }).setOrigin(0.5, 0).setDepth(32);
      this.upgradeObjs.push(card, icon, name, desc);
    });
  }

  // pickUpgrade(): applies the chosen upgrade, closes the upgrade screen and starts the next wave.
  pickUpgrade(i) {
    const u = this.offered[i];
    if (!u) return;
    u.apply(this);                                       // run the upgrade's effect
    this.upgradeObjs.forEach((o) => o.destroy());        // remove the cards from the screen
    this.upgradeObjs = []; this.cardRects = []; this.offered = [];
    this.choosing = false;
    this.banner(`Upgrade: ${u.name}`, 1500);
    this.updateHud();
    this.time.delayedCall(1800, () => this.startWave());
  }

  // ----- Main loop -----
  // update(): Phaser calls this about 60 times per second. "time" is the total time in
  // milliseconds and "delta" is the time since the last call. Everything that moves is done here.
  update(time, delta) {
    if (this.over) return;                               // the game has ended: nothing moves
    this.now = time;
    const dt = delta / 1000;                             // delta in seconds (used for speed * dt)

    // Enemies walk the path (frost slows them, troops can hold them in place)
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const slowed = time < e.slowUntil;
      if (slowed !== e.slowed) { e.slowed = slowed; this.freeze(e, slowed); }   // light blue while slowed
      if (e.def.summonEvery) {                         // Grand Boss: calls minions now and then
        if (!e.nextSummon) e.nextSummon = time + e.def.summonEvery;
        if (time >= e.nextSummon) {
          e.nextSummon = time + e.def.summonEvery;
          for (let k = 0; k < e.def.summons; k++) {
            this.makeEnemy("minion", e.rect.x + (Math.random() - 0.5) * 30, e.rect.y + (Math.random() - 0.5) * 30, e.target, e.traveled);
          }
        }
      }
      if (time < e.holdUntil) continue;                // blocked by a troop
      const speed = e.def.speed * (slowed ? e.slowFactor : 1);
      const t = center(...WAYPOINTS[e.target]);        // the corner the enemy walks towards
      const dx = t.x - e.rect.x, dy = t.y - e.rect.y;
      const dist = Math.hypot(dx, dy), step = speed * dt;   // distance left, and how far to move this frame
      if (dist <= step) {                              // reached the corner
        e.rect.setPosition(t.x, t.y);
        e.traveled += dist;
        e.target++;                                    // aim for the next corner
        if (e.target >= WAYPOINTS.length) {            // reached the exit
          e.dead = true;
          e.rect.destroy();
          this.enemies.splice(i, 1);
          this.lives -= e.def.lives;                   // the player loses lives
          this.updateHud();
          if (this.lives <= 0) { this.gameOver(); return; }
        }
      } else {                                         // move a little towards the corner
        e.rect.x += (dx / dist) * step;
        e.rect.y += (dy / dist) * step;
        e.rect.rotation = Math.atan2(dy, dx) + Math.PI / 2 + Math.sin(time / 90 + e.wob) * 0.12;   // face the walking direction, with a little waddle
        e.traveled += step;
      }
    }

    // Barracks troops: march along the path; stop and fight when they meet an enemy;
    // disappear at the end of the path; new ones are sent to replace them.
    for (const tw of this.towers) {
      const t = tw.type;
      if (!t.troops) continue;                         // only Barracks have troops

      if (tw.troops.length < t.troops && time - tw.lastSpawn >= t.rate * this.mods.rate) {
        this.spawnTroop(tw);                           // send a new troop
        tw.lastSpawn = time;
      }

      for (let i = tw.troops.length - 1; i >= 0; i--) {
        const tr = tw.troops[i];

        // Is an enemy touching this troop? (take the closest one)
        let foe = null, best = Infinity;
        for (const e of this.enemies) {
          const d = Math.hypot(e.rect.x - tr.circle.x, e.rect.y - tr.circle.y);
          if (d <= 14 + e.def.size / 2 && d < best) { best = d; foe = e; }
        }

        if (foe) {                                     // stop, hold the enemy in place, trade blows
          foe.holdUntil = time + 120;                  // the enemy cannot walk for the next 120 ms
          tr.hp -= foe.def.dps * dt;                   // the enemy hurts the troop
          if (time - tr.lastHit >= t.hitMs * this.mods.rate) {   // the troop hits back every hitMs
            tr.lastHit = time;
            this.damage(foe, t.dmg * this.mods.dmg);
          }
        } else if (!tr.deployed) {                     // walk from the barracks onto the path
          const goal = pointAt(tr.s);
          const dx = goal.x - tr.circle.x, dy = goal.y - tr.circle.y;
          const dist = Math.hypot(dx, dy), step = t.troopSpeed * dt;
          if (dist <= step) { tr.circle.setPosition(goal.x, goal.y); tr.deployed = true; }
          else { tr.circle.x += (dx / dist) * step; tr.circle.y += (dy / dist) * step; }
        } else {                                       // march along the path
          tr.s += TROOP_DIRECTION * t.troopSpeed * dt;
          if (tr.s <= 0 || tr.s >= PATH_LEN) tr.done = true;   // reached the end of the path
          const p = pointAt(tr.s);
          tr.circle.setPosition(p.x, p.y);
        }

        if (tr.hp <= 0 || tr.done) {                   // fell in battle, or marched off the end
          tr.circle.destroy();
          tw.troops.splice(i, 1);
        }
      }
    }

    // Shooting towers hit the enemy that is furthest along the path
    for (const tw of this.towers) {
      const t = tw.type;
      if (t.troops) continue;                          // Barracks do not shoot
      const range = t.range * this.mods.range;
      let target = null;
      for (const e of this.enemies) {                  // pick the enemy in range that is closest to the exit
        if (Math.hypot(e.rect.x - tw.x, e.rect.y - tw.y) <= range && (!target || e.traveled > target.traveled)) target = e;
      }
      if (!target) continue;
      tw.rect.rotation = Math.atan2(target.rect.y - tw.y, target.rect.x - tw.x) + Math.PI / 2;   // turn the barrel towards the enemy
      if (time - tw.lastShot < t.rate * this.mods.rate) continue;   // still reloading
      tw.lastShot = time;
      this.bullets.push({                              // fire a bullet
        circle: this.add.circle(tw.x, tw.y, t.splash ? 7 : 5, t.bullet),
        target, def: t, dmg: t.dmg * this.mods.dmg,
      });
    }

    // Bullets chase their target
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      if (b.target.dead) { b.circle.destroy(); this.bullets.splice(i, 1); continue; }   // target already dead
      const dx = b.target.rect.x - b.circle.x, dy = b.target.rect.y - b.circle.y;
      const dist = Math.hypot(dx, dy), step = b.def.bulletSpeed * dt;
      if (dist <= step + 6) {                          // close enough: it hits
        this.hit(b);
        b.circle.destroy();
        this.bullets.splice(i, 1);
      } else {                                         // fly a little closer
        b.circle.x += (dx / dist) * step;
        b.circle.y += (dy / dist) * step;
      }
    }

    // Wave cleared? (all enemies were sent and none are alive)
    if (this.waveActive && this.spawned >= this.waveList.length && this.enemies.length === 0) {
      this.waveActive = false;
      this.gold += WAVE_CLEAR_BONUS;
      this.updateHud();
      if (this.wave >= MAX_WAVES) { this.victory(); return; }    // the Grand Boss is dead: you win!
      if (this.wave % UPGRADE_EVERY === 0) {
        this.time.delayedCall(800, () => this.showUpgrades());   // every 4th wave: upgrade choice
      } else {
        this.banner(`Wave ${this.wave} cleared  +${WAVE_CLEAR_BONUS} gold`, 1800);
        this.time.delayedCall(3000, () => this.startWave());    // next wave after 3 seconds
      }
    }

    // Health bars + hover highlight
    this.bars.clear();                                 // erase the old bars, then draw them again
    for (const e of this.enemies) {
      const w = Math.max(24, e.vis), x = e.rect.x - w / 2, y = e.rect.y - e.vis / 2 - 6;
      this.bars.fillStyle(0x000000, 0.6);              // dark background of the bar
      this.bars.fillRect(x, y, w, 5);
      this.bars.fillStyle(e.slowed ? 0x7fd8ff : 0x46c36b, 1);   // green (blue when slowed) health part
      this.bars.fillRect(x, y, w * Math.max(0, e.hp / e.maxHp), 5);
    }
    for (const tw of this.towers) {                    // health bars of the troops
      if (!tw.troops) continue;
      for (const tr of tw.troops) {
        this.bars.fillStyle(0x000000, 0.6);
        this.bars.fillRect(tr.circle.x - 10, tr.circle.y - 17, 20, 4);
        this.bars.fillStyle(0xffd54f, 1);
        this.bars.fillRect(tr.circle.x - 10, tr.circle.y - 17, 20 * Math.max(0, tr.hp / tr.maxHp), 4);
      }
    }
    this.drawHover();
  }

  // hit(): what happens when a bullet reaches its target.
  hit(b) {
    const d = b.def;
    if (d.splash) {                                     // cannon: damage everything near the impact
      const ix = b.circle.x, iy = b.circle.y;
      for (const e of this.enemies.slice()) {
        if (Math.hypot(e.rect.x - ix, e.rect.y - iy) <= d.splash) this.damage(e, b.dmg);
      }
      const ring = this.add.circle(ix, iy, d.splash, 0xff9f43, 0.25);   // a short orange circle as explosion
      this.time.delayedCall(150, () => ring.destroy());
    } else {
      this.damage(b.target, b.dmg);
    }
    if (d.slow && !b.target.dead) {                     // frost: slow the target
      b.target.slowUntil = this.now + d.slowMs;
      b.target.slowFactor = d.slow;
    }
  }

  // ----- Drawing / UI -----
  // drawHover(): highlights the tile under the mouse (green = can build, red = cannot)
  // and shows the range of the tower that would be built.
  drawHover() {
    this.overlay.clear();
    if (this.choosing) return;
    if (this.selTower) {                                // chosen tower: outline + range ring
      const st = this.selTower;
      this.overlay.lineStyle(3, 0xffe066, 1);
      this.overlay.strokeRect(st.col * TILE + 2, st.row * TILE + 2, TILE - 4, TILE - 4);
      if (!st.type.troops) {
        this.overlay.lineStyle(2, 0xffffff, 0.35);
        this.overlay.strokeCircle(st.x, st.y, st.type.range * this.mods.range);
      }
    }
    const p = this.input.activePointer;                 // current mouse position
    const c = Math.floor(p.x / TILE), r = Math.floor(p.y / TILE);
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return;   // the mouse is outside the map
    const t = TOWERS[this.selected];
    const free = !pathTiles.has(c + "," + r) && !decorTiles.has(c + "," + r) && !this.occupied.has(c + "," + r);
    const ok = free && this.gold >= t.cost;
    this.overlay.fillStyle(ok ? 0x46c36b : 0xe5484d, 0.35);
    this.overlay.fillRect(c * TILE, r * TILE, TILE, TILE);
    if (free) {
      const pos = center(c, r);
      this.overlay.lineStyle(2, 0xffffff, 0.45);
      if (t.troops) {                                   // barracks: show where its troops will join the path
        const q = pointAt(nearestOnPath(pos.x, pos.y));
        this.overlay.beginPath();
        this.overlay.moveTo(pos.x, pos.y);
        this.overlay.lineTo(q.x, q.y);
        this.overlay.strokePath();
        this.overlay.strokeCircle(q.x, q.y, 8);
      } else {
        this.overlay.strokeCircle(pos.x, pos.y, t.range * this.mods.range);   // the range circle
      }
    }
  }

  // renderShop(): redraws the shop bar (the chosen tower has a white border, towers we
  // cannot afford are dimmed).
  renderShop() {
    const g = this.shopGfx;
    g.clear();
    g.fillStyle(0x0d1017, 1);
    g.fillRect(0, MAP_H, WIDTH, SHOP_H);
    TOWERS.forEach((t, i) => {
      const r = this.shopRects[i];
      const sel = this.selected === i;
      const afford = this.gold >= t.cost;
      g.fillStyle(sel ? 0x2b3a55 : 0x1a2030, 1);
      g.fillRect(r.x, r.y, r.w, r.h);
      g.lineStyle(sel ? 3 : 1, sel ? 0xffffff : 0x44506a, 1);
      g.strokeRect(r.x, r.y, r.w, r.h);
      this.shopIcons[i].setAlpha(afford ? 1 : 0.35);   // dim the picture when we cannot afford the tower
      this.shopTexts[i].setColor(afford ? "#ffffff" : "#777777");
    });
  }

  // updateHud(): rewrites the numbers and text at the top left (gold, lives, wave, upgrade bonuses).
  updateHud() {
    const m = this.mods;
    const next = Math.ceil(Math.max(this.wave, 1) / UPGRADE_EVERY) * UPGRADE_EVERY;   // wave of the next upgrade
    const upLine = next < MAX_WAVES ? `Next upgrade after wave ${next}` : `Final wave: defeat the Grand Boss!`;
    this.hudGold.setText(`${this.gold}`);
    this.hudLives.setText(`${Math.max(this.lives, 0)}`);
    this.hudWave.setText(`${this.wave}/${MAX_WAVES}`);
    this.hudInfo.setText(
      upLine + "\n" +
      `Dmg +${Math.round((m.dmg - 1) * 100)}%  Speed +${Math.round((1 / m.rate - 1) * 100)}%  ` +
      `Range +${Math.round((m.range - 1) * 100)}%  Gold +${Math.round((m.bounty - 1) * 100)}%`
    );
    this.renderShop();                                  // the shop colours depend on our gold
  }

  // banner(): shows a message in the middle top of the screen for "ms" milliseconds.
  banner(text, ms = 1800) {
    const t = this.add.text(WIDTH / 2, 70, text, {
      fontFamily: "monospace", fontSize: "26px", color: "#ffffff", align: "center",
      backgroundColor: "#000000aa", padding: { x: 14, y: 8 },
    }).setOrigin(0.5, 0).setDepth(15);
    this.time.delayedCall(ms, () => t.destroy());       // remove it again after ms milliseconds
  }

  // victory(): the player beat the Grand Boss and wins the game.
  victory() {
    this.over = true; this.won = true; this.overAt = this.now;
    this.time.removeAllEvents();                        // stop all timers
    this.add.text(WIDTH / 2, MAP_H / 2,
      `VICTORY!\nYou defeated the Grand Boss\nand survived all ${MAX_WAVES} waves\n\n go back to the wiki page to play again!`,
      { fontFamily: "monospace", fontSize: "34px", color: "#ffe066", align: "center",
        backgroundColor: "#000000dd", padding: { x: 24, y: 16 } }
    ).setOrigin(0.5).setDepth(40);
  }

  // gameOver(): the player ran out of lives. A click starts a new game (see onClick).
  gameOver() {
    this.over = true; this.overAt = this.now;
    this.time.removeAllEvents();                        // stop all timers
    this.add.text(WIDTH / 2, MAP_H / 2,
      `GAME OVER\nYou reached wave ${this.wave}\nClick to restart`,
      { fontFamily: "monospace", fontSize: "36px", color: "#ffffff", align: "center",
        backgroundColor: "#000000cc", padding: { x: 20, y: 14 } }
    ).setOrigin(0.5).setDepth(40);
  }
}

// ======================= Start the game =======================
// First the pictures are prepared, then the Phaser game is created inside the <div id="game"> of play.html.
// Phaser.Scale.FIT makes the game shrink or grow to fit the box while keeping its shape.
loadPictures().then(() => new Phaser.Game({
  type: Phaser.AUTO,                     // use WebGL if possible, otherwise canvas
  width: WIDTH,
  height: HEIGHT,
  parent: "game",                        // the id of the HTML element that holds the game
  backgroundColor: "#12151c",
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [Game],                         // the list of scenes: we only have one
}));