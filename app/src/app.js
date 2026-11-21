const canvas = document.querySelector('#art');
let ink = canvas.getContext('2d');
const photoLibrary = document.querySelector('#photo-library');
const captionInput = document.querySelector('#caption');
const knobs = { zoom: document.querySelector('#zoom'), x: document.querySelector('#focus-x'), y: document.querySelector('#focus-y') };
const sizes = { square: [1080, 1080], portrait: [1080, 1350], story: [1080, 1920], landscape: [1920, 1080] };
const gradePresets = {
  sunset: { name: 'Vice Sunset', filter: 'saturate(1.35) contrast(1.18)', colors: ['#a63bdb', '#f45c92', '#492192'], opacity: .43 },
  night: { name: 'Neon Night', filter: 'saturate(1.22) contrast(1.12) brightness(1.12)', colors: ['#193867', '#19a4ca', '#322357'], opacity: .52 },
  golden: { name: 'Golden Hour', filter: 'saturate(1.32) contrast(1.08) brightness(1.015)', colors: ['#ffae68', '#ee4994', '#34d6de'], opacity: .27 },
  mono: { name: 'Chrome Mono', filter: 'grayscale(1) contrast(1.35)', colors: ['#accbd8', '#596c85', '#172437'], opacity: .24 },
  teal: { name: 'Tropic Teal', filter: 'saturate(1.21) contrast(1.12)', colors: ['#ffd089', '#32cfb7', '#075e72'], opacity: .46 },
  heat: { name: 'Heatwave', filter: 'sepia(.24) saturate(1.55) contrast(1.15)', colors: ['#ffe08f', '#f87838', '#912955'], opacity: .42 },
};
const layoutPresets = { mosaic: 'Mosaic · 6', seven: 'Seven · 7', hero: 'Hero', grid: 'Grid · 6', slant: 'Slant Seven · 7', solo: 'Solo Poster · 1' };
const captionStyles = { ice: 'Ice Neon', gloss: 'Afterglow Gloss', chrome: 'Liquid Chrome', tube: 'Electric Script', band: 'Skyline Block' };
const captionFields = ['caption', 'subcaption', 'kicker', 'tagline', 'review', 'source', 'billing', 'seal', 'ring', 'release', 'edition', 'title-font', 'script-font'];
const finishToggles = { 'grain-toggle': 'grain', 'vignette-toggle': 'vignette', 'badge-toggle': 'badge', 'furniture-toggle': 'furniture', 'rain-toggle': 'rain' };
const treatment = { grade: 'night', strength: .92, layout: 'hero', style: 'ice', ink: .10, grain: true, vignette: true, badge: true, furniture: true, rain: true };
const initialPhotos = [
  { name: 'Boulevard Driver', src: '/samples/boulevard.jpg', tag: 'THE DRIVER', line: 'MOTOR ROW · 2:14 AM · NO PLATES' },
  { name: 'Pier Watcher', src: '/samples/pier.jpg', tag: 'THE LOOKOUT', line: 'NORTH PIER · 2:19 AM · LAST FERRY' },
  { name: 'Boulevard Fixer', src: '/samples/boulevard.jpg', tag: 'THE FIXER', line: 'OLD TOWN · 2:07 AM · CASE OPEN' },
  { name: 'Pier Voice', src: '/samples/pier.jpg', tag: 'THE VOICE', line: 'BLUE ROOM · 2:11 AM · ONE MORE' },
  { name: 'Boulevard Rider', src: '/samples/boulevard.jpg', tag: 'THE RIDER', line: 'NORTH CUT · 2:23 AM · FULL THROTTLE' },
  { name: 'Pier Skipper', src: '/samples/pier.jpg', tag: 'THE SKIPPER', line: 'EAST CHANNEL · 2:31 AM · NO WAKE' },
  { name: 'Boulevard Getaway', src: '/samples/boulevard.jpg', tag: 'THE GETAWAY', line: 'GLASS MILE · 2:38 AM · LIGHTS OUT' },
];
let photos = [];
let frames = [];
let activeFrame = 0;
let outputSize = 'portrait';
let dragPoint = null;
const history = [];
let historyIndex = -1;

function loadPhoto(record) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ ...record, image });
    image.onerror = reject;
    image.src = record.src;
  });
}

