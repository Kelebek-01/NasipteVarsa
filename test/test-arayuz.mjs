import { chromium } from "playwright-core";
import http from "http"; import fs from "fs"; import path from "path";

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const TUR = { ".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8",
  ".json":"application/json; charset=utf-8", ".css":"text/css; charset=utf-8",
  ".svg":"image/svg+xml", ".png":"image/png", ".woff2":"font/woff2" };
const sunucu = http.createServer((req,res)=>{
  let u = decodeURIComponent(req.url.split("?")[0]); if (u==="/") u="/index.html";
  const f = path.join(KOK,u);
  if (!f.startsWith(KOK)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){
    res.writeHead(404,TUR[".html"]); return res.end(fs.readFileSync(path.join(KOK,"404.html"))); }
  res.writeHead(200,{ "Content-Type": TUR[path.extname(f)]||"application/octet-stream" });
  res.end(fs.readFileSync(f));
});
await new Promise(r=>sunucu.listen(8098,r));
const U = "http://127.0.0.1:8098/";
let gecti=0, kaldi=0; const hatalar=[];
const ok=(a,k,d)=>{ if(k){gecti++;console.log("  ✓ "+a);} else {kaldi++;hatalar.push(a+(d?" → "+d:""));console.log("  ✗ "+a+(d?" → "+d:""));} };

const tarayici = await chromium.launch({executablePath:"/opt/pw-browsers/chromium"});
let sayac=0;
async function sayfaAc(opts={}){
  const ctx = await tarayici.newContext(opts);
  const p = await ctx.newPage();
  const konsol=[];
  p.on("console", m=>{ if(m.type()==="error"||m.type()==="warning") konsol.push(m.type()+": "+m.text()); });
  p.on("pageerror", e=>konsol.push("pageerror: "+e.message));
  p.on("requestfailed", r=>konsol.push("requestfailed: "+r.url()));
  return {ctx,p,konsol};
}
const git = (p,hash="") => p.goto(U+"?t="+(++sayac)+hash,{waitUntil:"networkidle"});

/* 1. Ciltler */
console.log("\n[1] Cilt sistemi");
{
  const {ctx,p,konsol} = await sayfaAc({reducedMotion:"reduce"});
  const bulunan = [];
  for (const c of ["gece","kahve","ferman","neon","kagit"]){
    await git(p,"#cilt="+c);
    const d = await p.evaluate(()=>({
      cilt: document.body.getAttribute("data-cilt"),
      etiket: document.getElementById("cilt-etiket").textContent,
      bg: getComputedStyle(document.body).backgroundColor,
      tema: document.querySelector('meta[name="theme-color"]').content
    }));
    bulunan.push(d.bg);
    ok("cilt "+c+" uygulandı", d.cilt===c && d.etiket.length>10, JSON.stringify(d));
  }
  ok("5 cilt de farklı zemin rengi", new Set(bulunan).size===5, bulunan.join(" | "));
  await git(p);
  const oto = await p.evaluate(()=>document.body.getAttribute("data-cilt"));
  ok("cilt devirden otomatik seçildi", !!oto, oto);
  ok("konsol temiz", konsol.length===0, konsol.join(" | "));
  await ctx.close();
}

/* 1b. Ciltler YAPIYI da değiştiriyor mu?
   Regresyon koruması: bir zamanlar beş cilt aynı sayfanın beş boyasıydı —
   ölçüldüğünde 49 görünür öğenin 49'unda renk farkı, 0'ında yapı farkı vardı.
   Cilt sistemi biçim token'ı da ezmeli; bu test onun geri kaymasını engeller. */
