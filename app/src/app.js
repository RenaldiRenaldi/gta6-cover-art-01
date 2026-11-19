const canvas = document.querySelector('#art');
const ink = canvas.getContext('2d');
const photoLibrary = document.querySelector('#photo-library');
const captionInput = document.querySelector('#caption');
const knobs = { zoom: document.querySelector('#zoom'), x: document.querySelector('#focus-x'), y: document.querySelector('#focus-y') };
const sizes = { square: [1080, 1080], portrait: [1080, 1350], story: [1080, 1920], landscape: [1920, 1080] };
const gradePresets = {
  sunset: { name: 'Vice Sunset', filter: 'saturate(1.35) contrast(1.18)', colors: ['#a63bdb', '#f45c92', '#492192'], opacity: .43 },
  night: { name: 'Neon Night', filter: 'saturate(.8) contrast(1.28) brightness(.48)', colors: ['#081a6b', '#174ba8', '#070e3b'], opacity: .64 },
  golden: { name: 'Golden Hour', filter: 'saturate(1.32) contrast(1.08) brightness(1.015)', colors: ['#ffae68', '#ee4994', '#34d6de'], opacity: .27 },
  mono: { name: 'Chrome Mono', filter: 'grayscale(1) contrast(1.35)', colors: ['#accbd8', '#596c85', '#172437'], opacity: .24 },
};
const layoutPresets = { mosaic: 'Mosaic · 6', strip: 'Slant · 4', seven: 'Mosaic · 7', hero: 'Hero · 5' };
const captionStyles = { gloss: 'Afterglow Gloss', chrome: 'Liquid Chrome', tube: 'Electric Script', band: 'Skyline Block' };
const treatment = { grade: 'sunset', strength: .85, layout: 'mosaic', style: 'gloss', ink: .16, grain: true, vignette: true, badge: true };
const initialPhotos = [
  { name: 'Sunset Boulevard', src: '/samples/boulevard.jpg' },
  { name: 'Blue Hour Pier', src: '/samples/pier.jpg' },
];
let photos = [];
let frames = [];
let activeFrame = 0;
let outputSize = 'portrait';
let dragPoint = null;

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
  if (treatment.layout === 'hero') return [
    [[0,0],[.62,0],[.59,.68],[0,.68]], [[.64,0],[1,0],[1,.32],[.62,.32]],
    [[.63,.34],[1,.34],[1,.68],[.60,.68]], [[0,.70],[.48,.70],[.45,1],[0,1]],
    [[.50,.70],[1,.70],[1,1],[.47,1]],
  ];
  if (treatment.layout === 'seven') return [
    [[0,0],[.55,0],[.51,.65],[0,.65]],
    [[.57,0],[.78,0],[.76,.32],[.55,.32]],
    [[.80,0],[1,0],[1,.32],[.78,.32]],
    [[.55,.34],[1,.34],[1,.65],[.53,.65]],
    [[0,.67],[.32,.67],[.29,1],[0,1]],
    [[.34,.67],[.65,.67],[.62,1],[.31,1]],
    [[.67,.67],[1,.67],[1,1],[.64,1]],
  ];
  if (treatment.layout === 'strip') return [
    [[0, 0], [.66, 0], [.57, 1], [0, 1]],
    [[.68, 0], [1, 0], [1, .48], [.64, .48]],
    [[.65, .50], [1, .50], [1, .76], [.62, .76]],
    [[.60, .78], [1, .78], [1, 1], [.56, 1]],
  ];
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

function paintPhoto(frame, width, height) {
  const photo = photos[frame.photo % photos.length];
  if (!photo) return;
  const { image } = photo;
  const box = bounds(frame.points, width, height);
  const fit = Math.max(box.w / image.naturalWidth, box.h / image.naturalHeight) * frame.zoom;
  const drawWidth = image.naturalWidth * fit;
  const drawHeight = image.naturalHeight * fit;
  const left = box.x + (box.w - drawWidth) * frame.x / 100;
  const top = box.y + (box.h - drawHeight) * frame.y / 100;
  pathFor(frame.points, width, height);
  ink.save();
  ink.clip();
  applyColourGrade(frame, box, () => ink.drawImage(image, left, top, drawWidth, drawHeight));
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
  ink.restore();
}

