"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Loader2,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
} from "lucide-react";
import { useLang, pick } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";
import POI_RECEIPTS from "@/lib/poi-receipts.json";
import { hashCanonical } from "@/lib/poi-verify";

type L = Record<Lang, string>;

type Cluster = "devnet" | "mainnet";

const RPC: Record<Cluster, string> = {
  devnet: "https://api.devnet.solana.com",
  mainnet: "https://api.mainnet-beta.solana.com",
};

type Receipt = {
  label: L;
  kind: string;
  sig: string;
  cluster: Cluster;
  digest?: string;
  body?: unknown;
};

const RECEIPTS: Receipt[] = [
  {
    label: { en: "Proof-of-Inference · devnet anchor", ru: "Proof-of-Inference · якорь в devnet", es: "Proof-of-Inference · ancla en devnet", pt: "Proof-of-Inference · âncora na devnet", fr: "Proof-of-Inference · ancre devnet", de: "Proof-of-Inference · Devnet-Anker", zh: "Proof-of-Inference · devnet 锚点" },
    kind: "PoI",
    cluster: "devnet",
    sig: "4cHmiwceMJ4DbNQsHupQVUdyL4EwA5SEv425M3yFkfksVLCT128ieutsVpeChNiRuRuZyfMYhmhinEnm8ESdMUeR",
    digest: "38d667dd86c40d94f74d0b214cd6bdaf6dc3926eed8657b91fdde54d71e8310c",
  },
  {
    label: { en: "Proof-of-Inference · devnet anchor #2", ru: "Proof-of-Inference · якорь в devnet #2", es: "Proof-of-Inference · ancla en devnet #2", pt: "Proof-of-Inference · âncora na devnet #2", fr: "Proof-of-Inference · ancre devnet #2", de: "Proof-of-Inference · Devnet-Anker #2", zh: "Proof-of-Inference · devnet 锚点 #2" },
    kind: "PoI",
    cluster: "mainnet",
    sig: "2SDKgy1AGbosRkXbvDitxLLsyysbDY32RsA7wJsX2Bs4Tcc4iZMkADmqKDzxYGkAzPiWbQmPE3W2zoXD9TaaH7Vn",
    digest: "4331d8b7c75bac406fe8e7aa09605db63f6f809e6919fd48b0f042ff9f2664d8",
  },
  {
    label: { en: "Trustless settlement", ru: "Бездоверительный расчёт", es: "Liquidación sin confianza", pt: "Liquidação sem confiança", fr: "Règlement sans confiance", de: "Vertrauenslose Abrechnung", zh: "无需信任的结算" },
    kind: "Settle",
    cluster: "devnet",
    sig: "65r1WhdDMuyU479caqWLjEskBrTGbZedNP6rDbgBh259MnRQo7PzCgcC1aPbVhsRNZji1FfPTD8AY7VBGaMXfV9v",
  },
  {
    label: { en: "Dispute resolved on-chain", ru: "Спор разрешён ончейн", es: "Disputa resuelta on-chain", pt: "Disputa resolvida on-chain", fr: "Litige résolu on-chain", de: "Streit on-chain gelöst", zh: "链上已解决的争议" },
    kind: "Dispute",
    cluster: "devnet",
    sig: "q9yZGMJbHgfSqKmrqWyhHJZ6PRNW89b2ZEJG6icVV2dEGDHRdAzYxnheS9aix9c14CEzBTERqYrPgvSjbMfWAkQ",
  },
];

// Real self-verify: подменяем PoI-якоря на свежие, у которых закоммичено полное body,
// чтобы браузер мог пересчитать digest байт-в-байт.
const _POI = POI_RECEIPTS as Array<{ digest: string; sig: string; cluster: string; body: unknown }>;
let _pi = 0;
for (const _r of RECEIPTS) {
  if (_r.kind === "PoI" && _POI[_pi]) {
    _r.sig = _POI[_pi].sig;
    _r.digest = _POI[_pi].digest;
    _r.cluster = _POI[_pi].cluster as Cluster;
    _r.body = _POI[_pi].body;
    _pi++;
  }
}

