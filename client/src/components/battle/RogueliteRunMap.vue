<script lang="ts">
const routeByRun = new Map<string, Map<number, string>>();
</script>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import {
  ROGUELITE_MAP_RULES,
  ROGUELITE_ROOM_TYPES,
  ROGUELITE_ROOM_TYPE_LABELS,
  createRogueliteMapLayer,
  getRogueliteConnectedNodeIds,
  getRogueliteMapNodeId,
  getRogueliteMapStagePrimaryType,
  getRogueliteMapWorldY,
} from "@career-war/shared";
import type { RogueliteMapNodeSelection, RogueliteMapRoomType, Room } from "@career-war/shared";
import RogueliteMapNode from "./RogueliteMapNode.vue";
import RogueliteRoomPanel from "./RogueliteRoomPanel.vue";
import type { NodeStatus } from "./RogueliteMapNode.vue";

const p = defineProps<{ room: Room; playerId: string }>();
const emit = defineEmits<{ challenge: [node: RogueliteMapNodeSelection]; openBuild: []; back: [] }>();

type RogueliteRoomFlow = "map" | "battle" | "event" | "shop" | "rest" | "reward";

function isMega(s: number) { return s % 15 === 0; }
function bossDist(c: number) { let t = c; while (getRogueliteMapStagePrimaryType(t) !== "boss") t++; return t - c; }

const LABEL = ROGUELITE_ROOM_TYPE_LABELS;
function phase(s: number): string {
  if (s <= 3) return "第1阶段：职场试炼";
  if (s <= 6) return "第2阶段：骰子乱斗";
  if (s <= 9) return "第3阶段：精英压力";
  if (s <= 12) return "第4阶段：Boss前夜";
  if (s <= 18) return "第5阶段：无尽挑战";
  return "无尽挑战";
}

// ── derived ──

const me = computed(() => p.room.players.find((pl) => pl.id === p.playerId));
const hpVal = computed(() => me.value?.hp ?? 0);
const maxHpVal = computed(() => me.value?.maxHp ?? 40);
const serverStage = computed(() => Math.max(p.room.roguelite?.stage ?? 1, 1));
const currentStage = computed(() => serverStage.value);
const serverRouteKey = computed(() =>
  Object.entries(p.room.roguelite?.mapRoute ?? {})
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([stage, id]) => `${stage}:${id}`)
    .join("|")
);
const activeRoomMode = ref<RogueliteRoomFlow>("map");
const gold = computed(() => {
  const g = p.room.roguelite?.runGold;
  return typeof g === "number" ? g : 0;
});
const bText = computed(() => {
  const d = bossDist(currentStage.value);
  if (d === 0) return isMega(currentStage.value) ? "大Boss关" : "Boss关";
  return `Boss还有${d}关`;
});

// ── viewport ──

const DEFAULT_VIEW_H = 620;
const WORLD_BASE_Y = ROGUELITE_MAP_RULES.worldBaseY;
const PREGEN_AHEAD = ROGUELITE_MAP_RULES.pregenAhead;
const NODE_HIDE_PAD = 160;
const NODE_HALF_H = 90;

const LOOK_BACK = ROGUELITE_MAP_RULES.lookBack;

function nodeId(stage: number, branch: number): string {
  return getRogueliteMapNodeId(stage, branch);
}

// ── node data ──

interface N {
  id: string; stage: number; type: RogueliteMapRoomType; status: NodeStatus;
  x: number; worldY: number;
}

const selectedNodeId = ref<string | null>(null);
const pendingNodeId = ref<string | null>(null);
const routeVersion = ref(0);
const runKey = computed(() => `${p.room.id}:${p.playerId}`);
const viewportEl = ref<HTMLElement | null>(null);
const viewportHeight = ref(DEFAULT_VIEW_H);
const dragY = ref(0);
const isDragging = ref(false);
const dragStartY = ref(0);
const dragStartOffset = ref(0);
const suppressClick = ref(false);
let resizeObserver: ResizeObserver | null = null;

function routes(): Map<number, string> {
  let existing = routeByRun.get(runKey.value);
  if (!existing) {
    existing = new Map<number, string>();
    routeByRun.set(runKey.value, existing);
  }
  return existing;
}

function rememberPastRoute(stage: number): void {
  const rs = routes();
  for (let s = 1; s < stage; s++) {
    if (!rs.has(s)) rs.set(s, nodeId(s, 0));
  }
}

