import { useEffect, useState } from 'react';
import Papa from 'papaparse';

export default function SoccerBackground() {
  const [images, setImages] = useState([]);

  useEffect(() => {
    fetch('https://docs.google.com/spreadsheets/d/12sjC6sz8z_ZNKwwQ_IuZc1bfpJr939NZFbB0B26tOIs/export?format=csv')
      .then(res => res.text())
      .then(csv => {
        Papa.parse(csv, {
          header: true,
          skipEmptyLines: true,
          complete: results => {
            const urls = results.data
              .map(r => r.Image || r.URL || r[Object.keys(r)[1]])
              .filter(u => u && u.startsWith('http') && !u.endsWith('.mp4'));
            setImages(urls);
          }
        });
      });
  }, []);

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      <img src="/field.svg" alt="" className="w-full h-full object-cover opacity-70" />
      {images.map((url, idx) => {
        const top = Math.random() * 90;
        const left = Math.random() * 90;
        const size = 60 + Math.random() * 120;
        return (
          <img
            key={idx}
            src={url}
            alt=""
            className="absolute blur-md opacity-60"
            style={{ top: `${top}%`, left: `${left}%`, width: size, transform: 'translate(-50%, -50%)' }}
          />
        );
      })}
    </div>
  );
}
