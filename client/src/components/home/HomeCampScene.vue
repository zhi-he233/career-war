<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import * as THREE from "three";
import bgUrl from "../../assets/art/home-scene/home_scene_bg.webp";
import groundUrl from "../../assets/art/home-scene/home_scene_ground.webp";
import rogueUrl from "../../assets/art/home-scene/home_node_roguelite.webp";
import pvpUrl from "../../assets/art/home-scene/home_node_pvp.webp";
import pveUrl from "../../assets/art/home-scene/home_node_pve.webp";
import campfireUrl from "../../assets/art/home-scene/home_campfire.webp";

type SceneSelect = "roguelite" | "pvp" | "pve" | "profile";

const props = defineProps<{
  revealed: boolean;
  transitioning: boolean;
}>();

const emit = defineEmits<{
  ready: [];
  fail: [];
  reveal: [];
  select: [mode: SceneSelect];
}>();

const host = ref<HTMLDivElement | null>(null);
const failed = ref(false);

type SceneItem = {
  mesh: THREE.Mesh;
  mode?: SceneSelect | "reveal";
  baseX: number;
  baseY: number;
  hiddenOpacity?: number;
};

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.OrthographicCamera | null = null;
let resizeObserver: ResizeObserver | null = null;
let animationId = 0;
let disposed = false;
let pointerX = 0;
let pointerY = 0;
let hovered: SceneItem | null = null;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const textures: THREE.Texture[] = [];
const geometries: THREE.BufferGeometry[] = [];
const materials: THREE.Material[] = [];
const items: SceneItem[] = [];
const interactiveItems: SceneItem[] = [];
const fullFrameMeshes: THREE.Mesh[] = [];
const clock = new THREE.Clock();

function fitCamera(width: number, height: number): { viewWidth: number; viewHeight: number } {
  const aspect = Math.max(width / Math.max(height, 1), 0.55);
  const viewHeight = 9;
  const viewWidth = viewHeight * aspect;
  if (camera) {
    camera.left = -viewWidth / 2;
    camera.right = viewWidth / 2;
    camera.top = viewHeight / 2;
    camera.bottom = -viewHeight / 2;
    camera.updateProjectionMatrix();
  }
  return { viewWidth, viewHeight };
}

function createPlane(url: string, width: number, height: number, x: number, y: number, z: number, opacity = 1): THREE.Mesh {
  const loader = new THREE.TextureLoader();
  const texture = loader.load(url);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  textures.push(texture);

  const geometry = new THREE.PlaneGeometry(width, height);
  geometries.push(geometry);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  materials.push(material);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.renderOrder = z * 10;
  scene?.add(mesh);
  return mesh;
}

function addItem(
  url: string,
  mode: SceneItem["mode"],
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  hiddenOpacity = 0,
): SceneItem {
  const mesh = createPlane(url, width, height, x, y, z, mode === "reveal" ? 1 : hiddenOpacity);
  const item = { mesh, mode, baseX: x, baseY: y, hiddenOpacity };
  items.push(item);
  if (mode) interactiveItems.push(item);
  return item;
}

function updateRevealState(): void {
  for (const item of items) {
    const material = item.mesh.material as THREE.MeshBasicMaterial;
    if (item.mode === "reveal") {
      material.opacity = props.revealed ? 0.22 : 1;
      item.mesh.scale.setScalar(props.revealed ? 0.72 : 1);
      continue;
    }
    const activeOpacity = props.revealed ? 1 : item.hiddenOpacity ?? 0;
    material.opacity = props.transitioning ? Math.min(1, activeOpacity + 0.2) : activeOpacity;
    item.mesh.visible = material.opacity > 0.02;
  }
}

function resize(): void {
  if (!host.value || !renderer) return;
  const width = host.value.clientWidth || 1;
  const height = host.value.clientHeight || 1;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(width, height, false);
  const { viewWidth, viewHeight } = fitCamera(width, height);

  for (const mesh of fullFrameMeshes) {
    mesh.scale.set(viewWidth / 16, viewHeight / 9, 1);
  }
}

function handlePointerMove(event: PointerEvent): void {
  const rect = host.value?.getBoundingClientRect();
  if (!rect) return;
  pointerX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
  pointerY = ((event.clientY - rect.top) / rect.height - 0.5) * -2;
  pointer.set(pointerX, pointerY);
  updateHover();
}

function updateHover(): void {
  if (!camera || (!props.revealed && !interactiveItems.some((item) => item.mode === "reveal"))) return;
  raycaster.setFromCamera(pointer, camera);
  const candidates = interactiveItems.filter((item) => {
    if (item.mode === "reveal") return !props.revealed;
    return props.revealed;
  });
  const hits = raycaster.intersectObjects(candidates.map((item) => item.mesh), false);
  hovered = hits.length ? candidates.find((item) => item.mesh === hits[0]!.object) ?? null : null;
  if (host.value) host.value.style.cursor = hovered ? "pointer" : "default";
}

