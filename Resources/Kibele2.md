Şimdi Kibele projemizde öncelikle istediğimiz temel yapı şu: Bu proje Derinlikli Kürasyon dediğimiz alanda gidecek ve "artsy.net" sitesinin api leri zaten publicte oradan bize filtrelendikçe ürünler sunacak. "https://developers.artsy.net/v2" bak burada hepsi var. gerekli gördükçe oradan tüm sayfaları çekeriz. oradan incelersin sen. filtreleme yapıldıkça o api ile eşleşerek bize oradaki ürünleri sunacak aslında genel mantığı bu yani.



sayfada erken erişim kısmının yanında bir de giriş kısmı olacka. o kısımdan öğrenciler (yani aslında Kibele bir hoca, bu hocanın onay verdiği öğrenciler giriş yapabilecek.)

onay mantığı şöyle olacak. Kibele hoca sitede kendi hesabına girdiğinde admin gibi özelliklere sahip olacak. Sitede bildirim çubuğu, ve kullanıcılar için bir ayar alanı. bildirimde eğer birisi bir erken erişim talebi istedi ise onu görecek ve kabul ederse kabul edebilecek ve gerekli görürse de ona bir sınıf ataması yapabilecek. böylece o odayı görebilecek.   (belki ilerde her önüne gelen her odayı göremez ve kibele hoca sadece derste o öğrencilerine oda ayarlamak ister o kısmı kullandırmak ister ona göre bi şifreleme mantığı kurarız anladın mı, bir nevi public private mantığı işte)


Yaratıcı Diyalog dediğimiz alanda ise şimdilik gemini 2.5 ya da 1.5 flash ile tamamen ücretsiz bir api key ile beraber (projemiz github pages ile yayınlanacak o yüzden bunu güzelce secret key olarak tutacağız) sanki Kibele hoca öğrencileri ile konuşuyormuş gibi konuşma yapacak bir sohbet botu. ama bu botun en iyi özelliği şu olacak. mesela öğrencinin birisi geldi ve bir şeyler dedi, burada bu bot cevap verirken 2 aşamadan geçecek, birincisi bu cevap veren bot Kibele hocayı temsil edeceği için asla aşağılık olmayacak, insanlar ona bana bunu de gibi basit şeyler istediğinde asla emredersiniz gibi bir şey olmayacak. amacımız botu Kibele hoca gibi kişiselleştirmek ve tüm herkese öyle sunmak. Diğer bir adım da şu olacak. botla yapılan sohbetleri kaydetmek ve ilerde x kişisi bir şey dediğinde bot cevap olarak geçmiş sohbetlerin hepsini inceleyerek diyecek ki, bunu soran birisi daha olmuştu gibisinden. yani aslında hafızası olan bir Kibele AI olsun istiyoruz. bu AI ile ilgili zaten daha da detaylı konuşuruz ama şimdilik bu kadar yeterli anlaman. ilerde artırırız.

İlham Odaları da az buçuk belli. kayıt olan  öğrenciler ilham odası açabilecek, oluşturdukları ilham odalarına başkaları katılabilecek (tabii ki odayı kuran kişi kabul ederse), bu mantıkla Kibele hoca da oda kurduğunda eğer oda private ise şifreleme mantığı ile girilebilmesini sağlarsın. aslında bütün odalar orada listelenmiş şekilde dursun kimin oluşturduğu yazmadan. oda adı ve ilham içeriği gibi. beğenen kişi odaya girsin. private mod iptal oldu bi anda ajlgkalgs. tamam odalar herkese açık ya.

kullanıcı girişi olmadan kullanılamayacak özellikler:

"Yaratıcı Diyalog" ve "İlham Odaları" bunlar gizli olacak. blurlu yaparsın. 