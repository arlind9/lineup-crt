import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DndContext, closestCenter } from '@dnd-kit/core';

function DroppableTeam({ id, label, players, formation, onPlayerDrop }) {
    const formationMap = {
        "4-4-1": ["GK", "DF", "DF", "DF", "DF", "MF", "MF", "MF", "MF", "ST"],
        "4-3-2": ["GK", "DF", "DF", "DF", "DF", "MF", "MF", "MF", "ST", "ST"],
        "4-2-3": ["GK", "DF", "DF", "DF", "DF", "MF", "MF", "MF", "ST", "ST"],
        "5-2-2": ["GK", "DF", "DF", "DF", "DF", "DF", "MF", "MF", "ST", "ST"],
        "5-3-1": ["GK", "DF", "DF", "DF", "DF", "DF", "MF", "MF", "MF", "ST"],
        "3-3-3": ["GK", "DF", "DF", "DF", "MF", "MF", "MF", "ST", "ST", "ST"],
        "3-4-2": ["GK", "DF", "DF", "DF", "MF", "MF", "MF", "MF", "ST", "ST"],
        "3-5-1": ["GK", "DF", "DF", "DF", "MF", "MF", "MF", "MF", "MF", "ST"],
        "3-2-4": ["GK", "DF", "DF", "DF", "MF", "MF", "ST", "ST", "ST", "ST"]
    };

    const formationPositions = formationMap[formation] || formationMap["3-3-3"];

    const isPositionCompatible = (slotPos, playerPos) => {
        if (slotPos === "GK") return playerPos === "GK";
        if (slotPos === "DF") return playerPos === "DF";
        if (slotPos === "MF") return playerPos === "MF";
        if (slotPos === "ST") return playerPos === "ST";
        return false;
    };

    const avg = (key) => players.length ? Math.round(players.reduce((s, p) => s + (p?.[key] || 0), 0) / players.filter(Boolean).length) : 0;

    const lineup = formationPositions.map((pos, i) => {
        const player = players[i];
        return (
            <div
                key={i}
                className="border rounded p-2 text-xs text-center min-h-[72px] bg-white relative"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                    const data = JSON.parse(e.dataTransfer.getData("application/json"));
                    if (isPositionCompatible(pos, data.player.position)) {
                        onPlayerDrop({
                            toTeam: id,
                            toIndex: i,
                            fromTeam: data.fromTeam,
                            fromIndex: data.fromIndex,
                            player: data.player,
                        });
                    }
                }}
            >
                {player ? (
                    <>
                        <button
                            onClick={() => onPlayerDrop({
                                toTeam: id,
                                toIndex: i,
                                fromTeam: id,
                                fromIndex: i,
                                player: null,
                                remove: true
                            })}
                            className="absolute top-1 right-1 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-white border border-gray-300 text-xl font-bold text-red-500 hover:bg-red-100 hover:text-red-700 transition"
                            title="Remove"
                            tabIndex={0}
                            aria-label="Remove player"
                            type="button"
                        >
                            ×
                        </button>
                        <DraggablePlayer player={player} fromTeam={id} fromIndex={i} small />
                    </>
                ) : (
                    <div className="text-muted-foreground italic">{pos}</div>
                )}            </div>
        );
    });

    return (
        <div className="bg-muted p-4 rounded-xl min-h-[300px]">
            <h3 className="font-bold text-lg mb-4">{label} ({players.filter(Boolean).length}/10)</h3>
            <div className="grid grid-cols-3 gap-2 mb-4">
                {lineup}
            </div>
            {players.length > 0 && (
                <div className="text-sm space-y-1">
                    <p>Avg Overall: {avg("overall")}</p>
                    <p>
                        Speed: {avg("speed")}, Passing: {avg("passing")}, Shooting: {avg("shooting")}, Dribbling: {avg("dribbling")}
                    </p>
                    <p>
                        Physical: {avg("physical")}, Defending: {avg("defending")}, Weak Foot: {avg("weakFoot")}, Goalkeeping: {avg("goalkeeping")}
                    </p>
                </div>
            )}
        </div>
    );
}

