import * as THREE from 'three';
import type { ControlSettings } from '@shared/types';
import type { WW1TrenchMap } from './WW1TrenchMap';
import type { AudioEngine } from './AudioEngine';
import type { FirstPersonRifle } from './FirstPersonRifle';

export interface TouchInputState {
  moveX: number; // -1..1
  moveY: number; // -1..1 (forward positive)
  isFiring: boolean;
  isAds: boolean;
}

export class PlayerController {
  public readonly position = new THREE.Vector3(0, 1.5, 4.5);
  public yaw = 0; // radians, 0 faces -Z (towards No Man's Land)
  public pitch = 0;
  public hp = 100;
  public maxHp = 100;

  public isGrounded = true;
  public isCrouching = false;
  public isSprinting = false;
  public isMoving = false;
  public pointerLocked = false;
  public wantsAds = false;
  public wantsFire = false;

  public touchState: TouchInputState = {
    moveX: 0,
    moveY: 0,
    isFiring: false,
    isAds: false,
  };

  private velocity = new THREE.Vector3();
  private keys: Record<string, boolean> = {};
  private coyoteTimer = 0;
  private stepTimer = 0;
  private eyeHeight = 1.62;
  private recoilKickPitch = 0;
  private recoilKickYaw = 0;

  private _forward = new THREE.Vector3();
  private _right = new THREE.Vector3();
  private _moveDir = new THREE.Vector3();

  private canvas: HTMLElement | null = null;
  private onPauseCallback: () => void;
  private getSettings: () => ControlSettings;
  private active = false;

  constructor(getSettings: () => ControlSettings, onPause: () => void) {
    this.getSettings = getSettings;
    this.onPauseCallback = onPause;
    this.bindEvents();
  }

  public attachCanvas(canvas: HTMLElement): void {
    this.canvas = canvas;
  }

  public setActive(active: boolean): void {
    this.active = active;
    if (!active) {
      this.keys = {};
      this.wantsAds = false;
      this.wantsFire = false;
      this.touchState.moveX = 0;
      this.touchState.moveY = 0;
      this.touchState.isFiring = false;
      this.touchState.isAds = false;
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
    }
  }

  public resetPosition(map: WW1TrenchMap): void {
    this.position.set(0, map.getGroundHeight(0, 1.2), 1.2);
    this.velocity.set(0, 0, 0);
    this.yaw = 0;
    this.pitch = 0.02;
    this.isCrouching = false;
  }

  public requestPointerLock(): void {
    if (!this.canvas) return;
    if (typeof this.canvas.requestPointerLock === 'function' && !('ontouchstart' in window && navigator.maxTouchPoints > 0)) {
      try {
        this.canvas.requestPointerLock();
      } catch {
        // Ignore pointer lock rejection on touch/sandbox
      }
    }
  }

