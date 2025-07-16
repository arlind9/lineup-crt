import React, { useState } from "react";

// --- Vibes FC Home Page ---
function VibesFCHome() {
    return (
        <main className="w-full max-w-2xl px-4 py-8 bg-white/10 rounded-2xl shadow-xl flex flex-col items-center">
            <h2 className="text-2xl font-bold mb-4 text-yellow-200">Welcome to Vibes FC!</h2>
            <p className="text-base text-blue-100 mb-6 text-center">
                This is the home of Vibes FC, your favorite Sunday League team. Stay tuned for squad info, fixtures, results, stats, and more!
            </p>
            <div className="mt-8 text-center text-blue-300 italic">
                More Vibes FC pages coming soon...
            </div>
        </main>
    );
}

// --- Sunday League Info Page ---
function VibesFCSundayLeague() {
    return (
        <main className="w-full max-w-2xl px-4 py-8 bg-white/10 rounded-2xl shadow-xl flex flex-col items-center">
            <h2 className="text-2xl font-bold mb-4 text-yellow-200">Sunday League</h2>
            <p className="text-base text-blue-100 mb-4 text-center">
                Vibes FC competes in the local Sunday League, bringing energy, passion, and good vibes to every match!
            </p>
            <ul className="text-blue-200 text-base mb-4 list-disc pl-6">
                <li>Weekly matches every Sunday</li>
                <li>Friendly and competitive spirit</li>
                <li>All skill levels welcome</li>
            </ul>
            <div className="mt-8 text-center text-blue-300 italic">
                Fixtures, results, and league table coming soon!
            </div>
        </main>
    );
}

// --- Players Page ---
function VibesFCPlayers() {
    // Placeholder players
    const players = [
        { name: "John Doe", position: "Forward", number: 9 },
        { name: "Alex Smith", position: "Midfielder", number: 8 },
        { name: "Sam Lee", position: "Defender", number: 5 },
        { name: "Chris Kim", position: "Goalkeeper", number: 1 }
    ];
    return (
        <main className="w-full max-w-2xl px-4 py-8 bg-white/10 rounded-2xl shadow-xl flex flex-col items-center">
            <h2 className="text-2xl font-bold mb-4 text-yellow-200">Squad</h2>
            <table className="w-full text-blue-100 bg-white/5 rounded-lg shadow mb-4">
                <thead>
                    <tr>
                        <th className="p-2 text-left">#</th>
                        <th className="p-2 text-left">Name</th>
                        <th className="p-2 text-left">Position</th>
                    </tr>
                </thead>
                <tbody>
                    {players.map((p, i) => (
                        <tr key={i} className="border-b border-blue-900/30">
                            <td className="p-2">{p.number}</td>
                            <td className="p-2">{p.name}</td>
                            <td className="p-2">{p.position}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="mt-8 text-center text-blue-300 italic">
                Full player profiles coming soon!
            </div>
        </main>
    );
}

// --- Kit Kreator Page ---
function VibesFCKitKreator() {
    // Simple kit color selector (placeholder)
    const [primary, setPrimary] = useState("#facc15");
    const [secondary, setSecondary] = useState("#1e293b");
    return (
        <main className="w-full max-w-2xl px-4 py-8 bg-white/10 rounded-2xl shadow-xl flex flex-col items-center">
            <h2 className="text-2xl font-bold mb-4 text-yellow-200">Kit Kreator</h2>
            <div className="flex flex-col items-center gap-4 mb-6">
                <label className="flex items-center gap-2">
                    <span className="text-blue-100">Primary Color:</span>
                    <input type="color" value={primary} onChange={e => setPrimary(e.target.value)} />
                </label>
                <label className="flex items-center gap-2">
                    <span className="text-blue-100">Secondary Color:</span>
                    <input type="color" value={secondary} onChange={e => setSecondary(e.target.value)} />
                </label>
            </div>
            <div className="flex flex-col items-center">
                <div
                    className="w-32 h-40 rounded-xl shadow-lg border-4 mb-2"
                    style={{
                        background: `linear-gradient(135deg, ${primary} 60%, ${secondary} 100%)`,
                        borderColor: secondary
                    }}
                />
                <span className="text-blue-200">Preview</span>
            </div>
            <div className="mt-8 text-center text-blue-300 italic">
                More kit customization options coming soon!
            </div>
        </main>
    );
}

// --- Main Vibes FC Page with App-style Top Navigation ---
export default function VibesFCPage() {
    const [tab, setTab] = useState("home");

    const navItems = [
        { key: "home", label: "Home" },
        { key: "sunday", label: "Sunday League" },
        { key: "players", label: "Players" },
        { key: "kit", label: "Kit Kreator" }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] text-white flex flex-col items-center justify-center relative">
            {/* Header with top-right nav */}
            <header className="w-full py-8 flex flex-col items-center relative">
                <h1 className="text-4xl font-extrabold tracking-widest mb-2 text-yellow-300 drop-shadow-lg">Vibes FC</h1>
                <p className="text-lg text-blue-200 font-medium">Sunday League Football Club</p>
                {/* Top-right navigation */}
                <nav className="absolute top-4 right-8 flex gap-2 sm:gap-4">
                    {navItems.map(item => (
                        <button
                            key={item.key}
                            className={`px-4 py-2 rounded-full font-bold transition-all duration-200 ${
                                tab === item.key
                                    ? "bg-yellow-300 text-[#1a1a2e] shadow-lg"
                                    : "bg-white/10 text-yellow-100 hover:bg-yellow-200/30"
                            }`}
                            onClick={() => setTab(item.key)}
                        >
                            {item.label}
                        </button>
                    ))}
                </nav>
            </header>
            {/* Page content */}
            <div className="flex-1 w-full flex flex-col items-center justify-center">
                {tab === "home" && <VibesFCHome />}
                {tab === "sunday" && <VibesFCSundayLeague />}
                {tab === "players" && <VibesFCPlayers />}
                {tab === "kit" && <VibesFCKitKreator />}
            </div>
        </div>
    );
}