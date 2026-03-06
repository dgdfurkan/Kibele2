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

    return (
        <div className={`w-full max-w-5xl mx-auto glass-card shadow-xl flex flex-col overflow-hidden transition-all duration-500 border-white/40 ${!isPremium ? 'blur-md pointer-events-none' : ''}`}>
            {/* Header */}
            <div className="px-10 py-8 bg-[#E8E5F9]/80 backdrop-blur-md flex items-center justify-between border-b border-text-main/5">
                <div className="flex items-center gap-4">
                    <span className="text-2xl">✨</span>
                    <h3 className="font-serif text-2xl text-text-main font-medium">Kibele AI Partner</h3>
                </div>
            </div>

            {/* Messages Area */}
            <div ref={scrollRef} className="h-[450px] p-10 overflow-y-auto bg-[#FDF0E9]/60 backdrop-blur-sm space-y-8">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] px-8 py-5 rounded-[2rem] text-lg leading-relaxed shadow-sm ${msg.role === 'user'
                                ? 'bg-accent-blue text-white rounded-tr-none'
                                : 'bg-[#E8E5F9] text-text-main rounded-tl-none font-sans'
                            }`}>
                            {msg.parts[0].text}
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div className="flex justify-start">
                        <div className="bg-[#E8E5F9]/50 text-text-muted text-sm px-8 py-4 rounded-full italic animate-pulse">
                            Kibele ilham topluyor...
                        </div>
                    </div>
                )}
            </div>

            {/* Input Footer */}
            <div className="p-10 bg-[#F4F3EE]/80 backdrop-blur-md border-t border-text-main/5 flex items-center gap-6">
                <div className="flex-1 bg-white rounded-2xl border border-text-main/10 px-6 py-4 shadow-inner">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                        placeholder="Kibele ile yaratıcı fikirlerini konuş..."
                        className="w-full bg-transparent border-none outline-none text-base text-text-main placeholder:text-text-muted/50 resize-none min-h-[40px] flex items-center"
                        rows={1}
                    />
                </div>
                <button
                    onClick={handleSend}
                    disabled={!input.trim() || isTyping}
                    className="bg-accent-blue hover:bg-accent-blue-hover text-white px-10 py-5 rounded-2xl font-serif text-xl transition-all duration-300 disabled:opacity-40 shadow-lg shadow-accent-blue/20 active:scale-95 flex items-center justify-center min-w-[140px]"
                >
                    Gönder
                </button>
            </div>

            {!isPremium && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/20 backdrop-blur-md z-10">
                    <div className="glass-card p-12 text-center max-w-sm border-white/60 shadow-2xl">
                        <LucideSparkles className="mx-auto mb-6 text-accent-blue animate-pulse" size={48} />
                        <h4 className="text-2xl font-serif mb-4 italic">Özel Diyalog</h4>
                        <p className="text-base text-text-muted mb-8 leading-relaxed">
                            Kibele hoca ile birebir yaratıcı diyalog kurmak için giriş yapmalısın canım.
                        </p>
                        <button className="btn-primary w-full py-4 text-lg">Giriş Yap</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KibeleChat;
