import * as THREE from 'three';
import { EYE_HEIGHT, PLAYER_HEIGHT, PLAYER_RADIUS, START } from '../config';
import type { CollisionWorld } from './collision';

const WALK = 2.0; // m/s
const RUN = 4.2;
const TOUCH_WALK = 2.6; // joystick no limite: um pouco acima do passo de teclado, já que não há tecla de correr
const LOOK = 0.0022;
const PITCH_LIMIT = 1.35; // ~77°, evita virar a cabeça de ponta-cabeça

/**
 * Primeira pessoa com PointerLock. Sem biblioteca extra: a lógica é curta e precisamos
 * controlar colisão e altura do piso (lajes) no mesmo passo de movimento.
 */
export class FirstPerson {
  enabled = false;
  locked = false;
  yaw = START.yaw;
  pitch = 0;
  onLockChange: (locked: boolean) => void = () => {};

  private keys = new Set<string>();
  private feet = new THREE.Vector3(START.position[0], 0, START.position[2]);
  private ground = 0;
  private vel = new THREE.Vector3();
  private dragging = false;
  private _dir = new THREE.Vector3();
  /** Entrada analógica do joystick (x: lateral, y: frente), de -1 a 1. */
  private move = { x: 0, y: 0 };

  constructor(
    private camera: THREE.PerspectiveCamera,
    private dom: HTMLElement,
    private col: CollisionWorld,
  ) {
    camera.rotation.order = 'YXZ';
    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));
    window.addEventListener('blur', () => this.keys.clear());
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === dom;
      this.onLockChange(this.locked);
    });
    dom.addEventListener('pointerdown', (e) => {
      // o toque é tratado em touch.ts (sem PointerLock e sem movementX, que o toque não fornece)
      if (!this.enabled || e.button !== 0 || e.pointerType === 'touch') return;
      this.dragging = true;
      if (!this.locked) {
        // se o navegador negar o bloqueio, o arrastar do mouse continua funcionando
        void Promise.resolve(dom.requestPointerLock?.() as unknown).catch(() => {});
      }
    });
    window.addEventListener('pointerup', () => (this.dragging = false));
    window.addEventListener('pointermove', (e) => {
      if (!this.enabled || e.pointerType === 'touch' || (!this.locked && !this.dragging)) return;
      this.yaw -= e.movementX * LOOK;
      this.pitch = THREE.MathUtils.clamp(this.pitch - e.movementY * LOOK, -PITCH_LIMIT, PITCH_LIMIT);
    });
  }

  private onKey(e: KeyboardEvent, down: boolean) {
    const t = e.target as HTMLElement | null;
    if (t && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
    if (!down) {
      this.keys.delete(e.code);
      return;
    }
    if (this.enabled && /^(Arrow|Space)/.test(e.code)) e.preventDefault();
    this.keys.add(e.code);
  }

  enable() {
    this.enabled = true;
    this.syncCamera(0);
  }

  /** Joystick: x lateral, y para frente, cada um de -1 a 1 (comprimento já limitado a 1). */
  setMove(x: number, y: number) {
    this.move.x = x;
    this.move.y = y;
  }

  /** Giro por arraste de toque; `dx`/`dy` em pixels e `sens` em rad/px. */
  look(dx: number, dy: number, sens: number) {
    if (!this.enabled) return;
    this.yaw -= dx * sens;
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * sens, -PITCH_LIMIT, PITCH_LIMIT);
  }

  disable() {
    this.enabled = false;
    this.keys.clear();
    this.move.x = this.move.y = 0;
    this.vel.set(0, 0, 0);
    if (document.pointerLockElement === this.dom) document.exitPointerLock();
  }

  reset() {
    this.feet.set(START.position[0], 0, START.position[2]);
    this.ground = 0;
    this.yaw = START.yaw;
    this.pitch = 0;
    this.vel.set(0, 0, 0);
    this.syncCamera(0);
  }

  /** Assume a posição/olhar atual da câmera (ao voltar de outro modo, sem teleportar). */
  adoptCamera() {
    this.feet.set(this.camera.position.x, 0, this.camera.position.z);
    this.col.resolve(this.feet, PLAYER_RADIUS, 0, PLAYER_HEIGHT);
    this.ground = this.col.groundHeight(this.feet.x, this.feet.z);
    const e = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');
    this.yaw = e.y;
    this.pitch = THREE.MathUtils.clamp(e.x, -PITCH_LIMIT, PITCH_LIMIT);
    this.syncCamera(0);
  }

  private down(...codes: string[]) {
    return codes.some((c) => this.keys.has(c));
  }

  update(dt: number) {
    if (!this.enabled) return;
    dt = Math.min(dt, 0.05);
    const f = (this.down('KeyW', 'ArrowUp') ? 1 : 0) - (this.down('KeyS', 'ArrowDown') ? 1 : 0) + this.move.y;
    const s = (this.down('KeyD', 'ArrowRight') ? 1 : 0) - (this.down('KeyA', 'ArrowLeft') ? 1 : 0) + this.move.x;
    const analog = this.move.x !== 0 || this.move.y !== 0;
    const speed = this.down('ShiftLeft', 'ShiftRight') ? RUN : analog ? TOUCH_WALK : WALK;
    // teclas dão módulo 1 (como antes); o joystick dá módulo proporcional ao deslocamento
    const mag = Math.min(1, Math.hypot(f, s));

    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    this._dir.set(-sin * f + cos * s, 0, -cos * f - sin * s);
    if (this._dir.lengthSq() > 0) this._dir.normalize().multiplyScalar(speed * mag);
    // suaviza partida e parada
    this.vel.lerp(this._dir, 1 - Math.exp(-12 * dt));

    if (this.vel.lengthSq() > 1e-5) {
      // passos curtos evitam atravessar paredes finas em quadros lentos
      const steps = Math.max(1, Math.ceil((this.vel.length() * dt) / 0.12));
      for (let i = 0; i < steps; i++) {
        this.feet.x += (this.vel.x * dt) / steps;
        this.feet.z += (this.vel.z * dt) / steps;
        const g = this.col.groundHeight(this.feet.x, this.feet.z);
        this.col.resolve(this.feet, PLAYER_RADIUS, Math.max(g, this.ground), Math.max(g, this.ground) + PLAYER_HEIGHT);
      }
    }
    this.syncCamera(dt);
  }

  private syncCamera(dt: number) {
    const g = this.col.groundHeight(this.feet.x, this.feet.z);
    this.ground = dt > 0 ? this.ground + (g - this.ground) * Math.min(1, dt * 14) : g;
    this.camera.position.set(this.feet.x, this.ground + EYE_HEIGHT, this.feet.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }
}
