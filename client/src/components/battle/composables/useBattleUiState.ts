import { computed, ref, type ComputedRef } from "vue";
import type { Player, Room } from "@career-war/shared";

/**
 * Pure UI state for BattlePage — dialog/drawer/panel visibility toggles.
 * No socket, no game logic, no seat/action ViewModels.
 */
export function useBattleUiState(room: ComputedRef<Room>) {
  const showRuleGuide = ref(false);
  const showBattleLog = ref(false);
  const showRogueliteDetails = ref(false);
  const detailPlayerId = ref<string | null>(null);

  const detailPlayer = computed<Player | undefined>(() => {
    if (!detailPlayerId.value) return undefined;
    return room.value.players.find((p) => p.id === detailPlayerId.value);
  });

  function openPlayerDetail(player: Player): void {
    detailPlayerId.value = player.id;
  }

  function openPlayerDetailById(playerId: string): void {
    detailPlayerId.value = playerId;
  }

  function closePlayerDetail(): void {
    detailPlayerId.value = null;
  }

  function toggleBattleLog(): void {
    showBattleLog.value = !showBattleLog.value;
  }

  function closeBattleLog(): void {
    showBattleLog.value = false;
  }

  function openRuleGuide(): void {
    showRuleGuide.value = true;
  }

  function closeRuleGuide(): void {
    showRuleGuide.value = false;
  }

  function openRogueliteDetails(): void {
    showRogueliteDetails.value = true;
  }

  function closeRogueliteDetails(): void {
    showRogueliteDetails.value = false;
  }

  return {
    showRuleGuide,
    showBattleLog,
    showRogueliteDetails,
    detailPlayerId,
    detailPlayer,
    openPlayerDetail,
    openPlayerDetailById,
    closePlayerDetail,
    toggleBattleLog,
    closeBattleLog,
    openRuleGuide,
    closeRuleGuide,
    openRogueliteDetails,
    closeRogueliteDetails,
  };
}
