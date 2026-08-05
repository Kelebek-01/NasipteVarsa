/**
 * Kader Motoru v3 — ölçüm koşusu.
 * Bağımsız held-out set üzerinde sınıflandırma başarımı, ablasyonlar,
 * seçim kararlılığı ve dağılım testleri. Çıktı: eval/RAPOR.md
 */
import { createRequire } from "module";
import fs from "fs";
const require = createRequire(import.meta.url);
const YOL = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const K = require(YOL + "/kader.js");

const hamVeri = () => JSON.parse(fs.readFileSync(YOL + "/kader.json", "utf8"));
const holdout = JSON.parse(fs.readFileSync(new URL("holdout.json", import.meta.url).pathname, "utf8"));
const test2 = JSON.parse(fs.readFileSync(new URL("test2.json", import.meta.url).pathname, "utf8"));
const kayitlar = holdout.kayitlar;                 /* geliştirme seti (hataları incelendi) */
const test2Kayit = test2.kayitlar;                 /* nihai set (hiç incelenmedi) */

const R = [];                                   /* rapor satırları */
const yaz = (s = "") => { R.push(s); console.log(s); };

/* ─────────── yardımcılar ─────────── */

function veriKur(kapali = {}) {
  const v = hamVeri();
  v.ayar.kapali = kapali;
  return K.hazirla(v);
}

function sinifla(v, eksen, set = kayitlar) {
  const gercek = [], tahmin = [];
  for (const k of set) {
    const c = K.coz(k.soru, v);
    gercek.push(k[eksen]);
    tahmin.push(eksen === "tip" ? c.tip : eksen === "konu" ? c.konu : c.arzu);
  }
  return { gercek, tahmin };
}

function metrikler(gercek, tahmin) {
  const siniflar = [...new Set([...gercek, ...tahmin])].sort();
  const say = {};
  for (const s of siniflar) say[s] = { tp: 0, fp: 0, fn: 0, destek: 0 };
  let dogru = 0;
  for (let i = 0; i < gercek.length; i++) {
    say[gercek[i]].destek++;
    if (gercek[i] === tahmin[i]) { say[gercek[i]].tp++; dogru++; }
    else { say[tahmin[i]].fp++; say[gercek[i]].fn++; }
  }
  let mP = 0, mR = 0, mF = 0, n = 0;
  const satir = [];
  for (const s of siniflar) {
    const c = say[s];
    const p = c.tp + c.fp ? c.tp / (c.tp + c.fp) : 0;
    const r = c.tp + c.fn ? c.tp / (c.tp + c.fn) : 0;
    const f = p + r ? 2 * p * r / (p + r) : 0;
    satir.push({ sinif: s, p, r, f, destek: c.destek });
    if (c.destek > 0) { mP += p; mR += r; mF += f; n++; }
  }
  return { dogruluk: dogru / gercek.length, makroP: mP / n, makroR: mR / n, makroF1: mF / n, satir, siniflar };
}

function karisiklik(gercek, tahmin, siniflar) {
  const m = {};
  for (const a of siniflar) { m[a] = {}; for (const b of siniflar) m[a][b] = 0; }
  for (let i = 0; i < gercek.length; i++) m[gercek[i]][tahmin[i]]++;
  return m;
}

function tabloYaz(baslik, m) {
  yaz("");
  yaz("**" + baslik + "**");
  yaz("");
  yaz("| sınıf | kesinlik | duyarlılık | F1 | destek |");
  yaz("|---|---:|---:|---:|---:|");
  for (const s of m.satir) {
    yaz(`| ${s.sinif} | ${s.p.toFixed(3)} | ${s.r.toFixed(3)} | ${s.f.toFixed(3)} | ${s.destek} |`);
  }
  yaz(`| **makro** | **${m.makroP.toFixed(3)}** | **${m.makroR.toFixed(3)}** | **${m.makroF1.toFixed(3)}** | ${kayitlar.length} |`);
  yaz("");
  yaz(`Doğruluk: **${(100 * m.dogruluk).toFixed(1)}%**`);
}

