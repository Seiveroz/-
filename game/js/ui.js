/* ============================================================
   جنگ سلسله — رابط کاربری
   ============================================================ */

let G = null; // وضعیت فعلی بازی

const UI = {
  setup: { civ: null, char: null, kingdom: null },
  attack: null,
  events: [],
};

/* ---------- تغییر اسکرین ---------- */
function switchScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

/* ---------- توست ---------- */
function toast(msg) {
  const box = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = msg;
  box.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .4s'; setTimeout(() => el.remove(), 400); }, 3400);
}

/* ---------- دکمه موسیقی ---------- */
function updateMusicButton() {
  const btn = document.getElementById('btn-music');
  if (!btn) return;
  btn.textContent = Music.playing ? '🎵' : '🔇';
  btn.title = Music.playing ? 'خاموش کردن موسیقی' : 'روشن کردن موسیقی';
  btn.classList.toggle('gold', Music.playing);
  btn.classList.toggle('ghost', !Music.playing);
}

/* ---------- مودال عمومی ---------- */
function openModal(html, opts = {}) {
  const bd = document.getElementById('modal-backdrop');
  bd.innerHTML = `<div class="modal">${html}</div>`;
  bd.classList.add('open');
  bd.dataset.closable = opts.closable === false ? '0' : '1';
}
function closeModal() {
  const bd = document.getElementById('modal-backdrop');
  bd.classList.remove('open');
  bd.innerHTML = '';
  bd.dataset.closable = '1';
}

/* ============================================================
   انتخاب شخصیت
   ============================================================ */
function renderSetup() {
  UI.setup = { civ: null, char: null, kingdom: null };
  document.getElementById('char-section').style.display = 'none';
  document.getElementById('kingdom-section').style.display = 'none';
  document.getElementById('btn-start').disabled = true;
  const grid = document.getElementById('civ-grid');
  grid.innerHTML = CIVS.map(c => {
    const b = c.bonuses;
    let bonusTxt = '';
    if (b.income) bonusTxt += `💰 درآمد ${faNum(Math.round(b.income * 100))}٪ بیشتر<br>`;
    if (b.satisfaction) bonusTxt += `😊 رضایت مردم ${faNum(b.satisfaction)}٪ بیشتر<br>`;
    if (b.attack) bonusTxt += `⚔️ قدرت حمله ${faNum(Math.round(b.attack * 100))}٪ بیشتر<br>`;
    if (b.defense) bonusTxt += `🛡️ قدرت دفاع ${faNum(Math.round(b.defense * 100))}٪ بیشتر<br>`;
    if (b.trade) bonusTxt += `🐫 تجارت سودآورتر<br>`;
    if (b.buildCheaper) bonusTxt += `🏗️ ساختمان ارزان‌تر<br>`;
    if (b.shipCheaper) bonusTxt += `⛵ کشتی ارزان‌تر<br>`;
    if (b.spy) bonusTxt += `🕵️ جاسوسی قوی‌تر<br>`;
    if (b.alliance) bonusTxt += `🤝 اتحاد مؤثرتر<br>`;
    if (b.cityDefense) bonusTxt += `🏯 دفاع شهری بهتر<br>`;
    return `<div class="civ-card" data-action="select-civ" data-arg="${c.id}">
      <div class="flag">${c.flag}</div>
      <h3>${c.name}</h3>
      <div class="trait">${c.trait}</div>
      <p>${c.desc}</p>
      <div class="bonus">${bonusTxt}</div>
    </div>`;
  }).join('');
}

function selectCiv(civId) {
  UI.setup.civ = civId;
  UI.setup.char = null;
  UI.setup.kingdom = null;
  document.querySelectorAll('.civ-card').forEach(c => c.classList.toggle('selected', c.dataset.arg === civId));
  document.getElementById('char-section').style.display = 'block';
  document.getElementById('kingdom-section').style.display = 'none';
  const cg = document.getElementById('char-grid');
  cg.innerHTML = CHARACTERS[civId].map(n => `<div class="pick-item" data-action="select-char" data-arg="${esc(n)}">${n}</div>`).join('');
  document.getElementById('btn-start').disabled = true;
}

function selectChar(name) {
  UI.setup.char = name;
  UI.setup.kingdom = null;
  document.querySelectorAll('#char-grid .pick-item').forEach(c => c.classList.toggle('selected', c.dataset.arg === name));
  document.getElementById('kingdom-section').style.display = 'block';
  const kg = document.getElementById('kingdom-grid');
  kg.innerHTML = KINGDOMS[UI.setup.civ].map(k => `<div class="pick-item" data-action="select-kingdom" data-arg="${esc(k)}">${k}</div>`).join('');
  document.getElementById('btn-start').disabled = true;
}

function selectKingdom(name) {
  UI.setup.kingdom = name;
  document.querySelectorAll('#kingdom-grid .pick-item').forEach(c => c.classList.toggle('selected', c.dataset.arg === name));
  document.getElementById('btn-start').disabled = !(UI.setup.civ && UI.setup.char && UI.setup.kingdom);
}

