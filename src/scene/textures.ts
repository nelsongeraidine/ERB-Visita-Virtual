import * as THREE from 'three';

// Texturas 100% procedurais (canvas): nenhuma imagem externa, funciona offline.

export function rng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(w: number, h = w): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D indisponível');
  return [c, ctx];
}

function wrap(c: HTMLCanvasElement, srgb: boolean): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  return t;
}

/** Ruído de valor tileável (fbm) normalizado em 0..1. */
function fbm(size: number, seed: number, cells: number[], weights: number[]): Float32Array {
  const rand = rng(seed);
  const out = new Float32Array(size * size);
  let wsum = 0;
  cells.forEach((n, o) => {
    const grid = new Float32Array(n * n);
    for (let i = 0; i < grid.length; i++) grid[i] = rand();
    const w = weights[o];
    wsum += w;
    for (let y = 0; y < size; y++) {
      const fy = (y / size) * n;
      const iy = Math.floor(fy);
      let ty = fy - iy;
      ty = ty * ty * (3 - 2 * ty);
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * n;
        const ix = Math.floor(fx);
        let tx = fx - ix;
        tx = tx * tx * (3 - 2 * tx);
        const a = grid[(iy % n) * n + (ix % n)];
        const b = grid[(iy % n) * n + ((ix + 1) % n)];
        const c = grid[((iy + 1) % n) * n + (ix % n)];
        const d = grid[((iy + 1) % n) * n + ((ix + 1) % n)];
        out[y * size + x] += w * (a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty);
      }
    }
  });
  for (let i = 0; i < out.length; i++) out[i] /= wsum;
  return out;
}

