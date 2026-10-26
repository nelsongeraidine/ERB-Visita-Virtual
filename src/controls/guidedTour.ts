import * as THREE from 'three';

export interface TourStep {
  title: string;
  text: string;
  pos: [number, number, number];
  look: [number, number, number];
  /** pontos intermediários: mantêm a trajetória em áreas livres, longe de estruturas */
  via?: [number, number, number][];
  /** duração do deslocamento até este ponto (s) */
  travel: number;
  /** tempo parado neste ponto (s) */
  hold: number;
  /** ação ao chegar (ex.: abrir o portão) */
  onArrive?: 'openGate' | 'closeGate' | 'openShelterDoor' | 'closeShelterDoor';
}

// Todos os pontos de observação foram escolhidos em áreas livres; a validação automática
// do percurso (verifyTour, exposta em window.__erb) amostra o caminho contra as colisões.
export const TOUR_STEPS: TourStep[] = [
  {
    title: '1. Vista externa da estação',
    text: 'Visão geral do terreno cercado, com a torre de 30 m ao fundo e o abrigo de equipamentos no centro.',
    pos: [-22, 9, 16],
    look: [0, 4, -1],
    travel: 0,
    hold: 6,
    onArrive: 'closeGate',
  },
  {
    title: '2. Aproximação do portão',
    text: 'O acesso é feito pelo portão de duas folhas na face oeste do cercamento. O portão se abre para receber o visitante.',
    pos: [-12.2, 1.7, 1.6],
    look: [-8, 1.4, 1.6],
    via: [[-16.5, 3.5, 8]],
    travel: 9,
    hold: 5,
    onArrive: 'openGate',
  },
  {
    title: '3. Entrada no terreno',
    text: 'Dentro do terreno, a faixa de concreto leva aos equipamentos; o restante do piso é de brita.',
    pos: [-5.6, 1.7, 1.6],
    look: [-1.5, 1.6, 0.6],
    via: [[-8.6, 1.7, 1.6]],
    travel: 9,
    hold: 5,
  },
  {
    title: '4. Abrigo de equipamentos',
    text: 'Edificação técnica com volume principal e anexo, portas metálicas, ventilação e unidade de climatização de parede.',
    pos: [-2.4, 1.7, 1.5],
    look: [-1.5, 1.6, -0.5],
    travel: 7,
    hold: 5,
    onArrive: 'openShelterDoor',
  },
  {
    title: '5. Interior do abrigo',
    text: 'Representação genérica do interior: racks de telecomunicações (um com a porta entreaberta), banco de baterias, quadro de distribuição elétrica, climatização e esteira de cabos. Nada aqui indica fabricante, modelo ou capacidade.',
    pos: [-1.3, 1.9, -1.25],
    look: [-3.6, 1.3, -2.3],
    via: [
      [-1.15, 1.7, 1.1],
      [-1.15, 1.75, 0.3],
      [-1.15, 1.9, -0.5],
    ],
    travel: 9,
    hold: 9,
  },
  {
    title: '6. Armários externos e climatização',
    text: 'Três gabinetes outdoor sobre laje de concreto. Dois têm unidades de climatização na face posterior.',
    pos: [0.5, 1.7, 4.8],
    look: [-2.4, 1.3, 3.7],
    via: [
      [-1.15, 1.9, -0.5],
      [-1.15, 1.75, 0.7],
      [0.4, 1.7, 1.7],
    ],
    travel: 14,
    hold: 7,
    onArrive: 'closeShelterDoor',
  },
  {
    title: '7. Esteiras de cabos: origem',
    text: 'A esteira coberta sai do abrigo, sobe pela parede, faz a curva sobre a cobertura e segue em direção à torre.',
    pos: [-3.7, 1.8, 1.4],
    look: [-4.7, 2.2, -0.3],
    via: [[0.3, 1.7, 1.7]],
    travel: 10,
    hold: 6,
  },
  {
    title: '8. Esteiras de cabos: trajeto até a torre',
    text: 'O trecho aéreo apoia-se em pilaretes e chega à base da eletrocalha vertical que sobe pela torre.',
    pos: [1.6, 1.9, 1.3],
    look: [2.9, 3.3, -0.4],
    travel: 8,
    hold: 5,
  },
  {
    title: '9. Base da torre',
    text: 'Torre treliçada apoiada em quatro pedestais de concreto, com escada vertical e condutor de descida do para-raios.',
    pos: [4.5, 1.8, 3.2],
    look: [4.5, 3.6, -1.9],
    travel: 6,
    hold: 6,
  },
  {
    title: '10. Antenas e parábolas',
    text: 'No alto, painéis setoriais em três faces e duas parábolas de micro-ondas. Azimutes e diâmetros são apenas visuais.',
    pos: [13, 22, 3.5],
    look: [4.5, 24.5, -1.9],
    via: [[6.5, 7, 3.5]],
    travel: 14,
    hold: 7,
  },
  {
    title: '11. Equipamentos de energia',
    text: 'Transformador ao fundo e grupo gerador à direita; caixas de medição ficam junto ao cercamento, perto do portão.',
    pos: [4.4, 1.75, 2.3],
    look: [6.9, 1.0, 1.0],
    via: [[9.5, 8, 4.5]],
    travel: 12,
    hold: 7,
  },
  {
    title: '12. Retorno à vista panorâmica',
    text: 'Vista de conjunto da estação, com a disposição de abrigo, armários, torre e energia dentro do cercamento.',
    pos: [-24, 14, 20],
    look: [0, 4, 0],
    via: [
      [3.0, 9, 4.2],
      [-9, 13, 9.5],
    ],
    travel: 14,
    hold: 8,
  },
];

