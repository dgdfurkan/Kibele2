import React, { useState, useEffect, useRef } from 'react';
import { LucideSparkles, LucideSend, LucideLoader2 } from 'lucide-react';
import { generateKibeleResponse } from '../services/kibeleApi';
import { useAuth } from '../context/AuthContext';
import { saveKibeleChatMessage, subscribeToKibeleChat } from '../services/dbService';

const KibelePartner = ({ roomId }) => {
    const { user } = useAuth();
    
    const INITIAL_MSG = {
        role: 'ai',
        text: 'Selam Canım! Ben Kibele. Yaratıcı sürecinde sana nasıl ilham verebilirim? Bir fikrin varsa paylaş, "it is okey" birlikte geliştirebiliriz! ✨'
    };

    const [messages, setMessages] = useState([INITIAL_MSG]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const chatBoxRef = useRef(null);

    const KIBELE_SECRET_KEY = import.meta.env.VITE_GEMINI_API_KEY;

    // Sohbet geçmişini veritabanından çek ve dinle
    useEffect(() => {
        if (!user) {
            setMessages([INITIAL_MSG]);
            return;
        }

        const unsubscribe = subscribeToKibeleChat(user.uid, roomId, (fetchedMessages) => {
            if (fetchedMessages.length > 0) {
                const formatted = fetchedMessages.map(m => ({
                    role: m.role,
                    text: m.text
                }));
                // Her zaman başlangıç mesajını en başa koy
                setMessages([INITIAL_MSG, ...formatted]);
            } else {
                setMessages([INITIAL_MSG]);
            }
        });

        return () => unsubscribe();
    }, [user, roomId]);

    // Otomatik aşağı kaydırma
    useEffect(() => {
        if (chatBoxRef.current) {
            chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSend = async () => {
        if (!input.trim() || isTyping) return;

        const userText = input.trim();
        // Sadece kullanıcının ve AI'ın gerçek mesajlarını gönder (başlangıç selamlamasını hariç tut)
        const history = messages
            .filter(msg => msg.text !== INITIAL_MSG.text)
            .map(msg => ({
                role: msg.role === 'ai' ? 'model' : 'user',
                parts: [{ text: msg.text }]
            }));

        setInput('');
        
        // Optimistic UI update
        const newUserMsg = { role: 'user', text: userText };
        setMessages(prev => [...prev, newUserMsg]);
        setIsTyping(true);

        // Veritabanına kaydet (Eğer kullanıcı giriş yaptıysa)
        if (user) {
            saveKibeleChatMessage(user.uid, roomId, 'user', userText);
        }

        try {
            const aiResponse = await generateKibeleResponse(history, userText);
            
            // Optimistic UI update for AI 
            const newAiMsg = { role: 'ai', text: aiResponse };
            setMessages(prev => [...prev, newAiMsg]);

            if (user) {
                saveKibeleChatMessage(user.uid, roomId, 'ai', aiResponse);
            }
        } catch (error) {
            console.error("Kibele Chat Error:", error);
            setMessages(prev => [...prev, { role: 'ai', text: "Bir sorun oluştu canım, ama it is okey. Tekrar dener misin?" }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="kibele-chat-container">
            <div className="kibele-chat-header">
                <div className="kibele-icon">✨</div>
                        <h2 className="text-6xl mb-6">Kibele</h2>
            </div>

            <div className="kibele-chat-box shadow-inner" ref={chatBoxRef}>
                {messages.map((msg, index) => (
                    <div key={index} className={`kibele-message ${msg.role}-message animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                        {msg.text}
                    </div>
                ))}
                {isTyping && (
                    <div className="kibele-message ai-message typing-indicator italic opacity-60">
                        Kibele düşünüyor...
                    </div>
                )}
            </div>

            <div className="kibele-chat-input-wrapper">
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

export default KibelePartner;
