// js/components/AiWidget.js
import { askAI } from '../services/aiService.js';
import { getCurrentUser, ROLES } from '../models/User.js';
import { isAIEnabled } from '../models/AIConfig.js';

// Markdown parser helper for rich chat responses
function renderMarkdown(text) {
    if (!text) return '';

    // Sanitize HTML
    let escaped = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // Action links [Label](#/url)
    escaped = escaped.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="ai-widget-link" onclick="window.closeAiWidgetChat && window.closeAiWidgetChat()">$1 &rarr;</a>');

    // Bold **text**
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italic *text*
    escaped = escaped.replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');

    // Lists (bullet & numbered)
    const lines = escaped.split('\n');
    let inUl = false;
    let inOl = false;
    const result = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const bulletMatch = line.match(/^[-*•]\s+(.+)/);
        const numMatch = line.match(/^(\d+)\.\s+(.+)/);

        if (bulletMatch) {
            if (inOl) { result.push('</ol>'); inOl = false; }
            if (!inUl) { result.push('<ul style="margin: 0.35rem 0 0.35rem 1.2rem; padding: 0;">'); inUl = true; }
            result.push(`<li style="margin-bottom: 0.25rem;">${bulletMatch[1]}</li>`);
        } else if (numMatch) {
            if (inUl) { result.push('</ul>'); inUl = false; }
            if (!inOl) { result.push('<ol style="margin: 0.35rem 0 0.35rem 1.2rem; padding: 0;">'); inOl = true; }
            result.push(`<li style="margin-bottom: 0.25rem;">${numMatch[2]}</li>`);
        } else {
            if (inUl) { result.push('</ul>'); inUl = false; }
            if (inOl) { result.push('</ol>'); inOl = false; }

            if (line === '') {
                result.push('<div style="height: 0.35rem;"></div>');
            } else {
                result.push(`<p style="margin: 0 0 0.35rem 0;">${line}</p>`);
            }
        }
    }

    if (inUl) result.push('</ul>');
    if (inOl) result.push('</ol>');

    return result.join('');
}



