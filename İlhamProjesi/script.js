// --- Dynamic Project Data ---
const initialProjects = [
    { src: "Mothers in Therapy.jpg", category: "Illustration / Contemporary" },
    { src: "A Rape Trial.jpg", category: "Photography / Modern" },
    { src: "Black Cemeteries.jpg", category: "Photography / Modern" },
    { src: "Hemlock.jpg", category: "Painting / Abstract" },
    { src: "Larkspur.jpg", category: "Mixed Media / Minimal" }
];

// Wait for DOM to load
document.addEventListener("DOMContentLoaded", () => {

    // Register GSAP ScrollTrigger
    gsap.registerPlugin(ScrollTrigger);

    // Initialize Dynamic Gallery BEFORE ScrollAnimations!
    renderGallery();
    initModalLogic();

    initHeroAnimation();
    initScrollAnimations();
    initCurationLogic();
    initProcessSteps();
    initGeminiChat();
});

function initHeroAnimation() {
    // Reveal text
    if (document.querySelector(".badge")) {
        gsap.from(".badge", { y: 20, opacity: 0, duration: 0.8, ease: "power3.out", delay: 0.2 });
    }
    if (document.querySelector(".hero-title")) {
        gsap.from(".hero-title", { y: 30, opacity: 0, duration: 1, ease: "power3.out", delay: 0.4 });
    }
    if (document.querySelector(".hero-subtitle")) {
        gsap.from(".hero-subtitle", { y: 30, opacity: 0, duration: 1, ease: "power3.out", delay: 0.6 });
    }
    if (document.querySelector(".hero-actions")) {
        gsap.from(".hero-actions", { y: 30, opacity: 0, duration: 1, ease: "power3.out", delay: 0.8 });
    }

    // Abstract Nodes Animation
    const tl = gsap.timeline({ repeat: -1, yoyo: true });

    // Floating effect for nodes
    gsap.to(".node-designer", {
        y: -20,
        x: 10,
        duration: 3,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true
    });

    gsap.to(".node-ai", {
        y: 20,
        x: -10,
        duration: 4,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true
    });

    // Pings on connection line
    gsap.fromTo(".connection-line",
        { opacity: 0.2 },
        { opacity: 0.8, duration: 2, repeat: -1, yoyo: true, ease: "power1.inOut" }
    );

    // Floating pills
    gsap.from(".floating-pill", {
        scale: 0,
        opacity: 0,
        duration: 1.5,
        stagger: 0.3,
        ease: "elastic.out(1, 0.7)",
        delay: 1.2
    });

    gsap.to(".ui-pill", { y: -15, duration: 3.5, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 1 });
    gsap.to(".ai-pill", { y: 15, duration: 4.2, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 2 });
    gsap.to(".ux-pill", { y: -10, duration: 3.8, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 1.5 });
}

function initScrollAnimations() {
    // Fade up sections
    const sections = gsap.utils.toArray('section:not(.hero)');

    sections.forEach(section => {
        gsap.from(section.querySelectorAll('.section-header'), {
            scrollTrigger: {
                trigger: section,
                start: "top 80%",
            },
            y: 50,
            opacity: 0,
            duration: 1,
            ease: "power3.out"
        });
    });

    // Gallery Items Reveal
    gsap.from(".gallery-item", {
        scrollTrigger: {
            trigger: ".gallery-grid",
            start: "top 95%",
        },
        y: 30,
        duration: 0.8,
        stagger: 0.2,
        ease: "power3.out"
    });

    // Hub Cards Reveal
    gsap.from(".hub-card", {
        scrollTrigger: {
            trigger: ".hub-cards",
            start: "top 85%",
        },
        y: 40,
        opacity: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: "power2.out"
    });
}

function initCurationLogic() {
    // Accordion Logic
    const accordions = document.querySelectorAll('.accordion-group');
    accordions.forEach(acc => {
        const header = acc.querySelector('.accordion-header');
        header.addEventListener('click', () => {
            const content = acc.querySelector('.accordion-content');
            const icon = acc.querySelector('.icon-plus');

            if (content.style.display === 'none') {
                content.style.display = 'block';
                icon.textContent = '-';
                acc.classList.add('active');
            } else {
                content.style.display = 'none';
                icon.textContent = '+';
                acc.classList.remove('active');
            }
        });
    });

    // Color Buttons Selection
    const colorBtns = document.querySelectorAll('.color-options .color-btn');
    colorBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            colorBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            fetchArtsyArtworks();
        });
    });

    // Checkboxes Selection
    const checkboxes = document.querySelectorAll('.custom-checkbox input');
    checkboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            fetchArtsyArtworks();
        });
    });

    // Price Inputs Setup (simulate delay to avoid heavy requests)
    const priceInputs = document.querySelectorAll('.price-inputs input');
    let timeout = null;
    priceInputs.forEach(input => {
        input.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                fetchArtsyArtworks();
            }, 800);
        });
    });
}

