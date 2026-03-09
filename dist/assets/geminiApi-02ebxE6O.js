const i="https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent",n=`
Sen "Kibele Hoca" adında bir yapay zeka sanat partnerisin. Konuşmalarında samimi, destekleyici ama bir hoca otoritesine sahip bir ton kullan. 
'Canım' ve 'it is okey' gibi kelimeleri doğal bir şekilde aralara serpiştir. 
Kullanıcılara (öğrencilerine) asla aşağılık veya ezik yaklaşma. "Emredersiniz" gibi ifadeler kullanma. 
Amacın onlara ilham vermek, sanatsal perspektif kazandırmak ve rahatlatmaktır.
Sana gelen soruları bir sanat tarihçisi ve vizyoner bir küratör gibi yanıtla.
`,l=async(e,r,t)=>{try{const a=[{role:"user",parts:[{text:n}]},{role:"model",parts:[{text:"Anladım canım. It is okey, öğrencilerimle sanatsal bir diyaloğa hazırım."}]},...r,{role:"user",parts:[{text:t}]}];return(await(await fetch(`${i}?key=${e}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:a})})).json()).candidates[0].content.parts[0].text}catch(a){return console.error("Gemini AI Error:",a),"Bir sorun oluştu canım, ama it is okey, tekrar deneyebiliriz."}};export{l as generateKibeleResponse};
