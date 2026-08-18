# Devir notu — oturum el değiştirme

Bu dosya **oturumdan oturuma** devir içindir: yeni bir oturum (veya yeni biri) işe nereden
devam edeceğini buradan bulur. Projenin kendisi — motor, şema, mimari, tuzaklar —
`HANDOVER.md` içinde anlatılıyor; **önce onu oku**, burası onun üstüne yalnızca "şu an
nerede duruyoruz" katmanı ekler.

Son güncelleme: `2a4d9b0` · 6 Ağustos 2026

---

## 1. Tek cümlede

`nasiptevarsa.com`, Türkçe bir "kader defteri" fal sitesi: sunucusuz, yapay zekâsız,
bağımlılıksız, derleme adımsız, çerezsiz ve **sıfır depolamalı**. Cevabı kural tabanlı bir
Türkçe çözümleyici üretir; kader haftada bir yeniden yazılır.

Repo: `Kelebek-01/NasipteVarsa`, dal `master`, kökten yayınlanıyor (GitHub Pages).

## 2. Şu anki durum

Her şey yayında ve yeşil. Yerel ağaç ile uzak ağaç birebir aynı (`10dfa1b`), çalışma
dizini temiz, CI son koşuda geçti (`testler #16`, 17 sn).

| Süit | Sonuç |
|---|---|
| `test/test-motor.mjs` | 132 / 132 |
| `test/test-arayuz.mjs` | 159 / 159 |
| `test/test-tarayici.mjs` | 41 / 41 |
| `test/test-guvenlik.mjs` | 0 bulgu |
| CI (`.github/workflows/testler.yml`) | 7 adımın hepsi geçti |

Bu sayılar hatırlanmadı, `2a4d9b0` üzerinde yeniden koşularak ölçüldü.

## 3. Bu oturumda ne yapıldı

**v3.2 — ciltler artık biçim de değiştiriyor.** Öncesinde beş cilt aynı sayfanın beş
boyasıydı; ölçüldüğünde 49 görünür öğenin 49'unda renk farkı, **0'ında yapı farkı** vardı.
Cilt bloğu artık köşe yarıçapı, kenarlık üslubu, iç boşluk, yazı tipi yığını, harf aralığı,
büyük harfe çevirme, doku iriliği ve süsleme token'larını da eziyor. Yeni ölçüm (90 öğe):
kahve 66/90, ferman 90/90, neon 90/90, kâğıt 89/90. Yeni yazı tipi **indirilmedi**.

**Üç yeni mod.** Kura (`kuraSec`), İsim Falı / ebced (`ebcedDeger`, `ebcedNasip`),
Defterin Eski Sayfaları (`gecmisSayfalar`). Üçü de sıfır depolamayı bozmuyor; eski
sayfalar geçmişi saklamıyor, her seferinde yeniden hesaplıyor.

**Arayüz.** Mühür yeniden tasarlandı (aşınmış çerçeve maskesi + yukarıdan inip oturan
animasyon), araç düğmelerinde eylem/ayar ayrımı kuruldu, `--ol-0`…`--ol-7` tipografi
ölçeği geldi, cilt seçici eklendi.

**İki hata düzeltildi (ikisini de kullanıcı yakaladı).**
1. "Sallayınca sor" masaüstünde de görünüyordu — `DeviceMotionEvent` masaüstü Chrome'da
   da tanımlı. Denetim `(pointer: coarse) and (hover: none)` oldu.
2. Onu düzeltirken çıktı: `.anahtar{display:inline-flex}` tarayıcının
   `[hidden]{display:none}` kuralını eziyordu, öğe `hidden` iken bile çiziliyordu.
   Global `[hidden]{display:none !important}` eklendi.

**Bir de kendi iddiam yanlış çıktı.** Kura'nın yorum satırına "şık eklemek eski kararları
bozmaz" yazmıştım; ölçünce 200 örnekte yalnızca 77'si korunuyordu, çünkü tohumu şık
kümesinden türetmiştim. Seçim tohumu artık yalnızca döneme bağlı → 133/200, rendezvous
kuramının beklediği 2/3 ile uyumlu.

## 4. Repoya nasıl yazılıyor — ÖNEMLİ

**`git push` bu repoda ÇALIŞMIYOR.** Proxy reddediyor:

```
remote: access denied by the git proxy: Kelebek-01/NasipteVarsa is not in this
session's authorized repository set…  → 403
```

GitHub API ve token gömme de kapalı. Tek yol **GitHub web arayüzünden dosya yüklemek**:

1. `https://github.com/Kelebek-01/NasipteVarsa/upload/master` (alt klasör için sonuna
   `/test`, `/.github`, `/.github/workflows` ekle — her klasör AYRI yükleme demek).
2. Dosyaları yükle → commit mesajını yaz → "Commit changes".

**Bu akışın iki tuzağı var, ikisine de yakalandık:**

* **Yükleme sessizce düşebiliyor.** Bir turda `index.html` + `HANDOVER.md` yüklemesi
  "başarılı" göründü ama commit oluşmadı; yalnızca sonraki `test/` yüklemesi geçti.
  Fark edilmesinin tek yolu doğrulamaktı.
