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
        speed: 70,
        shooting: 70,
        passing: 70,
        dribbling: 70,
        physical: 70,
        defending: 70,
        goalkeeping: 70,
        preferredFoot: "",
        weakFoot: 30,
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

    function handleAttributeChange(name, value, min, max, step = 1) {
        let v = Number(value);
        if (isNaN(v)) v = min;
        v = Math.max(min, Math.min(max, v));
        if (name === "weakFoot") v = Math.round(v / step) * step;
        setRequest((prev) => ({ ...prev, [name]: v }));
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

    function handleOverlayClick(e, closeFn) {
        if (e.target === e.currentTarget) {
            closeFn();
        }
    }

    const filteredPlayers = players.filter((p) =>
        p.name?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow p-2 sm:p-6 border mt-4 sm:mt-8 mb-4 sm:mb-8">
            <h1 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-center text-green-900">Review Player Attributes</h1>
            <div className="mb-3 sm:mb-4 flex flex-col sm:flex-row gap-2 items-center">
                <Input
                    type="text"
                    placeholder="Search players..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full sm:w-64"
                />
                <button
                    className="w-full sm:w-auto ml-0 sm:ml-auto px-4 py-2 rounded bg-blue-500 text-white font-semibold hover:bg-blue-600 transition"
                    onClick={() => setShowRequestForm(true)}
                    type="button"
                >
                    + Request New Player
                </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {filteredPlayers.map((p, idx) => {
                    const overall = calculateOverall(p);
                    return (
                        <div
                            key={idx}
                            className={`border rounded-lg p-2 sm:p-3 shadow flex flex-col sm:flex-row gap-2 sm:gap-3 items-center cursor-pointer hover:bg-blue-50 transition ${getCardBgByOverall(overall)}`}
                            onClick={() => handlePlayerCardClick(p)}
                            tabIndex={0}
                            role="button"
                            aria-label={`Leave a review for ${p.name}`}
                        >
                            <img
                                src={p.photo || PLACEHOLDER_IMG}
                                alt={p.name}
                                className="w-16 h-16 sm:w-12 sm:h-12 rounded-full object-cover border"
                                style={{ background: "#eee" }}
                                loading="lazy"
                            />
                            <div className="w-full">
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
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-2"
                    onClick={e => handleOverlayClick(e, () => setReviewingPlayer(null))}
                >
                    <div
                        className="bg-white rounded-xl shadow-xl border w-full max-w-lg relative flex flex-col h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[90vh] overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Sticky header for close button */}
                        <div className="sticky top-0 bg-white z-10 flex justify-end p-2 border-b">
                            <button
                                className="text-gray-400 hover:text-gray-700 text-lg font-bold flex items-center justify-center"
                                onClick={() => setReviewingPlayer(null)}
                                aria-label="Close"
                                type="button"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <line x1="18" y1="6" x2="6" y2="18" strokeWidth="2" strokeLinecap="round" />
                                    <line x1="6" y1="6" x2="18" y2="18" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                            </button>
                        </div>
                        <div className="overflow-y-auto p-2 sm:p-4 flex-1">
                            <h2 className="text-base sm:text-lg font-bold mb-2 text-center text-blue-900">
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
                                    <div className="flex flex-col md:flex-row gap-2 justify-center items-stretch">
                                        {/* Original Attributes Card */}
                                        <div
                                            className={`flex-1 flex flex-col items-center justify-start rounded-xl border shadow-sm p-3 mb-2 ${getCardBgByOverall(calculateOverall(reviewingPlayer))}`}
                                            style={{ minWidth: 0 }}
                                        >
                                            <img
                                                src={reviewingPlayer.photo || PLACEHOLDER_IMG}
                                                alt={reviewingPlayer.name}
                                                className="w-20 h-20 rounded-full object-cover border border-gray-200 mb-2 bg-gray-100"
                                                style={{ background: "#f3f3f3" }}
                                            />
                                            <div className="w-full text-center">
                                                <div className="font-bold text-base text-gray-900">{reviewingPlayer.name}</div>
                                                <div className="text-sm text-gray-600 mb-2">{reviewingPlayer.position}</div>
                                            </div>
                                            <div className="w-full grid grid-cols-2 gap-y-1 text-sm mb-2">
                                                <span className="text-gray-700">Speed: {reviewingPlayer.speed}</span>
                                                <span className="text-gray-700">Shooting: {reviewingPlayer.shooting}</span>
                                                <span className="text-gray-700">Passing: {reviewingPlayer.passing}</span>
                                                <span className="text-gray-700">Dribbling: {reviewingPlayer.dribbling}</span>
                                                <span className="text-gray-700">Physical: {reviewingPlayer.physical}</span>
                                                <span className="text-gray-700">Defending: {reviewingPlayer.defending}</span>
                                                <span className="text-gray-700">Weak Foot: {reviewingPlayer.weakFoot}</span>
                                                <span className="text-gray-700">GK: {reviewingPlayer.goalkeeping}</span>
                                            </div>
                                            <div className="w-full text-left font-bold text-lg mt-1">
                                                <span
                                                    className={
                                                        calculateOverall(reviewingPlayer) >= 90
                                                            ? "text-blue-700"
                                                            : calculateOverall(reviewingPlayer) >= 80
                                                            ? "text-yellow-700"
                                                            : calculateOverall(reviewingPlayer) >= 70
                                                            ? "text-gray-700"
                                                            : "text-orange-700"
                                                    }
                                                >
                                                    Overall: {calculateOverall(reviewingPlayer)}
                                                </span>
                                            </div>
                                        </div>
                                        {/* Divider */}
                                        <div className="hidden md:block w-px bg-gray-200 mx-0"></div>
                                        {/* Reviewer Input Card */}
                                        <div
                                            className={`flex-1 flex flex-col items-center justify-start rounded-xl border shadow-sm p-3 mb-2 ${getCardBgByOverall(
                                                calculateOverall({
                                                    ...reviewingPlayer,
                                                    speed: Number(reviewingPlayer._review_speed ?? reviewingPlayer.speed),
                                                    shooting: Number(reviewingPlayer._review_shooting ?? reviewingPlayer.shooting),
                                                    passing: Number(reviewingPlayer._review_passing ?? reviewingPlayer.passing),
                                                    dribbling: Number(reviewingPlayer._review_dribbling ?? reviewingPlayer.dribbling),
                                                    physical: Number(reviewingPlayer._review_physical ?? reviewingPlayer.physical),
                                                    defending: Number(reviewingPlayer._review_defending ?? reviewingPlayer.defending),
                                                    goalkeeping: Number(reviewingPlayer._review_goalkeeping ?? reviewingPlayer.goalkeeping),
                                                    weakFoot: Number(reviewingPlayer._review_weakFoot ?? reviewingPlayer.weakFoot),
                                                })
                                            )}`}
                                            style={{ minWidth: 0 }}
                                        >
                                            <img
                                                src={reviewingPlayer.photo || PLACEHOLDER_IMG}
                                                alt={reviewingPlayer.name}
                                                className="w-20 h-20 rounded-full object-cover border border-gray-200 mb-2 bg-gray-100"
                                                style={{ background: "#f3f3f3" }}
                                            />
                                            <div className="w-full text-center">
                                                <div className="font-bold text-base text-gray-900">{reviewingPlayer.name}</div>
                                                <div className="text-sm text-gray-600 mb-2">{reviewingPlayer.position}</div>
                                            </div>
                                            <div className="w-full grid grid-cols-2 gap-y-1 text-sm mb-2">
                                                {/* Speed */}
                                                <span className="text-gray-700 flex items-center">
                                                    Speed:
                                                    <button
                                                        type="button"
                                                        className="ml-1 px-2 py-0.5 rounded bg-gray-200 text-gray-700 sm:hidden"
                                                        onClick={() =>
                                                            setReviewingPlayer(prev => ({
                                                                ...prev,
                                                                _review_speed: Math.max(45, Number(prev._review_speed ?? prev.speed) - 1),
                                                            }))
                                                        }
                                                        tabIndex={-1}
                                                    >-</button>
                                                    <Input
                                                        type="number"
                                                        min={45}
                                                        max={99}
                                                        step={1}
                                                        value={reviewingPlayer._review_speed ?? reviewingPlayer.speed}
                                                        onChange={e =>
                                                            setReviewingPlayer(prev => ({
                                                                ...prev,
                                                                _review_speed: Math.max(45, Math.min(99, Number(e.target.value))),
                                                            }))
                                                        }
                                                        className="mx-1 py-0.5 px-1 text-xs w-14 text-center"
                                                    />
                                                    <button
                                                        type="button"
                                                        className="px-2 py-0.5 rounded bg-gray-200 text-gray-700 sm:hidden"
                                                        onClick={() =>
                                                            setReviewingPlayer(prev => ({
                                                                ...prev,
                                                                _review_speed: Math.min(99, Number(prev._review_speed ?? prev.speed) + 1),
                                                            }))
                                                        }
                                                        tabIndex={-1}
                                                    >+</button>
                                                </span>
                                                {/* Shooting */}
                                                <span className="text-gray-700 flex items-center">
                                                    Shooting:
                                                    <button
                                                        type="button"
                                                        className="ml-1 px-2 py-0.5 rounded bg-gray-200 text-gray-700 sm:hidden"
                                                        onClick={() =>
                                                            setReviewingPlayer(prev => ({
                                                                ...prev,
                                                                _review_shooting: Math.max(45, Number(prev._review_shooting ?? prev.shooting) - 1),
                                                            }))
                                                        }
                                                        tabIndex={-1}
                                                    >-</button>
                                                    <Input
                                                        type="number"
                                                        min={45}
                                                        max={99}
                                                        step={1}
                                                        value={reviewingPlayer._review_shooting ?? reviewingPlayer.shooting}
                                                        onChange={e =>
                                                            setReviewingPlayer(prev => ({
                                                                ...prev,
                                                                _review_shooting: Math.max(45, Math.min(99, Number(e.target.value))),
                                                            }))
                                                        }
                                                        className="mx-1 py-0.5 px-1 text-xs w-14 text-center"
                                                    />
                                                    <button
                                                        type="button"
                                                        className="px-2 py-0.5 rounded bg-gray-200 text-gray-700 sm:hidden"
                                                        onClick={() =>
                                                            setReviewingPlayer(prev => ({
                                                                ...prev,
                                                                _review_shooting: Math.min(99, Number(prev._review_shooting ?? prev.shooting) + 1),
                                                            }))
                                                        }
                                                        tabIndex={-1}
                                                    >+</button>
                                                </span>
                                                {/* Passing */}
                                                <span className="text-gray-700 flex items-center">
                                                    Passing:
                                                    <button
                                                        type="button"
                                                        className="ml-1 px-2 py-0.5 rounded bg-gray-200 text-gray-700 sm:hidden"
                                                        onClick={() =>
                                                            setReviewingPlayer(prev => ({
                                                                ...prev,
                                                                _review_passing: Math.max(45, Number(prev._review_passing ?? prev.passing) - 1),
                                                            }))
                                                        }
                                                        tabIndex={-1}
                                                    >-</button>
                                                    <Input
                                                        type="number"
                                                        min={45}
                                                        max={99}
                                                        step={1}
                                                        value={reviewingPlayer._review_passing ?? reviewingPlayer.passing}
                                                        onChange={e =>
                                                            setReviewingPlayer(prev => ({
                                                                ...prev,
                                                                _review_passing: Math.max(45, Math.min(99, Number(e.target.value))),
                                                            }))
                                                        }
                                                        className="mx-1 py-0.5 px-1 text-xs w-14 text-center"
                                                    />
                                                    <button
                                                        type="button"
                                                        className="px-2 py-0.5 rounded bg-gray-200 text-gray-700 sm:hidden"
                                                        onClick={() =>
                                                            setReviewingPlayer(prev => ({
                                                                ...prev,
                                                                _review_passing: Math.min(99, Number(prev._review_passing ?? prev.passing) + 1),
                                                            }))
                                                        }
                                                        tabIndex={-1}
                                                    >+</button>
                                                </span>
                                                {/* Dribbling */}
                                                <span className="text-gray-700 flex items-center">
                                                    Dribbling:
                                                    <button
                                                        type="button"
                                                        className="ml-1 px-2 py-0.5 rounded bg-gray-200 text-gray-700 sm:hidden"
                                                        onClick={() =>
                                                            setReviewingPlayer(prev => ({
                                                                ...prev,
                                                                _review_dribbling: Math.max(45, Number(prev._review_dribbling ?? prev.dribbling) - 1),
                                                            }))
                                                        }
                                                        tabIndex={-1}
                                                    >-</button>
                                                    <Input
                                                        type="number"
                                                        min={45}
                                                        max={99}
                                                        step={1}
                                                        value={reviewingPlayer._review_dribbling ?? reviewingPlayer.dribbling}
                                                        onChange={e =>
                                                            setReviewingPlayer(prev => ({
                                                                ...prev,
                                                                _review_dribbling: Math.max(45, Math.min(99, Number(e.target.value))),
                                                            }))
                                                        }
                                                        className="mx-1 py-0.5 px-1 text-xs w-14 text-center"
                                                    />
                                                    <button
                                                        type="button"
                                                        className="px-2 py-0.5 rounded bg-gray-200 text-gray-700 sm:hidden"
                                                        onClick={() =>
                                                            setReviewingPlayer(prev => ({
                                                                ...prev,
                                                                _review_dribbling: Math.min(99, Number(prev._review_dribbling ?? prev.dribbling) + 1),
                                                            }))
                                                        }
                                                        tabIndex={-1}
                                                    >+</button>
                                                </span>
                                                {/* Physical */}
                                                <span className="text-gray-700 flex items-center">
                                                    Physical:
                                                    <button
                                                        type="button"
                                                        className="ml-1 px-2 py-0.5 rounded bg-gray-200 text-gray-700 sm:hidden"
                                                        onClick={() =>
                                                            setReviewingPlayer(prev => ({
                                                                ...prev,
                                                                _review_physical: Math.max(45, Number(prev._review_physical ?? prev.physical) - 1),
                                                            }))
                                                        }
                                                        tabIndex={-1}
                                                    >-</button>
                                                    <Input
                                                        type="number"
                                                        min={45}
                                                        max={99}
                                                        step={1}
                                                        value={reviewingPlayer._review_physical ?? reviewingPlayer.physical}
                                                        onChange={e =>
                                                            setReviewingPlayer(prev => ({
                                                                ...prev,
                                                                _review_physical: Math.max(45, Math.min(99, Number(e.target.value))),
                                                            }))
                                                        }
                                                        className="mx-1 py-0.5 px-1 text-xs w-14 text-center"
                                                    />
                                                    <button
                                                        type="button"
                                                        className="px-2 py-0.5 rounded bg-gray-200 text-gray-700 sm:hidden"
                                                        onClick={() =>
                                                            setReviewingPlayer(prev => ({
                                                                ...prev,
                                                                _review_physical: Math.min(99, Number(prev._review_physical ?? prev.physical) + 1),
                                                            }))
                                                        }
                                                        tabIndex={-1}
                                                    >+</button>
                                                </span>
                                                {/* Defending */}
                                                <span className="text-gray-700 flex items-center">
                                                    Defending:
                                                    <button
                                                        type="button"
                                                        className="ml-1 px-2 py-0.5 rounded bg-gray-200 text-gray-700 sm:hidden"
                                                        onClick={() =>
                                                            setReviewingPlayer(prev => ({
                                                                ...prev,
                                                                _review_defending: Math.max(45, Number(prev._review_defending ?? prev.defending) - 1),
                                                            }))
                                                        }
                                                        tabIndex={-1}
                                                    >-</button>
                                                    <Input
                                                        type="number"
                                                        min={45}
                                                        max={99}
                                                        step={1}
                                                        value={reviewingPlayer._review_defending ?? reviewingPlayer.defending}
                                                        onChange={e =>
                                                            setReviewingPlayer(prev => ({
                                                                ...prev,
                                                                _review_defending: Math.max(45, Math.min(99, Number(e.target.value))),
                                                            }))
                                                        }
                                                        className="mx-1 py-0.5 px-1 text-xs w-14 text-center"
                                                    />
                                                    <button
                                                        type="button"
                                                        className="px-2 py-0.5 rounded bg-gray-200 text-gray-700 sm:hidden"
                                                        onClick={() =>
                                                            setReviewingPlayer(prev => ({
                                                                ...prev,
                                                                _review_defending: Math.min(99, Number(prev._review_defending ?? prev.defending) + 1),
                                                            }))
                                                        }
                                                        tabIndex={-1}
                                                    >+</button>
                                                </span>
                                                {/* Weak Foot */}
                                                <span className="text-gray-700 flex items-center">
                                                    Weak Foot:
                                                    <button
                                                        type="button"
                                                        className="ml-1 px-2 py-0.5 rounded bg-gray-200 text-gray-700 sm:hidden"
                                                        onClick={() =>
                                                            setReviewingPlayer(prev => ({
                                                                ...prev,
                                                                _review_weakFoot: Math.max(10, Number(prev._review_weakFoot ?? prev.weakFoot) - 10),
                                                            }))
                                                        }
                                                        tabIndex={-1}
                                                    >-</button>
                                                    <Input
                                                        type="number"
                                                        min={10}
                                                        max={50}
                                                        step={10}
                                                        value={reviewingPlayer._review_weakFoot ?? reviewingPlayer.weakFoot}
                                                        onChange={e =>
                                                            setReviewingPlayer(prev => ({
                                                                ...prev,
                                                                _review_weakFoot: Math.max(10, Math.min(50, Math.round(Number(e.target.value) / 10) * 10)),
                                                            }))
                                                        }
                                                        className="mx-1 py-0.5 px-1 text-xs w-14 text-center"
                                                    />
                                                    <button
                                                        type="button"
                                                        className="px-2 py-0.5 rounded bg-gray-200 text-gray-700 sm:hidden"
                                                        onClick={() =>
                                                            setReviewingPlayer(prev => ({
                                                                ...prev,
                                                                _review_weakFoot: Math.min(50, Number(prev._review_weakFoot ?? prev.weakFoot) + 10),
                                                            }))
                                                        }
                                                        tabIndex={-1}
                                                    >+</button>
                                                </span>
                                                {/* GK */}
                                                <span className="text-gray-700 flex items-center">
                                                    GK:
                                                    <button
                                                        type="button"
                                                        className="ml-1 px-2 py-0.5 rounded bg-gray-200 text-gray-700 sm:hidden"
                                                        onClick={() =>
                                                            setReviewingPlayer(prev => ({
                                                                ...prev,
                                                                _review_goalkeeping: Math.max(45, Number(prev._review_goalkeeping ?? prev.goalkeeping) - 1),
                                                            }))
                                                        }
                                                        tabIndex={-1}
                                                    >-</button>
                                                    <Input
                                                        type="number"
                                                        min={45}
                                                        max={99}
                                                        step={1}
                                                        value={reviewingPlayer._review_goalkeeping ?? reviewingPlayer.goalkeeping}
                                                        onChange={e =>
                                                            setReviewingPlayer(prev => ({
                                                                ...prev,
                                                                _review_goalkeeping: Math.max(45, Math.min(99, Number(e.target.value))),
                                                            }))
                                                        }
                                                        className="mx-1 py-0.5 px-1 text-xs w-14 text-center"
                                                    />
                                                    <button
                                                        type="button"
                                                        className="px-2 py-0.5 rounded bg-gray-200 text-gray-700 sm:hidden"
                                                        onClick={() =>
                                                            setReviewingPlayer(prev => ({
                                                                ...prev,
                                                                _review_goalkeeping: Math.min(99, Number(prev._review_goalkeeping ?? prev.goalkeeping) + 1),
                                                            }))
                                                        }
                                                        tabIndex={-1}
                                                    >+</button>
                                                </span>
                                            </div>
                                            <div className="w-full text-left font-bold text-lg mt-1">
                                                <span
                                                    className={
                                                        (() => {
                                                            const ovr = calculateOverall({
                                                                ...reviewingPlayer,
                                                                speed: Number(reviewingPlayer._review_speed ?? reviewingPlayer.speed),
                                                                shooting: Number(reviewingPlayer._review_shooting ?? reviewingPlayer.shooting),
                                                                passing: Number(reviewingPlayer._review_passing ?? reviewingPlayer.passing),
                                                                dribbling: Number(reviewingPlayer._review_dribbling ?? reviewingPlayer.dribbling),
                                                                physical: Number(reviewingPlayer._review_physical ?? reviewingPlayer.physical),
                                                                defending: Number(reviewingPlayer._review_defending ?? reviewingPlayer.defending),
                                                                goalkeeping: Number(reviewingPlayer._review_goalkeeping ?? reviewingPlayer.goalkeeping),
                                                                weakFoot: Number(reviewingPlayer._review_weakFoot ?? reviewingPlayer.weakFoot),
                                                            });
                                                            if (ovr >= 90) return "text-blue-700";
                                                            if (ovr >= 80) return "text-yellow-700";
                                                            if (ovr >= 70) return "text-gray-700";
                                                            return "text-orange-700";
                                                        })()
                                                    }
                                                >
                                                    Overall: {calculateOverall({
                                                        ...reviewingPlayer,
                                                        speed: Number(reviewingPlayer._review_speed ?? reviewingPlayer.speed),
                                                        shooting: Number(reviewingPlayer._review_shooting ?? reviewingPlayer.shooting),
                                                        passing: Number(reviewingPlayer._review_passing ?? reviewingPlayer.passing),
                                                        dribbling: Number(reviewingPlayer._review_dribbling ?? reviewingPlayer.dribbling),
                                                        physical: Number(reviewingPlayer._review_physical ?? reviewingPlayer.physical),
                                                        defending: Number(reviewingPlayer._review_defending ?? reviewingPlayer.defending),
                                                        goalkeeping: Number(reviewingPlayer._review_goalkeeping ?? reviewingPlayer.goalkeeping),
                                                        weakFoot: Number(reviewingPlayer._review_weakFoot ?? reviewingPlayer.weakFoot),
                                                    })}
                                                </span>
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
                                    <div className="flex flex-col sm:flex-row gap-2 mt-2 justify-end">
                                        <button
                                            type="submit"
                                            className="w-full sm:w-auto px-4 py-2 rounded bg-blue-500 text-white font-semibold hover:bg-blue-600 transition"
                                        >
                                            Submit Review
                                        </button>
                                        <button
                                            type="button"
                                            className="w-full sm:w-auto px-4 py-2 rounded bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition"
                                            onClick={() => setReviewingPlayer(null)}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* Request Form Modal */}
            {showRequestForm && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-2"
                    onClick={e => handleOverlayClick(e, () => { setShowRequestForm(false); setSubmitted(false); })}
                >
                    <div
                        className="bg-white rounded-xl shadow-xl border p-2 sm:p-6 max-w-lg w-full relative flex flex-col h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[90vh] overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            className="absolute top-2 right-2 z-20 bg-white rounded-full p-2 text-gray-400 hover:text-gray-700 text-lg font-bold shadow flex items-center justify-center"
                            onClick={() => { setShowRequestForm(false); setSubmitted(false); }}
                            aria-label="Close"
                            type="button"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <line x1="18" y1="6" x2="6" y2="18" strokeWidth="2" strokeLinecap="round"/>
                                <line x1="6" y1="6" x2="18" y2="18" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                        </button>
                        <div className="overflow-y-auto flex-1 w-full">
                            <h2 className="text-base sm:text-lg font-bold mb-2 text-center text-blue-900">Request New Player Addition</h2>
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
                                    <div className="flex flex-col items-center">
                                        {/* Player Card with Attribute Selectors */}
                                        <div
                                            className={`w-full flex flex-col items-center justify-start rounded-xl border shadow-sm p-3 mb-2 ${getCardBgByOverall(
                                                calculateOverall({
                                                    position: request.position,
                                                    speed: Number(request.speed) || 0,
                                                    shooting: Number(request.shooting) || 0,
                                                    passing: Number(request.passing) || 0,
                                                    dribbling: Number(request.dribbling) || 0,
                                                    physical: Number(request.physical) || 0,
                                                    defending: Number(request.defending) || 0,
                                                    goalkeeping: Number(request.goalkeeping) || 0,
                                                    weakFoot: Number(request.weakFoot) || 0,
                                                })
                                            )}`}
                                            style={{ minWidth: 0, maxWidth: 400 }}
                                        >
                                            <img
                                                src={PLACEHOLDER_IMG}
                                                alt={request.player || "Player"}
                                                className="w-20 h-20 rounded-full object-cover border border-gray-200 mb-2 bg-gray-100"
                                                style={{ background: "#f3f3f3" }}
                                            />
                                            <div className="w-full text-center">
                                                <div className="font-bold text-base text-gray-900">{request.player || "Player Name"}</div>
                                                <div className="text-sm text-gray-600 mb-2">{request.position}</div>
                                            </div>
                                            <div className="w-full grid grid-cols-2 gap-y-1 text-sm mb-2">
                                                <span className="text-gray-700 flex items-center">
                                                    Speed:
                                                    <button
                                                        type="button"
                                                        className="ml-1 px-2 py-0.5 rounded bg-gray-200 text-gray-700"
                                                        onClick={() => handleAttributeChange("speed", request.speed - 1, 45, 99)}
                                                        tabIndex={-1}
                                                    >-</button>
                                                    <Input
                                                        name="speed"
                                                        type="number"
                                                        min={45}
                                                        max={99}
                                                        value={request.speed}
                                                        onChange={e => handleAttributeChange("speed", e.target.value, 45, 99)}
                                                        className="mx-1 py-0.5 px-1 text-xs w-14 text-center"
                                                    />
                                                    <button
                                                        type="button"
                                                        className="px-2 py-0.5 rounded bg-gray-200 text-gray-700"
                                                        onClick={() => handleAttributeChange("speed", request.speed + 1, 45, 99)}
                                                        tabIndex={-1}
                                                    >+</button>
                                                </span>
                                                <span className="text-gray-700 flex items-center">
                                                    Shooting:
                                                    <button
                                                        type="button"
                                                        className="ml-1 px-2 py-0.5 rounded bg-gray-200 text-gray-700"
                                                        onClick={() => handleAttributeChange("shooting", request.shooting - 1, 45, 99)}
                                                        tabIndex={-1}
                                                    >-</button>
                                                    <Input
                                                        name="shooting"
                                                        type="number"
                                                        min={45}
                                                        max={99}
                                                        value={request.shooting}
                                                        onChange={e => handleAttributeChange("shooting", e.target.value, 45, 99)}
                                                        className="mx-1 py-0.5 px-1 text-xs w-14 text-center"
                                                    />
                                                    <button
                                                        type="button"
                                                        className="px-2 py-0.5 rounded bg-gray-200 text-gray-700"
                                                        onClick={() => handleAttributeChange("shooting", request.shooting + 1, 45, 99)}
                                                        tabIndex={-1}
                                                    >+</button>
                                                </span>
                                                <span className="text-gray-700 flex items-center">
                                                    Passing:
                                                    <button
                                                        type="button"
                                                        className="ml-1 px-2 py-0.5 rounded bg-gray-200 text-gray-700"
                                                        onClick={() => handleAttributeChange("passing", request.passing - 1, 45, 99)}
                                                        tabIndex={-1}
                                                    >-</button>
                                                    <Input
                                                        name="passing"
                                                        type="number"
                                                        min={45}
                                                        max={99}
                                                        value={request.passing}
                                                        onChange={e => handleAttributeChange("passing", e.target.value, 45, 99)}
                                                        className="mx-1 py-0.5 px-1 text-xs w-14 text-center"
                                                    />
                                                    <button
                                                        type="button"
                                                        className="px-2 py-0.5 rounded bg-gray-200 text-gray-700"
                                                        onClick={() => handleAttributeChange("passing", request.passing + 1, 45, 99)}
                                                        tabIndex={-1}
                                                    >+</button>
                                                </span>
                                                <span className="text-gray-700 flex items-center">
                                                    Dribbling:
                                                    <button
                                                        type="button"
                                                        className="ml-1 px-2 py-0.5 rounded bg-gray-200 text-gray-700"
                                                        onClick={() => handleAttributeChange("dribbling", request.dribbling - 1, 45, 99)}
                                                        tabIndex={-1}
                                                    >-</button>
                                                    <Input
                                                        name="dribbling"
                                                        type="number"
                                                        min={45}
                                                        max={99}
                                                        value={request.dribbling}
                                                        onChange={e => handleAttributeChange("dribbling", e.target.value, 45, 99)}
                                                        className="mx-1 py-0.5 px-1 text-xs w-14 text-center"
                                                    />
                                                    <button
                                                        type="button"
                                                        className="px-2 py-0.5 rounded bg-gray-200 text-gray-700"
                                                        onClick={() => handleAttributeChange("dribbling", request.dribbling + 1, 45, 99)}
                                                        tabIndex={-1}
                                                    >+</button>
                                                </span>
                                                <span className="text-gray-700 flex items-center">
                                                    Physical:
                                                    <button
                                                        type="button"
                                                        className="ml-1 px-2 py-0.5 rounded bg-gray-200 text-gray-700"
                                                        onClick={() => handleAttributeChange("physical", request.physical - 1, 45, 99)}
                                                        tabIndex={-1}
                                                    >-</button>
                                                    <Input
                                                        name="physical"
                                                        type="number"
                                                        min={45}
                                                        max={99}
                                                        value={request.physical}
                                                        onChange={e => handleAttributeChange("physical", e.target.value, 45, 99)}
                                                        className="mx-1 py-0.5 px-1 text-xs w-14 text-center"
                                                    />
                                                    <button
                                                        type="button"
                                                        className="px-2 py-0.5 rounded bg-gray-200 text-gray-700"
                                                        onClick={() => handleAttributeChange("physical", request.physical + 1, 45, 99)}
                                                        tabIndex={-1}
                                                    >+</button>
                                                </span>
                                                <span className="text-gray-700 flex items-center">
                                                    Defending:
                                                    <button
                                                        type="button"
                                                        className="ml-1 px-2 py-0.5 rounded bg-gray-200 text-gray-700"
                                                        onClick={() => handleAttributeChange("defending", request.defending - 1, 45, 99)}
                                                        tabIndex={-1}
                                                    >-</button>
                                                    <Input
                                                        name="defending"
                                                        type="number"
                                                        min={45}
                                                        max={99}
                                                        value={request.defending}
                                                        onChange={e => handleAttributeChange("defending", e.target.value, 45, 99)}
                                                        className="mx-1 py-0.5 px-1 text-xs w-14 text-center"
                                                    />
                                                    <button
                                                        type="button"
                                                        className="px-2 py-0.5 rounded bg-gray-200 text-gray-700"
                                                        onClick={() => handleAttributeChange("defending", request.defending + 1, 45, 99)}
                                                        tabIndex={-1}
                                                    >+</button>
                                                </span>
                                                <span className="text-gray-700 flex items-center">
                                                    Weak Foot:
                                                    <button
                                                        type="button"
                                                        className="ml-1 px-2 py-0.5 rounded bg-gray-200 text-gray-700"
                                                        onClick={() => handleAttributeChange("weakFoot", request.weakFoot - 10, 10, 50, 10)}
                                                        tabIndex={-1}
                                                    >-</button>
                                                    <Input
                                                        name="weakFoot"
                                                        type="number"
                                                        min={10}
                                                        max={50}
                                                        step={10}
                                                        value={request.weakFoot}
                                                        onChange={e => handleAttributeChange("weakFoot", e.target.value, 10, 50, 10)}
                                                        className="mx-1 py-0.5 px-1 text-xs w-14 text-center"
                                                    />
                                                    <button
                                                        type="button"
                                                        className="px-2 py-0.5 rounded bg-gray-200 text-gray-700"
                                                        onClick={() => handleAttributeChange("weakFoot", request.weakFoot + 10, 10, 50, 10)}
                                                        tabIndex={-1}
                                                    >+</button>
                                                </span>
                                                <span className="text-gray-700 flex items-center">
                                                    GK:
                                                    <button
                                                        type="button"
                                                        className="ml-1 px-2 py-0.5 rounded bg-gray-200 text-gray-700"
                                                        onClick={() => handleAttributeChange("goalkeeping", request.goalkeeping - 1, 45, 99)}
                                                        tabIndex={-1}
                                                    >-</button>
                                                    <Input
                                                        name="goalkeeping"
                                                        type="number"
                                                        min={45}
                                                        max={99}
                                                        value={request.goalkeeping}
                                                        onChange={e => handleAttributeChange("goalkeeping", e.target.value, 45, 99)}
                                                        className="mx-1 py-0.5 px-1 text-xs w-14 text-center"
                                                    />
                                                    <button
                                                        type="button"
                                                        className="px-2 py-0.5 rounded bg-gray-200 text-gray-700"
                                                        onClick={() => handleAttributeChange("goalkeeping", request.goalkeeping + 1, 45, 99)}
                                                        tabIndex={-1}
                                                    >+</button>
                                                </span>
                                            </div>
                                            <div className="w-full grid grid-cols-2 gap-x-2 mb-2">
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
                                            </div>
                                            <div className="w-full text-left font-bold text-lg mt-1">
                                                <span
                                                    className={
                                                        (() => {
                                                            const ovr = calculateOverall({
                                                                position: request.position,
                                                                speed: Number(request.speed) || 0,
                                                                shooting: Number(request.shooting) || 0,
                                                                passing: Number(request.passing) || 0,
                                                                dribbling: Number(request.dribbling) || 0,
                                                                physical: Number(request.physical) || 0,
                                                                defending: Number(request.defending) || 0,
                                                                goalkeeping: Number(request.goalkeeping) || 0,
                                                                weakFoot: Number(request.weakFoot) || 0,
                                                            });
                                                            if (ovr >= 90) return "text-blue-700";
                                                            if (ovr >= 80) return "text-yellow-700";
                                                            if (ovr >= 70) return "text-gray-700";
                                                            return "text-orange-700";
                                                        })()
                                                    }
                                                >
                                                    Overall: {calculateOverall({
                                                        position: request.position,
                                                        speed: Number(request.speed) || 0,
                                                        shooting: Number(request.shooting) || 0,
                                                        passing: Number(request.passing) || 0,
                                                        dribbling: Number(request.dribbling) || 0,
                                                        physical: Number(request.physical) || 0,
                                                        defending: Number(request.defending) || 0,
                                                        goalkeeping: Number(request.goalkeeping) || 0,
                                                        weakFoot: Number(request.weakFoot) || 0,
                                                    })}
                                                </span>
                                            </div>
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
                                    <div className="flex flex-col sm:flex-row gap-2 mt-2">
                                        <button
                                            type="submit"
                                            className="w-full sm:w-auto px-4 py-2 rounded bg-blue-500 text-white font-semibold hover:bg-blue-600 transition"
                                        >
                                            Submit Request
                                        </button>
                                        <button
                                            type="button"
                                            className="w-full sm:w-auto px-4 py-2 rounded bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition"
                                            onClick={() => setShowRequestForm(false)}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}