function setRoute(stage: number, id: string): void {
  routes().set(stage, id);
  routeVersion.value++;
}

watch(
  () => [runKey.value, serverStage.value, serverRouteKey.value, p.room.roguelite?.currentMapNode?.id ?? ""] as const,
  ([, stage]) => {
    activeRoomMode.value = "map";
    rememberPastRoute(stage);
    for (const [routeStage, id] of Object.entries(p.room.roguelite?.mapRoute ?? {})) {
      routes().set(Number(routeStage), id);
    }
    const serverNode = p.room.roguelite?.currentMapNode;
    if (serverNode && serverNode.stage <= stage) {
      routes().set(serverNode.stage, serverNode.id);
    }
    routeVersion.value++;
    if (stage === 1) {
      setRoute(1, nodeId(1, 0));
      selectedNodeId.value = nodeId(1, 0);
      pendingNodeId.value = null;
      return;
    }
    selectedNodeId.value = routes().get(stage) ?? null;
    pendingNodeId.value = null;
  },
  { immediate: true }
);

const routeChoicePending = computed(() => {
  routeVersion.value;
  return currentStage.value > 1 && !routes().has(currentStage.value);
});
const anchorStage = computed(() => routeChoicePending.value ? currentStage.value - 1 : currentStage.value);
const visFrom = computed(() => Math.max(1, anchorStage.value - LOOK_BACK));
const visTo = computed(() => currentStage.value + PREGEN_AHEAD);

function worldY(stage: number): number {
  return getRogueliteMapWorldY(stage);
}

const worldHeight = computed(() => WORLD_BASE_Y + 420);
const currentAnchorY = computed(() => Math.min(viewportHeight.value - 210, viewportHeight.value - 150));

function screenY(node: N): number {
  return node.worldY + cameraY.value + dragY.value;
}

function isNearViewport(node: N): boolean {
  const y = screenY(node);
  return y > -NODE_HIDE_PAD && y < viewportHeight.value + NODE_HIDE_PAD;
}

function connectedTargets(from: N, nextLayer: N[]): Set<string> {
  return getRogueliteConnectedNodeIds(from, nextLayer);
}

const nodes = computed<N[]>(() => {
  routeVersion.value;
  const out: N[] = [];
  const rs = routes();
  for (let s = visFrom.value; s <= visTo.value; s++) {
    for (const draft of createRogueliteMapLayer(s)) {
      out.push({
        id: draft.id,
        stage: draft.stage,
        type: draft.type,
        status: "locked",
        x: draft.x,
        worldY: worldY(draft.stage),
      });
    }
  }

  const byStage = new Map<number, N[]>();
  for (const node of out) {
    if (!byStage.has(node.stage)) byStage.set(node.stage, []);
    byStage.get(node.stage)!.push(node);
  }

  const previousLayer = byStage.get(currentStage.value - 1) ?? [];
  const previousRouteId = rs.get(currentStage.value - 1) ?? nodeId(currentStage.value - 1, 0);
  const previousRouteNode = previousLayer.find((node) => node.id === previousRouteId);
  const availableIds = previousRouteNode
    ? connectedTargets(previousRouteNode, byStage.get(currentStage.value) ?? [])
    : new Set<string>();

  for (const node of out) {
    const chosenAtStage = rs.get(node.stage);
    if (node.stage < currentStage.value) {
      node.status = chosenAtStage === node.id ? "cleared" : "locked";
    } else if (node.stage === currentStage.value) {
      if (currentStage.value === 1 || chosenAtStage) {
        node.status = (chosenAtStage ?? nodeId(1, 0)) === node.id ? "current" : "locked";
      } else if (pendingNodeId.value === node.id) {
        node.status = "pending";
      } else {
        node.status = availableIds.has(node.id) ? "available" : "locked";
      }
    } else {
      node.status = "preview";
    }
  }

  return out;
});

const visibleNodes = computed(() => nodes.value.filter(isNearViewport));

// ── SVG edges ──

