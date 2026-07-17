"use client";

import { useEffect, useRef, useState } from "react";
import { Gauge } from "lucide-react";

const RPC_DEVNET = "https://api.devnet.solana.com";
const SETTLEMENT = "AmMSLCCtJPCU3EJHEyxwAUTXQuzcAHVEVkCFJv6JrrW3";
const TREASURY = "DDLyynBSATRkb5svSXjZRLYGPrf2Trvudbrv7HKoaraE";

type Stats = {
  slot: number;
  sigs: number;
  balance: number;
  epoch: number;
  loading: boolean;
  live: boolean;
};

function useCountUp(target: number, duration = 850) {
  const [v, setV] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const from = prev.current;
    const to = target;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(1 - t, 3);
      setV(from + (to - from) * e);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        prev.current = to;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

function intFmt(n: number) {
  return Math.round(n).toLocaleString("en-US");
}

function Metric(props: { label: string; value: number; suffix?: string; decimals?: number }) {
  const v = useCountUp(props.value);
  const shown =
    props.decimals != null ? v.toFixed(props.decimals) : intFmt(v);
  return (
    <div className="px-4 py-4 text-center">
      <div className="font-mono text-2xl text-ink sm:text-3xl">
        {shown}
        {props.suffix ? (
          <span className="ml-1 text-sm text-muted">{props.suffix}</span>
        ) : null}
      </div>
      <div className="mt-1 text-xs text-muted">{props.label}</div>
    </div>
  );
}

export default function NetworkStats() {
  const [s, setS] = useState<Stats>({
    slot: 0,
    sigs: 0,
    balance: 0,
    epoch: 0,
    loading: true,
    live: false,
  });

  useEffect(() => {
    let cancelled = false;

    const pull = async () => {
      try {
        const res = await fetch(RPC_DEVNET, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify([
            { jsonrpc: "2.0", id: 1, method: "getSlot", params: [{ commitment: "confirmed" }] },
            { jsonrpc: "2.0", id: 2, method: "getSignaturesForAddress", params: [SETTLEMENT, { limit: 100 }] },
            { jsonrpc: "2.0", id: 3, method: "getBalance", params: [TREASURY, { commitment: "confirmed" }] },
            { jsonrpc: "2.0", id: 4, method: "getEpochInfo", params: [{ commitment: "confirmed" }] },
          ]),
        });
        const arr = (await res.json()) as Array<{ id: number; result?: unknown }>;
        if (cancelled) return;

        const byId = (id: number) => arr.find((x) => x.id === id)?.result;

        const slot = (byId(1) as number) || 0;
        const sigsRes = byId(2) as unknown[] | undefined;
        const sigs = Array.isArray(sigsRes) ? sigsRes.length : 0;
        const balRes = byId(3) as { value?: number } | undefined;
        const balance = balRes?.value != null ? balRes.value / 1e9 : 0;
        const epRes = byId(4) as { epoch?: number } | undefined;
        const epoch = epRes?.epoch ?? 0;

        setS({ slot, sigs, balance, epoch, loading: false, live: true });
      } catch (e) {
        if (!cancelled) setS((p) => ({ ...p, loading: false, live: false }));
      }
    };

    pull();
    const iv = setInterval(pull, 15000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, []);

  return (
    <section id="network" className="mx-auto max-w-content px-6 py-20">
      <div className="mx-auto max-w-4xl rounded-3xl border border-hairline bg-subtle p-2">
        <div className="flex items-center gap-2 px-4 pt-3 text-xs text-muted">
          <Gauge className="h-3.5 w-3.5 text-nyx" />
          Solana devnet · live
          <span
            className={
              "ml-auto flex items-center gap-1.5 " +
              (s.live ? "text-payout" : "text-muted")
            }
          >
            <span
              className={
                "h-2 w-2 rounded-full " +
                (s.live ? "animate-pulse bg-payout" : "bg-muted")
              }
            />
            {s.loading ? "syncing" : s.live ? "connected" : "offline"}
          </span>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-hairline sm:grid-cols-4 sm:divide-y-0">
          <Metric label="Current slot" value={s.slot} />
          <Metric label="Settlements indexed" value={s.sigs} />
          <Metric label="Treasury balance" value={s.balance} suffix="SOL" decimals={3} />
          <Metric label="Network epoch" value={s.epoch} />
        </div>
      </div>
    </section>
  );
}
