export function calculateOverall(p) {
    const { position, speed, shooting, passing, dribbling, physical, defending, goalkeeping, weakFoot } = p;
    switch (position) {
        case "ST":
            return Math.round(speed * 0.25 + shooting * 0.3 + passing * 0.1 + dribbling * 0.15 + physical * 0.1 + defending * 0.1 + weakFoot * 0.1);
        case "MF":
            return Math.round(speed * 0.2 + shooting * 0.2 + passing * 0.25 + dribbling * 0.2 + physical * 0.1 + defending * 0.1 + weakFoot * 0.05);
        case "DF":
            return Math.round(speed * 0.1 + shooting * 0.05 + passing * 0.15 + dribbling * 0.05 + physical * 0.2 + defending * 0.45 + weakFoot * 0.03);
        case "GK":
            return Math.round(speed * 0.03 + passing * 0.02 + physical * 0.05 + goalkeeping * 0.9 + weakFoot * 0.02);
        default:
            return 0;
    }
}
