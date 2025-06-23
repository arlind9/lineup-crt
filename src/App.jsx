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
const PLACEHOLDER_IMG = "https://ui-avatars.com/api/?name=Player&background=eee&color=888&size=128&rounded=true";

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

function extractPhotoUrl(cellValue) {
    if (!cellValue) return null;
    const match = typeof cellValue === "string" && cellValue.match(/=IMAGE\("([^"]+)"\)/i);
    return match ? match[1] : cellValue;
}

function getCardBgByOverall(overall) {
    if (overall >= 90) return "bg-gradient-to-br from-[#e5e4e2] via-[#b3e0fc] to-[#f8fafc] border-blue-300";
    if (overall >= 80) return "bg-gradient-to-br from-yellow-200 via-yellow-100 to-white border-yellow-400";
    return "bg-gradient-to-br from-gray-200 via-gray-100 to-white border-gray-300";
}

function getCardHighlight({ assigned, selected }) {
    if (assigned) {
        return "ring-2 ring-green-400 ring-offset-2";
    }
    if (selected) {
        return "ring-2 ring-blue-400 ring-offset-2";
    }
    return "";
}

function PlayerSelectModal({ open, onClose, players, onSelect, slotLabel }) {
    const [search, setSearch] = useState("");
    const [showAll, setShowAll] = useState(false);
    const [hoveredPlayer, setHoveredPlayer] = useState(null);
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
            setHoveredPlayer(null);
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
            <div
                ref={modalRef}
                className={`w-full max-w-2xl bg-white rounded-xl shadow-xl border p-4 ${glass} relative flex flex-col sm:flex-row gap-4`}
                style={{ minWidth: 480 }}
            >
                <button
                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-lg font-bold"
                    onClick={onClose}
                    aria-label="Close"
                    type="button"
                >×</button>
                <div className="flex-1 flex flex-col">
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
                    <div className="flex-1 max-h-80 overflow-y-auto">
                        {visiblePlayers.length === 0 ? (
                            <div className="text-xs text-gray-400 p-2 text-center">No available players</div>
                        ) : (
                            visiblePlayers.map(p => {
                                const cardBg = getCardBgByOverall(p.overall);
                                return (
                                    <div
                                        key={p.name}
                                        className={`p-2 rounded cursor-pointer flex justify-between items-center mb-1 ${cardBg} border hover:bg-blue-100 transition`}
                                        onClick={() => onSelect(p)}
                                        onMouseEnter={() => setHoveredPlayer(p)}
                                        onMouseLeave={() => setHoveredPlayer(null)}
                                        onFocus={() => setHoveredPlayer(p)}
                                        onBlur={() => setHoveredPlayer(null)}
                                        tabIndex={0}
                                    >
                                        <span>
                                            <span className="font-semibold">{p.name}</span>
                                            <span className="text-gray-500 ml-1">({p.position})</span>
                                        </span>
                                        <span className="text-gray-400 text-xs">OVR: {p.overall}</span>
                                    </div>
                                );
                            })
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
                <div className="w-56 min-w-[12rem] hidden sm:block">
                    {hoveredPlayer && (
                        <div className={`border rounded-lg p-2 text-xs shadow ${getCardBgByOverall(hoveredPlayer.overall)}`}>
                            <div className="font-bold text-center mb-1">{hoveredPlayer.name}</div>
                            <div className="text-center text-gray-500 mb-2">{hoveredPlayer.position}</div>
                            <div className="flex justify-center mb-2">
                                <img
                                    src={hoveredPlayer.photo ? hoveredPlayer.photo : PLACEHOLDER_IMG}
                                    alt={hoveredPlayer.name}
                                    className="w-12 h-12 rounded-full object-cover border"
                                    style={{ background: "#eee" }}
                                    loading="lazy"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-x-2 gap-y-1 mb-1">
                                <span>Speed: {hoveredPlayer.speed}</span>
                                <span>Shooting: {hoveredPlayer.shooting}</span>
                                <span>Passing: {hoveredPlayer.passing}</span>
                                <span>Dribbling: {hoveredPlayer.dribbling}</span>
                                <span>Physical: {hoveredPlayer.physical}</span>
                                <span>Defending: {hoveredPlayer.defending}</span>
                                <span>Weak Foot: {hoveredPlayer.weakFoot}</span>
                                <span>Goalkeeping: {hoveredPlayer.goalkeeping}</span>
                            </div>
                            <div className="text-center font-bold">Overall: {hoveredPlayer.overall}</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function TeamAttributesBarChart({ players }) {
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
            const nonGKs = filled.filter(p => p.position !== "GK");
            avgs[attr.key] = nonGKs.length
                ? Math.round(nonGKs.reduce((sum, p) => sum + (p[attr.key] || 0), 0) / nonGKs.length)
                : 0;
        } else {
            avgs[attr.key] = Math.round(
                filled.reduce((sum, p) => sum + (p[attr.key] || 0), 0) / filled.length
            );
        }
    });

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
                            <span className="w-20 text-xs text-gray-500 text-center">{attr.label}</span>
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
            const nonGKs = filled.filter(p => p.position !== "GK");
            return nonGKs.length
                ? Math.round(nonGKs.reduce((sum, p) => sum + (p[key] || 0), 0) / nonGKs.length)
                : 0;
        }
        if (!filled.length) return 0;
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

function RadarCompare({ players }) {
    if (players.length < 2) return null;

    const allOutfield = players.every(p => p.position !== "GK");
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

    const colors = [
        "#3b82f6",
        "#ef4444",
        "#f59e42",
        "#10b981",
        "#a21caf"
    ];

    const size = 320;
    const center = size / 2;
    const radius = size / 2 - 40;
    const angleStep = (2 * Math.PI) / attrs.length;

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

    function pointsToString(points) {
        return points.map(([x, y]) => `${x},${y}`).join(" ");
    }

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
            <div className="flex justify-center gap-4 mt-2 mb-2">
                {legend}
                {players.length < 5 && (
                    <button
                        className="ml-2 px-3 py-1 rounded bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 transition"
                        onClick={() => setAddCompareModalOpen(true)}
                        type="button"
                    >
                        + Add Player
                    </button>
                )}
            </div>
            <div className="flex flex-col md:flex-row gap-6 justify-center items-start">
                <div>
                    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                        {grid}
                        {axes}
                        {polygons}
                        {dots}
                        <circle cx={center} cy={center} r={3} fill="#6b7280" />
                    </svg>
                </div>
                <TopEarnersCompare selected={players} />
            </div>
        </div>
    );
}

function getPlayerWithPositionAttributes(player, newPosition) {
    if (!player) return null;
    if (player.position === newPosition) return { ...player };

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
    playerSelectModal,
    setPlayerSelectModal,
    otherFormationPositions,
    setCompareHover,
    handleDragStart,
    handleDragEnd
}) {
    const formationPositions = formationMap[formation] || formationMap["3-3-3"];

    function isPositionCompatible(slotPos, playerPos) {
        if (slotPos === "GK") return playerPos === "GK";
        if (playerPos === "GK") return false;
        return true;
    }

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

    function getSlotStyle(pos, idx) {
        const layouts = {
            "3-3-3": [
                { top: "92%", left: "50%" },
                { top: "72%", left: "20%" },
                { top: "72%", left: "50%" },
                { top: "72%", left: "80%" },
                { top: "51%", left: "20%" },
                { top: "51%", left: "50%" },
                { top: "51%", left: "80%" },
                { top: "23%", left: "20%" },
                { top: "23%", left: "50%" },
                { top: "23%", left: "80%" },
            ],
            "4-4-1": [
                { top: "92%", left: "50%" },
                { top: "72%", left: "15%" },
                { top: "72%", left: "38%" },
                { top: "72%", left: "62%" },
                { top: "72%", left: "85%" },
                { top: "51%", left: "15%" },
                { top: "51%", left: "38%" },
                { top: "51%", left: "62%" },
                { top: "51%", left: "85%" },
                { top: "23%", left: "50%" },
            ],
            "4-3-2": [
                { top: "92%", left: "50%" },
                { top: "72%", left: "15%" },
                { top: "72%", left: "38%" },
                { top: "72%", left: "62%" },
                { top: "72%", left: "85%" },
                { top: "51%", left: "25%" },
                { top: "51%", left: "50%" },
                { top: "51%", left: "75%" },
                { top: "23%", left: "35%" },
                { top: "23%", left: "65%" },
            ],
            "4-2-3": [
                { top: "92%", left: "50%" },
                { top: "72%", left: "15%" },
                { top: "72%", left: "38%" },
                { top: "72%", left: "62%" },
                { top: "72%", left: "85%" },
                { top: "51%", left: "30%" },
                { top: "51%", left: "70%" },
                { top: "23%", left: "25%" },
                { top: "23%", left: "50%" },
                { top: "23%", left: "75%" },
            ],
            "5-2-2": [
                { top: "92%", left: "50%" },
                { top: "72%", left: "10%" },
                { top: "72%", left: "30%" },
                { top: "72%", left: "50%" },
                { top: "72%", left: "70%" },
                { top: "72%", left: "90%" },
                { top: "51%", left: "35%" },
                { top: "51%", left: "65%" },
                { top: "23%", left: "35%" },
                { top: "23%", left: "65%" },
            ],
            "5-3-1": [
                { top: "92%", left: "50%" },
                { top: "72%", left: "10%" },
                { top: "72%", left: "30%" },
                { top: "72%", left: "50%" },
                { top: "72%", left: "70%" },
                { top: "72%", left: "90%" },
                { top: "51%", left: "25%" },
                { top: "51%", left: "50%" },
                { top: "51%", left: "75%" },
                { top: "23%", left: "50%" },
            ],
            "3-4-2": [
                { top: "92%", left: "50%" },
                { top: "72%", left: "20%" },
                { top: "72%", left: "50%" },
                { top: "72%", left: "80%" },
                { top: "51%", left: "15%" },
                { top: "51%", left: "38%" },
                { top: "51%", left: "62%" },
                { top: "51%", left: "85%" },
                { top: "23%", left: "35%" },
                { top: "23%", left: "65%" },
            ],
            "3-5-1": [
                { top: "92%", left: "50%" },
                { top: "72%", left: "20%" },
                { top: "72%", left: "50%" },
                { top: "72%", left: "80%" },
                { top: "51%", left: "10%" },
                { top: "51%", left: "30%" },
                { top: "51%", left: "50%" },
                { top: "51%", left: "70%" },
                { top: "51%", left: "90%" },
                { top: "23%", left: "50%" },
            ],
            "3-2-4": [
                { top: "92%", left: "50%" },
                { top: "72%", left: "20%" },
                { top: "72%", left: "50%" },
                { top: "72%", left: "80%" },
                { top: "51%", left: "30%" },
                { top: "51%", left: "70%" },
                { top: "23%", left: "15%" },
                { top: "23%", left: "38%" },
                { top: "23%", left: "62%" },
                { top: "23%", left: "85%" },
            ],
        };
        const layout = layouts[formation] || layouts["3-3-3"];
        return layout[idx] || { top: "50%", left: "50%" };
    }

    return (
        <div className="relative bg-gradient-to-b from-green-600 to-green-800 rounded-2xl min-h-[500px] md:min-h-[650px] overflow-visible shadow-2xl border-2 border-green-900" style={{ paddingBottom: "48px" }}>
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute border-4 border-white rounded-2xl w-[96%] h-[96%] left-[2%] top-[2%]" />
                <div className="absolute left-1/2 top-[50%] -translate-x-1/2 -translate-y-1/2 border-2 border-white rounded-full w-24 h-24" />
                <div className="absolute left-0 top-1/2 w-full h-0.5 bg-white opacity-80" />
                <div className="absolute left-1/2 bottom-0 -translate-x-1/2 border-2 border-white w-[40%] h-[16%] rounded-b-lg" style={{ borderTop: "none" }} />
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
                            onDragOver={e => {
                                e.preventDefault();
                                if (window.__draggedPlayer && player) {
                                    setCompareHover({
                                        draggedPlayer: window.__draggedPlayer,
                                        targetPlayer: player,
                                        slotPos: pos
                                    });
                                } else {
                                    setCompareHover(null);
                                }
                            }}
                            onDragLeave={e => setCompareHover(null)}
                            onDrop={e => {
                                setCompareHover(null);
                                const data = JSON.parse(e.dataTransfer.getData("application/json"));
                                if (!data.player) return;
                                if (!isPositionCompatible(pos, data.player.position)) return;

                                let sourcePos;
                                if (data.fromTeam === id) {
                                    sourcePos = formationPositions[data.fromIndex];
                                } else {
                                    sourcePos = otherFormationPositions[data.fromIndex];
                                }

                                if (player && typeof data.fromIndex === "number" && (data.fromTeam !== id || data.fromIndex !== i)) {
                                    const playerForSlot = getPlayerWithPositionAttributes(data.player, pos);
                                    const swapWith = getPlayerWithPositionAttributes(player, sourcePos);

                                    onPlayerDrop({
                                        toTeam: id,
                                        toIndex: i,
                                        fromTeam: data.fromTeam,
                                        fromIndex: data.fromIndex,
                                        player: playerForSlot,
                                        swapWith,
                                    });
                                } else {
                                    const playerForSlot = getPlayerWithPositionAttributes(data.player, pos);
                                    onPlayerDrop({
                                        toTeam: id,
                                        toIndex: i,
                                        fromTeam: data.fromTeam,
                                        fromIndex: data.fromIndex,
                                        player: playerForSlot,
                                    });
                                }
                            }}
                            onClick={e => {
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
                            onDoubleClick={e => {
                                e.stopPropagation();
                                if (!player) setGlobalActiveSlot(null);
                            }}
                        >
                            {player ? (
                                <div
                                    onClick={e => {
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
                                        <DraggablePlayer
                                            player={player}
                                            fromTeam={id}
                                            fromIndex={i}
                                            small
                                            assigned
                                            onDragStart={handleDragStart}
                                            onDragEnd={handleDragEnd}
                                        />
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

    const imageUrl = player.photo ? player.photo : PLACEHOLDER_IMG;
    const cardBg = getCardBgByOverall(player.overall);
    const cardHighlight = getCardHighlight({ assigned, selected });

    return (
        <Card
            ref={dragRef}
            className={
                [
                    cardBg,
                    "border cursor-move space-y-1 transition-all duration-150",
                    (small ? "p-1 text-xs min-h-0" : "p-4 text-sm"),
                    "rounded-xl shadow",
                    cardHighlight
                ].join(" ")
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
            <div className="flex justify-center mb-2">
                <img
                    src={imageUrl}
                    alt={player.name}
                    className={small ? "w-10 h-10 rounded-full object-cover border" : "w-16 h-16 rounded-full object-cover border"}
                    style={{ background: "#eee" }}
                    loading="lazy"
                />
            </div>
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

function getNextWednesday() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilNextWednesday = (3 - dayOfWeek + 7) % 7 || 7;
    const nextWednesday = new Date(today);
    nextWednesday.setDate(today.getDate() + daysUntilNextWednesday);
    const dd = String(nextWednesday.getDate()).padStart(2, '0');
    const mm = String(nextWednesday.getMonth() + 1).padStart(2, '0');
    const yyyy = nextWednesday.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

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
            <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
                <div className="flex flex-col items-center gap-4 sm:gap-8 w-full">
                    <div className="w-full max-w-md">
                        <div
                            className="bg-green-100 border-2 border-green-300 rounded-xl shadow p-3 sm:p-6 flex flex-col items-center cursor-pointer hover:shadow-lg active:scale-[0.98] transition min-h-[120px]"
                            onClick={() => goTo("lineup")}
                            tabIndex={0}
                            role="button"
                            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") goTo("lineup"); }}
                            aria-label="Go to Lineup Creator"
                        >
                            <span className="text-xl sm:text-3xl mb-1 sm:mb-2">⚽</span>
                            <h3 className="text-base sm:text-xl font-bold mb-1 text-green-900 text-center">Lineup Creator</h3>
                            <p className="text-gray-700 text-center text-xs sm:text-base mb-2">
                                Build and compare two football teams. Drag and drop players, see team averages, and compare lineups visually.
                            </p>
                            <span className="text-blue-700 font-semibold underline text-xs sm:text-sm mt-1">
                                Go to Lineup Creator
                            </span>
                        </div>
                    </div>
                    <div className="w-full max-w-md">
                        <div
                            className="bg-blue-100 border-2 border-blue-300 rounded-xl shadow p-3 sm:p-6 flex flex-col items-center cursor-pointer hover:shadow-lg active:scale-[0.98] transition min-h-[120px]"
                            onClick={() => goTo("database")}
                            tabIndex={0}
                            role="button"
                            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") goTo("database"); }}
                            aria-label="Go to Player Database"
                        >
                            <span className="text-xl sm:text-3xl mb-1 sm:mb-2">📋</span>
                            <h3 className="text-base sm:text-xl font-bold mb-1 text-blue-900 text-center">Player Database</h3>
                            <p className="text-gray-700 text-center text-xs sm:text-base mb-2">
                                Browse all players, filter and sort, and compare up to 3 players on a radar chart.
                            </p>
                            <span className="text-blue-700 font-semibold underline text-xs sm:text-sm mt-1">
                                Go to Player Database
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-center justify-center w-full">
                    <div className="w-full max-w-md">
                        <div className="relative mb-4 sm:mb-8 mt-4 sm:mt-6">
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-10">
                                <span className="bg-yellow-400 text-yellow-900 px-3 sm:px-4 py-1 rounded-full font-bold shadow text-xs sm:text-base border-2 border-yellow-300 animate-pulse">
                                    NDESHJA E RADHËS
                                </span>
                            </div>
                            <table className="w-full shadow-2xl rounded-2xl overflow-hidden border-4 border-yellow-300 bg-yellow-50/80">
                                <tbody>
                                    <tr>
                                        <td className="p-3 sm:p-8 text-center font-bold text-yellow-900 text-sm sm:text-lg tracking-wide">
                                            Ndeshja e radhës do të luhet të mërkurën e ardhshme<br />
                                            në datë <span className="text-blue-700 underline">{getNextWednesday()}</span><br />
                                            në orën <span className="text-blue-700 underline">20:30</span><br />
                                            <span className="block mt-2 text-sm sm:text-base font-semibold text-yellow-800">
                                                Lokacioni: <span className="text-blue-700 underline">Laprake</span>
                                            </span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col gap-4 sm:gap-8 items-center w-full">
                    <div className="w-full max-w-md">
                        <h2 className="text-base sm:text-xl font-semibold mb-2 text-center">MOTM Last Winners</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs sm:text-sm shadow-md rounded-lg overflow-hidden">
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
                        </div>
                        {data.length > 3 && (
                            <div className="mt-2 text-center">
                                <button className="text-blue-600 underline hover:text-blue-800 text-xs" onClick={() => setShowAll(!showAll)}>
                                    {showAll ? 'Show Less' : 'Show All'}
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="w-full max-w-md">
                        <h2 className="text-base sm:text-xl font-semibold mb-2 text-center">MOTM Top Earners</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs sm:text-sm shadow-md rounded-lg overflow-hidden">
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
                        </div>
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
            <style>{`
                @media (max-width: 640px) {
                    .grid-cols-1.lg\\:grid-cols-3 {
                        display: flex !important;
                        flex-direction: column !important;
                        gap: 1rem !important;
                    }
                    .max-w-md {
                        max-width: 100vw !important;
                    }
                }
            `}</style>
        </div>
    );
}

function PlayerDatabase() {
    const [players, setPlayers] = useState([]);
    const [search, setSearch] = useState("");
    const [positionFilter, setPositionFilter] = useState("All");
    const [sortBy, setSortBy] = useState("overall");
    const [selected, setSelected] = useState([]);
    const [topEarners, setTopEarners] = useState([]);
    const [viewMode, setViewMode] = useState("big");
    const [modalPlayer, setModalPlayer] = useState(null);
    const [addCompareModalOpen, setAddCompareModalOpen] = useState(false);

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
                        photo: extractPhotoUrl(cells[12]?.v) || null,
                    };
                    player.overall = calculateOverall(player);
                    return player;
                });
                setPlayers(rows);
            });
    }, []);

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
            if (prev.length >= 5) {
                return [...prev.slice(1), player];
            }
            return [...prev, player];
        });
    }

    function removeFromCompare(name) {
        setSelected((prev) => prev.filter((p) => p.name !== name));
    }

    function PlayerModal({ player, onClose }) {
        if (!player) return null;
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className="bg-white rounded-xl shadow-2xl border p-6 max-w-xs w-full relative">
                    <button
                        className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-lg font-bold"
                        onClick={onClose}
                        aria-label="Close"
                        type="button"
                    >×</button>
                    <div className="font-bold text-xl mb-1 text-center">{player.name}</div>
                    <div className="text-center text-sm text-gray-500 mb-2">{player.position}</div>
                    <div className="flex justify-center mb-2">
                        <img
                            src={player.photo ? player.photo : PLACEHOLDER_IMG}
                            alt={player.name}
                            className="w-24 h-24 rounded-full object-cover border"
                            style={{ background: "#eee" }}
                            loading="lazy"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-2">
                        <span>Speed: {player.speed}</span>
                        <span>Shooting: {player.shooting}</span>
                        <span>Passing: {player.passing}</span>
                        <span>Dribbling: {player.dribbling}</span>
                        <span>Physical: {player.physical}</span>
                        <span>Defending: {player.defending}</span>
                        <span>Weak Foot: {player.weakFoot}</span>
                        <span>Goalkeeping: {player.goalkeeping}</span>
                    </div>
                    <div className="text-base font-bold text-center">Overall: {player.overall}</div>
                </div>
            </div>
        );
    }

    function AddPlayerToCompareModal({ open, onClose, players, alreadySelected, onSelect }) {
        const [search, setSearch] = useState("");
        if (!open) return null;
        const filtered = players
            .filter(p => !alreadySelected.some(sel => sel.name === p.name))
            .filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                <div className="bg-white rounded-xl shadow-xl border p-4 max-w-xs w-full relative">
                    <button
                        className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-lg font-bold"
                        onClick={onClose}
                        aria-label="Close"
                        type="button"
                    >×</button>
                    <div className="mb-2 text-base font-semibold text-center text-green-900">
                        Add Player to Comparison
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
                                    onClick={() => { onSelect(p); onClose(); }}
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

    function TopEarnersCompare({ selected }) {
        if (!selected.length) return null;
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

    function RadarCompare({ players }) {
        if (players.length < 2) return null;

        const allOutfield = players.every(p => p.position !== "GK");
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

        const colors = [
            "#3b82f6",
            "#ef4444",
            "#f59e42",
            "#10b981",
            "#a21caf"
        ];

        const size = 320;
        const center = size / 2;
        const radius = size / 2 - 40;
        const angleStep = (2 * Math.PI) / attrs.length;

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

        function pointsToString(points) {
            return points.map(([x, y]) => `${x},${y}`).join(" ");
        }

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
                <div className="flex justify-center gap-4 mt-2 mb-2">
                    {legend}
                    {players.length < 5 && (
                        <button
                            className="ml-2 px-3 py-1 rounded bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 transition"
                            onClick={() => setAddCompareModalOpen(true)}
                            type="button"
                        >
                            + Add Player
                        </button>
                    )}
                </div>
                <div className="flex flex-col md:flex-row gap-6 justify-center items-start">
                    <div>
                        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                            {grid}
                            {axes}
                            {polygons}
                            {dots}
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
            <div className="flex items-center gap-2 mb-4">
                <span className="text-xs text-gray-600">View:</span>
                <select
                    className="block sm:hidden border p-1 rounded text-xs bg-white/90 shadow"
                    value={viewMode}
                    onChange={e => setViewMode(e.target.value)}
                    aria-label="Select view mode"
                >
                    <option value="list">List</option>
                    <option value="small">Card</option>
                    <option value="big">Attributes</option>
                </select>
                <div className="hidden sm:flex items-center gap-1">
                    <button
                        className={`px-2 py-1 rounded text-xs font-semibold border transition ${viewMode === "list" ? "bg-blue-500 text-white border-blue-500" : "bg-white hover:bg-blue-100 border-gray-300"}`}
                        onClick={() => setViewMode("list")}
                        type="button"
                        aria-label="List view"
                    >
                        <span role="img" aria-label="List">List</span>
                    </button>
                    <button
                        className={`px-2 py-1 rounded text-xs font-semibold border transition ${viewMode === "small" ? "bg-blue-500 text-white border-blue-500" : "bg-white hover:bg-blue-100 border-gray-300"}`}
                        onClick={() => setViewMode("small")}
                        type="button"
                        aria-label="Small cards"
                    >
                        <span role="img" aria-label="Small cards">Card</span>
                    </button>
                    <button
                        className={`px-2 py-1 rounded text-xs font-semibold border transition ${viewMode === "big" ? "bg-blue-500 text-white border-blue-500" : "bg-white hover:bg-blue-100 border-gray-300"}`}
                        onClick={() => setViewMode("big")}
                        type="button"
                        aria-label="Big cards"
                    >
                        <span role="img" aria-label="Big cards">Attributes</span>
                    </button>
                </div>
            </div>
            {selected.length >= 2 && (
                <div className="mb-4">
                    <RadarCompare players={selected} />
                </div>
            )}
            <AddPlayerToCompareModal
                open={addCompareModalOpen}
                onClose={() => setAddCompareModalOpen(false)}
                players={players}
                alreadySelected={selected}
                onSelect={p => toggleSelect(p)}
            />
            {viewMode === "list" ? (
                <div
                    className="bg-white rounded-xl border shadow divide-y"
                    style={{ minHeight: 200 }}
                >
                    {filtered.map((p) => (
                        <div
                            key={p.name}
                            className={`flex items-center px-4 py-3 cursor-pointer hover:bg-blue-50 ${selected.some(sel => sel.name === p.name) ? "bg-blue-100" : ""}`}
                            onClick={() => toggleSelect(p)}
                        >
                            <span
                                className="font-semibold text-base truncate text-blue-700 underline flex-1"
                                style={{ cursor: "pointer" }}
                                onClick={e => { e.stopPropagation(); setModalPlayer(p); }}
                            >
                                {p.name}
                            </span>
                            {selected.some(sel => sel.name === p.name) && (
                                <span className="ml-2 text-xs text-blue-700 font-semibold">Selected</span>
                            )}
                        </div>
                    ))}
                    <PlayerModal player={modalPlayer} onClose={() => setModalPlayer(null)} />
                </div>
            ) : (
                <div
                    className={`grid grid-cols-1 ${viewMode === "small" ? "sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6" : "sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"} gap-3`}
                    style={{ minHeight: 200 }}
                >
                    {filtered.map((p) => {
                        const cardBg = getCardBgByOverall(p.overall);
                        const isSelected = selected.some(sel => sel.name === p.name);
                        const cardHighlight = getCardHighlight({ assigned: false, selected: isSelected });
                        return (
                            <div
                                key={p.name}
                                className={[
                                    cardBg,
                                    "border rounded-xl shadow p-4 cursor-pointer transition-all duration-150",
                                    isSelected ? "hover:bg-blue-50" : "hover:bg-blue-50",
                                    cardHighlight
                                ].join(" ")}
                                onClick={e => { e.stopPropagation(); toggleSelect(p); }}
                            >
                                <div className="flex justify-center mb-2">
                                    <img
                                        src={p.photo ? p.photo : PLACEHOLDER_IMG}
                                        alt={p.name}
                                        className={viewMode === "small" ? "w-12 h-12 rounded-full object-cover border" : "w-20 h-20 rounded-full object-cover border"}
                                        style={{ background: "#eee" }}
                                        loading="lazy"
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="font-semibold text-base truncate">{p.name}</div>
                                    {isSelected && (
                                        <button
                                            className="ml-2 px-2 py-0.5 rounded bg-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-300"
                                            onClick={e => { e.stopPropagation(); removeFromCompare(p.name); }}
                                            title="Remove from comparison"
                                        >×</button>
                                    )}
                                </div>
                                <div className="text-xs text-muted-foreground mb-2">{p.position}</div>
                                {viewMode === "big" && (
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
                                )}
                                <div className="text-sm font-bold">Overall: {p.overall}</div>
                                {isSelected && (
                                    <div className="text-xs text-blue-700 font-semibold mt-1">Selected</div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default function App() {
    const [view, setView] = useState("home");
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

    useEffect(() => {
        setMobileMenuOpen(false);
    }, [view]);

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
                    backdropFilter: scrolled ? "blur(4px)" : undefined,
                }}
            >
                <nav className="container mx-auto flex justify-between items-center transition-all duration-300 relative">
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
                    <div className="hidden sm:flex gap-4 text-lg">
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
                        <button
                            className={`hover:underline ${view === "motm" ? "font-bold text-blue-700" : ""}`}
                            onClick={() => setView("motm")}
                        >
                            MOTM
                        </button>
                    </div>
                    <div className="sm:hidden flex items-center">
                        <button
                            className="p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onClick={() => setMobileMenuOpen((v) => !v)}
                            aria-label="Open menu"
                        >
                            <svg
                                className="w-7 h-7 text-blue-700"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        {mobileMenuOpen && (
                            <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-50 flex flex-col animate-fade-in">
                                <button
                                    className={`text-left px-4 py-3 hover:bg-blue-50 border-b ${view === "home" ? "font-bold text-blue-700" : ""}`}
                                    onClick={() => setView("home")}
                                >
                                    Home
                                </button>
                                <button
                                    className={`text-left px-4 py-3 hover:bg-blue-50 border-b ${view === "lineup" ? "font-bold text-blue-700" : ""}`}
                                    onClick={() => setView("lineup")}
                                >
                                    Lineup Creator
                                </button>
                                <button
                                    className={`text-left px-4 py-3 hover:bg-blue-50 border-b ${view === "database" ? "font-bold text-blue-700" : ""}`}
                                    onClick={() => setView("database")}
                                >
                                    Player Database
                                </button>
                                <button
                                    className={`text-left px-4 py-3 hover:bg-blue-50 ${view === "motm" ? "font-bold text-blue-700" : ""}`}
                                    onClick={() => setView("motm")}
                                >
                                    MOTM
                                </button>
                            </div>
                        )}
                    </div>
                </nav>
            </header>
            <main className="container mx-auto p-4">
                {view === "home" && <Home />}
                {view === "lineup" && <LineupCreator />}
                {view === "database" && <PlayerDatabase />}
                {view === "motm" && <MOTMPage />}
            </main>
        </div>
    );
}

function LineupCreator() {
    const [formationA, setFormationA] = useState("3-3-3");
    const [formationB, setFormationB] = useState("3-3-3");
    const [players, setPlayers] = useState([]);
    const [teamA, setTeamA] = useState(Array(10).fill(null));
    const [teamB, setTeamB] = useState(Array(10).fill(null));
    const [showComparison, setShowComparison] = useState(false);

    const [globalActiveSlot, setGlobalActiveSlot] = useState(null);

    const [playerSelectModal, setPlayerSelectModal] = useState({ open: false });

    const [compareHover, setCompareHover] = useState(null);

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
                        photo: extractPhotoUrl(cells[12]?.v) || null,
                    };
                    player.overall = calculateOverall(player);
                    return player;
                });
                setPlayers(rows);
            });
    }, []);

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
        } else if (
            swapWith &&
            typeof fromIndex === "number" &&
            fromTeam &&
            toTeam &&
            fromTeam !== toTeam
        ) {
            if (toTeam === "teamA" && fromTeam === "teamB") {
                newTeamA[toIndex] = player;
                newTeamB[fromIndex] = swapWith;
            } else if (toTeam === "teamB" && fromTeam === "teamA") {
                newTeamB[toIndex] = player;
                newTeamA[fromIndex] = swapWith;
            }
        } else if (
            swapWith &&
            fromTeam === toTeam &&
            typeof fromIndex === "number"
        ) {
            if (toTeam === "teamA") {
                newTeamA[toIndex] = player;
                newTeamA[fromIndex] = swapWith;
            }
            if (toTeam === "teamB") {
                newTeamB[toIndex] = player;
                newTeamB[fromIndex] = swapWith;
            }
        } else {
            if (fromTeam === "teamA" && typeof fromIndex === "number") newTeamA[fromIndex] = null;
            if (fromTeam === "teamB" && typeof fromIndex === "number") newTeamB[fromIndex] = null;

            if (toTeam === "teamA") {
                newTeamA = newTeamA.map((p, idx) =>
                    p && p.name === player.name && idx !== toIndex ? null : p
                );
                newTeamA[toIndex] = player;
            }
            if (toTeam === "teamB") {
                newTeamB = newTeamB.map((p, idx) =>
                    p && p.name === player.name && idx !== toIndex ? null : p
                );
                newTeamB[toIndex] = player;
            }
        }

        setTeamA(newTeamA);
        setTeamB(newTeamB);
    };

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

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } })
    );

    const [activeDrag, setActiveDrag] = useState(null);

    const handleDragStart = (player, fromTeam, fromIndex) => {
        setActiveDrag({ player, fromTeam, fromIndex });
        window.__draggedPlayer = player;
    };
    const handleDragEnd = () => {
        setActiveDrag(null);
        window.__draggedPlayer = null;
        setCompareHover(null);
    };

    return (
        <div className="p-4 max-w-7xl mx-auto" ref={mainRef}>
            <h1 className="text-4xl font-extrabold mb-6 text-center text-green-900 drop-shadow">Lineup Creator A</h1>

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
                    otherFormationPositions={formationMap[formationB]}
                    setCompareHover={setCompareHover}
                    handleDragStart={handleDragStart}
                    handleDragEnd={handleDragEnd}
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
                    otherFormationPositions={formationMap[formationA]}
                    setCompareHover={setCompareHover}
                    handleDragStart={handleDragStart}
                    handleDragEnd={handleDragEnd}
                />
            </div>

            {compareHover && compareHover.draggedPlayer && compareHover.targetPlayer && (
                <PlayerAttributeCompareTable
                    playerA={compareHover.draggedPlayer}
                    playerB={compareHover.targetPlayer}
                    onClose={() => setCompareHover(null)}
                />
            )}

            <DndContext
                collisionDetection={closestCenter}
                sensors={sensors}
            >
                <DragOverlay>
                    {activeDrag ? (
                        <DraggablePlayer
                            player={activeDrag.player}
                            fromTeam={activeDrag.fromTeam}
                            fromIndex={activeDrag.fromIndex}
                            small={false}
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
            </DndContext>
        </div>
    );
}

function PlayerAttributeCompareTable({ playerA, playerB, onClose }) {
    if (!playerA || !playerB) return null;
    const attrs = [
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
    return (
        <div className="fixed left-1/2 top-24 z-50 -translate-x-1/2 bg-white rounded-xl shadow-xl border p-4 min-w-[320px] max-w-xs">
            <button
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-lg font-bold"
                onClick={onClose}
                aria-label="Close"
                type="button"
            >×</button>
            <div className="font-bold text-center mb-2 text-blue-900">Attribute Comparison</div>
            <table className="w-full text-xs">
                <thead>
                    <tr>
                        <th className="p-1 text-right">{playerA.name}</th>
                        <th className="p-1 text-center"></th>
                        <th className="p-1 text-left">{playerB.name}</th>
                    </tr>
                </thead>
                <tbody>
                    {attrs.map(attr => (
                        <tr key={attr.key}>
                            <td className="p-1 text-right font-semibold">{playerA[attr.key]}</td>
                            <td className="p-1 text-center text-gray-500">{attr.label}</td>
                            <td className="p-1 text-left font-semibold">{playerB[attr.key]}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function MOTMPage() {
    const [data, setData] = React.useState([]);
    const [topEarners, setTopEarners] = React.useState([]);
    const [showAll, setShowAll] = React.useState(false);
    const [showAllEarners, setShowAllEarners] = React.useState(false);
    const [loading, setLoading] = React.useState(true);

    const formatDate = (input) => {
        const date = new Date(input);
        if (isNaN(date)) return input;
        return date.toLocaleDateString('en-GB');
    };

    React.useEffect(() => {
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

    const visibleData = showAll ? data : data.slice(0, 10);
    const visibleEarners = showAllEarners ? topEarners : topEarners.slice(0, 10);

    if (loading) return <LoadingSpinner />;

    return (
        <div className="w-full flex flex-col items-center">
            <h1 className="text-3xl font-bold mb-6 text-center text-blue-900">Man of the Match (MOTM)</h1>
            <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Last Winners Table */}
                <div>
                    <h2 className="text-xl font-semibold mb-2 text-center">MOTM Last Winners</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs sm:text-sm shadow-md rounded-lg overflow-hidden">
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
                    </div>
                    {data.length > 10 && (
                        <div className="mt-2 text-center">
                            <button className="text-blue-600 underline hover:text-blue-800 text-xs" onClick={() => setShowAll(!showAll)}>
                                {showAll ? 'Show Less' : 'Show All'}
                            </button>
                        </div>
                    )}
                </div>
                {/* Top Earners Table */}
                <div>
                    <h2 className="text-xl font-semibold mb-2 text-center">MOTM Top Earners</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs sm:text-sm shadow-md rounded-lg overflow-hidden">
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
                    </div>
                    {topEarners.length > 10 && (
                        <div className="mt-2 text-center">
                            <button className="text-blue-600 underline hover:text-blue-800 text-xs" onClick={() => setShowAllEarners(!showAllEarners)}>
                                {showAllEarners ? 'Show Less' : 'Show All'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}   
