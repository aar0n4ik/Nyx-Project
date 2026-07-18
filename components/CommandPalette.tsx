"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, CornerDownLeft, ArrowUp, ArrowDown } from "lucide-react";
import { useTrack } from "@/components/useTrack";
import { useLang, pick } from "@/lib/i18n";

const BLINK_ACTION = "https://nyx-project-roan.vercel.app/api/actions/bet";
const BLINK_URL =
  "https://dial.to/?action=solana-action:" + encodeURIComponent(BLINK_ACTION + (BLINK_ACTION.includes("?")?"&":"?") + "cb=" + (process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA||"dev"));
const GITHUB_URL = "https://github.com/aar0n4ik/Nyx-Project";
const LIVE_URL = "https://nyx-project-roan.vercel.app";

type Cmd = {
  id: string;
  label: string;
  group: string;
  hint?: string;
  keywords: string;
  run: () => void;
};

const overlayHidden = { opacity: 0 } as const;
const overlayShown = { opacity: 1 } as const;
const overlayTrans = { duration: 0.15, ease: "easeOut" } as const;
const panelHidden = { opacity: 0, y: 12, scale: 0.98 } as const;
const panelShown = { opacity: 1, y: 0, scale: 1 } as const;
const panelTrans = { duration: 0.18, ease: "easeOut" } as const;