export function renderAiWidget() {
    const user = getCurrentUser();

    // Ketersediaan AI Assistant untuk SEMUA role yang sedang login (Super Admin, Ketua RW, Ketua RT 01, Ketua RT 02, Warga)
    if (!user) {
        return '';
    }

    const enabled = isAIEnabled();

    return `
        <!-- Floating AI Assistant Widget Container -->
        <div id="aiFloatingWidgetContainer" style="position: fixed; bottom: 24px; right: 24px; z-index: 9999; font-family: inherit;">
            
            <!-- Capsule Trigger Button -->
            <button id="btnAiCapsuleTrigger" class="ai-capsule-btn" title="Buka Tanya AI Assistant" aria-label="Tanya AI Assistant" style="background: linear-gradient(135deg, #4880FF 0%, #356BE5 100%); color: #ffffff; border: none; border-radius: 9999px; padding: 12px 22px; font-size: 0.9375rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 10px 25px -5px rgba(72, 128, 255, 0.45); transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); user-select: none;">
                <span class="ai-sparkle-icon" style="display: inline-flex; align-items: center; font-size: 1.15rem; color: #facc15;">
                    <i class="ph-bold ph-sparkle"></i>
                </span>
                <span>Tanya AI Assistant</span>
            </button>

            <!-- Floating Chat Popup Window -->
            <div id="aiChatPopupWindow" class="ai-popup-window" style="display: none; width: 390px; min-width: 380px; max-width: calc(100vw - 32px); height: 530px; min-height: 520px; max-height: calc(100vh - 80px); background: #ffffff; border: 1px solid var(--border-color); border-radius: 18px; box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.25); flex-direction: column; overflow: hidden; position: fixed; bottom: 24px; right: 24px; z-index: 10000; animation: aiSlideUpFade 0.25s ease;">
                
                <!-- Popup Header -->
                <div style="background: linear-gradient(135deg, #4880FF 0%, #356BE5 100%); color: #ffffff; padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 38px; height: 38px; border-radius: 10px; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 1.25rem; color: #ffffff;">
                            <i class="ph-bold ph-robot"></i>
                        </div>
                        <div>
                            <h3 style="font-size: 1rem; font-weight: 800; margin: 0; color: #ffffff; line-height: 1.2;">Assistant RW</h3>
                            <div style="font-size: 0.75rem; color: rgba(255,255,255,0.9); display: flex; align-items: center; gap: 5px;">
                                <span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: ${enabled ? '#00B69B' : '#EF3826'}; box-shadow: 0 0 6px ${enabled ? '#00B69B' : '#EF3826'};"></span>
                                <span>${enabled ? 'Online • Siap Membantu' : 'Dinonaktifkan'}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <!-- Reset Button -->
                        <button id="btnAiResetChat" title="Reset Percakapan" style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: #ffffff; border-radius: 8px; padding: 5px 10px; font-size: 0.75rem; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; cursor: pointer; transition: background 0.2s;">
                            <i class="ph-bold ph-arrows-clockwise" style="font-size: 0.85rem;"></i>
                            <span>Reset</span>
                        </button>
                        <!-- Close Button -->
                        <button id="btnAiClosePopup" title="Tutup Chat" style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: #ffffff; border-radius: 8px; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.2s;">
                            <i class="ph-bold ph-x" style="font-size: 1.1rem;"></i>
                        </button>
                    </div>
                </div>

                ${!enabled ? `
                <div style="background: #fef2f2; border-bottom: 1px solid #fecaca; color: #991b1b; padding: 10px 14px; font-size: 0.8125rem; display: flex; align-items: center; gap: 8px;">
                    <i class="ph-fill ph-warning-circle" style="color: #dc2626; font-size: 1.1rem; flex-shrink: 0;"></i>
                    <span>AI Assistant dinonaktifkan sementara oleh Administrator.</span>
                </div>
                ` : ''}

                <!-- Chat Body (Initially Clean & Empty, showing only quick suggestions) -->
                <div id="aiWidgetChatBody" style="flex: 1; padding: 16px 16px; overflow-y: auto; background: #f8fafc; display: flex; flex-direction: column; gap: 12px;">
                    
                    <!-- Clean Initial Placeholder / Suggestions Container -->
                    <div id="aiWidgetSuggestionsContainer" style="margin: auto 0; text-align: center; padding: 10px 0;">
                        <div style="width: 46px; height: 46px; border-radius: 50%; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center; margin: 0 auto 0.75rem auto; font-size: 1.5rem; border: 1px solid #bfdbfe;">
                            <i class="ph-fill ph-sparkle" style="color: #4f46e5;"></i>
                        </div>
                        <h4 style="font-size: 0.95rem; font-weight: 700; color: #1e293b; margin: 0 0 4px 0;">Tanya Assistant RW</h4>
                        <p style="font-size: 0.8125rem; color: #64748b; margin: 0 0 1rem 0; line-height: 1.4;">
                            Ketik pertanyaan atau pilih topik cepat berikut untuk memulai percakapan:
                        </p>
                        
                        <div style="display: flex; flex-wrap: wrap; gap: 6px; justify-content: center;">
                            <button class="ai-quick-btn" data-prompt="Bagaimana cara membuat SKTM?" style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 9999px; padding: 6px 14px; font-size: 0.75rem; font-weight: 600; color: #2563eb; cursor: pointer; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
                                📄 Cara buat SKTM
                            </button>
                            <button class="ai-quick-btn" data-prompt="Apa saja agenda kegiatan warga?" style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 9999px; padding: 6px 14px; font-size: 0.75rem; font-weight: 600; color: #2563eb; cursor: pointer; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
                                📅 Jadwal Kegiatan
                            </button>
                            <button class="ai-quick-btn" data-prompt="Bagaimana cara lapor pengaduan warga?" style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 9999px; padding: 6px 14px; font-size: 0.75rem; font-weight: 600; color: #2563eb; cursor: pointer; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
                                📢 Lapor Pengaduan
                            </button>
                            <button class="ai-quick-btn" data-prompt="Informasi pengumuman terbaru RW 05" style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 9999px; padding: 6px 14px; font-size: 0.75rem; font-weight: 600; color: #2563eb; cursor: pointer; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
                                📌 Pengumuman RW
                            </button>
                        </div>
                    </div>

                </div>

                <!-- Input Footer -->
                <div style="padding: 12px 14px; background: #ffffff; border-top: 1px solid #e2e8f0; display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                    <textarea id="aiWidgetInput" rows="1" placeholder="Ketik pertanyaan Anda..." style="flex: 1; border: 1px solid #cbd5e1; border-radius: 20px; padding: 9px 14px; font-size: 0.875rem; resize: none; max-height: 80px; outline: none; font-family: inherit; line-height: 1.4; transition: border-color 0.2s;" onfocus="this.style.borderColor='#4f46e5'" onblur="this.style.borderColor='#cbd5e1'"></textarea>
                    <button id="btnAiWidgetSend" class="btn btn-primary" title="Kirim Pesan" style="width: 38px; height: 38px; border-radius: 50%; padding: 0; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #2563eb, #4f46e5); border: none; color: white; cursor: pointer; flex-shrink: 0; box-shadow: 0 2px 5px rgba(79, 70, 229, 0.3);">
                        <i class="ph-fill ph-paper-plane-right" style="font-size: 1.1rem; margin-left: 2px;"></i>
                    </button>
                </div>

            </div>

        </div>

        <style>
            .ai-capsule-btn:hover {
                transform: translateY(-2px) scale(1.02);
                box-shadow: 0 14px 28px -5px rgba(99, 102, 241, 0.55), 0 10px 12px -6px rgba(99, 102, 241, 0.35) !important;
            }
            .ai-capsule-btn:active {
                transform: translateY(0) scale(0.98);
            }
            .ai-quick-btn:hover {
                background: #eff6ff !important;
                border-color: #93c5fd !important;
                color: #1d4ed8 !important;
                transform: translateY(-1px);
            }
            .ai-widget-link {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                background: #eff6ff;
                color: #1d4ed8;
                border: 1px solid #bfdbfe;
                padding: 4px 10px;
                border-radius: 6px;
                font-size: 0.8125rem;
                font-weight: 600;
                text-decoration: none;
                margin-top: 6px;
                transition: background 0.2s;
            }
            .ai-widget-link:hover {
                background: #dbeafe;
            }
            @keyframes aiSlideUpFade {
                from {
                    opacity: 0;
                    transform: translateY(14px) scale(0.97);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(8px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            .animate-fade-in-up {
                animation: fadeInUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            .ai-msg-row {
                animation: fadeInUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            @keyframes aiBounceDot {
                0%, 80%, 100% {
                    transform: translateY(0);
                    opacity: 0.35;
                }
                40% {
                    transform: translateY(-5px);
                    opacity: 1;
                }
            }
            .ai-typing-dot {
                display: inline-block;
                width: 6px;
                height: 6px;
                background: #4880FF;
                border-radius: 50%;
                margin: 0 2px;
                animation: aiBounceDot 1.2s infinite ease-in-out;
            }
            .ai-typing-dot:nth-child(1) { animation-delay: 0s; }
            .ai-typing-dot:nth-child(2) { animation-delay: 0.2s; }
            .ai-typing-dot:nth-child(3) { animation-delay: 0.4s; }
        </style>
    `;
}

