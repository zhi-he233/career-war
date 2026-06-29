<script setup lang="ts">
import { computed } from "vue";
import { ROGUELITE_ROOM_TYPE_LABELS } from "@career-war/shared";
import type { RogueliteMapRoomType } from "@career-war/shared";

export type RoomType = RogueliteMapRoomType;

export type NodeStatus =
  | "current" | "available" | "pending" | "preview" | "locked" | "cleared";

const props = defineProps<{ type: RoomType; status: NodeStatus; label?: string }>();
defineEmits<{ select: [] }>();

const clickable = computed(() => props.status === "current" || props.status === "available" || props.status === "pending");

const iconClass = computed(() => {
  switch (props.type) {
    case "elite":
      return "cw-icon-shield";
    case "boss":
      return "cw-icon-boss";
    case "event":
      return "cw-icon-rune";
    case "shop":
    case "reward":
      return "cw-icon-chest";
    case "rest":
      return "cw-icon-fire";
    case "normal":
    default:
      return "cw-icon-swords";
  }
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
    <span class="node-glow"></span>
    <span class="node-card">
      <span class="node-band"></span>
      <span class="node-icon"><span class="cw-icon" :class="iconClass"></span></span>
      <span v-if="showTypeLabel" class="lbl">{{ typeName }}</span>
    </span>

    <span v-if="status==='current'" class="badge badge-cur">当前</span>
    <span v-else-if="status==='available'" class="badge badge-av">可选</span>
    <span v-else-if="status==='pending'" class="badge badge-pend">待选</span>

    <span v-if="status==='cleared'" class="ck">✓</span>
  </button>
</template>

<style scoped>
/* ══════ NODE ══════ */
.nd {
  position:relative; width:86px; height:102px;
  border:0; background:transparent; padding:0;
  cursor:default; user-select:none;
  -webkit-tap-highlight-color:transparent;
  display:flex; align-items:center; justify-content:center;
}
.nd.ok { cursor:pointer; }

.node-glow {
  position:absolute;
  left:50%;
  top:48px;
  width:72px;
  height:86px;
  transform:translate(-50%,-50%);
  border-radius:18px;
  background:var(--g);
  opacity:0;
  filter:blur(14px);
  z-index:0;
}
.st-current .node-glow,
.st-available .node-glow,
.st-pending .node-glow { opacity:1; }

.node-card {
  position:absolute;
  left:50%;
  top:8px;
  display:grid;
  grid-template-rows:8px 1fr auto;
  justify-items:center;
  gap:5px;
  width:72px;
  min-height:82px;
  padding:0 7px 7px;
  transform:translateX(-50%);
  border:2px solid var(--line);
  border-radius:12px;
  background:linear-gradient(180deg,#fffdf0 0%,#eadfbd 100%);
  box-shadow:0 4px 0 rgba(45,36,21,.48),0 9px 14px rgba(45,36,21,.16);
  transition:transform .14s ease, filter .14s ease, box-shadow .14s ease;
  z-index:3;
}

.node-band {
  width:calc(100% + 14px);
  height:8px;
  border-radius:10px 10px 0 0;
  background:var(--c);
}

.node-icon {
  display:grid;
  place-items:center;
  align-self:center;
  width:38px;
  height:38px;
  border:2px solid currentColor;
  border-radius:10px;
  background:rgba(255,255,255,.62);
  color:var(--c-solid);
  font-size:24px;
}

/* ══════ LABEL ══════ */
.lbl { max-width:58px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; padding:1px 6px; border-radius:8px; background:rgba(255,255,255,.72); color:#5b3c1a; font-size:9px; font-weight:900; line-height:1.3; box-shadow:0 1px 0 rgba(95,70,34,.12); z-index:7; }

/* ══════ BADGE ══════ */
.badge { position:absolute; left:50%; top:-3px; transform:translateX(-50%); padding:2px 8px; border:2px solid var(--line); border-radius:10px; font-size:10px; font-weight:900; line-height:1.2; white-space:nowrap; z-index:9; pointer-events:none; }
.badge-cur { background:#ffd85a; color:#5b3500; box-shadow:0 2px 0 rgba(157,96,0,.20); }
.badge-av  { background:#fff7c2; color:#6d4c09; }
.badge-pend { background:#f97316; color:#fff7ed; box-shadow:0 2px 0 rgba(154,52,18,.24); }

/* ══════ CHECK ══════ */
.ck { position:absolute; right:4px; top:12px; width:18px; height:18px; border:2px solid #14532d; border-radius:50%; background:#35c76f; color:#fff; font-size:12px; font-weight:900; line-height:14px; text-align:center; box-shadow:0 2px 0 rgba(18,121,62,.28); z-index:8; }

/* ══════ COLOURS ══════ */
.t-normal  { --c:#2479c8; --c-solid:#2479c8; --line:#153b61; --g:rgba(62,166,255,.38); }
.t-elite   { --c:#c73636; --c-solid:#c73636; --line:#7f1d1d; --g:rgba(255,80,88,.40); }
.t-boss    { --c:linear-gradient(90deg,#7c1d16,#d6a017); --c-solid:#7c1d16; --line:#3c120d; --g:rgba(255,104,48,.52); }
.t-event   { --c:#8051c9; --c-solid:#8051c9; --line:#4c2a82; --g:rgba(148,100,255,.36); }
.t-reward{--c:#d6a017;--c-solid:#b77905;--line:#7c5206;--g:rgba(255,197,54,.40);}
.t-shop    { --c:#24935a; --c-solid:#24935a; --line:#14532d; --g:rgba(65,210,116,.34); }
.t-rest    { --c:#de7b22; --c-solid:#de7b22; --line:#9a3412; --g:rgba(255,136,48,.34); }

/* ══════ STATUS ══════ */
.st-current .node-card { animation:p 1.6s ease-in-out infinite; }
@keyframes p{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(-5px)}}

.st-available .node-card { animation:f 1.8s ease-in-out infinite; }
@keyframes f{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(-6px)}}

.st-pending .node-card { animation:p 1.4s ease-in-out infinite; box-shadow:0 4px 0 rgba(154,52,18,.48),0 0 0 3px rgba(249,115,22,.18); }

.st-preview { opacity:.52; filter:grayscale(.30); }
.st-preview .lbl { color:#8b8173; }

.st-locked { opacity:.38; filter:grayscale(.45); }
.st-cleared .node-card { filter:saturate(.80) brightness(.93); }

/* press */
.nd.ok:active .node-card { transform:translateX(-50%) translateY(4px) scale(.98); box-shadow:0 2px 0 rgba(45,36,21,.48),0 5px 8px rgba(45,36,21,.12); }

/* ══════ SIZES ══════ */
.s-base .node-card{width:72px;min-height:82px} .s-base .node-icon{width:38px;height:38px;font-size:24px}
.s-md   .node-card{width:78px;min-height:88px} .s-md   .node-icon{width:42px;height:42px;font-size:25px}
.s-lg   { width:100px; height:112px; } .s-lg .node-card{width:92px;min-height:98px} .s-lg .node-icon{width:48px;height:48px;font-size:28px}
</style>