interface E { path: string; cls: string }
const edges = computed<E[]>(() => {
  const out: E[] = [];
  const byStage = new Map<number, N[]>();
  for (const nd of nodes.value) {
    if (!byStage.has(nd.stage)) byStage.set(nd.stage, []);
    byStage.get(nd.stage)!.push(nd);
  }

  function add(x1: number, y1: number, x2: number, y2: number, cls: string) {
    const mx = (x1 + x2) / 2; const my = (y1 + y2) / 2;
    out.push({ path: `M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`, cls });
  }

  for (let s = visFrom.value; s < visTo.value; s++) {
    const curLayer = byStage.get(s);
    const nextLayer = byStage.get(s + 1);
    if (!curLayer || !nextLayer) continue;
    let edgeBudget = ROGUELITE_MAP_RULES.maxConnectionsBetweenLayers;
    for (const cn of curLayer) {
      if (edgeBudget <= 0) break;
      if (cn.status === "locked") continue;
      const targetIds = connectedTargets(cn, nextLayer);
      const targets = nextLayer.filter((node) => targetIds.has(node.id));
      for (const tn of targets) {
        if (edgeBudget <= 0) break;
        let edgeCls = "e-locked";
        if (cn.status === "cleared" && tn.status === "cleared") edgeCls = "e-done";
        else if (cn.status === "cleared" && (tn.status === "available" || tn.status === "pending")) edgeCls = "e-active";
        else if (cn.status === "current" && tn.status === "preview") edgeCls = "e-next";
        add(cn.x, cn.worldY, tn.x, tn.worldY, edgeCls);
        edgeBudget--;
      }
    }
  }
  return out;
});

const visibleEdges = computed(() => edges.value.filter((edge) => {
  const nums = edge.path.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const ys = nums.filter((_, index) => index % 2 === 1);
  return ys.some((y) => y + cameraY.value + dragY.value > -NODE_HIDE_PAD && y + cameraY.value + dragY.value < viewportHeight.value + NODE_HIDE_PAD);
}));

// ── selection ──

function onSelect(nd: N) {
  if (nd.status !== "available" && nd.status !== "pending" && nd.status !== "current") return;
  if (nd.stage !== currentStage.value) return;
  if (nd.status === "current") {
    selectedNodeId.value = nd.id;
    return;
  }
  pendingNodeId.value = nd.id;
}

function confirmPendingRoute() {
  const node = pendingNode.value;
  if (!node || node.stage !== currentStage.value) return;
  setRoute(node.stage, node.id);
  selectedNodeId.value = node.id;
  pendingNodeId.value = null;
}

function startBattleForCurrentNode() {
  const node = currentNode.value;
  if (!node || node.stage !== currentStage.value) return;
  if (!ROGUELITE_ROOM_TYPES[node.type].entersBattle) return;
  activeRoomMode.value = "battle";
  emit("challenge", { id: node.id, stage: node.stage, type: node.type });
}

function enterCurrentRoom() {
  const node = currentNode.value;
  if (!node || node.stage !== currentStage.value) return;
  switch (node.type) {
    case "normal":
    case "elite":
    case "boss":
      startBattleForCurrentNode();
      break;
    case "event":
      activeRoomMode.value = "map";
      emit("challenge", { id: node.id, stage: node.stage, type: node.type });
      break;
    case "shop":
    case "rest":
    case "reward":
      activeRoomMode.value = node.type;
      break;
  }
}

function completeCurrentRoom(_result: { type: RogueliteMapRoomType; action: string }) {
  const node = currentNode.value;
  if (!node || node.stage !== currentStage.value) return;
  activeRoomMode.value = "map";
  emit("challenge", { id: node.id, stage: node.stage, type: node.type });
  pendingNodeId.value = null;
  selectedNodeId.value = routes().get(currentStage.value) ?? null;
  routeVersion.value++;
}

function handleBack() {
  emit("back");
}

function closeRoomPanel() {
  activeRoomMode.value = "map";
}