export function setupAiWidgetEvents() {
    const triggerBtn = document.getElementById('btnAiCapsuleTrigger');
    const popupWindow = document.getElementById('aiChatPopupWindow');

    // Jika widget tidak dirender (misalnya role Ketua RW, Ketua RT, atau Super Admin), hentikan inisialisasi
    if (!triggerBtn && !popupWindow) {
        return;
    }

    const closeBtn = document.getElementById('btnAiClosePopup');
    const resetBtn = document.getElementById('btnAiResetChat');
    const chatBody = document.getElementById('aiWidgetChatBody');
    const inputField = document.getElementById('aiWidgetInput');
    const sendBtn = document.getElementById('btnAiWidgetSend');

    const renderEmptyState = () => {
        if (chatBody) {
            chatBody.innerHTML = `
                <div id="aiWidgetSuggestionsContainer" style="margin: auto 0; text-align: center; padding: 10px 0;">
                    <div style="width: 46px; height: 46px; border-radius: 50%; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center; margin: 0 auto 0.75rem auto; font-size: 1.5rem; border: 1px solid #bfdbfe;">
                        <i class="ph-fill ph-sparkle" style="color: #4f46e5;"></i>
                    </div>
                    <h4 style="font-size: 0.95rem; font-weight: 700; color: #1e293b; margin: 0 0 4px 0;">Tanya Assistant RW</h4>
                    <p style="font-size: 0.8125rem; color: #64748b; margin: 0 0 1rem 0; line-height: 1.4;">
                        Ketik pertanyaan atau pilih topik cepat berikut untuk memulai percakapan:
                    </p>
                    
                    <div style="display: flex; flex-wrap: wrap; gap: 6px; justify-content: center;">
                        <button class="ai-quick-btn" data-prompt="Bagaimana cara membuat SKTM?" style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 9999px; padding: 6px 14px; font-size: 0.75rem; font-weight: 600; color: #2563eb; cursor: pointer; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
                            📄 Cara buat SKTM
                        </button>
                        <button class="ai-quick-btn" data-prompt="Apa saja agenda kegiatan warga?" style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 9999px; padding: 6px 14px; font-size: 0.75rem; font-weight: 600; color: #2563eb; cursor: pointer; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
                            📅 Jadwal Kegiatan
                        </button>
                        <button class="ai-quick-btn" data-prompt="Bagaimana cara lapor pengaduan warga?" style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 9999px; padding: 6px 14px; font-size: 0.75rem; font-weight: 600; color: #2563eb; cursor: pointer; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
                            📢 Lapor Pengaduan
                        </button>
                        <button class="ai-quick-btn" data-prompt="Informasi pengumuman terbaru RW 05" style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 9999px; padding: 6px 14px; font-size: 0.75rem; font-weight: 600; color: #2563eb; cursor: pointer; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
                            📌 Pengumuman RW
                        </button>
                    </div>
                </div>
            `;
            attachQuickBtnListeners();
        }
    };

    const scrollToBottom = () => {
        if (chatBody) {
            chatBody.scrollTop = chatBody.scrollHeight;
        }
    };

    const resetChat = () => {
        renderEmptyState();
        if (inputField) {
            inputField.value = '';
            inputField.focus();
        }
    };

    const openChat = () => {
        if (popupWindow) {
            popupWindow.style.display = 'flex';
            if (triggerBtn) triggerBtn.style.display = 'none';
            // Memastikan tampilan chat bersih/kosong di awal saat baru dibuka
            resetChat();
            if (inputField) inputField.focus();
            scrollToBottom();
        }
    };

    const closeChat = () => {
        if (popupWindow) {
            popupWindow.style.display = 'none';
            if (triggerBtn) triggerBtn.style.display = 'inline-flex';
            // Secara otomatis reset/bersihkan riwayat chat ketika widget ditutup (close)
            resetChat();
        }
    };

    window.openAiWidgetChat = openChat;
    window.closeAiWidgetChat = closeChat;

    if (triggerBtn) triggerBtn.addEventListener('click', openChat);
    if (closeBtn) closeBtn.addEventListener('click', closeChat);
    if (resetBtn) resetBtn.addEventListener('click', resetChat);

    // Menutup widget dengan tombol keyboard Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && popupWindow && popupWindow.style.display !== 'none') {
            closeChat();
        }
    });

    const appendUserMessage = (text) => {
        // Hapus container suggestions di awal jika ada
        const emptyState = document.getElementById('aiWidgetSuggestionsContainer');
        if (emptyState) emptyState.remove();

        const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const userHtml = `
            <div class="ai-msg-row ai-msg-user animate-fade-in-up" style="display: flex; justify-content: flex-end; align-items: flex-end; gap: 8px;">
                <div style="max-width: 82%; background: linear-gradient(135deg, #4880FF 0%, #356BE5 100%); color: #ffffff; border-radius: 14px; border-bottom-right-radius: 4px; padding: 10px 14px; font-size: 0.875rem; line-height: 1.45; word-break: break-word; box-shadow: 0 4px 10px rgba(72, 128, 255, 0.25);">
                    ${escaped}
                </div>
            </div>
        `;
        chatBody.insertAdjacentHTML('beforeend', userHtml);
        chatBody.scrollTop = chatBody.scrollHeight;
    };

    const appendBotLoading = () => {
        const existing = document.getElementById('aiWidgetLoadingBubble');
        if (existing) existing.remove();

        const loadingHtml = `
            <div id="aiWidgetLoadingBubble" class="ai-msg-row ai-msg-bot animate-fade-in-up" style="display: flex; gap: 8px; align-items: flex-start;">
                <div style="width: 32px; height: 32px; border-radius: 10px; background: rgba(72, 128, 255, 0.12); color: #4880FF; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0; border: 1px solid rgba(72, 128, 255, 0.2);">
                    <i class="ph-bold ph-robot"></i>
                </div>
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; border-top-left-radius: 4px; padding: 10px 14px; font-size: 0.8125rem; color: #64748b; display: flex; align-items: center; gap: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                    <span style="font-weight: 500; font-style: italic;">Assistant RW sedang mengetik...</span>
                    <div style="display: inline-flex; align-items: center; gap: 2px;">
                        <span class="ai-typing-dot"></span>
                        <span class="ai-typing-dot"></span>
                        <span class="ai-typing-dot"></span>
                    </div>
                </div>
            </div>
        `;
        chatBody.insertAdjacentHTML('beforeend', loadingHtml);
        chatBody.scrollTop = chatBody.scrollHeight;
    };

    const appendBotMessage = (markdownText) => {
        const loading = document.getElementById('aiWidgetLoadingBubble');
        if (loading) loading.remove();

        const botHtml = `
            <div class="ai-msg-row ai-msg-bot animate-fade-in-up" style="display: flex; gap: 8px; align-items: flex-start;">
                <div style="width: 32px; height: 32px; border-radius: 10px; background: rgba(72, 128, 255, 0.12); color: #4880FF; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0; border: 1px solid rgba(72, 128, 255, 0.2);">
                    <i class="ph-bold ph-robot"></i>
                </div>
                <div style="max-width: 82%; background: #ffffff; color: var(--text-main); border: 1px solid var(--border-color, #e2e8f0); border-radius: 14px; border-top-left-radius: 4px; padding: 10px 14px; font-size: 0.875rem; line-height: 1.55; box-shadow: var(--shadow-sm); word-break: break-word;">
                    ${renderMarkdown(markdownText)}
                </div>
            </div>
        `;
        chatBody.insertAdjacentHTML('beforeend', botHtml);
        chatBody.scrollTop = chatBody.scrollHeight;
    };

    let isSending = false;

    const sendMessage = (customText = null) => {
        if (isSending) return; // Mencegah pengiriman ganda

        // 1. Ambil teks dari input
        const text = customText || (inputField ? inputField.value.trim() : '');
        if (!text) return;

        // PADA BARIS PALING PERTAMA (SEBELUM await, SEBELUM fetch, DAN SEBELUM SIMPAN STATE):
        // 1a. Langsung kosongkan nilai <input> seketika (0ms)
        if (inputField) {
            inputField.value = '';
            inputField.style.height = 'auto';
        }

        // 1b. Langsung suntikkan elemen HTML gelembung pesan biru user (0ms)
        appendUserMessage(text);

        // 1c. Langsung suntikkan elemen HTML gelembung indikator mengetik tepat di bawahnya (0ms)
        appendBotLoading();

        // 1d. Langsung jalankan scroll ke paling bawah (0ms)
        chatBody.scrollTop = chatBody.scrollHeight;

        // Nonaktifkan sementara tombol kirim agar anti double-submit
        isSending = true;
        if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.style.opacity = '0.5';
            sendBtn.style.cursor = 'not-allowed';
        }

        // 2. BARU SETELAH TAMPILAN DI ATAS MUNCUL DI LAYAR:
        // Jalankan pemanggilan askAI di latar belakang (asynchronous)
        setTimeout(async () => {
            try {
                if (!isAIEnabled()) {
                    const loading = document.getElementById('aiWidgetLoadingBubble');
                    if (loading) loading.remove();
                    appendBotMessage("Mohon maaf, layanan AI Assistant saat ini sedang dinonaktifkan oleh Administrator.");
                    return;
                }

                const rawReply = await askAI(text);
                appendBotMessage(rawReply);
            } catch (err) {
                console.error("AiWidget chat error:", err);
                const loading = document.getElementById('aiWidgetLoadingBubble');
                if (loading) loading.remove();
                appendBotMessage("Maaf, terjadi kendala saat memproses pertanyaan Anda: " + (err.message || 'Silakan coba beberapa saat lagi.'));
            } finally {
                isSending = false;
                if (sendBtn) {
                    sendBtn.disabled = false;
                    sendBtn.style.opacity = '1';
                    sendBtn.style.cursor = 'pointer';
                }
                // Pastikan kotak input tetap aktif, responsif, & fokus
                if (inputField) {
                    inputField.focus();
                }
            }
        }, 0);
    };

    const attachQuickBtnListeners = () => {
        const quickBtns = document.querySelectorAll('.ai-quick-btn');
        quickBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const prompt = e.currentTarget.getAttribute('data-prompt');
                if (prompt) sendMessage(prompt);
            });
        });
    };

    attachQuickBtnListeners();

    if (sendBtn) {
        sendBtn.addEventListener('click', () => sendMessage());
    }

    if (inputField) {
        inputField.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
}
