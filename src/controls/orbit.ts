import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export const OVERVIEW = {
  position: new THREE.Vector3(27, 15, 33),
  target: new THREE.Vector3(1, 12, -1),
};

interface Tween {
  t: number;
  dur: number;
  fromPos: THREE.Vector3;
  toPos: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
}

/** Inspeção técnica: câmera orbital com zoom, deslocamento e enquadramento animado. */
export class InspectionControls {
  readonly controls: OrbitControls;
  private tween: Tween | null = null;

  constructor(
    private camera: THREE.PerspectiveCamera,
    dom: HTMLElement,
  ) {
    this.controls = new OrbitControls(camera, dom);
    const c = this.controls;
    c.enableDamping = true;
    c.dampingFactor = 0.08;
    c.minDistance = 2.5;
    c.maxDistance = 85;
    c.maxPolarAngle = Math.PI / 2 - 0.03; // não deixa a câmera passar para baixo do piso
    c.screenSpacePanning = true;
    c.zoomToCursor = true;
    c.enabled = false;
  }

  enable(animate: boolean) {
    this.controls.enabled = true;
    if (animate) this.overview(true);
    else this.controls.update();
  }

  disable() {
    this.controls.enabled = false;
    this.tween = null;
  }

  overview(animate = true) {
    this.flyTo(OVERVIEW.position, OVERVIEW.target, animate ? 1.6 : 0);
  }

  /**
   * Enquadra uma caixa mantendo a direção de visão atual. Com `fromAbove`, a câmera vem de
   * cima e do sudeste (usado no corte do abrigo, onde uma vista rasante bateria nas paredes).
   */
  focusBox(box: THREE.Box3, fromAbove = false) {
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const radius = Math.max(size.x, size.y, size.z) * 0.5;
    const dist = THREE.MathUtils.clamp(radius / Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * 1.25 + 2, fromAbove ? 4 : 5, 60);
    const dir = fromAbove
      ? new THREE.Vector3(0.4, 1, 0.55).normalize()
      : this.camera.position.clone().sub(this.controls.target).normalize();
    if (!fromAbove) dir.y = Math.max(dir.y, 0.12);
    dir.normalize();
    this.flyTo(center.clone().addScaledVector(dir, dist), center, 1.1);
  }

  flyTo(pos: THREE.Vector3, target: THREE.Vector3, dur: number) {
    if (dur <= 0) {
      this.camera.position.copy(pos);
      this.controls.target.copy(target);
      this.controls.update();
      this.tween = null;
      return;
    }
    this.tween = {
      t: 0,
      dur,
      fromPos: this.camera.position.clone(),
      toPos: pos.clone(),
      fromTarget: this.controls.target.clone(),
      toTarget: target.clone(),
    };
  }

  update(dt: number) {
    if (!this.controls.enabled) return;
    if (this.tween) {
      const tw = this.tween;
      tw.t = Math.min(tw.dur, tw.t + dt);
      const u = tw.t / tw.dur;
      const k = u * u * (3 - 2 * u);
      this.camera.position.lerpVectors(tw.fromPos, tw.toPos, k);
      this.controls.target.lerpVectors(tw.fromTarget, tw.toTarget, k);
      if (tw.t >= tw.dur) this.tween = null;
    }
    this.controls.target.y = Math.max(0, this.controls.target.y);
    this.controls.update();
  }

  dispose() {
    this.controls.dispose();
  }
}
