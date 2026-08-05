import { chromium } from "playwright-core";
import http from "http";
import fs from "fs";
import path from "path";

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const TUR = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2" };

const sunucu = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split("?")[0]);
  if (u === "/") u = "/index.html";
  const f = path.join(KOK, u);
  if (!f.startsWith(KOK) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
    res.writeHead(404, TUR[".html"]); return res.end(fs.readFileSync(path.join(KOK, "404.html")));
  }
  res.writeHead(200, { "Content-Type": TUR[path.extname(f)] || "application/octet-stream" });
  res.end(fs.readFileSync(f));
});
await new Promise(r => sunucu.listen(8099, r));
const URL_ = "http://127.0.0.1:8099/";

let gecti = 0, kaldi = 0; const hatalar = [];
function ok(ad, kosul, detay) {
  if (kosul) { gecti++; console.log("  ✓ " + ad); }
  else { kaldi++; hatalar.push(ad + (detay ? " → " + detay : "")); console.log("  ✗ " + ad + (detay ? " → " + detay : "")); }
}

const tarayici = await chromium.launch({executablePath:"/opt/pw-browsers/chromium"});

async function yeniSayfa(opts = {}) {
  const ctx = await tarayici.newContext(opts);
  const sayfa = await ctx.newPage();
  const konsol = [];
  sayfa.on("console", m => { if (m.type() === "error" || m.type() === "warning") konsol.push(m.type() + ": " + m.text()); });
  sayfa.on("pageerror", e => konsol.push("pageerror: " + e.message));
  sayfa.on("requestfailed", r => konsol.push("requestfailed: " + r.url()));
  return { ctx, sayfa, konsol };
}

let _sayac = 0;
/* Yalnızca hash değişirse tarayıcı sayfayı yeniden yüklemez ve script tekrar
   çalışmaz — testler bayat kartı ölçer. Benzersiz sorgu ile tam gezinme zorlanır. */
async function git(sayfa, hash) {
  return sayfa.goto(URL_ + "?t=" + (++_sayac) + hash, { waitUntil: "networkidle" });
}

async function kartAl(sayfa) {
  await sayfa.waitForSelector(".kayit", { timeout: 8000 });
  /* Kayıt numarası sayaç animasyonuyla yerine oturuyor; kararlı hâlini bekle,
     yoksa test animasyonun ortasındaki geçici rakamı okur. */
  let onceki = null;
  for (let i = 0; i < 40; i++) {
    const simdi = await sayfa.evaluate(() => document.querySelector(".kayit-no")?.textContent || "");
    if (simdi && simdi === onceki) break;
    onceki = simdi;
    await sayfa.waitForTimeout(80);
  }
  return await sayfa.evaluate(() => {
    const k = document.querySelector(".kayit");
    return {
      yanit: k.querySelector(".yanit")?.textContent || "",
      serh: k.querySelector(".serh")?.textContent || "",
      muhur: k.querySelector(".muhur")?.textContent || "",
      no: k.querySelector(".kayit-no")?.textContent || "",
      not: k.querySelector(".not")?.textContent || "",
      hash: location.hash
    };
  });
}

