import React, { useEffect, useState, useRef } from "react";
import Papa from "papaparse";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    DndContext,
    closestCenter,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragOverlay,
} from '@dnd-kit/core';

const glass = "backdrop-blur-md bg-white/80 shadow-lg border border-gray-200";

// Simple loading spinner component
function LoadingSpinner({ className = "" }) {
    return (
        <div className={`flex justify-center items-center py-8 ${className}`}>
            <svg className="animate-spin h-8 w-8 text-blue-500" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <span className="ml-3 text-blue-700 font-semibold text-lg">Loading...</span>
        </div>
    );
}

function PlayerSelectModal({ open, onClose, players, onSelect, slotLabel }) {
    const [search, setSearch] = useState("");
    const [showAll, setShowAll] = useState(false);
    const modalRef = useRef(null);

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

    useEffect(() => {
        if (open) {
            setShowAll(false);
            setSearch("");
        }
    }, [open]);

    if (!open) return null;

    const sortedPlayers = [...players].sort((a, b) => {
        const aMatch = a.position === slotLabel;
        const bMatch = b.position === slotLabel;
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
        return b.overall - a.overall;
    });

    const filtered = sortedPlayers.filter(
        p => p.name.toLowerCase().includes(search.toLowerCase())
    );

    const showLimited = !showAll && search.trim() === "";
    const visiblePlayers = showLimited ? filtered.slice(0, 9) : filtered;

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
                    {visiblePlayers.length === 0 ? (
                        <div className="text-xs text-gray-400 p-2 text-center">No available players</div>
                    ) : (
                        visiblePlayers.map(p => (
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
                    {showLimited && filtered.length > 9 && (
                        <div className="flex justify-center mt-2">
                            <button
                                className="px-3 py-1 rounded bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 transition"
                                onClick={() => setShowAll(true)}
                                type="button"
                            >
                                Show all ({filtered.length})
                            </button>
                        </div>
                    )}
                    {!showLimited && filtered.length > 9 && (
                        <div className="flex justify-center mt-2">
                            <button
                                className="px-3 py-1 rounded bg-gray-300 text-gray-800 text-xs font-semibold hover:bg-gray-400 transition"
                                onClick={() => setShowAll(false)}
                                type="button"
                            >
                                Show less
                            </button>
                        </div>
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

// Circular (Radar) Comparison
function RadarCompare({ players }) {
    if (players.length < 2) return null;

    // Determine if all selected are outfield (not GK)
    const allOutfield = players.every(p => p.position !== "GK");
    // Attributes to compare
    const attrs = allOutfield
        ? [
            { key: "overall", label: "Overall", max: 100 },
            { key: "speed", label: "Speed", max: 100 },
            { key: "shooting", label: "Shooting", max: 100 },
            { key: "passing", label: "Passing", max: 100 },
            { key: "dribbling", label: "Dribbling", max: 100 },
            { key: "physical", label: "Physical", max: 100 },
            { key: "defending", label: "Defending", max: 100 },
            { key: "weakFoot", label: "Weak Foot", max: 50 }
        ]
        : [
            { key: "overall", label: "Overall", max: 100 },
            { key: "speed", label: "Speed", max: 100 },
            { key: "shooting", label: "Shooting", max: 100 },
            { key: "passing", label: "Passing", max: 100 },
            { key: "dribbling", label: "Dribbling", max: 100 },
            { key: "physical", label: "Physical", max: 100 },
            { key: "defending", label: "Defending", max: 100 },
            { key: "goalkeeping", label: "Goalkeeping", max: 100 },
            { key: "weakFoot", label: "Weak Foot", max: 50 }
        ];

    // Colors for up to 3 players
    const colors = [
        "#3b82f6", // blue
        "#ef4444", // red
        "#f59e42"  // orange
    ];

    // Make the radar chart wider for better label spacing
    const size = 420; // was 320
    const center = size / 2;
    const radius = size / 2 - 60; // slightly more margin for labels
    const angleStep = (2 * Math.PI) / attrs.length;

    // Helper: get points for a player
    function getPoints(player, idx) {
        return attrs.map((attr, i) => {
            const value = player[attr.key] || 0;
            const r = (value / attr.max) * radius;
            const angle = i * angleStep - Math.PI / 2;
            return [
                center + r * Math.cos(angle),
                center + r * Math.sin(angle)
            ];
        });
    }

    // Helper: get polygon string
    function pointsToString(points) {
        return points.map(([x, y]) => `${x},${y}`).join(" ");
    }

    // Draw attribute axes and labels
    const axes = attrs.map((attr, i) => {
        const angle = i * angleStep - Math.PI / 2;
        const x = center + radius * Math.cos(angle);
        const y = center + radius * Math.sin(angle);
        // Move label further out for better visibility
        const labelX = center + (radius + 38) * Math.cos(angle);
        const labelY = center + (radius + 38) * Math.sin(angle);
        return (
            <g key={attr.key}>
                <line
                    x1={center}
                    y1={center}
                    x2={x}
                    y2={y}
                    stroke="#d1d5db"
                    strokeWidth="1"
                />
                <text
                    x={labelX}
                    y={labelY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="14"
                    fill="#374151"
                    style={{
                        pointerEvents: "none",
                        fontWeight: 600,
                        background: "white"
                    }}
                >
                    {attr.label}
                </text>
            </g>
        );
    });

    // Draw grid (concentric polygons)
    const gridLevels = 4;
    const grid = [];
    for (let level = 1; level <= gridLevels; level++) {
        const r = (radius * level) / gridLevels;
        const points = attrs.map((attr, i) => {
            const angle = i * angleStep - Math.PI / 2;
            return [
                center + r * Math.cos(angle),
                center + r * Math.sin(angle)
            ];
        });
        grid.push(
            <polygon
                key={level}
                points={pointsToString(points)}
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="1"
            />
        );
    }

    // Draw player polygons
    const polygons = players.map((player, idx) => {
        const points = getPoints(player, idx);
        return (
            <polygon
                key={player.name}
                points={pointsToString(points)}
                fill={colors[idx] + "33"}
                stroke={colors[idx]}
                strokeWidth="2"
            />
        );
    });

    // Draw player dots
    const dots = players.map((player, idx) => {
        const points = getPoints(player, idx);
        return points.map(([x, y], i) => (
            <circle
                key={player.name + "-dot-" + i}
                cx={x}
                cy={y}
                r={4}
                fill={colors[idx]}
                stroke="#fff"
                strokeWidth="1"
            />
        ));
    });

    // Legend
    const legend = (
        <div className="flex justify-center gap-4 mt-2 mb-2">
            {players.map((p, idx) => (
                <div key={p.name} className="flex items-center gap-2">
                    <span style={{
                        display: "inline-block",
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        background: colors[idx],
                        border: "2px solid #fff"
                    }} />
                    <span className="font-semibold text-sm">{p.name}</span>
                    <button
                        className="ml-1 px-2 py-0.5 rounded bg-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-300"
                        onClick={() => removeFromCompare(p.name)}
                        title="Remove from comparison"
                    >×</button>
                </div>
            ))}
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto mb-8 bg-white rounded-xl shadow p-4 border">
            <div className="text-center font-bold text-lg mb-2">Player Attribute Comparison</div>
            {legend}
            <div className="flex flex-col md:flex-row gap-6 justify-center items-start">
                <div>
                    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                        {/* Grid */}
                        {grid}
                        {/* Axes and labels */}
                        {axes}
                        {/* Player polygons */}
                        {polygons}
                        {/* Dots */}
                        {dots}
                        {/* Center dot */}
                        <circle cx={center} cy={center} r={3} fill="#6b7280" />
                    </svg>
                </div>
                <TopEarnersCompare selected={players} />
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

function DraggablePlayer({ player, fromTeam, fromIndex, small, assigned, selected, onDragStart, onDragEnd }) {
    // Add touch event handlers for mobile fallback
    const dragRef = useRef(null);

    useEffect(() => {
        const node = dragRef.current;
        if (!node) return;

        let touchStart = null;

        function handleTouchStart(e) {
            touchStart = e;
            if (onDragStart) onDragStart(player, fromTeam, fromIndex);
        }
        function handleTouchEnd(e) {
            if (onDragEnd) onDragEnd();
        }

        node.addEventListener("touchstart", handleTouchStart, { passive: true });
        node.addEventListener("touchend", handleTouchEnd, { passive: true });

        return () => {
            node.removeEventListener("touchstart", handleTouchStart);
            node.removeEventListener("touchend", handleTouchEnd);
        };
    }, [player, fromTeam, fromIndex, onDragStart, onDragEnd]);

    return (
        <Card
            ref={dragRef}
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
                if (onDragStart) onDragStart(player, fromTeam, fromIndex);
            }}
            onDragEnd={onDragEnd}
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

// Add a simple ListPlayer component for list view
function ListPlayer({ player, fromTeam, fromIndex, assigned, selected, onDragStart, onDragEnd }) {
    const dragRef = useRef(null);

    useEffect(() => {
        const node = dragRef.current;
        if (!node) return;
        function handleTouchStart(e) {
            if (onDragStart) onDragStart(player, fromTeam, fromIndex);
        }
        function handleTouchEnd(e) {
            if (onDragEnd) onDragEnd();
        }
        node.addEventListener("touchstart", handleTouchStart, { passive: true });
        node.addEventListener("touchend", handleTouchEnd, { passive: true });
        return () => {
            node.removeEventListener("touchstart", handleTouchStart);
            node.removeEventListener("touchend", handleTouchEnd);
        };
    }, [player, fromTeam, fromIndex, onDragStart, onDragEnd]);

    return (
        <div
            ref={dragRef}
            className={
                "flex items-center border-b last:border-b-0 px-2 py-2 cursor-move transition-all duration-150 " +
                (assigned ? "bg-green-100/80 " : "") +
                (selected ? "bg-blue-100/80 " : "") +
                "hover:bg-blue-50"
            }
            draggable
            onDragStart={e => {
                e.dataTransfer.setData("application/json", JSON.stringify({
                    player,
                    fromTeam,
                    fromIndex
                }));
                if (onDragStart) onDragStart(player, fromTeam, fromIndex);
            }}
            onDragEnd={onDragEnd}
            style={{ minHeight: 36 }}
        >
            <span className="font-semibold flex-1 truncate">{player.name}</span>
            <span className="text-xs text-gray-500 w-10 text-center">{player.position}</span>
            <span className="text-xs w-12 text-center">OVR: {player.overall}</span>
            <span className="text-xs w-10 text-center">Spd: {player.speed}</span>
            <span className="text-xs w-10 text-center">Sht: {player.shooting}</span>
            <span className="text-xs w-10 text-center">Pas: {player.passing}</span>
        </div>
    );
}

// Helper to get next Wednesday's date as dd/mm/yyyy
function getNextWednesday() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sunday, 1=Monday, ..., 3=Wednesday
    const daysUntilNextWednesday = (3 - dayOfWeek + 7) % 7 || 7;
    const nextWednesday = new Date(today);
    nextWednesday.setDate(today.getDate() + daysUntilNextWednesday);
    const dd = String(nextWednesday.getDate()).padStart(2, '0');
    const mm = String(nextWednesday.getMonth() + 1).padStart(2, '0');
    const yyyy = nextWednesday.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

// Home component
function Home() {
    const [data, setData] = useState([]);
    const [topEarners, setTopEarners] = useState([]);
    const [showAll, setShowAll] = useState(false);
    const [showAllEarners, setShowAllEarners] = useState(false);
    const [loading, setLoading] = useState(true);

    const formatDate = (input) => {
        const date = new Date(input);
        if (isNaN(date)) return input;
        return date.toLocaleDateString('en-GB');
    };

    useEffect(() => {
        setLoading(true);
        const sheetUrl = 'https://docs.google.com/spreadsheets/d/1g9WWrlzTIwr2bZFyw9fqNpMTDpMzpk2ROC3UAWqofuA/gviz/tq?tqx=out:csv';
        fetch(sheetUrl)
            .then(res => res.text())
            .then(csv => {
                Papa.parse(csv, {
                    header: true,
                    skipEmptyLines: true,
                    complete: results => {
                        const keys = Object.keys(results.data[0] || {});
                        const trimmed = results.data
                            .map(row => ({ [keys[0]]: row[keys[0]], [keys[1]]: row[keys[1]] }))
                            .filter(row => row[keys[1]]?.trim());

                        setData(trimmed.slice().reverse());

                        const counts = {};
                        trimmed.forEach(row => {
                            const player = row[keys[1]];
                            counts[player] = (counts[player] || 0) + 1;
                        });
                        const sorted = Object.entries(counts)
                            .sort((a, b) => b[1] - a[1])
                            .map(([player, count], index) => ({ Rank: index + 1, Player: player, Awards: count }));

                        setTopEarners(sorted);
                        setLoading(false);
                    }
                });
            })
            .catch(() => setLoading(false));
    }, []);

    const visibleData = showAll ? data : data.slice(0, 3);
    const visibleEarners = showAllEarners ? topEarners : topEarners.slice(0, 3);

    function goTo(view) {
        const event = new CustomEvent("setView", { detail: view });
        window.dispatchEvent(event);
    }

    if (loading) return <LoadingSpinner />;

    return (
        <div className="w-full flex flex-col items-center">
            <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Shortcuts */}
                <div className="flex flex-col items-center gap-8">
                    <div className="w-full max-w-md">
                        <div className="bg-green-100 border-2 border-green-300 rounded-xl shadow p-6 flex flex-col items-center">
                            <span className="text-3xl mb-2">⚽</span>
                            <h3 className="text-xl font-bold mb-1 text-green-900">Lineup Creator</h3>
                            <p className="text-gray-700 text-center text-base mb-2">
                                Build and compare two football teams. Drag and drop players, see team averages, and compare lineups visually.
                            </p>
                            <button
                                onClick={() => goTo("lineup")}
                                className="text-blue-700 font-semibold underline text-sm"
                            >
                                Go to Lineup Creator
                            </button>
                        </div>
                    </div>
                    <div className="w-full max-w-md">
                        <div className="bg-blue-100 border-2 border-blue-300 rounded-xl shadow p-6 flex flex-col items-center">
                            <span className="text-3xl mb-2">📋</span>
                            <h3 className="text-xl font-bold mb-1 text-blue-900">Player Database</h3>
                            <p className="text-gray-700 text-center text-base mb-2">
                                Browse all players, filter and sort, and compare up to 3 players on a radar chart.
                            </p>
                            <button
                                onClick={() => goTo("database")}
                                className="text-blue-700 font-semibold underline text-sm"
                            >
                                Go to Player Database
                            </button>
                        </div>
                    </div>
                </div>
                {/* Center: Next Match Table */}
                <div className="flex flex-col items-center justify-center">
                    <div className="w-full max-w-md">
                        <div className="relative mb-8">
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-10">
                                <span className="bg-yellow-400 text-yellow-900 px-4 py-1 rounded-full font-bold shadow text-base border-2 border-yellow-300 animate-pulse">
                                    NDESHJA E RADHËS
                                </span>
                            </div>
                            <table className="w-full shadow-2xl rounded-2xl overflow-hidden border-4 border-yellow-300 bg-yellow-50/80">
                                <tbody>
                                    <tr>
                                        <td className="p-8 text-center font-bold text-yellow-900 text-lg tracking-wide">
                                            Ndeshja e radhës do të luhet të mërkurën e ardhshme<br />
                                            në datë <span className="text-blue-700 underline">{getNextWednesday()}</span><br />
                                            në orën <span className="text-blue-700 underline">20:30</span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                {/* Right: MOTM and Top Earners */}
                <div className="flex flex-col gap-8 items-center">
                    <div className="w-full max-w-md">
                        <h2 className="text-xl font-semibold mb-2 text-center">MOTM Last Winners</h2>
                        <table className="w-full text-sm shadow-md rounded-lg overflow-hidden">
                            <thead className="bg-blue-600 text-white text-xs">
                                <tr>
                                    {visibleData.length > 0 && Object.keys(visibleData[0]).map((col, i) => (
                                        <th key={i} className="border p-2 text-left font-medium">{col}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {visibleData.map((row, i) => (
                                    <tr key={i} className="odd:bg-white even:bg-gray-100">
                                        {Object.entries(row).map(([key, val], j) => (
                                            <td key={j} className="border p-2 text-xs">{j === 0 ? formatDate(val) : val}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {data.length > 3 && (
                            <div className="mt-2 text-center">
                                <button className="text-blue-600 underline hover:text-blue-800 text-xs" onClick={() => setShowAll(!showAll)}>
                                    {showAll ? 'Show Less' : 'Show All'}
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="w-full max-w-md">
                        <h2 className="text-xl font-semibold mb-2 text-center">MOTM Top Earners</h2>
                        <table className="w-full text-sm shadow-md rounded-lg overflow-hidden">
                            <thead className="bg-blue-600 text-white text-xs">
                                <tr>
                                    <th className="border p-2 text-left font-medium">Rank</th>
                                    <th className="border p-2 text-left font-medium">Player</th>
                                    <th className="border p-2 text-left font-medium">Awards</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleEarners.map((row, i) => (
                                    <tr key={i} className="odd:bg-white even:bg-gray-100">
                                        <td className="border p-2 text-xs">{row.Rank}</td>
                                        <td className="border p-2 text-xs">{row.Player}</td>
                                        <td className="border p-2 text-xs">{row.Awards}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {topEarners.length > 3 && (
                            <div className="mt-2 text-center">
                                <button className="text-blue-600 underline hover:text-blue-800 text-xs" onClick={() => setShowAllEarners(!showAllEarners)}>
                                    {showAllEarners ? 'Show Less' : 'Show All'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// PlayerDatabase component with 3-way circular visual compare function and top earners table
function PlayerDatabase() {
    const [players, setPlayers] = useState([]);
    const [search, setSearch] = useState("");
    const [positionFilter, setPositionFilter] = useState("All");
    const [sortBy, setSortBy] = useState("overall");
    const [selected, setSelected] = useState([]); // up to 3 for compare
    const [topEarners, setTopEarners] = useState([]);

    // Fetch player stats
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
            });
    }, []);

    // Fetch top earners
    useEffect(() => {
        const sheetUrl = 'https://docs.google.com/spreadsheets/d/1g9WWrlzTIwr2bZFyw9fqNpMTDpMzpk2ROC3UAWqofuA/gviz/tq?tqx=out:csv';
        fetch(sheetUrl)
            .then(res => res.text())
            .then(csv => {
                Papa.parse(csv, {
                    header: true,
                    skipEmptyLines: true,
                    complete: results => {
                        const keys = Object.keys(results.data[0] || {});
                        const trimmed = results.data
                            .map(row => ({ [keys[0]]: row[keys[0]], [keys[1]]: row[keys[1]] }))
                            .filter(row => row[keys[1]]?.trim());

                        const counts = {};
                        trimmed.forEach(row => {
                            const player = row[keys[1]];
                            counts[player] = (counts[player] || 0) + 1;
                        });
                        const sorted = Object.entries(counts)
                            .sort((a, b) => b[1] - a[1])
                            .map(([player, count], index) => ({ Rank: index + 1, Player: player, Awards: count }));

                        setTopEarners(sorted);
                    }
                });
            });
    }, []);

    function calculateOverall(p) {
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
    }

    const filtered = players
        .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
        .filter((p) => positionFilter === "All" || p.position === positionFilter)
        .sort((a, b) => b[sortBy] - a[sortBy]);

    function toggleSelect(player) {
        setSelected((prev) => {
            if (prev.some((p) => p.name === player.name)) {
                return prev.filter((p) => p.name !== player.name);
            }
            if (prev.length >= 3) {
                // Remove the first and add the new one
                return [...prev.slice(1), player];
            }
            return [...prev, player];
        });
    }

    function removeFromCompare(name) {
        setSelected((prev) => prev.filter((p) => p.name !== name));
    }

    // Top Earners Comparison Table
    function TopEarnersCompare({ selected }) {
        if (!selected.length) return null;
        // Find top earners for selected players
        const selectedEarners = selected.map(sel => {
            const found = topEarners.find(e => e.Player === sel.name);
            return {
                name: sel.name,
                awards: found ? found.Awards : 0,
                rank: found ? found.Rank : "-"
            };
        });
        return (
            <div className="bg-white rounded-xl shadow p-4 border max-w-xs w-full">
                <div className="text-center font-bold text-lg mb-2">Top Earners Comparison</div>
                <table className="w-full text-sm">
                    <thead>
                        <tr>
                            <th className="p-2 text-left font-medium">Player</th>
                            <th className="p-2 text-center font-medium">Rank</th>
                            <th className="p-2 text-center font-medium">Awards</th>
                        </tr>
                    </thead>
                    <tbody>
                        {selectedEarners.map((e, i) => (
                            <tr key={e.name} className="odd:bg-white even:bg-gray-100">
                                <td className="p-2 font-semibold">{e.name}</td>
                                <td className="p-2 text-center">{e.rank}</td>
                                <td className="p-2 text-center">{e.awards}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    // Circular (Radar) Comparison
    function RadarCompare({ players }) {
        if (players.length < 2) return null;

        // Determine if all selected are outfield (not GK)
        const allOutfield = players.every(p => p.position !== "GK");
        // Attributes to compare
        const attrs = allOutfield
            ? [
                { key: "overall", label: "Overall", max: 100 },
                { key: "speed", label: "Speed", max: 100 },
                { key: "shooting", label: "Shooting", max: 100 },
                { key: "passing", label: "Passing", max: 100 },
                { key: "dribbling", label: "Dribbling", max: 100 },
                { key: "physical", label: "Physical", max: 100 },
                { key: "defending", label: "Defending", max: 100 },
                { key: "weakFoot", label: "Weak Foot", max: 50 }
            ]
            : [
                { key: "overall", label: "Overall", max: 100 },
                { key: "speed", label: "Speed", max: 100 },
                { key: "shooting", label: "Shooting", max: 100 },
                { key: "passing", label: "Passing", max: 100 },
                { key: "dribbling", label: "Dribbling", max: 100 },
                { key: "physical", label: "Physical", max: 100 },
                { key: "defending", label: "Defending", max: 100 },
                { key: "goalkeeping", label: "Goalkeeping", max: 100 },
                { key: "weakFoot", label: "Weak Foot", max: 50 }
            ];

        // Colors for up to 3 players
        const colors = [
            "#3b82f6", // blue
            "#ef4444", // red
            "#f59e42"  // orange
        ];

        // Radar chart dimensions
        const size = 320;
        const center = size / 2;
        const radius = size / 2 - 40;
        const angleStep = (2 * Math.PI) / attrs.length;

        // Helper: get points for a player
        function getPoints(player, idx) {
            return attrs.map((attr, i) => {
                const value = player[attr.key] || 0;
                const r = (value / attr.max) * radius;
                const angle = i * angleStep - Math.PI / 2;
                return [
                    center + r * Math.cos(angle),
                    center + r * Math.sin(angle)
                ];
            });
        }

        // Helper: get polygon string
        function pointsToString(points) {
            return points.map(([x, y]) => `${x},${y}`).join(" ");
        }

        // Draw attribute axes and labels
        const axes = attrs.map((attr, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const x = center + radius * Math.cos(angle);
            const y = center + radius * Math.sin(angle);
            const labelX = center + (radius + 18) * Math.cos(angle);
            const labelY = center + (radius + 18) * Math.sin(angle);
            return (
                <g key={attr.key}>
                    <line
                        x1={center}
                        y1={center}
                        x2={x}
                        y2={y}
                        stroke="#d1d5db"
                        strokeWidth="1"
                    />
                    <text
                        x={labelX}
                        y={labelY}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize="12"
                        fill="#374151"
                        style={{ pointerEvents: "none", fontWeight: 500 }}
                    >
                        {attr.label}
                    </text>
                </g>
            );
        });

        // Draw grid (concentric polygons)
        const gridLevels = 4;
        const grid = [];
        for (let level = 1; level <= gridLevels; level++) {
            const r = (radius * level) / gridLevels;
            const points = attrs.map((attr, i) => {
                const angle = i * angleStep - Math.PI / 2;
                return [
                    center + r * Math.cos(angle),
                    center + r * Math.sin(angle)
                ];
            });
            grid.push(
                <polygon
                    key={level}
                    points={pointsToString(points)}
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="1"
                />
            );
        }

        // Draw player polygons
        const polygons = players.map((player, idx) => {
            const points = getPoints(player, idx);
            return (
                <polygon
                    key={player.name}
                    points={pointsToString(points)}
                    fill={colors[idx] + "33"}
                    stroke={colors[idx]}
                    strokeWidth="2"
                />
            );
        });

        // Draw player dots
        const dots = players.map((player, idx) => {
            const points = getPoints(player, idx);
            return points.map(([x, y], i) => (
                <circle
                    key={player.name + "-dot-" + i}
                    cx={x}
                    cy={y}
                    r={4}
                    fill={colors[idx]}
                    stroke="#fff"
                    strokeWidth="1"
                />
            ));
        });

        // Legend
        const legend = (
            <div className="flex justify-center gap-4 mt-2 mb-2">
                {players.map((p, idx) => (
                    <div key={p.name} className="flex items-center gap-2">
                        <span style={{
                            display: "inline-block",
                            width: 16,
                            height: 16,
                            borderRadius: "50%",
                            background: colors[idx],
                            border: "2px solid #fff"
                        }} />
                        <span className="font-semibold text-sm">{p.name}</span>
                        <button
                            className="ml-1 px-2 py-0.5 rounded bg-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-300"
                            onClick={() => removeFromCompare(p.name)}
                            title="Remove from comparison"
                        >×</button>
                    </div>
                ))}
            </div>
        );

        return (
            <div className="max-w-2xl mx-auto mb-8 bg-white rounded-xl shadow p-4 border">
                <div className="text-center font-bold text-lg mb-2">Player Attribute Comparison</div>
                {legend}
                <div className="flex flex-col md:flex-row gap-6 justify-center items-start">
                    <div>
                        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                            {/* Grid */}
                            {grid}
                            {/* Axes and labels */}
                            {axes}
                            {/* Player polygons */}
                            {polygons}
                            {/* Dots */}
                            {dots}
                            {/* Center dot */}
                            <circle cx={center} cy={center} r={3} fill="#6b7280" />
                        </svg>
                    </div>
                    <TopEarnersCompare selected={players} />
                </div>
            </div>
        );
    }

    return (
        <div>
            <h1 className="text-3xl font-bold mb-4 text-center text-green-900">Player Database</h1>
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                <Input
                    type="text"
                    placeholder="Search players..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full md:w-1/2"
                />
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
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="border p-2 rounded-md bg-white/90 shadow">
                    {["overall", "speed", "shooting", "passing", "dribbling", "physical", "defending"].map(key => (
                        <option key={key} value={key}>Sort by {key.charAt(0).toUpperCase() + key.slice(1)}</option>
                    ))}
                </select>
            </div>
            <RadarCompare players={selected} />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filtered.map((p) => (
                    <div
                        key={p.name}
                        className={`border rounded-xl shadow p-4 cursor-pointer transition-all duration-150 ${selected.some(sel => sel.name === p.name) ? "bg-blue-100 border-blue-400" : "bg-white hover:bg-blue-50"}`}
                        onClick={() => toggleSelect(p)}
                    >
                        <div className="flex items-center justify-between">
                            <div className="font-semibold text-base truncate">{p.name}</div>
                            {selected.some(sel => sel.name === p.name) && (
                                <button
                                    className="ml-2 px-2 py-0.5 rounded bg-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-300"
                                    onClick={e => { e.stopPropagation(); removeFromCompare(p.name); }}
                                    title="Remove from comparison"
                                >×</button>
                            )}
                        </div>
                        <div className="text-xs text-muted-foreground mb-2">{p.position}</div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-2">
                            <span>Speed: {p.speed}</span>
                            <span>Shooting: {p.shooting}</span>
                            <span>Passing: {p.passing}</span>
                            <span>Dribbling: {p.dribbling}</span>
                            <span>Physical: {p.physical}</span>
                            <span>Defending: {p.defending}</span>
                            <span>Weak Foot: {p.weakFoot}</span>
                            <span>Goalkeeping: {p.goalkeeping}</span>
                        </div>
                        <div className="text-sm font-bold">Overall: {p.overall}</div>
                        {selected.some(sel => sel.name === p.name) && (
                            <div className="text-xs text-blue-700 font-semibold mt-1">Selected</div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

// Main App with view switching
export default function App() {
    const [view, setView] = useState("home"); // "home", "lineup", "database"
    const [scrolled, setScrolled] = useState(false);

    // Listen for scroll to shrink the header
    useEffect(() => {
        function onScroll() {
            setScrolled(window.scrollY > 24);
        }
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    useEffect(() => {
        function handler(e) {
            setView(e.detail);
        }
        window.addEventListener("setView", handler);
        return () => window.removeEventListener("setView", handler);
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800">
            <header
                className={
                    "z-50 sticky top-0 left-0 w-full transition-all duration-300 bg-white shadow " +
                    (scrolled
                        ? "py-1 shadow-md border-b border-gray-200"
                        : "py-4")
                }
                style={{
                    // Optional: add a little blur when scrolled
                    backdropFilter: scrolled ? "blur(4px)" : undefined,
                }}
            >
                <nav className="container mx-auto flex justify-between items-center transition-all duration-300">
                    <h1
                        className={
                            "font-bold transition-all duration-300 " +
                            (scrolled
                                ? "text-lg"
                                : "text-xl")
                        }
                        style={{
                            letterSpacing: scrolled ? "0.01em" : "0.02em",
                        }}
                    >
                        Grupi i Futbollit
                    </h1>
                    <div className="flex gap-4 text-lg">
                        <button
                            className={`hover:underline ${view === "home" ? "font-bold text-blue-700" : ""}`}
                            onClick={() => setView("home")}
                        >
                            Home
                        </button>
                        <button
                            className={`hover:underline ${view === "lineup" ? "font-bold text-blue-700" : ""}`}
                            onClick={() => setView("lineup")}
                        >
                            Lineup Creator
                        </button>
                        <button
                            className={`hover:underline ${view === "database" ? "font-bold text-blue-700" : ""}`}
                            onClick={() => setView("database")}
                        >
                            Player Database
                        </button>
                    </div>
                </nav>
            </header>
            <main className="container mx-auto p-4">
                {view === "home" && <Home />}
                {view === "lineup" && <LineupCreator />}
                {view === "database" && <PlayerDatabase />}
            </main>
        </div>
    );
}

// The LineupCreator component is your current App code
function LineupCreator() {
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
    const [showComparison, setShowComparison] = useState(false);
    const [showAllAvailable, setShowAllAvailable] = useState(false);
    const [showLineups, setShowLineups] = useState(true);
    const [viewMode, setViewMode] = useState("big"); // "big", "small", "list"

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

    const sortedAvailablePlayers = availablePlayers.sort((a, b) => b.overall - a.overall);

    // Show only top 12 unless showAllAvailable is true
    const visibleAvailablePlayers =
        showAllAvailable ? sortedAvailablePlayers : sortedAvailablePlayers.slice(0, 12);

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

    // Enable both mouse and touch sensors for drag and drop (mobile support)
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } })
    );

    // Drag overlay state for mobile visual feedback
    const [activeDrag, setActiveDrag] = useState(null);

    // Handler for drag start (for mobile fallback)
    const handleDragStart = (player, fromTeam, fromIndex) => {
        setActiveDrag({ player, fromTeam, fromIndex });
    };
    const handleDragEnd = () => {
        setActiveDrag(null);
    };

    return (
        <div className="p-4 max-w-7xl mx-auto" ref={mainRef}>
            <h1 className="text-4xl font-extrabold mb-6 text-center text-green-900 drop-shadow">Lineup Creator A</h1>
            
            {/* Show/Hide Lineups and Attribute Comparison button */}
            <div className="flex justify-center mb-4">
                <button
                    onClick={() => setShowLineups(v => !v)}
                    className="px-4 py-1 rounded text-sm bg-blue-500 hover:bg-blue-600 text-white font-semibold shadow transition"
                    type="button"
                >
                    {showLineups ? "Hide Lineups & Comparison" : "Show Lineups & Comparison"}
                </button>
            </div>

            {/* Player view mode selector */}
            <div className="flex justify-end mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">View:</span>
                    <button
                        className={`px-2 py-1 rounded text-xs font-semibold border transition ${viewMode === "list" ? "bg-blue-500 text-white border-blue-500" : "bg-white hover:bg-blue-100 border-gray-300"}`}
                        onClick={() => setViewMode("list")}
                        type="button"
                    >
                        List
                    </button>
                    <button
                        className={`px-2 py-1 rounded text-xs font-semibold border transition ${viewMode === "small" ? "bg-blue-500 text-white border-blue-500" : "bg-white hover:bg-blue-100 border-gray-300"}`}
                        onClick={() => setViewMode("small")}
                        type="button"
                    >
                        Small Cards
                    </button>
                    <button
                        className={`px-2 py-1 rounded text-xs font-semibold border transition ${viewMode === "big" ? "bg-blue-500 text-white border-blue-500" : "bg-white hover:bg-blue-100 border-gray-300"}`}
                        onClick={() => setViewMode("big")}
                        type="button"
                    >
                        Big Cards
                    </button>
                </div>
            </div>

            {/* Only hide/show the lineups and attribute comparison */}
            {showLineups && (
                <>
                    {/* Attribute Comparison */}
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

                    {/* Lineups */}
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
                </>
            )}

            {/* The rest (search, available players) is always visible */}
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

            <DndContext
                collisionDetection={closestCenter}
                sensors={sensors}
            >
                {/* Drag overlay for mobile visual feedback */}
                <DragOverlay>
                    {activeDrag ? (
                        <DraggablePlayer
                            player={activeDrag.player}
                            fromTeam={activeDrag.fromTeam}
                            fromIndex={activeDrag.fromIndex}
                            small={viewMode === "small"}
                            assigned={false}
                            selected={false}
                        />
                    ) : null}
                </DragOverlay>

                <PlayerSelectModal
                    open={playerSelectModal.open}
                    onClose={() => setPlayerSelectModal({ open: false })}
                    players={playerSelectModal.eligiblePlayers || []}
                    onSelect={playerSelectModal.onSelect || (() => { })}
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
                    {/* View mode selector beside Available Players */}
                    <div className="flex items-center gap-1 ml-4">
                        <span className="text-xs text-gray-600">View:</span>
                        <button
                            className={`px-2 py-1 rounded text-xs font-semibold border transition ${viewMode === "list" ? "bg-blue-500 text-white border-blue-500" : "bg-white hover:bg-blue-100 border-gray-300"}`}
                            onClick={() => setViewMode("list")}
                            type="button"
                            aria-label="List view"
                        >
                            <span role="img" aria-label="List">📋</span>
                        </button>
                        <button
                            className={`px-2 py-1 rounded text-xs font-semibold border transition ${viewMode === "small" ? "bg-blue-500 text-white border-blue-500" : "bg-white hover:bg-blue-100 border-gray-300"}`}
                            onClick={() => setViewMode("small")}
                            type="button"
                            aria-label="Small cards"
                        >
                            <span role="img" aria-label="Small cards">🃏</span>
                        </button>
                        <button
                            className={`px-2 py-1 rounded text-xs font-semibold border transition ${viewMode === "big" ? "bg-blue-500 text-white border-blue-500" : "bg-white hover:bg-blue-100 border-gray-300"}`}
                            onClick={() => setViewMode("big")}
                            type="button"
                            aria-label="Big cards"
                        >
                            <span role="img" aria-label="Big cards">🗂️</span>
                        </button>
                    </div>
                </div>

                {/* Player display modes */}
                {viewMode === "list" ? (
                    <div className="bg-white rounded-xl border shadow divide-y">
                        {visibleAvailablePlayers.map((p, idx) => (
                            <ListPlayer
                                key={p.name}
                                player={p}
                                fromTeam={null}
                                fromIndex={null}
                                assigned={assignedNames.includes(p.name)}
                                selected={assignedNames.includes(p.name)}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                            />
                        ))}
                    </div>
                ) : (
                    <div className={`grid grid-cols-1 ${viewMode === "small" ? "sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6" : "sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"} gap-3`}>
                        {visibleAvailablePlayers.map((p, idx) => (
                            <DraggablePlayer
                                key={p.name}
                                player={p}
                                fromTeam={null}
                                fromIndex={null}
                                small={viewMode === "small"}
                                assigned={assignedNames.includes(p.name)}
                                selected={assignedNames.includes(p.name)}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                            />
                        ))}
                    </div>
                )}

                {!showAllAvailable && sortedAvailablePlayers.length > 12 && (
                    <div className="flex justify-center mt-2">
                        <button
                            className="px-3 py-1 rounded bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 transition"
                            onClick={() => setShowAllAvailable(true)}
                            type="button"
                        >
                            Show all ({sortedAvailablePlayers.length})
                        </button>
                    </div>
                )}
                {showAllAvailable && sortedAvailablePlayers.length > 12 && (
                    <div className="flex justify-center mt-2">
                        <button
                            className="px-3 py-1 rounded bg-gray-300 text-gray-800 text-xs font-semibold hover:bg-gray-400 transition"
                            onClick={() => setShowAllAvailable(false)}
                            type="button"
                        >
                            Show less
                        </button>
                    </div>
                )}
            </DndContext>
        </div>
    );
}
