import * as THREE from 'three';
import { SHELTER, TRAY } from '../config';
import type { CollisionWorld } from '../controls/collision';
import { Batch, blob } from './batch';
import type { Mats } from './materials';

// Trajeto: descida junto à parede sul do abrigo, curva de 90° e trecho horizontal sobre
// pilaretes até a base da eletrocalha vertical da torre. É uma representação visual
// plausível; não corresponde a projeto de cabeamento.

const R = 0.35; // raio da curva
const RISER_TOP = TRAY.y - R;
const RISER_BOTTOM = 0.45;
const OPEN_FROM = TRAY.riserX + 1.2; // a partir daqui a tampa está fechada

interface Frame {
  p: THREE.Vector3;
  t: THREE.Vector3; // tangente
  w: THREE.Vector3; // largura da eletrocalha
}

/** Quadro local da eletrocalha ao longo de s ∈ [0,1] (subida, curva, horizontal). */
function frameAt(u: number): Frame {
  // u em [0,1]: 0 = subida, 1 = fim da curva
  const phi = u * (Math.PI / 2);
  const p = new THREE.Vector3(TRAY.riserX + R - R * Math.cos(phi), RISER_TOP + R * Math.sin(phi), TRAY.z);
  const t = new THREE.Vector3(Math.sin(phi), Math.cos(phi), 0);
  // largura gira de X (subida, encostada na parede) para Z (horizontal, "deitada")
  const w = new THREE.Vector3(1 - u, 0, u);
  w.addScaledVector(t, -w.dot(t)).normalize();
  return { p, t, w };
}

function placeChannel(b: Batch, M: Mats, f: Frame, len: number, cover: boolean) {
  const o = new THREE.Vector3().crossVectors(f.w, f.t); // direção "para fora" da calha
  const z = f.t.clone().negate(); // mantém a base destra (X × Y = Z)
  const basis = (center: THREE.Vector3) => new THREE.Matrix4().makeBasis(f.w, o, z).setPosition(center);
  const at = (a: number, bb: number) => f.p.clone().addScaledVector(f.w, a).addScaledVector(o, bb);
  const W = 0.4;
  const D = 0.1;
  b.withMatrix(M.galvDull, new THREE.BoxGeometry(W, 0.012, len), basis(at(0, -D / 2)));
  b.withMatrix(M.galvDull, new THREE.BoxGeometry(0.012, D, len), basis(at(-W / 2, 0)));
  b.withMatrix(M.galvDull, new THREE.BoxGeometry(0.012, D, len), basis(at(W / 2, 0)));
  if (cover) b.withMatrix(M.galv, new THREE.BoxGeometry(W + 0.03, 0.012, len), basis(at(0, D / 2 + 0.006)));
}

/** Cabo seguindo a trajetória com deslocamento (a,b) na seção da calha. */
function cablePath(sampleFrames: Frame[], a: number, bb: number): THREE.Vector3[] {
  return sampleFrames.map((f) => {
    const o = new THREE.Vector3().crossVectors(f.w, f.t);
    return f.p.clone().addScaledVector(f.w, a).addScaledVector(o, bb);
  });
}

