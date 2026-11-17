// js/pages/AIAssistant.js
import { askAI } from '../services/aiService.js';
import { getCurrentUser } from '../models/User.js';
import { isAIEnabled } from '../models/AIConfig.js';

// Fungsi bantuan untuk render markdown kaya (bold, italic, list bullet/nomor, link aksi, line breaks)
function renderMarkdown(text) {
    if (!text) return '';

    let escaped = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    escaped = escaped.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="ai-action-btn">$1 <i class="ph-bold ph-arrow-right"></i></a>');
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    escaped = escaped.replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');

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
            if (!inUl) { result.push('<ul style="margin: 0.5rem 0 0.5rem 1.25rem; padding: 0;">'); inUl = true; }
            result.push(`<li style="margin-bottom: 0.25rem;">${bulletMatch[1]}</li>`);
        } else if (numMatch) {
            if (inUl) { result.push('</ul>'); inUl = false; }
            if (!inOl) { result.push('<ol style="margin: 0.5rem 0 0.5rem 1.25rem; padding: 0;">'); inOl = true; }
            result.push(`<li style="margin-bottom: 0.25rem;">${numMatch[2]}</li>`);
        } else {
            if (inUl) { result.push('</ul>'); inUl = false; }
            if (inOl) { result.push('</ol>'); inOl = false; }

            if (line === '') {
                result.push('<div style="height: 0.4rem;"></div>');
            } else {
                result.push(`<p style="margin: 0 0 0.4rem 0;">${line}</p>`);
            }
        }
    }

    if (inUl) result.push('</ul>');
    if (inOl) result.push('</ol>');

    return result.join('');
}

