import { generateKibeleResponse } from '../services/kibeleApi';

const KibelePartner = () => {
    const [messages, setMessages] = useState([
        {
            role: 'ai',
            text: 'Selam Canım! Ben Kibele. Yaratıcı sürecinde sana nasıl ilham verebilirim? Bir fikrin varsa paylaş, "it is okey" birlikte geliştirebiliriz! ✨'
        }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const chatBoxRef = useRef(null);

    const KIBELE_SECRET_KEY = import.meta.env.VITE_GEMINI_API_KEY;

    useEffect(() => {
        if (chatBoxRef.current) {
            chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSend = async () => {
        if (!input.trim() || isTyping) return;

        const userText = input.trim();
        const history = messages.map(msg => ({
            role: msg.role === 'ai' ? 'model' : 'user',
            parts: [{ text: msg.text }]
        }));

        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userText }]);
        setIsTyping(true);

        try {
            const aiResponse = await generateKibeleResponse(KIBELE_SECRET_KEY, history, userText);
            setMessages(prev => [...prev, { role: 'ai', text: aiResponse }]);
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
                <div className="kibele-title">Kibele AI Partner</div>
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
