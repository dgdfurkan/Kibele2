import React from 'react';

/**
 * **kalın** → <strong>, paragraf/madde aralarında boşluk.
 * Kibele yanıtlarını okunaklı göstermek için.
 */
function formatInline(text) {
    if (!text) return null;
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
        const m = part.match(/^\*\*(.+)\*\*$/);
        if (m) return <strong key={i}>{m[1]}</strong>;
        return part;
    });
}

export default function FormattedChatMessage({ text, className = '' }) {
    if (!text || typeof text !== 'string') return null;

    const paragraphs = text.split(/\n\n+/).filter(Boolean);

    return (
        <span className={`block ${className}`}>
            {paragraphs.map((block, i) => {
                const trimmed = block.trim();
                const numberedItems = trimmed.split(/\s+(?=\d+\.\s)/);

                if (numberedItems.length > 1) {
                    return (
                        <span key={i} className="block mb-3 last:mb-0">
                            {numberedItems.map((item, j) => (
                                <span key={j} className="block mb-2 last:mb-0">
                                    {formatInline(item.trim())}
                                </span>
                            ))}
                        </span>
                    );
                }

                return (
                    <span key={i} className="block mb-3 last:mb-0">
                        {formatInline(trimmed)}
                    </span>
                );
            })}
        </span>
    );
}