export function buildCableTray(M: Mats, col: CollisionWorld): THREE.Group {
  const group = new THREE.Group();
  group.name = 'cabletray';
  const b = new Batch();
  const cables = new Batch();

  // --- subida (vertical) ---------------------------------------------------------------------
  const riserLen = RISER_TOP - RISER_BOTTOM;
  const segN = 6;
  for (let i = 0; i < segN; i++) {
    const y0 = RISER_BOTTOM + (riserLen * i) / segN;
    const y1 = RISER_BOTTOM + (riserLen * (i + 1)) / segN;
    const f: Frame = {
      p: new THREE.Vector3(TRAY.riserX, (y0 + y1) / 2, TRAY.z),
      t: new THREE.Vector3(0, 1, 0),
      w: new THREE.Vector3(1, 0, 0),
    };
    const open = (y0 + y1) / 2 > RISER_TOP - 1.0;
    placeChannel(b, M, f, y1 - y0 + 0.002, !open);
  }
  // mísulas fixadoras à parede (afastam a calha da alvenaria)
  for (const yy of [0.9, 1.7, 2.5]) {
    b.box(M.steelDark, [0.44, 0.04, 0.08], [TRAY.riserX, yy, SHELTER.z1 + 0.05]);
  }
  // caixa de passagem de cabos na base (entrada na parede)
  b.box(M.cabinetTrim, [0.5, 0.36, 0.1], [TRAY.riserX, 0.5, SHELTER.z1 + 0.05]);
  b.box(M.steelDark, [0.54, 0.02, 0.14], [TRAY.riserX, 0.7, SHELTER.z1 + 0.06]);

  // --- curva (trechos mitrados, descoberta para mostrar os cabos) ---------------------------------
  const bendN = 8;
  const arcStep = (R * Math.PI) / 2 / bendN;
  for (let i = 0; i < bendN; i++) {
    const f = frameAt((i + 0.5) / bendN);
    placeChannel(b, M, f, arcStep + 0.012, false);
  }

  // --- trecho horizontal -----------------------------------------------------------------------------
  const hx0 = TRAY.riserX + R;
  const hx1 = TRAY.endX;
  const hSegs = Math.ceil((hx1 - hx0) / 1.0);
  for (let i = 0; i < hSegs; i++) {
    const xa = hx0 + ((hx1 - hx0) * i) / hSegs;
    const xb = hx0 + ((hx1 - hx0) * (i + 1)) / hSegs;
    const f: Frame = {
      p: new THREE.Vector3((xa + xb) / 2, TRAY.y, TRAY.z),
      t: new THREE.Vector3(1, 0, 0),
      w: new THREE.Vector3(0, 0, 1),
    };
    placeChannel(b, M, f, xb - xa + 0.002, (xa + xb) / 2 > OPEN_FROM);
    // travessa de apoio sob a calha
    b.box(M.steelDark, [0.04, 0.03, 0.46], [xa, TRAY.y - 0.07, TRAY.z]);
  }
  // tampa fechando a ponta
  b.box(M.galvDull, [0.02, 0.1, 0.4], [hx1, TRAY.y, TRAY.z]);

  // --- cabos visíveis nos trechos descobertos --------------------------------------------------------------
  const frames: Frame[] = [];
  const topPts = 6;
  for (let i = 0; i <= topPts; i++) {
    const f: Frame = {
      p: new THREE.Vector3(TRAY.riserX, RISER_TOP - 1.0 + (1.0 * i) / topPts, TRAY.z),
      t: new THREE.Vector3(0, 1, 0),
      w: new THREE.Vector3(1, 0, 0),
    };
    frames.push(f);
  }
  for (let i = 1; i <= 10; i++) frames.push(frameAt(i / 10));
  const hOpenEnd = OPEN_FROM + 0.3;
  for (let i = 1; i <= 5; i++) {
    frames.push({
      p: new THREE.Vector3(hx0 + ((hOpenEnd - hx0) * i) / 5, TRAY.y, TRAY.z),
      t: new THREE.Vector3(1, 0, 0),
      w: new THREE.Vector3(0, 0, 1),
    });
  }
  const bundle: Array<{ a: number; bb: number; r: number; mat: THREE.Material }> = [
    { a: -0.14, bb: -0.03, r: 0.017, mat: M.cableBlack },
    { a: -0.08, bb: -0.028, r: 0.017, mat: M.cableRed },
    { a: -0.02, bb: -0.03, r: 0.017, mat: M.cableBlack },
    { a: 0.05, bb: -0.028, r: 0.017, mat: M.cableRed },
    { a: 0.11, bb: -0.03, r: 0.017, mat: M.cableBlack },
    { a: 0.16, bb: -0.026, r: 0.013, mat: M.cableGreen },
    { a: -0.05, bb: -0.0, r: 0.015, mat: M.cableBlack },
    { a: 0.04, bb: 0.0, r: 0.015, mat: M.cableBlack },
  ];
  for (const c of bundle) {
    const curve = new THREE.CatmullRomCurve3(cablePath(frames, c.a, c.bb), false, 'centripetal');
    cables.geo(c.mat, new THREE.TubeGeometry(curve, 48, c.r, 6, false));
  }

  // --- pilaretes de sustentação do trecho aéreo ---------------------------------------------------------------
  const post = (x: number) => {
    b.box(M.concrete, [0.5, 0.25, 0.5], [x, 0.125, TRAY.z], [0, 0, 0], 1.0);
    b.cyl(M.galv, 0.07, 0.07, TRAY.y - 0.25 - 0.1, [x, 0.25 + (TRAY.y - 0.35) / 2, TRAY.z], 12);
    b.box(M.galvDull, [0.3, 0.02, 0.3], [x, 0.26, TRAY.z]);
    b.box(M.galv, [0.1, 0.06, 0.62], [x, TRAY.y - 0.12, TRAY.z]);
    for (const dz of [-0.2, 0.2]) b.box(M.steelDark, [0.05, 0.1, 0.03], [x, TRAY.y - 0.04, TRAY.z + dz]);
    col.addCylinder(x, TRAY.z, 0.22, 0, TRAY.y);
    blobs.push([x, TRAY.z]);
  };
  const blobs: [number, number][] = [];
  post(0.9);
  post(2.1);
  // escoras sobre a cobertura do abrigo
  for (const x of [-4.1, -2.8, -1.5]) {
    b.cyl(M.galv, 0.03, 0.03, 0.18, [x, SHELTER.plinth + SHELTER.h + 0.14 + 0.09, TRAY.z - 0.12], 8);
    b.box(M.steelDark, [0.06, 0.04, 0.5], [x, TRAY.y - 0.1, TRAY.z]);
  }

  // etiquetas de identificação sobre a tampa e braçadeiras de aperto nas emendas
  for (let x = OPEN_FROM + 0.9; x < hx1 - 0.3; x += 1.7) {
    b.box(M.plasticWhite, [0.2, 0.004, 0.1], [x, TRAY.y + 0.066, TRAY.z]);
    b.box(M.steelDark, [0.035, 0.012, 0.44], [x + 0.85, TRAY.y + 0.066, TRAY.z]);
  }

  group.add(b.build('tray-structure'), cables.build('tray-cables', true, false));
  for (const [bx, bz] of blobs) group.add(blob(M.blob, bx, bz, 1.2, 1.2, 0.014, 0.55));

  col.addRect(TRAY.riserX - 0.22, TRAY.riserX + 0.22, SHELTER.z1, SHELTER.z1 + 0.28, 0, 3.4);
  return group;
}
