# NasipteVarsa — Devir Notu (Claude Code için)

Canlı: https://nasiptevarsa.com · Repo: `Kelebek-01/NasipteVarsa` · Yayın: GitHub Pages, `master` dalı kökten.
Bu dosya `TASARIM-NOTLARI.md`'nin yerine geçer; oradaki "aynı soruya hep aynı cevap" kuralı v2'de değişti.

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
og.png       1200×630 paylaşım görseli · favicon.svg · apple-touch-icon.png
CNAME        nasiptevarsa.com
project/     Eski Vue kaynağı. Yayına dahil değil, tarihsel; silinebilir.
```

## 3. Kader motoru (kader.js)

Boru hattı — kural tabanlı, model yok:

```
düzle (tr-TR küçük harf, noktalama at)
  → katla (ASCII: ı→i, ş→s, ğ→g, ü→u, ö→o, ç→c) — "sinav" ile "sınav" aynı olsun diye
  → böl → durak kelimeleri ve soru zarflarını (mı/mi/mu/mü…) ayıkla
  → gövdele (yinelemeli en-uzun-ek soyma + ünsüz sertleştirme + ikiz ünsüz)
  → soru tipi (secim / zaman / nicel / kisi / yer / neden / nasil / evet_hayir / acik)
  → konu (gövde sözlüğü puanlaması: ask, para, is, saglik, egitim, yol, genel)
  → tohum = splitmix32( FNV-1a(sıralı benzersiz gövdeler) XOR splitmix32(dönem) )
  → mulberry32 PRNG → kutup seç → hüküm / okuma / tavsiye havuzlarından çek
```

Yaklaşım ELIZA'nın (Weizenbaum, MIT, 1966) desen-eşleme + şablon-dönüşüm fikrinin Türkçeye
uyarlanmış hâli. Akademik yenilik iddiası yok; sağlam ve tam deterministik bir mühendislik.

**Şablonlar dilbilgisi açısından güvenli kurgulanmıştır:** her parça kendi başına tam bir
cümledir, yuvaya isim/çekim sokulmaz. Türkçe eklemeli bir dil olduğu için "{konu}'ya" gibi
yuvalar bozuk cümle üretir — bu yüzden bilinçli olarak kaçınıldı. Yeni içerik eklerken
aynı kurala uy: **her satır noktasıyla biten, tek başına ayakta duran bir cümle olsun.**

### Kader modu: dönem tohumu

Tohuma bulunulan **dönem** (varsayılan 7 gün) karışır. Sonuç:

* Aynı soru, aynı dönem → hep aynı cevap. Kelime sırası, büyük/küçük harf, noktalama ve
  dolgu kelimeler ("acaba", "ya", "ki") sonucu **değiştirmez**.
* Dönem dönünce kader yeniden yazılır. Kartta bitiş tarihi yazılı.
* Aynı oturumda tekrar sorulursa bellekteki `oturumBellek` sözlüğünden döner (depolama yok).

`localStorage` bilinçli olarak **kullanılmadı**: (a) sıfır depolama duruşunu bozardı,
(b) her cihazda farklı kader olurdu, (c) `#q=` paylaşım linki arkadaşına senin gördüğünden
başka cevap gösterirdi. Dönem tohumu üçünü de çözer. Paylaşım linki `#q=<soru>&d=<dönem>`
biçiminde dönemi de taşır, böylece **aynı devir içinde** paylaşılan link herkese aynı
kaydı gösterir. Daha eski bir `d` değeri güvenlik gereği yok sayılır (bkz. §6) ve link
güncel kaderi gösterir — kader zaten değiştiği için doğru davranış budur.

## 4. kader.json şeması

