/* Ciltler yalnızca renk mi eziyor, biçim de mi?
   Bir zamanlar beş cilt aynı sayfanın beş boyasıydı: ölçüldüğünde 49 görünür
   öğenin 49'unda renk farkı, 0'ında yapı farkı vardı. Bu denetim o gerilemenin
   sessizce geri gelmesini engeller. Düzenli ifade yerine düz metin biçme
   kullanılıyor — YAML + shell + regex kaçışları üst üste binmesin. */
import fs from "fs";

const html = fs.readFileSync("index.html", "utf8");
const veri = JSON.parse(fs.readFileSync("kader.json", "utf8"));
const BICIM = ["--kart-yuvarlak", "--kart-kenar", "--baslik-yazi", "--govde-yazi", "--doku-frekans"];

function blokBul(ciltId) {
  const isaret = 'body[data-cilt="' + ciltId + '"]{';
  const i = html.indexOf(isaret);
  if (i < 0) return null;
  const j = html.indexOf("\n}", i);
  return j < 0 ? null : html.slice(i, j);
}

const eksik = [];
for (const c of (veri.ciltler || []).map(x => x.id)) {
  const blok = blokBul(c);
  if (!blok) { eksik.push(c + ": CSS bloğu bulunamadı"); continue; }
  const yok = BICIM.filter(t => blok.indexOf(t) < 0);
  if (yok.length) eksik.push(c + ": " + yok.join(", "));
}
if (!(veri.ciltler || []).length) eksik.push("ciltler listesi boş");

if (eksik.length) {
  console.error("Cilt yalnızca renk eziyor:\n  " + eksik.join("\n  "));
  process.exit(1);
}
console.log((veri.ciltler || []).length + " cilt de biçim token'ı eziyor");
