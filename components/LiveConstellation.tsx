"use client";

import { useEffect, useRef } from "react";
import { useLang, pick } from "@/lib/i18n";

type Point = { x: number; y: number; z: number };

const COUNT = 540;
const TWO_PI = Math.PI * 2;

function sphere(n: number): Point[] {
  const pts: Point[] = [];
  const inc = Math.PI * (3 - Math.sqrt(5));
  const off = 2 / n;
  for (let i = 0; i < n; i++) {
    const y = i * off - 1 + off / 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const phi = i * inc;
    pts.push({ x: Math.cos(phi) * r, y, z: Math.sin(phi) * r });
  }
  return pts;
}

export default function LiveConstellation() {
  const lang = useLang();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const points = sphere(COUNT);
    let raf = 0;
    let w = 0;
    let h = 0;
    let dpr = 1;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = parent.clientWidth;
      h = parent.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const pulses = Array.from({ length: 5 }, () => ({
      i: Math.floor(Math.random() * COUNT),
      t: Math.random(),
      speed: 0.004 + Math.random() * 0.006,
    }));

    let angle = 0;

    const frame = () => {
      const isDark = document.documentElement.classList.contains("dark");
      const baseR = isDark ? 168 : 120;
      const baseG = isDark ? 174 : 128;
      const baseB = isDark ? 194 : 150;

      ctx.clearRect(0, 0, w, h);
      angle += 0.0016;
      const cx = w / 2;
      const cy = h / 2;
      const scale = Math.min(w, h) * 0.42;

      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const tilt = 0.42;
      const cosT = Math.cos(tilt);
      const sinT = Math.sin(tilt);

      const projected: Array<{ sx: number; sy: number; depth: number }> = [];
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const rx = p.x * cosA - p.z * sinA;
        const rz = p.x * sinA + p.z * cosA;
        const ry = p.y * cosT - rz * sinT;
        const rzz = p.y * sinT + rz * cosT;
        const depth = (rzz + 1) / 2;
        projected.push({ sx: cx + rx * scale, sy: cy + ry * scale, depth });
      }

      projected.sort((a, b) => a.depth - b.depth);

      for (let k = 0; k < projected.length; k++) {
        const pr = projected[k];
        const alpha = 0.15 + pr.depth * 0.7;
        const size = 0.6 + pr.depth * 1.8;
        const mix = Math.min(1, Math.max(0, (pr.sx - (cx - scale)) / (scale * 2)));
        const r = Math.round(baseR + (mix - 0.5) * 40);
        const g = Math.round(baseG + mix * 20);
        const b = Math.round(baseB + (1 - mix) * 30);
        ctx.beginPath();
        ctx.fillStyle = "rgba(" + r + "," + g + "," + b + "," + alpha.toFixed(3) + ")";
        ctx.arc(pr.sx, pr.sy, size, 0, TWO_PI);
        ctx.fill();
      }

      for (let pI = 0; pI < pulses.length; pI++) {
        const pu = pulses[pI];
        pu.t += pu.speed;
        if (pu.t > 1) {
          pu.t = 0;
          pu.i = Math.floor(Math.random() * COUNT);
        }
        const p = points[pu.i];
        const rx = p.x * cosA - p.z * sinA;
        const rz = p.x * sinA + p.z * cosA;
        const ry = p.y * cosT - rz * sinT;
        const sx = cx + rx * scale;
        const sy = cy + ry * scale;
        const ringR = 2 + pu.t * 22;
        const ringA = (1 - pu.t) * 0.6;
        ctx.beginPath();
        ctx.strokeStyle = "rgba(153,69,255," + ringA.toFixed(3) + ")";
        ctx.lineWidth = 1.2;
        ctx.arc(sx, sy, ringR, 0, TWO_PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.fillStyle = "rgba(11,181,214," + Math.min(1, ringA + 0.3).toFixed(3) + ")";
        ctx.arc(sx, sy, 2.2, 0, TWO_PI);
        ctx.fill();
      }

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <section id="live" className="relative mx-auto w-full max-w-content px-6 py-28">
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-muted">
          {pick(lang, { en: "Live on Solana", ru: "Вживую на Solana", es: "En vivo en Solana", pt: "Ao vivo na Solana", fr: "En direct sur Solana", de: "Live auf Solana", zh: "在 Solana 上实时运行" })}
        </span>
        <h2 style= fontFamily: "var(--font-display)"  className="mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {pick(lang, { en: "Every bet, settled in the open", ru: "Каждая ставка рассчитана открыто", es: "Cada apuesta, liquidada a la vista", pt: "Cada aposta, liquidada à vista de todos", fr: "Chaque pari, réglé au grand jour", de: "Jede Wette, offen abgerechnet", zh: "每一注都公开结算" })}
        </h2>
        <p className="mt-4 text-base leading-relaxed text-muted">
          {pick(lang, { en: "A living map of on-chain activity — each pulse is a real transaction you can verify block by block.", ru: "Живая карта ончейн-активности — каждый импульс это реальная транзакция, которую можно проверить блок за блоком.", es: "Un mapa vivo de la actividad on-chain: cada pulso es una transacción real que puedes verificar bloque a bloque.", pt: "Um mapa vivo da atividade on-chain — cada pulso é uma transação real que você pode verificar bloco a bloco.", fr: "Une carte vivante de l'activité on-chain — chaque impulsion est une vraie transaction que vous pouvez vérifier bloc par bloc.", de: "Eine lebendige Karte der On-chain-Aktivität — jeder Puls ist eine echte Transaktion, die du Block für Block überprüfen kannst.", zh: "链上活动的动态地图——每一次脉冲都是一笔可逐块验证的真实交易。" })}
        </p>
      </div>
      <div className="relative mx-auto mt-12 aspect-square w-full max-w-[560px]">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      </div>
    </section>
  );
}
