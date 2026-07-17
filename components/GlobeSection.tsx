"use client";
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import createGlobe from "cobe";

const globeStyle = { contain: "layout paint size" } as CSSProperties;

export default function GlobeSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let phi = 0;
    let width = 0;
    const onResize = () => { width = canvas.offsetWidth; };
    onResize();
    window.addEventListener("resize", onResize);
    const opts: any = {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi: 0,
      theta: 0.3,
      dark: 0,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.95, 0.95, 0.98],
      markerColor: [0.43, 0.29, 1],
      glowColor: [0.85, 0.85, 0.95],
      markers: [
        { location: [40.7128, -74.006], size: 0.05 },
        { location: [51.5074, -0.1278], size: 0.05 },
        { location: [35.6762, 139.6503], size: 0.05 },
        { location: [1.3521, 103.8198], size: 0.05 },
        { location: [-23.5505, -46.6333], size: 0.05 },
      ],
      onRender: (state: any) => { state.phi = phi; phi += 0.005; state.width = width * 2; state.height = width * 2; },
    };
    const globe = createGlobe(canvas, opts);
    return () => { globe.destroy(); window.removeEventListener("resize", onResize); };
  }, []);
  return (
    <section className="mx-auto max-w-content px-6 py-24">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <div>
          <div className="mb-3 text-xs font-mono uppercase tracking-widest text-nyx">Global by default</div>
          <h2 className="font-display text-3xl font-bold text-ink md:text-5xl">One settlement layer, every timezone</h2>
          <p className="mt-4 text-muted">Solana finality means a bet placed in Tokyo settles the same second it does in São Paulo. No regional operators, no custodians — just the chain.</p>
        </div>
        <div className="relative aspect-square w-full max-w-lg justify-self-center">
          <canvas ref={canvasRef} className="h-full w-full" style={globeStyle} />
        </div>
      </div>
    </section>
  );
}