/* ——— 1. Temel akış ——— */
console.log("\n[1] Temel akış");
{
  const { ctx, sayfa, konsol } = await yeniSayfa();
  await sayfa.goto(URL_, { waitUntil: "networkidle" });
  ok("intro göründü", await sayfa.isVisible("#giris"));
  await sayfa.waitForTimeout(3200);
  ok("intro kapandı", !(await sayfa.isVisible("#giris")));
  ok("buton etkin", await sayfa.isEnabled("#sor"));

  await sayfa.fill("#soru", "Zam alacak mıyım?");
  await sayfa.click("#sor");
  const k = await kartAl(sayfa);
  ok("hüküm var", k.yanit.length > 5, k.yanit);
  ok("şerh var", k.serh.length > 15, k.serh);
  ok("mühür var", /NASİP|BEKLEMEDE|DOSYA/.test(k.muhur), k.muhur);
  ok("kayıt no", /Kayıt №\d{4}/.test(k.no), k.no);
  ok("devir notu", /geçerli|devir/.test(k.not), k.not);
  ok("soru adres çubuğuna yazılmadı", !/#q=/.test(k.hash), "hash=" + JSON.stringify(k.hash));
  const paylasimLinki = await sayfa.evaluate(() => tamBaglanti("Zam alacak mıyım?"));
  ok("paylaşım linki q+d taşıyor", /#q=.+&d=-?\d+/.test(paylasimLinki), paylasimLinki);
  await sayfa.click(".paylas button");
  await sayfa.waitForTimeout(200);
  ok("kopyala butonu geri bildirdi", (await sayfa.textContent(".paylas button")).includes("Kopyalandı"));
  ok("günün nasibi dolu", (await sayfa.textContent("#gun-nasip")).length > 10);
  ok("konsol temiz", konsol.length === 0, konsol.join(" | "));

  /* aynı soru tekrar → aynı cevap */
  await sayfa.fill("#soru", "zam ALACAK mıyım");
  await sayfa.click("#sor");
  await sayfa.waitForTimeout(2200);
  const k2 = await kartAl(sayfa);
  ok("oturum içi sabit", k2.yanit === k.yanit && k2.no === k.no, `${k2.no} vs ${k.no}`);

  global.__ref = k;
  global.__hash = paylasimLinki.slice(paylasimLinki.indexOf("#"));
  await ctx.close();
}

/* ——— 2. Paylaşım linki aynı cevabı verir ——— */
console.log("\n[2] Paylaşım linki");
{
  const { ctx, sayfa, konsol } = await yeniSayfa();
  await sayfa.goto(URL_ + "?t=paylasim" + global.__hash, { waitUntil: "networkidle" });
  const k = await kartAl(sayfa);
  ok("link aynı hükmü verdi", k.yanit === global.__ref.yanit, `${k.yanit} vs ${global.__ref.yanit}`);
  ok("link aynı kaydı verdi", k.no === global.__ref.no, `${k.no} vs ${global.__ref.no}`);
  ok("intro atlandı", !(await sayfa.isVisible("#giris")));
  ok("konsol temiz", konsol.length === 0, konsol.join(" | "));
  await ctx.close();
}

/* ——— 3. Dönem parametresi kötüye kullanıma kapalı mı ——— */
console.log("\n[3] Dönem parametresi güvenliği");
{
  const { ctx, sayfa } = await yeniSayfa();
  const q = encodeURIComponent("Zam alacak mıyım?");
  /* Uzak geçmişten seçilmiş dönem: cevap seçmeye izin verilmemeli */
  await git(sayfa, "#q=" + q + "&d=1");
  let k = await kartAl(sayfa);
  ok("uzak dönem yok sayıldı", k.no === global.__ref.no, `${k.no} vs güncel ${global.__ref.no}`);

  /* Bir önceki devir kabul edilmeli (geçen hafta paylaşılan link çalışsın) */
  const simdiki = await sayfa.evaluate(() => Kader.donemHesapla(VERI.ayar, Date.now()));
  await git(sayfa, "#q=" + q + "&d=" + (simdiki - 1));
  k = await kartAl(sayfa);
  ok("bir önceki devir kabul edildi", k.no !== global.__ref.no, `${k.no} vs güncel ${global.__ref.no}`);

  /* Saçma değerler çökertmemeli */
  for (const kotu of ["999999999999999999999", "-2147483648", "abc", "1e27"]) {
    await git(sayfa, "#q=" + q + "&d=" + kotu);
    k = await kartAl(sayfa);
    ok("d=" + kotu + " güvenli", k.yanit.length > 5 && /geçerli|devir/.test(k.not), k.yanit + " | " + k.not);
  }
  await ctx.close();
}

/* ——— 3b. Kötü niyetli fragment ——— */
console.log("\n[3b] Fragment saldırı yüzeyi");
{
  const { ctx, sayfa, konsol } = await yeniSayfa({ reducedMotion: "reduce" });
  const uzun = Array.from({length: 30000}, (_, i) => "kelime" + i).join(" ");
  const t0 = Date.now();
  await sayfa.goto(URL_ + "?t=uzun#q=" + encodeURIComponent(uzun), { waitUntil: "domcontentloaded" });
  await kartAl(sayfa);
  const sure = Date.now() - t0;
  ok("devasa soru sekmeyi dondurmadı", sure < 4000, sure + " ms");
  const eko = await sayfa.evaluate(() => document.querySelector(".soru-eko").textContent.length);
  ok("soru 140 karaktere kırpıldı", eko <= 145, eko + " karakter");

  await git(sayfa, "#q=" + encodeURIComponent("<img src=x onerror=alert(1)>"));
  await kartAl(sayfa);
  const imgSayisi = await sayfa.evaluate(() => document.querySelectorAll(".kayit img, .kayit script").length);
  ok("HTML yükü metin olarak kaldı", imgSayisi === 0, imgSayisi + " enjekte eleman");

  await git(sayfa, "#q=constructor");
  const kc = await kartAl(sayfa);
  ok("'constructor' kartı bozmuyor", !/undefined/.test(kc.yanit + kc.no + kc.muhur), JSON.stringify(kc));

  await git(sayfa, "#q=%25&d=7");
  await sayfa.waitForTimeout(500);
  ok("bozuk q sayfayı çökertmiyor", await sayfa.isVisible("#soru"));
  ok("konsol temiz", konsol.filter(x => !/Content Security Policy/i.test(x)).length === 0, konsol.join(" | "));
  await ctx.close();
}

/* ——— 4. Reduced motion ——— */
console.log("\n[4] prefers-reduced-motion");
{
  const { ctx, sayfa, konsol } = await yeniSayfa({ reducedMotion: "reduce" });
  await sayfa.goto(URL_, { waitUntil: "networkidle" });
  ok("intro hiç açılmadı", !(await sayfa.isVisible("#giris")));
  await sayfa.fill("#soru", "Sınavı geçecek miyim?");
  await sayfa.click("#sor");
  const k = await kartAl(sayfa);
  ok("cevap geldi", k.yanit.length > 5, k.yanit);
  ok("konsol temiz", konsol.length === 0, konsol.join(" | "));
  await ctx.close();
}

/* ——— 5. Boş soru ——— */
console.log("\n[5] Boş soru");
{
  const { ctx, sayfa } = await yeniSayfa({ reducedMotion: "reduce" });
  await sayfa.goto(URL_, { waitUntil: "networkidle" });
  await sayfa.click("#sor");
  await sayfa.waitForTimeout(300);
  ok("uyarı gösterildi", (await sayfa.textContent("#hata")).includes("Sormadan"));
  ok("kart oluşmadı", (await sayfa.locator(".kayit").count()) === 0);
  await ctx.close();
}

/* ——— 6. Mobil 390px taşma ——— */
console.log("\n[6] Mobil 390px");
{
  const { ctx, sayfa } = await yeniSayfa({ viewport: { width: 390, height: 780 }, reducedMotion: "reduce" });
  await sayfa.goto(URL_, { waitUntil: "networkidle" });
  await sayfa.fill("#soru", "Yurtdışına taşınıp orada evlenebilecek miyim acaba diye çok düşünüyorum");
  await sayfa.click("#sor");
  await kartAl(sayfa);
  const tasma = await sayfa.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok("yatay taşma yok", tasma <= 0, "taşma " + tasma + "px");
  const btn = await sayfa.evaluate(() => document.querySelector(".paylas button").getBoundingClientRect().height);
  ok("dokunma hedefi ≥44px", btn >= 44, btn + "px");
  await sayfa.screenshot({ path: KOK + "/../shots/v2-mobil.png", fullPage: true });
  await ctx.close();
}

/* ——— 7. kader.json erişilemezse yedek ——— */
console.log("\n[7] kader.json engellendiğinde");
{
  const { ctx, sayfa } = await yeniSayfa({ reducedMotion: "reduce" });
  await sayfa.route("**/kader.json", r => r.abort());
  await sayfa.goto(URL_, { waitUntil: "networkidle" });
  await sayfa.fill("#soru", "Bu iş olacak mı?");
  await sayfa.click("#sor");
  const k = await kartAl(sayfa);
  ok("yedek veriyle cevap verdi", k.yanit.length > 5, k.yanit);
  ok("günün nasibi yine dolu", (await sayfa.textContent("#gun-nasip")).length > 10);
  await ctx.close();
}

/* ——— 8. Veri yüklenmeden soru sorulursa ——— */
console.log("\n[8] Yükleme yarışı");
{
  const { ctx, sayfa } = await yeniSayfa({ reducedMotion: "reduce" });
  await sayfa.route("**/kader.json", async r => { await new Promise(x => setTimeout(x, 1200)); r.continue(); });
  await sayfa.goto(URL_, { waitUntil: "domcontentloaded" });
  await sayfa.fill("#soru", "Terfi alacak mıyım?");
  await sayfa.evaluate(() => document.getElementById("form").dispatchEvent(new Event("submit", {cancelable:true})));
  const k = await kartAl(sayfa);
  ok("geç gelen veriyle cevap verdi", k.yanit.length > 5, k.yanit);
  await ctx.close();
}

/* ——— 9. Masaüstü görsel ——— */
{
  const { ctx, sayfa } = await yeniSayfa({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
  await sayfa.goto(URL_, { waitUntil: "networkidle" });
  await sayfa.fill("#soru", "Ne zaman kavuşacağım?");
  await sayfa.click("#sor");
  await kartAl(sayfa);
  await sayfa.screenshot({ path: KOK + "/../shots/v2-masaustu.png", fullPage: true });
  await ctx.close();
}

/* ——— 10. 404 ——— */
console.log("\n[10] 404");
{
  const { ctx, sayfa } = await yeniSayfa();
  const r = await sayfa.goto(URL_ + "olmayan-sayfa", { waitUntil: "domcontentloaded" });
  ok("404 sayfası döndü", (await sayfa.content()).includes("nasip"), "durum " + r.status());
  await ctx.close();
}

await tarayici.close();
sunucu.close();
console.log(`\n${gecti} geçti, ${kaldi} kaldı`);
if (hatalar.length) { console.log("\nKALANLAR:"); hatalar.forEach(h => console.log("  ✗ " + h)); }
process.exit(kaldi ? 1 : 0);
