import { computed, ref } from "vue";
/**
 * Pure UI state for BattlePage — dialog/drawer/panel visibility toggles.
 * No socket, no game logic, no seat/action ViewModels.
 */
export function useBattleUiState(room) {
    const showRuleGuide = ref(false);
    const showBattleLog = ref(false);
    const showRogueliteDetails = ref(false);
    const detailPlayerId = ref(null);
    const detailPlayer = computed(() => {
        if (!detailPlayerId.value)
            return undefined;
        return room.value.players.find((p) => p.id === detailPlayerId.value);
    });
    function openPlayerDetail(player) {
        detailPlayerId.value = player.id;
    }
    function openPlayerDetailById(playerId) {
        detailPlayerId.value = playerId;
    }
    function closePlayerDetail() {
        detailPlayerId.value = null;
    }
    function toggleBattleLog() {
        showBattleLog.value = !showBattleLog.value;
    }
    function closeBattleLog() {
        showBattleLog.value = false;
    }
    function openRuleGuide() {
        showRuleGuide.value = true;
    }
    function closeRuleGuide() {
        showRuleGuide.value = false;
    }
    function openRogueliteDetails() {
        showRogueliteDetails.value = true;
    }
    function closeRogueliteDetails() {
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
