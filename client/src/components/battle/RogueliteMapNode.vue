<script setup lang="ts">
import { computed } from "vue";
import { ROGUELITE_ROOM_TYPE_ICONS, ROGUELITE_ROOM_TYPE_LABELS } from "@career-war/shared";
import type { RogueliteMapRoomType } from "@career-war/shared";

export type RoomType = RogueliteMapRoomType;

export type NodeStatus =
  | "current" | "available" | "pending" | "preview" | "locked" | "cleared";

const props = defineProps<{ type: RoomType; status: NodeStatus; label?: string }>();
defineEmits<{ select: [] }>();

const clickable = computed(() => props.status === "current" || props.status === "available" || props.status === "pending");

const icon = computed(() => {
  return ROGUELITE_ROOM_TYPE_ICONS[props.type] ?? "⚔️";
});

const typeName = computed(() => {
  return props.label || ROGUELITE_ROOM_TYPE_LABELS[props.type] || "";
});

const sz = computed(() => {
  if (props.type === "boss") return "s-lg";
  if (props.type === "elite") return "s-md";
  return "s-base";
});

const showTypeLabel = computed(() => props.status !== "current" && props.status !== "available" && props.status !== "pending");
</script>

<template>
  <button
    class="nd"
    :class="[`t-${type}`, `st-${status}`, sz, { ok: clickable }]"
    :disabled="!clickable"
    :aria-label="typeName"
    @click.stop.prevent="clickable && $emit('select')"
  >
    <span class="glow"></span>
    <span class="shd"></span>

    <span class="cube">
      <span class="top"><span class="ico">{{ icon }}</span></span>
      <span class="sd sd-l"></span>
      <span class="sd sd-r"></span>
    </span>

    <span v-if="showTypeLabel" class="lbl">{{ typeName }}</span>

    <!-- badges -->
    <span v-if="status==='current'" class="badge badge-cur">当前</span>
    <span v-else-if="status==='available'" class="badge badge-av">可选</span>
    <span v-else-if="status==='pending'" class="badge badge-pend">待选</span>
    <!-- preview/locked/cleared: no badge -->

    <span v-if="status==='cleared'" class="ck">✓</span>
  </button>
</template>

<style scoped>
/* ══════ NODE ══════ */
.nd {
  position:relative; width:88px; height:82px;
  border:0; background:transparent; padding:0;
  cursor:default; user-select:none;
  -webkit-tap-highlight-color:transparent;
  display:flex; align-items:center; justify-content:center;
}
.nd.ok { cursor:pointer; }

/* ══════ GLOW + SHADOW ══════ */
.glow { position:absolute; left:50%; top:36px; width:66px; height:66px; transform:translate(-50%,-50%); border-radius:50%; background:var(--g); opacity:0; filter:blur(12px); z-index:0; }
.st-current .glow,
.st-available .glow,
.st-pending .glow { opacity:1; }

.shd { position:absolute; left:50%; top:58px; width:58px; height:14px; transform:translateX(-50%); border-radius:50%; background:rgba(75,48,18,.18); filter:blur(6px); z-index:0; }

/* ══════ CUBE ══════ */
.cube { position:absolute; left:50%; top:7px; width:72px; height:56px; transform:translateX(-50%); transition:transform .14s ease,filter .14s ease; z-index:3; }
.top { position:absolute; left:50%; top:0; width:72px; height:52px; transform:translateX(-50%); clip-path:polygon(50% 0%,100% 50%,50% 100%,0% 50%); background:var(--c); box-shadow:inset 0 5px 0 rgba(255,255,255,.36),inset 0 -5px 0 rgba(0,0,0,.10); z-index:5; display:flex; align-items:center; justify-content:center; }
.ico { font-size:24px; line-height:1; filter:drop-shadow(0 2px 0 rgba(0,0,0,.15)); z-index:6; }
.sd { position:absolute; top:26px; width:36px; height:26px; z-index:4; }
.sd-l { left:0;  clip-path:polygon(0 0,100% 100%,100% 52%,0 0); background:var(--sl); }
.sd-r { right:0; clip-path:polygon(100% 0,0 100%,0 52%,100% 0); background:var(--sr); }

