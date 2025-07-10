import React, { useEffect, useState } from "react";
import Papa from "papaparse";

// Utility to determine media type
function getMediaType(url) {
    if (!url) return "image";
    const ext = url.split('.').pop().toLowerCase().split(/\#|\?/)[0];
    if (["mp4", "webm", "ogg"].includes(ext)) return "video";
    if (ext === "gif") return "gif";
    return "image";
}

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
                        onContextMenu={e => e.preventDefault()}
                        draggable={false}
                        onDragStart={e => e.preventDefault()}
                    />
                ) : (
                    <img
                        src={image}
                        alt={caption || "Gallery image"}
                        className="rounded-lg object-contain w-full max-h-[70vh] bg-gray-100"
                        style={{ background: "#eee" }}
                        onContextMenu={e => e.preventDefault()}
                        draggable={false}
                        onDragStart={e => e.preventDefault()}
                    />
                )}
                {caption && (
                    <div className="text-base text-gray-700 text-center mt-3">{caption}</div>
                )}
            </div>
        </div>
    );
}

function GalleryThumbnail({ url, caption, onClick }) {
    const mediaType = getMediaType(url);
    const [hovered, setHovered] = useState(false);
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
                        onContextMenu={e => e.preventDefault()}
                        draggable={false}
                        onDragStart={e => e.preventDefault()}
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
                    onContextMenu={e => e.preventDefault()}
                />
            ) : (
                <img
                    src={url}
                    alt={caption || "Gallery image"}
                    className="object-contain w-full h-full rounded-lg bg-gray-100"
                    style={{ background: "#eee" }}
                    loading="lazy"
                    onContextMenu={e => e.preventDefault()}
                />
            )}
            {caption && (
                <div className="text-xs text-gray-700 text-center mt-1 w-full truncate">{caption}</div>
            )}
        </div>
    );
}

export default function GalleryPage() {
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

    useEffect(() => {
        if (!modal.open) return;
        function handleKey(e) {
            if (e.key === "Escape") setModal({ open: false, image: null, caption: "" });
        }
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [modal.open]);

    useEffect(() => {
        if (page > totalPages) setPage(totalPages || 1);
    }, [images, totalPages, page]);

    if (loading) return <div>Loading...</div>;

    if (!images.length) {
        return (
            <div className="gallery-container w-full flex flex-col items-center">
                <h1 className="gallery-title text-center">Gallery</h1>
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
        <>
            <div className="gallery-container w-full flex flex-col items-center">
                <h1 className="gallery-title text-center">Gallery</h1>
                <PageSelector />
                <div className="gallery-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 w-full max-w-5xl">
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
            <style>
                {`
            .gallery-container {
                background: linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%);
                border-radius: 1.5rem;
                box-shadow: 0 4px 32px 0 rgba(60, 80, 180, 0.08);
                padding: 2rem 1rem 2.5rem 1rem;
                margin-bottom: 2rem;
                border: 1px solid #e0e7ef;
            }
            .gallery-title {
                font-size: 2.5rem;
                font-weight: 900;
                color: #3730a3;
                letter-spacing: 0.01em;
                margin-bottom: 2rem;
                text-shadow: 0 2px 8px #e0e7ff;
            }
            .gallery-grid {
                gap: 2rem;
            }
            `}
            </style>
        </>
    );
}