console.log("\n[1b] Ciltler biçimi de değiştiriyor");
{
  const parmakIzi = async (p, c) => {
    await git(p, "#cilt="+c);
    await p.fill("#soru","Bu yıl işimi değiştirmeli miyim?");
    await p.click("#sor");
    await p.waitForSelector("#cevap .kayit",{timeout:9000});
    await p.waitForTimeout(250);
    return p.evaluate(()=>[...document.body.querySelectorAll("*")]
      .filter(e=>{const r=e.getBoundingClientRect(); return r.width>0&&r.height>0;})
      .map(e=>{ const r=e.getBoundingClientRect(), g=getComputedStyle(e);
        return { yapi:[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height),
                       g.fontFamily.split(",")[0].replace(/["']/g,""),g.fontSize,g.fontWeight,
                       g.letterSpacing,g.borderRadius,g.borderWidth,g.textTransform].join("|"),
                 renk:[g.color,g.backgroundColor,g.borderColor].join("|") }; }));
  };
  const {ctx,p} = await sayfaAc({viewport:{width:1100,height:900}, reducedMotion:"reduce"});
  const temel = await parmakIzi(p, "gece");
  for (const c of ["kahve","ferman","neon","kagit"]){
    const su = await parmakIzi(p, c);
    const n = Math.min(temel.length, su.length);
    let yapi=0, renk=0;
    for (let i=0;i<n;i++){
      if (temel[i].yapi!==su[i].yapi) yapi++;
      if (temel[i].renk!==su[i].renk) renk++;
    }
    ok(c+" cildi RENK değiştiriyor", renk>n*0.5, renk+"/"+n);
    ok(c+" cildi BİÇİM de değiştiriyor", yapi>n*0.05, yapi+"/"+n+" öğede yapı farkı");
  }
  await ctx.close();
}

/* 1c. Cilt seçici — ciltler artık gezilebiliyor */
console.log("\n[1c] Cilt seçici");
{
  const {ctx,p,konsol} = await sayfaAc({reducedMotion:"reduce"});
  await git(p);
  ok("seçici varsayılan kapalı", await p.evaluate(()=>document.getElementById("cilt-secici").hidden));
  ok("etiket düğme ve katlanabilir",
     await p.evaluate(()=>{ const e=document.getElementById("cilt-etiket");
       return e.tagName==="BUTTON" && e.getAttribute("aria-expanded")==="false"; }));
  const devrin = await p.textContent("#cilt-etiket");
  ok("başta devrin cildi yazıyor", /Bu devrin cildi ·/.test(devrin), devrin.trim());

  await p.click("#cilt-etiket"); await p.waitForTimeout(200);
  ok("açıldı", !(await p.evaluate(()=>document.getElementById("cilt-secici").hidden)) &&
               (await p.getAttribute("#cilt-etiket","aria-expanded"))==="true");
  ok("5 cilt düğmesi", (await p.locator("#cilt-secici button[data-cilt]").count())===5);
  ok("devre-dön başta gizli", !(await p.isVisible("#cilt-secici button.devre")));

  await p.click('#cilt-secici button[data-cilt="ferman"]'); await p.waitForTimeout(300);
  const secili = await p.evaluate(()=>({
    cilt: document.body.getAttribute("data-cilt"),
    etiket: document.getElementById("cilt-etiket").textContent,
    basili: document.querySelector('#cilt-secici button[data-cilt="ferman"]').getAttribute("aria-pressed"),
    tema: document.querySelector('meta[name="theme-color"]').content,
    hash: location.hash }));
  ok("ferman uygulandı", secili.cilt==="ferman", JSON.stringify(secili));
  ok("önizleme etiketi", /^Cilt ·/.test(secili.etiket.trim()), secili.etiket.trim());
  ok("seçili düğme işaretli", secili.basili==="true");
  ok("theme-color güncellendi", secili.tema.toLowerCase()==="#e4d6b3", secili.tema);
  ok("URL paylaşılabilir", secili.hash==="#cilt=ferman", secili.hash);
  ok("devre-dön göründü", await p.isVisible("#cilt-secici button.devre"));
  /* Geçmiş kirletilmemeli: replaceState kullanılıyor, tek adım geri repoya değil testin
     kendi başlangıcına dönmeli. Burada yalnızca giriş sayısını denetliyoruz. */
  ok("geçmişe yeni giriş eklenmedi", (await p.evaluate(()=>history.length))<=3, await p.evaluate(()=>history.length));

  await p.click("#cilt-secici button.devre"); await p.waitForTimeout(300);
  const geri = await p.evaluate(()=>({ cilt:document.body.getAttribute("data-cilt"),
    etiket:document.getElementById("cilt-etiket").textContent, hash:location.hash }));
  ok("devre dönüldü", /Bu devrin cildi ·/.test(geri.etiket) && geri.hash==="", JSON.stringify(geri));
  ok("devre-dön yeniden gizlendi", !(await p.isVisible("#cilt-secici button.devre")));

  /* #cilt= linkiyle gelince seçici o cildi işaretli göstermeli */
  await git(p,"#cilt=neon");
  await p.click("#cilt-etiket"); await p.waitForTimeout(200);
  ok("link ile gelen cilt işaretli",
     (await p.evaluate(()=>document.body.getAttribute("data-cilt")))==="neon" &&
     (await p.getAttribute('#cilt-secici button[data-cilt="neon"]',"aria-pressed"))==="true");
  ok("hiçbir şey saklanmadı", await p.evaluate(()=>{ try{return localStorage.length===0;}catch(e){return true;} }));
  ok("konsol temiz", konsol.length===0, konsol.join(" | "));
  await ctx.close();
}

/* 1d. "Sallayınca sor" yalnızca dokunmatik cihazda
   Masaüstü Chrome'da da `DeviceMotionEvent` tanımlıdır; tek başına varlık
   denetimi düğmeyi masaüstünde de gösteriyordu.
   SINIR: "dokunmatik ekranlı ama fareyle kullanılan dizüstü" durumu burada
   sınanamıyor — Playwright'ın hasTouch emülasyonu pointer'ı zorla `coarse`
   yapıyor. O senaryodaki davranış ölçülmedi, yalnızca CSS sorgusunun anlamına
   dayanıyor. */
console.log("\n[1d] Sallayınca sor yalnızca dokunmatikte");
{
  const {ctx,p} = await sayfaAc({viewport:{width:1200,height:900}, reducedMotion:"reduce"});
  await git(p);
  /* `el.hidden` OKUMAK YETMEZ. Tarayıcının `[hidden]{display:none}` kuralı en
     düşük öncelikliktir; bileşene `display:inline-flex` yazmak onu sessizce ezer
     ve öğe `hidden` iken bile çizilir. Bu hata tam böyle kaçtı: özellik true'ydu,
     düğme ekrandaydı. Artık GERÇEK GÖRÜNÜRLÜK ölçülüyor. */
  const masa = await p.evaluate(()=>{ const e=document.getElementById("salla");
    return { ozellik:e.hidden, cizilmis:!!e.offsetParent, goster:getComputedStyle(e).display }; });
  ok("masaüstünde hidden özelliği true", masa.ozellik, JSON.stringify(masa));
  ok("masaüstünde GERÇEKTEN çizilmiyor", !masa.cizilmis && masa.goster==="none", JSON.stringify(masa));
  ok("Playwright de görmüyor", !(await p.isVisible("#salla")));
  ok("masaüstünde DeviceMotionEvent yine de tanımlı (denetim buna dayanmamalı)",
     await p.evaluate(()=>"DeviceMotionEvent" in window));
  /* Aynı tuzak başka gizli öğelerde de olmasın */
  const gizliler = await p.evaluate(()=>[...document.querySelectorAll("[hidden]")]
    .filter(e=>e.id!=="giris")
    .filter(e=>getComputedStyle(e).display!=="none")
    .map(e=>e.tagName+"#"+(e.id||"")+"."+(e.className||"")));
  ok("hiçbir [hidden] öğe çizilmiyor", gizliler.length===0, gizliler.join(", "));
  await ctx.close();
  const m = await sayfaAc({viewport:{width:390,height:844}, isMobile:true, hasTouch:true, reducedMotion:"reduce"});
  await git(m.p);
  ok("dokunmatikte görünür", await m.p.isVisible("#salla"));
  ok("dokunmatikte başlangıçta kapalı",
     (await m.p.getAttribute("#salla","aria-pressed"))==="false" &&
     (await m.p.textContent("#salla-durum"))==="kapalı");
  await m.ctx.close();
}

/* 2. Sekmeler */
console.log("\n[2] Defter sekmeleri");
{
  const {ctx,p,konsol} = await sayfaAc({reducedMotion:"reduce"});
  await git(p);
  ok("varsayılan Kader sayfası", await p.isVisible("#s-kader") && !(await p.isVisible("#s-ikili")));
  await p.click("#t-ikili");
  await p.waitForTimeout(300);
  ok("İkili sayfası açıldı", await p.isVisible("#s-ikili") && !(await p.isVisible("#s-kader")));
  ok("aria-selected doğru", await p.getAttribute("#t-ikili","aria-selected")==="true");
  await p.click("#t-burc"); await p.waitForTimeout(300);
  ok("Burç sayfası açıldı", await p.isVisible("#s-burc"));
  ok("12 burç düğmesi", (await p.locator("#burc-izgara button").count())===12);
  ok("mevsim burcu işaretli", (await p.locator("#burc-izgara button.mevsim").count())===1);
  await p.click("#t-kura"); await p.waitForTimeout(300);
  ok("Kura sayfası açıldı", await p.isVisible("#s-kura") && !(await p.isVisible("#s-burc")));
  await p.click("#t-ebced"); await p.waitForTimeout(300);
  ok("İsim Falı sayfası açıldı", await p.isVisible("#s-ebced"));
  ok("5 sekme görünür", (await p.locator('[role="tab"]:not([hidden])').count())===5);
  ok("aynı anda tek panel açık",
     (await p.locator('[role="tabpanel"]:not([hidden])').count())===1);
  ok("konsol temiz", konsol.length===0, konsol.join(" | "));
  await ctx.close();
}

/* 2b. Kura */
console.log("\n[2b] Kura");
{
  const {ctx,p,konsol} = await sayfaAc({reducedMotion:"reduce"});
  await git(p);
  await p.click("#t-kura"); await p.waitForTimeout(200);
  await p.fill("#sik1","Kahve"); await p.fill("#sik2","Çay");
  await p.click('#kura-form button[type="submit"]');
  await p.waitForSelector("#kura-cevap .kayit",{timeout:5000});
  const a = await p.evaluate(()=>({
    y:document.querySelector("#kura-cevap .yanit").textContent,
    k:document.querySelector("#kura-cevap .kazanan").textContent,
    n:document.querySelectorAll("#kura-cevap .kura-liste li").length }));
  ok("kura sonucu geldi", a.y.length>5, a.y);
  ok("iki şık listelendi", a.n===2, a.n+" şık");
  ok("kazanan işaretli", /Kahve|Çay/.test(a.k), a.k);
  /* sıra bağımsızlığı */
  await p.fill("#sik1","Çay"); await p.fill("#sik2","Kahve");
  await p.click('#kura-form button[type="submit"]'); await p.waitForTimeout(300);
  const b = await p.textContent("#kura-cevap .kazanan");
  ok("kura sıradan bağımsız", a.k.replace("✓","").trim()===b.replace("✓","").trim(), a.k+" vs "+b);
  /* tek şıkla kura olmaz */
  await p.fill("#sik2","");
  await p.click('#kura-form button[type="submit"]'); await p.waitForTimeout(200);
  ok("tek şıkta uyarı", (await p.textContent("#kura-hata")).includes("iki şık"));
  /* aynı şık iki kez yazılırsa da kura olmaz */
  await p.fill("#sik1","Kahve"); await p.fill("#sik2"," kahve ");
  await p.click('#kura-form button[type="submit"]'); await p.waitForTimeout(200);
  ok("aynı şık iki kez sayılmıyor", (await p.textContent("#kura-hata")).includes("iki şık"));
  /* şık ekle düğmesi */
  await p.click("#sik-ekle");
  ok("üçüncü şık açıldı", await p.isVisible("#sik3"));
  ok("konsol temiz", konsol.length===0, konsol.join(" | "));
  await ctx.close();
}

/* 2c. Ebced / isim falı */
console.log("\n[2c] İsim falı (ebced)");
{
  const {ctx,p,konsol} = await sayfaAc({reducedMotion:"reduce"});
  await git(p);
  await p.click("#t-ebced"); await p.waitForTimeout(200);
  await p.fill("#ebced-ad","Mert");
  await p.click('#ebced-form button'); await p.waitForSelector("#ebced-cevap .kayit",{timeout:5000});
  const a = await p.evaluate(()=>({
    s:document.querySelector("#ebced-cevap .ebced-sayi b").textContent,
    t:document.querySelector("#ebced-cevap .ebced-sayi").textContent,
    h:document.querySelector("#ebced-cevap .ebced-hane").textContent,
    y:document.querySelector("#ebced-cevap .yanit").textContent }));
  ok("ebced sayısı geldi", /^\d+$/.test(a.s) && +a.s>0, a.s);
  ok("sayı ile etiket bitişik değil", / /.test(a.t.replace(a.s,"")[0]||" ") || a.t.includes(" ebced"), JSON.stringify(a.t));
  ok("hane 1..9 arası", /^[1-9]\. hane$/.test(a.h), a.h);
  ok("okuma geldi", a.y.length>25, a.y.slice(0,50));
  /* aynı isim aynı sonuç */
  await p.click('#ebced-form button'); await p.waitForTimeout(300);
  const b = await p.textContent("#ebced-cevap .ebced-sayi b");
  ok("aynı isim aynı sayı", a.s===b, a.s+" vs "+b);
  /* Türkçe harf ayırt ediliyor: ş ≠ s */
  await p.fill("#ebced-ad","Ayşe"); await p.click('#ebced-form button'); await p.waitForTimeout(300);
  const c1 = await p.textContent("#ebced-cevap .ebced-sayi b");
  await p.fill("#ebced-ad","Ayse"); await p.click('#ebced-form button'); await p.waitForTimeout(300);
  const c2 = await p.textContent("#ebced-cevap .ebced-sayi b");
  ok("ş ile s farklı değer veriyor", c1!==c2, c1+" vs "+c2);
  /* okunacak harf yoksa uyarı */
  await p.fill("#ebced-ad","123"); await p.click('#ebced-form button'); await p.waitForTimeout(200);
  ok("harfsiz girdide uyarı", (await p.textContent("#ebced-hata")).length>5);
  ok("konsol temiz", konsol.length===0, konsol.join(" | "));
  await ctx.close();
}

/* 3. Burç okuması */
console.log("\n[3] Burç okuması");
{
  const {ctx,p} = await sayfaAc({reducedMotion:"reduce"});
  await git(p);
  await p.click("#t-burc"); await p.waitForTimeout(200);
  await p.click('#burc-izgara button[data-burc="koc"]');
  await p.waitForSelector("#burc-cevap .kayit",{timeout:5000});
  const a = await p.evaluate(()=>({m:document.querySelector("#burc-cevap .yanit").textContent,
                                   e:document.querySelector("#burc-cevap .soru-eko").textContent,
                                   n:document.querySelector("#burc-cevap .kayit-no").textContent}));
  ok("koç okuması geldi", a.m.length>40 && /Koç/.test(a.e), JSON.stringify(a).slice(0,120));
  await p.click('#burc-izgara button[data-burc="akrep"]'); await p.waitForTimeout(200);
  const b = await p.evaluate(()=>document.querySelector("#burc-cevap .yanit").textContent);
  ok("farklı burç farklı okuma", a.m!==b);
  ok("seçili burç işaretli", await p.getAttribute('#burc-izgara button[data-burc="akrep"]',"aria-pressed")==="true");
  await ctx.close();
}

/* 4. İkili nasip */
console.log("\n[4] İki kişilik nasip");
{
  const {ctx,p,konsol} = await sayfaAc({reducedMotion:"reduce"});
  await git(p);
  await p.click("#t-ikili"); await p.waitForTimeout(200);
  await p.fill("#ad1","Mert"); await p.fill("#ad2","Zeynep");
  await p.click("#ikili-form button");
  await p.waitForSelector("#ikili-cevap .kayit",{timeout:5000});
  const r1 = await p.evaluate(()=>({y:document.querySelector(".yuzde").textContent,
                                    h:document.querySelector("#ikili-cevap .yanit").textContent,
                                    n:document.querySelector("#ikili-cevap .kayit-no").textContent}));
  ok("yüzde geldi", /^%\d{2}$/.test(r1.y), r1.y);
  ok("hüküm geldi", r1.h.length>15, r1.h);
  await p.fill("#ad1","Zeynep"); await p.fill("#ad2","Mert");
  await p.click("#ikili-form button"); await p.waitForTimeout(300);
  const r2 = await p.evaluate(()=>document.querySelector(".yuzde").textContent);
  ok("sıra bağımsız", r1.y===r2, r1.y+" vs "+r2);
  await p.fill("#ad1",""); await p.click("#ikili-form button"); await p.waitForTimeout(200);
  ok("boş isim uyarısı", (await p.textContent("#ikili-hata")).includes("isim"));
  ok("konsol temiz", konsol.length===0, konsol.join(" | "));
  await ctx.close();
}

/* 5. Ana akış + animasyon + sayaç */
console.log("\n[5] Kader akışı");
{
  const {ctx,p,konsol} = await sayfaAc({reducedMotion:"reduce"});
  await git(p);
  await p.fill("#soru","Zam alacak mıyım?");
  await p.click("#sor");
  await p.waitForSelector(".kayit",{timeout:8000});
  await p.waitForTimeout(400);
  const k = await p.evaluate(()=>({
    y:document.querySelector("#cevap .yanit").textContent,
    s:document.querySelector("#cevap .serh").textContent,
    m:document.querySelector("#cevap .muhur").textContent,
    n:document.querySelector("#cevap .kayit-no").textContent,
    btn:[...document.querySelectorAll("#cevap .paylas button")].map(b=>b.textContent)
  }));
  ok("hüküm var", k.y.length>5, k.y);
  ok("mühür var", /NASİP|BEKLEMEDE|DOSYA/.test(k.m), k.m);
  ok("kayıt no yerine oturdu", /Kayıt №\d{4}$/.test(k.n), k.n);
  ok("Kartı İndir butonu var", k.btn.includes("Kartı İndir"), k.btn.join(","));
  ok("konsol temiz", konsol.length===0, konsol.join(" | "));
  await ctx.close();
}

/* 5b. Defterin eski sayfaları
   Sıfır depolama sözünün testi: geçmiş devirler hesaplanır, saklanmaz.
   Aynı soru aynı devirde aynı geçmişi vermeli; farklı soru farklı geçmiş. */
console.log("\n[5b] Defterin eski sayfaları");
{
  const {ctx,p,konsol} = await sayfaAc({reducedMotion:"reduce"});
  await git(p);
  const gecmisAl = async (soru) => {
    await p.fill("#soru", soru); await p.click("#sor");
    await p.waitForSelector("#cevap .kayit",{timeout:8000}); await p.waitForTimeout(300);
    return p.evaluate(()=>[...document.querySelectorAll(".eski-liste li")].map(l=>({
      tarih:l.querySelector(".eski-tarih").textContent,
      rozet:l.querySelector(".eski-rozet").textContent,
      metin:l.querySelector(".eski-metin").textContent })));
  };
  const a = await gecmisAl("Zam alacak mıyım?");
  ok("8 eski sayfa listelendi", a.length===8, a.length+" satır");
  ok("her satırda tarih var", a.every(x=>x.tarih.length>2), JSON.stringify(a[0]||{}));
  ok("her satırda mühür rozeti var", a.every(x=>/NASİP|BEKLEMEDE|KAPANDI/.test(x.rozet)), JSON.stringify(a.map(x=>x.rozet)));
  ok("her satırda hüküm var", a.every(x=>x.metin.length>8));
  ok("geçmişte en az iki farklı kutup", new Set(a.map(x=>x.rozet)).size>=2, [...new Set(a.map(x=>x.rozet))].join(","));

  const a2 = await gecmisAl("Zam alacak mıyım?");
  ok("aynı soru aynı geçmiş", JSON.stringify(a)===JSON.stringify(a2));
  const b = await gecmisAl("Ne zaman kavuşacağım?");
  ok("farklı soru farklı geçmiş", JSON.stringify(a)!==JSON.stringify(b));

  ok("hiçbir şey saklanmıyor (localStorage boş)",
     await p.evaluate(()=>{ try { return localStorage.length===0; } catch(e){ return true; } }));
  ok("çerez yok", (await p.context().cookies()).length===0);
  ok("konsol temiz", konsol.length===0, konsol.join(" | "));
  await ctx.close();
}

/* 6. PNG kart üretimi */
console.log("\n[6] Fal kartı PNG");
{
  const {ctx,p} = await sayfaAc({reducedMotion:"reduce"});
  await git(p);
  await p.fill("#soru","Ne zaman kavuşacağım?"); await p.click("#sor");
  await p.waitForSelector(".kayit",{timeout:8000}); await p.waitForTimeout(300);
  const veri = await p.evaluate(async ()=>{
    const blob = await kartCiz();
    if (!blob) return null;
    const buf = await blob.arrayBuffer();
    const c = document.getElementById("tuval");
    return { boy: buf.byteLength, w:c.width, h:c.height,
             png: Array.from(new Uint8Array(buf.slice(0,8))) };
  });
  ok("PNG üretildi", !!veri && veri.boy>10000, JSON.stringify(veri && {boy:veri.boy,w:veri.w,h:veri.h}));
  ok("geçerli PNG imzası", veri && veri.png[0]===137 && veri.png[1]===80 && veri.png[2]===78 && veri.png[3]===71);
  ok("1080x1350", veri && veri.w===1080 && veri.h===1350);
  const buf = await p.evaluate(async ()=>{ const b=await kartCiz(); const a=new Uint8Array(await b.arrayBuffer());
    let s=""; for (let i=0;i<a.length;i+=8192) s+=String.fromCharCode.apply(null,a.subarray(i,i+8192));
    return btoa(s); });
  fs.mkdirSync(KOK + "/../shots", {recursive:true}); fs.writeFileSync(KOK + "/../shots/fal-karti.png", Buffer.from(buf,"base64"));
  await ctx.close();
}

/* 7. Araçlar */
console.log("\n[7] Araç düğmeleri");
{
  const {ctx,p,konsol} = await sayfaAc({reducedMotion:"reduce"});
  await git(p);
  await p.click("#rastgele");
  await p.waitForSelector(".kayit",{timeout:8000});
  ok("'sen sor' cevap üretti", (await p.inputValue("#soru")).length>3);
  /* Ayar düğmesinin ETİKETİ sabit, yalnızca durum rozeti değişir. */
  ok("ses etiketi sabit", (await p.textContent("#ses")).includes("Mühür sesi"));
  await p.click("#ses");
  ok("ses açıldı", (await p.textContent("#ses-durum"))==="açık" &&
                   (await p.getAttribute("#ses","aria-pressed"))==="true");
  await p.click("#ses");
  ok("ses kapandı", (await p.textContent("#ses-durum"))==="kapalı" &&
                    (await p.getAttribute("#ses","aria-pressed"))==="false");
  ok("'sen sor' bir eylem, ayar değil", await p.evaluate(()=>{
    const e=document.getElementById("rastgele");
    return e.classList.contains("eylem") && !e.hasAttribute("aria-pressed"); }));
  ok("geri sayım yazıldı", /yeniden yazılır|yazılıyor/.test(await p.textContent("#gerisayim")));
  ok("konsol temiz", konsol.length===0, konsol.join(" | "));
  await ctx.close();
}

/* 8. Mobil taşma — TÜM sekmeler ve dar genişlikler
   Not: önceki sürüm yalnızca Kader sekmesini ölçüyordu; İkili sekmesindeki
   ızgara taşması bu yüzden kaçtı. Artık üç sekme de ölçülüyor. */
console.log("\n[8] Mobil taşma (320/360/390px, üç sekme)");
{
  for (const w of [320, 360, 390]){
    const {ctx,p} = await sayfaAc({viewport:{width:w,height:820}, reducedMotion:"reduce"});
    await git(p);
    const tasmaOlc = () => p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);

    await p.fill("#soru","Yurtdışına taşınıp orada evlenebilecek miyim acaba diye çok düşünüyorum");
    await p.click("#sor"); await p.waitForSelector("#cevap .kayit",{timeout:8000});
    ok("kader sekmesi taşmıyor ("+w+"px)", (await tasmaOlc())<=0, (await tasmaOlc())+"px");

    await p.click("#t-ikili"); await p.waitForTimeout(250);
    await p.fill("#ad1","Abdurrahman"); await p.fill("#ad2","Zeynepnur");
    await p.click("#ikili-form button"); await p.waitForSelector("#ikili-cevap .kayit",{timeout:8000});
    ok("ikili sekmesi taşmıyor ("+w+"px)", (await tasmaOlc())<=0, (await tasmaOlc())+"px");

    await p.click("#t-burc"); await p.waitForTimeout(250);
    await p.click('#burc-izgara button[data-burc="basak"]');
    await p.waitForSelector("#burc-cevap .kayit",{timeout:8000});
    ok("burç sekmesi taşmıyor ("+w+"px)", (await tasmaOlc())<=0, (await tasmaOlc())+"px");

    await p.click("#t-kura"); await p.waitForTimeout(250);
    await p.click("#sik-ekle"); await p.click("#sik-ekle");
    await p.fill("#sik1","Abdurrahmanpaşa mahallesinde kalmaya devam edeyim");
    await p.fill("#sik2","Kadıköy tarafına taşınıp yeni bir hayata başlayayım");
    await p.fill("#sik3","Şimdilik hiçbir karar vermeden bekleyeyim");
    await p.fill("#sik4","Aileme danışıp öyle karar vereyim");
    await p.click('#kura-form button[type="submit"]');
    await p.waitForSelector("#kura-cevap .kayit",{timeout:8000});
    ok("kura sekmesi taşmıyor ("+w+"px)", (await tasmaOlc())<=0, (await tasmaOlc())+"px");

    await p.click("#t-ebced"); await p.waitForTimeout(250);
    await p.fill("#ebced-ad","Abdurrahmangazi Şerafettinoğlu");
    await p.click("#ebced-form button");
    await p.waitForSelector("#ebced-cevap .kayit",{timeout:8000});
    ok("isim falı sekmesi taşmıyor ("+w+"px)", (await tasmaOlc())<=0, (await tasmaOlc())+"px");

    /* eski sayfalar açıkken de taşmamalı */
    await p.click("#t-kader"); await p.waitForTimeout(250);
    const detay = await p.$("details.eski");
    if (detay){ await p.click("details.eski > summary"); await p.waitForTimeout(400);
      ok("eski sayfalar açıkken taşmıyor ("+w+"px)", (await tasmaOlc())<=0, (await tasmaOlc())+"px"); }
    else ok("eski sayfalar bölümü var ("+w+"px)", false, "details.eski bulunamadı");
    await ctx.close();
  }
  /* Ciltlerin hepsinde de bir kez bak.
     Her cilde TAZE bağlam açılır. Aynı bağlamda üst üste gezinildiğinde
     Playwright'ın tıklama öncesi "kararlılık" denetimi #sor düğmesini 1px
     oynuyor görüp zaman aşımına uğruyor. Ölçtük: sayfa kendi hâline
     bırakıldığında scrollY, scrollHeight ve bütün üst öğe yükseklikleri tek
     değerde sabit kalıyor — yani salınım sayfada değil, koşucunun kendi
     kaydırma denetiminde. Taze bağlam sorunu ortadan kaldırıyor. */
  for (const c of ["gece","kahve","ferman","neon","kagit"]){
    const {ctx,p} = await sayfaAc({viewport:{width:390,height:820}, reducedMotion:"reduce"});
    await git(p,"#cilt="+c);
    await p.fill("#soru","Yurtdışına taşınıp orada evlenebilecek miyim acaba diye çok düşünüyorum");
    await p.click("#sor"); await p.waitForSelector(".kayit",{timeout:8000});
    const t = await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    ok("taşma yok ("+c+")", t<=0, t+"px");
    await ctx.close();
  }
}

