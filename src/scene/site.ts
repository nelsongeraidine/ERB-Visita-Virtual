import * as THREE from 'three';
import { GATE, SITE, SLABS } from '../config';
import type { CollisionWorld } from '../controls/collision';
import { Batch, blob } from './batch';
import type { Mats } from './materials';
import { GROUND_RADIUS, TILE } from './materials';
import { rng } from './textures';

export const MAX_PEBBLES = 14000;

export interface Gate {
  group: THREE.Group;
  /** 0 = fechado, 1 = aberto */
  progress: number;
  target: number;
  update(dt: number): void;
  toggle(): boolean;
  readonly center: THREE.Vector3;
}

export interface SiteBuild {
  group: THREE.Group;
  gate: Gate;
  pebbles: THREE.InstancedMesh;
  fence: THREE.Group;
}

const { halfX: HX, halfZ: HZ } = SITE;

// Postes: espaçamento ~2 m (cota legível na referência). Na face oeste, os postes do
// portão ditam o vão; o resto é distribuído.
const POSTS_X = Array.from({ length: 9 }, (_, i) => -HX + i * 2);
const POSTS_Z_E = [-HZ, -3.3, -1.1, 1.1, 3.3, HZ];
const POSTS_Z_W = [-HZ, -3.667, -1.833, GATE.z0, GATE.z1, 4.35, HZ];

export function buildSite(M: Mats, col: CollisionWorld): SiteBuild {
  const group = new THREE.Group();
  group.name = 'site';

  // --- solo externo e brita interna ---------------------------------------------------
  const outside = new THREE.Mesh(new THREE.CircleGeometry(GROUND_RADIUS, 64).rotateX(-Math.PI / 2), M.soil);
  outside.position.y = -0.03;
  outside.receiveShadow = true;
  group.add(outside);
  group.add(buildHorizon());

  const gravel = new THREE.Mesh(
    new THREE.PlaneGeometry(2 * HX + 0.6, 2 * HZ + 0.6).rotateX(-Math.PI / 2),
    M.gravel,
  );
  gravel.position.y = 0.0;
  gravel.receiveShadow = true;
  group.add(gravel);

  // --- lajes e faixas de concreto --------------------------------------------------------
  const conc = new Batch();
  for (const s of SLABS) {
    const w = s.x1 - s.x0;
    const d = s.z1 - s.z0;
    conc.box(M.concreteSlab, [w, s.h, d], [(s.x0 + s.x1) / 2, s.h / 2, (s.z0 + s.z1) / 2], [0, 0, 0], TILE.concrete);
    col.addGround(s.x0, s.x1, s.z0, s.z1, s.h);
  }
  // meio-fio perimetral (interrompido no vão do portão, onde há soleira alinhada ao piso)
  const cw = SITE.curbWidth;
  const ch = SITE.curbHeight;
  conc.box(M.concrete, [2 * HX + cw, ch, cw], [0, ch / 2, -HZ], [0, 0, 0], TILE.concrete);
  conc.box(M.concrete, [2 * HX + cw, ch, cw], [0, ch / 2, HZ], [0, 0, 0], TILE.concrete);
  conc.box(M.concrete, [cw, ch, 2 * HZ + cw], [HX, ch / 2, 0], [0, 0, 0], TILE.concrete);
  const westA = GATE.z0 - -HZ + cw / 2;
  conc.box(M.concrete, [cw, ch, westA], [-HX, ch / 2, -HZ - cw / 2 + westA / 2], [0, 0, 0], TILE.concrete);
  const westB = HZ + cw / 2 - GATE.z1;
  conc.box(M.concrete, [cw, ch, westB], [-HX, ch / 2, GATE.z1 + westB / 2], [0, 0, 0], TILE.concrete);

  // caixas de passagem (drenagem/infraestrutura plausível; sem inventar rede subterrânea)
  for (const [x, z] of [
    [1.2, 3.1],
    [-5.9, 2.6],
  ] as [number, number][]) {
    conc.box(M.concrete, [0.6, 0.06, 0.6], [x, 0.03, z], [0, 0, 0], TILE.concrete);
    conc.box(M.steelDark, [0.5, 0.02, 0.5], [x, 0.07, z]);
    for (let i = -2; i <= 2; i++) conc.box(M.galv, [0.44, 0.012, 0.025], [x, 0.083, z + i * 0.085]);
  }
  group.add(conc.build('concrete'));

  // sombra de contato (oclusão ambiental barata) junto ao meio-fio interno: escurece a brita
  // onde ela encosta no concreto, o que ancora o cercamento ao piso
  const edge = 0.55;
  for (const [cx, cz, w, d] of [
    [0, -HZ + edge / 2, 2 * HX, edge],
    [0, HZ - edge / 2, 2 * HX, edge],
    [HX - edge / 2, 0, edge, 2 * HZ],
    [-HX + edge / 2, -HZ / 2 - GATE.z0 / 2 + 0.2, edge, HZ - GATE.z0 - 0.2],
    [-HX + edge / 2, (GATE.z1 + HZ) / 2, edge, HZ - GATE.z1],
  ] as [number, number, number, number][]) {
    group.add(blob(M.blob, cx, cz, w + 0.6, d + 0.5, 0.014, 0.55));
  }

  // --- brita em 3D (instanciada) -----------------------------------------------------------
  const pebbles = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), M.pebble, MAX_PEBBLES);
  pebbles.name = 'pebbles';
  pebbles.receiveShadow = true;
  scatterPebbles(pebbles);
  group.add(pebbles);

  // --- cercamento ------------------------------------------------------------------------------
  const fence = buildFence(M, col);
  group.add(fence);

  const gate = buildGate(M, col);
  group.add(gate.group);

  return { group, gate, pebbles, fence };
}

