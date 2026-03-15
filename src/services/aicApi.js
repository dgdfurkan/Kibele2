const AIC_API_BASE = "https://api.artic.edu/api/v1";

export const AIC_FILTERS = {
    artwork_type: [
        { id: 'Print', name: 'Print' },
        { id: 'Photograph', name: 'Photograph' },
        { id: 'Drawing and Watercolor', name: 'Drawing and Watercolor' },
        { id: 'Textile', name: 'Textile' }
    ],
    artists: [
        { id: 'Utagawa Hiroshige', name: 'Utagawa hiroshige' },
        { id: 'Unknown', name: 'Unknown artist' },
        { id: 'Ancient Roman', name: 'Ancient roman' },
        { id: 'James McNeill Whistler', name: 'James mcneill whistler' },
        { id: 'Ancient Egyptian', name: 'Ancient egyptian' },
        { id: 'Jasper Johns', name: 'Jasper johns' }
    ],
    places: [
        { id: 'United States', name: 'United states' },
        { id: 'France', name: 'France' },
        { id: 'Japan', name: 'Japan' },
        { id: 'England', name: 'England' },
        { id: 'Italy', name: 'Italy' },
        { id: 'Germany', name: 'Germany' },
        { id: 'China', name: 'China' },
        { id: 'Netherlands', name: 'Netherlands' }
    ],
    colors: [
        { id: 'black', hex: '#000000', name: 'Black' },
        { id: 'white', hex: '#FFFFFF', name: 'White' },
        { id: 'red', hex: '#FF0000', name: 'Red' },
        { id: 'yellow', hex: '#FFD700', name: 'Yellow' },
        { id: 'blue', hex: '#0000FF', name: 'Blue' },
        { id: 'green', hex: '#008000', name: 'Green' }
    ]
};

/**
 * Art Institute of Chicago (AIC) API üzerinden eserleri getirir.
 * Elasticsearch Query DSL kullanarak gelişmiş filtreleme (çoklu seçim, renk aralıkları) sağlar.
 */
export const fetchAICArtworks = async (params = {}) => {
    const { limit = 20, page = 1, query = '', filters = {} } = params;

    // Elasticsearch Query DSL
    const must = [
        { term: { is_public_domain: true } }
    ];

    const filter = [];

    // Metin araması (Boş değilse)
    if (query && query.trim() !== '' && query !== 'art') {
        must.push({
            multi_match: {
                query: query,
                fields: ["title", "artist_title", "style_title", "classification_title", "medium_display"],
                type: "best_fields",
                fuzziness: "AUTO"
            }
        });
    }

    // Teknik/Kategori Filtresi (Çoklu Seçim)
    if (filters.artwork_type && filters.artwork_type.length > 0) {
        filter.push({
            terms: {
                "artwork_type_title.keyword": filters.artwork_type
            }
        });
    }

    // Sanatçı Filtresi (Çoklu Seçim)
    if (filters.artists && filters.artists.length > 0) {
        filter.push({
            terms: {
                "artist_title.keyword": filters.artists
            }
        });
    }

    // Coğrafya Filtresi (Çoklu Seçim)
    if (filters.places && filters.places.length > 0) {
        filter.push({
            terms: {
                "place_of_origin.keyword": filters.places
            }
        });
    }

    // Renk Filtresi (HSL Hue aralıkları)
    if (filters.colors && filters.colors.length > 0) {
        const colorQueries = filters.colors.map(color => {
            switch (color) {
                case 'red': return { range: { "color.h": { gte: 340, lte: 360 } } };
                case 'orange': return { range: { "color.h": { gte: 15, lte: 45 } } };
                case 'yellow': return { range: { "color.h": { gte: 45, lte: 70 } } };
                case 'green': return { range: { "color.h": { gte: 70, lte: 160 } } };
                case 'blue': return { range: { "color.h": { gte: 160, lte: 260 } } };
                case 'purple': return { range: { "color.h": { gte: 260, lte: 320 } } };
                case 'pink': return { range: { "color.h": { gte: 320, lte: 340 } } };
                case 'black': return { range: { "color.l": { lte: 20 } } };
                case 'white': return { range: { "color.l": { gte: 80 } } };
                default: return null;
            }
        }).filter(Boolean);

        if (colorQueries.length > 0) {
            filter.push({
                bool: {
                    should: colorQueries
                }
            });
        }
    }

    // Sorgu Nesnesini Oluştur
    const esQuery = {
        query: {
            bool: {
                must: must,
                filter: filter
            }
        },
        fields: [
            "id", "title", "image_id", "artist_display",
            "medium_display", "classification_title",
            "style_title", "place_of_origin", "is_public_domain"
        ],
        limit: limit,
        from: (page - 1) * limit
    };

    const url = `${AIC_API_BASE}/artworks/search`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(esQuery)
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        if (!data || !data.data) {
            return { items: [], totalPages: 0 };
        }

        const iiifBaseUrl = data.config?.iiif_url || "https://www.artic.edu/iiif/2";

        const artworks = data.data
            .filter(item => item.image_id)
            .map(item => ({
                id: item.id,
                title: item.title,
                artist: item.artist_display,
                medium: item.medium_display || item.classification_title,
                style: item.style_title,
                place: item.place_of_origin,
                image_url: `${iiifBaseUrl}/${item.image_id}/full/843,/0/default.jpg`,
                thumbnail: `${iiifBaseUrl}/${item.image_id}/full/400,/0/default.jpg`
            }));

        return {
            items: artworks,
            totalPages: Math.ceil((data.pagination?.total || 0) / limit),
            total: data.pagination?.total || 0
        };
    } catch (error) {
        console.error("AIC Fetch Error:", error);
        return { items: [], totalPages: 0 };
    }
};
