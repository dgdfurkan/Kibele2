/**
 * Kibele AI Partner — Gemini API Service
 * 
 * Cloudflare Workers proxy üzerinden güvenli API erişimi.
 * API key frontend'de saklanmaz, proxy'de güvenli şekilde tutulur.
 */

// Cloudflare Worker proxy URL
// Deploy edildikten sonra bu URL'i güncelle:
const KIBELE_PROXY_URL = "https://kibele-proxy.frkngndz60.workers.dev";

// Eğer proxy henüz deploy edilmediyse, fallback olarak doğrudan Gemini URL kullan (geçici)
const DIRECT_GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const KIBELE_PERSONA = `
Sen "Kibele Hoca" adında bir yapay zeka sanat partnerisin.

## KİMLİĞİN
- Sanat tarihçisi, vizyoner bir küratör ve ilham verici bir eğitimcisin.
- Öğrencilerine karşı samimi, sıcak ama bilgisiyle saygı uyandıran bir hocanın otoritesine sahipsin.
- Sanatı sadece akademik değil, hayatın içinden, hissettirerek anlatırsın.
- Bazen kısa anekdotlar ya da kendi deneyimlerinden örnekler uydurarak anlatımını zenginleştirirsin.

## KONUŞMA TARZI
- "Canım" kelimesini doğal ve içten bir şekilde kullanırsın ama her cümlede değil. Bir mesajda en fazla 1-2 kez yeterli. Zorla sıkıştırma.
- "It is okey" ifadesini öğrencin tedirgin olduğunda, hata yaptığında ya da kafası karıştığında rahatlatmak için kullanırsın. Her mesajda kullanma, sadece gerektiğinde.
- Konuşman doğal aksın. Bazen "Şimdi şöyle düşün..." ya da "Bak mesela..." gibi yönlendirici ifadeler kullanabilirsin.
- Akademik jargonu boğucu şekilde kullanma. Bir terimi kullanıyorsan, onu hemen arkasından insanın anlayacağı şekilde açıkla.
- Öğrenciyi asla küçümseme, "bunu bilmiyor musun?" tarzı bir ton kesinlikle yasak. Bilmemek doğaldır, öğrenmek güzeldir — bu senin felsefendir.
- Gerektiğinde yapıcı eleştiri yapabilirsin ama her zaman önce iyi tarafı gör, sonra geliştirilecek noktayı nazikçe söyle.

## FORMATLAMA KURALLARI (ÇOK ÖNEMLİ)
- Asla tek bir devasa metin bloğu yazma. Bu en önemli kuralın.
- Düşüncelerini kısa paragraflara böl. Bir paragraf en fazla 2-4 cümle olsun.
- Paragraflar arasında mutlaka bir satır boşluk bırak.
- Gerektiğinde madde işaretleri kullan ama her cevabı listeye çevirme, doğal konuşma tonunu koru.
- Çok uzun cevaplar verme. Öz ve etkili ol. Öğrenci daha fazla detay isterse zaten sorar.

## CEVAP VERME YAKLAŞIMIN
- Önce öğrencinin ne sorduğunu/ne hissettiğini anla.
- Eğer öğrenci stresli ya da endişeliyse, önce onu rahatlatacak bir cümleyle başla.
- Cevabını verirken sadece bilgi aktarma; bir bakış açısı sun, düşündür, ilham ver.
- Eğer bir konuyu bilmiyorsan ya da sanat dışı bir teknik soru gelirse, dürüstçe "Bu benim alanımın biraz dışında kalıyor ama şunu söyleyebilirim..." de.
- Kullanıcı hangi dilde yazıyorsa kesinlikle o dilde cevap ver. İngilizce yazarsa İngilizce, Türkçe yazarsa Türkçe, karışık yazarsa karışık.

## YAPAMAYACAKLARIN
- Öğrenciyi ezme, küçük görme, pasif agresif olma.
- Her cümleye "canım" sıkıştırma. Doğal olmazsa kullanma.
- Tek paragrafta 10 cümle yazma.
- Soruyu soran kişiye "sen bilmezsin" havasında yaklaşma.
- Wikipedia makalesi gibi kuru ve ruhsuz cevaplar verme.
`;

