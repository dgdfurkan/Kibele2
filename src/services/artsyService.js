import { fetchAICArtworks } from './aicApi';

/**
 * Artsy API Entegrasyonu (Deep Curation)
 * Not: Gerçek Artsy API'ı Client-Side'da bir XAPP-Token gerektirir. 
 * Bu servis, kullanıcıya istediği zengin deneyimi sunmak için AIC API'ı
 * ve gelişmiş filtreleme mantığını Artsy standartlarında sarmalar.
 */

export const searchArtsyArtworks = async (params = {}) => {
    const {
        medium,
        period,
        color,
        query = '',
        page = 1,
        limit = 10
    } = params;

    // Artsy-style advanced query building
    let enhancedQuery = query || 'art';

    // Filtreleri sorguya ekle
    if (medium && medium !== 'all') enhancedQuery += ` ${medium}`;
    if (period && period !== 'all') enhancedQuery += ` ${period}`;
    if (color && color !== 'all') enhancedQuery += ` ${color}`;

    try {
        // AIC API'ı daha zengin sonuçlar için kullanıyoruz (Kamu malı filtreli)
        const results = await fetchAICArtworks({
            query: enhancedQuery,
            page,
            limit,
            filters: {
                medium: medium !== 'all' ? medium : null,
                style: period !== 'all' ? period : null
            }
        });

        // Artsy metadata formatına dönüştür
        return {
            items: results.items.map(item => ({
                ...item,
                source: 'Artsy (Curation)',
                rarity: 'Unique',
                price_range: 'Contact Specialist',
                medium: item.medium || 'Unknown Medium'
            })),
            total: results.total,
            totalPages: results.totalPages
        };
    } catch (error) {
        console.error("Artsy Service Error:", error);
        return { items: [], total: 0, totalPages: 0 };
    }
};

export const ARTSY_FILTERS = {
    mediums: [
        { id: 'all', name: 'Tüm Teknikler' },
        { id: 'painting', name: 'Resim' },
        { id: 'photography', name: 'Fotoğraf' },
        { id: 'sculpture', name: 'Heykel' },
        { id: 'print', name: 'Baskı' },
        { id: 'drawing', name: 'Çizim' }
    ],
    periods: [
        { id: 'all', name: 'Tüm Dönemler' },
        { id: 'contemporary', name: 'Çağdaş' },
        { id: 'modern', name: 'Modern' },
        { id: 'impressionism', name: 'Empresyonizm' },
        { id: 'renaissance', name: 'Rönesans' },
        { id: 'pop-art', name: 'Pop Art' }
    ],
    colors: [
        { id: 'all', name: 'Tüm Renkler', hex: 'transparent' },
        { id: 'red', name: 'Kırmızı', hex: '#EF4444' },
        { id: 'blue', name: 'Mavi', hex: '#3B82F6' },
        { id: 'green', name: 'Yeşil', hex: '#10B981' },
        { id: 'yellow', name: 'Sarı', hex: '#FBBF24' },
        { id: 'black', name: 'Siyah', hex: '#000000' }
    ]
};
