import React, { useEffect, useState, useRef, useMemo } from "react";
import Papa from "papaparse";
import { calculateOverall } from "./utils/overall";
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

// --- All helper constants and functions used by LineupCreator ---
const glass = "backdrop-blur-md bg-white/80 shadow-lg border border-gray-200";
const PLACEHOLDER_IMG = "https://ui-avatars.com/api/?name=Player&background=eee&color=888&size=128&rounded=true";

const formationMap = {
    "2-2-1": ["GK", "DF", "DF", "MF", "MF", "ST"],
    "1-3-1": ["GK", "DF", "MF", "MF", "MF", "ST"],
    "2-1-2": ["GK", "DF", "DF", "MF", "ST", "ST"],
    "4-3-1": ["GK", "DF", "DF", "DF", "DF", "MF", "MF", "MF", "ST"],
    "3-4-1": ["GK", "DF", "DF", "DF", "MF", "MF", "MF", "MF", "ST"],
    "3-3-2": ["GK", "DF", "DF", "DF", "MF", "MF", "MF", "ST", "ST"],
    "4-2-2": ["GK", "DF", "DF", "DF", "DF", "MF", "MF", "ST", "ST"],
    "2-3-3": ["GK", "DF", "DF", "MF", "MF", "MF", "ST", "ST", "ST"],
    "3-2-3": ["GK", "DF", "DF", "DF", "MF", "MF", "ST", "ST", "ST"],
    "2-4-2": ["GK", "DF", "DF", "MF", "MF", "MF", "MF", "ST", "ST"],
    "4-3-2": ["GK", "DF", "DF", "DF", "DF", "MF", "MF", "MF", "ST", "ST"],
    "3-4-2": ["GK", "DF", "DF", "DF", "MF", "MF", "MF", "MF", "ST", "ST"],
    "3-3-3": ["GK", "DF", "DF", "DF", "MF", "MF", "MF", "ST", "ST", "ST"],
    "4-2-3": ["GK", "DF", "DF", "DF", "DF", "MF", "MF", "ST", "ST", "ST"],
    "5-2-2": ["GK", "DF", "DF", "DF", "DF", "DF", "MF", "MF", "ST", "ST"],
    "5-3-1": ["GK", "DF", "DF", "DF", "DF", "DF", "MF", "MF", "MF", "ST"],
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


function PlayerSelectModal({ open, onClose, players, onSelect, slotLabel, useMotm }) {
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

    // When MOTM view is enabled show all players so MOTM options are visible
    useEffect(() => {
        if (open && useMotm) {
            setShowAll(true);
        }
    }, [useMotm, open]);

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
                className={`w-full max-w-[95vw] sm:max-w-2xl bg-white rounded-xl shadow-xl border p-2 sm:p-4 ${glass} relative flex flex-col sm:flex-row gap-2 sm:gap-4`}
                style={{ minWidth: 0 }}
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
                    <div className="flex-1 max-h-[60vh] min-h-[120px] overflow-y-auto">
                        {visiblePlayers.length === 0 ? (
                            <div className="text-xs text-gray-400 p-2 text-center">No available players</div>
                        ) : (
                            visiblePlayers.map(p => {
                                const cardBg = p.version === 'motm' ? getMotmCardBgByOverall(p.overall) : getCardBgByOverall(p.overall);

                                return (
                                    <div
                                        key={p.id || p.name}
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
                                        <span className="text-gray-400 text-xs">OVR: {p.overall} {p.version === 'motm' && <strong>MOTM</strong>}</span>
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
                        <div className={`border rounded-lg p-2 text-xs shadow ${hoveredPlayer.version === 'motm' ? getMotmCardBgByOverall(hoveredPlayer.overall) : getCardBgByOverall(hoveredPlayer.overall)}`}>

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
                            <div className="text-center font-bold">Overall: {hoveredPlayer.overall} {hoveredPlayer.version === 'motm' && <span>MOTM</span>}</div>
                        </div>
                    )}
                </div>
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
    useMotm,
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
                !players.some((pl) => pl && (pl.id ? pl.id === p.id : pl.name === p.name))
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
                                            useMotm={useMotm}
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




function DraggablePlayer({ player, fromTeam, fromIndex, small, assigned, selected, onDragStart, onDragEnd, useMotm }) {
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

    const p = player;
    const imageUrl = p.photo ? p.photo : PLACEHOLDER_IMG;
    const cardBg = p.version === 'motm' ? getMotmCardBgByOverall(p.overall) : getCardBgByOverall(p.overall);

    const cardHighlight = getCardHighlight({ assigned, selected });

    return (
        <div ref={dragRef}>
            <Card
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
                        player: p,
                        fromTeam,
                        fromIndex
                    }));
                    if (onDragStart) onDragStart(p, fromTeam, fromIndex);
                }}
                onDragEnd={onDragEnd}
            >
                {/* Minimal card for mobile: only name and OVR */}
                <div className="block sm:hidden text-center">
                    <div className="font-semibold text-xs truncate">{p.name}</div>
                    <div className="text-xs font-bold">OVR: {p.overall}</div>
                </div>
                {/* Full card for desktop */}
                <div className="hidden sm:block">
                    <div className="flex justify-center mb-2">
                        <img
                            src={imageUrl}
                            alt={p.name}
                            className={small ? "w-10 h-10 rounded-full object-cover border" : "w-16 h-16 rounded-full object-cover border"}
                            style={{ background: "#eee" }}
                            loading="lazy"
                        />
                    </div>
                    <div className={small ? "font-semibold text-xs truncate" : "font-semibold text-base truncate"}>{p.name}</div>
                    <div className={small ? "text-[10px] text-muted-foreground" : "text-xs text-muted-foreground"}>{p.position}</div>
                    {!small && (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
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
                    <div className={small ? "text-xs font-bold pt-0" : "text-sm font-bold pt-1"}>Overall: {p.overall} {p.version === 'motm' && <span>MOTM</span>}</div>

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
        </div>
    );
}

function extractPhotoUrl(cellValue) {
    if (!cellValue) return null;
    const match = typeof cellValue === "string" && cellValue.match(/=IMAGE\("([^"]+)"\)/i);
    return match ? match[1] : cellValue;
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

function getCardBgByOverall(overall) {
    if (overall >= 90) return "bg-gradient-to-br from-[#e5e4e2] via-[#b3e0fc] to-[#f8fafc] border-blue-300"; // Platinum
    if (overall >= 80) return "bg-gradient-to-br from-yellow-300 via-yellow-100 to-white border-yellow-400"; // Gold
    if (overall >= 70) return "bg-gradient-to-br from-gray-300 via-gray-100 to-white border-gray-400"; // Silver
    return "bg-gradient-to-br from-orange-200 via-yellow-50 to-white border-orange-300"; // Bronze
}


function getMotmCardBgByOverall(overall) {
    if (overall >= 90) {
        // Black with stronger blue gradient
        return "bg-gradient-to-br from-black via-[#89c9f8] to-[#cbeaff] border-blue-400";
    }
    // Black with gold
    return "bg-gradient-to-br from-black via-yellow-500 to-yellow-300 border-yellow-400";
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
    const [useMotm, setUseMotm] = useState(false);

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
                    p && (p.id ? p.id === player.id : p.name === player.name) && idx !== toIndex ? null : p
                );
                newTeamA[toIndex] = player;
            }
            if (toTeam === "teamB") {
                newTeamB = newTeamB.map((p, idx) =>
                    p && (p.id ? p.id === player.id : p.name === player.name) && idx !== toIndex ? null : p
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

    const playersDisplay = useMemo(() => expandPlayersForMotm(players, useMotm), [players, useMotm]);
    const displayTeamA = teamA;
    const displayTeamB = teamB;


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

        const shuffledPlayers = shuffle(playersDisplay);

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
                <label className="ml-4 flex items-center text-sm font-semibold gap-1">
                    {/*<input type="checkbox" checked={useMotm} onChange={e => setUseMotm(e.target.checked)} />*/}
                    {/*MOTM*/}
                </label>
            </div>
            <h1 className="text-4xl font-extrabold mb-6 text-center text-green-900 drop-shadow">Lineup Creator A</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <DroppableTeam
                    id="teamA"
                    label="Team A"
                    players={displayTeamA}
                    onPlayerDrop={handlePlayerDrop}
                    formation={formationA}
                    onFormationChange={setFormationA}
                    allPlayers={playersDisplay}
                    useMotm={useMotm}
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
                    players={displayTeamB}
                    onPlayerDrop={handlePlayerDrop}
                    formation={formationB}
                    onFormationChange={setFormationB}
                    allPlayers={playersDisplay}
                    useMotm={useMotm}
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
                        teamAPlayers={displayTeamA}
                        teamBPlayers={displayTeamB}
                        teamALabel="Team A"
                        teamBLabel="Team B"
                        onHide={() => setShowComparison(false)}
                    />
                    <MirroredPositionOVRBarChart
                        teamAPlayers={displayTeamA}
                        teamBPlayers={displayTeamB}
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
                            useMotm={useMotm}
                        />
                    ) : null}
                </DragOverlay>

                <PlayerSelectModal
                    open={playerSelectModal.open}
                    onClose={() => setPlayerSelectModal({ open: false })}
                    players={playerSelectModal.eligiblePlayers || []}
                    onSelect={playerSelectModal.onSelect || (() => { })}
                    slotLabel={playerSelectModal.slotLabel}
                    useMotm={useMotm}
                />
            </DndContext>
        </div>
    );
}

export default function LineupCreatorPage() {
    return <LineupCreator />;
}