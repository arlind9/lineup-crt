import React, { useState, useRef, useMemo } from 'react';
import html2canvas from 'html2canvas';
import { Input } from '@/components/ui/input';
import { calculateOverall } from './utils/overall';

const PLACEHOLDER_IMG = "https://ui-avatars.com/api/?name=Player&background=eee&color=888&size=128&rounded=true";

function getCardBgByOverall(overall) {
    if (overall >= 90) return "bg-gradient-to-br from-[#e5e4e2] via-[#b3e0fc] to-[#f8fafc] border-blue-300";
    if (overall >= 80) return "bg-gradient-to-br from-yellow-300 via-yellow-100 to-white border-yellow-400";
    if (overall >= 70) return "bg-gradient-to-br from-gray-300 via-gray-100 to-white border-gray-400";
    return "bg-gradient-to-br from-orange-200 via-yellow-50 to-white border-orange-300";
}

function CardCreatorPage() {
    const [form, setForm] = useState({
        name: "",
        position: "ST",
        speed: 50,
        shooting: 50,
        passing: 50,
        dribbling: 50,
        physical: 50,
        defending: 50,
        goalkeeping: 0,
        weakFoot: 25,
        photo: "",
    });
    const [showCard, setShowCard] = useState(false);
    const cardRef = useRef(null);

    function handleChange(e) {
        const { name, value, type } = e.target;
        setForm(f => ({
            ...f,
            [name]: type === "number" ? Number(value) : value
        }));
    }

    function handleSubmit(e) {
        e.preventDefault();
        setShowCard(true);
    }

    function resetForm() {
        setForm({
            name: "",
            position: "ST",
            speed: 50,
            shooting: 50,
            passing: 50,
            dribbling: 50,
            physical: 50,
            defending: 50,
            goalkeeping: 0,
            weakFoot: 25,
            photo: "",
        });
        setShowCard(false);
    }

    async function handleExportJPG() {
        if (!cardRef.current) return;
        const canvas = await html2canvas(cardRef.current, {
            backgroundColor: null,
            useCORS: true,
            scale: 2
        });
        const link = document.createElement("a");
        link.download = `${form.name || "player-card"}.jpg`;
        link.href = canvas.toDataURL("image/jpeg", 0.95);
        link.click();
    }

    const overall = useMemo(() => calculateOverall(form), [form]);
    const cardBg = getCardBgByOverall(overall);

    return (
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow p-6 border mt-8 mb-8">
            <h1 className="text-3xl font-bold mb-6 text-center text-green-900">Card Creator</h1>
            <div className="flex flex-col md:flex-row gap-8 items-start">
                {/* Attribute Picker Form */}
                <form
                    className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6"
                    onSubmit={handleSubmit}
                >
                    <div>
                        <label className="block font-semibold mb-1">Name</label>
                        <Input
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            required
                            placeholder="Player Name"
                        />
                    </div>
                    <div>
                        <label className="block font-semibold mb-1">Position</label>
                        <select
                            name="position"
                            value={form.position}
                            onChange={handleChange}
                            className="border rounded px-2 py-1 w-full"
                        >
                            <option value="ST">ST</option>
                            <option value="MF">MF</option>
                            <option value="DF">DF</option>
                            <option value="GK">GK</option>
                        </select>
                    </div>
                    <div>
                        <label className="block font-semibold mb-1">Speed</label>
                        <input
                            type="number"
                            name="speed"
                            min={0}
                            max={100}
                            value={form.speed}
                            onChange={handleChange}
                            className="border rounded px-2 py-1 w-full"
                        />
                    </div>
                    <div>
                        <label className="block font-semibold mb-1">Shooting</label>
                        <input
                            type="number"
                            name="shooting"
                            min={0}
                            max={100}
                            value={form.shooting}
                            onChange={handleChange}
                            className="border rounded px-2 py-1 w-full"
                        />
                    </div>
                    <div>
                        <label className="block font-semibold mb-1">Passing</label>
                        <input
                            type="number"
                            name="passing"
                            min={0}
                            max={100}
                            value={form.passing}
                            onChange={handleChange}
                            className="border rounded px-2 py-1 w-full"
                        />
                    </div>
                    <div>
                        <label className="block font-semibold mb-1">Dribbling</label>
                        <input
                            type="number"
                            name="dribbling"
                            min={0}
                            max={100}
                            value={form.dribbling}
                            onChange={handleChange}
                            className="border rounded px-2 py-1 w-full"
                        />
                    </div>
                    <div>
                        <label className="block font-semibold mb-1">Physical</label>
                        <input
                            type="number"
                            name="physical"
                            min={0}
                            max={100}
                            value={form.physical}
                            onChange={handleChange}
                            className="border rounded px-2 py-1 w-full"
                        />
                    </div>
                    <div>
                        <label className="block font-semibold mb-1">Defending</label>
                        <input
                            type="number"
                            name="defending"
                            min={0}
                            max={100}
                            value={form.defending}
                            onChange={handleChange}
                            className="border rounded px-2 py-1 w-full"
                        />
                    </div>
                    <div>
                        <label className="block font-semibold mb-1">Goalkeeping</label>
                        <input
                            type="number"
                            name="goalkeeping"
                            min={0}
                            max={100}
                            value={form.goalkeeping}
                            onChange={handleChange}
                            className="border rounded px-2 py-1 w-full"
                            disabled={form.position !== "GK"}
                        />
                    </div>
                    <div>
                        <label className="block font-semibold mb-1">Weak Foot</label>
                        <input
                            type="number"
                            name="weakFoot"
                            min={0}
                            max={50}
                            value={form.weakFoot}
                            onChange={handleChange}
                            className="border rounded px-2 py-1 w-full"
                        />
                    </div>
                    <div className="sm:col-span-2">
                        <label className="block font-semibold mb-1">Photo URL</label>
                        <Input
                            name="photo"
                            value={form.photo}
                            onChange={handleChange}
                            placeholder="https://example.com/photo.jpg"
                        />
                    </div>
                    <div className="sm:col-span-2 flex gap-2 mt-2">
                        <button
                            type="submit"
                            className="px-4 py-2 rounded bg-blue-500 text-white font-semibold hover:bg-blue-600 transition"
                        >
                            Preview Card
                        </button>
                        <button
                            type="button"
                            className="px-4 py-2 rounded bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition"
                            onClick={resetForm}
                        >
                            Reset
                        </button>
                    </div>
                </form>
                {/* Card Preview */}
                <div className="flex-1 flex flex-col items-center justify-center min-w-[260px]">
                    {showCard && (
                        <>
                            <div
                                ref={cardRef}
                                className={[cardBg, "border rounded-xl shadow p-6 flex flex-col items-center min-w-[220px] max-w-xs"].join(" ")}
                            >
                                <div className="font-bold text-blue-900 mb-1">{form.name || "Player Name"}</div>
                                <div className="flex justify-center mb-2">
                                    <img
                                        src={form.photo || PLACEHOLDER_IMG}
                                        alt={form.name || "Player"}
                                        className="w-20 h-20 rounded-full object-cover border"
                                        style={{ background: "#eee" }}
                                        loading="lazy"
                                    />
                                </div>
                                <div className="font-semibold text-base truncate">{form.position}</div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-2 mt-2">
                                    <span>Speed: {form.speed}</span>
                                    <span>Shooting: {form.shooting}</span>
                                    <span>Passing: {form.passing}</span>
                                    <span>Dribbling: {form.dribbling}</span>
                                    <span>Physical: {form.physical}</span>
                                    <span>Defending: {form.defending}</span>
                                    <span>Weak Foot: {form.weakFoot}</span>
                                    {form.position === "GK" && <span>Goalkeeping: {form.goalkeeping}</span>}
                                </div>
                                <div className="text-sm font-bold">Overall: {overall}</div>
                            </div>
                            <button
                                className="mt-4 px-4 py-2 rounded bg-green-600 text-white font-semibold hover:bg-green-700 transition"
                                onClick={handleExportJPG}
                                type="button"
                            >
                                Export as JPG
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default CardCreatorPage;
