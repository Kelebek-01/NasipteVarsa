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

/* ——— 12. Kura ——— */
{
  const iki = K.kuraSec(veri, ["Kahve", "Çay"], D);
  ok("kura sonuç veriyor", !!iki && !!iki.secilen && iki.secenekler.length === 2, JSON.stringify(iki).slice(0, 90));
  ok("kura kazananı şıklardan biri", iki && iki.secenekler.indexOf(iki.secilen) === iki.sira);
  ok("kura hükmünde {secilen} yer değiştirdi", iki && !/\{secilen\}/.test(iki.yanit), iki && iki.yanit);
  ok("kura sıra bağımsız",
     K.kuraSec(veri, ["Çay", "Kahve"], D).secilen === iki.secilen);
  ok("kura devirle değişebilir",
     new Set([...Array(40)].map((_, i) => K.kuraSec(veri, ["Kahve", "Çay"], D + i).secilen)).size === 2);
  ok("kura tek şıkta null", K.kuraSec(veri, ["yalnız"], D) === null);
  ok("kura aynı şık iki kez → null", K.kuraSec(veri, ["Çay", " çay "], D) === null);
  ok("kura boş girdide null", K.kuraSec(veri, ["", "   "], D) === null);
  ok("kura şık tavanı 6", K.kuraSec(veri, "abcdefghij".split(""), D).secenekler.length === 6);
  /* ES kararlılığı: 3. şık eklemek ilk ikisinin dengesini toptan bozmamalı */
  let ayni = 0;
  for (let i = 0; i < 200; i++) {
    const a = K.kuraSec(veri, ["Kahve", "Çay"], D + i);
    const b = K.kuraSec(veri, ["Kahve", "Çay", "Ayran"], D + i);
    if (a.secilen === b.secilen) ayni++;
  }
  /* Rendezvous kuramı: 3 şıka çıkınca eski karar 2/3 olasılıkla korunur ≈ 133/200.
     Eşik örnekleme gürültüsüne (sd≈6.7) pay bırakacak şekilde 110. Tohumu şık
     kümesinden türetirsek bu değer ~67'ye düşer; test o gerilemeyi yakalar. */
  ok("şık eklemek eski kararların çoğunu koruyor (ES)", ayni >= 110, ayni + "/200 aynı kaldı");
  for (const uc of [null, undefined, [], ["__proto__", "constructor"], ["a".repeat(500), "b"]]) {
    const ad = "kura uç: " + String(JSON.stringify(uc)).slice(0, 30);
    try { K.kuraSec(veri, uc, D); ok(ad, true); }
    catch (e) { ok(ad, false, "istisna: " + e.message); }
  }
}

/* ——— 13. Ebced ——— */
{
  const m = K.ebcedDeger("Mert");
  ok("ebced değeri hesaplanıyor", m && m.toplam === 40 + 1 + 200 + 400, JSON.stringify(m));
  ok("ebced hane 1..9", m.hane >= 1 && m.hane <= 9 && m.hane === (m.toplam % 9 || 9), m.hane);
  ok("ebced harf sayısı", m.harf === 4, m.harf);
  ok("ebced Türkçe harf ayırt ediyor (ş≠s)",
     K.ebcedDeger("Ayşe").toplam !== K.ebcedDeger("Ayse").toplam,
     K.ebcedDeger("Ayşe").toplam + " vs " + K.ebcedDeger("Ayse").toplam);
  ok("ebced büyük/küçük harf duyarsız", K.ebcedDeger("MERT").toplam === K.ebcedDeger("mert").toplam);
  ok("ebced boşluk yutmuyor sayılmıyor", K.ebcedDeger("Ali Veli").harf === 7, K.ebcedDeger("Ali Veli").harf);
  ok("ebced okunmayan işareti sayıyor", K.ebcedDeger("Mert1").okunmayan === 1, JSON.stringify(K.ebcedDeger("Mert1")));
  ok("ebced harfsizde null", K.ebcedDeger("123") === null && K.ebcedDeger("") === null);
  const n = K.ebcedNasip(veri, "Mert", D);
  ok("ebced okuması geldi", n && n.yanit.length > 25 && n.serh.length > 10, JSON.stringify(n).slice(0, 100));
  ok("ebced aynı devirde kararlı", K.ebcedNasip(veri, "Mert", D).yanit === n.yanit);
  ok("ebced devir dönünce değişebilir",
     new Set([...Array(30)].map((_, i) => K.ebcedNasip(veri, "Mert", D + i).yanit)).size > 1);
  ok("ebced sayısı devirden BAĞIMSIZ",
     new Set([...Array(30)].map((_, i) => K.ebcedNasip(veri, "Mert", D + i).toplam)).size === 1);
  ok("aynı toplam aynı sayfayı açar",
     K.ebcedNasip(veri, "Mert", D).yanit === (function () {
       /* toplamı 641 olan başka bir dizi: t(400)+r(200)+m(40)+a(1) = "trma" */
       const b = K.ebcedNasip(veri, "trma", D);
       return b && b.toplam === 641 ? b.yanit : null;
     })());
  for (const uc of [null, undefined, "__proto__", "constructor", "x".repeat(500)]) {
    const ad = "ebced uç: " + String(JSON.stringify(uc)).slice(0, 26);
    try { K.ebcedNasip(veri, uc, D); ok(ad, true); }
    catch (e) { ok(ad, false, "istisna: " + e.message); }
  }
}

