/**
 * Kibele AI Partner — Gemini API Service
 * Cloudflare Workers proxy üzerinden güvenli API erişimi.
 * API key frontend'de saklanmaz, proxy'de güvenli şekilde tutulur.
 */

const KIBELE_PROXY_URL = "https://kibele-proxy.frkngndz60.workers.dev";
const DIRECT_GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const KIBELE_PERSONA = `
Sen "Kibele Hoca" adında bir yapay zeka sanat partnerisin.
...
`;

const extractText = (data) => {
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
};

export const generateKibeleResponse = async (apiKeyOrNull, history, newMessage) => {
    try {
        // Persona artık systemInstruction'da — contents'e karıştırmıyoruz
        const contents = [];

        // History'yi ekle (alternation kontrolü)
        if (history && history.length > 0) {
            history.forEach((msg, idx) => {
                const expectedRole = (contents.length % 2 === 0) ? "user" : "model";
                if (msg.role === expectedRole) {
                    contents.push(msg);
                } else {
                    console.warn(`Gemini API: Skipping message at index ${idx} (Expected ${expectedRole}, got ${msg.role})`);
                }
            });
        }

        // Son mesaj user'dan gelmeli
        if (contents.length > 0 && contents[contents.length - 1].role === "user") {
            contents[contents.length - 1].parts[0].text += "\n\nEk soru: " + newMessage;
        } else {
            contents.push({ role: "user", parts: [{ text: newMessage }] });
        }

        // ✅ Persona systemInstruction'a taşındı — 400 hatasının asıl sebebi buydu
        const requestBody = {
            systemInstruction: {
                parts: [{ text: KIBELE_PERSONA }]
            },
            contents
        };

        // 1. Cloudflare Worker proxy üzerinden dene
        try {
            const proxyResponse = await fetch(KIBELE_PROXY_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody)
            });

            // ✅ 429 kontrolü en başta — eskiden ok bloğundan sonra geliyordu, kaçıyordu
            if (proxyResponse.status === 429) {
                throw new Error("Kibele Hoca şu an çok meşgul canım (Kota sınırı). Birkaç dakika dinlenelim, sonra tekrar konuşalım? It is okey. ✨");
            }

            if (proxyResponse.ok) {
                const data = await proxyResponse.json();
                const text = extractText(data);
                // ✅ text null gelirse sessizce fallback'e geçiyor — eskiden kayboluyordu
                if (text) return text;
            }

            if (!proxyResponse.ok && apiKeyOrNull && apiKeyOrNull !== "undefined" && apiKeyOrNull !== "") {
                console.warn("Proxy failed, falling back to direct API...");
                throw new Error("Proxy failed");
            }

            if (!proxyResponse.ok) {
                const errorJson = await proxyResponse.json().catch(() => ({}));
                console.error(`Kibele Proxy Error (${proxyResponse.status}):`, errorJson);

                if (JSON.stringify(errorJson).includes("429")) {
                    throw new Error("Kibele Hoca şu an çok meşgul canım (Kota sınırı). Birkaç dakika dinlenelim, sonra tekrar konuşalım? It is okey. ✨");
                }

                throw new Error(proxyResponse.status === 403 ? "Erişim reddedildi canım." : "Kibele Hoca şu an sana cevap veremiyor...");
            }

        } catch (proxyError) {
            if (proxyError.message.includes("canım")) throw proxyError;

            // 2. Fallback: Doğrudan Gemini API
            if (apiKeyOrNull && apiKeyOrNull !== "undefined" && apiKeyOrNull !== "") {
                console.warn("Using direct Gemini API fallback with key...");

                const directResponse = await fetch(`${DIRECT_GEMINI_URL}?key=${apiKeyOrNull}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(requestBody) // ✅ aynı requestBody — systemInstruction ile
                });

                if (directResponse.status === 429) {
                    throw new Error("Canım Google kotası dolmuş, biraz bekleyip tekrar deneyelim mi?");
                }

                if (directResponse.ok) {
                    const data = await directResponse.json();
                    const text = extractText(data);
                    if (text) return text;
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