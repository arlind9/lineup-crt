import React, { useEffect, useState, useRef, useMemo } from "react";
import Papa from "papaparse";
import { calculateOverall } from "./utils/overall";
import GalleryPage from "./GalleryPage";
import ReviewAndRequestPage from "./ReviewAndRequestPage";
import MOTMPage from "./MOTMPage";
import CardCreatorPage from "./CardCreatorPage";
import LineupCreatorPage from "./LineupCreatorPage";
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
    if (overall >= 90) return "bg-gradient-to-br from-[#e5e4e2] via-[#b3e0fc] to-[#f8fafc] border-blue-300"; // Platinum
    if (overall >= 80) return "bg-gradient-to-br from-yellow-300 via-yellow-100 to-white border-yellow-400"; // Gold
    if (overall >= 70) return "bg-gradient-to-br from-gray-300 via-gray-100 to-white border-gray-400"; // Silver
    return "bg-gradient-to-br from-orange-200 via-yellow-50 to-white border-orange-300"; // Bronze
}

// Special darker gradient for MOTM winner cards
function getMotmCardBgByOverall(overall) {
    if (overall >= 90) {
        // Black with stronger blue gradient
        return "bg-gradient-to-br from-black via-[#89c9f8] to-[#cbeaff] border-blue-400";
    }
    // Black with gold
    return "bg-gradient-to-br from-black via-yellow-500 to-yellow-300 border-yellow-400";
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

// Utility to parse dd/mm/yyyy or mm/dd/yyyy dates used in the Google sheet
function parseSheetDate(str) {
    const parts = String(str).split('/');
    if (parts.length !== 3) return new Date('Invalid');
    let [a, b, c] = parts;
    if (Number(a) > 12) {
        return new Date(`${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`);
    }
    return new Date(`${c}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`);
}

// Expand players list to include MOTM versions when enabled
function expandPlayersForMotm(players, includeMotm) {
    if (!includeMotm) return players;
    const out = [];
    players.forEach((p) => {
        out.push({ ...p, id: `${p.name}-base`, version: 'base' });
        if (Array.isArray(p.motmCards)) {
            p.motmCards.forEach((motm, idx) => {
                out.push({
                    ...p,
                    ...motm,
                    id: `${p.name}-motm-${motm.date || idx}`,
                    version: 'motm',
                    motmDate: motm.date
                });
            });
        }
    });
    return out;
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
                key={player.id || player.name}
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
                key={(player.id || player.name) + "-dot-" + i}
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
                <div key={p.id || p.name} className="flex items-center gap-2">
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
                        onClick={() => removeFromCompare(p.id)}
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

function ListPlayer({ player, fromTeam, fromIndex, assigned, selected, onDragStart, onDragEnd, useMotm }) {
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
                const p = player;

                e.dataTransfer.setData("application/json", JSON.stringify({
                    player: p,
                    fromTeam,
                    fromIndex
                }));
                if (onDragStart) onDragStart(p, fromTeam, fromIndex);
            }}
            onDragEnd={onDragEnd}
            style={{ minHeight: 36 }}
        >
            {(() => {
                const p = player; return (
                    <>
                        <span className="font-semibold flex-1 truncate">{p.name}</span>
                        <span className="text-xs text-gray-500 w-10 text-center">{p.position}</span>
                        <span className="text-xs w-12 text-center">OVR: {p.overall}</span>
                        <span className="text-xs w-10 text-center">Spd: {p.speed}</span>
                        <span className="text-xs w-10 text-center">Sht: {p.shooting}</span>
                        <span className="text-xs w-10 text-center">Pas: {p.passing}</span>
                    </>);
            })()}

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

    const [motmBefore, setMotmBefore] = useState(null);
    const [motmAfter, setMotmAfter] = useState(null);

    useEffect(() => {
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

                        // Sort rows by date descending
                        const parseDate = (str) => {
                            const parts = str.split('/');
                            if (parts.length !== 3) return new Date('Invalid');
                            let [a, b, c] = parts;
                            if (Number(a) > 12) {
                                return new Date(`${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`);
                            }
                            return new Date(`${c}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`);
                        };
                        rows.sort((a, b) => parseDate(b.date) - parseDate(a.date));

                        if (data.length > 0) {
                            const playerName = data[0][Object.keys(data[0])[1]];
                            // Find the latest MOTM entry for this player
                            const latest = rows.find(r => r.playerName === playerName);
                            if (latest) {
                                setMotmBefore(latest.before);
                                setMotmAfter(latest.after);
                            }
                        }
                    }
                });
            });
    }, [data]);

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

    function MotmStatsCardHome({ player, title, motm, small }) {
        if (!player) return null;
        const isGK = player.position === "GK";
        const overall = calculateOverall(player);
        const cardBg = motm
            ? "bg-gradient-to-br from-black via-yellow-500 to-yellow-300 border-yellow-400"
            : "bg-gradient-to-br from-yellow-100 via-yellow-50 to-white border-yellow-300";

        const photoUrl = player.photo
            ? player.photo
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name || "Player")}&background=eee&color=888&size=128&rounded=true`;

        return (
            <div
                className={[
                    cardBg,
                    "border rounded-xl shadow flex flex-col items-center min-w-[100px] max-w-[130px] w-full p-2 overflow-hidden"
                ].join(" ")}
                style={{ minHeight: 0, maxHeight: 230 }}
            >
                <div className="font-bold text-blue-900 mb-1 text-xs sm:text-sm text-center w-full break-words">{title}</div>
                <div className="flex justify-center mb-1">
                    <img
                        src={photoUrl}
                        alt={player.name}
                        className="w-10 h-10 rounded-full object-cover border"
                        style={{ background: "#eee" }}
                        loading="lazy"
                    />
                </div>
                <div className="font-semibold text-sm truncate w-full text-center">{player.name}</div>
                <div className="text-[12px] text-muted-foreground mb-1 w-full text-center">{player.position}</div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[12px] mb-1 w-full">
                    <span className="truncate">Spe: {player.speed || '-'}</span>
                    <span className="truncate">Sho: {player.shooting || '-'}</span>
                    <span className="truncate">Pas: {player.passing || '-'}</span>
                    <span className="truncate">Dri: {player.dribbling || '-'}</span>
                    <span className="truncate">Phy: {player.physical || '-'}</span>
                    <span className="truncate">Def: {player.defending || '-'}</span>
                    <span className="truncate">WF: {player.weakFoot || '-'}</span>
                    {isGK && <span className="truncate">Gk: {player.goalkeeping || '-'}</span>}
                </div>
                <div className="text-sm font-bold w-full text-center">Overall: {overall}</div>
            </div>
        );
    }

    const visibleData = showAll ? data : data.slice(0, 3);
    const visibleEarners = showAllEarners ? topEarners : topEarners.slice(0, 3);

    const today = new Date();
    const todayStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    const nextWednesdayStr = getNextWednesday();
    const isMatchDay = todayStr === nextWednesdayStr;

    function goTo(view) {
        const event = new CustomEvent("setView", { detail: view });
        window.dispatchEvent(event);
        setTimeout(() => window.location.reload(), 0);
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
                                Browse all players, filter and sort, and compare up to 5 players on a radar chart.
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
                                {/* Last week's MOTM table */}
                                <table className="w-full shadow-xl rounded-2xl overflow-hidden border-4 border-blue-300 bg-blue-50/80 mb-4">
                                    <tbody>
                                        <tr>
                                            <td
                                                className="p-4 text-center font-bold text-blue-900 text-base sm:text-lg tracking-wide align-top"
                                                style={{ minHeight: 480, verticalAlign: "top" }} // Make the cell taller
                                            >
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
                                                        {/* --- Add before/after cards vertically --- */}
                                                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6">
                                                            <MotmStatsCardHome
                                                                player={motmBefore}
                                                                title="Att. Baze"
                                                                motm={false}
                                                                small
                                                            />
                                                            <MotmStatsCardHome
                                                                player={motmAfter}
                                                                title="Att. e javes"
                                                                motm={true}
                                                                small
                                                            />
                                                        </div>
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
    const [useMotm, setUseMotm] = useState(false);
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 12;

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
                        id: `${cells[0]?.v}-base`,
                    };
                    player.overall = calculateOverall(player);
                    return player;
                });
                setPlayers(rows);
            });
    }, []);

    // Fetch MOTM stats and attach ALL motm cards to each player
    useEffect(() => {
        fetch('https://docs.google.com/spreadsheets/d/13PZEIB0oMzZecDfuBAphm2Ip9FiO9KN8nHS0FihOl-c/gviz/tq?tqx=out:csv')
            .then(res => res.text())
            .then(csv => {
                Papa.parse(csv, {
                    header: true,
                    skipEmptyLines: true,
                    transformHeader: h => h.trim(),
                    complete: results => {
                        // Group all MOTM cards by player name
                        const motmByPlayer = {};
                        results.data
                            .filter(r => r.Date && r.Player)
                            .forEach(r => {
                                if (!motmByPlayer[r.Player]) motmByPlayer[r.Player] = [];
                                motmByPlayer[r.Player].push({
                                    date: r.Date,
                                    position: r["Updated_Position"],
                                    speed: Number(r["Updated_Speed"] || 0),
                                    shooting: Number(r["Updated_Shooting"] || 0),
                                    passing: Number(r["Updated_Passing"] || 0),
                                    dribbling: Number(r["Updated_Dribbling"] || 0),
                                    physical: Number(r["Updated_Physical"] || 0),
                                    defending: Number(r["Updated_Defending"] || 0),
                                    goalkeeping: Number(r["Updated_Goalkeeping"] || 0),
                                    weakFoot: Number(r["Updated_Weak Foot"] || 0)
                                });
                            });

                        setPlayers(prev => {
                            // Build a map of base players by name
                            const baseByName = {};
                            prev.forEach(p => { baseByName[p.name] = p; });

                            // Get all unique player names from both base and MOTM
                            const allNames = new Set([
                                ...Object.keys(baseByName),
                                ...Object.keys(motmByPlayer)
                            ]);

                            // Build the merged player list
                            return Array.from(allNames).map(name => {
                                const base = baseByName[name] || {
                                    name,
                                    position: motmByPlayer[name]?.[0]?.position || "",
                                    speed: 0, shooting: 0, passing: 0, dribbling: 0,
                                    physical: 0, defending: 0, goalkeeping: 0, weakFoot: 0,
                                    photo: null,
                                    overall: 0
                                };
                                const motmCards = (motmByPlayer[name] || []).map((after, idx) => ({
                                    ...after,
                                    overall: calculateOverall({ ...base, ...after, position: after.position }),
                                    date: after.date
                                }));
                                return { ...base, motmCards };
                            });
                        });
                    }
                });
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

    const displayPlayers = useMemo(() => expandPlayersForMotm(players, useMotm), [players, useMotm]);

    const filtered = displayPlayers
        .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
        .filter((p) => positionFilter === "All" || p.position === positionFilter)
        .sort((a, b) => b[sortBy] - a[sortBy]);

    // Pagination logic
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    useEffect(() => {
        if (page > totalPages) setPage(totalPages || 1);
    }, [filtered.length, totalPages, page]);
    const pagedPlayers = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    function toggleSelect(player) {
        setSelected((prev) => {
            if (prev.some((p) => p.id === player.id)) {
                return prev.filter((p) => p.id !== player.id);
            }
            if (prev.length >= 5) {
                return [...prev.slice(1), player];
            }
            return [...prev, player];
        });
    }

    function removeFromCompare(id) {
        setSelected((prev) => prev.filter((p) => p.id !== id));
    }

    function PlayerModal({ player, onClose }) {
        if (!player) return null;
        const p = player;
        const cardBg = p.version === 'motm' ? getMotmCardBgByOverall(p.overall) : getCardBgByOverall(p.overall);

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className={[cardBg, "rounded-xl shadow-2xl border p-6 max-w-xs w-full relative"].join(' ')}>
                    <button
                        className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-lg font-bold"
                        onClick={onClose}
                        aria-label="Close"
                        type="button"
                    >×</button>
                    <div className="font-bold text-xl mb-1 text-center">{p.name}</div>
                    <div className="text-center text-sm text-gray-500 mb-2">{p.position}</div>
                    <div className="flex justify-center mb-2">
                        <img
                            src={p.photo ? p.photo : PLACEHOLDER_IMG}
                            alt={p.name}
                            className="w-24 h-24 rounded-full object-cover border"
                            style={{ background: "#eee" }}
                            loading="lazy"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-2">
                        <span>Speed: {p.speed}</span>
                        <span>Shooting: {p.shooting}</span>
                        <span>Passing: {p.passing}</span>
                        <span>Dribbling: {p.dribbling}</span>
                        <span>Physical: {p.physical}</span>
                        <span>Defending: {p.defending}</span>
                        <span>Weak Foot: {p.weakFoot}</span>
                        <span>GK: {p.goalkeeping}</span>
                    </div>
                    <div className="text-sm font-bold">
                        Overall: {p.overall}
                        {p.version === 'motm' && (
                            <span className='ml-1'>
                                MOTM
                                {p.motmDate && (
                                    <span className="ml-1 text-xs text-gray-600 font-normal">
                                        ({p.motmDate})
                                    </span>
                                )}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        );
    }

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

    function AddPlayerToCompareModal({ open, onClose, players, alreadySelected, onSelect }) {
        const [search, setSearch] = useState("");
        if (!open) return null;
        const filtered = players
            .filter(p => !alreadySelected.some(sel => sel.id === p.id))
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
                                    key={p.id || p.name}
                                    className="p-2 rounded hover:bg-blue-100 cursor-pointer flex justify-between items-center"
                                    onClick={() => { onSelect(p); onClose(); }}
                                >
                                    <span>
                                        <span className="font-semibold">{p.name}</span>
                                        <span className="text-gray-500 ml-1">({p.position})</span>
                                    </span>
                                    <span className="text-gray-400 text-xs">OVR: {p.overall} {p.version === 'motm' && <strong>MOTM</strong>}</span>
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
                            <tr key={e.name + i} className="odd:bg-white even:bg-gray-100">
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
                { key: "speed", label: "Speed", max: 99 },
                { key: "shooting", label: "Shooting", max: 99 },
                { key: "passing", label: "Passing", max: 99 },
                { key: "dribbling", label: "Dribbling", max: 99 },
                { key: "physical", label: "Physical", max: 99 },
                { key: "defending", label: "Defending", max: 99 }
            ]
            : [
                { key: "speed", label: "Speed", max: 99 },
                { key: "shooting", label: "Shooting", max: 99 },
                { key: "passing", label: "Passing", max: 99 },
                { key: "dribbling", label: "Dribbling", max: 99 },
                { key: "physical", label: "Physical", max: 99 },
                { key: "defending", label: "Defending", max: 99 },
                { key: "goalkeeping", label: "Goalkeeping", max: 99 }
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
                    key={player.id || player.name}
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
                    key={(player.id || player.name) + "-dot-" + i}
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
                    <div key={p.id || p.name} className="flex items-center gap-2">
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
                            onClick={() => removeFromCompare(p.id)}
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
                <label className="flex items-center text-xs font-semibold gap-1">
                    <input
                        type="checkbox"
                        checked={useMotm}
                        onChange={e => setUseMotm(e.target.checked)}
                    />
                    MOTM
                </label>
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
            <PageSelector />
            {selected.length > 0 && (
                <div className="mb-4">
                    <RadarCompare players={selected} />
                </div>
            )}
            <AddPlayerToCompareModal
                open={addCompareModalOpen}
                onClose={() => setAddCompareModalOpen(false)}
                players={displayPlayers}
                alreadySelected={selected}
                onSelect={p => toggleSelect(p)}
            />
            {viewMode === "list" ? (
                <div
                    className="bg-white rounded-xl border shadow divide-y"
                    style={{ minHeight: 200 }}
                >
                    {pagedPlayers.map((p) => (
                        <div
                            key={p.id || p.name}
                            className={`flex items-center px-4 py-3 cursor-pointer hover:bg-blue-50 ${selected.some(sel => sel.id === p.id) ? "bg-blue-100" : ""}`}
                            onClick={() => toggleSelect(p)}
                        >
                            <span
                                className="font-semibold text-base truncate text-blue-700 underline flex-1"
                                style={{ cursor: "pointer" }}
                                onClick={e => { e.stopPropagation(); setModalPlayer(p); }}
                            >
                                {p.name}
                            </span>
                            {selected.some(sel => sel.id === p.id) && (
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
                    {pagedPlayers.map((p) => {
                        const cardBg = p.version === 'motm' ? getMotmCardBgByOverall(p.overall) : getCardBgByOverall(p.overall);

                        const isSelected = selected.some(sel => sel.id === p.id);
                        const cardHighlight = getCardHighlight({ assigned: false, selected: isSelected });
                        return (
                            <div
                                key={p.id || p.name}
                                className={[
                                    cardBg,
                                    "border rounded-xl shadow p-2 cursor-pointer transition-all duration-150",
                                    isSelected ? "hover:bg-blue-50" : "hover:bg-blue-50",
                                    cardHighlight,
                                    "min-w-[170px] max-w-[200px] w-full mx-auto"
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
                                            onClick={e => { e.stopPropagation(); removeFromCompare(p.id); }}
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
                                        <span>GK: {p.goalkeeping}</span>
                                    </div>
                                )}
                                <div className="text-sm font-bold">
                                    Overall: {p.overall}
                                    {p.version === 'motm' && (
                                        <span className='ml-1'>
                                            MOTM
                                            {p.motmDate && (
                                                <span className="ml-1 text-xs text-gray-600 font-normal">
                                                    ({p.motmDate})
                                                </span>
                                            )}
                                        </span>
                                    )}
                                </div>
                                {isSelected && (
                                    <div className="text-xs text-blue-700 font-semibold mt-1">Selected</div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
            <PageSelector />
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
// --- Stylized GalleryPage component ---

export default function App() {
    const [view, setView] = useState(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            return params.get("view") || localStorage.getItem("currentView") || "home";
        } catch {
            return "home";
        }
    });
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Update URL when view changes
    useEffect(() => {
        localStorage.setItem("currentView", view);
        const params = new URLSearchParams(window.location.search);
        params.set("view", view);
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.pushState({ view }, "", newUrl);
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
                    <div className="flex items-center gap-6">

                        <h1
                            className="font-bold transition-all duration-300 cursor-pointer text-xl"
                            style={{ letterSpacing: "0.02em" }}
                            onClick={() => setView("home")}
                        >
                            Grupi i Futbollit
                        </h1>
                    </div>
                    <div className="hidden sm:flex gap-4 text-lg">
                        <button className={`hover:underline ${view === "home" ? "font-bold text-blue-700" : ""}`} onClick={() => setView("home")}>Home</button>
                        <button className={`hover:underline ${view === "lineup" ? "font-bold text-blue-700" : ""}`} onClick={() => setView("lineup")}>Lineup Creator</button>
                        <button className={`hover:underline ${view === "database" ? "font-bold text-blue-700" : ""}`} onClick={() => setView("database")}>Player Database</button>
                        <button className={`hover:underline ${view === "cardcreator" ? "font-bold text-blue-700" : ""}`} onClick={() => setView("cardcreator")}>Card Creator</button>
                        <button className={`hover:underline ${view === "review" ? "font-bold text-blue-700" : ""}`} onClick={() => setView("review")}>Review & Request</button>
                        <button className={`hover:underline ${view === "motm" ? "font-bold text-blue-700" : ""}`} onClick={() => setView("motm")}>MOTM</button>
                        <button className={`hover:underline ${view === "gallery" ? "font-bold text-blue-700" : ""}`} onClick={() => setView("gallery")}>Gallery</button>
                    </div>
                </nav>
                {/* Mobile navigation */}
                <div className="flex sm:hidden gap-2 justify-center py-2 bg-white border-t border-gray-200">
                    <button className={`hover:underline ${view === "home" ? "font-bold text-blue-700" : ""}`} onClick={() => setView("home")}>Home</button>
                    <button className={`hover:underline ${view === "lineup" ? "font-bold text-blue-700" : ""}`} onClick={() => setView("lineup")}>Lineup</button>
                    <button className={`hover:underline ${view === "database" ? "font-bold text-blue-700" : ""}`} onClick={() => setView("database")}>Database</button>
                    <button className={`hover:underline ${view === "cardcreator" ? "font-bold text-blue-700" : ""}`} onClick={() => setView("cardcreator")}>Cards</button>
                    <button className={`hover:underline ${view === "review" ? "font-bold text-blue-700" : ""}`} onClick={() => setView("review")}>Review</button>
                    <button className={`hover:underline ${view === "motm" ? "font-bold text-blue-700" : ""}`} onClick={() => setView("motm")}>MOTM</button>
                    <button className={`hover:underline ${view === "gallery" ? "font-bold text-blue-700" : ""}`} onClick={() => setView("gallery")}>Gallery</button>
                </div>
            </header>
            <main className="container mx-auto p-4">
                {view === "home" && <Home />}
                {view === "lineup" && <LineupCreatorPage />}
                {view === "database" && <PlayerDatabase />}
                {view === "motm" && <MOTMPage />}
                {view === "cardcreator" && <CardCreatorPage />}
                {view === "review" && <ReviewAndRequestPage />}
                {view === "gallery" && <GalleryPage />}
            </main>
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
