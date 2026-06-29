export function getNextAlivePlayerIndex(players, activePlayerIndex) {
    const aliveCount = players.filter((player) => !player.isDead).length;
    if (aliveCount <= 1)
        return activePlayerIndex;
    for (let offset = 1; offset <= players.length; offset += 1) {
        const nextIndex = (activePlayerIndex + offset) % players.length;
        if (!players[nextIndex].isDead)
            return nextIndex;
    }
    return activePlayerIndex;
}
export function getNextDuoControllerId(controllerTurnOrder, activeControllerId) {
    const order = controllerTurnOrder ?? [];
    const currentIndex = order.findIndex((id) => id === activeControllerId);
    if (currentIndex < 0 || order.length < 2)
        return undefined;
    return order[(currentIndex + 1) % order.length];
}
