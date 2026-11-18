import * as THREE from 'three';
import type { ProceduralTextureSet } from './ProceduralTextures';
import type { SurfaceType } from './AudioEngine';
import type { QualityTier } from '@shared/types';

export interface ObstacleBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  maxY: number;
}

export interface TargetHitInfo {
  damageMultiplier: number;
  isCritical: boolean;
  surface: SurfaceType;
  targetGroup: THREE.Object3D;
}

interface RangeTarget {
  group: THREE.Group;
  hitTimer: number;
  baseRotX: number;
}

interface CraterDef {
  x: number;
  z: number;
  radius: number;
  depth: number;
  hasPuddle: boolean;
}

const CRATERS: CraterDef[] = [
  { x: -12, z: -26, radius: 5.5, depth: 1.15, hasPuddle: true },
  { x: 14, z: -38, radius: 6.4, depth: 1.35, hasPuddle: true },
  { x: -24, z: -55, radius: 7.2, depth: 1.5, hasPuddle: false },
  { x: 8, z: -72, radius: 5.2, depth: 1.1, hasPuddle: true },
  { x: 28, z: -28, radius: 4.8, depth: 0.95, hasPuddle: false },
  { x: -4, z: -96, radius: 7.8, depth: 1.6, hasPuddle: true },
  { x: 36, z: -64, radius: 6.0, depth: 1.25, hasPuddle: false },
];

export class WW1TrenchMap {
  public readonly group = new THREE.Group();
  public readonly shootables: THREE.Object3D[] = [];
  public readonly obstacles: ObstacleBox[] = [];
  public readonly sunLight: THREE.DirectionalLight;
  public readonly hemiLight: THREE.HemisphereLight;
  public readonly skyDome: THREE.Mesh;

  private foliageInstanced: THREE.InstancedMesh | null = null;
  private wireInstanced: THREE.InstancedMesh | null = null;
  private rangeTargets: RangeTarget[] = [];
  private playableHalfExtent = 78;

