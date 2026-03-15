const AIC_API_BASE = "https://api.artic.edu/api/v1";

// Yardımcı fonksiyon: HEX to HSL çevirici
const hexToHSL = (hex) => {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
        r = parseInt(hex.substring(1, 3), 16);
        g = parseInt(hex.substring(3, 5), 16);
        b = parseInt(hex.substring(5, 7), 16);
    }
    r /= 255; g /= 255; b /= 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
};

export const AIC_FILTERS = {
    artists: [
        { id: 'Utagawa hiroshige', name: 'Utagawa hiroshige' },
        { id: 'Unknown artist', name: 'Unknown artist' },
        { id: 'Unknown', name: 'Unknown' },
        { id: 'Unknown maker', name: 'Unknown maker' },
        { id: 'Ancient roman', name: 'Ancient roman' },
        { id: 'James mcneill whistler', name: 'James mcneill whistler' },
        { id: 'Ancient egyptian', name: 'Ancient egyptian' },
        { id: 'Jasper johns', name: 'Jasper johns' }
    ],
    places: [
        { id: 'United states', name: 'United states' },
        { id: 'France', name: 'France' },
        { id: 'Japan', name: 'Japan' },
        { id: 'England', name: 'England' },
        { id: 'Italy', name: 'Italy' },
        { id: 'Germany', name: 'Germany' },
        { id: 'China', name: 'China' },
        { id: 'Netherlands', name: 'Netherlands' }
    ],
    artwork_type: [
        { id: 'Print', name: 'Print' },
        { id: 'Photograph', name: 'Photograph' },
        { id: 'Drawing and Watercolor', name: 'Drawing and Watercolor' },
        { id: 'Textile', name: 'Textile' },
        { id: 'Painting', name: 'Painting' },
        { id: 'Architectural Drawing', name: 'Architectural Drawing' },
        { id: 'Book', name: 'Book' },
        { id: 'Ceramics', name: 'Ceramics' }
    ],
    styles: [
        { id: 'Japanese (culture or style)', name: 'Japanese (culture or style)' },
        { id: '19th century', name: '19th century' },
        { id: '21st Century', name: '21st Century' },
        { id: '20th Century', name: '20th Century' },
        { id: 'Chinese (culture or style)', name: 'Chinese (culture or style)' },
        { id: 'Ancient', name: 'Ancient' },
        { id: 'Modernism', name: 'Modernism' },
        { id: 'Arts of the Americas', name: 'Arts of the Americas' }
    ],
    subjects: [
        { id: 'Chicago', name: 'Chicago' },
        { id: 'Collected by Hugh Edwards', name: 'Collected by Hugh Edwards' },
        { id: 'Portraits', name: 'Portraits' },
        { id: 'Photography', name: 'Photography' },
        { id: 'Portrait', name: 'Portrait' },
        { id: 'Architecture', name: 'Architecture' },
        { id: 'Design', name: 'Design' },
        { id: 'Portraits: male subject', name: 'Portraits: male subject' }
    ],
    classifications: [
        { id: 'Prints and drawing', name: 'Prints and drawing' },
        { id: 'Print', name: 'Print' },
        { id: 'Photograph', name: 'Photograph' },
        { id: 'Photography', name: 'Photography' },
        { id: 'Photographic process', name: 'Photographic process' },
        { id: 'Drawings (visual works)', name: 'Drawings (visual works)' },
        { id: 'Etching', name: 'Etching' },
        { id: 'Asian art', name: 'Asian art' }
    ],
    medium: [
        { id: 'Paper (fiber product)', name: 'Paper (fiber product)' },
        { id: 'Photographic paper', name: 'Photographic paper' },
        { id: 'Ink', name: 'Ink' },
        { id: 'Inorganic material', name: 'Inorganic material' },
        { id: 'Graphite', name: 'Graphite' },
        { id: 'Coating (material)', name: 'Coating (material)' },
        { id: 'Paint', name: 'Paint' },
        { id: 'Watercolor', name: 'Watercolor' }
    ],
    departments: [
        { id: 'Applied Arts of Europe', name: 'Applied Arts of Europe' },
        { id: 'Architecture and Design', name: 'Architecture and Design' },
        { id: 'Arts of Africa', name: 'Arts of Africa' },
        { id: 'Arts of Asia', name: 'Arts of Asia' },
        { id: 'Arts of Greece, Rome, and Byzantium', name: 'Arts of Greece, Rome, and Byzantium' },
        { id: 'Arts of the Americas', name: 'Arts of the Americas' },
        { id: 'Contemporary Art', name: 'Contemporary Art' },
        { id: 'Modern Art', name: 'Modern Art' },
        { id: 'Modern and Contemporary Art', name: 'Modern and Contemporary Art' },
        { id: 'Painting and Sculpture of Europe', name: 'Painting and Sculpture of Europe' },
        { id: 'Photography and Media', name: 'Photography and Media' },
        { id: 'Prints and Drawings', name: 'Prints and Drawings' },
        { id: 'Research Center', name: 'Research Center' },
        { id: 'Textiles', name: 'Textiles' }
    ],
    sort_options: [
        { id: 'relevance', name: 'By Relevance' },
        { id: 'title', name: 'By Title' },
        { id: 'artist', name: 'By Artist' },
        { id: 'date', name: 'By Date' }
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

    // Style Filtresi (Çoklu Seçim)
    if (filters.styles && filters.styles.length > 0) {
        filter.push({
            terms: {
                "style_title.keyword": filters.styles
            }
        });
    }

    // Subject Filtresi (Çoklu Seçim)
    if (filters.subjects && filters.subjects.length > 0) {
        filter.push({
            terms: {
                "subject_titles.keyword": filters.subjects
            }
        });
    }

    // Classification Filtresi (Çoklu Seçim)
    if (filters.classifications && filters.classifications.length > 0) {
        filter.push({
            terms: {
                "classification_title.keyword": filters.classifications
            }
        });
    }

    // Medium Filtresi (Çoklu Seçim)
    if (filters.medium && filters.medium.length > 0) {
        filter.push({
            terms: {
                "material_titles.keyword": filters.medium
            }
        });
    }

    // Department Filtresi (Çoklu Seçim)
    if (filters.departments && filters.departments.length > 0) {
        filter.push({
            terms: {
                "department_title.keyword": filters.departments
            }
        });
    }

    // Date Filtresi (Tarih Aralığı)
    if (filters.date_start !== undefined || filters.date_end !== undefined) {
        const dateRange = {};
        if (filters.date_start !== undefined) dateRange.gte = filters.date_start;
        if (filters.date_end !== undefined) dateRange.lte = filters.date_end;
        
        filter.push({
            range: {
                "date_start": dateRange // date_start field'ını temel alarak yapıyoruz (veya date_display)
            }
        });
    }

    // Renk Filtresi (Hex kodu)
    if (filters.color_hex && filters.color_hex.trim() !== '') {
        const hsl = hexToHSL(filters.color_hex);
        // HSL üzerinden yakın renk aralıklarıyla filtreleme yapıyoruz +- 15
        filter.push({
            bool: {
                must: [
                    { range: { "color.h": { gte: Math.max(0, hsl.h - 15), lte: Math.min(360, hsl.h + 15) } } },
                    // { range: { "color.s": { gte: Math.max(0, hsl.s - 20) } } }, 
                    // { range: { "color.l": { gte: Math.max(0, hsl.l - 20), lte: Math.min(100, hsl.l + 20) } } }
                ]
            }
        });
    }

    // Sort mantığı
    let sort = [];
    if (filters.sort === 'title') {
        sort = [{ "title.keyword": { "order": "asc" } }];
    } else if (filters.sort === 'artist') {
        sort = [{ "artist_title.keyword": { "order": "asc" } }];
    } else if (filters.sort === 'date') {
        sort = [{ "date_start": { "order": "desc" } }];
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
        sort: sort.length > 0 ? sort : undefined,
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