/* ——— 14. Defterin eski sayfaları ——— */
{
  const s = "Zam alacak mıyım?";
  const g = K.gecmisSayfalar(s, veri, D, 8);
  ok("8 eski sayfa", g.length === 8, g.length);
  ok("dönemler artan ve şimdikinden küçük",
     g.every((x, i) => x.donem === D - 8 + i) && g[g.length - 1].donem === D - 1,
     g.map(x => x.donem).join(","));
  ok("her sayfada hüküm ve kutup", g.every(x => x.yanit && x.kutup));
  ok("eski sayfa = o dönemin cevabı",
     g.every(x => K.cevapla(s, veri, x.donem).yanit === x.yanit));
  ok("eski sayfalar kararlı", JSON.stringify(K.gecmisSayfalar(s, veri, D, 8)) === JSON.stringify(g));
  ok("farklı soru farklı geçmiş",
     JSON.stringify(K.gecmisSayfalar("Ne zaman kavuşacağım?", veri, D, 8)) !== JSON.stringify(g));
  ok("adet tavanı 24", K.gecmisSayfalar(s, veri, D, 9999).length === 24);
  ok("adet tabanı 1 (negatif girdi kırpılır)",
     K.gecmisSayfalar(s, veri, D, -5).length === 1 && K.gecmisSayfalar(s, veri, D, 1).length === 1,
     K.gecmisSayfalar(s, veri, D, -5).length + " / " + K.gecmisSayfalar(s, veri, D, 1).length);
  ok("adet verilmezse 8", K.gecmisSayfalar(s, veri, D).length === 8 && K.gecmisSayfalar(s, veri, D, 0).length === 8);
  ok("başlangıç zamanı hesaplandı", g.every(x => typeof x.baslangicMs === "number" && isFinite(x.baslangicMs)));
  ok("başlangıçlar dönem uzunluğu kadar aralıklı",
     g.every((x, i) => i === 0 || x.baslangicMs - g[i - 1].baslangicMs === (A.donemGun || 7) * 86400000));
}

/* ——— 13. Her havuz gerçekten ULAŞILABİLİR mi ———
   Regresyon koruması. konuHukum TON'a göre anahtarlanır, tipHukum KADER'e göre;
   kader.js bir ara konuHukum'u kader ile okuyordu ve tek kesişen anahtar
   "belirsiz" olduğu için 90 konu cümlesinin 72'si hiç seçilemiyordu. Testler
   bunu görmedi çünkü hiçbiri havuz isabetini ölçmüyordu. Artık ölçüyor:
   şema anahtarı değişirse ya da okuma tarafı kayarsa burası kalır. */
{
  const sorular = [];
  for (const k of ["iş", "para", "aşk", "sınav", "ev", "yol", "sağlık", "borç", "evlilik", "terfi"])
    for (const p of ["X olacak mı", "X ne zaman olur", "X iyi gider mi", "X kaybeder miyim"])
      sorular.push(p.replace("X", k));

  const isabet = { konu: 0, tip: 0, ton: 0 };
  const tonlar = new Set();
  for (const s of sorular) for (let d = 0; d < 12; d++) {
    const r = K.cevapla(s, veri, D - d);
    if (((veri.konuHukum[r.konu] || {})[r.ton] || []).includes(r.yanit)) isabet.konu++;
    if (((veri.tipHukum[r.tip] || {})[r.kader] || []).includes(r.yanit)) isabet.tip++;
    if ((veri.hukum.ton[r.ton] || []).includes(r.yanit)) isabet.ton++;
    if (r.konu !== "genel") tonlar.add(r.konu + ":" + r.ton);
  }
  ok("konuHukum havuzu ulaşılabilir", isabet.konu > 0, JSON.stringify(isabet));
  ok("tipHukum havuzu ulaşılabilir", isabet.tip > 0, JSON.stringify(isabet));
  ok("hukum.ton havuzu ulaşılabilir", isabet.ton > 0, JSON.stringify(isabet));
  /* "belirsiz" dışındaki tonlarda da konu cümlesi çıkmalı: hatanın imzası
     tam olarak "yalnızca belirsiz tonunda konu cümlesi görünmesi" idi. */
  let belirsizDisi = 0;
  for (const s of sorular) for (let d = 0; d < 12; d++) {
    const r = K.cevapla(s, veri, D - d);
    if (r.ton !== "belirsiz" && ((veri.konuHukum[r.konu] || {})[r.ton] || []).includes(r.yanit)) belirsizDisi++;
  }
  ok("konu cümlesi belirsiz dışı tonlarda da çıkıyor", belirsizDisi > 0, belirsizDisi + " isabet");
  /* Şema anahtarları kaymasın. */
  ok("konuHukum TON anahtarlı",
     Object.keys(veri.konuHukum).every(k =>
       ["mujde", "uyari", "teselli", "ferah", "belirsiz"].every(t => Array.isArray(veri.konuHukum[k][t]))));
  ok("tipHukum KADER anahtarlı",
     Object.keys(veri.tipHukum).every(k =>
       ["olur", "olmaz", "belirsiz"].every(t => Array.isArray(veri.tipHukum[k][t]))));
}

