import * as THREE from 'three';
import { TOWER, TRAY } from '../config';
import type { CollisionWorld } from '../controls/collision';
import { Batch, blob, type V3 } from './batch';
import type { Mats } from './materials';

const { x: CX, z: CZ, height: H, baseHalf, topHalf, panels: N } = TOWER;
// A treliça nasce sobre a placa de base, acima da laje e do pedestal de concreto.
const PED_H = 0.35;
export const TOWER_Y0 = TOWER.slabH + PED_H + 0.04;

/** Semilargura da seção quadrada na cota y (afunilamento linear: estimativa visual). */
export function halfAt(y: number): number {
  const t = THREE.MathUtils.clamp((y - TOWER_Y0) / (H - TOWER_Y0), 0, 1);
  return baseHalf + (topHalf - baseHalf) * t;
}

const levelY = (i: number) => TOWER_Y0 + (i * (H - TOWER_Y0)) / N;
// cantos: 0 = (-,-) NO, 1 = (+,-) NE, 2 = (+,+) SE, 3 = (-,+) SO
const SX = [-1, 1, 1, -1];
const SZ = [-1, -1, 1, 1];
const corner = (k: number, y: number, off = 0): V3 => {
  const h = halfAt(y) + off;
  return [CX + SX[k] * h, y, CZ + SZ[k] * h];
};

export interface TowerBuild {
  group: THREE.Group;
  beaconPos: THREE.Vector3;
  /** pontos de referência para câmera, tour e áreas interativas */
  anchors: {
    sectors: THREE.Vector3;
    dishes: THREE.Vector3;
    base: THREE.Vector3;
  };
}