function handlePointerLeave(): void {
  pointerX = 0;
  pointerY = 0;
  hovered = null;
  if (host.value) host.value.style.cursor = "default";
}

function handleClick(): void {
  if (!hovered || props.transitioning) return;
  if (hovered.mode === "reveal") {
    emit("reveal");
    return;
  }
  if (hovered.mode) emit("select", hovered.mode);
}

function animate(): void {
  if (disposed || !renderer || !scene || !camera) return;
  const t = clock.getElapsedTime();
  camera.position.x += (pointerX * 0.18 - camera.position.x) * 0.045;
  camera.position.y += (pointerY * 0.10 - camera.position.y) * 0.045;
  camera.lookAt(0, 0, 0);

  for (const item of items) {
    const breathe = Math.sin(t * 2.4 + item.baseX) * 0.035;
    const hoverBoost = hovered === item ? 0.14 : 0;
    const active = item.mode === "reveal" || props.revealed;
    const targetScale = active ? 1 + breathe + hoverBoost : 1;
    item.mesh.scale.x += (targetScale - item.mesh.scale.x) * 0.12;
    item.mesh.scale.y += (targetScale - item.mesh.scale.y) * 0.12;
    item.mesh.position.y = item.baseY + (hovered === item ? 0.12 : 0) + Math.sin(t * 1.3 + item.baseX) * 0.025;
  }

  renderer.render(scene, camera);
  animationId = requestAnimationFrame(animate);
}

function init(): void {
  if (!host.value) return;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch {
    failed.value = true;
    emit("fail");
    return;
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.value.appendChild(renderer.domElement);
  scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera(-8, 8, 4.5, -4.5, 0.1, 100);
  camera.position.set(0, 0, 10);

  fullFrameMeshes.push(createPlane(bgUrl, 16, 9, 0, 0, -8, 1));
  fullFrameMeshes.push(createPlane(groundUrl, 16, 9, 0, -0.42, -2, 0.96));
  addItem(campfireUrl, "reveal", 0, -2.55, 2.7, 1.72, 1.24, 1);
  addItem(rogueUrl, "roguelite", -0.62, 0.18, 3.3, 2.56, 2.4, 0);
  addItem(pvpUrl, "pvp", -3.68, -1.32, 3.4, 1.78, 1.83, 0);
  addItem(pveUrl, "pve", 3.35, -1.02, 3.4, 1.98, 1.6, 0);
  addItem(campfireUrl, "profile", 0.22, -2.98, 3.55, 1.15, 0.83, 0);

  resize();
  updateRevealState();
  host.value.addEventListener("pointermove", handlePointerMove);
  host.value.addEventListener("pointerleave", handlePointerLeave);
  host.value.addEventListener("click", handleClick);
  resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host.value);
  animate();
  emit("ready");
}

function dispose(): void {
  disposed = true;
  cancelAnimationFrame(animationId);
  resizeObserver?.disconnect();
  if (host.value) {
    host.value.removeEventListener("pointermove", handlePointerMove);
    host.value.removeEventListener("pointerleave", handlePointerLeave);
    host.value.removeEventListener("click", handleClick);
  }
  for (const texture of textures) texture.dispose();
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  renderer?.dispose();
  renderer?.domElement.remove();
  items.length = 0;
  interactiveItems.length = 0;
  fullFrameMeshes.length = 0;
  renderer = null;
  scene = null;
  camera = null;
}

watch(() => [props.revealed, props.transitioning] as const, updateRevealState);

onMounted(init);
onUnmounted(dispose);
</script>

<template>
  <div ref="host" class="home-camp-scene" :class="{ failed }">
    <div v-if="failed" class="home-camp-fallback" aria-live="polite">
      <strong>迷雾森林</strong>
      <span>场景暂时无法渲染，仍可从入口进入游戏。</span>
    </div>
  </div>
</template>

<style scoped>
.home-camp-scene {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: #1c302d;
}

.home-camp-scene :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}

.home-camp-fallback {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  gap: 8px;
  padding: 20px;
  background:
    radial-gradient(circle at 50% 10%, rgba(128, 81, 201, 0.26), transparent 32%),
    linear-gradient(180deg, #243a34 0%, #12211d 100%);
  color: #fff7dc;
  text-align: center;
}

.home-camp-fallback strong {
  font-size: 30px;
  font-weight: 1000;
}
</style>
