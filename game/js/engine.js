/* ============================================================
   جنگ سلسله — موتور بازی (اقتصاد، جنگ، فتح، هوش مصنوعی، گزارش شبانه)
   ============================================================ */

const SAVE_KEY = 'jang-selseleh-save-v1';

/* ---------- ابزارها ---------- */
function faNum(n) {
  if (typeof n === 'number') {
    n = Math.round(n);
  }
  const s = String(n);
  const fa = '۰۱۲۳۴۵۶۷۸۹';
  return s.replace(/[0-9]/g, d => fa[+d]).replace(/\B(?=(\d{3})+(?!\d))/g, '٬');
}
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function rand(a, b) { return a + Math.random() * (b - a); }
function randi(a, b) { return Math.floor(rand(a, b + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

/* ---------- ساخت حکومت ---------- */
function makeKingdom(civId, charName, kingdom, opts = {}) {
  const civ = CIVS.find(c => c.id === civId);
  const t = {};
  LANDS.forEach(l => t[l.id] = 0);
  const army = {};
  TROOPS.forEach(tr => army[tr.id] = 0);
  return {
    isPlayer: !!opts.isPlayer,
    civ: civId,
    charName,
    kingdom,
    color: civ.color,
    gold: opts.gold != null ? opts.gold : 0,
    buildings: { mine: 0, market: 0, caravan: 0, port: 0 },
    castle: 1,
    defense: 1,
    army,
    satisfaction: opts.satisfaction != null ? opts.satisfaction : 60,
    morale: 50,
    security: 50,
    reputation: 50,
    heroes: [],
    shield: 0,
    territory: t,
    stats: { wins: 0, losses: 0, raids: 0, lastBattle: null, captured: 0 },
    temp: { incomePct: 0, armyPowerPct: 0, defensePct: 0, siegePct: 0 },
    tempDays: { armyPower: 0, defense: 0 },
    alive: true,
    aggression: rand(0.3, 0.9),
    homelandFallen: false,
  };
}

/* ---------- وضعیت کلی بازی ---------- */
function newGame(choice) {
  const state = {
    day: 1,
    season: 1,
    over: false,
    winner: null,
    player: makeKingdom(choice.civ, choice.charName, choice.kingdom, { isPlayer: true, gold: START_GOLD }),
    ai: [],
    news: [],
    log: [],
    history: [],
    pendingEvents: [],
    lastReport: null,
  };
  // ساخت ۶ حریف هوش مصنوعی (هر تمدن یک پادشاه)
  CIVS.forEach(civ => {
    if (civ.id === choice.civ) {
      // حریف هم‌تیره با شخصیت و حکومت متفاوت
      const chars = CHARACTERS[civ.id].filter(n => n !== choice.charName);
      const kdms = KINGDOMS[civ.id].filter(k => k !== choice.kingdom);
      state.ai.push(makeKingdom(civ.id, pick(chars), pick(kdms), { gold: START_GOLD }));
    } else {
      state.ai.push(makeKingdom(civ.id, pick(CHARACTERS[civ.id]), pick(KINGDOMS[civ.id]), { gold: START_GOLD }));
    }
  });
  state.player.gold -= KINGDOM_COST;
  state.player.stats.lastBattle = null;
  addNews(state, '🌍', `فصل ${faNum(state.season)} آغاز شد! جهان در انتظار ظهور یک امپراتور است.`);
  addLog(state, `شما با شخصیت «${choice.charName}» و حکومت «${choice.kingdom}» وارد جهان شدید.`);
  addLog(state, `۱۰۰٬۰۰۰ سکه برای خرید حکومت پرداخت شد.`);
  return state;
}

function allKings(state) { return [state.player, ...state.ai]; }
function findKing(state, name) { return allKings(state).find(k => k.charName === name); }

/* ---------- درآمد ---------- */
function buildingCount(k) {
  return k.buildings.mine + k.buildings.market + k.buildings.caravan + k.buildings.port;
}
function maxBuildingPerType(k) {
  return k.castle >= 20 ? BUILDING_MAX_CASTLE20 : BUILDING_MAX_BASE;
}
function civBonus(k, key) {
  const civ = CIVS.find(c => c.id === k.civ);
  return (civ.bonuses[key] || 0);
}
function heroBonus(k, key) {
  let v = 0;
  k.heroes.forEach(id => {
    const h = HEROES.find(h => h.id === id);
    if (h && h.effects[key]) v += h.effects[key];
  });
  return v;
}
function baseIncome(k) {
  let inc = 0;
  BUILDINGS.forEach(b => inc += (k.buildings[b.id] || 0) * b.income);
  return inc;
}
function computeIncome(k) {
  const inc = baseIncome(k);
  const mult = (1 + civBonus(k, 'income'))
    + heroBonus(k, 'income') / 100
    + (k.temp.incomePct || 0) / 100
    - (k.temp.siegePct || 0) / 100;
  return Math.round(inc * mult);
}

/* ---------- ارتش ---------- */
function armyCount(k) {
  let n = 0;
  TROOPS.forEach(t => n += (k.army[t.id] || 0));
  return n;
}
function armyPower(k) {
  let p = 0;
  TROOPS.forEach(t => p += (k.army[t.id] || 0) * t.power / 100);
  return p;
}
function capacity(k) {
  let m = 1;
  if (k.castle >= 6) m = 1.2;
  if (k.castle >= 11) m = 1.4;
  if (k.castle >= 16) m = 1.6;
  if (k.castle >= 20) m = 2.0;
  return Math.round(5000 * m);
}
function satisfactionPowerMod(k) {
  const s = k.satisfaction;
  if (s >= 85) return 0.10;
  if (s >= 70) return 0.05;
  if (s <= 15) return -0.10;
  if (s <= 30) return -0.05;
  return 0;
}
function moralePowerMod(k) {
  return k.morale >= 70 ? 0.05 : (k.morale <= 30 ? -0.05 : 0);
}
function homelandFallen(k) {
  return !!k.homelandFallen;
}
function updateHomelandFlags(state) {
  allKings(state).forEach(k => {
    const own = k.territory[k.civ] || 0;
    const others = ownersShare(state, k.civ, k);
    k.homelandFallen = own <= 0 && neutralShare(state, k.civ) <= 0 && others >= 100;
  });
}
function attackPower(k, opts = {}) {
  let p = armyPower(k);
  let b = civBonus(k, 'attack') + heroBonus(k, 'attack') / 100
    + satisfactionPowerMod(k) + moralePowerMod(k)
    + (k.temp.armyPowerPct || 0) / 100;
  if (homelandFallen(k)) b -= 0.20;
  if (opts.strategy === 'full') b += 0.10;
  if (opts.strategy === 'cautious') b -= 0.10;
  return p * (1 + b);
}
function defensePower(k) {
  let p = armyPower(k);
  let b = civBonus(k, 'defense') + heroBonus(k, 'defense') / 100
    + (k.defense - 1) * 0.05
    + (k.castle >= 10 ? 0.05 : 0) + (k.castle >= 20 ? 0.10 : 0)
    + satisfactionPowerMod(k) + moralePowerMod(k)
    + (k.temp.defensePct || 0) / 100;
  if (homelandFallen(k)) b -= 0.20;
  return p * (1 + b);
}

/* ---------- مالکیت سرزمین‌ها ---------- */
function ownersShare(state, landId, exclude) {
  let s = 0;
  allKings(state).forEach(k => {
    if (exclude && exclude === k) return;
    s += (k.territory[landId] || 0);
  });
  return s;
}
function neutralShare(state, landId) {
  return clamp(100 - ownersShare(state, landId), 0, 100);
}
function landOwners(state, landId) {
  const list = [];
  allKings(state).forEach(k => {
    if (k.territory[landId] > 0) list.push({ king: k, share: k.territory[landId] });
  });
  list.sort((a, b) => b.share - a.share);
  return list;
}
function landOwnerLabel(state, landId) {
  const o = landOwners(state, landId);
  const land = LANDS.find(l => l.id === landId);
  const neu = neutralShare(state, landId);
  if (neu >= 100) return `${land.flag} ${land.name} (آزاد)`;
  const parts = [];
  if (neu > 0) parts.push(`${faNum(neu)}٪ آزاد`);
  o.forEach(x => parts.push(`${faNum(x.share)}٪ ${x.king.kingdom}`));
  return `${land.flag} ${land.name}: ${parts.join('، ')}`;
}

/* ---------- قدرت دفاع بومی یک سرزمین ---------- */
function nativePower(state, landId) {
  const land = LANDS.find(l => l.id === landId);
  const neu = neutralShare(state, landId);
  const scale = 600 + state.day * 120; // با گذر زمان قوی‌تر
  return scale * (neu / 100);
}
function landDefenderPower(state, landId, attacker) {
  let p = nativePower(state, landId);
  const owners = landOwners(state, landId);
  owners.forEach(o => {
    if (o.king === attacker) return;
    let d = defensePower(o.king) * (o.share / 100);
    if (o.king.civ === landId) d *= 1.15; // مزیت دفاع از سرزمین مادری
    p += d;
  });
  return p;
}

/* ---------- نتیجه نبرد ---------- */
function resolveBattle(atk, def) {
  const diff = (atk - def) / Math.max(def, 1);
  if (diff >= 0.40) return { tier: 'decisive', gain: 30, atkLoss: 0.06, defLoss: 0.25 };
  if (diff >= 0.15) return { tier: 'normal', gain: 20, atkLoss: 0.12, defLoss: 0.16 };
  if (diff >= 0.05) return { tier: 'hard', gain: 12, atkLoss: 0.22, defLoss: 0.12 };
  if (diff >= -0.05) return { tier: 'stalemate', gain: 0, atkLoss: 0.18, defLoss: 0.14 };
  if (diff >= -0.50) return { tier: 'loss', gain: 0, atkLoss: 0.30, defLoss: 0.06 };
  return { tier: 'disaster', gain: 0, atkLoss: 0.45, defLoss: 0.03 };
}
const TIER_NAME = {
  decisive: 'پیروزی قاطع',
  normal: 'پیروزی',
  hard: 'پیروزی سخت',
  stalemate: 'بن‌بست',
  loss: 'شکست',
  disaster: 'شکست فاجعه‌بار',
};
function applyTroopLoss(k, pct) {
  TROOPS.forEach(t => {
    const c = k.army[t.id] || 0;
    k.army[t.id] = Math.max(0, Math.round(c * (1 - pct)));
  });
}

/* ---------- حمله تصرف ---------- */
function doCapture(state, landId, opts = {}) {
  const k = state.player;
  const land = LANDS.find(l => l.id === landId);
  const distance = distancePenalty(k.civ, landId);
  let atk = attackPower(k, opts) * (1 - distance);
  let def = landDefenderPower(state, landId, k);
  const r = resolveBattle(atk, def);
  const strategyLoss = opts.strategy === 'full' ? 1.1 : (opts.strategy === 'cautious' ? 0.9 : 1);
  applyTroopLoss(k, clamp(r.atkLoss * strategyLoss, 0, 1));

  let txt = '';
  if (r.gain > 0) {
    // کاهش سهم‌های موجود (اول مناطق آزاد، بعد بزرگ‌ترین مالک رقیب)
    let toTake = r.gain;
    let neu = neutralShare(state, landId);
    const takeFromNeu = Math.min(toTake, neu);
    toTake -= takeFromNeu;
    const owners = landOwners(state, landId).filter(o => o.king !== k);
    owners.forEach(o => {
      if (toTake <= 0) return;
      const take = Math.min(toTake, o.share);
      o.king.territory[landId] = clamp(o.king.territory[landId] - take, 0, 100);
      toTake -= take;
    });
    k.territory[landId] = clamp((k.territory[landId] || 0) + r.gain, 0, 100);
    k.stats.wins += 1;
    k.stats.lastBattle = 'win';
    k.stats.captured += r.gain;
    k.satisfaction = clamp(k.satisfaction + 2, 0, 100);
    txt = `${TIER_NAME[r.tier]}! ⚔️ شما ${faNum(r.gain)}٪ از ${land.name} را تصرف کردید.`;
    addNews(state, '⚔️', `${k.kingdom} ${faNum(r.gain)}٪ از سرزمین ${land.name} را تصرف کرد.`);
    checkLandFall(state, landId);
    updateHomelandFlags(state);
  } else if (r.tier === 'stalemate') {
    k.stats.lastBattle = 'stalemate';
    txt = `⚖️ بن‌بست! هیچ تصرفی انجام نشد اما هر دو طرف تلفات دادند.`;
    addNews(state, '⚔️', `نبرد ${k.kingdom} در ${land.name} به بن‌بست رسید.`);
  } else {
    k.stats.losses += 1;
    k.stats.lastBattle = 'loss';
    k.satisfaction = clamp(k.satisfaction - (r.tier === 'disaster' ? 6 : 3), 0, 100);
    txt = `${TIER_NAME[r.tier]}! 😞 ارتش شما عقب‌نشینی کرد.`;
    addNews(state, '🛡️', `حمله ${k.kingdom} به ${land.name} دفع شد.`);
  }
  return { txt, result: r, land: land.name };
}

/* ---------- حمله غارت ---------- */
function doRaid(state, landId) {
  const k = state.player;
  const land = LANDS.find(l => l.id === landId);
  const owners = landOwners(state, landId).filter(o => o.king !== k);
  const target = owners[0] || null;
  const neu = neutralShare(state, landId);
  const dist = distancePenalty(k.civ, landId);
  let atk = attackPower(k) * (1 - dist) * 0.85;
  let def;
  if (target) def = defensePower(target.king) * (target.share / 100) * 0.8;
  else def = nativePower(state, landId) * 0.7;
  const r = resolveBattle(atk, def);
  applyTroopLoss(k, clamp(r.atkLoss * 0.7, 0, 1));
  let txt;
  if (r.gain > 0 || r.tier === 'decisive' || r.tier === 'normal') {
    const steal = target ? Math.round(target.king.gold * rand(0.05, 0.15)) : Math.round(300000 + state.day * 20000);
    const got = Math.min(steal, target ? target.king.gold : steal);
    k.gold += got;
    if (target) target.king.gold -= got;
    k.stats.raids += 1;
    k.stats.lastBattle = 'win';
    txt = `💰 غارت موفق! شما ${faNum(got)} طلا از ${target ? target.king.kingdom : land.name} به دست آوردید.`;
    addNews(state, '💰', `${k.kingdom} بخشی از خزانه ${target ? target.king.kingdom : land.name} را غارت کرد.`);
  } else {
    k.stats.lastBattle = 'loss';
    txt = `😞 غارت ناموفق بود و بخشی از نیروهای شما کشته شدند.`;
  }
  return { txt, result: r };
}

/* ---------- محاصره ---------- */
function doSiege(state, targetKing) {
  const k = state.player;
  k.gold -= 50000;
  const atk = attackPower(k) * 0.9;
  const def = defensePower(targetKing);
  const r = resolveBattle(atk, def);
  let txt;
  if (r.tier !== 'loss' && r.tier !== 'disaster' && r.tier !== 'stalemate') {
    targetKing.temp.siegePct = 10 + Math.round(rand(0, 20));
    targetKing.satisfaction = clamp(targetKing.satisfaction - 2, 0, 100);
    txt = `⛓️ محاصره موفق! درآمد ${targetKing.kingdom} برای یک روز ${faNum(targetKing.temp.siegePct)}٪ کاهش یافت.`;
    addNews(state, '⛓️', `${k.kingdom} حکومت ${targetKing.kingdom} را محاصره کرد.`);
  } else {
    txt = `🛡️ محاصره شکسته شد و دشمن ایستادگی کرد.`;
  }
  applyTroopLoss(k, clamp(r.atkLoss * 0.5, 0, 1));
  return { txt, result: r };
}

/* ---------- ترور ---------- */
function doAssassinate(state, targetKing) {
  const k = state.player;
  k.gold -= 250000;
  const chance = 0.45 + heroBonus(k, 'assassination') / 100 + k.security / 200 - targetKing.security / 200;
  let txt;
  if (Math.random() < chance) {
    targetKing.satisfaction = clamp(targetKing.satisfaction - 10, 0, 100);
    targetKing.morale = clamp(targetKing.morale - 10, 0, 100);
    txt = `🗡️ ترور موفق! روحیه و رضایت مردم ${targetKing.kingdom} به شدت کاهش یافت.`;
    addNews(state, '🗡️', `فرمانده‌ای بلندپایه در ${targetKing.kingdom} ترور شد.`);
  } else {
    txt = `⛓️ ترور ناکام ماند و مأموران شما دستگیر شدند.`;
    k.reputation = clamp(k.reputation - 4, 0, 100);
  }
  return { txt };
}

/* ---------- حمله مخفی ---------- */
function doSecret(state, landId, opts = {}) {
  const k = state.player;
  k.gold -= 100000;
  const res = doCapture(state, landId, opts);
  const won = res.result.gain > 0;
  let txt;
  if (won) {
    txt = `🥷 ${res.txt} (هویت شما پنهان ماند)`;
    addNews(state, '🥷', `حمله‌ای ناشناس ${faNum(res.result.gain)}٪ از سرزمین ${res.land} را تصرف کرد.`);
  } else {
    k.reputation = clamp(k.reputation - 5, 0, 100);
    txt = `🥷 حمله مخفی شکست خورد و هویت شما فاش شد! ${res.txt}`;
    addNews(state, '📢', `مشخص شد حمله مخفی به ${res.land} کار ${k.kingdom} بوده است.`);
  }
  return { txt, result: res.result };
}

/* ---------- فاصله جغرافیایی ---------- */
const ADJ = {
  iran: ['rome', 'arabia', 'scandi', 'korea'],
  rome: ['iran', 'scandi', 'europe', 'arabia'],
  scandi: ['rome', 'europe', 'iran'],
  arabia: ['iran', 'rome', 'korea'],
  korea: ['iran', 'arabia'],
  europe: ['rome', 'scandi'],
};
function distancePenalty(fromCiv, toLand) {
  if (fromCiv === toLand) return 0;
  if (ADJ[fromCiv] && ADJ[fromCiv].includes(toLand)) return 0.05;
  return 0.15;
}

/* ---------- سقوط سرزمین ---------- */
function checkLandFall(state, landId) {
  const land = LANDS.find(l => l.id === landId);
  const owners = landOwners(state, landId);
  if (owners.length === 1 && owners[0].share >= 100) {
    const owner = owners[0].king;
    addNews(state, '🏴', `سرزمین ${land.name} سقوط کرد! مالک جدید: ${owner.kingdom}.`);
    allKings(state).forEach(k => {
      if (k.civ === landId && k !== owner) {
        k.satisfaction = clamp(k.satisfaction - 30, 0, 100);
        k.temp.defensePct = (k.temp.defensePct || 0) - 50;
        k.temp.incomePct = (k.temp.incomePct || 0) - 50;
      }
    });
  }
}

/* ---------- اعمال اثر رخداد ---------- */
function applyEffect(k, e, state) {
  if (!e) return;
  if (e.gold) k.gold = Math.max(0, k.gold + e.gold);
  if (e.goldChance) {
    const roll = Math.random();
    const won = roll > 0.4;
    if (won) k.gold += e.goldChance;
    else if (state) addLog(state, `📉 سرمایه‌گذاری پرریسک ناموفق بود و چیزی عاید نشد.`);
  }
  if (e.satisfaction) k.satisfaction = clamp(k.satisfaction + e.satisfaction, 0, 100);
  if (e.morale) k.morale = clamp(k.morale + e.morale, 0, 100);
  if (e.security) k.security = clamp(k.security + e.security, 0, 100);
  if (e.reputation) k.reputation = clamp(k.reputation + e.reputation, 0, 100);
  if (e.incomePct) k.temp.incomePct = (k.temp.incomePct || 0) + e.incomePct;
  if (e.todayIncomePct) k.temp.incomePct = (k.temp.incomePct || 0) + e.todayIncomePct;
  if (e.armyPowerPct) { k.temp.armyPowerPct = (k.temp.armyPowerPct || 0) + e.armyPowerPct; k.tempDays.armyPower = 1; }
  if (e.defensePct) { k.temp.defensePct = (k.temp.defensePct || 0) + e.defensePct; k.tempDays.defense = 1; }
  if (e.troops) {
    TROOPS.forEach(t => {
      if (e.troops[t.id]) k.army[t.id] = (k.army[t.id] || 0) + e.troops[t.id];
    });
  }
}

/* ---------- اخبار و گزارش ---------- */
function addNews(state, icon, text) {
  state.news.unshift({ day: state.day, icon, text });
  if (state.news.length > 200) state.news.pop();
}
function addLog(state, text) {
  state.log.unshift({ day: state.day, text });
  if (state.log.length > 200) state.log.pop();
}

/* ---------- خریدها ---------- */
function buyTroops(state, troopId, count) {
  const k = state.player;
  const t = TROOPS.find(x => x.id === troopId);
  const cost = Math.round(t.price * count / 100);
  if (k.gold < cost) return { ok: false, msg: 'طلا کافی نیست!' };
  if (armyCount(k) + count > capacity(k)) return { ok: false, msg: 'ظرفیت ارتش پر است! قلعه را ارتقا دهید.' };
  k.gold -= cost;
  k.army[troopId] = (k.army[troopId] || 0) + count;
  return { ok: true, msg: `${faNum(count)} ${t.name} خریداری شد.` };
}
function buyBuilding(state, bId) {
  const k = state.player;
  const b = BUILDINGS.find(x => x.id === bId);
  if (k.buildings[bId] >= maxBuildingPerType(k)) return { ok: false, msg: 'حداکثر تعداد این ساختمان ساخته شده!' };
  if (k.gold < b.cost) return { ok: false, msg: 'طلا کافی نیست!' };
  k.gold -= b.cost;
  k.buildings[bId] += 1;
  return { ok: true, msg: `${b.name} ساخته شد.` };
}
function upgradeCastle(state) {
  const k = state.player;
  if (k.castle >= CASTLE_LEVELS) return { ok: false, msg: 'قلعه در بالاترین سطح است!' };
  const cost = castleUpgradeCost(k.castle);
  if (k.gold < cost) return { ok: false, msg: 'طلا کافی نیست!' };
  k.gold -= cost;
  k.castle += 1;
  if (k.castle === 20) addNews(state, '🏰', `${k.kingdom} به «قلعه امپراتوری» دست یافت!`);
  return { ok: true, msg: `قلعه به سطح ${faNum(k.castle)} ارتقا یافت.` };
}
function upgradeDefense(state) {
  const k = state.player;
  if (k.defense >= DEFENSE_LEVELS) return { ok: false, msg: 'دیوار دفاعی در بالاترین سطح است!' };
  const cost = defenseUpgradeCost(k.defense);
  if (k.gold < cost) return { ok: false, msg: 'طلا کافی نیست!' };
  k.gold -= cost;
  k.defense += 1;
  return { ok: true, msg: `دیوار دفاعی به سطح ${faNum(k.defense)} ارتقا یافت.` };
}
function buyHero(state, heroId) {
  const k = state.player;
  const h = HEROES.find(x => x.id === heroId);
  if (k.heroes.includes(heroId)) return { ok: false, msg: 'این قهرمان را قبلاً خریده‌اید!' };
  if (k.gold < h.cost) return { ok: false, msg: 'طلا کافی نیست!' };
  const legends = k.heroes.filter(id => HEROES.find(x => x.id === id).tier === 'legend').length;
  if (h.tier === 'legend' && legends >= 1) return { ok: false, msg: 'فقط یک قهرمان افسانه‌ای می‌توانید داشته باشید!' };
  k.gold -= h.cost;
  k.heroes.push(heroId);
  return { ok: true, msg: `${h.name} به خدمت شما درآمد.` };
}
function buyShield(state, shieldId) {
  const k = state.player;
  const s = SHIELDS.find(x => x.id === shieldId);
  if (k.gold < s.cost) return { ok: false, msg: 'طلا کافی نیست!' };
  k.gold -= s.cost;
  k.shield += s.days;
  return { ok: true, msg: `سپر دفاعی ${faNum(s.days)} روز فعال شد.` };
}

/* ---------- گزارش شبانه ---------- */
function rankings(state) {
  const r = {};
  const kings = allKings(state).filter(k => k.alive);
  r.richest = [...kings].sort((a, b) => b.gold - a.gold)[0];
  r.income = [...kings].sort((a, b) => computeIncome(b) - computeIncome(a))[0];
  r.satisfaction = [...kings].sort((a, b) => b.satisfaction - a.satisfaction)[0];
  r.army = [...kings].sort((a, b) => armyPower(b) - armyPower(a))[0];
  r.territory = [...kings].sort((a, b) => totalTerritory(b) - totalTerritory(a))[0];
  r.attacker = [...kings].sort((a, b) => b.stats.wins - a.stats.wins)[0];
  r.defender = [...kings].sort((a, b) => b.stats.losses - a.stats.losses)[0];
  return r;
}
function totalTerritory(k) {
  let s = 0;
  LANDS.forEach(l => s += (k.territory[l.id] || 0));
  return s;
}

/* ---------- پایان روز ---------- */
function processDay(state) {
  const k = state.player;
  // ۱) پرداخت درآمد
  const inc = computeIncome(k);
  k.gold += inc;
  // رضایت بالا => کمک مردمی
  if (k.satisfaction >= 80) {
    const gift = Math.round(inc * 0.03);
    k.gold += gift;
    addLog(state, `🎁 مردم به پاس رضایت، ${faNum(gift)} طلا به خزانه اهدا کردند.`);
  }
  addLog(state, `🌙 درآمد روزانه: ${faNum(inc)} طلا به خزانه واریز شد.`);

  // ۲) سپر و اثرات موقت
  if (k.shield > 0) { k.shield -= 1; if (k.shield === 0) addLog(state, '🛡️ سپر دفاعی شما منقضی شد.'); }
  resetTemp(k);

  // پرداخت درآمد حریفان و پاک‌سازی اثراتشان
  state.ai.forEach(ai => {
    if (!ai.alive) return;
    ai.gold += computeIncome(ai);
    if (ai.shield > 0) ai.shield -= 1;
    resetTemp(ai);
  });

  // ۳) حرکت حریفان
  aiTurn(state);

  // ۴) رخدادهای جهانی
  maybeGlobalEvent(state);

  // ۵) رتبه‌بندی شبانه
  const r = rankings(state);
  const report = buildReport(state, r, inc);
  state.lastReport = report;
  award(state, r);

  // ۶) رخدادهای بازیکن برای فردا
  queuePlayerEvents(state);

  // ۷) رضایت و شورش
  driftSatisfaction(state);
  checkRebellion(state);

  // ۸) روز بعد
  state.day += 1;
  if (state.day > SEASON_DAYS) {
    endSeason(state);
  } else {
    checkWin(state);
  }
  saveState(state);
  return report;
}

function resetTemp(k) {
  k.temp = { incomePct: 0, armyPowerPct: 0, defensePct: 0, siegePct: 0 };
  k.tempDays.armyPower = 0;
  k.tempDays.defense = 0;
}
function driftSatisfaction(state) {
  const k = state.player;
  if (k.satisfaction > 60) k.satisfaction = clamp(k.satisfaction - 1, 0, 100);
  else if (k.satisfaction < 60) k.satisfaction = clamp(k.satisfaction + 1, 0, 100);
}
function checkRebellion(state) {
  const k = state.player;
  if (k.satisfaction <= 15) {
    const loss = Math.round(armyCount(k) * 0.08);
    applyTroopLoss(k, 0.08);
    k.gold = Math.max(0, k.gold - 300000);
    addLog(state, `🔥 شورش مردمی! ${faNum(loss)} سرباز فرار کردند و بخشی از خزانه غارت شد.`);
    addNews(state, '🔥', `در ${k.kingdom} شورش مردمی رخ داد.`);
  }
}

function buildReport(state, r, inc) {
  return {
    day: state.day,
    income: inc,
    richest: r.richest,
    incomeKing: r.income,
    satisfaction: r.satisfaction,
    army: r.army,
    territory: r.territory,
    attacker: r.attacker,
  };
}
function award(state, r) {
  const k = state.player;
  const prizes = [
    [r.richest, 1000000, 'ثروتمندترین'],
    [r.attacker, 500000, 'بهترین مهاجم'],
    [r.satisfaction, 500000, 'محبوب‌ترین'],
  ];
  prizes.forEach(([w, amount, label]) => {
    if (w === k) {
      k.gold += amount;
      addLog(state, `🏆 جایزه شبانه (${label}): ${faNum(amount)} طلا!`);
    }
  });
}

/* ---------- رخدادهای بازیکن ---------- */
function queuePlayerEvents(state) {
  const k = state.player;
  state.pendingEvents = [];
  // یک نامه روزمره
  const letters = EVENTS.filter(e => e.cat === 'نامه');
  state.pendingEvents.push(pick(letters));
  // یک رخداد شرطی یا تصادفی
  const pool = EVENTS.filter(e => e.cat !== 'نامه' && e.cat !== 'جهانی' && (!e.check || e.check(k)));
  const w = pool.filter(e => !e.check);
  const picked = pick(w.length ? w : pool);
  if (picked) state.pendingEvents.push(picked);
  // احتمال یک رخداد انتخابی
  if (Math.random() < 0.5) {
    const choicePool = EVENTS.filter(e => e.cat === 'انتخاب');
    state.pendingEvents.push(pick(choicePool));
  }
}

/* ---------- رویدادهای جهانی ---------- */
function maybeGlobalEvent(state) {
  if (Math.random() < 0.25) {
    const ev = pick(EVENTS.filter(e => e.cat === 'جهانی'));
    allKings(state).forEach(k => applyEffect(k, ev.choices[0].e, state));
    addNews(state, ev.icon, ev.title + ' — ' + ev.text);
    addLog(state, `${ev.icon} رخداد جهانی: ${ev.text}`);
  }
}

/* ---------- هوش مصنوعی ---------- */
function aiTurn(state) {
  state.ai.forEach(ai => {
    if (!ai.alive) return;
    if (state.day <= PEACE_DAYS) {
      // روزهای صلح: خرید و ساخت
      aiBuild(ai);
      return;
    }
    aiBuild(ai);
    if (Math.random() < ai.aggression * 0.5) {
      // حمله به یک سرزمین
      const landId = pick(LANDS).id;
      aiExpand(state, ai, landId);
    }
    // احتمال حمله به بازیکن
    if (Math.random() < ai.aggression * 0.12 && state.player.alive) {
      aiAttackPlayer(state, ai);
    }
  });
}
function aiBuild(ai) {
  // ساخت ساختمان
  BUILDINGS.forEach(b => {
    if (ai.buildings[b.id] < maxBuildingPerType(ai) && ai.gold >= b.cost && Math.random() < 0.6) {
      ai.gold -= b.cost;
      ai.buildings[b.id] += 1;
    }
  });
  // خرید ارتش
  if (Math.random() < 0.7) {
    const t = pick(TROOPS);
    const count = randi(50, 200);
    const cost = Math.round(t.price * count / 100);
    if (ai.gold >= cost && armyCount(ai) + count <= capacity(ai)) {
      ai.gold -= cost;
      ai.army[t.id] = (ai.army[t.id] || 0) + count;
    }
  }
  // ارتقای قلعه
  if (ai.castle < 10 && ai.gold >= castleUpgradeCost(ai.castle) * 2 && Math.random() < 0.4) {
    ai.gold -= castleUpgradeCost(ai.castle);
    ai.castle += 1;
  }
}
function aiExpand(state, ai, landId) {
  const dist = distancePenalty(ai.civ, landId);
  const atk = attackPower(ai) * (1 - dist) * 0.7;
  const def = landDefenderPower(state, landId, ai);
  const r = resolveBattle(atk, def);
  applyTroopLoss(ai, clamp(r.atkLoss, 0, 1));
  if (r.gain > 0) {
    let toTake = r.gain;
    const neu = neutralShare(state, landId);
    toTake -= Math.min(toTake, neu);
    landOwners(state, landId).filter(o => o.king !== ai).forEach(o => {
      if (toTake <= 0) return;
      const take = Math.min(toTake, o.share);
      o.king.territory[landId] = clamp(o.king.territory[landId] - take, 0, 100);
      toTake -= take;
    });
    ai.territory[landId] = clamp((ai.territory[landId] || 0) + r.gain, 0, 100);
    addNews(state, '⚔️', `${ai.kingdom} ${faNum(r.gain)}٪ از سرزمین ${LANDS.find(l => l.id === landId).name} را تصرف کرد.`);
    checkLandFall(state, landId);
    updateHomelandFlags(state);
  }
}
function aiAttackPlayer(state, ai) {
  const k = state.player;
  if (k.shield > 0) {
    addNews(state, '🛡️', `حمله ${ai.kingdom} به ${k.kingdom} به دلیل سپر دفاعی دفع شد.`);
    addLog(state, `🛡️ حمله ${ai.kingdom} توسط سپر دفاعی دفع شد.`);
    return;
  }
  const atk = attackPower(ai) * 0.8;
  const def = defensePower(k) * (k.civ === ai.civ ? 1.1 : 1.0) * 1.05; // مزیت خانه
  const r = resolveBattle(atk, def);
  if (r.gain > 0 || r.tier === 'decisive' || r.tier === 'normal') {
    // بازیکن می‌بازد: از دست دادن بخشی از قلمرو در سرزمین مادری بازیکن یا تصادفی
    const targetLand = k.territory[k.civ] > 0 ? k.civ : pick(LANDS).id;
    const lose = Math.min(k.territory[targetLand], r.gain);
    if (lose > 0) {
      k.territory[targetLand] = clamp(k.territory[targetLand] - lose, 0, 100);
      ai.territory[targetLand] = clamp((ai.territory[targetLand] || 0) + lose, 0, 100);
      addNews(state, '⚔️', `${ai.kingdom} ${faNum(lose)}٪ از قلمرو ${k.kingdom} را تصرف کرد.`);
      addLog(state, `😞 ${ai.kingdom} ${faNum(lose)}٪ از قلمرو شما را گرفت.`);
    }
    k.stats.losses += 1;
    k.stats.lastBattle = 'loss';
    k.satisfaction = clamp(k.satisfaction - 2, 0, 100);
  } else {
    addNews(state, '🛡️', `حمله ${ai.kingdom} به ${k.kingdom} دفع شد.`);
    addLog(state, `🛡️ حمله ${ai.kingdom} را دفع کردید.`);
    k.stats.wins += 1;
    k.stats.lastBattle = 'win';
  }
  applyTroopLoss(ai, clamp(r.atkLoss, 0, 1));
  applyTroopLoss(k, clamp(r.defLoss * 0.7, 0, 1));
  updateHomelandFlags(state);
}

/* ---------- برد و پایان فصل ---------- */
function checkWin(state) {
  const k = state.player;
  const all = LANDS.every(l => (k.territory[l.id] || 0) >= 100);
  if (all) {
    state.over = true;
    state.winner = k;
    addNews(state, '👑', `${k.kingdom} تمام شش سرزمین جهان را فتح کرد و «فاتح جهان» شد!`);
    saveState(state);
  }
}
function endSeason(state) {
  state.over = true;
  state.winner = null;
  const k = state.player;
  state.history.push({ season: state.season, winner: state.winner ? state.winner.kingdom : null, playerTerritory: totalTerritory(k), player: k.kingdom });
  addNews(state, '🏁', `فصل ${faNum(state.season)} به پایان رسید.`);
  saveState(state);
}

/* ---------- ذخیره و بارگذاری ---------- */
function saveState(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (e) { /* ignore */ }
}
function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s.player || !s.ai) return null;
    return s;
  } catch (e) { return null; }
}
function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
}
function hasSave() { return !!loadState(); }
