import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

const PLACEHOLDER_IMG = "https://ui-avatars.com/api/?name=Player&background=eee&color=888&size=128&rounded=true";

function extractPhotoUrl(cellValue) {
    if (!cellValue) return null;
    const match = typeof cellValue === "string" && cellValue.match(/=IMAGE\("([^"]+)"\)/i);
    return match ? match[1] : cellValue;
}

function getPositionColorClasses(position) {
    switch (position) {
        case "ST":
            return "bg-red-100 border-red-400";
        case "MF":
            return "bg-green-100 border-green-400";
        case "DF":
            return "bg-blue-100 border-blue-400";
        case "GK":
            return "bg-yellow-100 border-yellow-400";
        default:
            return "bg-gray-50 border-gray-300";
    }
}

function calculateOverall(player) {
    const { position, speed = 0, shooting = 0, passing = 0, dribbling = 0, physical = 0, defending = 0, goalkeeping = 0, weakFoot = 0 } = player || {};

    switch (position) {
        case "ST": // Striker
            return Math.round(
                speed * 0.25 +
                shooting * 0.3 +
                passing * 0.1 +
                dribbling * 0.15 +
                physical * 0.1 +
                defending * 0.1 +
                weakFoot * 0.1
            );
        case "MF": // Midfielder
            return Math.round(
                speed * 0.2 +
                shooting * 0.2 +
                passing * 0.25 +
                dribbling * 0.2 +
                physical * 0.1 +
                defending * 0.1 +
                weakFoot * 0.05
            );
        case "DF": // Defender
            return Math.round(
                speed * 0.1 +
                shooting * 0.05 +
                passing * 0.15 +
                dribbling * 0.05 +
                physical * 0.2 +
                defending * 0.45 +
                weakFoot * 0.03
            );
        case "GK": // Goalkeeper
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

function getCardBgByOverall(overall) {
    if (overall >= 90) return "bg-gradient-to-br from-[#e5e4e2] via-[#b3e0fc] to-[#f8fafc] border-blue-300"; // Platinum
    if (overall >= 80) return "bg-gradient-to-br from-yellow-300 via-yellow-100 to-white border-yellow-400"; // Gold
    if (overall >= 70) return "bg-gradient-to-br from-gray-300 via-gray-100 to-white border-gray-400"; // Silver
    return "bg-gradient-to-br from-orange-200 via-yellow-50 to-white border-orange-300"; // Bronze
}

export default function ReviewAndRequestPage() {
    const [players, setPlayers] = useState([]);
    const [search, setSearch] = useState("");
    const [showRequestForm, setShowRequestForm] = useState(false);
    const [request, setRequest] = useState({
        reviewer_name: "",
        player: "",
        position: "ST",
        speed: "",
        shooting: "",
        passing: "",
        dribbling: "",
        physical: "",
        defending: "",
        goalkeeping: "",
        preferredFoot: "",
        weakFoot: "",
        review_text: "",
    });
    const [submitted, setSubmitted] = useState(false);
    const [reviewingPlayer, setReviewingPlayer] = useState(null);
    const [reviewText, setReviewText] = useState("");
    const [reviewSubmitted, setReviewSubmitted] = useState(false);
    const [reviewerName, setReviewerName] = useState("");

    useEffect(() => {
        fetch("https://docs.google.com/spreadsheets/d/1ooFfP_H35NlmBCqbKOfwDJQoxhgwfdC0LysBbo6NfTg/gviz/tq?tqx=out:json&sheet=Sheet1")
            .then((res) => res.text())
            .then((text) => {
                const json = JSON.parse(text.substring(47).slice(0, -2));
                const rows = json.table.rows.map((row) => {
                    const cells = row.c;
                    return {
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
                });
                setPlayers(rows);
            });
    }, []);

    function handleRequestChange(e) {
        const { name, value } = e.target;
        setRequest((prev) => ({ ...prev, [name]: value }));
    }

    function handleRequestSubmit(e) {
        e.preventDefault();

        if (!request.reviewer_name.trim() || !request.player.trim()) {
            alert("Please enter your name and the player's name.");
            return;
        }

        const requestData = {
            Reviewer_name: request.reviewer_name,
            Player: request.player,
            Position: request.position,
            Speed: request.speed,
            Shooting: request.shooting,
            Passing: request.passing,
            Dribbling: request.dribbling,
            Physical: request.physical,
            Defending: request.defending,
            Goalkeeping: request.goalkeeping,
            "Preferred Foot": request.preferredFoot,
            "Weak Foot": request.weakFoot,
            review_text: request.review_text,
        };

        fetch("https://sheetdb.io/api/v1/qp88ee4m90ict", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ data: [requestData] }),
        })
        .then((res) => {
            if (!res.ok) throw new Error("Failed to submit request");
            setSubmitted(true);
        })
        .catch(() => {
            alert("There was an error submitting your request. Please try again.");
        });
    }

    function handlePlayerCardClick(player) {
        setReviewingPlayer(player);
        setReviewText("");
        setReviewSubmitted(false);
    }

    function handleReviewSubmit(e) {
        e.preventDefault();

        if (!reviewerName.trim()) {
            alert("Please enter your name.");
            return;
        }

        const reviewData = {
            Reviewer_name: reviewerName,
            Player: reviewingPlayer.name,
            Position: reviewingPlayer.position,
            Speed: reviewingPlayer._review_speed ?? "",
            Shooting: reviewingPlayer._review_shooting ?? "",
            Passing: reviewingPlayer._review_passing ?? "",
            Dribbling: reviewingPlayer._review_dribbling ?? "",
            Physical: reviewingPlayer._review_physical ?? "",
            Defending: reviewingPlayer._review_defending ?? "",
            Goalkeeping: reviewingPlayer._review_goalkeeping ?? "",
            "Preferred Foot": "", // Optional, leave blank or add input if needed
            "Weak Foot": reviewingPlayer._review_weakFoot ?? "",
            review_text: reviewText ?? "",
        };

        fetch("https://sheetdb.io/api/v1/qp88ee4m90ict", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ data: [reviewData] }),
        })
        .then((res) => {
            if (!res.ok) throw new Error("Failed to submit review");
            setReviewSubmitted(true);
        })
        .catch(() => {
            alert("There was an error submitting your review. Please try again.");
        });
    }

    const filteredPlayers = players.filter((p) =>
        p.name?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow p-6 border mt-8 mb-8">
            <h1 className="text-2xl font-bold mb-4 text-center text-green-900">Review Player Attributes</h1>
            <div className="mb-4 flex flex-col sm:flex-row gap-2 items-center">
                <Input
                    type="text"
                    placeholder="Search players..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-64"
                />
                <button
                    className="ml-auto px-4 py-2 rounded bg-blue-500 text-white font-semibold hover:bg-blue-600 transition"
                    onClick={() => setShowRequestForm(true)}
                    type="button"
                >
                    + Request New Player
                </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredPlayers.map((p, idx) => {
                    const overall = calculateOverall(p);
                    return (
                        <div
                            key={idx}
                            className={`border rounded-lg p-3 shadow flex gap-3 items-center cursor-pointer hover:bg-blue-50 transition ${getCardBgByOverall(overall)}`}
                            onClick={() => handlePlayerCardClick(p)}
                            tabIndex={0}
                            role="button"
                            aria-label={`Leave a review for ${p.name}`}
                        >
                            <img
                                src={p.photo || PLACEHOLDER_IMG}
                                alt={p.name}
                                className="w-12 h-12 rounded-full object-cover border"
                                style={{ background: "#eee" }}
                                loading="lazy"
                            />
                            <div>
                                <div className="font-bold">{p.name}</div>
                                <div className="text-xs text-gray-500 mb-1">{p.position}</div>
                                <div className="text-xs grid grid-cols-2 gap-x-2">
                                    <span>Speed: {p.speed}</span>
                                    <span>Shooting: {p.shooting}</span>
                                    <span>Passing: {p.passing}</span>
                                    <span>Dribbling: {p.dribbling}</span>
                                    <span>Physical: {p.physical}</span>
                                    <span>Defending: {p.defending}</span>
                                    <span>Weak Foot: {p.weakFoot}</span>
                                    <span>GK: {p.goalkeeping}</span>
                                    <span className="col-span-2 font-semibold text-sm mt-1">Overall: {overall}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            {/* Review Modal */}
            {reviewingPlayer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                    <div className="bg-white rounded-xl shadow-xl border p-2 max-w-2xl w-full relative">
                        <button
                            className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-lg font-bold"
                            onClick={() => setReviewingPlayer(null)}
                            aria-label="Close"
                            type="button"
                        >×</button>
                        <h2 className="text-lg font-bold mb-2 text-center text-blue-900">
                            Leave a Review for {reviewingPlayer.name}
                        </h2>
                        {reviewSubmitted ? (
                            <div className="text-green-700 text-center font-semibold py-8">
                                Thank you! Your review has been submitted.
                            </div>
                        ) : (
                            <form onSubmit={handleReviewSubmit} className="space-y-2">
                                <div className="mb-2">
                                    <label className="block font-semibold mb-1">Your Name</label>
                                    <Input
                                        type="text"
                                        value={reviewerName}
                                        onChange={e => setReviewerName(e.target.value)}
                                        required
                                        placeholder="Enter your name"
                                    />
                                </div>
                                <div className="flex flex-col md:flex-row gap-0 justify-center items-stretch">
                                    {/* Original Attributes Card */}
                                    <div className={`flex-1 border-r md:border-r-2 border-gray-200 p-3 flex flex-col bg-gray-50 ${getCardBgByOverall(calculateOverall(reviewingPlayer))}`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <img
                                                src={reviewingPlayer.photo || PLACEHOLDER_IMG}
                                                alt={reviewingPlayer.name}
                                                className="w-10 h-10 rounded-full object-cover border"
                                                style={{ background: "#eee" }}
                                            />
                                            <div>
                                                <div className="font-semibold text-base">{reviewingPlayer.name}</div>
                                                <div className="text-xs text-gray-500">{reviewingPlayer.position}</div>
                                            </div>
                                        </div>
                                        <div className="text-xs">
                                            <div className="grid grid-cols-2 gap-y-1">
                                                <span className="text-gray-600">Speed:</span>
                                                <span className="font-semibold text-right">{reviewingPlayer.speed}</span>
                                                <span className="text-gray-600">Shooting:</span>
                                                <span className="font-semibold text-right">{reviewingPlayer.shooting}</span>
                                                <span className="text-gray-600">Passing:</span>
                                                <span className="font-semibold text-right">{reviewingPlayer.passing}</span>
                                                <span className="text-gray-600">Dribbling:</span>
                                                <span className="font-semibold text-right">{reviewingPlayer.dribbling}</span>
                                                <span className="text-gray-600">Physical:</span>
                                                <span className="font-semibold text-right">{reviewingPlayer.physical}</span>
                                                <span className="text-gray-600">Defending:</span>
                                                <span className="font-semibold text-right">{reviewingPlayer.defending}</span>
                                                <span className="text-gray-600">Weak Foot:</span>
                                                <span className="font-semibold text-right">{reviewingPlayer.weakFoot}</span>
                                                <span className="text-gray-600">GK:</span>
                                                <span className="font-semibold text-right">{reviewingPlayer.goalkeeping}</span>
                                            </div>
                                            <div className="text-center font-bold text-sm mt-2">
                                                Overall: {calculateOverall(reviewingPlayer)}
                                            </div>
                                        </div>
                                    </div>
                                    {/* Divider */}
                                    <div className="hidden md:block w-px bg-gray-200 mx-0"></div>
                                    {/* Reviewer Input Card */}
                                    <div className="flex-1 p-3 flex flex-col bg-white">
                                        <div className="font-semibold mb-2 text-base text-center">Your Attribute Ratings</div>
                                        <div className="grid grid-cols-2 gap-y-1 text-xs">
                                            <label className="flex items-center gap-1">
                                                <span className="w-16 text-gray-600">Speed:</span>
                                                <Input
                                                    type="number"
                                                    min={45}
                                                    max={99}
                                                    step={1}
                                                    value={reviewingPlayer._review_speed ?? ""}
                                                    onChange={e => setReviewingPlayer(prev => ({ ...prev, _review_speed: e.target.value }))}
                                                    className="py-1 px-1 text-xs w-14"
                                                />
                                            </label>
                                            <label className="flex items-center gap-1">
                                                <span className="w-16 text-gray-600">Shooting:</span>
                                                <Input
                                                    type="number"
                                                    min={45}
                                                    max={99}
                                                    step={1}
                                                    value={reviewingPlayer._review_shooting ?? ""}
                                                    onChange={e => setReviewingPlayer(prev => ({ ...prev, _review_shooting: e.target.value }))}
                                                    className="py-1 px-1 text-xs w-14"
                                                />
                                            </label>
                                            <label className="flex items-center gap-1">
                                                <span className="w-16 text-gray-600">Passing:</span>
                                                <Input
                                                    type="number"
                                                    min={45}
                                                    max={99}
                                                    step={1}
                                                    value={reviewingPlayer._review_passing ?? ""}
                                                    onChange={e => setReviewingPlayer(prev => ({ ...prev, _review_passing: e.target.value }))}
                                                    className="py-1 px-1 text-xs w-14"
                                                />
                                            </label>
                                            <label className="flex items-center gap-1">
                                                <span className="w-16 text-gray-600">Dribbling:</span>
                                                <Input
                                                    type="number"
                                                    min={45}
                                                    max={99}
                                                    step={1}
                                                    value={reviewingPlayer._review_dribbling ?? ""}
                                                    onChange={e => setReviewingPlayer(prev => ({ ...prev, _review_dribbling: e.target.value }))}
                                                    className="py-1 px-1 text-xs w-14"
                                                />
                                            </label>
                                            <label className="flex items-center gap-1">
                                                <span className="w-16 text-gray-600">Physical:</span>
                                                <Input
                                                    type="number"
                                                    min={45}
                                                    max={99}
                                                    step={1}
                                                    value={reviewingPlayer._review_physical ?? ""}
                                                    onChange={e => setReviewingPlayer(prev => ({ ...prev, _review_physical: e.target.value }))}
                                                    className="py-1 px-1 text-xs w-14"
                                                />
                                            </label>
                                            <label className="flex items-center gap-1">
                                                <span className="w-16 text-gray-600">Defending:</span>
                                                <Input
                                                    type="number"
                                                    min={45}
                                                    max={99}
                                                    step={1}
                                                    value={reviewingPlayer._review_defending ?? ""}
                                                    onChange={e => setReviewingPlayer(prev => ({ ...prev, _review_defending: e.target.value }))}
                                                    className="py-1 px-1 text-xs w-14"
                                                />
                                            </label>
                                            <label className="flex items-center gap-1">
                                                <span className="w-16 text-gray-600">Weak Foot:</span>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={50}
                                                    step={10}
                                                    value={reviewingPlayer._review_weakFoot ?? ""}
                                                    onChange={e => setReviewingPlayer(prev => ({ ...prev, _review_weakFoot: e.target.value }))}
                                                    className="py-1 px-1 text-xs w-14"
                                                />
                                            </label>
                                            <label className="flex items-center gap-1">
                                                <span className="w-16 text-gray-600">GK:</span>
                                                <Input
                                                    type="number"
                                                    min={45}
                                                    max={99}
                                                    step={1}
                                                    value={reviewingPlayer._review_goalkeeping ?? ""}
                                                    onChange={e => setReviewingPlayer(prev => ({ ...prev, _review_goalkeeping: e.target.value }))}
                                                    className="py-1 px-1 text-xs w-14"
                                                />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-2">
                                    <label className="block font-semibold mb-1">Your Review <span className="text-gray-400 font-normal">(optional)</span></label>
                                    <textarea
                                        value={reviewText}
                                        onChange={e => setReviewText(e.target.value)}
                                        className="border rounded px-2 py-1 w-full text-sm"
                                        placeholder="Write your review here..."
                                    />
                                </div>
                                <div className="flex gap-2 mt-2 justify-end">
                                    <button
                                        type="submit"
                                        className="px-4 py-2 rounded bg-blue-500 text-white font-semibold hover:bg-blue-600 transition"
                                    >
                                        Submit Review
                                    </button>
                                    <button
                                        type="button"
                                        className="px-4 py-2 rounded bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition"
                                        onClick={() => setReviewingPlayer(null)}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
            {/* Request Form Modal */}
            {showRequestForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                    <div className="bg-white rounded-xl shadow-xl border p-6 max-w-2xl w-full relative">
                        <button
                            className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-lg font-bold"
                            onClick={() => { setShowRequestForm(false); setSubmitted(false); }}
                            aria-label="Close"
                            type="button"
                        >×</button>
                        <h2 className="text-lg font-bold mb-2 text-center text-blue-900">Request New Player Addition</h2>
                        {submitted ? (
                            <div className="text-green-700 text-center font-semibold py-8">
                                Thank you! Your request has been submitted.
                            </div>
                        ) : (
                            <form onSubmit={handleRequestSubmit} className="space-y-3">
                                <div className="mb-2">
                                    <label className="block font-semibold mb-1">Your Name</label>
                                    <Input
                                        name="reviewer_name"
                                        value={request.reviewer_name}
                                        onChange={handleRequestChange}
                                        required
                                        placeholder="Your name"
                                    />
                                </div>
                                <div className="mb-2">
                                    <label className="block font-semibold mb-1">Player Name</label>
                                    <Input
                                        name="player"
                                        value={request.player}
                                        onChange={handleRequestChange}
                                        required
                                        placeholder="Full name"
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 mb-2">
                                    <div>
                                        <label className="block text-xs font-semibold mb-1">Position</label>
                                        <select
                                            name="position"
                                            value={request.position}
                                            onChange={handleRequestChange}
                                            className="border rounded px-2 py-1 w-full"
                                        >
                                            <option value="ST">ST</option>
                                            <option value="MF">MF</option>
                                            <option value="DF">DF</option>
                                            <option value="GK">GK</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold mb-1">Speed</label>
                                        <Input
                                            name="speed"
                                            type="number"
                                            min={0}
                                            max={99}
                                            value={request.speed}
                                            onChange={handleRequestChange}
                                            className="w-full"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold mb-1">Shooting</label>
                                        <Input
                                            name="shooting"
                                            type="number"
                                            min={0}
                                            max={99}
                                            value={request.shooting}
                                            onChange={handleRequestChange}
                                            className="w-full"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold mb-1">Passing</label>
                                        <Input
                                            name="passing"
                                            type="number"
                                            min={0}
                                            max={99}
                                            value={request.passing}
                                            onChange={handleRequestChange}
                                            className="w-full"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold mb-1">Dribbling</label>
                                        <Input
                                            name="dribbling"
                                            type="number"
                                            min={0}
                                            max={99}
                                            value={request.dribbling}
                                            onChange={handleRequestChange}
                                            className="w-full"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold mb-1">Physical</label>
                                        <Input
                                            name="physical"
                                            type="number"
                                            min={0}
                                            max={99}
                                            value={request.physical}
                                            onChange={handleRequestChange}
                                            className="w-full"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold mb-1">Defending</label>
                                        <Input
                                            name="defending"
                                            type="number"
                                            min={0}
                                            max={99}
                                            value={request.defending}
                                            onChange={handleRequestChange}
                                            className="w-full"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold mb-1">Goalkeeping</label>
                                        <Input
                                            name="goalkeeping"
                                            type="number"
                                            min={0}
                                            max={99}
                                            value={request.goalkeeping}
                                            onChange={handleRequestChange}
                                            className="w-full"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold mb-1">Preferred Foot</label>
                                        <select
                                            name="preferredFoot"
                                            value={request.preferredFoot}
                                            onChange={handleRequestChange}
                                            className="border rounded px-2 py-1 w-full"
                                        >
                                            <option value="">-</option>
                                            <option value="Right">Right</option>
                                            <option value="Left">Left</option>
                                            <option value="Both">Both</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold mb-1">Weak Foot</label>
                                            <Input
                                                name="weakFoot"
                                                type="number"
                                                min={0}
                                                max={50}
                                                step={10}
                                                value={request.weakFoot}
                                                onChange={handleRequestChange}
                                                className="w-full"
                                            />
                                    </div>
                                </div>
                                <div>
                                    <label className="block font-semibold mb-1">Notes (optional)</label>
                                    <textarea
                                        name="review_text"
                                        value={request.review_text}
                                        onChange={handleRequestChange}
                                        className="border rounded px-2 py-1 w-full"
                                        placeholder="Any extra info (e.g. phone, who is requesting, etc)"
                                    />
                                </div>
                                <div className="flex gap-2 mt-2">
                                    <button
                                        type="submit"
                                        className="px-4 py-2 rounded bg-blue-500 text-white font-semibold hover:bg-blue-600 transition"
                                    >
                                        Submit Request
                                    </button>
                                    <button
                                        type="button"
                                        className="px-4 py-2 rounded bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition"
                                        onClick={() => setShowRequestForm(false)}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}