import { fetchAICArtworks } from './aicApi';

/**
 * Artsy API Entegrasyonu (Deep Curation)
 */

export const searchArtsyArtworks = async (params = {}) => {
    const {
        artists = [],
        artwork_type = [],
        colors = [],
        places = [],
        query = '',
        page = 1,
        limit = 20
    } = params;

    try {
        const results = await fetchAICArtworks({
            query,
            page,
            limit,
            filters: {
                artists,
                artwork_type,
                colors,
                places
            }
        });

        return {
            items: results.items.map(item => ({
                ...item,
                source: 'Kibele Curation',
                rarity: 'Unique',
                price_range: 'Public Domain'
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
    artwork_type: [
        { id: 'Print', name: 'Baskı' },
        { id: 'Photograph', name: 'Fotoğraf' },
        { id: 'Drawing and Watercolor', name: 'Çizim ve Sulu Boya' },
        { id: 'Textile', name: 'Tekstil' },
        { id: 'Painting', name: 'Resim' },
        { id: 'Architectural Drawing', name: 'Mimari Çizim' },
        { id: 'Book', name: 'Kitap' },
        { id: 'Ceramics', name: 'Seramik' }
    ],
    artists: [
        { id: 'Utagawa Hiroshige', name: 'Utagawa Hiroshige' },
        { id: 'Unknown artist', name: 'Bilinmeyen Sanatçı' },
        { id: 'Ancient Roman', name: 'Antik Roma' },
        { id: 'James McNeill Whistler', name: 'James McNeill Whistler' },
        { id: 'Ancient Egyptian', name: 'Antik Mısır' },
        { id: 'Jasper Johns', name: 'Jasper Johns' }
    ],
    places: [
        { id: 'United States', name: 'Amerika Birleşik Devletleri' },
        { id: 'France', name: 'Fransa' },
        { id: 'Japan', name: 'Japonya' },
        { id: 'England', name: 'İngiltere' },
        { id: 'Italy', name: 'İtalya' },
        { id: 'Germany', name: 'Almanya' },
        { id: 'China', name: 'Çin' },
        { id: 'Netherlands', name: 'Hollanda' }
    ],
    colors: [
        { id: 'red', name: 'Kırmızı', hex: '#EF4444' },
        { id: 'orange', name: 'Turuncu', hex: '#F97316' },
        { id: 'yellow', name: 'Sarı', hex: '#FBBF24' },
        { id: 'green', name: 'Yeşil', hex: '#10B981' },
        { id: 'blue', name: 'Mavi', hex: '#3B82F6' },
        { id: 'purple', name: 'Mor', hex: '#A855F7' },
        { id: 'pink', name: 'Pembe', hex: '#EC4899' },
        { id: 'black', name: 'Siyah', hex: '#000000' },
        { id: 'white', name: 'Beyaz', hex: '#FFFFFF' }
    ]
};
