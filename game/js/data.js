/* ============================================================
   جنگ سلسله — داده‌های بازی
   ============================================================ */

const CIVS = [
  {
    id: 'iran', name: 'ایرانشهر', flag: '🏛️', color: '#1f8a5f', dark: '#124d38',
    trait: 'اقتصاد و پایداری',
    desc: 'سرزمین کهن پارس؛ اقتصاد شکوفا و مردم پایدار.',
    bonuses: { income: 0.05, satisfaction: 3, droughtLess: true },
  },
  {
    id: 'rome', name: 'روم', flag: '🦅', color: '#b23b3b', dark: '#641e1e',
    trait: 'ارتش منظم',
    desc: 'امپراتوری ابدی؛ سپاه منظم و دفاع آهنین.',
    bonuses: { defense: 0.05, attack: 0.03, lossesLess: true },
  },
  {
    id: 'scandi', name: 'اسکاندیناوی', flag: '⚔️', color: '#3b6ea5', dark: '#1c3a5e',
    trait: 'جنگجویان و دریا',
    desc: 'سرزمین وایکینگ‌ها؛ حمله‌های سهمگین و ناوگان ارزان.',
    bonuses: { attack: 0.05, shipCheaper: true, seaAttack: 0.05 },
  },
  {
    id: 'arabia', name: 'سرزمین اعراب', flag: '🕌', color: '#c89b3c', dark: '#6e521c',
    trait: 'تجارت و کاروان',
    desc: 'مسیر ادویه و ابریشم؛ تجارت پرسود و کاروان‌های سریع.',
    bonuses: { trade: 0.08, randomIncome: true, speed: true },
  },
  {
    id: 'korea', name: 'سرزمین کره', flag: '🐉', color: '#8a4db8', dark: '#4a2570',
    trait: 'نظم و توسعه',
    desc: 'سرزمین صبح آرام؛ ساختمان‌های ارزان و دفاع شهری مستحکم.',
    bonuses: { buildCheaper: 0.10, satisfactionStable: true, cityDefense: 0.05 },
  },
  {
    id: 'europe', name: 'اروپا', flag: '👑', color: '#4d7c8a', dark: '#27474f',
    trait: 'سیاست و اتحاد',
    desc: 'قاره پادشاهی‌ها؛ دیپلماسی و جاسوسی قوی.',
    bonuses: { alliance: 0.05, spy: 0.05, diplomacy: true },
  },
];

const CHARACTERS = {
  iran: ['کوروش کبیر', 'داریوش کبیر', 'نادرشاه', 'شاه عباس', 'شاه اسماعیل صفوی', 'کریم خان زند', 'یعقوب لیث', 'خسرو پرویز', 'آرش کمانگیر', 'اردشیر بابکان', 'حسن صباح', 'ابومسلم', 'امیرکبیر', 'آریوبرزن', 'رستم', 'سهراب'],
  rome: ['آگوستوس', 'تراژان', 'مارکوس اورلیوس', 'ژوستینیان', 'کنستانتین کبیر', 'هراکلیوس', 'نرون', 'اسپارتاکوس', 'پروکوپیوس', 'تیبریوس', 'کالیگولا', 'اسکیپیو', 'ژولیوس سزار'],
  scandi: ['ایوار', 'راگنار', 'بیورن', 'فلوکی', 'هارالد', 'اوبه', 'رولو', 'سیگورد', 'اودین', 'ثور', 'تیر', 'بالدر', 'فریر', 'نیورد', 'براگی', 'هرمود', 'لاگرتا'],
  arabia: ['صلاح الدین ایوبی', 'مختار', 'مالک اشتر', 'ابراهیم اشتر', 'مسلم بن عقیل', 'هارون', 'مأمون', 'عبدالملک مروان', 'یوسف', 'سلیمان', 'طارق بن زیاد', 'خالد بن ولید'],
  korea: ['جومونگ', 'هموسو', 'موهیول', 'یوری', 'تسو', 'ایلجیما', 'کیم یوشین', 'چویونگ', 'دونگ‌یی', 'یانگوم', 'جوسا', 'موگل'],
  europe: ['ناپلئون', 'آلفرد کبیر', 'بالدوین', 'ادوارد', 'اتلستن', 'ولادیمیر کبیر', 'ایوان مخوف', 'ولاد دراکولا', 'میرچا کبیر', 'استفان قدیس', 'الکساندر مقدونی', 'شاه آرتور'],
};