function startGame() {
  if (!UI.setup.civ || !UI.setup.char || !UI.setup.kingdom) return;
  G = newGame({ civ: UI.setup.civ, charName: UI.setup.char, kingdom: UI.setup.kingdom });
  saveState(G);
  switchScreen('screen-game');
  renderGame();
  UI.events = [];
  toast('👑 سلطنت شما آغاز شد!');
}

/* ============================================================
   بازی اصلی
   ============================================================ */
function renderGame() {
  renderTopbar();
  renderTab(currentTab);
}

function renderTopbar() {
  const k = G.player;
  const civ = CIVS.find(c => c.id === k.civ);
  document.getElementById('t-avatar').textContent = civ.flag;
  document.getElementById('t-name').textContent = k.charName;
  document.getElementById('t-kingdom').textContent = `${k.kingdom} • ${civ.name}`;
  document.getElementById('t-gold').textContent = faNum(k.gold);
  document.getElementById('t-income').textContent = faNum(computeIncome(k));
  const sEl = document.getElementById('t-satisfaction');
  sEl.textContent = `${faNum(k.satisfaction)}٪`;
  sEl.className = 'val ' + (k.satisfaction >= 70 ? 'good' : k.satisfaction <= 30 ? 'bad' : '');
  document.getElementById('t-army').textContent = faNum(armyCount(k));
  document.getElementById('t-power').textContent = faNum(Math.round(armyPower(k)));
  document.getElementById('t-day').textContent = `روز ${faNum(G.day)}`;
  document.getElementById('t-season').textContent = `فصل ${faNum(G.season)}`;
}

let currentTab = 'map';
function renderTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  const c = document.getElementById('tab-content');
  if (tab === 'map') renderMapTab(c);
  else if (tab === 'kingdom') renderKingdomTab(c);
  else if (tab === 'army') renderArmyTab(c);
  else if (tab === 'heroes') renderHeroesTab(c);
  else if (tab === 'news') renderNewsTab(c);
  else if (tab === 'help') renderHelpTab(c);
}

/* ---------- نقشه ---------- */
function renderMapTab(c) {
  const k = G.player;
  const warNote = G.day <= PEACE_DAYS
    ? `<div class="panel" style="border-color:rgba(230,177,76,.4)">🕊️ <b>روزهای ${faNum(PEACE_DAYS)} اول فصل صلح کامل است</b> و هیچ حمله‌ای ممکن نیست. ارتش بسازید، ساختمان بخرید و آماده جنگ شوید.</div>`
    : `<div class="panel" style="border-color:rgba(94,201,138,.4)">⚔️ <b>جنگ فعال است.</b> روی هر سرزمین کلیک کنید تا حمله کنید. فتح ۱۰۰٪ هر ۶ سرزمین = «فاتح جهان».</div>`;
  const legend = LANDS.map(l => {
    const owners = landOwners(G, l.id);
    const neu = neutralShare(G, l.id);
    let rows = '';
    owners.forEach(o => rows += `<div><span class="dot" style="background:${o.king.color}"></span>${esc(o.king.kingdom)}: ${faNum(o.share)}٪</div>`);
    if (neu > 0) rows += `<div><span class="dot" style="background:#3a435c"></span>سرزمین آزاد: ${faNum(neu)}٪</div>`;
    const mine = owners.find(o => o.king.isPlayer);
    return `<div class="legend-card">
      <div class="lh"><b>${l.flag} ${l.name}</b>${mine ? `<span style="color:var(--gold2);font-size:12px">شما: ${faNum(mine.share)}٪</span>` : ''}</div>
      <div class="legend-owners">${rows || '<span>آزاد</span>'}</div>
    </div>`;
  }).join('');
  c.innerHTML = `
    <div class="grid2">
      <div>
        <div class="map-wrap" id="map-holder">${mapHTML(G)}</div>
        <div class="map-legend">${legend}</div>
      </div>
      <div class="col">
        ${warNote}
        <div class="panel">
          <h3>🏆 هدف نهایی</h3>
          <p style="color:var(--muted);line-height:2.1;font-size:14px">
            برای تبدیل شدن به <b style="color:var(--gold2)">امپراتور جهان</b> باید هر ۶ سرزمین مادر را به‌طور کامل (۱۰۰٪) فتح کنید:
            <br>${LANDS.map(l => l.flag + ' ' + l.name).join(' • ')}
            <br><br>⚠️ اگر سرزمین مادری شما (${CIVS.find(c => c.id === k.civ).flag} ${CIVS.find(c => c.id === k.civ).name}) سقوط کند، قدرت دفاع و درآمد شما ۵۰٪ کاهش می‌یابد.
          </p>
        </div>
        <div class="panel">
          <h3>👑 حکومت شما</h3>
          <div style="display:flex;flex-direction:column;gap:8px;font-size:14px;color:var(--muted)">
            <div>🏰 قلعه: <b style="color:var(--gold2)">سطح ${faNum(k.castle)}</b></div>
            <div>🛡️ دیوار دفاعی: <b style="color:var(--gold2)">سطح ${faNum(k.defense)}</b></div>
            <div>🗺️ قلمرو فتح‌شده: <b style="color:var(--gold2)">${faNum(totalTerritory(k))}٪</b></div>
          </div>
        </div>
      </div>
    </div>`;
}