/**
 * Cordão de colinas baixas e distantes: dá referência de profundidade e tira o ar de plano
 * infinito. A névoa suaviza a cor (perspectiva aérea). Procedural, sem textura externa.
 */
function buildHorizon(): THREE.Mesh {
  const seg = 256;
  const rings = [
    { r: 700, k: -0.01 },
    { r: 980, k: 1 },
    { r: GROUND_RADIUS - 8, k: -0.01 },
  ];
  const pos: number[] = [];
  const idx: number[] = [];
  const height = (a: number) => {
    const n = 0.5 + 0.5 * Math.sin(a * 3 + 1.3) * Math.sin(a * 5 + 0.4) + 0.25 * Math.sin(a * 11 + 2.1) + 0.12 * Math.sin(a * 23);
    return 10 + 34 * Math.max(0, n);
  };
  for (const ring of rings) {
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      pos.push(Math.cos(a) * ring.r, ring.k > 0 ? height(a) * ring.k : -0.06, Math.sin(a) * ring.r);
    }
  }
  const row = seg + 1;
  for (let r = 0; r < rings.length - 1; r++) {
    for (let i = 0; i < seg; i++) {
      const a = r * row + i;
      idx.push(a, a + row, a + 1, a + 1, a + row, a + row + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color: 0x6b7a5d, roughness: 1, metalness: 0, side: THREE.DoubleSide });
  const m = new THREE.Mesh(g, mat);
  m.name = 'horizon';
  m.userData.noAO = true;
  return m;
}

function insideSlab(x: number, z: number, margin = 0.05): boolean {
  for (const s of SLABS) if (x > s.x0 - margin && x < s.x1 + margin && z > s.z0 - margin && z < s.z1 + margin) return true;
  return false;
}

