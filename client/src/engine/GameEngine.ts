import * as THREE from 'three';
import type { GameSettings, HudTelemetry, PlayerProfile } from '@shared/types';
import { createProceduralTextures, type ProceduralTextureSet } from './ProceduralTextures';
import { RendererPipeline } from './RendererPipeline';
import { WW1TrenchMap } from './WW1TrenchMap';
import { FirstPersonRifle } from './FirstPersonRifle';
import { PlayerController } from './PlayerController';
import { ParticlesAndDecals } from './ParticlesAndDecals';
import { AudioEngine } from './AudioEngine';

export type GameModeState = 'title' | 'playing' | 'paused' | 'hud_edit';

export class GameEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private pipeline: RendererPipeline;
  private textures: ProceduralTextureSet;
  private map: WW1TrenchMap;
  private rifle: FirstPersonRifle;
  public readonly player: PlayerController;
  private particles: ParticlesAndDecals;
  public readonly audio: AudioEngine;

  private settings: GameSettings;
  private profile: PlayerProfile;
  private mode: GameModeState = 'title';
  private rafId = 0;
  private softwareToken = { id: 0 };
  private disposed = false;

  private lastTimestamp = performance.now();
  private lastRenderTime = performance.now();
  private elapsedSec = 0;
  private fpsFrames = 0;
  private fpsAccum = 0;
  private currentFps = 60;

  private lastHitTimestamp = 0;
  private lastHitCritical = false;
  private lastDamage: number | null = null;
  private lastDamageWorld = new THREE.Vector3();
  private damageDisplayTimer = 0;

  private fireHeld = false;
  private autoFireCooldown = 0;
  private aimRaycaster = new THREE.Raycaster();
  private _projVec = new THREE.Vector3();
  private _centerNdc = new THREE.Vector2(0, 0);

  private onTelemetry: (telemetry: HudTelemetry) => void;
  private onProfileChange: (profile: PlayerProfile) => void;
  private onAutoQualityAdjust: (settings: GameSettings) => void;
  private telemetryTimer = 0;

  constructor(
    container: HTMLElement,
    initialSettings: GameSettings,
    initialProfile: PlayerProfile,
    callbacks: {
      onTelemetry: (t: HudTelemetry) => void;
      onPause: () => void;
      onProfileChange: (p: PlayerProfile) => void;
      onAutoQualityAdjust: (s: GameSettings) => void;
    },
  ) {
    this.container = container;
    this.settings = initialSettings;
    this.profile = { ...initialProfile };
    this.onTelemetry = callbacks.onTelemetry;
    this.onProfileChange = callbacks.onProfileChange;
    this.onAutoQualityAdjust = callbacks.onAutoQualityAdjust;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x6b5c4d);

    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(initialSettings.gameplay.fov, w / h, 0.08, 420);
    this.scene.add(this.camera);

    this.pipeline = new RendererPipeline(container, this.scene, this.camera, initialSettings.graphics);
    this.textures = createProceduralTextures(
      initialSettings.graphics.textureQuality,
      this.pipeline.renderer.capabilities.getMaxAnisotropy(),
    );

    this.audio = new AudioEngine(initialSettings.audio);
    this.map = new WW1TrenchMap(
      this.scene,
      this.textures,
      initialSettings.graphics.foliageDensity,
      initialSettings.graphics.shadowQuality,
      !this.pipeline.isSoftwareGl && initialSettings.graphics.shadows,
    );

    this.rifle = new FirstPersonRifle(this.textures);
    this.rifle.root.visible = false; // Hidden during title diorama camera pan
    this.camera.add(this.rifle.root);

    this.particles = new ParticlesAndDecals(
      this.scene,
      this.textures.particleSoft,
      initialSettings.graphics.particleDensity,
    );

    this.player = new PlayerController(() => this.settings.controls, callbacks.onPause);
    this.player.attachCanvas(this.pipeline.renderer.domElement);
    this.player.resetPosition(this.map);

    if (!this.pipeline.isSoftwareGl) {
      this.pipeline.renderer.compile(this.scene, this.camera);
    }

    window.addEventListener('resize', this.handleResize);
    this.pipeline.renderer.domElement.addEventListener('click', this.handleCanvasClick);

    this.scheduleNextFrame();
  }

  public setMode(mode: GameModeState): void {
    this.mode = mode;
    const playing = mode === 'playing';
    this.player.setActive(playing);
    this.rifle.root.visible = playing || mode === 'paused' || mode === 'hud_edit';
    this.audio.setInCombat(playing);

    if (playing) {
      this.audio.unlock();
    }
  }

  public deploy(): void {
    this.audio.unlock();
    this.player.resetPosition(this.map);
    this.setMode('playing');
    this.player.requestPointerLock();
  }

  public resetPlayerPosition(): void {
    this.player.resetPosition(this.map);
  }

  public updateSettings(next: GameSettings): void {
    const texChanged = next.graphics.textureQuality !== this.settings.graphics.textureQuality;
    const foliageChanged = next.graphics.foliageDensity !== this.settings.graphics.foliageDensity;
    const shadowChanged =
      next.graphics.shadows !== this.settings.graphics.shadows ||
      next.graphics.shadowQuality !== this.settings.graphics.shadowQuality;

    this.settings = next;
    this.pipeline.applySettings(next.graphics);
    this.audio.applySettings(next.audio);
    this.particles.setParticleDensity(next.graphics.particleDensity);

    if (this.camera.fov !== next.gameplay.fov && this.mode !== 'playing') {
      this.camera.fov = next.gameplay.fov;
      this.camera.updateProjectionMatrix();
    }

    if (texChanged || foliageChanged || shadowChanged) {
      this.rebuildEnvironmentGeometry();
    }
  }

  private rebuildEnvironmentGeometry(): void {
    this.scene.remove(this.map.group);
    this.map.dispose();
    this.textures.dispose();
    this.textures = createProceduralTextures(
      this.settings.graphics.textureQuality,
      this.pipeline.renderer.capabilities.getMaxAnisotropy(),
    );
    this.map = new WW1TrenchMap(
      this.scene,
      this.textures,
      this.settings.graphics.foliageDensity,
      this.settings.graphics.shadowQuality,
      !this.pipeline.isSoftwareGl && this.settings.graphics.shadows,
    );
  }

  public triggerFire(pressed: boolean): void {
    this.fireHeld = pressed;
    this.player.touchState.isFiring = pressed;
    if (pressed && this.mode === 'playing') {
      this.executeShot();
    }
  }

  public toggleTouchAds(): void {
    this.player.touchState.isAds = !this.player.touchState.isAds;
  }

  public setTouchAds(active: boolean): void {
    this.player.touchState.isAds = active;
  }

  public triggerReload(): void {
    if (this.mode === 'playing') {
      this.rifle.startReload(this.audio);
    }
  }

  public triggerJump(): void {
    if (this.mode === 'playing') {
      this.player.triggerJump();
    }
  }

  public triggerCrouch(): void {
    if (this.mode === 'playing') {
      this.player.toggleCrouch();
    }
  }

  public applyTouchLook(dx: number, dy: number): void {
    if (this.mode === 'playing') {
      this.player.applyLookDelta(dx, dy, this.rifle);
    }
  }

  public setTouchMove(mx: number, my: number): void {
    this.player.touchState.moveX = mx;
    this.player.touchState.moveY = my;
  }

  private handleCanvasClick = (): void => {
    if (this.mode === 'playing' && !this.player.pointerLocked) {
      this.player.requestPointerLock();
    }
  };

  private handleResize = (): void => {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.pipeline.resize(w, h);
  };

  private executeShot(): void {
    const result = this.rifle.tryFire(
      this.camera,
      this.map.shootables,
      this.audio,
      this.particles,
      (info) => {
        this.map.notifyTargetHit(info.targetGroup);
      },
    );

    if (result) {
      const adsReduction = 1 - this.rifle.adsBlend * 0.3;
      const yawRand = (Math.random() - 0.5) * 2 * this.rifle.stats.recoilYaw * adsReduction;
      this.player.applyRecoilImpulse(this.rifle.stats.recoilPitch * adsReduction, yawRand);

      if (this.settings.controls.haptics && typeof navigator.vibrate === 'function') {
        navigator.vibrate(24);
      }

      this.profile.shotsFired += 1;
      if (result.hitTarget && result.damage !== null && result.hitPoint) {
        this.profile.shotsHit += 1;
        this.profile.xp += result.isCritical ? 25 : 10;
        this.lastHitTimestamp = performance.now();
        this.lastHitCritical = result.isCritical;
        this.lastDamage = result.damage;
        this.lastDamageWorld.copy(result.hitPoint);
        this.damageDisplayTimer = 0.75;
        if (this.settings.controls.haptics && typeof navigator.vibrate === 'function') {
          navigator.vibrate([18, 22, 18]);
        }
      }
      this.onProfileChange({ ...this.profile });
    }
  }

  private scheduleNextFrame(): void {
    if (this.disposed) return;
    if (this.pipeline.isSoftwareGl) {
      this.pipeline.afterDraw(() => this.tick(), this.softwareToken);
    } else {
      this.rafId = requestAnimationFrame(() => this.tick());
    }
  }

  private tick = (): void => {
    if (this.disposed) return;

    const now = performance.now();
    const minFrameMs = 1000 / this.settings.graphics.fpsCap;

    if (!this.pipeline.isSoftwareGl && now - this.lastRenderTime < minFrameMs - 1.5) {
      this.rafId = requestAnimationFrame(() => this.tick());
      return;
    }

    const rawDt = (now - this.lastTimestamp) / 1000;
    this.lastTimestamp = now;
    this.lastRenderTime = now;
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
    this.elapsedSec += dt;

    // FPS tracking
    this.fpsFrames++;
    this.fpsAccum += rawDt;
    if (this.fpsAccum >= 0.5) {
      this.currentFps = Math.round(this.fpsFrames / this.fpsAccum);
      this.fpsFrames = 0;
      this.fpsAccum = 0;
      if (this.pipeline.checkAutoQuality(this.currentFps, 0.5)) {
        this.onAutoQualityAdjust({ ...this.settings });
      }
    }

    if (this.mode === 'title') {
      // Atmospheric slow panoramic camera sweep over WW1 trenches & No Man's Land
      const t = this.elapsedSec * 0.09;
      const camX = Math.sin(t) * 18;
      const camZ = 14 + Math.cos(t * 0.7) * 5;
      const camY = this.map.getGroundHeight(camX, camZ) + 4.8;
      this.camera.position.set(camX, camY, camZ);
      this.camera.lookAt(Math.sin(t * 0.5) * 6, 1.4, -22);
    } else if (this.mode === 'playing') {
      this.player.update(dt, this.map, this.camera, this.audio, this.rifle, this.settings.gameplay.fov);

      if (this.player.isReloadPressed()) {
        this.rifle.startReload(this.audio);
      }

      if (this.player.wantsFire || this.fireHeld) {
        this.executeShot();
      } else if (this.settings.controls.autoFire) {
        this.autoFireCooldown -= dt;
        if (this.autoFireCooldown <= 0) {
          this.aimRaycaster.setFromCamera(this._centerNdc, this.camera);
          const hits = this.aimRaycaster.intersectObjects(this.map.shootables, false);
          if (hits.length > 0 && hits[0].object.userData.targetHit) {
            this.executeShot();
            this.autoFireCooldown = 0.15;
          }
        }
      }

      const adsWanted = this.player.wantsAds || this.player.touchState.isAds;
      this.rifle.update(
        dt,
        this.player.isMoving,
        this.player.isSprinting,
        adsWanted,
        this.camera,
        this.audio,
        this.particles,
      );
    }

    this.map.update(dt);
    this.particles.update(dt, this.player.position, (x, z) => this.map.getGroundHeight(x, z));
    if (this.damageDisplayTimer > 0) {
      this.damageDisplayTimer = Math.max(0, this.damageDisplayTimer - dt);
    }

    this.pipeline.render(this.elapsedSec);

    // Emit HUD telemetry at ~30Hz so React never re-renders needlessly
    this.telemetryTimer += dt;
    if (this.telemetryTimer >= 0.033) {
      this.telemetryTimer = 0;
      this.emitTelemetry();
    }

    this.scheduleNextFrame();
  };

  private emitTelemetry(): void {
    let dmgPos: { x: number; y: number } | null = null;
    if (this.damageDisplayTimer > 0 && this.lastDamage !== null) {
      this._projVec.copy(this.lastDamageWorld).project(this.camera);
      if (this._projVec.z < 1) {
        dmgPos = {
          x: ((this._projVec.x + 1) / 2) * (this.container.clientWidth || window.innerWidth),
          y: (-(this._projVec.y - 1) / 2) * (this.container.clientHeight || window.innerHeight),
        };
      }
    }

    const baseSpread = 8 + (this.player.isMoving ? (this.player.isSprinting ? 14 : 6) : 0);
    const spreadPx = Math.round(THREE.MathUtils.lerp(baseSpread, 2, this.rifle.adsBlend));

    this.onTelemetry({
      hp: this.player.hp,
      maxHp: this.player.maxHp,
      ammoInMag: this.rifle.ammoInMag,
      ammoReserve: this.rifle.ammoReserve,
      weaponName: this.rifle.stats.name,
      isReloading: this.rifle.isReloading,
      reloadProgress: this.rifle.isReloading
        ? Math.min(1, this.rifle.reloadTimer / this.rifle.stats.reloadSec)
        : 0,
      isAds: this.rifle.adsBlend > 0.45,
      isSprinting: this.player.isSprinting,
      isCrouching: this.player.isCrouching,
      isCyclingBolt: this.rifle.isCyclingBolt,
      crosshairSpreadPx: spreadPx,
      fps: this.currentFps,
      pingMs: 0, // Offline local test map in Phase 1
      lastHitTimestamp: this.lastHitTimestamp,
      lastHitCritical: this.lastHitCritical,
      lastDamage: this.damageDisplayTimer > 0 ? this.lastDamage : null,
      lastDamageScreenPos: dmgPos,
      pointerLocked: this.player.pointerLocked,
      qualityNotice: null,
    });
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    clearTimeout(this.softwareToken.id);
    window.removeEventListener('resize', this.handleResize);
    this.pipeline.renderer.domElement.removeEventListener('click', this.handleCanvasClick);
    this.player.dispose();
    this.particles.dispose();
    this.map.dispose();
    this.textures.dispose();
    this.audio.dispose();
    this.pipeline.dispose();
    if (this.pipeline.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.pipeline.renderer.domElement);
    }
  }
}
