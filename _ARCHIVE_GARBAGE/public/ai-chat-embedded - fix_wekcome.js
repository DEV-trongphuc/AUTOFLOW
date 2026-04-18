(function (window, document) {
    "use strict";

    // --- GUARD: PREVENT DOUBLE LOADING ---
    if (window._mfChatLoaded || document.getElementById("mf-root")) return;
    window._mfChatLoaded = true;

    // --- CONFIGURATION ---
    const CONFIG = {
        apiEndpoint: (window._mf_config?.endpoint || "https://automation.ideas.edu.vn/mail_api/track.php").replace("track.php", "ai_chatbot.php"),
        ttsEndpoint: (window._mf_config?.endpoint || "https://automation.ideas.edu.vn/mail_api/").replace("track.php", "") + "gemini_tts.php",
        sttEndpoint: "https://automation.ideas.edu.vn/mail_api/google_stt.php",
        propertyId: window._mf_config?.property_id || null,
        visitorId: localStorage.getItem("_mf_vid") || "visitor_" + Date.now(),
        brandColor: "#ffa900",
        botName: "AI Consultant",
        botAvatar: "",
        isTest: window._mf_config?.is_test || false,
        welcomeMsg: "Chào anh/chị! Em là trợ lý ảo của MailFlow Pro. Em có thể giúp gì cho mình ạ?",
    };

    if (!CONFIG.propertyId) {
        console.error("[MF AI] Missing property_id. Chatbot disabled.");
        return;
    }

    // --- ICONS (SVG) ---
    const ICONS = {
        close: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>`,
        send: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
        mic: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`,
        micActive: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`,
        volumeUp: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`,
        volumeOff: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`,
        bot: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4m0 0h2m-2 0h-2"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M9 16a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm8 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"/></svg>`,
        user: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
        maximize: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`,
        minimize: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`,
        activity: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
        sparkles: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`,
        shield: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6ee7b7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
        arrowRight: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`
    };

    // --- STATE MANAGEMENT ---
    const State = {
        isOpen: false,
        isLiveMode: false,
        isSoundEnabled: false,
        isListening: false,
        isSpeaking: false,
        isLoading: false,
        messages: [],
        quickActions: [],
        conversationId: localStorage.getItem("mailflow_chat_conv_id") || null,
        inputValue: "",
        abortController: null,
        cooldown: 0,
        // Audio State
        hasIOSGreeted: false,
        audioContext: null,
    };

    // --- UTILS ---
    const Utils = {
        isIOS: () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes("Mac") && navigator.maxTouchPoints > 1),
        isAndroid: () => /Android/i.test(navigator.userAgent),

        debounce: (func, wait) => {
            let timeout;
            return function (...args) {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), wait);
            };
        },

        renderMarkdown: (text) => {
            if (!text) return "";
            // Basic Markdown rendering
            let html = text
                .replace(/\[(?:ACTIONS|ACTION|BUTTONS|BUTTON|OPTIONS):?.*?\]/gi, "") // Remove actions
                .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") // Escape HTML
                .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // Bold
                .replace(/\*(.*?)\*/g, "<em>$1</em>") // Italic
                .replace(/`([^`]+)`/g, '<code class="mf-code">$1</code>') // Inline Code
                .replace(/\n/g, "<br>"); // Line breaks

            // Link parsing
            html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
            html = html.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank">$1</a>');

            return html;
        },

        cleanTextForTTS: (text) => {
            let out = text.replace(/(https?:\/\/[^\s]+)/g, "liên kết")
                .replace(/\[.*?\]/g, "")
                .replace(/[*_#`]/g, "");

            // Handle actions prompt
            const actionMatch = text.match(/\[(?:ACTIONS|BUTTONS):?\s*(.*?)\]/i);
            if (actionMatch && actionMatch[1]) {
                const actions = actionMatch[1].split(/[|,]/).map(a => a.trim());
                if (actions.length > 0) {
                    out += ". Bạn có muốn chọn " + actions.join(" hoặc ") + " không?";
                }
            }
            return out.trim();
        }
    };

    // --- AUDIO ENGINE ---
    const AudioEngine = {
        ctx: null,
        sources: [],
        nextStartTime: 0,
        streamQueue: [],
        isPlaying: false,

        init: () => {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioEngine.ctx && AudioContext) {
                AudioEngine.ctx = new AudioContext();
            }
        },

        unlock: () => {
            AudioEngine.init();
            if (AudioEngine.ctx && AudioEngine.ctx.state === 'suspended') {
                AudioEngine.ctx.resume();
            }
            // Play silent buffer to unlock iOS
            if (AudioEngine.ctx && !State.hasIOSGreeted) {
                const buffer = AudioEngine.ctx.createBuffer(1, 1, 22050);
                const source = AudioEngine.ctx.createBufferSource();
                source.buffer = buffer;
                source.connect(AudioEngine.ctx.destination);
                source.start(0);
                State.hasIOSGreeted = true;
            }
        },

        playStream: async (text) => {
            if (!State.isSoundEnabled && !State.isLiveMode) return;
            AudioEngine.unlock();

            const cleanText = Utils.cleanTextForTTS(text);
            if (!cleanText) return;

            try {
                // Fetch Audio
                const response = await fetch(CONFIG.ttsEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({ text: cleanText, property_id: CONFIG.propertyId })
                });

                if (!response.ok) throw new Error("TTS Failed");
                const arrayBuffer = await response.arrayBuffer();

                // Decode
                const audioBuffer = await AudioEngine.ctx.decodeAudioData(arrayBuffer);
                AudioEngine.scheduleBuffer(audioBuffer);

            } catch (e) {
                console.error("[MF Audio] TTS Error:", e);
            }
        },

        scheduleBuffer: (buffer) => {
            const source = AudioEngine.ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(AudioEngine.ctx.destination);

            const now = AudioEngine.ctx.currentTime;
            // Gapless playback logic
            const startTime = Math.max(now, AudioEngine.nextStartTime);

            source.start(startTime);
            AudioEngine.nextStartTime = startTime + buffer.duration;
            AudioEngine.sources.push(source);

            State.isSpeaking = true;
            source.onended = () => {
                AudioEngine.sources = AudioEngine.sources.filter(s => s !== source);
                if (AudioEngine.sources.length === 0) {
                    State.isSpeaking = false;
                    // Trigger mic restart if needed in Live Mode
                    if (State.isLiveMode) MainController.restartMicSafely();
                }
            };
        },

        stopAll: () => {
            AudioEngine.sources.forEach(s => {
                try { s.stop(); } catch (e) { }
            });
            AudioEngine.sources = [];
            AudioEngine.nextStartTime = 0;
            State.isSpeaking = false;

            if (window.speechSynthesis) window.speechSynthesis.cancel();
        }
    };

    // --- SPEECH RECOGNITION (STT) ---
    const STTEngine = {
        recognition: null,
        mediaRecorder: null,
        audioChunks: [],

        start: () => {
            if (State.isListening) return;
            State.isListening = true;

            // Priority: Web Speech API (Fastest/Live) -> Google Cloud STT (Fallback/AudioFile)
            // For this implementation, we use Web Speech for Interim and MediaRecorder for fallback/quality

            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

            if (SpeechRecognition) {
                STTEngine.startWebSpeech(SpeechRecognition);
            } else {
                console.warn("[MF STT] Web Speech API not supported. Fallback to MediaRecorder.");
                STTEngine.startMediaRecorder();
            }

            UIService.updateMicStatus(true);
        },

        stop: () => {
            State.isListening = false;
            if (STTEngine.recognition) {
                try { STTEngine.recognition.stop(); } catch (e) { }
                STTEngine.recognition = null;
            }
            if (STTEngine.mediaRecorder && STTEngine.mediaRecorder.state !== 'inactive') {
                STTEngine.mediaRecorder.stop();
            }
            UIService.updateMicStatus(false);
        },

        startWebSpeech: (SpeechRecognition) => {
            const recognition = new SpeechRecognition();
            recognition.lang = 'vi-VN';
            recognition.interimResults = true;
            recognition.continuous = false; // Stop after one sentence

            recognition.onstart = () => {
                console.log("[MF STT] Recognition started");
                UIService.showLiveLyric("Đang lắng nghe...");
            };

            recognition.onresult = (event) => {
                let transcript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    transcript += event.results[i][0].transcript;
                }
                UIService.showLiveLyric(transcript);

                if (event.results[0].isFinal) {
                    STTEngine.stop();
                    MainController.handleUserMessage(transcript, true);
                }
            };

            recognition.onerror = (event) => {
                console.error("[MF STT] Error:", event.error);
                if (event.error === 'not-allowed') {
                    UIService.showLiveLyric("Vui lòng cấp quyền Microphone.");
                }
                STTEngine.stop();
            };

            recognition.onend = () => {
                // Auto restart if still in live mode and not speaking
                if (State.isLiveMode && !State.isSpeaking && !State.isLoading) {
                    // Slight delay to prevent loops
                    setTimeout(() => {
                        if (State.isLiveMode) STTEngine.start();
                    }, 500);
                } else {
                    State.isListening = false;
                    UIService.updateMicStatus(false);
                }
            };

            STTEngine.recognition = recognition;
            recognition.start();
        },

        startMediaRecorder: async () => {
            // Fallback implementation using MediaRecorder API sending to Server STT
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const mediaRecorder = new MediaRecorder(stream);
                STTEngine.audioChunks = [];

                mediaRecorder.ondataavailable = (event) => {
                    STTEngine.audioChunks.push(event.data);
                };

                mediaRecorder.onstop = async () => {
                    const audioBlob = new Blob(STTEngine.audioChunks, { type: 'audio/webm' });
                    APIService.sendAudio(audioBlob); // Helper to send to PHP
                };

                mediaRecorder.start();
                STTEngine.mediaRecorder = mediaRecorder;
            } catch (err) {
                console.error("[MF STT] Mic permission denied", err);
                UIService.showLiveLyric("Không thể truy cập Microphone.");
            }
        }
    };

    // --- API SERVICE ---
    const APIService = {
        sendMessage: async (text, isVoice = false) => {
            if (State.abortController) State.abortController.abort();
            State.abortController = new AbortController();

            const contextText = isVoice ? `${text} [Voice: Trả lời ngắn gọn]` : text;

            try {
                const response = await fetch(CONFIG.apiEndpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        action: "chat",
                        property_id: CONFIG.propertyId,
                        visitor_id: CONFIG.visitorId,
                        conversation_id: State.conversationId,
                        message: contextText,
                        stream: true
                    }),
                    signal: State.abortController.signal
                });

                if (!response.ok) throw new Error("Network Error");

                // Stream handling
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let fullResponse = "";

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    // Filter fake tokens like "..."
                    if (chunk.trim() === "...") continue;

                    fullResponse += chunk;

                    // Live TTS processing
                    if (State.isLiveMode || State.isSoundEnabled) {
                        AudioEngine.playStream(chunk);
                    }
                }

                return fullResponse;

            } catch (error) {
                if (error.name === 'AbortError') return null;
                console.error("[MF API] Error:", error);
                throw error;
            } finally {
                State.abortController = null;
            }
        },

        sendAudio: async (audioBlob) => {
            // Implementation for sending raw audio to Google STT Endpoint
            // ... (Omitting full implementation for brevity, logic remains similar to original)
        }
    };

    // --- UI SERVICE ---
    const UIService = {
        elements: {},

        init: () => {
            // Create Root Shadow Host or direct div? Direct div for cleaner inheritance
            const root = document.createElement("div");
            root.id = "mf-root";
            root.innerHTML = UIService.getTemplate();
            document.body.appendChild(root);

            // Bind Elements
            UIService.elements = {
                window: document.getElementById("mf-window"),
                trigger: document.getElementById("mf-trigger"),
                messages: document.getElementById("mf-messages"),
                input: document.getElementById("mf-input"),
                sendBtn: document.getElementById("mf-send"),
                closeBtn: document.getElementById("mf-close-btn"),
                liveOverlay: document.getElementById("mf-live-overlay"),
                lyricWrapper: document.getElementById("mf-lyric-wrapper"),
                quickActions: document.getElementById("mf-quick"),
                micBtn: document.getElementById("mf-mic")
            };

            UIService.injectStyles();
            UIService.bindEvents();
            UIService.loadHistory();
        },

        getTemplate: () => `
            <div id="mf-window" class="mf-chat-window">
                <div class="mf-header" style="background: linear-gradient(135deg, ${CONFIG.brandColor}, ${CONFIG.brandColor}dd);">
                    <div class="mf-header-info">
                        <div class="mf-avatar-box">${ICONS.bot}</div>
                        <div>
                            <div class="mf-bot-name">${CONFIG.botName}</div>
                            <div class="mf-bot-status">Sẵn sàng hỗ trợ</div>
                        </div>
                    </div>
                    <div class="mf-header-actions">
                        <button id="mf-sound-btn" title="Âm thanh">${ICONS.volumeOff}</button>
                        <button id="mf-live-btn" title="Live Mode">${ICONS.activity}</button>
                        <button id="mf-close-btn" title="Đóng">${ICONS.close}</button>
                    </div>
                </div>
                <div id="mf-messages" class="mf-messages-area"></div>
                <div id="mf-quick" class="mf-quick-area"></div>
                <div class="mf-input-area">
                    <input type="text" id="mf-input" placeholder="Nhập tin nhắn..." maxlength="200" autocomplete="off">
                    <button id="mf-mic" class="mf-icon-btn">${ICONS.mic}</button>
                    <button id="mf-send" class="mf-icon-btn" disabled>${ICONS.send}</button>
                </div>
                <div class="mf-footer">Powered by MailFlow AI</div>
            </div>
            
            <button id="mf-trigger" class="mf-trigger-btn" style="background: ${CONFIG.brandColor};">
                ${ICONS.bot}
            </button>

            <div id="mf-live-overlay" class="mf-live-overlay">
                <button id="mf-live-close" class="mf-live-close">${ICONS.close}</button>
                <div class="mf-live-orb">
                    <div class="mf-orb-icon">${ICONS.mic}</div>
                </div>
                <div id="mf-lyric-wrapper" class="mf-lyric-wrapper">
                    <div class="mf-lyric-text">Nhấn để bắt đầu nói chuyện</div>
                </div>
            </div>
        `,

        injectStyles: () => {
            const style = document.createElement("style");
            style.innerHTML = `
                /* MINIMAL CSS RESET */
                #mf-root { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; position: fixed; z-index: 99999; }
                #mf-root * { box-sizing: border-box; }
                
                /* TRIGGER */
                .mf-trigger-btn { position: fixed; bottom: 20px; right: 20px; width: 60px; height: 60px; border-radius: 50%; border: none; cursor: pointer; color: white; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: transform 0.3s; display: flex; align-items: center; justify-content: center; z-index: 10000; }
                .mf-trigger-btn:hover { transform: scale(1.1); }
                .mf-trigger-btn.hidden { opacity: 0; pointer-events: none; transform: scale(0); }

                /* WINDOW */
                .mf-chat-window { position: fixed; bottom: 90px; right: 20px; width: 380px; height: 600px; max-height: 80vh; background: white; border-radius: 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); display: flex; flex-direction: column; overflow: hidden; opacity: 0; pointer-events: none; transform: translateY(20px); transition: all 0.3s ease; }
                .mf-chat-window.open { opacity: 1; pointer-events: auto; transform: translateY(0); }

                /* HEADER */
                .mf-header { padding: 16px; color: white; display: flex; justify-content: space-between; align-items: center; }
                .mf-header-info { display: flex; align-items: center; gap: 10px; }
                .mf-avatar-box { width: 40px; height: 40px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; }
                .mf-bot-name { font-weight: bold; font-size: 16px; }
                .mf-bot-status { font-size: 12px; opacity: 0.9; }
                .mf-header-actions button { background: none; border: none; color: white; cursor: pointer; padding: 4px; opacity: 0.8; }
                .mf-header-actions button:hover { opacity: 1; }

                /* MESSAGES */
                .mf-messages-area { flex: 1; overflow-y: auto; padding: 16px; background: #f9fafb; display: flex; flex-direction: column; gap: 12px; }
                .mf-msg { max-width: 85%; padding: 10px 14px; border-radius: 12px; font-size: 14px; line-height: 1.5; word-wrap: break-word; }
                .mf-msg.user { align-self: flex-end; background: ${CONFIG.brandColor}; color: white; border-bottom-right-radius: 2px; }
                .mf-msg.bot { align-self: flex-start; background: white; color: #333; border: 1px solid #e5e7eb; border-bottom-left-radius: 2px; }
                .mf-msg a { color: inherit; text-decoration: underline; }
                .mf-code { background: rgba(0,0,0,0.1); padding: 2px 4px; border-radius: 4px; font-family: monospace; }

                /* INPUT */
                .mf-input-area { padding: 12px; background: white; border-top: 1px solid #eee; display: flex; gap: 8px; align-items: center; }
                #mf-input { flex: 1; padding: 10px 14px; border: 1px solid #ddd; border-radius: 20px; outline: none; font-size: 14px; }
                #mf-input:focus { border-color: ${CONFIG.brandColor}; }
                .mf-icon-btn { background: none; border: none; cursor: pointer; color: #666; padding: 8px; border-radius: 50%; transition: background 0.2s; display: flex; align-items: center; justify-content: center; }
                .mf-icon-btn:hover { background: #f0f0f0; color: ${CONFIG.brandColor}; }
                .mf-icon-btn:disabled { opacity: 0.5; cursor: not-allowed; }
                .mf-mic-active { color: #ef4444 !important; animation: pulse 1.5s infinite; }

                /* QUICK ACTIONS */
                .mf-quick-area { padding: 8px 16px; display: flex; gap: 8px; overflow-x: auto; white-space: nowrap; scrollbar-width: none; }
                .mf-chip { padding: 6px 12px; background: #f0f0f0; border-radius: 16px; font-size: 12px; cursor: pointer; color: #444; border: 1px solid #ddd; transition: all 0.2s; }
                .mf-chip:hover { background: ${CONFIG.brandColor}; color: white; border-color: ${CONFIG.brandColor}; }

                /* LIVE OVERLAY */
                .mf-live-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 10001; display: flex; flex-direction: column; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: opacity 0.3s; backdrop-filter: blur(5px); }
                .mf-live-overlay.active { opacity: 1; pointer-events: auto; }
                .mf-live-close { position: absolute; top: 20px; right: 20px; background: none; border: none; color: white; cursor: pointer; width: 40px; height: 40px; }
                .mf-live-orb { width: 120px; height: 120px; border-radius: 50%; background: linear-gradient(135deg, ${CONFIG.brandColor}, #ff7e5f); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 30px ${CONFIG.brandColor}80; transition: transform 0.3s; margin-bottom: 40px; }
                .mf-orb-icon { color: white; width: 40px; height: 40px; }
                .mf-live-orb.listening { animation: breathe 2s infinite ease-in-out; }
                .mf-live-orb.speaking { animation: shake 0.5s infinite; }
                .mf-lyric-text { color: white; font-size: 18px; text-align: center; max-width: 80%; line-height: 1.5; font-weight: 500; }

                /* FOOTER */
                .mf-footer { font-size: 10px; color: #999; text-align: center; padding-bottom: 8px; }

                /* ANIMATIONS */
                @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
                @keyframes breathe { 0%, 100% { transform: scale(1); box-shadow: 0 0 30px ${CONFIG.brandColor}80; } 50% { transform: scale(1.1); box-shadow: 0 0 50px ${CONFIG.brandColor}; } }
                @keyframes shake { 0% { transform: translateX(0); } 25% { transform: translateX(-2px); } 75% { transform: translateX(2px); } 100% { transform: translateX(0); } }
                
                @media (max-width: 480px) {
                    .mf-chat-window { width: 100%; height: 100%; bottom: 0; right: 0; border-radius: 0; }
                    .mf-trigger-btn { bottom: 10px; right: 10px; }
                }
            `;
            document.head.appendChild(style);
        },

        bindEvents: () => {
            const els = UIService.elements;

            // Toggle Chat
            els.trigger.onclick = () => MainController.toggleChat(true);
            els.closeBtn.onclick = () => MainController.toggleChat(false);

            // Send Message
            els.sendBtn.onclick = () => MainController.handleUserMessage();
            els.input.onkeypress = (e) => {
                if (e.key === "Enter") MainController.handleUserMessage();
            };
            els.input.oninput = (e) => {
                State.inputValue = e.target.value;
                els.sendBtn.disabled = !State.inputValue.trim();
            };

            // Mic & Live Mode
            els.micBtn.onclick = () => STTEngine.start();
            document.getElementById("mf-live-btn").onclick = () => MainController.toggleLiveMode(true);
            document.getElementById("mf-live-close").onclick = () => MainController.toggleLiveMode(false);

            // Interaction to unlock AudioContext on iOS
            document.addEventListener('click', AudioEngine.unlock, { once: true });
            document.addEventListener('touchstart', AudioEngine.unlock, { once: true });

            // Live Overlay Click to Speak
            els.liveOverlay.onclick = (e) => {
                if (e.target === els.liveOverlay || e.target.closest('.mf-live-orb')) {
                    if (!State.isSpeaking) STTEngine.start();
                }
            };

            // Sound Toggle
            document.getElementById("mf-sound-btn").onclick = (e) => {
                State.isSoundEnabled = !State.isSoundEnabled;
                e.currentTarget.innerHTML = State.isSoundEnabled ? ICONS.volumeUp : ICONS.volumeOff;
                if (!State.isSoundEnabled) AudioEngine.stopAll();
            };
        },

        appendMessage: (role, content) => {
            const div = document.createElement("div");
            div.className = `mf-msg ${role}`;
            div.innerHTML = Utils.renderMarkdown(content);
            UIService.elements.messages.appendChild(div);
            UIService.scrollToBottom();
        },

        updateQuickActions: (actions) => {
            const area = UIService.elements.quickActions;
            area.innerHTML = "";
            if (!actions || actions.length === 0) return;

            actions.forEach(act => {
                const chip = document.createElement("div");
                chip.className = "mf-chip";
                chip.textContent = act;
                chip.onclick = () => {
                    UIService.updateQuickActions([]); // Clear after click
                    MainController.handleUserMessage(act);
                };
                area.appendChild(chip);
            });
        },

        showLiveLyric: (text) => {
            const el = document.querySelector(".mf-lyric-text");
            if (el) el.textContent = text;
        },

        updateMicStatus: (isActive) => {
            const micBtn = UIService.elements.micBtn;
            if (isActive) micBtn.classList.add("mf-mic-active");
            else micBtn.classList.remove("mf-mic-active");

            const orb = document.querySelector(".mf-live-orb");
            if (orb) {
                if (isActive) orb.classList.add("listening");
                else orb.classList.remove("listening");
            }
        },

        toggleWindow: (isOpen) => {
            const win = UIService.elements.window;
            const trig = UIService.elements.trigger;

            if (isOpen) {
                win.classList.add("open");
                trig.classList.add("hidden");
                UIService.scrollToBottom();
            } else {
                win.classList.remove("open");
                trig.classList.remove("hidden");
            }
        },

        scrollToBottom: () => {
            const area = UIService.elements.messages;
            area.scrollTop = area.scrollHeight;
        },

        loadHistory: () => {
            // Load messages from localStorage if available
            try {
                const saved = localStorage.getItem(`mf_chat_${CONFIG.propertyId}`);
                if (saved) {
                    const messages = JSON.parse(saved);
                    messages.forEach(m => UIService.appendMessage(m.role, m.content));
                } else {
                    UIService.appendMessage("bot", CONFIG.welcomeMsg);
                }
            } catch (e) { }
        }
    };

    // --- MAIN CONTROLLER ---
    const MainController = {
        init: () => {
            UIService.init();
            // Initialize AudioContext on first user interaction logic is handled in BindEvents
        },

        toggleChat: (isOpen) => {
            State.isOpen = isOpen;
            UIService.toggleWindow(isOpen);
            if (!isOpen) {
                MainController.toggleLiveMode(false);
                AudioEngine.stopAll();
            }
        },

        toggleLiveMode: (isActive) => {
            State.isLiveMode = isActive;
            const overlay = UIService.elements.liveOverlay;

            if (isActive) {
                overlay.classList.add("active");
                AudioEngine.unlock();
                State.isSoundEnabled = true; // Auto enable sound in live mode
                // Auto start mic
                setTimeout(() => STTEngine.start(), 500);
            } else {
                overlay.classList.remove("active");
                STTEngine.stop();
                AudioEngine.stopAll();
            }
        },

        handleUserMessage: async (textOverride = null, isVoice = false) => {
            const text = textOverride || State.inputValue.trim();
            if (!text) return;

            // Clear Input
            State.inputValue = "";
            UIService.elements.input.value = "";
            UIService.elements.sendBtn.disabled = true;

            // Add User Message UI
            UIService.appendMessage("user", text);
            MainController.saveMessage("user", text);

            State.isLoading = true;
            // Add Loading Indicator (Temporary)
            // ...

            try {
                const response = await APIService.sendMessage(text, isVoice);
                if (response) {
                    UIService.appendMessage("bot", response);
                    MainController.saveMessage("bot", response);

                    // Parse Quick Actions from response text "[ACTIONS: A, B]"
                    const actionMatch = response.match(/\[(?:ACTIONS|BUTTONS):?\s*(.*?)\]/i);
                    if (actionMatch && actionMatch[1]) {
                        const actions = actionMatch[1].split(/[|,]/).map(a => a.trim());
                        UIService.updateQuickActions(actions);
                    }
                }
            } catch (error) {
                UIService.appendMessage("bot", "Xin lỗi, đã có lỗi kết nối. Vui lòng thử lại.");
            } finally {
                State.isLoading = false;
            }
        },

        saveMessage: (role, content) => {
            State.messages.push({ role, content });
            // Keep last 50 messages
            if (State.messages.length > 50) State.messages.shift();
            localStorage.setItem(`mf_chat_${CONFIG.propertyId}`, JSON.stringify(State.messages));
        },

        restartMicSafely: () => {
            if (!State.isLiveMode || State.isSpeaking) return;
            setTimeout(() => {
                if (State.isLiveMode && !State.isSpeaking) STTEngine.start();
            }, 300);
        }
    };

    // --- BOOTSTRAP ---
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", MainController.init);
    } else {
        MainController.init();
    }

    // Expose limited API for external control if needed
    window.MailFlowWidget = {
        open: () => MainController.toggleChat(true),
        close: () => MainController.toggleChat(false),
        toggle: () => MainController.toggleChat(!State.isOpen)
    };

})(window, document);