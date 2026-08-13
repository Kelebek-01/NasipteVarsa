# NasipteVarsa — Devir Notu (Claude Code için)

Canlı: https://nasiptevarsa.com · Repo: `Kelebek-01/NasipteVarsa` · Yayın: GitHub Pages, `master` dalı kökten.
Motor sürümü: **v3**, arayüz **v3.4**. Bu dosya `TASARIM-NOTLARI.md`'nin yerine geçer.

## 1. Ne bu?

Türkçe bir "kader defteri". Ziyaretçi soru sorar, site bir kayıt üretir: hüküm (büyük cümle),
şerh (yorum + tavsiye), mühür (NASİP VAR / NASİP YOK / BEKLEMEDE / DOSYA KAPANDI), sorudan
türeyen kayıt numarası ve paylaşılabilir link. Ayrıca tarihe bağlı "Günün Nasibi" kartı var.

Tamamen statik. **Yapay zekâ yok, sunucu yok, üçüncü parti script yok, çerez yok, hiçbir
depolama API'si (localStorage/sessionStorage) kullanılmıyor.** Bu duruş bilinçlidir, korunmalı.
Site tek dış istek yapar: kendi `kader.json` dosyası.

## 2. Dosya haritası

```
index.html   Sayfa, stiller, arayüz mantığı (tek dosya; CSS gömülü)
kader.js     Kader motoru — saf fonksiyonlar, DOM'a dokunmaz, Node'da da çalışır
kader.json   Tüm içerik ve ayarlar (kod bilmeden düzenlenebilir)
404.html     "Bu sayfa nasip olmadı."
fonts/       Fraunces + Poppins, self-host woff2 (OFL). Google Fonts'a bağımlılık yok.
             TÜRKÇE ALT KÜMESİNE KIRPILMIŞ — 197 KB'den 100 KB'ye. Ayrıntı §3c.
og.png       1200×630 paylaşım görseli · favicon.svg · apple-touch-icon.png
CNAME        nasiptevarsa.com
test/        Regresyon ve güvenlik testleri (Node; yayına dahil değil)
eval/        Ölçüm koşusu, bağımsız değerlendirme setleri, RAPOR.md
project/     Eski Vue kaynağı. Yayına dahil değil, tarihsel; silinebilir.
```

## 3. Kader motoru v3 (kader.js)

Katmanlar — hepsi kural tabanlı, model yok:

```
1) Sesbilim    ünlü uyumu (kalınlık + düzlük), ünsüz benzeşmesi (D→d/t), yumuşama
               geri alma (kitab→kitap). Ekler ARKETİP yazımıyla tutulur:
               A=a|e · H=ı|i|u|ü · D=d|t · (y)(n)(s)=ünlü sonrası tampon · (H)=ünsüz sonrası
2) Biçimbilim  Ekin yüzey biçimi GÖVDEDEN ÜRETİLİR ve tutmuyorsa soyulmaz.
               "elma" → -mA eki "me" üretir, "ma" gelmez → korunur.
               Morfotaktik: ek sırası kesin azalmalı; isim çekiminden sonra fiil eki
               gelemez ("doktora"→"doktor", "dokto" değil). Köprü: -mA / -mAk.
3) Sözdizim    9 soru tipi, olumsuzluk (-mA / -mAz / -mHyor), 1. şahıs işaretlemesi.
               Olumsuzluk yalnızca -mA bir ZAMAN ekinin altındaysa sayılır:
               "olmam gerekecek" adlaştırma, "kovulmayacak" olumsuzluk.
4) Anlam       IDF ağırlıklı konu sözlüğü (+ karakter 3-gram geri düşüşü);
               ARZU ekseni: istenen / korkulan / nötr — yüklem ağırlıklı
               (Türkçe SOV: son içerik kelimesi yüklem, ağırlığı 3×).
5) Üretim      tohum = splitmix32(FNV1a(sıralı kökler) ⊕ splitmix32(dönem))
               Her karar ekseni AYRI alanla tohumlanır (kader / hüküm / okuma / tavsiye).
               Seçim: Efraimidis–Spirakis ağırlıklı anahtarı k_i = u_i^(1/w_i), argmax.
```

**Arzu ekseni neden var:** v2'de "İşten kovulacak mıyım?" sorusuna `kutup=var` çıkınca
"NASİP VAR" müjde mührü basılıyordu — kötü habere kutlama. v3 `kader` (olur/olmaz)
ile `arzu`yu ayırıp **ton** üretir:

| | istenen / nötr | korkulan |
|---|---|---|
| **olur** | `mujde` → NASİP VAR | `uyari` → NASİP YOK |
| **olmaz** | `teselli` → NASİP YOK | `ferah` → NASİP VAR |

**Kararlı seçim neden önemli:** v2'de `indeks = floor(u·n)` idi; listeye tek cümle
eklemek mevcut cevapların **%50,7**'sini değiştiriyordu. ES anahtarıyla bu **%4,3**'e
düştü (ölçüldü, bkz. `eval/RAPOR.md` §3). Yani artık içerik eklemek kaderleri bozmuyor.
Alan ayrımı sayesinde `tavsiye` listesini değiştirmek **hiçbir** hükmü değiştirmiyor (0/140).

### Ölçülmüş başarım

Hiç incelenmemiş, ayrı bir ajanın yazdığı 100 soruluk sette:

| eksen | doğruluk | makro F1 | çoğunluk temel çizgisi |
|---|---:|---:|---:|
| soru tipi | **95,0%** | 0,932 | 35,0% |
| konu | **73,0%** | 0,755 | 20,0% |
| arzu | **59,0%** | 0,576 | 40,0% |

Arzu ekseni zayıf halkadır ve öyle raporlanmalıdır. Ayrıntı, karışıklık matrisleri,
ablasyonlar ve dağılım testleri: `eval/RAPOR.md`.

## 3b. Arayüz özellikleri (v3.2)

