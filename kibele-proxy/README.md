# kibele-proxy

Kibele AI Partner için Cloudflare Workers tabanlı güvenli Gemini API proxy.

## Kurulum

1. [Cloudflare hesabı](https://dash.cloudflare.com/sign-up) oluştur (ücretsiz)
2. `npm install -g wrangler` ile Wrangler CLI'yi kur
3. `wrangler login` ile giriş yap
4. Bu dizine gel: `cd kibele-proxy`
5. API key'i secret olarak ekle:
   ```
   wrangler secret put GEMINI_API_KEY
   ```
6. Deploy et:
   ```
   wrangler deploy
   ```

## Güvenlik

- Sadece `dgdfurkan.github.io` origin'inden gelen isteklere izin verir (CORS)
- API key sadece Cloudflare'in güvenli ortamında saklanır
- Frontend'de hiçbir API key bulunmaz
