import * as THREE from 'three';
import { SHELTER_INTERIOR } from '../config';
import type { CollisionWorld } from '../controls/collision';
import { Batch, blob, type V3 } from './batch';
import type { Mats } from './materials';

// Interior do abrigo: REPRESENTAÇÃO GENÉRICA. A referência não mostra o interior, então
// nada aqui afirma fabricante, modelo, quantidade real, tensão, capacidade ou autonomia.
// Dimensões são estimativas visuais (ver PRD, seção 6).

const I = SHELTER_INTERIOR;
const F = I.floor;
const L = 0.012; // espessura do revestimento interno (ver shelter.ts)
const U = 0.0445; // 1U de rack, padrão 19"

const RACK = { w: 0.6, d: 0.8, h: 2.0, z: -2.4 };
const RACK_X = [-3.8, -3.2, -2.6];

export interface InteriorBuild {
  group: THREE.Group;
  lights: THREE.PointLight[];
  /** forro, luminárias e suportes de teto: ocultos no corte do abrigo */
  ceiling: THREE.Object3D[];
}

export function buildShelterInterior(M: Mats, col: CollisionWorld): InteriorBuild {
  const group = new THREE.Group();
  group.name = 'shelter-interior';
  const b = new Batch();
  const led = new Batch();
  const lamp = new Batch();
  const ceil = new Batch(); // forro e o que pende dele

  const cx = (I.x0 + I.x1) / 2;
  const cz = (I.z0 + I.z1) / 2;

  // piso (vinílico) e forro; o piso fica 4 cm acima da soleira de concreto
  b.box(M.floorVinyl, [I.x1 - I.x0, 0.04, I.z1 - I.z0], [cx, F - 0.02, cz]);
  ceil.box(M.ceilingTile, [I.x1 - I.x0, 0.05, I.z1 - I.z0], [cx, I.ceiling + 0.025, cz]);

  // luminárias lineares de teto
  const lights: THREE.PointLight[] = [];
  for (const lx of [-3.5, -1.7]) {
    ceil.box(M.plasticWhite, [1.1, 0.05, 0.14], [lx, I.ceiling - 0.025, cz]);
    lamp.box(M.interiorLamp, [1.0, 0.012, 0.1], [lx, I.ceiling - 0.054, cz]);
    const pl = new THREE.PointLight(0xfff0dc, 0, 9, 2);
    pl.position.set(lx, I.ceiling - 0.3, cz);
    lights.push(pl);
    group.add(pl);
  }

  // --- racks de telecomunicações (3, em linha junto à parede norte) --------------------------
  const frontZ = RACK.z + RACK.d / 2;
  const rackClosed = (x: number) => {
    const yc = F + RACK.h / 2;
    b.box(M.steelDark, [RACK.w, 0.08, RACK.d], [x, F + 0.04, RACK.z]);
    b.box(M.rackBody, [RACK.w, RACK.h - 0.08, RACK.d], [x, F + 0.08 + (RACK.h - 0.08) / 2, RACK.z]);
    b.box(M.rackBody, [RACK.w + 0.02, 0.03, RACK.d + 0.02], [x, F + RACK.h + 0.015, RACK.z]);
    // porta perfurada: painel, grupos de aberturas, puxador e etiqueta
    b.box(M.steelDark, [RACK.w - 0.06, RACK.h - 0.2, 0.02], [x, yc + 0.02, frontZ + 0.01]);
    for (let g = 0; g < 3; g++) {
      for (let k = 0; k < 7; k++) {
        b.box(M.plastic, [0.4, 0.012, 0.012], [x, F + 0.45 + g * 0.55 + k * 0.03, frontZ + 0.022]);
      }
    }
    b.box(M.galv, [0.02, 0.28, 0.03], [x + 0.2, yc, frontZ + 0.035]);
    b.box(M.plasticWhite, [0.14, 0.05, 0.004], [x - 0.12, F + RACK.h - 0.2, frontZ + 0.022]);
    led.sphere(M.ledGreen, 0.007, [x - 0.2, F + RACK.h - 0.16, frontZ + 0.024], 6);
  };

  const rackOpen = (x: number) => {
    const t = 0.02;
    b.box(M.steelDark, [RACK.w, 0.08, RACK.d], [x, F + 0.04, RACK.z]);
    b.box(M.rackBody, [t, RACK.h - 0.08, RACK.d], [x - RACK.w / 2 + t / 2, F + 0.08 + (RACK.h - 0.08) / 2, RACK.z]);
    b.box(M.rackBody, [t, RACK.h - 0.08, RACK.d], [x + RACK.w / 2 - t / 2, F + 0.08 + (RACK.h - 0.08) / 2, RACK.z]);
    b.box(M.rackBody, [RACK.w, RACK.h - 0.08, t], [x, F + 0.08 + (RACK.h - 0.08) / 2, RACK.z - RACK.d / 2 + t / 2]);
    b.box(M.rackBody, [RACK.w + 0.02, 0.03, RACK.d + 0.02], [x, F + RACK.h + 0.015, RACK.z]);
    // equipamentos de 19": caixas escuras com frontal clara, LEDs e aberturas
    const sizes = [1, 2, 1, 1, 3, 1, 2, 1, 4, 1, 1, 2, 1, 1, 2, 1, 3, 1, 2, 1];
    let y = F + 0.14;
    const faceZ = frontZ - 0.05;
    sizes.forEach((u, i) => {
      const hh = u * U;
      b.box(M.equipBody, [0.5, hh - 0.004, 0.55], [x, y + hh / 2, faceZ - 0.275]);
      const blank = i % 4 === 3;
      b.box(blank ? M.rackBody : M.equipFace, [0.5, hh - 0.004, 0.012], [x, y + hh / 2, faceZ + 0.006]);
      b.box(M.steelDark, [0.04, hh - 0.012, 0.016], [x - 0.23, y + hh / 2, faceZ + 0.01]); // orelhas de fixação
      b.box(M.steelDark, [0.04, hh - 0.012, 0.016], [x + 0.23, y + hh / 2, faceZ + 0.01]);
      if (!blank) {
        for (let k = 0; k < 3; k++) {
          led.sphere(k % 2 ? M.ledAmber : M.ledGreen, 0.006, [x - 0.15 + k * 0.03, y + hh / 2 + (hh > 0.06 ? 0.015 : 0), faceZ + 0.014], 6);
        }
        for (let k = 0; k < 6; k++) b.box(M.equipBody, [0.012, Math.min(0.03, hh - 0.014), 0.004], [x + 0.02 + k * 0.025, y + hh / 2, faceZ + 0.013]);
      }
      y += hh;
    });
    // porta entreaberta (hinge à esquerda, abre cerca de 70° para o corredor)
    const hx = x - RACK.w / 2 + 0.02;
    const th = (-70 * Math.PI) / 180;
    const lw = 0.56;
    b.box(M.steelDark, [lw, RACK.h - 0.2, 0.025], [hx + 0.28 * Math.cos(th) + 0.012 * Math.sin(th), F + RACK.h / 2, frontZ + 0.28 * -Math.sin(th) + 0.012 * Math.cos(th)], [0, th, 0]);
    col.addRect(x - 0.32, x - 0.05, frontZ, frontZ + 0.56, F, F + 2.1);
  };

  rackClosed(RACK_X[0]);
  rackOpen(RACK_X[1]);
  rackClosed(RACK_X[2]);
  col.addRect(RACK_X[0] - RACK.w / 2, RACK_X[2] + RACK.w / 2, I.z0, frontZ, F, F + 2.3);

  // --- banco de baterias (genérico): estante aberta para o corredor, blocos com terminais ---------
  const bx = I.x0 + 0.33;
  const bz = -1.45;
  for (const sx of [-0.3, 0.3]) for (const sz of [-0.48, 0.48]) b.box(M.rackBody, [0.04, 1.55, 0.04], [bx + sx, F + 0.775, bz + sz]);
  const tiers = [0.3, 0.7, 1.1];
  for (const ty of tiers) {
    b.box(M.rackBody, [0.62, 0.03, 0.98], [bx, F + ty, bz]);
    for (let i = 0; i < 5; i++) {
      const z = bz - 0.38 + i * 0.19;
      b.box(M.batteryBlock, [0.46, 0.22, 0.17], [bx, F + ty + 0.015 + 0.11, z]);
      b.box(M.equipFace, [0.012, 0.05, 0.1], [bx + 0.236, F + ty + 0.13, z]); // etiqueta
      const top = F + ty + 0.015 + 0.22;
      for (const sd of [-1, 1]) {
        b.cyl(sd * (i % 2 ? -1 : 1) > 0 ? M.cableRed : M.cableBlack, 0.015, 0.015, 0.025, [bx + sd * 0.15, top + 0.012, z], 8);
      }
      if (i < 4) {
        const side = i % 2 === 0 ? 0.15 : -0.15;
        b.box(M.copper, [0.012, 0.01, 0.2], [bx + side, top + 0.028, z + 0.095]);
      }
    }
  }
  b.box(M.rackBody, [0.64, 0.03, 1.0], [bx, F + 1.52, bz]);
  col.addRect(I.x0, I.x0 + 0.66, bz - 0.5, bz + 0.5, F, F + 1.6);

  // --- quadro de distribuição elétrica (genérico) na parede norte -----------------------------------
  const qx = -1.3;
  const qz = I.z0 + L + 0.09;
  const qy = F + 0.75;
  b.box(M.cabinet, [0.85, 1.2, 0.04], [qx, qy + 0.6, I.z0 + L + 0.02]);
  for (const sx of [-0.4125, 0.4125]) b.box(M.cabinet, [0.025, 1.2, 0.18], [qx + sx, qy + 0.6, qz]);
  b.box(M.cabinet, [0.85, 0.025, 0.18], [qx, qy + 1.2 - 0.0125, qz]);
  b.box(M.cabinet, [0.85, 0.025, 0.18], [qx, qy + 0.0125, qz]);
  // trilhos, barramentos de cobre e disjuntores em três fileiras
  for (let r = 0; r < 3; r++) {
    const ry = qy + 0.28 + r * 0.32;
    b.box(M.galv, [0.76, 0.03, 0.015], [qx, ry - 0.1, I.z0 + L + 0.05]);
    b.box(M.copper, [0.7, 0.015, 0.012], [qx, ry + 0.1, I.z0 + L + 0.05]);
    for (let k = 0; k < 10; k++) {
      const x = qx - 0.34 + k * 0.0755;
      b.box(M.equipBody, [0.05, 0.11, 0.06], [x, ry, I.z0 + L + 0.085]);
      b.box(M.equipFace, [0.014, 0.03, 0.02], [x, ry + (k % 3 ? 0.02 : -0.02), I.z0 + L + 0.12]);
    }
  }
  // tampa de proteção na parte inferior e placa de aviso
  b.box(M.cabinetTrim, [0.8, 0.26, 0.012], [qx, qy + 0.15, qz + 0.08]);
  b.box(M.warning, [0.14, 0.12, 0.006], [qx + 0.25, qy + 0.15, qz + 0.088]);
  col.addRect(qx - 0.45, qx + 0.45, I.z0, I.z0 + 0.25, F + 0.7, F + 2.0);

  // --- unidade interna de climatização (face interna da unidade de parede) -----------------------------
  const ax = -2.45;
  const ay = F + 1.92;
  const az = I.z1 - L - 0.12;
  b.box(M.plasticWhite, [0.9, 0.34, 0.24], [ax, ay, az]);
  for (let i = 0; i < 5; i++) b.box(M.plasticWhite, [0.84, 0.012, 0.04], [ax, ay - 0.1 - i * 0.012, az - 0.13], [0.5, 0, 0]);
  b.box(M.equipBody, [0.1, 0.04, 0.004], [ax + 0.3, ay + 0.1, az - 0.122]);
  led.sphere(M.ledGreen, 0.007, [ax + 0.34, ay + 0.1, az - 0.126], 6);
  col.addRect(ax - 0.5, ax + 0.5, I.z1 - 0.3, I.z1, F + 1.7, F + 2.4);

  // --- aterramento: barra de cobre na parede e cabo verde ligando ao rack mais próximo ---------------------
  const gx = -4.1;
  const gy = F + 0.4;
  const gz = I.z1 - L - 0.01;
  b.box(M.copper, [0.4, 0.05, 0.012], [gx, gy, gz]);
  for (const sx of [-0.15, 0.15]) b.cyl(M.ceramic, 0.012, 0.012, 0.03, [gx + sx, gy, gz + 0.012], 6, [Math.PI / 2, 0, 0]);
  const gcable: V3[] = [
    [gx, gy, gz - 0.02],
    [gx, F + 0.03, I.z1 - 0.2],
    [gx, F + 0.03, frontZ + 0.1],
    [RACK_X[0], F + 0.03, frontZ + 0.1],
    [RACK_X[0], F + 0.1, frontZ],
  ];
  for (let i = 0; i < gcable.length - 1; i++) b.member(M.cableGreen, gcable[i], gcable[i + 1], 0.011, 5);

  // --- entrada de cabos na parede sul e esteira aérea (escada para cabos) -------------------------------------
  const ex = -4.7;
  const ladderZ = I.z1 - 0.14;
  b.box(M.cabinetTrim, [0.5, 0.36, 0.03], [ex, 0.5 + 0.0, I.z1 - L - 0.015]);
  b.box(M.steelDark, [0.54, 0.02, 0.05], [ex, 0.69, I.z1 - L - 0.02]);
  const ty = 2.46; // cota da esteira aérea
  const rail = (a: V3, c: V3) => b.bar(M.galv, a, c, 0.03, 0.012);
  const rung = (a: V3, c: V3) => b.bar(M.galv, a, c, 0.02, 0.012);
  const hw = 0.15;
  // subida junto à parede sul
  rail([ex - hw, 0.75, ladderZ], [ex - hw, ty, ladderZ]);
  rail([ex + hw, 0.75, ladderZ], [ex + hw, ty, ladderZ]);
  for (let y = 0.9; y < ty; y += 0.3) rung([ex - hw, y, ladderZ], [ex + hw, y, ladderZ]);
  // trecho para o norte, sobre o banco de baterias
  const northZ = RACK.z;
  rail([ex - hw, ty, ladderZ], [ex - hw, ty, northZ]);
  rail([ex + hw, ty, ladderZ], [ex + hw, ty, northZ]);
  for (let z = ladderZ - 0.15; z > northZ; z -= 0.3) rung([ex - hw, ty, z], [ex + hw, ty, z]);
  // trecho para leste, sobre os racks
  const endX = RACK_X[2] + 0.1;
  rail([ex, ty, northZ - hw], [endX, ty, northZ - hw]);
  rail([ex, ty, northZ + hw], [endX, ty, northZ + hw]);
  for (let x = ex + 0.15; x < endX; x += 0.3) rung([x, ty, northZ - hw], [x, ty, northZ + hw]);
  // suportes de teto
  for (const [sx, sz] of [
    [ex, -1.2],
    [-4.0, northZ],
    [-3.0, northZ],
  ] as [number, number][]) {
    ceil.bar(M.steelDark, [sx, ty + 0.02, sz], [sx, I.ceiling, sz], 0.015, 0.015);
  }
  col.addRect(ex - 0.2, ex + 0.2, I.z1 - 0.25, I.z1, F, 2.5);

  // cabos sobre a esteira (preto/vermelho) e descidas para o topo dos racks
  const cab = new Batch();
  const cabOffsets: Array<[number, THREE.Material]> = [
    [-0.09, M.cableBlack],
    [-0.03, M.cableRed],
    [0.03, M.cableBlack],
    [0.09, M.cableRed],
  ];
  for (const [o, mat] of cabOffsets) {
    const pts: V3[] = [
      [ex + o, 0.6, I.z1 - L - 0.03],
      [ex + o, 0.75, ladderZ],
      [ex + o, ty + 0.02, ladderZ],
      [ex + o, ty + 0.02, northZ + o],
      [endX, ty + 0.02, northZ + o],
    ];
    for (let i = 0; i < pts.length - 1; i++) cab.member(mat, pts[i], pts[i + 1], 0.013, 5);
    for (const p of pts.slice(1, -1)) cab.sphere(mat, 0.013, p, 6);
  }
  for (const x of RACK_X) {
    cab.member(M.cableBlack, [x, ty + 0.02, northZ], [x, F + RACK.h + 0.03, northZ], 0.012, 5);
    cab.member(M.cableRed, [x + 0.04, ty + 0.02, northZ + 0.05], [x + 0.04, F + RACK.h + 0.03, northZ + 0.05], 0.011, 5);
  }

  group.add(b.build('interior-body'));
  group.add(cab.build('interior-cables', true, false));
  group.add(led.build('interior-leds', false, false));
  const lampMesh = lamp.build('interior-lamps', false, false);
  const ceilMesh = ceil.build('interior-ceiling');
  group.add(lampMesh, ceilMesh);

  // sombras de contato (oclusão ambiental barata) sob racks e baterias
  group.add(blob(M.blob, -3.2, RACK.z + 0.1, 2.4, 1.5, F + 0.012, 0.55));
  group.add(blob(M.blob, bx, bz, 1.3, 1.8, F + 0.012, 0.5));
  return { group, lights, ceiling: [lampMesh, ceilMesh] };
}