/* ——— 14. Eşdizim tablosu (arzu yönü kelime ÇİFTİNDE) ———
   "ceza al" korkulan ama "zam al" istenen; tek tek bakınca ikisi de "al"
   fiiline düşer ve yüklem 3× ağırlıklı olduğu için yanlış taraf kazanırdı.
   Ölçüldü: bu tablo korkulan tespitini test3'te %74,6'dan %87,3'e çıkardı. */
{
  const cift = [
    ["Ceza alacak mıyım?", "korkulan"], ["Zam alacak mıyım?", "istenen"],
    ["Sınıfta kalacak mıyım?", "korkulan"], ["Hamile kalabilecek miyim?", "istenen"],
    ["Borcum artacak mı?", "korkulan"], ["Maaşım artacak mı?", "istenen"],
    ["Bu ilişki bitecek mi?", "korkulan"], ["Borcum bitecek mi?", "istenen"],
    ["Çocuğum olacak mı?", "istenen"], ["Kilo alacak mıyım?", "korkulan"],
    ["Kilo verebilecek miyim?", "istenen"]
  ];
  let d = 0;
  for (const [s, b] of cift) if (K.coz(s, veri).arzu === b) d++;
  ok("eşdizim çiftleri doğru yön veriyor", d === cift.length, d + "/" + cift.length);

  /* Anahtar kullanıcı girdisinden türüyor: tablo Object.create(null) olmalı,
     yoksa "constructor" yazan ziyaretçi Object.prototype'ı yakalar. */
  ok("eşdizim tablosu prototipsiz",
     Object.getPrototypeOf(veri._esKorku) === null && Object.getPrototypeOf(veri._esIstek) === null);
  ok("prototip anahtarları sızmıyor",
     veri._esKorku["constructor"] === undefined && veri._esIstek["toString"] === undefined);

  /* Aynı çift iki listede olamaz: yön belirsizleşir ve ağırlıklar birbirini yer. */
  const es = veri.esdizim || {};
  const ortak = (es.korkulan || []).filter(c => (es.istenen || []).includes(c));
  ok("hiçbir çift iki listede birden değil", ortak.length === 0, ortak.join(", "));

  /* Anahtarlar motorun ÜRETTİĞİ gövde biçiminde olmalı, sözlük biçiminde değil:
     "zam" gövdelenince "za" olur, "zam al" yazan anahtar hiç eşleşmez. */
  const olu = [];
  for (const liste of [es.korkulan || [], es.istenen || []])
    for (const c of liste) {
      const p = c.split(" ");
      if (p.length !== 2) { olu.push(c + " (iki gövde değil)"); continue; }
      if (p.some(x => K.katla(K.duzle(x)) !== x)) olu.push(c + " (katlanmamış yazılmış)");
    }
  ok("eşdizim anahtarları katlanmış gövde biçiminde", olu.length === 0, olu.slice(0, 5).join(" | "));
}

