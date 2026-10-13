// ======================= SETTINGS (change these to rebalance) =======================
const TILE = 48, COLS = 20, ROWS = 12;
const MAP_H = ROWS * TILE, SHOP_H = 84;
const WIDTH = COLS * TILE, HEIGHT = MAP_H + SHOP_H;
const WAYPOINTS = [[0,2],[6,2],[6,8],[12,8],[12,3],[17,3],[17,10],[19,10]]; // [col,row] corners of the path
const START_GOLD = 100, START_LIVES = 15, WAVE_CLEAR_BONUS = 20;
const UPGRADE_EVERY = 4; // you pick an upgrade after every 4th wave

// Which way Barracks troops march along the path:
//  -1 = up the path, towards where enemies enter (they meet enemies head-on)  <- default
//   1 = the same way as the enemies, towards the exit
// Either way, a troop that reaches the end of the path disappears and a new one is sent.
const TROOP_DIRECTION = -1;

// ---------- Towers (press 1-5 or click the shop to choose) ----------
const TOWERS = [
  { name: "Gun",      cost: 50,  range: 150, rate: 500,  dmg: 2,  bulletSpeed: 420, color: 0x4c8dff, bullet: 0xffe066, desc: "Balanced" },
  { name: "Cannon",   cost: 100, range: 130, rate: 1400, dmg: 6,  bulletSpeed: 300, color: 0xff9f43, bullet: 0xff6b35, desc: "Splash",   splash: 60 },
  { name: "Frost",    cost: 75,  range: 120, rate: 900,  dmg: 1,  bulletSpeed: 380, color: 0x4dd0e1, bullet: 0xb2ebf2, desc: "Slows",    slow: 0.5, slowMs: 2000 },
  { name: "Sniper",   cost: 150, range: 300, rate: 2000, dmg: 12, bulletSpeed: 900, color: 0xb388ff, bullet: 0xffffff, desc: "Long range" },
  // Barracks: troops = how many can be alive at once, rate = ms between sending troops (this is also
  // how fast fallen troops are replaced), troopHp / troopSpeed (pixels per second), dmg per hit, hitMs = ms between hits.
  { name: "Barracks", cost: 120, rate: 2500, dmg: 4, color: 0x66bb6a, desc: "Marching troops", troops: 3, troopHp: 40, troopSpeed: 70, hitMs: 600 },
];

// ---------- Enemies (hp is a multiplier of the base 6 hp, which also grows each wave) ----------
// dps = damage per second they deal to a troop that blocks them. lives = lives lost if they reach the exit.
const ENEMY_TYPES = {
  grunt:  { name: "Grunt",  hp: 1,   speed: 80,  reward: 10,  size: 28, color: 0xe5484d, stroke: 0x000000, lives: 1, dps: 5 },
  runner: { name: "Runner", hp: 0.5, speed: 150, reward: 8,   size: 20, color: 0xffa94d, stroke: 0x000000, lives: 1, dps: 3 },
  tank:   { name: "Tank",   hp: 3,   speed: 50,  reward: 25,  size: 38, color: 0x7b4fbf, stroke: 0x000000, lives: 2, dps: 9 },
  brood:  { name: "Brood",  hp: 4,   speed: 60,  reward: 30,  size: 34, color: 0x20b2aa, stroke: 0xffffff, lives: 2, dps: 6, spawns: 3 }, // bursts into 3 minions when killed
  minion: { name: "Minion", hp: 0.4, speed: 100, reward: 3,   size: 16, color: 0xd96ad9, stroke: 0x000000, lives: 1, dps: 3 },
  boss:   { name: "Boss",   hp: 14,  speed: 40,  reward: 120, size: 48, color: 0x1a1a1a, stroke: 0xff4444, lives: 5, dps: 16 },
};

