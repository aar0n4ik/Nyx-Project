"use client";

import { useTrack } from "@/components/useTrack";

import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import TrackSpotlight from "@/components/TrackSpotlight";
import PerTrackFaq from "@/components/PerTrackFaq";
import Footer from "@/components/Footer";
import TrackModal from "@/components/TrackModal";
import CommandPalette from "@/components/CommandPalette";
import PWA from "@/components/PWA";
import Verify from "@/components/Verify";

import Markets from "@/components/Markets";
import Settlement from "@/components/Settlement";
import SettlementReplay from "@/components/SettlementReplay";
import LiveConstellation from "@/components/LiveConstellation";

import AgentTerminal from "@/components/AgentTerminal";
import NyxEdge from "@/components/NyxEdge";
import AmmVisualizer from "@/components/AmmVisualizer";
import PredictionAMM from "@/components/PredictionAMM";
import ProofOfInference from "@/components/ProofOfInference";

import LiveStream from "@/components/LiveStream";
import Distribution from "@/components/Distribution";

export default function Page() {
  const [track] = useTrack();
  const active = track ?? "settlement";

  return (
    <>
      <Navbar />
      <Hero />
      <TrackSpotlight />

      {active === "settlement" ? (
        <>
          <Markets />
          <Settlement />
          <SettlementReplay />
          <LiveConstellation />
          <Verify />
        </>
      ) : null}

      {active === "agents" ? (
        <>
          <AgentTerminal />
          <NyxEdge />
          <AmmVisualizer />
          <PredictionAMM />
          <ProofOfInference />
          <Verify />
        </>
      ) : null}

      {active === "fan" ? (
        <>
          <LiveStream />
          <Markets />
          <Distribution />
          <Verify />
        </>
      ) : null}

      <PerTrackFaq />
      <Footer />

      <TrackModal />
      <CommandPalette />
      <PWA />
    </>
  );
}