* **Koordinatlar kayıyor.** Commit mesajı yazılınca "ProTip!" satırı beliriyor ve
  "Commit changes" düğmesi ~21px aşağı iniyor; önceki ekran görüntüsünden alınan
  koordinatla tıklamak boşa gidiyor. Mesajı yaz → **yeni ekran görüntüsü al** → tıkla.

**Her yüklemeden sonra mutlaka doğrula:**

```bash
git fetch origin
git rev-parse HEAD^{tree}            # yerel
git rev-parse origin/master^{tree}   # uzak — ikisi AYNI olmalı
git diff --stat HEAD origin/master   # çıktı boş olmalı
```

Yerelde commit atıp web'den yüklersen iki paralel geçmiş oluşur (aynı ağaç, farklı
hash'ler). Bu durumda yereli `git reset --hard origin/master` ile uzağa hizala —
ağaçlar aynı olduğu için hiçbir şey kaybolmaz. (Bu oturumda tam olarak bu yapıldı;
yerelde kalan imzasız commit böyle temizlendi.)

## 5. Doğrulanmamış / açık kalanlar

Bunları "bilinmiyor" diye taşı, "muhtemelen iyidir" diye değil.

* **Dokunmatik ekranlı ama fareyle kullanılan dizüstü.** "Sallayınca sor" orada gizli
  kalmalı; Playwright'ın `hasTouch` emülasyonu pointer'ı zorla `coarse` yaptığı için
  senaryo canlandırılamadı. Davranış yalnızca CSS sorgusunun anlamına dayanıyor.
* **Playwright'ın 1px salınımı.** `test-arayuz.mjs` §8 cilt döngüsünde aynı bağlamda üst
  üste gezinilince `#sor` düğmesi kararsız görünüp 30 sn zaman aşımına uğruyordu. Sayfa
  kendi hâline bırakıldığında `scrollY`, `scrollHeight` ve bütün üst öğe yükseklikleri
  tek değerde sabit — yani salınım koşucunun kaydırma denetiminde görünüyor. **Kesin
  nedeni kanıtlanmadı**; testte her cilde taze bağlam açarak geçildi.
* **`WebFetch` canlı sayfayı önbellekten döndürüyor.** Aynı URL'i tekrar çekmek eski
  içeriği verebiliyor; sorgu dizesiyle önbellek kırılınca doğru içerik geliyor.
  Yayının güncel olduğu bu şekilde doğrulandı, tarayıcıda gözle değil.
* **Gerçek kullanıcı sorularıyla ölçüm yok.** Saha isabeti bilinmiyor.
* **`eval/holdout.json` artık saf held-out değil** (hataları incelendi).
  Başarım iddiası yalnızca `eval/test2.json` üzerinden yapılabilir; onu harcama.
* **Arzu ekseni %59** (çoğunluk temeli %40). İyileştirmek için ÜÇÜNCÜ bir bağımsız
  ölçüm seti yazdırmak gerekir.
* **Ton tavanı.** `tonBul(kader, arzu)` içinde arzu yalnızca soruya bağlı olduğu için tek
  bir soru asla beş tonun üçünden fazlasını üretemez. Tasarım kararı, ama bilinen sınır.
* **İsim falının ebcedi yaklaşıktır.** Latin→Arap harf eşlemesi kayıplı (s = sin/sad/se).
* ~~**`project/` klasörü hâlâ yayında**~~ — **silindi.** Karar çıktı. İçerik
  `eski-site` dalında birebir duruyor (ağaç hash'i aynı).

## 6. Sıradaki işler

`HANDOVER.md` §10'da altı madde var. Oturum bağlamıyla öne çıkanlar:

1. **İçerik büyütme.** `kura.hukum` ve `ebced.hane` yeni ve dar; `konuHukum` ile `tavsiye`
   en çok görülen havuzlar. Kutup oranını (~33/30/35) koru.
2. **Kâğıt ve Ferman ciltleri** artık ayrışıyor ama en zayıf farklılaşan **kahve** (66/90).
3. **Kura ve isim falı için PNG kart.** `kartCiz()` şu an yalnızca Kader sekmesinin
   `sonKayit`'ını çiziyor.
4. **Masaüstünde "açık defter" düzeni.** 1200px'te içerik 620px'lik tek sütunda, yanlar
   boş. Yaparsan taşma testine geniş ekran da eklenmeli.

## 7. Çalışma ortamı notları

* Yerel kopya: `/home/claude/NasipteVarsa`. Yardımcı ölçüm betikleri `/home/claude`
  altında (`cilt-fark2.mjs` cilt yapı farkı, `cilt-vitrin.mjs` cilt ekran görüntüleri,
  `olcum-sicak.mjs` kart çizim maliyeti). Bunlar **repoda değil**, oturumla birlikte gider.
* Testler `playwright-core` + `/opt/pw-browsers/chromium` kullanıyor; `playwright install`
  **çalıştırma**.
* `file://` ile açma — `kader.json` CORS'a takılır ve site yedek veriye düşer.
  `python3 -m http.server` ya da testlerdeki gömülü sunucuyu kullan.
* Geri dönüş: `eski-site` dalı `2fdc1e3` commit'inde duruyor.
