import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type V3 = [number, number, number];

const UP = new THREE.Vector3(0, 1, 0);
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _one = new THREE.Vector3(1, 1, 1);
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();

/**
 * Acumula primitivas por material e funde em uma malha por material.
 * Motivo: a torre, o alambrado e os armários têm milhares de peças; fundir derruba
 * o número de draw calls sem perder geometria 3D real.
 */
export class Batch {
  private parts = new Map<THREE.Material, THREE.BufferGeometry[]>();

  geo(
    mat: THREE.Material,
    g: THREE.BufferGeometry,
    pos: V3 = [0, 0, 0],
    rot: V3 = [0, 0, 0],
    scale: V3 = [1, 1, 1],
  ): this {
    _e.set(rot[0], rot[1], rot[2], 'YXZ');
    _q.setFromEuler(_e);
    _m.compose(_a.set(pos[0], pos[1], pos[2]), _q, _b.set(scale[0], scale[1], scale[2]));
    const c = g.clone();
    c.applyMatrix4(_m);
    const list = this.parts.get(mat) ?? [];
    list.push(c);
    this.parts.set(mat, list);
    return this;
  }

  /** `tile` (m): escala o UV da caixa para a textura manter tamanho físico constante. */
  box(mat: THREE.Material, size: V3, pos: V3, rot: V3 = [0, 0, 0], tile?: number): this {
    const g = new THREE.BoxGeometry(size[0], size[1], size[2]);
    if (tile) scaleBoxUV(g, size, tile);
    const r = this.geo(mat, g, pos, rot);
    g.dispose();
    return r;
  }

  cyl(mat: THREE.Material, rTop: number, rBot: number, h: number, pos: V3, seg = 12, rot: V3 = [0, 0, 0]): this {
    const g = new THREE.CylinderGeometry(rTop, rBot, h, seg);
    const r = this.geo(mat, g, pos, rot);
    g.dispose();
    return r;
  }

  sphere(mat: THREE.Material, r: number, pos: V3, seg = 12, scale: V3 = [1, 1, 1]): this {
    const g = new THREE.SphereGeometry(r, seg, Math.max(6, seg >> 1));
    const res = this.geo(mat, g, pos, [0, 0, 0], scale);
    g.dispose();
    return res;
  }

  torus(mat: THREE.Material, R: number, r: number, pos: V3, rot: V3, radial = 6, tubular = 16): this {
    const g = new THREE.TorusGeometry(R, r, radial, tubular);
    const res = this.geo(mat, g, pos, rot);
    g.dispose();
    return res;
  }

  /** Cilindro redondo entre dois pontos. */
  member(mat: THREE.Material, a: V3, b: V3, r: number, seg = 6): this {
    const [mid, len, q] = between(a, b);
    const g = new THREE.CylinderGeometry(r, r, len, seg);
    this.matrix(mat, g, mid, q);
    g.dispose();
    return this;
  }

  /** Barra de seção quadrada/retangular entre dois pontos (t = espessura). */
  bar(mat: THREE.Material, a: V3, b: V3, t: number, t2 = t): this {
    const [mid, len, q] = between(a, b);
    const g = new THREE.BoxGeometry(t, len, t2);
    this.matrix(mat, g, mid, q);
    g.dispose();
    return this;
  }

  /** Posiciona a geometria por uma matriz arbitrária (útil para trechos curvos de esteira). */
  withMatrix(mat: THREE.Material, g: THREE.BufferGeometry, m: THREE.Matrix4): this {
    const c = g.clone();
    c.applyMatrix4(m);
    const list = this.parts.get(mat) ?? [];
    list.push(c);
    this.parts.set(mat, list);
    return this;
  }

  private matrix(mat: THREE.Material, g: THREE.BufferGeometry, pos: THREE.Vector3, q: THREE.Quaternion) {
    _m.compose(pos, q, _one);
    const c = g.clone();
    c.applyMatrix4(_m);
    const list = this.parts.get(mat) ?? [];
    list.push(c);
    this.parts.set(mat, list);
  }

  build(name: string, cast = true, receive = true): THREE.Group {
    const group = new THREE.Group();
    group.name = name;
    for (const [mat, list] of this.parts) {
      const merged = mergeGeometries(list, false);
      list.forEach((g) => g.dispose());
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = cast;
      mesh.receiveShadow = receive;
      group.add(mesh);
    }
    this.parts.clear();
    return group;
  }
}

function between(a: V3, b: V3): [THREE.Vector3, number, THREE.Quaternion] {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const dir = vb.clone().sub(va);
  const len = dir.length();
  const q = new THREE.Quaternion();
  if (len > 1e-9) q.setFromUnitVectors(UP, dir.divideScalar(len));
  return [va.add(vb).multiplyScalar(0.5), len, q];
}

function scaleBoxUV(g: THREE.BoxGeometry, [w, h, d]: V3, tile: number) {
  const uv = g.attributes.uv as THREE.BufferAttribute;
  // ordem das faces do BoxGeometry: +x, -x, +y, -y, +z, -z (4 vértices cada)
  const dims: [number, number][] = [
    [d, h],
    [d, h],
    [w, d],
    [w, d],
    [w, h],
    [w, h],
  ];
  for (let f = 0; f < 6; f++) {
    for (let i = 0; i < 4; i++) {
      const k = f * 4 + i;
      uv.setXY(k, (uv.getX(k) * dims[f][0]) / tile, (uv.getY(k) * dims[f][1]) / tile);
    }
  }
  uv.needsUpdate = true;
}

/** Sombra de contato: mancha escura no piso, barata e eficaz para ancorar equipamentos. */
export function blob(mat: THREE.Material, cx: number, cz: number, w: number, d: number, y = 0.012, op = 1): THREE.Mesh {
  const g = new THREE.PlaneGeometry(w, d);
  g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, op === 1 ? mat : cloneOpacity(mat, op));
  m.position.set(cx, y, cz);
  m.renderOrder = 1;
  m.userData.noAO = true; // já é uma sombra: fora do passe de oclusão ambiental
  return m;
}

function cloneOpacity(mat: THREE.Material, op: number): THREE.Material {
  const c = mat.clone();
  c.opacity = op;
  return c;
}