  constructor(
    scene: THREE.Scene,
    textures: ProceduralTextureSet,
    foliageQuality: QualityTier,
    shadowQuality: QualityTier,
    shadowsEnabled: boolean,
  ) {
    // 1. Atmospheric Sky Dome (low-angle warm sunset / hazy war horizon)
    const skyGeo = new THREE.SphereGeometry(420, 32, 18);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uTopColor: { value: new THREE.Color(0x283340) },
        uMidColor: { value: new THREE.Color(0x5c5852) },
        uHorizonColor: { value: new THREE.Color(0xc98b54) },
        uSunDir: { value: new THREE.Vector3(0.42, 0.23, -0.88).normalize() },
      },
      vertexShader: `
        varying vec3 vWorldDir;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldDir = normalize(position);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 uTopColor;
        uniform vec3 uMidColor;
        uniform vec3 uHorizonColor;
        uniform vec3 uSunDir;
        varying vec3 vWorldDir;
        void main() {
          vec3 d = normalize(vWorldDir);
          float h = clamp(d.y, 0.0, 1.0);
          vec3 col = mix(uHorizonColor, uMidColor, smoothstep(0.0, 0.22, h));
          col = mix(col, uTopColor, smoothstep(0.2, 0.82, h));
          float sunAmt = max(dot(d, uSunDir), 0.0);
          col += vec3(1.0, 0.68, 0.34) * pow(sunAmt, 16.0) * 0.45;
          col += vec3(1.0, 0.90, 0.72) * pow(sunAmt, 220.0) * 1.4;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.group.add(this.skyDome);

    // 2. Warm/Cool 3-Point Outdoor Rig
    this.hemiLight = new THREE.HemisphereLight(0x889bb0, 0x3b3126, 0.85);
    this.group.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xffcb8c, 2.35);
    this.sunLight.position.set(48, 28, -96);
    this.sunLight.castShadow = shadowsEnabled;
    const shadowRes = shadowQuality === 'high' ? 2048 : shadowQuality === 'medium' ? 1024 : 512;
    this.sunLight.shadow.mapSize.set(shadowRes, shadowRes);
    this.sunLight.shadow.camera.near = 5;
    this.sunLight.shadow.camera.far = 220;
    const d = 62;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.03;
    this.group.add(this.sunLight);
    this.group.add(this.sunLight.target);

    // Subtle rim backlight from opposing horizon
    const rimLight = new THREE.DirectionalLight(0x7488a6, 0.55);
    rimLight.position.set(-40, 22, 60);
    this.group.add(rimLight);

    // 3. Large Continuous Heightfield Terrain (extends 360x360 into horizon fog)
    this.buildTerrain(textures);

    // 4. Composite Trench Structures, Duckboards, Sandbags, Pillbox & Shelter
    this.buildMainTrenchSystem(textures);
    this.buildConcretePillbox(textures, -20, -14);
    this.buildCorrugatedShelter(textures, 21, -7);

    // 5. Puddle Reflections in Shell Craters
    this.buildPuddles();

    // 6. Instanced Shattered Trees, Barbed Wire & Scrub Grass
    this.buildBarbedWireLines(textures);
    this.buildShatteredTrees(textures);
    this.buildFoliage(foliageQuality);

    // 7. Interactive Firing Range Targets downrange in No Man's Land
    this.buildRangeTargets(textures);

    // 8. Natural Outer Perimeter Embankment & Ruined Stone Wall Markers
    this.buildOuterPerimeter(textures);

    scene.add(this.group);
  }

  /**
   * Deterministic ground height function used for terrain mesh, prop grounding,
   * player footing, and shell casing bounces.
   */
  public getGroundHeight(x: number, z: number): number {
    // Gentle rolling Somme mud ridges
    let h =
      Math.sin(x * 0.045) * Math.cos(z * 0.04) * 0.85 +
      Math.sin(x * 0.11 + z * 0.08) * 0.25;

    // Gentle distant rise outside playable zone (natural valley bowl perimeter)
    const edgeDist = Math.max(Math.abs(x), Math.abs(z));
    if (edgeDist > this.playableHalfExtent) {
      const t = Math.min(1, (edgeDist - this.playableHalfExtent) / 48);
      h += t * t * 14.0;
    }

    // Main frontline zigzag trench running around z ≈ -2 .. +5
    const zigzagZ = Math.sin(x * 0.14) * 2.6;
    const distFrontTrench = Math.abs(z - zigzagZ);
    if (Math.abs(x) < 42 && distFrontTrench < 2.8) {
      const trenchFactor = 1 - smoothstep(1.15, 2.8, distFrontTrench);
      h -= trenchFactor * 1.45;
    }

    // Communication trench running back from z = 2 to z = 28 around x ≈ 0
    const commX = Math.sin(z * 0.18) * 1.8;
    const distComm = Math.abs(x - commX);
    if (z > 0 && z < 32 && distComm < 2.6) {
      const commFactor = 1 - smoothstep(1.05, 2.6, distComm);
      h -= commFactor * 1.35;
    }

    // Shell craters carved into No Man's Land
    for (let i = 0; i < CRATERS.length; i++) {
      const c = CRATERS[i];
      const dx = x - c.x;
      const dz = z - c.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < c.radius * 1.3) {
        if (dist < c.radius) {
          const bowl = 1 - (dist / c.radius) * (dist / c.radius);
          h -= bowl * c.depth;
        } else {
          // Raised crater lip
          const lip = 1 - Math.abs(dist - c.radius * 1.12) / (c.radius * 0.22);
          if (lip > 0) h += lip * 0.22;
        }
      }
    }

    return h;
  }

  public getSurfaceAt(x: number, z: number): SurfaceType {
    // Check if on duckboard walkway inside frontline or comm trench
    const zigzagZ = Math.sin(x * 0.14) * 2.6;
    if (Math.abs(x) < 40 && Math.abs(z - zigzagZ) < 1.15) {
      return 'wood';
    }
    const commX = Math.sin(z * 0.18) * 1.8;
    if (z > 0 && z < 30 && Math.abs(x - commX) < 1.05) {
      return 'wood';
    }
    // Check puddle craters
    for (let i = 0; i < CRATERS.length; i++) {
      const c = CRATERS[i];
      if (!c.hasPuddle) continue;
      const dx = x - c.x;
      const dz = z - c.z;
      if (dx * dx + dz * dz < (c.radius * 0.56) ** 2) {
        return 'puddle';
      }
    }
    // Pillbox concrete apron
    if (x > -25 && x < -15 && z > -19 && z < -9) {
      return 'concrete';
    }
    return 'mud';
  }

  public resolveCollision(pos: THREE.Vector3, radius: number): void {
    // Clamp to natural battlefield valley
    const limit = this.playableHalfExtent - 3;
    pos.x = THREE.MathUtils.clamp(pos.x, -limit, limit);
    pos.z = THREE.MathUtils.clamp(pos.z, -limit, limit);

    for (let i = 0; i < this.obstacles.length; i++) {
      const b = this.obstacles[i];
      if (pos.y > b.maxY) continue;
      const closestX = THREE.MathUtils.clamp(pos.x, b.minX, b.maxX);
      const closestZ = THREE.MathUtils.clamp(pos.z, b.minZ, b.maxZ);
      const dx = pos.x - closestX;
      const dz = pos.z - closestZ;
      const distSq = dx * dx + dz * dz;
      if (distSq < radius * radius) {
        const dist = Math.sqrt(distSq);
        if (dist > 0.0001) {
          const push = radius - dist;
          pos.x += (dx / dist) * push;
          pos.z += (dz / dist) * push;
        } else {
          // Inside box fallback: push out along nearest edge
          const penLeft = Math.abs(pos.x - b.minX);
          const penRight = Math.abs(b.maxX - pos.x);
          const penFront = Math.abs(pos.z - b.minZ);
          const penBack = Math.abs(b.maxZ - pos.z);
          const minPen = Math.min(penLeft, penRight, penFront, penBack);
          if (minPen === penLeft) pos.x = b.minX - radius;
          else if (minPen === penRight) pos.x = b.maxX + radius;
          else if (minPen === penFront) pos.z = b.minZ - radius;
          else pos.z = b.maxZ + radius;
        }
      }
    }
  }

  private buildTerrain(textures: ProceduralTextureSet): void {
    const size = 340;
    const segments = 150;
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const mudCol = new THREE.Color(0x5a4c3d);
    const ashCol = new THREE.Color(0x36312d);
    const grassCol = new THREE.Color(0x4f5637);
    const tmp = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = this.getGroundHeight(x, z);
      pos.setY(i, y);

      // Splat vertex tint: ash in craters/trenches, olive grass on untouched high ridges
      const n = (Math.sin(x * 0.17) + Math.cos(z * 0.19)) * 0.5;
      tmp.copy(mudCol);
      if (y < -0.35) {
        tmp.lerp(ashCol, 0.72);
      } else if (y > 0.35 && n > 0.05) {
        tmp.lerp(grassCol, Math.min(0.85, (y - 0.35) * 0.9 + n * 0.35));
      }
      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      map: textures.mudAlbedo,
      roughnessMap: textures.mudRoughness,
      vertexColors: true,
      roughness: 0.92,
      metalness: 0.04,
    });

    const terrain = new THREE.Mesh(geo, mat);
    terrain.receiveShadow = true;
    terrain.userData.surface = 'mud' as SurfaceType;
    this.group.add(terrain);
    this.shootables.push(terrain);
  }

  private buildMainTrenchSystem(textures: ProceduralTextureSet): void {
    const woodMat = new THREE.MeshStandardMaterial({
      map: textures.woodAlbedo,
      roughnessMap: textures.woodRoughness,
      roughness: 0.85,
      metalness: 0.05,
    });
    const bagMat = new THREE.MeshStandardMaterial({
      map: textures.sandbagAlbedo,
      roughness: 0.94,
      metalness: 0.02,
    });

    // Duckboard segments & trench revetment timber posts along frontline (-38 to +38)
    const plankGeo = new THREE.BoxGeometry(1.4, 0.08, 1.9);
    const postGeo = new THREE.BoxGeometry(0.16, 1.75, 0.16);
    const wallPanelGeo = new THREE.BoxGeometry(2.05, 1.25, 0.12);
    const bagGeo = new THREE.BoxGeometry(0.92, 0.26, 0.48);

    const step = 2.0;
    for (let x = -38; x <= 38; x += step) {
      const zCenter = Math.sin(x * 0.14) * 2.6;
      const slopeDz = Math.cos(x * 0.14) * 0.14 * 2.6;
      const yaw = -Math.atan(slopeDz);
      const groundY = this.getGroundHeight(x, zCenter);

      // Duckboard walkway
      const board = new THREE.Mesh(plankGeo, woodMat);
      board.position.set(x, groundY + 0.05, zCenter);
      board.rotation.y = yaw;
      board.receiveShadow = true;
      board.castShadow = true;
      board.userData.surface = 'wood' as SurfaceType;
      this.group.add(board);
      this.shootables.push(board);

      // North & South timber trench walls
      for (const side of [-1, 1]) {
        const offsetZ = side * 1.18;
        const wx = x - Math.sin(yaw) * offsetZ;
        const wz = zCenter + Math.cos(yaw) * offsetZ;
        const panel = new THREE.Mesh(wallPanelGeo, woodMat);
        panel.position.set(wx, groundY + 0.55, wz);
        panel.rotation.y = yaw;
        panel.castShadow = true;
        panel.receiveShadow = true;
        panel.userData.surface = 'wood' as SurfaceType;
        this.group.add(panel);
        this.shootables.push(panel);

        if (Math.round(x) % 4 === 0) {
          const post = new THREE.Mesh(postGeo, woodMat);
          post.position.set(wx, groundY + 0.78, wz);
          post.castShadow = true;
          post.receiveShadow = true;
          this.group.add(post);
        }
      }

      // Sandbag parapet along the forward (North, -Z) rim with firing gaps
      if (Math.abs(x) % 10 !== 0) {
        const parZ = zCenter - 1.55;
        const parY = this.getGroundHeight(x, parZ);
        for (let row = 0; row < 2; row++) {
          const bag = new THREE.Mesh(bagGeo, bagMat);
          bag.position.set(x + (row % 2) * 0.35, parY + 0.13 + row * 0.24, parZ);
          bag.rotation.y = yaw + (row === 1 ? 0.04 : -0.04);
          bag.castShadow = true;
          bag.receiveShadow = true;
          bag.userData.surface = 'mud' as SurfaceType;
          this.group.add(bag);
          this.shootables.push(bag);
        }
      }
    }

    // Communication trench duckboards running back to z = 28
    for (let z = 2; z <= 28; z += 2.0) {
      const cx = Math.sin(z * 0.18) * 1.8;
      const groundY = this.getGroundHeight(cx, z);
      const board = new THREE.Mesh(plankGeo, woodMat);
      board.position.set(cx, groundY + 0.05, z);
      board.rotation.y = Math.PI / 2;
      board.receiveShadow = true;
      board.userData.surface = 'wood' as SurfaceType;
      this.group.add(board);
      this.shootables.push(board);
    }

    // Supply crates inside trench bends (composite 3-part crates)
    this.buildSupplyCrateGroup(textures, 5.5, Math.sin(5.5 * 0.14) * 2.6 + 0.45);
    this.buildSupplyCrateGroup(textures, -7.2, Math.sin(-7.2 * 0.14) * 2.6 + 0.45);
  }

  private buildSupplyCrateGroup(textures: ProceduralTextureSet, x: number, z: number): void {
    const group = new THREE.Group();
    const y = this.getGroundHeight(x, z);
    group.position.set(x, y, z);

    const woodMat = new THREE.MeshStandardMaterial({
      map: textures.woodAlbedo,
      roughness: 0.84,
      metalness: 0.06,
    });
    const strapMat = new THREE.MeshStandardMaterial({
      color: 0x2b2d2f,
      roughness: 0.42,
      metalness: 0.85,
    });

    // Primary crate body
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.72, 0.65), woodMat);
    box.position.y = 0.36;
    box.castShadow = true;
    box.receiveShadow = true;
    box.userData.surface = 'wood' as SurfaceType;
    group.add(box);
    this.shootables.push(box);

    // Lid rim
    const lid = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.09, 0.72), woodMat);
    lid.position.y = 0.75;
    lid.castShadow = true;
    group.add(lid);

    // Iron corner bands
    for (const sx of [-0.42, 0.42]) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.74, 0.68), strapMat);
      band.position.set(sx, 0.37, 0);
      group.add(band);
    }

    // Small brass ammo tin on top
    const tin = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.2, 0.22),
      new THREE.MeshStandardMaterial({ color: 0x4b5336, roughness: 0.55, metalness: 0.45 }),
    );
    tin.position.set(0.18, 0.9, 0.04);
    tin.rotation.y = 0.28;
    tin.castShadow = true;
    group.add(tin);

    this.group.add(group);
    this.obstacles.push({
      minX: x - 0.55,
      maxX: x + 0.55,
      minZ: z - 0.42,
      maxZ: z + 0.42,
      maxY: y + 0.95,
    });
  }

  private buildConcretePillbox(textures: ProceduralTextureSet, x: number, z: number): void {
    const group = new THREE.Group();
    const baseY = this.getGroundHeight(x, z);
    group.position.set(x, baseY, z);

    const concMat = new THREE.MeshStandardMaterial({
      map: textures.concreteAlbedo,
      roughness: 0.9,
      metalness: 0.06,
    });
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x2f3235,
      roughness: 0.42,
      metalness: 0.85,
    });

    // Concrete foundation slab
    const slab = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.45, 6.2), concMat);
    slab.position.y = 0.15;
    slab.receiveShadow = true;
    slab.userData.surface = 'concrete' as SurfaceType;
    group.add(slab);
    this.shootables.push(slab);

    // Left & right thick walls
    for (const sx of [-2.6, 2.6]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.5, 5.4), concMat);
      wall.position.set(sx, 1.45, 0);
      wall.castShadow = true;
      wall.receiveShadow = true;
      wall.userData.surface = 'concrete' as SurfaceType;
      group.add(wall);
      this.shootables.push(wall);
    }

    // Front wall lower apron + upper lintel (leaving firing slit)
    const frontLower = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.15, 0.9), concMat);
    frontLower.position.set(0, 0.78, -2.25);
    frontLower.castShadow = true;
    frontLower.receiveShadow = true;
    frontLower.userData.surface = 'concrete' as SurfaceType;
    group.add(frontLower);
    this.shootables.push(frontLower);

    const frontUpper = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.75, 0.95), concMat);
    frontUpper.position.set(0, 2.32, -2.25);
    frontUpper.castShadow = true;
    frontUpper.userData.surface = 'concrete' as SurfaceType;
    group.add(frontUpper);
    this.shootables.push(frontUpper);

    // Beveled concrete roof cap
    const roof = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.65, 6.0), concMat);
    roof.position.set(0, 2.95, 0);
    roof.castShadow = true;
    roof.receiveShadow = true;
    roof.userData.surface = 'concrete' as SurfaceType;
    group.add(roof);
    this.shootables.push(roof);

    // Steel armored embrasure frame + lantern glow inside
    const steelPlate = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.14, 0.25), steelMat);
    steelPlate.position.set(0, 1.42, -2.65);
    group.add(steelPlate);

    const lantern = new THREE.PointLight(0xff9b3d, 2.2, 8.5, 1.8);
    lantern.position.set(0, 2.1, 0);
    group.add(lantern);

    this.group.add(group);

    // Colliders for the side walls and front parapet
    this.obstacles.push(
      { minX: x - 3.15, maxX: x - 2.05, minZ: z - 2.7, maxZ: z + 2.7, maxY: baseY + 3.2 },
      { minX: x + 2.05, maxX: x + 3.15, minZ: z - 2.7, maxZ: z + 2.7, maxY: baseY + 3.2 },
      { minX: x - 2.1, maxX: x + 2.1, minZ: z - 2.7, maxZ: z - 1.8, maxY: baseY + 3.2 },
    );
  }

  private buildCorrugatedShelter(textures: ProceduralTextureSet, x: number, z: number): void {
    const group = new THREE.Group();
    const y = this.getGroundHeight(x, z);
    group.position.set(x, y, z);

    const ironMat = new THREE.MeshStandardMaterial({
      map: textures.corrugatedAlbedo,
      roughness: 0.62,
      metalness: 0.68,
    });
    const woodMat = new THREE.MeshStandardMaterial({
      map: textures.woodAlbedo,
      roughness: 0.88,
      metalness: 0.04,
    });

    // Arched corrugated roof (half-cylinder)
    const archGeo = new THREE.CylinderGeometry(2.1, 2.1, 5.2, 16, 1, true, 0, Math.PI);
    archGeo.rotateZ(Math.PI / 2);
    archGeo.rotateY(Math.PI / 2);
    const arch = new THREE.Mesh(archGeo, ironMat);
    arch.material.side = THREE.DoubleSide;
    arch.position.y = 0.25;
    arch.castShadow = true;
    arch.receiveShadow = true;
    arch.userData.surface = 'metal' as SurfaceType;
    group.add(arch);
    this.shootables.push(arch);

    // Timber framing posts
    for (const sx of [-1.95, 1.95]) {
      for (const sz of [-2.4, 2.4]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.1, 0.18), woodMat);
        post.position.set(sx, 0.95, sz);
        post.castShadow = true;
        group.add(post);
      }
    }

    // Stacked sandbag flank
    const bagMat = new THREE.MeshStandardMaterial({ map: textures.sandbagAlbedo, roughness: 0.95 });
    const flank = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.9, 4.6), bagMat);
    flank.position.set(-2.35, 0.45, 0);
    flank.castShadow = true;
    flank.receiveShadow = true;
    group.add(flank);

    this.group.add(group);
    this.obstacles.push(
      { minX: x - 2.75, maxX: x - 1.75, minZ: z - 2.6, maxZ: z + 2.6, maxY: y + 2.4 },
      { minX: x + 1.75, maxX: x + 2.35, minZ: z - 2.6, maxZ: z + 2.6, maxY: y + 2.4 },
    );
  }

  private buildPuddles(): void {
    const puddleMat = new THREE.MeshPhysicalMaterial({
      color: 0x3b3831,
      roughness: 0.08,
      metalness: 0.25,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      transparent: true,
      opacity: 0.86,
    });

    for (const c of CRATERS) {
      if (!c.hasPuddle) continue;
      const r = c.radius * 0.52;
      const geo = new THREE.CircleGeometry(r, 20);
      geo.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(geo, puddleMat);
      const centerH = this.getGroundHeight(c.x, c.z);
      mesh.position.set(c.x, centerH + 0.14, c.z);
      mesh.receiveShadow = true;
      mesh.userData.surface = 'puddle' as SurfaceType;
      this.group.add(mesh);
      this.shootables.push(mesh);
    }
  }

  private buildBarbedWireLines(textures: ProceduralTextureSet): void {
    const woodMat = new THREE.MeshStandardMaterial({ map: textures.woodAlbedo, roughness: 0.9 });
    const wireMat = new THREE.MeshStandardMaterial({
      color: 0x453e38,
      roughness: 0.52,
      metalness: 0.8,
    });

    // Instanced wooden X-pickets
    const postGeo = new THREE.CylinderGeometry(0.045, 0.055, 1.35, 6);
    const wireGeo = new THREE.TorusGeometry(0.42, 0.018, 5, 14);

    const postMatrices: THREE.Matrix4[] = [];
    const wireMatrices: THREE.Matrix4[] = [];
    const dummy = new THREE.Object3D();

    const rows = [-11, -34];
    for (const rowZ of rows) {
      for (let x = -48; x <= 48; x += 3.2) {
        if (Math.abs(x) < 4 && rowZ === -11) continue; // gap for frontline path
        const z = rowZ + Math.sin(x * 0.25) * 1.4;
        const y = this.getGroundHeight(x, z);

        // Two crossed stakes
        for (const tilt of [-0.48, 0.48]) {
          dummy.position.set(x, y + 0.48, z);
          dummy.rotation.set(tilt, 0.15, 0);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          postMatrices.push(dummy.matrix.clone());
        }

        // Coiled wire loops between stakes
        for (let k = 0; k < 3; k++) {
          dummy.position.set(x + k * 0.9, y + 0.54, z + (k % 2) * 0.08);
          dummy.rotation.set(0.2, Math.PI / 2 + k * 0.25, 0);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          wireMatrices.push(dummy.matrix.clone());
        }
      }
    }

    const postInst = new THREE.InstancedMesh(postGeo, woodMat, postMatrices.length);
    postMatrices.forEach((m, i) => postInst.setMatrixAt(i, m));
    postInst.instanceMatrix.needsUpdate = true;
    postInst.castShadow = true;
    postInst.computeBoundingSphere();
    this.group.add(postInst);

    this.wireInstanced = new THREE.InstancedMesh(wireGeo, wireMat, wireMatrices.length);
    wireMatrices.forEach((m, i) => this.wireInstanced!.setMatrixAt(i, m));
    this.wireInstanced.instanceMatrix.needsUpdate = true;
    this.wireInstanced.computeBoundingSphere();
    this.group.add(this.wireInstanced);
  }

  private buildShatteredTrees(textures: ProceduralTextureSet): void {
    const barkMat = new THREE.MeshStandardMaterial({
      map: textures.woodAlbedo,
      color: 0x4f4338,
      roughness: 0.94,
      metalness: 0.02,
    });

    const treePositions: [number, number, number][] = [
      [-32, -20, 1.15],
      [-44, -44, 1.35],
      [-26, -68, 0.95],
      [34, -22, 1.25],
      [46, -48, 1.05],
      [28, -76, 1.3],
      [-50, 12, 1.2],
      [44, 18, 1.1],
      [-18, 34, 1.0],
      [22, 38, 1.25],
    ];

    for (const [tx, tz, scale] of treePositions) {
      const tree = new THREE.Group();
      const y = this.getGroundHeight(tx, tz);
      tree.position.set(tx, y, tz);
      tree.scale.setScalar(scale);

      // Trunk + snapped top + 2 jagged branch stubs (4-part composite)
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.42, 4.6, 8), barkMat);
      trunk.position.y = 2.3;
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      trunk.userData.surface = 'wood' as SurfaceType;
      tree.add(trunk);
      this.shootables.push(trunk);

      const splinter = new THREE.Mesh(new THREE.ConeGeometry(0.24, 1.1, 6), barkMat);
      splinter.position.y = 5.05;
      splinter.castShadow = true;
      tree.add(splinter);

      const branch1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.15, 1.8, 6), barkMat);
      branch1.position.set(0.65, 3.4, 0.2);
      branch1.rotation.z = -0.85;
      branch1.castShadow = true;
      tree.add(branch1);

      const branch2 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.13, 1.4, 6), barkMat);
      branch2.position.set(-0.55, 2.7, -0.25);
      branch2.rotation.z = 0.92;
      branch2.castShadow = true;
      tree.add(branch2);

      this.group.add(tree);
      this.obstacles.push({
        minX: tx - 0.5 * scale,
        maxX: tx + 0.5 * scale,
        minZ: tz - 0.5 * scale,
        maxZ: tz + 0.5 * scale,
        maxY: y + 5 * scale,
      });
    }
  }

  private buildFoliage(quality: QualityTier): void {
    const count = quality === 'low' ? 140 : quality === 'medium' ? 320 : 600;
    const bladeGeo = new THREE.ConeGeometry(0.14, 0.55, 4);
    bladeGeo.translate(0, 0.27, 0);
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0x5c633b,
      roughness: 0.88,
      metalness: 0.02,
    });

    const inst = new THREE.InstancedMesh(bladeGeo, bladeMat, count);
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    let placed = 0;

    for (let i = 0; i < count * 2 && placed < count; i++) {
      const x = (Math.random() - 0.5) * 140;
      const z = (Math.random() - 0.5) * 140;
      const y = this.getGroundHeight(x, z);
      if (y < -0.15) continue; // keep mud trenches & craters bare
      dummy.position.set(x, y, z);
      dummy.rotation.set((Math.random() - 0.5) * 0.25, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.25);
      const s = 0.7 + Math.random() * 0.65;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      inst.setMatrixAt(placed, dummy.matrix);
      color.setHSL(0.19 + (Math.random() - 0.5) * 0.04, 0.24, 0.26 + Math.random() * 0.12);
      inst.setColorAt(placed, color);
      placed++;
    }

    inst.count = placed;
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.computeBoundingSphere();
    this.foliageInstanced = inst;
    this.group.add(inst);
  }

  private buildRangeTargets(textures: ProceduralTextureSet): void {
    const targetCoords: [number, number][] = [
      [-6, -24],
      [6, -32],
      [-14, -46],
      [18, -58],
      [0, -72],
    ];

    const woodMat = new THREE.MeshStandardMaterial({ map: textures.woodAlbedo, roughness: 0.85 });
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x5a6066,
      roughness: 0.38,
      metalness: 0.82,
    });
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xc27b2b,
      roughness: 0.35,
      metalness: 0.78,
    });

    for (const [tx, tz] of targetCoords) {
      const g = new THREE.Group();
      const y = this.getGroundHeight(tx, tz);
      g.position.set(tx, y, tz);

      // Timber A-frame stand + silhouette steel torso + distinct amber headshot gong
      const postL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.35, 0.1), woodMat);
      postL.position.set(-0.34, 0.67, 0);
      postL.castShadow = true;
      g.add(postL);

      const postR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.35, 0.1), woodMat);
      postR.position.set(0.34, 0.67, 0);
      postR.castShadow = true;
      g.add(postR);

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.72, 0.06), steelMat);
      torso.position.set(0, 1.15, 0);
      torso.castShadow = true;
      torso.userData.surface = 'metal' as SurfaceType;
      torso.userData.targetHit = {
        damageMultiplier: 1.0,
        isCritical: false,
        surface: 'metal',
        targetGroup: g,
      } satisfies TargetHitInfo;
      g.add(torso);
      this.shootables.push(torso);

      const head = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.06, 12), headMat);
      head.rotation.x = Math.PI / 2;
      head.position.set(0, 1.66, 0);
      head.castShadow = true;
      head.userData.surface = 'metal' as SurfaceType;
      head.userData.targetHit = {
        damageMultiplier: 2.0,
        isCritical: true,
        surface: 'metal',
        targetGroup: g,
      } satisfies TargetHitInfo;
      g.add(head);
      this.shootables.push(head);

      this.group.add(g);
      this.rangeTargets.push({ group: g, hitTimer: 0, baseRotX: 0 });
    }
  }

  private buildOuterPerimeter(textures: ProceduralTextureSet): void {
    // Distant ruined farmhouse gable walls on far ridge for WW1 horizon silhouette
    const concMat = new THREE.MeshStandardMaterial({ map: textures.concreteAlbedo, roughness: 0.92 });
    const ruinCoords: [number, number, number][] = [
      [-52, -72, 0.3],
      [48, -68, -0.4],
    ];
    for (const [rx, rz, rot] of ruinCoords) {
      const ruin = new THREE.Group();
      ruin.position.set(rx, this.getGroundHeight(rx, rz), rz);
      ruin.rotation.y = rot;

      const w1 = new THREE.Mesh(new THREE.BoxGeometry(7.5, 4.2, 0.55), concMat);
      w1.position.set(0, 2.0, 0);
      w1.castShadow = true;
      w1.receiveShadow = true;
      ruin.add(w1);

      const w2 = new THREE.Mesh(new THREE.BoxGeometry(0.55, 3.1, 5.2), concMat);
      w2.position.set(-3.4, 1.5, 2.3);
      w2.castShadow = true;
      ruin.add(w2);

      this.group.add(ruin);
    }
  }

  public notifyTargetHit(targetGroup: THREE.Object3D): void {
    const rt = this.rangeTargets.find((t) => t.group === targetGroup);
    if (rt) {
      rt.hitTimer = 0.35;
    }
  }

  public update(dt: number): void {
    for (let i = 0; i < this.rangeTargets.length; i++) {
      const rt = this.rangeTargets[i];
      if (rt.hitTimer > 0) {
        rt.hitTimer = Math.max(0, rt.hitTimer - dt);
        const kick = Math.sin((rt.hitTimer / 0.35) * Math.PI) * 0.28;
        rt.group.rotation.x = rt.baseRotX - kick;
      } else if (rt.group.rotation.x !== 0) {
        rt.group.rotation.x = 0;
      }
    }
  }

  public dispose(): void {
    this.group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        m.geometry.dispose();
        if (Array.isArray(m.material)) {
          m.material.forEach((mat) => mat.dispose());
        } else {
          m.material.dispose();
        }
      }
    });
    if (this.foliageInstanced) this.foliageInstanced.dispose();
    if (this.wireInstanced) this.wireInstanced.dispose();
  }
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}
