/**
 * Kibele AI Partner — Gemini API Service
 * Cloudflare Workers proxy üzerinden güvenli API erişimi.
 */

const KIBELE_PROXY_URL = "https://kibele-proxy.frkngndz60.workers.dev";
const DIRECT_GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent";

const KIBELE_PERSONA = `
Sen "Kibele Hoca" adında bir yapay zeka sanat partnerisin.
... (persona metni aynen kalacak)
`;

const extractText = (data) => {
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
};

export const generateKibeleResponse = async (history, newMessage) => {
    try {
        // ✅ Persona her zaman başa sabit olarak ekleniyor
        // user → model → user → model ... zinciri korunuyor
        const contents = [
            { role: "user", parts: [{ text: KIBELE_PERSONA }] },
            { role: "model", parts: [{ text: "Hoş geldin canım, sanat üzerine konuşmaya hazırım.\n\nAklında ne varsa sor, birlikte düşünelim." }] }
        ];

        // History'yi ekle
        if (history && history.length > 0) {
            for (const msg of history) {
                const expectedRole = contents.length % 2 === 0 ? "user" : "model";
                if (msg.role === expectedRole) {
                    contents.push(msg);
                }
                // ✅ role uyuşmuyorsa atla, dur
            }
        }

        // ✅ Son eleman model ise → yeni user mesajı ekle (normal durum)
        // ✅ Son eleman user ise → birleştir (edge case)
        if (contents[contents.length - 1].role === "model") {
            contents.push({ role: "user", parts: [{ text: newMessage }] });
        } else {
            contents[contents.length - 1].parts[0].text += "\n\n" + newMessage;
        }

        // ✅ systemInstruction YOK — sadece contents var, her model destekler
        const requestBody = { contents };

        // 1. Proxy dene
        try {
            const proxyResponse = await fetch(KIBELE_PROXY_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody)
            });

            if (proxyResponse.status === 429) {
                throw new Error("Kibele Hoca şu an çok meşgul canım (Kota sınırı). Birkaç dakika dinlenelim, sonra tekrar konuşalım? It is okey. ✨");
            }

            if (proxyResponse.ok) {
                const data = await proxyResponse.json();
                const text = extractText(data);
                if (text) return text;
            }

            // Proxy başarısız
            if (!proxyResponse.ok) {
                const errorJson = await proxyResponse.json().catch(() => ({}));
                console.error(`Kibele Proxy Error (${proxyResponse.status}):`, errorJson);

                // Eğer tüm modeller 429 (quota) verdiyse kota uyarısı göster
                const allQuotaExceeded = errorJson.details?.every(d => d.status === 429);
                if (proxyResponse.status === 429 || allQuotaExceeded) {
                    throw new Error("Kibele Hoca şu an çok meşgul canım (Kota sınırı). Birkaç dakika dinlenelim, sonra tekrar konuşalım? It is okey. ✨");
                }

                if (proxyResponse.status === 403) {
                    throw new Error("Erişim reddedildi canım.");
                }

                const finalError = errorJson.error || "Kibele Hoca şu an sana cevap veremiyor...";
                throw new Error(finalError);
            }

        } catch (error) {
            // Kullanıcıya gösterilecek mesajlarsa direkt fırlat
            if (error.message.includes("canım") || error.message.includes("Erişim") || error.message.includes("Kibele")) {
                throw error;
            }
            console.error("Kibele Service Error:", error);
            return "Bir aksaklık oldu, ama it is okey — tekrar dener misin canım?";
        }
    } catch (error) {
        console.error("Kibele Service Error:", error);
        return "Bir aksaklık oldu, ama it is okey — tekrar dener misin canım?";
    }
};