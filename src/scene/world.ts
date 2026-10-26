import * as THREE from 'three';
import { GATE, POWER, SHELTER_INTERIOR, SITE, TOWER } from '../config';
import { CollisionWorld } from '../controls/collision';
import { buildCabinets } from './cabinets';
import { buildCableTray } from './cabletray';
import { Environment } from './lighting';
import { createMaterials, type Mats } from './materials';
import { buildPower } from './power';
import { buildShelter, type ShelterDoor } from './shelter';
import { buildSite, MAX_PEBBLES, type Gate } from './site';
import { buildTower, halfAt } from './tower';

export interface Interactable {
  id: string;
  /** distância máxima (m) a partir da câmera para oferecer a interação */
  maxDist: number;
  proxies: THREE.Mesh[];
  /** caixa de enquadramento (câmera orbital e realce) */
  focus: THREE.Box3;
  /** item dentro do abrigo: só interativo quando o visitante está lá dentro */
  interior: boolean;
}

/**
 * Monta a estação inteira. As caixas invisíveis ("proxies") servem de alvo barato para
 * raycast (interação em primeira pessoa e seleção na inspeção técnica): testar o raio
 * contra a geometria fundida da torre custaria muito por quadro.
 */
export class World {
  readonly scene = new THREE.Scene();
  readonly M: Mats = createMaterials();
  readonly collision = new CollisionWorld();
  readonly interactables: Interactable[] = [];
  readonly gate: Gate;
  readonly door: ShelterDoor;
  readonly env: Environment;
  private interiorLights: THREE.PointLight[];
  private cutawayParts: THREE.Object3D[];
  /** corte do abrigo ativo (cobertura e forro ocultos) */
  cutaway = false;
  private pebbles: THREE.InstancedMesh;
  private proxyGroup = new THREE.Group();
  /** pontos úteis para o tour e câmeras */
  readonly anchors;

  constructor(renderer: THREE.WebGLRenderer) {
    const { M, collision: col, scene } = this;

    const site = buildSite(M, col);
    this.gate = site.gate;
    this.pebbles = site.pebbles;
    const shelter = buildShelter(M, col);
    this.door = shelter.door;
    this.interiorLights = shelter.interiorLights;
    this.cutawayParts = shelter.cutaway;
    const cabinets = buildCabinets(M, col);
    const tray = buildCableTray(M, col);
    const power = buildPower(M, col);
    const tower = buildTower(M, col);
    this.anchors = tower.anchors;

    scene.add(site.group, shelter.group, cabinets.group, tray, power.meter, power.transformer, power.generator, tower.group);

    // sombras de contato sob a laje da torre
    this.env = new Environment(scene, renderer, M, shelter.lamps, tower.beaconPos);

    this.proxyGroup.name = 'proxies';
    scene.add(this.proxyGroup);
    this.buildInteractables();
  }

