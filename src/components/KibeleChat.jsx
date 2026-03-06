import React, { useState, useRef, useEffect } from 'react';
import { LucideMessageSquare, LucideSend, LucideSparkles } from 'lucide-react';
import { generateKibeleResponse } from '../services/geminiApi';

const KibeleChat = ({ apiKey, isPremium }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: "model", parts: [{ text: "Selam canım! Ben Kibele. Yaratıcı sürecinde sana nasıl ilham verebilirim? Bir fikrin varsa paylaş, it is okey birlikte geliştirebiliriz!" }] }
    ]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSend = async () => {
        if (!input.trim() || isTyping) return;

        const userMsg = { role: "user", parts: [{ text: input }] };
        setMessages(prev => [...prev, userMsg]);
        const currentInput = input;
        setInput("");
        setIsTyping(true);

        const response = await generateKibeleResponse(apiKey, messages, currentInput);

        setMessages(prev => [...prev, { role: "model", parts: [{ text: response }] }]);
        setIsTyping(false);
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-8 right-8 w-16 h-16 bg-accent-blue text-white rounded-full shadow-2xl shadow-accent-blue/40 flex items-center justify-center hover:scale-110 transition-transform z-50 group"
            >
                <LucideMessageSquare size={28} />
                <div className="absolute -top-12 right-0 bg-text-main text-white text-xs px-4 py-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap font-medium">Kibele ile Konuş</div>
            </button>
        );
    }

    return (
        <div className={`fixed bottom-8 right-8 w-[400px] h-[600px] glass-card shadow-2xl flex flex-col z-50 overflow-hidden transition-all duration-500 scale-100 ${!isPremium ? 'blur-sm pointer-events-none' : ''}`}>
            {/* Header */}
            <div className="px-8 py-6 bg-text-main text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent-blue flex items-center justify-center text-xl">✨</div>
                    <div>
                        <div className="font-serif text-lg leading-tight">Kibele AI Partner</div>
                        <div className="text-[10px] uppercase tracking-widest text-white/40">Gemini 1.5 Flash</div>
                    </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="text-white/40 hover:text-white text-2xl">&times;</button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 p-8 overflow-y-auto space-y-6 bg-background/50">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] px-6 py-4 rounded-[1.5rem] text-sm leading-relaxed ${msg.role === 'user' ? 'bg-accent-blue text-white rounded-tr-none' : 'bg-surface-light/50 text-text-main rounded-tl-none'}`}>
                            {msg.parts[0].text}
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div className="flex justify-start">
                        <div className="bg-surface-light/30 text-text-muted text-xs px-6 py-3 rounded-full italic animate-pulse">
                            Kibele düşünüyor...
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="p-6 bg-white/50 backdrop-blur-md border-t border-text-main/5 flex gap-3">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                    placeholder="Kibele ile yaratıcı fikirlerini konuş..."
                    className="flex-1 bg-transparent border-none outline-none text-sm resize-none py-2"
                    rows={1}
                />
                <button
                    onClick={handleSend}
                    disabled={!input.trim() || isTyping}
                    className="w-10 h-10 bg-text-main text-white rounded-full flex items-center justify-center disabled:opacity-30 hover:bg-accent-blue transition-colors"
                >
                    <LucideSend size={18} />
                </button>
            </div>

            {!isPremium && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/20 backdrop-blur-sm z-10">
                    <div className="text-center p-8">
                        <LucideSparkles className="mx-auto mb-4 text-accent-blue" size={40} />
                        <h4 className="text-lg font-serif mb-2">Özel Diyalog</h4>
                        <p className="text-xs text-text-muted mb-6">Kibele ile konuşmak için öğrenci girişi yapmalısın canım.</p>
                        <button className="btn-primary py-2 px-6 text-xs">Giriş Yap</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KibeleChat;