function coverFrames(width, height) {
  const landscape = width / height > 1.25;
  if (treatment.layout === 'grid') {
    const columns = landscape ? 3 : 2;
    const rows = 6 / columns;
    const area = landscape ? .887 : .69;
    return Array.from({ length: 6 }, (_, i) => {
      const left = (i % columns) / columns + .006;
      const top = Math.floor(i / columns) * area / rows + .006;
      const right = left + 1 / columns - .012;
      const bottom = top + area / rows - .012;
      return [[left,top],[right,top],[right,bottom],[left,bottom]];
    });
  }
  if (treatment.layout === 'hero' && landscape) return [
    [[0,0],[.495,0],[.495,.46],[0,.46]], [[.505,0],[1,0],[1,.46],[.505,.46]],
    [[0,.474],[.495,.474],[.495,.704],[0,.704]],
    [[.505,.474],[1,.474],[1,.704],[.505,.704]],
  ];
  if (treatment.layout === 'hero') return [
    [[0,0],[.62,0],[.59,.46],[0,.46]], [[.64,0],[1,0],[1,.22],[.62,.22]],
    [[.63,.24],[1,.24],[1,.46],[.60,.46]], [[0,.48],[.48,.48],[.45,.70],[0,.70]],
    [[.50,.48],[1,.48],[1,.70],[.47,.70]],
  ];
  if (treatment.layout === 'seven') return [
    [[0,0],[.245,0],[.245,.405],[0,.405]], [[.255,0],[.495,0],[.495,.405],[.255,.405]],
    [[.505,0],[.745,0],[.745,.405],[.505,.405]], [[.755,0],[1,0],[1,.405],[.755,.405]],
    [[0,.419],[.327,.419],[.327,.704],[0,.704]], [[.337,.419],[.663,.419],[.663,.704],[.337,.704]],
    [[.673,.419],[1,.419],[1,.704],[.673,.704]],
  ];
  if (treatment.layout === 'slant') return [
    [[0,0],[.34,0],[.28,.33],[0,.33]], [[.36,0],[.68,0],[.63,.33],[.30,.33]], [[.70,0],[1,0],[1,.33],[.65,.33]],
    [[0,.35],[.27,.35],[.23,.70],[0,.70]], [[.29,.35],[.52,.35],[.48,.70],[.25,.70]],
    [[.54,.35],[.77,.35],[.73,.70],[.50,.70]], [[.79,.35],[1,.35],[1,.70],[.75,.70]],
  ];
  if (treatment.layout === 'solo') return [landscape
    ? [[.48,.034],[.974,.034],[.974,.869],[.48,.869]]
    : [[.025,.025],[.975,.025],[.975,.704],[.025,.704]]];
  if (landscape) return [
    [[0,0],[.50,0],[.46,1],[0,1]], [[.52,0],[.75,0],[.73,.30],[.50,.30]],
    [[.77,0],[1,0],[1,.30],[.75,.30]], [[.50,.32],[1,.32],[1,.61],[.48,.61]],
    [[.48,.63],[.73,.63],[.70,1],[.46,1]], [[.75,.63],[1,.63],[1,1],[.72,1]],
  ];
  return [
    [[0, 0], [.62, 0], [.58, .48], [0, .48]],
    [[.64, 0], [1, 0], [1, .48], [.60, .48]],
    [[0, .50], [.51, .50], [.48, .72], [0, .72]],
    [[.53, .50], [1, .50], [1, .72], [.50, .72]],
    [[0, .74], [.44, .74], [.40, 1], [0, 1]],
    [[.46, .74], [1, .74], [1, 1], [.42, 1]],
  ];
}

function bounds(points, width, height) {
  const xs = points.map(([x]) => x * width);
  const ys = points.map(([, y]) => y * height);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}

function pathFor(points, width, height) {
  ink.beginPath();
  points.forEach(([x, y], index) => index ? ink.lineTo(x * width, y * height) : ink.moveTo(x * width, y * height));
  ink.closePath();
}

function newFrame(points, index) {
  const photo = index % photos.length;
  return { points, photo, zoom: 1, x: 50, y: 0, ...photos[photo]?.crop };
}

function suggestedTag(frame) {
  const photo = photos[frame.photo];
  return photo?.tag || photo?.name.toUpperCase() || '';
}

function assignPhoto(frame, photo) {
  frame.photo = photo;
  Object.assign(frame, { zoom: 1, x: 50, y: 0, flip: false, grade: undefined }, photos[photo]?.crop);
  delete frame.tag;
  delete frame.line;
}

function paintPhoto(frame, width, height) {
  const photo = photos[frame.photo];
  if (!photo) return;
  const { image } = photo;
  const box = bounds(frame.points, width, height);
  const fit = Math.max(box.w / image.naturalWidth, box.h / image.naturalHeight) * Math.max(1, frame.zoom);
  const drawWidth = image.naturalWidth * fit;
  const drawHeight = image.naturalHeight * fit;
  const left = box.x + (box.w - drawWidth) * frame.x / 100;
  const top = box.y + (box.h - drawHeight) * frame.y / 100;
  pathFor(frame.points, width, height);
  ink.save();
  ink.clip();
  applyColourGrade(frame, box, () => {
    ink.save();
    if (frame.flip) {
      ink.translate(box.x * 2 + box.w, 0);
      ink.scale(-1, 1);
    }
    ink.drawImage(image, left, top, drawWidth, drawHeight);
    ink.restore();
  });
  ink.restore();
}

function applyColourGrade(frame, box, paint) {
  const grade = gradePresets[frame.grade === 'global' || !frame.grade ? treatment.grade : frame.grade] || gradePresets[treatment.grade];
  ink.save();
  ink.filter = 'none';
  ink.globalAlpha = 1;
  paint();
  ink.filter = grade.filter;
  ink.globalAlpha = treatment.strength;
  paint();
  ink.filter = 'none';
  ink.globalAlpha = 1;
  const overlay = ink.createLinearGradient(box.x, box.y, box.x + box.w, box.y + box.h);
  grade.colors.forEach((color, index) => overlay.addColorStop(index / 2, color));
  ink.globalAlpha = grade.opacity * treatment.strength;
  ink.globalCompositeOperation = 'color';
  ink.fillStyle = overlay;
  ink.fillRect(box.x, box.y, box.w, box.h);
  ink.globalCompositeOperation = 'source-over';
  ink.globalAlpha = .18 * treatment.strength;
  ink.fillRect(box.x, box.y, box.w, box.h);
  ink.restore();
}

