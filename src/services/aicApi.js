const AIC_API_BASE = "https://api.artic.edu/api/v1";

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
    if (filters.mediums && filters.mediums.length > 0) {
        filter.push({
            terms: {
                "classification_titles.keyword": filters.mediums
            }
        });
    }

    // Dönem/Akım Filtresi (Çoklu Seçim)
    if (filters.styles && filters.styles.length > 0) {
        filter.push({
            terms: {
                "style_titles.keyword": filters.styles
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

    // Tema/Konu Filtresi (Çoklu Seçim)
    if (filters.topics && filters.topics.length > 0) {
        filter.push({
            terms: {
                "subject_titles.keyword": filters.topics
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