export function buildTower(M: Mats, col: CollisionWorld): TowerBuild {
  const group = new THREE.Group();
  group.name = 'tower';

  const s = new Batch(); // estrutura galvanizada
  const dark = new Batch(); // peças escuras: plataformas, braçadeiras
  const concrete = new Batch();
  const cable = new Batch();

  // --- fundações: pedestais, placas de base e chumbadores -----------------------------------
  for (let k = 0; k < 4; k++) {
    const [x, , z] = corner(k, TOWER_Y0);
    concrete.box(M.concrete, [0.7, PED_H, 0.7], [x, TOWER.slabH + PED_H / 2, z], [0, 0, 0], 1.5);
    s.box(M.galvDull, [0.46, 0.03, 0.46], [x, TOWER.slabH + PED_H + 0.015, z]);
    for (const dx of [-0.17, 0.17]) {
      for (const dz of [-0.17, 0.17]) {
        s.cyl(M.galv, 0.016, 0.016, 0.1, [x + dx, TOWER.slabH + PED_H + 0.07, z + dz], 6);
        s.cyl(M.galv, 0.026, 0.026, 0.02, [x + dx, TOWER.slabH + PED_H + 0.045, z + dz], 6);
      }
    }
  }

  // --- treliça ----------------------------------------------------------------------------------
  for (let i = 0; i < N; i++) {
    const ya = levelY(i);
    const yb = levelY(i + 1);
    const f = i / N;
    const legR = THREE.MathUtils.lerp(0.075, 0.034, f);
    const diaR = THREE.MathUtils.lerp(0.03, 0.017, f);
    for (let k = 0; k < 4; k++) {
      s.member(M.galv, corner(k, ya), corner(k, yb), legR, 8);
      const k2 = (k + 1) % 4;
      // diagonais em X em cada face
      s.member(M.galv, corner(k, ya), corner(k2, yb), diaR, 5);
      s.member(M.galv, corner(k2, ya), corner(k, yb), diaR, 5);
    }
  }
  for (let i = 0; i <= N; i++) {
    const y = levelY(i);
    const horR = THREE.MathUtils.lerp(0.034, 0.02, i / N);
    for (let k = 0; k < 4; k++) {
      const k2 = (k + 1) % 4;
      s.member(M.galv, corner(k, y), corner(k2, y), horR, 5);
    }
    // contraventamento em planta a cada dois níveis
    if (i % 2 === 0 && i > 0) {
      s.member(M.galv, corner(0, y), corner(2, y), horR * 0.7, 4);
      s.member(M.galv, corner(1, y), corner(3, y), horR * 0.7, 4);
    }
    // chapas de ligação e parafusos nos nós
    // flange de emenda dos montantes: disco com parafusos em círculo
    if (i > 0 && i < N) {
      const legR = THREE.MathUtils.lerp(0.075, 0.034, i / N);
      for (let k = 0; k < 4; k++) {
        const [fx, fy, fz] = corner(k, y);
        dark.cyl(M.galvDull, legR * 1.7, legR * 1.7, 0.028, [fx, fy, fz], 12);
        for (let b = 0; b < 6; b++) {
          const a = (b / 6) * Math.PI * 2;
          dark.cyl(M.steelDark, 0.011, 0.011, 0.04, [fx + Math.cos(a) * legR * 1.3, fy, fz + Math.sin(a) * legR * 1.3], 5);
        }
      }
    }
    for (let k = 0; k < 4; k++) {
      const [x, yy, z] = corner(k, y);
      const px = x - SX[k] * 0.05;
      const pz = z - SZ[k] * 0.05;
      dark.box(M.galvDull, [0.2, 0.2, 0.012], [px, yy, z]);
      dark.box(M.galvDull, [0.012, 0.2, 0.2], [x, yy, pz]);
      for (const o of [-0.06, 0.06]) {
        dark.cyl(M.steelDark, 0.012, 0.012, 0.03, [px, yy + o, z + SZ[k] * 0.012], 6, [Math.PI / 2, 0, 0]);
        dark.cyl(M.steelDark, 0.012, 0.012, 0.03, [x + SX[k] * 0.012, yy + o, pz], 6, [0, 0, Math.PI / 2]);
      }
    }
  }

  // --- escada vertical na face sul, com cabo de segurança ----------------------------------------
  const ladderOut = 0.17;
  const yTopLadder = levelY(N) - 0.9;
  const ladderPts = (xoff: number, y: number): V3 => [CX + xoff, y, CZ + halfAt(y) + ladderOut];
  for (const xo of [-0.2, 0.2]) {
    for (let i = 0; i < N; i++) {
      const ya = Math.max(levelY(i), TOWER_Y0 + 0.3);
      const yb = Math.min(levelY(i + 1), yTopLadder);
      if (yb <= ya) continue;
      dark.member(M.galv, ladderPts(xo, ya), ladderPts(xo, yb), 0.018, 6);
    }
    // consoles de fixação nos níveis
    for (let i = 1; i < N; i++) {
      const y = levelY(i);
      if (y > yTopLadder) continue;
      dark.bar(M.galvDull, [CX + xo, y, CZ + halfAt(y)], [CX + xo, y, CZ + halfAt(y) + ladderOut], 0.03, 0.016);
    }
  }
  for (let y = TOWER_Y0 + 0.45; y < yTopLadder; y += 0.3) {
    const a = ladderPts(0, y); // degrau centrado entre os dois montantes
    dark.cyl(M.galv, 0.011, 0.011, 0.4, a, 5, [0, 0, Math.PI / 2]);
  }
  // cabo de vida
  dark.member(M.steelDark, ladderPts(0, TOWER_Y0 + 0.5), ladderPts(0, yTopLadder), 0.006, 4);

  // --- plataformas: descanso (15 m) e topo ---------------------------------------------------------
  const platform = (y: number, size: number) => {
    dark.box(M.steelDark, [size, 0.035, size], [CX, y, CZ]);
    for (const o of [-size / 2 + 0.05, size / 2 - 0.05]) {
      dark.box(M.galvDull, [size, 0.06, 0.05], [CX, y - 0.05, CZ + o]);
      dark.box(M.galvDull, [0.05, 0.06, size], [CX + o, y - 0.05, CZ]);
    }
    const hh = size / 2;
    const rail = (a: V3, b: V3) => {
      dark.member(M.galv, [a[0], a[1] + 1.05, a[2]], [b[0], b[1] + 1.05, b[2]], 0.017, 6);
      dark.member(M.galv, [a[0], a[1] + 0.55, a[2]], [b[0], b[1] + 0.55, b[2]], 0.013, 6);
    };
    const c: V3[] = [
      [CX - hh, y, CZ - hh],
      [CX + hh, y, CZ - hh],
      [CX + hh, y, CZ + hh],
      [CX - hh, y, CZ + hh],
    ];
    for (let k = 0; k < 4; k++) {
      rail(c[k], c[(k + 1) % 4]);
      dark.member(M.galv, c[k], [c[k][0], c[k][1] + 1.05, c[k][2]], 0.017, 6);
      const m: V3 = [(c[k][0] + c[(k + 1) % 4][0]) / 2, y, (c[k][2] + c[(k + 1) % 4][2]) / 2];
      dark.member(M.galv, m, [m[0], m[1] + 1.05, m[2]], 0.013, 6);
    }
  };
  platform(15.0, halfAt(15) * 2 + 0.9);
  platform(levelY(N) - 0.55, halfAt(levelY(N)) * 2 + 0.75);

  // --- eletrocalha vertical na lateral (SO), com tampa e braçadeiras --------------------------------
  const trayOut = 0.2;
  const trayPt = (y: number): V3 => {
    const h = halfAt(y) + trayOut;
    return [CX - h, y, CZ + h];
  };
  const yTrayTop = 27.0;
  for (let i = 0; i < N; i++) {
    const ya = Math.max(levelY(i), TRAY.y);
    const yb = Math.min(levelY(i + 1), yTrayTop);
    if (yb <= ya) continue;
    s.bar(M.galvDull, trayPt(ya), trayPt(yb), 0.16, 0.16);
    s.bar(M.galv, trayPt(ya), trayPt(yb), 0.175, 0.04);
  }
  for (let y = 4.5; y <= yTrayTop; y += 3.0) {
    const [tx, , tz] = trayPt(y);
    const [lx, , lz] = corner(3, y);
    dark.bar(M.steelDark, [lx, y, lz], [tx, y, tz], 0.04, 0.03);
  }

  // --- condutor de descida (cobre nu) pelo canto NO, até a barra de equipotencialização ---------------
  const downPt = (y: number): V3 => {
    const h = halfAt(y) + 0.07;
    return [CX - h, y, CZ - h];
  };
  for (let i = 0; i < N; i++) {
    cable.member(M.copper, downPt(levelY(i)), downPt(levelY(i + 1)), 0.009, 5);
  }
  cable.member(M.copper, downPt(levelY(N)), [CX, H + 1.1, CZ], 0.009, 5);
  for (let i = 1; i < N; i++) {
    const [dx, dy, dz] = downPt(levelY(i));
    dark.box(M.steelDark, [0.04, 0.06, 0.04], [dx, dy, dz]);
  }
  const gb: V3 = [CX - baseHalf - 0.55, TOWER.slabH + 0.45, CZ - baseHalf - 0.35];
  dark.box(M.steelDark, [0.35, 0.08, 0.03], gb);
  cable.box(M.copper, [0.3, 0.025, 0.012], [gb[0], gb[1], gb[2] + 0.02]);
  cable.member(M.copper, downPt(TOWER_Y0), [gb[0], gb[1] + 0.04, gb[2]], 0.009, 5);
  cable.member(M.copper, [gb[0], gb[1] - 0.04, gb[2]], [gb[0], TOWER.slabH, gb[2]], 0.009, 5);

  // --- antenas setoriais (painéis) nas faces O, N e S -----------------------------------------------------
  const sectors = new Batch();
  const sectorY = 27.0;
  const faces: Array<{ n: V3; t: V3 }> = [
    { n: [-1, 0, 0], t: [0, 0, 1] }, // oeste
    { n: [0, 0, -1], t: [1, 0, 0] }, // norte
    { n: [0, 0, 1], t: [1, 0, 0] }, // sul
  ];
  for (const { n, t } of faces) {
    const h = halfAt(sectorY);
    for (const tt of [-0.22, 0.22]) {
      const px = CX + n[0] * (h + 0.95) + t[0] * tt;
      const pz = CZ + n[2] * (h + 0.95) + t[2] * tt;
      const rotY = Math.atan2(n[0], n[2]);
      sectors.box(M.plasticWhite, [0.3, 1.45, 0.11], [px, sectorY, pz], [0, rotY, 0]);
      sectors.box(M.plasticWhite, [0.27, 0.05, 0.08], [px, sectorY + 0.75, pz], [0, rotY, 0]);
      // conectores inferiores e cabos de descida
      for (const o of [-0.07, 0.07]) {
        sectors.cyl(M.plastic, 0.016, 0.016, 0.1, [px + t[0] * o, sectorY - 0.78, pz + t[2] * o], 8);
      }
      // suportes tubulares verticais e braços até a torre
      const poleX = CX + n[0] * (h + 0.82) + t[0] * tt;
      const poleZ = CZ + n[2] * (h + 0.82) + t[2] * tt;
      sectors.member(M.galv, [poleX, sectorY - 1.0, poleZ], [poleX, sectorY + 1.0, poleZ], 0.028, 8);
      for (const dy of [-0.7, 0.7]) {
        const y = sectorY + dy;
        const hh = halfAt(y);
        sectors.member(
          M.galv,
          [CX + n[0] * hh + t[0] * tt, y, CZ + n[2] * hh + t[2] * tt],
          [poleX, y, poleZ],
          0.02,
          6,
        );
        // braçadeira
        sectors.box(M.steelDark, [0.1, 0.05, 0.1], [poleX - n[0] * 0.04, y, poleZ - n[2] * 0.04]);
      }
      cable.member(M.cableBlack, [px + t[0] * 0.07, sectorY - 0.83, pz + t[2] * 0.07], [px + t[0] * 0.07, sectorY - 1.5, pz + t[2] * 0.07], 0.011, 5);
    }
  }
  // jumpers dos setores até o topo da eletrocalha
  const top = trayPt(yTrayTop);
  cable.member(M.cableBlack, [top[0], top[1], top[2]], [CX - halfAt(sectorY) - 0.8, sectorY - 1.5, CZ + 0.15], 0.012, 5);
  cable.member(M.cableBlack, [top[0], top[1], top[2]], [CX + 0.15, sectorY - 1.5, CZ + halfAt(sectorY) + 0.8], 0.012, 5);

  // --- parábolas de micro-ondas (lado leste) -------------------------------------------------------------
  const dishes = new THREE.Group();
  dishes.name = 'dishes';
  const dishDefs = [
    { y: 24.6, r: 0.6, t: 0.28, az: -0.3 },
    { y: 20.8, r: 0.9, t: -0.3, az: 0.35 },
  ];
  for (const d of dishDefs) {
    const h = halfAt(d.y);
    const poleX = CX + h + 0.95;
    const poleZ = CZ + d.t;
    const pole = new Batch();
    pole.member(M.galv, [poleX, d.y - 0.9, poleZ], [poleX, d.y + 0.9, poleZ], 0.032, 8);
    for (const dy of [-0.65, 0.65]) {
      const y = d.y + dy;
      pole.member(M.galv, [CX + halfAt(y), y, poleZ], [poleX, y, poleZ], 0.022, 6);
      pole.box(M.steelDark, [0.12, 0.06, 0.12], [poleX, y, poleZ]);
    }
    group.add(pole.build(`dish-mount-${d.y}`));
    dishes.add(buildDish(M, d.r, new THREE.Vector3(poleX + 0.2, d.y, poleZ), d.az));
  }
  group.add(dishes);
  group.add(sectors.build('antennas'));

  // --- topo: para-raios e sinalizador de obstáculo ----------------------------------------------------------
  const topY = levelY(N);
  const rod = new Batch();
  rod.member(M.galv, [CX, topY, CZ], [CX, H + 1.3, CZ], 0.016, 6);
  rod.cyl(M.galv, 0.0, 0.02, 0.3, [CX, H + 1.45, CZ], 6);
  rod.cyl(M.steelDark, 0.03, 0.03, 0.06, [CX, H + 0.3, CZ], 8);
  // braço e sinalizador luminoso (lâmpada vermelha de obstáculo)
  rod.member(M.galv, [CX, topY - 0.05, CZ], [CX + 0.45, H + 0.2, CZ], 0.02, 6);
  rod.cyl(M.steelDark, 0.075, 0.075, 0.07, [CX + 0.45, H + 0.22, CZ], 10);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), M.beacon);
  beacon.position.set(CX + 0.45, H + 0.32, CZ);
  beacon.name = 'beacon';
  group.add(rod.build('rod'), beacon);

  group.add(s.build('tower-structure'), dark.build('tower-fittings'), concrete.build('tower-foundation'), cable.build('tower-cables'));
  // oclusão de contato nos pedestais sobre a laje
  for (let k = 0; k < 4; k++) {
    const [bx, , bz] = corner(k, TOWER_Y0);
    group.add(blob(M.blob, bx, bz, 1.5, 1.5, TOWER.slabH + 0.014, 0.6));
  }

  // --- colisão: pegada da torre (visitante não entra na treliça nem sobe) ---------------------------------------
  col.addBox(CX, CZ, 2 * baseHalf + 0.5, 2 * baseHalf + 0.5, 0, 31);

  return {
    group,
    beaconPos: new THREE.Vector3(CX + 0.45, H + 0.32, CZ),
    anchors: {
      sectors: new THREE.Vector3(CX, sectorY, CZ),
      dishes: new THREE.Vector3(CX + 1.5, 22.7, CZ),
      base: new THREE.Vector3(CX, 1.5, CZ),
    },
  };
}