const KINGDOMS = {
  iran: ['تخت جمشید', 'شوش', 'هگمتانه', 'تیسفون', 'پاسارگاد', 'تبریز', 'ری', 'نیشابور', 'اصفهان باستان', 'همدان', 'کرمان', 'سیستان', 'طهران', 'خراسان', 'گرگان'],
  rome: ['رم', 'ناپل', 'پمپئی', 'راونا', 'فلورانس', 'میلان', 'سیسیل', 'ونیز', 'بولونیا', 'تورین', 'جنوا', 'ورونا', 'پیزا', 'تارانتو', 'پارما'],
  scandi: ['کاته‌گات', 'اوپسالا', 'بیرکا', 'هدبی', 'نیداروس', 'ریبه', 'گوتلاند', 'اسکیرینگسال', 'آلثینگ', 'یورک', 'هاردر', 'تروندهایم', 'وستفولد', 'روسکیله', 'برگن'],
  arabia: ['بغداد', 'دمشق', 'مکه', 'مدینه', 'بصره', 'کوفه', 'کربلا', 'نجف', 'سامرا', 'فسطاط', 'صنعا', 'پترا', 'تدمر', 'بابل', 'قرطبه'],
  korea: ['گوگوریو', 'شیلا', 'بگچه', 'جولبون', 'گوریو', 'کائسونگ', 'سورابول', 'بویو', 'ویرسونگ', 'گونگنه‌سونگ', 'نامپیو', 'هان‌سانگ', 'سونگ‌اک', 'چئونگ‌جو', 'هامه‌یانگ', 'گانگ‌هونگ'],
  europe: ['پاریس', 'لندن', 'وسکس', 'وینچستر', 'ساکسون', 'ترویر', 'برلین', 'قسطنطنیه', 'آرل', 'لوندینیوم', 'تولوسا', 'گادیر', 'پراگ', 'بوداپست', 'کیف'],
};

// هر سرزمین مادر (نقشه جهان فقط از این ۶ سرزمین تشکیل شده)
const LANDS = [
  { id: 'iran', name: 'ایرانشهر', flag: '🏛️', color: '#1f8a5f' },
  { id: 'rome', name: 'روم', flag: '🦅', color: '#b23b3b' },
  { id: 'scandi', name: 'اسکاندیناوی', flag: '⚔️', color: '#3b6ea5' },
  { id: 'arabia', name: 'سرزمین اعراب', flag: '🕌', color: '#c89b3c' },
  { id: 'korea', name: 'سرزمین کره', flag: '🐉', color: '#8a4db8' },
  { id: 'europe', name: 'اروپا', flag: '👑', color: '#4d7c8a' },
];

// سربازان — قیمت هر ۱۰۰ نفر و قدرت هر ۱۰۰ نفر
const TROOPS = [
  { id: 'soldier',  name: 'سرباز عادی',       icon: '🪖', price: 100,  power: 100, role: 'همه‌کاره',     desc: 'ستون فقرات ارتش؛ ارزان و متعادل.' },
  { id: 'spearman', name: 'نیزه‌دار',         icon: '🔱', price: 150,  power: 160, role: 'ضد سواره',     desc: 'در برابر سواره‌نظام مؤثر است.' },
  { id: 'archer',   name: 'کماندار',          icon: '🏹', price: 150,  power: 150, role: 'دفاعی',        desc: 'در دفاع قلعه بسیار قوی است.' },
  { id: 'axeman',   name: 'تبرزن',            icon: '🪓', price: 200,  power: 200, role: 'تهاجمی',       desc: 'قدرت تخریب بالا در حمله.' },
  { id: 'shield',   name: 'سپردار',           icon: '🛡️', price: 250,  power: 190, role: 'دفاعی',        desc: 'دیوار زنده در برابر هجوم.' },
  { id: 'sword',    name: 'شمشیرزن حرفه‌ای',  icon: '🗡️', price: 350,  power: 350, role: 'تهاجمی',       desc: 'نخبگان جنگ تن‌به‌تن.' },
  { id: 'camel',    name: 'شترسوار',          icon: '🐪', price: 350,  power: 380, role: 'بیابانی',      desc: 'در سرزمین‌های گرم قوی‌تر است.' },
  { id: 'cavalry',  name: 'سواره نظام',       icon: '🐎', price: 400,  power: 420, role: 'سریع',         desc: 'ضربه سریع و نفوذ عمیق.' },
  { id: 'harcher',  name: 'سواره کماندار',    icon: '🏇', price: 500,  power: 480, role: 'سریع',         desc: 'باران تیر از پشت اسب.' },
  { id: 'heavy',    name: 'مهاجم سنگین',      icon: '🔥', price: 700,  power: 700, role: 'تهاجمی',       desc: 'مشت آهنین ارتش.' },
  { id: 'royal',    name: 'گارد سلطنتی',      icon: '👑', price: 1000, power: 1100, role: 'نخبه',         desc: 'گران‌ترین و قدرتمندترین نیرو.' },
];

