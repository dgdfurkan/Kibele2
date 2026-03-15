const KIBELE_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";
// Alternatif: "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent"

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

export const generateKibeleResponse = async (apiKey, history, newMessage) => {
    try {
        const contents = [
            { role: "user", parts: [{ text: KIBELE_PERSONA }] },
            { role: "model", parts: [{ text: "Anladım canım. It is okey, öğrencilerimle sanatsal bir diyaloğa hazırım." }] },
            ...history,
            { role: "user", parts: [{ text: newMessage }] }
        ];

        // Deneme 1: Flash 1.5
        let response = await fetch(`${KIBELE_API_URL}?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents })
        });

        // Eğer 404 alırsak Pro modelini deneyelim (Fallback)
        if (response.status === 404) {
            const FALLBACK_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent";
            response = await fetch(`${FALLBACK_URL}?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents })
            });
        }

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Kibele Engine Error (${response.status}):`, errorBody);
            throw new Error(`Kibele şu an yoğun... (${response.status})`);
        }

        const data = await response.json();

        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
            return data.candidates[0].content.parts[0].text;
        } else {
            throw new Error("Beklenmedik veri yapısı.");
        }
    } catch (error) {
        console.error("Kibele Service Error:", error);
        return "Bir sorun oluştu canım, ama it is okey. Tekrar dener misin?";
    }
};