/* ---------- حکومت ---------- */
function renderKingdomTab(c) {
  const k = G.player;
  const civ = CIVS.find(x => x.id === k.civ);
  const buildings = BUILDINGS.map(b => {
    const n = k.buildings[b.id];
    const max = maxBuildingPerType(k);
    const full = n >= max;
    return `<div class="item-card">
      <div class="ih"><span class="ic">${b.icon}</span><div><b>${b.name}</b><div class="role">${full ? 'حداکثر ساخته شده' : `${faNum(n)} / ${faNum(max)}`}</div></div></div>
      <div class="desc">${b.desc}<br>💰 درآمد: ${faNum(b.income)} طلا در روز</div>
      <div class="cost">هزینه: ${faNum(b.cost)} طلا</div>
      <button class="btn sm ${full ? '' : 'gold'}" data-action="buy-building" data-arg="${b.id}" ${full ? 'disabled' : ''}>${full ? 'تکمیل' : 'ساخت'}</button>
    </div>`;
  }).join('');
  const castleCost = k.castle >= CASTLE_LEVELS ? null : castleUpgradeCost(k.castle);
  const defCost = k.defense >= DEFENSE_LEVELS ? null : defenseUpgradeCost(k.defense);
  c.innerHTML = `
    <div class="grid3" style="margin-bottom:16px">
      <div class="panel"><h3>💰 خزانه</h3>
        <div style="font-size:26px;color:var(--gold2);font-weight:800">${faNum(k.gold)}</div>
        <div style="color:var(--muted);font-size:13px;margin-top:6px">درآمد روزانه: ${faNum(computeIncome(k))} طلا</div>
      </div>
      <div class="panel"><h3>😊 رضایت مردم</h3>
        <div style="font-size:22px;font-weight:800;color:${k.satisfaction >= 70 ? 'var(--ok)' : k.satisfaction <= 30 ? 'var(--bad)' : 'var(--warn)'}">${faNum(k.satisfaction)}٪</div>
        <div class="bar ${k.satisfaction >= 70 ? 'ok-fill' : k.satisfaction <= 30 ? 'bad-fill' : 'gold-fill'}" style="margin-top:8px"><i style="width:${k.satisfaction}%"></i></div>
        <div style="color:var(--muted);font-size:12px;margin-top:6px">رضایت بالا = قدرت جنگی بیشتر و کمک مردمی</div>
      </div>
      <div class="panel"><h3>🏛️ تمدن</h3>
        <div style="font-size:22px">${civ.flag} ${civ.name}</div>
        <div style="color:var(--ok);font-size:13px;margin-top:6px">${civ.trait}</div>
        <div style="color:var(--muted);font-size:12px;margin-top:6px">سرزمین مادری شما. از سقوط آن جلوگیری کنید!</div>
      </div>
    </div>
    <div class="panel">
      <h3>⛏️ ساختمان‌های درآمدزا</h3>
      <div class="item-list">${buildings}</div>
    </div>
    <div class="section-title">🏰 ارتقای قلعه و دفاع</div>
    <div class="col">
      <div class="upgrade-row">
        <div class="ur-info"><b>🏰 قلعه (سطح ${faNum(k.castle)} از ${faNum(CASTLE_LEVELS)})</b>
          <p>افزایش ظرفیت ارتش + امکان ساخت ساختمان بیشتر + در سطح ۲۰ «قلعه امپراتوری» با سقف ۱۰ ساختمان از هر نوع.</p>
        </div>
        <div class="row">
          <span class="lvl">سطح ${faNum(k.castle)}</span>
          ${castleCost ? `<button class="btn gold sm" data-action="upgrade-castle">ارتقا (${faNum(castleCost)} طلا)</button>` : `<span style="color:var(--ok)">حداکثر</span>`}
        </div>
      </div>
      <div class="upgrade-row">
        <div class="ur-info"><b>🛡️ دیوار دفاعی (سطح ${faNum(k.defense)} از ${faNum(DEFENSE_LEVELS)})</b>
          <p>هر سطح ۵٪ قدرت دفاعی بیشتر؛ در سطح ۲۰ دفاع شما ۲ برابر می‌شود.</p>
        </div>
        <div class="row">
          <span class="lvl">سطح ${faNum(k.defense)}</span>
          ${defCost ? `<button class="btn gold sm" data-action="upgrade-defense">ارتقا (${faNum(defCost)} طلا)</button>` : `<span style="color:var(--ok)">حداکثر</span>`}
        </div>
      </div>
    </div>`;
}