const curNode = computed(() => nodes.value.find((n) => n.status === "current"));
const currentNode = curNode;
const pendingNode = computed(() => nodes.value.find((n) => n.status === "pending"));
const cameraAnchorNode = computed(() => {
  if (currentNode.value) return currentNode.value;
  if (pendingNode.value) return pendingNode.value;
  const previousRouteId = routes().get(currentStage.value - 1) ?? nodeId(currentStage.value - 1, 0);
  return nodes.value.find((n) => n.id === previousRouteId) ?? nodes.value.find((n) => n.stage === anchorStage.value);
});
const cameraY = computed(() => currentAnchorY.value - (cameraAnchorNode.value?.worldY ?? worldY(anchorStage.value)));
const worldTransform = computed(() => `translateY(${cameraY.value + dragY.value}px)`);
const worldStyle = computed(() => ({
  "--world-height": `${worldHeight.value}px`,
  transform: worldTransform.value,
}));
const minDragY = computed(() => Math.max(NODE_HALF_H - currentAnchorY.value, -260));
const maxDragY = computed(() => Math.min(viewportHeight.value + NODE_HALF_H - currentAnchorY.value, 360));
const clampedDragY = computed(() => Math.min(maxDragY.value, Math.max(minDragY.value, dragY.value)));
const ENTER_BUTTON_TEXT: Record<RogueliteMapRoomType, string> = {
  normal: "开打",
  elite: "挑战精英",
  boss: "挑战 Boss",
  event: "查看事件",
  shop: "进入商店",
  rest: "休息一下",
  reward: "领取奖励",
};
const primaryButtonText = computed(() => pendingNode.value ? "确认路线" : currentNode.value ? ENTER_BUTTON_TEXT[currentNode.value.type] : "开打");
const primaryDisabled = computed(() => !pendingNode.value && !currentNode.value);
const bottomText = computed(() => {
  if (pendingNode.value) return `待选第${pendingNode.value.stage}关 · ${LABEL[pendingNode.value.type]}`;
  if (!currentNode.value) return `选择第${currentStage.value}关路线`;
  const suffix = ROGUELITE_ROOM_TYPES[currentNode.value.type].entersBattle ? "战斗" : "房间";
  return `第${currentNode.value.stage}关 · ${LABEL[currentNode.value.type]}${suffix}`;
});

function handlePrimaryAction() {
  if (pendingNode.value) {
    confirmPendingRoute();
    return;
  }
  enterCurrentRoom();
}

function syncViewportHeight(): void {
  viewportHeight.value = viewportEl.value?.clientHeight || DEFAULT_VIEW_H;
  dragY.value = clampedDragY.value;
}

function pointerY(event: PointerEvent): number {
  return event.clientY;
}

function handlePointerDown(event: PointerEvent): void {
  if (event.button !== 0) return;
  isDragging.value = true;
  suppressClick.value = false;
  dragStartY.value = pointerY(event);
  dragStartOffset.value = dragY.value;
  viewportEl.value?.setPointerCapture(event.pointerId);
}

function handlePointerMove(event: PointerEvent): void {
  if (!isDragging.value) return;
  const delta = pointerY(event) - dragStartY.value;
  if (Math.abs(delta) > 5) suppressClick.value = true;
  dragY.value = Math.min(maxDragY.value, Math.max(minDragY.value, dragStartOffset.value + delta));
}

function handlePointerUp(event: PointerEvent): void {
  if (!isDragging.value) return;
  isDragging.value = false;
  dragY.value = clampedDragY.value;
  viewportEl.value?.releasePointerCapture(event.pointerId);
  window.setTimeout(() => { suppressClick.value = false; }, 0);
}

function handleWheel(event: WheelEvent): void {
  event.preventDefault();
  dragY.value = Math.min(maxDragY.value, Math.max(minDragY.value, dragY.value + event.deltaY * 0.45));
}

watch(
  () => [runKey.value, currentStage.value] as const,
  () => {
    dragY.value = 0;
  }
);

onMounted(() => {
  syncViewportHeight();
  if (viewportEl.value) {
    resizeObserver = new ResizeObserver(syncViewportHeight);
    resizeObserver.observe(viewportEl.value);
  }
});

onUnmounted(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
});
</script>

