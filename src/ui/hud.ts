import type { TourStep } from '../controls/guidedTour';
import type { EquipmentInfo } from '../data/equipment';

export type Mode = 'menu' | 'visit' | 'inspect' | 'tour';

export function $<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Elemento #${id} não encontrado`);
  return el as T;
}

/** Aparelho de toque como entrada principal (celular/tablet). Notebook com tela sensível segue com teclado. */
export const isTouch = window.matchMedia?.('(pointer: coarse)').matches ?? false;

/** `touch` troca dicas e controles; `compact` (toque ou tela estreita) colapsa a barra superior. */
export function updateDeviceClasses() {
  document.body.classList.toggle('touch', isTouch);
  document.body.classList.toggle('compact', isTouch || window.innerWidth <= 760);
}

const MODE_LABEL: Record<Mode, string> = {
  menu: '',
  visit: 'Visita imersiva',
  inspect: 'Inspeção técnica',
  tour: 'Apresentação guiada',
};

let toastTimer: number | undefined;

export const hud = {
  setMode(mode: Mode) {
    const inGame = mode !== 'menu';
    $('start').hidden = inGame;
    $('hud').hidden = !inGame;
    $('crosshair').hidden = mode !== 'visit';
    $('inspect-bar').hidden = mode !== 'inspect';
    $('tour-bar').hidden = mode !== 'tour';
    $('mode-name').textContent = MODE_LABEL[mode];
    $('touch-ui').hidden = !(isTouch && mode === 'visit');
    if (mode === 'menu') $('hud').classList.remove('open');
    document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
    });
    if (mode !== 'visit') {
      $('lockhint').hidden = true;
      this.setPrompt(null);
    }
    if (mode === 'menu') this.hideInfo();
  },

  setPrompt(text: string | null) {
    const el = $('prompt');
    el.hidden = !text;
    if (text) el.textContent = text;
    // no toque o botão "Interagir" faz o papel da tecla E e mostra a ação disponível
    const btn = $('btn-interact');
    btn.textContent = text ?? 'Interagir';
    btn.classList.toggle('ready', !!text);
  },

  setLockHint(show: boolean) {
    $('lockhint').hidden = !show || isTouch;
  },

  showInfo(info: EquipmentInfo) {
    $('info-cat').textContent = info.category;
    $('info-name').textContent = info.name;
    $('info-role').textContent = info.role;
    $('info-detail').textContent = info.detail;
    const note = $('info-note');
    note.textContent = info.note ?? '';
    note.hidden = !info.note;
    $('info').hidden = false;
  },

  hideInfo() {
    $('info').hidden = true;
  },

  get infoOpen(): boolean {
    return !$('info').hidden;
  },

  toast(msg: string) {
    const el = $('toast');
    el.textContent = msg;
    el.hidden = false;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => (el.hidden = true), 2200);
  },

  tourStep(step: TourStep, index: number, total: number) {
    $('tour-title').textContent = step.title;
    $('tour-text').textContent = step.text;
    $('tour-count').textContent = `Passo ${index + 1} de ${total}`;
    $('tour-fill').style.width = `${((index + 1) / total) * 100}%`;
  },

  tourPlaying(paused: boolean) {
    $('tour-play').textContent = paused ? 'Continuar' : 'Pausar';
  },

  setHelp(open: boolean) {
    $('help').hidden = !open;
    if (open) $('help-close').focus();
  },

  get helpOpen(): boolean {
    return !$('help').hidden;
  },

  setSettings(open: boolean) {
    $('settings').hidden = !open;
    $('btn-settings').setAttribute('aria-expanded', String(open));
  },

  get settingsOpen(): boolean {
    return !$('settings').hidden;
  },

  setUiHidden(hidden: boolean) {
    document.body.classList.toggle('ui-hidden', hidden);
    $('unhide').hidden = !hidden;
  },

  get uiHidden(): boolean {
    return document.body.classList.contains('ui-hidden');
  },

  showError(text: string) {
    $('error-text').textContent = text;
    $('error').hidden = false;
    $('loading').hidden = true;
  },
};
