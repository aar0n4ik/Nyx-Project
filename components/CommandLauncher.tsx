"use client";
import { Command } from "lucide-react";
import { useLang, pick } from "@/lib/i18n";

export default function CommandLauncher() {
  const lang = useLang();
  const open = () =>
    window.dispatchEvent(new CustomEvent("nyx-open-command"));
  return (
    <button
      onClick={open}
      aria-label="Open command palette"
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full border border-hairline bg-base/80 px-4 py-2.5 text-sm text-ink shadow-lg backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-[rgba(153,69,255,0.4)]"
    >
      <Command className="h-4 w-4" />
      <span className="hidden sm:inline">
        {pick(lang, { en: "Tools", ru: "Инструменты", es: "Herramientas", pt: "Ferramentas", fr: "Outils", de: "Werkzeuge", zh: "工具" })}
      </span>
      <kbd className="rounded bg-subtle px-1.5 py-0.5 text-[10px] text-muted">⌘K</kbd>
    </button>
  );
}
