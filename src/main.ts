import * as THREE from 'three';
import './ui/styles.css';
import { PLAYER_RADIUS } from './config';
import { FirstPerson } from './controls/firstPerson';
import { GuidedTour, TOUR_STEPS } from './controls/guidedTour';
import { InspectionControls } from './controls/orbit';
import { EQUIPMENT } from './data/equipment';
import { PostFx } from './scene/postfx';
import { World } from './scene/world';
import { $, hud, type Mode } from './ui/hud';

type QualityKey = 'low' | 'medium' | 'high';

const canvas = $<HTMLCanvasElement>('scene');

function dpr() {
  return window.devicePixelRatio || 1;
}

// Qualidade: resolução de render, mapa de sombras e densidade de brita em 3D.
const QUALITY: Record<QualityKey, { pixelRatio: () => number; shadow: number; pebbles: number }> = {
  low: { pixelRatio: () => 1, shadow: 1024, pebbles: 0 },
  medium: { pixelRatio: () => Math.min(dpr(), 1.5), shadow: 2048, pebbles: 0.45 },
  high: { pixelRatio: () => Math.min(dpr(), 2), shadow: 4096, pebbles: 1 },
};

let renderer: THREE.WebGLRenderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  if (!renderer.getContext()) throw new Error('sem contexto WebGL');
} catch (err) {
  hud.showError(`Seu navegador não conseguiu criar o contexto WebGL (${(err as Error).message}).`);
  throw err;
}
canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  hud.showError('O contexto gráfico foi perdido (a placa de vídeo pode ter sido reiniciada). Recarregue a página.');
});

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 3000);
const timer = new THREE.Timer();
let quality: QualityKey = 'medium';
let fx: PostFx | undefined;

function applyQuality(q: QualityKey, world?: World) {
  quality = q;
  const cfg = QUALITY[q];
  renderer.setPixelRatio(cfg.pixelRatio());
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (fx) {
    fx.setQuality(q);
    fx.setSize(window.innerWidth, window.innerHeight, cfg.pixelRatio());
  }
  if (world) {
    world.env.setShadowMapSize(cfg.shadow);
    world.setPebbleDensity(cfg.pebbles);
  }
}

