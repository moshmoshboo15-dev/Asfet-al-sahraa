import * as THREE from 'three';
import { WW1_M14_TRENCH_RIFLE } from '@shared/weapons/ww1Rifles';
import type { ProceduralTextureSet } from './ProceduralTextures';
import type { AudioEngine } from './AudioEngine';
import type { ParticlesAndDecals } from './ParticlesAndDecals';
import type { TargetHitInfo } from './WW1TrenchMap';
import type { SurfaceType } from './AudioEngine';

export interface ShotResult {
  hitTarget: boolean;
  isCritical: boolean;
  damage: number | null;
  hitPoint: THREE.Vector3 | null;
}

export class FirstPersonRifle {
  public readonly root = new THREE.Group();
  public readonly stats = WW1_M14_TRENCH_RIFLE;

  public ammoInMag = WW1_M14_TRENCH_RIFLE.magSize;
  public ammoReserve = WW1_M14_TRENCH_RIFLE.reserveAmmo;
  public isReloading = false;
  public reloadTimer = 0;
  public isCyclingBolt = false;
  public boltTimer = 0;
  public adsBlend = 0;

  private weaponPivot = new THREE.Group();
  private boltAssembly = new THREE.Group();
  private boltHandleGroup = new THREE.Group();
  private stripperClipGroup = new THREE.Group();
  private rightHandGroup = new THREE.Group();
  private leftHandGroup = new THREE.Group();
  private muzzlePoint = new THREE.Object3D();
  private ejectPoint = new THREE.Object3D();
  private muzzleFlashMesh: THREE.Mesh;
  private muzzleLight: THREE.PointLight;

  private muzzleFlashTimer = 0;
  private recoilZ = 0;
  private recoilPitch = 0;
  private swayX = 0;
  private swayY = 0;
  private bobTime = 0;
  private reloadInsertPlayed = false;
  private reloadFinishPlayed = false;
  private shellEjectedThisCycle = false;

  private raycaster = new THREE.Raycaster();
  private _dir = new THREE.Vector3();
  private _muzzleWorld = new THREE.Vector3();
  private _ejectWorld = new THREE.Vector3();
  private _rightWorld = new THREE.Vector3();
  private _upWorld = new THREE.Vector3();
  private _camQuat = new THREE.Quaternion();

  // Hip & ADS local offsets relative to camera
  private readonly hipPos = new THREE.Vector3(0.21, -0.22, -0.44);
  private readonly adsPos = new THREE.Vector3(0.0, -0.132, -0.34);

