import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import NyxEdge from "@/components/NyxEdge";
import PerTrackFaq from "@/components/PerTrackFaq";
import NetworkStats from "@/components/NetworkStats";
import LiveStream from "@/components/LiveStream";
import AmmVisualizer from "@/components/AmmVisualizer";
import CommandPalette from "@/components/CommandPalette";
import ProofVerifier from "@/components/ProofVerifier";
import PWA from "@/components/PWA";
import TrackModal from "@/components/TrackModal";
import TrackSpotlight from "@/components/TrackSpotlight";
import LiveFeed from "@/components/LiveFeed";
import Founder from "@/components/Founder";
import Roadmap from "@/components/Roadmap";
import LiveStats from "@/components/LiveStats";
import WhyDifferent from "@/components/WhyDifferent";
import Markets from "@/components/Markets";
import AgentTerminal from "@/components/AgentTerminal";
import Settlement from "@/components/Settlement";
import PredictionAMM from "@/components/PredictionAMM";
import ProofOfInference from "@/components/ProofOfInference";
import Distribution from "@/components/Distribution";
import Verify from "@/components/Verify";
import LiveConstellation from "@/components/LiveConstellation";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";

export default function Page() {
  return (
    <main className="min-h-screen bg-base">
      <Navbar />
      <CommandPalette />
      <PWA />
      <TrackModal />
      <Hero />
      <TrackSpotlight />
      <Roadmap />
      <LiveStats />
      <WhyDifferent />
      <Markets />
      <AgentTerminal />
      <Settlement />
      <PredictionAMM />
      <ProofOfInference />
      <Distribution />
      <Verify />
      <AmmVisualizer />
      <LiveStream />
      <NetworkStats />
      <ProofVerifier />
      <LiveConstellation />
      <LiveFeed />
      <NyxEdge />
      <PerTrackFaq />
      <FAQ />
      <Founder />
      <Footer />
    </main>
  );
}