type VerifyResult = {
  ok: boolean;
  found: boolean;
  err?: string;
  slot?: number;
  blockTime?: number | null;
  feeSol?: number;
  computeUnits?: number | null;
  memo?: string;
  digestMatch?: boolean | null;
  recomputed?: string;
  ms: number;
  endpoint: string;
};

const spin = { repeat: Infinity, duration: 0.9, ease: "linear" } as const;
const spinAnim = { rotate: 360 } as const;
const reveal = { duration: 0.28, ease: "easeOut" } as const;
const hiddenV = { opacity: 0, y: 10 } as const;
const shownV = { opacity: 1, y: 0 } as const;

function shorten(s: string) {
  if (s.length <= 16) return s;
  return s.slice(0, 8) + "…" + s.slice(-8);
}

function extractMemo(tx: unknown): string | undefined {
  const t = tx as {
    transaction?: { message?: { instructions?: unknown[] } };
    meta?: { logMessages?: string[] };
  };
  const instrs = t.transaction?.message?.instructions || [];
  for (const raw of instrs) {
    const ix = raw as { program?: string; programId?: string; parsed?: unknown };
    if (ix.program === "spl-memo" && typeof ix.parsed === "string") {
      return ix.parsed;
    }
    if (
      typeof ix.parsed === "string" &&
      typeof ix.programId === "string" &&
      ix.programId.indexOf("Memo") === 0
    ) {
      return ix.parsed;
    }
  }
  return undefined;
}

async function runVerify(
  r: {
    sig: string;
    cluster: Cluster;
    digest?: string;
    body?: unknown;
  },
  t: { notFound: string; rpcError: string }
): Promise<VerifyResult> {
  const endpoint = RPC[r.cluster];
  const t0 = performance.now();
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getTransaction",
      params: [
        r.sig,
        {
          encoding: "jsonParsed",
          commitment: "confirmed",
          maxSupportedTransactionVersion: 0,
        },
      ],
    }),
  });
  const json = (await res.json()) as {
    error?: { message?: string };
    result?: {
      slot?: number;
      blockTime?: number | null;
      meta?: {
        fee?: number;
        err?: unknown;
        computeUnitsConsumed?: number | null;
      };
    };
  };
  const ms = Math.round(performance.now() - t0);

  if (json.error) {
    return { ok: false, found: false, err: json.error.message || t.rpcError, ms, endpoint };
  }
  const tx = json.result;
  if (!tx) {
    return {
      ok: false,
      found: false,
      err: t.notFound + r.cluster,
      ms,
      endpoint,
    };
  }
  const memo = extractMemo(tx);
  const feeLamports = tx.meta?.fee ?? 0;
  let recomputed: string | undefined;
  if (r.body != null) {
    try { recomputed = await hashCanonical(r.body); } catch { recomputed = undefined; }
  }
  // digest, пересчитанный в браузере из body, должен совпасть И с receipt.digest, И с memo ончейн
  const expected = recomputed ?? r.digest;
  const digestMatch = expected
    ? memo
      ? memo.indexOf(expected) >= 0 && (recomputed == null || recomputed === r.digest)
      : false
    : null;

  return {
    ok: tx.meta?.err == null,
    found: true,
    slot: tx.slot,
    blockTime: tx.blockTime ?? null,
    feeSol: feeLamports / 1e9,
    computeUnits: tx.meta?.computeUnitsConsumed ?? null,
    memo,
    digestMatch,
    recomputed,
    ms,
    endpoint,
  };
}

