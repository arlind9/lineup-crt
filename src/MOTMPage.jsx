import React from 'react';
import Papa from 'papaparse';
import { calculateOverall } from './utils/overall';

const PLACEHOLDER_IMG = "https://ui-avatars.com/api/?name=Player&background=eee&color=888&size=128&rounded=true";

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
    const match = typeof cellValue === 'string' && cellValue.match(/=IMAGE\("([^"\)]+)"\)/i);
    return match ? match[1] : cellValue;
}

function getCardBgByOverall(overall) {
    if (overall >= 90) return 'bg-gradient-to-br from-[#e5e4e2] via-[#b3e0fc] to-[#f8fafc] border-blue-300';
    if (overall >= 80) return 'bg-gradient-to-br from-yellow-300 via-yellow-100 to-white border-yellow-400';
    if (overall >= 70) return 'bg-gradient-to-br from-gray-300 via-gray-100 to-white border-gray-400';
    return 'bg-gradient-to-br from-orange-200 via-yellow-50 to-white border-orange-300';
}

function getMotmCardBgByOverall(overall) {
    if (overall >= 90) return 'bg-gradient-to-br from-black via-[#89c9f8] to-[#cbeaff] border-blue-400';
    return 'bg-gradient-to-br from-black via-yellow-500 to-yellow-300 border-yellow-400';
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

    function getCardHighlight({ assigned, selected }) {
        if (assigned) return "ring-2 ring-green-400 ring-offset-2";
        if (selected) return "ring-2 ring-blue-400 ring-offset-2";
        return "";
    }

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
    function MotmStatsCard({ player, title, motm }) {
        if (!player) return (
            <div className="bg-gray-100 rounded-xl shadow p-4 border min-w-[220px] text-center text-gray-400">
                No data
            </div>
        );
        const isGK = player.position === "GK";
        const overall = calculateOverall(player);
        const cardBg = motm ? getMotmCardBgByOverall(overall) : getCardBgByOverall(overall);
        const photoUrl = player.photo
            ? player.photo
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name || "Player")}&background=eee&color=888&size=128&rounded=true`;
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
                    <MotmStatsCard player={before} title="Atributet Baze" motm={false} />
                    <MotmStatsCard player={latest} title="Atributet e javes" motm />
                </div>
            ) : (
                <div className="text-center text-red-600">No MOTM data found.</div>
            )}
        </div>
    );
}


function MotmBeforeAfterModal({ open, row, onClose }) {
    if (!open || !row) return null;

    // Card rendering logic (reuse from MotmStatsFeature)
    function MotmStatsCard({ player, title, motm }) {
        if (!player) return (
            <div className="bg-gray-100 rounded-xl shadow p-4 border min-w-[220px] text-center text-gray-400">
                No data
            </div>
        );
        const isGK = player.position === "GK";
        const overall = calculateOverall(player);
        const cardBg = motm ? getMotmCardBgByOverall(overall) : getCardBgByOverall(overall);
        const photoUrl = player.photo
            ? player.photo
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name || "Player")}&background=eee&color=888&size=128&rounded=true`;
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
                    <MotmStatsCard player={row.before} title="Atributet Baze" motm={false} />
                    <MotmStatsCard player={row.after} title="Atributet e javes" motm />
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


    function getCardHighlight({ assigned, selected }) {
        if (assigned) return "ring-2 ring-green-400 ring-offset-2";
        if (selected) return "ring-2 ring-blue-400 ring-offset-2";
        return "";
    }


    if (!stats.length) return null;

    return (
        <div className="my-8 w-full max-w-5xl mx-auto bg-blue-50 rounded-xl shadow p-6 border">
            <h2 className="text-xl font-bold mb-4 text-center text-blue-900">Te gjithe fituesit (Atributet jane te lojtarit ne javet perkatese, kliko karten e lojtarit per me shume)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {stats.map((row, idx) => {
                    const player = row.after;
                    const cardBg = getMotmCardBgByOverall(calculateOverall(player));
                    const photoUrl = player.photo
                        ? player.photo
                        : `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name || "Player")}&background=eee&color=888&size=128&rounded=true`; const isGK = player.position === "GK";
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
    const [playerPhotos, setPlayerPhotos] = React.useState({});

    React.useEffect(() => {
        return () => {
            setMotmStats([]);
            setData([]);
            setTopEarners([]);
            setShowAll(false);
            setShowAllEarners(false);
            setLoading(true);
        };
    }, []);

    // For all stats
    const [motmStats, setMotmStats] = React.useState([]);

    const formatDate = (input) => {
        const date = new Date(input);
        if (isNaN(date)) return input;
        return date.toLocaleDateString('en-GB');
    };

    React.useEffect(() => {
        fetch("https://docs.google.com/spreadsheets/d/1ooFfP_H35NlmBCqbKOfwDJQoxhgwfdC0LysBbo6NfTg/gviz/tq?tqx=out:json&sheet=Sheet1")
            .then(res => res.text())
            .then(text => {
                const json = JSON.parse(text.substring(47).slice(0, -2));
                const photos = {};
                json.table.rows.forEach(row => {
                    const cells = row.c;
                    const name = cells[0]?.v;
                    const photo = extractPhotoUrl(cells[12]?.v) || null;
                    if (name) photos[name] = photo;
                });
                setPlayerPhotos(photos);
            });
    }, []);

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
                            .map(r => {
                                const photo = playerPhotos[r.Player] || null;
                                return {
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
                                        photo, // Attach photo
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
                                        photo, // Attach photo
                                    }
                                };
                            });
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
    }, [playerPhotos]);

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


 


    <style>
    {`
    /* Gallery page container */
    .gallery-container {
        background: linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%);
        border-radius: 1.5rem;
        box-shadow: 0 4px 32px 0 rgba(60, 80, 180, 0.08);
        padding: 2rem 1rem 2.5rem 1rem;
        margin-bottom: 2rem;
        border: 1px solid #e0e7ef;
    }

    /* Gallery title */
    .gallery-title {
        font-size: 2.5rem;
        font-weight: 900;
        color: #3730a3;
        letter-spacing: 0.01em;
        margin-bottom: 2rem;
        text-shadow: 0 2px 8px #e0e7ff;
    }

    /* Gallery grid */
    .gallery-grid {
        gap: 2rem;
    }

    /* Gallery thumbnail */
    .gallery-thumb-outer {
        transition: transform 0.18s cubic-bezier(.4,2,.6,1), box-shadow 0.18s;
        box-shadow: 0 2px 12px 0 rgba(60, 80, 180, 0.07);
        border-radius: 1rem;
        background: #fff;
        border: 1.5px solid #e0e7ef;
        overflow: hidden;
        position: relative;
        cursor: pointer;
        animation: fadeIn 0.7s;
    }
    .gallery-thumb-outer:hover, .gallery-thumb-outer:focus {
        transform: scale(1.045) translateY(-2px);
        box-shadow: 0 6px 24px 0 rgba(60, 80, 180, 0.13);
        border-color: #a5b4fc;
        z-index: 2;
    }

    /* Modal styling */
    .gallery-modal {
        box-shadow: 0 8px 48px 0 rgba(60, 80, 180, 0.18);
        border-radius: 1.5rem;
        border: 2.5px solid #a5b4fc;
        background: #fff;
        padding: 2rem 1.5rem;
        animation: fadeIn 0.3s;
    }

    /* Fade-in animation */
    @keyframes fadeIn {
        from { opacity: 0; transform: scale(0.98);}
        to { opacity: 1; transform: scale(1);}
    }
    `}
    </style>

export default MOTMPage;