  public applyLookDelta(dx: number, dy: number, rifle: FirstPersonRifle): void {
    const s = this.getSettings();
    const sens = this.wantsAds || this.touchState.isAds ? s.sensitivityAds : s.sensitivityHip;
    const scale = 0.0021 * sens;
    const ySign = s.invertY ? -1 : 1;

    this.yaw -= dx * scale;
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * scale * ySign, -1.38, 1.38);
    rifle.addLookSway(dx * sens, dy * sens);
  }

  public applyRecoilImpulse(pitchKick: number, yawKick: number): void {
    this.recoilKickPitch += pitchKick;
    this.recoilKickYaw += yawKick;
  }

  public triggerJump(): void {
    if (this.coyoteTimer > 0) {
      this.velocity.y = 5.6;
      this.isGrounded = false;
      this.coyoteTimer = 0;
      this.isCrouching = false;
    }
  }

  public toggleCrouch(): void {
    this.isCrouching = !this.isCrouching;
  }

  private bindEvents(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
    window.addEventListener('contextmenu', this.handleContextMenu);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    this.keys[e.code] = true;
    if (!this.active) return;

    if (e.code === 'Escape') {
      this.onPauseCallback();
    } else if (e.code === 'Space') {
      this.triggerJump();
    } else if (e.code === 'KeyC' || e.code === 'ControlLeft') {
      this.toggleCrouch();
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keys[e.code] = false;
  };

  private handleBlur = (): void => {
    this.keys = {};
    this.wantsAds = false;
    this.wantsFire = false;
  };

  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.active || !this.pointerLocked) return;
    const s = this.getSettings();
    const sens = this.wantsAds ? s.sensitivityAds : s.sensitivityHip;
    const scale = 0.002 * sens;
    const ySign = s.invertY ? -1 : 1;
    this.yaw -= e.movementX * scale;
    this.pitch = THREE.MathUtils.clamp(this.pitch - e.movementY * scale * ySign, -1.38, 1.38);
  };

  private handleMouseDown = (e: MouseEvent): void => {
    if (!this.active) return;
    if (!this.pointerLocked) return;
    if (e.button === 0) this.wantsFire = true;
    if (e.button === 2) this.wantsAds = true;
  };

  private handleMouseUp = (e: MouseEvent): void => {
    if (e.button === 0) this.wantsFire = false;
    if (e.button === 2) this.wantsAds = false;
  };

  private handleContextMenu = (e: MouseEvent): void => {
    if (this.active) e.preventDefault();
  };

  private handlePointerLockChange = (): void => {
    this.pointerLocked = document.pointerLockElement === this.canvas;
  };

  public isReloadPressed(): boolean {
    return Boolean(this.keys['KeyR']);
  }

  public update(
    dt: number,
    map: WW1TrenchMap,
    camera: THREE.PerspectiveCamera,
    audio: AudioEngine,
    rifle: FirstPersonRifle,
    baseFov: number,
  ): void {
    const settings = this.getSettings();

    // Combine keyboard + touch joystick movement
    let inputForward =
      (this.keys['KeyW'] || this.keys['ArrowUp'] ? 1 : 0) -
      (this.keys['KeyS'] || this.keys['ArrowDown'] ? 1 : 0);
    let inputRight =
      (this.keys['KeyD'] || this.keys['ArrowRight'] ? 1 : 0) -
      (this.keys['KeyA'] || this.keys['ArrowLeft'] ? 1 : 0);

    inputForward += this.touchState.moveY;
    inputRight += this.touchState.moveX;

    this._forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    this._right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    this._moveDir.set(0, 0, 0);
    this._moveDir.addScaledVector(this._forward, inputForward);
    this._moveDir.addScaledVector(this._right, inputRight);
    const moveMag = Math.min(1, this._moveDir.length());
    if (moveMag > 0.05) {
      this._moveDir.normalize();
      this.isMoving = true;
    } else {
      this._moveDir.set(0, 0, 0);
      this.isMoving = false;
    }

    const adsActive = this.wantsAds || this.touchState.isAds;
    const sprintRequested =
      Boolean(this.keys['ShiftLeft'] || this.keys['ShiftRight']) ||
      (settings.autoSprint && inputForward > 0.72);
    this.isSprinting = this.isMoving && sprintRequested && !this.isCrouching && !adsActive && inputForward > 0.25;

    const targetSpeed = this.isCrouching
      ? 2.55
      : this.isSprinting
        ? 6.1
        : adsActive
          ? 2.75
          : 4.35;

    const accel = this.isGrounded ? 18 : 6;
    this.velocity.x = THREE.MathUtils.damp(this.velocity.x, this._moveDir.x * targetSpeed * moveMag, accel, dt);
    this.velocity.z = THREE.MathUtils.damp(this.velocity.z, this._moveDir.z * targetSpeed * moveMag, accel, dt);

    // Gravity & Coyote time
    this.velocity.y -= 17.5 * dt;
    this.position.addScaledVector(this.velocity, dt);

    // Horizontal obstacle collisions
    map.resolveCollision(this.position, 0.42);

    // Ground height follow
    const groundY = map.getGroundHeight(this.position.x, this.position.z);
    if (this.position.y <= groundY + 0.02) {
      this.position.y = groundY;
      this.velocity.y = 0;
      this.isGrounded = true;
      this.coyoteTimer = 0.14;
    } else {
      this.isGrounded = false;
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }

    // Smooth eye height crouch transition
    const targetEye = this.isCrouching ? 1.04 : 1.62;
    this.eyeHeight = THREE.MathUtils.damp(this.eyeHeight, targetEye, 14, dt);

    // Footstep cadence
    if (this.isGrounded && this.isMoving) {
      this.stepTimer -= dt * (this.isSprinting ? 1.45 : this.isCrouching ? 0.68 : 1.0);
      if (this.stepTimer <= 0) {
        this.stepTimer = 0.46;
        audio.playFootstep(map.getSurfaceAt(this.position.x, this.position.z));
      }
    } else {
      this.stepTimer = 0.1;
    }

    // Smooth camera recoil kick decay
    this.recoilKickPitch = THREE.MathUtils.damp(this.recoilKickPitch, 0, 12, dt);
    this.recoilKickYaw = THREE.MathUtils.damp(this.recoilKickYaw, 0, 12, dt);

    // Head bob subtle offset
    const bobOffset =
      this.isGrounded && this.isMoving
        ? Math.sin(performance.now() * (this.isSprinting ? 0.015 : 0.01)) *
          (this.isSprinting ? 0.036 : 0.018) *
          (1 - rifle.adsBlend * 0.75)
        : 0;

    camera.position.set(this.position.x, this.position.y + this.eyeHeight + bobOffset, this.position.z);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = this.yaw + this.recoilKickYaw;
    camera.rotation.x = THREE.MathUtils.clamp(this.pitch + this.recoilKickPitch, -1.42, 1.42);
    camera.rotation.z = 0;

    // Dynamic FOV (ADS zoom + subtle sprint widen)
    const targetFov =
      baseFov * THREE.MathUtils.lerp(1, rifle.stats.adsFovFactor, rifle.adsBlend) +
      (this.isSprinting ? 4.5 : 0);
    if (Math.abs(camera.fov - targetFov) > 0.05) {
      camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 14, dt);
      camera.updateProjectionMatrix();
    }
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
    window.removeEventListener('contextmenu', this.handleContextMenu);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
  }
}