function posterInk(width, height) {
  ink.save();
  const step = Math.max(5, Math.min(width, height) / 92);
  ink.fillStyle = `rgba(16,5,36,${treatment.ink})`;
  if (treatment.ink > 0) for (let y = 0; y < height; y += step) for (let x = 0; x < width; x += step) {
    ink.beginPath(); ink.arc(x + (Math.round(y / step) % 2) * step / 2, y, step * .19, 0, Math.PI * 2); ink.fill();
  }
  if (treatment.grain) {
    ink.fillStyle = '#fff3db'; ink.globalAlpha = .065;
    for (let i = 0; i < 9500; i++) ink.fillRect((i * 7919 % width), (i * 3571 % height), 1.5, 1.5);
  }
  if (treatment.vignette) {
    ink.globalAlpha = 1;
    const shade = ink.createRadialGradient(width / 2, height / 2, height * .1, width / 2, height / 2, Math.max(width, height) * .65);
    shade.addColorStop(0, 'transparent'); shade.addColorStop(1, '#09031ba8');
    ink.fillStyle = shade; ink.fillRect(0, 0, width, height);
  }
  if (treatment.rain) {
    ink.globalCompositeOperation = 'screen';
    ink.lineCap = 'round';
    for (let i = 0; i < 145; i++) {
      const x = (i * 7919 % width);
      const y = (i * 3571 % height);
      const length = Math.min(width, height) * (.018 + (i % 5) * .006);
      ink.strokeStyle = i % 4 ? 'rgba(158,231,247,.37)' : 'rgba(255,127,205,.38)';
      ink.lineWidth = Math.max(1, Math.min(width, height) * .0011);
      ink.beginPath(); ink.moveTo(x, y); ink.lineTo(x - length * .32, y + length); ink.stroke();
    }
    for (let i = 0; i < 64; i++) {
      const x = i * width / 64;
      const y = height * (.82 + (i % 7) * .018);
      const length = width * (.012 + (i % 4) * .006);
      ink.strokeStyle = i % 2 ? 'rgba(53,208,231,.34)' : 'rgba(245,73,166,.31)';
      ink.lineWidth = Math.max(2, Math.min(width, height) * .002);
      ink.beginPath(); ink.moveTo(x, y); ink.lineTo(x + length, y + (i % 3) * 2); ink.stroke();
    }
  }
  ink.restore();
}

