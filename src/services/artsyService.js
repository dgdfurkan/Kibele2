import { fetchAICArtworks } from './aicApi';

/**
 * Artsy API Entegrasyonu (Deep Curation)
 */

export const searchArtsyArtworks = async (params = {}) => {
    const {
        mediums = [],
        styles = [],
        colors = [],
        places = [],
        topics = [],
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
                mediums,
                styles,
                colors,
                places,
                topics
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
    mediums: [
        { id: 'Painting', name: 'Resim' },
        { id: 'Photograph', name: 'Fotoğraf' },
        { id: 'Sculpture', name: 'Heykel' },
        { id: 'Print', name: 'Baskı' },
        { id: 'Drawing', name: 'Çizim' },
        { id: 'Decorative Arts', name: 'Dekoratif Sanat' },
        { id: 'Ceramics', name: 'Seramik' }
    ],
    styles: [
        { id: 'Modernism', name: 'Modernizm' },
        { id: 'Impressionism', name: 'Empresyonizm' },
        { id: 'Surrealism', name: 'Sürrealizm' },
        { id: 'Pop Art', name: 'Pop Art' },
        { id: 'Contemporary Art', name: 'Çağdaş Sanat' },
        { id: 'Baroque', name: 'Barok' },
        { id: 'Renaissance', name: 'Rönesans' }
    ],
    places: [
        { id: 'France', name: 'Fransa' },
        { id: 'Japan', name: 'Japonya' },
        { id: 'United States', name: 'ABD' },
        { id: 'Italy', name: 'İtalya' },
        { id: 'China', name: 'Çin' },
        { id: 'Netherlands', name: 'Hollanda' },
        { id: 'India', name: 'Hindistan' }
    ],
    topics: [
        { id: 'Nature', name: 'Doğa' },
        { id: 'Architecture', name: 'Mimari' },
        { id: 'Portraits', name: 'Portre' },
        { id: 'Mythology', name: 'Mitoloji' },
        { id: 'Landscape', name: 'Manzara' },
        { id: 'Animals', name: 'Hayvanlar' },
        { id: 'Religion', name: 'Din' }
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