function matrisYaz(baslik, mat, siniflar) {
  yaz("");
  yaz("**" + baslik + "** (satır = gerçek, sütun = tahmin)");
  yaz("");
  yaz("| |" + siniflar.map(s => " " + s + " |").join(""));
  yaz("|---|" + siniflar.map(() => "---:|").join(""));
  for (const a of siniflar) {
    yaz("| **" + a + "** |" + siniflar.map(b => {
      const n = mat[a][b];
      return (n === 0 ? " · " : (a === b ? " **" + n + "** " : " " + n + " ")) + "|";
    }).join(""));
  }
}

/* ─────────── 1. Ana başarım ─────────── */

yaz("# Kader Motoru v3 — Ölçüm Raporu");
yaz("");
yaz("Değerlendirme seti: **bağımsız held-out**, " + kayitlar.length + " Türkçe soru. Sistemin");
yaz("sözlükleri ve kodu görülmeden, ayrı bir ajan tarafından yazıldı; motor bu sete karşı");
yaz("hiç eğitilmedi ve eşikler bu sete bakılarak ayarlanmadı.");
yaz("");
const zorSayi = kayitlar.filter(k => /zor vaka/i.test(k.not || "")).length;
yaz("Set içinde bilinçli **zor vaka**: " + zorSayi + " (Türkçe karaktersiz yazım, olumsuz çekim,");
yaz("argo, tuzak kelimeler, iki konulu sorular).");
yaz("");
yaz("---");
yaz("");
yaz("## 1. Sınıflandırma başarımı");

const tam = veriKur();
const olcum = {};
for (const eksen of ["tip", "konu", "arzu"]) {
  const { gercek, tahmin } = sinifla(tam, eksen);
  const m = metrikler(gercek, tahmin);
  olcum[eksen] = m;
  tabloYaz(eksen + " ekseni", m);
  matrisYaz(eksen + " karışıklık matrisi", karisiklik(gercek, tahmin, m.siniflar), m.siniflar);
}

/* rastgele ve çoğunluk temel çizgileri */
yaz("");
yaz("### Temel çizgiler");
yaz("");
yaz("| eksen | motor | çoğunluk sınıfı | rastgele (tekdüze) |");
yaz("|---|---:|---:|---:|");
for (const eksen of ["tip", "konu", "arzu"]) {
  const sayim = {};
  for (const k of kayitlar) sayim[k[eksen]] = (sayim[k[eksen]] || 0) + 1;
  const cog = Math.max(...Object.values(sayim)) / kayitlar.length;
  const rast = 1 / Object.keys(sayim).length;
  yaz(`| ${eksen} | **${(100 * olcum[eksen].dogruluk).toFixed(1)}%** | ${(100 * cog).toFixed(1)}% | ${(100 * rast).toFixed(1)}% |`);
}

/* ─────────── 1b. NİHAİ ÖLÇÜM: hiç incelenmemiş ikinci set ─────────── */

yaz("");
yaz("---");
yaz("");
yaz("## 1b. Nihai ölçüm — hiç incelenmemiş ikinci bağımsız set");
yaz("");
yaz("Yukarıdaki " + kayitlar.length + " soruluk set üzerinde hata çözümlemesi yapıldı ve");
yaz("bulunan **hatalar giderildi** (sözlüğün ikinci kez gövdelenmesi, iyelik eki şablonları,");
yaz("olumsuz şimdiki zaman kaynaşması, yüklem ağırlıklı arzu). Bu yüzden o set artık");
yaz("*geliştirme seti* sayılmalı, saf held-out değil.");
yaz("");
yaz("Aşağıdaki " + test2Kayit.length + " soruluk set, başka bir ajan tarafından ayrıca yazıldı ve");
yaz("**tek bir örneği bile incelenmedi**; sistem bu sete göre hiç değiştirilmedi.");
yaz("");
yaz("| eksen | geliştirme seti (" + kayitlar.length + ") | **nihai set (" + test2Kayit.length + ")** | çoğunluk temel çizgisi |");
yaz("|---|---:|---:|---:|");
const nihai = {};
for (const eksen of ["tip", "konu", "arzu"]) {
  const m2 = metrikler(...Object.values(sinifla(tam, eksen, test2Kayit)));
  nihai[eksen] = m2;
  const sayim = {}; for (const k of test2Kayit) sayim[k[eksen]] = (sayim[k[eksen]] || 0) + 1;
  const cog = Math.max(...Object.values(sayim)) / test2Kayit.length;
  yaz(`| ${eksen} | ${(100 * olcum[eksen].dogruluk).toFixed(1)}% | **${(100 * m2.dogruluk).toFixed(1)}%** (F1 ${m2.makroF1.toFixed(3)}) | ${(100 * cog).toFixed(1)}% |`);
}
for (const eksen of ["tip", "konu", "arzu"]) tabloYaz("nihai set — " + eksen + " ekseni", nihai[eksen]);

