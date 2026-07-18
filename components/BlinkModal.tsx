"use client";
import { useEffect, useState } from "react";
import InlineBlink from "@/components/InlineBlink";

export default function BlinkModal() {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const onOpen = (e: Event) => {
      const d = (e as CustomEvent).detail || {};
      setUrl(d.url || "https://nyx-project-roan.vercel.app/api/actions/bet");
    };
    window.addEventListener("nyx-open-blink", onOpen as EventListener);
    return () => window.removeEventListener("nyx-open-blink", onOpen as EventListener);
  }, []);
  if (!url) return null;
  return (
    <div onClick={() => setUrl(null)} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl border border-hairline bg-base p-5 shadow-2xl">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-sm font-semibold text-ink">Place your bet</span>
          <button onClick={() => setUrl(null)} className="text-xs uppercase tracking-wide text-muted hover:text-ink">Close</button>
        </div>
        <InlineBlink url={url} />
      </div>
    </div>
  );
}
