# Güvenlik Politikası

## Kapsam

nasiptevarsa.com tamamen statik bir sayfadır. Sunucu tarafı kod, veritabanı,
kullanıcı hesabı ve ödeme yoktur. Sayfa GitHub Pages üzerinden `master` dalının
kökünden yayınlanır.

Site hakkında bilinmesi gerekenler:

- Üçüncü parti script, analitik veya reklam yoktur. Fontlar repo içinde barındırılır.
- Çerez, `localStorage`, `sessionStorage` ve `indexedDB` **kullanılmaz**.
- Sorulan soru sunucuya gönderilmez. Cevap tarayıcıda, `kader.json` içindeki
  metinlerden deterministik olarak üretilir. Yapay zekâ veya dış API yoktur.
- Sayfanın yaptığı tek ağ isteği kendi `kader.json` dosyasıdır.
- Paylaşım linkindeki soru URL fragment'ında (`#q=`) taşınır; fragment sunucuya
  gönderilmez ve `Referer` başlığına girmez. Ancak linki paylaşan kişinin
  cihazında tarayıcı geçmişine düşebilir.

## Desteklenen sürüm

Yalnızca `master` dalının yayındaki güncel hâli desteklenir. Eski commit'ler ve
`eski-site` dalı arşiv amaçlıdır, güvenlik güncellemesi almaz.

## Açık bildirimi

Bir güvenlik açığı bulursan lütfen **herkese açık issue açma**. Bunun yerine
repo üzerinden özel güvenlik bildirimi (Security → Report a vulnerability) aç
ya da repo sahibine GitHub üzerinden ulaş: https://github.com/Kelebek-01

Beklentiler: bildirimler tek kişilik bir hobi projesinde değerlendirilir, bu
yüzden yanıt süresi garanti edilemez. Kabul edilen bulgular `master`'a
düzeltme olarak girer ve commit mesajında bildiren kişiye teşekkür edilir.
Ödül programı yoktur.

## Kapsam dışı

- `project/` klasörü: 2019 tarihli, artık kullanılmayan Vue kaynağıdır.
  Yayınlanan sayfa tarafından yüklenmez.
- Sayfanın ürettiği fal metinleri eğlence amaçlıdır; içeriğe dair şikâyetler
  güvenlik bildirimi olarak değerlendirilmez.
