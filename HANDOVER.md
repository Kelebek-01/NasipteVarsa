# NasipteVarsa — Devir Notu (Claude Code için)

Canlı: https://nasiptevarsa.com · Repo: `Kelebek-01/NasipteVarsa` · Yayın: GitHub Pages, `master` dalı kökten.
Motor sürümü: **v3**. Bu dosya `TASARIM-NOTLARI.md`'nin yerine geçer.

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

Yeni cümle yazarken tek kural: **her satır noktasıyla biten, tek başına ayakta duran
bir cümle olsun.** Türkçe eklemeli olduğu için yuvaya isim/çekim sokulmaz; şablonlar
tam cümleleri yan yana dizer.

`tipHukum[tip][kader]` doluysa genel havuz devre dışı kalır — "Yüzde elli" cümlesi
"ne zaman" sorusunu cevaplamaz diye. Bunu bozma.

## 5. Testler

```bash
node test/test-motor.mjs        # 88 test: sesbilim, gövdeleme, morfotaktik, tip/arzu,
                                #          determinizm, kararlılık, dağılım, uç durumlar
node test/test-guvenlik.mjs     # prototip anahtarları, enjeksiyon yükleri, dönem sınırları, CPU
node test/test-tarayici.mjs     # 41 test: akış, paylaşım linki, dönem güvenliği,
                                #          fragment saldırıları, mobil, yedek veri, 404
node eval/degerlendir.mjs       # ölçüm koşusu → eval/RAPOR.md
```

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