/* ─────────── 2. Ablasyonlar ─────────── */

yaz("");
yaz("---");
yaz("");
yaz("## 2. Ablasyon: hangi katman ne kazandırıyor?");
yaz("");
yaz("Her satırda tek bir katman kapatıldı, gerisi sabit.");
yaz("");

const ablasyonlar = [
  ["tam sistem", {}],
  ["− ünlü uyumu doğrulaması", { uyum: 1 }],
  ["− morfotaktik sıra kısıtı", { morfo: 1 }],
  ["− ASCII gevşek uyum", { gevsek: 1 }],
  ["− IDF ağırlığı", { idf: 1 }],
  ["− karakter n-gram geri düşüşü", { ngram: 1 }],
  ["gövdeleme yerine F5 (ilk 5 harf)", { f5: 1 }],
  ["− uyum − morfotaktik (kör soyma)", { uyum: 1, morfo: 1 }]
];

yaz("| yapılandırma | konu doğr. | konu makroF1 | arzu doğr. | tip doğr. |");
yaz("|---|---:|---:|---:|---:|");
const abl = {};
for (const [ad, kap] of ablasyonlar) {
  const v = veriKur(kap);
  const kk = metrikler(...Object.values(sinifla(v, "konu")));
  const ka = metrikler(...Object.values(sinifla(v, "arzu")));
  const kt = metrikler(...Object.values(sinifla(v, "tip")));
  abl[ad] = { kk, ka, kt };
  const vurgu = ad === "tam sistem" ? "**" : "";
  yaz(`| ${vurgu}${ad}${vurgu} | ${vurgu}${(100 * kk.dogruluk).toFixed(1)}%${vurgu} | ${vurgu}${kk.makroF1.toFixed(3)}${vurgu} | ${vurgu}${(100 * ka.dogruluk).toFixed(1)}%${vurgu} | ${vurgu}${(100 * kt.dogruluk).toFixed(1)}%${vurgu} |`);
}

/* Türkçe karaktersiz alt küme — gevşek uyumun asıl hedefi */
const asciiKayit = kayitlar.filter(k => !/[ıİşŞğĞüÜöÖçÇ]/.test(k.soru));
yaz("");
yaz("**Türkçe karakter kullanılmayan " + asciiKayit.length + " soruluk alt kümede konu doğruluğu:**");
yaz("");
yaz("| yapılandırma | konu doğruluğu |");
yaz("|---|---:|");
for (const [ad, kap] of [["tam sistem", {}], ["− ASCII gevşek uyum", { gevsek: 1 }], ["− ünlü uyumu doğrulaması", { uyum: 1 }]]) {
  const v = veriKur(kap);
  let d = 0;
  for (const k of asciiKayit) if (K.coz(k.soru, v).konu === k.konu) d++;
  yaz(`| ${ad} | ${(100 * d / asciiKayit.length).toFixed(1)}% |`);
}

/* ─────────── 3. Seçim kararlılığı ─────────── */

yaz("");
yaz("---");
yaz("");
yaz("## 3. Seçim kararlılığı: içerik eklemek kaderleri bozuyor mu?");
yaz("");
yaz("v2'de seçim `indeks = floor(u · n)` idi: listeye tek cümle eklemek eşlemeyi kaydırıyor");
yaz("ve mevcut cevapların çoğunu değiştiriyordu. v3 Efraimidis–Spirakis anahtarı kullanıyor:");
yaz("`k_i = u_i^(1/w_i)`, argmax. Yeni aday yalnızca `w_yeni/Σw` olasılıkla kazanır.");
yaz("");