function drawStarburst(width, height) {
  if (!treatment.badge) return;
  const radius = Math.min(width, height) * .058;
  ink.save(); ink.translate(width * .90, height * .805); ink.rotate(.13);
  ink.beginPath();
  for (let i = 0; i < 32; i++) { const a = i * Math.PI / 16; const r = radius * (i % 2 ? .81 : 1); ink.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  ink.closePath(); ink.fillStyle = '#ffd97c'; ink.strokeStyle = '#25102f'; ink.lineWidth = radius * .07; ink.fill(); ink.stroke();
  ink.textAlign = 'center'; ink.fillStyle = '#25102f'; ink.font = `950 ${radius * .31}px Arial`; ink.fillText(document.querySelector('#seal').value || 'BEST CAST', 0, -radius * .04, radius * 1.4);
  ink.font = `900 ${radius * .14}px Arial`; ink.fillText(document.querySelector('#ring').value || 'RAINLINE FILM FESTIVAL', 0, radius * .23, radius * 1.55); ink.restore();
}

function outlineType(text, x, y, size, maxWidth, color, weight = 950) {
  ink.save();
  ink.translate(x, y);
  ink.scale(.86, 1);
  let fontSize = size;
  const selectedFont = document.querySelector('#title-font')?.value || 'Impact';
  ink.font = `${weight} ${fontSize}px "${selectedFont}", Impact, sans-serif`;
  while (ink.measureText(text).width > maxWidth / .86 && fontSize > 12) {
    fontSize -= 2;
    ink.font = `${weight} ${fontSize}px "${selectedFont}", Impact, sans-serif`;
  }
  ink.lineJoin = 'round';
  ink.strokeStyle = '#1b1021';
  ink.lineWidth = Math.max(4, size * .075);
  ink.strokeText(text, 0, 0);
  ink.fillStyle = color;
  ink.fillText(text, 0, 0);
  ink.restore();
}

function drawNameTag(frame, width, height) {
  const tag = frame.tag ?? suggestedTag(frame);
  if (frame.hideTag || !tag) return;
  const line = frame.line ?? photos[frame.photo]?.line;
  const box = bounds(frame.points, width, height);
  const unit = Math.min(width, height);
  const x = Math.min(...frame.points.slice(0, 2).map(([left]) => left * width)) + unit * .046;
  const lowerPanel = box.y > height * .33;
  const topDetail = box.y < height * .02 && (width / height < .85 || box.w < width * .4);
  const y = lowerPanel || topDetail || treatment.layout === 'solo'
    ? box.y + box.h - unit * .063 : box.y + unit * (box.y < height * .02 ? .053 : .023);
  const max = box.w - unit * .09;
  if (max <= 0) return;
  ink.save();
  const size = unit * (lowerPanel ? .016 : .018);
  ink.font = `900 ${size}px Arial`;
  const tagWidth = ink.measureText(tag.toUpperCase()).width;
  ink.font = `700 ${size * .66}px monospace`;
  const plate = Math.min(max, Math.max(tagWidth, ink.measureText(line || '').width));
  ink.fillStyle = '#190d25ee';
  ink.fillRect(x, y, plate + size, size * (line ? 2.45 : 1.6));
  ink.fillStyle = '#ffbe77';
  ink.fillRect(x, y, size * .15, size * (line ? 2.45 : 1.6));
  ink.font = `900 ${size}px Arial`;
  ink.fillText(tag.toUpperCase(), x + size * .53, y + size * 1.14, plate);
  if (line) {
    ink.font = `700 ${size * .66}px monospace`;
    ink.fillStyle = '#fff4e9';
    ink.fillText(line.toUpperCase(), x + size * .53, y + size * 2.01, plate);
  }
  ink.restore();
}

function drawFurniture(width, height) {
  const unit = Math.min(width, height);
  const left = width * .052;
  const right = width - left;
  const rail = height * .887;
  const ticket = unit * .27;
  const pitch = unit * .016;
  const tagline = document.querySelector('#tagline').value.trim().toUpperCase();
  ink.save();
  ink.fillStyle = '#160f25';
  ink.fillRect(left, rail, right - left, height * .078);
  ink.fillStyle = '#ffbd79';
  ink.fillRect(left, rail, right - left, unit * .002);
  ink.font = `900 ${pitch}px Arial`;
  ink.fillText(tagline, left + pitch * .7, rail + height * .03, right - left - ticket - pitch * 2);
  ink.font = `700 ${pitch * .77}px monospace`;
  ink.fillStyle = '#fff0dc';
  ink.fillText(document.querySelector('#billing').value.toUpperCase(),
    left + pitch * .7, rail + height * .06, right - left - ticket - pitch * 2);
  ink.fillStyle = '#ffba76';
  ink.fillRect(right - ticket, rail, ticket, height * .078);
  ink.fillStyle = '#21132b';
  ink.font = `900 ${pitch * .97}px Arial`;
  ink.fillText(document.querySelector('#release').value.toUpperCase(), right - ticket + pitch * .6, rail + height * .029, ticket * .60);
  ink.font = `700 ${pitch * .7}px monospace`;
  ink.fillText(document.querySelector('#edition').value.toUpperCase(), right - ticket + pitch * .6, rail + height * .049, ticket * .60);
  ink.fillText('RAINLINE · 2:11 AM', right - ticket + pitch * .6, rail + height * .065, ticket * .57);
  for (let i = 0; i < 21; i++) {
    const bar = unit * .0021;
    ink.fillRect(right - pitch - (21 - i) * bar * 1.9, rail + height * .022, bar * (i % 3 ? 1 : .55), height * .041);
  }
  const quoteY = height * .009;
  const quote = `★★★★★  “${document.querySelector('#review').value.toUpperCase()}”  — ${document.querySelector('#source').value.toUpperCase()}`;
  ink.font = `900 ${pitch * .84}px Arial`;
  const quoteWidth = Math.min(ink.measureText(quote).width, width * .66);
  ink.fillStyle = '#160f25';
  ink.fillRect(right - quoteWidth - pitch, quoteY, quoteWidth + pitch, pitch * 1.45);
  ink.fillStyle = '#ffe5a8';
  ink.fillText(quote, right - quoteWidth - pitch * .5, quoteY + pitch, quoteWidth);
  ink.fillStyle = '#101827';
  ink.fillRect(left, rail - height * .026, unit * .22, height * .022);
  ink.fillStyle = '#f4d4ee';
  ink.font = `900 ${pitch * .82}px Arial`;
  ink.fillText(document.querySelector('#release').value.toUpperCase(), left + pitch * .35, rail - height * .01, unit * .2);
  ink.restore();
}

function titleTreatment(width, height) {
  const compact = width / height < .85;
  const split = treatment.layout === 'solo' && width / height > 1.25;
  const base = Math.min(width * (split ? .08 : compact ? .12 : .105), height * (split ? .17 : compact ? .106 : .12));
  const title = (captionInput.value.trim() || 'YOUR STORY').toUpperCase();
  const second = document.querySelector('#subcaption').value.trim();
  const horizontal = !split && width / height > 1.25;
  const y = height * (split ? .55 : horizontal ? .851 : .819);
  ink.save();
  const shadow = ink.createLinearGradient(0, height * .704, 0, height);
  shadow.addColorStop(0, 'rgba(9,8,21,0)');
  shadow.addColorStop(.24, 'rgba(10,8,20,.77)');
  shadow.addColorStop(1, 'rgba(10,8,20,.72)');
  ink.fillStyle = shadow;
  if (!split) ink.fillRect(0, height * .704, width, height * .296);
  if (treatment.style === 'band') {
    const band = ink.createLinearGradient(0, y - base, width, height);
    band.addColorStop(0, '#df3085'); band.addColorStop(1, '#35136c');
    ink.fillStyle = band;
    ink.fillRect(0, split ? height * .24 : height * .708, split ? width * .46 : width, height * (split ? .61 : .18));
    ink.fillStyle = '#160c32';
    for (let i = 0; i < 36; i++) { const h = base * (.15 + (i * 7 % 11) / 15); ink.fillRect(i * width / 35, height - h, width / 30, h); }
  }
  ink.shadowColor = '#ff4f9a';
  ink.shadowBlur = Math.min(width, height) * .018;
  ink.shadowOffsetX = -width * .004;
  ink.shadowOffsetY = height * .008;
  const gloss = ink.createLinearGradient(0, y - base, 0, y);
  const colors = treatment.style === 'chrome' ? ['#fffef3','#a1edff','#263c66','#fff4ff'] : treatment.style === 'ice' ? ['#c4faff','#34e7ee','#ff79c5','#bd8bff'] : ['#fff5b5','#ffc778','#ff72b9','#bc51e1'];
  if (treatment.style === 'tube') { ink.shadowColor = '#75ffed'; ink.shadowBlur = base * .18; }
  if (treatment.style === 'band') { ink.shadowColor = '#ff70bc'; ink.shadowBlur = base * .04; }
  colors.forEach((color, index) => gloss.addColorStop(index / 3, color));
  ink.font = `800 ${base * .17}px Arial`;
  ink.fillStyle = '#ffd4e5';
  ink.fillText(document.querySelector('#kicker').value.toUpperCase(), width * .055, y - base * 1.04, width * .38);
  outlineType(title, width * .047, y, base, width * (split ? .40 : horizontal ? .44 : .76), gloss);
  const scriptFont = document.querySelector('#script-font')?.value || 'Brush Script MT';
  ink.font = `italic 900 ${base * .82}px "${scriptFont}", "Segoe Script", cursive`;
  const scriptWidth = ink.measureText(second).width;
  ink.save(); ink.translate(width * (horizontal ? .52 : .058), y + base * (horizontal ? 0 : .62));
  ink.scale(Math.min(1, width * (split ? .38 : horizontal ? .30 : .70) / Math.max(1, scriptWidth)), 1);
  ink.strokeStyle = '#25102f'; ink.lineWidth = base * .065; ink.strokeText(second, 0, 0);
  ink.fillStyle = treatment.style === 'tube' || treatment.style === 'ice' ? '#ff9bd1' : '#fff0f7'; ink.fillText(second, 0, 0); ink.restore();
  ink.shadowColor = 'transparent';
  ink.shadowBlur = 0;
  const labelSize = Math.max(10, Math.min(width, height) * .017);
  ink.font = `800 ${labelSize}px Arial, sans-serif`;
  ink.letterSpacing = `${labelSize * .26}px`;
  ink.fillStyle = '#ff75ac';
  ink.letterSpacing = `${labelSize * .10}px`;
  if (!treatment.furniture) {
    ink.fillText(document.querySelector('#tagline').value.toUpperCase(), width * .053, Math.min(height * .945, y + base * 1.12), width * .88);
  }
  ink.restore();
}

function drawCover(target = canvas) {
  if (!photos.length) return;
  const previousInk = ink;
  ink = target.getContext('2d');
  const width = target.width;
  const height = target.height;
  ink.clearRect(0, 0, width, height);
  const background = ink.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, '#071429');
  background.addColorStop(.5, '#102b51');
  background.addColorStop(1, '#131630');
  ink.fillStyle = background;
  ink.fillRect(0, 0, width, height);
  const points = coverFrames(width, height);
  const renderFrames = points.map((shape, index) => ({
    ...(photos[frames[index]?.photo] ? frames[index] : newFrame(shape, index)),
    points: shape,
  }));
  if (target === canvas) {
    activeFrame = Math.min(activeFrame, points.length - 1);
    frames = renderFrames;
  }
  renderFrames.forEach((frame) => paintPhoto(frame, width, height));
  posterInk(width, height);
  const edge = Math.min(width, height) * .009;
  ink.lineJoin = 'miter';
  ink.strokeStyle = '#86eaf0';
  ink.lineWidth = edge * 1.2;
  renderFrames.forEach((frame) => { pathFor(frame.points, width, height); ink.stroke(); });
  const titlePad = Math.min(width, height) * .026;
  ink.strokeStyle = '#20162a';
  ink.lineWidth = titlePad * .62;
  ink.strokeRect(titlePad, titlePad, width - titlePad * 2, height - titlePad * 2);
  ink.strokeStyle = 'rgba(255,236,215,.8)';
  ink.lineWidth = Math.max(2, edge * .28);
  ink.strokeRect(titlePad * 1.35, titlePad * 1.35, width - titlePad * 2.7, height - titlePad * 2.7);
  titleTreatment(width, height);
  drawStarburst(width, height);
  renderFrames.forEach((frame) => drawNameTag(frame, width, height));
  if (treatment.furniture) drawFurniture(width, height);
  const stamp = Math.min(width, height) * .012;
  ink.font = `900 ${stamp}px Arial, sans-serif`;
  ink.letterSpacing = `${stamp * .19}px`;
  ink.fillStyle = '#fff4e4';
  ink.shadowColor = '#100a1a';
  ink.shadowBlur = stamp * 1.5;
  ink.fillText('RAINLINE    •    2:11 AM', width * .055, height * .021);
  ink.textAlign = 'right';
  ink.fillStyle = '#ffe5da';
  if (!treatment.furniture) ink.fillText('RAINLINE COVER LAB  /  NO. 01', width * .945, height * .021);
  ink.textAlign = 'left';
  ink.shadowBlur = 0;
  if (target === canvas && document.body.classList.contains('editing')) {
    pathFor(frames[activeFrame].points, width, height);
    ink.setLineDash([width * .008, width * .006]);
    ink.lineWidth = width * .004;
    ink.strokeStyle = '#76f4e2';
    ink.stroke();
    ink.setLineDash([]);
  }
  ink = previousInk;
  if (target === canvas) updateExportPreviews();
}

