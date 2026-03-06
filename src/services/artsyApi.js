const ARTSY_API_BASE = "https://api.artsy.net/api";

export const getArtsyToken = async (clientId, clientSecret) => {
    try {
        const response = await fetch(`${ARTSY_API_BASE}/tokens/xapp_token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret
            })
        });
        const data = await response.json();
        return data.token;
    } catch (error) {
        console.error("Artsy Token Error:", error);
        return null;
    }
};

export const fetchArtworks = async (token, params = {}) => {
    const query = new URLSearchParams(params).toString();
    try {
        const response = await fetch(`${ARTSY_API_BASE}/artworks?${query}`, {
            headers: { 'X-Xapp-Token': token }
        });
        return await response.json();
    } catch (error) {
        console.error("Artsy Fetch Error:", error);
        return [];
    }
};
