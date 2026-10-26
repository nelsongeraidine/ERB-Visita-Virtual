import * as THREE from 'three';
import {
  blobTexture,
  brushedRoughness,
  chainLinkTexture,
  concreteTextures,
  gravelTextures,
  soilTextures,
  stuccoTexture,
} from './textures';

// Tamanho (m) de uma repetição das texturas tileáveis.
export const TILE = { concrete: 2.0, gravel: 1.2, soil: 70, soilDetail: 3, chain: 0.065 };
export const GROUND_RADIUS = 1400;

function std(color: number, rough: number, metal: number, extra: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
}

export function createMaterials() {
  const conc = concreteTextures();
  const concJ = concreteTextures(true);
  const grav = gravelTextures();
  const stucco = stuccoTexture();
  const brushed = brushedRoughness();

  grav.map.repeat.set(16.6 / TILE.gravel, 11.6 / TILE.gravel);
  grav.bump.repeat.copy(grav.map.repeat);

  const soil = soilTextures();
  const soilRepeat = (2 * GROUND_RADIUS) / TILE.soil;
  soil.map.repeat.set(soilRepeat, soilRepeat);
  const detailRepeat = (2 * GROUND_RADIUS) / TILE.soilDetail;
  soil.bump.repeat.set(detailRepeat, detailRepeat);

  const chain = chainLinkTexture();

  return {
    concrete: std(0xffffff, 0.95, 0, { map: conc.map, bumpMap: conc.bump, bumpScale: 0.6 }),
    gravel: std(0xffffff, 0.98, 0, { map: grav.map, bumpMap: grav.bump, bumpScale: 3.2 }),
    pebble: std(0xffffff, 0.9, 0),
    concreteSlab: std(0xffffff, 0.95, 0, { map: concJ.map, bumpMap: concJ.bump, bumpScale: 0.6 }),
    soil: std(0xffffff, 1, 0, { map: soil.map, bumpMap: soil.bump, bumpScale: 1.6 }),

    // metal um pouco menos espelhado e menos azulado: lê como galvanizado, não cromo
    galv: std(0xbdbebb, 0.5, 0.72, { roughnessMap: brushed }),
    galvDull: std(0xa4a7a6, 0.62, 0.6, { roughnessMap: brushed }),
    steelDark: std(0x3a3d40, 0.55, 0.6),
    paintedGray: std(0x8f938f, 0.55, 0.35),
    doorGray: std(0x7d817e, 0.5, 0.45),
    aluminum: std(0xcfd3d6, 0.35, 0.9, { roughnessMap: brushed }),

    shelterWall: std(0xffffff, 0.85, 0, { map: stucco.map, bumpMap: stucco.bump, bumpScale: 0.3, color: 0xc6c4bb }),
    shelterRoof: std(0xa9a9a4, 0.9, 0),
    cabinet: std(0xbab9b1, 0.55, 0.08),
    cabinetTrim: std(0x8a8d89, 0.5, 0.2),

    // interior do abrigo (representação genérica)
    interiorWall: std(0xe2e1da, 0.9, 0),
    floorVinyl: std(0x4c4f50, 0.75, 0),
    ceilingTile: std(0xd8d8d2, 0.95, 0),
    rackBody: std(0x2a2d30, 0.5, 0.5),
    equipBody: std(0x1d1f21, 0.5, 0.4),
    equipFace: std(0x9ea3a6, 0.45, 0.6),
    batteryBlock: std(0x1f2a36, 0.55, 0.1),
    ledGreen: std(0x103018, 0.4, 0, { emissive: 0x30ff60, emissiveIntensity: 2.2 }),
    ledAmber: std(0x302008, 0.4, 0, { emissive: 0xffa010, emissiveIntensity: 2.2 }),
    // luminárias internas: o brilho liga com a porta aberta ou à noite (ver World.update)
    interiorLamp: std(0xf5f2e8, 0.3, 0, { emissive: 0xfff0d8, emissiveIntensity: 0 }),

    plastic: std(0x26282a, 0.6, 0),
    plasticWhite: std(0xe9ebea, 0.45, 0),
    rubber: std(0x151515, 0.9, 0),
    glass: std(0xf2f2e8, 0.15, 0, { transparent: true, opacity: 0.85 }),
    lampOff: std(0xdad9cf, 0.2, 0, { emissive: 0xffd9a0, emissiveIntensity: 0 }),

    cableBlack: std(0x101010, 0.55, 0.05),
    cableRed: std(0x8c1212, 0.5, 0.05),
    cableGreen: std(0x2f7a2f, 0.5, 0.05),
    copper: std(0xb7773f, 0.35, 0.9),

    generator: std(0x2c6b3a, 0.5, 0.2),
    transformer: std(0x8e938f, 0.5, 0.4),
    ceramic: std(0x8a5a3c, 0.25, 0.1),
    warning: std(0xe3b100, 0.55, 0.1),

    beacon: new THREE.MeshStandardMaterial({
      color: 0x7a0000,
      emissive: 0xff1010,
      emissiveIntensity: 1.6,
      roughness: 0.3,
    }),

    chain: new THREE.MeshStandardMaterial({
      map: chain,
      color: 0xe6e9ea,
      roughness: 0.55,
      metalness: 0.15, // metal alto escureceria a tela contra o céu; assim ela fica clara como a galvanizada real
      side: THREE.DoubleSide,
      // mistura por alfa (sem alphaTest): à distância o alfa dos mipmaps vira uma tela
      // translúcida, em vez de uma parede opaca
      transparent: true,
      depthWrite: false,
    }),

    blob: new THREE.MeshBasicMaterial({
      map: blobTexture(),
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    }),
  };
}

export type Mats = ReturnType<typeof createMaterials>;
