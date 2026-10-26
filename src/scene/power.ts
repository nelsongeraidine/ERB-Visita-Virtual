import * as THREE from 'three';
import { POWER } from '../config';
import type { CollisionWorld } from '../controls/collision';
import { Batch, blob } from './batch';
import type { Mats } from './materials';

export interface PowerBuild {
  meter: THREE.Group;
  transformer: THREE.Group;
  generator: THREE.Group;
}

export function buildPower(M: Mats, col: CollisionWorld): PowerBuild {
  return {
    meter: buildMeter(M, col),
    transformer: buildTransformer(M, col),
    generator: buildGenerator(M, col),
  };
}

function buildMeter(M: Mats, col: CollisionWorld): THREE.Group {
  const { x, z } = POWER.meter;
  const b = new Batch();
  const padTop = 0.05;
  // dois pilaretes de sustentação e duas caixas voltadas para o interior (norte)
  for (const px of [x - 0.55, x + 0.55]) b.cyl(M.galv, 0.035, 0.035, 1.95, [px, padTop + 0.975, z + 0.12], 8);
  b.box(M.galv, [1.3, 0.04, 0.05], [x, padTop + 1.0, z + 0.08]);
  b.box(M.galv, [1.3, 0.04, 0.05], [x, padTop + 1.75, z + 0.08]);
  for (const bx of [x - 0.27, x + 0.27]) {
    b.box(M.cabinetTrim, [0.46, 0.64, 0.2], [bx, padTop + 1.38, z]);
    b.box(M.cabinet, [0.4, 0.58, 0.02], [bx, padTop + 1.38, z - 0.11]);
    b.box(M.glass, [0.22, 0.18, 0.012], [bx, padTop + 1.5, z - 0.125]);
    b.box(M.steelDark, [0.03, 0.12, 0.03], [bx + 0.15, padTop + 1.3, z - 0.13]);
    b.box(M.galvDull, [0.5, 0.025, 0.26], [bx, padTop + 1.72, z - 0.04]); // aba contra chuva
    b.member(M.galv, [bx, padTop + 1.06, z], [bx, padTop, z], 0.017, 6); // eletroduto de descida
  }
  const g = b.build('meter');
  g.add(blob(M.blob, x, z - 0.1, 1.6, 0.8, padTop + 0.012, 0.5));
  col.addRect(x - 0.7, x + 0.7, z - 0.18, z + 0.2, 0, 2.0);
  return g;
}

function buildTransformer(M: Mats, col: CollisionWorld): THREE.Group {
  const { x, z } = POWER.transformer;
  const base = 0.12;
  const b = new Batch();
  const bw = 0.9;
  const bd = 1.2;
  const bh = 1.15;
  // cuba e tampa
  b.box(M.steelDark, [bw + 0.06, 0.1, bd + 0.06], [x, base + 0.05, z]);
  b.box(M.transformer, [bw, bh, bd], [x, base + 0.1 + bh / 2, z]);
  b.box(M.cabinetTrim, [bw + 0.06, 0.06, bd + 0.06], [x, base + 0.1 + bh + 0.03, z]);
  const topY = base + 0.1 + bh + 0.06;
  // aletas de resfriamento nas laterais maiores
  for (const side of [-1, 1]) {
    for (let i = 0; i < 7; i++) {
      b.box(M.transformer, [0.7, bh - 0.18, 0.015], [x, base + 0.1 + bh / 2, z + side * (bd / 2 + 0.03 + i * 0.03)]);
    }
  }
  // três buchas de alta tensão com saias isolantes
  for (const bz of [-0.34, 0, 0.34]) {
    b.cyl(M.ceramic, 0.04, 0.05, 0.3, [x - 0.12, topY + 0.15, z + bz], 10);
    for (let i = 0; i < 4; i++) b.cyl(M.ceramic, 0.07, 0.07, 0.015, [x - 0.12, topY + 0.07 + i * 0.065, z + bz], 12);
    b.cyl(M.galv, 0.02, 0.02, 0.06, [x - 0.12, topY + 0.33, z + bz], 8);
  }
  // terminais de baixa tensão
  for (const bz of [-0.3, -0.1, 0.1, 0.3]) b.cyl(M.copper, 0.018, 0.018, 0.12, [x + 0.2, topY + 0.06, z + bz], 8);
  // placa de identificação e aviso
  b.box(M.galvDull, [0.012, 0.18, 0.28], [x + bw / 2 + 0.008, base + 0.1 + 0.8, z]);
  b.box(M.warning, [0.01, 0.16, 0.16], [x - bw / 2 - 0.006, base + 0.1 + 0.85, z - 0.3]);
  // eletroduto de entrada
  b.member(M.galv, [x - 0.1, base + 0.1, z + bd / 2 + 0.0], [x - 0.1, 0.0, z + bd / 2 + 0.15], 0.03, 8);

  const g = b.build('transformer');
  g.add(blob(M.blob, x, z, bw + 1.1, bd + 1.0, base + 0.012, 0.5));
  col.addRect(x - bw / 2 - 0.05, x + bw / 2 + 0.05, z - bd / 2 - 0.3, z + bd / 2 + 0.3, 0, 2.0);
  return g;
}

