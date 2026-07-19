"use client";
import { useEffect, useMemo, useState } from "react";
import { useWallet, type Wallet } from "@solana/wallet-adapter-react";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { useLang, pick } from "@/lib/i18n";

type WItem = {
  key: string;
  name: string;
  short: string;
  color: string;
  url: string;
  mobile?: (page: string, origin: string) => string;
};

const WALLETS: WItem[] = [
  { key: "phantom", name: "Phantom", short: "Ph", color: "#ab9ff2", url: "https://phantom.app/download", mobile: (p, o) => "https://phantom.app/ul/browse/" + encodeURIComponent(p) + "?ref=" + encodeURIComponent(o) },
  { key: "solflare", name: "Solflare", short: "Sf", color: "#fc7227", url: "https://solflare.com/download", mobile: (p, o) => "https://solflare.com/ul/v1/browse/" + encodeURIComponent(p) + "?ref=" + encodeURIComponent(o) },
  { key: "backpack", name: "Backpack", short: "Bp", color: "#e33e3f", url: "https://backpack.app/download", mobile: (p, o) => "https://backpack.app/ul/v1/browse/" + encodeURIComponent(p) + "?ref=" + encodeURIComponent(o) },
  { key: "coinbase", name: "Coinbase Wallet", short: "Cb", color: "#2151f5", url: "https://www.coinbase.com/wallet/downloads", mobile: (p) => "https://go.cb-w.com/dapp?cb_url=" + encodeURIComponent(p) },
  { key: "okx", name: "OKX Wallet", short: "Ok", color: "#111827", url: "https://www.okx.com/web3", mobile: (p) => "okx://wallet/dapp/url?dappUrl=" + encodeURIComponent(p) },
  { key: "trust", name: "Trust Wallet", short: "Tr", color: "#3375bb", url: "https://trustwallet.com/download", mobile: (p) => "https://link.trustwallet.com/open_url?coin_id=501&url=" + encodeURIComponent(p) },
  { key: "glow", name: "Glow", short: "Gl", color: "#f9c23c", url: "https://glow.app/download" },
  { key: "magic eden", name: "Magic Eden", short: "Me", color: "#e42575", url: "https://wallet.magiceden.io" },
  { key: "ledger", name: "Ledger", short: "Ld", color: "#111827", url: "https://www.ledger.com/ledger-live" },
  { key: "torus", name: "Torus", short: "To", color: "#0364ff", url: "https://tor.us" },
];

const T = {
  title: { en: "Connect a wallet", ru: "Подключить кошелёк" },
  sub: { en: "Solana · all wallets in one place", ru: "Solana · все кошельки в одном месте" },
  detected: { en: "Detected", ru: "Найден" },
  open: { en: "Open app", ru: "Открыть" },
  get: { en: "Get", ru: "Скачать" },
  mobile: { en: "On phone: tap a wallet to open it — the app loads this page and connects. No QR needed.", ru: "С телефона: тапни кошелёк — приложение откроет эту страницу и подключится. Без QR." },
};

const mono = (c: string) => ({ background: c });

export default function WalletPicker() {
  const lang = useLang();
  const { wallets, select, connect, connected, wallet } = useWallet();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => { setIsMobile(/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)); }, []);

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

  const findAdapter = (item: WItem): Wallet | undefined =>
    wallets.find((w) => {
      const n = w.adapter.name.toLowerCase();
      return n.includes(item.key) || item.key.includes(n);
    });

  const list = useMemo(() => {
    const rows = WALLETS.map((item) => {
      const found = findAdapter(item);
      const ready = !!found && (found.adapter.readyState === WalletReadyState.Installed || found.adapter.readyState === WalletReadyState.Loadable);
      return { item, found, ready };
    });
    return rows.sort((a, b) => Number(b.ready) - Number(a.ready));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallets]);

  const onPick = (item: WItem, found: Wallet | undefined, ready: boolean) => {
    if (found && ready) {
      setPending(found.adapter.name);
      select(found.adapter.name);
      return;
    }
    const page = window.location.href;
    const origin = window.location.origin;
    if (isMobile && item.mobile) { window.location.href = item.mobile(page, origin); return; }
    window.open(item.url, "_blank", "noopener");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div role="dialog" aria-modal="true" className="relative z-10 flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-hairline bg-base shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between border-b border-hairline px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-ink">{pick(lang, T.title)}</h3>
            <p className="mt-0.5 text-xs text-muted">{pick(lang, T.sub)}</p>
          </div>
          <button onClick={() => setOpen(false)} aria-label="Close" className="text-muted transition hover:text-ink">×</button>
        </div>

        <div className="grid flex-1 grid-cols-2 gap-2 overflow-y-auto p-4">
          {list.map(({ item, found, ready }) => (
            <button
              key={item.key}
              onClick={() => onPick(item, found, ready)}
              className={"nyx-odd flex items-center gap-3 rounded-xl border p-3 text-left " + (ready ? "border-green-500/40 bg-green-500/5" : "border-hairline bg-subtle hover:border-nyx")}
            >
              {found ? (
                <img src={found.adapter.icon} alt="" className="h-9 w-9 shrink-0 rounded-lg" />
              ) : (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white" style={mono(item.color)}>{item.short}</span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">{item.name}</span>
                <span className={"text-[10px] font-semibold uppercase tracking-wide " + (ready ? "text-green-500" : "text-muted")}>
                  {ready ? pick(lang, T.detected) : isMobile && item.mobile ? pick(lang, T.open) : pick(lang, T.get)}
                </span>
              </span>
            </button>
          ))}
        </div>

        <div className="border-t border-hairline px-5 py-3">
          <p className="text-[11px] leading-relaxed text-muted">{pick(lang, T.mobile)}</p>
        </div>
      </div>
    </div>
  );
}
