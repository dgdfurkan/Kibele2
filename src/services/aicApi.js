const AIC_API_BASE = "https://api.artic.edu/api/v1";

/**
 * Art Institute of Chicago (AIC) API üzerinden eserleri getirir.
 * Gelişmiş metadata alanlarını (style, classification, place) destekler.
 */
export const fetchAICArtworks = async (params = {}) => {
    const { limit = 12, page = 1, query = '', filters = {} } = params;

    // AIC API Search Endpoint
    // fields: Görsel basmak ve detay göstermek için gereken alanlar
    // Not: query dsl URL üzerinden kırılabileceği için daha stabil bir yapıya geçiyoruz.
    let url = `${AIC_API_BASE}/artworks/search?limit=${limit}&page=${page}&fields=id,title,image_id,artist_display,medium_display,classification_title,style_title,place_of_origin`;

    // Gelişmiş Filtreleme 
    // Basit arama terimlerini q parametresine ekliyoruz
    // Coğrafya ve diğer filtreleri daha açık hale getiriyoruz
    let searchQuery = query || '';
    if (filters.medium) searchQuery += ` medium:${filters.medium}`;
    if (filters.style) searchQuery += ` style:${filters.style}`;
    if (filters.place) searchQuery += ` "${filters.place}"`; // Tırnak içine alarak tam eşleşme zorluyoruz

    searchQuery = searchQuery.trim() || 'art';
    url += `&q=${encodeURIComponent(searchQuery)}`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        if (!data || !data.data) {
            console.warn("AIC API return no data:", data);
            return { items: [], totalPages: 0 };
        }

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

        return {
            items: artworks,
            totalPages: data.pagination?.total_pages || 1,
            total: data.pagination?.total || 0
        };
    } catch (error) {
        console.error("AIC Fetch Error:", error);
        return { items: [], totalPages: 0 };
    }
};
