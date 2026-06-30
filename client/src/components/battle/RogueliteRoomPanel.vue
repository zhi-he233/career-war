<script setup lang="ts">
import { ref } from "vue";
import { socket } from "../../socket";
import {
  getRogueliteShopItemsForStage,
  ROGUELITE_ROOM_TYPE_LABELS,
  ROGUELITE_SHOP_RULES,
  ROGUELITE_REST_SITE_ACTIONS,
} from "@career-war/shared";
import type { RogueliteMapRoomType } from "@career-war/shared";

const props = defineProps<{ type: Exclude<RogueliteMapRoomType, "normal" | "elite" | "boss">; stage: number }>();
const emit = defineEmits<{ close: [] }>();

const shopItems = getRogueliteShopItemsForStage(props.stage).slice(0, ROGUELITE_SHOP_RULES.itemsPerVisit);
const restActions = ROGUELITE_REST_SITE_ACTIONS;
const busy = ref(false);

function buyItem(itemId: string): void {
  if (busy.value) return;
  busy.value = true;
  socket.emit("buyRogueliteShopItem", { itemId }, (res: { ok?: boolean; error?: string } | null) => {
    busy.value = false;
    if (res?.error) {
      alert(res.error);
    }
  });
}

function doRestAction(actionId: string): void {
  if (busy.value) return;
  busy.value = true;
  socket.emit("useRogueliteRestAction", { actionId }, (res: { ok?: boolean; error?: string } | null) => {
    busy.value = false;
    if (res?.error) {
      alert(res.error);
    }
  });
}

function leaveRoom(): void {
  if (busy.value) return;
  busy.value = true;
  socket.emit("leaveRogueliteRoom", {}, (res: { ok?: boolean; error?: string } | null) => {
    busy.value = false;
    if (res?.error) {
      alert(res.error);
    }
  });
}
</script>

<template>
  <section class="room-panel" role="dialog" aria-modal="true">
    <div class="room-card">
      <header class="room-head">
        <span class="room-kicker">第{{ stage }}关 · {{ ROGUELITE_ROOM_TYPE_LABELS[type] }}</span>
        <button class="room-close" type="button" @click.stop.prevent="emit('close')">返回地图</button>
      </header>

      <!-- ═══ SHOP ═══ -->
      <section v-if="type === 'shop'" class="room-body">
        <h2>🏪 临时商店</h2>
        <p>选好装备，然后离开继续前进。</p>
        <div class="shop-list">
          <article v-for="item in shopItems" :key="item.id" class="shop-item">
            <strong>{{ item.name }}</strong>
            <span>🪙{{ item.price }} · {{ item.effect }}</span>
            <button type="button" :disabled="busy" @click.stop.prevent="buyItem(item.id)">购买</button>
          </article>
        </div>
        <button class="room-action primary" type="button" :disabled="busy" @click.stop.prevent="leaveRoom">离开商店</button>
      </section>

      <!-- ═══ REST ═══ -->
      <section v-else-if="type === 'rest'" class="room-body">
        <h2>🔥 休息点</h2>
        <p>选一个动作，休息后自动回到地图。</p>
        <button
          v-for="act in restActions" :key="act.id"
          class="room-action" type="button" :disabled="busy"
          @click.stop.prevent="doRestAction(act.id)"
        >
          <strong>{{ act.name }}</strong><span>{{ act.effect }}</span>
        </button>
      </section>

      <!-- ═══ EVENT (preview only, real events use full-screen dialog) ═══ -->
      <section v-else-if="type === 'event'" class="room-body">
        <h2>❓ 问号事件</h2>
        <p>事件将在进入房间后触发。请在地图上选择事件节点进入。</p>
      </section>

      <!-- ═══ REWARD ═══ -->
      <section v-else class="room-body">
        <h2>🎁 奖励房</h2>
        <p>奖励在战斗胜利后自动发放。</p>
      </section>
    </div>
  </section>
</template>

<style scoped>
.room-panel { position:absolute; inset:0; z-index:30; display:flex; align-items:center; justify-content:center; padding:16px; background:rgba(70,48,22,.24); backdrop-filter:blur(5px); }
.room-card { width:min(360px,100%); max-height:100%; overflow:auto; border-radius:14px; background:#fffaf0; box-shadow:0 18px 40px rgba(74,44,12,.22); border:1px solid rgba(153,112,54,.18); }
.room-head { display:flex; align-items:center; gap:10px; padding:12px 14px; border-bottom:1px solid rgba(153,112,54,.15); }
.room-kicker { flex:1; min-width:0; font-size:12px; font-weight:900; color:#7c5a24; }
.room-close { flex:0 0 auto; border:1px solid #d8c7a6; border-radius:12px; background:#fff; color:#73552a; font-size:12px; font-weight:900; padding:6px 10px; cursor:pointer; }
.room-body { display:flex; flex-direction:column; gap:10px; padding:14px; }
.room-body h2 { margin:0; font-size:18px; line-height:1.2; color:#3e2e1a; }
.room-body p { margin:0; font-size:13px; line-height:1.45; color:#786042; }
.room-action { display:flex; flex-direction:column; gap:3px; width:100%; border:1px solid #ead7aa; border-radius:12px; background:#fff; color:#4b3518; padding:10px 12px; text-align:left; cursor:pointer; }
.room-action strong { font-size:14px; }
.room-action span { font-size:12px; color:#806545; }
.room-action.primary { align-items:center; text-align:center; background:linear-gradient(180deg,#ffe59b,#ffc45c); border-color:#edb84f; font-weight:900; }
.room-action:disabled { opacity:0.5; cursor:not-allowed; }
.shop-list { display:flex; flex-direction:column; gap:8px; }
.shop-item { display:grid; grid-template-columns:1fr auto; gap:4px 8px; align-items:center; padding:10px; border-radius:12px; background:#fff; border:1px solid #ead7aa; }
.shop-item strong { font-size:13px; color:#4b3518; }
.shop-item span { grid-column:1; font-size:12px; color:#806545; }
.shop-item button { grid-column:2; grid-row:1 / span 2; border:0; border-radius:10px; background:#f2c56a; color:#5d3e11; font-weight:900; padding:7px 10px; cursor:pointer; }
.shop-item button:disabled { opacity:0.4; cursor:not-allowed; }
</style>
