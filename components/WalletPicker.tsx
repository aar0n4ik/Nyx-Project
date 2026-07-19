"use client";
import { useEffect, useMemo, useState } from "react";
import { useWallet, type Wallet } from "@solana/wallet-adapter-react";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { useLang, pick } from "@/lib/i18n";

const T = {
  title: { en: "Connect a wallet", ru: "Подключить кошелёк" },
  sub: { en: "Solana · pick from your installed wallets", ru: "Solana · выбери из установленных" },
  search: { en: "Search wallets", ru: "Поиск кошелька" },
  detected: { en: "Installed", ru: "Установленные" },
  more: { en: "More wallets", ru: "Другие кошельки" },
  none: { en: "No Solana wallet detected. Install one below.", ru: "Кошелёк Solana не найден. Установи один из списка." },
  mobile: { en: "On phone? Open this page inside your wallet app's built-in browser (Phantom, Solflare) for one-tap connect.", ru: "С телефона? Открой страницу во встроенном браузере кошелька (Phantom, Solflare) — подключит в один тап." },
  install: { en: "Install", ru: "Установить" },
  detectedTag: { en: "Detected", ru: "Найден" },
};

export default function WalletPicker() {
  const lang = useLang();
  const { wallets, select, connect, connected, wallet } = useWallet();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("nyx-open-wallet", onOpen as EventListener);
    return () => window.removeEventListener("nyx-open-wallet", onOpen as EventListener);
  }, []);

  useEffect(() => { if (connected) setOpen(false); }, [connected]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    if (pending && wallet && wallet.adapter.name === pending) {
      connect().catch(() => {});
      setPending(null);
    }
  }, [pending, wallet, connect]);

  const groups = useMemo(() => {
    const installed: Wallet[] = [];
    const more: Wallet[] = [];
    for (const w of wallets) {
      const rs = w.adapter.readyState;
      if (rs === WalletReadyState.Installed || rs === WalletReadyState.Loadable) installed.push(w);
      else more.push(w);
    }
    return { installed, more };
  }, [wallets]);

  const filtered = (list: Wallet[]) => (q ? list.filter((w) => w.adapter.name.toLowerCase().includes(q.toLowerCase())) : list);

  const onPick = (w: Wallet) => {
    const ready = w.adapter.readyState === WalletReadyState.Installed || w.adapter.readyState === WalletReadyState.Loadable;
    if (!ready) { window.open(w.adapter.url, "_blank", "noopener"); return; }
    setPending(w.adapter.name);
    select(w.adapter.name);
  };

  const row = (w: Wallet, ready: boolean) => (
    <button key={w.adapter.name} onClick={() => onPick(w)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-subtle">
      <img src={w.adapter.icon} alt="" className="h-8 w-8 shrink-0 rounded-lg" />
      <span className="flex-1 truncate text-sm font-medium text-ink">{w.adapter.name}</span>
      <span className={"text-[10px] uppercase tracking-wide " + (ready ? "text-green-500" : "text-muted")}>{ready ? pick(lang, T.detectedTag) : pick(lang, T.install)}</span>
    </button>
  );

  if (!open) return null;

  const inst = filtered(groups.installed);
  const rest = filtered(groups.more);

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div role="dialog" aria-modal="true" className="relative z-10 flex max-h-[85vh] w-full max-w-sm flex-col overflow-hidden rounded-t-2xl border border-hairline bg-base shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between border-b border-hairline px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-ink">{pick(lang, T.title)}</h3>
            <p className="mt-0.5 text-xs text-muted">{pick(lang, T.sub)}</p>
          </div>
          <button onClick={() => setOpen(false)} aria-label="Close" className="text-muted transition hover:text-ink">×</button>
        </div>

        <div className="px-5 pt-3">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={pick(lang, T.search)} className="w-full rounded-xl border border-hairline bg-subtle px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-nyx" />
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          {inst.length > 0 ? (
            <div className="mb-2">
              <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">{pick(lang, T.detected)}</div>
              {inst.map((w) => row(w, true))}
            </div>
          ) : (
            <p className="px-2 py-3 text-center text-xs text-muted">{pick(lang, T.none)}</p>
          )}
          {rest.length > 0 ? (
            <div>
              <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted">{pick(lang, T.more)}</div>
              {rest.map((w) => row(w, false))}
            </div>
          ) : null}
        </div>

        <div className="border-t border-hairline px-5 py-3">
          <p className="text-[11px] leading-relaxed text-muted">{pick(lang, T.mobile)}</p>
        </div>
      </div>
    </div>
  );
}