function updateExportPreviews() {
  for (const [id, format] of [['export-square', 'square'], ['export-portrait', 'portrait'], ['export-landscape', 'landscape']]) {
    const preview = document.getElementById(id);
    if (!preview) continue;
    [preview.width, preview.height] = sizes[format];
    drawCover(preview);
  }
}

function showFrameControls() {
  const frame = frames[activeFrame];
  if (!frame) return;
  document.querySelector('#active-name').textContent = (photos[frame.photo]?.name || 'PHOTO').toUpperCase();
  knobs.zoom.value = frame.zoom;
  knobs.x.value = frame.x;
  knobs.y.value = frame.y;
  document.querySelector('#panel-grade').value = frame.grade || 'global';
  document.querySelector('#name-tag').checked = !frame.hideTag;
  document.querySelector('#tag-name').value = frame.tag ?? suggestedTag(frame);
  document.querySelector('#tag-line').value = frame.line ?? photos[frame.photo]?.line ?? '';
  document.querySelector('#flip-panel').setAttribute('aria-pressed', String(!!frame.flip));
  document.querySelector('#grade-strength-value').textContent = `${Math.round(treatment.strength * 100)}%`;
  document.querySelector('#ink-strength-value').textContent = `${Math.round(treatment.ink * 100)}%`;
  document.querySelector('#panel-grade option[value="global"]').textContent = `Global · ${gradePresets[treatment.grade].name}`;
  document.querySelector('#frame-name').textContent = `FRAME ${String(activeFrame + 1).padStart(2, '0')} / ${frames.length}`;
  document.querySelector('#zoom-value').textContent = `${Number(frame.zoom).toFixed(1)}×`;
  document.querySelector('#x-value').textContent = `${Math.round(frame.x)}%`;
  document.querySelector('#y-value').textContent = `${Math.round(frame.y)}%`;
  document.querySelectorAll('.thumb').forEach((node, index) => node.classList.toggle('active', index === frame.photo));
  drawCover();
}

