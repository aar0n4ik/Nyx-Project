"use client";
import { useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

const SCRIPT =
  "Nyx. Bets you don't have to trust. Zero custody, keyless settlement, and verifiable AI inference, all proven on Solana.";

export default function Narration() {
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (playing) {
      window.speechSynthesis.cancel();
      setPlaying(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(SCRIPT);
    u.rate = 0.98;
    u.onend = () => setPlaying(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    setPlaying(true);
  };

  return (
    <button
      onClick={toggle}
      aria-label="Play narration"
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full border border-hairline bg-white/90 px-4 py-2.5 text-sm font-semibold text-ink shadow-lg backdrop-blur transition-transform hover:-translate-y-0.5"
    >
      {playing ? <VolumeX className="h-4 w-4 text-nyx" /> : <Volume2 className="h-4 w-4 text-nyx" />}
      {playing ? "Stop" : "Hear Nyx"}
    </button>
  );
}
