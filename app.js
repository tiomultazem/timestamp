const canvas = document.getElementById('mainCanvas');
const ctx = canvas.getContext('2d');

let img = null;
let canvasWidth = 1080;
let canvasHeight = 1080;

let photoX = 0;
let photoY = 0;
let photoScale = 1;

let textLayers = [
  {
    id: 1,
    text: '',
    x: 40,
    y: 980,
    size: 36,
    color: '#ffffff',
    bgColor: '#000000',
    bgAlpha: 0.5,
    visible: true
  }
];
let activeLayerIndex = 0;

let isDragging = false;
let dragTarget = null;
let startX, startY;

const inputImage = document.getElementById('inputImage');
const selectAspect = document.getElementById('selectAspect');
const customDims = document.getElementById('customDims');
const canvasWInput = document.getElementById('canvasW');
const canvasHInput = document.getElementById('canvasH');
const photoScaleInput = document.getElementById('photoScale');
const btnResetPhoto = document.getElementById('btnResetPhoto');

const selectLayer = document.getElementById('selectLayer');
const btnAddLayer = document.getElementById('btnAddLayer');
const btnDeleteLayer = document.getElementById('btnDeleteLayer');
const selectTextMode = document.getElementById('selectTextMode');
const textValueInput = document.getElementById('textValue');
const textSizeInput = document.getElementById('textSize');
const textColorInput = document.getElementById('textColor');
const textBgColorInput = document.getElementById('textBgColor');
const textBgAlphaInput = document.getElementById('textBgAlpha');
const btnDownload = document.getElementById('btnDownload');
const btnThemeToggle = document.getElementById('btnThemeToggle');

function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
    if (btnThemeToggle) btnThemeToggle.textContent = '☀️ Light';
  } else {
    document.body.classList.remove('light-theme');
    if (btnThemeToggle) btnThemeToggle.textContent = '🌙 Dark';
  }
}

if (btnThemeToggle) {
  btnThemeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    btnThemeToggle.textContent = isLight ? '☀️ Light' : '🌙 Dark';
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    render();
  });
}
initTheme();

function updateLayerUI() {
  selectLayer.innerHTML = '';
  textLayers.forEach((layer, idx) => {
    const opt = document.createElement('option');
    opt.value = idx;
    const snippet = layer.text.split('\n')[0] || 'Teks Kosong';
    opt.textContent = `Layer ${idx + 1}: ${snippet.substring(0, 15)}`;
    if (idx === activeLayerIndex) opt.selected = true;
    selectLayer.appendChild(opt);
  });

  const current = textLayers[activeLayerIndex];
  if (current) {
    selectTextMode.value = current.visible ? 'show' : 'hide';
    textValueInput.value = current.text;
    textSizeInput.value = current.size;
    textColorInput.value = current.color;
    textBgColorInput.value = current.bgColor;
    textBgAlphaInput.value = current.bgAlpha;
  }
}

function setCanvasSize(w, h) {
  const oldW = canvasWidth;
  const oldH = canvasHeight;
  canvasWidth = w;
  canvasHeight = h;
  canvas.width = w;
  canvas.height = h;

  textLayers.forEach(layer => {
    layer.x = (layer.x / oldW) * w;
    layer.y = (layer.y / oldH) * h;
  });

  render();
}

setCanvasSize(1080, 1080);

selectAspect.addEventListener('change', () => {
  const val = selectAspect.value;
  if (val === '1:1') { customDims.style.display = 'none'; setCanvasSize(1080, 1080); }
  else if (val === '4:5') { customDims.style.display = 'none'; setCanvasSize(1080, 1350); }
  else if (val === '16:9') { customDims.style.display = 'none'; setCanvasSize(1920, 1080); }
  else {
    customDims.style.display = 'flex';
    setCanvasSize(parseInt(canvasWInput.value) || 1080, parseInt(canvasHInput.value) || 1080);
  }
});

[canvasWInput, canvasHInput].forEach(inp => {
  inp.addEventListener('input', () => {
    if (selectAspect.value === 'custom') {
      setCanvasSize(parseInt(canvasWInput.value) || 1080, parseInt(canvasHInput.value) || 1080);
    }
  });
});

