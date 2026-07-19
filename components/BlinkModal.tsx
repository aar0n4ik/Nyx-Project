"use client";
import { useEffect } from "react";

export default function BlinkModal() {
  useEffect(() => {
    const onOpen = () => {
      const el = document.getElementById("markets") || document.getElementById("edge");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    window.addEventListener("nyx-open-blink", onOpen as EventListener);
    return () => window.removeEventListener("nyx-open-blink", onOpen as EventListener);
  }, []);
  return null;
}