// ساختمان‌های درآمدزا (معدن و ...)
const BUILDINGS = [
  { id: 'mine',    name: 'معدن طلا',      icon: '⛏️', cost: 100000, income: 500000, desc: 'منبع اصلی طلای روزانه.' },
  { id: 'market',  name: 'بازار',         icon: '🏪', cost: 100000, income: 500000, desc: 'رونق داد و ستد شهر.' },
  { id: 'caravan', name: 'کاروان تجاری',  icon: '🐫', cost: 100000, income: 500000, desc: 'تجارت با سرزمین‌های دور.' },
  { id: 'port',    name: 'بندر تجاری',    icon: '⚓', cost: 100000, income: 500000, desc: 'راه دریایی ثروت.' },
];

const CASTLE_LEVELS = 20;
const DEFENSE_LEVELS = 20;

// هزینه ارتقای قلعه بر اساس سطح فعلی
function castleUpgradeCost(level) {
  if (level < 2) return 100000;
  if (level <= 5) return 100000;
  if (level <= 10) return 250000;
  if (level <= 15) return 500000;
  return 1000000;
}
function defenseUpgradeCost(level) {
  if (level < 1) return 75000;
  if (level <= 5) return 75000;
  if (level <= 10) return 200000;
  if (level <= 15) return 400000;
  return 800000;
}

// قهرمانان
const HEROES = [
  // ضعیف
  { id: 'h_watch',  name: 'دیده‌بان شاهی',   tier: 'weak',      icon: '🏹', cost: 3000000,  effects: { spy: 5, spyDefense: 5 }, desc: 'چشم‌های بیدار حکومت.' },
  { id: 'h_arch',   name: 'معمار سلطنتی',    tier: 'weak',      icon: '🏛️', cost: 3000000,  effects: { castleLoss: -5, satisfaction: 5 }, desc: 'قلعه را استوار نگه می‌دارد.' },
  { id: 'h_msg',    name: 'پیام‌رسان بزرگ',  tier: 'weak',      icon: '📯', cost: 3000000,  effects: { speed: 5 }, desc: 'خبر سریع‌تر از باد می‌رسد.' },
  { id: 'h_treas',  name: 'مباشر خزانه',     tier: 'weak',      icon: '💰', cost: 3000000,  effects: { income: 5, gift: 5 }, desc: 'سکه‌ها را دو برابر می‌شمارد.' },
  // عادی
  { id: 'h_guard',  name: 'فرمانده نگهبانان', tier: 'normal',   icon: '🛡️', cost: 6000000,  effects: { defense: 10, defenderLoss: -5 }, desc: 'سپر حکومت در برابر دشمن.' },
  { id: 'h_arrow',  name: 'استاد تیراندازان', tier: 'normal',   icon: '🎯', cost: 6000000,  effects: { archerPower: 10, enemyLoss: 5 }, desc: 'کمانداران را افسانه می‌کند.' },
  { id: 'h_cav',    name: 'سردار سواره‌نظام', tier: 'normal',   icon: '🐎', cost: 6000000,  effects: { cavalryPower: 10, speed: 5 }, desc: 'فرمانده یورش برق‌آسا.' },
  { id: 'h_night',  name: 'سایه شب',         tier: 'normal',   icon: '🌑', cost: 6000000,  effects: { stealth: 10, spy: 5 }, desc: 'در تاریکی هیچ‌کس او را نمی‌بیند.' },
  { id: 'h_people', name: 'محبوب مردم',      tier: 'normal',   icon: '😊', cost: 6000000,  effects: { satisfaction: 10, rebellion: -5 }, desc: 'مردم نامش را فریاد می‌زنند.' },
  { id: 'h_judge',  name: 'قاضی بزرگ',       tier: 'normal',   icon: '⚖️', cost: 6000000,  effects: { security: 10, satisfaction: 5 }, desc: 'عدالت، ستون حکومت است.' },
  // قدرتمند
  { id: 'h_winner', name: 'فاتح بزرگ',       tier: 'power',     icon: '🦁', cost: 10000000, effects: { attack: 15, attackerLoss: -10 }, desc: 'هر نبردی با نام او پیروز است.' },
  { id: 'h_fort',   name: 'مدافع افسانه‌ای',  tier: 'power',     icon: '🏔️', cost: 10000000, effects: { defense: 15, castleLoss: -10 }, desc: 'دژی که هرگز سقوط نمی‌کند.' },
  { id: 'h_heal',   name: 'حکیم جنگ',        tier: 'power',     icon: '❤️', cost: 10000000, effects: { heal: 15, finalLoss: -10 }, desc: 'زخم‌ها را به قدرت بدل می‌کند.' },
  { id: 'h_min',    name: 'وزیر خزانه',      tier: 'power',     icon: '🏦', cost: 10000000, effects: { income: 15, gift: 10 }, desc: 'خزانه را به کوه طلا بدل می‌کند.' },
  { id: 'h_diplo',  name: 'دیپلمات اعظم',    tier: 'power',     icon: '🕊️', cost: 10000000, effects: { alliance: 15, allyHelp: 10 }, desc: 'با کلمات، جنگ‌ها را می‌برد.' },
  { id: 'h_ass',    name: 'استاد ترور',      tier: 'power',     icon: '🗡️', cost: 10000000, effects: { assassination: 15, stealth: 10 }, desc: 'خنجر در سایه، قاتل تاج‌ها.' },
  // افسانه‌ای
  { id: 'h_king',   name: 'شاه فاتح',        tier: 'legend',    icon: '👑', cost: 15000000, effects: { attack: 20, attackerLoss: -10, satisfaction: 5 }, desc: 'فاتحی که نامش در تاریخ می‌ماند.' },
  { id: 'h_guard2', name: 'نگهبان امپراتوری', tier: 'legend',    icon: '🦅', cost: 15000000, effects: { defense: 20, landLoss: -10 }, desc: 'امپراتوری در سایه او امن است.' },
  { id: 'h_dragon', name: 'اژدهای جنگ',      tier: 'legend',    icon: '🐉', cost: 15000000, effects: { armyPower: 20, fear: 10 }, desc: 'ترس در دل دشمن می‌کارد.' },
  { id: 'h_build2', name: 'معمار امپراتوری',  tier: 'legend',    icon: '💎', cost: 15000000, effects: { income: 20, satisfaction: 10, gift: 10 }, desc: 'شهرها را به شگفتی بدل می‌کند.' },
  { id: 'h_fate',   name: 'فرزند سرنوشت',    tier: 'legend',    icon: '🌟', cost: 15000000, effects: { positive: 20, negative: -10 }, desc: 'سرنوشت با او هم‌پیمان است.' },
];

