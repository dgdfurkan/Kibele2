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
/**
 * Basit GET sorgusu ile AIC eserleri getirir (filtre yokken veya sadece metin araması varken)
 */
const fetchSimpleAIC = async (page = 1, limit = 20, sortType = 'relevance', query = '') => {
    const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        fields: 'id,title,image_id,artist_display,medium_display,classification_title,style_title,place_of_origin,date_display,dimensions,credit_line,main_reference_number,description,department_title,artwork_type_title,date_start,date_end,artist_title,style_titles,subject_titles,technique_titles,material_titles,thumbnail,is_public_domain'
    });

    if (query) params.set('q', query);

    const url = `${AIC_API_BASE}/artworks/search?${params}`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        if (!data || !data.data) return { items: [], totalPages: 0 };

        const iiifBaseUrl = data.config?.iiif_url || "https://www.artic.edu/iiif/2";

        const artworks = data.data
            .filter(item => item.image_id)
            .map(item => ({
                id: item.id,
                title: item.title,
                artist: item.artist_display,
                artist_title: item.artist_title,
                medium: item.medium_display || item.classification_title,
                style: item.style_title,
                place: item.place_of_origin,
                date_display: item.date_display,
                dimensions: item.dimensions,
                credit_line: item.credit_line,
                main_reference_number: item.main_reference_number,
                description: item.description,
                department_title: item.department_title,
                artwork_type_title: item.artwork_type_title,
                classification_title: item.classification_title,
                date_start: item.date_start,
                date_end: item.date_end,
                style_titles: item.style_titles,
                subject_titles: item.subject_titles,
                technique_titles: item.technique_titles,
                material_titles: item.material_titles,
                aspect_ratio: item.thumbnail?.height && item.thumbnail?.width
                    ? item.thumbnail.height / item.thumbnail.width
                    : 1,
                image_url: `${iiifBaseUrl}/${item.image_id}/full/843,/0/default.jpg`,
                thumbnail: `${iiifBaseUrl}/${item.image_id}/full/400,/0/default.jpg`
            }));

        return {
            items: artworks,
            totalPages: Math.ceil((data.pagination?.total || 0) / limit),
            total: data.pagination?.total || 0
        };
    } catch (error) {
        console.error("AIC Simple Fetch Error:", error);
        return { items: [], totalPages: 0 };
    }
};

export const fetchAICArtworks = async (params = {}) => {
    const { limit = 20, page = 1, query = '', filters = {} } = params;

    // Eğer filtre veya arama yoksa, basit GET ile popüler eserleri getir
    const hasFilters = filters.artwork_type?.length > 0 ||
        filters.artists?.length > 0 ||
        filters.places?.length > 0 ||
        filters.styles?.length > 0 ||
        filters.subjects?.length > 0 ||
        filters.classifications?.length > 0 ||
        filters.medium?.length > 0 ||
        filters.departments?.length > 0 ||
        filters.color_hex ||
        (filters.date_start !== undefined) ||
        (filters.date_end !== undefined);

    const hasQuery = query && query.trim() !== '';

    // Basit GET sorgusu (filtre yoksa veya sadece metin araması varsa)
    if (!hasFilters && !hasQuery) {
        return fetchSimpleAIC(page, limit, filters.sort);
    }

    if (hasQuery && !hasFilters) {
        return fetchSimpleAIC(page, limit, filters.sort, query);
    }

    // Elasticsearch Query DSL (filtreli arama)
    const must = [];
    const filter = [
        { exists: { field: "image_id" } }
    ];

    // Metin araması
    if (hasQuery) {
        must.push({
            multi_match: {
                query: query,
                fields: ["title^3", "artist_title^2", "style_title", "classification_title", "medium_display", "description", "place_of_origin"],
                type: "cross_fields"
            }
        });
    }

    // Artwork type filtresi
    if (filters.artwork_type?.length > 0) {
        filter.push({
            terms: { "artwork_type_title": filters.artwork_type }
        });
    }

    // Sanatçı filtresi
    if (filters.artists?.length > 0) {
        must.push({
            bool: {
                should: filters.artists.map(a => ({
                    match: { "artist_title": a }
                })),
                minimum_should_match: 1
            }
        });
    }

    // Coğrafya filtresi
    if (filters.places?.length > 0) {
        filter.push({
            terms: { "place_of_origin": filters.places }
        });
    }

    // Style filtresi
    if (filters.styles?.length > 0) {
        must.push({
            bool: {
                should: filters.styles.map(s => ({
                    match: { "style_title": s }
                })),
                minimum_should_match: 1
            }
        });
    }

    // Subject filtresi
    if (filters.subjects?.length > 0) {
        must.push({
            bool: {
                should: filters.subjects.map(s => ({
                    match: { "subject_titles": s }
                })),
                minimum_should_match: 1
            }
        });
    }

    // Classification filtresi
    if (filters.classifications?.length > 0) {
        must.push({
            bool: {
                should: filters.classifications.map(c => ({
                    match: { "classification_title": c }
                })),
                minimum_should_match: 1
            }
        });
    }

    // Medium / Material filtresi
    if (filters.medium?.length > 0) {
        must.push({
            bool: {
                should: filters.medium.map(m => ({
                    match: { "material_titles": m }
                })),
                minimum_should_match: 1
            }
        });
    }

    // Department filtresi
    if (filters.departments?.length > 0) {
        filter.push({
            terms: { "department_title": filters.departments }
        });
    }

    // Date filtresi
    if (filters.date_start !== undefined || filters.date_end !== undefined) {
        const dateRange = {};
        if (filters.date_start !== undefined) dateRange.gte = filters.date_start;
        if (filters.date_end !== undefined) dateRange.lte = filters.date_end;
        filter.push({ range: { "date_start": dateRange } });
    }

    // Renk filtresi
    if (filters.color_hex && filters.color_hex.trim() !== '') {
        const hsl = hexToHSL(filters.color_hex);
        filter.push({
            bool: {
                must: [
                    { range: { "color.h": { gte: Math.max(0, hsl.h - 25), lte: Math.min(360, hsl.h + 25) } } },
                    { range: { "color.s": { gte: Math.max(0, hsl.s - 30) } } }
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
            "style_title", "place_of_origin", "is_public_domain",
            "date_display", "dimensions", "credit_line",
            "main_reference_number", "description",
            "department_title", "artwork_type_title",
            "date_start", "date_end", "artist_title",
            "style_titles", "subject_titles", "technique_titles",
            "material_titles", "thumbnail"
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
                artist_title: item.artist_title,
                medium: item.medium_display || item.classification_title,
                style: item.style_title,
                place: item.place_of_origin,
                date_display: item.date_display,
                dimensions: item.dimensions,
                credit_line: item.credit_line,
                main_reference_number: item.main_reference_number,
                description: item.description,
                department_title: item.department_title,
                artwork_type_title: item.artwork_type_title,
                classification_title: item.classification_title,
                date_start: item.date_start,
                date_end: item.date_end,
                style_titles: item.style_titles,
                subject_titles: item.subject_titles,
                technique_titles: item.technique_titles,
                material_titles: item.material_titles,
                aspect_ratio: item.thumbnail?.height && item.thumbnail?.width
                    ? item.thumbnail.height / item.thumbnail.width
                    : 1,
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