/** Parábola: casca esférica parcial, aro, cubo traseiro, alimentador e hastes de suporte. */
function buildDish(M: Mats, a: number, pos: THREE.Vector3, az: number): THREE.Group {
  const g = new THREE.Group();
  const depth = a * 0.2; // flecha estimada (visual)
  const Rs = (a * a + depth * depth) / (2 * depth);
  const th = Math.asin(a / Rs);
  const shell = new THREE.SphereGeometry(Rs, 40, 10, 0, Math.PI * 2, 0, th);
  shell.rotateX(-Math.PI / 2);
  shell.translate(0, 0, Rs * Math.cos(th));
  const dishMat = M.plasticWhite.clone();
  dishMat.side = THREE.DoubleSide;
  const dish = new THREE.Mesh(shell, dishMat);
  dish.castShadow = true;
  dish.receiveShadow = true;
  g.add(dish);

  const b = new Batch();
  b.torus(M.galv, a, 0.018, [0, 0, 0], [0, 0, 0], 6, 40);
  b.cyl(M.steelDark, 0.09, 0.09, 0.14, [0, 0, -depth - 0.04], 12, [Math.PI / 2, 0, 0]);
  const feedZ = a * 0.7;
  b.cyl(M.plastic, 0.035, 0.045, 0.14, [0, 0, feedZ], 10, [Math.PI / 2, 0, 0]);
  b.member(M.plastic, [0, 0, -depth], [0, 0, feedZ - 0.06], 0.02, 6);
  for (let i = 0; i < 3; i++) {
    const ang = (i / 3) * Math.PI * 2 + 0.5;
    b.member(M.galv, [Math.cos(ang) * a, Math.sin(ang) * a, 0], [Math.cos(ang) * 0.03, Math.sin(ang) * 0.03, feedZ - 0.05], 0.009, 5);
  }
  // cabo do alimentador
  b.member(M.cableBlack, [0, 0.02, feedZ - 0.03], [0, -a * 0.9, -depth - 0.1], 0.008, 5);
  g.add(b.build('dish-parts'));

  g.position.copy(pos);
  // aponta para leste com giro de azimute: parâmetro apenas visual (a referência não dá azimutes)
  g.lookAt(pos.x + Math.cos(az) * 10, pos.y - 0.2, pos.z + Math.sin(az) * 10);
  return g;
}
