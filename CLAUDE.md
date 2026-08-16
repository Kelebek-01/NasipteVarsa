# NasipteVarsa — ajan kuralları

Her oturumda otomatik yüklenir. **Kısa tutulmuştur; derinlik `HANDOVER.md`'de.**
Buradaki her madde en az bir kez ısırdı.

## 0. Bu repo hakkında

Türkçe "kader defteri". Tamamen statik: sunucu yok, model yok, çerez yok,
`localStorage`/`sessionStorage` yok. Tek dış istek kendi `kader.json`'ı.
Canlı: nasiptevarsa.com · GitHub Pages, `master` kökten (push = yayın).

## 1. İddia etmeden önce koş

```bash
node test/test-motor.mjs      # 158 · saf Node
node test/test-guvenlik.mjs   #     · saf Node
node .github/cilt-denetimi.mjs
PW_CHROMIUM="$PW_CHROMIUM" node test/test-arayuz.mjs     # 222 · playwright-core
PW_CHROMIUM="$PW_CHROMIUM" node test/test-tarayici.mjs   #  42
```

`.claude/settings.local.json` `PW_CHROMIUM`'u zaten tanımlıyor. CI tarayıcı
testlerini **koşmaz** — onları elle koşmak sana kalmış.

**Belgelerden iddia devralma.** Bu repoda `HANDOVER.md` iki kez bayat çıktı:
test sayısı yanlıştı ve "tipHukum genel havuzu devre dışı bırakır" maddesi
kodla çelişiyordu. Bir sayı yazacaksan önce ölç.

## 2. Bozulmayacak güvenlik özellikleri

- **`innerHTML` / `eval` / `new Function` / `document.write` YOK.** Kullanıcı
  girdisi DOM'a yalnızca `textContent` ile gider. XSS'e karşı tek gerçek savunma.
- **Kullanıcı girdisinin ANAHTAR olduğu her sözlük `Object.create(null)`.**
  Düz `{}` kullanılırsa "constructor" yazan ziyaretçi `Object.prototype`'ı yakalar.
  (`oturumBellek`, `_durak`, `_ozel`, `_esKorku`, `_esIstek`.)
- **Linkten gelen dönem yalnızca güncel ya da bir önceki devirse kabul edilir.**
  Motor deterministik; sınırı gevşetmek link yazana cevabı seçtirir.
- Soru 140 karaktere kırpılır. Soru adres çubuğuna yazılmaz.
- CSP `default-src 'none'`, `font-src 'self'`. Gevşetme.

## 3. Değer kararları — kod değil, sor

- **Sıfır depolama sözü.** Service worker, seri/rozet, geçmiş saklama… hepsi bu
  sözü bozar. "Çevrimdışı çalışsın" cazip gelirse **önce sor**.
- `ayar.donemBaslangic` (2024-01-01) **değiştirilmez** — eski linkler kayar.
- `ikili.hukum` cümlelerinin hiçbiri aşağılayıcı olamaz.
- Ebced ve burç açısı şerhlerindeki dürüstlük uyarıları havuzdan çıkarılmaz
  ("yaklaşık ebced", "açı ölçüdür, yorum defterin sözü").

## 4. `kader.json` yazarken

Şema anahtarları farklıdır, karıştırma:

| havuz | anahtar |
|---|---|
| `hukum.ton` · `konuHukum[konu]` · `tavsiye` | **TON** (mujde/uyari/teselli/ferah/belirsiz) |
| `tipHukum[tip]` | **KADER** (olur/olmaz/belirsiz) |
| `esdizim` | motorun **ürettiği gövde** çifti (`zam`→`za`, `tayin`→`tay`) |

`konuHukum` bir ara KADER ile okunuyordu; tek kesişen anahtar `belirsiz` olduğu
için **90 cümlenin 72'si ölüydü** ve hiçbir test görmedi. `test-motor.mjs` §13
artık havuz *isabetini* ölçüyor.

**Havuz büyütmek payı da büyütür.** Seçim ağırlığı cümle başınadır, yani pay =
havuz boyu × ağırlık. `hukum.ton` 12→20 yapılınca konuya özel hüküm %38'den
%25'e düştü. `HANDOVER.md` §"Havuz payı" tablosuna bak.

Her satır noktasıyla biten, tek başına ayakta duran bir cümle. Çift boşluk yok.
Yeni konu eklemek kod değişikliği gerektirmez.

## 5. Ölçüm setleri bir bütçedir

`eval/holdout.json` kirli, `eval/test2.json` harcanmış (ayar için kullanılabilir),
`eval/test3.json` kısmen harcanmış. **Ayarı test2'de yap, test3'e tek kez bak.**
Yeni set yazdırmak geri alınamaz bir karardır — sor.

Arzu ekseni ~%59'da; iki hipotez ölçülüp reddedildi (bkz. `eval/RAPOR.md` §7).
Ölçüm için önemli olan üç sınıflı doğruluk değil, **`korkulan` tespiti** — çünkü
`tonBul` içinde `notr` ile `istenen` aynı tonu üretir.

## 6. Test yazarken bilinen tuzaklar

- `page.click(".muhur-kir")` mührü **kırmaz** (pointer yolu tutmayı iptal eder).
  `focus` + `Enter` kullan.
- `delete navigator.share` **çalışmaz** — özellik prototipte.
- Sayaç animasyonu bitmeden kayıt numarası okunursa geçici rakam gelir.
- `display:contents` bozulursa mobil düzen bozulur ama **taşma testleri yakalamaz**.
- Testleri hep `reducedMotion:"reduce"` ile koşma; animasyonlu yoldaki hatalar kaçar.

## 7. Çalışma alışkanlığı

Değişiklik → ölç → belgele → commit. Commit mesajı **ne ölçüldüğünü** yazsın,
ne yapıldığını değil. `master`'a push canlıya çıkar; push etmeden önce sor.
