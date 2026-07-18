"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Cpu } from "lucide-react";
import { useLang, pick } from "@/lib/i18n";

const RPC_DEVNET = "https://api.devnet.solana.com";
const MARKET_ACCOUNT = "FAzwcBzofAQQfVFUKKF4ZG5LF2XT1g9BCiu7zYb4QSW4";

function lmsrCost(qy: number, qn: number, b: number) {
  const m = Math.max(qy, qn);
  return b * Math.log(Math.exp((qy - m) / b) + Math.exp((qn - m) / b)) + m;
}

function priceYes(qy: number, qn: number, b: number) {
  const m = Math.max(qy, qn);
  const ey = Math.exp((qy - m) / b);
  const en = Math.exp((qn - m) / b);
  return ey / (ey + en);
}

function shorten(s: string) {
  if (s.length <= 12) return s;
  return s.slice(0, 6) + "…" + s.slice(-6);
}

type Chain = {
  loading: boolean;
  found: boolean;
  lamports?: number;
  owner?: string;
  space?: number;
  err?: string;
};

export default function AmmVisualizer() {
  const lang = useLang();
  const [b, setB] = useState(500);
  const [buy, setBuy] = useState(120);
  const [chain, setChain] = useState<Chain>({ loading: true, found: false });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const qy0 = 0;
  const qn0 = 0;

  const stats = useMemo(() => {
    const before = priceYes(qy0, qn0, b);
    const after = priceYes(qy0 + buy, qn0, b);
    const cost = lmsrCost(qy0 + buy, qn0, b) - lmsrCost(qy0, qn0, b);
    const avg = buy > 0 ? cost / buy : before;
    const maxLoss = b * Math.log(2);
    return { before, after, cost, avg, maxLoss, slip: after - before };
  }, [b, buy]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setChain({ loading: true, found: false });
      try {
        const res = await fetch(RPC_DEVNET, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "getAccountInfo",
            params: [MARKET_ACCOUNT, { encoding: "base64", commitment: "confirmed" }],
          }),
        });
        const json = (await res.json()) as {
          result?: { value?: { lamports?: number; owner?: string; space?: number } };
        };
        if (cancelled) return;
        const v = json.result?.value;
        if (!v) {
          setChain({ loading: false, found: false, err: "Account not found" });
          return;
        }
        setChain({
          loading: false,
          found: true,
          lamports: v.lamports,
          owner: v.owner,
          space: v.space,
        });
      } catch (e) {
        if (!cancelled) setChain({ loading: false, found: false, err: "RPC error" });
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = 220;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const padL = 36;
    const padR = 12;
    const padT = 12;
    const padB = 24;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;
    const maxShares = 3 * b;

    ctx.strokeStyle = "rgba(120,120,140,0.18)";
    ctx.lineWidth = 1;
    ctx.fillStyle = "rgba(140,140,160,0.7)";
    ctx.font = "10px monospace";
    for (let i = 0; i <= 4; i++) {
      const y = padT + (plotH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + plotW, y);
      ctx.stroke();
      const label = (1 - i / 4).toFixed(2);
      ctx.fillText(label, 6, y + 3);
    }

    const grad = ctx.createLinearGradient(padL, 0, padL + plotW, 0);
    grad.addColorStop(0, "#6D4AFF");
    grad.addColorStop(0.5, "#9945FF");
    grad.addColorStop(1, "#0BB5D6");
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    const steps = 120;
    for (let i = 0; i <= steps; i++) {
      const s = (maxShares * i) / steps;
      const p = priceYes(qy0 + s, qn0, b);
      const x = padL + (plotW * i) / steps;
      const y = padT + plotH * (1 - p);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    const cx = padL + plotW * Math.min(1, buy / maxShares);
    const cy = padT + plotH * (1 - stats.after);
    ctx.fillStyle = "#0BB5D6";
    ctx.beginPath();
    ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(11,181,214,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, padT);
    ctx.lineTo(cx, padT + plotH);
    ctx.stroke();
  }, [b, buy, stats.after]);

  return (
    <section id="pamm" className="mx-auto max-w-content px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-hairline px-3 py-1 text-xs text-muted">
          <Cpu className="h-3.5 w-3.5 text-nyx" />
          {pick(lang, { en: "Recentred-LMSR market maker", ru: "Маркет-мейкер на рецентрированном LMSR", es: "Creador de mercado LMSR recentrado", pt: "Formador de mercado LMSR recentrado", fr: "Teneur de marché LMSR recentré", de: "Recentred-LMSR-Market-Maker", zh: "重心校正 LMSR 做市商" })}
        </div>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {pick(lang, { en: "Watch the price form", ru: "Смотри, как формируется цена", es: "Mira cómo se forma el precio", pt: "Veja o preço se formar", fr: "Regardez le prix se former", de: "Sieh, wie sich der Preis bildet", zh: "看价格如何形成" })}
        </h2>
        <p className="mt-3 text-muted">
          {pick(lang, { en: "The exact automated market maker that prices Nyx markets on-chain. Move the stake and see the odds, cost and slippage update live — bounded LP loss of b·ln(n), by construction.", ru: "Тот самый автоматический маркет-мейкер, который оценивает рынки Nyx ончейн. Двигай ставку и смотри, как вживую меняются коэффициенты, стоимость и проскальзывание — с ограниченным убытком LP b·ln(n) по построению.", es: "El mismo creador de mercado automático que fija los precios de los mercados de Nyx on-chain. Mueve la apuesta y observa cómo las cuotas, el costo y el deslizamiento se actualizan en vivo, con una pérdida de LP acotada a b·ln(n) por construcción.", pt: "O mesmo formador de mercado automático que precifica os mercados da Nyx on-chain. Mova a aposta e veja as odds, o custo e o slippage atualizarem ao vivo — com perda de LP limitada a b·ln(n), por construção.", fr: "Le teneur de marché automatique exact qui tarifie les marchés Nyx on-chain. Déplacez la mise et voyez les cotes, le coût et le slippage se mettre à jour en direct — perte de LP bornée à b·ln(n), par construction.", de: "Genau der automatische Market-Maker, der Nyx-Märkte on-chain bepreist. Verschiebe den Einsatz und sieh, wie sich Quoten, Kosten und Slippage live aktualisieren — mit begrenztem LP-Verlust von b·ln(n), konstruktionsbedingt.", zh: "正是为 Nyx 市场在链上定价的自动做市商。移动下注额，实时查看赔率、成本和滑点的变化——LP 亏损在构造上被限定为 b·ln(n)。" })}
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-2xl space-y-5 rounded-3xl border border-hairline bg-subtle p-5 sm:p-6">
        <div className="rounded-2xl border border-hairline bg-base px-3 py-2 text-xs">
          <div className="flex items-center gap-2 text-muted">
            <Activity className="h-3.5 w-3.5 text-verify" />
            {pick(lang, { en: "Live market account", ru: "Живой рыночный аккаунт", es: "Cuenta de mercado en vivo", pt: "Conta de mercado ao vivo", fr: "Compte de marché en direct", de: "Live-Marktkonto", zh: "实时市场账户" })}
            <span className="ml-auto font-mono">{shorten(MARKET_ACCOUNT)}</span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 font-mono">
            <div>
              <div className="text-muted">{pick(lang, { en: "Rent", ru: "Рента", es: "Renta", pt: "Aluguel", fr: "Loyer", de: "Miete", zh: "租金" })}</div>
              <div className="text-ink">
                {chain.loading
                  ? "…"
                  : chain.found && chain.lamports != null
                    ? (chain.lamports / 1e9).toFixed(4) + " SOL"
                    : "—"}
              </div>
            </div>
            <div>
              <div className="text-muted">{pick(lang, { en: "Owner", ru: "Владелец", es: "Propietario", pt: "Proprietário", fr: "Propriétaire", de: "Eigentümer", zh: "所有者" })}</div>
              <div className="text-ink">
                {chain.found && chain.owner ? shorten(chain.owner) : "—"}
              </div>
            </div>
            <div>
              <div className="text-muted">{pick(lang, { en: "Size", ru: "Размер", es: "Tamaño", pt: "Tamanho", fr: "Taille", de: "Größe", zh: "大小" })}</div>
              <div className="text-ink">
                {chain.found && chain.space != null ? chain.space + " B" : "—"}
              </div>
            </div>
          </div>
        </div>

        <canvas ref={canvasRef} className="w-full h-[220px]" />

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-hairline bg-base px-3 py-2">
            <div className="text-xs text-muted">{pick(lang, { en: "YES price now", ru: "Цена ДА сейчас", es: "Precio SÍ ahora", pt: "Preço SIM agora", fr: "Prix OUI maintenant", de: "JA-Preis jetzt", zh: "当前 是 价格" })}</div>
            <div className="font-mono text-lg text-ink">
              {Math.round(stats.before * 100)}¢
            </div>
          </div>
          <div className="rounded-xl border border-hairline bg-base px-3 py-2">
            <div className="text-xs text-muted">{pick(lang, { en: "YES price after", ru: "Цена ДА после", es: "Precio SÍ después", pt: "Preço SIM depois", fr: "Prix OUI après", de: "JA-Preis danach", zh: "之后 是 价格" })}</div>
            <div className="font-mono text-lg text-ink">
              {Math.round(stats.after * 100)}¢
            </div>
          </div>
          <div className="rounded-xl border border-hairline bg-base px-3 py-2">
            <div className="text-xs text-muted">{pick(lang, { en: "Cost", ru: "Стоимость", es: "Costo", pt: "Custo", fr: "Coût", de: "Kosten", zh: "成本" })}</div>
            <div className="font-mono text-lg text-ink">
              {stats.cost.toFixed(1)} USD₮
            </div>
          </div>
          <div className="rounded-xl border border-hairline bg-base px-3 py-2">
            <div className="text-xs text-muted">{pick(lang, { en: "Avg fill · slippage", ru: "Средняя цена · проскальзывание", es: "Precio medio · deslizamiento", pt: "Preço médio · slippage", fr: "Prix moyen · slippage", de: "Ø-Ausführung · Slippage", zh: "平均成交 · 滑点" })}</div>
            <div className="font-mono text-lg text-ink">
              {Math.round(stats.avg * 100)}¢ · +{Math.round(stats.slip * 100)}¢
            </div>
          </div>
        </div>

        <div>
          <div className="mb-1 flex justify-between text-xs text-muted">
            <span>{pick(lang, { en: "Buy YES shares", ru: "Купить доли ДА", es: "Comprar acciones SÍ", pt: "Comprar cotas SIM", fr: "Acheter des parts OUI", de: "JA-Anteile kaufen", zh: "买入 是 份额" })}</span>
            <span className="font-mono text-ink">{buy}</span>
          </div>
          <input
            type="range"
            min={0}
            max={3 * b}
            step={5}
            value={buy}
            onChange={(e) => setBuy(Number(e.target.value))}
            className="w-full accent-nyx"
          />
        </div>

        <div>
          <div className="mb-1 flex justify-between text-xs text-muted">
            <span>{pick(lang, { en: "Liquidity b — max LP loss", ru: "Ликвидность b — макс. убыток LP", es: "Liquidez b — pérdida máx. de LP", pt: "Liquidez b — perda máx. de LP", fr: "Liquidité b — perte max. LP", de: "Liquidität b — max. LP-Verlust", zh: "流动性 b — LP 最大亏损" })} {stats.maxLoss.toFixed(0)} USD₮</span>
            <span className="font-mono text-ink">{b}</span>
          </div>
          <input
            type="range"
            min={100}
            max={2000}
            step={50}
            value={b}
            onChange={(e) => setB(Number(e.target.value))}
            className="w-full accent-nyx"
          />
        </div>
      </div>
    </section>
  );
}