/* ══════ LABEL ══════ */
.lbl { position:absolute; left:50%; top:64px; transform:translateX(-50%); max-width:58px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; padding:1px 6px; border-radius:8px; background:rgba(255,255,255,.88); color:#5b3c1a; font-size:9px; font-weight:900; line-height:1.3; box-shadow:0 1px 0 rgba(95,70,34,.12); z-index:7; }

/* ══════ BADGE ══════ */
.badge { position:absolute; left:50%; top:-6px; transform:translateX(-50%); padding:2px 8px; border-radius:10px; font-size:10px; font-weight:900; line-height:1.2; white-space:nowrap; z-index:9; pointer-events:none; }
.badge-cur { background:#ffd85a; color:#8a4b00; box-shadow:0 2px 0 rgba(157,96,0,.20); }
.badge-av  { background:rgba(255,210,80,.72); color:#8b6914; }
.badge-pend { background:#f97316; color:#fff7ed; box-shadow:0 2px 0 rgba(154,52,18,.24); }

/* ══════ CHECK ══════ */
.ck { position:absolute; right:5px; top:8px; width:18px; height:18px; border-radius:50%; background:#35c76f; color:#fff; font-size:12px; font-weight:900; line-height:18px; text-align:center; box-shadow:0 2px 0 rgba(18,121,62,.28); z-index:8; }

/* ══════ COLOURS ══════ */
.t-normal  { --c:linear-gradient(180deg,#74c7ff,#268eea); --sl:#1c73bf; --sr:#1762a8; --g:rgba(62,166,255,.45); }
.t-elite   { --c:linear-gradient(180deg,#ff8a8a,#e5484d); --sl:#b92d37; --sr:#982532; --g:rgba(255,80,88,.45); }
.t-boss    { --c:linear-gradient(180deg,#ffcf5a,#e85832); --sl:#a93724; --sr:#7d241b; --g:rgba(255,104,48,.60); }
.t-event   { --c:linear-gradient(180deg,#c7a3ff,#895ee8); --sl:#6840bd; --sr:#5533a0; --g:rgba(148,100,255,.40); }
.t-reward{--c:linear-gradient(180deg,#ffe27a,#f4a51c);--sl:#c98012;--sr:#a9680c;--g:rgba(255,197,54,.45);}
.t-shop    { --c:linear-gradient(180deg,#8ff0a4,#37b96d); --sl:#229257; --sr:#197847; --g:rgba(65,210,116,.40); }
.t-rest    { --c:linear-gradient(180deg,#ffbd76,#f47a2a); --sl:#c4591e; --sr:#9e4218; --g:rgba(255,136,48,.40); }

/* ══════ STATUS ══════ */
.st-current .cube { animation:p 1.6s ease-in-out infinite; filter:drop-shadow(0 8px 10px rgba(55,97,151,.22)); }
@keyframes p{0%,100%{transform:translateX(-50%) scale(1)}50%{transform:translateX(-50%) scale(1.08)}}

.st-available .cube { animation:f 1.8s ease-in-out infinite; }
@keyframes f{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(-5px)}}

.st-pending .cube { animation:p 1.4s ease-in-out infinite; filter:drop-shadow(0 9px 12px rgba(249,115,22,.28)); }

.st-preview { opacity:.52; filter:grayscale(.30); }
.st-preview .lbl { color:#8b8173; }

.st-locked { opacity:.38; filter:grayscale(.45); }
.st-cleared .cube { filter:saturate(.80) brightness(.93); }

/* press */
.nd.ok:active .cube { transform:translateX(-50%) translateY(5px) scale(.93); }

/* ══════ SIZES ══════ */
.s-base .cube{width:72px;height:56px} .s-base .top{width:72px;height:52px} .s-base .sd{width:36px;height:26px} .s-base .ico{font-size:24px}
.s-md   .cube{width:80px;height:60px} .s-md   .top{width:80px;height:56px} .s-md   .sd{width:40px;height:28px} .s-md   .ico{font-size:26px}
.s-lg   .cube{width:92px;height:68px} .s-lg   .top{width:92px;height:64px} .s-lg   .sd{width:46px;height:30px} .s-lg   .ico{font-size:30px}
</style>
