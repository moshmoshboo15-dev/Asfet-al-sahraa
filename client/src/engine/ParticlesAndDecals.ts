import * as THREE from 'three';
import type { QualityTier } from '@shared/types';
import type { SurfaceType } from './AudioEngine';

interface ActiveParticle {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  age: number;
  maxAge: number;
  sizeStart: number;
  sizeEnd: number;
  gravity: number;
  color: THREE.Color;
  alphaStart: number;
}

interface ShellCasing {
  active: boolean;
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  angVel: THREE.Vector3;
  age: number;
  maxAge: number;
}

interface TracerBeam {
  active: boolean;
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  age: number;
  maxAge: number;
}

interface DecalSlot {
  mesh: THREE.Mesh;
}

export class ParticlesAndDecals {
  private scene: THREE.Scene;
  private particles: ActiveParticle[] = [];
  private particlePoints: THREE.Points;
  private posAttr: THREE.BufferAttribute;
  private colorAttr: THREE.BufferAttribute;
  private maxParticles = 220;

  private shells: ShellCasing[] = [];
  private tracers: TracerBeam[] = [];
  private decals: DecalSlot[] = [];
  private decalCursor = 0;

  private ambientMotes: THREE.Points;
  private motePositions: Float32Array;
  private moteCount = 160;
  private densityMultiplier = 1.0;

  private _tmpColor = new THREE.Color();