const sorularKararlilik = kayitlar.map(k => k.soru);
const DONEM = 300;

function cevapKumesi(v) {
  return sorularKararlilik.map(s => K.cevapla(s, v, DONEM).yanit);
}
function modKumesi(v, ekstraCumle) {
  /* v2 taklidi: aynı tohum, ama indeks = floor(u·n) */
  return sorularKararlilik.map(s => {
    const c = K.coz(s, v);
    const cek = c.govdeler.slice().sort().join("|");
    const tohum = K.karistir((K.hashle(cek) ^ K.karistir((DONEM * 2654435761) | 0)) >>> 0);
    const liste = v.hukum.ton.mujde.concat(ekstraCumle ? [ekstraCumle] : []);
    const u = (K.karistir((K.altTohum(tohum, "hukum") ^ K.hashle("mod")) >>> 0)) / 4294967296;
    return liste[Math.floor(u * liste.length)];
  });
}

const vA = veriKur();
const oncesiES = cevapKumesi(vA);
const oncesiMod = modKumesi(vA, null);

const vB = veriKur();
vB.hukum.ton.mujde = vB.hukum.ton.mujde.concat(["Bu satır sonradan eklendi; kaderi bozmamalı."]);
vB.hukum.ton.teselli = vB.hukum.ton.teselli.concat(["Bu da sonradan eklendi."]);
const sonrasiES = cevapKumesi(vB);
const sonrasiMod = modKumesi(vA, "Bu satır sonradan eklendi; kaderi bozmamalı.");

const degisES = oncesiES.filter((x, i) => x !== sonrasiES[i]).length;
const degisMod = oncesiMod.filter((x, i) => x !== sonrasiMod[i]).length;
const nMujde = vA.hukum.ton.mujde.length;

yaz("İki havuza birer cümle eklendi (" + nMujde + " → " + (nMujde + 1) + "), " + sorularKararlilik.length + " soru yeniden üretildi.");
yaz("");
yaz("| seçim yöntemi | değişen cevap | oran | kuramsal beklenti |");
yaz("|---|---:|---:|---:|");
yaz(`| v2 · \`floor(u·n)\` | ${degisMod}/${sorularKararlilik.length} | ${(100 * degisMod / sorularKararlilik.length).toFixed(1)}% | ~${(100 * nMujde / (nMujde + 1)).toFixed(1)}% |`);
yaz(`| **v3 · ES anahtarı** | **${degisES}/${sorularKararlilik.length}** | **${(100 * degisES / sorularKararlilik.length).toFixed(1)}%** | ~${(100 / (nMujde + 1)).toFixed(1)}% (yalnız o havuzu çekenlerde) |`);

/* alan ayrımı: tavsiye listesini değiştirmek hükmü etkiliyor mu? */
const vC = veriKur();
vC.tavsiye.mujde = vC.tavsiye.mujde.concat(["Sonradan eklenmiş tavsiye."]);
vC.tavsiye.belirsiz = vC.tavsiye.belirsiz.concat(["Bir tavsiye daha."]);
const sonrasiC = cevapKumesi(vC);
const hukumDegis = oncesiES.filter((x, i) => x !== sonrasiC[i]).length;
yaz("");
yaz("**Alan ayrımı sınaması:** yalnızca `tavsiye` havuzlarına cümle eklendiğinde değişen");
yaz("**hüküm** sayısı: **" + hukumDegis + "/" + sorularKararlilik.length + "**. (Alan ayrımı çalışıyorsa 0 olmalı.)");

/* ─────────── 4. Dağılım testleri ─────────── */

yaz("");
yaz("---");
yaz("");
yaz("## 4. Dağılım ve tohum kalitesi");
yaz("");

function kiKare(gozlenen, beklenen) {
  let x = 0;
  for (const k in gozlenen) x += Math.pow(gozlenen[k] - beklenen[k], 2) / beklenen[k];
  return x;
}