<template>
  <div class="m-root">
    <!-- ═══ resource bar ═══ -->
    <header class="m-res">
      <span class="chip c-red"><i>❤️</i>{{ hpVal }}/{{ maxHpVal }}</span>
      <span class="chip c-amber"><i>🪙</i>{{ gold }}</span>
      <span class="chip c-blue"><i>🚪</i>第{{ currentStage }}关</span>
      <span class="chip c-pink"><i>👑</i>{{ bText }}</span>
    </header>

    <!-- ═══ info card ═══ -->
    <section class="m-info">
      <div class="m-info-l"><h2>{{ phase(currentStage) }}</h2><p>选择路线，击败敌人，拿奖励成长。</p></div>
      <button class="m-info-btn" type="button" @click.stop.prevent="emit('openBuild')">构筑</button>
    </section>

    <!-- ═══ MAP VIEWPORT ═══ -->
    <div
      ref="viewportEl"
      class="map-viewport"
      :class="{ dragging: isDragging }"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointercancel="handlePointerUp"
      @wheel="handleWheel"
    >
      <div class="m-bg"></div>
      <div class="map-world" :style="worldStyle">

        <!-- SVG edges -->
        <svg class="map-lines" :viewBox="`0 0 100 ${worldHeight}`" preserveAspectRatio="none">
          <path v-for="(e, i) in visibleEdges" :key="'e'+i" :d="e.path" :class="['edge', e.cls]" />
        </svg>

        <!-- 3D nodes -->
        <div
          v-for="nd in visibleNodes" :key="nd.id"
          class="map-node-anchor"
          :class="{ 'm-cur': nd.status==='current', 'm-pending': nd.status==='pending', 'm-sel': selectedNodeId===nd.id || pendingNodeId===nd.id }"
          :style="{ '--nx': nd.x, '--wy': nd.worldY + 'px' }"
        >
          <RogueliteMapNode
            :type="nd.type"
            :status="nd.status"
            :label="LABEL[nd.type]"
            @select="!suppressClick && onSelect(nd)"
          />
        </div>
      </div>

      <RogueliteRoomPanel
        v-if="activeRoomMode === 'shop' || activeRoomMode === 'rest' || activeRoomMode === 'reward'"
        :type="activeRoomMode"
        :stage="currentStage"
        @complete="completeCurrentRoom"
        @close="closeRoomPanel"
      />
    </div>

    <!-- ═══ bottom ═══ -->
    <footer class="m-bot">
      <button class="m-bot-back" type="button" @click.stop.prevent="handleBack">返回</button>
      <span class="m-bot-info">{{ bottomText }}</span>
      <button class="m-bot-go" type="button" :disabled="primaryDisabled" @click.stop.prevent="handlePrimaryAction">{{ primaryButtonText }}</button>
    </footer>
  </div>
</template>

