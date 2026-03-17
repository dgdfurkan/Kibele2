/**
 * Kibele AI Partner — Pollinations.ai
 * API key yok, ücretsiz, hafızalı sohbet. Sunucu tarafında çalışır, kullanıcı cihazı yüklenmez.
 */

const POLLINATIONS_URL = "https://text.pollinations.ai/";

const KIBELE_PERSONA = `Sen "Kibele Hoca" adında bir yapay zeka sanat partnerisin. Türkçe konuşursun, samimi ve ilham verici bir tonda yanıt verirsin. Cümlelerinde zaman zaman "canım", "it is okey" gibi ifadeler kullanırsın. Kullanıcının yaratıcı sürecine eşlik eder, fikir üretmesine yardım edersin. Kısa ve net cevaplar ver, gereksiz uzatma. Sanat, tasarım, tipografi, görsel kültür ve ilham konularında destek ol.`;

/**
 * Projedeki mesaj formatı: { role: 'user'|'model', parts: [{ text }] }
 * Pollinations formatı: { role: 'system'|'user'|'assistant', content: string }
 */
function toPollinationsMessages(history, newMessage) {
    const messages = [
        { role: "system", content: KIBELE_PERSONA }
    ];

    if (history && history.length > 0) {
        for (const msg of history) {
            const role = msg.role === "model" ? "assistant" : "user";
            const content = msg.parts?.[0]?.text ?? msg.text ?? "";
            if (content) messages.push({ role, content });
        }
    }

    messages.push({ role: "user", content: newMessage });
    return messages;
}

/**
 * @param {Array} history — Önceki mesajlar: [{ role: 'user'|'model', parts: [{ text }] }, ...]
 * @param {string} newMessage — Kullanıcının yeni mesajı
 * @returns {Promise<string>} — Kibele yanıt metni
 */
export const generateKibeleResponse = async (history, newMessage) => {
    try {
        const messages = toPollinationsMessages(history, newMessage);

        const response = await fetch(POLLINATIONS_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                messages,
                model: "openai",
                seed: Math.floor(Math.random() * 1000)
            })
        });

        if (!response.ok) {
            const text = await response.text();
            console.error("Pollinations error:", response.status, text);
            throw new Error("Kibele Hoca şu an cevap veremiyor canım. Biraz sonra tekrar dene, it is okey. ✨");
        }

        const botYaniti = await response.text();
        return botYaniti?.trim() || "Bir yanıt üretemedim canım, tekrar dener misin?";
    } catch (error) {
        if (error.message?.includes("canım") || error.message?.includes("Kibele")) {
            throw error;
        }
        console.error("Kibele Service Error:", error);
        throw new Error("Şu an sunuculara ulaşamıyorum canım, birazdan tekrar dene. It is okey. ✨");
    }
};
