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
  await p.click("#ses");
  ok("ses açıldı", (await p.textContent("#ses")).includes("açık"));
  await p.click("#ses");
  ok("ses kapandı", (await p.textContent("#ses")).includes("kapalı"));
  ok("geri sayım yazıldı", /yeniden yazılır|yazılıyor/.test(await p.textContent("#gerisayim")));
  ok("konsol temiz", konsol.length===0, konsol.join(" | "));
  await ctx.close();
}

/* 8. Mobil + taşma, tüm ciltlerde */
console.log("\n[8] Mobil 390px, tüm ciltler");
{
  const {ctx,p} = await sayfaAc({viewport:{width:390,height:800}, reducedMotion:"reduce"});
  for (const c of ["gece","kahve","ferman","neon","kagit"]){
    await git(p,"#cilt="+c);
    await p.fill("#soru","Yurtdışına taşınıp orada evlenebilecek miyim acaba diye çok düşünüyorum");
    await p.click("#sor"); await p.waitForSelector(".kayit",{timeout:8000});
    const tasma = await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    ok("taşma yok ("+c+")", tasma<=0, tasma+"px");
  }
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
