#!/usr/bin/env bash
# ساخت نصب‌کننده ویندوز (Jang-Selseleh-Setup.exe) با استفاده از Zig
set -e
cd "$(dirname "$0")/.."
ZIG="${ZIG:-/tmp/zigpkg/ziglang/zig}"

echo "[1/4] جاسازی فایل‌های بازی..."
python3 tools/gen_embed.py

echo "[2/4] کامپایل منبع آیکون..."
"$ZIG" rc /fo tools/app.res tools/app.rc

echo "[3/4] ساخت exe ویندوز..."
"$ZIG" cc -target x86_64-windows-gnu tools/installer.c tools/app.res \
  -o build/Jang-Selseleh-Setup.exe \
  -Wl,--subsystem,windows \
  -lole32 -lshell32 -luuid -ladvapi32 -luser32

echo "[4/4] پاک‌سازی..."
rm -f build/*.pdb

echo "✔ ساخته شد: build/Jang-Selseleh-Setup.exe"