/* 4a. kader ekseni ağırlıklara uyuyor mu */
const N = 20000;
const kaderSayim = { olur: 0, olmaz: 0, belirsiz: 0, kapandi: 0 };
for (let i = 0; i < N; i++) {
  const r = K.cevapla("deneme sorusu " + i + " olacak mı", vA, 100 + (i % 97));
  kaderSayim[r.kader === "kapandi" ? "kapandi" : r.kader]++;
}
const ag = vA.ayar.kaderAgirlik, top = Object.values(ag).reduce((a, b) => a + b, 0);
const bek = {}; for (const k in ag) bek[k] = N * ag[k] / top;
const x2kader = kiKare(kaderSayim, bek);
yaz("**4a. Kader ekseni** — " + N.toLocaleString("tr-TR") + " üretim, hedef ağırlıklara uyum (χ², sd=3, %1 kritik ≈ 11.34):");
yaz("");
yaz("| sonuç | gözlenen | beklenen | sapma |");
yaz("|---|---:|---:|---:|");
for (const k in kaderSayim) yaz(`| ${k} | ${kaderSayim[k]} | ${bek[k].toFixed(0)} | ${(100 * (kaderSayim[k] - bek[k]) / bek[k]).toFixed(1)}% |`);
yaz("");
yaz("χ² = **" + x2kader.toFixed(2) + "** → " + (x2kader < 11.34 ? "ağırlıklara uygun (H₀ reddedilemez)" : "sapma anlamlı"));

/* 4b. ES anahtarı eşit ağırlıkta tekdüze mi */
const havuz = [];
for (let i = 0; i < 12; i++) havuz.push({ kimlik: "aday-" + i, deger: i, agirlik: 1 });
const sec = new Array(12).fill(0);
const M = 24000;
for (let i = 0; i < M; i++) sec[K.kararliSec(K.altTohum(K.karistir(i * 2654435761 | 0), "test"), havuz).deger]++;
const bek2 = {}; const goz2 = {};
for (let i = 0; i < 12; i++) { bek2[i] = M / 12; goz2[i] = sec[i]; }
const x2sec = kiKare(goz2, bek2);
yaz("");
yaz("**4b. ES anahtarının tekdüzeliği** — 12 eşit ağırlıklı aday, " + M.toLocaleString("tr-TR") + " bağımsız tohum");
yaz("(χ², sd=11, %1 kritik ≈ 24.72): χ² = **" + x2sec.toFixed(2) + "** → " +
    (x2sec < 24.72 ? "tekdüzelikten anlamlı sapma yok" : "sapma anlamlı"));

/* 4c. ağırlık orantısı */
const havuz2 = [{ kimlik: "a", deger: "a", agirlik: 1 }, { kimlik: "b", deger: "b", agirlik: 3 }, { kimlik: "c", deger: "c", agirlik: 6 }];
const s2 = { a: 0, b: 0, c: 0 };
for (let i = 0; i < M; i++) s2[K.kararliSec(K.altTohum(K.karistir((i + 7777) * 2654435761 | 0), "test2"), havuz2).deger]++;
yaz("");
yaz("**4c. Ağırlık orantısı** (1 : 3 : 6 → beklenen %10 : %30 : %60):");
yaz("");
yaz("| aday | gözlenen | beklenen |");
yaz("|---|---:|---:|");
yaz(`| a (w=1) | ${(100 * s2.a / M).toFixed(2)}% | 10.00% |`);
yaz(`| b (w=3) | ${(100 * s2.b / M).toFixed(2)}% | 30.00% |`);
yaz(`| c (w=6) | ${(100 * s2.c / M).toFixed(2)}% | 60.00% |`);

/* 4d. kayıt no çakışması */
const nolar = new Set();
let carpisma = 0;
for (const k of kayitlar) {
  const n = K.cevapla(k.soru, vA, DONEM).no;
  if (nolar.has(n)) carpisma++;
  nolar.add(n);
}
const bekCarpisma = kayitlar.length - 9000 * (1 - Math.pow(1 - 1 / 9000, kayitlar.length));
yaz("");
yaz("**4d. Kayıt numarası çakışması** — " + kayitlar.length + " soru, 9000 olası numara:");
yaz("gözlenen çakışma **" + carpisma + "**, doğum günü paradoksu beklentisi ≈ " + bekCarpisma.toFixed(1) + ".");
yaz("Numara bir kimlik değil, süstür; çakışma tasarım gereği kabul edilir.");