const TIERS = {
  weak:   { name: 'ضعیف',    color: '#7bc96f', label: '🟢 قهرمانان ضعیف' },
  normal: { name: 'عادی',    color: '#5aa9e6', label: '🔵 قهرمانان عادی' },
  power:  { name: 'قدرتمند', color: '#b58ae0', label: '🟣 قهرمانان قدرتمند' },
  legend: { name: 'افسانه‌ای', color: '#f4c542', label: '🟡 قهرمانان افسانه‌ای' },
};

const TITLES = [
  'فاتح جهان', 'امپراتور جهان', 'شاه جنگ', 'ثروتمندترین فرمانروا', 'محبوب‌ترین شاه',
  'بزرگ‌ترین مدافع', 'استاد دیپلماسی', 'ارباب تجارت', 'فاتح قاره‌ها', 'فرمانده افسانه‌ای',
];

const ATTACK_TYPES = [
  { id: 'capture', name: 'حمله تصرف',   icon: '⚔️', desc: 'تصرف بخشی از یک سرزمین و گسترش قلمرو روی نقشه.', gold: 0 },
  { id: 'raid',    name: 'حمله غارت',   icon: '💰', desc: 'غارت طلای دشمن بدون تصرف زمین.', gold: 0 },
  { id: 'siege',   name: 'محاصره',      icon: '⛓️', desc: 'کاهش درآمد روزانه دشمن برای یک روز.', gold: 50000 },
  { id: 'assass',  name: 'ترور',        icon: '🗡️', desc: 'ضربه سیاسی: کاهش رضایت و روحیه دشمن.', gold: 250000 },
  { id: 'secret',  name: 'حمله مخفی',   icon: '🥷', desc: 'تصرف با هویت پنهان؛ در صورت شکست فاش می‌شوید.', gold: 100000 },
];

const SHIELDS = [
  { id: 's1', name: 'سپر ۱ روزه',   icon: '🛡️', cost: 500000, days: 1 },
  { id: 's2', name: 'سپر ۲ روزه',   icon: '🛡️', cost: 1200000, days: 2 },
  { id: 's3', name: 'سپر ۳ روزه',   icon: '⚜️', cost: 2000000, days: 3 },
];

const SEASON_DAYS = 14;
const PEACE_DAYS = 2;
const START_GOLD = 500000;
const KINGDOM_COST = 100000;
const BUILDING_MAX_BASE = 5;
const BUILDING_MAX_CASTLE20 = 10;
const MAX_ACTIVE_HEROES = 5;