function drawStarburst(width, height) {
  if (!treatment.badge) return;
  const radius = Math.min(width, height) * .087;
  ink.save(); ink.translate(width * .87, height * .20); ink.rotate(.13);
  ink.beginPath();
  for (let i = 0; i < 32; i++) { const a = i * Math.PI / 16; const r = radius * (i % 2 ? .81 : 1); ink.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  ink.closePath(); ink.fillStyle = '#ffd97c'; ink.strokeStyle = '#25102f'; ink.lineWidth = radius * .07; ink.fill(); ink.stroke();
  ink.textAlign = 'center'; ink.fillStyle = '#25102f'; ink.font = `950 ${radius * .36}px Arial`; ink.fillText('NEW', 0, 0);
  ink.font = `900 ${radius * .16}px Arial`; ink.fillText('SUMMER 2026', 0, radius * .28); ink.restore();
}

function outlineType(text, x, y, size, maxWidth, color, weight = 950) {
  ink.save();
  ink.translate(x, y);
  ink.scale(.86, 1);
  let fontSize = size;
  ink.font = `${weight} ${fontSize}px Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif`;
  while (ink.measureText(text).width > maxWidth / .86 && fontSize > 12) {
    fontSize -= 2;
    ink.font = `${weight} ${fontSize}px Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif`;
  }
  ink.lineJoin = 'round';
  ink.strokeStyle = '#1b1021';
  ink.lineWidth = Math.max(4, size * .075);
  ink.strokeText(text, 0, 0);
  ink.fillStyle = color;
  ink.fillText(text, 0, 0);
  ink.restore();
}

function titleTreatment(width, height) {
  const compact = width / height < .85;
  const base = Math.min(width * (compact ? .12 : .108), height * .19);
  const title = (captionInput.value.trim() || 'YOUR STORY').toUpperCase();
  let first = title;
  const second = document.querySelector('#subcaption').value.trim();
  const y = height * (compact ? .78 : .74);
  ink.save();
  const shadow = ink.createLinearGradient(0, y - base * 1.65, 0, height);
  shadow.addColorStop(0, 'rgba(9,8,21,0)');
  shadow.addColorStop(.24, 'rgba(10,8,20,.77)');
  shadow.addColorStop(1, 'rgba(10,8,20,.72)');
  ink.fillStyle = shadow;
  ink.fillRect(0, y - base * 1.8, width, height - y + base * 1.8);
  if (treatment.style === 'band') {
    const band = ink.createLinearGradient(0, y - base, width, height);
    band.addColorStop(0, '#df3085'); band.addColorStop(1, '#35136c');
    ink.fillStyle = band; ink.fillRect(0, y - base * 1.3, width, height);
    ink.fillStyle = '#160c32';
    for (let i = 0; i < 36; i++) { const h = base * (.15 + (i * 7 % 11) / 15); ink.fillRect(i * width / 35, height - h, width / 30, h); }
  }
  ink.shadowColor = '#ff4f9a';
  ink.shadowBlur = Math.min(width, height) * .018;
  ink.shadowOffsetX = -width * .004;
  ink.shadowOffsetY = height * .008;
  const gloss = ink.createLinearGradient(0, y - base, 0, y);
  const colors = treatment.style === 'chrome' ? ['#fffef3','#a1edff','#263c66','#fff4ff'] : ['#fff5b5','#ffc778','#ff72b9','#bc51e1'];
  if (treatment.style === 'tube') { ink.shadowColor = '#75ffed'; ink.shadowBlur = base * .18; }
  if (treatment.style === 'band') { ink.shadowColor = '#ff70bc'; ink.shadowBlur = base * .04; }
  colors.forEach((color, index) => gloss.addColorStop(index / 3, color));
  ink.font = `800 ${base * .17}px Arial`;
  ink.fillStyle = '#ffd4e5';
  ink.fillText(document.querySelector('#kicker').value.toUpperCase(), width * .055, y - base * 1.23);
  outlineType(first, width * .047, y - base * .14, base, width * .90, gloss);
  ink.font = `italic 900 ${base * .92}px "Brush Script MT", "Segoe Script", cursive`;
  const scriptWidth = ink.measureText(second).width;
  ink.save(); ink.translate(width * .08, y + base * .76);
  ink.scale(Math.min(1, width * .82 / Math.max(1, scriptWidth)), 1);
  ink.strokeStyle = '#25102f'; ink.lineWidth = base * .065; ink.strokeText(second, 0, 0);
  ink.fillStyle = treatment.style === 'tube' ? '#a7fff1' : '#fff0f7'; ink.fillText(second, 0, 0); ink.restore();
  ink.shadowColor = 'transparent';
  ink.shadowBlur = 0;
  const labelSize = Math.max(10, Math.min(width, height) * .017);
  ink.font = `800 ${labelSize}px Arial, sans-serif`;
  ink.letterSpacing = `${labelSize * .26}px`;
  ink.fillStyle = '#ff75ac';
  ink.letterSpacing = `${labelSize * .10}px`;
  ink.fillText(document.querySelector('#tagline').value.toUpperCase(), width * .053, Math.min(height * .945, y + base * 1.12), width * .88);
  ink.restore();
}

function drawCover() {
  const width = canvas.width;
  const height = canvas.height;
  if (!photos.length) return;
  ink.clearRect(0, 0, width, height);
  const background = ink.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, '#ffac69');
  background.addColorStop(.5, '#ed579a');
  background.addColorStop(1, '#39ced0');
  ink.fillStyle = background;
  ink.fillRect(0, 0, width, height);
  const points = coverFrames(width, height);
  activeFrame = Math.min(activeFrame, points.length - 1);
  frames = points.map((shape, index) => frames[index] || (index % 2 ? { points: shape, photo: index % photos.length, zoom: .68, x: 5, y: 2 } : { points: shape, photo: index % photos.length, zoom: 1 + (index % 3) * .13, x: 26 + (index * 23) % 52, y: 15 + (index * 31) % 70 }));
  frames.forEach((frame, index) => { frame.points = points[index]; paintPhoto(frame, width, height); });
  posterInk(width, height);
  const edge = Math.min(width, height) * .009;
  ink.lineJoin = 'miter';
  ink.strokeStyle = '#fff1dc';
  ink.lineWidth = edge * 1.2;
  frames.forEach((frame) => { pathFor(frame.points, width, height); ink.stroke(); });
  const titlePad = Math.min(width, height) * .026;
  ink.strokeStyle = '#20162a';
  ink.lineWidth = titlePad * .62;
  ink.strokeRect(titlePad, titlePad, width - titlePad * 2, height - titlePad * 2);
  ink.strokeStyle = 'rgba(255,236,215,.8)';
  ink.lineWidth = Math.max(2, edge * .28);
  ink.strokeRect(titlePad * 1.35, titlePad * 1.35, width - titlePad * 2.7, height - titlePad * 2.7);
  titleTreatment(width, height);
  drawStarburst(width, height);
  const stamp = Math.min(width, height) * .012;
  ink.font = `900 ${stamp}px Arial, sans-serif`;
  ink.letterSpacing = `${stamp * .19}px`;
  ink.fillStyle = '#fff4e4';
  ink.shadowColor = '#100a1a';
  ink.shadowBlur = stamp * 1.5;
  ink.fillText('VICE CITY    •    26', width * .055, height * .055);
  ink.textAlign = 'right';
  ink.fillStyle = '#ffe5da';
  ink.fillText('AFTERGLOW  /  NO. 06', width * .945, height * .055);
  ink.textAlign = 'left';
  ink.shadowBlur = 0;
  if (document.body.classList.contains('editing')) {
    pathFor(frames[activeFrame].points, width, height);
    ink.setLineDash([width * .008, width * .006]);
    ink.lineWidth = width * .004;
    ink.strokeStyle = '#76f4e2';
    ink.stroke();
    ink.setLineDash([]);
    ink.fillStyle = '#76f4e2';
    const box = bounds(frames[activeFrame].points, width, height);
    ink.fillRect(box.x + 12, box.y + 12, Math.min(width * .11, 100), height * .026);
  }
}

