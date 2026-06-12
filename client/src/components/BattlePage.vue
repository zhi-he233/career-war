<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import type { Character, GameEvent, Player, Room } from "@career-war/shared";
import { socket } from "../socket";

const props = defineProps<{
  room: Room;
  playerId: string;
  characters: Character[];
  lastEvent: GameEvent | null;
}>();

const emit = defineEmits<{
  selectTarget: [targetId: string];
  rollDice: [];
}>();

type RollPhase = "idle" | "fast" | "slow" | "pause" | "reveal";

const MAX_RENDERED_LOG = 50;

const displayedRoom = ref<Room>(cloneRoomForDisplay(props.room));
const pendingRoom = ref<Room | null>(null);
const room = computed(() => displayedRoom.value);
const rollPhase = ref<RollPhase>("idle");
const rollingDice = ref(1);
const visibleRollId = ref<string | undefined>(getLatestRoll(props.room)?.id);
const pendingRevealRollId = ref<string | undefined>();
let rollingTimer: number | undefined;
const timers: number[] = [];

const activePlayer = computed(() => room.value.players[room.value.activePlayerIndex]);
const isMyTurn = computed(() => activePlayer.value?.id === props.playerId && room.value.phase === "battle");
const me = computed(() => room.value.players.find((player) => player.id === props.playerId));
const selectedTargetId = computed(() => me.value?.selectedTargetId);
const aliveEnemies = computed(() => room.value.players.filter((player) => !player.isDead && player.id !== props.playerId));
const winner = computed(() => room.value.players.find((player) => player.id === room.value.winnerId));
const pendingRoll = computed(() => room.value.pendingRoll);
const isPendingMine = computed(() => pendingRoll.value?.playerId === props.playerId);
const isRolling = computed(() => rollPhase.value !== "idle" && rollPhase.value !== "reveal");
const rematchReadyIds = computed(() => room.value.rematchReadyPlayerIds ?? []);
const isRematchReady = computed(() => rematchReadyIds.value.includes(props.playerId));

watch(
  () => props.room,
  (nextRoom) => {
    const nextRollId = getLatestRoll(nextRoom)?.id;
    const shownRollId = getLatestRoll(displayedRoom.value)?.id;

    if (nextRollId && nextRollId !== shownRollId) {
      pendingRoom.value = cloneRoomForDisplay(nextRoom);
      pendingRevealRollId.value = nextRollId;
      startRollAnimation(false);
      return;
    }

    if (isRolling.value) {
      pendingRoom.value = cloneRoomForDisplay(nextRoom);
      return;
    }

    displayedRoom.value = cloneRoomForDisplay(nextRoom);
  },
  { deep: false }
);

onUnmounted(clearRollTimers);

const visibleRoll = computed(() => {
  if (rollPhase.value !== "idle" && rollPhase.value !== "reveal") return undefined;
  return room.value.battleLog.find((event) => event.id === visibleRollId.value && event.type === "roll");
});

const latestActionEvents = computed(() => {
  const rollId = visibleRoll.value?.id;
  const firstRollIndex = room.value.battleLog.findIndex((event) => event.id === rollId);
  if (firstRollIndex < 0) return [];
  const nextRollIndex = room.value.battleLog.findIndex((event, index) => index > firstRollIndex && event.type === "roll");
  return room.value.battleLog.slice(firstRollIndex, nextRollIndex < 0 ? undefined : nextRollIndex);
});

const latestDamage = computed(() => latestActionEvents.value.find((event) => event.type === "damage"));
const latestHeal = computed(() => latestActionEvents.value.find((event) => event.type === "heal"));
const latestSkill = computed(() => latestActionEvents.value.filter((event) => event.type === "skill"));
const latestShownEvent = computed(() => room.value.battleLog[0]);
const renderedBattleLog = computed(() => room.value.battleLog.slice(0, MAX_RENDERED_LOG));
const latestDiceText = computed(() => {
  if (isRolling.value) return pendingRoll.value?.message ?? "";
  const dice = visibleRoll.value?.dice ?? [];
  if (dice.length === 0) return pendingRoll.value?.message ?? "等待投骰";
  return `投出了 ${dice.join("、")} 点`;
});

const rollButtonText = computed(() => {
  if (isRolling.value) return "摇骰中...";
  if (pendingRoll.value) return isPendingMine.value ? "继续投骰" : "等待继续投骰";
  return isMyTurn.value ? "投骰开怼" : "等待对手";
});

const canRoll = computed(() => {
  if (room.value.phase === "gameOver" || isRolling.value || !isMyTurn.value) return false;
  if (pendingRoll.value) return isPendingMine.value;
  return Boolean(selectedTargetId.value) && aliveEnemies.value.length > 0;
});

