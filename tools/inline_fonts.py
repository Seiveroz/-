#!/usr/bin/env python3
"""جاسازی فونت‌ها به صورت base64 داخل style.css تا در حالت آفلاین (file://) هم تضمینی بارگذاری شوند"""
import base64
import os
import re

ROOT = os.path.join(os.path.dirname(__file__), '..')
FONTS = os.path.join(ROOT, 'game', 'assets', 'fonts')
CSS = os.path.join(ROOT, 'game', 'css', 'style.css')

with open(CSS, 'r', encoding='utf-8') as f:
    css = f.read()

def repl(m):
    fname = m.group(1)
    weight = m.group(2)
    fp = os.path.join(FONTS, fname)
    with open(fp, 'rb') as f:
        b64 = base64.b64encode(f.read()).decode('ascii')
    return f"  src: url(data:font/woff2;base64,{b64}) format('woff2');\n  font-weight: {weight}; font-display: swap;"

css = re.sub(
    r"  src: url\('\.\./assets/fonts/(Vazirmatn-[\w-]+\.woff2)'\) format\('woff2'\);\n  font-weight: (\d+); font-display: swap;",
    repl,
    css,
)

with open(CSS, 'w', encoding='utf-8') as f:
    f.write(css)

print('fonts inlined into style.css')
