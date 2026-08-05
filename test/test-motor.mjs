/* Kader Motoru v3 — regresyon testleri (şemadan bağımsız çalışır) */
import { createRequire } from "module";
import fs from "fs";
const require = createRequire(import.meta.url);
const K = require(new URL("../kader.js", import.meta.url).pathname);
const veri = K.hazirla(JSON.parse(fs.readFileSync(new URL("../kader.json", import.meta.url).pathname, "utf8")));
const A = veri.ayar;

let gecti = 0, kaldi = 0; const hata = [];
const ok = (ad, k, d) => { if (k) gecti++; else { kaldi++; hata.push(ad + (d ? "  → " + d : "")); } };

/* ——— 1. Sesbilim: arketip yüzey üretimi ——— */
for (const [sab, gov, bek] of [
  ["(y)AcAk", "gel", "ecek"], ["(y)AcAk", "al", "acak"], ["(y)AcAk", "oku", "yacak"],
  ["(y)AcAk", "gül", "ecek"], ["DAn", "kitap", "tan"], ["DAn", "ev", "den"],
  ["(H)yor", "gel", "iyor"], ["(H)yor", "oku", "yor"], ["(H)yor", "gül", "üyor"],
  ["(s)H", "okul", "u"], ["(s)H", "oku", "su"], ["(H)m", "vize", "m"], ["(H)m", "maaş", "ım"],
  ["mA", "el", "me"], ["mA", "kavur", "ma"], ["mHyor", "sev", "miyor"], ["mHyor", "al", "mıyor"]
]) ok(`yüzey ${sab}+${gov}`, K.yuzey(sab, gov) === bek, `bulunan "${K.yuzey(sab, gov)}", beklenen "${bek}"`);

/* ——— 2. Gövdeleme (uyum + morfotaktik) ——— */
const GOVDE = {
  "okulu": "okul", "okul": "okul", "elma": "elma", "kavurma": "kavur",
  "sınavı": "sınav", "evleneceğim": "evlen", "kitabı": "kitap", "alacağım": "al",
  "kovulacak": "kovul", "seviyorum": "sev", "taşınacak": "taşın", "maaşım": "maaş",
  "paranın": "para", "işten": "iş", "doktora": "doktor", "vizem": "vize",
  "hastalığım": "hastalık", "sevmiyorlar": "sev", "borçlarımı": "borç", "gidiyorum": "git"
};
for (const [w, b] of Object.entries(GOVDE)) {
  const g = K.govdele(w, A).govde;
  ok("gövde " + w, g === b, `"${w}" → "${g}", beklenen "${b}"`);
}
/* uyum doğrulaması yanlış soymayı engellemeli */
ok("uyum: elma korunur", K.govdele("elma", A).ekler.length === 0);
ok("morfotaktik: doktora→doktor", K.govdele("doktora", A).govde === "doktor");

/* ASCII ↔ Türkçe aynı köke inmeli */
for (const [a, b] of [["sınavı", "sinavi"], ["taşınacağım", "tasinacagim"], ["evleneceğim", "evlenecegim"],
                      ["işten", "isten"], ["boşanacak", "bosanacak"], ["geçebilecek", "gecebilecek"]])
  ok("ASCII tutarlılık " + a, K.katla(K.govdele(a, A).govde) === K.katla(K.govdele(b, A).govde),
     `${K.katla(K.govdele(a, A).govde)} ≠ ${K.katla(K.govdele(b, A).govde)}`);

/* ——— 3. Olumsuzluk: -mA adlaştırıcı mı, olumsuzluk mu ——— */
ok("olumsuz: kovulmayacak", K.coz("kovulmayacak mıyım", veri).olumsuz === true);
ok("olumsuz değil: olmam gerekecek", K.coz("ameliyat olmam gerekecek mi", veri).olumsuz === false);
ok("olumsuz: sevmiyorlar", K.coz("beni sevmiyorlar mı", veri).olumsuz === true);

/* ——— 4. Soru tipi ——— */
for (const [s, b] of [
  ["Zam alacak mıyım?", "evet_hayir"], ["Ne zaman kavuşacağım?", "zaman"],
  ["İstifa etsem mi kalsam mı?", "secim"], ["Kim arayacak beni?", "kisi"],
  ["Nerede bulacağım onu?", "yer"], ["Neden olmuyor bu iş?", "neden"],
  ["Nasıl kazanırım?", "nasil"], ["Ne kadar para gelecek?", "nicel"], ["Hayat", "acik"]
]) ok("tip: " + s, K.coz(s, veri).tip === b, "bulunan " + K.coz(s, veri).tip);

/* ——— 5. Arzu ekseni: yüklem belirleyici ——— */
for (const [s, b] of [
  ["Hastalığım ne zaman geçer?", "istenen"], ["Hastalığım geçmeyecek mi?", "korkulan"],
  ["İşten kovulacak mıyım?", "korkulan"], ["Terfi alacak mıyım?", "istenen"]
]) ok("arzu: " + s, K.coz(s, veri).arzu === b, "bulunan " + K.coz(s, veri).arzu);

/* ——— 6. Ton eşlemesi: mühür anlamı ——— */
ok("ton olur+korkulan=uyari", K.tonBul("olur", "korkulan") === "uyari");
ok("ton olmaz+korkulan=ferah", K.tonBul("olmaz", "korkulan") === "ferah");
ok("ton olur+istenen=mujde", K.tonBul("olur", "istenen") === "mujde");
ok("ton olmaz+istenen=teselli", K.tonBul("olmaz", "istenen") === "teselli");
ok("mühür ferah=var", K.MUHUR_TON.ferah === "var");
ok("mühür uyari=yok", K.MUHUR_TON.uyari === "yok");