/* ——— 15. İki burç arası açı ———
   Açı EFEMERİS GEREKTİRMEZ: zodyak indeks uzaklığı × 30° açının kendisidir.
   Kaynak: Ptolemaios Tetrabiblos I.13. Uzaklık 1 ve 5'te klasik açı yoktur
   (aversion / yüz çevirme) — bunu "30° açı var" diye yazmak uydurma olurdu. */
{
  const bekle = {0:["kavusum",0], 1:["yuzcevirme",30], 2:["altmislik",60], 3:["kare",90],
                 4:["ucgen",120], 5:["yuzcevirme",150], 6:["karsitlik",180]};
  let yanlis = [];
  for (let i = 0; i < 12; i++) for (let j = 0; j < 12; j++) {
    let d = Math.abs(i - j); if (d > 6) d = 12 - d;
    const a = K.burcAcisi(i, j);
    if (a.uzaklik !== d || a.ad !== bekle[d][0] || a.derece !== bekle[d][1])
      yanlis.push(`${i}↔${j}: ${JSON.stringify(a)} ≠ ${JSON.stringify(bekle[d])}`);
  }
  ok("144 burç çiftinin hepsinde açı doğru", yanlis.length === 0, yanlis.slice(0, 3).join(" | "));
  ok("zodyak sarmalanıyor (Koç↔Balık = 30°, 330° değil)",
     K.burcAcisi(0, 11).derece === 30 && K.burcAcisi(0, 11).uzaklik === 1);
  ok("açı simetrik", [...Array(12)].every((_, i) => [...Array(12)].every((_, j) =>
     K.burcAcisi(i, j).ad === K.burcAcisi(j, i).ad)));

  const ilk = veri.burclar[0].id, karsit = veri.burclar[6].id, ucgenli = veri.burclar[4].id;
  const p = K.burcIkili(veri, ilk, karsit, D);
  ok("burcIkili kayıt üretiyor", !!p && p.yanit.length > 5 && p.serh.length > 5, JSON.stringify(p && p.aci));
  ok("karşıt burçlar karşıtlık veriyor", p.aci === "karsitlik" && p.derece === 180, p && p.aci);
  ok("aynı element üçgen veriyor", K.burcIkili(veri, ilk, ucgenli, D).aci === "ucgen");
  ok("aynı burç kavuşum veriyor", K.burcIkili(veri, ilk, ilk, D).aci === "kavusum");

  /* Sıra fark etmemeli: A+B ile B+A aynı kayıt (ikiliNasip'teki sözleşme). */
  const q = K.burcIkili(veri, karsit, ilk, D);
  ok("sıra bağımsız (A+B = B+A)", p.yanit === q.yanit && p.serh === q.serh && p.no === q.no,
     p.no + " vs " + q.no);
  ok("deterministik", K.burcIkili(veri, ilk, ucgenli, D).no === K.burcIkili(veri, ilk, ucgenli, D).no);
  ok("devre bağlı", K.burcIkili(veri, ilk, ucgenli, D).no !== K.burcIkili(veri, ilk, ucgenli, D - 1).no);
  ok("bilinmeyen burç null döndürür",
     K.burcIkili(veri, "yokboyle", ilk, D) === null && K.burcIkili(veri, ilk, "", D) === null);

  /* Altı açı kovasının hepsi dolu olmalı; biri boşsa o çift sessizce boş hüküm alır. */
  const bi = veri.burcIkili || {};
  const bos = ["kavusum","altmislik","kare","ucgen","karsitlik","yuzcevirme"]
    .filter(x => !((bi.hukum || {})[x] || []).length);
  ok("altı açı havuzunun hepsi dolu", bos.length === 0, bos.join(", "));
  ok("şerh havuzu dolu", (bi.serh || []).length > 0);
  ok("her burcun yöneticisi var",
     veri.burclar.every(b => typeof b.yonetici === "string" && b.yonetici.length > 1));

  /* 12×12'nin tamamı gerçekten cevap üretmeli — hiçbir çift boşa düşmesin. */
  let boslar = 0;
  for (const a of veri.burclar) for (const b of veri.burclar) {
    const r = K.burcIkili(veri, a.id, b.id, D);
    if (!r || !r.yanit || !r.serh) boslar++;
  }
  ok("144 çiftin hepsi hüküm ve şerh alıyor", boslar === 0, boslar + " boş");
}

console.log(`\n${gecti} geçti, ${kaldi} kaldı`);
if (hata.length) { console.log("\nKALANLAR:"); hata.forEach(h => console.log("  ✗ " + h)); }
console.log("mühür dağılımı:", JSON.stringify(yuzde));
process.exit(kaldi ? 1 : 0);
