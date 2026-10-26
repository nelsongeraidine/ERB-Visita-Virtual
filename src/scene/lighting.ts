import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import type { Mats } from './materials';

const DAY_FOG = 0xcdd8e2;
const NIGHT_BG = 0x070b14;

function dirFrom(az: number, el: number): THREE.Vector3 {
  // az: 0 = norte (-Z), 90 = leste (+X); el: elevação em graus
  const a = THREE.MathUtils.degToRad(az);
  const e = THREE.MathUtils.degToRad(el);
  return new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e));
}

export class Environment {
  azimuth = 235; // sudoeste: ilumina as faces sul e oeste, como na imagem de referência
  elevation = 46;
  night = false;

  private sky = new Sky();
  private envSky = new Sky();
  private envScene = new THREE.Scene();
  private pmrem: THREE.PMREMGenerator;
  private envTarget: THREE.WebGLRenderTarget | null = null;
  private sun = new THREE.DirectionalLight(0xfff1dc, 3.2);
  private hemi = new THREE.HemisphereLight(0xdde1e6, 0x8c8472, 0.25);
  private lampLights: THREE.PointLight[] = [];
  private beaconLight = new THREE.PointLight(0xff2020, 0, 9, 2);
  private envTimer: number | undefined;

  constructor(
    private scene: THREE.Scene,
    private renderer: THREE.WebGLRenderer,
    private M: Mats,
    lampPositions: THREE.Vector3[],
    beaconPos: THREE.Vector3,
  ) {
    // Neutral (Khronos) preserva cor e contraste de materiais claros; ACES os desbotava
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 0.9;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    for (const s of [this.sky, this.envSky]) {
      s.scale.setScalar(1000);
      const u = s.material.uniforms;
      u.turbidity.value = 3.5;
      u.rayleigh.value = 1.1;
      u.mieCoefficient.value = 0.004;
      u.mieDirectionalG.value = 0.82;
    }
    this.envScene.add(this.envSky);
    this.sky.userData.noAO = true;
    scene.add(this.sky);

    this.sun.castShadow = true;
    this.sun.shadow.camera.left = -26;
    this.sun.shadow.camera.right = 26;
    this.sun.shadow.camera.top = 26;
    this.sun.shadow.camera.bottom = -26;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 160;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.03;
    this.sun.target.position.set(0, 6, 0);
    scene.add(this.sun, this.sun.target, this.hemi);

    for (const p of lampPositions) {
      const l = new THREE.PointLight(0xffd9a0, 0, 15, 2);
      l.position.copy(p);
      this.lampLights.push(l);
      scene.add(l);
    }
    this.beaconLight.position.copy(beaconPos);
    scene.add(this.beaconLight);

    scene.fog = new THREE.Fog(DAY_FOG, 260, 1700);
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.apply();
  }

  setSun(azimuth: number, elevation: number) {
    this.azimuth = azimuth;
    this.elevation = elevation;
    this.apply();
  }

  setNight(on: boolean) {
    this.night = on;
    this.apply();
  }

  setShadowMapSize(size: number) {
    this.sun.shadow.mapSize.set(size, size);
    this.sun.shadow.map?.dispose();
    this.sun.shadow.map = null;
  }

  private apply() {
    const day = !this.night;
    const d = dirFrom(this.azimuth, this.elevation);
    this.sun.position.copy(this.sun.target.position).addScaledVector(d, 80);
    this.sky.visible = day;
    if (day) {
      this.sun.color.set(0xffeacc);
      // sol baixo perde intensidade e esquenta a cor
      const k = THREE.MathUtils.clamp(this.elevation / 40, 0.25, 1);
      this.sun.intensity = 3.4 * k;
      this.sun.color.lerp(new THREE.Color(0xffb878), 1 - k);
      // O mapa de céu (HDR) é muito intenso e azul: serve só de reflexo nos metais. O
      // preenchimento das sombras vem do hemisférico neutro-quente, que controla o tom.
      this.hemi.intensity = 1.15;
      this.scene.background = null;
      (this.scene.fog as THREE.Fog).color.set(DAY_FOG);
      this.scene.environmentIntensity = 0.06;
      this.renderer.toneMappingExposure = 0.9;
      this.scheduleEnv();
    } else {
      // luar fixo, discreto
      this.sun.color.set(0x8aa0d0);
      this.sun.intensity = 0.35;
      this.sun.position.copy(this.sun.target.position).addScaledVector(dirFrom(130, 48), 80);
      this.hemi.intensity = 0.08;
      this.scene.background = new THREE.Color(NIGHT_BG);
      (this.scene.fog as THREE.Fog).color.set(NIGHT_BG);
      this.scene.environmentIntensity = 0.07;
      this.renderer.toneMappingExposure = 1.0;
    }
    this.M.lampOff.emissiveIntensity = day ? 0 : 2.4;
    for (const l of this.lampLights) l.intensity = day ? 0 : 14;
    this.beaconLight.intensity = 0;
  }

  /** Regenera o ambiente (reflexos) com atraso, para não travar enquanto se arrasta o controle. */
  private scheduleEnv() {
    window.clearTimeout(this.envTimer);
    this.envTimer = window.setTimeout(() => this.rebuildEnv(), 120);
  }

  private rebuildEnv() {
    const u = this.envSky.material.uniforms;
    u.sunPosition.value.copy(dirFrom(this.azimuth, this.elevation));
    this.sky.material.uniforms.sunPosition.value.copy(u.sunPosition.value);
    const next = this.pmrem.fromScene(this.envScene, 0, 0.1, 2000);
    this.envTarget?.dispose();
    this.envTarget = next;
    this.scene.environment = next.texture;
  }

  /** Pisca do sinalizador de obstáculo (aprox. 1 Hz; ritmo real depende de norma, não modelado). */
  update(t: number) {
    const on = Math.floor(t * 1.2) % 2 === 0;
    this.M.beacon.emissiveIntensity = on ? 2.6 : 0.15;
    this.beaconLight.intensity = this.night && on ? 4 : 0;
  }

  dispose() {
    window.clearTimeout(this.envTimer);
    this.envTarget?.dispose();
    this.pmrem.dispose();
  }
}