/* ---------- ارتش ---------- */
function renderArmyTab(c) {
  const k = G.player;
  const cap = capacity(k);
  const troops = TROOPS.map(t => {
    const n = k.army[t.id] || 0;
    return `<div class="item-card">
      <div class="ih"><span class="ic">${t.icon}</span><div><b>${t.name}</b><div class="role">${t.role}</div></div></div>
      <div class="desc">${t.desc}<br>⚡ قدرت هر ۱۰۰ نفر: ${faNum(t.power)}</div>
      <div style="color:var(--text);font-weight:700">دارید: ${faNum(n)}</div>
      <div class="cost">هر ۱۰۰ نفر: ${faNum(t.price)} طلا</div>
      <div class="row">
        <button class="btn sm gold" data-action="buy-troop" data-arg="${t.id}" data-arg2="100">+۱۰۰</button>
        <button class="btn sm" data-action="buy-troop" data-arg="${t.id}" data-arg2="1000">+۱۰۰۰</button>
      </div>
    </div>`;
  }).join('');
  c.innerHTML = `
    <div class="panel" style="margin-bottom:16px">
      <h3>🪖 نمای کلی ارتش</h3>
      <div class="row" style="gap:26px">
        <div class="stat"><span class="lbl">تعداد کل</span><span class="val gold">${faNum(armyCount(k))}</span></div>
        <div class="stat"><span class="lbl">ظرفیت</span><span class="val">${faNum(cap)}</span></div>
        <div class="stat"><span class="lbl">قدرت نظامی</span><span class="val good">${faNum(Math.round(armyPower(k)))}</span></div>
      </div>
      <div class="bar gold-fill" style="margin-top:12px"><i style="width:${clamp(armyCount(k) / cap * 100, 0, 100)}%"></i></div>
      <p style="color:var(--muted);font-size:12.5px;margin-top:8px">ظرفیت ارتش با ارتقای قلعه افزایش می‌یابد.</p>
    </div>
    <div class="panel"><h3>⚔️ خرید سرباز</h3><div class="item-list">${troops}</div></div>`;
}

/* ---------- قهرمانان ---------- */
function renderHeroesTab(c) {
  const k = G.player;
  const legends = k.heroes.filter(id => HEROES.find(h => h.id === id).tier === 'legend').length;
  const owned = k.heroes.map(id => {
    const h = HEROES.find(x => x.id === id);
    const eff = Object.keys(h.effects).map(e => `<span style="color:var(--ok)">${effLabel(e)} +${faNum(h.effects[e])}٪</span>`).join(' ');
    return `<div class="item-card owned">
      <div class="ih"><span class="ic">${h.icon}</span><div><b>${h.name}</b><div class="role"><span class="tier-tag" style="background:${TIERS[h.tier].color}33;color:${TIERS[h.tier].color}">${TIERS[h.tier].name}</span></div></div></div>
      <div class="desc">${h.desc}<br>${eff}</div>
    </div>`;
  }).join('');
  const tiers = ['weak', 'normal', 'power', 'legend'];
  const shop = tiers.map(t => {
    const heroes = HEROES.filter(h => h.tier === t).map(h => {
      const have = k.heroes.includes(h.id);
      const locked = !have && h.tier === 'legend' && legends >= 1;
      const eff = Object.keys(h.effects).map(e => `${effLabel(e)} +${faNum(h.effects[e])}٪`).join('، ');
      return `<div class="item-card ${have ? 'owned' : ''}">
        <div class="ih"><span class="ic">${h.icon}</span><div><b>${h.name}</b><div class="role"><span class="tier-tag" style="background:${TIERS[h.tier].color}33;color:${TIERS[h.tier].color}">${TIERS[h.tier].name}</span></div></div></div>
        <div class="desc">${h.desc}<br>${eff}</div>
        <div class="cost">${faNum(h.cost)} طلا</div>
        ${have ? '' : `<button class="btn sm gold" data-action="buy-hero" data-arg="${h.id}" ${locked ? 'disabled' : ''}>استخدام</button>`}
      </div>`;
    }).join('');
    return `<div class="section-title">${TIERS[t].label}</div><div class="item-list">${heroes}</div>`;
  }).join('');
  const shields = SHIELDS.map(s => `<div class="item-card">
      <div class="ih"><span class="ic">${s.icon}</span><div><b>${s.name}</b></div></div>
      <div class="desc">در زمان فعال بودن، هیچ حمله‌ای به شما موفق نمی‌شود و مهاجم از وجود سپر مطلع نیست.</div>
      <div class="cost">${faNum(s.cost)} طلا</div>
      <button class="btn sm gold" data-action="buy-shield" data-arg="${s.id}">خرید</button>
    </div>`).join('');
  c.innerHTML = `
    <div class="panel" style="margin-bottom:16px">
      <h3>🦸 قهرمانان در خدمت شما <span style="color:var(--muted);font-size:13px;font-weight:400">(${faNum(k.heroes.length)} از ${faNum(MAX_ACTIVE_HEROES)})</span></h3>
      ${k.heroes.length ? `<div class="item-list">${owned}</div>` : `<div class="empty">هنوز قهرمانی استخدام نکرده‌اید.</div>`}
      ${k.shield > 0 ? `<div style="margin-top:12px;color:var(--ok)">🛡️ سپر دفاعی فعال: ${faNum(k.shield)} روز دیگر</div>` : ''}
    </div>
    <div class="panel"><h3>🏪 بازار قهرمانان</h3><p style="color:var(--muted);font-size:13px;margin-bottom:10px">حداکثر ۵ قهرمان فعال و فقط ۱ قهرمان افسانه‌ای. هیچ قهرمانی به تنهایی شما را برنده نمی‌کند — استراتژی حرف اول را می‌زند.</p>${shop}</div>
    <div class="panel" style="margin-top:16px"><h3>🛡️ سپر دفاعی</h3><div class="item-list">${shields}</div></div>`;
}
function effLabel(e) {
  const map = { attack: 'حمله', defense: 'دفاع', income: 'درآمد', satisfaction: 'رضایت', spy: 'جاسوسی', spyDefense: 'ضدجاسوسی', security: 'امنیت', morale: 'روحیه', archerPower: 'قدرت کمانداران', cavalryPower: 'قدرت سواره', stealth: 'پنهان‌کاری', alliance: 'اتحاد', assassination: 'ترور', heal: 'بازیابی', armyPower: 'قدرت ارتش', positive: 'رخداد مثبت', negative: 'کاهش رخداد منفی' };
  return map[e] || e;
}