function DraggablePlayer({ player, fromTeam, fromIndex, small }) {
    return (
        <Card
            className={
                "border border-gray-300 cursor-move space-y-1 " +
                (small
                    ? "p-1 text-xs min-h-0"
                    : "p-4 text-sm")
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
            <div className={small ? "font-semibold text-xs" : "font-semibold text-base"}>{player.name}</div>
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

    // Handles moving/removing players between/within teams
    const handlePlayerDrop = ({ toTeam, toIndex, fromTeam, fromIndex, player, remove }) => {
        let newTeamA = [...teamA];
        let newTeamB = [...teamB];

        // Remove player
        if (remove) {
            if (toTeam === "teamA") newTeamA[toIndex] = null;
            if (toTeam === "teamB") newTeamB[toIndex] = null;
        } else {
            // Remove from previous slot if present
            if (fromTeam === "teamA" && typeof fromIndex === "number") newTeamA[fromIndex] = null;
            if (fromTeam === "teamB" && typeof fromIndex === "number") newTeamB[fromIndex] = null;

            // Remove duplicate in target team
            if (toTeam === "teamA") newTeamA = newTeamA.map((p, idx) => (p && p.name === player.name && idx !== toIndex ? null : p));
            if (toTeam === "teamB") newTeamB = newTeamB.map((p, idx) => (p && p.name === player.name && idx !== toIndex ? null : p));

            // Place in new slot
            if (toTeam === "teamA") newTeamA[toIndex] = player;
            if (toTeam === "teamB") newTeamB[toIndex] = player;
        }

        setTeamA(newTeamA);
        setTeamB(newTeamB);
    };

    return (
        <div className="p-4 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold mb-4 text-center">FutBin-Style Player Ratings</h1>
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                <Input type="text" placeholder="Search players..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full md:w-1/2" />
                <Tabs value={positionFilter} onValueChange={setPositionFilter}>
                    <TabsList>
                        {["All", "ST", "MF", "DF", "GK"].map((pos) => (
                            <TabsTrigger key={pos} value={pos}>{pos}</TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="border p-2 rounded-md">
                    {["overall", "speed", "shooting", "passing", "dribbling", "physical", "defending"].map(key => (
                        <option key={key} value={key}>Sort by {key.charAt(0).toUpperCase() + key.slice(1)}</option>
                    ))}
                </select>
            </div>

            <div className="mb-4 flex flex-col md:flex-row gap-4">
                <div>
                    <label className="mr-2 font-medium">Team A Formation:</label>
                    <select value={formationA} onChange={(e) => setFormationA(e.target.value)} className="border p-2 rounded-md">
                        {["4-4-1", "4-3-2", "4-2-3", "5-2-2", "5-3-1", "3-3-3", "3-4-2", "3-5-1", "3-2-4"].map(f => (
                            <option key={f} value={f}>{f}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="mr-2 font-medium">Team B Formation:</label>
                    <select value={formationB} onChange={(e) => setFormationB(e.target.value)} className="border p-2 rounded-md">
                        {["4-4-1", "4-3-2", "4-2-3", "5-2-2", "5-3-1", "3-3-3", "3-4-2", "3-5-1", "3-2-4"].map(f => (
                            <option key={f} value={f}>{f}</option>
                        ))}
                    </select>
                </div>
            </div>

            <DndContext collisionDetection={closestCenter}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <DroppableTeam
                        id="teamA"
                        label="Team A"
                        players={teamA}
                        onPlayerDrop={handlePlayerDrop}
                        formation={formationA}
                    />
                    <DroppableTeam
                        id="teamB"
                        label="Team B"
                        players={teamB}
                        onPlayerDrop={handlePlayerDrop}
                        formation={formationB}
                    />
                </div>

                <h2 className="text-xl font-semibold mb-2">Available Players</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {filtered.map((p) => (
                        <DraggablePlayer key={p.name} player={p} fromTeam={null} fromIndex={null} />
                    ))}
                </div>
            </DndContext>
        </div>
    );
}