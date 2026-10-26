import * as THREE from 'three';
import { SHELTER, SHELTER_DOOR, SHELTER_INTERIOR, SHELTER_WALL, TRAY } from '../config';
import type { CollisionWorld } from '../controls/collision';
import { Batch, blob } from './batch';
import { buildShelterInterior } from './shelterInterior';
import type { Mats } from './materials';
import { TILE } from './materials';

export interface ShelterDoor {
  group: THREE.Group;
  /** 0 = fechada, 1 = aberta */
  progress: number;
  target: number;
  update(dt: number): void;
  toggle(): boolean;
  readonly center: THREE.Vector3;
}

export interface ShelterBuild {
  group: THREE.Group;
  /** posições das luminárias externas (para as luzes do modo noturno) */
  lamps: THREE.Vector3[];
  door: ShelterDoor;
  /** luzes do interior, acesas com a porta aberta */
  interiorLights: THREE.PointLight[];
  /** partes ocultadas no corte do abrigo: cobertura e forro com luminárias */
  cutaway: THREE.Object3D[];
}

const P = SHELTER.plinth;
const T = SHELTER_WALL;

/** Batente, placa de aviso e dobradiças fixas da porta na face sul (+Z). */
function doorFrame(b: Batch, M: Mats, x: number, zf: number, w: number, h: number) {
  const y0 = P;
  b.box(M.galvDull, [w + 0.12, 0.06, 0.07], [x, y0 + h + 0.03, zf + 0.035]);
  b.box(M.galvDull, [0.06, h, 0.07], [x - w / 2 - 0.03, y0 + h / 2, zf + 0.035]);
  b.box(M.galvDull, [0.06, h, 0.07], [x + w / 2 + 0.03, y0 + h / 2, zf + 0.035]);
  // placa de aviso de risco elétrico ao lado da porta
  b.box(M.warning, [0.14, 0.18, 0.006], [x + w / 2 + 0.3, y0 + 1.55, zf + 0.004]);
  b.box(M.steelDark, [0.06, 0.07, 0.007], [x + w / 2 + 0.3, y0 + 1.57, zf + 0.008]);
}

/**
 * Folha da porta: vedação de borracha em moldura, nervura, veneziana, maçaneta e dobradiças.
 * `cx` é o centro da folha em X; `zf` a face da parede. Serve tanto para a porta fixa do
 * anexo quanto para a folha articulada (coordenadas locais com o pivô na origem).
 */
function doorLeaf(b: Batch, M: Mats, cx: number, zf: number, w: number, h: number, louverH: number) {
  const y0 = P;
  // vedação de borracha: só o perímetro, para não tapar o vão quando a porta abre
  b.box(M.rubber, [w + 0.02, 0.014, 0.012], [cx, y0 + h - 0.005, zf + 0.02]);
  b.box(M.rubber, [0.014, h - 0.01, 0.012], [cx - w / 2 - 0.005, y0 + (h - 0.01) / 2, zf + 0.02]);
  b.box(M.rubber, [0.014, h - 0.01, 0.012], [cx + w / 2 + 0.005, y0 + (h - 0.01) / 2, zf + 0.02]);
  b.box(M.doorGray, [w, h - 0.02, 0.04], [cx, y0 + (h - 0.02) / 2, zf + 0.045]);
  b.box(M.paintedGray, [w - 0.16, h - 0.4, 0.012], [cx, y0 + h / 2 + 0.1, zf + 0.072]);
  const slats = Math.floor(louverH / 0.06);
  for (let i = 0; i < slats; i++) {
    b.box(M.paintedGray, [w - 0.2, 0.035, 0.03], [cx, y0 + 0.2 + i * 0.06, zf + 0.085], [-0.5, 0, 0]);
  }
  const hx = cx + w / 2 - 0.12;
  b.box(M.steelDark, [0.04, 0.16, 0.035], [hx, y0 + h * 0.48, zf + 0.09]);
  b.cyl(M.galv, 0.025, 0.025, 0.02, [hx, y0 + h * 0.48 + 0.2, zf + 0.075], 10, [Math.PI / 2, 0, 0]);
  for (const hy of [0.3, h / 2, h - 0.3]) {
    b.cyl(M.steelDark, 0.016, 0.016, 0.14, [cx - w / 2, y0 + hy, zf + 0.085], 8);
  }
}