/* 8b. Uzun kesintisiz metin kartı taşırmasın */
console.log("\n[8b] Kartta uzun kelime");
{
  const {ctx,p} = await sayfaAc({reducedMotion:"reduce"});
  await git(p);
  const uzun = "a".repeat(130);
  await p.fill("#soru", uzun);
  await p.click("#sor"); await p.waitForSelector(".kayit",{timeout:8000});
  const r = await p.evaluate(async ()=>{
    const blob = await kartCiz();
    return blob ? blob.size : 0;
  });
  ok("uzun kelimede kart üretiliyor", r>10000, r+" bayt");
  const tasma = await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  ok("uzun kelime sayfayı taşırmıyor", tasma<=0, tasma+"px");
  await ctx.close();
}

/* 9. Erişilebilirlik: kontrast */
console.log("\n[9] Kontrast (WCAG AA)");
{
  const {ctx,p} = await sayfaAc({reducedMotion:"reduce"});
  const sonuc = [];
  for (const c of ["gece","kahve","ferman","neon","kagit"]){
    await git(p,"#cilt="+c);
    const r = await p.evaluate(()=>{
      const gs = n => getComputedStyle(document.body).getPropertyValue(n).trim();
      function rgb(x){ const d=document.createElement("div"); d.style.color=x; document.body.appendChild(d);
        const v=getComputedStyle(d).color; d.remove();
        const m=v.match(/\d+/g).map(Number); return m; }
      function L(c){ const s=c.map(v=>{v/=255; return v<=0.03928? v/12.92 : Math.pow((v+0.055)/1.055,2.4);});
        return 0.2126*s[0]+0.7152*s[1]+0.0722*s[2]; }
      function K(a,b){ const l1=L(rgb(a)), l2=L(rgb(b)); const hi=Math.max(l1,l2),lo=Math.min(l1,l2);
        return (hi+0.05)/(lo+0.05); }
      return { cilt: document.body.getAttribute("data-cilt"),
               metin: K(gs("--sut"), gs("--gece2")),
               ikincil: K(gs("--duman"), gs("--gece2")),
               vurgu: K(gs("--altin"), gs("--gece2")),
               muhur: K(gs("--muhur"), gs("--gece2")) };
    });
    sonuc.push(r);
    ok(c+" ana metin ≥4.5", r.metin>=4.5, r.metin.toFixed(2));
    ok(c+" ikincil metin ≥4.5", r.ikincil>=4.5, r.ikincil.toFixed(2));
    ok(c+" vurgu ≥3 (büyük metin/kenarlık)", r.vurgu>=3, r.vurgu.toFixed(2));
    ok(c+" mühür ≥3", r.muhur>=3, r.muhur.toFixed(2));
  }
  console.log("  kontrast tablosu:", JSON.stringify(sonuc.map(r=>({c:r.cilt,metin:+r.metin.toFixed(2),ik:+r.ikincil.toFixed(2),vu:+r.vurgu.toFixed(2),mu:+r.muhur.toFixed(2)}))));
  await ctx.close();
}

