set -e

# 1) ГЛОБУС: убрать дубль <LiveConstellation /> (оставляем первый — settlement)
awk 'BEGIN{c=0} /<LiveConstellation \/>/{c++; if(c>1) next} {print}' app/page.tsx > app/page.tsx.tmp && mv app/page.tsx.tmp app/page.tsx
echo "globe -> остались mounts:"; grep -n "LiveConstellation />" app/page.tsx || true

# 2) ПРОМПТЫ ИИ: простые вопросы (7 языков)
node - <<'EOF'
const fs=require('fs'); const f='components/NyxEdge.tsx'; let s=fs.readFileSync(f,'utf8');
const NEW=`const PROMPTS: L[] = [
  { en: "Spain vs Argentina in the final. How should I think about who is more likely to win, and what can a model like you not actually know?", ru: "Финал Испания - Аргентина. Как рассуждать о том, кто вероятнее победит, и чего ты как модель на самом деле знать не можешь?", es: "Final Espana vs Argentina. Como pensar en quien tiene mas probabilidades de ganar, y que no puedes saber realmente como modelo?", pt: "Final Espanha vs Argentina. Como pensar sobre quem tem mais chance de vencer, e o que voce, como modelo, nao pode saber?", fr: "Finale Espagne - Argentine. Comment raisonner sur qui a le plus de chances de gagner, et que ne peux-tu pas vraiment savoir en tant que modele ?", de: "Finale Spanien gegen Argentinien. Wie denke ich darueber nach, wer eher gewinnt, und was kannst du als Modell wirklich nicht wissen?", zh: "西班牙对阵阿根廷的决赛。我该如何判断谁更可能获胜，而作为模型你其实无法知道什么？" },
  { en: "The market says there is a 62% chance of YES. In plain terms, how should that change my own guess?", ru: "Рынок говорит, что шанс YES - 62%. Простыми словами: как это должно поменять мою собственную оценку?", es: "El mercado dice 62% de probabilidad de SI. En terminos simples, como deberia cambiar eso mi estimacion?", pt: "O mercado diz 62% de chance de SIM. Em termos simples, como isso deve mudar meu palpite?", fr: "Le marche dit 62% de chances que ce soit OUI. Simplement, comment cela doit-il changer mon estimation ?", de: "Der Markt sagt 62% Chance fuer JA. Einfach gesagt: Wie sollte das meine Einschaetzung veraendern?", zh: "市场认为 YES 的概率是 62%。用通俗的话说，这该如何改变我自己的判断？" },
  { en: "I already placed a bet. When does it make sense to hedge it, and when is hedging just a waste of money?", ru: "Я уже сделал ставку. Когда есть смысл её хеджировать, а когда хедж - это просто пустая трата денег?", es: "Ya hice una apuesta. Cuando tiene sentido cubrirla, y cuando cubrirse es tirar el dinero?", pt: "Ja fiz uma aposta. Quando faz sentido fazer hedge, e quando o hedge e so desperdicio?", fr: "J'ai deja place un pari. Quand est-il logique de le couvrir, et quand n'est-ce qu'un gaspillage ?", de: "Ich habe bereits eine Wette platziert. Wann ist Hedging sinnvoll und wann nur Geldverschwendung?", zh: "我已经下了一注。什么时候对冲才有意义，什么时候只是在浪费钱？" },
];`;
const re=/const PROMPTS: L\[\] = \[[\s\S]*?\n\];/;
if(re.test(s)){ fs.writeFileSync(f, s.replace(re,NEW)); console.log("prompts -> обновлены"); } else console.log("prompts -> паттерн не найден, пропуск");
EOF

# 3) АГЕНТЫ: понятные подписи полей + читаемые названия рынков
sed -i 's/placeholder="fixtureId"/placeholder="Match ID"/g; s/placeholder="stake"/placeholder="Stake"/g' components/AgentTerminal.tsx components/AgentSandbox.tsx 2>/dev/null || true
node - <<'EOF'
const fs=require('fs');
for (const f of ['components/AgentTerminal.tsx','components/AgentSandbox.tsx']){
  let s; try{ s=fs.readFileSync(f,'utf8'); }catch{ console.log(f,'нет файла'); continue; }
  if(/>\{m\}<\/option>/.test(s)){
    s=s.replace(/>\{m\}<\/option>/g,'>{MARKET_LABELS[m] || m}</option>');
    if(!s.includes('MARKET_LABELS')) s=s.replace('const MARKETS','const MARKET_LABELS: Record<string, string> = { ou25: "Over 2.5 goals", ou15: "Over 1.5 goals", btts: "Both teams score", h: "Home win", d: "Draw", a: "Away win" };\nconst MARKETS');
    fs.writeFileSync(f,s); console.log(f,'-> названия рынков применены');
  } else console.log(f,'-> option {m} не найден, оставил как есть');
}
EOF

# 4) BLINK: кнопка теперь открывает НАСТОЯЩИЙ инлайн-блинк (карточка ставки), а не скролл
cat > components/BlinkModal.tsx <<'TSX'
"use client";
import { useEffect, useState } from "react";
import InlineBlink from "@/components/InlineBlink";
import "@dialectlabs/blinks/index.css";

const BLINK_URL =
  "https://nyx-project-roan.vercel.app/api/actions/bet?match=88008801&market=h&odds=2.00";

export default function BlinkModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("nyx-open-blink", onOpen as EventListener);
    return () => window.removeEventListener("nyx-open-blink", onOpen as EventListener);
  }, []);

  if (!open) return null;

  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();
  return (
    <div
      onClick={() => setOpen(false)}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <div onClick={stop} className="w-full max-w-md">
        <InlineBlink url={BLINK_URL} />
      </div>
    </div>
  );
}
TSX

echo "=== ГОТОВО ==="