**Ciltler — renk DEĞİL, biçim.** Defterin kabuğu her devirde değişir:
`Kader.ciltSec(dönem, veri.ciltler)`. Beş cilt var (Gece Defteri, Kahve Falı, Ferman,
Neon Kısmet, Kâğıt ve Mürekkep). `#cilt=kahve` ile elle denenebilir.

v3.1'e kadar ciltler **yalnızca renk** token'ı eziyordu. Ölçüldüğünde bu net görünüyor:
aynı soru sorulup sayfadaki 49 görünür öğenin kutusu, yazı tipi, punto, ağırlık, harf
aralığı, köşe yarıçapı ve kenarlığı karşılaştırıldığında **49/49 öğede renk farkı,
0/49'unda yapı farkı** vardı. Yani "Ferman" ile "Neon Kısmet" aynı sayfanın iki boyasıydı.

v3.2'de cilt bloğu şu **biçim token'larını** da eziyor: `--kart-yuvarlak`,
`--dugme-yuvarlak`, `--cip-yuvarlak`, `--muhur-yuvarlak`, `--kart-kenar`, `--kart-ic`,
`--baslik-yazi`, `--govde-yazi`, `--baslik-agirlik`, `--baslik-aralik`,
`--baslik-donusum`, `--doku-frekans`, `--sus`, `--kenar-cizgi`. Ölçüm (90 öğe):
kahve 66/90, ferman 90/90, neon 90/90, kâğıt 89/90 öğede yapı farkı.

Cilt karakterleri: **ferman** keskin köşe + çift çerçeve + seyrek harf aralığı + alt
süsleme; **neon** monospace + büyük harf + sola hizalı başlık + HUD köşe ayraçları +
tarama çizgileri; **kâğıt** baştan sona serifli dizgi + solda kırmızı marj çizgisi;
**kahve** asimetrik "telve" köşeleri + iri doku; **gece** temel hâl.

**Yeni yazı tipi indirilmiyor.** CSP `font-src 'self'` olduğu için dışarıdan yazı tipi
zaten çekemeyiz. Ciltler farkı elimizdeki Fraunces/Poppins'i farklı yerlerde kullanarak
ve sistem monospace yığınına düşerek kuruyor. Yeni cilt eklerken bunu bozma.

**Cilt seçici.** Cildi devir seçer, bu fikrin kendisi — ama kullanıcı ötekileri hiç
göremiyordu. Başlık altındaki etiket artık bir düğme: açılınca beş cildi önizleyebiliyor,
"Devre dön" ile devrin kendi cildine dönülüyor. Seçim URL'e `#cilt=` olarak `replaceState`
ile yazılır: paylaşılabilir, geçmişi kirletmez, hiçbir şey saklanmaz.

İki denetim var, ikisini de çalıştır: `test/test-arayuz.mjs` §1b (cilt gerçekten yapı
değiştiriyor mu — %5 eşiği) ve §9 kontrast (ana/ikincil metin ≥4.5, vurgu ve mühür ≥3).
CI'da ayrıca `.github/cilt-denetimi.mjs` her cilt bloğunda biçim token'ı arıyor.

**Mühür kırma ritüeli (v3.3).** Kader sekmesinde cevap artık **mühürlü** gelir:
`muhurluGoster()` bir balmumu mührü çizer, kullanıcı basılı tutar (850 ms), halka
dolar, mühür parçalanır (bkz. ışınsal parçalanma) ve ancak o zaman `goster()` çağrılır. `goster()` hiç
değişmedi — mürekkep animasyonu, sayaç, ses, eski sayfalar, paylaşım aynen çalışıyor.

**Değişmez: tutma süresi kaderi DEĞİŞTİRMEZ.** Cevap `sor()` içinde hesaplanır ve
kapanışta bekler; mühür yalnızca *ne zaman* görüneceğini belirler. Motor deterministik
kalır. `test/test-arayuz.mjs` §10c aynı soruyu bir kez tutarak bir kez klavyeyle açıp
hükmün birebir aynı olduğunu doğruluyor; bu testi silme.

Erişilebilirlik: mühür bir `<button>`. **Enter/Boşluk anında açar** — basılı tutamayan
kullanıcı kilitlenmesin diye. `prefers-reduced-motion` kipinde tutma hiç yok, tek
dokunuş açar (ipucu metni de "dokun" olur). Mühür kırılınca odak `.kayit` kartına
taşınır, yoksa basılan düğme yok olduğu için odak `body`'ye düşer.

