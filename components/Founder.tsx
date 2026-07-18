"use client";

import { motion } from "framer-motion";
import { useLang, pick } from "@/lib/i18n";

const viewportOnce = { once: true, amount: 0.3 } as const;

const fadeV = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
} as const;

export default function Founder() {
  const lang = useLang();
  return (
    <section id="founder" className="bg-subtle py-24 text-ink">
      <motion.div
        variants={fadeV}
        initial="hidden"
        whileInView="show"
        viewport={viewportOnce}
        className="mx-auto max-w-3xl px-6 text-center"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
          {pick(lang, { en: "The person behind Nyx", ru: "Человек за Nyx", es: "La persona detrás de Nyx", pt: "A pessoa por trás do Nyx", fr: "La personne derrière Nyx", de: "Die Person hinter Nyx", zh: "Nyx 背后的人" })}
        </p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          {pick(lang, { en: "Built solo by a 17-year-old who refused the standard path", ru: "Создано в одиночку 17-летним, отказавшимся от стандартного пути", es: "Creado en solitario por un joven de 17 años que rechazó el camino estándar", pt: "Construído sozinho por um jovem de 17 anos que recusou o caminho padrão", fr: "Conçu en solo par un jeune de 17 ans qui a refusé la voie classique", de: "Im Alleingang gebaut von einem 17-Jährigen, der den Standardweg ablehnte", zh: "由一位拒绝走寻常路的 17 岁少年独自打造" })}
        </h2>

        <div className="mt-6 space-y-4 text-left text-base leading-relaxed text-muted">
          <p>
            {pick(lang, { en: "I'm 17. I'm in the U.S. And I built Nyx alone — the on-chain settlement, the AI resolution, the dispute engine, and the site you're reading right now.", ru: "Мне 17. Я в США. И я построил Nyx в одиночку — ончейн-расчёт, AI-разрешение исходов, движок споров и сайт, который ты читаешь прямо сейчас.", es: "Tengo 17 años. Estoy en EE. UU. Y construí Nyx yo solo: la liquidación on-chain, la resolución con IA, el motor de disputas y el sitio que estás leyendo ahora mismo.", pt: "Tenho 17 anos. Estou nos EUA. E construí o Nyx sozinho — a liquidação on-chain, a resolução por IA, o motor de disputas e o site que você está lendo agora.", fr: "J'ai 17 ans. Je suis aux États-Unis. Et j'ai construit Nyx seul — le règlement on-chain, la résolution par IA, le moteur de litiges et le site que vous lisez en ce moment.", de: "Ich bin 17. Ich bin in den USA. Und ich habe Nyx allein gebaut — das On-Chain-Settlement, die KI-Auflösung, die Dispute-Engine und die Seite, die du gerade liest.", zh: "我 17 岁，人在美国。Nyx 是我一个人做出来的——链上结算、AI 判定、争议引擎，以及你此刻正在读的这个网站。" })}
          </p>
          <p>
            {pick(lang, { en: "I'm not doing this the way you're supposed to. No team handed to me, no path laid out, no permission asked. I'd rather build something the world hasn't seen than follow a track someone else drew.", ru: "Я делаю это не так, как «положено». Никакой готовой команды, никакого проложенного пути, ни у кого не спрашивал разрешения. Я лучше построю то, чего мир ещё не видел, чем пойду по чужой колее.", es: "No lo hago como se supone que debe hacerse. Ningún equipo servido en bandeja, ningún camino trazado, sin pedir permiso. Prefiero construir algo que el mundo no ha visto antes que seguir una ruta que dibujó otro.", pt: "Não faço isso do jeito que se espera. Nenhuma equipe entregue, nenhum caminho traçado, sem pedir permissão. Prefiro construir algo que o mundo ainda não viu a seguir um trilho que outra pessoa desenhou.", fr: "Je ne fais pas ça comme on est censé le faire. Aucune équipe offerte, aucun chemin tracé, aucune permission demandée. Je préfère construire quelque chose que le monde n'a jamais vu plutôt que suivre une voie tracée par un autre.", de: "Ich mache das nicht so, wie man es soll. Kein Team in die Hand gedrückt, kein Weg vorgezeichnet, niemanden um Erlaubnis gefragt. Ich baue lieber etwas, das die Welt noch nicht gesehen hat, als einer Spur zu folgen, die jemand anderes gezogen hat.", zh: "我不按常规套路来。没有现成的团队，没有铺好的路，也没向谁请示。与其沿着别人画好的轨道走，我宁愿做出这个世界没见过的东西。" })}
          </p>
          <p>
            {pick(lang, { en: "This isn't a hackathon weekend for me — it's the long run. Nyx is the start of a prediction layer anyone on Earth can trust without trusting anyone.", ru: "Для меня это не хакатонные выходные — это надолго. Nyx — это начало слоя предсказаний, которому любой человек на Земле сможет доверять, не доверяя никому.", es: "Para mí esto no es un fin de semana de hackathon: es el largo plazo. Nyx es el comienzo de una capa de predicción en la que cualquiera en la Tierra puede confiar sin confiar en nadie.", pt: "Para mim isto não é um fim de semana de hackathon — é o longo prazo. O Nyx é o começo de uma camada de previsão em que qualquer pessoa na Terra pode confiar sem confiar em ninguém.", fr: "Pour moi, ce n'est pas un week-end de hackathon — c'est le long terme. Nyx est le début d'une couche de prédiction à laquelle n'importe qui sur Terre peut se fier sans faire confiance à personne.", de: "Für mich ist das kein Hackathon-Wochenende — es ist die lange Strecke. Nyx ist der Anfang einer Vorhersage-Schicht, der jeder Mensch auf der Erde vertrauen kann, ohne irgendjemandem zu vertrauen.", zh: "对我来说这不是一个黑客松周末——这是长期主义。Nyx 是一个预测层的起点，地球上任何人都能信任它，而无需信任任何人。" })}
          </p>
        </div>

        <blockquote className="mt-10 border-l-2 border-solana pl-5 text-left text-xl font-medium text-ink">
          “{pick(lang, { en: "Give me opportunities, and I'll show you the stars.", ru: "Дайте мне возможности — и я покажу вам звёзды.", es: "Dame oportunidades y te mostraré las estrellas.", pt: "Dê-me oportunidades e eu lhe mostrarei as estrelas.", fr: "Donnez-moi des opportunités, et je vous montrerai les étoiles.", de: "Gib mir Chancen, und ich zeige dir die Sterne.", zh: "给我机会，我会带你看见星辰。" })}”
        </blockquote>

        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-muted">
          {pick(lang, { en: "— Bohdan, founder of Nyx", ru: "— Богдан, основатель Nyx", es: "— Bohdan, fundador de Nyx", pt: "— Bohdan, fundador do Nyx", fr: "— Bohdan, fondateur de Nyx", de: "— Bohdan, Gründer von Nyx", zh: "——Bohdan，Nyx 创始人" })}
        </p>
      </motion.div>
    </section>
  );
}
