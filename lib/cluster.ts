export type Cluster = "devnet" | "mainnet";

export const CLUSTER: Cluster =
  (process.env.NEXT_PUBLIC_SOLANA_CLUSTER as Cluster) === "mainnet"
    ? "mainnet"
    : "devnet";

export const RPC_HTTP =
  CLUSTER === "mainnet"
    ? "https://api.mainnet-beta.solana.com"
    : "https://api.devnet.solana.com";

export const RPC_WS =
  CLUSTER === "mainnet"
    ? "wss://api.mainnet-beta.solana.com"
    : "wss://api.devnet.solana.com";

export function explorerTx(sig: string) {
  const q = CLUSTER === "devnet" ? "?cluster=devnet" : "";
  return "https://explorer.solana.com/tx/" + sig + q;
}

export function explorerAddr(addr: string) {
  const q = CLUSTER === "devnet" ? "?cluster=devnet" : "";
  return "https://explorer.solana.com/address/" + addr + q;
}