**Test tuzağı — `page.click(".muhur-kir")` MÜHRÜ KIRMAZ.** Playwright gerçek pointer
olayı üretir: `pointerdown` tutma yolunu açar, `pointerup` onu iptal eder, ardından
gelen `click` bilerek yutulur (klavye ile pointer'ı ayırt etmenin yolu bu). Testler
`muhuruKir()` yardımcısını kullanır: `focus` + `keyboard.press("Enter")`. Gerçek
basılı tutmayı sınamak için `mouse.down()` → `waitForTimeout(1150)` → `mouse.up()`.
`focus`'un ayrıca bir yararı var: Playwright'ın tıklama öncesi kararlılık denetimini
hiç çalıştırmaz, §8'deki 30 sn zaman aşımı tuzağına düşmez.

`kartAl()` (test-tarayici) mühür varsa kendisi kırar — linkle gelen kayıtlar da
mühürlü açıldığı için. Boş soruda ne mühür ne kart oluşur, §5 bunu ayrıca denetler.

**Işınsal parçalanma (v3.4).** Mühür sabit bir çizgiden ikiye ayrılmıyor; **parmağın
bastığı noktadan** kırılıyor. O noktadan kenara 4–6 rastgele açıda ışın atılıyor,
aralarda kalan dilimler `clip-path: polygon()` ile kesilip ayrı ayrı savruluyor.
Köşeden basınca bir büyük parça + kıymıklar, ortadan basınca dengeli dağılım çıkıyor.
Klavyeyle açılınca pointer yok, merkeze yakın rastgele bir nokta seçiliyor.

Üç şey birbirine bağlı, biri bozulursa görüntü çöker:

1. **Işınlar önceden üretilir ve iki komşu dilim AYNI ışını paylaşır.** Her dilim kendi
   kenarını ayrı üretseydi aralarında boşluk ya da bindirme olurdu.
2. **Çatlak çizgileri ayrı bir SVG katmanı.** Dilimler birleşikken kusursuz oturduğu
   için dikişten çatlak görünmüyor; `drop-shadow` da çare değil — gölge dilimin
   ARKASINA düşüyor, komşu dilim üstünü örtüyor. Çizgiler ışınların kendi nokta
   dizisinden üstte çiziliyor.
3. **Çatlak katmanı mum şekline kırpılır** (`clip-path: inset(0 round var(--balmumu-yuvarlak))`).
   Işınlar kutunun KÖŞESİNE gider, balmumu ise yuvarlaktır: kırpılmazsa çatlak
   mumun dışına taşıp altın halkayı keser.

Zamanlama: kırılma anında çatlak belirir, **120 ms durur**, sonra parçalar düşer;
kayıt 640 ms sonra açılır. Duraksama gerçek balmumunun kırılma ritmi — kaldırılırsa
çatlak hiç görülmeden parçalar uçar.

**Buradaki `Math.random` yalnızca görseldir.** Cevap `sor()` içinde çoktan hesaplandı
ve kapanışta bekliyor; kırılmanın şekli hükmü etkilemez. Motor tarafında rastgelelik
yok, `test-guvenlik.mjs` "Math.random sızmamış" maddesiyle `kader.js`'i ayrıca
denetliyor. `test-arayuz.mjs` §10d hem merkezin basılan noktayı izlediğini hem de
aynı noktadan iki kırılmanın farklı desen verdiğini ölçüyor.

Balmumunun **gürültü maskesi yoktur**, bilerek: `--muhur-maske` ince bir çerçeveyi
aşındırmak için yapıldı, dolu bir diske uygulanınca yüzeyi delik deşik ediyor
(ölçüldü, ahududuya benziyordu). El yapımı his düzensiz `--balmumu-yuvarlak`
konturundan geliyor — o da cilde göre değişiyor: ferman kare, kâğıt tam yuvarlak,
gece/kahve organik damla.

**Sekmeler.** Kader / İki Kişilik / Burç / Kura / İsim Falı sayfaları View Transitions API ile geçiyor
(`document.startViewTransition`, özellik denetimli). Geçişten sonra odak hedef panele
taşınıyor — bu erişilebilirlik için zorunlu, kaldırma.

**Animasyonlar.** Hüküm kelime kelime "mürekkeple" oturuyor, mühür basılırken kart
sarsılıyor ve halka yayılıyor, kayıt numarası sayaç gibi dönüp duruyor, kartta kendi
ürettiğimiz SVG gürültüsüyle kâğıt dokusu var. Hepsi `prefers-reduced-motion` ile kapanıyor.
**Test yazarken iki tuzak:**
1. Kayıt numarası ~700 ms boyunca değişir; testler numarayı okumadan önce kararlı hâle
   gelmesini beklemeli (`test/test-tarayici.mjs` içindeki `kartAl` bunu yapıyor).
2. **Testlerin hepsini `reducedMotion:"reduce"` ile koşma.** O kipte mürekkep animasyonu
   hiç çalışmaz, DOM düz metne düşer ve animasyonlu yoldaki hatalar görünmez. Nitekim
   "kelimeler bitişik çıkıyor" hatası tam bu yüzden kaçtı: boşluk `display:inline-block`
   olan span'ın içindeydi ve CSS satır sonundaki boşluğu kırpıyordu. Artık boşluk span'ın
   dışında düz metin düğümü. `test/test-arayuz.mjs` §10b animasyon AÇIKKEN koşup
   `innerText` ile `textContent`'i karşılaştırıyor; bu bloğu silme.

**Defterin eski sayfaları.** `Kader.gecmisSayfalar(soru, veri, dönem, adet)` geçmiş
devirlerin cevabını **yeniden hesaplar**; hiçbir yerde saklanmaz. Kader saf fonksiyon ve
dönem dışarıdan verildiği için bu bedava. Arayüzde cevabın altında `<details>` olarak
duruyor (native, JS'siz açılıp kapanıyor). Adet tavanı 24, varsayılan 8. Bu özellik
**sıfır depolama sözünü bozmaz** — §5b testi `localStorage.length === 0` ve çerez
sayısının 0 olduğunu ayrıca doğruluyor.

**Kura.** `Kader.kuraSec(veri, şıklar, dönem)`. İki ayrı tohum kullanır ve bu bilinçlidir:
kazananı seçen tohum **yalnızca döneme** bağlıdır (her şık kendi anahtarıyla
Efraimidis–Spirakis yarışına girer → rendezvous kararlılığı: üçüncü şık eklenince eski
karar 2/3 olasılıkla korunur), hükmün metnini seçen tohum ise şık kümesine bağlıdır.
**Bu ilk yazımda yanlıştı:** tek tohum şık kümesinden türetiliyordu, ölçtük, eski karar
yalnızca ~%38 korunuyordu. `test/test-motor.mjs` §12 bu gerilemeyi 200 örnekle yakalar
(eşik 110/200; kuramsal beklenti ≈133). Şık tavanı 6, şık uzunluğu 60 karakter.
`kura.hukum` cümlelerinde `{secilen}` **tam bir kez** geçmeli (CI denetliyor) ve seçilen
şıkka **ek getirme** — ünlü uyumu tutmaz, yalın bırak.

**İsim falı (ebced).** `Kader.ebcedDeger(ad)` + `Kader.ebcedNasip(veri, ad, dönem)`.
**Dürüstlük notu:** Latin harfli Türkçe bir ismi ebcede çevirmek kayıplı bir iştir —
"s" Arapçada sin(60), sad(90) veya se(500) olabilir ve hangisi olduğu ismin aslına
bakılmadan bilinemez. Tablo her Latin harfi için en yaygın karşılığı alır, yani üretilen
sayı **yaklaşık ebced**tir. Arayüz de şerhinde bunu söylüyor; o cümleleri havuzdan
çıkarma. `hane` ise toplamın rakam kökü (1..9) — sayı bilimi geleneğinden gelir,
ebcedin kendisinden değil, ayrı adlandırılmıştır. Tohum **sayıdan** üretilir, isimden
değil: aynı toplamı veren iki isim aynı sayfayı açar (ebcedde belirleyici olan sayıdır).
Sayı devirden bağımsızdır, okuması devir döndükçe değişir.

**Fal kartı (PNG) — beş sekmede de (v3.3).** `kartCiz(kayit)` 1080×1350 bir kart çiziyor,
`toBlob` ile PNG üretiyor; paylaşım için `navigator.canShare({files})`, yoksa indirme.
Yerleşim **ölç-sonra-çiz**: satırlar önce ölçülüp içerik dikeyde ortalanıyor, yoksa uzun
cevaplarda çerçeveye biniyor. Renkler cilt token'larından okunuyor, yani kart hangi cilt
açıksa ona uyuyor.

Kart kaydı **sekmeden bağımsız** tek bir şekil: `kayitYaz(ust, yanit, serh, rozet, vurgu, no)`.
`kartCiz` yalnızca bunu tanır, hiçbir sekmeye özel alan bilmez. Rozet her sekmede kendi
anlamını taşır: kaderde mühür (NASİP VAR…), ikilide yüzde, burçta burç adı, kurada kazanan
şık, ebcedde `toplam · hane`.

**Kayıt GLOBAL DEĞİL, düğmeye bağlı.** v3.2'de `sonKayit` global bir değişkendi ve yalnızca
Kader sekmesi kart çiziyordu. Beş sekme aynı globali paylaşsaydı şu hata çıkardı: Kader'de
cevap al, Burç'a geç, oku, sonra Kader kartındaki düğmeye bas → **burç kartı iner.**
Bu yüzden kayıt `kartButonu(kayit)` → `kartCiz(kayit)` zinciriyle taşınıyor ve global
kaldırıldı. `test-arayuz.mjs` §6 son maddesi ("her kart kendi kaydını çiziyor") tam bu
gerilemeyi yakalar; silme.

**Test tuzağı — `delete navigator.share` ÇALIŞMAZ.** Özellik `Navigator.prototype`
üzerinde tanımlı; örnekten silinince prototipteki geri gelir ve kod paylaşım yolunu
seçtiği için indirme hiç olmaz, test de indirme bekleyip zaman aşımına uğrar. Doğrusu
`Object.defineProperty(Navigator.prototype, "share", {value:undefined, configurable:true})`.

**Mobilde sayfa çevirme (v3.3).** `<main>` üstünde yatay kaydırma sekme değiştiriyor:
eşik 55px, yatay hareket dikeyin en az 1,6 katı olmalı. Yön ve dolanma klavye ok
tuşlarıyla aynı; gizli sekmeler atlanır.

**`touchmove`'da `preventDefault` YAPILMIYOR ve yapılmamalı** — dinleyiciler `passive:true`.
Yapılsaydı dikey kaydırma kilitlenirdi. Bunun bedeli sürükleme geri bildiriminin olmaması;
karar `touchend`'de veriliyor, geçişi zaten View Transitions yapıyor. `test-arayuz.mjs`
§2a son maddesi olayın `defaultPrevented` kalmadığını ölçüyor.

Etkileşimli öğe üstünde başlayan dokunuş kaydırma sayılmıyor
(`input, textarea, select, button, a, summary, details, .olcek`) — yoksa metin kutusunda
imleç sürüklerken ya da **mühürü basılı tutarken parmak kayınca** sayfa değişirdi.

**Araç düğmeleri: eylem / ayar ayrımı.** Eskiden "sen sor", "mühür sesi" ve "telefonu
salla" üçü de aynı kesik çizgili çipti; hata ayıklama düğmesi gibi duruyorlardı. Artık
"sen sor" bir **eylem** (`.eylem`, altı çizili, aria-pressed YOK), ötekiler birer
**ayar** (`.anahtar`, etiket sabit + durum rozeti + aria-pressed). Ayar düğmesinin
etiketini metin değiştirerek güncelleme — `#ses-durum` / `#salla-durum` rozetini güncelle.

**Tipografi ölçeği.** `--ol-0`…`--ol-7` (1.22 oranlı). Öncesinde sayfada gerçekte iki
punto vardı. Yeni bileşende doğrudan `rem` yazma, kademeyi kullan.

**Oyunlaştırma.** İki ayrı ses WebAudio ile **sentezleniyor** (ses dosyası yok, sıfır bayt):
mühür sesi (kayıt görününce) ve daha tok bir **çarpma sesi** (sallama anında, "bir yere
vurdum" hissi için) — ikisi de `sesAcik` bayrağına saygı duyar ve varsayılan **kapalı**.
Sallama DeviceMotion ile; iOS izni bir kez sorulur, düğme **açma/kapama** olarak çalışır
(dinleyici `removeEventListener` ile gerçekten kaldırılır, yoksa telefon boşuna dinlemede
kalır). Varsa `navigator.vibrate` ile kısa bir titreşim de veriliyor. Devir geri sayımı
30 saniyede bir güncelleniyor.

**`hidden` tuzağı — bunu bir kez yedik.** Tarayıcının kendi `[hidden]{display:none}`
kuralı en düşük öncelikliktir. Bir bileşene `display:inline-flex` yazmak onu **sessizce
ezer** ve öğe `hidden` iken bile çizilir. "Sallayınca sor" düğmesi masaüstünde tam bu
yüzden görünüyordu: JS `hidden = true` diyordu, `.anahtar{display:inline-flex}` üstüne
yazıyordu. Artık global `[hidden]{display:none !important}` var, silme.
**Testte `el.hidden` okumak yetmez** — o özellik doğruydu ve test geçiyordu. Görünürlük
ölçülmeli (`offsetParent`, `getComputedStyle().display`, `page.isVisible`). §1d ayrıca
sayfadaki bütün `[hidden]` öğeleri tarayıp hiçbirinin çizilmediğini doğruluyor.

**"Sallayınca sor" yalnızca dokunmatikte.** `DeviceMotionEvent` masaüstü Chrome'da da
**tanımlıdır**, ivmeölçer olmasa bile; tek başına varlık denetimi yanlış. Doğru soru
"bu cihazın birincil girdisi dokunma mı": `(pointer: coarse) and (hover: none)`.
**Ölçülmemiş durum:** dokunmatik ekranlı ama fareyle kullanılan dizüstü. Playwright'ın
`hasTouch` emülasyonu pointer'ı zorla `coarse` yaptığı için o senaryo testte
canlandırılamıyor; davranış yalnızca CSS sorgusunun anlamına dayanıyor.

**Mobil tuzağı:** ızgara ve esnek kutu öğelerinin varsayılan `min-width` değeri `auto`dur;
`<input>`'un içsel genişliği (~20 karakter) sütunu `1fr`den taşırır. İkili nasip formu
390px'te 340px taşıyordu. Çözüm `min-width:0` + dar ekranda tek sütun. Yeni form
eklerken bunu unutma. Taşma testi artık **beş sekmeyi de** (eski sayfalar açıkken dahil)
320/360/390px'te ölçüyor — önceki sürümler yalnızca Kader sekmesine bakıyordu, hata bu
yüzden kaçmıştı.

**Test koşucusu tuzağı.** `test-arayuz.mjs` §8'in cilt döngüsünde her cilde **taze
bağlam** açılır. Aynı bağlamda üst üste gezinildiğinde Playwright'ın tıklama öncesi
"kararlılık" denetimi `#sor` düğmesini 1px oynuyor görüp 30 sn zaman aşımına uğruyor.
Ölçtük: sayfa kendi hâline bırakıldığında `scrollY`, `scrollHeight` ve bütün üst öğe
yükseklikleri tek değerde sabit — yani salınım sayfada değil, koşucunun kaydırma
denetiminde. Bu döngüyü tek bağlama geri çevirme.

**CSP notu:** `img-src` artık `data:` ve `blob:` de kabul ediyor — sırasıyla kâğıt dokusu
(gömülü SVG) ve fal kartı (canvas blob) için. Başka gevşetme yok.

## 3c. Font kırpma (v3.4)

Ölçüldü: sayfa 260 KB iniyordu, **fontlar bunun %76'sı** (197 KB). `kader.json`
5,5 KB'ydi — yani içerik büyütmenin boyut maliyeti fontların yanında gürültü.

Fontlar Türkçe alt kümesine kırpıldı (`pyftsubset`), Fraunces'in `wght` ekseni
400–700'e daraltıldı (`fonttools varLib.instancer`). Sonuç **197 KB → 100 KB, %48**.

| dosya | önce | sonra |
|---|---:|---:|
| fraunces latin normal | 36.620 | 31.328 |
| fraunces latin italic | 45.656 | 39.312 |
| fraunces latin-ext normal | 33.584 | **3.628** |
| fraunces latin-ext italic | 40.528 | **3.372** |
| poppins latin ×3 | 23.700 | 21.768 |
| poppins latin-ext ×3 | 16.600 | **3.228** |

`latin-ext` dosyaları %80–92 küçüldü: Türkçe o bloktan yalnızca `ğĞİşŞ` istiyor,
gerisi Lehçe/Çekçe/Vietnamca içindi ve hiç kullanılmıyordu.

**Karakter kümesi kaynaklardan üretildi**, tahminle değil: `index.html`, `404.html`
ve `kader.json`'daki bütün karakterler + ASCII + Latin-1 + Türkçe özel harfler =
224 glif. Latin-1'i tümüyle tutmak bilinçli: **kullanıcının yazdığı soru sayfada
yankılanıyor**, "café" yazan biri tofu görmemeli.

Doğrulandı: kırpma sırasında sayfada geçen **hiçbir karakter düşmedi** (yedekle
karşılaştırıldı) ve üç yazı tipinde de Türkçe harflerin hepsi çiziliyor.
`№ → ✓ ♈` zaten fontlarda yoktu, sistem fontuna düşüyorlar — bu kırpmayla
değişmedi.

**Yeniden kırparken:** `fonts.css` içindeki `font-weight: 400 700` fvar aralığıyla
uyumlu olmalı. Aralığı 500'e çekersen `.soru-eko` (font-weight belirtmiyor, 400'e
düşüyor) sessizce kalınlaşır.

## 4. kader.json şeması (v3)

| Alan | İşlevi |
|---|---|
| `ayar.donemGun` | Kaderin yeniden yazılma aralığı (gün). 7 = haftalık. |
| `ayar.donemBaslangic` | Dönem sayacının sıfır noktası. **Değiştirme** — eski linkler kayar. |
| `ayar.kaderAgirlik` | `olur`/`olmaz`/`belirsiz`/`kapandi` dağılımı. `kapandi` easter egg, düşük tut. |
| `ayar.konuAgirlik` · `tipAgirlik` · `tonAgirlik` · `tonAgirlikKorku` | Havuz karışım katsayıları. Korkulan sorularda ton havuzu ağır basar. |
| `ayar.konuEsik` · `ngramEsik` · `tekrarEsigi` | Konu kabul eşiği, bulanık eşleme eşiği, cevap içi tekrar eşiği. |
| `ekler` | **Arketip** yazımıyla ek şablonları. Türetim ekleri (lH, CH, lHK, sHz) bilinçli olarak YOK — "okulu"yu "oku"ya indiriyorlardı. |
| `soruEki` | mı/mi/mu/mü ve çekimli biçimleri; gövdelemeden önce ayıklanır. |
| `durak` | Tohuma ve konuya karışmaması gereken dolgu kelimeler. |
| `tipDesen` | Soru tipi tetikleyicileri. **ASCII katlanmış yazılır** ("ne zaman", "kac"). |
| `konular[x].kokler` | Konu sözlüğü. **KÖK biçiminde yaz** ("hasta", "hastalanmak" değil). Motor hem yazıldığı hem gövdelenmiş biçimi indeksler. |
| `korkuKokler` · `istekKokler` · `notrKokler` | Arzu ekseni sözlükleri. Yine kök biçiminde. |
| `hukum.ton[ton]` | Genel hükümler, **TON'a göre**: `mujde` / `uyari` / `teselli` / `ferah` / `belirsiz`. |
| `konuHukum[konu][ton]` | Konuya özel hükümler, yine tona göre. |
| `tipHukum[tip][kader]` | Soru tipine özel hükümler, **KADER'e göre** (`olur`/`olmaz`/`belirsiz`) ve **tondan bağımsız** yazılmalı: "Sandığından erken" hem beklenen hem korkulan olay için çalışır. |
| `okumaTip` / `okumaKonu` | Şerhin ilk cümlesi — sorunun okunması. |
| `tavsiye[ton]` | Şerhin ikinci cümlesi — kapanış, tona göre. |
| `ozel` | Birebir eşleşen sorular. Anahtar ASCII katlanmış ve noktalamasız yazılır. |
| `gunluk` | Günün Nasibi havuzu (takvim gününe bağlı, herkeste aynı). |
| `ciltler` | Cilt listesi; sıra önemlidir, dönem bu diziye göre döner. Eklersen CSS'te de `body[data-cilt="..."]` tanımla. |
| `burclar` | 12 burç: id, ad, simge, element (ates/toprak/hava/su), tarih aralığı. |
| `burcOkuma.element[x]` / `.genel` | Haftalık okuma = element cümlesi + genel cümle. |
| `ikili.hukum[bant]` | İki kişilik nasip, yüzde bandına göre: dusuk/orta/yuksek/cok. **Hiçbiri aşağılayıcı olamaz** — bu kural bilinçlidir, bozma. |
| `ikili.serh` | İkili kartın alt cümlesi; sonucu şakaya bağlar. |
| `kura.hukum` | Kura hükmü. `{secilen}` **tam bir kez** geçmeli (CI denetler) ve seçilen şıkka **ek getirilmez** — ünlü uyumu tutmaz, yalın bırak. |
| `kura.serh` | Kura kartının alt cümlesi. |
| `ebced.hane["1".."9"]` | İsim falı okuması, ebced toplamının rakam köküne göre. Dokuzu da dolu olmalı. |
| `ebced.serh` | İsim falı alt cümlesi. **En az bir tanesi "yaklaşık ebced" uyarısını taşımalı** — o dürüstlük notunu havuzdan çıkarma. |

Yeni cümle yazarken tek kural: **her satır noktasıyla biten, tek başına ayakta duran
bir cümle olsun.** Türkçe eklemeli olduğu için yuvaya isim/çekim sokulmaz; şablonlar
tam cümleleri yan yana dizer.

### Havuz payı nasıl belirlenir (içerik yazmadan önce oku)

`adaylastir()` ağırlığı **cümle başına** verir. Yani bir havuzun seçilme payı
**havuz boyu × ağırlık**'la orantılıdır. Üç havuz da her zaman yarışa girer;
hiçbiri diğerini devre dışı bırakmaz.

| havuz | anahtar | ağırlık | hücre başına |
|---|---|---|---|
| `hukum.ton[ton]` | TON | `tonAgirlik` **2** · korkulan soruda `tonAgirlikKorku` 6 | 20 |
| `tipHukum[tip][kader]` | KADER | `tipAgirlik` 3 (havuz boşsa 0) | 3 |
| `konuHukum[konu][ton]` | TON | `konuAgirlik` 3 | 12 |

Bir "aşk" evet/hayır sorusunda: ton 20×2 = 40, konu 12×3 = 36, tip 0
(`evet_hayir` ve `acik` `tipHukum`'da **yok**, bilerek — o havuz tondan bağımsız
yazılmak zorunda ve evet/hayır soruları tam da tonun en kritik olduğu yer).

**Ölçülmüş etkisi.** `konuHukum` hücre başına 3 iken konuya özel hüküm 48 sorunun
yalnızca %8'inde çıkıyordu; 12'ye çıkarılınca **%38**. Cevapların monotonlaşması
buradan geliyordu: neredeyse her hüküm tona göre 12 cümlelik genel havuzdan
geliyordu.

**Havuz büyütmek dengeyi kaydırır — bu tuzağa bir kere düşüldü.** Aşama 2'de
`hukum.ton` 12'den 20'ye çıkarılınca genel havuzun payı da büyüdü ve konuya özel
hüküm %38'den **%25'e düştü**; çeşitlilik arttı ama asıl istenen konu duygusu
zayıfladı. `tonAgirlik` 3→2 ile geri alındı. Ölçüm (48 soru):

| `tonAgirlik` | konuya özel | farklı hüküm | aynı soru 30 devirde |
|---|---|---|---|
| 3 | %25 | 44/48 | 26,3 |
| **2** | **%29** | **45/48** | **26,0** |
| 1 | %35 | 45/48 | 25,3 |

Tekrar çeşitliliği ağırlıktan neredeyse bağımsız, yani konu payını artırmanın
bedeli yok. Daha çok konu duygusu istenirse 1'e çekilebilir.

**`tonAgirlikKorku` 6 kalmalı.** Korkulan sorularda genel ton havuzunun ağır
basması bilinçli bir güvenlik payı: kötü habere kutlama basılmasın diye. Konu
havuzu da tona göre anahtarlı olduğu için teknik olarak güvenli, ama bu payı
düşürmek ayrı bir gerekçe ister.

**`konuHukum` TON'a, `tipHukum` KADER'e göre anahtarlanır.** Bu ikisi karıştı bir
kere: `cevapla()` `konuHukum`'u kader ile okuyordu, tek kesişen anahtar `belirsiz`
olduğu için 90 konu cümlesinin **72'si hiç seçilemiyordu** ve hiçbir test bunu
görmedi. `test-motor.mjs` §13 artık havuz **isabetini** ölçüyor; şema anahtarı ya
da okuma tarafı kayarsa orası kalır. Silme.

## 5. Testler

```bash
node test/test-motor.mjs        # 138 test: sesbilim, gövdeleme, morfotaktik, tip/arzu,
                                #           determinizm, kararlılık, dağılım, uç durumlar,
                                #           kura (ES kararlılığı), ebced, eski sayfalar
node test/test-guvenlik.mjs     # prototip anahtarları, enjeksiyon yükleri (kader + kura +
                                #           ebced kapılarından), dönem sınırları, CPU, tavanlar
node test/test-arayuz.mjs       # 203 test: ciltler (renk VE biçim), cilt seçici, 5 sekme,
                                #           mobil kaydırma, kura, ebced, eski sayfalar,
                                #           5 sekmenin PNG kartı, taşma, kontrast,
                                #           gerçek görünürlük, animasyon,
                                #           mühür kırma ritüeli (§10c), ışınsal parçalanma (§10d)
node test/test-tarayici.mjs     # 42 test: akış, paylaşım linki, dönem güvenliği,
                                #          fragment saldırıları, mobil, yedek veri, 404
node eval/degerlendir.mjs       # ölçüm koşusu → eval/RAPOR.md
```

Tarayıcı testleri `playwright-core` ister ve `executablePath`'i sabit `/opt/pw-browsers/chromium`
yolundan okur — bu CI konteynerinin yolu, geliştirme makinesinde yoktur. `PW_CHROMIUM`
ortam değişkeniyle sistemdeki tarayıcıya yönlendirilebilir:

```bash
npm i -D playwright-core
PW_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node test/test-arayuz.mjs
```

Son tam koşu: **motor 138/138, arayüz 203/203, tarayıcı 42/42, güvenlik 0 bulgu.**
Geçmiş: `2a4d9b0` arayüz 159 · mühür ritüeli +14 · kaydırma ve 5 sekme kartı +21 · ışınsal parçalanma +9.

**`kartAl()` yardımcısındaki kararsızlık — ölçüldü, düzeltildi.** Eski hâli "iki ardışık
okuma eşitse sayaç oturmuştur" varsayıyordu. Yetmiyor: sayaç `1-(1-p)³` ile yumuşadığı
için son karelerde değerler hedefin bir yanına toplanıyor ve aynı geçici rakam iki kez
okunabiliyor. Sonuç: `no` bir eksik okundu (5439 yerine 5440) ve **"uzak dönem yok
sayıldı" güvenlik testi sahte biçimde kaldı** — dönem kısıtında bir hata yokken.
Artık önce 900 ms animasyon süresi bekleniyor, kararlılık ondan sonra aranıyor.
Yeni bir zamanlama-duyarlı test yazarken aynı tuzağa dikkat.
CI (`.github/workflows/testler.yml`) bunlardan tarayıcı gerektirmeyenleri + veri
bütünlüğü, cümle biçimi, kura şablonu ve cilt biçim token'ı denetimlerini koşar;
hepsi bağımlılıksız, yalnızca Node çekirdeği.

**Tarayıcı testi tuzağı:** yalnızca hash değiştiren `goto` sayfayı yeniden yüklemez ve
inline script tekrar çalışmaz — test bayat kartı ölçer ve sahte "geçti" verir. `git(sayfa, hash)`
yardımcısı her gezinmeye benzersiz sorgu ekler; yeni fragment testinde onu kullan.

**Ölçüm yöntemi notu:** `eval/holdout.json` (140 soru) geliştirme sırasında hataları
incelenen settir, artık saf held-out değildir. `eval/test2.json` (100 soru) hiç
incelenmedi; **başarım iddiaları yalnızca onun üzerinden yapılmalı.** Yeni bir iddia
gerekirse yeni bir set yazdır, mevcut setlere göre ayar yapma.

İçerik değişikliğinden sonra en az `node test/test-motor.mjs` sıfır hata vermeli.

## 6. Güvenlik duruşu

Bağımsız bir inceleme yapıldı ve bulgular giderildi. Bozulmaması gerekenler:

* **`innerHTML` / `document.write` / `eval` / `new Function` kullanılmıyor.** Kullanıcı
  girdisi DOM'a yalnızca `textContent` üzerinden gider. Bu kuralı bozma; XSS'e karşı
  tek gerçek savunma bu.
* **Kullanıcı girdisinin anahtar olduğu her sözlük `Object.create(null)`.**
  (`oturumBellek`, `_durak`, `_ozel`.) Düz `{}` kullanılırsa "constructor" yazan
  ziyaretçi `Object.prototype`'ı yakalar ve kart "undefined" gösterir.
* **Linkten gelen dönem yalnızca güncel ya da bir önceki devirse kabul edilir.**
  Motor deterministik olduğu için sınırsız `d` seçimi, link yazan kişiye cevabı
  seçtiriyordu: `#q=X hırsız mı&d=3` → gerçek alan adında "NASİP VAR" mührü.
  Sınırı gevşetirsen bu karalama vektörü geri gelir.
* **Soru 140 karaktere kırpılır** (`AZAMI_SORU`) — `maxlength` yalnızca klavyeyi
  sınırlar, paylaşım linki sınırsızdır.
* **Gövde tekilleştirmesi sözlükle yapılır, `indexOf` ile değil.** `indexOf` O(n²) idi;
  ~1 MB'lık bir `#q` linki sekmeyi 5,5 saniye donduruyordu (düzeltmeden sonra 0,4 sn).
* **Soru adres çubuğuna yazılmaz.** `history.replaceState` bilinçli olarak kaldırıldı;
  yoksa sorular tarayıcı geçmişine ve tarayıcı hesabı senkronuna düşüyordu. Link
  yalnızca "Linki Kopyala"/"Paylaş" ile üretilir.
* **CSP meta etiketi** `index.html` head'inde. `'unsafe-inline'` var çünkü stil ve
  script gömülü; sıkılaştırmak istersen bloklara SHA-256 hash'i verip `'unsafe-inline'`ı
  kaldır — ama her düzenlemede hash'i güncellemen gerekir. `frame-ancestors` meta ile
  çalışmaz; GitHub Pages başlık koyduramadığı için clickjacking'e karşı koruma yoktur
  (sitede oturum/işlem olmadığı için kabul edilmiş kalıntı risk).

Kapatılmayan, bilinen kalıntılar:

* `project/` klasörü `https://nasiptevarsa.com/project/` altında yayında. Sır içermiyor
  ama gereksiz yüzey ve eski bağımlılık listesini ifşa ediyor. Silinmesi öneriliyor;
  içerik zaten `eski-site` dalında ve git geçmişinde duruyor.
* Sorunun kendisi paylaşım linkinde açık metin taşınır. Fragment sunucuya gitmez ve
  `Referer`'a girmez, ama linki alan kişi soruyu görür — tasarım gereği.

## 7. Bilinenler ve sınırlar

* **Gövdeleme sözlüksüz.** Yüksek frekanslı çekim ekleri elle listelenmiştir; nadir
  kelimelerde yanlış soyabilir. Türetim ekleri (`li/lu/ci/cu/gi/gu/si/su`) bilerek listede
  **yok** — "okulu" → "oku" gibi hataya yol açıyorlardı. Yeni ek eklerken bu tuzağa dikkat.
* **Kısa konu kökleri (<4 harf) yalnızca birebir eşleşir** — bu yüzden türemiş
  biçimi ayrıca kök olarak yazmak gerekebilir. Ölçüldü: "Küslüğümüz bitecek mi?"
  gövdesi `kusluk` çıkıyor, kök `küs` ise 3 harf olduğu için önek eşleşmesine
  girmiyordu ve soru `genel`'e düşüyordu; `küslük` kökü eklenince eşleşti.
  Yeni konu yazarken kısa kökün uzun akrabalarını da listele. "zam" kökünün "zaman"
  jetonunu yakalaması bu yüzden engellendi. Kural `kader.js` → `konuBul` içinde.
* **Gerçek kullanıcı sorularıyla ölçülmedi.** Gövdeleme ve konu isabeti yalnızca testteki
  ~40 örnek soruda doğrulandı; saha isabeti bilinmiyor. İddia edilen bir doğruluk oranı yok.
* `file://` ile açınca `kader.json` CORS'a takılır ve site gömülü **yedek** veriye düşer
  (çalışır ama havuz küçüktür). Yerel bakarken `python3 -m http.server` kullan.
* Dönem sınırı UTC gece yarısında döner; sınırı geçerken sayfayı yenileyen kullanıcı
  cevabın değiştiğini görebilir. Kabul edilmiş davranış.
* **Ton çeşitliliği soru başına 3 ile sınırlı.** `tonBul(kader, arzu)` içinde arzu yalnızca
  soruya bağlı, döneme değil. Kader üç değer alabildiği için tek bir soru asla beş tonun
  üçünden fazlasını üretemez. Ölçtük: "Bu yıl işimi değiştirmeli miyim?" 200 devir boyunca
  yalnızca müjde/teselli/belirsiz döndü; uyarı ve ferah hiç çıkmadı. Tutarlılık açısından
  savunulabilir bir tasarım ama **bilinen bir tavandır**, kaza değil.
* **İsim falının ebcedi yaklaşıktır.** Latin→Arap harf eşlemesi kayıplı (s = sin/sad/se).
  Üretilen sayı klasik bir ebced hesabının yerine geçmez; arayüz de bunu söylüyor.
* **Sıfır depolama sözü hâlâ geçerli.** localStorage, çerez, sunucu yok. "Eski sayfalar"
  özelliği geçmişi saklamıyor, her seferinde yeniden hesaplıyor. Seri/rozet gibi ilerleme
  mekanikleri bu sözü bozmadan yapılamaz — istenirse önce sözün değişmesi gerekir.

## 8. Sürüm ve geri dönüş

* `eski-site` dalı = 2019–2022 arası eski Vue sitesi (commit `2fdc1e3`). Bozulmadan duruyor.
* Geri dönmek: `git push origin eski-site:master --force` (ya da GitHub'dan revert).
* v2 öncesi (yeni tasarım, eski basit motor) hâli: `00f6f1b`…`141203e` aralığı.

## 9. Push notu

Bu repo Cowork bulut oturumundan `git push` ile **itilemedi**: oturumun git proxy'si
`Kelebek-01/NasipteVarsa`'yı yetkili repo listesinde görmediği için 403 döndü. Token gömmek
de API de çalışmıyor. Claude Code yerelden normal şekilde push edebilir; bu bir Cowork
sandbox kısıtı, repo ayarı değil.

## 10. Sıradaki işler (öneri)

1. İçerik büyütme: `konuHukum` ve `tavsiye` havuzları en çok görülen yerler, en çok onlar
   büyümeli. Kutup oranını (~33/30/35) koru. `kura.hukum` ve `ebced.hane` de yeni ve dar.
2. **Konu sayısı 10** (ask, para, is, saglik, egitim, yol, aile, arkadaslik, ev, hukuk).
   Dördü v3.4'te eklendi. Ölçüm (88 soru): `genel`'e düşen soru **%55 → %27 → %5**,
   konuya özel hüküm **%14 → %19 → %26**. Eksik kalan alanlar: kayıp eşya, hayvan,
   askerlik, teknoloji. Yeni konu eklemek: `konular`'a kök listesi + `konuHukum` ve `okumaKonu`'ya karşılık
   yaz. Kod değişikliği gerekmez.
3. Kayıt numarasına dönem harfi eklemek (ör. "№1983-D31") kartın koleksiyonluk hissini artırır.
4. ~~Kura ve isim falı için de PNG kart üretmek~~ — **yapıldı (v3.3)**, beş sekmede de var.
5. Masaüstünde "açık defter" (iki sayfalı) düzeni: 1200px'te içerik 620px'lik tek sütunda
   duruyor, yanlar boş. Metaforu güçlendirir ama taşma testinin geniş ekranı da ölçmesi gerekir.
6. Arzu ekseni %59 (çoğunluk temeli %40). İyileştirmek için **üçüncü bir bağımsız ölçüm
   seti** yazdırmak gerekir; `holdout.json` artık saf değil, `test2.json` harcanmamalı.
