"use client";
import { useEffect, useState } from "react";
import InlineBlink from "@/components/InlineBlink";
import "@dialectlabs/blinks/index.css";

const BLINK_URL =
  "https://nyx-project-roan.vercel.app/api/actions/bet?match=88008802&market=h&odds=2.00";

export default function BlinkModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("nyx-open-blink", onOpen as EventListener);
    return () => window.removeEventListener("nyx-open-blink", onOpen as EventListener);
  }, []);

  if (!open) return null;

  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();
  return (
    <div
      onClick={() => setOpen(false)}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <div onClick={stop} className="w-full max-w-md">
        <InlineBlink url={BLINK_URL} />
      </div>
    </div>
  );
}