async function processImageFile(file) {
  if (!file || !file.type.startsWith('image/')) return;

  let dateStr = '';
  try {
    if (window.exifr) {
      const exif = await exifr.parse(file, ['DateTimeOriginal', 'CreateDate']);
      const dt = exif?.DateTimeOriginal || exif?.CreateDate;
      if (dt) {
        dateStr = formatDate(new Date(dt));
      }
    }
  } catch (err) {
    console.warn('EXIF read error:', err);
  }

  if (!dateStr) {
    const d = file.lastModified ? new Date(file.lastModified) : new Date();
    dateStr = formatDate(d);
  }

  textLayers[0].text = dateStr;
  textLayers[0].y = canvasHeight - 80;
  updateLayerUI();

  const reader = new FileReader();
  reader.onload = (evt) => {
    img = new Image();
    img.onload = () => {
      const scaleW = canvasWidth / img.width;
      const scaleH = canvasHeight / img.height;
      photoScale = Math.max(scaleW, scaleH);
      photoScaleInput.value = photoScale;
      photoX = (canvasWidth - img.width * photoScale) / 2;
      photoY = (canvasHeight - img.height * photoScale) / 2;
      render();
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
}

inputImage.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) processImageFile(file);
});

window.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.stopPropagation();
});

window.addEventListener('dragenter', (e) => {
  e.preventDefault();
  e.stopPropagation();
});

window.addEventListener('drop', (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    processImageFile(e.dataTransfer.files[0]);
  }
});

window.addEventListener('paste', (e) => {
  const items = e.clipboardData && e.clipboardData.items;
  if (!items) return;
  for (let item of items) {
    if (item.type.indexOf('image') !== -1) {
      const file = item.getAsFile();
      if (file) {
        processImageFile(file);
        break;
      }
    }
  }
});

function formatDate(d) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

photoScaleInput.addEventListener('input', () => {
  photoScale = parseFloat(photoScaleInput.value);
  render();
});

btnResetPhoto.addEventListener('click', () => {
  if (!img) return;
  const scaleW = canvasWidth / img.width;
  const scaleH = canvasHeight / img.height;
  photoScale = Math.max(scaleW, scaleH);
  photoScaleInput.value = photoScale;
  photoX = (canvasWidth - img.width * photoScale) / 2;
  photoY = (canvasHeight - img.height * photoScale) / 2;
  render();
});

selectLayer.addEventListener('change', () => {
  activeLayerIndex = parseInt(selectLayer.value) || 0;
  updateLayerUI();
  render();
});

btnAddLayer.addEventListener('click', () => {
  if (textLayers.length >= 10) {
    alert('Maksimal 10 layer teks!');
    return;
  }
  textLayers.push({
    id: Date.now(),
    text: `Teks ${textLayers.length + 1}`,
    x: 40,
    y: 100 + textLayers.length * 60,
    size: 36,
    color: '#ffffff',
    bgColor: '#000000',
    bgAlpha: 0.5,
    visible: true
  });
  activeLayerIndex = textLayers.length - 1;
  updateLayerUI();
  render();
});

btnDeleteLayer.addEventListener('click', () => {
  if (textLayers.length <= 1) {
    alert('Minimal harus ada 1 layer teks!');
    return;
  }
  textLayers.splice(activeLayerIndex, 1);
  activeLayerIndex = Math.max(0, activeLayerIndex - 1);
  updateLayerUI();
  render();
});

selectTextMode.addEventListener('change', () => {
  textLayers[activeLayerIndex].visible = selectTextMode.value === 'show';
  render();
});

textValueInput.addEventListener('input', () => {
  textLayers[activeLayerIndex].text = textValueInput.value;
  updateLayerUI();
  render();
});
textSizeInput.addEventListener('input', () => {
  textLayers[activeLayerIndex].size = parseInt(textSizeInput.value) || 36;
  render();
});
textColorInput.addEventListener('input', () => {
  textLayers[activeLayerIndex].color = textColorInput.value;
  render();
});
textBgColorInput.addEventListener('input', () => {
  textLayers[activeLayerIndex].bgColor = textBgColorInput.value;
  render();
});
textBgAlphaInput.addEventListener('input', () => {
  textLayers[activeLayerIndex].bgAlpha = parseFloat(textBgAlphaInput.value);
  render();
});

