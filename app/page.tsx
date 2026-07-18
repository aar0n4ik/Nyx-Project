"use client";

import { useTrack } from "@/components/useTrack";

import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import TrackSpotlight from "@/components/TrackSpotlight";
import TrackModal from "@/components/TrackModal";
import CommandPalette from "@/components/CommandPalette";
import PWA from "@/components/PWA";
import LiveConstellation from "@/components/LiveConstellation";
import NetworkStats from "@/components/NetworkStats";
import LiveStats from "@/components/LiveStats";
import LiveFeed from "@/components/LiveFeed";
import Roadmap from "@/components/Roadmap";
import Founder from "@/components/Founder";
import PerTrackFaq from "@/components/PerTrackFaq";
import Footer from "@/components/Footer";

import Markets from "@/components/Markets";
import AmmVisualizer from "@/components/AmmVisualizer";
import PredictionAMM from "@/components/PredictionAMM";
import Settlement from "@/components/Settlement";
import Verify from "@/components/Verify";
import SettlementReplay from "@/components/SettlementReplay";

import AgentTerminal from "@/components/AgentTerminal";
import NyxEdge from "@/components/NyxEdge";
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
          <AmmVisualizer />
          <PredictionAMM />
          <Settlement />
          <Verify />
          <SettlementReplay />
        </>
      ) : null}

      {active === "agents" ? (
        <>
          <AgentTerminal />
          <NyxEdge />
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

      <NetworkStats />
      <LiveFeed />
      <LiveStats />
      <Roadmap />
      <Founder />
      <PerTrackFaq />
      <LiveConstellation />
      <Footer />

      <TrackModal />
      <CommandPalette />
      <PWA />
    </>
  );
}
