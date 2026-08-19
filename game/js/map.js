/* ============================================================
   جنگ سلسله — نقشه جهان (SVG)
   ============================================================ */

const MAP_PATHS = {
  scandi: 'M400,44 C470,30 522,52 534,92 C548,132 512,158 462,164 C412,170 388,150 380,120 C372,88 360,58 400,44 Z',
  europe: 'M160,170 C220,150 300,162 326,196 C352,232 338,272 298,292 C258,312 204,300 178,268 C152,238 128,196 160,170 Z',
  rome:   'M312,300 C362,286 424,300 438,338 C452,378 428,438 388,458 C348,478 316,458 306,420 C296,380 280,318 312,300 Z',
  arabia: 'M480,306 C548,292 622,308 636,346 C650,386 632,436 592,452 C552,468 500,456 484,416 C468,376 440,324 480,306 Z',
  iran:   'M648,238 C708,222 782,240 796,278 C810,318 796,368 760,382 C724,396 668,384 656,344 C644,304 606,258 648,238 Z',
  korea:  'M812,128 C872,114 944,132 954,168 C964,204 946,256 906,270 C866,284 820,272 808,238 C796,202 772,146 812,128 Z',
};

const MAP_BBOX = {
  scandi: { x: 378, y: 42, w: 158, h: 124 },
  europe: { x: 150, y: 168, w: 178, h: 126 },
  rome:   { x: 304, y: 298, w: 138, h: 162 },
  arabia: { x: 482, y: 304, w: 156, h: 150 },
  iran:   { x: 646, y: 236, w: 152, h: 148 },
  korea:  { x: 810, y: 126, w: 146, h: 146 },
};

const MAP_LABEL = {
  scandi: { x: 458, y: 108 },
  europe: { x: 238, y: 232 },
  rome:   { x: 372, y: 380 },
  arabia: { x: 560, y: 382 },
  iran:   { x: 722, y: 314 },
  korea:  { x: 884, y: 204 },
};

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function mapHTML(state) {
  const defs = LANDS.map(l => `<clipPath id="clip-${l.id}"><path d="${MAP_PATHS[l.id]}"/></clipPath>`).join('');
  let lands = LANDS.map(l => {
    const land = l;
    const bbox = MAP_BBOX[l.id];
    const owners = landOwners(state, l.id);
    const neutral = neutralShare(state, l.id);
    // چیدمان مالکیت از چپ به راست
    let segs = [];
    owners.forEach(o => segs.push({ color: o.king.color, share: o.share, label: o.king.kingdom, isPlayer: o.king.isPlayer }));
    segs.push({ color: 'transparent', share: neutral, label: 'آزاد', isPlayer: false });
    let x = bbox.x;
    const segRects = segs.map(s => {
      const w = bbox.w * s.share / 100;
      const r = `<rect x="${x}" y="${bbox.y - 2}" width="${w + 1}" height="${bbox.h + 4}" fill="${s.color}" opacity="0.9"/>`;
      x += w;
      return r;
    }).join('');
    const playerShare = owners.find(o => o.king.isPlayer);
    const name = `${land.flag} ${land.name}`;
    const lp = MAP_LABEL[l.id];
    const badge = playerShare ? `<text x="${lp.x}" y="${lp.y + 22}" text-anchor="middle" font-size="14" fill="#f4cf7a" font-weight="700">${faNum(playerShare.share)}٪</text>` : '';
    return `
    <g class="land-blob" data-land="${l.id}">
      <path d="${MAP_PATHS[l.id]}" fill="${land.color}" opacity="0.28" stroke="#e6b14c" stroke-width="2.4" stroke-opacity="0.55"/>
      <g clip-path="url(#clip-${l.id})">
        <rect x="${bbox.x}" y="${bbox.y - 2}" width="${bbox.w}" height="${bbox.h + 4}" fill="${land.color}" opacity="0.5"/>
        ${segRects}
      </g>
      <path d="${MAP_PATHS[l.id]}" fill="none" stroke="#f4cf7a" stroke-width="1.4" stroke-opacity="0.55"/>
      <text x="${lp.x}" y="${lp.y}" text-anchor="middle" font-size="17" fill="#ffe9b8" font-weight="700" style="paint-order:stroke;stroke:#0a0e1a;stroke-width:4px">${name}</text>
      ${badge}
    </g>`;
  }).join('');

  return `
  <svg viewBox="0 0 1000 560" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#0d1629"/><stop offset="1" stop-color="#0a1120"/>
      </linearGradient>
      ${defs}
    </defs>
    <rect width="1000" height="560" fill="url(#sea)"/>
    <!-- امواج تزئینی دریا -->
    <g stroke="#1b2b4a" stroke-width="1.4" fill="none" opacity="0.7">
      <path d="M30,60 q40,-12 80,0 t80,0 t80,0 t80,0"/>
      <path d="M120,140 q40,-12 80,0 t80,0 t80,0 t80,0"/>
      <path d="M40,470 q40,-12 80,0 t80,0 t80,0 t80,0 t80,0 t80,0 t80,0"/>
      <path d="M400,520 q40,-12 80,0 t80,0 t80,0 t80,0"/>
      <path d="M700,60 q40,-12 80,0 t80,0"/>
    </g>
    <text x="500" y="545" text-anchor="middle" font-size="13" fill="#33415e">🌊 دریای بزرگ</text>
    <text x="500" y="26" text-anchor="middle" font-size="15" fill="#8a93a8">نقشه جهان باستان</text>
    ${lands}
  </svg>`;
}
