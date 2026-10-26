import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';

type Quality = 'low' | 'medium' | 'high';

/**
 * Oclusão ambiental (GTAO) por pós-processamento. Escurece cantos e encontros de peças,
 * o que dá volume a equipamentos claros. Só é usada na qualidade Alta.
 *
 * Objetos marcados com `userData.noAO` (tela do alambrado, sombras de contato, colinas,
 * céu) ficam fora do passe de normais: a tela é translúcida, mas o passe a trataria como
 * parede opaca e escureceria tudo atrás dela.
 */
export class PostFx {
  enabled = false;
  private composer: EffectComposer;
  private gtao: GTAOPass;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    const size = renderer.getSize(new THREE.Vector2());
    const pr = renderer.getPixelRatio();
    // MSAA no alvo de render preserva o antialiasing que se perderia ao usar o compositor
    const target = new THREE.WebGLRenderTarget(size.x * pr, size.y * pr, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(renderer, target);
    this.composer.addPass(new RenderPass(scene, camera));

    this.gtao = new GTAOPass(scene, camera, size.x, size.y);
    this.gtao.output = GTAOPass.OUTPUT.Default;
    this.gtao.blendIntensity = 1;

    // o GTAOPass só esconde pontos e linhas; estendemos para os objetos marcados
    const pass = this.gtao as unknown as { _overrideVisibility(): void; _visibilityCache: THREE.Object3D[] };
    pass._overrideVisibility = function (this: typeof pass & { scene: THREE.Scene }) {
      const cache = this._visibilityCache;
      this.scene.traverse((o) => {
        const hide = (o as THREE.Points).isPoints || (o as THREE.Line).isLine || o.userData.noAO === true;
        if (hide && o.visible) {
          o.visible = false;
          cache.push(o);
        }
      });
    };

    this.composer.addPass(this.gtao);
    this.composer.addPass(new OutputPass());
    this.setQuality('medium');
  }

  setQuality(q: Quality) {
    // Só na qualidade Alta: medido, o passe custa cerca de 30 ms por quadro em GPU modesta
    this.enabled = q === 'high';
    this.gtao.updateGtaoMaterial({
      radius: 0.55,
      distanceExponent: 1.3,
      thickness: 1.2,
      scale: 1.1,
      samples: 12,
    });
  }

  setSize(width: number, height: number, pixelRatio: number) {
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(width, height);
  }

  render(dt: number) {
    this.composer.render(dt);
  }

  dispose() {
    this.composer.dispose();
    this.gtao.dispose();
  }
}
