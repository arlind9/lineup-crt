import React, { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DndContext, closestCenter } from '@dnd-kit/core';

// --- Helper for nice glass effect ---
const glass = "backdrop-blur-md bg-white/80 shadow-lg border border-gray-200";

// --- PlayerSelectModal: Modal for picking a player with search ---
function PlayerSelectModal({ open, onClose, players, onSelect, slotLabel }) {
    const [search, setSearch] = useState("");
    const modalRef = useRef(null);

    // Close on outside click or Escape
    useEffect(() => {
        if (!open) return;
        function handle(e) {
            if (modalRef.current && !modalRef.current.contains(e.target)) onClose();
            if (e.key === "Escape") onClose();
        }
        document.addEventListener("mousedown", handle);
        document.addEventListener("keydown", handle);
        return () => {
            document.removeEventListener("mousedown", handle);
            document.removeEventListener("keydown", handle);
        };
    }, [open, onClose]);

    if (!open) return null;

    // Sort: first players with the same position as slotLabel, then others, both by highest overall
    const sortedPlayers = [...players].sort((a, b) => {
        // slotLabel is "GK", "DF", "MF", or "ST"
        const aMatch = a.position === slotLabel;
        const bMatch = b.position === slotLabel;
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
        // If both match or both don't, sort by overall descending
        return b.overall - a.overall;
    });

    const filtered = sortedPlayers.filter(
        p =>
            p.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div ref={modalRef} className={`w-full max-w-xs bg-white rounded-xl shadow-xl border p-4 ${glass} relative`}>
                <button
                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-lg font-bold"
                    onClick={onClose}
                    aria-label="Close"
                    type="button"
                >×</button>
                <div className="mb-2 text-base font-semibold text-center text-green-900">
                    Select Player {slotLabel ? `for ${slotLabel}` : ""}
                </div>
                <Input
                    autoFocus
                    placeholder="Search players..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="mb-3"
                />
                <div className="max-h-64 overflow-y-auto">
                    {filtered.length === 0 ? (
                        <div className="text-xs text-gray-400 p-2 text-center">No available players</div>
                    ) : (
                        filtered.map(p => (
                            <div
                                key={p.name}
                                className="p-2 rounded hover:bg-blue-100 cursor-pointer flex justify-between items-center"
                                onClick={() => onSelect(p)}
                            >
                                <span>
                                    <span className="font-semibold">{p.name}</span>
                                    <span className="text-gray-500 ml-1">({p.position})</span>
                                </span>
                                <span className="text-gray-400 text-xs">OVR: {p.overall}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

function TeamAttributesBarChart({ players }) {
    // Only consider filled slots
    const filled = players.filter(Boolean);
    if (filled.length === 0) return null;

    const attributes = [
        { key: "overall", label: "Overall" },
        { key: "speed", label: "Speed" },
        { key: "shooting", label: "Shooting" },
        { key: "passing", label: "Passing" },
        { key: "dribbling", label: "Dribbling" },
        { key: "physical", label: "Physical" },
        { key: "defending", label: "Defending" },
        { key: "goalkeeping", label: "Goalkeeping" },
        { key: "weakFoot", label: "Weak Foot" }
    ];

    // Compute averages
    const avgs = {};
    attributes.forEach(attr => {
        if (attr.key === "goalkeeping") {
            const gks = filled.filter(p => p.position === "GK");
            avgs[attr.key] = gks.length
                ? Math.round(gks.reduce((sum, p) => sum + (p.goalkeeping || 0), 0) / gks.length)
                : 0;
        } else if (
            ["speed", "shooting", "passing", "dribbling", "physical", "defending"].includes(attr.key)
        ) {
            // Exclude GKs from these attributes
            const nonGKs = filled.filter(p => p.position !== "GK");
            avgs[attr.key] = nonGKs.length
                ? Math.round(nonGKs.reduce((sum, p) => sum + (p[attr.key] || 0), 0) / nonGKs.length)
                : 0;
        } else {
            // overall and weakFoot: include all
            avgs[attr.key] = Math.round(
                filled.reduce((sum, p) => sum + (p[attr.key] || 0), 0) / filled.length
            );
        }
    });

    // Set cap for each attribute (default 100, but 50 for weakFoot)
    const caps = {
        weakFoot: 50
    };

    return (
        <div className="mb-4">
            <div className="text-xs font-semibold mb-1 text-gray-600 text-center">Average Attributes</div>
            <div className="space-y-1">
                {attributes.map(attr => {
                    const cap = caps[attr.key] || 100;
                    const percent = (avgs[attr.key] / cap) * 100;
                    return (
                        <div key={attr.key} className="flex items-center gap-2 w-full">
                            {/* Left bar and value */}
                            <span className="w-8 text-right text-xs">{avgs[attr.key]}</span>
                            <div className="flex-1 flex justify-end">
                                <div
                                    className="bg-blue-500 h-3 rounded-l"
                                    style={{
                                        width: `${percent}%`,
                                        minWidth: avgs[attr.key] > 0 ? 12 : 0,
                                        transition: "width 0.3s"
                                    }}
                                />
                            </div>
                            {/* Center label */}
                            <span className="w-20 text-xs text-gray-500 text-center">{attr.label}</span>
                            {/* Right bar and value (mirrored) */}
                            <div className="flex-1 flex">
                                <div
                                    className="bg-blue-500 h-3 rounded-r"
                                    style={{
                                        width: `${percent}%`,
                                        minWidth: avgs[attr.key] > 0 ? 12 : 0,
                                        transition: "width 0.3s"
                                    }}
                                />
                            </div>
                            <span className="w-8 text-left text-xs">{avgs[attr.key]}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function MirroredTeamAttributesBarChart({ teamAPlayers, teamBPlayers, teamALabel = "Team A", teamBLabel = "Team B", onHide }) {
    const attributes = [
        { key: "overall", label: "Overall" },
        { key: "speed", label: "Speed" },
        { key: "shooting", label: "Shooting" },
        { key: "passing", label: "Passing" },
        { key: "dribbling", label: "Dribbling" },
        { key: "physical", label: "Physical" },
        { key: "defending", label: "Defending" },
        { key: "goalkeeping", label: "Goalkeeping" },
        { key: "weakFoot", label: "Weak Foot" }
    ];

    function getAvg(players, key) {
        const filled = players.filter(Boolean);
        if (key === "goalkeeping") {
            const gks = filled.filter(p => p.position === "GK");
            return gks.length
                ? Math.round(gks.reduce((sum, p) => sum + (p.goalkeeping || 0), 0) / gks.length)
                : 0;
        }
        if (["speed", "shooting", "passing", "dribbling", "physical", "defending"].includes(key)) {
            // Exclude GKs from these attributes
            const nonGKs = filled.filter(p => p.position !== "GK");
            return nonGKs.length
                ? Math.round(nonGKs.reduce((sum, p) => sum + (p[key] || 0), 0) / nonGKs.length)
                : 0;
        }
        if (!filled.length) return 0;
        // overall and weakFoot: include all
        return Math.round(filled.reduce((sum, p) => sum + (p[key] || 0), 0) / filled.length);
    }

    const caps = { weakFoot: 50 };
    const avgsA = {}, avgsB = {};
    attributes.forEach(attr => {
        avgsA[attr.key] = getAvg(teamAPlayers, attr.key);
        avgsB[attr.key] = getAvg(teamBPlayers, attr.key);
    });

    return (
        <div className="mb-6 max-w-2xl mx-auto bg-white rounded-xl shadow p-4 border relative">
            {/* Hide button */}
            {onHide && (
                <button
                    onClick={onHide}
                    className="absolute top-2 right-2 px-2 py-0.5 rounded text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold shadow transition"
                    aria-label="Hide attribute comparison"
                    type="button"
                >
                    Hide
                </button>
            )}
            <div className="text-base font-bold mb-2 text-center text-gray-700">Attribute Comparison</div>
            <div className="flex justify-between text-xs font-semibold mb-2">
                <span className="w-24 text-left text-blue-700">{teamALabel}</span>
                <span className="w-24 text-right text-red-700">{teamBLabel}</span>
            </div>
            <div>
                {attributes.map(attr => {
                    const cap = caps[attr.key] || 100;
                    const percentA = (avgsA[attr.key] / cap) * 100;
                    const percentB = (avgsB[attr.key] / cap) * 100;
                    const aBold = avgsA[attr.key] > avgsB[attr.key];
                    const bBold = avgsB[attr.key] > avgsA[attr.key];
                    return (
                        <div key={attr.key} className="flex items-center gap-2 w-full py-1 border-b last:border-b-0 border-gray-100">
                            <span className={`w-8 text-right text-xs ${aBold ? "font-bold text-blue-800" : "text-blue-700"}`}>{avgsA[attr.key]}</span>
                            <div className="flex-1 flex justify-end">
                                <div
                                    className="h-3 rounded-l"
                                    style={{
                                        width: `${percentA}%`,
                                        minWidth: avgsA[attr.key] > 0 ? 12 : 0,
                                        background: "linear-gradient(to left, #3b82f6, #60a5fa)",
                                        transition: "width 0.3s"
                                    }}
                                />
                            </div>
                            <span className="w-20 text-xs text-gray-700 text-center font-medium">{attr.label}</span>
                            <div className="flex-1 flex">
                                <div
                                    className="h-3 rounded-r"
                                    style={{
                                        width: `${percentB}%`,
                                        minWidth: avgsB[attr.key] > 0 ? 12 : 0,
                                        background: "linear-gradient(to right, #ef4444, #f87171)",
                                        transition: "width 0.3s"
                                    }}
                                />
                            </div>
                            <span className={`w-8 text-left text-xs ${bBold ? "font-bold text-red-800" : "text-red-700"}`}>{avgsB[attr.key]}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// Utility: calculate attributes for a player as if they were playing in a different position
function getPlayerWithPositionAttributes(player, newPosition) {
    if (!player) return null;
    // If already in that position, return as is
    if (player.position === newPosition) return { ...player };

    // Use the same weights as in calculateOverall for each position
    // We'll recalculate overall, but also optionally adjust other attributes if needed
    // For now, only overall is recalculated, but you can expand this if you want to simulate attribute drops/boosts

    const { speed, shooting, passing, dribbling, physical, defending, goalkeeping, weakFoot } = player;
    let overall = 0;
    switch (newPosition) {
        case "ST":
            overall = Math.round(speed * 0.25 + shooting * 0.3 + passing * 0.1 + dribbling * 0.15 + physical * 0.1 + defending * 0.1 + weakFoot * 0.1);
            break;
        case "MF":
            overall = Math.round(speed * 0.2 + shooting * 0.2 + passing * 0.25 + dribbling * 0.2 + physical * 0.1 + defending * 0.1 + weakFoot * 0.05);
            break;
        case "DF":
            overall = Math.round(speed * 0.1 + shooting * 0.05 + passing * 0.15 + dribbling * 0.05 + physical * 0.2 + defending * 0.45 + weakFoot * 0.03);
            break;
        case "GK":
            overall = Math.round(speed * 0.03 + passing * 0.02 + physical * 0.05 + goalkeeping * 0.9 + weakFoot * 0.02);
            break;
        default:
            overall = 0;
    }
    // Return a new player object with the new position and recalculated overall
    return { ...player, position: newPosition, overall };
}

function DroppableTeam({
    id,
    label,
    players,
    formation,
    onPlayerDrop,
    allPlayers,
    onFormationChange,
    globalActiveSlot,
    setGlobalActiveSlot,
    playerSelectModal, // new prop
    setPlayerSelectModal, // new prop
}) {
    const formationMap = {
        "4-4-1": ["GK", "DF", "DF", "DF", "DF", "MF", "MF", "MF", "MF", "ST"],
        "4-3-2": ["GK", "DF", "DF", "DF", "DF", "MF", "MF", "MF", "ST", "ST"],
        "4-2-3": ["GK", "DF", "DF", "DF", "DF", "MF", "MF", "ST", "ST", "ST"],
        "5-2-2": ["GK", "DF", "DF", "DF", "DF", "DF", "MF", "MF", "ST", "ST"],
        "5-3-1": ["GK", "DF", "DF", "DF", "DF", "DF", "MF", "MF", "MF", "ST"],
        "3-3-3": ["GK", "DF", "DF", "DF", "MF", "MF", "MF", "ST", "ST", "ST"],
        "3-4-2": ["GK", "DF", "DF", "DF", "MF", "MF", "MF", "MF", "ST", "ST"],
        "3-5-1": ["GK", "DF", "DF", "DF", "MF", "MF", "MF", "MF", "MF", "ST"],
        "3-2-4": ["GK", "DF", "DF", "DF", "MF", "MF", "ST", "ST", "ST", "ST"],
    };

    const formationPositions = formationMap[formation] || formationMap["3-3-3"];

    // Allow any player to be dragged to any position except: 
    // - Only allow GK in GK slot
    // - Do not allow GK to be placed in non-GK slots
    function isPositionCompatible(slotPos, playerPos) {
        if (slotPos === "GK") return playerPos === "GK";
        if (playerPos === "GK") return false; // Prevent GK in non-GK slots
        return true; // Allow any other player in any other slot
    }

    // Returns eligible players for a given slot position (for the popup list)
    const eligiblePlayersForSlot = (slotPos) =>
        allPlayers.filter(
            (p) =>
                isPositionCompatible(slotPos, p.position) &&
                !players.some((pl) => pl && pl.name === p.name)
        );

    const handlePlayerSelect = (slotIdx, player) => {
        const slotPos = formationPositions[slotIdx];
        const playerForSlot = getPlayerWithPositionAttributes(player, slotPos);
        onPlayerDrop({
            toTeam: id,
            toIndex: slotIdx,
            fromTeam: null,
            fromIndex: null,
            player: playerForSlot,
        });
        setGlobalActiveSlot(null);
        setPlayerSelectModal({ open: false });
    };

    // Map slot index to pitch coordinates (percentages)
    // These are rough, but visually pleasing for 10 players (1 GK, 3-5 DF, 2-5 MF, 1-4 ST)
    function getSlotStyle(pos, idx) {
        // For each formation, define a layout (row, col) for each slot
        // We'll use a normalized pitch: 0% (top, own goal) to 100% (bottom, opponent goal)
        // Left to right: 0% to 100%
        // We'll use a map of arrays for each formation
        // If not found, fallback to a default
        const layouts = {
            "3-3-3": [
                // GK, 3 DF, 3 MF, 3 ST
                { top: "92%", left: "50%" }, // GK
                { top: "75%", left: "20%" },
                { top: "75%", left: "50%" },
                { top: "75%", left: "80%" },
                { top: "55%", left: "20%" },
                { top: "55%", left: "50%" },
                { top: "55%", left: "80%" },
                { top: "30%", left: "20%" },
                { top: "30%", left: "50%" },
                { top: "30%", left: "80%" },
            ],
            "4-4-1": [
                { top: "92%", left: "50%" }, // GK
                { top: "75%", left: "15%" },
                { top: "75%", left: "38%" },
                { top: "75%", left: "62%" },
                { top: "75%", left: "85%" },
                { top: "55%", left: "15%" },
                { top: "55%", left: "38%" },
                { top: "55%", left: "62%" },
                { top: "55%", left: "85%" },
                { top: "30%", left: "50%" },
            ],
            "4-3-2": [
                { top: "92%", left: "50%" }, // GK
                { top: "75%", left: "15%" },
                { top: "75%", left: "38%" },
                { top: "75%", left: "62%" },
                { top: "75%", left: "85%" },
                { top: "55%", left: "25%" },
                { top: "55%", left: "50%" },
                { top: "55%", left: "75%" },
                { top: "35%", left: "35%" },
                { top: "35%", left: "65%" },
            ],
            "4-2-3": [
                { top: "92%", left: "50%" }, // GK
                { top: "75%", left: "15%" },
                { top: "75%", left: "38%" },
                { top: "75%", left: "62%" },
                { top: "75%", left: "85%" },
                { top: "55%", left: "30%" },
                { top: "55%", left: "70%" },
                { top: "35%", left: "25%" },
                { top: "35%", left: "50%" },
                { top: "35%", left: "75%" },
            ],
            "5-2-2": [
                { top: "92%", left: "50%" }, // GK
                { top: "80%", left: "10%" },
                { top: "80%", left: "30%" },
                { top: "80%", left: "50%" },
                { top: "80%", left: "70%" },
                { top: "80%", left: "90%" },
                { top: "60%", left: "35%" },
                { top: "60%", left: "65%" },
                { top: "35%", left: "35%" },
                { top: "35%", left: "65%" },
            ],
            "5-3-1": [
                { top: "92%", left: "50%" }, // GK
                { top: "80%", left: "10%" },
                { top: "80%", left: "30%" },
                { top: "80%", left: "50%" },
                { top: "80%", left: "70%" },
                { top: "80%", left: "90%" },
                { top: "60%", left: "25%" },
                { top: "60%", left: "50%" },
                { top: "60%", left: "75%" },
                { top: "35%", left: "50%" },
            ],
            "3-4-2": [
                { top: "92%", left: "50%" }, // GK
                { top: "75%", left: "20%" },
                { top: "75%", left: "50%" },
                { top: "75%", left: "80%" },
                { top: "55%", left: "15%" },
                { top: "55%", left: "38%" },
                { top: "55%", left: "62%" },
                { top: "55%", left: "85%" },
                { top: "30%", left: "35%" },
                { top: "30%", left: "65%" },
            ],
            "3-5-1": [
                { top: "92%", left: "50%" }, // GK
                { top: "75%", left: "20%" },
                { top: "75%", left: "50%" },
                { top: "75%", left: "80%" },
                { top: "55%", left: "10%" },
                { top: "55%", left: "30%" },
                { top: "55%", left: "50%" },
                { top: "55%", left: "70%" },
                { top: "55%", left: "90%" },
                { top: "30%", left: "50%" },
            ],
            "3-2-4": [
                { top: "92%", left: "50%" }, // GK
                { top: "75%", left: "20%" },
                { top: "75%", left: "50%" },
                { top: "75%", left: "80%" },
                { top: "55%", left: "30%" },
                { top: "55%", left: "70%" },
                { top: "30%", left: "15%" },
                { top: "30%", left: "38%" },
                { top: "30%", left: "62%" },
                { top: "30%", left: "85%" },
            ],
        };
        const layout = layouts[formation] || layouts["3-3-3"];
        return layout[idx] || { top: "50%", left: "50%" };
    }

    // Pitch background and player positions
    return (
        <div className="relative bg-gradient-to-b from-green-600 to-green-800 rounded-2xl min-h-[420px] md:min-h-[520px] overflow-hidden shadow-2xl border-2 border-green-900">
            {/* Pitch Markings */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Outer lines */}
                <div className="absolute border-4 border-white rounded-2xl w-[96%] h-[96%] left-[2%] top-[2%]" />
                {/* Center circle */}
                <div className="absolute left-1/2 top-[50%] -translate-x-1/2 -translate-y-1/2 border-2 border-white rounded-full w-24 h-24" />
                {/* Halfway line */}
                <div className="absolute left-0 top-1/2 w-full h-0.5 bg-white opacity-80" />
                {/* Penalty box (bottom) */}
                <div className="absolute left-1/2 bottom-0 -translate-x-1/2 border-2 border-white w-[40%] h-[16%] rounded-b-lg" style={{ borderTop: "none" }} />
                {/* Penalty box (top) */}
                <div className="absolute left-1/2 top-0 -translate-x-1/2 border-2 border-white w-[40%] h-[16%] rounded-t-lg" style={{ borderBottom: "none" }} />
            </div>
            <div className="absolute left-4 top-4 flex items-center gap-2 z-10">
                <h3 className="font-bold text-lg text-white drop-shadow">{label} <span className="text-green-200">({players.filter(Boolean).length}/10)</span></h3>
                <select
                    value={formation}
                    onChange={(e) => onFormationChange(e.target.value)}
                    className="border p-1 rounded text-sm bg-white/90 shadow"
                >
                    {[
                        "3-3-3", "3-4-2", "3-5-1", "3-2-4",
                        "4-4-1", "4-3-2", "4-2-3",
                        "5-2-2", "5-3-1"
                    ].map(f => (
                        <option key={f} value={f}>{f}</option>
                    ))}
                </select>
            </div>
            {/* Players on pitch */}
            <div className="w-full h-full absolute inset-0">
                {formationPositions.map((pos, i) => {
                    const player = players[i];
                    const slotKey = `${id}-${i}`;
                    const style = {
                        position: "absolute",
                        ...getSlotStyle(pos, i),
                        transform: "translate(-50%, -50%)",
                        zIndex: 10,
                        minWidth: 64,
                        maxWidth: 120,
                    };
                    return (
                        <div
                            key={i}
                            style={style}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                                const data = JSON.parse(e.dataTransfer.getData("application/json"));
                                if (!data.player) return;
                                if (!isPositionCompatible(pos, data.player.position)) return;
                                // Recalculate attributes for the slot's position
                                const playerForSlot = getPlayerWithPositionAttributes(data.player, pos);

                                if (player && (data.fromTeam === id) && typeof data.fromIndex === "number" && data.fromIndex !== i) {
                                    // Swap: recalculate both
                                    const swapWith = getPlayerWithPositionAttributes(players[data.fromIndex], pos);
                                    onPlayerDrop({
                                        toTeam: id,
                                        toIndex: i,
                                        fromTeam: id,
                                        fromIndex: data.fromIndex,
                                        player: swapWith,
                                        swapWith: playerForSlot,
                                    });
                                } else {
                                    onPlayerDrop({
                                        toTeam: id,
                                        toIndex: i,
                                        fromTeam: data.fromTeam,
                                        fromIndex: data.fromIndex,
                                        player: playerForSlot,
                                    });
                                }
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!player) {
                                    setPlayerSelectModal({
                                        open: true,
                                        slotIdx: i,
                                        slotLabel: pos,
                                        eligiblePlayers: eligiblePlayersForSlot(pos),
                                        onSelect: (p) => handlePlayerSelect(i, p),
                                    });
                                }
                            }}
                            onDoubleClick={(e) => {
                                e.stopPropagation();
                                if (!player) setGlobalActiveSlot(null);
                            }}
                        >
                            {player ? (
                                <div
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onPlayerDrop({
                                            toTeam: id,
                                            toIndex: i,
                                            fromTeam: id,
                                            fromIndex: i,
                                            player: null,
                                            remove: true,
                                        });
                                    }}
                                    className="cursor-pointer group"
                                    title="Remove player"
                                    tabIndex={0}
                                    style={{ outline: "none" }}
                                >
                                    <div className={`rounded-full border-2 border-white shadow-lg bg-gradient-to-br from-green-200/80 to-green-100/80 p-0.5 transition group-hover:scale-105`}>
                                        <DraggablePlayer player={player} fromTeam={id} fromIndex={i} small assigned />
                                    </div>
                                </div>
                            ) : (
                                <div
                                    className="w-full h-full flex items-center justify-center text-white/80 italic cursor-pointer bg-green-900/40 rounded-full border-2 border-dashed border-white"
                                    style={{ minHeight: 56, minWidth: 56, height: 56, width: 56 }}
                                >
                                    {pos}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function DraggablePlayer({ player, fromTeam, fromIndex, small, assigned, selected }) {
    return (
        <Card
            className={
                "border cursor-move space-y-1 transition-all duration-150 " +
                (assigned ? "bg-green-100/80 border-green-400 shadow-green-200 " : "") +
                (selected ? "bg-blue-100/80 border-blue-400 shadow-blue-200 " : "") +
                (small ? "p-1 text-xs min-h-0" : "p-4 text-sm") +
                " rounded-xl shadow"
            }
            draggable
            onDragStart={(e) => {
                e.dataTransfer.setData("application/json", JSON.stringify({
                    player,
                    fromTeam,
                    fromIndex
                }));
            }}
        >
            <div className={small ? "font-semibold text-xs truncate" : "font-semibold text-base truncate"}>{player.name}</div>
            <div className={small ? "text-[10px] text-muted-foreground" : "text-xs text-muted-foreground"}>{player.position}</div>
            {!small && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <span>Speed: {player.speed}</span>
                    <span>Shooting: {player.shooting}</span>
                    <span>Passing: {player.passing}</span>
                    <span>Dribbling: {player.dribbling}</span>
                    <span>Physical: {player.physical}</span>
                    <span>Defending: {player.defending}</span>
                    <span>Weak Foot: {player.weakFoot}</span>
                    <span>Goalkeeping: {player.goalkeeping}</span>
                </div>
            )}
            <div className={small ? "text-xs font-bold pt-0" : "text-sm font-bold pt-1"}>Overall: {player.overall}</div>
        </Card>
    );
}

export default function App() {
    const [formationA, setFormationA] = useState("3-3-3");
    const [formationB, setFormationB] = useState("3-3-3");
    const [players, setPlayers] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [search, setSearch] = useState("");
    const [positionFilter, setPositionFilter] = useState("All");
    const [sortBy, setSortBy] = useState("overall");
    const [teamA, setTeamA] = useState(Array(10).fill(null));
    const [teamB, setTeamB] = useState(Array(10).fill(null));
    const [hideSelected, setHideSelected] = useState(false);
    const [showComparison, setShowComparison] = useState(true);

    const [globalActiveSlot, setGlobalActiveSlot] = useState(null);

    // Modal state for player selection
    const [playerSelectModal, setPlayerSelectModal] = useState({ open: false });

    const assignedNames = [
        ...teamA.filter(Boolean).map(p => p.name),
        ...teamB.filter(Boolean).map(p => p.name)
    ];

    useEffect(() => {
        fetch("https://docs.google.com/spreadsheets/d/1ooFfP_H35NlmBCqbKOfwDJQoxhgwfdC0LysBbo6NfTg/gviz/tq?tqx=out:json&sheet=Sheet1")
            .then((res) => res.text())
            .then((text) => {
                const json = JSON.parse(text.substring(47).slice(0, -2));
                const rows = json.table.rows.map((row) => {
                    const cells = row.c;
                    const player = {
                        name: cells[0]?.v,
                        position: cells[1]?.v,
                        speed: Number(cells[2]?.v),
                        shooting: Number(cells[3]?.v),
                        passing: Number(cells[4]?.v),
                        dribbling: Number(cells[5]?.v),
                        physical: Number(cells[6]?.v),
                        defending: Number(cells[7]?.v),
                        goalkeeping: Number(cells[8]?.v || 0),
                        weakFoot: !isNaN(Number(cells[10]?.v)) ? Number(cells[10].v) : 0,
                    };
                    player.overall = calculateOverall(player);
                    return player;
                });
                setPlayers(rows);
                setFiltered(rows);
            });
    }, []);

    useEffect(() => {
        let results = players.filter((p) =>
            p.name.toLowerCase().includes(search.toLowerCase())
        );
        if (positionFilter !== "All") {
            results = results.filter((p) => p.position === positionFilter);
        }
        results.sort((a, b) => b[sortBy] - a[sortBy]);
        setFiltered(results);
    }, [search, positionFilter, players, sortBy]);

    const calculateOverall = (p) => {
        const { speed, shooting, passing, dribbling, physical, defending, goalkeeping, weakFoot } = p;
        switch (p.position) {
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
    };

    const handlePlayerDrop = ({
        toTeam,
        toIndex,
        fromTeam,
        fromIndex,
        player,
        remove,
        swapWith,
    }) => {
        let newTeamA = [...teamA];
        let newTeamB = [...teamB];

        if (remove) {
            if (toTeam === "teamA") newTeamA[toIndex] = null;
            if (toTeam === "teamB") newTeamB[toIndex] = null;
        } else if (swapWith && fromTeam === toTeam && typeof fromIndex === "number") {
            // Swap players within the same team
            if (toTeam === "teamA") {
                const temp = newTeamA[toIndex];
                newTeamA[toIndex] = swapWith;
                newTeamA[fromIndex] = temp;
            }
            if (toTeam === "teamB") {
                const temp = newTeamB[toIndex];
                newTeamB[toIndex] = swapWith;
                newTeamB[fromIndex] = temp;
            }
        } else {
            if (fromTeam === "teamA" && typeof fromIndex === "number") newTeamA[fromIndex] = null;
            if (fromTeam === "teamB" && typeof fromIndex === "number") newTeamB[fromIndex] = null;

            if (toTeam === "teamA") newTeamA = newTeamA.map((p, idx) => (p && p.name === player.name && idx !== toIndex ? null : p));
            if (toTeam === "teamB") newTeamB = newTeamB.map((p, idx) => (p && p.name === player.name && idx !== toIndex ? null : p));

            if (toTeam === "teamA") newTeamA[toIndex] = player;
            if (toTeam === "teamB") newTeamB[toIndex] = player;
        }

        setTeamA(newTeamA);
        setTeamB(newTeamB);
    };

    const availablePlayers = hideSelected
        ? filtered.filter(p => !assignedNames.includes(p.name))
        : filtered;

    const mainRef = useRef(null);
    useEffect(() => {
        const handleClick = (e) => {
            if (mainRef.current && !mainRef.current.contains(e.target)) {
                setGlobalActiveSlot(null);
            }
        };
        if (globalActiveSlot !== null) {
            document.addEventListener("mousedown", handleClick);
        } else {
            document.removeEventListener("mousedown", handleClick);
        }
        return () => document.removeEventListener("mousedown", handleClick);
    }, [globalActiveSlot]);

    return (
        <div className="p-4 max-w-7xl mx-auto" ref={mainRef}>
            <h1 className="text-4xl font-extrabold mb-6 text-center text-green-900 drop-shadow">Lineup Creator A</h1>
            <div className="flex flex-col md:flex-row gap-6">
                {/* Main content */}
                <div className="flex-1">
                    <div className={`flex flex-col md:flex-row justify-between items-center gap-4 mb-4 ${glass}`}>
                        <Input type="text" placeholder="Search players..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full md:w-1/2" />
                        <div className="flex gap-2">
                            {["All", "ST", "MF", "DF", "GK"].map((pos) => (
                                <button
                                    key={pos}
                                    className={`px-3 py-1 rounded font-semibold transition ${positionFilter === pos ? "bg-blue-500 text-white shadow" : "bg-gray-200 hover:bg-blue-100"}`}
                                    onClick={() => setPositionFilter(pos)}
                                >
                                    {pos}
                                </button>
                            ))}
                        </div>
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="border p-2 rounded-md bg-white/90 shadow">
                            {["overall", "speed", "shooting", "passing", "dribbling", "physical", "defending"].map(key => (
                                <option key={key} value={key}>Sort by {key.charAt(0).toUpperCase() + key.slice(1)}</option>
                            ))}
                        </select>
                    </div>

                    <DndContext collisionDetection={closestCenter}>
                        {/* Show button for attribute comparison */}
                        {!showComparison && (
                            <div className="flex justify-center mb-4">
                                <button
                                    onClick={() => setShowComparison(true)}
                                    className="px-4 py-1 rounded text-sm bg-blue-500 hover:bg-blue-600 text-white font-semibold shadow transition"
                                    type="button"
                                >
                                    Show Attribute Comparison
                                </button>
                            </div>
                        )}

                        {showComparison && (
                            <MirroredTeamAttributesBarChart
                                teamAPlayers={teamA}
                                teamBPlayers={teamB}
                                teamALabel="Team A"
                                teamBLabel="Team B"
                                onHide={() => setShowComparison(false)}
                            />
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <DroppableTeam
                                id="teamA"
                                label="Team A"
                                players={teamA}
                                onPlayerDrop={handlePlayerDrop}
                                formation={formationA}
                                onFormationChange={setFormationA}
                                allPlayers={players}
                                globalActiveSlot={globalActiveSlot}
                                setGlobalActiveSlot={setGlobalActiveSlot}
                                playerSelectModal={playerSelectModal}
                                setPlayerSelectModal={setPlayerSelectModal}
                            />
                            <DroppableTeam
                                id="teamB"
                                label="Team B"
                                players={teamB}
                                onPlayerDrop={handlePlayerDrop}
                                formation={formationB}
                                onFormationChange={setFormationB}
                                allPlayers={players}
                                globalActiveSlot={globalActiveSlot}
                                setGlobalActiveSlot={setGlobalActiveSlot}
                                playerSelectModal={playerSelectModal}
                                setPlayerSelectModal={setPlayerSelectModal}
                            />
                        </div>

                        <PlayerSelectModal
                            open={playerSelectModal.open}
                            onClose={() => setPlayerSelectModal({ open: false })}
                            players={playerSelectModal.eligiblePlayers || []}
                            onSelect={playerSelectModal.onSelect || (() => {})}
                            slotLabel={playerSelectModal.slotLabel}
                        />

                        <div className={`flex items-center mb-2 gap-2 ${glass}`}>
                            <h2 className="text-xl font-semibold text-green-900">Available Players</h2>
                            <label className="flex items-center gap-1 text-sm font-normal cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={hideSelected}
                                    onChange={e => setHideSelected(e.target.checked)}
                                    className="accent-blue-500"
                                />
                                Hide selected
                            </label>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {availablePlayers.map((p) => (
                                <DraggablePlayer
                                    key={p.name}
                                    player={p}
                                    fromTeam={null}
                                    fromIndex={null}
                                    selected={assignedNames.includes(p.name)}
                                />
                            ))}
                        </div>
                    </DndContext>
                </div>
            </div>
        </div>
    );
}

