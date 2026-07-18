"use client";

import { useEffect, useState } from "react";

export type TrackId = "settlement" | "agents" | "fan";

const STORAGE_KEY = "nyx-track";
const EVENT = "nyx-track-change";

export function isTrackId(v: unknown): v is TrackId {
  return v === "settlement" || v === "agents" || v === "fan";
}

export function useTrack(): [TrackId | null, (id: TrackId) => void] {
  const [track, setTrackState] = useState<TrackId | null>(null);

  useEffect(() => {
    try {
      const fromUrl = new URLSearchParams(window.location.search).get("track");
      if (isTrackId(fromUrl)) {
        setTrackState(fromUrl);
        try { window.localStorage.setItem(STORAGE_KEY, fromUrl); } catch (e) {}
      } else {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (isTrackId(saved)) setTrackState(saved);
      }
    } catch (e) {
      // ignore storage errors
    }

    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (isTrackId(detail)) setTrackState(detail);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && isTrackId(e.newValue)) setTrackState(e.newValue);
    };

    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const setTrack = (id: TrackId) => {
    setTrackState(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch (e) {
      // ignore storage errors
    }
    try {
      window.dispatchEvent(new CustomEvent(EVENT, { detail: id }));
    } catch (e) {
      // ignore dispatch errors
    }
  };

  return [track, setTrack];
}
