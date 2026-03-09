import React, { useState, useEffect, useRef } from 'react';
import { LucideSparkles, LucideSend, LucideLoader2 } from 'lucide-react';

const ChatPartner = () => {
    const [messages, setMessages] = useState([
        {
            role: 'ai',
            text: 'Selam Canım! Ben Kibele. Yaratıcı sürecinde sana nasıl ilham verebilirim? Bir fikrin varsa paylaş, "it is okey" birlikte geliştirebiliriz! ✨'
        }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const chatBoxRef = useRef(null);

    const GEMINI_API_KEY = 'AIzaSyBbbVYBhmhik8wgLJg9_H2J2URi1cldsOM'; // User's provided key from script.js

    useEffect(() => {
        if (chatBoxRef.current) {
            chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSend = async () => {
        if (!input.trim() || isTyping) return;

        const userText = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userText }]);
        setIsTyping(true);

        try {
            const conversationHistory = [
                {
                    role: "user",
                    parts: [{ text: "Sen Kibele adında bir yapay zeka sanat partnerisin. Konuşmalarında samimi ve destekleyici bir ton kullan. 'Canım' ve 'it is okey' gibi kelimeleri veya kalıpları doğal bir şekilde aralara serpiştirerek cevaplar ver. Kullanıcıya her zaman ilham verici, sanat odaklı ve rahatlatıcı bir üslupla yaklaş." }]
                },
                {
                    role: "model",
                    parts: [{ text: "Anladım canım. It is okey, yaratıcı sürecinde her zaman yanındayım. Hadi ilham verici fikirlerimizi paylaşalım!" }]
                },
                ...messages.map(msg => ({
                    role: msg.role === 'ai' ? 'model' : 'user',
                    parts: [{ text: msg.text }]
                })),
                { role: 'user', parts: [{ text: userText }] }
            ];

            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: conversationHistory })
            });

            if (!response.ok) throw new Error("Kibele şu an biraz yorgun... It is okey, sonra tekrar deneyelim.");

            const data = await response.json();
            const aiResponse = data.candidates[0].content.parts[0].text;

            setMessages(prev => [...prev, { role: 'ai', text: aiResponse }]);
        } catch (error) {
            console.error("Chat Error:", error);
            setMessages(prev => [...prev, { role: 'ai', text: "Bir sorun oluştu canım, ama it is okey. Tekrar dener misin?" }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="gemini-chat-container">
            <div className="gemini-chat-header">
                <div className="gemini-icon">✨</div>
                <div className="gemini-title">Kibele AI Partner</div>
            </div>

            <div className="gemini-chat-box shadow-inner" ref={chatBoxRef}>
                {messages.map((msg, index) => (
                    <div key={index} className={`chat-message ${msg.role}-message animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                        {msg.text}
                    </div>
                ))}
                {isTyping && (
                    <div className="chat-message ai-message typing-indicator italic opacity-60">
                        Kibele düşünüyor...
                    </div>
                )}
            </div>

            <div className="gemini-chat-input-wrapper">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                    placeholder="Kibele ile yaratıcı fikirlerini konuş..."
                    rows="1"
                    className="custom-scrollbar"
                />
                <button
                    onClick={handleSend}
                    disabled={isTyping || !input.trim()}
                    className="btn-send shadow-lg"
                >
                    {isTyping ? <LucideLoader2 size={18} className="animate-spin" /> : "Gönder"}
                </button>
            </div>
        </div>
    );
};

export default ChatPartner;