function fetchArtsyArtworks() {
    // Collect active filters
    const activeColors = Array.from(document.querySelectorAll('.color-btn.active')).map(b => b.dataset.color);
    const activeFilters = Array.from(document.querySelectorAll('.custom-checkbox input:checked')).map(cb => cb.value);

    console.log("Fetching with Artsy Filters:", { colors: activeColors, params: activeFilters });

    /**
     * ARTSY API INTEGRATION INSTRUCTIONS:
     * To make actual requests to Artsy's API:
     * 1. Go to https://developers.artsy.net/
     * 2. Create an App and get your CLIENT_ID and CLIENT_SECRET
     * 3. Send a POST to https://api.artsy.net/api/tokens/xapp_token to get a Bearer Token
     * 4. Use the token to fetch https://api.artsy.net/api/artworks
     */

    const ARTSY_CLIENT_ID = "YOUR_CLIENT_ID_HERE";
    const ARTSY_CLIENT_SECRET = "YOUR_CLIENT_SECRET_HERE";

    // Simulating API call response visually
    const galleryItems = document.querySelectorAll('.gallery-item');
    gsap.to(galleryItems, {
        opacity: 0.3,
        scale: 0.98,
        duration: 0.2,
        yoyo: true,
        repeat: 1,
        ease: "power1.inOut",
        stagger: 0.05
    });
}

function initProcessSteps() {
    const steps = document.querySelectorAll('.step-card');

    steps.forEach((step, index) => {
        step.addEventListener('mouseenter', () => {
            steps.forEach(s => s.classList.remove('active-step'));
            step.classList.add('active-step');
        });
    });

    // Add ScrollTrigger for Steps
    gsap.from(steps, {
        scrollTrigger: {
            trigger: ".process-steps",
            start: "top 80%",
        },
        y: 50,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: "power3.out"
    });
}

// Helper function to format filename into a readable title
function formatTitleFromFilename(filename) {
    let name = filename.replace(/\.[^/.]+$/, "");
    name = name.replace(/^[0-9-]+/, "");
    name = name.replace(/[_-]/g, " ");
    name = name.replace(/([a-z])([A-Z])/g, '$1 $2');
    name = name.replace(/(small|final|vsco)/gi, "");
    return name.trim() || "Untitled Project";
}

function renderGallery() {
    const galleryContainer = document.getElementById("dynamic-gallery");
    if (!galleryContainer) return;

    galleryContainer.innerHTML = ""; // Clear existing

    // Render Initial Projects
    initialProjects.forEach((project, index) => {
        const title = formatTitleFromFilename(project.src);
        const isLarge = index === 0 ? "item-large" : "";

        const itemHTML = `
            <div class="gallery-item ${isLarge}" data-src="${project.src}" data-title="${title}" data-category="${project.category}">
                <img class="img-content" src="${project.src}" alt="${title}" />
                <div class="item-overlay">
                    <h4>${title}</h4>
                    <span>${project.category}</span>
                </div>
            </div>
        `;
        galleryContainer.insertAdjacentHTML('beforeend', itemHTML);
    });

    // Render Add New Project Button
    const addItemHTML = `
        <div class="add-project-item" id="add-project-btn">
            <span class="add-icon">+</span>
            <span>Yeni Proje Ekle</span>
            <input type="file" id="file-upload" class="hidden-file-input" accept="image/png, image/jpeg, image/webp" />
        </div>
    `;
    galleryContainer.insertAdjacentHTML('beforeend', addItemHTML);

    bindGalleryItems();
    bindAddProjectLogic();
}

function bindGalleryItems() {
    const items = document.querySelectorAll('.gallery-item');
    items.forEach(item => {
        item.addEventListener('click', () => {
            openModal(
                item.dataset.src,
                item.dataset.title,
                item.dataset.category
            );
        });
    });
}