  private box(id: string, boxes: Array<[number, number, number, number, number, number]>, maxDist: number, interior = false) {
    const focus = new THREE.Box3();
    const proxies = boxes.map(([x0, x1, y0, y1, z0, z1]) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), new THREE.MeshBasicMaterial({ visible: false }));
      m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      m.layers.set(1); // camada 1: só raycast, nunca renderizada
      m.userData.id = id;
      m.userData.interior = interior;
      m.updateMatrixWorld(true);
      this.proxyGroup.add(m);
      focus.union(new THREE.Box3(new THREE.Vector3(x0, y0, z0), new THREE.Vector3(x1, y1, z1)));
      return m;
    });
    this.interactables.push({ id, maxDist, proxies, focus, interior });
  }

  private buildInteractables() {
    const { x: cx, z: cz } = TOWER;
    const hs = halfAt(27);
    // ordem não importa: o raycast escolhe o alvo mais próximo da câmera
    this.box('tower', [[cx - 1.8, cx + 1.8, 0.25, 19.6, cz - 1.8, cz + 1.8], [cx - 0.7, cx + 0.7, 28.4, 32.6, cz - 0.7, cz + 0.7]], 16);
    this.box(
      'antennas',
      [
        [cx - hs - 2.0, cx - hs - 0.3, 25.6, 28.4, cz - 0.6, cz + 0.6],
        [cx - 0.6, cx + 0.6, 25.6, 28.4, cz - hs - 2.0, cz - hs - 0.3],
        [cx - 0.6, cx + 0.6, 25.6, 28.4, cz + hs + 0.3, cz + hs + 2.0],
      ],
      45,
    );
    this.box(
      'dishes',
      [
        [cx + 0.9, cx + 2.7, 23.6, 25.6, cz - 0.4, cz + 1.0],
        [cx + 1.0, cx + 3.2, 19.7, 21.9, cz - 1.3, cz + 0.7],
      ],
      45,
    );
    this.box('beacon', [[cx + 0.2, cx + 0.7, H_BEACON - 0.2, H_BEACON + 0.25, cz - 0.25, cz + 0.25]], 45);
    this.box('shelter', [[-6.4, 0.05, 0.1, 3.25, -3.1, -0.35]], 14);
    this.box('cabinets', [[-4.1, -0.7, 0.1, 2.25, 3.05, 3.95]], 12);
    this.box(
      'ac',
      [
        [-2.95, -1.95, 2.0, 2.6, -0.45, 0.1], // abrigo
        [-3.95, -3.05, 1.0, 1.8, 3.9, 4.3], // armário 1
        [-3.0, -2.1, 1.0, 1.8, 3.9, 4.3], // armário 2
      ],
      12,
    );
    this.box(
      'tray',
      [
        [-4.95, -4.45, 0.4, 3.45, -0.45, -0.15], // descida
        [-4.5, 2.95, 3.15, 3.55, -0.5, -0.05], // trecho aéreo
        [2.7, 3.1, 3.3, 27.2, -0.55, -0.05], // eletrocalha vertical da torre (aprox.)
      ],
      30,
    );
    // porta do abrigo: interativa por fora e por dentro (E abre e fecha)
    this.box('shelterDoor', [[-1.7, -0.6, 0.2, 2.4, -0.5, 0.1]], 4);
    // interior (genérico): só entra em jogo com o visitante dentro do abrigo
    this.box('racks', [[-4.1, -2.3, 0.24, 2.25, -2.8, -1.45]], 5, true);
    this.box('batteries', [[-4.8, -4.15, 0.24, 1.6, -1.95, -0.95]], 5, true);
    this.box('qdg', [[-1.75, -0.85, 0.75, 2.0, -2.8, -2.55]], 5, true);
    this.box('ac', [[-2.95, -1.95, 1.85, 2.5, -0.85, -0.55]], 5, true);
    this.box(
      'tray',
      [
        [-4.9, -4.5, 0.4, 2.55, -0.8, -0.55],
        [-4.9, -4.5, 2.35, 2.55, -2.5, -0.8],
        [-4.9, -2.2, 2.35, 2.55, -2.55, -2.25],
      ],
      5,
      true,
    );
    this.box('grounding', [[-4.4, -3.8, 0.3, 0.7, -0.8, -0.55]], 4, true);
    this.box('meter', [[POWER.meter.x - 0.7, POWER.meter.x + 0.7, 0.9, 2.0, POWER.meter.z - 0.2, POWER.meter.z + 0.2]], 12);
    this.box('transformer', [[6.65, 7.75, 0.1, 1.9, POWER.transformer.z - 0.85, POWER.transformer.z + 0.85]], 14);
    this.box('generator', [[POWER.generator.x - 1.1, POWER.generator.x + 1.1, 0.1, 2.0, POWER.generator.z - 0.6, POWER.generator.z + 0.6]], 14);
    this.box('gate', [[-SITE.halfX - 0.2, -SITE.halfX + 0.2, 0, 2.4, GATE.z0, GATE.z1]], 8);
    // cercamento: faixas finas ao longo do perímetro (exceto o vão do portão)
    const hx = SITE.halfX;
    const hz = SITE.halfZ;
    this.box(
      'fence',
      [
        [-hx, hx, 0, 2.9, -hz - 0.15, -hz + 0.15],
        [-hx, hx, 0, 2.9, hz - 0.15, hz + 0.15],
        [hx - 0.15, hx + 0.15, 0, 2.9, -hz, hz],
        [-hx - 0.15, -hx + 0.15, 0, 2.9, -hz, GATE.z0],
        [-hx - 0.15, -hx + 0.15, 0, 2.9, GATE.z1, hz],
      ],
      14,
    );
    this.box(
      'grounding',
      [[cx - 1.5 - 0.55 - 0.4, cx - 1.5 - 0.55 + 0.4, 0.25, 0.9, cz - 1.5 - 0.35 - 0.4, cz - 1.5 - 0.35 + 0.4]],
      10,
    );
  }

  setPebbleDensity(fraction: number) {
    this.pebbles.count = Math.floor(MAX_PEBBLES * THREE.MathUtils.clamp(fraction, 0, 1));
    this.pebbles.visible = this.pebbles.count > 0;
  }

  update(dt: number, t: number) {
    this.gate.update(dt);
    this.door.update(dt);
    this.env.update(t);
    // interior iluminado enquanto a porta está aberta; as luminárias refletem o mesmo estado
    const on = this.door.progress > 0.02 || this.cutaway;
    const night = this.env.night;
    for (const l of this.interiorLights) l.intensity = on ? (night ? 12 : 6) : 0;
    this.M.interiorLamp.emissiveIntensity = on ? 2.2 : 0;
  }

  /** Corte do abrigo: oculta cobertura e forro para ver o interior de cima (inspeção técnica). */
  setCutaway(on: boolean) {
    this.cutaway = on;
    for (const p of this.cutawayParts) p.visible = !on;
  }

  /** O ponto (x, z) está dentro do volume principal do abrigo? */
  isInsideShelter(x: number, z: number): boolean {
    const I = SHELTER_INTERIOR;
    return x > I.x0 && x < I.x1 && z > I.z0 && z < I.z1;
  }

  get proxyObjects(): THREE.Object3D[] {
    return this.proxyGroup.children;
  }

  find(id: string, interior?: boolean): Interactable | undefined {
    return this.interactables.find((i) => i.id === id && (interior === undefined || i.interior === interior));
  }

  dispose() {
    this.env.dispose();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose?.();
    });
    for (const mat of Object.values(this.M)) {
      const mm = mat as THREE.Material & { map?: THREE.Texture | null; bumpMap?: THREE.Texture | null; roughnessMap?: THREE.Texture | null };
      mm.map?.dispose();
      mm.bumpMap?.dispose();
      mm.roughnessMap?.dispose();
      mm.dispose();
    }
  }
}

// cota do sinalizador (TOWER.height + 0.32), usada pela área interativa
const H_BEACON = TOWER.height + 0.32;