function boot() {
  let world: World;
  try {
    world = new World(renderer);
  } catch (err) {
    console.error(err);
    hud.showError(`Falha ao montar a cena: ${(err as Error).message}`);
    return;
  }
  applyQuality(quality, world);
  try {
    fx = new PostFx(renderer, world.scene, camera);
    applyQuality(quality, world);
  } catch (err) {
    // sem AO a cena continua correta; só perde o acabamento de contato
    console.warn('Pós-processamento indisponível, seguindo sem oclusão ambiental.', err);
    fx = undefined;
  }

  const fp =new FirstPerson(camera, canvas, world.collision);
  const insp = new InspectionControls(camera, canvas);
  const tour = new GuidedTour();
  let mode: Mode = 'menu';
  let infoId: string | null = null;
  let tourEnded = false;
  let menuAngle = 0.6;

  // --- informações e destaque -------------------------------------------------------------
  const highlight = new THREE.Box3Helper(new THREE.Box3(), new THREE.Color(0xf0b429));
  highlight.visible = false;
  world.scene.add(highlight);

  const compSelect = $<HTMLSelectElement>('component-select');
  compSelect.add(new Option('Selecione um componente…', ''));
  const group = (label: string, options: Array<[string, string]>) => {
    const g = document.createElement('optgroup');
    g.label = label;
    for (const [value, text] of options) g.appendChild(new Option(text, value));
    compSelect.appendChild(g);
  };
  group(
    'Exterior',
    ['tower', 'antennas', 'dishes', 'beacon', 'shelter', 'shelterDoor', 'cabinets', 'ac', 'tray', 'grounding', 'meter', 'transformer', 'generator', 'fence', 'gate'].map(
      (id) => [id, EQUIPMENT[id].name],
    ),
  );
  // itens do interior usam o prefixo "in:" e ativam o corte do abrigo
  group('Interior do abrigo (corte)', [
    ['in:racks', EQUIPMENT.racks.name],
    ['in:batteries', EQUIPMENT.batteries.name],
    ['in:qdg', EQUIPMENT.qdg.name],
    ['in:ac', 'Climatização (face interna)'],
    ['in:tray', 'Esteira de cabos (interior)'],
    ['in:grounding', 'Aterramento (interior)'],
  ]);

  function showInfo(id: string) {
    infoId = id;
    hud.showInfo(EQUIPMENT[id]);
  }
  function clearInfo() {
    infoId = null;
    hud.hideInfo();
    highlight.visible = false;
    compSelect.value = '';
  }

  /** Corte do abrigo: tira cobertura e forro para ver o interior de cima. */
  const cutawayBtn = $<HTMLButtonElement>('btn-cutaway');
  function setCutaway(on: boolean) {
    world.setCutaway(on);
    cutawayBtn.setAttribute('aria-pressed', String(on));
  }
  const CUTAWAY_VIEW = { pos: new THREE.Vector3(1.6, 8.2, 3.8), target: new THREE.Vector3(-2.6, 0.9, -1.7) };

  function selectComponent(value: string) {
    const interior = value.startsWith('in:');
    const id = interior ? value.slice(3) : value;
    const it = world.find(id, interior);
    if (!it) return;
    setCutaway(interior);
    showInfo(id);
    compSelect.value = value;
    highlight.box.copy(it.focus);
    highlight.visible = true;
    insp.focusBox(it.focus, interior);
  }

  // --- modos ----------------------------------------------------------------------------------
  function setMode(next: Mode) {
    if (next === mode) return;
    if (mode === 'visit') fp.disable();
    if (mode === 'inspect') {
      insp.disable();
      highlight.visible = false;
      setCutaway(false);
    }
    if (mode === 'tour') tour.stop();
    mode = next;
    hud.setMode(next);
    hud.setSettings(false);
    clearInfo();
    hud.setLockHint(false);

    if (next === 'visit') {
      fp.reset();
      fp.enable();
      hud.setLockHint(!fp.locked);
    } else if (next === 'inspect') {
      insp.controls.target.set(1, 12, -1);
      insp.enable(true);
    } else if (next === 'tour') {
      tourEnded = false;
      tour.start(camera, 0);
      hud.tourPlaying(false);
    }
  }

  fp.onLockChange = (locked) => hud.setLockHint(mode === 'visit' && !locked);

  $('btn-visit').addEventListener('click', () => {
    setMode('visit');
    // o clique do botão é um gesto do usuário válido para pedir o bloqueio do mouse
    void Promise.resolve(canvas.requestPointerLock?.() as unknown).catch(() => {});
  });
  $('btn-inspect').addEventListener('click', () => setMode('inspect'));
  $('btn-tour').addEventListener('click', () => setMode('tour'));
  document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((b) => {
    b.addEventListener('click', () => {
      setMode(b.dataset.mode as Mode);
      if (b.dataset.mode === 'visit') canvas.focus();
    });
  });

  function resetView() {
    if (mode === 'visit') {
      fp.reset();
      hud.toast('Posição inicial');
    } else if (mode === 'inspect') {
      insp.overview(true);
      clearInfo();
    } else if (mode === 'tour') {
      tourEnded = false;
      tour.restart();
      hud.tourPlaying(false);
    } else {
      return;
    }
  }
  $('btn-home').addEventListener('click', resetView);
  // volta à tela inicial, que mostra a estação girando ao fundo
  function goToMenu() {
    hud.setUiHidden(false);
    hud.setHelp(false);
    setMode('menu');
  }
  $('btn-menu').addEventListener('click', goToMenu);
  $('btn-overview').addEventListener('click', () => {
    insp.overview(true);
    clearInfo();
    setCutaway(false);
  });
  cutawayBtn.addEventListener('click', () => {
    const on = !world.cutaway;
    setCutaway(on);
    clearInfo();
    if (on) insp.flyTo(CUTAWAY_VIEW.pos, CUTAWAY_VIEW.target, 1.4);
  });

  // --- interação em primeira pessoa --------------------------------------------------------------------
  const ray = new THREE.Raycaster();
  ray.layers.set(1);
  const centre = new THREE.Vector2(0, 0);
  let aimId: string | null = null;
  let aimTimer = 0;

  function aim(): string | null {
    camera.updateMatrixWorld();
    ray.setFromCamera(centre, camera);
    // dentro do abrigo só contam o interior e a porta; fora, só o exterior (o raio atravessa paredes)
    const inside = world.isInsideShelter(camera.position.x, camera.position.z);
    for (const hit of ray.intersectObjects(world.proxyObjects, false)) {
      const id = hit.object.userData.id as string;
      const interior = hit.object.userData.interior === true;
      if (inside ? !(interior || id === 'shelterDoor') : interior) continue;
      const it = world.find(id, interior);
      return it && hit.distance <= it.maxDist ? id : null;
    }
    return null;
  }

  function promptFor(id: string): string {
    if (id === 'gate') return world.gate.target > 0.5 ? 'E · Fechar portão' : 'E · Abrir portão';
    if (id === 'shelterDoor') return world.door.target > 0.5 ? 'E · Fechar porta do abrigo' : 'E · Abrir porta do abrigo';
    return `E · ${EQUIPMENT[id].name}`;
  }

  function interact() {
    if (mode !== 'visit') return;
    const id = aim();
    if (!id) {
      clearInfo();
      return;
    }
    if (id === 'gate') {
      const open = world.gate.toggle();
      hud.toast(open ? 'Portão abrindo' : 'Portão fechando');
      showInfo('gate');
      return;
    }
    if (id === 'shelterDoor') {
      const open = world.door.toggle();
      hud.toast(open ? 'Porta do abrigo abrindo' : 'Porta do abrigo fechando');
      showInfo('shelterDoor');
      return;
    }
    if (infoId === id) clearInfo();
    else showInfo(id);
  }

  // --- inspeção: clicar para selecionar --------------------------------------------------------------------
  let down: { x: number; y: number } | null = null;
  canvas.addEventListener('pointerdown', (e) => {
    down = { x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener('pointerup', (e) => {
    if (mode !== 'inspect' || !down || e.button !== 0) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = null;
    if (moved > 5) return; // foi um arraste de câmera, não um clique
    const ndc = new THREE.Vector2((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    camera.updateMatrixWorld();
    ray.setFromCamera(ndc, camera);
    // com o corte ativo, a caixa do abrigo inteiro ficaria na frente dos itens internos
    const hits = ray.intersectObjects(world.proxyObjects, false).filter((h) => {
      const interior = h.object.userData.interior === true;
      return world.cutaway ? interior || h.object.userData.id !== 'shelter' : !interior;
    });
    const hit = hits[0];
    if (hit) selectComponent(`${hit.object.userData.interior === true ? 'in:' : ''}${hit.object.userData.id as string}`);
    else clearInfo();
  });
  compSelect.addEventListener('change', () => {
    if (compSelect.value) selectComponent(compSelect.value);
    else clearInfo();
  });
  $('info-close').addEventListener('click', clearInfo);

  // --- apresentação guiada ------------------------------------------------------------------------------------------
  tour.onStep = (step, i) => {
    hud.tourStep(step, i, TOUR_STEPS.length);
    tourEnded = false;
    hud.tourPlaying(tour.paused);
  };
  tour.onArrive = (step) => {
    if (step.onArrive === 'openGate') world.gate.target = 1;
    if (step.onArrive === 'closeGate') {
      world.gate.target = 0;
      world.door.target = 0;
    }
    if (step.onArrive === 'openShelterDoor') world.door.target = 1;
    if (step.onArrive === 'closeShelterDoor') world.door.target = 0;
  };
  tour.onEnd = () => {
    tourEnded = true;
    $('tour-play').textContent = 'Rever';
    hud.toast('Apresentação concluída');
  };
  $('tour-play').addEventListener('click', () => {
    if (tourEnded) {
      tourEnded = false;
      tour.restart();
      return;
    }
    hud.tourPlaying(tour.togglePause());
  });
  $('tour-next').addEventListener('click', () => tour.next());
  $('tour-prev').addEventListener('click', () => tour.prev());
  $('tour-restart').addEventListener('click', () => {
    tourEnded = false;
    tour.restart();
    hud.tourPlaying(false);
  });

  // --- ajustes, ajuda, tela cheia, ocultar interface ----------------------------------------------------------------------
  $('btn-settings').addEventListener('click', () => hud.setSettings(!hud.settingsOpen));
  $<HTMLSelectElement>('quality').addEventListener('change', (e) => applyQuality((e.target as HTMLSelectElement).value as QualityKey, world));
  const az = $<HTMLInputElement>('sun-az');
  const el = $<HTMLInputElement>('sun-el');
  const onSun = () => world.env.setSun(Number(az.value), Number(el.value));
  az.addEventListener('input', onSun);
  el.addEventListener('input', onSun);
  $<HTMLInputElement>('night').addEventListener('change', (e) => world.env.setNight((e.target as HTMLInputElement).checked));
  $('btn-help').addEventListener('click', () => hud.setHelp(true));
  $('help-close').addEventListener('click', () => hud.setHelp(false));
  $('btn-hide').addEventListener('click', () => hud.setUiHidden(true));
  $('unhide').addEventListener('click', () => hud.setUiHidden(false));

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      hud.toast('Tela cheia não é suportada neste navegador');
    }
  }
  $('btn-fs').addEventListener('click', () => void toggleFullscreen());

  window.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement | null;
    const typing = !!t && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName);
    if (e.key === 'Escape') {
      if (hud.helpOpen) hud.setHelp(false);
      else if (hud.settingsOpen) hud.setSettings(false);
      else if (hud.infoOpen) clearInfo();
      return;
    }
    if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
    if (mode === 'menu') return;
    if (e.key === '?') {
      hud.setHelp(!hud.helpOpen);
      return;
    }
    switch (e.code) {
      case 'Digit1':
        setMode('visit');
        break;
      case 'Digit2':
        setMode('inspect');
        break;
      case 'Digit3':
        setMode('tour');
        break;
      case 'KeyE':
        interact();
        break;
      case 'KeyF':
        void toggleFullscreen();
        break;
      case 'KeyR':
        resetView();
        break;
      case 'KeyM':
        goToMenu();
        break;
      case 'KeyH':
        hud.setUiHidden(!hud.uiHidden);
        break;
      case 'Space':
        if (mode === 'tour') {
          e.preventDefault();
          $('tour-play').click();
        }
        break;
      case 'ArrowRight':
        if (mode === 'tour') tour.next();
        break;
      case 'ArrowLeft':
        if (mode === 'tour') tour.prev();
        break;
    }
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    applyQuality(quality);
  });

  // --- laço de render --------------------------------------------------------------------------------------------------------------
  let raf = 0;
  function frame() {
    raf = requestAnimationFrame(frame);
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.1);
    const t = timer.getElapsed();
    world.update(dt, t);
    switch (mode) {
      case 'menu':
        // a tela inicial mostra a própria estação em órbita lenta
        menuAngle += dt * 0.05;
        camera.position.set(Math.cos(menuAngle) * 38, 13 + Math.sin(t * 0.2) * 1.5, Math.sin(menuAngle) * 30);
        camera.lookAt(1, 7, -1);
        break;
      case 'visit':
        fp.update(dt);
        aimTimer -= dt;
        if (aimTimer <= 0) {
          aimTimer = 0.1;
          const id = aim();
          if (id !== aimId || ((id === 'gate' || id === 'shelterDoor') && !hud.uiHidden)) {
            aimId = id;
            hud.setPrompt(id ? promptFor(id) : null);
          }
        }
        break;
      case 'inspect':
        insp.update(dt);
        break;
      case 'tour':
        tour.update(dt);
        break;
    }
    if (fx?.enabled) fx.render(dt);
    else renderer.render(world.scene, camera);
  }

  $('loading').hidden = true;
  hud.setMode('menu');
  frame();

  // Gancho de verificação: amostra o percurso guiado contra as colisões (usado nos testes).
  (window as unknown as { __erb: unknown }).__erb = {
    world,
    camera,
    tour,
    fp,
    setMode,
    renderer,
    get fx() {
      return fx;
    },
    verifyTour() {
      world.gate.target = 1;
      world.gate.update(10);
      world.door.target = 1;
      world.door.update(10);
      const issues = new Map<string, string>();
      for (const s of GuidedTour.samplePath()) {
        const hit = world.collision.hitsSphere(s.pos.x, s.pos.y, s.pos.z, PLAYER_RADIUS + 0.05);
        if (hit && !issues.has(`${s.step}`)) {
          issues.set(`${s.step}`, `passo ${s.step + 1} em (${s.pos.x.toFixed(1)}, ${s.pos.y.toFixed(1)}, ${s.pos.z.toFixed(1)}): ${hit}`);
        }
      }
      world.gate.target = 0;
      world.gate.update(10);
      world.door.target = 0;
      world.door.update(10);
      return [...issues.values()];
    },
  };

  import.meta.hot?.dispose(() => {
    cancelAnimationFrame(raf);
    insp.dispose();
    fx?.dispose();
    world.dispose();
    renderer.dispose();
  });
}

// Mostra a tela de carregamento antes da montagem, que gera texturas de forma síncrona.
requestAnimationFrame(() => requestAnimationFrame(boot));
