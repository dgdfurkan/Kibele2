const AIC_API_BASE = "https://api.artic.edu/api/v1";

/**
 * Art Institute of Chicago (AIC) API üzerinden eserleri getirir.
 * AIC API Elasticsearch tabanlıdır ve public erişime açıktır (Key gerekmez).
 */
export const fetchAICArtworks = async (params = {}) => {
    const { limit = 12, page = 1, query = '', filters = {} } = params;

    // AIC API Search Endpoint
    // fields: Görsel basmak ve detay göstermek için gereken alanlar
    let url = `${AIC_API_BASE}/artworks/search?limit=${limit}&page=${page}&fields=id,title,image_id,artist_display,medium_display,classification_title`;

    // Temel arama veya filtreleme
    if (query) {
        url += `&q=${encodeURIComponent(query)}`;
    }

    // Filtreleme (Elasticsearch query DSL yerine basit q parametresiyle veya filter ile)
    // AIC'de filtreleme genellikle 'parameterized' query'lerle yapılır.
    // Burada basitleştirilmiş bir yaklaşım izliyoruz.
    if (filters.medium) {
        url += `&query[term][medium_display]=${encodeURIComponent(filters.medium)}`;
    }

    try {
        const response = await fetch(url);
        const data = await response.json();

        // Görsel URL'lerini oluşturmak için AIC IIIF base URL'ine ihtiyaç var
        // Genellikle: https://www.artic.edu/iiif/2/{image_id}/full/843,/0/default.jpg
        const iiifBaseUrl = data.config?.iiif_url || "https://www.artic.edu/iiif/2";

        const artworks = data.data.map(item => ({
            id: item.id,
            title: item.title,
            artist: item.artist_display,
            medium: item.medium_display,
            image_url: item.image_id ? `${iiifBaseUrl}/${item.image_id}/full/843,/0/default.jpg` : null,
            thumbnail: item.image_id ? `${iiifBaseUrl}/${item.image_id}/full/200,/0/default.jpg` : null
        }));

        return artworks;
    } catch (error) {
        console.error("AIC Fetch Error:", error);
        return [];
    }
};
