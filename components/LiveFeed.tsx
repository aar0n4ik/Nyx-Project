"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLang, pick } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";

type L = Record<Lang, string>;

type Kind =
  | "settle"
  | "payout"
  | "dispute"
  | "slash"
  | "agent"
  | "poi"
  | "affiliate"
  | "live";
type Net = "devnet" | "mainnet";

type Tx = {
  sig: string;
  label: L;
  kind: Kind;
  net: Net;
  asset?: string;
};

const SETTLEMENT_PROGRAM = "AmMSLCCtJPCU3EJHEyxwAUTXQuzcAHVEVkCFJv6JrrW3";
const DEVNET_RPC = "https://api.devnet.solana.com";

const LIVE_LABEL: L = { en: "On-chain settlement activity", ru: "Ончейн-активность расчётов", es: "Actividad de liquidación on-chain", pt: "Atividade de liquidação on-chain", fr: "Activité de règlement on-chain", de: "On-chain-Abrechnungsaktivität", zh: "链上结算活动" };

const kindDot: Record<Kind, string> = {
  settle: "bg-solana",
  payout: "bg-payout",
  dispute: "bg-verify",
  slash: "bg-red-500",
  agent: "bg-nyx",
  poi: "bg-verify",
  affiliate: "bg-payout",
  live: "bg-solana",
};