function noiseTexture(
  size: number,
  base: [number, number, number],
  amp: number,
  seed: number,
  cells: number[],
  weights: number[],
  specks = 0,
): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const [c, ctx] = makeCanvas(size);
  const img = ctx.createImageData(size, size);
  const v = fbm(size, seed, cells, weights);
  for (let i = 0; i < v.length; i++) {
    const k = 1 + (v[i] - 0.5) * amp;
    img.data[i * 4] = Math.max(0, Math.min(255, base[0] * k));
    img.data[i * 4 + 1] = Math.max(0, Math.min(255, base[1] * k));
    img.data[i * 4 + 2] = Math.max(0, Math.min(255, base[2] * k));
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const rand = rng(seed + 7);
  for (let i = 0; i < specks; i++) {
    // pintas circulares e macias (quadrados de 1-2 px ficavam pixelados de perto)
    const dark = rand() < 0.6;
    ctx.fillStyle = dark ? 'rgba(40,40,38,0.16)' : 'rgba(235,235,230,0.14)';
    ctx.beginPath();
    ctx.arc(rand() * size, rand() * size, 0.6 + rand() * 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
  const map = wrap(c, true);
  const bump = wrap(c, false);
  return { map, bump };
}

/**
 * Concreto com manchas suaves de umidade/cura. Com `joints`, desenha juntas de dilatação
 * nas bordas do tile (tile = 2 m): as lajes ganham juntas a cada 2 m sem geometria extra.
 */
export function concreteTextures(joints = false) {
  const t = noiseTexture(512, [168, 167, 161], 0.34, joints ? 12 : 11, [4, 16, 64, 256], [0.35, 0.3, 0.2, 0.15], 1400);
  const c = t.map.image as HTMLCanvasElement;
  const ctx = c.getContext('2d')!;
  const rand = rng(joints ? 41 : 42);
  for (let i = 0; i < 26; i++) {
    const r = 30 + rand() * 90;
    const x = rand() * c.width;
    const y = rand() * c.height;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const dark = rand() < 0.7;
    g.addColorStop(0, dark ? 'rgba(70,68,62,0.10)' : 'rgba(235,232,222,0.09)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  if (joints) {
    ctx.fillStyle = 'rgba(40,40,38,0.55)';
    ctx.fillRect(0, 0, c.width, 3);
    ctx.fillRect(0, 0, 3, c.height);
    ctx.fillStyle = 'rgba(255,255,250,0.12)';
    ctx.fillRect(0, 3, c.width, 1);
    ctx.fillRect(3, 0, 1, c.height);
  }
  t.map.needsUpdate = true;
  t.bump.needsUpdate = true;
  return t;
}

/**
 * Solo/vegetação rasteira em duas camadas: cor em macro-escala (manchas de capim seco e
 * verde, tile grande, não repete de forma óbvia) e relevo fino em escala curta.
 */
export function soilTextures() {
  const size = 1024;
  const [c, ctx] = makeCanvas(size);
  const img = ctx.createImageData(size, size);
  const big = fbm(size, 23, [3, 6, 12, 24], [0.4, 0.3, 0.2, 0.1]);
  const mid = fbm(size, 29, [32, 64, 128], [0.5, 0.3, 0.2]);
  const dry = [116, 112, 92];
  const green = [96, 106, 78];
  for (let i = 0; i < big.length; i++) {
    const m = Math.min(1, Math.max(0, (big[i] - 0.38) * 1.5)) * 0.8;
    const k = 0.86 + (mid[i] - 0.5) * 0.3;
    for (let ch = 0; ch < 3; ch++) {
      img.data[i * 4 + ch] = Math.max(0, Math.min(255, (dry[ch] + (green[ch] - dry[ch]) * m) * k));
    }
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const map = wrap(c, true);

  const [bc, bctx] = makeCanvas(256);
  const bimg = bctx.createImageData(256, 256);
  const fine = fbm(256, 31, [16, 48, 128], [0.3, 0.4, 0.3]);
  for (let i = 0; i < fine.length; i++) {
    const v = Math.floor(fine[i] * 255);
    bimg.data[i * 4] = bimg.data[i * 4 + 1] = bimg.data[i * 4 + 2] = v;
    bimg.data[i * 4 + 3] = 255;
  }
  bctx.putImageData(bimg, 0, 0);
  return { map, bump: wrap(bc, false) };
}

export function stuccoTexture() {
  // reboco/pintura do abrigo: variação sutil e leves escorridos verticais de chuva
  const t = noiseTexture(256, [200, 199, 192], 0.1, 31, [4, 24, 96], [0.5, 0.3, 0.2], 300);
  const c = t.map.image as HTMLCanvasElement;
  const ctx = c.getContext('2d')!;
  const rand = rng(37);
  for (let i = 0; i < 40; i++) {
    const x = rand() * c.width;
    const w = 1 + rand() * 3;
    const g = ctx.createLinearGradient(0, 0, 0, c.height);
    g.addColorStop(0, 'rgba(60,58,52,0)');
    g.addColorStop(0.35 + rand() * 0.3, `rgba(60,58,52,${0.03 + rand() * 0.04})`);
    g.addColorStop(1, 'rgba(60,58,52,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, w, c.height);
  }
  t.map.needsUpdate = true;
  return t;
}

/** Brita: milhares de pedras com sombreamento próprio; devolve cor e relevo. */
export function gravelTextures() {
  const size = 512;
  const [cc, cx] = makeCanvas(size);
  const [bc, bx] = makeCanvas(size);
  cx.fillStyle = 'rgb(58,57,55)';
  cx.fillRect(0, 0, size, size);
  bx.fillStyle = 'rgb(20,20,20)';
  bx.fillRect(0, 0, size, size);
  const rand = rng(5);
  const draw = (x: number, y: number, rx: number, ry: number, rot: number, tone: number, tint: number) => {
    const r = Math.max(rx, ry);
    const g = cx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r * 1.05);
    const lo = tone * 0.55;
    g.addColorStop(0, `rgb(${tone + tint},${tone},${tone - tint})`);
    g.addColorStop(1, `rgb(${lo + tint * 0.5},${lo},${lo - tint * 0.5})`);
    cx.fillStyle = g;
    cx.beginPath();
    cx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
    cx.fill();
    const h = bx.createRadialGradient(x, y, 0, x, y, r);
    h.addColorStop(0, 'rgb(255,255,255)');
    h.addColorStop(1, 'rgb(60,60,60)');
    bx.fillStyle = h;
    bx.beginPath();
    bx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
    bx.fill();
  };
  for (let i = 0; i < 5200; i++) {
    const r = 3 + rand() * 6;
    const rx = r * (0.8 + rand() * 0.4);
    const ry = r * (0.7 + rand() * 0.4);
    const rot = rand() * Math.PI;
    const tone = Math.floor(95 + rand() * 105);
    const tint = Math.floor((rand() - 0.4) * 22);
    const x = rand() * size;
    const y = rand() * size;
    // desenha cópias nas bordas para a textura emendar sem costura
    for (const ox of [0, -size, size]) {
      for (const oy of [0, -size, size]) {
        const px = x + ox;
        const py = y + oy;
        if (px < -r * 2 || px > size + r * 2 || py < -r * 2 || py > size + r * 2) continue;
        draw(px, py, rx, ry, rot, tone, tint);
      }
    }
  }
  return { map: wrap(cc, true), bump: wrap(bc, false) };
}

/** Tela de alambrado em losangos, com alfa (precisa de alphaToCoverage no material). */
export function chainLinkTexture(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(64);
  ctx.clearRect(0, 0, 64, 64);
  ctx.strokeStyle = 'rgba(205,210,210,1)';
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-2, -2);
  ctx.lineTo(66, 66);
  ctx.moveTo(-2, 66);
  ctx.lineTo(66, -2);
  ctx.stroke();
  return wrap(c, true);
}

/** Mancha radial escura para sombra de contato sob equipamentos. */
export function blobTexture(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(128);
  const g = ctx.createRadialGradient(64, 64, 8, 64, 64, 64);
  g.addColorStop(0, 'rgba(0,0,0,0.55)');
  g.addColorStop(0.6, 'rgba(0,0,0,0.25)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Metal escovado: ruído fino de rugosidade (usado como roughnessMap, canal G). */
export function brushedRoughness(): THREE.CanvasTexture {
  const size = 256;
  const [c, ctx] = makeCanvas(size);
  const img = ctx.createImageData(size, size);
  const rand = rng(77);
  for (let y = 0; y < size; y++) {
    const row = 0.7 + rand() * 0.3;
    for (let x = 0; x < size; x++) {
      const v = Math.floor(255 * (row * 0.6 + rand() * 0.4));
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return wrap(c, false);
}
