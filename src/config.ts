// Layout da estação. 1 unidade = 1 metro. Eixos: +X leste, +Z sul (frente), +Y para cima.
//
// ATENÇÃO: nenhuma dimensão abaixo vem de cota confirmada. A única medida legível na
// referência é "torre de 30 m" e o espaçamento de ~2000 mm entre postes da cerca. O
// restante é ESTIMATIVA VISUAL obtida da posição relativa na imagem isométrica
// (ver PRD.md, seção 6). Mantê-las aqui, num só lugar, facilita corrigir com cotas reais.

export const SITE = {
  halfX: 8, // terreno ~16 m (estimativa)
  halfZ: 5.5, // terreno ~11 m (estimativa)
  curbWidth: 0.3,
  curbHeight: 0.22,
  fenceHeight: 2.4,
};

// Portão na face oeste (x = -halfX), duas folhas.
export const GATE = {
  z0: 0.0,
  z1: 3.2,
  height: 2.15,
};

export const TOWER = {
  x: 4.5,
  z: -1.9,
  height: 30, // dado legível na referência
  baseHalf: 1.5, // estimativa
  topHalf: 0.45, // estimativa
  panels: 10,
  slabH: 0.25,
};

export const SHELTER = {
  // volume principal
  x0: -5.0,
  x1: -0.2,
  z0: -3.0,
  z1: -0.4,
  h: 2.8,
  // anexo mais baixo à esquerda
  annexX0: -6.3,
  annexZ0: -3.0,
  annexZ1: -0.8,
  annexH: 2.4,
  plinth: 0.2,
};

/** Espessura das paredes do abrigo (estimativa) e porta principal na face sul. */
export const SHELTER_WALL = 0.2;
export const SHELTER_DOOR = { x: -1.15, w: 0.95, h: 2.1 };

/** Vão interno livre do volume principal (acessível pela porta sul). */
export const SHELTER_INTERIOR = {
  x0: SHELTER.x0 + SHELTER_WALL,
  x1: SHELTER.x1 - SHELTER_WALL,
  z0: SHELTER.z0 + SHELTER_WALL,
  z1: SHELTER.z1 - SHELTER_WALL,
  floor: SHELTER.plinth + 0.04,
  ceiling: SHELTER.plinth + SHELTER.h - 0.15,
};

export const CABINETS = {
  z: 3.5,
  depth: 0.8,
  h: 1.9,
};

export const TRAY = {
  riserX: -4.7,
  z: -0.27, // face externa (sul) do abrigo
  y: 3.35, // cota do trecho horizontal
  endX: 2.95,
};

export const POWER = {
  meter: { x: -6.9, z: 5.0 },
  transformer: { x: 7.1, z: -1.9 },
  generator: { x: 6.4, z: 4.0 },
};

export interface Slab {
  id: string;
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  h: number;
}

// Lajes e faixas de concreto. Não se sobrepõem, para evitar z-fighting entre topos.
export const SLABS: Slab[] = [
  { id: 'apron', x0: -10.5, x1: -8.3, z0: 0.0, z1: 3.2, h: 0.05 },
  { id: 'gatePad', x0: -8.3, x1: -4.6, z0: 0.0, z1: 3.2, h: 0.05 },
  { id: 'walkway', x0: -4.6, x1: 3.6, z0: 0.2, z1: 1.8, h: 0.05 },
  { id: 'cabinetSlab', x0: -4.6, x1: -0.2, z0: 1.8, z1: 4.6, h: 0.1 },
  { id: 'shelterSlab', x0: -6.5, x1: 0.0, z0: -3.2, z1: -0.2, h: SHELTER.plinth },
  // patamar diante da porta: calçada (0,05) → patamar (0,12) → soleira (0,20) → piso (0,24)
  { id: 'doorStep', x0: -2.1, x1: -0.2, z0: -0.2, z1: 0.45, h: 0.12 },
  { id: 'towerSlab', x0: 2.4, x1: 6.6, z0: -4.0, z1: 0.2, h: TOWER.slabH },
  { id: 'transformerPad', x0: 6.6, x1: 7.8, z0: -2.95, z1: -0.85, h: 0.12 },
  { id: 'generatorPad', x0: 5.4, x1: 7.4, z0: 3.3, z1: 4.7, h: 0.1 },
  { id: 'meterPad', x0: -7.5, x1: -6.3, z0: 4.5, z1: 5.4, h: 0.05 },
];

// Vista inicial da visita: do lado de fora, diante do portão, olhando para leste.
export const START = {
  position: [-12.5, 1.65, 1.6] as [number, number, number],
  yaw: -Math.PI / 2, // olhando para +X
};

export const EYE_HEIGHT = 1.65;
export const PLAYER_RADIUS = 0.3;
export const PLAYER_HEIGHT = 1.8;