export default function ProofVerifier() {
  const lang = useLang();
  const [selected, setSelected] = useState<Receipt>(RECEIPTS[0]);
  const [custom, setCustom] = useState("");
  const [cluster, setCluster] = useState<Cluster>("devnet");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [copied, setCopied] = useState(false);

  const activeSig = custom.trim() || selected.sig;
  const activeCluster = custom.trim() ? cluster : selected.cluster;
  const activeDigest = custom.trim() ? undefined : selected.digest;
  const activeBody = custom.trim() ? undefined : selected.body;

  const verify = async () => {
    setLoading(true);
    setResult(null);
    const errMsgs = {
      notFound: pick(lang, { en: "Transaction not found on ", ru: "Транзакция не найдена в ", es: "Transacción no encontrada en ", pt: "Transação não encontrada em ", fr: "Transaction introuvable sur ", de: "Transaktion nicht gefunden auf ", zh: "未在以下网络找到交易：" }),
      rpcError: pick(lang, { en: "RPC error", ru: "Ошибка RPC", es: "Error de RPC", pt: "Erro de RPC", fr: "Erreur RPC", de: "RPC-Fehler", zh: "RPC 错误" }),
    };
    try {
      const r = await runVerify(
        {
          sig: activeSig,
          cluster: activeCluster,
          digest: activeDigest,
          body: activeBody,
        },
        errMsgs
      );
      setResult(r);
    } catch (e) {
      setResult({
        ok: false,
        found: false,
        err: (e as Error).message || pick(lang, { en: "Network error", ru: "Ошибка сети", es: "Error de red", pt: "Erro de rede", fr: "Erreur réseau", de: "Netzwerkfehler", zh: "网络错误" }),
        ms: 0,
        endpoint: RPC[activeCluster],
      });
    } finally {
      setLoading(false);
    }
  };

  const copySig = async () => {
    try {
      await navigator.clipboard.writeText(activeSig);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch (e) {
      // clipboard blocked — ignore
    }
  };

  return (
    <section id="proof" className="mx-auto max-w-content px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-hairline px-3 py-1 text-xs text-muted">
          <ShieldCheck className="h-3.5 w-3.5 text-verify" />
          {pick(lang, { en: "Verify, don't trust", ru: "Проверяй, а не доверяй", es: "Verifica, no confíes", pt: "Verifique, não confie", fr: "Vérifiez, ne faites pas confiance", de: "Prüfen, nicht vertrauen", zh: "验证，而非信任" })}
        </div>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {pick(lang, { en: "Check the chain yourself", ru: "Проверь цепочку сам", es: "Comprueba la cadena tú mismo", pt: "Verifique a chain você mesmo", fr: "Vérifiez la chaîne vous-même", de: "Prüfe die Chain selbst", zh: "自己检查链上数据" })}
        </h2>
        <p className="mt-3 text-muted">
          {pick(lang, { en: "This runs entirely in your browser. It calls a public Solana RPC live, pulls the transaction, and confirms the Proof-of-Inference digest is the one anchored on-chain. No backend of ours in the loop.", ru: "Это работает целиком в твоём браузере. Вживую вызывает публичный Solana RPC, вытягивает транзакцию и подтверждает, что дайджест Proof-of-Inference — именно тот, что закреплён ончейн. Нашего бэкенда в цепочке нет.", es: "Esto se ejecuta íntegramente en tu navegador. Llama en vivo a un RPC público de Solana, obtiene la transacción y coteja el digest de Proof-of-Inference anclado on-chain. Ningún backend nuestro en el proceso.", pt: "Isto roda inteiramente no seu navegador. Chama ao vivo um RPC público da Solana, busca a transação e confere o digest de Proof-of-Inference ancorado on-chain. Nenhum backend nosso no meio.", fr: "Tout s'exécute dans votre navigateur. Il appelle en direct un RPC Solana public, récupère la transaction et recoupe le digest Proof-of-Inference ancré on-chain. Aucun backend de notre part dans la boucle.", de: "Das läuft komplett in deinem Browser. Es ruft live einen öffentlichen Solana-RPC auf, holt die Transaktion und gleicht den on-chain verankerten Proof-of-Inference-Digest ab. Kein Backend von uns im Spiel.", zh: "这完全在你的浏览器中运行。它实时调用公共 Solana RPC，拉取交易，并交叉核对锚定在链上的 Proof-of-Inference 摘要。全程没有我们的后端参与。" })}
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-2xl rounded-3xl border border-hairline bg-subtle p-5 sm:p-6">
        <div className="flex flex-wrap gap-2">
          {RECEIPTS.map((r) => {
            const active = !custom.trim() && selected.sig === r.sig;
            return (
              <button
                key={r.sig}
                onClick={() => {
                  setSelected(r);
                  setCustom("");
                  setResult(null);
                }}
                className={
                  "rounded-full border px-3 py-1.5 text-xs transition " +
                  (active
                    ? "border-nyx bg-nyx text-white"
                    : "border-hairline text-muted hover:text-ink")
                }
              >
                {pick(lang, r.label)}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder={pick(lang, { en: "…or paste any Solana signature", ru: "…или вставь любую подпись Solana", es: "…o pega cualquier firma de Solana", pt: "…ou cole qualquer assinatura Solana", fr: "…ou collez n'importe quelle signature Solana", de: "…oder füge eine beliebige Solana-Signatur ein", zh: "…或粘贴任意 Solana 签名" })}
            className="flex-1 rounded-xl border border-hairline bg-base px-3 py-2.5 font-mono text-sm text-ink outline-none focus:border-nyx"
          />
          {custom.trim() ? (
            <select
              value={cluster}
              onChange={(e) => setCluster(e.target.value as Cluster)}
              className="rounded-xl border border-hairline bg-base px-3 py-2.5 text-sm text-ink outline-none"
            >
              <option value="devnet">devnet</option>
              <option value="mainnet">mainnet</option>
            </select>
          ) : null}
        </div>

        <div className="mt-3 flex items-center justify-between rounded-xl bg-base px-3 py-2 font-mono text-xs text-muted">
          <span className="truncate">{shorten(activeSig)}</span>
          <button onClick={copySig} className="ml-2 shrink-0 text-muted hover:text-ink">
            {copied ? <Check className="h-4 w-4 text-payout" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>

        <button
          onClick={verify}
          disabled={loading}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-nyx px-5 py-3 text-base font-semibold text-white disabled:opacity-60"
        >
          {loading ? (
            <motion.span animate={spinAnim} transition={spin}>
              <Loader2 className="h-5 w-5" />
            </motion.span>
          ) : (
            <ShieldCheck className="h-5 w-5" />
          )}
          {loading
            ? pick(lang, { en: "Querying Solana…", ru: "Запрос к Solana…", es: "Consultando Solana…", pt: "Consultando a Solana…", fr: "Interrogation de Solana…", de: "Solana wird abgefragt…", zh: "正在查询 Solana…" })
            : pick(lang, { en: "Verify on-chain", ru: "Проверить ончейн", es: "Verificar on-chain", pt: "Verificar on-chain", fr: "Vérifier on-chain", de: "On-chain überprüfen", zh: "链上验证" })}
        </button>

        <AnimatePresence mode="wait">
          {result ? (
            <motion.div
              key={activeSig + String(result.ms)}
              initial={hiddenV}
              animate={shownV}
              exit={hiddenV}
              transition={reveal}
              className="mt-5"
            >
              {result.found ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-xl bg-base px-4 py-3">
                    {result.ok ? (
                      <ShieldCheck className="h-5 w-5 text-payout" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                    )}
                    <span className="text-sm font-medium text-ink">
                      {result.ok
                        ? pick(lang, { en: "Confirmed on-chain", ru: "Подтверждено ончейн", es: "Confirmado on-chain", pt: "Confirmado on-chain", fr: "Confirmé on-chain", de: "On-chain bestätigt", zh: "已在链上确认" })
                        : pick(lang, { en: "Found, but tx reverted", ru: "Найдено, но транзакция откатилась", es: "Encontrada, pero la tx revirtió", pt: "Encontrada, mas a tx reverteu", fr: "Trouvée, mais la tx a échoué", de: "Gefunden, aber tx zurückgesetzt", zh: "已找到，但交易已回滚" })}
                    </span>
                    <span className="ml-auto font-mono text-xs text-muted">
                      {result.ms}ms
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-xl bg-base px-3 py-2">
                      <div className="text-xs text-muted">Slot</div>
                      <div className="font-mono text-ink">{result.slot}</div>
                    </div>
                    <div className="rounded-xl bg-base px-3 py-2">
                      <div className="text-xs text-muted">{pick(lang, { en: "Fee", ru: "Комиссия", es: "Comisión", pt: "Taxa", fr: "Frais", de: "Gebühr", zh: "手续费" })}</div>
                      <div className="font-mono text-ink">{result.feeSol} SOL</div>
                    </div>
                    <div className="rounded-xl bg-base px-3 py-2">
                      <div className="text-xs text-muted">{pick(lang, { en: "Compute units", ru: "Compute units", es: "Compute units", pt: "Compute units", fr: "Compute units", de: "Compute Units", zh: "计算单元" })}</div>
                      <div className="font-mono text-ink">
                        {result.computeUnits ?? "—"}
                      </div>
                    </div>
                    <div className="rounded-xl bg-base px-3 py-2">
                      <div className="text-xs text-muted">{pick(lang, { en: "Block time", ru: "Время блока", es: "Hora del bloque", pt: "Hora do bloco", fr: "Heure du bloc", de: "Blockzeit", zh: "区块时间" })}</div>
                      <div className="font-mono text-ink">
                        {result.blockTime
                          ? new Date(result.blockTime * 1000)
                              .toISOString()
                              .slice(0, 19)
                              .replace("T", " ")
                          : "—"}
                      </div>
                    </div>
                  </div>

                  {result.digestMatch != null ? (
                    <div
                      className={
                        "flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium " +
                        (result.digestMatch
                          ? "bg-payout/10 text-payout"
                          : "bg-amber-500/10 text-amber-600")
                      }
                    >
                      {result.digestMatch ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <AlertTriangle className="h-4 w-4" />
                      )}
                      {result.digestMatch
                        ? pick(lang, { en: "Digest recomputed in your browser matches the on-chain anchor", ru: "Дайджест, пересчитанный в браузере, совпадает с якорем ончейн", es: "El digest recalculado en tu navegador coincide con el ancla on-chain", pt: "O digest recalculado no seu navegador corresponde à âncora on-chain", fr: "Le digest recalculé dans votre navigateur correspond à l'ancre on-chain", de: "Der im Browser neu berechnete Digest stimmt mit dem On-Chain-Anker überein", zh: "在你浏览器中重算的摘要与链上锚点一致" })
                        : pick(lang, { en: "Digest not found in this tx memo", ru: "Дайджест не найден в memo этой транзакции", es: "Digest no encontrado en el memo de esta tx", pt: "Digest não encontrado no memo desta tx", fr: "Digest introuvable dans le memo de cette tx", de: "Digest im Memo dieser tx nicht gefunden", zh: "该交易 memo 中未找到摘要" })}
                    </div>
                  ) : null}

                  {result.memo ? (
                    <div className="rounded-xl bg-base px-3 py-2">
                      <div className="mb-1 text-xs text-muted">{pick(lang, { en: "On-chain memo", ru: "Memo ончейн", es: "Memo on-chain", pt: "Memo on-chain", fr: "Memo on-chain", de: "On-chain-Memo", zh: "链上 memo" })}</div>
                      <div className="break-all font-mono text-xs text-ink">
                        {result.memo}
                      </div>
                    </div>
                  ) : null}

                  <a
                    href={
                      "https://explorer.solana.com/tx/" +
                      activeSig +
                      (activeCluster === "devnet" ? "?cluster=devnet" : "")
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 text-sm text-verify hover:underline"
                  >
                    {pick(lang, { en: "Open in Solana Explorer", ru: "Открыть в Solana Explorer", es: "Abrir en Solana Explorer", pt: "Abrir no Solana Explorer", fr: "Ouvrir dans Solana Explorer", de: "In Solana Explorer öffnen", zh: "在 Solana Explorer 中打开" })}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl bg-base px-4 py-3 text-sm text-amber-600">
                  <AlertTriangle className="h-5 w-5" />
                  {result.err}
                </div>
              )}

              <div className="mt-3 text-center font-mono text-[11px] text-muted">
                {result.endpoint}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </section>
  );
}