function characterName(id: string | undefined): string {
  return props.characters.find((character) => character.id === id)?.name ?? "未知职业";
}

function hpPercent(player: Player): number {
  if (player.maxHp <= 0) return 0;
  return Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100));
}

function playerStatus(player: Player): string {
  if (!player.isOnline) return "离线";
  if (player.isDead) return "死亡";
  if (pendingRoll.value?.playerId === player.id) return "待继续";
  if (player.id === activePlayer.value?.id) return "行动中";
  if (room.value.effects.some((effect) => effect.type === "invincible")) return "无敌";
  return "待机";
}

function isRecentDamageTarget(player: Player): boolean {
  return latestDamage.value?.targetId === player.id && (latestDamage.value.damage ?? 0) > 0;
}

function isRecentHealTarget(player: Player): boolean {
  return latestHeal.value?.playerId === player.id && (latestHeal.value.healing ?? 0) > 0;
}

function isNoDamageTarget(player: Player): boolean {
  return latestDamage.value?.targetId === player.id && (latestDamage.value.damage ?? 0) === 0;
}

function rollWithAnimation(): void {
  if (!canRoll.value) return;
  startRollAnimation(true);
  emit("rollDice");
}

function readyForRematch(): void {
  if (room.value.phase !== "gameOver" || isRematchReady.value) return;
  socket.emit("readyForRematch", {});
}

function startRollAnimation(shouldEmit: boolean): void {
  if (isRolling.value) return;
  clearRollTimers();
  rollPhase.value = "fast";
  rollingDice.value = randomDice();
  startDiceTicker(55);

  timers.push(window.setTimeout(() => {
    rollPhase.value = "slow";
    startDiceTicker(110);
  }, 240));

  timers.push(window.setTimeout(() => {
    rollPhase.value = "pause";
    window.clearInterval(rollingTimer);
    rollingTimer = undefined;
  }, 500));

  timers.push(window.setTimeout(revealServerRoll, shouldEmit ? 680 : 560));
  timers.push(window.setTimeout(revealServerRoll, 820));
}

function revealServerRoll(): void {
  const revealRoom = pendingRoom.value ?? cloneRoomForDisplay(props.room);
  const revealRollId = pendingRevealRollId.value ?? getLatestRoll(revealRoom)?.id;
  if (!revealRollId || revealRollId === visibleRollId.value) return;

  displayedRoom.value = revealRoom;
  visibleRollId.value = revealRollId;
  pendingRoom.value = null;
  pendingRevealRollId.value = undefined;
  rollPhase.value = "reveal";
  window.clearInterval(rollingTimer);
  rollingTimer = undefined;
  timers.push(window.setTimeout(() => {
    rollPhase.value = "idle";
  }, 220));
}

function startDiceTicker(interval: number): void {
  window.clearInterval(rollingTimer);
  rollingTimer = window.setInterval(() => {
    rollingDice.value = randomDice();
  }, interval);
}

function clearRollTimers(): void {
  window.clearInterval(rollingTimer);
  while (timers.length) window.clearTimeout(timers.pop());
  rollingTimer = undefined;
}

function randomDice(): number {
  return Math.floor(Math.random() * 6) + 1;
}

function getLatestRoll(targetRoom: Room): GameEvent | undefined {
  return targetRoom.battleLog.find((event) => event.type === "roll");
}

function cloneRoomForDisplay(targetRoom: Room): Room {
  const nextRoom = JSON.parse(JSON.stringify(targetRoom)) as Room;
  nextRoom.battleLog = nextRoom.battleLog.slice(0, MAX_RENDERED_LOG);
  nextRoom.snapshots = [];
  return nextRoom;
}
</script>