/* ---------- اخبار ---------- */
function renderNewsTab(c) {
  const news = G.news.map(n => `<div class="feed-item"><span class="fi">${n.icon}</span><span class="ft">${esc(n.text)}</span><span class="fd">روز ${faNum(n.day)}</span></div>`).join('');
  const log = G.log.map(n => `<div class="feed-item"><span class="fi">📜</span><span class="ft">${esc(n.text)}</span><span class="fd">روز ${faNum(n.day)}</span></div>`).join('');
  c.innerHTML = `
    <div class="grid2">
      <div class="panel"><h3>📰 اخبار جهان</h3><div class="feed">${news || '<div class="empty">هنوز خبری نیست.</div>'}</div></div>
      <div class="panel"><h3>📜 گزارش‌های شما</h3><div class="feed">${log || '<div class="empty">هنوز گزارشی نیست.</div>'}</div></div>
    </div>
    <div class="panel" style="margin-top:16px">
      <h3>🏆 برترین‌های امشب</h3>
      <div class="grid3">${renderRankingCards()}</div>
    </div>`;
}
function renderRankingCards() {
  const r = rankings(G);
  const items = [
    ['👑 ثروتمندترین', r.richest, faNum(Math.round(r.richest.gold)) + ' طلا'],
    ['⚔️ بهترین مهاجم', r.attacker, faNum(r.attacker.stats.wins) + ' پیروزی'],
    ['😊 محبوب‌ترین', r.satisfaction, faNum(r.satisfaction.satisfaction) + '٪'],
    ['🪖 قدرتمندترین ارتش', r.army, faNum(Math.round(armyPower(r.army))) + ' قدرت'],
    ['🗺️ بیشترین قلمرو', r.territory, faNum(totalTerritory(r.territory)) + '٪'],
    ['💰 بیشترین درآمد', r.income, faNum(computeIncome(r.income)) + ' طلا'],
  ];
  return items.map(([lbl, k, v]) => `<div class="legend-card"><div class="lh"><b>${lbl}</b></div><div style="font-size:15px">${k.isPlayer ? '⭐ شما' : esc(k.kingdom)}</div><div style="color:var(--muted);font-size:12px">${v}</div></div>`).join('');
}

