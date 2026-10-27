import { $ } from '../ui/hud';
import type { FirstPerson } from './firstPerson';

const STICK_RADIUS = 56; // px; igual ao raio do anel desenhado em CSS
const DEADZONE = 0.12;
const LOOK_SENS = 0.0042; // rad/px

/**
 * Controles de toque da visita: joystick flutuante na metade esquerda (nasce onde o dedo pousa)
 * e arrastar na metade direita para olhar. Sem biblioteca: Pointer Events bastam, e cada dedo
 * é seguido pelo seu `pointerId`, então andar e olhar funcionam ao mesmo tempo.
 */
export class TouchControls {
  private stickId: number | null = null;
  private lookId: number | null = null;
  private origin = { x: 0, y: 0 };
  private last = { x: 0, y: 0 };

  private readonly base = $('stick-base');
  private readonly knob = $('stick-knob');
  private readonly hint = $('stick-hint');

  constructor(private fp: FirstPerson) {
    const stick = $('stick-zone');
    const look = $('look-zone');

    stick.addEventListener('pointerdown', (e) => {
      if (this.stickId !== null) return;
      this.stickId = e.pointerId;
      stick.setPointerCapture(e.pointerId);
      this.origin = { x: e.clientX, y: e.clientY };
      this.base.style.left = `${e.clientX}px`;
      this.base.style.top = `${e.clientY}px`;
      this.base.hidden = false;
      this.hint.hidden = true;
      this.updateStick(e);
    });
    stick.addEventListener('pointermove', (e) => {
      if (e.pointerId === this.stickId) this.updateStick(e);
    });
    const endStick = (e: PointerEvent) => {
      if (e.pointerId !== this.stickId) return;
      this.releaseStick();
    };
    stick.addEventListener('pointerup', endStick);
    stick.addEventListener('pointercancel', endStick);

    look.addEventListener('pointerdown', (e) => {
      if (this.lookId !== null) return;
      this.lookId = e.pointerId;
      look.setPointerCapture(e.pointerId);
      this.last = { x: e.clientX, y: e.clientY };
    });
    look.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.lookId) return;
      this.fp.look(e.clientX - this.last.x, e.clientY - this.last.y, LOOK_SENS);
      this.last = { x: e.clientX, y: e.clientY };
    });
    const endLook = (e: PointerEvent) => {
      if (e.pointerId === this.lookId) this.lookId = null;
    };
    look.addEventListener('pointerup', endLook);
    look.addEventListener('pointercancel', endLook);

    // Safari/iOS ainda dispara zoom de página por gesto de pinça fora do touch-action
    document.addEventListener('gesturestart', (e) => e.preventDefault());
  }

  private updateStick(e: PointerEvent) {
    const dx = e.clientX - this.origin.x;
    const dy = e.clientY - this.origin.y;
    const len = Math.hypot(dx, dy);
    const shown = Math.min(len, STICK_RADIUS);
    const ux = len > 0 ? dx / len : 0;
    const uy = len > 0 ? dy / len : 0;
    this.knob.style.transform = `translate(${ux * shown}px, ${uy * shown}px)`;
    const m = Math.min(1, len / STICK_RADIUS);
    // zona morta evita deriva com o dedo parado; o resto é reescalado para voltar a 0..1
    const k = m < DEADZONE ? 0 : (m - DEADZONE) / (1 - DEADZONE);
    this.fp.setMove(ux * k, -uy * k);
  }

  private releaseStick() {
    this.stickId = null;
    this.fp.setMove(0, 0);
    this.base.hidden = true;
    this.knob.style.transform = '';
    this.hint.hidden = false;
  }

  /** Solta os dedos presos (ao sair da visita, os elementos somem sem disparar `pointerup`). */
  reset() {
    this.lookId = null;
    this.releaseStick();
  }
}
