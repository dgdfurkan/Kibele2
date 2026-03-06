const AIC_API_BASE = "https://api.artic.edu/api/v1";

/**
 * Art Institute of Chicago (AIC) API üzerinden eserleri getirir.
 * Gelişmiş metadata alanlarını (style, classification, place) destekler.
 */
export const fetchAICArtworks = async (params = {}) => {
    const { limit = 12, page = 1, query = '', filters = {} } = params;

    // AIC API Search Endpoint
    // fields: Görsel basmak ve detay göstermek için gereken alanlar
    let url = `${AIC_API_BASE}/artworks/search?limit=${limit}&page=${page}&fields=id,title,image_id,artist_display,medium_display,classification_title,style_title,place_of_origin&params[query][bool][must][][term][is_public_domain]=true`;

    // Temel arama
    if (query) {
        url += `&q=${encodeURIComponent(query)}`;
    }

    // Gelişmiş Filtreleme
    // Not: AIC API query DSL ile çalışır ancak basit anahtar kelimeler q parametresiyle de filtrelenebilir.
    // Burada daha spesifik sonuçlar için q parametresine eklemeler yapıyoruz.
    let searchQuery = query || '';

    if (filters.medium) searchQuery += ` ${filters.medium}`;
    if (filters.style) searchQuery += ` ${filters.style}`;
    if (filters.place) searchQuery += ` ${filters.place}`;

    if (searchQuery) {
        url += `&q=${encodeURIComponent(searchQuery.trim())}`;
    }

    try {
        const response = await fetch(url);
        const data = await response.json();

        // Görsel URL'lerini oluşturmak için AIC IIIF base URL'ine ihtiyaç var
        const iiifBaseUrl = data.config?.iiif_url || "https://www.artic.edu/iiif/2";

        const artworks = data.data.map(item => ({
            id: item.id,
            title: item.title,
            artist: item.artist_display,
            medium: item.medium_display || item.classification_title,
            style: item.style_title,
            place: item.place_of_origin,
            image_url: item.image_id ? `${iiifBaseUrl}/${item.image_id}/full/843,/0/default.jpg` : null,
            thumbnail: item.image_id ? `${iiifBaseUrl}/${item.image_id}/full/200,/0/default.jpg` : null
        }));

        return artworks;
    } catch (error) {
        console.error("AIC Fetch Error:", error);
        return [];
    }
};