export function renderAIAssistant() {
    const user = getCurrentUser();
    const displayName = user ? (user.nama || user.name || 'Warga') : 'Warga';
    const userRoleStr = user ? `${user.role || 'Warga'}${user.rt && user.rw ? ` (RT ${user.rt}/RW ${user.rw})` : (user.rw ? ` (RW ${user.rw})` : '')}` : '';
    const enabled = isAIEnabled();

    return `
        <div class="ai-main-container">
            <!-- Header Area -->
            <div class="ai-header">
                <div class="flex items-center gap-3">
                    <div class="ai-avatar-icon" style="${!enabled ? 'background: var(--danger-light); color: var(--danger-color);' : ''}">
                        <i class="ph-bold ph-robot text-2xl"></i>
                    </div>
                    <div>
                        <h2 class="font-bold text-lg" style="margin:0; line-height: 1.2; color: var(--text-main);">RW Assistant</h2>
                        <div class="text-muted" style="font-size: 0.8rem; display: flex; align-items: center; gap: 6px;">
                            <span class="ai-status-indicator" style="${!enabled ? 'background: var(--danger-color); box-shadow: 0 0 0 2px rgba(239, 56, 38, 0.2);' : ''}"></span>
                            ${enabled ? 'Asisten Virtual Digital RW (Aktif)' : '<span style="color: var(--danger-color); font-weight: 700;">Dinonaktifkan Sementara</span>'}
                        </div>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    ${user ? `
                    <div class="ai-user-badge">
                        <i class="ph-bold ph-user"></i>
                        <span>${displayName} ${userRoleStr ? `• ${userRoleStr}` : ''}</span>
                    </div>
                    ` : ''}
                    <button id="btnResetChat" class="btn-reset-chat" title="Reset Percakapan" style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; background: var(--bg-hover, #f1f5f9); border: 1px solid var(--border-color, #e2e8f0); border-radius: var(--radius-md, 8px); color: var(--text-muted, #64748b); font-size: 0.8rem; font-weight: 500; cursor: pointer; transition: all 0.2s;">
                        <i class="ph-bold ph-arrows-counter-clockwise"></i>
                        <span>Reset Percakapan</span>
                    </button>
                </div>
            </div>

            ${!enabled ? `
            <div style="background: var(--danger-light); border: 1px solid rgba(239, 56, 38, 0.25); color: #991b1b; padding: 12px 18px; margin: 1rem 1.5rem 0 1.5rem; border-radius: var(--radius-md); font-size: 0.875rem; display: flex; align-items: center; gap: 10px;">
                <i class="ph-bold ph-warning-circle" style="font-size: 1.25rem; flex-shrink: 0; color: var(--danger-color);"></i>
                <div>
                    <strong>Pemberitahuan:</strong> RW Assistant sedang dinonaktifkan sementara oleh Administrator. Silakan hubungi pengurus RT/RW atau coba kembali nanti.
                </div>
            </div>
            ` : ''}

            <!-- Main Chat Scrollable Container -->
            <div id="chatContainer" class="chat-container">
                <!-- Welcome Screen -->
                <div id="welcomeScreen" class="welcome-screen">
                    <div class="welcome-icon">
                        <i class="ph-bold ph-robot"></i>
                    </div>
                    <h2 class="text-2xl font-bold mb-2" style="color: var(--text-main);">Halo, ${displayName}!</h2>
                    <p class="text-muted" style="max-width: 600px; margin: 0 auto 1.5rem auto; font-size: 0.95rem; line-height: 1.6;">
                        Saya adalah <strong>RW Assistant</strong> berbasis kecerdasan buatan terpadu. Siap membantu Anda mengenai informasi pelayanan administrasi surat, pengaduan lingkungan, dan seputar Digital RW.
                    </p>
                    
                    <div class="suggestion-grid">
                        <div class="suggestion-card" data-prompt="Bagaimana cara mengajukan surat?">
                            <div class="flex items-center gap-2 mb-1">
                                <i class="ph-bold ph-file-text text-primary text-lg"></i>
                                <h4>Pengajuan Surat</h4>
                            </div>
                            <p>Prosedur dan persyaratan pengajuan surat pelayanan RT/RW</p>
                        </div>
                        <div class="suggestion-card" data-prompt="Apa saja layanan Digital RW?">
                            <div class="flex items-center gap-2 mb-1">
                                <i class="ph-bold ph-squares-four text-primary text-lg"></i>
                                <h4>Layanan Digital RW</h4>
                            </div>
                            <p>Daftar seluruh fitur dan layanan yang tersedia di sistem</p>
                        </div>
                        <div class="suggestion-card" data-prompt="Status pengajuan saya">
                            <div class="flex items-center gap-2 mb-1">
                                <i class="ph-bold ph-clock-counter-clockwise text-primary text-lg"></i>
                                <h4>Status Pengajuan</h4>
                            </div>
                            <p>Cek progres pengajuan surat yang sedang diproses</p>
                        </div>
                        <div class="suggestion-card" data-prompt="Bagaimana cara membuat pengaduan lingkungan?">
                            <div class="flex items-center gap-2 mb-1">
                                <i class="ph-bold ph-warning-circle text-primary text-lg"></i>
                                <h4>Pengaduan Lingkungan</h4>
                            </div>
                            <p>Cara melaporkan keluhan atau masalah lingkungan RT/RW</p>
                        </div>
                    </div>
                </div>

                <!-- Chat Messages will be appended here -->
            </div>

            <!-- Chat Input Wrapper -->
            <div class="chat-input-wrapper">
                <div class="chat-input-container" style="align-items: flex-end;">
                    <textarea id="chatInput" placeholder="Tanyakan seputar pelayanan RT/RW, status surat, atau info kependudukan..." rows="1" style="flex: 1; border: none; background: transparent; padding: 0.75rem 0; font-size: 0.95rem; outline: none; color: var(--text-main); resize: none; overflow-y: auto; max-height: 120px; min-height: 44px;"></textarea>
                    <button id="btnSendChat" class="btn-send" style="margin-bottom: 2px;" title="Kirim Pesan">
                        <i class="ph-bold ph-paper-plane-right"></i>
                    </button>
                </div>
                <div class="text-muted text-center" style="font-size: 0.75rem; margin-top: 0.5rem;">
                    RW Assistant dirancang khusus melayani kebutuhan warga Digital RW secara aman & privat.
                </div>
            </div>
        </div>
    `;
}

