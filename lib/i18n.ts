"use client";

import { useEffect, useState } from "react";

export type Lang = "en" | "ru" | "es" | "pt" | "fr" | "de" | "zh";

export const LANGS: { code: Lang; label: string }[] = [
  { code: "en", label: "English" },
  { code: "ru", label: "Русский" },
  { code: "es", label: "Español" },
  { code: "pt", label: "Português" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "zh", label: "中文" },
];

type Dict = Record<string, string>;

const DICTS: Record<Lang, Dict> = {
  en: {
    "cta.bet": "Place a bet",
    "cta.verify": "Verify on-chain",
    "cta.app": "Open the app",
    "trust.tagline": "Verify, don't trust",
    "edge.title": "On-device intelligence",
    "nav.roadmap": "Roadmap",
  },
  ru: {
    "cta.bet": "Сделать ставку",
    "cta.verify": "Проверить в сети",
    "cta.app": "Открыть приложение",
    "trust.tagline": "Проверяй, а не доверяй",
    "edge.title": "Интеллект на устройстве",
    "nav.roadmap": "Дорожная карта",
  },
  es: {
    "cta.bet": "Hacer una apuesta",
    "cta.verify": "Verificar en cadena",
    "cta.app": "Abrir la app",
    "trust.tagline": "Verifica, no confíes",
    "edge.title": "Inteligencia en el dispositivo",
    "nav.roadmap": "Hoja de ruta",
  },
  pt: {
    "cta.bet": "Fazer uma aposta",
    "cta.verify": "Verificar na rede",
    "cta.app": "Abrir o app",
    "trust.tagline": "Verifique, não confie",
    "edge.title": "Inteligência no dispositivo",
    "nav.roadmap": "Roteiro",
  },
  fr: {
    "cta.bet": "Placer un pari",
    "cta.verify": "Vérifier on-chain",
    "cta.app": "Ouvrir l'app",
    "trust.tagline": "Vérifie, ne fais pas confiance",
    "edge.title": "Intelligence sur l'appareil",
    "nav.roadmap": "Feuille de route",
  },
  de: {
    "cta.bet": "Wette platzieren",
    "cta.verify": "On-Chain prüfen",
    "cta.app": "App öffnen",
    "trust.tagline": "Prüfen statt vertrauen",
    "edge.title": "Intelligenz auf dem Gerät",
    "nav.roadmap": "Roadmap",
  },
  zh: {
    "cta.bet": "下注",
    "cta.verify": "链上验证",
    "cta.app": "打开应用",
    "trust.tagline": "验证，而非信任",
    "edge.title": "端侧智能",
    "nav.roadmap": "路线图",
  },
};

export function getLang(): Lang {
  if (typeof window === "undefined") return "en";
  const raw = window.localStorage.getItem("nyx-lang") as Lang | null;
  return raw && DICTS[raw] ? raw : "en";
}

export function setLang(code: Lang) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("nyx-lang", code);
  document.documentElement.lang = code;
  window.dispatchEvent(new CustomEvent("nyx-lang-change", { detail: code }));
}

export function translate(lang: Lang, key: string): string {
  return DICTS[lang]?.[key] ?? DICTS.en[key] ?? key;
}

export function useT() {
  const [lang, setL] = useState<Lang>("en");

  useEffect(() => {
    setL(getLang());
    const on = () => setL(getLang());
    window.addEventListener("nyx-lang-change", on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener("nyx-lang-change", on);
      window.removeEventListener("storage", on);
    };
  }, []);

  return { lang, setLang, t: (key: string) => translate(lang, key) };
}