  constructor(scene: THREE.Scene, softSprite: THREE.Texture, particleQuality: QualityTier) {
    this.scene = scene;
    this.setParticleDensity(particleQuality);

    // 1. Pooled billboard burst particles (smoke, dust, sparks, mud)
    const positions = new Float32Array(this.maxParticles * 3);
    const colors = new Float32Array(this.maxParticles * 3);
    for (let i = 0; i < this.maxParticles; i++) {
      positions[i * 3 + 1] = -9999;
      this.particles.push({
        active: false,
        pos: new THREE.Vector3(0, -9999, 0),
        vel: new THREE.Vector3(),
        age: 0,
        maxAge: 1,
        sizeStart: 0.2,
        sizeEnd: 0.6,
        gravity: 0,
        color: new THREE.Color(1, 1, 1),
        alphaStart: 1,
      });
    }

    const pGeo = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(positions, 3);
    this.colorAttr = new THREE.BufferAttribute(colors, 3);
    pGeo.setAttribute('position', this.posAttr);
    pGeo.setAttribute('color', this.colorAttr);

    const pMat = new THREE.PointsMaterial({
      size: 0.42,
      map: softSprite,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.NormalBlending,
      sizeAttenuation: true,
    });
    this.particlePoints = new THREE.Points(pGeo, pMat);
    this.particlePoints.frustumCulled = false;
    this.scene.add(this.particlePoints);

    // 2. Pooled brass shell casings
    const shellGeo = new THREE.CylinderGeometry(0.008, 0.009, 0.048, 7);
    const shellMat = new THREE.MeshStandardMaterial({
      color: 0xd4a64a,
      metalness: 0.88,
      roughness: 0.26,
    });
    for (let i = 0; i < 16; i++) {
      const mesh = new THREE.Mesh(shellGeo, shellMat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.shells.push({
        active: false,
        mesh,
        vel: new THREE.Vector3(),
        angVel: new THREE.Vector3(),
        age: 0,
        maxAge: 3.5,
      });
    }

    // 3. Pooled bullet tracers
    const tracerGeo = new THREE.BoxGeometry(0.025, 0.025, 2.2);
    const tracerMat = new THREE.MeshBasicMaterial({
      color: 0xffd580,
      transparent: true,
      opacity: 0.85,
    });
    for (let i = 0; i < 12; i++) {
      const mesh = new THREE.Mesh(tracerGeo, tracerMat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.tracers.push({
        active: false,
        mesh,
        vel: new THREE.Vector3(),
        age: 0,
        maxAge: 0.35,
      });
    }

    // 4. Pooled impact decals (polygonOffset avoids Z-fighting)
    const decalGeo = new THREE.CircleGeometry(0.09, 8);
    const decalMat = new THREE.MeshBasicMaterial({
      color: 0x171411,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    for (let i = 0; i < 36; i++) {
      const mesh = new THREE.Mesh(decalGeo, decalMat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.decals.push({ mesh });
    }

    // 5. Atmospheric drifting ash & ember motes
    this.motePositions = new Float32Array(this.moteCount * 3);
    const moteColors = new Float32Array(this.moteCount * 3);
    for (let i = 0; i < this.moteCount; i++) {
      this.motePositions[i * 3] = (Math.random() - 0.5) * 60;
      this.motePositions[i * 3 + 1] = 0.4 + Math.random() * 7;
      this.motePositions[i * 3 + 2] = (Math.random() - 0.5) * 60;
      const isEmber = i % 5 === 0;
      moteColors[i * 3] = isEmber ? 1.0 : 0.72;
      moteColors[i * 3 + 1] = isEmber ? 0.52 : 0.68;
      moteColors[i * 3 + 2] = isEmber ? 0.18 : 0.62;
    }
    const moteGeo = new THREE.BufferGeometry();
    moteGeo.setAttribute('position', new THREE.BufferAttribute(this.motePositions, 3));
    moteGeo.setAttribute('color', new THREE.BufferAttribute(moteColors, 3));
    const moteMat = new THREE.PointsMaterial({
      size: 0.12,
      map: softSprite,
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.ambientMotes = new THREE.Points(moteGeo, moteMat);
    this.ambientMotes.frustumCulled = false;
    this.scene.add(this.ambientMotes);
  }

  public setParticleDensity(quality: QualityTier): void {
    this.densityMultiplier = quality === 'low' ? 0.35 : quality === 'medium' ? 0.68 : 1.0;
    if (this.ambientMotes) {
      this.ambientMotes.visible = quality !== 'low';
    }
  }

  public spawnMuzzleSmoke(worldPos: THREE.Vector3, forward: THREE.Vector3): void {
    const count = Math.max(2, Math.round(6 * this.densityMultiplier));
    for (let i = 0; i < count; i++) {
      const p = this.allocParticle();
      if (!p) break;
      p.pos.copy(worldPos);
      p.vel
        .copy(forward)
        .multiplyScalar(2.4 + Math.random() * 2.5)
        .addScaledVector(THREE.Object3D.DEFAULT_UP, 0.35 + Math.random() * 0.45);
      p.vel.x += (Math.random() - 0.5) * 0.75;
      p.vel.z += (Math.random() - 0.5) * 0.75;
      p.age = 0;
      p.maxAge = 0.45 + Math.random() * 0.35;
      p.gravity = -0.35;
      p.color.setRGB(0.75, 0.72, 0.68);
      p.alphaStart = 0.75;
    }
  }

  public spawnImpactBurst(point: THREE.Vector3, normal: THREE.Vector3, surface: SurfaceType): void {
    const baseCount = surface === 'metal' ? 10 : 8;
    const count = Math.max(2, Math.round(baseCount * this.densityMultiplier));
    for (let i = 0; i < count; i++) {
      const p = this.allocParticle();
      if (!p) break;
      p.pos.copy(point).addScaledVector(normal, 0.04);
      p.vel.copy(normal).multiplyScalar(2.2 + Math.random() * 3.8);
      p.vel.x += (Math.random() - 0.5) * 3.2;
      p.vel.y += Math.random() * 2.4;
      p.vel.z += (Math.random() - 0.5) * 3.2;
      p.age = 0;
      p.maxAge = surface === 'metal' ? 0.25 + Math.random() * 0.2 : 0.4 + Math.random() * 0.35;
      p.gravity = 9.5;

      if (surface === 'metal') {
        p.color.setRGB(1.0, 0.72 + Math.random() * 0.25, 0.25);
      } else if (surface === 'wood') {
        p.color.setRGB(0.62, 0.46, 0.28);
      } else if (surface === 'concrete') {
        p.color.setRGB(0.72, 0.71, 0.68);
      } else {
        p.color.setRGB(0.32, 0.25, 0.19);
      }
    }

    // Place decal aligned with surface normal
    const slot = this.decals[this.decalCursor];
    this.decalCursor = (this.decalCursor + 1) % this.decals.length;
    slot.mesh.position.copy(point).addScaledVector(normal, 0.015);
    const lookTarget = point.clone().add(normal);
    slot.mesh.lookAt(lookTarget);
    slot.mesh.rotateZ(Math.random() * Math.PI * 2);
    const scale = 0.7 + Math.random() * 0.55;
    slot.mesh.scale.set(scale, scale, 1);
    slot.mesh.visible = true;
  }

  public spawnShellCasing(origin: THREE.Vector3, right: THREE.Vector3, up: THREE.Vector3): void {
    const slot = this.shells.find((s) => !s.active);
    if (!slot) return;
    slot.active = true;
    slot.age = 0;
    slot.mesh.visible = true;
    slot.mesh.position.copy(origin);
    slot.mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    slot.vel
      .copy(right)
      .multiplyScalar(1.8 + Math.random() * 0.6)
      .addScaledVector(up, 1.5 + Math.random() * 0.5);
    slot.angVel.set(
      (Math.random() - 0.5) * 18,
      (Math.random() - 0.5) * 18,
      (Math.random() - 0.5) * 18,
    );
  }

  public spawnTracer(start: THREE.Vector3, end: THREE.Vector3): void {
    const slot = this.tracers.find((t) => !t.active);
    if (!slot) return;
    const dir = end.clone().sub(start);
    const dist = dir.length();
    if (dist < 1) return;
    dir.normalize();
    slot.active = true;
    slot.age = 0;
    slot.maxAge = Math.min(0.28, dist / 240);
    slot.mesh.visible = true;
    slot.mesh.position.copy(start).addScaledVector(dir, 1.4);
    slot.mesh.lookAt(end);
    slot.vel.copy(dir).multiplyScalar(240);
  }

  private allocParticle(): ActiveParticle | null {
    for (let i = 0; i < this.particles.length; i++) {
      if (!this.particles[i].active) {
        this.particles[i].active = true;
        return this.particles[i];
      }
    }
    return null;
  }

  public update(dt: number, playerPos: THREE.Vector3, groundHeightAt: (x: number, z: number) => number): void {
    // Update pooled particles
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      p.age += dt;
      if (p.age >= p.maxAge) {
        p.active = false;
        this.posAttr.setXYZ(i, 0, -9999, 0);
        continue;
      }
      p.vel.y -= p.gravity * dt;
      p.vel.multiplyScalar(1 - Math.min(0.9, dt * 1.4));
      p.pos.addScaledVector(p.vel, dt);
      const fade = 1 - p.age / p.maxAge;
      this._tmpColor.copy(p.color).multiplyScalar(fade);
      this.posAttr.setXYZ(i, p.pos.x, p.pos.y, p.pos.z);
      this.colorAttr.setXYZ(i, this._tmpColor.r, this._tmpColor.g, this._tmpColor.b);
    }
    this.posAttr.needsUpdate = true;
    this.colorAttr.needsUpdate = true;

    // Update brass shell casings
    for (let i = 0; i < this.shells.length; i++) {
      const s = this.shells[i];
      if (!s.active) continue;
      s.age += dt;
      if (s.age >= s.maxAge) {
        s.active = false;
        s.mesh.visible = false;
        continue;
      }
      s.vel.y -= 9.8 * dt;
      s.mesh.position.addScaledVector(s.vel, dt);
      s.mesh.rotation.x += s.angVel.x * dt;
      s.mesh.rotation.y += s.angVel.y * dt;
      s.mesh.rotation.z += s.angVel.z * dt;
      const floorY = groundHeightAt(s.mesh.position.x, s.mesh.position.z) + 0.015;
      if (s.mesh.position.y < floorY) {
        s.mesh.position.y = floorY;
        s.vel.y = Math.abs(s.vel.y) * 0.35;
        s.vel.x *= 0.65;
        s.vel.z *= 0.65;
        s.angVel.multiplyScalar(0.5);
      }
    }

    // Update tracers
    for (let i = 0; i < this.tracers.length; i++) {
      const tr = this.tracers[i];
      if (!tr.active) continue;
      tr.age += dt;
      if (tr.age >= tr.maxAge) {
        tr.active = false;
        tr.mesh.visible = false;
        continue;
      }
      tr.mesh.position.addScaledVector(tr.vel, dt);
    }

    // Drift ambient ash/embers around player
    const attr = this.ambientMotes.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < this.moteCount; i++) {
      let x = this.motePositions[i * 3] + dt * (1.2 + (i % 3) * 0.3);
      let y = this.motePositions[i * 3 + 1] + dt * (i % 5 === 0 ? 0.45 : -0.18);
      let z = this.motePositions[i * 3 + 2] + Math.sin(i + performance.now() * 0.001) * dt * 0.35;
      if (x - playerPos.x > 30) x -= 60;
      if (x - playerPos.x < -30) x += 60;
      if (z - playerPos.z > 30) z -= 60;
      if (z - playerPos.z < -30) z += 60;
      if (y < 0.2) y = 6.8;
      if (y > 7.5) y = 0.4;
      this.motePositions[i * 3] = x;
      this.motePositions[i * 3 + 1] = y;
      this.motePositions[i * 3 + 2] = z;
      attr.setXYZ(i, x, y, z);
    }
    attr.needsUpdate = true;
  }

  public dispose(): void {
    this.particlePoints.geometry.dispose();
    (this.particlePoints.material as THREE.Material).dispose();
    this.ambientMotes.geometry.dispose();
    (this.ambientMotes.material as THREE.Material).dispose();
    for (const s of this.shells) {
      s.mesh.geometry.dispose();
      (s.mesh.material as THREE.Material).dispose();
      break;
    }
    for (const t of this.tracers) {
      t.mesh.geometry.dispose();
      (t.mesh.material as THREE.Material).dispose();
      break;
    }
    for (const d of this.decals) {
      d.mesh.geometry.dispose();
      (d.mesh.material as THREE.Material).dispose();
      break;
    }
  }
}
