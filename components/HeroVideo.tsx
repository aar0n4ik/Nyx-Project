"use client";
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

const gridStyle: CSSProperties = {
  backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
  backgroundSize: "48px 48px",
  maskImage: "radial-gradient(ellipse at center, black, transparent 78%)",
  WebkitMaskImage: "radial-gradient(ellipse at center, black, transparent 78%)",
};

export default function HeroVideo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let raf = 0;
    let t = 0;
    const resize = () => { canvas.width = canvas.offsetWidth * dpr; canvas.height = canvas.offsetHeight * dpr; };
    resize();
    window.addEventListener("resize", resize);
    const blobs = [
      { hue: 258, x: 0.3, y: 0.35, r: 0.5, sx: 0.00013, sy: 0.00017 },
      { hue: 190, x: 0.7, y: 0.4, r: 0.45, sx: 0.00019, sy: 0.00011 },
      { hue: 275, x: 0.5, y: 0.7, r: 0.55, sx: 0.00009, sy: 0.00021 },
      { hue: 150, x: 0.6, y: 0.25, r: 0.35, sx: 0.00015, sy: 0.00014 },
    ];
    const render = () => {
      t += 16;
      const w = canvas.width, h = canvas.height;
      ctx.fillStyle = "#08080F";
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      for (const b of blobs) {
        const cx = (b.x + Math.sin(t * b.sx) * 0.15) * w;
        const cy = (b.y + Math.cos(t * b.sy) * 0.15) * h;
        const rad = b.r * Math.min(w, h);
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
        g.addColorStop(0, `hsla(${b.hue}, 90%, 60%, 0.55)`);
        g.addColorStop(1, "hsla(0, 0%, 0%, 0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(render);
    };
    render();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return (
    <div className="absolute inset-0 overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <video className="absolute inset-0 h-full w-full object-cover opacity-60" autoPlay muted loop playsInline>
        <source src="/hero.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-[#0B0B14]/55" />
      <div className="absolute inset-0 opacity-[0.06]" style={gridStyle} />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-base" />
    </div>
  );
}