function scatterPebbles(mesh: THREE.InstancedMesh) {
  const rand = rng(99);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const col = new THREE.Color();
  let n = 0;
  let guard = 0;
  while (n < MAX_PEBBLES && guard++ < MAX_PEBBLES * 6) {
    const x = (rand() * 2 - 1) * (HX - 0.12);
    const z = (rand() * 2 - 1) * (HZ - 0.12);
    if (insideSlab(x, z)) continue;
    const s = 0.012 + rand() * 0.014;
    e.set(rand() * 3, rand() * 3, rand() * 3);
    q.setFromEuler(e);
    m.compose(new THREE.Vector3(x, s * 0.35, z), q, new THREE.Vector3(s * 1.2, s * 0.7, s));
    mesh.setMatrixAt(n, m);
    const t = 0.32 + rand() * 0.5;
    col.setRGB(t * (0.95 + rand() * 0.1), t, t * (0.92 + rand() * 0.12));
    mesh.setColorAt(n, col);
    n++;
  }
  mesh.count = n;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

function postsOf(edge: 'N' | 'S' | 'E' | 'W'): [number, number][] {
  switch (edge) {
    case 'N':
      return POSTS_X.map((x) => [x, -HZ]);
    case 'S':
      return POSTS_X.map((x) => [x, HZ]);
    case 'E':
      return POSTS_Z_E.map((z) => [HX, z]);
    default:
      return POSTS_Z_W.map((z) => [-HX, z]);
  }
}

function buildFence(M: Mats, col: CollisionWorld): THREE.Group {
  const g = new THREE.Group();
  g.name = 'fence';
  const steel = new Batch();
  const y0 = SITE.curbHeight;
  const top = SITE.fenceHeight + 0.1;
  const panelH = SITE.fenceHeight - 0.15 - y0;

  const seen = new Set<string>();
  const addPost = (x: number, z: number, big: boolean) => {
    const k = `${x.toFixed(2)},${z.toFixed(2)}`;
    if (seen.has(k)) return;
    seen.add(k);
    const r = big ? 0.055 : 0.04;
    steel.cyl(M.galv, r, r, top - y0, [x, y0 + (top - y0) / 2, z], 10);
    steel.cyl(M.galv, r * 1.25, r * 1.25, 0.04, [x, top, z], 10); // tampa
    // sapata de concreto aparente na base do poste
    steel.box(M.concrete, [0.22, 0.05, 0.22], [x, y0 + 0.025, z], [0, 0, 0], TILE.concrete);
  };

  const panels: THREE.Mesh[] = [];
  const addRun = (ax: number, az: number, bx: number, bz: number) => {
    const len = Math.hypot(bx - ax, bz - az);
    if (len < 0.2) return;
    const mx = (ax + bx) / 2;
    const mz = (az + bz) / 2;
    const ry = Math.atan2(bx - ax, bz - az) - Math.PI / 2; // plano orientado ao longo do trecho
    // tela losangular: UV em metros para o losango manter ~6,5 cm
    const pg = new THREE.PlaneGeometry(len - 0.08, panelH);
    const uv = pg.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * (len - 0.08)) / TILE.chain, (uv.getY(i) * panelH) / TILE.chain);
    const mesh = new THREE.Mesh(pg, M.chain);
    mesh.position.set(mx, y0 + 0.05 + panelH / 2, mz);
    mesh.rotation.y = ry;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.userData.noAO = true;
    panels.push(mesh);
    // travessas (topo, meio e arame tensor inferior)
    const dx = (bx - ax) / len;
    const dz = (bz - az) / len;
    for (const yy of [y0 + panelH + 0.07, y0 + panelH / 2 + 0.05, y0 + 0.08]) {
      steel.member(M.galv, [ax + dx * 0.04, yy, az + dz * 0.04], [bx - dx * 0.04, yy, bz - dz * 0.04], 0.012, 5);
    }
  };

  const runs: Array<['N' | 'S' | 'E' | 'W', [number, number][]]> = [
    ['N', postsOf('N')],
    ['S', postsOf('S')],
    ['E', postsOf('E')],
    ['W', postsOf('W')],
  ];
  for (const [edge, list] of runs) {
    list.forEach(([x, z], i) => {
      addPost(x, z, i === 0 || i === list.length - 1 || (edge === 'W' && (z === GATE.z0 || z === GATE.z1)));
      if (i > 0) {
        const [px, pz] = list[i - 1];
        // vão do portão: sem tela
        if (edge === 'W' && Math.abs(pz - GATE.z0) < 1e-6 && Math.abs(z - GATE.z1) < 1e-6) return;
        addRun(px, pz, x, z);
      }
    });
  }

  // postes de portão reforçados + escoras diagonais internas nos cantos (visíveis na referência)
  const strut = (x: number, z: number, dx: number, dz: number) => {
    steel.member(M.galv, [x, SITE.fenceHeight - 0.35, z], [x + dx * 1.5, y0, z + dz * 1.5], 0.03, 6);
  };
  strut(-HX, -HZ, 1, 0);
  strut(-HX, -HZ, 0, 1);
  strut(HX, -HZ, -1, 0);
  strut(HX, -HZ, 0, 1);
  strut(HX, HZ, -1, 0);
  strut(HX, HZ, 0, -1);
  strut(-HX, HZ, 1, 0);
  strut(-HX, HZ, 0, -1);
  strut(-HX, GATE.z0, 1, 0);
  strut(-HX, GATE.z1, 1, 0);

  g.add(steel.build('fence-steel'));
  panels.forEach((p) => g.add(p));

  // concertina: espiras empilhadas ao longo do perímetro (instanciadas)
  const coilY = top + 0.2;
  const coilR = 0.27;
  const step = 0.17;
  const torusGeo = new THREE.TorusGeometry(coilR, 0.007, 4, 14);
  const coil: Array<{ x: number; z: number; ry: number }> = [];
  const lines: Array<[number, number, number, number]> = [
    [-HX, -HZ, HX, -HZ],
    [HX, -HZ, HX, HZ],
    [HX, HZ, -HX, HZ],
    [-HX, HZ, -HX, -HZ],
  ];
  for (const [ax, az, bx, bz] of lines) {
    const len = Math.hypot(bx - ax, bz - az);
    const ry = Math.atan2(bx - ax, bz - az); // eixo local Z do toro alinhado ao trecho
    const n = Math.floor(len / step);
    for (let i = 0; i <= n; i++) {
      const t = (i * step) / len;
      coil.push({ x: ax + (bx - ax) * t, z: az + (bz - az) * t, ry });
    }
  }
  const coilMesh = new THREE.InstancedMesh(torusGeo, M.galv, coil.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  coil.forEach((c, i) => {
    // pequeno giro por espira simula a hélice da concertina
    e.set(0, c.ry, (i % 7) * 0.05, 'YXZ');
    q.setFromEuler(e);
    m.compose(new THREE.Vector3(c.x, coilY, c.z), q, new THREE.Vector3(1, 1, 1));
    coilMesh.setMatrixAt(i, m);
  });
  coilMesh.castShadow = false;
  coilMesh.userData.noAO = true;
  g.add(coilMesh);

  // colisões: cerca como paredes finas (a tela é intransponível); portão tratado à parte
  const t = 0.18;
  col.addRect(-HX - 0.2, HX + 0.2, -HZ - t, -HZ + t, -1, 4);
  col.addRect(-HX - 0.2, HX + 0.2, HZ - t, HZ + t, -1, 4);
  col.addRect(HX - t, HX + t, -HZ - 0.2, HZ + 0.2, -1, 4);
  col.addRect(-HX - t, -HX + t, -HZ - 0.2, GATE.z0 + 0.06, -1, 4);
  col.addRect(-HX - t, -HX + t, GATE.z1 - 0.06, HZ + 0.2, -1, 4);

  return g;
}