const v3 = (a: [number, number, number]) => new THREE.Vector3(a[0], a[1], a[2]);

/** Percurso automático com pausa, avanço, retorno e reinício. */
export class GuidedTour {
  index = 0;
  paused = false;
  playing = false;
  onStep: (step: TourStep, index: number) => void = () => {};
  onArrive: (step: TourStep) => void = () => {};
  onEnd: () => void = () => {};

  private phase: 'travel' | 'hold' = 'hold';
  private t = 0;
  private curve: THREE.CatmullRomCurve3 | null = null;
  private fromLook = new THREE.Vector3();
  private look = new THREE.Vector3();
  private cam: THREE.PerspectiveCamera | null = null;

  start(cam: THREE.PerspectiveCamera, index = 0) {
    this.cam = cam;
    this.playing = true;
    this.paused = false;
    this.snapTo(index);
  }

  stop() {
    this.playing = false;
  }

  togglePause(): boolean {
    this.paused = !this.paused;
    return this.paused;
  }

  restart() {
    if (!this.cam) return;
    this.paused = false;
    this.playing = true;
    this.snapTo(0);
  }

  next() {
    if (!this.cam) return;
    if (this.phase === 'travel') this.snapTo(this.index);
    else if (this.index < TOUR_STEPS.length - 1) this.snapTo(this.index + 1);
  }

  prev() {
    if (!this.cam) return;
    this.snapTo(Math.max(0, this.phase === 'hold' && this.t > 1.5 ? this.index : this.index - 1));
  }

  /** Posiciona a câmera direto no ponto de observação do passo. */
  private snapTo(i: number) {
    const step = TOUR_STEPS[i];
    this.index = i;
    this.cam?.position.copy(v3(step.pos));
    this.look.copy(v3(step.look));
    this.cam?.lookAt(this.look);
    this.phase = 'hold';
    this.t = 0;
    this.playing = true;
    this.onStep(step, i);
    this.onArrive(step);
  }

  private beginTravel(i: number) {
    if (!this.cam) return;
    const step = TOUR_STEPS[i];
    this.index = i;
    this.phase = 'travel';
    this.t = 0;
    const pts = [this.cam.position.clone(), ...(step.via ?? []).map(v3), v3(step.pos)];
    this.curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    this.fromLook.copy(this.look);
    this.onStep(step, i);
  }

  update(dt: number) {
    if (!this.playing || !this.cam) return;
    const cam = this.cam;
    if (this.paused) {
      cam.lookAt(this.look);
      return;
    }
    dt = Math.min(dt, 0.05);
    this.t += dt;
    const step = TOUR_STEPS[this.index];
    if (this.phase === 'travel' && this.curve) {
      const u = Math.min(1, this.t / step.travel);
      const k = 0.5 - 0.5 * Math.cos(Math.PI * u); // partida e chegada suaves
      cam.position.copy(this.curve.getPoint(k));
      this.look.lerpVectors(this.fromLook, v3(step.look), k);
      cam.lookAt(this.look);
      if (u >= 1) {
        this.phase = 'hold';
        this.t = 0;
        this.onArrive(step);
      }
    } else {
      cam.lookAt(this.look);
      if (this.t >= step.hold) {
        if (this.index < TOUR_STEPS.length - 1) this.beginTravel(this.index + 1);
        else {
          this.playing = false;
          this.onEnd();
        }
      }
    }
  }

  /** Amostra o percurso completo (sem renderizar) e devolve pontos que tocam obstáculos. */
  static samplePath(): { step: number; pos: THREE.Vector3 }[] {
    const out: { step: number; pos: THREE.Vector3 }[] = [];
    let prev = v3(TOUR_STEPS[0].pos);
    out.push({ step: 0, pos: prev.clone() });
    for (let i = 1; i < TOUR_STEPS.length; i++) {
      const s = TOUR_STEPS[i];
      const curve = new THREE.CatmullRomCurve3([prev.clone(), ...(s.via ?? []).map(v3), v3(s.pos)], false, 'centripetal');
      const n = Math.ceil(s.travel * 20);
      for (let k = 0; k <= n; k++) {
        const u = k / n;
        out.push({ step: i, pos: curve.getPoint(0.5 - 0.5 * Math.cos(Math.PI * u)) });
      }
      prev = v3(s.pos);
    }
    return out;
  }
}
