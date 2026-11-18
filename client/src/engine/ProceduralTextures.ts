import * as THREE from 'three';
import type { QualityTier } from '@shared/types';

export interface ProceduralTextureSet {
  mudAlbedo: THREE.CanvasTexture;
  mudRoughness: THREE.CanvasTexture;
  woodAlbedo: THREE.CanvasTexture;
  woodRoughness: THREE.CanvasTexture;
  sandbagAlbedo: THREE.CanvasTexture;
  concreteAlbedo: THREE.CanvasTexture;
  corrugatedAlbedo: THREE.CanvasTexture;
  walnutAlbedo: THREE.CanvasTexture;
  bluedSteelAlbedo: THREE.CanvasTexture;
  particleSoft: THREE.CanvasTexture;
  dispose: () => void;
}

function getTexSize(quality: QualityTier): number {
  if (quality === 'low') return 128;
  if (quality === 'medium') return 256;
  return 512;
}

function makeCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function finalizeTexture(
  canvas: HTMLCanvasElement,
  isColor: boolean,
  anisotropy: number,
  repeatX = 1,
  repeatY = 1,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  if (isColor) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.anisotropy = Math.max(1, anisotropy);
  tex.needsUpdate = true;
  return tex;
}

export function createProceduralTextures(
  quality: QualityTier,
  maxAnisotropy: number,
): ProceduralTextureSet {
  const size = getTexSize(quality);
  const aniso = quality === 'low' ? 1 : quality === 'medium' ? Math.min(4, maxAnisotropy) : Math.min(8, maxAnisotropy);

  // 1. Muddy battlefield terrain detail albedo & roughness
  const [mudCanvas, mudCtx] = makeCanvas(size);
  mudCtx.fillStyle = '#4e4235';
  mudCtx.fillRect(0, 0, size, size);
  for (let i = 0; i < size * 18; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 1 + Math.random() * (size * 0.035);
    const shade = Math.random();
    mudCtx.fillStyle =
      shade < 0.35
        ? 'rgba(38, 30, 23, 0.38)'
        : shade < 0.72
          ? 'rgba(92, 78, 59, 0.32)'
          : 'rgba(67, 74, 48, 0.24)';
    mudCtx.beginPath();
    mudCtx.arc(x, y, r, 0, Math.PI * 2);
    mudCtx.fill();
  }
  const mudAlbedo = finalizeTexture(mudCanvas, true, aniso, 14, 14);

  const [mudRoughCanvas, mudRoughCtx] = makeCanvas(size);
  mudRoughCtx.fillStyle = '#d4d4d4';
  mudRoughCtx.fillRect(0, 0, size, size);
  for (let i = 0; i < size * 6; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 2 + Math.random() * (size * 0.05);
    mudRoughCtx.fillStyle = Math.random() > 0.5 ? 'rgba(90,90,90,0.35)' : 'rgba(235,235,235,0.28)';
    mudRoughCtx.beginPath();
    mudRoughCtx.arc(x, y, r, 0, Math.PI * 2);
    mudRoughCtx.fill();
  }
  const mudRoughness = finalizeTexture(mudRoughCanvas, false, aniso, 14, 14);

  // 2. Weathered trench timber & duckboard planks
  const [woodCanvas, woodCtx] = makeCanvas(size);
  woodCtx.fillStyle = '#5c4936';
  woodCtx.fillRect(0, 0, size, size);
  const plankCount = 6;
  const plankH = size / plankCount;
  for (let p = 0; p < plankCount; p++) {
    const y0 = p * plankH;
    const tint = (Math.random() - 0.5) * 18;
    woodCtx.fillStyle = `rgb(${90 + tint}, ${72 + tint}, ${52 + tint})`;
    woodCtx.fillRect(0, y0 + 2, size, plankH - 3);
    // Grain streaks
    for (let g = 0; g < 16; g++) {
      woodCtx.fillStyle = g % 2 === 0 ? 'rgba(30,22,15,0.22)' : 'rgba(130,108,82,0.16)';
      woodCtx.fillRect(0, y0 + 3 + Math.random() * (plankH - 6), size, 1.5);
    }
    // Plank gap
    woodCtx.fillStyle = '#241c14';
    woodCtx.fillRect(0, y0, size, 2.5);
  }
  const woodAlbedo = finalizeTexture(woodCanvas, true, aniso, 1, 1);

  const [woodRoughCanvas, woodRoughCtx] = makeCanvas(size);
  woodRoughCtx.fillStyle = '#dcdcdc';
  woodRoughCtx.fillRect(0, 0, size, size);
  for (let p = 0; p < plankCount; p++) {
    woodRoughCtx.fillStyle = '#555555';
    woodRoughCtx.fillRect(0, p * plankH, size, 3);
  }
  const woodRoughness = finalizeTexture(woodRoughCanvas, false, aniso, 1, 1);

  // 3. Burlap sandbag weave
  const [bagCanvas, bagCtx] = makeCanvas(size);
  bagCtx.fillStyle = '#8b7a5d';
  bagCtx.fillRect(0, 0, size, size);
  const step = Math.max(4, Math.floor(size / 40));
  for (let y = 0; y < size; y += step) {
    bagCtx.fillStyle = 'rgba(55,46,32,0.18)';
    bagCtx.fillRect(0, y, size, 1);
  }
  for (let x = 0; x < size; x += step) {
    bagCtx.fillStyle = 'rgba(175,158,125,0.15)';
    bagCtx.fillRect(x, 0, 1, size);
  }
  for (let i = 0; i < size * 2; i++) {
    bagCtx.fillStyle = 'rgba(42,35,24,0.14)';
    bagCtx.fillRect(Math.random() * size, Math.random() * size, 3, 3);
  }
  const sandbagAlbedo = finalizeTexture(bagCanvas, true, aniso, 2, 1);

  // 4. Concrete bunker wall
  const [concCanvas, concCtx] = makeCanvas(size);
  concCtx.fillStyle = '#6f706b';
  concCtx.fillRect(0, 0, size, size);
  for (let i = 0; i < size * 10; i++) {
    const shade = 80 + Math.floor(Math.random() * 55);
    concCtx.fillStyle = `rgba(${shade},${shade},${shade - 4},0.22)`;
    concCtx.fillRect(Math.random() * size, Math.random() * size, 3, 3);
  }
  // Damp streaks near bottom
  const grad = concCtx.createLinearGradient(0, size * 0.55, 0, size);
  grad.addColorStop(0, 'rgba(35,34,29,0)');
  grad.addColorStop(1, 'rgba(35,34,29,0.5)');
  concCtx.fillStyle = grad;
  concCtx.fillRect(0, size * 0.55, size, size * 0.45);
  const concreteAlbedo = finalizeTexture(concCanvas, true, aniso, 1, 1);

  // 5. Corrugated rusted iron
  const [ironCanvas, ironCtx] = makeCanvas(size);
  ironCtx.fillStyle = '#4c4944';
  ironCtx.fillRect(0, 0, size, size);
  const ribs = 16;
  const ribW = size / ribs;
  for (let r = 0; r < ribs; r++) {
    const g = ironCtx.createLinearGradient(r * ribW, 0, (r + 1) * ribW, 0);
    g.addColorStop(0, '#32302d');
    g.addColorStop(0.5, '#68645e');
    g.addColorStop(1, '#32302d');
    ironCtx.fillStyle = g;
    ironCtx.fillRect(r * ribW, 0, ribW, size);
  }
  for (let i = 0; i < size * 3; i++) {
    ironCtx.fillStyle = 'rgba(128, 62, 30, 0.22)';
    ironCtx.fillRect(Math.random() * size, Math.random() * size, 6, 4);
  }
  const corrugatedAlbedo = finalizeTexture(ironCanvas, true, aniso, 2, 1);

  // 6. Walnut rifle stock
  const [walCanvas, walCtx] = makeCanvas(size);
  walCtx.fillStyle = '#53301c';
  walCtx.fillRect(0, 0, size, size);
  for (let i = 0; i < 65; i++) {
    walCtx.strokeStyle = i % 2 === 0 ? 'rgba(34, 17, 9, 0.35)' : 'rgba(116, 68, 38, 0.25)';
    walCtx.lineWidth = 1.5 + Math.random() * 2;
    walCtx.beginPath();
    const y = (i / 65) * size;
    walCtx.moveTo(0, y);
    walCtx.bezierCurveTo(size * 0.3, y + (Math.random() - 0.5) * 14, size * 0.7, y + (Math.random() - 0.5) * 14, size, y);
    walCtx.stroke();
  }
  const walnutAlbedo = finalizeTexture(walCanvas, true, aniso, 1, 1);

  // 7. Brushed blued steel for rifle receiver & barrel
  const [steelCanvas, steelCtx] = makeCanvas(size);
  steelCtx.fillStyle = '#2d3136';
  steelCtx.fillRect(0, 0, size, size);
  for (let i = 0; i < size; i += 2) {
    steelCtx.fillStyle = i % 4 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.08)';
    steelCtx.fillRect(0, i, size, 1);
  }
  const bluedSteelAlbedo = finalizeTexture(steelCanvas, true, aniso, 1, 1);

  // 8. Soft radial sprite texture for dust/smoke/muzzle flash
  const [partCanvas, partCtx] = makeCanvas(128);
  const rad = partCtx.createRadialGradient(64, 64, 4, 64, 64, 62);
  rad.addColorStop(0, 'rgba(255,255,255,1)');
  rad.addColorStop(0.35, 'rgba(255,255,255,0.65)');
  rad.addColorStop(1, 'rgba(255,255,255,0)');
  partCtx.fillStyle = rad;
  partCtx.fillRect(0, 0, 128, 128);
  const particleSoft = finalizeTexture(partCanvas, true, 1, 1, 1);

  return {
    mudAlbedo,
    mudRoughness,
    woodAlbedo,
    woodRoughness,
    sandbagAlbedo,
    concreteAlbedo,
    corrugatedAlbedo,
    walnutAlbedo,
    bluedSteelAlbedo,
    particleSoft,
    dispose: () => {
      mudAlbedo.dispose();
      mudRoughness.dispose();
      woodAlbedo.dispose();
      woodRoughness.dispose();
      sandbagAlbedo.dispose();
      concreteAlbedo.dispose();
      corrugatedAlbedo.dispose();
      walnutAlbedo.dispose();
      bluedSteelAlbedo.dispose();
      particleSoft.dispose();
    },
  };
}
