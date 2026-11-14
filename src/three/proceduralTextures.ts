import * as THREE from 'three';

export function createTurfPitchTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Natural football green mowed stripes
  const stripeCount = 16;
  const stripeW = canvas.width / stripeCount;
  for (let i = 0; i < stripeCount; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#186b35' : '#1f7c3f';
    ctx.fillRect(i * stripeW, 0, stripeW + 1, canvas.height);
  }

  // Subtle organic grass blade micro-texture
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const grain = ((Math.sin(i * 12.9898) * 43758.5453) % 1) * 14 - 7;
    data[i] = Math.max(0, Math.min(255, data[i] + grain * 0.6));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + grain));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + grain * 0.5));
  }
  ctx.putImageData(imageData, 0, 0);

  // Crisp white chalk pitch markings
  const padX = 92;
  const padY = 68;
  const fieldW = canvas.width - padX * 2;
  const fieldH = canvas.height - padY * 2;
  const midX = canvas.width / 2;
  const midY = canvas.height / 2;

  ctx.strokeStyle = 'rgba(246, 248, 244, 0.92)';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Touchlines & goal lines
  ctx.strokeRect(padX, padY, fieldW, fieldH);

  // Halfway line
  ctx.beginPath();
  ctx.moveTo(midX, padY);
  ctx.lineTo(midX, padY + fieldH);
  ctx.stroke();

  // Center circle & spot
  ctx.beginPath();
  ctx.arc(midX, midY, 130, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = 'rgba(246, 248, 244, 0.95)';
  ctx.beginPath();
  ctx.arc(midX, midY, 10, 0, Math.PI * 2);
  ctx.fill();

  // Penalty areas & goal areas (left and right)
  const penW = 240;
  const penH = 480;
  const goalBoxW = 90;
  const goalBoxH = 220;

  // Left
  ctx.strokeRect(padX, midY - penH / 2, penW, penH);
  ctx.strokeRect(padX, midY - goalBoxH / 2, goalBoxW, goalBoxH);
  ctx.beginPath();
  ctx.arc(padX + 165, midY, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(padX + 165, midY, 110, -0.7, 0.7);
  ctx.stroke();

  // Right
  ctx.strokeRect(padX + fieldW - penW, midY - penH / 2, penW, penH);
  ctx.strokeRect(padX + fieldW - goalBoxW, midY - goalBoxH / 2, goalBoxW, goalBoxH);
  ctx.beginPath();
  ctx.arc(padX + fieldW - 165, midY, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(padX + fieldW - 165, midY, 110, Math.PI - 0.7, Math.PI + 0.7);
  ctx.stroke();

  // Corner arcs
  const cr = 26;
  [
    [padX, padY, 0, Math.PI / 2],
    [padX + fieldW, padY, Math.PI / 2, Math.PI],
    [padX + fieldW, padY + fieldH, Math.PI, Math.PI * 1.5],
    [padX, padY + fieldH, Math.PI * 1.5, Math.PI * 2],
  ].forEach(([cx, cy, a0, a1]) => {
    ctx.beginPath();
    ctx.arc(cx, cy, cr, a0, a1);
    ctx.stroke();
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

export function createFootballTextures(maxAnisotropy: number): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const size = 1024;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size / 2;
  const ctx = colorCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size / 2;
  const bCtx = bumpCanvas.getContext('2d')!;

  // Base obsidian leather
  ctx.fillStyle = '#121513';
  ctx.fillRect(0, 0, size, size / 2);

  bCtx.fillStyle = '#a0a0a0';
  bCtx.fillRect(0, 0, size, size / 2);

  // Geometric gold & black match-ball panels
  const cols = 10;
  const rows = 5;
  const cellW = size / cols;
  const cellH = size / 2 / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = (c + (r % 2 === 0 ? 0.5 : 0)) * cellW;
      const cy = (r + 0.5) * cellH;
      const rad = Math.min(cellW, cellH) * 0.44;
      const isGold = (r + c) % 3 === 0;

      ctx.beginPath();
      bCtx.beginPath();
      for (let k = 0; k < 6; k++) {
        const angle = (k / 6) * Math.PI * 2;
        const px = cx + Math.cos(angle) * rad;
        const py = cy + Math.sin(angle) * rad;
        if (k === 0) {
          ctx.moveTo(px, py);
          bCtx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
          bCtx.lineTo(px, py);
        }
      }
      ctx.closePath();
      bCtx.closePath();

      if (isGold) {
        const grad = ctx.createLinearGradient(cx - rad, cy - rad, cx + rad, cy + rad);
        grad.addColorStop(0, '#f3d778');
        grad.addColorStop(0.5, '#d4af37');
        grad.addColorStop(1, '#8c6b17');
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = '#191d1a';
      }
      ctx.fill();
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 3;
      ctx.stroke();

      bCtx.fillStyle = '#dcdcdc';
      bCtx.fill();
      bCtx.strokeStyle = '#202020';
      bCtx.lineWidth = 5;
      bCtx.stroke();
    }
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.ClampToEdgeWrapping;
  map.anisotropy = maxAnisotropy;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.colorSpace = THREE.NoColorSpace;
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.ClampToEdgeWrapping;
  bumpMap.anisotropy = maxAnisotropy;

  return { map, bumpMap };
}

export function createBoundaryNetTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 128, 128);
  ctx.strokeStyle = 'rgba(20, 24, 21, 0.72)';
  ctx.lineWidth = 3;

  for (let i = -128; i <= 256; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 128, 128);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(i + 128, 0);
    ctx.lineTo(i, 128);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(18, 4);
  return texture;
}

export function createGlowSpriteTexture(innerColor: string, outerColor: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, innerColor);
  grad.addColorStop(0.35, outerColor);
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