function showFrameControls() {
  const frame = frames[activeFrame];
  if (!frame) return;
  document.querySelector('#active-name').textContent = `FRAME ${String(activeFrame + 1).padStart(2, '0')} · ${photos[frame.photo]?.name || 'PHOTO'}`.toUpperCase();
  knobs.zoom.value = frame.zoom;
  knobs.x.value = frame.x;
  knobs.y.value = frame.y;
  document.querySelector('#panel-grade').value = frame.grade || 'global';
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
  const scale = document.body.classList.contains('poster-view') ? Math.min(innerWidth / width, innerHeight / height) : Math.min(frame.parentElement.clientWidth / width, 540 / height);
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
      frames[activeFrame].photo = index;
      showFrameControls();
    });
    photoLibrary.append(tile);
  });
  document.querySelector('#photo-count').textContent = `${photos.length} loaded`;
}

function fillAllPanels() {
  if (!photos.length || !frames.length) return;
  const photoIndex = frames[activeFrame].photo;
  frames.forEach((frame) => { frame.photo = photoIndex; });
  rebuildLibrary();
  drawCover();
}

function autoFillPanels() {
  if (!photos.length || !frames.length) return;
  frames.forEach((frame, index) => { frame.photo = index % photos.length; });
  rebuildLibrary();
  drawCover();
}