function bindAddProjectLogic() {
    const addBtn = document.getElementById('add-project-btn');
    const fileInput = document.getElementById('file-upload');

    if (!addBtn || !fileInput) return;

    addBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (event) {
                const newSrc = event.target.result;
                const newTitle = formatTitleFromFilename(file.name);

                initialProjects.unshift({
                    src: newSrc,
                    category: "Kibele AI Yorumu",
                    originalFileName: file.name
                });

                renderGallery();

                gsap.from(".gallery-item:first-child", {
                    scale: 0.8,
                    opacity: 0,
                    duration: 0.8,
                    ease: "back.out(1.7)"
                });
            };
            reader.readAsDataURL(file);
        }
    });
}

// Modal Logic
function initModalLogic() {
    const modal = document.getElementById('project-modal');
    const closeBtn = document.getElementById('modal-close');

    if (!modal || !closeBtn) return;

    closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
        document.body.style.overflow = "auto";
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
            document.body.style.overflow = "auto";
        }
    });
}

function openModal(src, title, category) {
    const modal = document.getElementById('project-modal');
    document.getElementById('modal-img').src = src;
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-category').textContent = category;

    modal.classList.add('active');
    document.body.style.overflow = "hidden";
}

// --- Gemini Chatbot Logic ---
function initGeminiChat() {
    const chatInputWrapper = document.getElementById('chat-input-wrapper');
    const chatInput = document.getElementById('gemini-chat-input');
    const sendBtn = document.getElementById('gemini-send-btn');
    const chatBox = document.getElementById('gemini-chat-box');

    const geminiApiKey = 'AIzaSyBbbVYBhmhik8wgLJg9_H2J2URi1cldsOM';
    let conversationHistory = [
        {
            role: "user",
            parts: [{ text: "Sen Kibele adında bir yapay zeka sanat partnerisin. Konuşmalarında samimi ve destekleyici bir ton kullan. 'Canım' ve 'it is okey' gibi kelimeleri veya kalıpları doğal bir şekilde aralara serpiştirerek cevaplar ver. Kullanıcıya her zaman ilham verici, sanat odaklı ve rahatlatıcı bir üslupla yaklaş." }]
        },
        {
            role: "model",
            parts: [{ text: "Anladım canım. It is okey, yaratıcı sürecinde her zaman yanındayım. Hadi ilham verici fikirlerimizi paylaşalım!" }]
        }
    ];

    const appendMessage = (text, sender) => {
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-message ${sender}-message`;
        msgDiv.textContent = text;
        chatBox.appendChild(msgDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    };

    const sendMessageToGemini = async (text) => {
        if (!geminiApiKey) return;

        // Add user message to history
        conversationHistory.push({ role: "user", parts: [{ text }] });

        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: conversationHistory })
            });

            if (!response.ok) {
                if (response.status === 400 || response.status === 403) {
                    throw new Error("API Anahtarı geçersiz veya yetkisiz. Lütfen doğru anahtarı girdiğinizden emin olun canım.");
                }
                throw new Error("Bir sorun oluştu.");
            }

            const data = await response.json();
            const aiText = data.candidates[0].content.parts[0].text;

            // Add model response to history
            conversationHistory.push({ role: "model", parts: [{ text: aiText }] });
            appendMessage(aiText, 'ai');

        } catch (error) {
            console.error("Gemini Error:", error);
            appendMessage(`Hata: ${error.message} It is okey, tekrar deneyebiliriz.`, 'ai');
            // Remove the failed user message from history to avoid confusion
            conversationHistory.pop();
        }
    };

    const handleSend = () => {
        const text = chatInput.value.trim();
        if (!text) return;

        appendMessage(text, 'user');
        chatInput.value = '';

        const typingDiv = document.createElement('div');
        typingDiv.className = 'chat-message ai-message typing-indicator';
        typingDiv.textContent = 'Kibele düşünüyor...';
        chatBox.appendChild(typingDiv);
        chatBox.scrollTop = chatBox.scrollHeight;

        sendMessageToGemini(text).finally(() => {
            if (chatBox.contains(typingDiv)) {
                chatBox.removeChild(typingDiv);
            }
        });
    };

    sendBtn.addEventListener('click', handleSend);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });
}
