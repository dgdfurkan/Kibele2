const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent";

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

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("Gemini AI Error:", error);
        return "Bir sorun oluştu canım, ama it is okey, tekrar deneyebiliriz.";
    }
};