function setFormat(format) {
  outputSize = format;
  document.querySelectorAll('[data-size]').forEach((button) => button.classList.toggle('selected', button.dataset.size === format));
  const [width, height] = sizes[format];
  activeFrame = Math.min(activeFrame, coverFrames(width, height).length - 1);
  canvas.width = width;
  canvas.height = height;
  const frame = document.querySelector('.stage');
  const scale = document.body.classList.contains('poster-view') ? Math.min(innerWidth / width, innerHeight / height) : Math.min(frame.parentElement.clientWidth / width, 340 / height);
  frame.style.width = `${width * scale}px`;
  frame.style.height = `${height * scale}px`;
  frame.style.aspectRatio = `${width} / ${height}`;
  frame.style.marginInline = 'auto';
  drawCover();
  showFrameControls();
}

function rebuildLibrary() {
  photoLibrary.replaceChildren();
  photos.forEach((photo, index) => {
    const tile = document.createElement('button');
    tile.className = `thumb${frames[activeFrame]?.photo === index ? ' active' : ''}`;
    tile.type = 'button';
    tile.title = `${photo.name} · use in frame ${activeFrame + 1}`;
    const preview = document.createElement('img');
    preview.src = photo.src;
    preview.alt = photo.name;
    const marker = document.createElement('span');
    marker.className = 'thumb-tag';
    marker.textContent = photo.name.toUpperCase().slice(0, 12);
    tile.append(preview, marker);
    tile.addEventListener('click', () => {
      assignPhoto(frames[activeFrame], index);
      showFrameControls();
    });
    photoLibrary.append(tile);
  });
  document.querySelector('#photo-count').textContent = `${photos.length} loaded`;
}

function fillAllPanels() {
  if (!photos.length || !frames.length) return;
  const photoIndex = frames[activeFrame].photo;
  frames.forEach((frame) => assignPhoto(frame, photoIndex));
  rebuildLibrary();
  showFrameControls();
}

function autoFillPanels() {
  if (!photos.length || !frames.length) return;
  frames.forEach((frame, index) => assignPhoto(frame, index % photos.length));
  rebuildLibrary();
  showFrameControls();
}

function shufflePanels() {
  if (!photos.length || !frames.length) return;
  const order = photos.map((_, index) => index);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  frames.forEach((frame, index) => assignPhoto(frame, order[index % order.length]));
  rebuildLibrary();
  showFrameControls();
}

async function exportFormat(format) {
  const [width, height] = sizes[format];
  const output = document.createElement('canvas');
  output.width = width;
  output.height = height;
  drawCover(output);
  const blob = await new Promise((resolve) => output.toBlob(resolve, 'image/png'));
  if (!blob) return;
  const link = document.createElement('a');
  link.download = `rainline-${captionInput.value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'cover'}-${width}x${height}.png`;
  link.href = URL.createObjectURL(blob);
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1200);
}

function exportCover() {
  return exportFormat(outputSize);
}

function closestFrame(event) {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width * canvas.width;
  const y = (event.clientY - rect.top) / rect.height * canvas.height;
  return frames.findIndex(({ points }) => {
    let inside = false;
    for (let a = 0, b = points.length - 1; a < points.length; b = a++) {
      const [ax, ay] = points[a];
      const [bx, by] = points[b];
      if ((ay > y / canvas.height) !== (by > y / canvas.height) && x / canvas.width < (bx - ax) * (y / canvas.height - ay) / (by - ay) + ax) inside = !inside;
    }
    return inside;
  });
}

function setCropValue(name) {
  const frame = frames[activeFrame];
  if (!frame) return;
  frame[name] = Number(knobs[name].value);
  showFrameControls();
}

function syncFinishControls() {
  for (const key of ['grade', 'layout', 'style']) {
    document.querySelectorAll(`[data-${key}]`).forEach((chip) => chip.classList.toggle('selected', chip.dataset[key] === treatment[key]));
  }
  document.querySelector('#grade-strength').value = treatment.strength * 100;
  document.querySelector('#ink-strength').value = treatment.ink * 100;
  document.querySelector('#ink-toggle').checked = treatment.ink > 0;
  for (const [id, key] of Object.entries(finishToggles)) document.getElementById(id).checked = treatment[key];
  document.querySelector('#char-count').textContent = `${captionInput.value.length} / 28`;
}

function syncHistoryButtons() {
  document.querySelector('#undo').disabled = historyIndex < 1;
  document.querySelector('#redo').disabled = historyIndex >= history.length - 1;
}

function recordEdit() {
  const state = JSON.stringify({
    treatment, frames: frames.map(({ points, ...frame }) => frame), activeFrame, outputSize,
    captions: captionFields.map((id) => document.getElementById(id).value),
  });
  const previous = history[historyIndex];
  if (previous) {
    const old = JSON.parse(previous);
    old.activeFrame = activeFrame;
    if (JSON.stringify(old) === state) return;
  }
  history.splice(++historyIndex, history.length, state);
  if (history.length > 60) {
    history.shift();
    historyIndex--;
  }
  syncHistoryButtons();
}

