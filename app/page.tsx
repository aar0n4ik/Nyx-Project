import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import LiveStats from "@/components/LiveStats";
import WhyDifferent from "@/components/WhyDifferent";
import Markets from "@/components/Markets";
import AgentTerminal from "@/components/AgentTerminal";
import Settlement from "@/components/Settlement";
import PredictionAMM from "@/components/PredictionAMM";
import ProofOfInference from "@/components/ProofOfInference";
import Distribution from "@/components/Distribution";
import Verify from "@/components/Verify";
import GlobeSection from "@/components/GlobeSection";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";
import Narration from "@/components/Narration";

export default function Page() {
  return (
    <main className="min-h-screen bg-base">
      <Navbar />
      <Hero />
      <LiveStats />
      <WhyDifferent />
      <Markets />
      <AgentTerminal />
      <Settlement />
      <PredictionAMM />
      <ProofOfInference />
      <Distribution />
      <Verify />
      <GlobeSection />
      <FAQ />
      <Footer />
      <Narration />
    </main>
  );
}
