import React, { useEffect, useState, useRef, useMemo } from "react";
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
    // 6v6 (6 players: GK + 5)
    "2-2-1": ["GK", "DF", "DF", "MF", "MF", "ST"],
    "1-3-1": ["GK", "DF", "MF", "MF", "MF", "ST"],
    "2-1-2": ["GK", "DF", "DF", "MF", "ST", "ST"],

    // 9v9 (9 players: GK + 8)
    "4-3-1": ["GK", "DF", "DF", "DF", "DF", "MF", "MF", "MF", "ST"],
    "3-4-1": ["GK", "DF", "DF", "DF", "MF", "MF", "MF", "MF", "ST"],
    "3-3-2": ["GK", "DF", "DF", "DF", "MF", "MF", "MF", "ST", "ST"],
    "4-2-2": ["GK", "DF", "DF", "DF", "DF", "MF", "MF", "ST", "ST"],
    "2-3-3": ["GK", "DF", "DF", "MF", "MF", "MF", "ST", "ST", "ST"],
    "3-2-3": ["GK", "DF", "DF", "DF", "MF", "MF", "ST", "ST", "ST"],
    "2-4-2": ["GK", "DF", "DF", "MF", "MF", "MF", "MF", "ST", "ST"],

    // 10v10 (10 players: GK + 9)
    "4-3-2": ["GK", "DF", "DF", "DF", "DF", "MF", "MF", "MF", "ST", "ST"],
    "3-4-2": ["GK", "DF", "DF", "DF", "MF", "MF", "MF", "MF", "ST", "ST"],
    "3-3-3": ["GK", "DF", "DF", "DF", "MF", "MF", "MF", "ST", "ST", "ST"],
    "4-2-3": ["GK", "DF", "DF", "DF", "DF", "MF", "MF", "ST", "ST", "ST"],
    "5-2-2": ["GK", "DF", "DF", "DF", "DF", "DF", "MF", "MF", "ST", "ST"],
    "5-3-1": ["GK", "DF", "DF", "DF", "DF", "DF", "MF", "MF", "MF", "ST"],

    // 11v11 (11 players: GK + 10)
    "4-4-2": ["GK", "DF", "DF", "DF", "DF", "MF", "MF", "MF", "MF", "ST", "ST"],
    "4-3-3": ["GK", "DF", "DF", "DF", "DF", "MF", "MF", "MF", "ST", "ST", "ST"],
    "3-5-2": ["GK", "DF", "DF", "DF", "MF", "MF", "MF", "MF", "MF", "ST", "ST"],
    "3-4-3": ["GK", "DF", "DF", "DF", "MF", "MF", "MF", "MF", "ST", "ST", "ST"],
    "5-4-1": ["GK", "DF", "DF", "DF", "DF", "DF", "MF", "MF", "MF", "MF", "ST"],
    "4-5-1": ["GK", "DF", "DF", "DF", "DF", "MF", "MF", "MF", "MF", "MF", "ST"],
    "5-3-2": ["GK", "DF", "DF", "DF", "DF", "DF", "MF", "MF", "MF", "ST", "ST"],
};
const FORMATIONS_BY_COUNT = {
    "6v6": ["2-2-1", "1-3-1", "2-1-2"],
    "9v9": ["4-3-1", "3-4-1", "3-3-2", "4-2-2", "2-3-3", "3-2-3", "2-4-2"],
    "10v10": ["4-3-2", "3-4-2", "3-3-3", "4-2-3", "5-2-2", "5-3-1"],
    "11v11": ["4-4-2", "4-3-3", "3-5-2", "3-4-3", "5-4-1", "4-5-1", "5-3-2"],
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
    if (!players || players.length === 0) return null;

    const allOutfield = players.every(p => p.position !== "GK");
    const attrs = allOutfield
        ? [
            { key: "speed", label: "Speed", max: 100 },
            { key: "shooting", label: "Shooting", max: 100 },
            { key: "passing", label: "Passing", max: 100 },
            { key: "dribbling", label: "Dribbling", max: 100 },
            { key: "physical", label: "Physical", max: 100 },
            { key: "defending", label: "Defending", max: 100 }
        ]
        : [
            { key: "speed", label: "Speed", max: 100 },
            { key: "shooting", label: "Shooting", max: 100 },
            { key: "passing", label: "Passing", max: 100 },
            { key: "dribbling", label: "Dribbling", max: 100 },
            { key: "physical", label: "Physical", max: 100 },
            { key: "defending", label: "Defending", max: 100 },
            { key: "goalkeeping", label: "Goalkeeping", max: 100 }
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
            const min = 35;
            const r = value <= min ? 0 : ((value - min) / (attr.max - min)) * radius;
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

            "4-3-1": [
                { top: "92%", left: "50%" },   // GK
                { top: "72%", left: "15%" },   // DF
                { top: "72%", left: "35%" },   // DF
                { top: "72%", left: "65%" },   // DF
                { top: "72%", left: "85%" },   // DF
                { top: "51%", left: "30%" },   // MF
                { top: "51%", left: "50%" },   // MF
                { top: "51%", left: "70%" },   // MF
                { top: "23%", left: "50%" },   // ST
            ],

            "3-4-1": [
                { top: "92%", left: "50%" },   // GK
                { top: "72%", left: "25%" },   // DF
                { top: "72%", left: "50%" },   // DF
                { top: "72%", left: "75%" },   // DF
                { top: "51%", left: "20%" },   // MF
                { top: "51%", left: "40%" },   // MF
                { top: "51%", left: "60%" },   // MF
                { top: "51%", left: "80%" },   // MF
                { top: "23%", left: "50%" },   // ST
            ],

            "3-3-2": [
                { top: "92%", left: "50%" },   // GK
                { top: "72%", left: "20%" },   // DF
                { top: "72%", left: "50%" },   // DF
                { top: "72%", left: "80%" },   // DF
                { top: "51%", left: "25%" },   // MF
                { top: "51%", left: "50%" },   // MF
                { top: "51%", left: "75%" },   // MF
                { top: "23%", left: "35%" },   // ST
                { top: "23%", left: "65%" },   // ST
            ],
            "4-2-2": [
                { top: "92%", left: "50%" },   // GK
                { top: "72%", left: "15%" },   // DF
                { top: "72%", left: "35%" },   // DF
                { top: "72%", left: "65%" },   // DF
                { top: "72%", left: "85%" },   // DF
                { top: "51%", left: "35%" },   // MF
                { top: "51%", left: "65%" },   // MF
                { top: "23%", left: "35%" },   // ST
                { top: "23%", left: "65%" },   // ST
            ],
            "2-3-3": [
                { top: "92%", left: "50%" },   // GK
                { top: "72%", left: "35%" },   // DF
                { top: "72%", left: "65%" },   // DF
                { top: "51%", left: "20%" },   // MF
                { top: "51%", left: "50%" },   // MF
                { top: "51%", left: "80%" },   // MF
                { top: "23%", left: "20%" },   // ST
                { top: "23%", left: "50%" },   // ST
                { top: "23%", left: "80%" },   // ST
            ],
            "3-2-3": [
                { top: "92%", left: "50%" },   // GK
                { top: "72%", left: "20%" },   // DF
                { top: "72%", left: "50%" },   // DF
                { top: "72%", left: "80%" },   // DF
                { top: "51%", left: "35%" },   // MF
                { top: "51%", left: "65%" },   // MF
                { top: "23%", left: "20%" },   // ST
                { top: "23%", left: "50%" },   // ST
                { top: "23%", left: "80%" },   // ST
            ],
            "2-4-2": [
                { top: "92%", left: "50%" },   // GK
                { top: "72%", left: "35%" },   // DF
                { top: "72%", left: "65%" },   // DF
                { top: "51%", left: "15%" },   // MF
                { top: "51%", left: "35%" },   // MF
                { top: "51%", left: "65%" },   // MF
                { top: "51%", left: "85%" },   // MF
                { top: "23%", left: "35%" },   // ST
                { top: "23%", left: "65%" },   // ST
            ],
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
            "2-2-1": [
                { top: "92%", left: "50%" },
                { top: "72%", left: "30%" },
                { top: "72%", left: "70%" },
                { top: "51%", left: "30%" },
                { top: "51%", left: "70%" },
                { top: "23%", left: "50%" },
            ],
            "1-3-1": [
                { top: "92%", left: "50%" },
                { top: "72%", left: "50%" },
                { top: "51%", left: "20%" },
                { top: "51%", left: "50%" },
                { top: "51%", left: "80%" },
                { top: "23%", left: "50%" },
            ],
            "2-1-2": [
                { top: "92%", left: "50%" },
                { top: "72%", left: "30%" },
                { top: "72%", left: "70%" },
                { top: "51%", left: "50%" },
                { top: "23%", left: "30%" },
                { top: "23%", left: "70%" },
            ],
            "4-4-2": [
                { top: "95%", left: "50%" },   // GK
                { top: "75%", left: "15%" },   // LB
                { top: "75%", left: "35%" },   // CB
                { top: "75%", left: "65%" },   // CB
                { top: "75%", left: "85%" },   // RB
                { top: "50%", left: "15%" },   // LM
                { top: "55%", left: "40%" },   // CM
                { top: "55%", left: "60%" },   // CM
                { top: "50%", left: "85%" },   // RM
                { top: "25%", left: "35%" },   // ST
                { top: "25%", left: "65%" },   // ST
            ],
            "4-3-3": [
                { top: "95%", left: "50%" },   // GK
                { top: "75%", left: "15%" },   // LB
                { top: "75%", left: "35%" },   // CB
                { top: "75%", left: "65%" },   // CB
                { top: "75%", left: "85%" },   // RB
                { top: "50%", left: "30%" },   // LCM
                { top: "50%", left: "50%" },   // CM
                { top: "50%", left: "70%" },   // RCM
                { top: "30%", left: "20%" },   // LW
                { top: "25%", left: "50%" },   // ST
                { top: "30%", left: "80%" },   // RW
            ],
            "3-5-2": [
                { top: "95%", left: "50%" },   // GK
                { top: "75%", left: "20%" },   // CB
                { top: "75%", left: "50%" },   // CB
                { top: "75%", left: "80%" },   // CB
                { top: "45%", left: "10%" },   // LWB
                { top: "45%", left: "90%" },   // RWB
                { top: "55%", left: "30%" },   // LCM
                { top: "55%", left: "50%" },   // CM
                { top: "55%", left: "70%" },   // RCM
                { top: "20%", left: "40%" },   // ST
                { top: "20%", left: "60%" },   // ST
            ],
            "3-4-3": [
                { top: "95%", left: "50%" },   // GK
                { top: "75%", left: "20%" },   // CB
                { top: "75%", left: "50%" },   // CB
                { top: "75%", left: "80%" },   // CB
                { top: "50%", left: "10%" },   // LM
                { top: "50%", left: "90%" },   // RM
                { top: "55%", left: "60%" },   // CM
                { top: "55%", left: "40%" },   // CM
                { top: "30%", left: "20%" },   // ST
                { top: "30%", left: "80%" },   // RW
                { top: "20%", left: "50%" },   // CF
            ],
            "5-4-1": [
                { top: "95%", left: "50%" },   // GK
                { top: "75%", left: "10%" },   // LB
                { top: "75%", left: "30%" },   // CB
                { top: "75%", left: "50%" },   // CB
                { top: "75%", left: "70%" },   // CB
                { top: "75%", left: "90%" },   // RB
                { top: "55%", left: "25%" },   // LM
                { top: "55%", left: "50%" },   // CM
                { top: "55%", left: "75%" },   // RM
                { top: "33%", left: "50%" },   // CAM
                { top: "13%", left: "50%" },   // ST
            ],
            "4-5-1": [
                { top: "95%", left: "50%" },   // GK
                { top: "75%", left: "15%" },   // LB
                { top: "75%", left: "35%" },   // CB
                { top: "75%", left: "65%" },   // CB
                { top: "75%", left: "85%" },   // RB
                { top: "45%", left: "10%" },   // LM
                { top: "55%", left: "30%" },   // LCM
                { top: "55%", left: "70%" },   // RCM
                { top: "45%", left: "90%" },   // RM
                { top: "45%", left: "50%" },   // CAM
                { top: "20%", left: "50%" },   // ST
            ],
            "5-3-2": [
                { top: "95%", left: "50%" },   // GK
                { top: "75%", left: "10%" },   // LB
                { top: "75%", left: "30%" },   // CB
                { top: "75%", left: "50%" },   // CB
                { top: "75%", left: "70%" },   // CB
                { top: "75%", left: "90%" },   // RB
                { top: "50%", left: "30%" },   // LCM
                { top: "50%", left: "50%" },   // CM
                { top: "50%", left: "70%" },   // RCM
                { top: "20%", left: "40%" },   // ST
                { top: "20%", left: "60%" },   // ST
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
                <h3 className="font-bold text-lg text-white drop-shadow">{label} <span className="text-green-200">({players.filter(Boolean).length}/{players.length})</span></h3>
                <select
                    value={formation}
                    onChange={(e) => onFormationChange(e.target.value)}
                    className="border p-1 rounded text-sm bg-white/90 shadow"
                >
                    {FORMATIONS_BY_COUNT[
                        players.length === 11
                            ? "11v11"
                            : players.length === 10
                                ? "10v10"
                                : players.length === 9
                                    ? "9v9"
                                    : "6v6"
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

// Replace the DraggablePlayer component with this version for mobile minimalism

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
                    cardHighlight,
                    "draggable-player-card"
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
            {/* Minimal card for mobile: only name and OVR */}
            <div className="block sm:hidden text-center">
                <div className="font-semibold text-xs truncate">{player.name}</div>
                <div className="text-xs font-bold">OVR: {player.overall}</div>
            </div>
            {/* Full card for desktop */}
            <div className="hidden sm:block">
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
            </div>
            <style>{`
                @media (max-width: 640px) {
                    .draggable-player-card {
                        padding: 0.25rem !important;
                        min-width: 44px !important;
                        max-width: 70px !important;
                        min-height: 28px !important;
                        max-height: 40px !important;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        gap: 0.1rem;
                    }
                }
            `}</style>
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
    let daysUntilNextWednesday = (3 - dayOfWeek + 7) % 7;
    // If today is Wednesday, daysUntilNextWednesday will be 0
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

    const today = new Date();
    const todayStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    const nextWednesdayStr = getNextWednesday();
    const isMatchDay = todayStr === nextWednesdayStr;

    function goTo(view) {
        const event = new CustomEvent("setView", { detail: view });
        window.dispatchEvent(event);
    }

    function translateRankToAlbanian(rank) {
        const map = {
            1: "e parë",
            2: "e dytë",
            3: "e tretë",
            4: "e katërt",
            5: "e pestë",
            6: "e gjashtë",
            7: "e shtatë",
            8: "e tetë",
            9: "e nëntë",
            10: "e dhjetë"
        };
        return map[rank] || `e ${rank}-të`;
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
                    <div className="w-full max-w-md">
                        <div
                            className="bg-purple-100 border-2 border-purple-300 rounded-xl shadow p-3 sm:p-6 flex flex-col items-center cursor-pointer hover:shadow-lg active:scale-[0.98] transition min-h-[120px]"
                            onClick={() => goTo("gallery")}
                            tabIndex={0}
                            role="button"
                            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") goTo("gallery"); }}
                            aria-label="Go to Gallery"
                        >
                            <span className="text-xl sm:text-3xl mb-1 sm:mb-2">🖼️</span>
                            <h3 className="text-base sm:text-xl font-bold mb-1 text-purple-900 text-center">Gallery</h3>
                            <p className="text-gray-700 text-center text-xs sm:text-base mb-2">
                                Browse and view photos and videos from our football group events and matches.
                            </p>
                            <span className="text-blue-700 font-semibold underline text-xs sm:text-sm mt-1">
                                Go to Gallery
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
                                            në orën <span className="text-blue-700 underline">20:00</span><br />
                                            <span className="block mt-2 text-sm sm:text-base font-semibold text-yellow-800">
                                                Lokacioni: <span className="text-blue-700 underline">Laprake</span>
                                            </span>
                                            {isMatchDay && (
                                                <div className="mt-3 text-green-700 text-base font-bold animate-pulse">
                                                    Dita e ndeshjes, ne oren 20:00 ju presim!
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            <div className="w-full max-w-md">
                                <h2 className="text-base sm:text-xl font-semibold mb-2 text-center">  </h2>
                                {/* Last week's MOTM table */}
                                <table className="w-full shadow-xl rounded-2xl overflow-hidden border-4 border-blue-300 bg-blue-50/80 mb-4">
                                    <tbody>
                                        <tr>
                                            <td className="p-4 text-center font-bold text-blue-900 text-base sm:text-lg tracking-wide">
                                                {data.length > 0 ? (
                                                    <>
                                                        Njeriu i ndeshjes për ndeshjen e kaluar, luajtur ne date: <span className="text-blue-700 underline">{formatDate(data[0][Object.keys(data[0])[0]])}</span> është <br />
                                                        <span className="text-green-700 underline text-xl sm:text-2xl">
                                                            {data[0][Object.keys(data[0])[1]]}
                                                        </span>
                                                        <br />
                                                        <span className="text-gray-700 text-sm font-medium">
                                                            {(() => {
                                                                const playerName = data[0][Object.keys(data[0])[1]];
                                                                const earner = topEarners.find(e => e.Player === playerName);
                                                                return earner
                                                                    ? `Me këtë fitore ${playerName} shkon në ${earner.Awards} MOTM awards, dhe kalon në vendin ${translateRankToAlbanian(earner.Rank)}`
                                                                    : null;
                                                            })()}
                                                        </span>
                                                    </>
                                                ) : (
                                                    "Nuk ka të dhëna për MOTM."
                                                )}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
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
            const found = topEarners.find(
                e => e.Player && e.Player.trim().toLowerCase() === sel.name.trim().toLowerCase()
            );
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
        if (!players || players.length === 0) return null;

        const allOutfield = players.every(p => p.position !== "GK");
        const attrs = allOutfield
            ? [
                { key: "speed", label: "Speed", max: 100 },
                { key: "shooting", label: "Shooting", max: 100 },
                { key: "passing", label: "Passing", max: 100 },
                { key: "dribbling", label: "Dribbling", max: 100 },
                { key: "physical", label: "Physical", max: 100 },
                { key: "defending", label: "Defending", max: 100 }
            ]
            : [
                { key: "speed", label: "Speed", max: 100 },
                { key: "shooting", label: "Shooting", max: 100 },
                { key: "passing", label: "Passing", max: 100 },
                { key: "dribbling", label: "Dribbling", max: 100 },
                { key: "physical", label: "Physical", max: 100 },
                { key: "defending", label: "Defending", max: 100 },
                { key: "goalkeeping", label: "Goalkeeping", max: 100 }
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
                const min = 35;
                const r = value <= min ? 0 : ((value - min) / (attr.max - min)) * radius;
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
            {/* --- Search and Filter Buttons --- */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
                <Input
                    type="text"
                    placeholder="Search players..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-48"
                />
                {/* Mobile: Dropdown */}
                <select
                    className="block sm:hidden border rounded px-2 py-1 text-xs font-semibold"
                    value={positionFilter}
                    onChange={e => setPositionFilter(e.target.value)}
                >
                    {["All", "ST", "MF", "DF", "GK"].map(pos => (
                        <option key={pos} value={pos}>{pos}</option>
                    ))}
                </select>
                {/* Desktop: Buttons */}
                <div className="hidden sm:flex gap-1">
                    {["All", "ST", "MF", "DF", "GK"].map(pos => (
                        <button
                            key={pos}
                            className={`px-2 py-1 rounded text-xs font-semibold border transition ${positionFilter === pos
                                    ? "bg-blue-500 text-white border-blue-500"
                                    : "bg-white hover:bg-blue-100 border-gray-300"
                                }`}
                            onClick={() => setPositionFilter(pos)}
                            type="button"
                        >
                            {pos}
                        </button>
                    ))}
                </div>
            </div>
            {/* --- Existing view mode and player grid/list code follows --- */}
            {selected.length > 0 && (
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

// Utility to determine media type
function getMediaType(url) {
    if (!url) return "image";
    const ext = url.split('.').pop().toLowerCase().split(/\#|\?/)[0];
    if (["mp4", "webm", "ogg"].includes(ext)) return "video";
    if (ext === "gif") return "gif";
    return "image";
}

// --- Update GalleryImageModal component ---
function GalleryImageModal({ open, image, caption, onClose }) {
    if (!open) return null;
    const mediaType = getMediaType(image);
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
            onClick={onClose}
            tabIndex={-1}
        >
            <div
                className="relative bg-white rounded-xl shadow-2xl border p-2 max-w-3xl w-full flex flex-col items-center"
                style={{ outline: "none" }}
                onClick={e => e.stopPropagation()}
            >
                <button
                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl font-bold"
                    onClick={onClose}
                    aria-label="Close"
                    type="button"
                >×</button>
                {mediaType === "video" ? (
                    <video
                        src={image}
                        controls
                        className="rounded-lg object-contain w-full max-h-[70vh] bg-gray-100"
                        style={{ background: "#eee" }}
                    />
                ) : (
                    <img
                        src={image}
                        alt={caption || "Gallery image"}
                        className="rounded-lg object-contain w-full max-h-[70vh] bg-gray-100"
                        style={{ background: "#eee" }}
                    />
                )}
                {caption && (
                    <div className="text-base text-gray-700 text-center mt-3">{caption}</div>
                )}
            </div>
        </div>
    );
}

// --- Update GalleryThumbnail component ---
function GalleryThumbnail({ url, caption, onClick }) {
    const mediaType = getMediaType(url);
    const [hovered, setHovered] = useState(false);

    // For GIFs, you may want to use a static preview image if available.
    // Here, we just use the GIF itself for both states.
    const gifPreview = url;

    return (
        <div
            className="bg-white rounded-xl shadow border p-2 flex flex-col items-center cursor-pointer hover:shadow-lg transition"
            style={{
                width: 240,
                height: 180,
                position: "relative",
                overflow: "hidden",
                background: "#eee"
            }}
            onClick={onClick}
            tabIndex={0}
            onKeyDown={e => {
                if (e.key === "Enter" || e.key === " ") onClick();
            }}
            role="button"
            aria-label="View image"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {mediaType === "video" ? (
                <div className="w-full h-full flex items-center justify-center relative">
                    <video
                        src={url}
                        className="object-contain w-full h-full rounded-lg bg-gray-100"
                        style={{ background: "#eee" }}
                        preload="metadata"
                        muted
                        playsInline
                        controls={false}
                        ref={ref => {
                            if (ref) {
                                if (hovered) {
                                    ref.play();
                                } else {
                                    ref.pause();
                                    ref.currentTime = 0;
                                }
                            }
                        }}
                    />
                    {!hovered && (
                        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl text-white/80 pointer-events-none">
                            ▶
                        </span>
                    )}
                </div>
            ) : mediaType === "gif" ? (
                <img
                    src={hovered ? url : gifPreview}
                    alt={caption || "GIF"}
                    className="object-contain w-full h-full rounded-lg bg-gray-100"
                    style={{ background: "#eee" }}
                />
            ) : (
                <img
                    src={url}
                    alt={caption || "Gallery image"}
                    className="object-contain w-full h-full rounded-lg bg-gray-100"
                    style={{ background: "#eee" }}
                    loading="lazy"
                />
            )}
            {caption && (
                <div className="text-xs text-gray-700 text-center mt-1 w-full truncate">{caption}</div>
            )}
        </div>
    );
}

// --- Update GalleryPage component ---
function GalleryPage() {
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState({ open: false, image: null, caption: "" });
    const [page, setPage] = useState(1);

    const PAGE_SIZE = 9;
    const totalPages = Math.ceil(images.length / PAGE_SIZE);

    useEffect(() => {
        setLoading(true);
        const sheetUrl = 'https://docs.google.com/spreadsheets/d/12sjC6sz8z_ZNKwwQ_IuZc1bfpJr939NZFbB0B26tOIs/gviz/tq?tqx=out:csv';
        fetch(sheetUrl)
            .then(res => res.text())
            .then(csv => {
                Papa.parse(csv, {
                    header: true,
                    skipEmptyLines: true,
                    complete: results => {
                        const data = results.data
                            .map(row => ({
                                url: row["Image"] || row["URL"] || row[Object.keys(row)[0]],
                                caption: row["Caption"] || row["Description"] || ""
                            }))
                            .filter(row => row.url && row.url.startsWith("http"));
                        setImages(data);
                        setLoading(false);
                    }
                });
            })
            .catch(() => setLoading(false));
    }, []);

    // Close modal on Escape key
    useEffect(() => {
        if (!modal.open) return;
        function handleKey(e) {
            if (e.key === "Escape") setModal({ open: false, image: null, caption: "" });
        }
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [modal.open]);

    // Ensure page is valid if images change
    useEffect(() => {
        if (page > totalPages) setPage(totalPages || 1);
    }, [images, totalPages, page]);

    if (loading) return <LoadingSpinner />;

    if (!images.length) {
        return (
            <div className="w-full flex flex-col items-center">
                <h1 className="text-3xl font-bold mb-6 text-center text-blue-900">Gallery</h1>
                <div className="text-gray-500 text-center">No images found.</div>
            </div>
        );
    }

    const pagedImages = images.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    function PageSelector() {
        if (totalPages <= 1) return null;
        return (
            <div className="flex justify-center items-center gap-2 my-4">
                <button
                    className="px-2 py-1 rounded bg-gray-200 text-gray-700 font-semibold disabled:opacity-50"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    type="button"
                >
                    &lt; Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                    <button
                        key={i + 1}
                        className={`px-2 py-1 rounded font-semibold ${page === i + 1 ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-700"}`}
                        onClick={() => setPage(i + 1)}
                        type="button"
                    >
                        {i + 1}
                    </button>
                ))}
                <button
                    className="px-2 py-1 rounded bg-gray-200 text-gray-700 font-semibold disabled:opacity-50"
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                    type="button"
                >
                    Next &gt;
                </button>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col items-center">
            <h1 className="text-3xl font-bold mb-6 text-center text-blue-900">Gallery</h1>
            <PageSelector />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 w-full max-w-5xl">
                {pagedImages.map((img, idx) => (
                    <GalleryThumbnail
                        key={idx + (page - 1) * PAGE_SIZE}
                        url={img.url}
                        caption={img.caption}
                        onClick={() => setModal({ open: true, image: img.url, caption: img.caption })}
                    />
                ))}
            </div>
            <PageSelector />
            <GalleryImageModal
                open={modal.open}
                image={modal.image}
                caption={modal.caption}
                onClose={() => setModal({ open: false, image: null, caption: "" })}
            />
        </div>
    );
}
export default function App() {
    const [view, setView] = useState(() => {
        return localStorage.getItem("currentView") || "home";
    });    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        localStorage.setItem("currentView", view);
    }, [view]);

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
                        {/* --- Add Gallery nav button --- */}
                        <button
                            className={`hover:underline ${view === "gallery" ? "font-bold text-blue-700" : ""}`}
                            onClick={() => setView("gallery")}
                        >
                            Gallery
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
                                    className={`text-left px-4 py-3 hover:bg-blue-50 border-b ${view === "motm" ? "font-bold text-blue-700" : ""}`}
                                    onClick={() => setView("motm")}
                                >
                                    MOTM
                                </button>
                                {/* --- Add Gallery nav button (mobile) --- */}
                                <button
                                    className={`text-left px-4 py-3 hover:bg-blue-50 ${view === "gallery" ? "font-bold text-blue-700" : ""}`}
                                    onClick={() => setView("gallery")}
                                >
                                    Gallery
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
                {/* --- Add Gallery page route --- */}
                {view === "gallery" && <GalleryPage />}
            </main>
        </div>
    );
}

function LineupCreator() {
    const PLAYER_COUNTS = {
        "11v11": 11,
        "10v10": 10,
        "9v9": 9,
        "6v6": 6,
    };
    const DEFAULT_MODE = "11v11";

    const STORAGE_KEY = "lineupCreatorStateV1";

    function getInitialState() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
            if (saved) {
                return {
                    mode: saved.mode || DEFAULT_MODE,
                    formationA: saved.formationA || FORMATIONS_BY_COUNT[saved.mode || DEFAULT_MODE][0],
                    formationB: saved.formationB || FORMATIONS_BY_COUNT[saved.mode || DEFAULT_MODE][0],
                    teamA: Array.isArray(saved.teamA) ? saved.teamA : Array(PLAYER_COUNTS[saved.mode || DEFAULT_MODE]).fill(null),
                    teamB: Array.isArray(saved.teamB) ? saved.teamB : Array(PLAYER_COUNTS[saved.mode || DEFAULT_MODE]).fill(null),
                };
            }
        } catch { }
        return {
            mode: DEFAULT_MODE,
            formationA: FORMATIONS_BY_COUNT[DEFAULT_MODE][0],
            formationB: FORMATIONS_BY_COUNT[DEFAULT_MODE][0],
            teamA: Array(PLAYER_COUNTS[DEFAULT_MODE]).fill(null),
            teamB: Array(PLAYER_COUNTS[DEFAULT_MODE]).fill(null),
        };
    }

    const [players, setPlayers] = useState([]);
    const [showComparison, setShowComparison] = useState(false);
    const [globalActiveSlot, setGlobalActiveSlot] = useState(null);
    const [playerSelectModal, setPlayerSelectModal] = useState({ open: false });
    const [compareHover, setCompareHover] = useState(null);
    const [activeDrag, setActiveDrag] = useState(null);

    const [{ mode, formationA, formationB, teamA, teamB }, setPersistedState] = useState(getInitialState);

    const setTeamA = (newTeamA) => setPersistedState(s => ({ ...s, teamA: newTeamA }));
    const setTeamB = (newTeamB) => setPersistedState(s => ({ ...s, teamB: newTeamB }));
    const setFormationA = (f) => setPersistedState(s => ({ ...s, formationA: f }));
    const setFormationB = (f) => setPersistedState(s => ({ ...s, formationB: f }));
    const setModeAndResetTeams = (newMode) => {
        setPersistedState(s => ({
            ...s,
            mode: newMode,
            formationA: FORMATIONS_BY_COUNT[newMode][0],
            formationB: FORMATIONS_BY_COUNT[newMode][0],
            teamA: Array(PLAYER_COUNTS[newMode]).fill(null),
            teamB: Array(PLAYER_COUNTS[newMode]).fill(null),
        }));
    };

    useEffect(() => {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ mode, formationA, formationB, teamA, teamB })
        );
    }, [mode, formationA, formationB, teamA, teamB]);

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

    const handleDragStart = (player, fromTeam, fromIndex) => {
        setActiveDrag({ player, fromTeam, fromIndex });
        window.__draggedPlayer = player;
    };
    const handleDragEnd = () => {
        setActiveDrag(null);
        window.__draggedPlayer = null;
        setCompareHover(null);
    };

    function handleClearAll() {
        setTeamA(Array(PLAYER_COUNTS[mode]).fill(null));
        setTeamB(Array(PLAYER_COUNTS[mode]).fill(null));
    }

    function handleRandomize() {
        function shuffle(array) {
            const arr = array.slice();
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
        }

        const shuffledPlayers = shuffle(players);

        function pickBest(pos, pool, taken) {
            const candidates = pool
                .filter(p => p.position === pos && !taken.has(p.name))
                .sort((a, b) => b.overall - a.overall);
            if (candidates.length > 0) return candidates[0];
            const fallback = pool
                .filter(p => !taken.has(p.name) && (pos === "GK" ? p.position === "GK" : p.position !== "GK"))
                .sort((a, b) => b.overall - a.overall);
            return fallback[0] || null;
        }

        const taken = new Set();
        const formationAPos = formationMap[formationA];
        const formationBPos = formationMap[formationB];
        let newTeamA = [];
        let newTeamB = [];
        for (let i = 0; i < PLAYER_COUNTS[mode]; i++) {
            const bestA = pickBest(formationAPos[i], shuffledPlayers, taken);
            newTeamA.push(bestA ? getPlayerWithPositionAttributes(bestA, formationAPos[i]) : null);
            if (bestA) taken.add(bestA.name);

            const bestB = pickBest(formationBPos[i], shuffledPlayers, taken);
            newTeamB.push(bestB ? getPlayerWithPositionAttributes(bestB, formationBPos[i]) : null);
            if (bestB) taken.add(bestB.name);
        }
        setTeamA(newTeamA);
        setTeamB(newTeamB);
    }

    return (
        <div className="p-4 max-w-7xl mx-auto" ref={mainRef}>
            <div className="flex justify-center mb-4">
                <label className="mr-2 font-semibold text-green-900">Players per team:</label>
                <select
                    value={mode}
                    onChange={e => setModeAndResetTeams(e.target.value)}
                    className="border p-1 rounded text-sm bg-white/90 shadow"
                >
                    <option value="11v11">11v11</option>
                    <option value="10v10">10v10</option>
                    <option value="9v9">9v9</option>
                    <option value="6v6">6v6</option>
                </select>
            </div>
            <h1 className="text-4xl font-extrabold mb-6 text-center text-green-900 drop-shadow">Lineup Creator A</h1>

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

            <div className="flex flex-wrap justify-center gap-4 mb-4">
                <button
                    onClick={handleClearAll}
                    className="px-4 py-1 rounded text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold shadow transition"
                    type="button"
                >
                    Clear All
                </button>
                <button
                    onClick={handleRandomize}
                    className="px-4 py-1 rounded text-sm bg-green-500 hover:bg-green-600 text-white font-semibold shadow transition"
                    type="button"
                >
                    Randomizer (Best Matchups)
                </button>
            </div>

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
                <>
                    <MirroredTeamAttributesBarChart
                        teamAPlayers={teamA}
                        teamBPlayers={teamB}
                        teamALabel="Team A"
                        teamBLabel="Team B"
                        onHide={() => setShowComparison(false)}
                    />
                    <MirroredPositionOVRBarChart
                        teamAPlayers={teamA}
                        teamBPlayers={teamB}
                        teamALabel="Team A"
                        teamBLabel="Team B"
                    />
                </>
            )}

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

function AttributeBarChart({ playerA, playerB }) {
    const attrs = [
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

    return (
        <div className="w-full mt-4">
            <div className="text-xs font-semibold mb-2 text-center text-gray-700">Attribute Comparison Chart</div>
            <div className="space-y-2">
                {attrs.map(attr => {
                    const aVal = playerA[attr.key] || 0;
                    const bVal = playerB[attr.key] || 0;
                    const max = attr.max;
                    const aPct = Math.max(5, (aVal / max) * 100);
                    const bPct = Math.max(5, (bVal / max) * 100);
                    return (
                        <div key={attr.key} className="flex items-center gap-2">
                            <span className="w-16 text-right text-xs font-semibold text-blue-700">{aVal}</span>
                            <div className="flex-1 flex justify-end">
                                <div
                                    className="h-3 rounded-l bg-blue-400"
                                    style={{
                                        width: `${aPct}%`,
                                        minWidth: aVal > 0 ? 12 : 0,
                                        opacity: aVal >= bVal ? 1 : 0.5,
                                        transition: "width 0.3s"
                                    }}
                                />
                            </div>
                            <span className="w-24 text-xs text-gray-700 text-center font-medium">{attr.label}</span>
                            <div className="flex-1 flex">
                                <div
                                    className="h-3 rounded-r bg-red-400"
                                    style={{
                                        width: `${bPct}%`,
                                        minWidth: bVal > 0 ? 12 : 0,
                                        opacity: bVal >= aVal ? 1 : 0.5,
                                        transition: "width 0.3s"
                                    }}
                                />
                            </div>
                            <span className="w-16 text-left text-xs font-semibold text-red-700">{bVal}</span>
                        </div>
                    );
                })}
            </div>
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
        <div className="fixed left-1/2 top-24 z-50 -translate-x-1/2 bg-white rounded-2xl shadow-2xl border-2 border-blue-200 p-6 min-w-[340px] max-w-md animate-fade-in">
            <button
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-lg font-bold"
                onClick={onClose}
                aria-label="Close"
                type="button"
            >×</button>
            <div className="flex items-center justify-center gap-4 mb-4">
                <div className="flex flex-col items-center">
                    <img
                        src={playerA.photo || PLACEHOLDER_IMG}
                        alt={playerA.name}
                        className="w-14 h-14 rounded-full object-cover border border-blue-300 shadow"
                        style={{ background: "#eee" }}
                        loading="lazy"
                    />
                    <div className="font-bold text-blue-900 text-sm mt-1">{playerA.name}</div>
                    <div className="text-xs text-gray-500">{playerA.position}</div>
                </div>
                <span className="text-2xl font-bold text-gray-400">vs</span>
                <div className="flex flex-col items-center">
                    <img
                        src={playerB.photo || PLACEHOLDER_IMG}
                        alt={playerB.name}
                        className="w-14 h-14 rounded-full object-cover border border-red-300 shadow"
                        style={{ background: "#eee" }}
                        loading="lazy"
                    />
                    <div className="font-bold text-red-900 text-sm mt-1">{playerB.name}</div>
                    <div className="text-xs text-gray-500">{playerB.position}</div>
                </div>
            </div>
            <table className="w-full text-xs mb-2">
                <thead>
                    <tr>
                        <th className="p-1 text-right text-blue-800">{playerA.name}</th>
                        <th className="p-1 text-center"></th>
                        <th className="p-1 text-left text-red-800">{playerB.name}</th>
                    </tr>
                </thead>
                <tbody>
                    {attrs.map(attr => (
                        <tr key={attr.key}>
                            <td className={`p-1 text-right font-semibold ${playerA[attr.key] > playerB[attr.key] ? "text-blue-700" : "text-gray-700"}`}>{playerA[attr.key]}</td>
                            <td className="p-1 text-center text-gray-500">{attr.label}</td>
                            <td className={`p-1 text-left font-semibold ${playerB[attr.key] > playerA[attr.key] ? "text-red-700" : "text-gray-700"}`}>{playerB[attr.key]}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function MirroredPositionOVRBarChart({ teamAPlayers, teamBPlayers, teamALabel = "Team A", teamBLabel = "Team B" }) {
    const positions = [
        { key: "ST", label: "Attackers (ST)" },
        { key: "MF", label: "Midfielders (MF)" },
        { key: "DF", label: "Defenders (DF)" },
        { key: "GK", label: "Goalkeepers (GK)" }
    ];

    function avg(players, pos) {
        const filtered = players.filter(p => p && p.position === pos);
        if (!filtered.length) return 0;
        return Math.round(filtered.reduce((sum, p) => sum + (p.overall || 0), 0) / filtered.length);
    }

    return (
        <div className="mb-6 max-w-2xl mx-auto bg-white rounded-xl shadow p-4 border">
            <div className="text-base font-bold mb-2 text-center text-gray-700">OVR by Position</div>
            <div className="flex justify-between text-xs font-semibold mb-2">
                <span className="w-24 text-left text-blue-700">{teamALabel}</span>
                <span className="w-24 text-right text-red-700">{teamBLabel}</span>
            </div>
            <div>
                {positions.map(pos => {
                    const ovrA = avg(teamAPlayers, pos.key);
                    const ovrB = avg(teamBPlayers, pos.key);
                    const percentA = (ovrA / 100) * 100;
                    const percentB = (ovrB / 100) * 100;
                    const aBold = ovrA > ovrB;
                    const bBold = ovrB > ovrA;
                    return (
                        <div key={pos.key} className="flex items-center gap-2 w-full py-1 border-b last:border-b-0 border-gray-100">
                            <span className={`w-8 text-right text-xs ${aBold ? "font-bold text-blue-800" : "text-blue-700"}`}>{ovrA || "-"}</span>
                            <div className="flex-1 flex justify-end">
                                <div
                                    className="h-3 rounded-l"
                                    style={{
                                        width: `${percentA}%`,
                                        minWidth: ovrA > 0 ? 12 : 0,
                                        background: "linear-gradient(to left, #3b82f6, #60a5fa)",
                                        transition: "width 0.3s"
                                    }}
                                />
                            </div>
                            <span className="w-32 text-xs text-gray-700 text-center font-medium">{pos.label}</span>
                            <div className="flex-1 flex">
                                <div
                                    className="h-3 rounded-r"
                                    style={{
                                        width: `${percentB}%`,
                                        minWidth: ovrB > 0 ? 12 : 0,
                                        background: "linear-gradient(to right, #ef4444, #f87171)",
                                        transition: "width 0.3s"
                                    }}
                                />
                            </div>
                            <span className={`w-8 text-left text-xs ${bBold ? "font-bold text-red-800" : "text-red-700"}`}>{ovrB || "-"}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}


function MotmStatsFeature() {
    const [stats, setStats] = React.useState([]);
    const [latest, setLatest] = React.useState(null);
    const [before, setBefore] = React.useState(null);

    // Utility: parse date in dd/mm/yyyy or mm/dd/yyyy
    const parseDate = (str) => {
        const parts = str.split('/');
        if (parts.length !== 3) return new Date('Invalid');
        let [a, b, c] = parts;
        if (Number(a) > 12) {
            return new Date(`${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`);
        }
        return new Date(`${c}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`);
    };

    // Consistent overall calculation as in Player Database
    function calculateOverall(p) {
        const {
            position, speed, shooting, passing, dribbling, physical, defending, goalkeeping, weakFoot
        } = p;
        switch (position) {
            case "ST":
                return Math.round(
                    speed * 0.25 +
                    shooting * 0.3 +
                    passing * 0.1 +
                    dribbling * 0.15 +
                    physical * 0.1 +
                    defending * 0.1 +
                    weakFoot * 0.1
                );
            case "MF":
                return Math.round(
                    speed * 0.2 +
                    shooting * 0.2 +
                    passing * 0.25 +
                    dribbling * 0.2 +
                    physical * 0.1 +
                    defending * 0.1 +
                    weakFoot * 0.05
                );
            case "DF":
                return Math.round(
                    speed * 0.1 +
                    shooting * 0.05 +
                    passing * 0.15 +
                    dribbling * 0.05 +
                    physical * 0.2 +
                    defending * 0.45 +
                    weakFoot * 0.03
                );
            case "GK":
                return Math.round(
                    speed * 0.03 +
                    passing * 0.02 +
                    physical * 0.05 +
                    goalkeeping * 0.9 +
                    weakFoot * 0.02
                );
            default:
                return 0;
        }
    }

    // Card background and highlight helpers (reuse from Player Database)
    function getCardBgByOverall(overall) {
        if (overall >= 90) return "bg-gradient-to-br from-[#e5e4e2] via-[#b3e0fc] to-[#f8fafc] border-blue-300";
        if (overall >= 80) return "bg-gradient-to-br from-yellow-200 via-yellow-100 to-white border-yellow-400";
        return "bg-gradient-to-br from-gray-200 via-gray-100 to-white border-gray-300";
    }
    function getCardHighlight({ assigned, selected }) {
        if (assigned) return "ring-2 ring-green-400 ring-offset-2";
        if (selected) return "ring-2 ring-blue-400 ring-offset-2";
        return "";
    }
    const PLACEHOLDER_IMG = "https://ui-avatars.com/api/?name=Player&background=eee&color=888&size=128&rounded=true";

    React.useEffect(() => {
        fetch('https://docs.google.com/spreadsheets/d/13PZEIB0oMzZecDfuBAphm2Ip9FiO9KN8nHS0FihOl-c/gviz/tq?tqx=out:csv')
            .then(res => res.text())
            .then(csv => {
                Papa.parse(csv, {
                    header: true,
                    skipEmptyLines: true,
                    transformHeader: header => header.trim(),
                    complete: results => {
                        const rows = results.data
                            .filter(r => r.Date && r.Player)
                            .map(r => ({
                                date: r.Date,
                                playerName: r.Player,
                                before: {
                                    name: r.Player,
                                    position: r["Position"],
                                    speed: Number(r["Speed"] || 0),
                                    shooting: Number(r["Shooting"] || 0),
                                    passing: Number(r["Passing"] || 0),
                                    dribbling: Number(r["Dribbling"] || 0),
                                    physical: Number(r["Physical"] || 0),
                                    defending: Number(r["Defending"] || 0),
                                    goalkeeping: Number(r["Goalkeeping"] || 0),
                                    weakFoot: Number(r["Weak Foot"] || 0),
                                },
                                after: {
                                    name: r.Player,
                                    position: r["Updated_Position"],
                                    speed: Number(r["Updated_Speed"] || 0),
                                    shooting: Number(r["Updated_Shooting"] || 0),
                                    passing: Number(r["Updated_Passing"] || 0),
                                    dribbling: Number(r["Updated_Dribbling"] || 0),
                                    physical: Number(r["Updated_Physical"] || 0),
                                    defending: Number(r["Updated_Defending"] || 0),
                                    goalkeeping: Number(r["Updated_Goalkeeping"] || 0),
                                    weakFoot: Number(r["Updated_Weak Foot"] || 0),
                                }
                            }));
                        const sorted = rows.sort((a, b) => parseDate(b.date) - parseDate(a.date));
                        setStats(sorted);
                    }
                });
            });
    }, []);

    React.useEffect(() => {
        if (stats.length === 0) {
            setLatest(null);
            setBefore(null);
            return;
        }
        const latestRow = stats[0];
        const latestPlayer = latestRow.playerName;
        // Find previous row for same player
        const previous = stats.find(
            r => r.playerName === latestPlayer && parseDate(r.date) < parseDate(latestRow.date)
        );
        setLatest(latestRow.after);
        setBefore(latestRow.before);
    }, [stats]);

    // Card styled like Player Database
    function MotmStatsCard({ player, title }) {
        if (!player) return (
            <div className="bg-gray-100 rounded-xl shadow p-4 border min-w-[220px] text-center text-gray-400">
                No data
            </div>
        );
        const isGK = player.position === "GK";
        const cardBg = getCardBgByOverall(calculateOverall(player));
        const photoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name || "Player")}&background=eee&color=888&size=128&rounded=true`;

        return (
            <div className={[
                cardBg,
                "border rounded-xl shadow p-4 flex flex-col items-center min-w-[220px] max-w-xs",
                getCardHighlight({ assigned: false, selected: false })
            ].join(" ")}>
                <div className="font-bold text-blue-900 mb-1">{title}</div>
                <div className="flex justify-center mb-2">
                    <img
                        src={photoUrl}
                        alt={player.name}
                        className="w-20 h-20 rounded-full object-cover border"
                        style={{ background: "#eee" }}
                        loading="lazy"
                    />
                </div>
                <div className="font-semibold text-base truncate">{player.name}</div>
                <div className="text-xs text-muted-foreground mb-2">{player.position}</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-2">
                    <span>Speed: {player.speed || '-'}</span>
                    <span>Shooting: {player.shooting || '-'}</span>
                    <span>Passing: {player.passing || '-'}</span>
                    <span>Dribbling: {player.dribbling || '-'}</span>
                    <span>Physical: {player.physical || '-'}</span>
                    <span>Defending: {player.defending || '-'}</span>
                    <span>Weak Foot: {player.weakFoot || '-'}</span>
                    {isGK && <span>Goalkeeping: {player.goalkeeping || '-'}</span>}
                </div>
                <div className="text-sm font-bold">Overall: {calculateOverall(player)}</div>
            </div>
        );
    }

    return (
        <div className="my-8 w-full max-w-2xl mx-auto bg-blue-50 rounded-xl shadow p-6 border">
            <h2 className="text-xl font-bold mb-4 text-center text-blue-900">MOTM per kete jave</h2>
            {latest ? (
                <div className="flex flex-col sm:flex-row gap-6 justify-center items-start mt-4">
                    <MotmStatsCard player={before} title="Atributet origjinale" />
                    <MotmStatsCard player={latest} title="Atributet e javes" />
                </div>
            ) : (
                <div className="text-center text-red-600">No MOTM data found.</div>
            )}
        </div>
    );
}

// Add this modal component above AllMotmStatsCards in your file

function MotmBeforeAfterModal({ open, row, onClose }) {
    if (!open || !row) return null;

    // Card rendering logic (reuse from MotmStatsFeature)
    function MotmStatsCard({ player, title }) {
        if (!player) return (
            <div className="bg-gray-100 rounded-xl shadow p-4 border min-w-[220px] text-center text-gray-400">
                No data
            </div>
        );
        const isGK = player.position === "GK";
        const overall = calculateOverall(player);
        const cardBg = getCardBgByOverall(overall);
        const photoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name || "Player")}&background=eee&color=888&size=128&rounded=true`;
        return (
            <div className={[
                cardBg,
                "border rounded-xl shadow p-4 flex flex-col items-center min-w-[220px] max-w-xs"
            ].join(" ")}>
                <div className="font-bold text-blue-900 mb-1">{title}</div>
                <div className="flex justify-center mb-2">
                    <img
                        src={photoUrl}
                        alt={player.name}
                        className="w-20 h-20 rounded-full object-cover border"
                        style={{ background: "#eee" }}
                        loading="lazy"
                    />
                </div>
                <div className="font-semibold text-base truncate">{player.name}</div>
                <div className="text-xs text-muted-foreground mb-2">{player.position}</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-2">
                    <span>Speed: {player.speed || '-'}</span>
                    <span>Shooting: {player.shooting || '-'}</span>
                    <span>Passing: {player.passing || '-'}</span>
                    <span>Dribbling: {player.dribbling || '-'}</span>
                    <span>Physical: {player.physical || '-'}</span>
                    <span>Defending: {player.defending || '-'}</span>
                    <span>Weak Foot: {player.weakFoot || '-'}</span>
                    {isGK && <span>Goalkeeping: {player.goalkeeping || '-'}</span>}
                </div>
                <div className="text-sm font-bold">Overall: {overall}</div>
            </div>
        );
    }

    // Helper functions (reuse from above)
    function calculateOverall(p) {
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
    function getCardBgByOverall(overall) {
        if (overall >= 90) return "bg-gradient-to-br from-[#e5e4e2] via-[#b3e0fc] to-[#f8fafc] border-blue-300";
        if (overall >= 80) return "bg-gradient-to-br from-yellow-200 via-yellow-100 to-white border-yellow-400";
        return "bg-gradient-to-br from-gray-200 via-gray-100 to-white border-gray-300";
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
            <div
                className="bg-white rounded-xl shadow-2xl border p-6 max-w-2xl w-full relative flex flex-col items-center"
                onClick={e => e.stopPropagation()}
            >
                <button
                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-lg font-bold"
                    onClick={onClose}
                    aria-label="Close"
                    type="button"
                >×</button>
                <div className="font-bold text-xl mb-2 text-center text-blue-900">
                    {row.playerName} - {row.date}
                </div>
                <div className="flex flex-col sm:flex-row gap-6 justify-center items-start mt-2">
                    <MotmStatsCard player={row.before} title="Atributet origjinale" />
                    <MotmStatsCard player={row.after} title="Atributet e javes" />
                </div>
            </div>
        </div>
    );
}

function AllMotmStatsCards({ stats }) {
    const [modal, setModal] = React.useState({ open: false, row: null });
    const parseDate = (str) => {
        const parts = str.split('/');
        if (parts.length !== 3) return new Date('Invalid');
        let [a, b, c] = parts;
        if (Number(a) > 12) {
            return new Date(`${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`);
        }
        return new Date(`${c}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`);
    };

    // Card background and highlight helpers (reuse from Player Database)
    function getCardBgByOverall(overall) {
        if (overall >= 90) return "bg-gradient-to-br from-[#e5e4e2] via-[#b3e0fc] to-[#f8fafc] border-blue-300";
        if (overall >= 80) return "bg-gradient-to-br from-yellow-200 via-yellow-100 to-white border-yellow-400";
        return "bg-gradient-to-br from-gray-200 via-gray-100 to-white border-gray-300";
    }
    function getCardHighlight({ assigned, selected }) {
        if (assigned) return "ring-2 ring-green-400 ring-offset-2";
        if (selected) return "ring-2 ring-blue-400 ring-offset-2";
        return "";
    }
    const PLACEHOLDER_IMG = "https://ui-avatars.com/api/?name=Player&background=eee&color=888&size=128&rounded=true";

    // Consistent overall calculation as in Player Database
    function calculateOverall(p) {
        const {
            position, speed, shooting, passing, dribbling, physical, defending, goalkeeping, weakFoot
        } = p;
        switch (position) {
            case "ST":
                return Math.round(
                    speed * 0.25 +
                    shooting * 0.3 +
                    passing * 0.1 +
                    dribbling * 0.15 +
                    physical * 0.1 +
                    defending * 0.1 +
                    weakFoot * 0.1
                );
            case "MF":
                return Math.round(
                    speed * 0.2 +
                    shooting * 0.2 +
                    passing * 0.25 +
                    dribbling * 0.2 +
                    physical * 0.1 +
                    defending * 0.1 +
                    weakFoot * 0.05
                );
            case "DF":
                return Math.round(
                    speed * 0.1 +
                    shooting * 0.05 +
                    passing * 0.15 +
                    dribbling * 0.05 +
                    physical * 0.2 +
                    defending * 0.45 +
                    weakFoot * 0.03
                );
            case "GK":
                return Math.round(
                    speed * 0.03 +
                    passing * 0.02 +
                    physical * 0.05 +
                    goalkeeping * 0.9 +
                    weakFoot * 0.02
                );
            default:
                return 0;
        }
    }

    if (!stats.length) return null;

    return (
        <div className="my-8 w-full max-w-5xl mx-auto bg-blue-50 rounded-xl shadow p-6 border">
            <h2 className="text-xl font-bold mb-4 text-center text-blue-900">Te gjithe fituesit (Atributet jane te lojtarit ne javet perkatese, kliko karten e lojtarit per me shume)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {stats.map((row, idx) => {
                    const player = row.after;
                    const cardBg = getCardBgByOverall(calculateOverall(player));
                    const photoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name || "Player")}&background=eee&color=888&size=128&rounded=true`;
                    const isGK = player.position === "GK";
                    return (
                        <div
                            key={idx}
                            className={[
                                cardBg,
                                "border rounded-xl shadow p-4 flex flex-col items-center min-w-[220px] max-w-xs cursor-pointer hover:ring-2 hover:ring-blue-400 transition"
                            ].join(" ")}
                            onClick={() => setModal({ open: true, row })}
                            tabIndex={0}
                            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") setModal({ open: true, row }); }}
                            role="button"
                            aria-label={`View before/after stats for ${player.name}`}
                        >
                            <div className="font-bold text-blue-900 mb-1">{row.date}</div>
                            <div className="flex justify-center mb-2">
                                <img
                                    src={photoUrl}
                                    alt={player.name}
                                    className="w-20 h-20 rounded-full object-cover border"
                                    style={{ background: "#eee" }}
                                    loading="lazy"
                                />
                            </div>
                            <div className="font-semibold text-base truncate">{player.name}</div>
                            <div className="text-xs text-muted-foreground mb-2">{player.position}</div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-2">
                                <span>Speed: {player.speed || '-'}</span>
                                <span>Shooting: {player.shooting || '-'}</span>
                                <span>Passing: {player.passing || '-'}</span>
                                <span>Dribbling: {player.dribbling || '-'}</span>
                                <span>Physical: {player.physical || '-'}</span>
                                <span>Defending: {player.defending || '-'}</span>
                                <span>Weak Foot: {player.weakFoot || '-'}</span>
                                {isGK && <span>Goalkeeping: {player.goalkeeping || '-'}</span>}
                            </div>
                            <div className="text-sm font-bold">Overall: {calculateOverall(player)}</div>
                        </div>
                    );
                })}
            </div>
            <MotmBeforeAfterModal
                open={modal.open}
                row={modal.row}
                onClose={() => setModal({ open: false, row: null })}
            />
        </div>
    );
}



function MOTMPage() {
    const [data, setData] = React.useState([]);
    const [topEarners, setTopEarners] = React.useState([]);
    const [showAll, setShowAll] = React.useState(false);
    const [showAllEarners, setShowAllEarners] = React.useState(false);
    const [loading, setLoading] = React.useState(true);

    // For all stats
    const [motmStats, setMotmStats] = React.useState([]);

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

    // Fetch all MOTM stats for cards
    React.useEffect(() => {
        fetch('https://docs.google.com/spreadsheets/d/13PZEIB0oMzZecDfuBAphm2Ip9FiO9KN8nHS0FihOl-c/gviz/tq?tqx=out:csv')
            .then(res => res.text())
            .then(csv => {
                Papa.parse(csv, {
                    header: true,
                    skipEmptyLines: true,
                    transformHeader: header => header.trim(),
                    complete: results => {
                        const rows = results.data
                            .filter(r => r.Date && r.Player)
                            .map(r => ({
                                date: r.Date,
                                playerName: r.Player,
                                before: {
                                    name: r.Player,
                                    position: r["Position"],
                                    speed: Number(r["Speed"] || 0),
                                    shooting: Number(r["Shooting"] || 0),
                                    passing: Number(r["Passing"] || 0),
                                    dribbling: Number(r["Dribbling"] || 0),
                                    physical: Number(r["Physical"] || 0),
                                    defending: Number(r["Defending"] || 0),
                                    goalkeeping: Number(r["Goalkeeping"] || 0),
                                    weakFoot: Number(r["Weak Foot"] || 0),
                                },
                                after: {
                                    name: r.Player,
                                    position: r["Updated_Position"],
                                    speed: Number(r["Updated_Speed"] || 0),
                                    shooting: Number(r["Updated_Shooting"] || 0),
                                    passing: Number(r["Updated_Passing"] || 0),
                                    dribbling: Number(r["Updated_Dribbling"] || 0),
                                    physical: Number(r["Updated_Physical"] || 0),
                                    defending: Number(r["Updated_Defending"] || 0),
                                    goalkeeping: Number(r["Updated_Goalkeeping"] || 0),
                                    weakFoot: Number(r["Updated_Weak Foot"] || 0),
                                }
                            }));
                        // Sort by date descending
                        const sorted = rows.sort((a, b) => {
                            const parseDate = (str) => {
                                const parts = str.split('/');
                                if (parts.length !== 3) return new Date('Invalid');
                                let [a, b2, c] = parts;
                                if (Number(a) > 12) {
                                    return new Date(`${c}-${b2.padStart(2, '0')}-${a.padStart(2, '0')}`);
                                }
                                return new Date(`${c}-${a.padStart(2, '0')}-${b2.padStart(2, '0')}`);
                            };
                            return parseDate(b.date) - parseDate(a.date);
                        });
                        setMotmStats(sorted);
                    }
                });
            });
    }, []);

    const visibleData = showAll ? data : data.slice(0, 10);
    const visibleEarners = showAllEarners ? topEarners : topEarners.slice(0, 10);

    if (loading) return <LoadingSpinner />;

    return (
        <div className="w-full flex flex-col items-center">
            <h1 className="text-3xl font-bold mb-6 text-center text-blue-900">Man of the Match (MOTM)</h1>
            <MotmStatsFeature />

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

            {/* All MOTM Winners Cards */}
            <AllMotmStatsCards stats={motmStats} />
        </div>
    );
}