// ---------- Upgrades offered every UPGRADE_EVERY waves (you pick 1 of 3 random ones) ----------
const UPGRADES = [
  { name: "Sharper Bullets", desc: "+35% damage for towers and troops", apply: (s) => { s.mods.dmg *= 1.35; } },
  { name: "Rapid Fire",      desc: "+25% attack speed, troops are sent faster", apply: (s) => { s.mods.rate /= 1.25; } },
  { name: "Eagle Eye",       desc: "+20% range for shooting towers",    apply: (s) => { s.mods.range *= 1.2; } },
  { name: "Bounty Hunter",   desc: "+35% gold from every kill",         apply: (s) => { s.mods.bounty *= 1.35; } },
  { name: "Supply Drop",     desc: "+250 gold right now",               apply: (s) => { s.gold += 250; } },
  { name: "Reinforcements",  desc: "+5 lives",                          apply: (s) => { s.lives += 5; } },
];

// ======================= Path tiles (built from the waypoints) =======================
const pathTiles = new Set();
for (let i = 0; i < WAYPOINTS.length - 1; i++) {
  let [c, r] = WAYPOINTS[i];
  const [c2, r2] = WAYPOINTS[i + 1];
  const dc = Math.sign(c2 - c), dr = Math.sign(r2 - r);
  pathTiles.add(c + "," + r);
  while (c !== c2 || r !== r2) { c += dc; r += dr; pathTiles.add(c + "," + r); }
}
const center = (col, row) => ({ x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 });

// ======================= Path geometry (troops walk along this) =======================
// A position on the path is described by one number: the distance walked from the entrance.
const PATH = WAYPOINTS.map(([c, r]) => center(c, r));
const SEG_LEN = [], SEG_START = [];
let PATH_LEN = 0;
for (let i = 0; i < PATH.length - 1; i++) {
  SEG_START.push(PATH_LEN);
  const len = Math.hypot(PATH[i + 1].x - PATH[i].x, PATH[i + 1].y - PATH[i].y);
  SEG_LEN.push(len);
  PATH_LEN += len;
}

function pointAt(s) {                                   // pixel position for a distance along the path
  s = Math.max(0, Math.min(PATH_LEN, s));
  let i = 0;
  while (i < SEG_LEN.length - 1 && s > SEG_START[i] + SEG_LEN[i]) i++;
  const f = (s - SEG_START[i]) / SEG_LEN[i];
  return {
    x: PATH[i].x + (PATH[i + 1].x - PATH[i].x) * f,
    y: PATH[i].y + (PATH[i + 1].y - PATH[i].y) * f,
  };
}

function nearestOnPath(x, y) {                          // distance along the path of the point closest to (x, y)
  let bestS = 0, bestD = Infinity;
  for (let i = 0; i < SEG_LEN.length; i++) {
    const ax = PATH[i].x, ay = PATH[i].y;
    const bx = PATH[i + 1].x - ax, by = PATH[i + 1].y - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * bx + (y - ay) * by) / (bx * bx + by * by)));
    const d = Math.hypot(ax + bx * t - x, ay + by * t - y);
    if (d < bestD) { bestD = d; bestS = SEG_START[i] + SEG_LEN[i] * t; }
  }
  return bestS;
}

// ======================= The game =======================
class Game extends Phaser.Scene {
  constructor() { super("Game"); }