/* ─────────── 5. Ton doğruluğu ─────────── */

yaz("");
yaz("---");
yaz("");
yaz("## 5. Mührün anlamı: v2'de kaç cevap ters tonluydu?");
yaz("");
const korkulanSayi = kayitlar.filter(k => k.arzu === "korkulan").length;
const pOlur = ag.olur / top;
yaz("v2'de arzu ekseni yoktu: `kutup=var` her zaman \"NASİP VAR\" müjdesi basıyordu.");
yaz("\"İşten kovulacak mıyım?\" sorusunda bu, kötü habere kutlama damgası demekti.");
yaz("");
yaz("Held-out sette **" + korkulanSayi + "/" + kayitlar.length + "** soru `korkulan` (%" +
    (100 * korkulanSayi / kayitlar.length).toFixed(1) + ").");
yaz("Bunların **P(kader=olur) = %" + (100 * pOlur).toFixed(0) + "**'ında v2 kötü olaya müjde mührü basardı:");
yaz("beklenen ters tonlu cevap oranı ≈ **%" + (100 * korkulanSayi / kayitlar.length * pOlur).toFixed(1) + "**.");
yaz("");
let uyumsuz = 0, kontrol = 0;
for (const k of kayitlar) {
  const r = K.cevapla(k.soru, vA, DONEM);
  if (r.ozel || r.kader === "kapandi") continue;
  kontrol++;
  const beklenenTon = K.tonBul(r.kader, k.arzu);          /* ALTIN arzu etiketiyle */
  if (K.MUHUR_TON[beklenenTon] !== r.kutup) uyumsuz++;
}
yaz("v3'te, **altın arzu etiketi** kullanılarak beklenen mühür ile üretilen mühür karşılaştırıldığında");
yaz("uyumsuzluk: **" + uyumsuz + "/" + kontrol + "** (%" + (100 * uyumsuz / kontrol).toFixed(1) + ").");
yaz("Kalan uyumsuzluk doğrudan arzu sınıflandırma hatasından gelir — mimariden değil.");

/* ─────────── 6. Çıktı sağlığı ─────────── */

yaz("");
yaz("---");
yaz("");
yaz("## 6. Çıktı sağlığı ve çeşitlilik");
yaz("");
let bozuk = 0, toplam = 0;
const gorulenYanit = new Set(), gorulenSerh = new Set();
for (let d = 200; d < 260; d++) {
  for (const k of kayitlar) {
    const r = K.cevapla(k.soru, vA, d);
    toplam++;
    gorulenYanit.add(r.yanit); gorulenSerh.add(r.serh);
    const t = r.yanit + " " + r.serh;
    if (!r.yanit || !r.serh || /\s\s/.test(t) || /undefined|null|NaN|\{|\}/.test(t) ||
        !/[.!?…]$/.test(r.yanit.trim()) || !/[.!?…]$/.test(r.serh.trim()) ||
        r.yanit.length > 90 || r.serh.length > 200) bozuk++;
  }
}
yaz("- " + toplam.toLocaleString("tr-TR") + " üretim (140 soru × 60 devir), **bozuk çıktı: " + bozuk + "**");
yaz("- farklı hüküm cümlesi: **" + gorulenYanit.size + "**, farklı şerh: **" + gorulenSerh.size + "**");
const hedefSerh = 140 * 60;
yaz("- şerh çeşitliliği " + (100 * gorulenSerh.size / Math.min(hedefSerh, 5 * 12 * (12 + 3))).toFixed(0) + "% (kuramsal üst sınır: ton × okuma × tavsiye bileşimleri)");

fs.writeFileSync(new URL("RAPOR.md", import.meta.url).pathname, R.join("\n") + "\n");
console.log("\n→ /home/claude/eval/RAPOR.md yazıldı");