function acUnit(b: Batch, M: Mats, x: number, y: number, zf: number) {
  // unidade de climatização de parede: carcaça, grelha com ventilador e suportes
  b.box(M.plasticWhite, [0.9, 0.56, 0.3], [x, y, zf + 0.21]);
  b.box(M.galvDull, [0.78, 0.44, 0.02], [x, y, zf + 0.365]);
  for (let i = -3; i <= 3; i++) b.box(M.steelDark, [0.78, 0.012, 0.014], [x, y + i * 0.06, zf + 0.375]);
  b.torus(M.steelDark, 0.17, 0.012, [x - 0.12, y, zf + 0.376], [0, 0, 0], 5, 24);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    b.box(M.steelDark, [0.15, 0.03, 0.006], [x - 0.12 + Math.cos(a) * 0.08, y + Math.sin(a) * 0.08, zf + 0.372], [0, 0, a]);
  }
  b.box(M.galv, [0.02, 0.5, 0.08], [x + 0.32, y, zf + 0.35]);
  for (const sx of [-0.32, 0.32]) b.bar(M.steelDark, [x + sx, y - 0.2, zf + 0.04], [x + sx, y - 0.2, zf + 0.07], 0.05, 0.04);
  // tubo de dreno
  b.member(M.plastic, [x + 0.36, y - 0.22, zf + 0.2], [x + 0.36, y - 1.0, zf + 0.2], 0.014, 6);
}