function restoreEdit(offset) {
  const next = historyIndex + offset;
  if (!history[next]) return;
  historyIndex = next;
  const state = JSON.parse(history[next]);
  Object.assign(treatment, state.treatment);
  frames = state.frames;
  activeFrame = state.activeFrame;
  captionFields.forEach((id, index) => { document.getElementById(id).value = state.captions[index]; });
  syncFinishControls();
  setFormat(state.outputSize);
  syncHistoryButtons();
}

function setSceneCrops(scene, width, height) {
  const rainLead = scene === 'lead' && treatment.layout === 'hero' && width / height > 1.25;
  const scenes = {
    lead: rainLead
      ? [[0,1.08,65,0], [1,1,25,-12], [0,1.3,0,80], [1,1.3,100,72]]
      : [[0,1.70,65,0], [1,1.70,25,0], [2,1.45,62,0], [3,1.40,28,0], [4,1.20,64,12], [5,1.20,27,10], [6,1.12,58,11]],
    story: [[2,1.45,62,0], [3,1.22,33,5], [4,1.18,65,4], [5,1.22,27,8], [6,1.10,60,8]],
    solo: [[4,1.65,65,3]],
  };
  if (!scenes[scene] || photos.length < 2) return;
  frames = coverFrames(width, height).map((points, index) => {
    const crop = scenes[scene][index];
    if (!crop || !photos[crop[0]]) return newFrame(points, index);
    const [photo, zoom, x, y] = crop;
    const frame = { points, photo, ...photos[photo].crop, zoom, x, y };
    if ((scene === 'lead' && index > 0) || (scene === 'story' && index > 0)) {
      frame.tag = photos[photo].tag;
      frame.line = photos[photo].line;
    }
    if (rainLead && index >= 2) {
      frame.tag = ['THE GETAWAY', 'EAST CHANNEL'][index - 2];
      frame.line = ['2:23 AM · NO PLATES', '2:31 AM · LAST CROSSING'][index - 2];
    }
    return frame;
  });
}