/* 10. Yedek veri + paylaşım linki + 404 */
console.log("\n[10] Dayanıklılık");
{
  const {ctx,p} = await sayfaAc({reducedMotion:"reduce"});
  await p.route("**/kader.json", r=>r.abort());
  await git(p);
  await p.fill("#soru","Bu iş olacak mı?"); await p.click("#sor");
  await p.waitForSelector(".kayit",{timeout:8000});
  ok("kader.json engellenince yedekle çalıştı", (await p.textContent("#cevap .yanit")).length>5);
  await p.unroute("**/kader.json");
  await git(p);
  const link = await p.evaluate(()=>tamBaglanti("Zam alacak mıyım?"));
  await p.goto(U+"?t=paylas"+link.slice(link.indexOf("#")), {waitUntil:"networkidle"});
  await p.waitForSelector(".kayit",{timeout:8000});
  ok("paylaşım linki çalışıyor", (await p.textContent("#cevap .yanit")).length>5);
  const r404 = await p.goto(U+"olmayan", {waitUntil:"domcontentloaded"});
  ok("404 sayfası", (await p.content()).includes("nasip"), "durum "+r404.status());
  await ctx.close();
}

/* 10b. ANİMASYON AÇIKKEN metin bütünlüğü
   Tüm testler reducedMotion ile koşarsa mürekkep animasyonunun DOM'u hiç
   çalışmaz ve "kelimeler bitişik çıkıyor" gibi hatalar gözden kaçar.
   Bu blok bilinçli olarak animasyonlu yolu sınar. */