function shufflePanels() {
  if (!photos.length || !frames.length) return;
  frames.forEach((frame) => { frame.photo = Math.floor(Math.random() * photos.length); });
  rebuildLibrary();
  drawCover();
}

function exportCover() {
  const [width, height] = sizes[outputSize];
  const previous = [canvas.width, canvas.height];
  canvas.width = width;
  canvas.height = height;
  drawCover();
  canvas.toBlob((blob) => {
    if (!blob) return;
    const link = document.createElement('a');
    link.download = `afterglow-${captionInput.value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'cover'}-${width}x${height}.png`;
    link.href = URL.createObjectURL(blob);
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1200);
    canvas.width = previous[0];
    canvas.height = previous[1];
    drawCover();
  }, 'image/png');
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
  frame[name] = Number(knobs[name].value);
  showFrameControls();
}

async function start() {
  const params = new URLSearchParams(location.search);
  const poster = params.has('poster');
  if (poster) document.body.classList.add('poster-view');
  treatment.grade = params.get('grade') || treatment.grade;
  treatment.layout = params.get('layout') || treatment.layout;
  treatment.style = params.get('style') || treatment.style;
  treatment.ink = params.has('ink') ? Number(params.get('ink')) : treatment.ink;
  treatment.strength = params.has('strength') ? Number(params.get('strength')) : treatment.strength;
  treatment.badge = params.get('badge') !== 'off';
  treatment.grain = params.get('grain') !== 'off';
  treatment.vignette = params.get('vignette') !== 'off';
  if (!poster) document.body.classList.add('editing');
  if (params.has('caption')) captionInput.value = params.get('caption').slice(0, 28);
  document.querySelector('#subcaption').value = params.get('sub') || 'Vice City';
  document.querySelector('#kicker').value = params.get('kicker') || 'Welcome to';
  document.querySelector('#tagline').value = params.get('tagline') || 'A Vice City story  /  Sunset Division';
  document.querySelectorAll('[data-grade]').forEach((chip) => chip.classList.toggle('selected', chip.dataset.grade === treatment.grade));
  document.querySelectorAll('[data-layout]').forEach((chip) => chip.classList.toggle('selected', chip.dataset.layout === treatment.layout));
  document.querySelectorAll('[data-style]').forEach((chip) => chip.classList.toggle('selected', chip.dataset.style === treatment.style));
  document.querySelector('#grade-strength').value = treatment.strength * 100;
  document.querySelector('#ink-strength').value = treatment.ink * 100;
  document.querySelector('#ink-toggle').checked = treatment.ink > 0;
  document.querySelector('#grain-toggle').checked = treatment.grain;
  document.querySelector('#vignette-toggle').checked = treatment.vignette;
  document.querySelector('#badge-toggle').checked = treatment.badge;
  try { photos = await Promise.all(initialPhotos.map(loadPhoto)); } catch { photos = []; }
  if (poster && params.get('photo') === 'pier' && photos.length > 1) {
    frames = coverFrames(1280, 720).map((points, index) => ({ points, photo: index % 2 ? 0 : 1, zoom: .60, x: 5, y: 2, grade: index === Number(params.get('panelGradeIndex')) ? params.get('panelGrade') : undefined }));
  }
  const selected = params.get('size');
  if (selected && sizes[selected]) setFormat(selected); else setFormat('landscape');
  if (params.has('panelGradeIndex')) {
    const index = Number(params.get('panelGradeIndex'));
    if (frames[index]) { frames[index].grade = params.get('panelGrade') || treatment.grade; drawCover(); }
  }
  rebuildLibrary();
  if (params.has('panel') && Number.isInteger(Number(params.get('panel')))) activeFrame = Number(params.get('panel')) % frames.length;
  showFrameControls();
  if (poster) {
    const [width, height] = sizes[selected] || sizes.landscape;
    canvas.width = width;
    canvas.height = height;
    const scale = Math.min(innerWidth / width, innerHeight / height);
    const stage = document.querySelector('.stage');
    stage.style.width = `${width * scale}px`;
    stage.style.height = `${height * scale}px`;
    stage.style.aspectRatio = `${width} / ${height}`;
    drawCover();
  }
  captionInput.addEventListener('input', () => {
    document.querySelector('#char-count').textContent = `${captionInput.value.length} / 28`;
    drawCover();
  });
  ['subcaption', 'kicker', 'tagline'].forEach((id) => document.querySelector(`#${id}`).addEventListener('input', drawCover));
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
  [['grain-toggle','grain'],['vignette-toggle','vignette'],['badge-toggle','badge']].forEach(([id, key]) => document.querySelector(`#${id}`).addEventListener('change', (event) => { treatment[key] = event.target.checked; drawCover(); }));
  document.querySelector('#panel-grade').addEventListener('change', (event) => { frames[activeFrame].grade = event.target.value === 'global' ? undefined : event.target.value; drawCover(); });
  document.querySelector('#fill-all').addEventListener('click', fillAllPanels);
  document.querySelector('#auto-fill').addEventListener('click', autoFillPanels);
  document.querySelector('#shuffle').addEventListener('click', shufflePanels);
  document.querySelector('#upload').addEventListener('change', async (event) => {
    for (const file of event.target.files) {
      if (!file.type.startsWith('image/')) continue;
      const photo = await loadPhoto({ name: file.name.replace(/\.[^.]+$/, '').slice(0, 18), src: URL.createObjectURL(file) });
      photos.push(photo);
      if (frames[activeFrame]) frames[activeFrame].photo = photos.length - 1;
    }
    rebuildLibrary();
    showFrameControls();
  });
  document.querySelector('#sizes').addEventListener('click', (event) => {
    const button = event.target.closest('[data-size]');
    if (button) setFormat(button.dataset.size);
  });
  document.querySelector('#export').addEventListener('click', exportCover);
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
  canvas.addEventListener('pointerup', () => { dragPoint = null; });
}

start();