<template>
  <section class="battle-layout">
    <section class="battle-header">
      <div>
        <span>房间</span>
        <strong>{{ room.id }}</strong>
      </div>
      <div>
        <span>当前回合</span>
        <strong>{{ activePlayer?.nickname ?? "等待中" }}</strong>
      </div>
      <div>
        <span>状态</span>
        <strong>{{ room.phase === "gameOver" ? `${winner?.nickname ?? ""} 获胜` : pendingRoll ? "等待继续" : isMyTurn ? "轮到你" : "观战中" }}</strong>
      </div>
    </section>

    <section class="combat-board">
      <article
        v-for="(player, index) in room.players"
        :key="player.id"
        class="player-card battle-card"
        :class="{
          active: player.id === activePlayer?.id,
          dead: player.isDead,
          selectable: isMyTurn && !pendingRoll && player.id !== playerId && !player.isDead,
          selected: selectedTargetId === player.id,
          hit: isRecentDamageTarget(player),
          healed: isRecentHealTarget(player),
          blocked: isNoDamageTarget(player)
        }"
      >
        <div class="card-title">
          <div>
            <strong>{{ index + 1 }}号 {{ player.nickname }}</strong>
            <span v-if="player.id === room.hostId" class="host-mark">房主</span>
            <small>{{ characterName(player.characterId) }}</small>
          </div>
          <span class="status-pill">{{ playerStatus(player) }}</span>
        </div>

        <div class="hp-row">
          <span>HP {{ player.hp }}/{{ player.maxHp }}</span>
          <span>护盾 {{ player.shield }}</span>
        </div>
        <div class="hp-bar" aria-label="血量">
          <i :style="{ width: `${hpPercent(player)}%` }"></i>
        </div>
        <div class="shield-bar" aria-label="护盾">
          <i :style="{ width: `${Math.min(100, player.shield * 8)}%` }"></i>
        </div>

        <transition name="float-pop">
          <b v-if="isRecentDamageTarget(player)" :key="latestDamage?.id" class="float-number damage-pop">-{{ latestDamage?.damage }}</b>
        </transition>
        <transition name="float-pop">
          <b v-if="isRecentHealTarget(player)" :key="latestHeal?.id" class="float-number heal-pop">+{{ latestHeal?.healing }}</b>
        </transition>
        <transition name="float-pop">
          <b v-if="isNoDamageTarget(player)" :key="latestDamage?.id" class="float-number no-pop">无效</b>
        </transition>

        <button
          v-if="isMyTurn && !pendingRoll && player.id !== playerId"
          class="target-btn"
          type="button"
          :disabled="player.isDead"
          @click="emit('selectTarget', player.id)"
        >
          {{ selectedTargetId === player.id ? "目标锁定" : "选择攻击" }}
        </button>
      </article>
    </section>

    <section class="dice-panel" :class="{ ready: isMyTurn, rolling: rollPhase === 'fast', slowing: rollPhase === 'slow', paused: rollPhase === 'pause', reveal: rollPhase === 'reveal', rolled: visibleRoll }">
      <div class="dice-box" :key="rollPhase === 'idle' ? visibleRoll?.id : rollPhase">
        <span v-for="(dice, index) in isRolling ? [rollPhase === 'pause' ? '...' : rollingDice] : visibleRoll?.dice ?? ['?']" :key="`${visibleRoll?.id ?? 'empty'}-${index}`">{{ dice }}</span>
      </div>
      <div class="action-summary">
        <strong>{{ latestDiceText }}</strong>
        <p v-if="pendingRoll && !isRolling">{{ pendingRoll.message }}</p>
        <p v-else-if="visibleRoll">{{ visibleRoll.message }}</p>
        <p v-if="latestSkill.length">技能：{{ latestSkill.map((event) => event.message.replace(/^.*触发技能：/, "")).join("；") }}</p>
        <p v-if="latestDamage">伤害：{{ latestDamage.damage ?? 0 }} 点</p>
        <p v-if="latestHeal">回复：{{ latestHeal.healing ?? 0 }} 点</p>
      </div>
      <button class="roll-btn" type="button" :disabled="!canRoll" @click="rollWithAnimation">
        {{ rollButtonText }}
      </button>
    </section>

    <section v-if="room.phase === 'gameOver'" class="log-panel rematch-panel">
      <p class="winner">胜者：{{ winner?.nickname }}</p>
      <button class="primary-btn" type="button" :disabled="isRematchReady" @click="readyForRematch">
        {{ isRematchReady ? "已准备" : "准备再来一局" }}
      </button>
      <p class="hint">{{ rematchReadyIds.length === room.players.length ? "即将返回选职业阶段" : "等待其他玩家准备" }}</p>
      <div class="player-list">
        <article v-for="(player, index) in room.players" :key="`rematch-${player.id}`" class="player-card">
          <strong>{{ index + 1 }}号 {{ player.nickname }}</strong>
          <span class="badge" :class="{ 'host-badge': player.id === room.hostId }">
            {{ rematchReadyIds.includes(player.id) ? "已准备" : "未准备" }}
          </span>
        </article>
      </div>
    </section>

    <section class="log-panel battle-log">
      <div class="log-title">
        <h2>战斗日志</h2>
        <span v-if="latestShownEvent">{{ latestShownEvent.message }}</span>
      </div>
      <ol>
        <li v-for="(event, index) in renderedBattleLog" :key="event.id" :class="{ newest: index === 0 }">
          <time>{{ new Date(event.createdAt).toLocaleTimeString() }}</time>
          <span>{{ event.message }}</span>
        </li>
      </ol>
    </section>
  </section>
</template>