console.log("\n[10b] Animasyon açıkken metin");
{
  const {ctx,p,konsol} = await sayfaAc();          /* reducedMotion YOK */
  await git(p);
  await p.evaluate(()=>{ const g=document.getElementById("giris"); if(g) g.hidden=true; });
  await p.fill("#soru","Zam alacak mıyım?"); await p.click("#sor");
  await p.waitForSelector("#cevap .kayit",{timeout:9000}); await p.waitForTimeout(1600);
  const k = await p.evaluate(()=>{ const y=document.querySelector("#cevap .yanit");
    return {t:y.textContent, g:y.innerText, sp:y.querySelectorAll("span.kel").length}; });
  ok("hüküm kelime kelime çiziliyor", k.sp>1, k.sp+" span");
  ok("hükümde boşluklar korunuyor", k.g.replace(/\s+/g," ").trim()===k.t.replace(/\s+/g," ").trim(),
     "görünen: "+JSON.stringify(k.g.slice(0,60)));
  ok("bitişik kelime yok", !/[a-zçğıöşü][A-ZÇĞİÖŞÜ]/.test(k.g) && k.g.indexOf(" ")>0, k.g.slice(0,60));

  await p.click("#t-burc"); await p.waitForTimeout(500);
  await p.click('#burc-izgara button[data-burc="aslan"]');
  await p.waitForSelector("#burc-cevap .kayit",{timeout:9000}); await p.waitForTimeout(1800);
  const b2 = await p.evaluate(()=>{ const y=document.querySelector("#burc-cevap .yanit");
    return {t:y.textContent, g:y.innerText}; });
  ok("burç okumasında boşluklar korunuyor",
     b2.g.replace(/\s+/g," ").trim()===b2.t.replace(/\s+/g," ").trim(),
     "görünen: "+JSON.stringify(b2.g.slice(0,70)));

  await p.click("#t-ikili"); await p.waitForTimeout(500);
  await p.fill("#ad1","Mert"); await p.fill("#ad2","Zeynep");
  await p.click("#ikili-form button");
  await p.waitForSelector("#ikili-cevap .kayit",{timeout:9000}); await p.waitForTimeout(1400);
  const i2 = await p.evaluate(()=>{ const y=document.querySelector("#ikili-cevap .yanit");
    return {t:y.textContent, g:y.innerText}; });
  ok("ikili hükmünde boşluklar korunuyor",
     i2.g.replace(/\s+/g," ").trim()===i2.t.replace(/\s+/g," ").trim(),
     "görünen: "+JSON.stringify(i2.g.slice(0,70)));

  await p.click("#t-kura"); await p.waitForTimeout(500);
  await p.fill("#sik1","Kahve"); await p.fill("#sik2","Çay");
  await p.click('#kura-form button[type="submit"]');
  await p.waitForSelector("#kura-cevap .kayit",{timeout:9000}); await p.waitForTimeout(1400);
  const k2 = await p.evaluate(()=>{ const y=document.querySelector("#kura-cevap .yanit");
    return {t:y.textContent, g:y.innerText}; });
  ok("kura hükmünde boşluklar korunuyor",
     k2.g.replace(/\s+/g," ").trim()===k2.t.replace(/\s+/g," ").trim(),
     "görünen: "+JSON.stringify(k2.g.slice(0,70)));

  await p.click("#t-ebced"); await p.waitForTimeout(500);
  await p.fill("#ebced-ad","Zeynep"); await p.click("#ebced-form button");
  await p.waitForSelector("#ebced-cevap .kayit",{timeout:9000}); await p.waitForTimeout(1400);
  const e2 = await p.evaluate(()=>{ const y=document.querySelector("#ebced-cevap .yanit");
    const s=document.querySelector("#ebced-cevap .ebced-sayi");
    return {t:y.textContent, g:y.innerText, sayiG:s.innerText, sayiT:s.textContent}; });
  ok("isim falı okumasında boşluklar korunuyor",
     e2.g.replace(/\s+/g," ").trim()===e2.t.replace(/\s+/g," ").trim(),
     "görünen: "+JSON.stringify(e2.g.slice(0,70)));
  ok("ebced sayısı etikete yapışmıyor", /^\d+\s/.test(e2.sayiT), JSON.stringify(e2.sayiT.slice(0,30)));

  await p.click("#t-kader"); await p.waitForTimeout(400);
  await p.fill("#soru","Zam alacak mıyım?"); await p.click("#sor");
  await p.waitForSelector("#cevap .kayit",{timeout:9000}); await p.waitForTimeout(1500);
  await p.click("details.eski > summary"); await p.waitForTimeout(700);
  const es = await p.evaluate(()=>[...document.querySelectorAll(".eski-liste li")].map(l=>({
    t:l.querySelector(".eski-metin").textContent, g:l.querySelector(".eski-metin").innerText })));
  ok("eski sayfalarda boşluklar korunuyor",
     es.length>0 && es.every(x=>x.g.replace(/\s+/g," ").trim()===x.t.replace(/\s+/g," ").trim()),
     JSON.stringify((es[0]||{}).g||"").slice(0,70));
  ok("konsol temiz", konsol.length===0, konsol.join(" | "));
  await ctx.close();
}

