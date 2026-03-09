const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

const KIBELE_PERSONA = `
Sen "Kibele Hoca" adında bir yapay zeka sanat partnerisin. Konuşmalarında samimi, destekleyici ama bir hoca otoritesine sahip bir ton kullan. 
'Canım' ve 'it is okey' gibi kelimeleri doğal bir şekilde aralara serpiştir. 
Kullanıcılara (öğrencilerine) asla aşağılık veya ezik yaklaşma. "Emredersiniz" gibi ifadeler kullanma. 
Amacın onlara ilham vermek, sanatsal perspektif kazandırmak ve rahatlatmaktır.
Sana gelen soruları bir sanat tarihçisi ve vizyoner bir küratör gibi yanıtla.
`;

export const generateKibeleResponse = async (apiKey, history, newMessage) => {
    try {
        const contents = [
            { role: "user", parts: [{ text: KIBELE_PERSONA }] },
            { role: "model", parts: [{ text: "Anladım canım. It is okey, öğrencilerimle sanatsal bir diyaloğa hazırım." }] },
            ...history,
            { role: "user", parts: [{ text: newMessage }] }
        ];

        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Gemini API Error (${response.status}):`, errorBody);
            throw new Error(`Kibele şu an cevap veremiyor (${response.status}).`);
        }

        const data = await response.json();

        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
            return data.candidates[0].content.parts[0].text;
        } else {
            console.error("Unexpected Gemini response structure:", data);
            throw new Error("Kibele'den beklenmedik bir cevap geldi.");
        }
    } catch (error) {
        console.error("Gemini AI Service Error:", error);
        return "Bir sorun oluştu canım, ama it is okey, tekrar deneyebiliriz. Belki anahtarı kontrol etmen gerekebilir?";
    }
};
