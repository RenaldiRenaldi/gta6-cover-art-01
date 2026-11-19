const canvas = document.querySelector('#art');
const ink = canvas.getContext('2d');
const photoLibrary = document.querySelector('#photo-library');
const captionInput = document.querySelector('#caption');
const knobs = { zoom: document.querySelector('#zoom'), x: document.querySelector('#focus-x'), y: document.querySelector('#focus-y') };
const sizes = { square: [1080, 1080], portrait: [1080, 1350], story: [1080, 1920], landscape: [1920, 1080] };
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
  const ratio = width / height;
  if (ratio > 1.25) return [
    [[0, 0], [.66, 0], [.57, 1], [0, 1]],
    [[.68, 0], [1, 0], [1, .48], [.64, .48]],
    [[.65, .50], [1, .50], [1, .76], [.62, .76]],
    [[.60, .78], [1, .78], [1, 1], [.56, 1]],
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
  ink.filter = 'saturate(1.32) contrast(1.08) brightness(1.015)';
  ink.drawImage(image, left, top, drawWidth, drawHeight);
  ink.filter = 'none';
  const warm = ink.createLinearGradient(box.x, box.y, box.x + box.w, box.y + box.h);
  warm.addColorStop(0, 'rgba(255,174,104,.31)');
  warm.addColorStop(.42, 'rgba(238,73,148,.13)');
  warm.addColorStop(1, 'rgba(52,214,222,.28)');
  ink.fillStyle = warm;
  ink.fillRect(box.x, box.y, box.w, box.h);
  ink.restore();
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
  const splitAt = Math.ceil(title.length / 2);
  let first = title;
  let second = 'VICE CITY';
  if (compact && title.length > 15) {
    first = title.slice(0, splitAt);
    second = title.slice(splitAt);
  }
  const y = height * (compact ? .84 : .74);
  ink.save();
  const shadow = ink.createLinearGradient(0, y - base * 1.65, 0, height);
  shadow.addColorStop(0, 'rgba(9,8,21,0)');
  shadow.addColorStop(.24, 'rgba(10,8,20,.77)');
  shadow.addColorStop(1, 'rgba(10,8,20,.72)');
  ink.fillStyle = shadow;
  ink.fillRect(0, y - base * 1.8, width, height - y + base * 1.8);
  ink.shadowColor = '#ff4f9a';
  ink.shadowBlur = Math.min(width, height) * .018;
  ink.shadowOffsetX = -width * .004;
  ink.shadowOffsetY = height * .008;
  outlineType(first, width * .047, y - base * .14, base, width * .88, '#fff3e7');
  outlineType(second, width * .047, y + base * .78, base, width * .91, '#fff3e7');
  ink.shadowColor = 'transparent';
  ink.shadowBlur = 0;
  const labelSize = Math.max(10, Math.min(width, height) * .017);
  ink.font = `800 ${labelSize}px Arial, sans-serif`;
  ink.letterSpacing = `${labelSize * .26}px`;
  ink.fillStyle = '#ff75ac';
  ink.fillText('A VICE CITY STORY  /  SUNSET DIVISION', width * .053, y + base * 1.04);
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
  frames = points.map((shape, index) => frames[index] || { points: shape, photo: index % photos.length, zoom: 1, x: 50, y: 28 });
  frames.forEach((frame) => { frame.points = points[frames.indexOf(frame)]; paintPhoto(frame, width, height); });
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
  if (!poster) document.body.classList.add('editing');
  if (poster) document.body.classList.add('poster-view');
  if (params.has('caption')) captionInput.value = params.get('caption').slice(0, 28);
  try { photos = await Promise.all(initialPhotos.map(loadPhoto)); } catch { photos = []; }
  if (poster && params.get('photo') === 'pier' && photos.length > 1) {
    frames = coverFrames(1280, 720).map((points, index) => ({ points, photo: index ? 0 : 1, zoom: 1.08, x: index ? 52 : 48, y: 26 }));
  }
  const selected = params.get('size');
  if (selected && sizes[selected]) setFormat(selected); else setFormat('landscape');
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