const SEED: Tx[] = [
  { kind: "settle", net: "devnet", asset: "USD₮", label: { en: "Market settled — no admin key", ru: "Рынок рассчитан — без админ-ключа", es: "Mercado liquidado — sin clave de administrador", pt: "Mercado liquidado — sem chave de administrador", fr: "Marché réglé — sans clé admin", de: "Markt abgerechnet — kein Admin-Key", zh: "市场已结算——无管理员密钥" }, sig: "65r1WhdDMuyU479caqWLjEskBrTGbZedNP6rDbgBh259MnRQo7PzCgcC1aPbVhsRNZji1FfPTD8AY7VBGaMXfV9v" },
  { kind: "settle", net: "devnet", label: { en: "Trustless resolve via oracle", ru: "Бездоверительное разрешение через оракул", es: "Resolución sin confianza vía oráculo", pt: "Resolução sem confiança via oráculo", fr: "Résolution sans confiance via oracle", de: "Vertrauenslose Auflösung per Oracle", zh: "通过预言机的无信任判定" }, sig: "3DqcdD5T5LW7SSjar5jarNJ72cjqtxHdGi7TBB8pfahMQmyZa5VARGS8xY1jgivBw3zez8kEH3vnhpun1emGMaev" },
  { kind: "dispute", net: "devnet", label: { en: "Dispute resolved on-chain", ru: "Спор разрешён ончейн", es: "Disputa resuelta on-chain", pt: "Disputa resolvida on-chain", fr: "Litige résolu on-chain", de: "Streit on-chain gelöst", zh: "链上已解决的争议" }, sig: "q9yZGMJbHgfSqKmrqWyhHJZ6PRNW89b2ZEJG6icVV2dEGDHRdAzYxnheS9aix9c14CEzBTERqYrPgvSjbMfWAkQ" },
  { kind: "slash", net: "devnet", label: { en: "Malicious reporter slashed", ru: "Злонамеренный репортёр наказан слэшингом", es: "Reportero malicioso penalizado (slashing)", pt: "Reporter malicioso penalizado (slashing)", fr: "Rapporteur malveillant slashé", de: "Böswilliger Melder geslasht", zh: "恶意上报者被罚没" }, sig: "KDsynE3WonhsfXYPKCKhM13RqEyiKGDMYrSuXF74yNog1ccdZf55TqTD3aHa8Kjx5HL8EL14E8H2GFqqdB2vPFm" },
  { kind: "payout", net: "devnet", asset: "USD₮", label: { en: "First payout to winner", ru: "Первая выплата победителю", es: "Primer pago al ganador", pt: "Primeiro pagamento ao vencedor", fr: "Premier paiement au gagnant", de: "Erste Auszahlung an Gewinner", zh: "向获胜者的首次赔付" }, sig: "2xXK1VMqU2YtYEQ8zwERgfh8P872B8FTxZffFtxpx1DgnADSc4uAMhmGyfEDTWMkVfEmW2X8axSTQJvY67bBsogA" },
  { kind: "payout", net: "devnet", asset: "USD₮", label: { en: "Auto-settle payout", ru: "Автоматическая выплата при расчёте", es: "Pago con liquidación automática", pt: "Pagamento com liquidação automática", fr: "Paiement en règlement automatique", de: "Auszahlung bei Auto-Abrechnung", zh: "自动结算赔付" }, sig: "5fxcHPgZiQqyT2vzhdswa7NpDUQSFTLgM2jpz1FpdYVJkiGS6mxkanGQ29nWzSmwGzuu81Wiw9hbquthQAVjsbVy" },
  { kind: "agent", net: "devnet", label: { en: "Agent placed a bet (capped allowance)", ru: "Агент сделал ставку (ограниченное разрешение)", es: "Un agente apostó (autorización limitada)", pt: "Um agente apostou (permissão limitada)", fr: "Un agent a parié (autorisation plafonnée)", de: "Agent hat gewettet (begrenzte Freigabe)", zh: "智能体已下注（限额授权）" }, sig: "7JFQB78pxJ1BCNFBdpP8Hou9rUjvLncXT6P3bBPJBbiDdMaXnPxcQaNGvMLuqkL7weT51DeduzrrkPxqdoFwBME" },
  { kind: "agent", net: "devnet", label: { en: "Agent claimed winnings", ru: "Агент забрал выигрыш", es: "Un agente reclamó ganancias", pt: "Um agente resgatou os ganhos", fr: "Un agent a réclamé ses gains", de: "Agent hat Gewinne beansprucht", zh: "智能体已领取奖金" }, sig: "2Xs7NdN21SHWG3Muq57y34nF8zGrKVYbJPrgRNrAPuva3XMpfHuoKqoXwxsuAgshK7k6H14BBtT3j3gszcLpXf9X" },
  { kind: "poi", net: "devnet", label: { en: "Proof-of-Inference anchored", ru: "Proof-of-Inference закреплён", es: "Proof-of-Inference anclado", pt: "Proof-of-Inference ancorado", fr: "Proof-of-Inference ancré", de: "Proof-of-Inference verankert", zh: "Proof-of-Inference 已锚定" }, sig: "4cHmiwceMJ4DbNQsHupQVUdyL4EwA5SEv425M3yFkfksVLCT128ieutsVpeChNiRuRuZyfMYhmhinEnm8ESdMUeR" },
  { kind: "poi", net: "mainnet", label: { en: "Proof-of-Inference anchored (mainnet)", ru: "Proof-of-Inference закреплён (mainnet)", es: "Proof-of-Inference anclado (mainnet)", pt: "Proof-of-Inference ancorado (mainnet)", fr: "Proof-of-Inference ancré (mainnet)", de: "Proof-of-Inference verankert (mainnet)", zh: "Proof-of-Inference 已锚定（主网）" }, sig: "2SDKgy1AGbosRkXbvDitxLLsyysbDY32RsA7wJsX2Bs4Tcc4iZMkADmqKDzxYGkAzPiWbQmPE3W2zoXD9TaaH7Vn" },
  { kind: "affiliate", net: "devnet", asset: "USD₮", label: { en: "Affiliate 5% split paid", ru: "Выплачен реферальный сплит 5%", es: "Pagado el reparto de afiliado del 5%", pt: "Pago o split de afiliado de 5%", fr: "Commission d'affiliation de 5% versée", de: "5% Affiliate-Anteil ausgezahlt", zh: "已支付 5% 联盟分成" }, sig: "29zHMJ9AA4dH1zWMzDAERWCXedG5JurPrtimWfRX37E7SFu9CeTmib2LhisSfPSQc7ro8przE5SYpp9LQrMLNqRS" },
];

const marqueeAnim = { y: ["0%", "-50%"] };
const marqueeTrans = { duration: 45, ease: "linear", repeat: Infinity } as const;

const shortSig = (s: string) => s.slice(0, 4) + "…" + s.slice(-4);
const explorerUrl = (t: Tx) =>
  "https://explorer.solana.com/tx/" +
  t.sig +
  (t.net === "devnet" ? "?cluster=devnet" : "");