/* ——— 7. Determinizm ve sıra bağımsızlığı ——— */
const D = 300;
for (const grup of [
  ["Zam alacak mıyım?", "zam alacak mıyım", "ZAM ALACAK MIYIM?", "Acaba zam alacak mıyım ki?"],
  ["Bu iş olacak mı?", "bu iş olacak mı???", "Bu iş olacak mı acaba"]
]) {
  const ilk = K.cevapla(grup[0], veri, D);
  for (const v of grup.slice(1)) {
    const s = K.cevapla(v, veri, D);
    ok("determinizm: " + v, s.yanit === ilk.yanit && s.serh === ilk.serh && s.no === ilk.no);
  }
}

/* ——— 8. Dönem etkisi ——— */
const sorular = ["Zam alacak mıyım", "Evlenecek miyim", "Terfi alacak mıyım", "Sınavı geçecek miyim",
  "Vize çıkacak mı", "İyileşecek miyim", "O mesaj gelecek mi", "Ev alabilecek miyim",
  "Ne zaman kavuşacağım", "Kim arayacak", "Nasıl kazanırım", "Borcumu kapatır mıyım"].map(s => s + "?");
let degisen = 0;
for (const s of sorular) if (K.cevapla(s, veri, D).yanit !== K.cevapla(s, veri, D + 1).yanit) degisen++;
ok("dönem etkisi", degisen / sorular.length > 0.4, `${degisen}/${sorular.length}`);

/* ——— 9. Seçim kararlılığı: içerik eklemek kaderi bozmamalı ——— */
{
  const once = sorular.map(s => K.cevapla(s, veri, D).yanit);
  const v2 = K.hazirla(JSON.parse(fs.readFileSync(new URL("../kader.json", import.meta.url).pathname, "utf8")));
  v2.hukum.ton.mujde = v2.hukum.ton.mujde.concat(["Sonradan eklenmiş cümle."]);
  const sonra = sorular.map(s => K.cevapla(s, v2, D).yanit);
  const d = once.filter((x, i) => x !== sonra[i]).length;
  ok("kararlılık", d <= Math.ceil(sorular.length * 0.25), `${d}/${sorular.length} değişti`);
}
/* alan ayrımı: tavsiye değişince hüküm değişmemeli */
{
  const once = sorular.map(s => K.cevapla(s, veri, D).yanit);
  const v3 = K.hazirla(JSON.parse(fs.readFileSync(new URL("../kader.json", import.meta.url).pathname, "utf8")));
  v3.tavsiye.mujde = v3.tavsiye.mujde.concat(["Yeni tavsiye."]);
  const sonra = sorular.map(s => K.cevapla(s, v3, D).yanit);
  ok("alan ayrımı", once.every((x, i) => x === sonra[i]));
}

/* ——— 10. Çıktı sağlığı + dağılım ——— */
const dagilim = {}; let bozuk = 0, toplam = 0, ornek = "";
for (let d = 200; d < 280; d++) for (const s of sorular) {
  const r = K.cevapla(s, veri, d);
  toplam++; dagilim[r.kutup] = (dagilim[r.kutup] || 0) + 1;
  const t = r.yanit + " " + r.serh;
  if (!r.yanit || !r.serh || /\s\s/.test(t) || /undefined|null|NaN|[{}]/.test(t) ||
      !/[.!?…]$/.test(r.yanit.trim()) || !/[.!?…]$/.test(r.serh.trim()) ||
      r.yanit.length > 90 || r.serh.length > 200 || !(r.no >= 1000 && r.no <= 9999)) {
    bozuk++; if (!ornek) ornek = JSON.stringify(r);
  }
}
ok("çıktı sağlığı", bozuk === 0, `${bozuk}/${toplam} bozuk. ${ornek}`);
const yuzde = {}; for (const k in dagilim) yuzde[k] = +(100 * dagilim[k] / toplam).toFixed(1);
ok("mühür dengesi", yuzde.var > 20 && yuzde.var < 50 && yuzde.yok > 20 && yuzde.yok < 50 &&
   yuzde.bekle > 22 && yuzde.bekle < 48, JSON.stringify(yuzde));

/* ——— 11. Özel sorular ve uç durumlar ——— */
ok("özel: sen kimsin", K.cevapla("Sen kimsin?", veri, D).yanit === "Kaderin sesiyim. Sorunu sor.");
for (const uc of ["?", "...", "a", "acaba", "😀", "mı", "   ", "çok çok çok", "__proto__", "constructor"]) {
  try {
    const r = K.cevapla(uc, veri, D);
    ok("uç: " + JSON.stringify(uc), !!r.yanit && !!r.kutup, JSON.stringify(r).slice(0, 90));
  } catch (e) { ok("uç: " + JSON.stringify(uc), false, "istisna: " + e.message); }
}

console.log(`\n${gecti} geçti, ${kaldi} kaldı`);
if (hata.length) { console.log("\nKALANLAR:"); hata.forEach(h => console.log("  ✗ " + h)); }
console.log("mühür dağılımı:", JSON.stringify(yuzde));
process.exit(kaldi ? 1 : 0);