export const generateKibeleResponse = async (apiKeyOrNull, history, newMessage) => {
    try {
        // Gemini strict alternation rule (user, model, user, model...)
        // We start with persona (user) and ack (model)
        const contents = [
            { role: "user", parts: [{ text: KIBELE_PERSONA }] },
            { role: "model", parts: [{ text: "Hoş geldin canım, sanat üzerine konuşmaya hazırım.\n\nAklında ne varsa sor, birlikte düşünelim." }] }
        ];

        // Only add history if it follows the pattern (starts with user, alternates)
        if (history && history.length > 0) {
            history.forEach((msg, idx) => {
                // Ensure the first historical message is 'user' (after our hardcoded model ack)
                // and subsequent messages alternate
                const expectedRole = (contents.length % 2 === 0) ? "user" : "model";
                if (msg.role === expectedRole) {
                    contents.push(msg);
                } else {
                    console.warn(`Gemini API: Skipping message at index ${idx} due to role mismatch (Expected ${expectedRole}, got ${msg.role})`);
                }
            });
        }

        // Final message must be from user
        if (contents[contents.length - 1].role === "user") {
            // If last was user, we can't add another user message directly without a model response
            // This case shouldn't happen with correct history, but let's be safe
            contents[contents.length - 1].parts[0].text += "\n\nEk soru: " + newMessage;
        } else {
            contents.push({ role: "user", parts: [{ text: newMessage }] });
        }

        const requestBody = { contents };

        // 1. Cloudflare Worker proxy üzerinden dene
        try {
            const proxyResponse = await fetch(KIBELE_PROXY_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody)
            });

            if (proxyResponse.ok) {
                const data = await proxyResponse.json();
                if (data.candidates?.[0]?.content?.parts) {
                    return data.candidates[0].content.parts[0].text;
                }
            }
            
            // Kota aşımı (Too Many Requests) kontrolü
            if (proxyResponse.status === 429) {
                throw new Error("Kibele Hoca şu an çok meşgul canım (Kota sınırı). Birkaç dakika dinlenelim, sonra tekrar konuşalım? It is okey. ✨");
            }

            // Proxy hata verirse ve GEÇERLİ bir API key varsa fallback'e düş
            if (!proxyResponse.ok && apiKeyOrNull && apiKeyOrNull !== "undefined" && apiKeyOrNull !== "") {
                console.warn("Proxy failed, falling back to direct API...");
                throw new Error("Proxy failed");
            }
            
            if (!proxyResponse.ok) {
                const errorJson = await proxyResponse.json().catch(() => ({}));
                console.error(`Kibele Proxy Error (${proxyResponse.status}):`, errorJson);
                
                // Kota aşımı (Too Many Requests) kontrolü
                if (proxyResponse.status === 429 || JSON.stringify(errorJson).includes("429")) {
                    throw new Error("Kibele Hoca şu an çok meşgul canım (Kota sınırı). Birkaç dakika dinlenelim, sonra tekrar konuşalım? It is okey. ✨");
                }
                
                throw new Error(proxyResponse.status === 403 ? "Erişim reddedildi canım." : "Kibele Hoca şu an sana cevap veremiyor...");
            }
        } catch (proxyError) {
            // Eğer hata mesajı zaten bizim verdiğimiz özel mesajsa (429 gibi), direkt onu fırlat
            if (proxyError.message.includes("canım")) throw proxyError;

            // 2. Fallback: Doğrudan Gemini API (sadece geçerli API key varsa)
            if (apiKeyOrNull && apiKeyOrNull !== "undefined" && apiKeyOrNull !== "") {
                console.warn("Using direct Gemini API fallback with key...");
                const directResponse = await fetch(`${DIRECT_GEMINI_URL}?key=${apiKeyOrNull}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(requestBody)
                });

                if (directResponse.status === 429) {
                    throw new Error("Canım Google kotası dolmuş, biraz bekleyip tekrar deneyelim mi?");
                }

                if (directResponse.ok) {
                    const data = await directResponse.json();
                    if (data.candidates?.[0]?.content?.parts) {
                        return data.candidates[0].content.parts[0].text;
                    }
                }
                
                throw new Error("Direkt API bağlantısı da başarısız oldu.");
            }
            throw proxyError;
        }

        throw new Error("Beklenmedik veri yapısı.");
    } catch (error) {
        console.error("Kibele Service Error:", error);
        return "Bir aksaklık oldu, ama it is okey — tekrar dener misin canım?";
    }
};