/* 11. Ekran görüntüleri */
{
  for (const c of ["gece","kahve","ferman","neon","kagit"]){
    const {ctx,p} = await sayfaAc({viewport:{width:1180,height:1000}});
    await git(p,"#cilt="+c);
    await p.evaluate(()=>{ const g=document.getElementById("giris"); if(g) g.hidden=true; });
    await p.fill("#soru","İşten kovulacak mıyım?"); await p.click("#sor");
    await p.waitForSelector(".kayit",{timeout:9000}); await p.waitForTimeout(1700);
    await p.screenshot({path:KOK + "/../shots/cilt-"+c+".png", fullPage:true});
    await ctx.close();
  }
  const {ctx,p} = await sayfaAc({viewport:{width:1180,height:1000}});
  await git(p);
  await p.evaluate(()=>{ const g=document.getElementById("giris"); if(g) g.hidden=true; });
  await p.click("#t-burc"); await p.waitForTimeout(200);
  await p.click('#burc-izgara button[data-burc="aslan"]'); await p.waitForTimeout(1800);
  await p.screenshot({path:KOK + "/../shots/burc.png", fullPage:true});
  await p.click("#t-ikili"); await p.waitForTimeout(300);
  await p.fill("#ad1","Mert"); await p.fill("#ad2","Zeynep");
  await p.click("#ikili-form button"); await p.waitForTimeout(1600);
  await p.screenshot({path:KOK + "/../shots/ikili.png", fullPage:true});
  await ctx.close();
}

await tarayici.close(); sunucu.close();
console.log(`\n${gecti} geçti, ${kaldi} kaldı`);
if (hatalar.length){ console.log("\nKALANLAR:"); hatalar.forEach(h=>console.log("  ✗ "+h)); }
process.exit(kaldi?1:0);
