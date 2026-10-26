import * as THREE from 'three';
import { CABINETS } from '../config';
import type { CollisionWorld } from '../controls/collision';
import { Batch, blob } from './batch';
import type { Mats } from './materials';

const BASE = 0.1; // topo da laje dos armários
const PL = 0.12; // altura do embasamento metálico

interface CabDef {
  cx: number;
  w: number;
  double: boolean;
  ac: boolean;
}

const DEFS: CabDef[] = [
  { cx: -3.5, w: 0.9, double: false, ac: true },
  { cx: -2.55, w: 0.9, double: false, ac: true },
  { cx: -1.4, w: 1.3, double: true, ac: false },
];

function louver(b: Batch, M: Mats, x: number, y: number, z: number, w: number, n: number, dir: 1 | -1) {
  for (let i = 0; i < n; i++) {
    b.box(M.cabinetTrim, [w, 0.03, 0.03], [x, y + i * 0.055, z + dir * 0.015], [dir * 0.5, 0, 0]);
  }
}

export function buildCabinets(M: Mats, col: CollisionWorld): { group: THREE.Group; ac: THREE.Group } {
  const group = new THREE.Group();
  group.name = 'cabinets';
  const b = new Batch();
  const acB = new Batch();
  const { z, depth: d, h } = CABINETS;
  const frontZ = z - d / 2; // portas voltadas para o corredor (norte)
  const backZ = z + d / 2;

  for (const c of DEFS) {
    const bodyY = BASE + PL + h / 2;
    b.box(M.steelDark, [c.w + 0.05, PL, d + 0.05], [c.cx, BASE + PL / 2, z]);
    b.box(M.cabinet, [c.w, h, d], [c.cx, bodyY, z]);
    // cobertura com abas
    b.box(M.cabinetTrim, [c.w + 0.07, 0.05, d + 0.07], [c.cx, BASE + PL + h + 0.025, z]);
    b.box(M.cabinetTrim, [c.w + 0.07, 0.03, 0.03], [c.cx, BASE + PL + h - 0.01, frontZ - 0.04]);

    // portas (folha única ou dupla) com frisos
    const leaves = c.double ? 2 : 1;
    const lw = (c.w - 0.1) / leaves;
    for (let i = 0; i < leaves; i++) {
      const lx = c.cx - c.w / 2 + 0.05 + lw * (i + 0.5);
      b.box(M.cabinet, [lw - 0.012, h - 0.12, 0.03], [lx, bodyY, frontZ - 0.015]);
      b.box(M.cabinetTrim, [lw - 0.1, h - 0.34, 0.01], [lx, bodyY + 0.05, frontZ - 0.034]);
      // dobradiças
      const hx = i === 0 ? c.cx - c.w / 2 + 0.03 : c.cx + c.w / 2 - 0.03;
      for (const hy of [0.25, h / 2, h - 0.35]) b.cyl(M.steelDark, 0.014, 0.014, 0.1, [hx, BASE + PL + hy, frontZ - 0.02], 8);
      // etiqueta de identificação e vedação superior
      b.box(M.plasticWhite, [0.16, 0.07, 0.004], [lx - lw * 0.18, BASE + PL + h - 0.28, frontZ - 0.038]);
      b.box(M.rubber, [lw - 0.02, 0.012, 0.012], [lx, BASE + PL + h - 0.07, frontZ - 0.03]);
      // puxador e fechadura
      const px = c.double ? c.cx + (i === 0 ? 0.06 : -0.06) : c.cx + c.w / 2 - 0.12;
      b.box(M.steelDark, [0.03, 0.22, 0.03], [px, bodyY + 0.02, frontZ - 0.05]);
      b.cyl(M.galv, 0.02, 0.02, 0.015, [px, bodyY + 0.2, frontZ - 0.04], 10, [Math.PI / 2, 0, 0]);
    }
    // grelhas de ventilação inferiores nas portas
    louver(b, M, c.cx, BASE + PL + 0.25, frontZ - 0.034, c.w - 0.3, 6, -1);

    // entradas de cabo (eletrodutos) na base lateral
    b.member(M.galv, [c.cx + c.w / 4, BASE + PL, backZ + 0.0], [c.cx + c.w / 4, BASE, backZ + 0.18], 0.02, 6);

    // unidade de climatização integrada na face posterior
    if (c.ac) {
      const ay = BASE + PL + h * 0.62;
      acB.box(M.plasticWhite, [0.72, 0.58, 0.22], [c.cx, ay, backZ + 0.11]);
      acB.box(M.galvDull, [0.62, 0.48, 0.02], [c.cx, ay, backZ + 0.225]);
      for (let i = -3; i <= 3; i++) acB.box(M.steelDark, [0.62, 0.012, 0.014], [c.cx, ay + i * 0.065, backZ + 0.236]);
      acB.torus(M.steelDark, 0.17, 0.012, [c.cx, ay, backZ + 0.238], [0, 0, 0], 5, 24);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + 0.3;
        acB.box(M.steelDark, [0.14, 0.03, 0.006], [c.cx + Math.cos(a) * 0.08, ay + Math.sin(a) * 0.08, backZ + 0.234], [0, 0, a]);
      }
    }
    col.addRect(c.cx - c.w / 2 - 0.03, c.cx + c.w / 2 + 0.03, frontZ - 0.06, c.ac ? backZ + 0.26 : backZ + 0.03, 0, h + 0.3);
  }

  group.add(b.build('cabinet-bodies'));
  const ac = acB.build('cabinet-ac');
  group.add(ac);
  group.add(blob(M.blob, -2.4, z, 4.8, 1.8, BASE + 0.012, 0.55));
  return { group, ac };
}
