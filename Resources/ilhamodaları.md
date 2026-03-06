Kibele
"İlham Odaları" (Inspiration Hubs) Modülü Teknik Özeti
1. Kullanıcı Rolleri ve Yetkileri
Sistemde bu modül özelinde iki ana rolümüz var:
●
●
Admin / Sanatçı (Kibele Hoca): CRUD yetkilerine sahip. Oda açabilir, kapatabilir,
gelen istekleri onaylayabilir/reddedebilir. Herkesin gizli/açık tüm bireysel panolarını
görebilir ve bunlara yorum/görsel ekleyebilir.
Öğrenci (Student): Sadece katılım isteği gönderebilir. İçeri alındığında kendi
bireysel alanını ve ortak panoyu yönetebilir. Diğer öğrencilerin "gizli" panolarını
göremez.
2. Odanın Yaşam Döngüsü (Oluşturma ve Katılım)
●
●
Oda Modeli: Her odanın bir başlığı (örn: VCD141. Asg1), açıklaması (2 haftalık kitap
tasarımı ödevi), bir deadline (bitiş tarihi) verisi ve isActive (boolean) durumu
olacak.
Katılım Akışı (Request to Join):
○
Öğrenci odayı "Aktif" görür ve "Katılma İsteği Gönder" butonuna basar.
○
Öğrencinin statüsü pending (beklemede) olur.
○
Kibele Hoca bu isteği onayladığında statü approved (onaylandı) olur ve
öğrenciye odanın içi render edilir.
3. Odanın İçi: Çift Sekmeli Yapı (Workspace)
İçeri giren öğrenci arayüzde iki ana alan görecek:
A. Bireysel Çalışma Alanı (Personal Workspace)
●
●
●
Gizlilik Durumu (Privacy State): Öğrencinin bir isPublic (boolean) toggle'ı
olacak. Default olarak gizli veya açık başlayabilir.
İşlev: Öğrenci kendi moodboard'unu oluşturur, referans biriktirir.
Hoca Etkileşimi: Bu alan isPublic = true olsa bile, sadece o öğrenci ve Kibele
Hoca tarafından editlenebilir. Hoca, öğrencinin fikirlerini desteklemek için bu alana
özel metin veya görsel ekleyebilir (Özel bir yorum/feedback component'i).
B. Ortak İlham Panosu (Public Shared Board)
●
●
İşlev: Odaya kabul edilen herkesin (hoca + tüm öğrenciler) yazma ve okuma
yetkisinin olduğu ortak bir havuz.
İçerik Ekleme Yöntemleri:
1. Lokal Upload: Cihazdan görsel yükleme.
2. Metin Girdisi: Fikir veya not yazabilme.
3. Artsy API Entegrasyonu ("Derinlikli Kürasyon"): Burası kritik. Kullanıcı bir
butona bastığında Artsy API'a bağlanıp filtreleme (Medium, Rarity, Price,
Size, Color, Time Period) yapabileceği bir modal/sidebar açılacak. Arama
sonucunda gelen görsellerden seçtiklerini doğrudan ortak panoya
"kaydedebilecek" (Görselin URL'ini ve meta verisini DB'ye yazacağız).
4. Kapanış ve Arşiv Modu (End State)
●
●
●
●
Deadline Tetikleyicisi: Belirlenen süre (örn: 2 hafta) dolduğunda odanın isActive
durumu falsea çekilir.
Read-Only (Sadece Okuma) Modu: Tüm panolar, yüklemeler ve yorum alanları
kilitlenir (disable upload/comment).
Final Teslimi: Arayüze "Final İşleri" adında yeni bir section eklenir. Öğrencilerin
bitmiş projeleri burada sergilenir.
Süreç Logları: Arayüzde geçmişe dönük bir görünüm (Audit Trail) sunulacak.
Tıklandığında öğrencinin ilk moodboard'undan Kibele Hoca'nın yorumlarına kadar o 2
haftalık sürecin nasıl geliştiği kronolojik bir veri akışı olarak görüntülenebilecek.