import * as THREE from 'three';

export interface Aabb {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
  maxY: number;
}

export interface Cylinder2D {
  x: number;
  z: number;
  r: number;
  minY: number;
  maxY: number;
}

interface GroundZone {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  h: number;
}

/**
 * Colisão 2D (plano XZ) com limites verticais. Suficiente porque a visita é em piso
 * plano: dispensa biblioteca de física. Obstáculos têm faixa [minY, maxY], então o
 * visitante passa por baixo da esteira de cabos (a 3 m) mas não atravessa armários.
 */
export class CollisionWorld {
  readonly boxes: Aabb[] = [];
  readonly cylinders: Cylinder2D[] = [];
  private dynamic = new Map<string, Aabb[]>();
  private zones: GroundZone[] = [];
  /** Limite externo da área navegável, para ninguém se perder no infinito. */
  readonly bounds = 70;

  addBox(cx: number, cz: number, w: number, d: number, y0: number, y1: number) {
    this.boxes.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2, minY: y0, maxY: y1 });
  }

  addRect(minX: number, maxX: number, minZ: number, maxZ: number, y0: number, y1: number) {
    this.boxes.push({ minX, maxX, minZ, maxZ, minY: y0, maxY: y1 });
  }

  addCylinder(x: number, z: number, r: number, y0: number, y1: number) {
    this.cylinders.push({ x, z, r, minY: y0, maxY: y1 });
  }

  /** Conjunto de caixas substituível por chave (ex.: portão aberto/fechado). */
  setDynamic(key: string, boxes: Aabb[]) {
    this.dynamic.set(key, boxes);
  }

  addGround(minX: number, maxX: number, minZ: number, maxZ: number, h: number) {
    this.zones.push({ minX, maxX, minZ, maxZ, h });
  }

  groundHeight(x: number, z: number): number {
    let h = 0;
    for (const g of this.zones) {
      if (x >= g.minX && x <= g.maxX && z >= g.minZ && z <= g.maxZ && g.h > h) h = g.h;
    }
    return h;
  }

  private *allBoxes(): Iterable<Aabb> {
    yield* this.boxes;
    for (const list of this.dynamic.values()) yield* list;
  }

  /** Empurra `p` (apenas X/Z) para fora de qualquer obstáculo que cruze [feet, head]. */
  resolve(p: THREE.Vector3, radius: number, feet: number, head: number) {
    // as folgas de 0.12 m permitem pisar lajes baixas sem tratá-las como parede
    const f = feet + 0.12;
    for (let iter = 0; iter < 3; iter++) {
      for (const b of this.allBoxes()) {
        if (f >= b.maxY || head <= b.minY) continue;
        const cx = Math.max(b.minX, Math.min(p.x, b.maxX));
        const cz = Math.max(b.minZ, Math.min(p.z, b.maxZ));
        const dx = p.x - cx;
        const dz = p.z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= radius * radius) continue;
        if (d2 > 1e-10) {
          const d = Math.sqrt(d2);
          const k = (radius - d) / d;
          p.x += dx * k;
          p.z += dz * k;
        } else {
          // centro dentro da caixa: sai pelo eixo de menor penetração
          const l = p.x - b.minX;
          const r = b.maxX - p.x;
          const t = p.z - b.minZ;
          const bo = b.maxZ - p.z;
          const m = Math.min(l, r, t, bo);
          if (m === l) p.x = b.minX - radius;
          else if (m === r) p.x = b.maxX + radius;
          else if (m === t) p.z = b.minZ - radius;
          else p.z = b.maxZ + radius;
        }
      }
      for (const c of this.cylinders) {
        if (f >= c.maxY || head <= c.minY) continue;
        const dx = p.x - c.x;
        const dz = p.z - c.z;
        const min = radius + c.r;
        const d2 = dx * dx + dz * dz;
        if (d2 >= min * min) continue;
        const d = Math.sqrt(d2) || 1e-6;
        const k = min / d;
        p.x = c.x + dx * k;
        p.z = c.z + dz * k;
      }
    }
    p.x = Math.max(-this.bounds, Math.min(this.bounds, p.x));
    p.z = Math.max(-this.bounds, Math.min(this.bounds, p.z));
  }

  /** Esfera (câmera do tour) intersecta algum obstáculo? Usado para validar o percurso. */
  hitsSphere(x: number, y: number, z: number, r: number): string | null {
    let i = 0;
    for (const b of this.allBoxes()) {
      i++;
      if (y + r <= b.minY || y - r >= b.maxY) continue;
      const cx = Math.max(b.minX, Math.min(x, b.maxX));
      const cz = Math.max(b.minZ, Math.min(z, b.maxZ));
      if ((x - cx) ** 2 + (z - cz) ** 2 < r * r) return `box#${i} [${b.minX.toFixed(2)},${b.maxX.toFixed(2)}]x[${b.minZ.toFixed(2)},${b.maxZ.toFixed(2)}]`;
    }
    for (const c of this.cylinders) {
      if (y + r <= c.minY || y - r >= c.maxY) continue;
      if ((x - c.x) ** 2 + (z - c.z) ** 2 < (c.r + r) ** 2) return `cyl(${c.x.toFixed(2)},${c.z.toFixed(2)})`;
    }
    return null;
  }
}