function buildGenerator(M: Mats, col: CollisionWorld): THREE.Group {
  const { x, z } = POWER.generator;
  const base = 0.1;
  const b = new Batch();
  const gw = 1.9;
  const gd = 0.85;
  const gh = 1.25;
  const y0 = base + 0.18;
  // skid/tanque de base
  b.box(M.steelDark, [gw + 0.12, 0.18, gd + 0.12], [x, base + 0.09, z]);
  // carenagem
  b.box(M.generator, [gw, gh, gd], [x, y0 + gh / 2, z]);
  b.box(M.generator, [gw + 0.06, 0.04, gd + 0.06], [x, y0 + gh + 0.02, z]);
  // portas de manutenção na frente (norte)
  const fz = z - gd / 2;
  for (let i = 0; i < 3; i++) {
    const px = x - gw / 2 + 0.33 + i * 0.62;
    b.box(M.paintedGray, [0.56, gh - 0.2, 0.012], [px, y0 + gh / 2, fz - 0.006]);
    b.box(M.steelDark, [0.03, 0.12, 0.025], [px + 0.2, y0 + gh / 2, fz - 0.02]);
    for (let k = 0; k < 6; k++) b.box(M.steelDark, [0.4, 0.025, 0.02], [px - 0.02, y0 + 0.2 + k * 0.045, fz - 0.016], [-0.5, 0, 0]);
  }
  // painel de comando com visor
  b.box(M.steelDark, [0.3, 0.2, 0.025], [x - gw / 2 + 0.33, y0 + gh - 0.28, fz - 0.03]);
  b.box(M.glass, [0.22, 0.1, 0.01], [x - gw / 2 + 0.33, y0 + gh - 0.26, fz - 0.045]);
  // grade do radiador/ventilador na extremidade leste
  const ex = x + gw / 2;
  b.box(M.steelDark, [0.04, gh - 0.2, gd - 0.2], [ex + 0.02, y0 + gh / 2, z]);
  b.torus(M.galv, 0.3, 0.014, [ex + 0.05, y0 + gh / 2, z], [0, Math.PI / 2, 0], 5, 28);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    b.box(M.galv, [0.012, 0.3, 0.018], [ex + 0.05, y0 + gh / 2 + Math.sin(a) * 0.15, z + Math.cos(a) * 0.15], [a, 0, 0]);
  }
  // escapamento: silencioso sobre a cobertura e saída vertical
  b.cyl(M.steelDark, 0.12, 0.12, 0.7, [x + 0.3, y0 + gh + 0.17, z], 14, [0, 0, Math.PI / 2]);
  b.member(M.steelDark, [x + 0.65, y0 + gh + 0.17, z], [x + 0.65, y0 + gh + 0.75, z], 0.05, 10);
  b.cyl(M.steelDark, 0.075, 0.075, 0.03, [x + 0.65, y0 + gh + 0.77, z], 10);
  // olhais de içamento e eletroduto de saída de força
  for (const sx of [-0.8, 0.8]) b.torus(M.galv, 0.05, 0.011, [x + sx, y0 + gh + 0.08, z], [0, 0, 0], 5, 12);
  b.member(M.galv, [x - 0.6, base + 0.0, z + gd / 2 + 0.2], [x - 0.6, y0 + 0.1, z + gd / 2 - 0.05], 0.03, 8);

  const g = b.build('generator');
  g.add(blob(M.blob, x, z, gw + 1.0, gd + 0.9, base + 0.012, 0.5));
  col.addRect(x - gw / 2 - 0.12, x + gw / 2 + 0.2, z - gd / 2 - 0.1, z + gd / 2 + 0.25, 0, 2.2);
  return g;
}
