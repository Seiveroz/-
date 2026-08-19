/* کپی فایل‌های بازی به داخل پوشه اپلیکیشن برای بسته‌بندی */
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'game');
const dst = path.join(__dirname, 'game');

fs.rmSync(dst, { recursive: true, force: true });

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const s = path.join(from, entry.name);
    const d = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

copyDir(src, dst);
console.log('بازی با موفقیت کپی شد: ' + dst);