/* ---------- راهنما ---------- */
function renderHelpTab(c) {
  c.innerHTML = `
    <div class="panel" style="margin-bottom:16px"><h3>📖 راهنمای جنگ سلسله</h3>
      <p style="color:var(--muted);line-height:2.2">شما پادشاه یک حکومت باستانی هستید. هدف: فتح هر ۶ سرزمین مادر جهان و تبدیل شدن به تنها «فاتح جهان».</p>
    </div>
    <div class="help-grid">
      <div class="help-card"><b>💰 اقتصاد</b><p>تنها منبع بازی «طلا» است. با ساخت معدن طلا، بازار، کاروان و بندر درآمد روزانه می‌سازید. هر ساختمان ۱۰۰٬۰۰۰ طلا هزینه و ۵۰۰٬۰۰۰ طلا درآمد روزانه دارد.</p></div>
      <div class="help-card"><b>🏰 قلعه و دفاع</b><p>قلعه (سطح ۱–۲۰) ظرفیت ارتش و سقف ساختمان را بالا می‌برد. دیوار دفاعی هر سطح ۵٪ دفاع بیشتر می‌دهد.</p></div>
      <div class="help-card"><b>⚔️ جنگ</b><p>از روز سوم فصل می‌توانید حمله کنید. انواع حمله: تصرف، غارت، محاصره، ترور و حمله مخفی. حمله به سرزمین‌های دور قدرت کمتری دارد.</p></div>
      <div class="help-card"><b>🗺️ نقشه</b><p>نقشه فقط از ۶ سرزمین تشکیل شده. با هر حمله موفق، درصدی از سرزمین به نام حکومت شما ثبت می‌شود. ۱۰۰٪ هر سرزمین = سقوط آن سرزمین.</p></div>
      <div class="help-card"><b>😊 رضایت مردم</b><p>رضایت بالا = قدرت جنگی بیشتر و هدیه مردمی. رضایت خیلی پایین = شورش و فرار سربازان.</p></div>
      <div class="help-card"><b>🦸 قهرمانان</b><p>قهرمانان درصدی روی جنگ، اقتصاد و رضایت اثر می‌گذارند (حداکثر ۵ فعال). سپر دفاعی شما را از حمله مصون می‌کند.</p></div>
      <div class="help-card"><b>🌙 گزارش شبانه</b><p>هر شب با دکمه «پایان روز» درآمد می‌گیرید، رتبه‌ها مشخص می‌شود و حریفان حرکت می‌کنند. فصل ۱۴ روز است.</p></div>
      <div class="help-card"><b>🏆 پیروزی</b><p>هرکس هر ۶ سرزمین را ۱۰۰٪ فتح کند برنده فصل می‌شود. در پایان فقط یک نفر برنده است.</p></div>
    </div>
    <div class="row" style="margin-top:20px">
      <button class="btn ghost" data-action="to-menu">↩ بازگشت به منو</button>
      <button class="btn danger" data-action="new-season">🔄 شروع فصل جدید (حذف پیشرفت)</button>
    </div>`;
}

/* ============================================================
   حمله
   ============================================================ */
function openAttack(landId) {
  if (G.day <= PEACE_DAYS) { toast('🕊️ روزهای اول فصل صلح است و حمله ممکن نیست.'); return; }
  const land = LANDS.find(l => l.id === landId);
  UI.attack = { landId, type: null, strategy: 'balanced', target: null };
  const types = ATTACK_TYPES.map(t => {
    const cost = t.gold > 0 ? ` — هزینه: ${faNum(t.gold)} طلا` : ' — رایگان';
    return `<button class="btn" data-action="attack-type" data-arg="${t.id}">
      <span style="font-size:20px">${t.icon}</span> ${t.name} <span style="font-weight:400;color:var(--muted)">${cost}</span>
    </button>`;
  }).join('');
  openModal(`
    <div class="modal-head"><span style="font-size:24px">${land.flag}</span><h3>حمله به ${land.name}</h3><span class="x" data-action="modal-close">✕</span></div>
    <div class="modal-body">
      <div class="evt-text" style="font-size:13.5px;color:var(--muted)">${esc(landOwnerLabel(G, landId))}</div>
      <div class="evt-text">نوع حمله را انتخاب کنید:</div>
      <div class="choices">${types}</div>
      <div id="attack-config"></div>
    </div>
    <div class="modal-foot">
      <button class="btn ghost" data-action="modal-close">انصراف</button>
    </div>`, { closable: true });
}

function chooseAttackType(typeId) {
  const t = ATTACK_TYPES.find(x => x.id === typeId);
  UI.attack.type = typeId;
  const cfg = document.getElementById('attack-config');
  let inner = '';
  if (typeId === 'capture' || typeId === 'secret') {
    inner = `
      <div class="evt-text" style="font-size:14px">${t.icon} <b>${t.name}</b> — ${t.desc}</div>
      <div class="section-title" style="margin:8px 0 4px">🗡️ راهبرد حمله:</div>
      <div class="choices">
        <button class="btn" data-action="attack-strategy" data-arg="full">🔥 هجوم کامل (قدرت +۱۰٪، تلفات بیشتر)</button>
        <button class="btn" data-action="attack-strategy" data-arg="balanced">⚖️ حمله متعادل</button>
        <button class="btn" data-action="attack-strategy" data-arg="cautious">🛡️ حمله محتاطانه (قدرت -۱۰٪، تلفات کمتر)</button>
      </div>
      <button class="btn gold" data-action="attack-confirm" style="margin-top:12px">🚀 آغاز حمله</button>`;
  } else if (typeId === 'raid') {
    inner = `<div class="evt-text" style="font-size:14px">${t.icon} <b>${t.name}</b> — ${t.desc}</div>
      <button class="btn gold" data-action="attack-confirm" style="margin-top:8px">💰 آغاز غارت</button>`;
  } else if (typeId === 'siege' || typeId === 'assass') {
    const targets = G.ai.filter(a => a.alive).map(a => `<button class="btn" data-action="attack-target" data-arg="${esc(a.charName)}">${esc(a.kingdom)} (${esc(a.charName)})</button>`).join('');
    inner = `<div class="evt-text" style="font-size:14px">${t.icon} <b>${t.name}</b> — ${t.desc}</div>
      <div class="section-title" style="margin:8px 0 4px">🎯 انتخاب هدف:</div>
      <div class="choices">${targets}</div>
      <button class="btn gold" data-action="attack-confirm" style="margin-top:12px" id="attack-confirm-btn" disabled>اجرا</button>`;
  }
  cfg.innerHTML = inner;
}

