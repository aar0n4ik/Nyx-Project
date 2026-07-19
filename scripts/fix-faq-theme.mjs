import fs from "node:fs";

const path = "components/PerTrackFaq.tsx";
let src = fs.readFileSync(path, "utf8");
const before = src;

// Стрип любых text-цветов (включая opacity и dark:) на элементе, оборачивающем anchor,
// и установка корректного theme-aware токена.
function setColor(s, anchor, color) {
  const idx = s.indexOf(anchor);
  if (idx === -1) { console.log("⏭️  не найден якорь:", anchor); return s; }
  const head = s.slice(0, idx);
  const cn = head.lastIndexOf('className="');
  if (cn === -1) { console.log("⏭️  нет className перед:", anchor); return s; }
  const vs = cn + 'className="'.length;
  const ve = s.indexOf('"', vs);
  let cls = s.slice(vs, ve);
  cls = cls
    .replace(/\b(dark:)?text-(base|subtle|hairline|ink|muted|white|black|foreground|background)(\/\d+)?\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
  cls = (cls + " " + color).trim();
  if (cls === s.slice(vs, ve)) { console.log("⏭️  уже ок:", anchor); return s; }
  console.log("✅ цвет обновлён у:", anchor, "→", color);
  return s.slice(0, vs) + cls + s.slice(ve);
}

src = setColor(src, "{pick(lang, f.q)}", "text-ink");   // вопрос — основной текст
src = setColor(src, "{pick(lang, f.a)}", "text-muted"); // ответ — приглушённый

if (src !== before) {
  fs.writeFileSync(path, src);
  console.log("✅ PerTrackFaq.tsx: цвета FAQ нормализованы");
} else {
  console.log("⏭️  изменений нет");
}
