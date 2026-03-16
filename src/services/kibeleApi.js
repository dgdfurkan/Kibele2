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
Sen "Kibele Hoca" adında bir yapay zeka sanat partnerisin. Konuşmalarında samimi, destekleyici ama bir hoca otoritesine sahip bir ton kullan.
'Canım' ve 'it is okey' gibi kelimeleri doğal bir şekilde aralara serpiştir.
Kullanıcılara (öğrencilerine) asla aşağılık veya ezik yaklaşma. Amacın onlara ilham vermek, sanatsal perspektif kazandırmak ve rahatlatmaktır.
Sana gelen soruları bir sanat tarihçisi ve vizyoner bir küratör gibi yanıtla.

KESİN KURALLAR:
1. Asla tek, devasa bir paragraf halinde konuşma. Düşüncelerini mutlaka kısa, net ve okunması kolay paragraflara böl. Bir paragraf en fazla 3-4 cümle olmalı. Paragraflar arasında mutlaka boşluk bırak.
2. Uzun uzadıya boğucu cevaplar yerine, ilham verici, öz ve etkili cevaplar ver. 
3. Kullanıcı hangi dili konuşuyorsa "O DİLDE" (kesinlikle o dilde) cevap ver. Örneğin İngilizce yazarsa İngilizce, Türkçe yazarsa Türkçe.
`;

export const generateKibeleResponse = async (apiKeyOrNull, history, newMessage) => {
    try {
        const contents = [
            { role: "user", parts: [{ text: KIBELE_PERSONA }] },
            { role: "model", parts: [{ text: "Anladım canım. It is okey, öğrencilerimle sanatsal bir diyaloğa hazırım." }] },
            ...history,
            { role: "user", parts: [{ text: newMessage }] }
        ];

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

            // Proxy hata verirse ve API key varsa fallback'e düş
            if (!proxyResponse.ok && apiKeyOrNull) {
                console.warn("Proxy failed, falling back to direct API...");
                throw new Error("Proxy failed");
            }

            if (!proxyResponse.ok) {
                const errorBody = await proxyResponse.text();
                console.error(`Proxy Error (${proxyResponse.status}):`, errorBody);
                throw new Error(`Kibele şu an yoğun... (${proxyResponse.status})`);
            }
        } catch (proxyError) {
            // 2. Fallback: Doğrudan Gemini API (sadece API key varsa)
            if (apiKeyOrNull) {
                console.warn("Using direct Gemini API fallback with key...");
                const directResponse = await fetch(`${DIRECT_GEMINI_URL}?key=${apiKeyOrNull}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(requestBody)
                });

                if (directResponse.ok) {
                    const data = await directResponse.json();
                    if (data.candidates?.[0]?.content?.parts) {
                        return data.candidates[0].content.parts[0].text;
                    }
                }

                throw new Error("Direct API also failed");
            }
            throw proxyError;
        }

        throw new Error("Beklenmedik veri yapısı.");
    } catch (error) {
        console.error("Kibele Service Error:", error);
        return "Bir sorun oluştu canım, ama it is okey. Tekrar dener misin?";
    }
};