export function setupAIAssistantEvents() {
    const chatInput = document.getElementById('chatInput');
    const btnSendChat = document.getElementById('btnSendChat');
    const chatContainer = document.getElementById('chatContainer');
    const welcomeScreen = document.getElementById('welcomeScreen');
    const suggestionCards = document.querySelectorAll('.suggestion-card');
    let isFirstMessage = true;

    function scrollToBottom() {
        chatContainer.scrollTo({
            top: chatContainer.scrollHeight,
            behavior: 'smooth'
        });
    }

    function addMessage(text, isUser = false) {
        if (isFirstMessage) {
            if (welcomeScreen) welcomeScreen.style.display = 'none';
            isFirstMessage = false;
        }

        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${isUser ? 'user' : 'bot'} animate-fade-in-up`;

        const avatar = document.createElement('div');
        avatar.className = 'chat-bubble-avatar';
        if (isUser) {
            avatar.innerHTML = '<i class="ph-bold ph-user text-xl"></i>';
        } else {
            avatar.innerHTML = '<i class="ph-bold ph-robot text-xl"></i>';
        }

        const content = document.createElement('div');
        content.className = 'chat-bubble-content';
        content.innerHTML = renderMarkdown(text);

        bubble.appendChild(avatar);
        bubble.appendChild(content);

        chatContainer.appendChild(bubble);
        scrollToBottom();
        return bubble;
    }

    function showTypingIndicator() {
        if (isFirstMessage) {
            if (welcomeScreen) welcomeScreen.style.display = 'none';
            isFirstMessage = false;
        }

        const typingBubble = document.createElement('div');
        typingBubble.id = 'activeTypingIndicator';
        typingBubble.className = 'chat-bubble bot animate-fade-in-up';

        const avatar = document.createElement('div');
        avatar.className = 'chat-bubble-avatar';
        avatar.innerHTML = '<i class="ph-bold ph-robot text-xl"></i>';

        const content = document.createElement('div');
        content.className = 'chat-bubble-content';
        content.style.display = 'flex';
        content.style.alignItems = 'center';
        content.style.gap = '0.5rem';

        content.innerHTML = `
            <span style="font-size: 0.9rem; color: var(--text-muted); font-style: italic;">RW Assistant sedang memproses...</span>
            <div class="typing-dots" style="display: inline-flex; align-items: center; margin: 0; padding: 0;">
                <span></span><span></span><span></span>
            </div>
        `;

        typingBubble.appendChild(avatar);
        typingBubble.appendChild(content);

        chatContainer.appendChild(typingBubble);
        scrollToBottom();
        return typingBubble;
    }

    function removeTypingIndicator() {
        const indicator = document.getElementById('activeTypingIndicator');
        if (indicator) {
            indicator.remove();
        }
    }

    let isSending = false;

    function handleSend(forcedText = null) {
        if (isSending) return;
        const text = forcedText !== null ? forcedText : chatInput.value.trim();
        if (!text) return;

        // PADA BARIS PALING PERTAMA (0ms ZERO DELAY)
        if (forcedText === null) {
            chatInput.value = '';
            chatInput.style.height = 'auto';
        }

        addMessage(text, true);
        showTypingIndicator();
        chatContainer.scrollTop = chatContainer.scrollHeight;

        isSending = true;
        btnSendChat.disabled = true;
        btnSendChat.style.opacity = '0.5';
        btnSendChat.style.cursor = 'not-allowed';

        setTimeout(async () => {
            try {
                const response = await askAI(text);
                removeTypingIndicator();
                addMessage(response, false);
            } catch (error) {
                console.error("Chat error:", error);
                removeTypingIndicator();
                addMessage("Maaf, saya sedang mengalami kendala koneksi dengan server AI saat ini. Silakan coba kembali beberapa saat lagi.", false);
            } finally {
                isSending = false;
                btnSendChat.disabled = false;
                btnSendChat.style.opacity = '1';
                btnSendChat.style.cursor = 'pointer';
                chatInput.focus();
            }
        }, 0);
    }

    const btnResetChat = document.getElementById('btnResetChat');
    if (btnResetChat) {
        btnResetChat.addEventListener('click', () => {
            const bubbles = chatContainer.querySelectorAll('.chat-bubble');
            bubbles.forEach(b => b.remove());
            if (welcomeScreen) welcomeScreen.style.display = 'block';
            isFirstMessage = true;
            chatInput.value = '';
            chatInput.style.height = 'auto';
            chatInput.focus();
        });
    }

    if (btnSendChat && chatInput) {
        btnSendChat.addEventListener('click', () => handleSend(null));
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(null);
            }
        });
        chatInput.addEventListener('input', (e) => {
            e.target.style.height = 'auto';
            e.target.style.height = (e.target.scrollHeight) + 'px';
        });

        suggestionCards.forEach(card => {
            card.addEventListener('click', () => {
                const prompt = card.getAttribute('data-prompt');
                if (prompt) {
                    handleSend(prompt);
                }
            });
        });

        chatInput.focus();
    }
}
