/* ============================================================
   جنگ سلسله — نقطه ورود و اتصال رویدادها
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  // نمایش دکمه ادامه اگر ذخیره‌ای وجود دارد
  document.getElementById('btn-continue').style.display = hasSave() ? '' : 'none';
  // خواندن ترجیح موسیقی و به‌روزرسانی دکمه
  Music.loadPref();
  updateMusicButton();
  // شروع خودکار موسیقی با اولین تعامل کاربر
  document.addEventListener('click', () => { Music.tryAutostart(); }, { once: true });
});

/* ---------- رویداد کلیک سراسری ---------- */
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (el) {
    const action = el.dataset.action;
    const arg = el.dataset.arg;
    const arg2 = el.dataset.arg2;
    route(action, arg, arg2);
    return;
  }
  // کلیک روی تب‌ها
  const tab = e.target.closest('.tab[data-tab]');
  if (tab) { renderTab(tab.dataset.tab); return; }
  // کلیک روی سرزمین‌های نقشه
  const land = e.target.closest('.land-blob[data-land]');
  if (land) { openAttack(land.dataset.land); return; }
  // کلیک روی پس‌زمینه مودال (در صورت قابل بستن)
  if (e.target.id === 'modal-backdrop' && e.target.dataset.closable === '1') {
    closeModal();
  }
});

function route(action, arg, arg2) {
  switch (action) {
    /* منو */
    case 'menu-new': renderSetup(); switchScreen('screen-setup'); break;
    case 'menu-continue': continueGame(); break;
    case 'menu-help': openHelp(); break;
    /* انتخاب شخصیت */
    case 'select-civ': selectCiv(arg); break;
    case 'select-char': selectChar(arg); break;
    case 'select-kingdom': selectKingdom(arg); break;
    case 'setup-back': switchScreen('screen-menu'); break;
    case 'setup-start': startGame(); break;
    /* بازی */
    case 'end-day': endDay(); break;
    case 'toggle-music': Music.toggle(); break;
    case 'buy-troop': doBuyTroop(arg, arg2); break;
    case 'buy-building': doBuyBuilding(arg); break;
    case 'upgrade-castle': doUpgradeCastle(); break;
    case 'upgrade-defense': doUpgradeDefense(); break;
    case 'buy-hero': doBuyHero(arg); break;
    case 'buy-shield': doBuyShield(arg); break;
    /* حمله */
    case 'attack-type': chooseAttackType(arg); break;
    case 'attack-strategy': chooseStrategy(arg); break;
    case 'attack-target': chooseTarget(arg); break;
    case 'attack-confirm': confirmAttack(); break;
    /* رخدادها */
    case 'event-choice': chooseEvent(+arg); break;
    case 'event-skip': nextEvent(); break;
    case 'event-next': nextEvent(); break;
    /* مودال‌ها */
    case 'report-close': afterReport(); break;
    case 'modal-close': closeModal(); break;
    case 'to-menu': toMenu(); break;
    case 'new-season': newSeason(); break;
  }
}

function continueGame() {
  const s = loadState();
  if (!s) { toast('⚠️ ذخیره‌ای یافت نشد.'); return; }
  G = s;
  switchScreen('screen-game');
  renderGame();
  // رخدادهای بازمانده
  UI.events = G.pendingEvents || [];
  G.pendingEvents = [];
  setTimeout(() => nextEvent(), 350);
}

function toMenu() {
  if (G && !G.over) saveState(G);
  switchScreen('screen-menu');
  document.getElementById('btn-continue').style.display = hasSave() ? '' : 'none';
}

function openHelp() {
  openModal(`
    <div class="modal-head"><h3>📖 راهنمای بازی</h3><span class="x" data-action="modal-close">✕</span></div>
    <div class="modal-body">
      <div class="evt-text">👑 شما پادشاه یک حکومت باستانی هستید و باید با فتح هر ۶ سرزمین مادر جهان، «فاتح جهان» شوید.</div>
      <div class="help-grid">
        <div class="help-card"><b>💰 اقتصاد</b><p>تنها منبع «طلا» است. با ساخت معدن، بازار، کاروان و بندر درآمد روزانه بسازید.</p></div>
        <div class="help-card"><b>⚔️ جنگ</b><p>از روز سوم حمله کنید: تصرف، غارت، محاصره، ترور، حمله مخفی.</p></div>
        <div class="help-card"><b>🗺️ نقشه</b><p>هر حمله موفق درصدی از سرزمین را به نام شما می‌کند. ۱۰۰٪ = سقوط سرزمین.</p></div>
        <div class="help-card"><b>😊 رضایت مردم</b><p>رضایت بالا قدرت جنگ را زیاد می‌کند؛ رضایت پایین شورش می‌آورد.</p></div>
        <div class="help-card"><b>🦸 قهرمانان</b><p>حداکثر ۵ قهرمان فعال؛ سپر دفاعی شما را مصون می‌کند.</p></div>
        <div class="help-card"><b>🌙 پایان روز</b><p>درآمد، رتبه‌بندی و حرکت حریفان هر شب انجام می‌شود. فصل ۱۴ روز است.</p></div>
      </div>
    </div>
    <div class="modal-foot"><button class="btn gold" data-action="modal-close">فهمیدم</button></div>`, { closable: true });
}
