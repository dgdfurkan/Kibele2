# AIC Metadata Referans Listesi

Kibele2 "Derinlikli Kürasyon" sisteminde kullanılan ve AIC `data-aggregator` üzerinden doğrulanan anahtar alanlar:

## Filtreleme Alanları
- **style_titles / style_title:** Eserin ait olduğu sanat akımı (Örn: Surrealism, Impressionism).
- **classification_titles:** Eserin türü (Örn: Painting, Sculpture, Textile).
- **technique_titles:** Kullanılan teknik (Örn: Oil on canvas, Lithography).
- **material_titles:** Kullanılan malzeme (Örn: Wood, Bronze, Pigment).
- **place_of_origin:** Eserin kökeni/coğrafyası.
- **subject_titles:** Eserin konusu (Örn: Landscape, Portrait, Mythology).

## Tanımlayıcı Alanlar
- **artist_display:** Sanatçının adı, milliyeti ve yaşam tarihleri.
- **date_display:** Eserin yapım tarihi (Metin formatında).
- **date_start / date_end:** Kronolojik sıralama ve filtreleme için yıl bilgileri.
- **description / short_description:** Eser hakkında detaylı hikaye ve analizler.

## Görsel Metadata
- **color:** HSL formatında baskın renk verisi (Kibele'nin renk filtresini besler).
- **colorfulness:** Eserin renk yoğunluğu skoru.

Bu alanlar `aicApi.js` üzerinden `artworks/search` endpoint'ine gönderilerek dinamik kürasyon sağlanacaktır.