| Alan | İşlevi |
|---|---|
| `ayar.donemGun` | Kaderin yeniden yazılma aralığı (gün). 7 = haftalık. |
| `ayar.donemBaslangic` | Dönem sayacının sıfır noktası. **Değiştirme** — tüm eski linkler kayar. |
| `ayar.kutupAgirlik` | var/yok/bekle/kapandi dağılımı. `kapandi` easter egg, düşük tut. |
| `ayar.konuAgirlik` / `tipAgirlik` / `genelAgirlik` | Havuz karışım katsayıları. |
| `durak` | Tohuma ve konuya karışmaması gereken dolgu kelimeler. |
| `tipDesen` | Soru tipi tetikleyicileri. **ASCII katlanmış yazılır** ("ne zaman", "kac"). |
| `konular[x].kokler` | Konu sözlüğü. Türkçe yazılır, motor gövdeleyip eşleştirir. |
| `hukum[kutup]` | Genel hükümler (büyük cümle). |
| `konuHukum[konu][kutup]` | Konuya özel hükümler. |
| `tipHukum[tip][kutup]` | Soru tipine özel hükümler ("ne zaman"a tarih diliyle cevap). |
| `okumaTip` / `okumaKonu` | Şerhin ilk cümlesi — sorunun okunması. |
| `tavsiye[kutup]` | Şerhin ikinci cümlesi — kapanış. |
| `ozel` | Birebir eşleşen sorular. Anahtar ASCII katlanmış ve noktalamasız yazılır. |
| `gunluk` | Günün Nasibi havuzu (takvim gününe bağlı, herkeste aynı). |

`tipHukum[tip][kutup]` doluysa genel havuz devre dışı kalır — "Yüzde elli" cümlesi
"ne zaman" sorusunu cevaplamaz diye. Bunu bozma.

## 5. Testler

```bash
node test-motor.mjs        # 64 test: gövdeleme, tip, konu, determinizm, dağılım, uç durumlar
node test-guvenlik.mjs     # prototip anahtarları, enjeksiyon yükleri, dönem sınırları, CPU
node test-tarayici.mjs     # 41 test: akış, paylaşım linki, dönem güvenliği, fragment saldırıları,
                           #          mobil, yedek veri, 404
```

**Tarayıcı testi tuzağı:** yalnızca hash değiştiren `goto` sayfayı yeniden yüklemez ve
inline script tekrar çalışmaz — test bayat kartı ölçer ve sahte "geçti" verir. Bu yüzden
`git(sayfa, hash)` yardımcı fonksiyonu her gezinmeye benzersiz bir sorgu ekler. Yeni
fragment testi yazarken bunu kullan.

Test dosyaları repoda değil, oturum çalışma alanındaydı. Kalıcı hâle getirmek istersen
repoya `test/` altına taşı. `test-tarayici.mjs` `playwright-core` ister ve kendi statik
sunucusunu 8099'da ayağa kaldırır.

İçerik değişikliğinden sonra en azından şunu doğrula: `node test-motor.mjs` sıfır hata
vermeli — bozuk çıktı, boş yuva, çift boşluk, noktasız cümle ve kutup dengesi orada denetlenir.

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
* **Kısa konu kökleri (<4 harf) yalnızca birebir eşleşir.** "zam" kökünün "zaman"
  jetonunu yakalaması bu yüzden engellendi. Kural `kader.js` → `konuBul` içinde.
* **Gerçek kullanıcı sorularıyla ölçülmedi.** Gövdeleme ve konu isabeti yalnızca testteki
  ~40 örnek soruda doğrulandı; saha isabeti bilinmiyor. İddia edilen bir doğruluk oranı yok.
* `file://` ile açınca `kader.json` CORS'a takılır ve site gömülü **yedek** veriye düşer
  (çalışır ama havuz küçüktür). Yerel bakarken `python3 -m http.server` kullan.
* Dönem sınırı UTC gece yarısında döner; sınırı geçerken sayfayı yenileyen kullanıcı
  cevabın değiştiğini görebilir. Kabul edilmiş davranış.

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
   büyümeli. Kutup oranını (~33/30/35) koru.
2. Yeni konu eklemek: `konular`'a kök listesi + `konuHukum` ve `okumaKonu`'ya karşılık
   yaz. Kod değişikliği gerekmez.
3. `test-motor.mjs`'i repoya al ve GitHub Actions ile her push'ta çalıştır.
4. Kayıt numarasına dönem harfi eklemek (ör. "№1983-D31") kartın koleksiyonluk hissini artırır.