  constructor(textures: ProceduralTextureSet) {
    const walnutMat = new THREE.MeshStandardMaterial({
      map: textures.walnutAlbedo,
      roughness: 0.58,
      metalness: 0.06,
    });
    const steelMat = new THREE.MeshStandardMaterial({
      map: textures.bluedSteelAlbedo,
      roughness: 0.28,
      metalness: 0.88,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xc99c47,
      roughness: 0.25,
      metalness: 0.9,
    });
    const woolMat = new THREE.MeshStandardMaterial({
      color: 0x4f4a37,
      roughness: 0.92,
      metalness: 0.02,
    });
    const leatherMat = new THREE.MeshStandardMaterial({
      color: 0x3b2619,
      roughness: 0.64,
      metalness: 0.08,
    });

    // 1. Walnut Rifle Stock (Buttstock + wrist + forend)
    const buttstock = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.115, 0.32), walnutMat);
    buttstock.position.set(0, -0.028, 0.22);
    buttstock.rotation.x = 0.08;
    this.weaponPivot.add(buttstock);

    const forend = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.062, 0.54), walnutMat);
    forend.position.set(0, -0.008, -0.24);
    this.weaponPivot.add(forend);

    const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.028, 0.36), walnutMat);
    handguard.position.set(0, 0.024, -0.22);
    this.weaponPivot.add(handguard);

    // 2. Brass Buttplate & Barrel Bands
    const buttplate = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.118, 0.015), brassMat);
    buttplate.position.set(0, -0.04, 0.38);
    this.weaponPivot.add(buttplate);

    for (const bz of [-0.14, -0.44]) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.068, 0.022), brassMat);
      band.position.set(0, 0.006, bz);
      this.weaponPivot.add(band);
    }

    // 3. Blued Steel Receiver & Fluted Barrel
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.048, 0.22), steelMat);
    receiver.position.set(0, 0.022, -0.01);
    this.weaponPivot.add(receiver);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.72, 12), steelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.03, -0.42);
    this.weaponPivot.add(barrel);

    const bayonetLug = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.024, 0.045), steelMat);
    bayonetLug.position.set(0, 0.01, -0.68);
    this.weaponPivot.add(bayonetLug);

    // 4. Iron Sights (Rear U-notch & Front Blade + Ears — aligned on X=0, Y=0.056)
    const rearBase = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.016, 0.045), steelMat);
    rearBase.position.set(0, 0.05, -0.11);
    this.weaponPivot.add(rearBase);

    for (const sx of [-0.009, 0.009]) {
      const rearEar = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.014, 0.014), steelMat);
      rearEar.position.set(sx, 0.061, -0.105);
      this.weaponPivot.add(rearEar);
    }

    const frontPost = new THREE.Mesh(new THREE.BoxGeometry(0.0032, 0.017, 0.012), steelMat);
    frontPost.position.set(0, 0.058, -0.74);
    this.weaponPivot.add(frontPost);

    for (const sx of [-0.011, 0.011]) {
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.02, 0.02), steelMat);
      guard.position.set(sx, 0.057, -0.74);
      this.weaponPivot.add(guard);
    }

    // 5. Reciprocating Bolt Assembly
    const boltBody = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.14, 10), steelMat);
    boltBody.rotation.x = Math.PI / 2;
    this.boltAssembly.add(boltBody);

    const boltStem = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.045, 8), steelMat);
    boltStem.rotation.z = Math.PI / 2;
    boltStem.position.set(0.024, -0.006, 0.03);
    this.boltHandleGroup.add(boltStem);

    const boltKnob = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 10), steelMat);
    boltKnob.position.set(0.046, -0.014, 0.03);
    this.boltHandleGroup.add(boltKnob);

    this.boltAssembly.add(this.boltHandleGroup);
    this.boltAssembly.position.set(0, 0.031, 0.01);
    this.weaponPivot.add(this.boltAssembly);

    // 6. Stripper Clip + 5 Brass Cartridges (visible during reload)
    const clipBar = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.008, 0.072), brassMat);
    clipBar.position.y = 0.035;
    this.stripperClipGroup.add(clipBar);
    for (let i = 0; i < 5; i++) {
      const round = new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0045, 0.056, 8), brassMat);
      round.rotation.x = Math.PI / 2;
      round.position.set(0, 0.01, -0.024 + i * 0.012);
      this.stripperClipGroup.add(round);
    }
    this.stripperClipGroup.position.set(0, 0.12, -0.01);
    this.stripperClipGroup.visible = false;
    this.weaponPivot.add(this.stripperClipGroup);

    // 7. Infantry Left & Right Arms (wool sleeves + leather gloves)
    const leftForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.046, 0.34, 10), woolMat);
    leftForearm.rotation.set(Math.PI / 2.2, 0, -0.45);
    leftForearm.position.set(-0.1, -0.09, -0.14);
    this.leftHandGroup.add(leftForearm);

    const leftGlove = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.052, 0.09), leatherMat);
    leftGlove.position.set(-0.005, -0.018, -0.26);
    this.leftHandGroup.add(leftGlove);
    this.weaponPivot.add(this.leftHandGroup);

    const rightForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.046, 0.32, 10), woolMat);
    rightForearm.rotation.set(Math.PI / 2.3, 0, 0.42);
    rightForearm.position.set(0.11, -0.1, 0.16);
    this.rightHandGroup.add(rightForearm);

    const rightGlove = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.05, 0.082), leatherMat);
    rightGlove.position.set(0.01, -0.022, 0.07);
    this.rightHandGroup.add(rightGlove);
    this.weaponPivot.add(this.rightHandGroup);

    // 8. Muzzle Flash & Point Light
    this.muzzlePoint.position.set(0, 0.032, -0.8);
    this.weaponPivot.add(this.muzzlePoint);

    this.ejectPoint.position.set(0.035, 0.045, 0.0);
    this.weaponPivot.add(this.ejectPoint);

    const flashGeo = new THREE.PlaneGeometry(0.28, 0.28);
    const flashMat = new THREE.MeshBasicMaterial({
      map: textures.particleSoft,
      color: 0xffc668,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.muzzleFlashMesh = new THREE.Mesh(flashGeo, flashMat);
    this.muzzleFlashMesh.position.copy(this.muzzlePoint.position);
    this.muzzleFlashMesh.visible = false;
    this.weaponPivot.add(this.muzzleFlashMesh);

    this.muzzleLight = new THREE.PointLight(0xffb454, 0, 9, 2);
    this.muzzleLight.position.set(0, 0.06, -0.82);
    this.weaponPivot.add(this.muzzleLight);

    this.root.add(this.weaponPivot);
    this.root.position.copy(this.hipPos);
  }

  public addLookSway(dx: number, dy: number): void {
    this.swayX = THREE.MathUtils.clamp(this.swayX - dx * 0.0022, -0.035, 0.035);
    this.swayY = THREE.MathUtils.clamp(this.swayY + dy * 0.0022, -0.03, 0.03);
  }

  public startReload(audio: AudioEngine): boolean {
    if (this.isReloading || this.isCyclingBolt) return false;
    if (this.ammoInMag >= this.stats.magSize || this.ammoReserve <= 0) return false;
    this.isReloading = true;
    this.reloadTimer = 0;
    this.reloadInsertPlayed = false;
    this.reloadFinishPlayed = false;
    audio.playReloadStart();
    return true;
  }

  public tryFire(
    camera: THREE.Camera,
    shootables: THREE.Object3D[],
    audio: AudioEngine,
    particles: ParticlesAndDecals,
    onTargetHit: (info: TargetHitInfo) => void,
  ): ShotResult | null {
    if (this.isReloading || this.isCyclingBolt) return null;
    if (this.ammoInMag <= 0) {
      audio.playDryFire();
      this.startReload(audio);
      return null;
    }

    this.ammoInMag--;
    audio.playRifleShot();

    // Start bolt cycle if rounds remain, otherwise auto-trigger reload smoothly
    if (this.ammoInMag > 0) {
      this.isCyclingBolt = true;
      this.boltTimer = 0;
      this.shellEjectedThisCycle = false;
      audio.playBoltCycle();
    } else if (this.ammoReserve > 0) {
      // Short pause before reload kicks in, or immediate chamber cycle + reload
      this.isCyclingBolt = true;
      this.boltTimer = 0;
      this.shellEjectedThisCycle = false;
      audio.playBoltCycle();
    }

    // Visual recoil & muzzle flash
    this.recoilZ = 0.078;
    this.recoilPitch = 0.11;
    this.muzzleFlashTimer = 0.055;
    this.muzzleFlashMesh.visible = true;
    this.muzzleFlashMesh.rotation.z = Math.random() * Math.PI * 2;
    this.muzzleLight.intensity = 5.5;

    // World-space muzzle smoke & raycast ballistics
    this.muzzlePoint.getWorldPosition(this._muzzleWorld);
    camera.getWorldDirection(this._dir);

    // Apply accuracy spread (much tighter when ADS)
    const spreadDeg = THREE.MathUtils.lerp(
      this.stats.hipSpreadDeg,
      this.stats.adsSpreadDeg,
      this.adsBlend,
    );
    const spreadRad = THREE.MathUtils.degToRad(spreadDeg);
    this._dir.x += (Math.random() - 0.5) * spreadRad;
    this._dir.y += (Math.random() - 0.5) * spreadRad;
    this._dir.z += (Math.random() - 0.5) * spreadRad;
    this._dir.normalize();

    particles.spawnMuzzleSmoke(this._muzzleWorld, this._dir);

    this.raycaster.set(camera.getWorldPosition(new THREE.Vector3()), this._dir);
    this.raycaster.far = this.stats.effectiveRange;
    const hits = this.raycaster.intersectObjects(shootables, false);

    if (hits.length > 0) {
      const hit = hits[0];
      const surface = (hit.object.userData.surface as SurfaceType) ?? 'mud';
      const normal = hit.face
        ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld)
        : new THREE.Vector3(0, 1, 0);

      particles.spawnTracer(this._muzzleWorld, hit.point);
      particles.spawnImpactBurst(hit.point, normal, surface);

      const targetInfo = hit.object.userData.targetHit as TargetHitInfo | undefined;
      if (targetInfo) {
        const dmg = Math.round(this.stats.damage * targetInfo.damageMultiplier);
        audio.playImpact('metal', targetInfo.isCritical);
        onTargetHit(targetInfo);
        return {
          hitTarget: true,
          isCritical: targetInfo.isCritical,
          damage: dmg,
          hitPoint: hit.point.clone(),
        };
      } else {
        audio.playImpact(surface, false);
        return {
          hitTarget: false,
          isCritical: false,
          damage: null,
          hitPoint: hit.point.clone(),
        };
      }
    } else {
      const farPt = camera.getWorldPosition(new THREE.Vector3()).addScaledVector(this._dir, 95);
      particles.spawnTracer(this._muzzleWorld, farPt);
      return {
        hitTarget: false,
        isCritical: false,
        damage: null,
        hitPoint: null,
      };
    }
  }

  public update(
    dt: number,
    isMoving: boolean,
    isSprinting: boolean,
    wantsAds: boolean,
    camera: THREE.Camera,
    audio: AudioEngine,
    particles: ParticlesAndDecals,
  ): void {
    // 1. Muzzle flash decay
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= dt;
      if (this.muzzleFlashTimer <= 0) {
        this.muzzleFlashMesh.visible = false;
        this.muzzleLight.intensity = 0;
      }
    }

    // 2. Bolt-action cycle animation
    let boltZ = 0;
    let boltRoll = 0;
    let rightHandOffset = new THREE.Vector3();

    if (this.isCyclingBolt) {
      this.boltTimer += dt;
      const p = Math.min(1, this.boltTimer / this.stats.boltCycleSec);

      if (p < 0.2) {
        // Lift bolt handle
        const k = p / 0.2;
        boltRoll = k * 1.1;
        rightHandOffset.set(0.02 * k, 0.04 * k, -0.05 * k);
      } else if (p < 0.5) {
        // Pull bolt back + eject brass casing
        const k = (p - 0.2) / 0.3;
        boltRoll = 1.1;
        boltZ = k * 0.095;
        rightHandOffset.set(0.02, 0.04, -0.05 + 0.095 * k);
        if (!this.shellEjectedThisCycle && k > 0.55) {
          this.shellEjectedThisCycle = true;
          this.ejectPoint.getWorldPosition(this._ejectWorld);
          camera.getWorldQuaternion(this._camQuat);
          this._rightWorld.set(1, 0, 0).applyQuaternion(this._camQuat);
          this._upWorld.set(0, 1, 0).applyQuaternion(this._camQuat);
          particles.spawnShellCasing(this._ejectWorld, this._rightWorld, this._upWorld);
        }
      } else if (p < 0.8) {
        // Push bolt forward
        const k = (p - 0.5) / 0.3;
        boltRoll = 1.1;
        boltZ = (1 - k) * 0.095;
        rightHandOffset.set(0.02, 0.04, 0.045 - 0.095 * k);
      } else {
        // Lock bolt down
        const k = (p - 0.8) / 0.2;
        boltRoll = (1 - k) * 1.1;
        rightHandOffset.set(0.02 * (1 - k), 0.04 * (1 - k), -0.05 * (1 - k));
      }

      if (p >= 1) {
        this.isCyclingBolt = false;
        this.boltTimer = 0;
        if (this.ammoInMag === 0 && this.ammoReserve > 0) {
          this.startReload(audio);
        }
      }
    }

    // 3. Reload animation (stripper clip feed)
    let reloadTiltX = 0;
    let reloadTiltZ = 0;
    let reloadDropY = 0;

    if (this.isReloading) {
      this.reloadTimer += dt;
      const p = Math.min(1, this.reloadTimer / this.stats.reloadSec);
      const enter = Math.min(1, p / 0.22);
      const exit = Math.max(0, (p - 0.82) / 0.18);
      const hold = enter * (1 - exit);

      reloadTiltX = hold * 0.24;
      reloadTiltZ = hold * 0.32;
      reloadDropY = hold * -0.05;
      boltRoll = hold * 1.1;
      boltZ = hold * 0.095;

      // Stripper clip descends into receiver mid-reload
      if (p > 0.24 && p < 0.78) {
        this.stripperClipGroup.visible = true;
        const feedP = Math.min(1, (p - 0.24) / 0.38);
        this.stripperClipGroup.position.y = THREE.MathUtils.lerp(0.13, 0.032, feedP);
        if (!this.reloadInsertPlayed && p > 0.34) {
          this.reloadInsertPlayed = true;
          audio.playReloadInsert();
        }
      } else {
        this.stripperClipGroup.visible = false;
      }

      if (!this.reloadFinishPlayed && p > 0.82) {
        this.reloadFinishPlayed = true;
        audio.playReloadFinish();
      }

      if (p >= 1) {
        const needed = this.stats.magSize - this.ammoInMag;
        const loaded = Math.min(needed, this.ammoReserve);
        this.ammoInMag += loaded;
        this.ammoReserve -= loaded;
        this.isReloading = false;
        this.stripperClipGroup.visible = false;
      }
    } else {
      this.stripperClipGroup.visible = false;
    }

    this.boltAssembly.position.z = 0.01 + boltZ;
    this.boltHandleGroup.rotation.z = boltRoll;
    this.rightHandGroup.position.copy(rightHandOffset);

    // 4. ADS blending (suppressed while reloading or sprinting)
    const canAds = wantsAds && !this.isReloading && !isSprinting;
    const adsTarget = canAds ? 1 : 0;
    this.adsBlend = THREE.MathUtils.damp(this.adsBlend, adsTarget, 16, dt);

    // 5. Breathing, walk bob & sprint carry pose
    this.bobTime += dt * (isMoving ? (isSprinting ? 12.5 : 8.2) : 1.6);
    const bobAmp = isMoving ? (isSprinting ? 0.018 : 0.0085) * (1 - this.adsBlend * 0.8) : 0.0018;
    const bobX = Math.cos(this.bobTime * 0.5) * bobAmp;
    const bobY = Math.abs(Math.sin(this.bobTime)) * bobAmp * 1.1;

    const sprintCarry = isSprinting && !this.isReloading ? 1 : 0;
    const sprintYaw = sprintCarry * 0.42;
    const sprintPitch = sprintCarry * -0.18;

    // 6. Recoil & look sway damping
    this.recoilZ = THREE.MathUtils.damp(this.recoilZ, 0, 14, dt);
    this.recoilPitch = THREE.MathUtils.damp(this.recoilPitch, 0, 12, dt);
    this.swayX = THREE.MathUtils.damp(this.swayX, 0, 10, dt);
    this.swayY = THREE.MathUtils.damp(this.swayY, 0, 10, dt);

    // Compose final local position & rotation
    this.root.position.lerpVectors(this.hipPos, this.adsPos, this.adsBlend);
    this.root.position.x += bobX + this.swayX * (1 - this.adsBlend * 0.65);
    this.root.position.y += bobY - this.swayY * (1 - this.adsBlend * 0.65) + reloadDropY;
    this.root.position.z += this.recoilZ;

    this.weaponPivot.rotation.set(
      this.recoilPitch + reloadTiltX + sprintPitch,
      sprintYaw + this.swayX * 0.4,
      reloadTiltZ,
    );
  }
}