  create() {
    this.gold = START_GOLD; this.lives = START_LIVES; this.wave = 0; this.now = 0;
    this.enemies = []; this.towers = []; this.bullets = [];
    this.occupied = new Set();
    this.waveList = []; this.spawned = 0; this.waveActive = false;
    this.over = false; this.choosing = false;
    this.offered = []; this.upgradeObjs = []; this.cardRects = [];
    this.selected = 0;
    this.mods = { dmg: 1, rate: 1, range: 1, bounty: 1 }; // global upgrade multipliers

    // Map (drawn once)
    const map = this.add.graphics();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const color = pathTiles.has(c + "," + r) ? 0x8a7a55 : ((c + r) % 2 ? 0x2a452e : 0x2d4a32);
        map.fillStyle(color, 1);
        map.fillRect(c * TILE, r * TILE, TILE, TILE);
      }
    }
    this.overlay = this.add.graphics();            // hover highlight + range preview
    this.bars = this.add.graphics().setDepth(5);   // health bars

    // Shop bar under the map
    this.shopGfx = this.add.graphics().setDepth(10);
    this.shopRects = []; this.shopTexts = [];
    const n = TOWERS.length;
    const bw = (WIDTH - (n + 1) * 8) / n;
    TOWERS.forEach((t, i) => {
      const r = { x: 8 + i * (bw + 8), y: MAP_H + 10, w: bw, h: 64 };
      this.shopRects.push(r);
      this.shopTexts.push(this.add.text(r.x + 52, r.y + 8,
        `${i + 1}. ${t.name}\n${t.cost} gold\n${t.desc}`,
        { fontFamily: "monospace", fontSize: "13px", color: "#ffffff", lineSpacing: 4 }).setDepth(11));
    });

    this.hud = this.add.text(8, 6, "", {
      fontFamily: "monospace", fontSize: "16px", color: "#ffffff",
      backgroundColor: "#00000099", padding: { x: 6, y: 4 },
    }).setDepth(10);
    this.updateHud();

    this.input.on("pointerdown", (p) => this.onClick(p));
    this.input.keyboard.on("keydown", (ev) => this.onKey(ev));
    this.time.delayedCall(1500, () => this.startWave());
  }

  // ----- Waves -----
  buildWave(w) {
    const list = [];
    const add = (type, n) => { for (let i = 0; i < n; i++) list.push(type); };
    add("grunt", 4 + w);
    if (w >= 2) add("runner", w);                              // runners from wave 2
    if (w >= 4) add("tank", Math.floor((w - 2) / 2));          // tanks from wave 4
    if (w >= 4) add("brood", 1 + Math.floor((w - 4) / 3));     // broods from wave 4
    for (let i = list.length - 1; i > 0; i--) {                // shuffle
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    if (w % 5 === 0) add("boss", w / 5);                       // a boss closes every 5th wave
    return list;
  }

  startWave() {
    if (this.over) return;
    this.wave++;
    this.waveList = this.buildWave(this.wave);
    this.spawned = 0;
    this.waveActive = true;
    const delay = Math.max(400, 800 - this.wave * 25);
    this.time.addEvent({ delay, repeat: this.waveList.length - 1, callback: () => this.spawnEnemy() });
    const counts = {};
    this.waveList.forEach((k) => { counts[k] = (counts[k] || 0) + 1; });
    const summary = Object.keys(counts).map((k) => `${counts[k]} ${ENEMY_TYPES[k].name}`).join(", ");
    this.banner(`Wave ${this.wave}\n${summary}`);
    this.updateHud();
  }

  makeEnemy(key, x, y, target, traveled) {
    const d = ENEMY_TYPES[key];
    const hp = Math.round(6 * d.hp * (1 + (this.wave - 1) * 0.3));
    const rect = this.add.rectangle(x, y, d.size, d.size, d.color).setStrokeStyle(2, d.stroke, 0.8);
    const e = { rect, def: d, hp, maxHp: hp, target, traveled, slowUntil: 0, slowFactor: 1, slowed: false, holdUntil: 0, dead: false };
    this.enemies.push(e);
    return e;
  }

  spawnEnemy() {
    const key = this.waveList[this.spawned++];
    const p = center(...WAYPOINTS[0]);
    this.makeEnemy(key, p.x, p.y, 1, 0);
  }

  damage(e, amount) {
    if (e.dead) return;
    e.hp -= amount;
    if (e.hp <= 0) this.killEnemy(e);
  }

  killEnemy(e) {
    if (e.dead) return;
    e.dead = true;
    const x = e.rect.x, y = e.rect.y;
    e.rect.destroy();
    const i = this.enemies.indexOf(e);
    if (i >= 0) this.enemies.splice(i, 1);
    this.gold += Math.round(e.def.reward * this.mods.bounty);
    if (e.def.spawns) {                                        // Brood: burst into minions that keep walking
      for (let k = 0; k < e.def.spawns; k++) {
        this.makeEnemy("minion", x + (Math.random() - 0.5) * 24, y + (Math.random() - 0.5) * 24, e.target, e.traveled);
      }
    }
    this.updateHud();
  }

  // ----- Input -----
  onClick(p) {
    if (this.over) { this.scene.restart(); return; }

    if (this.choosing) {                                // upgrade cards
      for (let i = 0; i < this.cardRects.length; i++) {
        const r = this.cardRects[i];
        if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) { this.pickUpgrade(i); break; }
      }
      return;
    }

    if (p.y >= MAP_H) {                                 // shop buttons
      this.shopRects.forEach((r, i) => {
        if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) this.select(i);
      });
      return;
    }

    const c = Math.floor(p.x / TILE), r = Math.floor(p.y / TILE);
    if (!this.canBuild(c, r)) return;
    const t = TOWERS[this.selected];
    const pos = center(c, r);
    this.add.rectangle(pos.x, pos.y, 34, 34, t.color).setStrokeStyle(3, 0x000000, 0.5);
    const tw = { x: pos.x, y: pos.y, lastShot: 0, type: t };
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

  onKey(ev) {
    const n = parseInt(ev.key, 10);
    if (isNaN(n)) return;
    if (this.choosing) { if (n >= 1 && n <= this.offered.length) this.pickUpgrade(n - 1); return; }
    if (n >= 1 && n <= TOWERS.length) this.select(n - 1);
  }

  select(i) { this.selected = i; this.renderShop(); }

  canBuild(c, r) {
    return c >= 0 && c < COLS && r >= 0 && r < ROWS &&
      !pathTiles.has(c + "," + r) && !this.occupied.has(c + "," + r) &&
      this.gold >= TOWERS[this.selected].cost;
  }

  // ----- Troops -----
  spawnTroop(tw) {
    const t = tw.type;
    const circle = this.add.circle(tw.x, tw.y, 8, 0xa5d6a7).setStrokeStyle(2, 0x1b5e20).setDepth(3);
    // deployed = false while the troop walks from the barracks onto the path
    tw.troops.push({ circle, hp: t.troopHp, maxHp: t.troopHp, s: tw.pathS, deployed: false, done: false, lastHit: 0 });
  }

  // ----- Upgrades -----
  showUpgrades() {
    if (this.over) return;
    this.choosing = true;
    const pool = UPGRADES.slice();
    this.offered = [];
    while (this.offered.length < 3) this.offered.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);

    const dim = this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x000000, 0.65).setOrigin(0).setDepth(30);
    const title = this.add.text(WIDTH / 2, 70,
      `Wave ${this.wave} cleared!\nChoose an upgrade (click it or press 1-3)`,
      { fontFamily: "monospace", fontSize: "26px", color: "#ffffff", align: "center" }).setOrigin(0.5, 0).setDepth(31);
    this.upgradeObjs = [dim, title];
    this.cardRects = [];

    const cw = 260, ch = 190, gap = 30, x0 = (WIDTH - (3 * cw + 2 * gap)) / 2, y0 = 190;
    this.offered.forEach((u, i) => {
      const x = x0 + i * (cw + gap);
      this.cardRects.push({ x, y: y0, w: cw, h: ch });
      const card = this.add.rectangle(x, y0, cw, ch, 0x1f2937).setOrigin(0).setStrokeStyle(3, 0x7aa2ff).setDepth(31);
      const name = this.add.text(x + 16, y0 + 18, `${i + 1}. ${u.name}`,
        { fontFamily: "monospace", fontSize: "22px", color: "#ffe066", wordWrap: { width: cw - 32 } }).setDepth(32);
      const desc = this.add.text(x + 16, y0 + 80, u.desc,
        { fontFamily: "monospace", fontSize: "18px", color: "#ffffff", wordWrap: { width: cw - 32 } }).setDepth(32);
      this.upgradeObjs.push(card, name, desc);
    });
  }

  pickUpgrade(i) {
    const u = this.offered[i];
    if (!u) return;
    u.apply(this);
    this.upgradeObjs.forEach((o) => o.destroy());
    this.upgradeObjs = []; this.cardRects = []; this.offered = [];
    this.choosing = false;
    this.banner(`Upgrade: ${u.name}`, 1500);
    this.updateHud();
    this.time.delayedCall(1800, () => this.startWave());
  }

  // ----- Main loop -----
  update(time, delta) {
    if (this.over) return;
    this.now = time;
    const dt = delta / 1000;

    // Enemies walk the path (frost slows them, troops can hold them in place)
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const slowed = time < e.slowUntil;
      if (slowed !== e.slowed) { e.slowed = slowed; e.rect.setFillStyle(slowed ? 0x8fdcff : e.def.color); }
      if (time < e.holdUntil) continue;                // blocked by a troop
      const speed = e.def.speed * (slowed ? e.slowFactor : 1);
      const t = center(...WAYPOINTS[e.target]);
      const dx = t.x - e.rect.x, dy = t.y - e.rect.y;
      const dist = Math.hypot(dx, dy), step = speed * dt;
      if (dist <= step) {
        e.rect.setPosition(t.x, t.y);
        e.traveled += dist;
        e.target++;
        if (e.target >= WAYPOINTS.length) {            // reached the exit
          e.dead = true;
          e.rect.destroy();
          this.enemies.splice(i, 1);
          this.lives -= e.def.lives;
          this.updateHud();
          if (this.lives <= 0) { this.gameOver(); return; }
        }
      } else {
        e.rect.x += (dx / dist) * step;
        e.rect.y += (dy / dist) * step;
        e.traveled += step;
      }
    }

    // Barracks troops: march along the path; stop and fight when they meet an enemy;
    // disappear at the end of the path; new ones are sent to replace them.
    for (const tw of this.towers) {
      const t = tw.type;
      if (!t.troops) continue;

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
          foe.holdUntil = time + 120;
          tr.hp -= foe.def.dps * dt;
          if (time - tr.lastHit >= t.hitMs * this.mods.rate) {
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
      if (t.troops) continue;
      if (time - tw.lastShot < t.rate * this.mods.rate) continue;
      const range = t.range * this.mods.range;
      let target = null;
      for (const e of this.enemies) {
        if (Math.hypot(e.rect.x - tw.x, e.rect.y - tw.y) <= range && (!target || e.traveled > target.traveled)) target = e;
      }
      if (!target) continue;
      tw.lastShot = time;
      this.bullets.push({
        circle: this.add.circle(tw.x, tw.y, t.splash ? 7 : 5, t.bullet),
        target, def: t, dmg: t.dmg * this.mods.dmg,
      });
    }

    // Bullets chase their target
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      if (b.target.dead) { b.circle.destroy(); this.bullets.splice(i, 1); continue; }
      const dx = b.target.rect.x - b.circle.x, dy = b.target.rect.y - b.circle.y;
      const dist = Math.hypot(dx, dy), step = b.def.bulletSpeed * dt;
      if (dist <= step + 6) {
        this.hit(b);
        b.circle.destroy();
        this.bullets.splice(i, 1);
      } else {
        b.circle.x += (dx / dist) * step;
        b.circle.y += (dy / dist) * step;
      }
    }

    // Wave cleared?
    if (this.waveActive && this.spawned >= this.waveList.length && this.enemies.length === 0) {
      this.waveActive = false;
      this.gold += WAVE_CLEAR_BONUS;
      this.updateHud();
      if (this.wave % UPGRADE_EVERY === 0) {
        this.time.delayedCall(800, () => this.showUpgrades());
      } else {
        this.banner(`Wave ${this.wave} cleared  +${WAVE_CLEAR_BONUS} gold`, 1800);
        this.time.delayedCall(3000, () => this.startWave());
      }
    }

    // Health bars + hover highlight
    this.bars.clear();
    for (const e of this.enemies) {
      const w = Math.max(24, e.def.size), x = e.rect.x - w / 2, y = e.rect.y - e.def.size / 2 - 8;
      this.bars.fillStyle(0x000000, 0.6);
      this.bars.fillRect(x, y, w, 5);
      this.bars.fillStyle(e.slowed ? 0x7fd8ff : 0x46c36b, 1);
      this.bars.fillRect(x, y, w * Math.max(0, e.hp / e.maxHp), 5);
    }
    for (const tw of this.towers) {
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

  hit(b) {
    const d = b.def;
    if (d.splash) {                                     // cannon: damage everything near the impact
      const ix = b.circle.x, iy = b.circle.y;
      for (const e of this.enemies.slice()) {
        if (Math.hypot(e.rect.x - ix, e.rect.y - iy) <= d.splash) this.damage(e, b.dmg);
      }
      const ring = this.add.circle(ix, iy, d.splash, 0xff9f43, 0.25);
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
  drawHover() {
    this.overlay.clear();
    if (this.choosing) return;
    const p = this.input.activePointer;
    const c = Math.floor(p.x / TILE), r = Math.floor(p.y / TILE);
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return;
    const t = TOWERS[this.selected];
    const free = !pathTiles.has(c + "," + r) && !this.occupied.has(c + "," + r);
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
        this.overlay.strokeCircle(pos.x, pos.y, t.range * this.mods.range);
      }
    }
  }

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
      g.fillStyle(t.color, afford ? 1 : 0.35);
      g.fillRect(r.x + 10, r.y + 16, 32, 32);
      this.shopTexts[i].setColor(afford ? "#ffffff" : "#777777");
    });
  }

  updateHud() {
    const m = this.mods;
    const next = Math.ceil(Math.max(this.wave, 1) / UPGRADE_EVERY) * UPGRADE_EVERY;
    this.hud.setText(
      `Gold: ${this.gold}   Lives: ${Math.max(this.lives, 0)}   Wave: ${this.wave}\n` +
      `Next upgrade after wave ${next}\n` +
      `Dmg +${Math.round((m.dmg - 1) * 100)}%  Speed +${Math.round((1 / m.rate - 1) * 100)}%  ` +
      `Range +${Math.round((m.range - 1) * 100)}%  Gold +${Math.round((m.bounty - 1) * 100)}%`
    );
    this.renderShop();
  }

  banner(text, ms = 1800) {
    const t = this.add.text(WIDTH / 2, 70, text, {
      fontFamily: "monospace", fontSize: "26px", color: "#ffffff", align: "center",
      backgroundColor: "#000000aa", padding: { x: 14, y: 8 },
    }).setOrigin(0.5, 0).setDepth(15);
    this.time.delayedCall(ms, () => t.destroy());
  }

  gameOver() {
    this.over = true;
    this.time.removeAllEvents();
    this.add.text(WIDTH / 2, MAP_H / 2,
      `GAME OVER\nYou reached wave ${this.wave}\nClick to restart`,
      { fontFamily: "monospace", fontSize: "36px", color: "#ffffff", align: "center",
        backgroundColor: "#000000cc", padding: { x: 20, y: 14 } }
    ).setOrigin(0.5).setDepth(40);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  width: WIDTH,
  height: HEIGHT,
  parent: "game",
  backgroundColor: "#12151c",
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [Game],
});