/**
 * Kibele AI Partner — Cloudflare Workers Gemini API Proxy
 * 
 * Bu worker, Gemini API key'ini güvenli bir şekilde saklar ve
 * sadece izin verilen origin'den (GitHub Pages) gelen isteklere cevap verir.
 */

const GEMINI_MODELS = [
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.5-flash",
    "gemini-flash-latest"
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
                return new Response(JSON.stringify({ error: "API key not configured in Cloudflare Worker secrets" }), {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": responseOrigin,
                    },
                });
            }

            // Try models in order (fallback chain)
            let errors = [];
            for (const model of GEMINI_MODELS) {
                // Try both v1beta and v1 for each model
                for (const version of ["v1beta", "v1"]) {
                    const geminiUrl = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${apiKey}`;

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

                        // Collect errors for diagnostics
                        const errorJson = await geminiResponse.json().catch(() => ({}));
                        const errorMsg = errorJson.error?.message || `HTTP ${geminiResponse.status}`;
                        
                        // Don't spam 404s if it's just a version mismatch
                        errors.push({ model, version, status: geminiResponse.status, message: errorMsg });
                        
                        // If it's a critical error like 400 (Bad Request), but not 404/429, 
                        // we'd usually stop, but let's keep trying other models/versions
                        continue;
                    } catch (fetchError) {
                        errors.push({ model, error: fetchError.message });
                        continue;
                    }
                }
            }

            // All models failed
            return new Response(JSON.stringify({ 
                error: "All Gemini models failed. This usually means a quota or configuration issue.",
                details: errors 
            }), {
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