<style scoped>
/* ══════ SHELL ══════ */
.m-root { display:flex; flex-direction:column; height:100%; min-height:0; overflow:hidden; background:#f6f2e9; font-family:var(--font-body); }

/* ══════ RESOURCE BAR ══════ */
.m-res { flex:0 0 auto; display:flex; align-items:center; gap:5px; padding:7px 10px; overflow-x:auto; background:rgba(255,255,255,.60); backdrop-filter:blur(4px); }
.chip { flex:0 0 auto; display:flex; align-items:center; gap:3px; padding:4px 10px; border-radius:18px; font-size:12px; font-weight:800; line-height:1.2; white-space:nowrap; }
.chip i { font-style:normal; font-size:13px; }
.c-red{background:#fee2e2;color:#b91c1c} .c-amber{background:#fef3c7;color:#92400e} .c-amber.off{color:#b8a88a;background:#f4efe8} .c-blue{background:#dbeafe;color:#1e40af} .c-pink{background:#fce7f3;color:#9d174d}

/* ══════ INFO CARD ══════ */
.m-info { flex:0 0 auto; display:flex; align-items:center; gap:10px; margin:6px 10px 0; padding:10px 14px; border-radius:16px; background:#fff; box-shadow:0 1px 6px rgba(100,70,30,.05); }
.m-info-l{flex:1;min-width:0} .m-info-l h2{margin:0;font-size:16px;font-weight:900;color:#3e2e1a} .m-info-l p{margin:2px 0 0;font-size:11px;font-weight:700;color:#8b7355}
.m-info-btn{flex:0 0 auto;padding:6px 16px;border:1.5px solid #d4c8a8;border-radius:20px;background:#fffdf5;color:#8b6914;font-size:13px;font-weight:800;cursor:pointer} .m-info-btn:active{transform:scale(.95)}

/* ══════ VIEWPORT ══════ */
.map-viewport {
  flex:1 1 auto; min-height:380px; max-height:560px;
  position:relative; width:100%; max-width:460px;
  margin:12px auto 0; border-radius:14px; overflow:hidden;
  touch-action:none; overscroll-behavior:contain; cursor:grab;
  background: radial-gradient(circle at 18% 30%,rgba(210,190,150,.10) 0%,transparent 55%),
              radial-gradient(circle at 82% 68%,rgba(200,175,135,.08) 0%,transparent 55%),
              linear-gradient(176deg,#fdfaf2 0%,#f5efdf 40%,#efe6d0 100%);
  box-shadow:inset 0 2px 6px rgba(140,110,70,.04);
}
.map-viewport.dragging { cursor:grabbing; }
.map-world {
  position:absolute; left:0; top:0; width:100%; height:var(--world-height);
  transition:transform 420ms cubic-bezier(.2,.9,.2,1);
  will-change:transform;
}
.map-viewport.dragging .map-world { transition:none; }
.m-bg { position:absolute; inset:0; pointer-events:none; z-index:0;
  background-image:radial-gradient(circle,rgba(185,160,130,.11) 1.2px,transparent 1.2px);
  background-size:24px 24px; }

/* ── SVG edges ── */
.map-lines { position:absolute; left:0; top:0; width:100%; height:var(--world-height); pointer-events:none; z-index:1; }
.edge { fill:none; stroke-linecap:round; stroke-linejoin:round; }
.e-done   { stroke:rgba(200,160,80,0.46); stroke-width:3.2; }
.e-active { stroke:rgba(242,171,44,0.62); stroke-width:3.4; stroke-dasharray:8 10; animation:dash 1.4s linear infinite; }
.e-next   { stroke:rgba(210,180,90,0.24); stroke-width:2.4; stroke-dasharray:5 9; }
.e-locked { stroke:rgba(160,130,80,0.13); stroke-width:1.8; stroke-dasharray:4 12; }
@keyframes dash { to { stroke-dashoffset:-36; } }

/* ── node anchors ── */
.map-node-anchor { position:absolute; left:calc(var(--nx) * 1%); top:var(--wy); transform:translate(-50%,-50%); z-index:5; }
.m-cur { z-index:8; }
.m-pending { z-index:7; }
.m-sel { z-index:7; filter:brightness(1.08) drop-shadow(0 0 8px rgba(245,158,11,.45)); }

/* ══════ BOTTOM ══════ */
.m-bot { flex:0 0 auto; display:flex; align-items:center; gap:10px; padding:10px 14px calc(10px + env(safe-area-inset-bottom, 0px)); min-height:60px; background:rgba(255,255,255,.88); backdrop-filter:blur(6px); border-top:1px solid rgba(180,155,120,.18); }
.m-bot-info { flex:1; min-width:0; text-align:center; font-size:13px; font-weight:800; color:#5c4a2a; }
.m-bot-back { flex:0 0 auto; min-width:72px; min-height:42px; padding:8px 14px; border:1.5px solid #d9ccb2; border-radius:18px; background:#fffaf0; color:#6f5a34; font-size:14px; font-weight:900; cursor:pointer; }
.m-bot-back:active{transform:translateY(2px)}
.m-bot-go { flex:0 0 auto; min-width:110px; min-height:50px; padding:11px 20px; border:0; border-radius:24px;
  background:linear-gradient(175deg,#ffb840 0%,#f09020 50%,#e07810 100%); color:#fff;
  font-size:18px; font-weight:900; letter-spacing:.5px; cursor:pointer;
  box-shadow:0 6px 0 #b85810,0 7px 16px rgba(170,80,20,.30); transition:all 70ms ease; }
.m-bot-go:active:not(:disabled){transform:translateY(4px);box-shadow:0 2px 0 #b85810,0 3px 6px rgba(170,80,20,.18)}
.m-bot-go:disabled{opacity:.45;cursor:not-allowed;filter:grayscale(.3)}

/* ══════ RESPONSIVE ══════ */
@media(max-width:430px){
  .map-viewport{min-height:340px;max-height:460px;margin-top:10px}
  .m-res{gap:3px;padding:5px 7px} .chip{font-size:10px;padding:3px 7px} .chip i{font-size:11px}
  .m-info{margin:4px 8px 0;padding:8px 10px} .m-info-l h2{font-size:14px} .m-info-l p{font-size:10px}
  .m-bot{padding:8px 10px calc(8px + env(safe-area-inset-bottom, 0px));min-height:52px;gap:7px} .m-bot-go{min-width:92px;min-height:44px;padding:8px 14px;font-size:16px} .m-bot-back{min-width:60px;min-height:38px;padding:7px 10px;font-size:13px}
}
@media(max-width:370px),(max-height:680px){
  .map-viewport{min-height:300px;max-height:400px;margin-top:8px}
  .m-res{gap:2px;padding:4px 5px} .chip{font-size:9px;padding:2px 5px} .chip i{font-size:10px}
  .m-bot-info{font-size:12px}.m-bot-go{min-width:80px;min-height:38px;padding:6px 10px;font-size:14px}.m-bot-back{min-width:54px;min-height:34px;padding:5px 8px;font-size:12px}
}
</style>

<style>body:has(.m-root) .net-diagnostics{display:none!important}</style>