function render() {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  const isLightTheme = document.body.classList.contains('light-theme');
  const canvasBgColor = isLightTheme ? '#ffffff' : '#1a1a20';
  const placeholderColor = isLightTheme ? '#64748b' : '#94a3b8';

  // Fill canvas blank space background
  ctx.save();
  ctx.fillStyle = canvasBgColor;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.restore();

  if (img) {
    ctx.drawImage(img, photoX, photoY, img.width * photoScale, img.height * photoScale);
  } else {
    ctx.save();
    ctx.fillStyle = placeholderColor;
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Upload Foto untuk Memulai', canvasWidth / 2, canvasHeight / 2);
    ctx.restore();
  }

  textLayers.forEach((layer, idx) => {
    if (!layer.visible || !layer.text) return;

    const lines = layer.text.split('\n');
    const fontSize = layer.size;
    const lineHeight = fontSize * 1.25;

    ctx.save();
    ctx.font = `${fontSize}px monospace, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    let maxLineWidth = 0;
    lines.forEach(line => {
      const w = ctx.measureText(line).width;
      if (w > maxLineWidth) maxLineWidth = w;
    });

    const totalHeight = lines.length * lineHeight;
    const padding = fontSize * 0.3;

    if (layer.bgAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = layer.bgAlpha;
      ctx.fillStyle = layer.bgColor;
      ctx.fillRect(layer.x - padding, layer.y - padding, maxLineWidth + padding * 2, totalHeight + padding * 2);
      ctx.restore();
    }

    ctx.fillStyle = layer.color;
    lines.forEach((line, lineIdx) => {
      ctx.fillText(line, layer.x, layer.y + lineIdx * lineHeight);
    });

    if (idx === activeLayerIndex) {
      ctx.strokeStyle = '#4f46e5';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(layer.x - padding - 4, layer.y - padding - 4, maxLineWidth + padding * 2 + 8, totalHeight + padding * 2 + 8);
    }
    ctx.restore();
  });
}

function getCanvasCoordinates(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  const scaleX = canvasWidth / rect.width;
  const scaleY = canvasHeight / rect.height;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
}

function onPointerDown(e) {
  const pos = getCanvasCoordinates(e);
  startX = pos.x;
  startY = pos.y;

  for (let i = textLayers.length - 1; i >= 0; i--) {
    const layer = textLayers[i];
    if (!layer.visible || !layer.text) continue;

    const lines = layer.text.split('\n');
    ctx.font = `${layer.size}px monospace, sans-serif`;
    let maxW = 0;
    lines.forEach(l => {
      const w = ctx.measureText(l).width;
      if (w > maxW) maxW = w;
    });
    const totalH = lines.length * layer.size * 1.25;

    if (pos.x >= layer.x - 20 && pos.x <= layer.x + maxW + 20 &&
      pos.y >= layer.y - 20 && pos.y <= layer.y + totalH + 20) {
      activeLayerIndex = i;
      dragTarget = i;
      isDragging = true;
      updateLayerUI();
      render();
      return;
    }
  }

  if (img) {
    dragTarget = 'photo';
    isDragging = true;
  }
}

function onPointerMove(e) {
  if (!isDragging) return;
  const pos = getCanvasCoordinates(e);
  const dx = pos.x - startX;
  const dy = pos.y - startY;
  startX = pos.x;
  startY = pos.y;

  if (dragTarget === 'photo') {
    photoX += dx;
    photoY += dy;
  } else if (typeof dragTarget === 'number') {
    textLayers[dragTarget].x += dx;
    textLayers[dragTarget].y += dy;
  }
  render();
}

function onPointerUp() {
  isDragging = false;
  dragTarget = null;
}

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const zoomFactor = e.deltaY < 0 ? 1.05 : 0.95;
  let newScale = photoScale * zoomFactor;
  newScale = Math.min(Math.max(newScale, 0.1), 5);

  const pos = getCanvasCoordinates(e);
  photoX = pos.x - (pos.x - photoX) * (newScale / photoScale);
  photoY = pos.y - (pos.y - photoY) * (newScale / photoScale);

  photoScale = newScale;
  photoScaleInput.value = photoScale;
  render();
}, { passive: false });

canvas.addEventListener('mousedown', onPointerDown);
window.addEventListener('mousemove', onPointerMove);
window.addEventListener('mouseup', onPointerUp);

canvas.addEventListener('touchstart', onPointerDown, { passive: true });
window.addEventListener('touchmove', onPointerMove, { passive: true });
window.addEventListener('touchend', onPointerUp);

btnDownload.addEventListener('click', () => {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const timeStampStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const link = document.createElement('a');
  link.download = `timestamp-helper_${timeStampStr}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
});

updateLayerUI();
