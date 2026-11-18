import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import type { GraphicsSettings } from '@shared/types';

const CinematicGradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uGrainAmount: { value: 0.032 },
    uVignetteAmount: { value: 0.42 },
    uMotionBlur: { value: 0.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uGrainAmount;
    uniform float uVignetteAmount;
    uniform float uMotionBlur;
    varying vec2 vUv;

    float rand(vec2 co) {
      return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec2 dir = vUv - vec2(0.5);
      vec4 base = texture2D(tDiffuse, vUv);

      // Subtle radial blur when motion blur enabled
      if (uMotionBlur > 0.01) {
        vec4 accum = base;
        accum += texture2D(tDiffuse, vUv - dir * uMotionBlur * 0.014);
        accum += texture2D(tDiffuse, vUv + dir * uMotionBlur * 0.014);
        base = accum / 3.0;
      }

      // WW1 warm-sepia shadows & crisp amber highlights color grading
      vec3 col = base.rgb;
      col.r *= 1.04;
      col.g *= 1.01;
      col.b *= 0.94;

      // Vignette
      float dist = length(dir);
      float vig = smoothstep(0.32, 0.92, dist);
      col *= 1.0 - vig * uVignetteAmount;

      // Subtle film grain
      float grain = (rand(vUv + fract(uTime * 0.37)) - 0.5) * uGrainAmount;
      col += grain;

      gl_FragColor = vec4(clamp(col, 0.0, 1.0), base.a);
    }
  `,
};

export function detectSoftwareWebGL(): boolean {
  try {
    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export class RendererPipeline {
  public readonly renderer: THREE.WebGLRenderer;
  public readonly isSoftwareGl: boolean;
  public composer: EffectComposer | null = null;
  public bloomPass: UnrealBloomPass | null = null;
  public ssaoPass: SSAOPass | null = null;
  public gradePass: ShaderPass | null = null;

  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private envRT: THREE.WebGLRenderTarget;
  private settings: GraphicsSettings;
  private lowFpsAccum = 0;

  constructor(
    container: HTMLElement,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    initialSettings: GraphicsSettings,
  ) {
    this.scene = scene;
    this.camera = camera;
    this.settings = { ...initialSettings };
    this.isSoftwareGl = detectSoftwareWebGL();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl && initialSettings.antiAliasing,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && initialSettings.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    this.applyResolutionScale(initialSettings.resolutionScale);

    container.appendChild(this.renderer.domElement);

    // Mandatory studio environment reflection for metallic weapons/steel targets
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = this.envRT.texture;
    pmrem.dispose();

    // Post-processing composer (skipped on Software WebGL for crisp interactive frame pacing)
    if (!this.isSoftwareGl) {
      this.setupComposer(w, h);
    }

    this.applySettings(initialSettings);
  }

  private setupComposer(width: number, height: number): void {
    const composer = new EffectComposer(this.renderer);
    composer.addPass(new RenderPass(this.scene, this.camera));

    this.ssaoPass = new SSAOPass(this.scene, this.camera, width, height);
    this.ssaoPass.kernelRadius = 10;
    this.ssaoPass.minDistance = 0.005;
    this.ssaoPass.maxDistance = 0.08;
    this.ssaoPass.enabled = false;
    composer.addPass(this.ssaoPass);

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(Math.max(1, Math.floor(width / 2)), Math.max(1, Math.floor(height / 2))),
      0.34,
      0.55,
      0.86,
    );
    composer.addPass(this.bloomPass);

    this.gradePass = new ShaderPass(CinematicGradeShader);
    composer.addPass(this.gradePass);

    composer.addPass(new OutputPass());
    this.composer = composer;
  }

  public applyResolutionScale(scalePct: number): void {
    if (this.isSoftwareGl) {
      this.renderer.setPixelRatio(1);
      return;
    }
    const baseDpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(baseDpr * (scalePct / 100));
  }

  public applySettings(settings: GraphicsSettings): void {
    this.settings = { ...settings };
    this.applyResolutionScale(settings.resolutionScale);

    // Draw distance & Fog
    const farDist =
      settings.drawDistance === 'short'
        ? 140
        : settings.drawDistance === 'medium'
          ? 240
          : settings.drawDistance === 'long'
            ? 380
            : 520;
    this.camera.far = farDist;
    this.camera.updateProjectionMatrix();

    if (settings.fog) {
      const fogDensity =
        settings.drawDistance === 'short'
          ? 0.015
          : settings.drawDistance === 'medium'
            ? 0.0105
            : 0.0078;
      this.scene.fog = new THREE.FogExp2(0x7c6a58, fogDensity);
    } else {
      this.scene.fog = null;
    }

    // Shadows
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && settings.shadows;

    if (this.bloomPass) {
      this.bloomPass.enabled = settings.bloom;
    }
    if (this.ssaoPass) {
      this.ssaoPass.enabled = settings.preset === 'high' || settings.preset === 'ultra';
    }
    if (this.gradePass) {
      this.gradePass.uniforms.uMotionBlur.value = settings.motionBlur ? 1.0 : 0.0;
    }
  }

  public resize(width: number, height: number): void {
    if (width <= 0 || height <= 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    if (this.composer) {
      this.composer.setSize(width, height);
    }
    if (this.bloomPass) {
      this.bloomPass.resolution.set(Math.max(1, Math.floor(width / 2)), Math.max(1, Math.floor(height / 2)));
    }
  }

  public checkAutoQuality(fps: number, dt: number): boolean {
    if (this.settings.preset !== 'auto' || this.isSoftwareGl) return false;
    if (fps > 0 && fps < 42) {
      this.lowFpsAccum += dt;
      if (this.lowFpsAccum > 2.5) {
        this.lowFpsAccum = 0;
        if (this.settings.bloom || this.settings.shadows || this.settings.resolutionScale > 70) {
          this.settings.bloom = false;
          this.settings.resolutionScale = Math.max(65, this.settings.resolutionScale - 15);
          if (this.settings.resolutionScale <= 70) {
            this.settings.shadows = false;
          }
          this.applySettings(this.settings);
          return true;
        }
      }
    } else {
      this.lowFpsAccum = Math.max(0, this.lowFpsAccum - dt * 0.5);
    }
    return false;
  }

  public render(elapsedSec: number): void {
    if (this.gradePass) {
      this.gradePass.uniforms.uTime.value = elapsedSec;
    }
    if (!this.isSoftwareGl && this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  public afterDraw(cb: () => void, cancelToken: { id: number }): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (typeof gl.fenceSync === 'function') {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          cancelToken.id = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          cancelToken.id = window.setTimeout(cb, 80);
        }
      };
      cancelToken.id = window.setTimeout(poll, 5);
    } else {
      cancelToken.id = window.setTimeout(cb, 80);
    }
  }

  public dispose(): void {
    this.envRT.dispose();
    this.composer?.dispose();
    this.renderer.dispose();
  }
}