function chooseStrategy(s) {
  UI.attack.strategy = s;
  document.querySelectorAll('[data-action="attack-strategy"]').forEach(b => b.style.borderColor = b.dataset.arg === s ? 'var(--gold)' : '');
}

function chooseTarget(name) {
  UI.attack.target = name;
  document.querySelectorAll('[data-action="attack-target"]').forEach(b => b.style.borderColor = b.dataset.arg === name ? 'var(--gold)' : '');
  const btn = document.getElementById('attack-confirm-btn');
  if (btn) btn.disabled = false;
}

function confirmAttack() {
  const a = UI.attack;
  if (!a) return;
  if (a.type === 'siege' || a.type === 'assass') {
    if (!a.target) { toast('🎯 ابتدا هدف را انتخاب کنید.'); return; }
  }
  const k = G.player;
  const t = ATTACK_TYPES.find(x => x.id === a.type);
  if (t.gold > 0 && k.gold < t.gold) { toast('💰 طلا کافی برای این عملیات نیست!'); return; }
  if (armyCount(k) <= 0) { toast('🪖 شما سربازی ندارید! ابتدا ارتش بسازید.'); return; }
  let res;
  if (a.type === 'capture') res = doCapture(G, a.landId, { strategy: a.strategy });
  else if (a.type === 'secret') res = doSecret(G, a.landId, { strategy: a.strategy });
  else if (a.type === 'raid') res = doRaid(G, a.landId);
  else if (a.type === 'siege') { const target = findKing(G, a.target); res = doSiege(G, target); }
  else if (a.type === 'assass') { const target = findKing(G, a.target); res = doAssassinate(G, target); }
  saveState(G);
  const won = res.result ? (res.result.gain > 0 || res.result.tier === 'decisive' || res.result.tier === 'normal' || res.result.tier === 'hard') : null;
  const icon = won === null ? '🎯' : (won ? '🏆' : '💥');
  const tierCls = won === null ? 'tie' : (won ? 'win' : 'lose');
  const tierName = res.result ? TIER_NAME[res.result.tier] : '';
  openModal(`
    <div class="modal-head"><h3>نتیجه عملیات</h3><span class="x" data-action="modal-close">✕</span></div>
    <div class="modal-body">
      <div class="battle-icon">${icon}</div>
      ${res.result ? `<div class="battle-tier ${tierCls}">${tierName}</div>` : ''}
      <div class="evt-text" style="text-align:center">${res.txt}</div>
    </div>
    <div class="modal-foot"><button class="btn gold" data-action="modal-close">ادامه</button></div>`, { closable: true });
  renderGame();
}

/* ============================================================
   پایان روز و گزارش شبانه
   ============================================================ */
function endDay() {
  if (G.over) { showEndScreen(); return; }
  const report = processDay(G);
  renderGame();
  openModal(`
    <div class="modal-head"><span style="font-size:22px">🌙</span><h3>گزارش شبانه — روز ${faNum(report.day)}</h3><span class="x" data-action="report-close">✕</span></div>
    <div class="modal-body">
      <div class="evt-text" style="text-align:center">💰 درآمد امروز: <b style="color:var(--gold2)">${faNum(report.income)} طلا</b> به خزانه واریز شد.</div>
      ${reportCard('👑 ثروتمندترین', report.richest)}
      ${reportCard('⚔️ بهترین مهاجم', report.attacker)}
      ${reportCard('😊 محبوب‌ترین', report.satisfaction)}
      ${reportCard('🪖 قدرتمندترین ارتش', report.army)}
      ${reportCard('🗺️ بیشترین قلمرو', report.territory)}
      ${reportCard('💰 بیشترین درآمد', report.incomeKing)}
    </div>
    <div class="modal-foot"><button class="btn gold" data-action="report-close">ادامه</button></div>`, { closable: false });
}
function reportCard(lbl, king) {
  if (!king) return '';
  const v = lbl.includes('ثروت') ? faNum(Math.round(king.gold)) + ' طلا'
    : lbl.includes('مهاجم') ? faNum(king.stats.wins) + ' پیروزی'
    : lbl.includes('محبوب') ? faNum(king.satisfaction) + '٪'
    : lbl.includes('ارتش') ? faNum(Math.round(armyPower(king))) + ' قدرت'
    : lbl.includes('قلمرو') ? faNum(totalTerritory(king)) + '٪'
    : faNum(computeIncome(king)) + ' طلا';
  return `<div class="feed-item"><span class="fi">${lbl.split(' ')[0]}</span><span class="ft">${lbl.split(' ').slice(1).join(' ')}: <b style="color:var(--gold2)">${king.isPlayer ? '⭐ شما' : esc(king.kingdom)}</b></span><span class="fd">${v}</span></div>`;
}