function goTo(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function CommandPalette() {
  const lang = useLang();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [, setTrack] = useTrack();

  const cmds = useMemo<Cmd[]>(() => {
    const close = () => setOpen(false);
    const nav = (id: string) => () => {
      close();
      goTo(id);
    };
    const ext = (url: string) => () => {
      close();
      window.open(url, "_blank", "noopener,noreferrer");
    };
    const gActions = pick(lang, { en: "Actions", ru: "Действия", es: "Acciones", pt: "Ações", fr: "Actions", de: "Aktionen", zh: "操作" });
    const gNav = pick(lang, { en: "Navigate", ru: "Навигация", es: "Navegar", pt: "Navegar", fr: "Naviguer", de: "Navigation", zh: "导航" });
    const gTracks = pick(lang, { en: "Tracks", ru: "Треки", es: "Tracks", pt: "Tracks", fr: "Tracks", de: "Tracks", zh: "赛道" });
    return [
      { id: "bet", label: pick(lang, { en: "Place a bet", ru: "Сделать ставку", es: "Hacer una apuesta", pt: "Fazer uma aposta", fr: "Placer un pari", de: "Wette platzieren", zh: "下注" }), group: gActions, hint: "Blink", keywords: "bet stake wager blink solana", run: () => { setOpen(false); if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("nyx-open-blink", { detail: { url: BLINK_ACTION } })); } },
      { id: "app", label: pick(lang, { en: "Open the app", ru: "Открыть приложение", es: "Abrir la app", pt: "Abrir o app", fr: "Ouvrir l'app", de: "App öffnen", zh: "打开应用" }), group: gActions, keywords: "app dashboard launch", run: () => { setOpen(false); window.location.href = "/app"; } },
      { id: "github", label: pick(lang, { en: "View source on GitHub", ru: "Открыть исходники на GitHub", es: "Ver el código en GitHub", pt: "Ver o código no GitHub", fr: "Voir le code sur GitHub", de: "Quellcode auf GitHub ansehen", zh: "在 GitHub 查看源码" }), group: gActions, keywords: "github code repo source", run: ext(GITHUB_URL) },
      { id: "live", label: pick(lang, { en: "Open live site", ru: "Открыть живой сайт", es: "Abrir el sitio en vivo", pt: "Abrir o site ao vivo", fr: "Ouvrir le site en direct", de: "Live-Website öffnen", zh: "打开线上站点" }), group: gActions, keywords: "live production vercel", run: ext(LIVE_URL) },
      { id: "nav-tracks", label: pick(lang, { en: "Tracks", ru: "Треки", es: "Tracks", pt: "Tracks", fr: "Tracks", de: "Tracks", zh: "赛道" }), group: gNav, keywords: "tracks settlement agents fan", run: nav("tracks") },
      { id: "nav-roadmap", label: pick(lang, { en: "Roadmap", ru: "Дорожная карта", es: "Hoja de ruta", pt: "Roadmap", fr: "Feuille de route", de: "Roadmap", zh: "路线图" }), group: gNav, keywords: "roadmap plan phases", run: nav("roadmap") },
      { id: "nav-markets", label: pick(lang, { en: "Markets", ru: "Рынки", es: "Mercados", pt: "Mercados", fr: "Marchés", de: "Märkte", zh: "市场" }), group: gNav, keywords: "markets odds bets", run: nav("markets") },
      { id: "nav-live", label: pick(lang, { en: "Live constellation", ru: "Живое созвездие", es: "Constelación en vivo", pt: "Constelação ao vivo", fr: "Constellation en direct", de: "Live-Konstellation", zh: "实时星座" }), group: gNav, keywords: "live constellation activity", run: nav("live") },
      { id: "nav-feed", label: pick(lang, { en: "Transaction feed", ru: "Лента транзакций", es: "Feed de transacciones", pt: "Feed de transações", fr: "Flux de transactions", de: "Transaktions-Feed", zh: "交易流" }), group: gNav, keywords: "feed transactions stream", run: nav("feed") },
      { id: "nav-proof", label: pick(lang, { en: "Verify on-chain", ru: "Проверить ончейн", es: "Verificar on-chain", pt: "Verificar on-chain", fr: "Vérifier on-chain", de: "On-chain überprüfen", zh: "链上验证" }), group: gNav, keywords: "proof verify chain inference", run: nav("proof") },
      { id: "nav-faq", label: pick(lang, { en: "FAQ", ru: "Частые вопросы", es: "FAQ", pt: "FAQ", fr: "FAQ", de: "FAQ", zh: "常见问题" }), group: gNav, keywords: "faq questions help", run: nav("faq") },
      { id: "nav-founder", label: pick(lang, { en: "About the founder", ru: "О создателе", es: "Sobre el fundador", pt: "Sobre o fundador", fr: "À propos du fondateur", de: "Über den Gründer", zh: "关于创始人" }), group: gNav, keywords: "founder about aaron", run: nav("founder") },
      { id: "track-settlement", label: pick(lang, { en: "Focus: Settlement track", ru: "Фокус: трек Расчёты", es: "Enfoque: track Liquidación", pt: "Foco: track Liquidação", fr: "Focus : track Règlement", de: "Fokus: Settlement-Track", zh: "聚焦：结算赛道" }), group: gTracks, keywords: "settlement no admin key", run: () => { setTrack("settlement"); setOpen(false); } },
      { id: "track-agents", label: pick(lang, { en: "Focus: Agents track", ru: "Фокус: трек Агенты", es: "Enfoque: track Agentes", pt: "Foco: track Agentes", fr: "Focus : track Agents", de: "Fokus: Agents-Track", zh: "聚焦：智能体赛道" }), group: gTracks, keywords: "agents trading bot", run: () => { setTrack("agents"); setOpen(false); } },
      { id: "track-fan", label: pick(lang, { en: "Focus: Fan track", ru: "Фокус: трек Фан", es: "Enfoque: track Fan", pt: "Foco: track Fã", fr: "Focus : track Fan", de: "Fokus: Fan-Track", zh: "聚焦：粉丝赛道" }), group: gTracks, keywords: "fan consumer social", run: () => { setTrack("fan"); setOpen(false); } },
    ];
  }, [setTrack, lang]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cmds;
    return cmds.filter(
      (c) =>
        c.label.toLowerCase().indexOf(q) >= 0 ||
        c.keywords.indexOf(q) >= 0 ||
        c.group.toLowerCase().indexOf(q) >= 0
    );
  }, [query, cmds]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      const t = setTimeout(() => inputRef.current?.focus(), 20);
      return () => clearTimeout(t);
    }
    return;
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  const onPanelKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (filtered.length ? (i + 1) % filtered.length : 0));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (filtered.length ? (i - 1 + filtered.length) % filtered.length : 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const cmd = filtered[active];
      if (cmd) cmd.run();
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={overlayHidden}
          animate={overlayShown}
          exit={overlayHidden}
          transition={overlayTrans}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[15vh] backdrop-blur-sm"
        >
          <motion.div
            initial={panelHidden}
            animate={panelShown}
            exit={panelHidden}
            transition={panelTrans}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={onPanelKey}
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-hairline bg-base shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-hairline px-4">
              <Search className="h-4 w-4 text-muted" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={pick(lang, { en: "Search Nyx — jump, bet, verify…", ru: "Поиск по Nyx — перейти, поставить, проверить…", es: "Busca en Nyx: saltar, apostar, verificar…", pt: "Busque no Nyx — pular, apostar, verificar…", fr: "Rechercher dans Nyx — aller, parier, vérifier…", de: "Nyx durchsuchen — springen, wetten, prüfen…", zh: "搜索 Nyx——跳转、下注、验证…" })}
                className="w-full bg-transparent py-4 text-sm text-ink outline-none placeholder:text-muted"
              />
              <kbd className="rounded border border-hairline px-1.5 py-0.5 text-[10px] text-muted">
                ESC
              </kbd>
            </div>

            <div className="max-h-80 overflow-y-auto py-2">
              {filtered.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted">
                  {pick(lang, { en: "No matches", ru: "Ничего не найдено", es: "Sin coincidencias", pt: "Nenhum resultado", fr: "Aucun résultat", de: "Keine Treffer", zh: "无匹配项" })}
                </div>
              ) : (
                filtered.map((c, i) => {
                  const isActive = i === active;
                  return (
                    <button
                      key={c.id}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => c.run()}
                      className={
                        "flex w-full items-center justify-between px-4 py-2.5 text-left text-sm " +
                        (isActive ? "bg-subtle text-ink" : "text-muted")
                      }
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={
                            "text-[10px] uppercase tracking-wide " +
                            (isActive ? "text-nyx" : "text-muted")
                          }
                        >
                          {c.group}
                        </span>
                        <span className={isActive ? "text-ink" : "text-ink/80"}>
                          {c.label}
                        </span>
                      </span>
                      {c.hint ? (
                        <span className="text-[11px] text-muted">{c.hint}</span>
                      ) : isActive ? (
                        <CornerDownLeft className="h-3.5 w-3.5 text-muted" />
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex items-center gap-4 border-t border-hairline px-4 py-2 text-[11px] text-muted">
              <span className="flex items-center gap-1">
                <ArrowUp className="h-3 w-3" />
                <ArrowDown className="h-3 w-3" />
                {pick(lang, { en: "navigate", ru: "перемещение", es: "navegar", pt: "navegar", fr: "naviguer", de: "navigieren", zh: "导航" })}
              </span>
              <span className="flex items-center gap-1">
                <CornerDownLeft className="h-3 w-3" />
                {pick(lang, { en: "select", ru: "выбрать", es: "seleccionar", pt: "selecionar", fr: "sélectionner", de: "auswählen", zh: "选择" })}
              </span>
              <span className="ml-auto">Nyx</span>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