function buildGate(M: Mats, col: CollisionWorld): Gate {
  const group = new THREE.Group();
  group.name = 'gate';
  const leafLen = (GATE.z1 - GATE.z0) / 2;
  const H = GATE.height;

  const makeLeaf = (dir: 1 | -1): THREE.Group => {
    const b = new Batch();
    const zz = (v: number) => dir * v;
    const y = 0.12;
    const t = 0.05;
    // quadro em tubo retangular
    b.box(M.galv, [t, H, t], [0, y + H / 2, zz(0.04)]);
    b.box(M.galv, [t, H, t], [0, y + H / 2, zz(leafLen - 0.04)]);
    b.box(M.galv, [t, t, leafLen - 0.02], [0, y + 0.04, zz(leafLen / 2)]);
    b.box(M.galv, [t, t, leafLen - 0.02], [0, y + H - 0.03, zz(leafLen / 2)]);
    b.box(M.galv, [t, t, leafLen - 0.02], [0, y + H * 0.5, zz(leafLen / 2)]);
    // diagonal de travamento
    b.bar(M.galv, [0, y + 0.06, zz(0.06)], [0, y + H - 0.06, zz(leafLen - 0.06)], 0.035, 0.02);
    // grades verticais
    const n = 9;
    for (let i = 1; i <= n; i++) {
      b.box(M.galv, [0.022, H - 0.1, 0.022], [0, y + H / 2, zz((leafLen * i) / (n + 1))]);
    }
    // dobradiças
    for (const hy of [y + 0.35, y + H - 0.35]) {
      b.cyl(M.steelDark, 0.025, 0.025, 0.12, [0, hy, zz(0.0)], 8);
      b.box(M.steelDark, [0.012, 0.1, 0.12], [-0.03, hy, zz(0.08)]);
    }
    return b.build(`leaf${dir}`, true, true);
  };

  const hingeX = -HX;
  const leafA = makeLeaf(1);
  leafA.position.set(hingeX, 0, GATE.z0);
  const leafB = makeLeaf(-1);
  leafB.position.set(hingeX, 0, GATE.z1);
  group.add(leafA, leafB);

  // trinco central e cadeado
  const latch = new Batch();
  latch.box(M.steelDark, [0.04, 0.16, 0.04], [0.03, 1.1, (GATE.z0 + GATE.z1) / 2 - 0.02]);
  latch.box(M.warning, [0.05, 0.09, 0.06], [0.07, 1.0, (GATE.z0 + GATE.z1) / 2 + 0.02]);
  latch.cyl(M.steelDark, 0.012, 0.012, 0.09, [0.07, 0.93, (GATE.z0 + GATE.z1) / 2 + 0.02], 6, [Math.PI / 2, 0, 0]);
  const latchG = latch.build('latch');
  group.add(latchG);

  const closedBoxes = [{ minX: -HX - 0.15, maxX: -HX + 0.15, minZ: GATE.z0 - 0.06, maxZ: GATE.z1 + 0.06, minY: -1, maxY: 4 }];
  const openBoxes = [
    { minX: -HX, maxX: -HX + leafLen + 0.02, minZ: GATE.z0 - 0.05, maxZ: GATE.z0 + 0.05, minY: -1, maxY: 4 },
    { minX: -HX, maxX: -HX + leafLen + 0.02, minZ: GATE.z1 - 0.05, maxZ: GATE.z1 + 0.05, minY: -1, maxY: 4 },
  ];
  col.setDynamic('gate', closedBoxes);

  const maxAngle = 1.75; // ~100°, folhas abrem para dentro do terreno
  const gate: Gate = {
    group,
    progress: 0,
    target: 0,
    center: new THREE.Vector3(-HX, 1.2, (GATE.z0 + GATE.z1) / 2),
    update(dt: number) {
      if (this.progress === this.target) return;
      const dir = Math.sign(this.target - this.progress);
      this.progress = THREE.MathUtils.clamp(this.progress + dir * dt * 0.55, 0, 1);
      if ((dir > 0 && this.progress > this.target) || (dir < 0 && this.progress < this.target)) this.progress = this.target;
      const a = easeInOut(this.progress) * maxAngle;
      leafA.rotation.y = a;
      leafB.rotation.y = -a;
      latchG.visible = this.progress < 0.02;
      // troca as colisões apenas nos extremos, para ninguém ficar preso a meio curso
      col.setDynamic('gate', this.progress >= 1 ? openBoxes : closedBoxes);
    },
    toggle() {
      this.target = this.target > 0.5 ? 0 : 1;
      return this.target === 1;
    },
  };
  return gate;
}

function easeInOut(t: number): number {
  return t * t * (3 - 2 * t);
}
