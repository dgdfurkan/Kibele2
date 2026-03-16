/**
 * Kibele AI Partner — Cloudflare Workers Gemini API Proxy
 * 
 * Bu worker, Gemini API key'ini güvenli bir şekilde saklar ve
 * sadece izin verilen origin'den (GitHub Pages) gelen isteklere cevap verir.
 */

const GEMINI_MODELS = [
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-pro-latest"
];

const CORS_HEADERS = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
};

export default {
    async fetch(request, env) {
        // CORS Preflight
        if (request.method === "OPTIONS") {
            return new Response(null, {
                status: 204,
                headers: {
                    ...CORS_HEADERS,
                    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
                },
            });
        }

        // Only POST allowed
        if (request.method !== "POST") {
            return new Response(JSON.stringify({ error: "Method not allowed" }), {
                status: 405,
                headers: { "Content-Type": "application/json" },
            });
        }

        // Origin check
        const origin = request.headers.get("Origin") || "";
        const allowedOrigin = env.ALLOWED_ORIGIN || "https://dgdfurkan.github.io";
        
        // In production, enforce origin check
        if (origin && !origin.includes("github.io") && !origin.includes("localhost")) {
            return new Response(JSON.stringify({ error: "Forbidden origin" }), {
                status: 403,
                headers: { "Content-Type": "application/json" },
            });
        }

        const responseOrigin = origin || allowedOrigin;

        try {
            const body = await request.json();
            const apiKey = env.GEMINI_API_KEY;

            if (!apiKey) {
                return new Response(JSON.stringify({ error: "API key not configured" }), {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": responseOrigin,
                    },
                });
            }

            // Try models in order (fallback chain)
            let lastError = null;
            let lastErrorStatus = 500;
            for (const model of GEMINI_MODELS) {
                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

                try {
                    const geminiResponse = await fetch(geminiUrl, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(body),
                    });

                    if (geminiResponse.ok) {
                        const data = await geminiResponse.json();
                        return new Response(JSON.stringify(data), {
                            status: 200,
                            headers: {
                                "Content-Type": "application/json",
                                "Access-Control-Allow-Origin": responseOrigin,
                                ...CORS_HEADERS,
                            },
                        });
                    }

                    // If 404 (model not found) or 429 (quota exceeded), try next model
                    if (geminiResponse.status === 404 || geminiResponse.status === 429) {
                        lastError = `Model ${model}: ${geminiResponse.status === 404 ? 'not found' : 'quota exceeded'}`;
                        lastErrorStatus = geminiResponse.status;
                        continue;
                    }

                    // For other errors (400, 403 etc.), return the error immediately
                    const errorText = await geminiResponse.text();
                    return new Response(errorText, {
                        status: geminiResponse.status,
                        headers: {
                            "Content-Type": "application/json",
                            "Access-Control-Allow-Origin": responseOrigin,
                            ...CORS_HEADERS,
                        },
                    });
                } catch (fetchError) {
                    lastError = fetchError.message;
                    continue;
                }
            }

            // All models failed
            return new Response(JSON.stringify({ error: `All models failed: ${lastError}` }), {
                status: 502,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": responseOrigin,
                    ...CORS_HEADERS,
                },
            });

        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": responseOrigin || allowedOrigin,
                    ...CORS_HEADERS,
                },
            });
        }
    },
};