export default function LiveFeed() {
  const lang = useLang();
  const [rows, setRows] = useState<Tx[]>(SEED);

  useEffect(() => {
    let cancelled = false;
    const fetchLive = async () => {
      try {
        const res = await fetch(DEVNET_RPC, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "getSignaturesForAddress",
            params: [SETTLEMENT_PROGRAM, { limit: 8 }],
          }),
        });
        const json = await res.json();
        const sigs = json && json.result ? json.result : [];
        if (cancelled || !Array.isArray(sigs)) return;
        const live: Tx[] = sigs.map((s: any) => ({
          kind: "live",
          net: "devnet",
          asset: "USD₮",
          label: LIVE_LABEL,
          sig: String(s.signature),
        }));
        setRows((prev) => {
          const seen = new Set(prev.map((r) => r.sig));
          const fresh = live.filter((l) => !seen.has(l.sig));
          return fresh.length ? [...fresh, ...prev] : prev;
        });
      } catch (e) {
        // RPC hiccup — keep the recorded feed
      }
    };
    fetchLive();
    const id = setInterval(fetchLive, 20000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <section id="feed" className="bg-base py-24 text-ink">
      <div className="mx-auto max-w-content px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
          {pick(lang, { en: "Live transactions", ru: "Живые транзакции", es: "Transacciones en vivo", pt: "Transações ao vivo", fr: "Transactions en direct", de: "Live-Transaktionen", zh: "实时交易" })}
        </p>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
          {pick(lang, { en: "Every settlement, on the record", ru: "Каждый расчёт зафиксирован", es: "Cada liquidación, registrada", pt: "Cada liquidação, registrada", fr: "Chaque règlement, consigné", de: "Jede Abrechnung, dokumentiert", zh: "每一次结算，皆有记录" })}
        </h2>
        <p className="mt-4 max-w-xl text-base text-muted">
          {pick(lang, { en: "Real transactions from Nyx programs on Solana — recorded on-chain and streamed live from devnet. Click any row to verify it on the explorer.", ru: "Реальные транзакции программ Nyx в Solana — записаны ончейн и транслируются вживую из devnet. Нажми на любую строку, чтобы проверить её в эксплорере.", es: "Transacciones reales de los programas de Nyx en Solana: registradas on-chain y transmitidas en vivo desde devnet. Haz clic en cualquier fila para verificarla en el explorador.", pt: "Transações reais dos programas da Nyx na Solana — registradas on-chain e transmitidas ao vivo da devnet. Clique em qualquer linha para verificá-la no explorer.", fr: "De vraies transactions des programmes Nyx sur Solana — enregistrées on-chain et diffusées en direct depuis le devnet. Cliquez sur une ligne pour la vérifier dans l'explorer.", de: "Echte Transaktionen von Nyx-Programmen auf Solana — on-chain aufgezeichnet und live aus dem devnet gestreamt. Klicke auf eine Zeile, um sie im Explorer zu prüfen.", zh: "来自 Solana 上 Nyx 程序的真实交易——记录在链上，并从 devnet 实时推送。点击任意一行即可在浏览器中验证。" })}
        </p>

        <div className="relative mt-10 h-[360px] overflow-hidden rounded-2xl border border-hairline bg-subtle">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-subtle to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 bg-gradient-to-t from-subtle to-transparent" />
          <motion.div
            animate={marqueeAnim}
            transition={marqueeTrans}
            className="flex flex-col gap-2 p-4"
          >
            {[...rows, ...rows].map((t, i) => (
              <a
                key={t.sig + i}
                href={explorerUrl(t)}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center justify-between gap-4 rounded-xl border border-hairline bg-base px-4 py-3 transition hover:border-solana/40"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className={"h-2 w-2 shrink-0 rounded-full " + kindDot[t.kind]} />
                  <span className="truncate text-sm font-medium">{pick(lang, t.label)}</span>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-xs text-muted">
                  {t.asset ? <span>{t.asset}</span> : null}
                  <span
                    className={
                      "rounded-full border px-2 py-0.5 uppercase tracking-wide " +
                      (t.net === "mainnet"
                        ? "border-payout/40 text-payout"
                        : "border-hairline")
                    }
                  >
                    {t.net}
                  </span>
                  <span className="font-mono">{shortSig(t.sig)}</span>
                </div>
              </a>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
