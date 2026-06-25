<script setup lang="ts">
import {
  ROGUELITE_EVENTS,
  ROGUELITE_ROOM_TYPE_LABELS,
  ROGUELITE_SHOP_ITEMS,
  ROGUELITE_SHOP_RULES,
} from "@career-war/shared";
import type { RogueliteMapRoomType } from "@career-war/shared";

const props = defineProps<{ type: Exclude<RogueliteMapRoomType, "normal" | "elite" | "boss">; stage: number }>();
const emit = defineEmits<{ complete: [result: { type: RogueliteMapRoomType; action: string }]; close: [] }>();

const firstEvent = ROGUELITE_EVENTS[0];
const shopItems = ROGUELITE_SHOP_ITEMS.slice(0, ROGUELITE_SHOP_RULES.itemsPerVisit);

function complete(action: string): void {
  emit("complete", { type: props.type, action });
}
</script>

<template>
  <section class="room-panel" role="dialog" aria-modal="true">
    <div class="room-card">
      <header class="room-head">
        <span class="room-kicker">第{{ stage }}关 · {{ ROGUELITE_ROOM_TYPE_LABELS[type] }}</span>
        <button class="room-close" type="button" @click.stop.prevent="emit('close')">返回地图</button>
      </header>

      <section v-if="type === 'event'" class="room-body">
        <h2>{{ firstEvent?.name ?? "问号事件" }}</h2>
        <p>{{ firstEvent?.description ?? "你遇到了一个还在策划中的职场事件。" }}</p>
        <button
          v-for="choice in firstEvent?.choices ?? []"
          :key="choice.label"
          class="room-action"
          type="button"
          @click.stop.prevent="complete(choice.label)"
        >
          <strong>{{ choice.label }}</strong>
          <span>{{ choice.effect }}；代价：{{ choice.cost }}</span>
        </button>
      </section>

      <section v-else-if="type === 'shop'" class="room-body">
        <h2>临时商店</h2>
        <p>商店系统占位中，先验证流程：购买不会进入战斗。</p>
        <div class="shop-list">
          <article v-for="item in shopItems" :key="item.id" class="shop-item">
            <strong>{{ item.name }}</strong>
            <span>{{ item.price }} 金币 · {{ item.effect }}</span>
            <button type="button" @click.stop.prevent>购买</button>
          </article>
        </div>
        <button class="room-action primary" type="button" @click.stop.prevent="complete('leave_shop')">离开商店</button>
      </section>

      <section v-else-if="type === 'rest'" class="room-body">
        <h2>休息点</h2>
        <p>选择一个休息行为后回到地图。</p>
        <button class="room-action" type="button" @click.stop.prevent="complete('heal')">
          <strong>回复生命</strong><span>回复少量生命，占位效果。</span>
        </button>
        <button class="room-action" type="button" @click.stop.prevent="complete('upgrade')">
          <strong>强化成长</strong><span>强化一个成长，占位效果。</span>
        </button>
      </section>

      <section v-else class="room-body">
        <h2>奖励房</h2>
        <p>奖励流程占位中，领取后回到地图并解锁下一层。</p>
        <button class="room-action primary" type="button" @click.stop.prevent="complete('take_reward')">领取奖励</button>
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
.shop-list { display:flex; flex-direction:column; gap:8px; }
.shop-item { display:grid; grid-template-columns:1fr auto; gap:4px 8px; align-items:center; padding:10px; border-radius:12px; background:#fff; border:1px solid #ead7aa; }
.shop-item strong { font-size:13px; color:#4b3518; }
.shop-item span { grid-column:1; font-size:12px; color:#806545; }
.shop-item button { grid-column:2; grid-row:1 / span 2; border:0; border-radius:10px; background:#f2c56a; color:#5d3e11; font-weight:900; padding:7px 10px; cursor:pointer; }
</style>