function afterReport() {
  closeModal();
  // نمایش رخدادهای بازیکن
  UI.events = G.pendingEvents || [];
  G.pendingEvents = [];
  nextEvent();
}
function nextEvent() {
  if (!UI.events.length) { renderGame(); return; }
  const ev = UI.events.shift();
  UI.currentEventForModal = ev;
  const choices = ev.choices.map((ch, i) => `<button class="btn" data-action="event-choice" data-arg="${i}">${esc(ch.t)}</button>`).join('');
  openModal(`
    <div class="modal-head"><span style="font-size:22px">${ev.icon}</span><h3>${esc(ev.title)}</h3><span class="x" data-action="event-skip">✕</span></div>
    <div class="modal-body">
      <div class="evt-text">${esc(ev.text)}</div>
      <div class="choices">${choices}</div>
      <div id="event-out" style="display:none"></div>
    </div>
    <div class="modal-foot"><button class="btn ghost" data-action="event-skip">رد شدن</button></div>`, { closable: false });
}

function chooseEvent(i) {
  const bd = document.getElementById('modal-backdrop');
  const ev = UI.currentEventForModal;
  if (!ev) return;
  const ch = ev.choices[i];
  applyEffect(G.player, ch.e, G);
  const out = ch.out || 'انجام شد.';
  const outEl = document.getElementById('event-out');
  outEl.style.display = 'block';
  outEl.innerHTML = `<div class="evt-text" style="color:var(--ok);text-align:center;margin-top:8px">${esc(out)}</div>`;
  // غیرفعال‌سازی دکمه‌ها
  bd.querySelectorAll('.choices .btn').forEach(b => b.disabled = true);
  const foot = bd.querySelector('.modal-foot');
  foot.innerHTML = `<button class="btn gold" data-action="event-next">ادامه</button>`;
  saveState(G);
  renderGame();
}

function showEndScreen() {
  const k = G.player;
  const won = G.winner === k;
  const seasonEnd = G.over && !G.winner;
  openModal(`
    <div class="modal-head"><h3>${won ? '👑 فاتح جهان!' : seasonEnd ? '🏁 پایان فصل' : '💀 پایان'}</h3></div>
    <div class="modal-body" style="text-align:center">
      <div class="battle-icon">${won ? '👑' : seasonEnd ? '🏁' : '🏳️'}</div>
      ${won ? `<div class="battle-tier win">شما امپراتور جهان شدید!</div>
      <div class="evt-text">${k.kingdom} هر شش سرزمین جهان را فتح کرد. نام شما در تاریخ جاودانه شد.</div>`
        : `<div class="evt-text">فصل ${faNum(G.season)} به پایان رسید. قلمرو شما: ${faNum(totalTerritory(k))}٪ از جهان.</div>`}
      <div class="evt-text" style="font-size:13px;color:var(--muted)">در پایان، فقط یک نفر برنده می‌شود — در فصل بعد بازگردید و جهان را فتح کنید.</div>
    </div>
    <div class="modal-foot">
      <button class="btn gold" data-action="new-season">🔄 فصل جدید</button>
      <button class="btn ghost" data-action="to-menu">↩ منو</button>
    </div>`, { closable: false });
}

function newSeason() {
  clearSave();
  closeModal();
  G = null;
  switchScreen('screen-menu');
  document.getElementById('btn-continue').style.display = hasSave() ? '' : 'none';
}

/* ============================================================
   اکشن‌های خرید
   ============================================================ */
function doBuyTroop(troopId, count) {
  const r = buyTroops(G, troopId, +count);
  toast(r.ok ? r.msg : '⚠️ ' + r.msg);
  renderGame();
}
function doBuyBuilding(bId) {
  const r = buyBuilding(G, bId);
  toast(r.ok ? r.msg : '⚠️ ' + r.msg);
  renderGame();
}
function doUpgradeCastle() {
  const r = upgradeCastle(G);
  toast(r.ok ? r.msg : '⚠️ ' + r.msg);
  renderGame();
}
function doUpgradeDefense() {
  const r = upgradeDefense(G);
  toast(r.ok ? r.msg : '⚠️ ' + r.msg);
  renderGame();
}
function doBuyHero(id) {
  const r = buyHero(G, id);
  toast(r.ok ? r.msg : '⚠️ ' + r.msg);
  renderGame();
}
function doBuyShield(id) {
  const r = buyShield(G, id);
  toast(r.ok ? r.msg : '⚠️ ' + r.msg);
  renderGame();
}
