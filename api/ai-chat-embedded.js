(function () {
    // Standalone Embedded AI Chat Widget
    // A pixel-perfect vanilla JS clone of AIChatWidget.tsx
    // Features: UI/UX matching, Debounced Sending, Link Parsing, Markdown, Animation, Spam rate limiting sync

    const CONFIG = {
        apiEndpoint: (window._mf_config && window._mf_config.endpoint) ? window._mf_config.endpoint.replace('track.php', 'ai_chatbot.php') : 'https://automation.ideas.edu.vn/mail_api/ai_chatbot.php',
        apiUrl: (window._mf_config && window._mf_config.endpoint) ? window._mf_config.endpoint.replace('track.php', '').replace('ai_chatbot.php', '') : 'https://automation.ideas.edu.vn/mail_api/',
        propertyId: (window._mf_config && window._mf_config.property_id) || null,
        brandColor: '#ffa900', // Default
        botName: 'AI Consultant',
        welcomeMsg: 'Chào anh/chị! Em là trợ lý ảo của MailFlow Pro. Em có thể giúp gì cho mình ạ?',
        botAvatar: '',
        position: 'bottom-right',
        excludedPages: [],
        excludedPaths: [],
        autoOpen: false,
        isTest: (window._mf_config && window._mf_config.is_test) || false
    };

    if (!CONFIG.propertyId) {
        console.error('[MF AI] Missing property_id. Chatbot disabled.');
        return;
    }

    // --- ICONS (Raw SVGs matching Lucide) ---
    const ICONS = {
        messageCircle: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>`,
        x: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>`,
        send: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
        user: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
        bot: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/><rect width="18" height="12" x="3" y="6" rx="2"/><path d="M11 6h2"/><path d="M12 18v2"/><path d="M8 22h8"/></svg>`,
        maximize: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`,
        minimize: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`,
        fullScreen: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>`,
        shield: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6ee7b7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
        sparkles: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`,
        fileText: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>`,
        arrowRight: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`,
        check: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
        mic: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`,
        micActive: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`,
        volume2: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`,
        volumeX: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`,
        activity: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`
    };

    // --- INTERNAL STATE ---
    // --- INTERNAL STATE ---
    const State = {
        isOpen: false,
        isMaximized: false,
        isFullScreen: false,
        isSoundEnabled: false,
        isLiveMode: false,
        messages: [],
        quickActions: [],
        inputValue: '',
        conversationId: localStorage.getItem('mailflow_chat_conv_id') || null,
        sendBuffer: [],
        sendTimer: null,
        loading: false,
        cooldown: 0
    };

    // --- TTS HELPER ---
    // --- TTS HELPER ---
    const doBrowserTTS = (text, onEnd, onPlay) => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'vi-VN';
        utterance.rate = 1.3; // Speed x1.3

        // Select Voice: Prioritize Microsoft HoaiMy (Southern), then others.
        const voices = window.speechSynthesis.getVoices();
        const viVoices = voices.filter(v => v.lang.includes('vi'));

        let preferred = null;

        // 1. Microsoft HoaiMy (Best Southern Female)
        preferred = viVoices.find(v => v.name.includes('Linh'));

        // 2. High Quality Microsoft (Natural/Online)
        if (!preferred) preferred = viVoices.find(v => v.name.includes('Microsoft') && (v.name.includes('Natural') || v.name.includes('Online')));

        // 3. Explicit Southern Markers
        if (!preferred) preferred = viVoices.find(v => /South|Miền Nam|Sài Gòn|HCM/i.test(v.name));

        // 4. "Linh" (Common smooth voice)
        if (!preferred) preferred = viVoices.find(v => v.name.includes('HoaiMy'));

        // 5. Any Female / Google
        if (!preferred) preferred = viVoices.find(v => /Female|Nữ|Google/i.test(v.name));

        // 6. Fallback
        if (!preferred && viVoices.length > 0) preferred = viVoices[0];

        if (preferred) utterance.voice = preferred;

        utterance.onstart = () => { if (onPlay) onPlay(); };
        utterance.onend = () => { if (onEnd) onEnd(); };
        utterance.onerror = (e) => { console.error('TTS Error', e); if (onEnd) onEnd(); };

        window.speechSynthesis.speak(utterance);
    };

    let ttsSessionId = 0;
    let currentAudio = null;
    const stopTTS = () => {
        window.speechSynthesis.cancel();
        if (currentAudio) {
            try { currentAudio.pause(); currentAudio.src = ""; } catch (e) { }
            currentAudio = null;
        }
    };

    const speakText = async (text, onEnd, onPlay) => {
        if ((!State.isSoundEnabled && !State.isLiveMode) || !text) {
            if (onEnd) onEnd();
            return;
        }

        stopTTS();
        const thisSession = ++ttsSessionId;

        // Clean text - Strip markdown, brackets, links
        const speakable = text
            .replace(/[*#]/g, '')
            .replace(/\[(?:ACTIONS|ACTION|BUTTONS|BUTTON|OPTIONS):?.*?\]/gi, '')
            .replace(/\[.*?\]/g, '')
            .replace(/(https?:\/\/[^\s]+)/g, '')
            .trim();

        if (!speakable) {
            if (onEnd) onEnd();
            return;
        }

        const propId = CONFIG.propertyId || (new URLSearchParams(window.location.search).get('id'));
        const useCloud = true; // Bật Gemini TTS

        if (useCloud && propId) {
            const parts = speakable.match(/[^.!?:\n,]+[.!?:\n,]*\s*|.{1,120}(?:\s|$)/g) || [speakable];
            const cleanParts = parts.map(p => p.trim()).filter(p => p.length > 2);

            if (cleanParts.length === 0) { if (onEnd) onEnd(); return; }

            let isFirstPlay = true;
            const baseUrl = CONFIG.apiUrl || (CONFIG.apiEndpoint ? CONFIG.apiEndpoint.replace(/\/[^\/]+$/, '/') : 'api/');

            const playChunk = (idx) => {
                if (thisSession !== ttsSessionId) return; // Superceded by new tts
                if (idx >= cleanParts.length) { if (onEnd) onEnd(); return; }

                const url = `${baseUrl}gemini_tts.php?text=${encodeURIComponent(cleanParts[idx])}&property_id=${propId}`;
                const audio = new Audio(url);
                currentAudio = audio;

                let movedNext = false;
                const next = () => {
                    if (movedNext) return;
                    movedNext = true;
                    if (thisSession === ttsSessionId) playChunk(idx + 1);
                };

                audio.onplay = () => {
                    if (thisSession !== ttsSessionId) { audio.pause(); return; }
                    if (isFirstPlay) { if (onPlay) onPlay(); isFirstPlay = false; }
                    // Preload next
                    if (idx + 1 < cleanParts.length) {
                        const nextUrl = `${baseUrl}gemini_tts.php?text=${encodeURIComponent(cleanParts[idx + 1])}&property_id=${propId}`;
                        const nextAudio = new Audio(nextUrl);
                        nextAudio.preload = "auto";
                    }
                };

                audio.onended = next;
                audio.onerror = () => {
                    console.warn("[TTS] Chunk failed", idx);
                    // If first chunk fails, try fallback to browser once
                    if (idx === 0 && thisSession === ttsSessionId) {
                        stopTTS();
                        doBrowserTTS(speakable, onEnd, onPlay);
                    } else {
                        next();
                    }
                };

                audio.play().catch(err => {
                    console.warn("[TTS] Blocked or failed:", err);
                    if (idx === 0 && thisSession === ttsSessionId) {
                        stopTTS();
                        doBrowserTTS(speakable, onEnd, onPlay);
                    } else {
                        next();
                    }
                });
            };

            playChunk(0);
            return;
        }

        doBrowserTTS(speakable, onEnd, onPlay);
    };

    // --- VOICE INPUT LOGIC ---
    let recognition = null;
    let isListening = false;
    let gotResult = false; // Track if we got speech
    let hasTriggeredSend = false;

    const correctVoiceText = (text) => {
        return text
            .replace(/em bi ai/gi, 'MBA')
            .replace(/em pi ấy/gi, 'MBA')
            .replace(/IMPA/gi, 'EMBA')
            .replace(/ét ét ô/gi, 'SEO')
            .replace(/ét sê ô/gi, 'SEO')
            .replace(/si i ô/gi, 'CEO')
            .replace(/si y ô/gi, 'CEO')
            .replace(/mail flou/gi, 'MailFlow')
            .replace(/meo flou/gi, 'MailFlow')
            .replace(/meo flow/gi, 'MailFlow')
            .replace(/may flow/gi, 'MailFlow');
    };

    // --- UI HELPERS ---
    const scrollBottom = () => {
        const msgContainer = document.getElementById('mf-messages');
        if (msgContainer) msgContainer.scrollTop = msgContainer.scrollHeight;
    };

    const syncMessages = () => {
        const msgContainer = document.getElementById('mf-messages');
        if (!msgContainer) return;
        msgContainer.innerHTML = '';
        State.messages.forEach(m => msgContainer.appendChild(createMessageEl(m)));
        scrollBottom();
    };

    const syncQuick = () => {
        const quickContainer = document.getElementById('mf-quick');
        if (!quickContainer) return;
        quickContainer.innerHTML = '';
        if (State.quickActions.length === 0) quickContainer.style.display = 'none';
        else {
            quickContainer.style.display = 'flex';
            State.quickActions.forEach(qa => {
                const el = document.createElement('button');
                el.className = 'mf-chip mf-ignore-tracking';
                el.innerHTML = `${ICONS.sparkles} ${qa}`;
                el.onclick = (e) => {
                    e.preventDefault();
                    State.quickActions = [];
                    syncQuick();
                    handleSend(qa);
                };
                quickContainer.appendChild(el);
            });
        }
    };

    const toggleLive = (active) => {
        State.isLiveMode = active;
        const overlay = document.getElementById('mf-live-overlay');
        const input = document.getElementById('mf-input');
        const win = document.getElementById('mf-window');

        if (input) {
            input.readOnly = active;
            if (active) input.blur();
        }

        if (active) {
            // Auto Enable Sound
            State.isSoundEnabled = true;
            const sBtn = document.getElementById('mf-sound-btn');
            if (sBtn) { sBtn.innerHTML = ICONS.volume2; sBtn.title = "Đọc văn bản (Bật)"; }

            if (overlay) overlay.classList.add('active');
            // Force Full Screen
            if (win && !State.isFullScreen) {
                State.isFullScreen = true;
                win.classList.add('full-screen');
                const fullBtn = document.getElementById('mf-full-btn');
                if (fullBtn) fullBtn.innerHTML = ICONS.minimize;
            }
            // Start Listening
            if (window.SpeechRecognition || window.webkitSpeechRecognition) {
                if (recognition) {
                    try { recognition.start(); } catch (e) { }
                }
            }
        } else {
            if (overlay) overlay.classList.remove('active');
            if (recognition) recognition.stop();
            // Auto Disable Sound when Live Mode ends
            State.isSoundEnabled = false;
            window.speechSynthesis.cancel();
        }
    };

    const toggle = (force) => {
        const win = document.getElementById('mf-window');
        const trigger = document.getElementById('mf-trigger');
        if (!win || !trigger) return;

        State.isOpen = typeof force === 'boolean' ? force : !State.isOpen;
        if (State.isOpen) {
            win.classList.add('open');
            trigger.style.display = 'none';
            syncMessages();
            // Init Welcome if empty
            if (State.messages.length === 0) {
                State.messages.push({ id: 'init', role: 'assistant', content: CONFIG.welcomeMsg, timestamp: Date.now() });
                syncMessages();
            }
            syncQuick();
            if (typeof startPolling === 'function') startPolling();
        } else {
            win.classList.remove('open');
            trigger.style.display = 'flex';
            if (typeof stopPolling === 'function') stopPolling();
        }
        saveState();
    };

    const initVoice = () => {
        const micBtn = document.getElementById('mf-mic');

        // Early Binding for Mobile Live Btn to ensure clickability
        const mobileLiveBtn = document.getElementById('mf-mobile-live-btn');
        if (mobileLiveBtn) {
            const toggleHandler = (e) => {
                if (e.cancelable) e.preventDefault();
                e.stopPropagation();
                toggleLive(!State.isLiveMode);
            };
            mobileLiveBtn.onclick = toggleHandler;
            mobileLiveBtn.addEventListener('touchstart', toggleHandler, { passive: false, capture: true });
        }

        if (!micBtn) return;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) { micBtn.style.display = 'none'; return; }

        micBtn.style.display = 'flex';
        recognition = new SpeechRecognition();
        recognition.continuous = false; // We handle loop manually
        recognition.interimResults = true;
        recognition.lang = 'vi-VN';

        recognition.onstart = () => {
            isListening = true;
            gotResult = false;
            hasTriggeredSend = false;
            micBtn.classList.add('listening');
            micBtn.innerHTML = ICONS.micActive;

            // Standard Overlay
            const overlay = document.getElementById('mf-voice-overlay');
            if (overlay && !State.isLiveMode) overlay.classList.add('active');

            // Live Overlay Text
            if (State.isLiveMode) {
                const liveText = document.getElementById('mf-live-text');
                if (liveText) liveText.innerText = "Đang lắng nghe...";

                // Allow Click to Send immediately
                const orb = document.querySelector('.mf-live-orb');
                if (orb) {
                    orb.style.cursor = 'pointer';
                    orb.onclick = () => {
                        if (isListening && !hasTriggeredSend) {
                            const txt = liveText ? liveText.innerText : "";
                            if (txt && txt !== "Đang lắng nghe..." && txt !== "...") {
                                hasTriggeredSend = true;
                                recognition.stop();
                                handleSend(txt);
                            } else {
                                recognition.stop();
                            }
                        }
                    };
                }
            } else {
                const statusEl = document.getElementById('mf-voice-status');
                if (statusEl) statusEl.innerText = "Đang nghe...";
            }
        };

        recognition.onend = () => {
            isListening = false;
            micBtn.classList.remove('listening');
            micBtn.innerHTML = ICONS.mic;
            const overlay = document.getElementById('mf-voice-overlay');
            if (overlay) overlay.classList.remove('active');

            // LIVE MODE: Handle Silence or Stop
            if (State.isLiveMode && !State.loading) {
                const liveText = document.getElementById('mf-live-text');
                const orb = document.querySelector('.mf-live-orb');
                const icon = document.getElementById('mf-live-icon');

                if (!gotResult) {
                    // SILENCE / NO INPUT -> Show "Press to Speak"
                    if (icon) icon.innerHTML = ICONS.mic;
                    if (liveText) liveText.innerText = "Ấn để nói";
                    if (orb) {
                        orb.style.opacity = '1';
                        orb.style.pointerEvents = 'auto';
                        orb.style.cursor = 'pointer';
                        orb.onclick = () => {
                            if (!isListening) {
                                try { recognition.start(); } catch (e) { }
                            }
                        };
                    }
                }
            }
        };

        recognition.onresult = (event) => {
            gotResult = true;
            let interimTrans = '';
            let finalTrans = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTrans += event.results[i][0].transcript;
                } else {
                    interimTrans += event.results[i][0].transcript;
                }
            }

            const displayText = interimTrans || (finalTrans ? correctVoiceText(finalTrans) : "...");

            if (State.isLiveMode) {
                // LIVE MODE UPDATE
                const liveText = document.getElementById('mf-live-text');
                if (liveText) liveText.innerText = displayText;

                if (finalTrans) {
                    if (hasTriggeredSend) return;
                    hasTriggeredSend = true;

                    finalTrans = correctVoiceText(finalTrans);
                    recognition.stop(); // Stop listening

                    if (liveText) liveText.innerText = "Đang suy nghĩ...";

                    // Send to Chat & Trigger API
                    handleSend(finalTrans);
                }
            } else {
                // STANDARD MODE
                const statusEl = document.getElementById('mf-voice-status');
                if (statusEl) statusEl.innerText = interimTrans || (finalTrans ? "Đã nhận: " + correctVoiceText(finalTrans) : "Đang nghe...");

                if (finalTrans) {
                    finalTrans = correctVoiceText(finalTrans);
                    const inputEl = document.getElementById('mf-input');
                    const currentVal = inputEl.value;
                    const prefix = (currentVal && !currentVal.endsWith(' ')) ? ' ' : '';
                    inputEl.value = currentVal + prefix + finalTrans;
                    State.inputValue = inputEl.value;
                    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
                    if (window.__mf_app && window.__mf_app.updateSendState) window.__mf_app.updateSendState();
                }
            }
        };

        micBtn.onclick = () => {
            if (isListening) recognition.stop(); else recognition.start();
        };


    };

    // --- STYLES ---
    const injectStyles = () => {
        if (document.getElementById('mf-styles')) return;
        const brand = CONFIG.brandColor;
        const isLeft = CONFIG.position === 'bottom-left';

        const css = `
            #mf-root { font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; box-sizing: border-box; }
            #mf-root * { box-sizing: border-box; }
            
            /* TRIGGER BUTTON */
            #mf-trigger {
                position: fixed; bottom: 30px; ${isLeft ? 'left: 30px;' : 'right: 30px;'}
                width: 64px; height: 64px;
                background: linear-gradient(135deg, ${brand}, ${brand}dd);
                border-radius: 20px;
                display: flex; align-items: center; justify-content: center;
                color: white; cursor: pointer;
                box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);
                transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                z-index: 2147483647;
            }
            
            /* VOICE OVERLAY */
            .mf-voice-overlay {
                position: absolute; top: 0; left: 0; right: 0; bottom: 0;
                background: linear-gradient(90deg, ${brand}, #f472b6, ${brand});
                background-size: 200% 100%;
                z-index: 20; border-radius: 16px; 
                display: flex; align-items: center; justify-content: center;
                animation: mfGradientFlow 2s linear infinite;
                opacity: 0; pointer-events: none; transition: opacity 0.3s;
            }
            .mf-voice-overlay.active { opacity: 1; pointer-events: auto; }
            
            .mf-voice-text {
                color: white; font-weight: 700; font-size: 14px;
                display: flex; align-items: center; gap: 8px;
            }
            .mf-voice-wave {
                display: flex; gap: 3px; align-items: center; height: 20px;
            }
            .mf-voice-bar {
                width: 3px; background: white; border-radius: 2px;
                animation: mfWave 0.8s ease-in-out infinite;
            }
            .mf-voice-bar:nth-child(1) { animation-delay: 0s; height: 8px; }
            .mf-voice-bar:nth-child(2) { animation-delay: 0.1s; height: 12px; }
            .mf-voice-bar:nth-child(3) { animation-delay: 0.2s; height: 16px; }
            .mf-voice-bar:nth-child(4) { animation-delay: 0.1s; height: 12px; }
            .mf-voice-bar:nth-child(5) { animation-delay: 0s; height: 8px; }

            @keyframes mfGradientFlow { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
            @keyframes mfWave { 0%, 100% { height: 6px; opacity: 0.5; } 50% { height: 16px; opacity: 1; } }

            #mf-trigger:hover { transform: scale(1.1) rotate(6deg); }
            #mf-trigger:active { transform: scale(0.95); }
            .mf-pulse { position: absolute; top: -3px; right: -3px; width: 16px; height: 16px; background: #10b981; border: 3px solid white; border-radius: 50%; animation: mfBounce 2s infinite; }

            /* MAIN WINDOW - FIXED: 2.5rem radius and shadow matching react */
            /* MAIN WINDOW - FIXED: 2.5rem radius and shadow matching react */
            #mf-window {
                position: fixed; bottom: 30px; ${isLeft ? 'left: 30px;' : 'right: 30px;'}
                width: 480px; height: 650px;
                background: rgba(255,255,255,0.95);
                backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
                border-radius: 2.5rem; /* React: rounded-[2.5rem] */
                border: 1px solid rgba(255,255,255,0.2);
                box-shadow: 0 20px 50px -12px rgba(0,0,0,0.15); /* React: shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] */
                display: none; flex-direction: column; overflow: hidden;
                z-index: 2147483647;
                transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
                opacity: 0; transform: translateY(20px) scale(0.95);
            }
            #mf-window.open { display: flex; opacity: 1; transform: translateY(0) scale(1); }
            #mf-window.maximized { width: 90vw; height: 90vh; max-width: 1200px; bottom: 20px; ${isLeft ? 'left: 20px;' : 'right: 20px;'} }
            #mf-window.full-screen { width: 100vw; height: 100vh; max-width: none; bottom: 0; right: 0; left: 0; border-radius: 0; }
            
            /* Responsive: Mobile overrides */
            @media (max-width: 520px) {
                #mf-window { 
                    width: 100% !important; 
                    height: 100% !important;
                    bottom: 0 !important; 
                    right: 0 !important; 
                    left: 0 !important; 
                    border-radius: 0 !important;
                    max-width: none !important;
                }
                #mf-trigger { display: none !important; } /* If open, trigger hidden anyway */
            }
            
            /* LIVE MODE OVERLAY */
            #mf-live-overlay {
                position: fixed; inset: 0; 
                background: linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.9));
                backdrop-filter: blur(10px);
                z-index: 2147483648; 
                display: none; flex-direction: column; align-items: center; justify-content: center;
                opacity: 0; pointer-events: none; transition: opacity 0.5s;
                gap: 40px;
            }
            #mf-live-overlay.active { display: flex; opacity: 1; pointer-events: auto; }
            
            /* ORB */
            .mf-live-orb {
                width: 140px; height: 140px; border-radius: 50%;
                background: linear-gradient(135deg, ${brand}, #e93c2cff);
                box-shadow: 0 0 60px ${brand}80;
                animation: mfOrbPulse 4s infinite ease-in-out;
                position: relative; z-index: 10;
                display: flex; align-items: center; justify-content: center;
                transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }
            .mf-live-orb.loading {
                animation: mfOrbPulse 1s infinite ease-in-out, mfRotate 2s linear infinite !important;
            }
            .mf-live-orb.speaking .mf-live-wave {
                display: block !important;
                border: none !important;
                animation: mfRipple 3s cubic-bezier(0.4, 0, 0.2, 1) infinite !important;
            }
            .mf-live-orb.speaking #mf-live-icon {
                animation: mfIconPulse 1.5s infinite ease-in-out !important;
            }
            
            /* WAVES */
            .mf-live-waves {
                position: absolute; width: 100%; height: 100%;
                display: flex; align-items: center; justify-content: center;
                pointer-events: none;
            }
            .mf-live-wave {
                position: absolute; width: 140px; height: 140px;
                border-radius: 50%; 
                background: ${brand}20;
                box-shadow: 0 0 50px ${brand}40;
                opacity: 0; display: none;
                will-change: transform, opacity;
            }
            .mf-live-wave:nth-child(2) { animation-delay: 0.8s !important; }
            .mf-live-wave:nth-child(3) { animation-delay: 1.6s !important; }

            /* TEXT AREA */
            
            /* LYRICS EFFECT */
            /* LYRICS EFFECT */
            .mf-live-text {
                width: 90%; max-width: 600px; height: 260px;
                display: flex; flex-direction: column; align-items: center;
                overflow: hidden; pointer-events: none; z-index: 5;
                position: relative;
            }
            .mf-lyric-line {
                font-size: 16px; font-weight: 500; color: white;
                text-align: center; line-height: 1.6; margin-bottom: 20px;
                opacity: 0; transform: translateY(60px);
                animation: mfLineScroll 6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
                text-shadow: 0 2px 8px rgba(0,0,0,0.5);
            }

            @media (max-width: 520px) {
                #mf-mobile-live-btn { display: flex !important; z-index: 2147483647 !important; pointer-events: auto !important; }
                #mf-mic { display: none !important; }
                #mf-input { padding-left: 56px !important; padding-right: 56px !important; }
            }

            @keyframes mfLineScroll {
                0% { opacity: 0; transform: translateY(100px); }
                5% { opacity: 1; transform: translateY(0px); }
                95% { opacity: 1; transform: translateY(-50px); }
                100% { opacity: 0; transform: translateY(-120px); }
            }

            @keyframes mfRotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            @keyframes mfOrbPulse { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.06); opacity: 1; box-shadow: 0 0 80px ${brand}; } }
            @keyframes mfRipple { 
                0% { transform: scale(1); opacity: 0; } 
                30% { opacity: 0.4; } 
                100% { transform: scale(2.5); opacity: 0; } 
            }
            @keyframes mfIconPulse {
                0%, 100% { transform: scale(1.6); opacity: 0.8; }
                50% { transform: scale(2); opacity: 1; }
            }
            #mf-window.full-screen #mf-header { border-radius: 0; }
            /* HEADER */
            #mf-header {
                padding: 24px 28px;
                background: linear-gradient(135deg, ${brand}, ${brand}dd);
                display: flex; justify-content: space-between; align-items: center;
                color: white; position: relative; overflow: hidden;
            }
            
            /* HEADER PATTERN (Recreated SVG) */
            .mf-bg-pattern {
                position: absolute; inset: 0; opacity: 0.1; pointer-events: none;
                background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHBhdGggZD0iTSAyMCAwIEwgMCAwIDAgMjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMC41Ii8+PC9zdmc+');
            }

            .mf-avatar-box {
                width: 48px; height: 48px; /* React uses w-12 h-12 (48px) */
                background: rgba(255,255,255,0.15); backdrop-filter: blur(8px);
                border-radius: 16px; /* React rounded-2xl */
                border: 1px solid rgba(255,255,255,0.2);
                display: flex; align-items: center; justify-content: center;
                position: relative; /* Removed overflow:hidden to show pulse */
                box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
            }
            .mf-avatar-box img { border-radius: 16px; }
            
            /* CONTROLS */
            .mf-live-close {
                position: absolute; top: 40px; right: 40px;
                width: 50px; height: 50px; border-radius: 50%;
                background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);
                color: white; display: flex; align-items: center; justify-content: center;
                cursor: pointer; transition: 0.2s; z-index: 10;
            }
            .mf-live-close:hover { background: rgba(255,255,255,0.2); transform: rotate(90deg); }

            .mf-header-actions button {
                background: transparent; border: none; color: rgba(255,255,255,0.6);
                padding: 10px; cursor: pointer; border-radius: 12px; transition: 0.2s;
            }
            .mf-header-actions button:hover { background: rgba(255,255,255,0.15); color: white; }

            /* CHAT AREA */
            #mf-messages {
                flex: 1; overflow-y: auto; padding: 24px;
                background: rgba(248,250,252,0.4); /* bg-slate-50/40 */
                display: flex; flex-direction: column; gap: 28px; /* space-y-7 -> 28px */
                overscroll-behavior: contain; /* Prevent parent scroll */
                min-height: 0; /* Critical for flex scrolling */
            }
            .mf-row { display: flex; gap: 14px; width: 100%; }
            .mf-row.user { flex-direction: row-reverse; }

            /* QUICK ACTIONS */
            #mf-quick {
                padding: 12px 24px; display: flex; flex-wrap: wrap; gap: 8px;
                background: white; border-top: 1px solid #f1f5f9;
                min-height: 0; transition: all 0.3s ease;
            }
            #mf-quick:empty { padding: 0; border: none; }
            
            .mf-quick-btn {
                background: white; border: 1px solid #e2e8f0; color: #334155;
                padding: 8px 14px; border-radius: 20px; font-size: 13px; font-weight: 500;
                cursor: pointer; transition: all 0.2s; white-space: nowrap;
                box-shadow: 0 1px 2px rgba(0,0,0,0.05); user-select: none;
            }
            .mf-quick-btn:hover {
                border-color: ${CONFIG.brandColor}; color: ${CONFIG.brandColor};
                background: #f8fafc; transform: translateY(-1px);
                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
            }
            
            .mf-avatar {
                width: 36px; height: 36px; border-radius: 12px; flex-shrink: 0; /* w-9 h-9 rounded-xl */
                display: flex; align-items: center; justify-content: center;
                box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05);
            }
            
            .mf-bubble {
                padding: 14px 24px; border-radius: 1.5rem; /* rounded-[1.5rem] */
                font-size: 15px; line-height: 1.6; 
                max-width: min(85%, 850px); /* LIMIT WIDTH ON LARGE SCREENS */
                word-wrap: break-word; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            }
            .mf-bubble.bot { 
                background: white; border: 1px solid rgba(241,245,249,0.8); /* border-slate-100/80 */
                border-top-left-radius: 0; 
                color: #334155; /* text-slate-700 */
            }
            .mf-bubble.user { 
                background: #0f172a; /* bg-slate-900 */
                color: white; 
                border-top-right-radius: 0; 
                box-shadow: 0 10px 15px -3px rgba(15,23,42,0.1); /* shadow-lg shadow-slate-900/10 */
            }

            /* LIST STYLES IN BUBBLES (Forced Reset) */
            .mf-bubble ul, .mf-bubble ol { 
                margin: 12px 0 !important; 
                padding-left: 24px !important; 
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
            }
            .mf-bubble ul { list-style-type: disc !important; list-style-position: outside !important; }
            .mf-bubble ol { list-style-type: decimal !important; list-style-position: outside !important; }
            .mf-bubble li { 
                margin-bottom: 6px !important; 
                display: list-item !important; 
                line-height: 1.6 !important;
                visibility: visible !important;
                list-style: inherit !important;
            }
            .mf-bubble li:last-child { margin-bottom: 0 !important; }
            .mf-bubble li::marker { color: ${brand} !important; font-weight: bold !important; font-size: 1.1em; }
            .mf-bubble.user li::marker { color: #94a3b8 !important; }
            
            /* INPUT AREA */
            #mf-input-wrapper {
                padding: 12px 24px; /* Reduced padding */
                background: white; border-top: 1px solid #f8fafc;
                display: flex; align-items: center; gap: 10px;
            }
            #mf-input {
                flex: 1; padding: 16px 24px; padding-right: 155px; border-radius: 16px; /* rounded-2xl */
                background: #f8fafc; border: 1px solid #f1f5f9;
                font-size: 14px; outline: none; transition: 0.2s;
            }
            #mf-input:focus { background: white; border-color: #fb923c; box-shadow: 0 0 0 4px rgba(249,115,22,0.05); }
            
            #mf-mic {
                position: absolute; right: 76px; 
                width: 44px; height: 44px; border-radius: 12px;
                background: white; color: #94a3b8; border: none;
                cursor: pointer; display: flex; align-items: center; justify-content: center;
                transition: transform 0.2s; box-shadow: none;
            }
            #mf-mic:hover { color: ${brand}; background: #f8fafc; }
            #mf-mic.listening { animation: mfPulse 1.5s infinite; background: #fee2e2; color: #ef4444; }

            #mf-send {
                position: absolute; right: 28px; /* Adjusted */
                width: 44px; height: 44px; border-radius: 12px;
                background: ${brand}; color: white; border: none;
                cursor: pointer; display: flex; align-items: center; justify-content: center;
                transition: transform 0.2s; box-shadow: 0 10px 15px -3px rgba(249,115,22,0.2);
            }
            #mf-send:hover { transform: scale(1.03); }
            #mf-send:disabled { opacity: 0.5; cursor: default; transform: none; background: #94a3b8; }

            .mf-char-counter {
                position: absolute; right: 155px; bottom: 35px;
                font-size: 10px; font-weight: 700; color: #94a3b8;
                pointer-events: none; opacity: 0; transition: 0.2s;
            }
            #mf-input:focus + .mf-char-counter, .mf-char-counter.visible { opacity: 1; }
            .mf-char-counter.limit { color: #f43f5e; }

            /* QUICK ACTIONS */
            #mf-quick {
                padding: 12px 24px; background: white; border-top: 1px solid #f8fafc;
                display: flex; gap: 10px; overflow-x: auto;
                scrollbar-width: none;
            }
            #mf-quick::-webkit-scrollbar { display: none; }
            .mf-chip {
                white-space: nowrap; padding: 8px 16px;
                background: #f8fafc; color: #475569;
                border-radius: 9999px; font-size: 12px; font-weight: 700;
                cursor: pointer; transition: 0.2s; border: 1px solid #f1f5f9;
                display: flex; align-items: center; gap: 6px;
            }
            .mf-chip:hover { background: #fff7ed; color: #ea580c; border-color: #fed7aa; }

            /* SCROLLBAR */
            #mf-messages::-webkit-scrollbar { width: 5px; }
            #mf-messages::-webkit-scrollbar-track { background: transparent; }
            #mf-messages::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
            #mf-messages::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }

            /* SPECIAL ELEMENTS & ANIMATIONS */
            .mf-typing { display: flex; gap: 4px; padding: 6px; }
            .mf-dot { width: 8px; height: 8px; background: ${brand}; border-radius: 50%; animation: mfBounce 1.4s infinite; }
            .mf-dot:nth-child(2) { animation-delay: 0.15s; }
            .mf-dot:nth-child(3) { animation-delay: 0.3s; }

            .mf-lead-form {
                margin-top: 10px; padding: 20px; background: white;
                border: 1px solid rgba(226, 232, 240, 0.8);
                border-left: 6px solid ${brand}; 
                border-radius: 16px; 
                box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);
            }
            .mf-lead-form input {
                width: 100%; padding: 12px 16px; margin-bottom: 12px;
                border: 1px solid #e2e8f0; border-radius: 12px; outline: none;
                font-size: 14px; background: #f8fafc;
            }
            .mf-lead-form input:focus { border-color: ${brand}; box-shadow: 0 0 0 3px rgba(0,0,0,0.05); }
            .mf-lead-form button {
                width: 100%; padding: 14px; background: ${brand}; color: white;
                font-weight: 700; border: none; border-radius: 12px; cursor: pointer;
                display: flex; align-items: center; justify-content: center; gap: 8px;
                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); transition: 0.2s;
            }
            .mf-lead-form button:hover { opacity: 0.9; transform: translateY(-1px); }

            @keyframes mfBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
            @keyframes mfFadeIn { 
                0% { transform: scale(0.8) translateY(10px); opacity: 0; }
                100% { transform: scale(1) translateY(0); opacity: 1; }
            }
            .mf-anim-in { animation: mfFadeIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
            
            /* DISCLAIMER */
            .mf-footer { padding: 0 12px 8px 12px; background: white; text-align: center; }
            .mf-disclaimer { 
                font-size: 10px; color: #94a3b8; display: inline-flex; align-items: center; gap: 4px;
                cursor: default;
            }
            .mf-shield-icon { cursor: pointer; color: #cbd5e1; transition: 0.2s; }
            .mf-shield-icon:hover { color: ${brand}; }
            
            /* TOOLTIP */
            .mf-shield-tooltip {
                visibility: hidden; opacity: 0; position: absolute; bottom: 40px; left: 50%; transform: translateX(-50%);
                width: 260px; background: #1e293b; color: white; padding: 12px; border-radius: 8px;
                font-size: 11px; line-height: 1.5; text-align: left; z-index: 99;
                box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); transition: 0.2s;
                pointer-events: none;
            }
            .mf-disclaimer:hover .mf-shield-tooltip { visibility: visible; opacity: 1; transform: translateX(-50%) translateY(-5px); }
            
            /* MOBILE RESPONSIVENESS */
            @media (max-width: 520px) {
                #mf-window {
                    width: 100% !important;
                    height: 100% !important;
                    bottom: 0 !important;
                    right: 0 !important;
                    left: 0 !important;
                    top: 0 !important;
                    transform: none !important;
                    margin: 0 !important;
                    border-radius: 0 !important;
                    max-width: none !important;
                    max-height: none !important;
                }
                #mf-window.open {
                    display: flex !important;
                }
                #mf-trigger {
                    width: 56px;
                    height: 56px;
                    bottom: 20px;
                    ${isLeft ? 'left: 20px;' : 'right: 20px;'}
                }
                #mf-header {
                    padding: 16px 20px;
                }
                #mf-messages {
                    padding: 16px;
                }
                #mf-input-wrapper {
                    padding: 16px;
                }
                #mf-send {
                    right: 24px;
                }
            }
            .mf-like-btn { opacity: 0; transform: translateY(2px); transition: opacity 0.2s, color 0.2s; }
            .mf-row:hover .mf-like-btn, .mf-like-btn.liked { opacity: 1; transform: translateY(0); }
            .mf-like-btn:hover { color: #ef4444 !important; }
            .mf-like-btn.liked { color: #ef4444 !important; }
            .mf-like-btn.popping { animation: mfHeartPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
            
            @keyframes mfHeartPop {
                0% { transform: scale(1); }
                50% { transform: scale(1.4); }
                100% { transform: scale(1); }
            }
            @keyframes mfRayAnim {
                0% { transform: rotate(var(--ang)) translateY(0) scale(1); opacity: 1; }
                100% { transform: rotate(var(--ang)) translateY(-20px) scale(0); opacity: 0; }
            }
            @keyframes mfLivePulse { 0% { box-shadow: 0 0 0 0 rgba(236, 72, 153, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(236, 72, 153, 0); } 100% { box-shadow: 0 0 0 0 rgba(236, 72, 153, 0); } }
            .mf-live-autostart { animation: mfLivePulse 2s infinite; }
            
            .mf-ray {
                position: fixed; width: 3px; height: 3px; border-radius: 50%; background: #ef4444;
                pointer-events: none; z-index: 10000;
                animation: mfRayAnim 0.6s ease-out forwards;
            }
            .mf-toast {
                position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
                background: rgba(0,0,0,0.8); color: white; padding: 8px 16px; border-radius: 20px;
                font-size: 12px; pointer-events: none; opacity: 0; transition: 0.3s;
                z-index: 10000;
            }
            .mf-toast.show { opacity: 1; bottom: 90px; }
        `;
        const style = document.createElement('style');
        style.id = 'mf-styles';
        style.innerHTML = css;
        document.head.appendChild(style);
    };

    // --- LEAD FORM COMPONENT ---
    const renderLeadForm = () => {
        return `
            <div class="mf-lead-form">
                <div style="font-weight:700;margin-bottom:12px;color:#1e293b;">Để lại thông tin tư vấn</div>
                <input type="text" id="mf-lead-email" placeholder="Email của bạn *" />
                <input type="text" id="mf-lead-phone" placeholder="Số điện thoại (Tùy chọn)" />
                <button onclick="window.mfSubmitLead(this)">
                    Gửi thông tin ${ICONS.arrowRight}
                </button>
            </div>
        `;
    };

    window.mfSubmitLead = (btn) => {
        const container = btn.closest('.mf-lead-form');
        const email = container.querySelector('#mf-lead-email').value.trim();
        const phone = container.querySelector('#mf-lead-phone').value.trim();

        if (!email) {
            alert('Vui lòng nhập Email để chúng tôi liên hệ!');
            return;
        }
        if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            alert('Vui lòng nhập địa chỉ Email hợp lệ!');
            return;
        }

        const originalText = btn.innerHTML;
        btn.innerHTML = 'Đang gửi...';
        btn.disabled = true;

        // IDENTIFY & TRACK
        if (window._mfIdentify) {
            // Pass distinct Email (required) and Phone (optional)
            window._mfIdentify(email, phone || null, {});
        }

        // Simulate API call or just rely on tracker
        setTimeout(() => {
            btn.innerHTML = 'Đã gửi thành công!';
            btn.style.background = '#10b981';

            // Disable inputs
            container.querySelectorAll('input').forEach(i => i.disabled = true);
        }, 1000);
    };

    // --- PARSING HELPERS ---
    const renderMarkdown = (text, role) => {
        // Strip [ACTIONS: ...] if present (fallback)
        text = text.replace(/\[ACTIONS:.*?\]/g, '').trim();

        // Remove redundant AI prefixes/tags completely (closed or unclosed)
        text = text.replace(/\[(Tham khảo thêm|Link hình mẫu|Hình ảnh minh họa|Xem hình|Tài liệu|Chi tiết|EXTERNAL_LINK|Liên kết ngoài)[^\]]*(\]|$)/gim, '');

        const escape = (str) => str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

        // Inline parsing function
        const parseInline = (str) => {
            const regex = /(!?\[([^\]]+)\]\(([^)]+)\)|\[?(https?:\/\/[^\s\]]+)\]?|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|(\+84|0)\d{9,10})/g;
            let result = "";
            let lastIdx = 0;
            let match;

            while ((match = regex.exec(str)) !== null) {
                let preText = str.substring(lastIdx, match.index);
                // Clean common artifacts
                if (match[3] && match[3].match(/\.(pdf|docx?|xlsx?|pptx?|zip|rar|7z|txt|csv)$/i)) {
                    preText = preText.replace(/\[Tham khảo thêm:\s*$/, '').replace(/\[$/, '');
                }
                result += escape(preText);

                const isImg = match[1] && match[1].startsWith('!');
                let label = match[2];
                let url = match[3] || match[4] || match[1];

                if (!match[3] && !match[2]) url = url.replace(/[.,!?;:)\]]+$/, '');

                const imgExt = url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i);
                const videoExt = url.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i);
                const fileExt = url.match(/\.(pdf|docx?|xlsx?|pptx?|zip|rar|7z|txt|csv)$/i);
                const youtubeMatch = url.match(/^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);

                if (youtubeMatch) {
                    const vidId = youtubeMatch[4];
                    const thumb = `https://img.youtube.com/vi/${vidId}/maxresdefault.jpg`;
                    result += `<a href="${url}" target="_blank" style="display:block;margin:12px 0;border-radius:24px;overflow:hidden;border:1px solid #f1f5f9;text-decoration:none;position:relative;background:white;box-shadow:0 10px 30px -5px rgba(0,0,0,0.1);transition:transform 0.2s;"><div style="width:100%;aspect-ratio:16/9;background:url(${thumb}) center/cover no-repeat, url(https://img.youtube.com/vi/${vidId}/mqdefault.jpg) center/cover no-repeat;position:relative;background-color:#f1f5f9;"><div style="position:absolute;inset:0;background:rgba(0,0,0,0.1);display:flex;align-items:center;justify-content:center;"><div style="width:64px;height:64px;background:#ef4444;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;box-shadow:0 15px 35px rgba(239,68,68,0.4);border:3px solid white;"><svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div></div></div><div style="padding:16px 20px;background:#fff;display:flex;justify-content:between;align-items:center;border-top:1px solid #f8fafc;"><div style="flex:1;"><div style="font-weight:800;color:#94a3b8;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;">XEM VIDEO TRÊN YOUTUBE</div><div style="font-weight:700;color:#1e293b;font-size:14px;margin-top:2px;">Bấm để phát ngay</div></div><div style="color:#cbd5e1;transform:translateX(-4px);">${ICONS.arrowRight}</div></div></a>`;
                } else if (videoExt) {
                    result += `<div style="margin:12px 0;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px -5px rgba(0,0,0,0.15);background:black;"><video controls playsinline preload="metadata" style="width:100%;display:block;"><source src="${url}" type="video/${videoExt[1].toLowerCase() === 'mov' ? 'mp4' : videoExt[1].toLowerCase()}">Trình duyệt không hỗ trợ xem video này.</video></div>`;
                } else if (isImg || imgExt) {
                    result += `<a href="${url}" target="_blank" style="display:block;margin:12px 0;border-radius:24px;overflow:hidden;border:1px solid #f1f5f9;text-decoration:none;background:white;box-shadow:0 10px 30px -5px rgba(0,0,0,0.08);"><img src="${url}" style="width:100%; display:block; max-height:350px; object-fit:cover;" alt="Image"/><div style="padding:16px 20px;background:#fff;display:flex;justify-content:between;align-items:center;border-top:1px solid #f8fafc;"><div style="flex:1;"><div style="font-weight:800;color:#94a3b8;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;">HÌNH ẢNH MINH HỌA</div><div style="font-weight:700;color:#1e293b;font-size:14px;margin-top:2px;">Bấm để xem ảnh gốc</div></div><div style="color:#cbd5e1;transform:translateX(-4px);">${ICONS.arrowRight}</div></div></a>`;
                } else if (fileExt) {
                    const ext = fileExt[1].toUpperCase();
                    const name = label || url.split('/').pop();
                    result += `<a href="${url}" target="_blank" style="display:flex;align-items:center;gap:12px;padding:16px;background:#fff;border:1px solid #f1f5f9;border-radius:18px;text-decoration:none;margin:12px 0;transition:all 0.2s;width:100%;box-sizing:border-box;box-shadow:0 10px 20px -5px rgba(0,0,0,0.04);"><div style="background:#fee2e2;width:48px;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;color:#ef4444;flex-shrink:0;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></div><div style="flex:1;min-width:0;overflow:hidden;"><div style="font-weight:700;color:#1e293b;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px;">${name}</div><div style="font-size:10px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">${ext} FILE • BẤM ĐỂ TẢI XUỐNG</div></div><div style="color:#cbd5e1;flex-shrink:0;">${ICONS.arrowRight}</div></a>`;
                } else {
                    if (!label && (url.startsWith('mailto:') || url.startsWith('tel:'))) label = url.replace(/^(mailto|tel):/, '');
                    else if (!label && url.includes('@') && !url.startsWith('http')) { label = url; url = 'mailto:' + url; }
                    else if (!label && url.match(/^(\+84|0)\d{9,10}$/)) { label = url; url = 'tel:' + url; }
                    const color = role === 'user' ? '#bfdbfe' : '#ea580c';
                    result += `<a href="${url}" target="_blank" style="color:${color};text-decoration:underline;text-underline-offset:4px;font-weight:500;">${label || url}</a>`;
                }
                lastIdx = regex.lastIndex;
            }
            result += escape(str.substring(lastIdx));
            // Multi-step Bold: Use a non-capturing group for better safety
            result = result.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            return result;
        };

        const lines = text.split('\n');
        let htmlBlocks = [];
        let currentList = [];
        let currentTable = [];

        const flushList = () => {
            if (currentList.length > 0) {
                htmlBlocks.push(`<ul style="margin: 12px 0 !important; padding-left: 24px !important; list-style-type: disc !important; list-style-position: outside !important; display: block !important;">${currentList.join('')}</ul>`);
                currentList = [];
            }
        };

        const flushTable = () => {
            if (currentTable.length > 0) {
                // Must have at least 2 rows (header + separator)
                if (currentTable.length >= 2) {
                    const header = currentTable[0].split('|').map(c => c.trim()).filter(c => c);
                    const separator = currentTable[1].split('|').map(c => c.trim()).filter(c => c);
                    const rows = currentTable.slice(2).map(row => row.split('|').map(c => c.trim()).filter(c => c)); // Keep empty cells? filter(c=>c) removes empty cells which might break alignment.
                    // Correct split logic: | A | B | -> ["", " A ", " B ", ""]
                    // Better: split('|').slice(1, -1) if pipe at ends.

                    const parseRow = (line) => {
                        const parts = line.split('|');
                        if (parts.length > 2 && parts[0].trim() === '' && parts[parts.length - 1].trim() === '') {
                            return parts.slice(1, -1);
                        }
                        return parts;
                    };

                    const headers = parseRow(currentTable[0]);
                    const bodyRows = currentTable.slice(2).map(r => parseRow(r));

                    let tableHtml = `<div style="overflow-x:auto;margin:16px 0;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;"><table style="width:100%;border-collapse:collapse;font-size:13px;background:white;">`;

                    // Header
                    tableHtml += `<thead style="background:#f8fafc;border-bottom:1px solid #e2e8f0;"><tr>`;
                    headers.forEach(h => {
                        tableHtml += `<th style="padding:12px 16px;text-align:left;font-weight:700;color:#1e293b;border-right:1px solid #f1f5f9;white-space:nowrap;">${parseInline(h.trim())}</th>`;
                    });
                    tableHtml += `</tr></thead>`;

                    // Body
                    tableHtml += `<tbody>`;
                    bodyRows.forEach((row, idx) => {
                        const bg = idx % 2 === 0 ? '#ffffff' : '#fcfcfc';
                        tableHtml += `<tr style="background:${bg};border-bottom:1px solid #f1f5f9;">`;
                        row.forEach(cell => {
                            // FIX: Decode <br> tags in table cells
                            tableHtml += `<td style="padding:12px 16px;vertical-align:top;border-right:1px solid #f1f5f9;color:#334155;line-height:1.5;">${parseInline(cell.trim()).replace(/&lt;br\s*\/?&gt;/gi, '<br/>')}</td>`;
                        });
                        tableHtml += `</tr>`;
                    });
                    tableHtml += `</tbody></table></div>`;
                    htmlBlocks.push(tableHtml);
                }
                currentTable = [];
            }
        };

        lines.forEach(line => {
            const trimmed = line.trim();
            // Table Detection: Starts with |
            if (trimmed.startsWith('|')) {
                flushList();
                currentTable.push(trimmed);
                return;
            } else {
                flushTable();
            }

            // Match bullet points: - item, * item, • item, – item, — item, 1. item . REQUIRE space after bullet to avoid **Bold** confusion
            const listMatch = trimmed.match(/^([-*•–—]|\d+\.)\s+(.*)$/);
            const isIndented = line.startsWith('  ') || line.startsWith('\t');

            if (listMatch) {
                currentList.push(`<li style="margin-bottom: 6px; line-height: 1.6;">${parseInline(listMatch[2])}</li>`);
            } else if (isIndented && currentList.length > 0 && trimmed) {
                // Continuation of list or sub-item (indented)
                currentList.push(`<li style="margin-bottom: 6px; line-height: 1.6; list-style-type: none;">${parseInline(trimmed)}</li>`);
            } else {
                flushList();
                if (trimmed) {
                    if (trimmed.startsWith('### ')) {
                        htmlBlocks.push(`<h3 style="margin: 16px 0 8px 0; font-size: 16px; font-weight: 800; color: #1e293b;">${parseInline(trimmed.substring(4))}</h3>`);
                    } else if (trimmed.startsWith('## ')) {
                        htmlBlocks.push(`<h2 style="margin: 20px 0 10px 0; font-size: 18px; font-weight: 800; color: #1e293b;">${parseInline(trimmed.substring(3))}</h2>`);
                    } else {
                        htmlBlocks.push(`<div style="margin-bottom: 10px; line-height: 1.6;">${parseInline(trimmed)}</div>`);
                    }
                } else {
                    // Empty line spacer
                    htmlBlocks.push(`<div style="height: 8px;"></div>`);
                }
            }
        });
        flushList();
        flushTable();

        return htmlBlocks.join('');
    };

    // Nav Link Suggestion
    const renderNavLink = (txt) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const matches = txt.match(urlRegex);
        if (!matches || matches.length !== 1) return '';
        const url = matches[0].replace(/[.,!?;:)\]]+$/, '');
        if (url.match(/\.(jpg|png|gif|webp|pdf|doc|xls|zip)$/i)) return '';

        return `
            <a href="${url}" target="_blank" class="mf-nav-link" style="margin-top:12px;display:flex;align-items:center;justify-content:space-between;padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;text-decoration:none;transition:0.2s;">
                <div>
                    <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;">Đường dẫn đề xuất</div>
                    <div style="font-size:12px;font-weight:700;color:#334155;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px;">Truy cập liên kết</div>
                </div>
                <div style="background:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#ea580c;box-shadow:0 1px 2px rgba(0,0,0,0.05);">${ICONS.arrowRight}</div>
            </a>
        `;
    };




    // --- MAIN RENDER ---
    const renderApp = () => {
        const root = document.createElement('div');
        root.id = 'mf-root';
        root.className = 'mf-ignore-tracking'; // Signal to tracker to ignore EVERYTHING inside
        root.innerHTML = `
            <div id="mf-window" class="mf-ignore-tracking">
                <div id="mf-header" class="mf-ignore-tracking">
                    <div class="mf-bg-pattern"></div>
                    <div style="display:flex;align-items:center;gap:16px;position:relative;z-index:10;" class="mf-ignore-tracking">
                        <div class="mf-avatar-box mf-ignore-tracking">
                            ${CONFIG.botAvatar ? `<img src="${CONFIG.botAvatar}" style="width:100%;height:100%;object-fit:cover;">` : ICONS.bot}
                            <div class="mf-pulse" style="width:16px;height:16px;position:absolute;bottom:-2px;right:-2px;background:#10b981;border:3px solid white;border-radius:50%;animation:none;"></div>
                        </div>
                        <div>
                            <div style="font-weight:700;font-size:16px;display:flex;align-items:center;gap:6px;line-height:1.2;">
                                ${CONFIG.botName} ${ICONS.shield}
                            </div>
                            <div style="font-size:11px;opacity:0.8;font-weight:600;letter-spacing:0.05em;margin-top:2px;">SẴN SÀNG HỖ TRỢ 24/7</div>
                        </div>
                    </div>
                    <div class="mf-header-actions" style="display:flex;gap:8px;position:relative;z-index:10;align-items:center;">
                        <!-- Laptop Live Button Removed per request -->

                        <button id="mf-full-btn" title="Toàn màn hình">${ICONS.fullScreen}</button>
                        <button id="mf-close-btn" title="Đóng">${ICONS.x}</button>
                    </div>
                </div>
                <div id="mf-messages" class="mf-ignore-tracking" data-no-track="true"></div>
                
                <!-- Quick Actions Area -->
                <div id="mf-quick" class="mf-ignore-tracking"></div>
                
                <div id="mf-input-wrapper" class="mf-ignore-tracking" style="padding: 12px 24px 24px 24px; position:relative;">
                    <div id="mf-voice-overlay" class="mf-voice-overlay mf-ignore-tracking" style="bottom: 24px; left: 24px; right: 24px; top: 12px; border-radius: 99px;">
                        <div class="mf-voice-text">
                            <div class="mf-voice-wave">
                                <div class="mf-voice-bar"></div><div class="mf-voice-bar"></div><div class="mf-voice-bar"></div><div class="mf-voice-bar"></div><div class="mf-voice-bar"></div>
                            </div>
                            <span id="mf-voice-status">Đang nghe...</span>
                        </div>
                    </div>

                    <div style="position:relative; width:100%; display:flex; align-items:center;">
                         <!-- Mobile Live Button (Left) - Inside flex for perfect alignment -->
                         <button id="mf-mobile-live-btn" class="mf-live-autostart mf-ignore-tracking" title="Live Voice" style="display:none; position:absolute; left:6px; top:50%; transform:translateY(-50%); z-index:2147483647; border:none; background:${CONFIG.brandColor}; cursor:pointer; padding:0; border-radius:50%; width:40px; height:40px; align-items:center; justify-content:center; color:white; box-shadow: 0 4px 10px rgba(236, 72, 153, 0.4); transition:0.2s; pointer-events:auto !important;">
                            ${ICONS.activity}
                         </button>

                        <input type="text" id="mf-input" class="mf-ignore-tracking" placeholder="Nhập câu hỏi của mình..." autocomplete="off" maxlength="200" 
                               style="width:100%; padding: 16px 60px 16px 20px; border-radius: 99px; border: 1px solid #e2e8f0; background: #f8fafc; outline:none; font-size:14px; box-shadow: 0 2px 5px rgba(0,0,0,0.02); position:relative; z-index:1;">
                        
                        <div style="position:absolute; right:6px; display:flex; gap:6px; align-items:center; z-index: 10;">
                             <button id="mf-mic" class="mf-ignore-tracking" title="Nhập bằng giọng nói" style="display:none; border:none; background:white; cursor:pointer; padding:8px; border-radius:50%; color:#64748b; box-shadow: 0 2px 5px rgba(0,0,0,0.05); transition:0.2s;">${ICONS.mic}</button>
                             <button id="mf-send" class="mf-ignore-tracking" disabled style="border:none; background:#cbd5e1; cursor:not-allowed; padding:0; border-radius:14px; width:38px; height:38px; display:flex; align-items:center; justify-content:center; color:white; transition:0.2s;">${ICONS.send}</button>
                        </div>
                    </div>
                    <div id="mf-char-counter" class="mf-char-counter mf-ignore-tracking" style="position:absolute; bottom: 4px; right: 40px; font-size: 10px; color: #94a3b8; pointer-events: none;">0/200</div>
                </div>
                <div class="mf-footer mf-ignore-tracking">
                    <div class="mf-disclaimer mf-ignore-tracking">
                       AI can make mistakes, so double-check it
                        <span class="mf-shield-icon mf-ignore-tracking">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        </span>
                        <div class="mf-shield-tooltip mf-ignore-tracking">
                            <strong class="mf-ignore-tracking">Từ chối trách nhiệm AI:</strong><br/>
                            Nguồn huấn luyện: <strong class="mf-ignore-tracking">${CONFIG.botName || CONFIG.companyName || 'Dữ liệu doanh nghiệp'}</strong>.<br/>
                            Phản hồi được tạo ra dựa trên cơ sở kiến thức nội bộ được kiểm soát chặt chẽ và mô hình Gemini để mang đến nguồn tham khảo chuẩn và nhanh nhất cho người dùng. Dữ liệu internet bên ngoài được loại bỏ để đảm bảo tính liên quan. Vui lòng xác minh thông tin quan trọng như thời gian, học phí,...
                        </div>
                    </div>
                </div>
            </div>
            <div id="mf-trigger" class="mf-ignore-tracking">
                <div style="position:relative;" class="mf-ignore-tracking">
                    <div style="position:absolute;top:-4px;right:-4px;width:20px;height:20px;background:#10b981;border:4px solid white;border-radius:50%;animation:mfBounce 1s infinite;" class="mf-ignore-tracking"></div>
                    ${ICONS.messageCircle}
                </div>
            </div>

            <div id="mf-live-overlay" class="mf-ignore-tracking">
                <button id="mf-live-close" class="mf-live-close">${ICONS.x}</button>
                <div class="mf-live-orb">
                   <div class="mf-live-waves">
                       <div class="mf-live-wave"></div>
                       <div class="mf-live-wave"></div>
                       <div class="mf-live-wave"></div>
                   </div>
                   <div id="mf-live-icon" style="color:white; z-index:5; transform: scale(1.6); transition: all 0.3s ease;">${ICONS.mic}</div>
                </div>
                <!-- Live Text reduced size and styled -->
                <div id="mf-live-text" class="mf-live-text" style="font-size:16px; font-weight:500; margin-top:24px; text-align:center; padding:0 24px; line-height:1.5; opacity:0.9; min-height:60px;">Đang lắng nghe...</div>
            </div>
        `;
        document.body.appendChild(root);

        // Bind Elements
        const win = document.getElementById('mf-window');
        const trigger = document.getElementById('mf-trigger');
        const msgContainer = document.getElementById('mf-messages');
        const quickContainer = document.getElementById('mf-quick');
        const input = document.getElementById('mf-input');
        const sendBtn = document.getElementById('mf-send');

        // Init Voice
        initVoice();

        // Logic helpers (scrollBottom, syncMessages, syncQuick, toggleLive, toggle) 
        // have been moved to the outer scope to ensure accessibility.

        // Bind Events


        trigger.onclick = () => toggle(true);
        document.getElementById('mf-close-btn').onclick = () => toggle(false);

        // LIVE BTN
        const liveBtn = document.getElementById('mf-live-btn');
        if (liveBtn) liveBtn.onclick = () => toggleLive(true);

        const liveClose = document.getElementById('mf-live-close');
        if (liveClose) liveClose.onclick = () => toggleLive(false);

        document.getElementById('mf-full-btn').onclick = () => {
            if (State.isMaximized) {
                State.isMaximized = false;
                win.classList.remove('maximized');
            }
            State.isFullScreen = !State.isFullScreen;
            win.classList.toggle('full-screen', State.isFullScreen);
            document.getElementById('mf-full-btn').innerHTML = State.isFullScreen ? ICONS.minimize : ICONS.fullScreen;
        };
        input.oninput = (e) => {
            const val = e.target.value;
            State.inputValue = val; // CRITICAL: Update State

            const counter = document.getElementById('mf-char-counter');
            counter.innerText = `${val.length}/200`;
            counter.classList.toggle('limit', val.length >= 200);
            counter.classList.add('visible');

            updateSendState(); // Update Button State immediately
        };

        // Cooldown Tick
        setInterval(() => {
            if (State.cooldown > 0) {
                State.cooldown--;
                updateSendState();
                // AUTO FOCUS AFTER COOLDOWN
                if (State.cooldown === 0 && State.isOpen) {
                    const inputEl = document.getElementById('mf-input');
                    if (inputEl) inputEl.focus();
                }
            }
        }, 1000);

        input.onkeypress = (e) => {
            // Prevent send if on cooldown
            if (e.key === 'Enter' && State.cooldown === 0) handleSend();
        };

        sendBtn.onclick = () => handleSend();

        return { toggle, updateSendState };
    };

    // --- GLOBAL HELPERS ---
    const updateSendState = () => {
        const sendBtn = document.getElementById('mf-send');
        const inputEl = document.getElementById('mf-input');
        if (!sendBtn || !inputEl) return;

        const hasValue = State.inputValue.trim().length > 0;
        const isCooldown = State.cooldown > 0;

        sendBtn.disabled = !hasValue || isCooldown;
        // ENABLE INPUT ALWAYS so they can type next message
        inputEl.disabled = false;

        if (!sendBtn.disabled) {
            sendBtn.style.background = CONFIG.brandColor;
            sendBtn.style.cursor = 'pointer';
        } else {
            sendBtn.style.background = '#cbd5e1';
            sendBtn.style.cursor = 'not-allowed';
        }

        if (isCooldown) {
            inputEl.placeholder = `Chờ ${State.cooldown}s...`;
            sendBtn.innerHTML = `<span style="font-size:12px;font-weight:800;">${State.cooldown}s</span>`;
        } else {
            inputEl.placeholder = "Nhập câu hỏi của mình...";
            sendBtn.innerHTML = ICONS.send;
        }
    };

    const createMessageEl = (msg, startEmpty = false) => {
        const isUser = msg.role === 'user';
        const div = document.createElement('div');
        div.className = `mf-row mf-anim-in ${isUser ? 'user' : ''}`;

        const botIcon = CONFIG.botAvatar
            ? `<img src="${CONFIG.botAvatar}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">`
            : ICONS.bot;

        const avatarHtml = isUser
            ? `<div class="mf-avatar" style="background:#e2e8f0;color:#475569;border:none;">${ICONS.user}</div>`
            : `<div class="mf-avatar" style="background:white;color:${CONFIG.brandColor};border:1px solid #f1f5f9;">${botIcon}</div>`;
        const bubbleStyle = isUser ? `background:${CONFIG.brandColor};color:white;` : `background:#f8fafc;color:#0f172a;border:1px solid #e2e8f0;border-top-left-radius:0;`;

        let cleanContent = msg.content;

        // Strip [ACTIONS:...] tags
        cleanContent = cleanContent.replace(/\[(?:ACTIONS|ACTION|BUTTONS|BUTTON|OPTIONS):?(.*?)\]/gi, '');
        // FIX: Allow trailing whitespace
        cleanContent = cleanContent.replace(/\[([^\[\]]+)\]\s*$/, (match, group1) => {
            if (group1.includes('|') || group1.length < 100) return '';
            return match;
        }).trim();

        let showLead = false;
        const leadPattern = /\[\s*SHOW[_ ]LEAD[_ ]FORM\s*\]/gi;

        if (leadPattern.test(cleanContent)) {
            // Remove ALL occurrences
            cleanContent = cleanContent.replace(leadPattern, '').trim();
            showLead = true;
        }

        // If startEmpty is true, we leave content empty for the typing effect to fill
        const contentHtml = startEmpty ? '' : renderMarkdown(cleanContent) + (showLead ? renderLeadForm() : '');

        // Timestamp
        const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        const timeStyle = isUser
            ? 'font-size:10px;color:rgba(255,255,255,0.8);margin-top:4px;text-align:right;'
            : 'font-size:10px;color:#94a3b8;margin-top:4px;';

        // Feedback Like Button (Only for Bot & RAG messages)
        // Feedback Like Button (Only for Bot & RAG messages)
        // Show for all bot messages so user can test UI. ID check happens on backend.
        const canLike = !isUser;
        const likedClass = msg.liked ? 'liked' : '';
        const likeBtnHtml = canLike
            ? `<button class="mf-like-btn ${likedClass}" onclick="window.mfLike('${msg.id}')" title="Hữu ích" style="background:none;border:none;cursor:pointer;padding:0 4px;margin-left:8px;color:${msg.liked ? '#ef4444' : '#94a3b8'};transition:0.2s;">
                 <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="${msg.liked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
               </button>`
            : '';

        div.innerHTML = `
            ${avatarHtml}
            <div class="mf-bubble ${isUser ? 'user' : ''}" style="${bubbleStyle}">
                <div class="mf-content">${contentHtml}</div>
                <div style="display:flex;align-items:center;justify-content:space-between;margin-top:4px;">
                    <div class="mf-time" style="${timeStyle.replace('margin-top:4px;', '')}">${timeStr}</div>
                    ${likeBtnHtml}
                </div>
            </div>
        `;
        return div;
    };

    // --- RENDER WITH FADE EFFECT ---
    const streamTextToBubble = (fullText, targetEl, onComplete) => {
        // Render full markdown immediately for stability (tables, lists)
        targetEl.innerHTML = renderMarkdown(fullText);

        // Smooth Fade In Animation
        targetEl.style.opacity = '0';
        targetEl.style.transform = 'translateY(5px)';
        targetEl.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';

        // LIVE MODE MIRROR REMOVED - Handled by speakText onPlay

        requestAnimationFrame(() => {
            targetEl.style.opacity = '1';
            targetEl.style.transform = 'translateY(0)';
            if (onComplete) setTimeout(onComplete, 500); // Wait for transition
        });
    };

    // --- SEND LOGIC (DEBOUNCED & BATCHED) ---
    const handleSend = (text = null) => {
        const val = text || State.inputValue;
        if (!val.trim()) return;

        // Optimistic UI
        State.messages.push({ id: Date.now().toString(), role: 'user', content: val.trim(), timestamp: Date.now() });

        // Reset Inputs
        State.inputValue = '';
        document.getElementById('mf-input').value = '';
        document.getElementById('mf-char-counter').innerText = '0/200';

        // Update UI state but don't set cooldown here
        State.cooldown = State.cooldown > 0 ? State.cooldown : 0;
        updateSendState();

        State.quickActions = [];
        document.getElementById('mf-quick').style.display = 'none';

        // Render
        const msgContainer = document.getElementById('mf-messages');
        const lastMsg = State.messages[State.messages.length - 1];
        msgContainer.appendChild(createMessageEl(lastMsg));
        msgContainer.scrollTop = msgContainer.scrollHeight;

        // BUFFER
        State.sendBuffer.push(val.trim());

        if (window.__mf_app) window.__mf_app.updateSendState();

        // Disable Send Button Immediately
        const btn = document.getElementById('mf-send');
        if (btn) btn.disabled = true;

        // Send logic - IMMEDIATE (No Debounce)
        if (State.sendTimer) clearTimeout(State.sendTimer);
        // Instant execution
        executeAPI();

        saveState();
    };

    const executeAPI = async () => {
        if (State.sendBuffer.length === 0) return;

        // Show typing immediately
        showTyping(true);
        if (State.isLiveMode) {
            const liveText = document.getElementById('mf-live-text');
            if (liveText) liveText.innerText = "Đang suy nghĩ...";
            const orb = document.querySelector('.mf-live-orb');
            if (orb) orb.classList.add('loading');
            const icon = document.getElementById('mf-live-icon');
            if (icon) icon.innerHTML = '<div class="mf-spinner" style="width:24px;height:24px;border:3px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;animation:mfRotate 1s linear infinite;"></div>';
        }

        // If cooldown active, wait? No, user said "gửi đi ngay". 
        // But we still need to respect backend limits. 
        // We relying on the backend 2s limit now.
        // We will just execute. 

        // Lock cooldown immediately (5s as requested)
        State.cooldown = 5;

        const text = State.sendBuffer.join('\n');
        State.sendBuffer = [];

        // Disable input just for the submission moment?
        // User said: "chặn nút gửi tin hoặc enter (chứ ko chặn gõ)"
        // Since we clear input immediately in handleSend, users can type next msg.
        // We just need to stop double-execution.
        // handleSend already clears input, so subsequent Enters sends empty string which is blocked by handleSend check.
        // So just removing debounce is the key.

        try {
            const context = {
                current_url: window.location.href,
                path: window.location.pathname
            };

            const history = State.messages
                .filter(m => m.content && m.content.trim() !== '' && !m.isError) // Filter empty & errors
                .map(m => ({
                    role: m.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: m.content }]
                })).slice(0, -1);

            const payload = {
                message: text,
                property_id: CONFIG.propertyId,
                visitor_id: localStorage.getItem('_mf_vid'),
                conversation_id: State.conversationId,
                history: !State.conversationId ? history : undefined,
                context: context,
                is_test: CONFIG.isTest
            };

            const res = await fetch(`${CONFIG.apiEndpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            showTyping(false);
            if (State.isLiveMode) {
                // Removed "Đang tạo giọng nói..." per request
            }

            if (data.success) {
                if (data.conversation_id) {
                    State.conversationId = data.conversation_id;
                    localStorage.setItem('mailflow_chat_conv_id', State.conversationId);
                }

                if (data.data && data.data.message) {
                    let cleanMsg = data.data.message;
                    let actionsFromText = [];

                    // FRONTEND PARSING FOR ACTIONS
                    const explicitRegex = /\[(?:ACTIONS|ACTION|BUTTONS|BUTTON|OPTIONS):?(.*?)\]/i;
                    // FIX: Allow trailing whitespace (\s*) after the closing bracket
                    const implicitRegex = /\[([^\[\]]+)\]\s*$/;

                    const explicitMatch = cleanMsg.match(explicitRegex);
                    const implicitMatch = cleanMsg.match(implicitRegex);

                    let rawActions = "";
                    let matchString = "";

                    if (explicitMatch) {
                        rawActions = explicitMatch[1];
                        matchString = explicitMatch[0];
                    } else if (implicitMatch) {
                        // Only accept implicit if it looks like buttons (contains | or is short)
                        const content = implicitMatch[1];
                        if (content.includes('|') || content.length < 100) {
                            rawActions = content;
                            matchString = implicitMatch[0];
                        }
                    }

                    if (rawActions && matchString) {
                        const separator = rawActions.includes('|') ? '|' : ',';
                        actionsFromText = rawActions.split(separator).map(s => s.trim()).filter(s => s);
                        cleanMsg = cleanMsg.replace(matchString, '').trim();

                        // Populate State.quickActions immediately so they appear
                        if (actionsFromText.length > 0) {
                            State.quickActions = actionsFromText;
                            requestAnimationFrame(() => syncQuick()); // CRITICAL: Update DOM immediately
                        }
                    }

                    const botMsg = {
                        id: Date.now().toString(),
                        role: 'assistant',
                        content: cleanMsg,
                        timestamp: Date.now(),
                        chunk_ids: data.data.chunk_ids || []
                    };
                    State.messages.push(botMsg);

                    // Create bubble container but empty content
                    const msgEl = createMessageEl(botMsg, true); // true = startEmpty
                    document.getElementById('mf-messages').appendChild(msgEl);

                    // Start Typing Effect
                    let streamText = cleanMsg;
                    let hasLead = false;
                    const leadPattern = /\[\s*SHOW[_ ]LEAD[_ ]FORM\s*\]/gi;

                    // Robust Check
                    const cleanText = streamText.replace(leadPattern, '').trim();
                    if (cleanText !== streamText.trim()) {
                        hasLead = true;
                        streamText = cleanText;
                    }


                    // Helper for Live Typing (Sync with Voice Speed)
                    const typeLiveText = (txt) => {
                        if (!State.isLiveMode) return;
                        const liveText = document.getElementById('mf-live-text');
                        const orb = document.querySelector('.mf-live-orb');
                        const icon = document.getElementById('mf-live-icon');
                        if (!liveText || !orb) return;

                        liveText.innerHTML = "";
                        orb.classList.remove('loading');
                        orb.classList.add('speaking');
                        if (icon) icon.innerHTML = ICONS.activity; // Show activity waveform when speaking

                        const words = txt.split(/\s+/).filter(w => w).length;
                        // Ultra Fast scroll speed + 5s safe time
                        const duration = Math.max(5, (words / 10) + 1.2);

                        const lineEl = document.createElement('div');
                        lineEl.className = 'mf-lyric-line';
                        lineEl.style.animationDuration = duration + 's';
                        lineEl.innerText = txt.trim();
                        liveText.appendChild(lineEl);

                        setTimeout(() => { if (lineEl.parentNode) lineEl.remove(); }, duration * 1000);
                    };

                    streamTextToBubble(streamText, msgEl.querySelector('.mf-content'), () => {
                        const orb = document.querySelector('.mf-live-orb');
                        if (orb) orb.classList.remove('loading');

                        speakText(streamText, () => {
                            // ON END
                            if (State.isLiveMode && recognition && !State.loading) {
                                const liveText = document.getElementById('mf-live-text');
                                const orb = document.querySelector('.mf-live-orb');
                                const icon = document.getElementById('mf-live-icon');
                                if (icon) icon.innerHTML = ICONS.mic;

                                if (liveText) liveText.innerText = "";
                                if (orb) {
                                    orb.classList.remove('loading');
                                    orb.classList.remove('speaking');
                                    orb.style.opacity = '1';
                                    orb.style.pointerEvents = 'auto';
                                    orb.style.cursor = 'pointer';
                                    orb.onclick = () => { if (!isListening) try { recognition.start(); } catch (e) { } };
                                }

                                setTimeout(() => {
                                    if (State.isLiveMode && !isListening) try { recognition.start(); } catch (e) { }
                                }, 300);
                            }
                        }, () => {
                            // ON PLAY
                            typeLiveText(streamText);
                        });

                        if (hasLead) {
                            msgEl.querySelector('.mf-content').insertAdjacentHTML('beforeend', renderLeadForm());
                            const container = document.getElementById('mf-messages');
                            if (container) container.scrollTop = container.scrollHeight;
                        }

                        syncMessages();
                        saveState();
                        showTyping(false);
                        State.loading = false;

                        if (window.__mf_app && window.__mf_app.updateSendState) {
                            window.__mf_app.updateSendState();
                        }
                    });
                }

                if (data.data && data.data.quick_actions && data.data.quick_actions.length > 0) {
                    State.quickActions = data.data.quick_actions;
                    const qBox = document.getElementById('mf-quick');
                    qBox.innerHTML = '';
                    qBox.style.display = 'flex';
                    State.quickActions.forEach(qa => {
                        const el = document.createElement('button');
                        el.className = 'mf-chip';
                        el.innerHTML = `${ICONS.sparkles} ${qa}`;
                        el.onclick = () => {
                            State.quickActions = [];
                            qBox.style.display = 'none';
                            handleSend(qa);
                        };
                        qBox.appendChild(el);
                    });
                }

                // Cooldown already started at handleSend
            } else {
                throw new Error(data.message);
            }
        } catch (e) {
            showTyping(false);
            let msgContent = "Xin lỗi, kết nối không ổn định. Vui lòng thử lại.";
            if (e.message === 'AI System Busy') {
                msgContent = "Dạ, hệ thống đang bận một chút, em chưa thể trả lời ngay được. Anh/Chị vui lòng thử lại sau giây lát nhé!";
            }
            const err = { id: Date.now().toString(), role: 'assistant', content: msgContent, timestamp: Date.now(), isError: true };
            State.messages.push(err);
            document.getElementById('mf-messages').appendChild(createMessageEl(err));
        }

        document.getElementById('mf-messages').scrollTop = document.getElementById('mf-messages').scrollHeight;
        saveState();
        startPolling();
    };

    // --- POLLING LOGIC ---
    let pollInterval = null;
    const startPolling = () => {
        if (pollInterval) return;
        // Tăng lên 10s để hỗ trợ 10k concurrent users
        pollInterval = setInterval(pollMessages, 10000);
    };

    const stopPolling = () => {
        if (pollInterval) clearInterval(pollInterval);
        pollInterval = null;
    };

    const pollMessages = async () => {
        if (!State.conversationId || !State.isOpen) return;

        try {
            const res = await fetch(`${CONFIG.apiEndpoint}?action=get_messages&conversation_id=${State.conversationId}`);
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
                const serverMsgs = data.data;
                const localMsgs = State.messages;
                let newMsgsFound = false;

                // Consumption Pointer Strategy to handle duplicates correctly
                let localIdx = 0;

                for (const sMsg of serverMsgs) {
                    const sRole = sMsg.sender === 'visitor' ? 'user' : 'assistant';
                    const sContent = sMsg.message;

                    let found = false;
                    // Scan local messages starting from pointer
                    for (let i = localIdx; i < localMsgs.length; i++) {
                        const lMsg = localMsgs[i];
                        // Match condition: Role & Content
                        if (lMsg.role === sRole && lMsg.content === sContent) {
                            // Match found!
                            localIdx = i + 1; // Move pointer past this message
                            found = true;
                            break;
                        }
                    }

                    if (!found) {
                        // This server message is NOT in our remaining local list. It's NEW.
                        const m = {
                            id: sMsg.id,
                            role: sRole,
                            content: sContent,
                            timestamp: new Date(sMsg.created_at).getTime()
                        };
                        // We push to State immediately
                        State.messages.push(m);
                        document.getElementById('mf-messages').appendChild(createMessageEl(m));
                        newMsgsFound = true;
                    }
                }

                if (newMsgsFound) {
                    document.getElementById('mf-messages').scrollTop = document.getElementById('mf-messages').scrollHeight;
                    saveState();
                }
            }
        } catch (e) { }
    };


    const showTyping = (show) => {
        const id = 'mf-typing-row';
        const exist = document.getElementById(id);

        if (!show) {
            if (exist) exist.remove();
            return;
        }

        if (exist) return; // Already showing, stop here to avoid flicker

        const div = document.createElement('div');
        div.id = id;
        div.className = 'mf-row mf-anim-in';
        const botIcon = CONFIG.botAvatar
            ? `<img src="${CONFIG.botAvatar}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">`
            : ICONS.bot;

        div.innerHTML = `
            <div class="mf-avatar" style="background:white;color:${CONFIG.brandColor};border:1px solid #f1f5f9;">${botIcon}</div>
            <div class="mf-bubble bot" style="border-top-left-radius:0;">
                <div class="mf-typing">
                    <div class="mf-dot"></div><div class="mf-dot"></div><div class="mf-dot"></div>
                </div>
            </div>
        `;
        document.getElementById('mf-messages').appendChild(div);
        document.getElementById('mf-messages').scrollTop = document.getElementById('mf-messages').scrollHeight;
    };

    // --- PERSISTENCE ---
    const saveState = () => {
        const s = {
            messages: State.messages.slice(-50),
            isOpen: State.isOpen,
            convId: State.conversationId
        };
        localStorage.setItem(`mailflow_chat_store_${CONFIG.propertyId || 'default'}`, JSON.stringify(s));
    };

    const loadState = () => {
        try {
            const raw = localStorage.getItem(`mailflow_chat_store_${CONFIG.propertyId || 'default'}`);
            if (raw) {
                const s = JSON.parse(raw);
                if (s.messages) State.messages = s.messages;
                if (typeof s.isOpen === 'boolean') State.isOpen = s.isOpen;
                if (s.convId) State.conversationId = s.convId;
            }
        } catch (e) { }
    };

    // --- INIT ---
    const init = async () => {
        try {
            const vid = localStorage.getItem('_mf_vid') || '';
            const res = await fetch(`${CONFIG.apiEndpoint}?action=get_settings&property_id=${CONFIG.propertyId}&visitor_id=${vid}`);
            const data = await res.json();

            if (data.success && data.data && (data.data.is_enabled == 1 || CONFIG.isTest)) {
                const s = data.data;
                CONFIG.botName = s.bot_name || CONFIG.botName;
                CONFIG.brandColor = s.brand_color || CONFIG.brandColor;
                CONFIG.welcomeMsg = s.welcome_msg || CONFIG.welcomeMsg;
                CONFIG.botAvatar = s.bot_avatar;
                if (s.widget_position) CONFIG.position = s.widget_position;

                // Exclusions (Skip if isTest)
                if (!CONFIG.isTest) {
                    if (s.excluded_pages) {
                        try {
                            const ex = typeof s.excluded_pages === 'string' ? JSON.parse(s.excluded_pages) : s.excluded_pages;
                            if (Array.isArray(ex) && ex.some(u => window.location.href === u.trim() || window.location.pathname === u.trim())) return;
                        } catch (e) { }
                    }
                    if (s.excluded_paths) {
                        try {
                            const ex = typeof s.excluded_paths === 'string' ? JSON.parse(s.excluded_paths) : s.excluded_paths;
                            if (Array.isArray(ex) && ex.some(u => window.location.pathname.startsWith(u.trim()))) return;
                        } catch (e) { }
                    }
                }

                if (s.quick_actions) {
                    try {
                        const qa = typeof s.quick_actions === 'string' ? JSON.parse(s.quick_actions) : s.quick_actions;
                        if (Array.isArray(qa) && qa.length > 0) State.quickActions = qa;
                    } catch (e) { }
                }

                loadState();
                injectStyles();
                window.__mf_app = renderApp();

                if (State.isOpen) {
                    window.__mf_app.toggle(true);
                } else {
                    document.getElementById('mf-trigger').style.display = 'flex';
                }

                // Auto Open (Faster if isTest)
                if ((s.auto_open == 1 || CONFIG.isTest) && State.messages.length <= 1 && !State.isOpen) {
                    setTimeout(() => window.__mf_app.toggle(true), CONFIG.isTest ? 500 : 2000);
                }
            }
        } catch (e) { console.error('[MF AI] Init failed', e); }
    };

    if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', init);
    else init();

    // --- FEEDBACK LOGIC ---
    // --- FEEDBACK LOGIC ---
    window.mfLike = (msgId) => {
        const msg = State.messages.find(m => m.id === msgId);
        if (!msg) return;

        // TOGGLE STATE
        const isLike = !msg.liked;
        msg.liked = isLike;

        // Update UI
        const btns = document.querySelectorAll(`button[onclick="window.mfLike('${msgId}')"]`);
        btns.forEach(btn => {
            const svg = btn.querySelector('svg');
            if (isLike) {
                // LIKE
                btn.style.color = '#ef4444';
                svg.setAttribute('fill', 'currentColor');
                btn.classList.add('liked');

                // POP EFFECT
                btn.classList.remove('popping');
                void btn.offsetWidth; // trigger reflow
                btn.classList.add('popping');

                // SPARKLE BURST
                const rect = btn.getBoundingClientRect();
                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 2;

                for (let i = 0; i < 8; i++) {
                    const spark = document.createElement('div');
                    spark.className = 'mf-ray';
                    spark.style.left = cx + 'px';
                    spark.style.top = cy + 'px';
                    spark.style.setProperty('--ang', (i * 45) + 'deg');
                    document.body.appendChild(spark);
                    setTimeout(() => spark.remove(), 600);
                }
            } else {
                // UNLIKE
                btn.style.color = '#94a3b8'; // Default grey
                svg.setAttribute('fill', 'none');
                btn.classList.remove('liked');
            }
        });

        // Send API only if we have chunks to boost
        if (msg.chunk_ids && msg.chunk_ids.length > 0) {
            fetch(`https://automation.ideas.edu.vn/mail_api/chat_feedback.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chunk_ids: msg.chunk_ids,
                    action: isLike ? 'like' : 'unlike'
                })
            }).catch(err => console.error("Feedback error", err));
        }
    };

})();
