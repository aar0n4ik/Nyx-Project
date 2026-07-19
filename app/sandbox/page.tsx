import AgentSandbox from "@/components/AgentSandbox";

export const metadata = { title: "Nyx \u00b7 Agent Sandbox" };

export default function SandboxPage() {
  return (
    <main className="min-h-screen bg-[#06060c] px-4 py-10 md:px-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-1 text-2xl font-semibold text-white">Nyx \u00b7 Autonomous Agent Sandbox</h1>
        <p className="mb-8 text-sm text-white/60">Spin up an agent persona, watch it reason on live oracle data, anchor its Chain-of-Thought on-chain, then fire a real devnet bet.</p>
        <AgentSandbox />
      </div>
    </main>
  );
}