export function buildShelter(M: Mats, col: CollisionWorld): ShelterBuild {
  const group = new THREE.Group();
  group.name = 'shelter';
  const b = new Batch();
  const { x0, x1, z0, z1, h } = SHELTER;
  const w = x1 - x0;
  const d = z1 - z0;
  const cxm = (x0 + x1) / 2;
  const czm = (z0 + z1) / 2;
  const I = SHELTER_INTERIOR;
  const dw = SHELTER_DOOR.w;
  const dh = SHELTER_DOOR.h;
  const dl = SHELTER_DOOR.x - dw / 2; // borda esquerda do vão
  const dr = SHELTER_DOOR.x + dw / 2;

  // --- paredes ocas: o interior é visitável. Espessura total de 0,2 m, aparência externa igual. ---
  const wallBox = (ax0: number, ax1: number, az0: number, az1: number, y0: number, y1: number) => {
    b.box(M.shelterWall, [ax1 - ax0, y1 - y0, az1 - az0], [(ax0 + ax1) / 2, (y0 + y1) / 2, (az0 + az1) / 2], [0, 0, 0], 1.8);
  };
  wallBox(x0, x1, z0, z0 + T, P, P + h); // norte
  wallBox(x0, x0 + T, z0 + T, z1 - T, P, P + h); // oeste
  wallBox(x1 - T, x1, z0 + T, z1 - T, P, P + h); // leste
  wallBox(x0, dl, z1 - T, z1, P, P + h); // sul, à esquerda da porta
  wallBox(dr, x1, z1 - T, z1, P, P + h); // sul, à direita da porta
  wallBox(dl, dr, z1 - T, z1, P + dh, P + h); // verga sobre a porta

  // revestimento interno (tinta clara) um pouco à frente do reboco
  const L = 0.012;
  const lin = (ax0: number, ax1: number, az0: number, az1: number, y0: number, y1: number) => {
    b.box(M.interiorWall, [ax1 - ax0, y1 - y0, az1 - az0], [(ax0 + ax1) / 2, (y0 + y1) / 2, (az0 + az1) / 2]);
  };
  lin(I.x0, I.x1, I.z0, I.z0 + L, I.floor, I.ceiling); // norte
  lin(I.x0, I.x0 + L, I.z0, I.z1, I.floor, I.ceiling); // oeste
  lin(I.x1 - L, I.x1, I.z0, I.z1, I.floor, I.ceiling); // leste
  lin(I.x0, dl, I.z1 - L, I.z1, I.floor, I.ceiling); // sul, à esquerda
  lin(dr, I.x1, I.z1 - L, I.z1, I.floor, I.ceiling); // sul, à direita
  lin(dl, dr, I.z1 - L, I.z1, P + dh, I.ceiling); // sobre a porta
  // faces do vão (ombreiras) e rodapé interno
  lin(dl - 0.001, dl, z1 - T, z1, I.floor, P + dh);
  lin(dr, dr + 0.001, z1 - T, z1, I.floor, P + dh);
  b.box(M.cabinetTrim, [I.x1 - I.x0, 0.1, 0.014], [(I.x0 + I.x1) / 2, I.floor + 0.05, I.z0 + L + 0.007]);
  b.box(M.cabinetTrim, [0.014, 0.1, I.z1 - I.z0], [I.x0 + L + 0.007, I.floor + 0.05, (I.z0 + I.z1) / 2]);
  b.box(M.cabinetTrim, [0.014, 0.1, I.z1 - I.z0], [I.x1 - L - 0.007, I.floor + 0.05, (I.z0 + I.z1) / 2]);

  // rodapé de concreto por fora, interrompido na porta
  const sk = 0.3;
  const skirt = (ax0: number, ax1: number, az0: number, az1: number) => {
    b.box(M.concrete, [ax1 - ax0, sk, az1 - az0], [(ax0 + ax1) / 2, P + sk / 2, (az0 + az1) / 2], [0, 0, 0], TILE.concrete);
  };
  skirt(x0 - 0.02, x1 + 0.02, z0 - 0.02, z0);
  skirt(x0 - 0.02, x0, z0, z1);
  skirt(x1, x1 + 0.02, z0, z1);
  skirt(x0 - 0.02, dl - 0.06, z1, z1 + 0.02);
  skirt(dr + 0.06, x1 + 0.02, z1, z1 + 0.02);

  // laje de cobertura com beiral e pingadeira
  // (grupo próprio: some no "corte do abrigo" da inspeção técnica para mostrar o interior)
  const roofY = P + h;
  const rb = new Batch();
  rb.box(M.shelterRoof, [w + 0.22, 0.14, d + 0.22], [cxm, roofY + 0.07, czm], [0, 0, 0], TILE.concrete);
  rb.box(M.galvDull, [w + 0.24, 0.03, 0.03], [cxm, roofY + 0.015, z1 + 0.12]);
  // platibanda baixa
  rb.box(M.shelterRoof, [w + 0.22, 0.1, 0.07], [cxm, roofY + 0.19, z0 - 0.07]);
  rb.box(M.shelterRoof, [0.07, 0.1, d + 0.22], [x0 - 0.07, roofY + 0.19, czm]);
  rb.box(M.shelterRoof, [0.07, 0.1, d + 0.22], [x1 + 0.07, roofY + 0.19, czm]);
  const roofGroup = rb.build('shelter-roof');
  group.add(roofGroup);
  // tubo de descida de água pluvial no canto leste
  b.member(M.plastic, [x1 + 0.03, roofY + 0.05, z1 + 0.03], [x1 + 0.03, 0.15, z1 + 0.03], 0.03, 8);

  // anexo mais baixo, à esquerda (maciço: sem acesso na primeira versão do interior)
  const { annexX0: ax0, annexZ0: az0, annexZ1: az1, annexH: ah } = SHELTER;
  b.box(M.shelterWall, [x0 - ax0, ah, az1 - az0], [(ax0 + x0) / 2, P + ah / 2, (az0 + az1) / 2], [0, 0, 0], 1.8);
  b.box(M.concrete, [x0 - ax0 + 0.04, 0.3, az1 - az0 + 0.04], [(ax0 + x0) / 2, P + 0.15, (az0 + az1) / 2], [0, 0, 0], TILE.concrete);
  b.box(M.shelterRoof, [x0 - ax0 + 0.2, 0.12, az1 - az0 + 0.2], [(ax0 + x0) / 2 - 0.02, P + ah + 0.06, (az0 + az1) / 2], [0, 0, 0], TILE.concrete);

  // portas: a do anexo é fixa; a principal tem batente fixo e folha articulada
  doorFrame(b, M, SHELTER_DOOR.x, z1, dw, dh);
  doorFrame(b, M, -5.65, az1, 0.85, 2.0);
  doorLeaf(b, M, -5.65, az1, 0.85, 2.0, 0.5);

  // grelha de ventilação do volume principal
  const vx = -3.9;
  const vy = P + 0.95;
  b.box(M.galvDull, [0.64, 0.84, 0.03], [vx, vy, z1 + 0.015]);
  for (let i = 0; i < 11; i++) b.box(M.paintedGray, [0.56, 0.035, 0.04], [vx, vy - 0.36 + i * 0.072, z1 + 0.04], [-0.55, 0, 0]);

  // unidade de ar-condicionado de parede
  acUnit(b, M, -2.45, P + 1.85, z1);

  // quadro de medição/proteção na empena leste e eletroduto
  const qz = -1.7;
  b.box(M.cabinetTrim, [0.16, 0.5, 0.4], [x1 + 0.08, P + 1.4, qz]);
  b.box(M.glass, [0.012, 0.14, 0.2], [x1 + 0.166, P + 1.52, qz]);
  b.box(M.steelDark, [0.012, 0.03, 0.05], [x1 + 0.166, P + 1.3, qz + 0.12]);
  b.member(M.galv, [x1 + 0.05, P + 1.15, qz], [x1 + 0.05, 0.12, qz], 0.016, 6);

  // luminárias externas
  const lamps: THREE.Vector3[] = [];
  const lampB = new Batch();
  const addLamp = (x: number, y: number, z: number, nx: number, nz: number) => {
    b.box(M.steelDark, [0.16, 0.1, 0.06], [x, y, z]);
    lampB.box(M.lampOff, [0.14, 0.08, 0.14], [x + nx * 0.07, y - 0.02, z + nz * 0.07]);
    b.box(M.steelDark, [0.18, 0.02, 0.18], [x + nx * 0.07, y + 0.05, z + nz * 0.07]);
    lamps.push(new THREE.Vector3(x + nx * 0.25, y - 0.1, z + nz * 0.25));
  };
  addLamp(SHELTER_DOOR.x, P + 2.55, z1 + 0.04, 0, 1);
  addLamp(-5.65, P + 2.3, az1 + 0.04, 0, 1);
  addLamp(x1 + 0.04, P + 2.4, -1.7, 1, 0);

  group.add(b.build('shelter-body'));
  group.add(lampB.build('lamps', false, false));

  // --- porta principal articulada: pivô na dobradiça (borda esquerda), abre para fora ---
  const doorGroup = new THREE.Group();
  doorGroup.name = 'shelter-door';
  const lb = new Batch();
  doorLeaf(lb, M, dw / 2, 0, dw, dh, 0.5);
  const leaf = lb.build('shelter-door-leaf');
  doorGroup.add(leaf);
  doorGroup.position.set(dl, 0, z1);
  group.add(doorGroup);

  const closedBoxes = [{ minX: dl, maxX: dr, minZ: z1 - T, maxZ: z1 + 0.06, minY: -1, maxY: 3.2 }];
  const openBoxes = [{ minX: dl - 0.04, maxX: dl + 0.04, minZ: z1, maxZ: z1 + dw, minY: -1, maxY: 3.2 }];
  col.setDynamic('shelterDoor', closedBoxes);
  const maxAngle = 1.75;
  const door: ShelterDoor = {
    group: doorGroup,
    progress: 0,
    target: 0,
    center: new THREE.Vector3(SHELTER_DOOR.x, 1.2, z1),
    update(dt: number) {
      if (this.progress === this.target) return;
      const dir = Math.sign(this.target - this.progress);
      this.progress = THREE.MathUtils.clamp(this.progress + dir * dt * 0.9, 0, 1);
      if ((dir > 0 && this.progress > this.target) || (dir < 0 && this.progress < this.target)) this.progress = this.target;
      const k = this.progress * this.progress * (3 - 2 * this.progress);
      doorGroup.rotation.y = -k * maxAngle; // ângulo negativo: a folha gira para o lado +Z (fora)
      col.setDynamic('shelterDoor', this.progress >= 1 ? openBoxes : closedBoxes);
    },
    toggle() {
      this.target = this.target > 0.5 ? 0 : 1;
      return this.target === 1;
    },
  };

  // --- interior (racks, baterias, quadro, climatização, esteira, aterramento) ---
  const interior = buildShelterInterior(M, col);
  group.add(interior.group);

  // sombras de contato junto ao rodapé
  group.add(blob(M.blob, cxm, z1 + 0.2, w + 1.0, 1.0, 0.215, 0.6));

  // colisões das paredes; o vão da porta fica livre (porta é o obstáculo dinâmico)
  col.addRect(x0, x1, z0, z0 + T, 0, 3.3);
  col.addRect(x0, x0 + T, z0, z1, 0, 3.3);
  col.addRect(x1 - T, x1, z0, z1, 0, 3.3);
  col.addRect(x0, dl, z1 - T, z1, 0, 3.3);
  col.addRect(dr, x1, z1 - T, z1, 0, 3.3);
  col.addRect(ax0 - 0.1, x0 + 0.05, az0 - 0.1, az1 + 0.1, 0, 3.0);
  // coluna da esteira (descida) na parede sul
  col.addRect(TRAY.riserX - 0.22, TRAY.riserX + 0.22, z1, z1 + 0.28, 0, 3.4);
  // piso interno: um degrau acima da soleira
  col.addGround(I.x0, I.x1, I.z0, I.z1, I.floor);
  return { group, lamps, door, interiorLights: interior.lights, cutaway: [roofGroup, ...interior.ceiling] };
}