async function start() {
  const params = new URLSearchParams(location.search);
  const poster = params.has('poster');
  if (poster) document.body.classList.add('poster-view');
  if (Object.hasOwn(gradePresets, params.get('grade'))) treatment.grade = params.get('grade');
  if (Object.hasOwn(layoutPresets, params.get('layout'))) treatment.layout = params.get('layout');
  if (Object.hasOwn(captionStyles, params.get('style'))) treatment.style = params.get('style');
  treatment.ink = params.has('ink') ? Number(params.get('ink')) : treatment.ink;
  treatment.strength = params.has('strength') ? Number(params.get('strength')) : treatment.strength;
  treatment.badge = params.get('badge') !== 'off';
  treatment.grain = params.get('grain') !== 'off';
  treatment.vignette = params.get('vignette') !== 'off';
  treatment.rain = params.get('rain') !== 'off';
  if (!poster) document.body.classList.add('editing');
  if (params.has('caption')) captionInput.value = params.get('caption').slice(0, 28);
  document.querySelector('#subcaption').value = params.get('sub') || 'Rainline';
  document.querySelector('#kicker').value = params.get('kicker') || 'WELCOME TO THE WET SIDE';
  document.querySelector('#tagline').value = params.get('tagline') || (params.get('scene') === 'story' ? 'ONE LAST CROSSING' : 'ONE CITY · NO DRY LAND');
  if (params.has('review')) document.querySelector('#review').value = params.get('review');
  if (params.has('source')) document.querySelector('#source').value = params.get('source');
  syncFinishControls();
  const loaded = await Promise.allSettled(initialPhotos.map(loadPhoto));
  photos = loaded.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []);
  const castCrops = [
    { zoom: 1.70, x: 65, y: 0 },
    { zoom: 1.70, x: 25, y: 0 },
    { zoom: 1.45, x: 62, y: 0, flip: true, grade: 'teal' },
    { zoom: 1.40, x: 28, y: 0, flip: true, grade: 'sunset' },
    { zoom: 1.20, x: 64, y: 12 },
    { zoom: 1.20, x: 27, y: 10, grade: 'teal' },
    { zoom: 1.12, x: 58, y: 11, flip: true },
  ];
  photos.forEach((photo) => { photo.crop = castCrops[initialPhotos.findIndex(({ name }) => name === photo.name)]; });
  const selected = Object.hasOwn(sizes, params.get('size')) ? params.get('size') : 'landscape';
  setSceneCrops(params.get('scene') || (selected === 'landscape' && ['hero', 'seven'].includes(treatment.layout) ? 'lead' : ''), ...sizes[selected]);
  setFormat(selected);
  if (params.has('panelGradeIndex')) {
    const index = Number(params.get('panelGradeIndex'));
    if (frames[index] && Object.hasOwn(gradePresets, params.get('panelGrade'))) frames[index].grade = params.get('panelGrade');
  }
  rebuildLibrary();
  const panel = Number(params.get('panel'));
  if (Number.isInteger(panel) && frames[panel]) activeFrame = panel;
  showFrameControls();
  if (poster) return;
  recordEdit();
  captionInput.addEventListener('input', () => {
    document.querySelector('#char-count').textContent = `${captionInput.value.length} / 28`;
    drawCover();
  });
  captionFields.filter((id) => id !== 'caption').forEach((id) => {
    document.getElementById(id).addEventListener('input', drawCover);
    document.getElementById(id).addEventListener('change', drawCover);
  });
  document.querySelector('#grades').addEventListener('click', (event) => {
    const button = event.target.closest('[data-grade]'); if (!button) return;
    treatment.grade = button.dataset.grade;
    document.querySelectorAll('[data-grade]').forEach((chip) => chip.classList.toggle('selected', chip === button));
    showFrameControls();
  });
  document.querySelector('#layouts').addEventListener('click', (event) => {
    const button = event.target.closest('[data-layout]'); if (!button) return;
    treatment.layout = button.dataset.layout;
    document.querySelectorAll('[data-layout]').forEach((chip) => chip.classList.toggle('selected', chip === button));
    activeFrame = 0; drawCover(); showFrameControls();
  });
  document.querySelector('#caption-styles').addEventListener('click', (event) => {
    const button = event.target.closest('[data-style]'); if (!button) return;
    treatment.style = button.dataset.style;
    document.querySelectorAll('[data-style]').forEach((chip) => chip.classList.toggle('selected', chip === button)); drawCover();
  });
  document.querySelector('#grade-strength').addEventListener('input', (event) => {
    treatment.strength = Number(event.target.value) / 100;
    document.querySelector('#grade-strength-value').textContent = `${event.target.value}%`;
    drawCover();
  });
  document.querySelector('#ink-strength').addEventListener('input', (event) => {
    treatment.ink = document.querySelector('#ink-toggle').checked ? Number(event.target.value) / 100 : 0;
    document.querySelector('#ink-strength-value').textContent = `${event.target.value}%`;
    drawCover();
  });
  document.querySelector('#ink-toggle').addEventListener('change', (event) => { treatment.ink = event.target.checked ? Number(document.querySelector('#ink-strength').value) / 100 : 0; drawCover(); });
  Object.entries(finishToggles).forEach(([id, key]) => document.getElementById(id).addEventListener('change', (event) => { treatment[key] = event.target.checked; drawCover(); }));
  document.querySelector('#name-tag').addEventListener('change', (event) => {
    frames[activeFrame].hideTag = !event.target.checked;
    drawCover();
  });
  for (const [id, key] of [['tag-name', 'tag'], ['tag-line', 'line']]) {
    document.getElementById(id).addEventListener('input', (event) => {
      frames[activeFrame][key] = event.target.value;
      drawCover();
    });
  }
  document.querySelector('#flip-panel').addEventListener('click', () => {
    const frame = frames[activeFrame];
    frame.flip = !frame.flip;
    showFrameControls();
  });
  document.querySelector('#swap-panel').addEventListener('click', () => {
    const next = (activeFrame + 1) % frames.length;
    [frames[activeFrame], frames[next]] = [frames[next], frames[activeFrame]];
    activeFrame = next;
    showFrameControls();
  });
  document.querySelector('#surprise').addEventListener('click', () => {
    const pickOther = (options, current) => {
      const choices = Object.keys(options).filter((key) => key !== current);
      return choices[Math.floor(Math.random() * choices.length)];
    };
    treatment.layout = pickOther(layoutPresets, treatment.layout);
    treatment.grade = pickOther(gradePresets, treatment.grade);
    activeFrame = 0;
    frames = [];
    syncFinishControls();
    drawCover();
    shufflePanels();
  });
  document.querySelector('#undo').addEventListener('click', () => restoreEdit(-1));
  document.querySelector('#redo').addEventListener('click', () => restoreEdit(1));
  document.querySelector('.controls').addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (button && !['undo', 'redo', 'export'].includes(button.id)) recordEdit();
  });
  document.querySelector('.controls').addEventListener('change', (event) => {
    if (event.target.id !== 'upload') recordEdit();
  });
  document.querySelector('#panel-grade').addEventListener('change', (event) => { frames[activeFrame].grade = event.target.value === 'global' ? undefined : event.target.value; drawCover(); });
  document.querySelector('#fill-all').addEventListener('click', fillAllPanels);
  document.querySelector('#auto-fill').addEventListener('click', autoFillPanels);
  document.querySelector('#shuffle').addEventListener('click', shufflePanels);
  document.querySelector('#upload').addEventListener('change', async (event) => {
    for (const file of event.target.files) {
      if (!file.type.startsWith('image/')) continue;
      const src = URL.createObjectURL(file);
      let photo;
      try {
        photo = await loadPhoto({ name: file.name.replace(/\.[^.]+$/, '').slice(0, 18), src });
      } catch {
        URL.revokeObjectURL(src);
        continue;
      }
      photos.push(photo);
      if (frames[activeFrame]) assignPhoto(frames[activeFrame], photos.length - 1);
    }
    rebuildLibrary();
    drawCover();
    showFrameControls();
    recordEdit();
  });
  document.querySelector('#sizes').addEventListener('click', (event) => {
    const button = event.target.closest('[data-size]');
    if (button) setFormat(button.dataset.size);
  });
  document.querySelector('#export').addEventListener('click', exportCover);
  document.querySelector('#export-all').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    try {
      for (const format of ['square', 'portrait', 'landscape']) await exportFormat(format);
    } finally {
      button.disabled = false;
    }
  });
  document.querySelector('#save').addEventListener('click', exportCover);
  Object.keys(knobs).forEach((name) => knobs[name].addEventListener('input', () => setCropValue(name)));
  canvas.addEventListener('pointerdown', (event) => {
    const selectedFrame = closestFrame(event);
    if (selectedFrame < 0) return;
    activeFrame = selectedFrame;
    dragPoint = { x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
    showFrameControls();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!dragPoint || !event.buttons || document.body.classList.contains('poster-view')) return;
    const rect = canvas.getBoundingClientRect();
    frames[activeFrame].x = Math.max(0, Math.min(100, frames[activeFrame].x - (event.clientX - dragPoint.x) / rect.width * 100));
    frames[activeFrame].y = Math.max(0, Math.min(100, frames[activeFrame].y - (event.clientY - dragPoint.y) / rect.height * 100));
    dragPoint = { x: event.clientX, y: event.clientY };
    showFrameControls();
  });
  const endDrag = () => {
    dragPoint = null;
    recordEdit();
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
}

start();
