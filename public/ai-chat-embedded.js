(function () {
    if (window._mfChatLoaded && document.getElementById("mf-root")) return;
    window._mfChatLoaded = true;
    // Standalone Embedded AI Chat Widget
    // A pixel-perfect vanilla JS clone of AIChatWidget.tsx
    // Features: UI/UX matching, Debounced Sending, Link Parsing, Markdown, Animation, Spam rate limiting sync

    // Warm up SpeechSynthesis voices
    if (typeof speechSynthesis !== "undefined") speechSynthesis.getVoices();

    const CONFIG = {
        apiEndpoint:
            window._mf_config && window._mf_config.endpoint
                ? window._mf_config.endpoint.replace("track.php", "ai_chatbot.php")
                : "https://automation.ideas.edu.vn/mail_api/ai_chatbot.php",
        apiUrl:
            window._mf_config && window._mf_config.endpoint
                ? window._mf_config.endpoint
                    .replace("track.php", "")
                    .replace("ai_chatbot.php", "")
                : "https://automation.ideas.edu.vn/mail_api/",
        propertyId: (window._mf_config && window._mf_config.property_id) || null,
        brandColor: (window._mf_config && window._mf_config.brand_color) || "#ffa900",
        botName: (window._mf_config && window._mf_config.bot_name) || "AI Consultant",
        companyName: "MailFlow Pro",
        welcomeMsg: "Chào bạn, chúng tôi có thể giúp gì cho bạn?",
        teaserMsg: "Hỏi AI ngay!",
        position: "bottom-right",
        botAvatar: (window._mf_config && window._mf_config.bot_avatar) || "",
        excludedPages: [],
        excludedPaths: [],
        autoOpen: (window._mf_config && window._mf_config.auto_open) ? true : false,
        isTest:
            (window._mf_config && window._mf_config.is_test) ||
            new URLSearchParams(window.location.search).get("is_test") === "1" ||
            new URLSearchParams(window.location.search).get("mode") === "test" ||
            false,
    };

    if (!CONFIG.propertyId) {
        console.error("[MF AI] Missing property_id. Chatbot disabled.");
        return;
    }

    // --- ICONS (Raw SVGs matching Lucide) ---
    const ICONS = {
        messageCircle: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4m0 0h2m-2 0h-2"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M9 16a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm8 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"/></svg>`,
        x: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>`,
        send: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
        user: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
        bot: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4m0 0h2m-2 0h-2"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M9 16a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm8 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"/></svg>`,
        maximize: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`,
        minimize: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`,
        fullScreen: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>`,
        shield: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6ee7b7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
        sparkles: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`,
        fileText: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>`,
        database: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`,
        arrowRight: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`,
        check: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
        mic: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`,
        micActive: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`,
        volume2: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`,
        volumeX: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`,
        activity: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
        soundwave: `<div class="mf-soundwave"><div class="mf-ai-wave-bar"></div><div class="mf-ai-wave-bar"></div><div class="mf-ai-wave-bar"></div><div class="mf-ai-wave-bar"></div><div class="mf-ai-wave-bar"></div></div>`,
    };

    // --- INTERNAL STATE ---
    const State = {
        isOpen: false,
        userClosed: false,
        isMaximized: false,
        isFullScreen: false,
        isSoundEnabled: (window._mf_config && window._mf_config.is_test) || false,
        isLiveMode: false,
        isSTTActive: false, // For Google Cloud STT mode
        isSpeaking: false,
        hasIOSGreeted: false, // Track if we've primed iOS with "Xin chào"
        hasFirstTouch: false, // Track if user has done the first "Click to Chat"
        iosGreetingActive: false, // Prevent mic from hearing "Xin chào"
        currentUtterance: null, // Prevent garbage collection
        messages: [],
        quickActions: [],
        inputValue: "",
        conversationId: localStorage.getItem("mailflow_chat_conv_id") || null,
        abortController: null, // Added
        ignoreNextSTTResult: false,
        sendBuffer: [],
        sendTimer: null,
        lastResponse: null,
        liveSessionId: 0,
        isRestartingVoice: false, // NEW: Prevent stale onend from clearing UI
        loading: false,
        cooldown: 0,
        ttsSessionId: 0,
        visibleLimit: 10,
        isAutoScrolling: false,
    };

    // Correct text for TTS pronunciation
    const TTS_MAP = [
        // Remove URLs (http/https links)
        [/https?:\/\/[^\s]+/gi, ""],

        [/\bSwiss\b/gi, "quít"],
        [/\bEMBA\b/gi, "i em bi ây"],
        [/\bMBA\b/gi, "em bi ây"],
        [/\bDBA\b/gi, "đi bi ây"],
        [/\bBBA\b/gi, "bi bi ây"],
        [/\bMSc\b/gi, "em ét si"],
        [/\bVN-NARIC\b/gi, "vi en na ric"],
        [/\bSAC\b/gi, "ét ai si"],
        [/\bAI\b/gi, "ây ai"],
        [/\bIDEAS\b/gi, "ai đia"],
        [/\bUMEF\b/gi, "diu mép"],
        [/\bemail\b/gi, "i meo"],
        [/\bgmail\b/gi, "gờ meo"],
        [/\bhotline\b/gi, "hót lai"],
        [/\bsite\b/gi, "sai"],
        [/\bweb\b/gi, "quép"],
        [/anh\s*[\/\\]\s*chị/gi, "anh chị"],
        [/\bpre\s*top\s*up\b/gi, "rì tóp ấp"],
        [/\btop\s*up\b/gi, "tóp ấp"],
        [/\bCHF\b/gi, "frang Thụy Sĩ"],
        [/\bVND\b/gi, "đồng"],
        [/\bUSD\b/gi, "đô la"],
        // Rule: Identify thousand separators (dot or comma followed by exactly 3 digits) and REMOVE them
        // This makes 5.400 -> 5400 so TTS reads it as "năm nghìn bốn trăm"
        [/(\d)[.,](?=\d{3}(?:\D|$))/g, "$1"],
    ];

    const correctTTSText = (text = "") => {
        let out = text;

        // 1. Format dates: DD/MM/YYYY -> "ngày D tháng M năm YYYY"
        out = out.replace(
            /(\d{1,2})\/(\d{1,2})\/(\d{4})/g,
            (match, day, month, year) => {
                // Convert year to Vietnamese pronunciation
                const y = parseInt(year);
                let yearText = "";
                if (y >= 2000 && y < 2100) {
                    const thousands = Math.floor(y / 1000);
                    const hundreds = Math.floor((y % 1000) / 100);
                    const tens = Math.floor((y % 100) / 10);
                    const ones = y % 10;

                    yearText = `${thousands === 2 ? "hai" : thousands} nghìn `;
                    if (hundreds === 0) yearText += "không trăm ";
                    else
                        yearText += `${hundreds === 1
                            ? "một"
                            : hundreds === 2
                                ? "hai"
                                : hundreds === 3
                                    ? "ba"
                                    : hundreds === 4
                                        ? "bốn"
                                        : hundreds === 5
                                            ? "năm"
                                            : hundreds === 6
                                                ? "sáu"
                                                : hundreds === 7
                                                    ? "bảy"
                                                    : hundreds === 8
                                                        ? "tám"
                                                        : "chín"
                            } trăm `;

                    if (tens === 0 && ones === 0) {
                        // Nothing to add
                    } else if (tens === 0) {
                        yearText += `lẻ ${ones === 1
                            ? "một"
                            : ones === 2
                                ? "hai"
                                : ones === 3
                                    ? "ba"
                                    : ones === 4
                                        ? "bốn"
                                        : ones === 5
                                            ? "năm"
                                            : ones === 6
                                                ? "sáu"
                                                : ones === 7
                                                    ? "bảy"
                                                    : ones === 8
                                                        ? "tám"
                                                        : "chín"
                            }`;
                    } else if (tens === 1) {
                        yearText += `mươi ${ones === 0
                            ? ""
                            : ones === 1
                                ? "một"
                                : ones === 5
                                    ? "lăm"
                                    : ones === 2
                                        ? "hai"
                                        : ones === 3
                                            ? "ba"
                                            : ones === 4
                                                ? "bốn"
                                                : ones === 6
                                                    ? "sáu"
                                                    : ones === 7
                                                        ? "bảy"
                                                        : ones === 8
                                                            ? "tám"
                                                            : "chín"
                            }`;
                    } else {
                        const tensWord =
                            tens === 2
                                ? "hai"
                                : tens === 3
                                    ? "ba"
                                    : tens === 4
                                        ? "bốn"
                                        : tens === 5
                                            ? "năm"
                                            : tens === 6
                                                ? "sáu"
                                                : tens === 7
                                                    ? "bảy"
                                                    : tens === 8
                                                        ? "tám"
                                                        : "chín";
                        yearText += `${tensWord} mươi ${ones === 0
                            ? ""
                            : ones === 1
                                ? "mốt"
                                : ones === 5
                                    ? "lăm"
                                    : ones === 2
                                        ? "hai"
                                        : ones === 3
                                            ? "ba"
                                            : ones === 4
                                                ? "bốn"
                                                : ones === 6
                                                    ? "sáu"
                                                    : ones === 7
                                                        ? "bảy"
                                                        : ones === 8
                                                            ? "tám"
                                                            : "chín"
                            }`;
                    }
                } else {
                    yearText = year; // Fallback for other years
                }

                return `ngày ${day} tháng ${month} năm ${yearText.trim()}`;
            },
        );

        // 2. Remove thousand separators (dot or comma followed by 3 digits)
        out = out.replace(/(\d)[.,](?=\d{3}(?:\D|$))/g, "$1");

        // 2. Handle round numbers (Millions/Thousands) for smoother flow
        out = out.replace(/\b(\d+)000000\b/g, "$1 triệu");
        out = out.replace(/\b(\d+)000\b/g, "$1 nghìn");

        // 3. Apply standard replacements
        for (const [regex, replacement] of TTS_MAP) {
            out = out.replace(regex, replacement);
        }

        // 4. Handle remaining decimals
        out = out.replace(/(\d+)[.,](\d+)/g, "$1 phẩy $2");

        // 5. Restore specific formats
        out = out.replace(
            /(\d+) phẩy (\d+) \/ (\d+) phẩy (\d+)/g,
            "$1 chấm $2 trên $3 chấm $4",
        );
        out = out.replace(/(\d+)\/(\d+)/g, "$1 trên $2");

        return out
            .replace(/[()]/g, " ")
            .replace(/[*_\-\[\]{}]/g, " ")
            .replace(/\s+/g, " ")
            .replace(/[\s.)/,\-\[\]{}!?;:]+$/, ".")
            .trim();
    };

    // --- TTS HELPER ---
    const isIOS = () => {
        return (
            /iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.userAgent.includes("Mac") && navigator.maxTouchPoints > 1)
        );
    };

    const isAndroid = () => {
        return /Android/i.test(navigator.userAgent);
    };

    // --- GLOBAL AUDIO SINGLETON FOR iOS ---
    // --- WEB AUDIO API UNLOCK (More Robust than HTML5 Audio) ---
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    let audioCtx = null;
    const iosAudio = new Audio(); // Still used for Google TTS playback later
    iosAudio.preload = "auto";

    // Preload speech activation audio for iOS
    const speechActivationAudio = new Audio(
        "https://ideas.edu.vn/wp-content/uploads/2026/01/speech.wav",
    );
    speechActivationAudio.preload = "auto";
    speechActivationAudio.volume = 0.5;

    let audioUnlocked = false;

    // --- SHARED AUDIO PLAYBACK ENGINE STATE ---
    let streamSegments = []; // { text, audioBuffer, status: 'pending' | 'fetching' | 'ready' | 'error' }
    let streamPlaybackIndex = 0;
    let isStreamPlaying = false;
    let nextAt = 0; // High-precision timing for Web Audio scheduling
    let lastGreetTime = 0;
    const unlockIOSAudio = (forceSound = false) => {
        if (audioUnlocked && !forceSound) return;

        // 1. Initialize Context if needed
        if (!audioCtx && AudioContext) {
            audioCtx = new AudioContext();
        }

        if (audioCtx) {
            // 2. Resume if suspended (common on iOS)
            if (audioCtx.state === "suspended") {
                audioCtx.resume();
            }

            // 3. Play a silent buffer (The reliable way)
            const buffer = audioCtx.createBuffer(1, 1, 22050);
            const source = audioCtx.createBufferSource();
            source.buffer = buffer;
            source.connect(audioCtx.destination);
            source.start(0);

            audioUnlocked = true;
        }

        // 4. Prime with speech activation sound (iOS unlock + user feedback)
        // Play only ONCE per session to avoid being repetitive
        // 4. Prime with speech activation sound REMOVED (User Request: "No greeting")
        // We rely on the silent buffer above for technical unlocking.
        if (isIOS() && !State.hasIOSGreeted) {
            State.hasIOSGreeted = true;
            // speechActivationAudio.play(); // DISABLED
            console.log("[MF AI] iOS Audio unlock (silent)");
        }
        if (!isIOS()) console.log("[MF AI] Audio unlocked (non-iOS)");
    };

    ["click", "touchstart", "keydown"].forEach((evt) =>
        document.addEventListener(evt, () => unlockIOSAudio(false), {
            once: true,
            capture: true,
        }),
    );

    let cachedVoices = [];
    const warmVoices = () => {
        if (typeof speechSynthesis === "undefined") return;
        cachedVoices = speechSynthesis.getVoices();
    };
    if (typeof speechSynthesis !== "undefined") {
        speechSynthesis.onvoiceschanged = warmVoices;
        warmVoices();
    }

    // --- CENTRALIZED CSS INJECTION (Run once at init) ---
    const injectGlobalCSS = () => {
        // Soundwave CSS
        if (!document.getElementById("mf-user-wave-css")) {
            const waveStyle = document.createElement("style");
            waveStyle.id = "mf-user-wave-css";
            waveStyle.textContent = `
                .mf-user-wave-bar { 
                    width: 4px; 
                    height: 100%; 
                    background: white; 
                    border-radius: 99px !important; 
                    transition: transform 0.15s ease-in-out; 
                    transform-origin: center; 
                    will-change: transform;
                    animation: none !important;
                }
            `;
            document.head.appendChild(waveStyle);
        }

        // Quick Action Animation CSS
        if (!document.getElementById("mf-qa-anim-css")) {
            const qaStyle = document.createElement("style");
            qaStyle.id = "mf-qa-anim-css";
            qaStyle.textContent = `
                @keyframes qaSlideUp { 
                    from { opacity: 0; transform: translateY(15px); } 
                    to { opacity: 1; transform: translateY(0); } 
                }
            `;
            document.head.appendChild(qaStyle);
        }
    };
    // Inject CSS immediately
    injectGlobalCSS();

    const pickBestVoice = (voices) => {
        if (!voices || voices.length === 0) return null;
        // Priority 1: Local + Exact Vietnamese
        let v = voices.find(
            (v) => (v.lang === "vi-VN" || v.lang === "vi_VN") && v.localService,
        );
        // Priority 2: Any Exact Vietnamese
        if (!v) v = voices.find((v) => v.lang === "vi-VN" || v.lang === "vi_VN");
        // Priority 3: Local + Starts with 'vi'
        if (!v) v = voices.find((v) => v.lang.startsWith("vi") && v.localService);
        // Priority 4: Any 'vi'
        if (!v) v = voices.find((v) => v.lang.startsWith("vi"));
        return v;
    };

    const estimateSpeechDuration = (text, rate = 1.1) => {
        const words = text.trim().split(/\s+/).length;
        // Vietnamese words are often shorter/syllabic, but pronunciation takes time.
        // Despina is slightly slower than default.
        const wpm = 130 * rate;
        return Math.max(2.5, (words / wpm) * 60) + 1.2; // Add a generous buffer (1.2s)
    };

    const doGeminiTTS = (text, onEnd, onPlay) => {
        stopAllVoices();
        const currentSession = State.ttsSessionId;
        console.log("[MF AI] doGeminiTTS entry text:", text, "session:", currentSession);

        // Stop current to reuse the stream engine
        State.isSpeaking = true;

        const corrected = correctTTSText(text);
        const allSentences = corrected
            .split(/([.!?。！？\n]+(?![0-9]))/g)
            .reduce((acc, part, i) => {
                if (i % 2 === 0) acc.push(part);
                else if (acc.length > 0) acc[acc.length - 1] += part;
                return acc;
            }, [])
            .map((s) => s.trim())
            .filter((s) => s.length >= 1);

        if (allSentences.length === 0) {
            State.isSpeaking = false;
            onEnd?.();
            return;
        }

        // Legacy chunks grouping - simplified
        const chunks = [allSentences.shift()];
        if (allSentences.length > 0) chunks.push(allSentences.join(" "));

        // RESET ENGINE FOR NEW SPEECH
        streamSegments = [];
        streamPlaybackIndex = 0;
        isStreamPlaying = false;
        nextAt = 0;

        chunks.forEach((t) => {
            const segment = {
                text: t,
                displayText: t,
                audioBuffer: null,
                status: "pending",
                sessionId: currentSession,
            };
            streamSegments.push(segment);
            fetchStreamSegment(segment);
        });

        // Trigger onPlay for the first chunk
        if (onPlay) onPlay(text);

        const checkStandardFinished = setInterval(() => {
            if (currentSession !== State.ttsSessionId) {
                clearInterval(checkStandardFinished);
                return;
            }
            if (streamPlaybackIndex >= streamSegments.length && !isStreamPlaying) {
                clearInterval(checkStandardFinished);
                State.isSpeaking = false;
                onEnd?.();
            }
        }, 100);

        processStreamPlayback();
    };

    // Helper: Convert [ACTIONS: ...] to natural speech
    const convertActionsToSpeech = (text) => {
        const actionsMatch = text.match(
            /\[(?:ACTIONS|ACTION|BUTTONS|BUTTON|OPTIONS):?\s*(.*?)\]/i,
        );
        if (!actionsMatch || !actionsMatch[1]) {
            return text.replace(
                /\[(?:ACTIONS|ACTION|BUTTONS|BUTTON|OPTIONS):?.*?\]/gi,
                "",
            );
        }

        const actions = actionsMatch[1]
            .split(/[|,]/)
            .map((a) => a.trim())
            .filter((a) => a);

        if (actions.length === 0) {
            return text.replace(
                /\[(?:ACTIONS|ACTION|BUTTONS|BUTTON|OPTIONS):?.*?\]/gi,
                "",
            );
        }

        let actionsList = "";
        if (actions.length === 1) {
            actionsList = actions[0];
        } else if (actions.length === 2) {
            actionsList = actions.join(" hoặc ");
        } else {
            actionsList =
                actions.slice(0, -1).join(", ") +
                ", hoặc " +
                actions[actions.length - 1];
        }

        const actionPrompt = `Anh chị có muốn ${actionsList} không ạ?`;
        return text.replace(
            /\[(?:ACTIONS|ACTION|BUTTONS|BUTTON|OPTIONS):?.*?\]/gi,
            actionPrompt,
        );
    };

    const speakText = (text, onEnd, onPlay) => {
        unlockIOSAudio();
        const isiOS = isIOS();

        if ((!isiOS && !State.isSoundEnabled && !State.isLiveMode) || !text) {
            onEnd?.();
            return;
        }

        let speakable = text;

        // Convert [ACTIONS: ...] to natural speech
        speakable = convertActionsToSpeech(speakable);

        // Remove other special tags
        speakable = speakable
            .replace(/\[\s*SHOW[_ ]LEAD[_ ]FORM\s*\]/gi, "")
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
            .replace(/\[.*?\]/g, "")
            .replace(/[*#_~`]/g, "")
            .replace(/^[ \t]*[-*+]\s+/gm, "")
            .replace(/(https?:\/\/[^\s]+)/g, "")
            .replace(/\s+/g, " ")
            .trim();

        if (!speakable) {
            onEnd?.();
            return;
        }

        doGeminiTTS(speakable, onEnd, onPlay);
    };

    // --- GOOGLE CLOUD STT (PROFESSIONAL MODE) ---
    let mediaRecorder = null;
    let audioChunks = [];
    let audioContext = null;
    let analyser = null;
    let microphone = null;
    let silenceTimeout = null;
    let isProcessingSTT = false;
    let isListening = false;
    let gotResult = false;
    let isShowingInterim = false;
    let hasDetectedSound = false; // NEW: Volume-based fallback
    let mediaRecorderInitialized = false; // Track if we've set up recording
    let hasSentCurrentSession = false; // Prevent duplicate sends
    let webSpeechTimeout = null; // Fallback timeout for Android before MediaRecorder starts
    let lastInterimText = ""; // Track last valid transcript for fallback
    let silenceLoopActive = false; // Control flag for silence detection loop
    let androidSpeechHitCount = 0; // Track Web Speech result frequency
    let silenceFrameCount = 0;
    let soundFrameCount = 0; // Track sustained sound

    // --- HYBRID STT: Web Speech (interim) + Google Cloud (final) ---
    let webSpeechRecognition = null;
    let voiceStartTime = null; // Track when voice session started
    let pollInterval = null; // Declare polling interval variable globally within closure

    // Helper for debug logging with timestamp
    const logVoice = (msg, ...args) => {
        const elapsed = voiceStartTime
            ? ((Date.now() - voiceStartTime) / 1000).toFixed(2) + "s"
            : "0s";
        // console.log(`[MF VOICE +${elapsed}] ${msg}`, ...args);
    };

    const checkSilence = () => {
        if (!isListening || !silenceLoopActive) {
            console.log("[MF AI] Silence detector stopped (not listening)");
            return;
        }
        if (!analyser) {
            console.warn("[MF AI] Analyser not ready, retrying...");
            setTimeout(checkSilence, 100);
            return;
        }
        const bufferLength = analyser.frequencyBinCount;
        const timeData = new Uint8Array(bufferLength);
        const freqData = new Uint8Array(bufferLength);
        analyser.getByteTimeDomainData(timeData);
        analyser.getByteFrequencyData(freqData);

        // 1. Calculate RMS from Time Data (for Silence Detection)
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
            const x = (timeData[i] - 128) / 128;
            sum += x * x;
        }
        const rms = Math.sqrt(sum / bufferLength);

        // LOGGING (Throttled ~0.5s)
        silenceFrameCount = (silenceFrameCount || 0) + 1;
        if (silenceFrameCount % 30 === 0) {
            // Log RMS and a few freq bins (Bass, Mids, Highs)
            const bass = freqData[2];
            const mids = freqData[20];
            const highs = freqData[100];
            console.log(
                `[MF VOICE DEBUG] RMS: ${rms.toFixed(
                    4,
                )} | Freq [Low:${bass} Mid:${mids} High:${highs}] | SoundFrames: ${soundFrameCount}`,
            );
        }

        // 2. Update UI Text & Visualizer on Sound Detection
        // SUSTAINED SOUND CHECK: Require 2 consecutive frames above 0.012 to avoid false triggers
        if (rms > 0.012) {
            soundFrameCount++;
            if (soundFrameCount === 1) {
                console.log(
                    `[MF SOUNDWAVE] 🎵 Sound detected! RMS: ${rms.toFixed(
                        4,
                    )} (threshold: 0.012)`,
                );
            }
        } else if (rms < 0.005) {
            // Only reset if truly silent (lowered from 0.008 to prevent premature resets)
            if (soundFrameCount > 0) {
                console.log(
                    `[MF SOUNDWAVE] 🔇 Silence detected, resetting counter from ${soundFrameCount}`,
                );
            }
            soundFrameCount = 0;
        }

        if (soundFrameCount >= 2 && !hasDetectedSound) {
            console.log(
                `[MF SOUNDWAVE] ✅ ACTIVATING! SoundFrames: ${soundFrameCount}, RMS: ${rms.toFixed(
                    4,
                )}`,
            );
            hasDetectedSound = true;

            // Hide Quick Actions when user starts speaking
            State.quickActions = [];
            syncQuick();

            const wrapper = document.getElementById("mf-lyric-wrapper");
            console.log(`[MF SOUNDWAVE] Wrapper found:`, !!wrapper);
            if (wrapper) {
                // CSS is now centrally injected at init, no need to inject here

                // Check if wave container exists. If NOT, or if the wrapper contains old lyrics (not our container), clear and re-inject.
                let waveContainer = wrapper.querySelector(".mf-wave-container");
                const hasOldLyrics =
                    !waveContainer && wrapper.innerText.trim().length > 0;

                if (!waveContainer || hasOldLyrics) {
                    console.log(
                        `[MF SOUNDWAVE] ⚠️ Wave container missing or old lyrics present. Clearing and injecting UI...`,
                    );
                    // FORCE CLEAR WRAPPER
                    wrapper.innerHTML = `
                     <div style="display:flex; flex-direction:column; align-items:center; gap:12px;">
                         <div class="mf-wave-container" style="display:flex; align-items:center; justify-content:center; gap:4px; height:40px; opacity: 0; transition: opacity 0.3s ease-out;">
                             ${Array.from({ length: 12 })
                            .map(
                                () =>
                                    `<div class="mf-user-wave-bar" style="transform: scaleY(0.2);"></div>`,
                            )
                            .join("")}
                         </div>
                         <div class="mf-lyric-line active" style="font-size:14px; opacity:0.9; font-weight:500;">Đang nhận diện âm thanh...</div>
                     </div>`;
                    waveContainer = wrapper.querySelector(".mf-wave-container");
                    console.log(
                        `[MF SOUNDWAVE] UI re-injected, container now:`,
                        !!waveContainer,
                    );
                }

                // const textEl = wrapper.querySelector('.mf-lyric-line');
                // if (textEl) {
                //     textEl.innerText = "Đang nhận diện âm thanh...";
                //     console.log(`[MF SOUNDWAVE] 📝 Text updated to "Đang nhận diện âm thanh..."`);
                // }

                // FADE IN SOUNDWAVE
                if (waveContainer) {
                    waveContainer.style.opacity = "1";
                    console.log(`[MF SOUNDWAVE] 🌊 Wave container opacity set to 1`);
                } else {
                    console.warn(
                        `[MF SOUNDWAVE] ⚠️ Wave container STILL not found after re-inject!`,
                    );
                }
            }
        }

        // 3. Update Visualizer Bars (Frequency Domain)
        const bars = document.querySelectorAll(".mf-user-wave-bar");
        if (bars.length) {
            // SILENCE CLAMP: If quiet, force bars to idle
            if (rms < 0.01) {
                bars.forEach((bar) => (bar.style.transform = "scaleY(0.2)"));
            } else {
                // MOUNTAIN SHAPE: Create symmetric pattern (low → high → low)
                // Center bars sample MORE frequencies → higher average amplitude
                // Edge bars sample FEWER frequencies → lower average amplitude
                bars.forEach((bar, idx) => {
                    // Calculate distance from center (0 at center, higher at edges)
                    const center = (bars.length - 1) / 2;
                    const distanceFromCenter = Math.abs(idx - center);

                    // Number of frequencies to sample (more at center, less at edges)
                    const maxSamples = 8;
                    const sampleCount = Math.max(
                        1,
                        Math.floor(maxSamples - distanceFromCenter),
                    );

                    // Sample multiple frequencies and get average
                    let sum = 0;
                    const baseIdx = 2 + idx * 4; // Start position in freq array
                    for (let i = 0; i < sampleCount; i++) {
                        const freqIdx = baseIdx + i;
                        if (freqIdx < freqData.length) {
                            sum += freqData[freqIdx];
                        }
                    }
                    const avgFreqVal = sum / sampleCount;

                    // BALANCED HEIGHT: Moderate multiplier for good visibility
                    const scale = 0.2 + (avgFreqVal / 255) * 3.0;
                    bar.style.transform = `scaleY(${Math.max(
                        0.2,
                        Math.min(1.5, scale),
                    )})`;
                });
            }
        }

        if (rms < 0.015) {
            // Silence threshold - increased to ignore background noise/breathing
            // Trigger stop if we have detected sound via volume OR via interim text
            if (!silenceTimeout && (isShowingInterim || hasDetectedSound)) {
                console.log(
                    `⏱️ [TIMING] User stopped speaking. Starting 500ms silence countdown...`,
                );
                // Standard silence logic for all devices (Android handles conflict by checking lastInterimText on server fail)
                silenceTimeout = setTimeout(() => {
                    console.log(
                        `✅ [TIMING] Silence timeout complete (300ms). Sending message now...`,
                    );
                    logVoice("🔇 RMS Silence timeout (0.3s) - stopping");
                    stopGoogleSTT();
                }, 300);
            }
        } else {
            if (rms > 0.05) {
                // Sound detected threshold
                hasDetectedSound = true; // Use volume to confirm user started talking

                // ANDROID FALLBACK: If we detect sound but no interim text is showing, show recording indicator
                // ANDROID FALLBACK: If we detect sound but no interim text is showing, show recording indicator with Soundwave
                if (!isShowingInterim && State.isLiveMode) {
                    const wrapper = document.getElementById("mf-lyric-wrapper");
                    // Only update if it's currently showing the default "Listening" state or empty
                    if (
                        wrapper &&
                        (wrapper.innerHTML.includes("Đang lắng nghe") ||
                            wrapper.innerText.trim() === "")
                    ) {
                        wrapper.innerHTML = `
                        <div style="display:flex; flex-direction:column; align-items:center; gap:12px;">
                            <div class="mf-wave-container" style="display:flex; align-items:center; justify-content:center; gap:4px; height:40px;">
                                ${Array.from({ length: 12 })
                                .map(
                                    () =>
                                        `<div class="mf-user-wave-bar" style="width:4px; height:100%; background:white; border-radius:99px; transform:scaleY(0.2);"></div>`,
                                )
                                .join("")}
                            </div>
                            <div class="mf-lyric-line active" style="font-size:14px; opacity:0.9; font-weight:500;">Đang nhận diện âm thanh...</div>
                        </div>`;
                    }
                }
            }
            if (silenceTimeout) {
                clearTimeout(silenceTimeout);
                silenceTimeout = null;
            }
        }
        requestAnimationFrame(checkSilence);
    };

    const initAudioAnalysis = (stream) => {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            microphone = audioContext.createMediaStreamSource(stream);
            microphone.connect(analyser);
            analyser.fftSize = 512;

            silenceLoopActive = true;
            checkSilence();
            logVoice("📊 Audio analysis initialized (Visualizer + Silence Detection)");
        } catch (e) {
            console.error("[MF AI] Error initializing audio analysis:", e);
        }
    };

    // Initialize MediaRecorder for Google STT (called after Web Speech on Android, immediately on Desktop)
    const initMediaRecorder = async () => {
        // iOS CHECK: MediaRecorder works on iOS 15.4+/iPadOS but may be unstable on older versions.
        // Strategy: Try MediaRecorder first, fallback to Web Speech if it fails.
        if (isIOS()) {
            logVoice(
                "🍎 iOS detected – attempting MediaRecorder (iOS 15.4+/iPadOS support)",
            );
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                });
                logVoice("✅ iOS Mic permission granted!");

                // Test if MediaRecorder is supported
                if (!window.MediaRecorder) {
                    logVoice(
                        "⚠️ MediaRecorder not supported on this iOS version, using Web Speech only",
                    );
                    stream.getTracks().forEach((track) => track.stop());
                    return;
                }

                // Continue with MediaRecorder setup (will use it for better quality)
                logVoice("✅ MediaRecorder supported, proceeding with audio recording");
                // Don't return here - let it continue to normal MediaRecorder setup below
            } catch (e) {
                logVoice("❌ iOS Mic permission denied or MediaRecorder failed:", e);
                return;
            }
        }

        if (!isListening) {
            logVoice("Not listening anymore, skipping MediaRecorder init");
            return;
        }
        if (mediaRecorderInitialized) {
            logVoice("MediaRecorder already initialized, skipping");
            return;
        }
        mediaRecorderInitialized = true;
        logVoice("🎙️ Initializing MediaRecorder...");
        // ANDROID STRATEGY ADJUSTMENT:
        // We DO NOT stop Web Speech here.
        // Reason: Stopping it forces 'isFinal' immediately (cutting user off after 2 words).
        // If we let them run together:
        // 1. If MediaRecorder works -> Good Audio -> Google STT.
        // 2. If MediaRecorder gets silence (conflict) -> Google STT Empty -> Fallback to Web Speech (Full Sentence).
        // This is safer than killing the session early.
        /* 
            if (webSpeechRecognition) {
                try { 
                    logVoice("🛑 Stopping Web Speech to free Mic for MediaRecorder");
                    webSpeechRecognition.stop(); 
                } catch(e){}
                webSpeechRecognition = null; 
            } 
            */

        try {
            logVoice("📡 Requesting getUserMedia...");
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            logVoice("✅ Microphone access granted!");
            // alert("1. Mic OK (getUserMedia)");

            const micBtn = document.getElementById("mf-mic");
            if (micBtn) micBtn.classList.add("listening");

            // Audio Context for Silence Detection & Visualizer
            initAudioAnalysis(stream);

            audioChunks = [];

            // Resilient MediaRecorder MimeType
            let mimeType = "audio/webm;codecs=opus";
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = "audio/webm";
                if (!MediaRecorder.isTypeSupported(mimeType)) {
                    mimeType = "audio/ogg;codecs=opus";
                    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = "";
                }
            }

            mediaRecorder = new MediaRecorder(
                stream,
                mimeType
                    ? {
                        mimeType,
                        audioBitsPerSecond: 24000, // OPTIMIZED: 24kbps for voice (reduces file size ~70%)
                    }
                    : {},
            );

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunks.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                if (!audioChunks.length) return;
                const audioBlob = new Blob(audioChunks, {
                    type: mimeType || "audio/wav",
                });
                logVoice(`📦 Audio Blob size: ${audioBlob.size} bytes`);

                // CRITICAL CHECK: If audio is too small (< 1.2KB), it's likely empty/noise.
                // Do NOT send to Google STT. Fallback to Web Speech text.
                if (audioBlob.size < 1200) {
                    logVoice("⚠️ Audio too small – skipping Google STT");
                    if (lastInterimText && lastInterimText.trim().length > 1) {
                        const fallbackText = correctVoiceText(lastInterimText);
                        logVoice(`fallbackText: ${fallbackText}`);
                        showFindingInfoUI(fallbackText);
                        handleSend(fallbackText);
                    } else {
                        // Real failure
                        if (State.isLiveMode) {
                            const wrapper = document.getElementById("mf-lyric-wrapper");
                            if (wrapper)
                                wrapper.innerHTML = `<div class="mf-lyric-line active">Em chưa nghe rõ, anh chị nói lại nhé.</div>`;
                            setTimeout(() => {
                                if (State.isLiveMode && !isListening) startGoogleSTT();
                            }, 2000);
                        }
                    }
                    return;
                }

                processGoogleSTT(audioBlob);
            };

            mediaRecorder.start();
        } catch (err) {
            if (err.name === "AbortError") {
                console.log("[MF AI] Fetch aborted as expected.");
                return;
            }
            console.error("[MF AI STT] MediaRecorder init error:", err);
        }
    };

    const startGoogleSTT = async () => {
        // RESET IGNORE FLAG FOR NEW SESSION
        State.ignoreNextSTTResult = false;

        voiceStartTime = Date.now();
        logVoice("🎤 ========== VOICE SESSION START ==========");
        console.log(
            "[MF AI STT] startGoogleSTT called. isListening:",
            isListening,
            "isProcessingSTT:",
            isProcessingSTT,
        );
        if (isListening || isProcessingSTT) return;
        console.log("[MF AI STT] Requesting microphone access...");
        try {
            // UI Update Early
            // UI Update Early
            isListening = true;
            gotResult = false;
            isShowingInterim = false;
            hasDetectedSound = false;
            hasSentCurrentSession = false;

            // RESET CRITICAL STATE
            mediaRecorderInitialized = false;
            lastInterimText = "";
            androidSpeechHitCount = 0;
            soundFrameCount = 0; // Reset sound detection
            if (webSpeechTimeout) {
                clearTimeout(webSpeechTimeout);
                webSpeechTimeout = null;
            }

            logVoice(
                "Device check: " +
                (isAndroid() ? "Android" : isIOS() ? "iOS" : "Desktop"),
            );

            if (State.isLiveMode) {
                const wrapper = document.getElementById("mf-lyric-wrapper");
                if (wrapper) {
                    // Inject CSS to head ONCE (if not already there)
                    if (!document.getElementById("mf-user-wave-css")) {
                        const style = document.createElement("style");
                        style.id = "mf-user-wave-css";
                        style.textContent = `
                            .mf-user-wave-bar { 
                                width: 4px; 
                                height: 100%; 
                                background: white; 
                                border-radius: 99px !important; 
                                transition: transform 0.2s ease-in-out; 
                                transform-origin: center; 
                                will-change: transform;
                                animation: none !important;
                            }
                        `;
                        document.head.appendChild(style);
                    }

                    // SOUNDWAVE VISUALIZER UI (12 Bars) - WITHOUT inline style
                    wrapper.innerHTML = `
                    <div style="display:flex; flex-direction:column; align-items:center; gap:12px;">
                        <div class="mf-wave-container" style="display:flex; align-items:center; justify-content:center; gap:4px; height:40px; opacity: 0; transition: opacity 0.3s ease-out;">
                            ${Array.from({ length: 12 })
                            .map(
                                () =>
                                    `<div class="mf-user-wave-bar" style="transform: scaleY(0.2);"></div>`,
                            )
                            .join("")}
                        </div>
                        <div class="mf-lyric-line active" style="font-size:14px; opacity:0.9; font-weight:500;">Đang lắng nghe...</div>
                    </div>`;
                    wrapper.style.transform = "translateY(60px)";
                    wrapper.style.opacity = "1";
                }
            } else {
                const statusEl = document.getElementById("mf-voice-status");
                if (statusEl) statusEl.innerText = "Đang lắng nghe...";
                const overlay = document.getElementById("mf-voice-overlay");
                if (overlay) overlay.classList.add("active");
            }

            // On Desktop AND Android, start MediaRecorder immediately (Pure Google STT Mode)
            // iOS still falls back to Web Speech (Hidden Mode)
            if (isIOS()) {
                // IMPORTANT: iOS still needs Analyser for Visualizer (Soundwave)
                const stream =
                    window._micStream ||
                    (await navigator.mediaDevices.getUserMedia({ audio: true }));
                initAudioAnalysis(stream);
                startWebSpeechInterim();
            } else {
                initMediaRecorder();
            }
        } catch (err) {
            if (err.name === "AbortError") {
                console.log("[MF AI] Fetch aborted as expected.");
                return;
            }
            console.error("[MF AI STT] Error:", err);
            isListening = false;

            // Show error to user
            if (State.isLiveMode) {
                const wrapper = document.getElementById("mf-lyric-wrapper");
                if (wrapper) {
                    let errorMsg = "Lỗi không xác định";
                    if (
                        err.name === "NotAllowedError" ||
                        err.name === "PermissionDeniedError"
                    ) {
                        errorMsg = "Vui lòng cấp quyền microphone";
                    } else if (err.name === "NotFoundError") {
                        errorMsg = "Không tìm thấy microphone";
                    } else if (err.name === "NotReadableError") {
                        errorMsg = "Microphone đang được sử dụng";
                    }
                    wrapper.innerHTML = `
                        <div class="mf-text-pulse" style="display:flex; flex-direction:column; align-items:center; gap:15px; cursor: pointer;" onclick="window.location.reload();">
                            <div style="font-size: 22px; font-weight: 900; letter-spacing: 2px; color: #ff5252; text-shadow: 0 0 20px rgba(255,82,82,0.4);">${errorMsg.toUpperCase()}</div>
                            <div style="background: #ef4444; color: white; padding: 12px 30px; border-radius: 99px; font-weight: 700; font-size: 14px; box-shadow: 0 10px 20px rgba(0,0,0,0.3); transition: all 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                                ẤN ĐỂ THỬ LẠI
                            </div>
                            <div style="font-size: 11px; opacity: 0.6; color: white; font-style: italic;">(Trang sẽ tải lại và hỏi quyền mic)</div>
                        </div>
                    `;
                    const orb = document.querySelector(".mf-live-orb");
                    if (orb) {
                        orb.classList.remove("loading", "speaking", "listening");
                        orb.classList.add("error");
                        orb.style.cursor = "pointer";
                        orb.onclick = () => window.location.reload();
                    }
                }
            }
            stopAllVoices();
        }
    };

    // Web Speech API for interim results (real-time display)
    const startWebSpeechInterim = () => {
        const SpeechRecognition =
            window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn("[MF AI] Web Speech not supported, showing fallback UI");
            // Fallback: Show static listening text
            if (State.isLiveMode) {
                const wrapper = document.getElementById("mf-lyric-wrapper");
                if (wrapper) {
                    // SOUNDWAVE VISUALIZER UI
                    wrapper.innerHTML = `
                    <div style="display:flex; flex-direction:column; align-items:center; gap:8px;">
                        <div class="mf-wave-container" style="display:flex; align-items:center; justify-content:center; gap:4px; height:30px;">
                            <style>
                                .mf-wave-bar { width: 4px; height: 100%; background: white; border-radius: 2px; transition: transform 0.05s ease; animation: waveIdle 1s infinite; transform-origin: bottom; }
                                @keyframes waveIdle { 0%,100%{transform:scaleY(0.2);} 50%{transform:scaleY(0.4);} }
                            </style>
                            <div class="mf-wave-bar" style="animation-delay:0s"></div>
                            <div class="mf-wave-bar" style="animation-delay:0.1s"></div>
                            <div class="mf-wave-bar" style="animation-delay:0.2s"></div>
                            <div class="mf-wave-bar" style="animation-delay:0.1s"></div>
                            <div class="mf-wave-bar" style="animation-delay:0s"></div>
                        </div>
                        <div class="mf-lyric-line active" style="font-size:14px; opacity:0.9;">Đang nhận diện âm thanh...</div>
                    </div>`;
                }
            }
            return;
        }

        webSpeechRecognition = new SpeechRecognition();
        webSpeechRecognition.continuous = true;
        webSpeechRecognition.interimResults = true;
        webSpeechRecognition.lang = "vi-VN";

        webSpeechRecognition.onstart = () => {
            // alert("DEBUG: Web Speech STARTED!"); // Removed
            console.log("[MF AI] 🚀 VERSION: ULTRA FAST 0.5s LOADED");
            logVoice("🎯 Web Speech Engine STARTED");

            // ANDROID: Do NOT init MediaRecorder here. Wait for onresult.
            // This ensures Web Speech has exclusive mic access until the user actually speaks.
            // if (isAndroid() && !mediaRecorderInitialized && isListening) { ... }

            // Show initial listening UI if no interim results yet
            if (State.isLiveMode && !isShowingInterim) {
                const wrapper = document.getElementById("mf-lyric-wrapper");
                if (wrapper) {
                    wrapper.innerHTML = `<div class="mf-lyric-line active">Đang lắng nghe...</div>`;
                    wrapper.style.transform = "translateY(60px)";
                    wrapper.style.opacity = "1";
                }
            }
        };

        webSpeechRecognition.onresult = (event) => {
            // Build the full transcript from all results
            // We need to concatenate all segments to get the complete sentence
            let fullTranscript = "";
            let hasFinalResult = false;

            for (let i = 0; i < event.results.length; i++) {
                const txt = event.results[i][0].transcript.trim();
                // ANDROID DEDUP: Skip if identical to previous segment
                if (i > 0 && txt === event.results[i - 1][0].transcript.trim()) {
                    continue;
                }
                fullTranscript += txt + " ";
                if (event.results[i].isFinal) {
                    hasFinalResult = true;
                }
            }

            // CRITICAL FIX: Save for Fallback & flag UI
            lastInterimText = fullTranscript.trim();
            if (lastInterimText.length > 0) isShowingInterim = true;

            // Increment Hit Count
            androidSpeechHitCount++;

            // iOS HANDLING: If Final, Send immediately (no MediaRecorder)
            if (isIOS() && hasFinalResult && fullTranscript.trim()) {
                logVoice("🍎 iOS Final Result - sending text directly");
                const iosText = correctVoiceText(fullTranscript.trim());
                showFindingInfoUI(iosText);
                handleSend(iosText);
                stopGoogleSTT();
                return;
            }

            // ANDROID FIX: Init MediaRecorder ONLY after sustained speech (Hit >= 2)
            // This prevents mic stealing on the very first syllable.
            if (
                isAndroid() &&
                !mediaRecorderInitialized &&
                isListening &&
                androidSpeechHitCount >= 2
            ) {
                logVoice(
                    "📱 Android: Speech sustained (2 hits), starting MediaRecorder in 300ms...",
                );
                setTimeout(() => initMediaRecorder(), 300);
            }

            // If we got a FINAL result, send immediately (user finished speaking)
            if (
                hasFinalResult &&
                fullTranscript.trim() &&
                isListening &&
                !hasSentCurrentSession
            ) {
                logVoice("✨ FINAL result detected - sending immediately");
                hasSentCurrentSession = true;

                // CRITICAL: Clear timeout to prevent race condition
                if (webSpeechTimeout) {
                    clearTimeout(webSpeechTimeout);
                    webSpeechTimeout = null;
                }

                // Wait 1200ms (Slower to allow corrections/continuations)
                setTimeout(() => {
                    if (isListening) {
                        logVoice("⚡ isFinal speed-send (1200ms) - stopping now");
                        stopGoogleSTT();
                    }
                }, 1200);
            } else if (!hasSentCurrentSession && isShowingInterim) {
                // FALLBACK SILENCE DETECTION: Only set timeout for interim results
                // Reset timeout on each new interim result
                if (webSpeechTimeout) {
                    clearTimeout(webSpeechTimeout);
                    webSpeechTimeout = null;
                }
                webSpeechTimeout = setTimeout(() => {
                    logVoice("⏰ Interim silence timeout (2000ms) - stopping");
                    if (isListening && !hasSentCurrentSession) {
                        hasSentCurrentSession = true;
                        // Add small delay before stopping to ensure last syllable is captured
                        setTimeout(() => stopGoogleSTT(), 50);
                    }
                }, 2000); // Increased to 2.0s for better user experience
            }

            // VISUALIZER MODE: Show interim text on screen (User Request - iOS & Fallback)
            if (State.isLiveMode && fullTranscript.trim()) {
                const wrapper = document.getElementById("mf-lyric-wrapper");
                if (wrapper) {
                    try {
                        const displayText = correctVoiceText(fullTranscript.trim());
                        // If sound hasn't been detected yet by analyser, force it here because we have text
                        if (!hasDetectedSound) hasDetectedSound = true;

                        wrapper.innerHTML = `<div class="mf-lyric-line active">${displayText}</div>`;
                        wrapper.style.transform = "translateY(60px)";
                        wrapper.style.opacity = "1";
                        isShowingInterim = true;
                        console.log("[MF AI] Interim displayed:", displayText);
                    } catch (e) {
                        console.error("[MF AI] Error in interim display:", e);
                        wrapper.innerHTML = `<div class="mf-lyric-line active">${fullTranscript.trim()}</div>`;
                    }
                }
            }

            // Keep state update for Fallback purposes
            lastInterimText = fullTranscript.trim();
            if (lastInterimText.length > 0) isShowingInterim = true;

            /*
                  // Legacy block removed for clarity
                  */
        };

        webSpeechRecognition.onerror = (err) => {
            console.warn("[MF AI] Web Speech interim error:", err.error);
            const fatalErrors = ["no-speech", "audio-capture", "network"];
            if (fatalErrors.includes(err.error)) {
                // FORCE RESET STATE to prevent stuck UI
                if (err.error === 'no-speech') {
                    hasDetectedSound = false; // Reset sound detection so lyrics can show next time
                }

                if (isListening) {
                    console.log("[MF AI] Attempting to recover Web Speech...");
                    try {
                        webSpeechRecognition.stop();
                    } catch (e) { }
                    webSpeechRecognition = null;

                    setTimeout(() => {
                        if (isListening) {
                            console.log("[MF AI] Retrying Web Speech...");
                            startWebSpeechInterim();
                        }
                    }, 300);
                }
            }
        };

        try {
            webSpeechRecognition.start();
            console.log("[MF AI] Web Speech start requested");
        } catch (e) {
            console.warn("[MF AI] Could not start Web Speech interim:", e);
        }
    };

    const stopGoogleSTT = () => {
        if (!isListening) return;
        logVoice("🛑 ========== STOPPING VOICE SESSION ==========");
        isListening = false;

        // Clear timeouts
        if (webSpeechTimeout) {
            clearTimeout(webSpeechTimeout);
            webSpeechTimeout = null;
        }

        silenceLoopActive = false; // Stop silence loop

        // Stop Web Speech interim
        if (webSpeechRecognition) {
            try {
                webSpeechRecognition.stop();
            } catch (e) { }
            webSpeechRecognition = null;
        }

        // Stop Mic safely (Avoid double-stop warning)
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
            mediaRecorder.stop();
        } else if (microphone) {
            // Fallback if mediaRecorder didn't manage to stop tracks
            try {
                microphone.mediaStream.getTracks().forEach((t) => t.stop());
            } catch (e) { }
        }
        if (audioContext) {
            audioContext.close();
        }
        if (silenceTimeout) clearTimeout(silenceTimeout);

        // Reset for next session
        mediaRecorderInitialized = false;
        hasDetectedSound = false; // CRITICAL: Reset sound detected flag so lyrics can resume later

        const micBtn = document.getElementById("mf-mic");
        if (micBtn) micBtn.classList.remove("listening");

        // AI PROCESSING ANIMATION
        if (State.isLiveMode && hasDetectedSound) {
            const wrapper = document.getElementById("mf-lyric-wrapper");
            if (wrapper) {
                wrapper.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:center; gap:20px; width:100%;">
                    <div style="position:relative; font-size:16px; font-weight:600; letter-spacing:1px; color:white;">
                        <span style="background: linear-gradient(90deg, rgba(255,255,255,0.4), rgba(255,255,255,1), rgba(255,255,255,0.4)); background-size: 200% 100%; background-clip: text; -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: shimmer 2s infinite linear;">
                            Đang phân tích
                        </span>
                    </div>
                    <div class="mf-waiting-dots" style="display:flex; gap:8px;">
                        <div class="mf-waiting-dot" style="width:8px; height:8px; background:rgba(255,255,255,0.6); border-radius:50%; animation: dotPulse 1.4s infinite ease-in-out;"></div>
                        <div class="mf-waiting-dot" style="width:8px; height:8px; background:rgba(255,255,255,0.6); border-radius:50%; animation: dotPulse 1.4s infinite ease-in-out 0.2s;"></div>
                        <div class="mf-waiting-dot" style="width:8px; height:8px; background:rgba(255,255,255,0.6); border-radius:50%; animation: dotPulse 1.4s infinite ease-in-out 0.4s;"></div>
                    </div>
                    <style>
                        @keyframes shimmer {
                            0% { background-position: -200% 0; }
                            100% { background-position: 200% 0; }
                        }
                        @keyframes dotPulse {
                            0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
                            40% { transform: scale(1.2); opacity: 1; }
                        }
                    </style>
                </div>`;
            }
        }
    };

    const showFindingInfoUI = (text) => {
        if (!State.isLiveMode) return;
        const wrapper = document.getElementById("mf-lyric-wrapper");
        if (!wrapper) return;

        logVoice(`[UI] Showing "TÌM THẤY THÔNG TIN" with text: ${text}`);
        wrapper.innerHTML = `
            <div class="mf-text-pulse" style="display:flex; flex-direction:column; align-items:center; gap:15px; width: 100%;">
                <div style="font-size: 14px; letter-spacing: 1px; opacity: 1; color: #ffffffb6;">TÌM THẤY THÔNG TIN</div>
                <div class="mf-waiting-dots">
                    <div class="mf-waiting-dot"></div><div class="mf-waiting-dot"></div><div class="mf-waiting-dot"></div>
                </div>
                <div class="mf-anim-in" style="font-size: 15px; font-weight: 600; color: white; text-align: center; width: 100%; line-height: 1.4; margin-top: 5px; animation: fadeInUp 0.4s ease-out;">
                    "${text}"
                </div>
            </div>
        `;
    };

    const processGoogleSTT = async (audioBlob) => {
        // RACE CONDITION FIX: If we explicitly ignored this result (e.g. Quick Action click), skip entirely.
        if (State.ignoreNextSTTResult) {
            console.log(
                "[MF AI STT] Ignoring STT result because of explicit cancel/quick action.",
            );
            State.ignoreNextSTTResult = false; // Reset for next time
            return;
        }

        // CRITICAL: Reset ignore flag here just in case it was stuck
        State.ignoreNextSTTResult = false;

        isProcessingSTT = true;

        // Keep the current interim text on screen while processing (User Request)
        // Do NOT show "TÌM THẤY THÔNG TIN" overlay

        logVoice(`📤 Uploading raw blob (${audioBlob.type})...`);

        try {
            const response = await fetch(
                "https://automation.ideas.edu.vn/mail_api/google_stt.php",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": audioBlob.type || "audio/wav",
                    },
                    body: audioBlob,
                },
            );
            if (!response.ok) throw new Error("STT fetch failed");

            const result = await response.json();
            logVoice("📝 Google STT Result:", result);

            if (result.transcript && result.transcript.trim()) {
                console.log("[MF AI STT] Transcript received:", result.transcript);
                const correctedText = correctVoiceText(result.transcript);
                console.log("[MF AI STT] Corrected text:", correctedText);

                // Show corrected text briefly
                showFindingInfoUI(correctedText);
                handleSend(correctedText);
            } else {
                console.warn("[MF AI STT] No transcript returned from Google.");

                // fallback:
                if (lastInterimText && lastInterimText.trim().length > 2) {
                    logVoice(
                        `⚠️ Google STT empty. Fallback to Web Speech: "${lastInterimText}"`,
                    );
                    const fallbackText = correctVoiceText(lastInterimText);
                    showFindingInfoUI(fallbackText);
                    handleSend(fallbackText);
                } else {
                    // Real failure
                    if (State.isLiveMode) {
                        const wrapper = document.getElementById("mf-lyric-wrapper");
                        if (wrapper)
                            wrapper.innerHTML = `<div class="mf-lyric-line active">Em chưa nghe rõ, anh chị nói lại nhé.</div>`;
                        setTimeout(() => {
                            if (State.isLiveMode && !isListening) startGoogleSTT();
                        }, 2000);
                    }
                }
            }
        } catch (error) {
            console.error("[MF AI STT] Error sending audio to Google STT:", error);
            // Retry
            if (State.isLiveMode) startGoogleSTT();
        } finally {
            isProcessingSTT = false;
        }
    };

    // --- LEGACY VOICE INPUT LOGIC (Fallback or Standard) ---
    let recognition = null;
    let silenceTimer = null;
    // let lastInterimText = ''; // MOVED TO GLOBAL TOP SCOPE TO FIX REDECLARATION

    const correctVoiceText = (text) => {
        if (!text) return "";
        let t = text;
        const maps = [
            // MBA Group
            [/em bi ấy|em bi a|im ba|MPA|IM3|^MB$|^MP$/gi, "MBA"],
            // EMBA Group
            [/em bi a bờ|i em bi a|IMBA|ymba|cmba|em yêu|imei/gi, "EMBA"],
            // MSc AI (MUST come before generic AI to avoid conflicts)
            [/Msci|msca|masci|masc/gi, "MSc AI"],
            // Generic AI
            [/ai ai|ây ai/gi, "AI"],
            [/ID|ai đi/gi, "IDEAS"],
            [/ai eo/gi, "IELTS"],
            // DBA Group
            [/đi bi a|đi bi ai|DBA|DPI/gi, "DBA"],
            // Institutions
            [/sờ quýt |Sweet|suýt|Swite/gi, "Swiss"],
            [/diu mép |you made|u mét|you mate|Umet/gi, "UMEF"],
            [/ai xê ê sờ|ICS/gi, "ICS"],
            [/a i u|IU/gi, "IU"],
            // Programs & Degrees
            [/đáp bồ|Double degree/gi, "Double Degree"],
            [/tóp up|topup|Topica|topic/gi, "Top-up"],
            [/phăn đê xần|phau đê sần|Funding|Foudation/gi, "Foundation"],
            [/o ren tây/gi, "orientation"],
            // Common Vietnamese misspellings/phonetics
            [/lộ chình|lộ trinh/gi, "Lộ trình"],
            [/lộ trinh học/gi, "Lộ trình học"],
            [/học lên thẳng|học liền/gi, "Liên thông"],
            [/liên thôn/gi, "Liên thông"],
            [/chương chình/gi, "Chương trình"],
            [/tính chỉ/gi, "Tín chỉ"],
            // Brands
            [/mail flou|meo flou|meo flow|may flow/gi, "MailFlow"],
        ];

        maps.forEach(([regex, replacement]) => {
            t = t.replace(regex, replacement);
        });

        // Removed duplicate word filter - it was causing false positives like "lịch chốt" -> "lịchot"

        return t;
    };

    // --- UI HELPERS ---
    const scrollBottom = () => {
        const msgContainer = document.getElementById("mf-messages");
        if (msgContainer) msgContainer.scrollTop = msgContainer.scrollHeight;
    };

    const syncMessages = (keepScrollPosition = false) => {
        const msgContainer = document.getElementById("mf-messages");
        if (!msgContainer) return;

        // Save scroll position relative to bottom if keeping position
        let previousScrollHeight = 0;
        let previousScrollTop = 0;
        if (keepScrollPosition) {
            previousScrollHeight = msgContainer.scrollHeight;
            previousScrollTop = msgContainer.scrollTop;
        } else {
            // Lock scrolling immediately to prevent race conditions during rendering
            State.isAutoScrolling = true;
        }

        msgContainer.innerHTML = "";

        // Performance Optimization: Render based on visibleLimit
        const visibleMessages = State.messages.slice(-State.visibleLimit);

        // Show loading trigger/notice if there are more messages hidden above
        // We use a small sentinel element or just the text
        if (State.messages.length > State.visibleLimit) {
            const hiddenNotice = document.createElement("div");
            hiddenNotice.id = "mf-history-loader";
            hiddenNotice.className = "mf-ignore-tracking";
            hiddenNotice.style.cssText = "text-align:center; font-size:11px; color:#cbd5e1; padding-bottom:12px; font-style:italic; min-height: 20px;";
            hiddenNotice.innerHTML = `
                <span style="display:inline-block; animation:mfFadeIn 0.5s;">— Cuộn lên để xem thêm tin nhắn cũ —</span>
            `;
            msgContainer.appendChild(hiddenNotice);
        }

        visibleMessages.forEach((m) => msgContainer.appendChild(createMessageEl(m)));

        if (keepScrollPosition) {
            const newScrollHeight = msgContainer.scrollHeight;
            msgContainer.scrollTop = newScrollHeight - previousScrollHeight + previousScrollTop;
            // console.log("[MF AI] Restoring scroll", { oldH: previousScrollHeight, newH: newScrollHeight, setTop: msgContainer.scrollTop });
        } else {
            setTimeout(() => {
                scrollBottom();
                // Allow a small buffer for the scroll event to fire before re-enabling listener
                setTimeout(() => { State.isAutoScrolling = false; }, 100);
            }, 50);
        }
    };

    const syncQuick = () => {
        // Prevent showing actions if we are currently loading/processing a request
        // Prevent showing actions if we are currently loading OR Cooldown is active
        // This ensures actions only appear when the user is allowed to click them.
        if (State.loading) {
            // Hide containers
            const liveContainer = document.getElementById("mf-live-quick-actions");
            if (liveContainer) liveContainer.style.display = "none";
            const normalContainer = document.getElementById("mf-quick");
            if (normalContainer) normalContainer.style.display = "none";
            return;
        }

        // Check if in live mode - render in dedicated container
        if (State.isLiveMode) {
            const container = document.getElementById("mf-live-quick-actions");
            if (!container) return;

            container.innerHTML = "";
            if (State.quickActions.length === 0) {
                container.style.display = "none";
            } else {
                // FORCE CSS LAYOUT: Horizontal with wrap
                container.style.cssText = `
                    position: absolute; 
                    bottom: 100px; 
                    left: 0; 
                    width: 100%; 
                    display: flex; 
                    flex-direction: row; 
                    flex-wrap: wrap;
                    justify-content: center;
                    align-items: center; 
                    gap: 12px; 
                    padding: 0 20px;
                    z-index: 10002; 
                    pointer-events: none;
                    animation: qaSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                `;

                // Add Custom Fade In Animation for container - Bottom to Top
                if (!document.getElementById("mf-qa-anim-css")) {
                    const style = document.createElement("style");
                    style.id = "mf-qa-anim-css";
                    style.textContent = `@keyframes qaSlideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }`;
                    document.head.appendChild(style);
                }

                // Close Button removed for Live Mode as requested by user

                // LIMIT TO MAX 3 BUTTONS (User Request)
                const displayActions = State.quickActions.slice(0, 3);

                displayActions.forEach((qa) => {
                    const el = document.createElement("button");
                    el.className = "mf-quick-btn";
                    el.style.cssText = "font-size:10px; padding:4px 8px; opacity:0.85; white-space:nowrap; pointer-events: auto;";
                    el.innerHTML = qa;
                    el.onclick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        State.ignoreNextSTTResult = true;
                        stopAllVoices();
                        if (typeof stopGoogleSTT === "function") {
                            try { stopGoogleSTT(); } catch (e) { }
                        }

                        State.isSpeaking = false;
                        isListening = false;
                        isProcessingSTT = true;

                        const wrapper = document.getElementById("mf-lyric-wrapper");
                        if (wrapper) {
                            wrapper.innerHTML = `
                                <div class="mf-text-pulse" style="display:flex; flex-direction:column; align-items:center; gap:15px; width: 100%;">
                                    <div style="font-size: 14px; letter-spacing: 1px; opacity: 1; color: #ffffffb6;">TÌM THẤY THÔNG TIN</div>
                                    <div class="mf-waiting-dots">
                                        <div class="mf-waiting-dot"></div><div class="mf-waiting-dot"></div><div class="mf-waiting-dot"></div>
                                    </div>
                                    <div class="mf-anim-in" style="font-size: 15px; font-weight: 600; color: white; text-align: center; width: 100%; line-height: 1.4; margin-top: 5px; animation: fadeInUp 0.4s ease-out;">"${qa}"</div>
                                </div>`;
                        }

                        State.quickActions = [];
                        syncQuick();
                        handleSend(qa);
                    };
                    container.appendChild(el);
                });
            }
        } else {
            // Normal mode - use regular quick container
            const quickContainer = document.getElementById("mf-quick");
            if (!quickContainer) return;
            quickContainer.innerHTML = "";
            if (State.quickActions.length === 0) {
                quickContainer.style.display = "none";
            } else {
                quickContainer.style.display = "flex";
                quickContainer.style.alignItems = "flex-start";
                quickContainer.style.gap = "10px";

                const chipsWrapper = document.createElement("div");
                chipsWrapper.style.cssText = "display:flex; flex-direction:column; align-items:stretch; gap:8px; flex:1; width:100%; max-height:200px; overflow-y:auto; scrollbar-width:none;";
                chipsWrapper.className = "mf-ignore-tracking";

                State.quickActions.forEach((qa) => {
                    const el = document.createElement("button");
                    el.className = "mf-chip mf-ignore-tracking";
                    el.style.cssText = "white-space: normal; text-align: left; height: auto; align-items: flex-start; line-height: 1.4; border-radius: 12px; padding: 10px 14px;";
                    el.innerHTML = `<div style="margin-top: 1px; flex-shrink: 0;">${ICONS.sparkles}</div> <div style="flex: 1;">${qa}</div>`;
                    el.onclick = (e) => {
                        e.preventDefault();
                        State.quickActions = [];
                        syncQuick();
                        handleSend(qa);
                    };
                    chipsWrapper.appendChild(el);
                });
                quickContainer.appendChild(chipsWrapper);

                const closeBtn = document.createElement("button");
                closeBtn.innerHTML = ICONS.x;
                closeBtn.className = "mf-ignore-tracking";
                closeBtn.title = "Ẩn gợi ý";
                closeBtn.style.cssText = "background: #f1f5f9; border: none; color: #94a3b8; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; transition: all 0.2s;";
                closeBtn.onmouseover = () => { closeBtn.style.background = "#fee2e2"; closeBtn.style.color = "#ef4444"; };
                closeBtn.onmouseout = () => { closeBtn.style.background = "#f1f5f9"; closeBtn.style.color = "#94a3b8"; };
                closeBtn.onclick = (e) => {
                    e.preventDefault();
                    State.quickActions = [];
                    syncQuick();
                };
                quickContainer.appendChild(closeBtn);
            }
        }
    };

    let currentStreamSources = []; // Store active AudioBufferSourceNodes

    const stopAllVoices = () => {
        State.ttsSessionId++; // Invalidate all pending async audio/TTS tasks
        // console.log("[MF AI] Stopping all voices, new session:", State.ttsSessionId);

        if (State.currentAudio) {
            try {
                State.currentAudio.pause();
                State.currentAudio.currentTime = 0;
                State.currentAudio.src = ""; // Force stop
            } catch (e) { }
            State.currentAudio = null;
        }
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }

        // Stop all active Web Audio streams
        currentStreamSources.forEach((s) => {
            try {
                s.onended = null; // CRITICAL: Kill the onended callback to prevent stale logic
                s.stop();
            } catch (e) { }
        });
        currentStreamSources = [];

        // CRITICAL: Clean up all active timers to prevent memory leaks
        if (silenceTimeout) {
            clearTimeout(silenceTimeout);
            silenceTimeout = null;
        }
        if (webSpeechTimeout) {
            clearTimeout(webSpeechTimeout);
            webSpeechTimeout = null;
        }
        if (State.sendTimer) {
            clearTimeout(State.sendTimer);
            State.sendTimer = null;
        }

        State.isSpeaking = false;
        // Reset stream state
        streamSegments = [];
        streamPlaybackIndex = 0;
        isStreamPlaying = false;
        nextAt = 0; // CRITICAL: Reset scheduling clock to prevent silence gap when interrupting speech

        // CRITICAL: Abort ongoing API stream request
        if (window._currentStreamAbortController) {
            // console.log("[MF AI] Aborting _currentStreamAbortController...");
            window._currentStreamAbortController.abort();
            window._currentStreamAbortController = null;
        }
        if (State.abortController) {
            // console.log("[MF AI] Aborting State.abortController...");
            State.abortController.abort();
            State.abortController = null;
        }

        State.loading = false; // Reset loading state
        isProcessingSTT = false; // Reset STT processing status

        // Reset UI if in live mode
        const wrapper = document.getElementById("mf-lyric-wrapper");
        const progress = document.getElementById("mf-lyric-progress");
        if (wrapper) {
            // FIX: If we are ignoring STT (meaning Quick Action was clicked), DO NOT clear the UI here.
            // Let the Quick Action handler control the UI.
            if (!State.ignoreNextSTTResult) {
                wrapper.innerHTML = "";
                wrapper.style.transform = "translateY(60px)";
            }
        }
        if (progress) progress.remove();

        const orb = document.querySelector(".mf-live-orb");
        if (orb) orb.classList.remove("speaking", "loading", "error");
    };

    const toggleLive = (active) => {
        const brand = CONFIG.brandColor;
        unlockIOSAudio(active && isIOS());

        // --- 1. STATE & UI RESET ---
        if (active) State.liveSessionId++; // New session every time we open
        const currentSession = State.liveSessionId;

        State.isLiveMode = active;
        const overlay = document.getElementById("mf-live-overlay");
        const input = document.getElementById("mf-input");
        const win = document.getElementById("mf-window");
        const wrapper = document.getElementById("mf-lyric-wrapper");
        const orb = document.querySelector(".mf-live-orb");
        const icon = document.getElementById("mf-live-icon");
        const progress = document.getElementById("mf-lyric-progress");

        // Always clean up audio-related states when toggling
        stopAllVoices();

        streamSegments = [];
        streamPlaybackIndex = 0;
        isStreamPlaying = false;
        State.isSpeaking = false;
        State.loading = false;
        nextAt = 0;

        if (progress) progress.remove(); // Clear progress bars

        if (active) {
            // --- ENTERING LIVE MODE ---
            // Force reset wrapper to a clean state
            if (wrapper) {
                wrapper.innerHTML = "";
                wrapper.style.transform = "translateY(60px)";
                wrapper.style.opacity = "1";
                wrapper.style.display = "flex";
            }

            if (orb) {
                orb.classList.remove("speaking", "loading");
                orb.style.display = "flex";
            }
            if (icon) icon.innerHTML = ICONS.mic;

            // Reset sound detection state for fresh session
            hasDetectedSound = false;
            soundFrameCount = 0;

            // Auto Enable Sound
            State.isSoundEnabled = true;
            const sBtn = document.getElementById("mf-sound-btn");
            if (sBtn) {
                sBtn.innerHTML = ICONS.volume2;
                sBtn.title = "Đọc văn bản (Bật)";
            }

            if (overlay) {
                overlay.classList.add("active");
            }

            // Force Full Screen
            if (win && !State.isFullScreen) {
                State.isFullScreen = true;
                win.classList.add("full-screen");
                const fullBtn = document.getElementById("mf-full-btn");
                if (fullBtn) fullBtn.innerHTML = ICONS.minimize;
            }

            // --- 2. START SESSION ---
            const startSession = async (isDirectClick = false) => {
                // CRITICAL: Request mic permission on first click (ALL devices)
                if (isDirectClick) {
                    try {
                        console.log("[MF AI] Requesting mic permission...");
                        const stream = await navigator.mediaDevices.getUserMedia({
                            audio: true,
                        });
                        console.log("[MF AI] Mic granted!");
                        window._micStream = stream;
                    } catch (e) {
                        console.error("[MF AI] Mic denied:", e);
                        const wrapper = document.getElementById("mf-lyric-wrapper");
                        if (wrapper)
                            wrapper.innerHTML = `<div class="mf-lyric-line active" style="color:#ff5252;">Vui lòng cho phép truy cập microphone.</div>`;
                        return;
                    }
                }

                stopAllVoices();
                unlockIOSAudio(isDirectClick);

                if (isListening && !gotResult) {
                    console.log("[MF AI Voice] Already listening, skipping start.");
                    return;
                }

                State.isRestartingVoice = true;

                // CRITICAL RESET: Ensure no flags block the new session
                isProcessingSTT = false;

                if (isListening) {
                    try {
                        if (typeof stopGoogleSTT === "function") stopGoogleSTT();
                    } catch (e) { }
                    isListening = false;
                }

                gotResult = false;

                // Clear quick actions when starting new voice input
                State.quickActions = [];
                State.ignoreNextSTTResult = true; // Ignore any pending STT from previous session
                syncQuick(); // This will hide the container

                // UI UPDATE: Immediately show Soundwave if direct click
                if (isDirectClick && wrapper) {
                    // Force SoundWave UI immediately on click
                    hasDetectedSound = true;
                    // CSS is now centrally injected at init
                    wrapper.innerHTML = `
                        <div style="display:flex; flex-direction:column; align-items:center; gap:12px;">
                            <div class="mf-wave-container" style="display:flex; align-items:center; justify-content:center; gap:4px; height:40px; opacity:1;">
                                ${Array.from({ length: 12 })
                            .map(
                                () =>
                                    `<div class="mf-user-wave-bar" style="width:4px; height:100%; background:white; border-radius:99px; transform:scaleY(0.2);"></div>`,
                            )
                            .join("")}
                            </div>
                            <div class="mf-lyric-line active" style="font-size:14px; opacity:0.9; font-weight:500;">Đang nhận diện âm thanh...</div>
                        </div>`;
                }

                // UI will be set by startGoogleSTT, no need for intermediate screen

                const finalizeStart = () => {
                    if (typeof startGoogleSTT === "function") {
                        try {
                            startGoogleSTT();
                        } catch (e) {
                            console.error("[MF AI] STT Start Error:", e);
                            if (wrapper) {
                                wrapper.innerHTML = `<div class="mf-lyric-line active" style="color: #ff5252;">Lỗi khởi động mic. Vui lòng thử lại.</div>`;
                            }
                        }
                    } else {
                        console.error("[MF AI] startGoogleSTT is not defined!");
                        if (wrapper) {
                            wrapper.innerHTML = `<div class="mf-lyric-line active" style="color: #ff5252;">Chức năng giọng nói chưa sẵn sàng.</div>`;
                        }
                    }
                };

                if (isDirectClick) finalizeStart();
                else setTimeout(finalizeStart, 50);
            };

            const stopAndSend = () => {
                stopGoogleSTT();
            };

            if (orb) {
                const handleOrbClick = (e) => {
                    // Check Global Flag
                    if (window.isQuickActionClicked) {
                        console.log("[MF AI] Ignored Overlay click due to Quick Action");
                        window.isQuickActionClicked = false;
                        return;
                    }

                    console.log("[MF AI] Orb clicked/touched");
                    if (e && e.cancelable) e.preventDefault();
                    if (e) e.stopPropagation();

                    if (isListening) stopAndSend();
                    else {
                        State.hasFirstTouch = true;
                        startSession(true); // Direct click
                    }
                };
                orb.onclick = handleOrbClick;
                orb.onmousedown = handleOrbClick;
                orb.addEventListener("touchstart", handleOrbClick, { passive: false });
                orb.style.cursor = "pointer";
                orb.style.webkitTapHighlightColor = "transparent";
            }

            if (overlay) {
                const handleOverlayClick = (e) => {
                    console.log("[MF AI] Overlay clicked/touched");
                    // If it's the orb, the orb handler handles it
                    if (e && e.target && e.target.closest(".mf-live-orb")) return;

                    // CRITICAL FIX: Ignore clicks on Quick Actions or Close Button
                    if (
                        e &&
                        e.target &&
                        (e.target.closest(".mf-quick-btn") ||
                            e.target.closest("#mf-live-quick-actions") ||
                            e.target.closest("#mf-live-close"))
                    ) {
                        console.log("[MF AI] Overlay click ignored (UI element clicked)");
                        return;
                    }

                    // INTERRUPT IF CLICKED ANYWHERE
                    if (State.isSpeaking || isStreamPlaying) {
                        startSession(true);
                        return;
                    }

                    if (!State.hasFirstTouch) {
                        State.hasFirstTouch = true;
                        startSession(true);
                    }
                };
                overlay.style.cursor = "pointer";
                overlay.style.webkitTapHighlightColor = "transparent";
                overlay.onclick = handleOverlayClick;
                overlay.onmousedown = handleOverlayClick;
                overlay.addEventListener("touchstart", handleOverlayClick, {
                    passive: true,
                });

                // BIND CLOSE BUTTON
                const liveClose = document.getElementById("mf-live-close");
                if (liveClose) {
                    const handleClose = (e) => {
                        if (e) {
                            e.preventDefault();
                            e.stopPropagation();
                        }
                        toggleLive(false);
                    };
                    liveClose.onclick = handleClose;
                    liveClose.addEventListener("touchstart", handleClose, {
                        passive: false,
                    });
                }
            }

            // UNIFIED EXPERIENCE: All devices show greeting and require click to start
            const initLiveSession = async () => {
                // FORCE IOS AUTO-START (User Request)
                // Skip logic, skip feeling, just start.
                if (isIOS()) {
                    console.log("[MF AI] iOS detected - Aggressive Auto-Start");
                    State.hasFirstTouch = true;
                    startSession(true);
                    return;
                }

                if (State.hasFirstTouch) {
                    startSession();
                    return;
                }

                // CHECK PRE-GRANTED PERMISSION (If supported)
                try {
                    // Force check on iOS if we can heuristically determine permission
                    // or standard Permissions API for others
                    if (navigator.permissions && navigator.permissions.query) {
                        const result = await navigator.permissions.query({
                            name: "microphone",
                        });
                        if (result.state === "granted") {
                            console.log(
                                "[MF AI] Mic permission already granted, auto-starting...",
                            );
                            State.hasFirstTouch = true;
                            startSession(true); // Treating as direct click to unlock everything
                            return;
                        }
                    }
                    // iOS SPECIFIC: Note that iOS Safari often blocks Permissions API for 'microphone'.
                    // But if we are in this block on iOS, let's treat it trustingly if previously used.
                    else if (isIOS()) {
                        // On iOS, we can't easily check 'granted' state without asking.
                        // But if the user says "If already granted, skip greeting", we try to start.
                        // Worst case: iOS pops up the permission dialog immediately, which is acceptable.
                        console.log("[MF AI] iOS detected, attempting auto-start to skip greeting...");
                        State.hasFirstTouch = true;
                        startSession(true);
                        return;
                    }
                } catch (e) {
                    console.warn("[MF AI] Could not check permissions:", e);
                    // Fallback for iOS error -> TRY ANYWAY
                    if (isIOS()) {
                        startSession(true);
                        return;
                    }
                }

                // FALLBACK: Show Greeting
                if (wrapper) {
                    wrapper.innerHTML = `
                        <div class="mf-anim-in" style="display:flex; flex-direction:column; align-items:center; gap:20px;">
                            <div style="font-size: 24px; font-weight: 900; letter-spacing: 2px; color: white; text-shadow: 0 0 30px rgba(255,255,255,0.3);">AI LIVE MODE</div>
                            <div style="font-size: 12px; opacity: 0.5; color: white; font-style: italic; letter-spacing: 1px;">(Ấn vào bất kỳ đâu để bắt đầu trò chuyện)</div>
                        </div>
                    `;
                }
            };

            initLiveSession();
        } else {
            // --- EXITING LIVE MODE ---
            console.log("[MF AI] Exiting live mode, stopping all audio/voice...");

            // Stop all voices and audio
            stopAllVoices();

            // Stop voice input
            if (typeof stopGoogleSTT === "function")
                try {
                    stopGoogleSTT();
                } catch (e) { }
            isListening = false;

            // Clear timers
            if (silenceTimer) {
                clearTimeout(silenceTimer);
                silenceTimer = null;
            }

            // Clear UI
            if (overlay) overlay.classList.remove("active");
            if (wrapper) wrapper.innerHTML = "";

            // Clear quick actions when exiting live mode
            State.quickActions = [];
            const liveQuick = document.getElementById("mf-live-quick-actions");
            if (liveQuick) liveQuick.remove();

            // Reset state for fresh start next time
            // DON'T reset hasFirstTouch - keep it for session (only reset on page load)
            State.isSpeaking = false;

            // AUTO DISABLE SOUND when exiting Live Mode (User Feedback: "Don't call TTS API in text mode")
            State.isSoundEnabled = false;
            const sBtn = document.getElementById("mf-sound-btn");
            if (sBtn) {
                sBtn.innerHTML = ICONS.volumeX;
                sBtn.title = "Đọc văn bản (Tắt)";
            }

            console.log("[MF AI] Live mode exited, state reset.");
        }

        if (input) input.readOnly = active;
    };

    const toggle = (force) => {
        const win = document.getElementById("mf-window");
        const trigger = document.getElementById("mf-trigger");
        const teaser = document.getElementById("mf-teaser");
        if (!win || !trigger) return;

        const isAlreadyOpen = State.isOpen;
        State.isOpen = typeof force === "boolean" ? force : !State.isOpen;

        // Only guard if the state didn't actually change AND it's a forced call (like auto-open)
        // If it's a toggle (force is undefined), we always want to run to be safe.
        if (typeof force === "boolean" && State.isOpen === isAlreadyOpen) {
            // Check if UI is already in sync
            const hasClass = win.classList.contains("open");
            if (hasClass === State.isOpen) return;
        }

        if (State.isOpen) {
            win.classList.add("open");
            trigger.classList.add("hidden");
            if (teaser) teaser.style.display = "none"; // Hide teaser when chat opens
            State.userClosed = false; // Reset userClosed flag when chat is opened

            // Check for scroll listener on messages container
            const msgContainer = document.getElementById("mf-messages");
            if (msgContainer && !msgContainer._hasScrollListener) {
                msgContainer._hasScrollListener = true;
                msgContainer.addEventListener("scroll", () => {
                    if (
                        !State.isAutoScrolling &&
                        msgContainer.scrollTop === 0 &&
                        State.messages.length > State.visibleLimit &&
                        msgContainer.scrollHeight > msgContainer.clientHeight
                    ) {
                        // User hit top AND container is overflowing AND there are more messages
                        State.visibleLimit += 10;
                        syncMessages(true);
                    }
                });
            }

            syncMessages();
            // Init Welcome if empty
            if (State.messages.length === 0) {
                State.messages.push({
                    id: "init",
                    role: "assistant",
                    content: CONFIG.welcomeMsg,
                    timestamp: Date.now(),
                });
                syncMessages();
            }
            syncQuick();
            if (typeof startPolling === "function") startPolling();
            // Poll immediately on open to catch manual replies
            if (typeof pollMessages === "function") pollMessages();
        } else {
            win.classList.remove("open");
            trigger.classList.remove("hidden");
            if (teaser && CONFIG.teaserMsg) teaser.style.display = "block";
            State.userClosed = true; // Set userClosed flag when chat is manually closed
            // Reset visible limit on close? Optional, but safer to keep lightweight
            State.visibleLimit = 10;

            if (stopGoogleSTT) {
                try {
                    stopGoogleSTT();
                    isListening = false;
                } catch (e) { }
            }
            stopAllVoices();
            if (typeof stopPolling === "function") stopPolling();
        }
        saveState();
    };

    const initVoice = () => {
        const micBtn = document.getElementById("mf-mic");

        // Early Binding for Mobile Live Btn to ensure clickability
        const mobileLiveBtn = document.getElementById("mf-mobile-live-btn");
        if (mobileLiveBtn) {
            const toggleHandler = (e) => {
                if (e.cancelable) e.preventDefault();
                e.stopPropagation();
                toggleLive(!State.isLiveMode);
            };
            mobileLiveBtn.onclick = toggleHandler;
            mobileLiveBtn.addEventListener("touchstart", toggleHandler, {
                passive: false,
                capture: true,
            });
        }

        if (!micBtn) return;

        const handleMicClick = () => {
            if (State.isLiveMode) {
                toggleLive(false);
            } else {
                toggleLive(true);
            }
        };

        micBtn.onclick = handleMicClick;
        micBtn.style.display = "flex";
    };

    // --- STYLES ---
    const injectStyles = () => {
        if (document.getElementById("mf-styles")) return;
        const brand = CONFIG.brandColor;
        const isLeft = CONFIG.position === "bottom-left";

        const css = `
            #mf-root { font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; box-sizing: border-box; }
            #mf-root * { box-sizing: border-box; }
            
            /* TRIGGER BUTTON */
            #mf-trigger {
                position: fixed; bottom: 30px; ${isLeft ? "left: 30px;" : "right: 30px;"}
                width: 64px; height: 64px;
                background: linear-gradient(135deg, ${brand}, ${brand}dd);
                border-radius: 20px;
                transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease;
                display: flex; align-items: center; justify-content: center; color: white;
                cursor: pointer; z-index: 2147483645;
                box-shadow: 0 10px 40px hsla(0, 0%, 0%, 0.15);
                border: 1px solid rgba(255,255,255,0.2);
            }
            #mf-trigger:hover { transform: scale(1.05) translateY(-2px); box-shadow: 0 15px 50px hsla(0,0%,0%,0.2); }
            #mf-trigger.hidden { transform: scale(0); pointer-events: none; opacity: 0; }

            /* TEASER BUBBLE - REDESIGNED PREMIUM */
            #mf-teaser {
                position: absolute; 
                ${isLeft ? "left: 82px;" : "right: 82px;"} 
                bottom: 12px;
                background: white; 
                border-radius: 50px; 
                padding: 10px 24px;
                padding-left: 36px; /* Space for live dot */
                box-shadow: 0 10px 40px -10px rgba(0,0,0,0.25), 0 0 1px rgba(0,0,0,0.1); 
                border: 1px solid rgba(255,255,255,0.4);
                max-width: 250px; 
                font-family: inherit;
                font-size: 14px; 
                font-weight: 600; 
                color: #1e293b;
                white-space: nowrap; 
                cursor: pointer; 
                transform-origin: ${isLeft ? "left" : "right"} center;
                animation: mfTeaserPop 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                z-index: 2147483644; 
                display: none;
                line-height: 1.2;
                letter-spacing: -0.01em;
                user-select: none;
                display: flex; align-items: center;
            }
            #mf-teaser:hover { 
                transform: translateY(-2px) scale(1.02); 
                box-shadow: 0 15px 45px -12px rgba(0,0,0,0.3); 
            }
            #mf-teaser:after {
                content: ""; 
                position: absolute; 
                top: 50%; 
                ${isLeft ? "left: -6px;" : "right: -6px;"}
                width: 12px; height: 12px;
                background: white;
                transform: translateY(-50%) rotate(45deg);
                box-shadow: ${isLeft ? "-2px 2px 2px rgba(0,0,0,0.02)" : "2px -2px 2px rgba(0,0,0,0.02)"};
                z-index: -1;
            }

            /* LIVE DOT */
            .mf-live-dot {
                position: absolute; left: 16px; top: 50%;
                transform: translateY(-50%);
                width: 8px; height: 8px;
                background: ${brand};
                border-radius: 50%;
            }
            .mf-live-dot:after {
                content: ""; position: absolute; inset: -4px;
                background: ${brand}; border-radius: 50%;
                opacity: 0.4;
                animation: mfLivePulse 2s infinite;
            }
            @keyframes mfLivePulse {
                0% { transform: scale(1); opacity: 0.4; }
                100% { transform: scale(2.5); opacity: 0; }
            }

            #mf-teaser-close {
                position: absolute; 
                top: -6px; 
                right: 4px; 
                width: 18px; height: 18px;
                background: #1e293b; 
                border-radius: 50%; 
                display: flex; align-items: center;
                justify-content: center; 
                font-size: 10px; 
                color: white;
                transition: all 0.2s ease; 
                visibility: hidden; 
                opacity: 0;
            }
            #mf-teaser:hover #mf-teaser-close { 
                visibility: visible; 
                opacity: 1; 
                transform: scale(1.1);
            }
            #mf-teaser-close:hover { 
                background: #ef4444; 
                transform: scale(1.3) rotate(90deg); 
            }
            
            @keyframes mfTeaserPop {
                from { opacity: 0; transform: scale(0.8) translateX(${isLeft ? "-20px" : "20px"}); }
                to { opacity: 1; transform: scale(1) translateX(0); }
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
            .mf-voice-bar:nth-child(5) { animation-delay: 0.0s; height: 8px; }

            @keyframes mfGradientFlow { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
            @keyframes mfWave { 0%, 100% { height: 6px; opacity: 0.5; } 50% { height: 16px; opacity: 1; } }

            /* MAIN WINDOW - FIXED: 2.5rem radius and shadow matching react */
            #mf-window {
                position: fixed; bottom: 30px; ${isLeft ? "left: 30px;" : "right: 30px;"}
                width: 480px; height: 650px;
                max-height: calc(100vh - 80px);
                max-width: calc(100vw - 40px);
                background: rgba(255,255,255,0.95);
                backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
                border-radius: 2.5rem; /* React: rounded-[2.5rem] */
                border: 1px solid rgba(255,255,255,0.2);
                box-shadow: 0 20px 50px -12px rgba(0,0,0,0.15); /* React: shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] */
                display: flex; flex-direction: column; overflow: hidden;
                z-index: 2147483647;
                transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
                opacity: 0; 
                visibility: hidden;
                pointer-events: none;
                transform: translateY(40px) scale(0.85);
                filter: blur(10px);
            }
            #mf-window.open { 
                opacity: 1; 
                visibility: visible;
                pointer-events: auto;
                transform: translateY(0) scale(1); 
                filter: blur(0px);
            }
            #mf-window.maximized { width: 90vw; height: 90vh; max-width: 1200px; bottom: 20px; ${isLeft ? "left: 20px;" : "right: 20px;"
            } }
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
            }

            .mf-live-close {
                position: absolute; top: 40px; right: 40px;
                width: 50px; height: 50px; border-radius: 50%;
                background: rgba(255,255,255,0.1); border: none;
                color: white; cursor: pointer; display: flex;
                align-items: center; justify-content: center;
                transition: all 0.3s ease; z-index: 2147483649;
                -webkit-tap-highlight-color: transparent;
                opacity: 0; transform: scale(0.8);
            }
            #mf-live-overlay.active .mf-live-close {
                opacity: 1; transform: scale(1);
                transition-delay: 0.4s;
            }
            .mf-live-close:hover { background: rgba(255,255,255,0.2); transform: scale(1.1); }
            .mf-live-close:active { transform: scale(0.9); }

            @media (max-width: 520px) {
                .mf-live-close { top: 20px; right: 20px; width: 44px; height: 44px; }
            }
            
            /* LIVE MODE OVERLAY */
            #mf-live-overlay {
                position: fixed; inset: 0; 
                background: radial-gradient(circle at center, rgba(15, 23, 42, 0.98) 0%, rgba(2, 6, 23, 0.9) 100%);
                backdrop-filter: blur(0px); -webkit-backdrop-filter: blur(0px);
                z-index: 2147483648; 
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                opacity: 0; visibility: hidden; pointer-events: none;
                transition: all 0.6s cubic-bezier(0.22, 1, 0.36, 1);
                gap: 40px;
                user-select: none; -webkit-user-select: none;
                transform: scale(1.05);
            }
            #mf-live-overlay.active { 
                opacity: 1 !important; 
                visibility: visible !important; 
                pointer-events: auto !important; 
                transform: scale(1) !important;
                backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px);
                display: flex !important;
            }
            
            /* Status Text - Pure White & Bright */
            #mf-live-overlay > div:first-child {
                font-size: 38px !important;
                font-weight: 900 !important;
                color: #FFFFFF !important;
                text-shadow: 
                    0 0 50px #FFFFFF,
                    0 0 80px #FFFFFF,
                    0 0 100px rgba(255,255,255,0.9),
                    0 2px 15px rgba(0,0,0,0.9) !important;
                margin-bottom: 40px !important;
                letter-spacing: 3px !important;
                opacity: 1 !important;
                filter: brightness(2) contrast(1.2) !important;
                -webkit-font-smoothing: antialiased !important;
            }
            
            /* ORB - Moderate */
            .mf-live-orb {
                width: 180px; height: 180px; border-radius: 50%;
                background: linear-gradient(135deg, ${brand}, #e93c2cff);
                box-shadow: 0 0 60px ${brand}80;
                position: relative; z-index: 10;
                display: flex; align-items: center; justify-content: center;
                transition: all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
                opacity: 0; transform: scale(0.5) translateY(40px);
            }
            #mf-live-overlay.active .mf-live-orb {
                opacity: 1; transform: scale(1) translateY(0);
                animation: mfOrbPulse 4s infinite ease-in-out 0.8s;
            }
            #mf-live-icon {
                color: white; z-index: 5; 
                transform: scale(0.1) rotate(-15deg); opacity: 0;
                transition: all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
                transition-delay: 0.4s;
            }
            #mf-live-overlay.active #mf-live-icon {
                transform: scale(3.5) rotate(0); opacity: 1;
                /* No infinite pulse here yet to avoid jitter during entry, 
                   can be added by JS if speaking or just regular pulse */
            }
            .mf-live-orb.loading {
                animation: mfOrbThinking 1.5s infinite ease-in-out !important;
                filter: saturate(1.2);
            }
            .mf-live-orb.loading #mf-live-icon {
                animation: mfIconBreathe 1.5s infinite ease-in-out !important;
            }
            .mf-live-orb.error {
                background: linear-gradient(135deg, #ff4c4c, #990000) !important;
                box-shadow: 0 0 60px rgba(255, 0, 0, 0.6) !important;
                animation: mfOrbError 0.5s ease-in-out !important;
            }
            @keyframes mfOrbError {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-5px); }
                50% { transform: translateX(5px); }
                75% { transform: translateX(-2px); }
            }
            
            /* PARTICLE CONVERGENCE EFFECT - TRUE RANDOM CONVERGENCE */
            .mf-live-orb.loading::before,
            .mf-live-orb.loading::after {
                content: '';
                position: absolute;
                width: 400px;
                height: 400px;
                top: 50%;
                left: 50%;
                margin: -200px 0 0 -200px;
                background-image: 
                    radial-gradient(circle at 15% 25%, rgba(255,255,255,0.4) 1.5px, transparent 1.5px),
                    radial-gradient(circle at 85% 15%, rgba(255,255,255,0.3) 1.5px, transparent 1.5px),
                    radial-gradient(circle at 45% 85%, rgba(255,255,255,0.35) 2px, transparent 2px),
                    radial-gradient(circle at 92% 70%, rgba(255,255,255,0.3) 1.5px, transparent 1.5px),
                    radial-gradient(circle at 8% 60%, rgba(255,255,255,0.45) 2px, transparent 2px),
                    radial-gradient(circle at 55% 10%, rgba(255,255,255,0.3) 1.5px, transparent 1.5px),
                    radial-gradient(circle at 30% 90%, rgba(255,255,255,0.35) 2px, transparent 2px),
                    radial-gradient(circle at 75% 88%, rgba(255,255,255,0.3) 1.5px, transparent 1.5px),
                    radial-gradient(circle at 20% 45%, rgba(255,255,255,0.4) 2px, transparent 2px),
                    radial-gradient(circle at 88% 40%, rgba(255,255,255,0.3) 1.5px, transparent 1.5px),
                    radial-gradient(circle at 12% 78%, rgba(255,255,255,0.35) 2px, transparent 2px),
                    radial-gradient(circle at 95% 22%, rgba(255,255,255,0.3) 1.5px, transparent 1.5px),
                    radial-gradient(circle at 38% 12%, rgba(255,255,255,0.4) 2px, transparent 2px),
                    radial-gradient(circle at 68% 95%, rgba(255,255,255,0.3) 1.5px, transparent 1.5px),
                    radial-gradient(circle at 5% 35%, rgba(255,255,255,0.35) 2px, transparent 2px),
                    radial-gradient(circle at 82% 58%, rgba(255,255,255,0.3) 1.5px, transparent 1.5px);
                background-size: 100% 100%;
                background-repeat: no-repeat;
                animation: mfParticleConverge1 2.2s ease-out infinite;
                pointer-events: none;
                opacity: 0;
            }
            
            .mf-live-orb.loading::after {
                animation: mfParticleConverge2 2.6s ease-out infinite;
                animation-delay: 0.3s;
                background-image: 
                    radial-gradient(circle at 25% 18%, rgba(255,255,255,0.3) 1.5px, transparent 1.5px),
                    radial-gradient(circle at 72% 28%, rgba(255,255,255,0.4) 2px, transparent 2px),
                    radial-gradient(circle at 18% 82%, rgba(255,255,255,0.3) 1.5px, transparent 1.5px),
                    radial-gradient(circle at 90% 50%, rgba(255,255,255,0.35) 2px, transparent 2px),
                    radial-gradient(circle at 35% 65%, rgba(255,255,255,0.3) 1.5px, transparent 1.5px),
                    radial-gradient(circle at 62% 8%, rgba(255,255,255,0.4) 2px, transparent 2px),
                    radial-gradient(circle at 10% 92%, rgba(255,255,255,0.3) 1.5px, transparent 1.5px),
                    radial-gradient(circle at 78% 75%, rgba(255,255,255,0.35) 2px, transparent 2px),
                    radial-gradient(circle at 42% 38%, rgba(255,255,255,0.3) 1.5px, transparent 1.5px),
                    radial-gradient(circle at 95% 12%, rgba(255,255,255,0.4) 2px, transparent 2px),
                    radial-gradient(circle at 28% 55%, rgba(255,255,255,0.3) 1.5px, transparent 1.5px),
                    radial-gradient(circle at 85% 85%, rgba(255,255,255,0.35) 2px, transparent 2px);
            }
            
            @keyframes mfParticleConverge1 {
                0% {
                    transform: scale(1.8);
                    opacity: 0;
                }
                10% {
                    opacity: 0.5;
                }
                90% {
                    opacity: 0.3;
                }
                100% {
                    transform: scale(0);
                    opacity: 0;
                }
            }
            
            @keyframes mfParticleConverge2 {
                0% {
                    transform: scale(2);
                    opacity: 0;
                }
                15% {
                    opacity: 0.6;
                }
                85% {
                    opacity: 0.3;
                }
                100% {
                    transform: scale(0);
                    opacity: 0;
                }
            }
            
            @keyframes mfOrbThinking {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.1); opacity: 0.85; }
            }
            @keyframes mfIconBreathe {
                0%, 100% { transform: scale(2); opacity: 1; }
                50% { transform: scale(2.2); opacity: 0.9; }
            }
            .mf-live-orb.speaking {
                animation: mfOrbSpeaking 0.8s infinite ease-in-out !important;
            }
            .mf-live-orb.speaking #mf-live-icon {
                animation: mfIconPulse 0.8s infinite ease-in-out !important;
            }
            
            /* MIC ACTIVE GLOW */
            .mf-live-orb.mic-active {
                box-shadow: 0 0 80px ${brand}, 0 0 120px ${brand}80 !important;
                filter: brightness(1.3) saturate(1.2);
            }
            .mf-live-orb.mic-active #mf-live-icon {
                filter: drop-shadow(0 0 10px white);
            }
            
            @keyframes mfIconPulse {
                0%, 100% { transform: scale(2); }
                50% { transform: scale(2.3); }
            }
            
            /* SOUNDWAVE ANIMATION - COMPACT & RANDOM */
            .mf-soundwave {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 2px;
                height: 22px;
            }
            .mf-ai-wave-bar {
                width: 2px;
                background: white;
                border-radius: 1px;
            }
            
            /* Each bar has unique animation */
            .mf-ai-wave-bar:nth-child(1) { 
                height: 8px;
                animation: mfWavePulse1 0.7s ease-in-out infinite;
            }
            .mf-ai-wave-bar:nth-child(2) { 
                height: 14px;
                animation: mfWavePulse2 0.9s ease-in-out infinite;
            }
            .mf-ai-wave-bar:nth-child(3) { 
                height: 18px;
                animation: mfWavePulse3 0.6s ease-in-out infinite;
            }
            .mf-ai-wave-bar:nth-child(4) { 
                height: 12px;
                animation: mfWavePulse4 0.85s ease-in-out infinite;
            }
            .mf-ai-wave-bar:nth-child(5) { 
                height: 10px;
                animation: mfWavePulse5 0.75s ease-in-out infinite;
            }
            
            /* Random animations for each bar */
            @keyframes mfWavePulse1 {
                0%, 100% { transform: scaleY(0.4); opacity: 0.5; }
                50% { transform: scaleY(1.3); opacity: 1; }
            }
            @keyframes mfWavePulse2 {
                0%, 100% { transform: scaleY(0.6); opacity: 0.6; }
                45% { transform: scaleY(1.1); opacity: 1; }
            }
            @keyframes mfWavePulse3 {
                0%, 100% { transform: scaleY(0.5); opacity: 0.7; }
                55% { transform: scaleY(1.2); opacity: 1; }
            }
            @keyframes mfWavePulse4 {
                0%, 100% { transform: scaleY(0.45); opacity: 0.55; }
                60% { transform: scaleY(1.15); opacity: 1; }
            }
            @keyframes mfWavePulse5 {
                0%, 100% { transform: scaleY(0.5); opacity: 0.6; }
                40% { transform: scaleY(1.25); opacity: 1; }
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
                width: 85%; max-width: 600px; height: 220px;
                display: flex; flex-direction: column; align-items: center; 
                justify-content: flex-start;
                overflow: visible; pointer-events: none; z-index: 5;
                position: relative; margin-top: 10px;
                padding: 0 10px;
                transition: all 0.8s cubic-bezier(0.22, 1, 0.36, 1);
                opacity: 0; transform: translateY(20px);
                transition-delay: 0.2s;
            }
            #mf-live-overlay.active .mf-live-text {
                opacity: 1; transform: translateY(0);
            }
            #mf-lyric-wrapper {
                width: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
                transition: transform 0.6s cubic-bezier(0.23, 1, 0.32, 1);
            }
           .mf-lyric-line {
                font-size: 14px;
                font-weight: 600;
                color: white;
                text-align: center;
                opacity: 0.3;
                transition: opacity 0.4s ease, transform 0.4s ease;
                line-height: 1.6;
                padding: 0 20px;
                word-wrap: break-word;
                word-break: keep-all;
                overflow-wrap: break-word;
                white-space: normal;
                position: relative;
            }
            .mf-lyric-line.active {
                color: white;
                filter: blur(0);
                transform: scale(1.15);
                opacity: 1 !important;
                text-shadow: 0 0 5px rgba(255,255,255,0.5);
                z-index: 2;
            }
            .mf-lyric-line.previous {
                opacity: 0.2 !important;
                transform: scale(0.8);
                filter: blur(1px);
                z-index: 1;
            }
            .mf-lyric-line.hidden {
                opacity: 0 !important;
                pointer-events: none;
            }
            .mf-waiting-dots {
                display: inline-flex;
                gap: 4px;
                align-items: center;
            }
            .mf-waiting-dot {
                width: 6px;
                height: 6px;
                background: white;
                border-radius: 50%;
                opacity: 0.3;
                animation: mfDotPulse 1.4s infinite ease-in-out;
            }
            .mf-waiting-dot:nth-child(2) { animation-delay: 0.2s; }
            .mf-waiting-dot:nth-child(3) { animation-delay: 0.4s; }

            @keyframes mfDotPulse {
                0%, 100% { transform: scale(1); opacity: 0.3; }
                50% { transform: scale(1.4); opacity: 1; }
            }
            
            @keyframes mfRotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            @keyframes mfOrbPulse { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.06); opacity: 1; box-shadow: 0 0 80px ${brand}; } }
            @keyframes mfRipple { 
                0% { transform: scale(1); opacity: 0; } 
                30% { opacity: 0.4; } 
                100% { transform: scale(2.5); opacity: 0; } 
            }
            @keyframes mfIconPulse {
                0%, 100% { transform: scale(3.5); opacity: 0.8; }
                50% { transform: scale(4.3); opacity: 1; }
            }
            @keyframes mfOrbSpeaking {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.15); opacity: 0.9; box-shadow: 0 0 100px ${brand}; }
            }

            .mf-text-pulse {
                animation: mfTextFade 2s infinite ease-in-out;
            }
            @keyframes mfTextFade {
                0%, 100% { opacity: 0.6; transform: scale(0.98); }
                50% { opacity: 1; transform: scale(1); }
            }
            
            /* LYRIC PROGRESS BARS */
            .mf-lyric-progress {
                display: flex;
                gap: 6px;
                align-items: center;
                justify-content: center;
                margin-top: 20px;
                padding: 0 20px;
            }
            .mf-progress-bar {
                height: 3px;
                flex: 1;
                max-width: 40px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 2px;
                transition: all 0.4s ease;
            }
            .mf-progress-bar.completed {
                background: rgba(255, 255, 255, 0.5);
            }
            .mf-progress-bar.active {
                background: white;
                box-shadow: 0 0 10px white, 0 0 20px rgba(255, 255, 255, 0.5);
                animation: mfProgressPulse 1s ease-in-out infinite;
            }
            
            @keyframes mfProgressPulse {
                0%, 100% { opacity: 1; transform: scaleX(1); }
                50% { opacity: 0.8; transform: scaleX(1.1); }
            }




            /* Hide header sound and live buttons by ID */
            #mf-sound-btn,
            #mf-live-btn {
                display: none !important;
            }

            /* Show live voice button on both mobile and PC */
            #mf-mobile-live-btn { 
                display: flex !important; 
                z-index: 2147483647 !important; 
                pointer-events: auto !important; 
            }

            @media (max-width: 520px) {
                #mf-mic { display: none !important; }
                #mf-input { padding-left: 56px !important; padding-right: 56px !important; }
            }

            @media (min-width: 521px) {
                #mf-input { padding-left: 56px !important; }
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
                    ${isLeft ? "left: 20px;" : "right: 20px;"}
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
            
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;
        const style = document.createElement("style");
        style.id = "mf-styles";
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
        const container = btn.closest(".mf-lead-form");
        const email = container.querySelector("#mf-lead-email").value.trim();
        const phone = container.querySelector("#mf-lead-phone").value.trim();

        if (!email) {
            alert("Vui lòng nhập Email để chúng tôi liên hệ!");
            return;
        }
        if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            alert("Vui lòng nhập địa chỉ Email hợp lệ!");
            return;
        }

        const originalText = btn.innerHTML;
        btn.innerHTML = "Đang gửi...";
        btn.disabled = true;

        // IDENTIFY & TRACK
        if (window._mfIdentify) {
            // Pass distinct Email (required) and Phone (optional)
            window._mfIdentify(email, phone || null, {});
        }

        // Simulate API call or just rely on tracker
        setTimeout(() => {
            btn.innerHTML = "Đã gửi thành công!";
            btn.style.background = "#10b981";

            // Hide inputs instead of just disabling
            container.querySelectorAll("input").forEach((i) => (i.style.display = "none"));
            const title = container.querySelector("div");
            if (title) title.style.display = "none";

            // Send reply
            const replyText = "Cảm ơn Anh Chị đã để lại thông tin. Anh Chị còn thắc mắc hay cần hỗ trợ gì thêm không ạ?";
            const botMsg = {
                id: "lead_thanks_" + Date.now(),
                role: "assistant",
                content: replyText,
                timestamp: Date.now()
            };
            State.messages.push(botMsg);
            const msgEl = createMessageEl(botMsg);
            const msgContainer = document.getElementById("mf-messages");
            if (msgContainer) {
                msgContainer.appendChild(msgEl);
                msgContainer.scrollTop = msgContainer.scrollHeight;
            }
            saveState();

            // Speak if sound enabled
            if (State.isLiveMode || State.isSoundEnabled) {
                speakText(replyText);
            }
        }, 1000);
    };

    // --- PARSING HELPERS ---
    const renderMarkdown = (text, role) => {
        // Strip [ACTIONS: ...] if present (aggressive for streaming)
        text = text
            .replace(/\[(?:ACTIONS|ACTION|BUTTONS|BUTTON|OPTIONS):?.*?(?:\]|$)/gi, "")
            .trim();

        // Remove trailing partial [ACTIONS tags
        text = text
            .replace(/\[(?:ACTIONS|ACTION|BUTTONS|BUTTON|OPTIONS):?[^\]]*$/i, "")
            .trim();

        const escape = (str) =>
            str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

        // Inline parsing function
        const parseInline = (str) => {
            const regex =
                /(!?\[([^\]]+)\]\(([^)]+)\)|\[?(https?:\/\/[^\s\]]+)\]?|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|(\+84|0)\d{9,10})/g;
            let result = "";
            let lastIdx = 0;
            let match;

            while ((match = regex.exec(str)) !== null) {
                let preText = str.substring(lastIdx, match.index);
                // Clean common artifacts
                if (
                    match[3] &&
                    match[3].match(/\.(pdf|docx?|xlsx?|pptx?|zip|rar|7z|txt|csv)$/i)
                ) {
                    preText = preText
                        .replace(/\[Tham khảo thêm:\s*$/, "")
                        .replace(/\[$/, "");
                }
                result += escape(preText);

                const isImg = match[1] && match[1].startsWith("!");
                let label = match[2];
                let url = match[3] || match[4] || match[1];

                if (!match[3] && !match[2]) url = url.replace(/[.,!?;:)\]]+$/, "");

                const imgExt = url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i);
                const videoExt = url.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i);
                const fileExt = url.match(
                    /\.(pdf|docx?|xlsx?|pptx?|zip|rar|7z|txt|csv)$/i,
                );
                const youtubeMatch = url.match(
                    /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/,
                );
                const socialMatch = url.match(/(facebook\.com|instagram\.com|tiktok\.com|linkedin\.com|twitter\.com|x\.com)/i);

                if (youtubeMatch) {
                    const vidId = youtubeMatch[4];
                    const thumb = `https://img.youtube.com/vi/${vidId}/maxresdefault.jpg`;
                    const thumbFallback = `https://img.youtube.com/vi/${vidId}/hqdefault.jpg`;
                    const thumbFallback2 = `https://img.youtube.com/vi/${vidId}/mqdefault.jpg`;
                    result += `
                        <div style="margin:16px 0;border-radius:24px;overflow:hidden;border:1px solid #f1f5f9;position:relative;background:white;box-shadow:0 10px 30px -5px rgba(0,0,0,0.1);transition:all 0.3s;" onmouseover="this.style.transform='scale(1.01) translateY(-2px)';this.style.boxShadow='0 15px 35px -5px rgba(0,0,0,0.12)'" onmouseout="this.style.transform='scale(1) translateY(0)';this.style.boxShadow='0 10px 30px -5px rgba(0,0,0,0.1)'">
                            <a href="${url}" target="_blank" style="display:block;width:100%;position:relative;text-decoration:none;background:#f1f5f9;">
                                <div style="padding-top:56.25%;"></div>
                                <img src="${thumb}" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;display:block;" onerror="this.src='${thumbFallback}'; this.onerror=function(){this.src='${thumbFallback2}'}" />
                                <div style="position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.15);display:flex;align-items:center;justify-content:center;">
                                    <div style="width:60px;height:60px;background:#ef4444;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;box-shadow:0 15px 35px rgba(239,68,68,0.4);border:3px solid white;">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                                    </div>
                                </div>
                            </a>
                            <div style="padding:16px 20px;background:#fff;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #f8fafc;">
                                <div style="flex:1;min-width:0;">
                                    <div style="font-weight:800;color:#94a3b8;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px;">XEM VIDEO TRÊN YOUTUBE</div>
                                    <div style="font-weight:700;color:#1e293b;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${label || 'Bấm để phát ngay'}</div>
                                </div>
                                <div style="padding-left:12px;color:#cbd5e1;">${ICONS.arrowRight}</div>
                            </div>
                        </div>`.replace(/\n/g, '').replace(/\s+/g, ' ');
                } else if (videoExt) {
                    result += ` <div style="margin:16px 0;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px -5px rgba(0,0,0,0.15);background:black;"> <video controls playsinline preload="metadata" style="width:100%;display:block;max-height:450px;"> <source src="${url}" type="video/${videoExt[1].toLowerCase() === "mov" ? "mp4" : videoExt[1].toLowerCase()}"> Trình duyệt không hỗ trợ xem video này. </video> </div>`.replace(/\n/g, '').replace(/\s+/g, ' ');
                } else if (isImg || imgExt) {
                    result += ` <a href="${url}" target="_blank" style="display:block;margin:16px 0;border-radius:24px;overflow:hidden;border:1px solid #f1f5f9;text-decoration:none;background:white;box-shadow:0 10px 30px -5px rgba(0,0,0,0.08);transition:all 0.3s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'"> <img src="${url}" style="width:100%; display:block; max-height:400px; object-fit:cover;" alt="Image" onerror="this.parentElement.style.display='none'"/> <div style="padding:15px 20px;background:#fff;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #f8fafc;"> <div style="flex:1;min-width:0;"> <div style="font-weight:800;color:#94a3b8;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px;">HÌNH ẢNH MINH HỌA</div> <div style="font-weight:700;color:#1e293b;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${label || 'Bấm để xem ảnh gốc'}</div> </div> <div style="color:#cbd5e1;padding-left:12px;">${ICONS.arrowRight}</div> </div> </a>`.replace(/\n/g, '').replace(/\s+/g, ' ');
                } else if (fileExt) {
                    const ext = fileExt[1].toUpperCase();
                    const name = label || url.split("/").pop();
                    result += ` <a href="${url}" target="_blank" style="display:flex;align-items:center;gap:15px;padding:15px;background:#fff;border:1px solid #f1f5f9;border-radius:20px;text-decoration:none;margin:16px 0;transition:all 0.2s;width:100%;box-sizing:border-box;box-shadow:0 10px 20px -5px rgba(0,0,0,0.04);" onmouseover="this.style.borderColor='#cbd5e1';this.style.background='#f8fafc'" onmouseout="this.style.borderColor='#f1f5f9';this.style.background='#fff'"> <div style="background:#fee2e2;width:52px;height:52px;border-radius:14px;display:flex;align-items:center;justify-content:center;color:#ef4444;flex-shrink:0;"> <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> </div> <div style="flex:1;min-width:0;"> <div style="font-weight:700;color:#1e293b;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px;">${name}</div> <div style="font-size:10px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">${ext} FILE • TẢI XUỐNG</div> </div> <div style="color:#cbd5e1;flex-shrink:0;">${ICONS.arrowRight}</div> </a>`.replace(/\n/g, '').replace(/\s+/g, ' ');
                } else if (socialMatch) {
                    const platform = socialMatch[1].toLowerCase().split('.')[0];
                    const iconColor = platform === 'facebook' ? '#3b82f6' : platform === 'instagram' ? '#db2777' : platform === 'tiktok' ? '#000000' : platform === 'linkedin' ? '#0077b5' : CONFIG.brandColor;

                    let iconPath = `<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>`;
                    if (platform === 'instagram') iconPath = `<rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>`;
                    else if (platform === 'linkedin') iconPath = `<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>`;
                    else if (platform === 'tiktok' || platform === 'twitter' || platform === 'x') iconPath = `<path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/>`;

                    result += ` <a href="${url}" target="_blank" style="display:flex;align-items:center;gap:12px;padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:15px;text-decoration:none;margin:12px 0;transition:all 0.2s;" onmouseover="this.style.background='#f1f5f9';this.style.borderColor='#cbd5e1'" onmouseout="this.style.background='#f8fafc';this.style.borderColor='#e2e8f0'"> <div style="width:40px;height:40px;border-radius:10px;background:white;display:flex;align-items:center;justify-center;color:${iconColor};box-shadow:0 2px 4px rgba(0,0,0,0.05);flex-shrink:0;"> <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${iconPath}</svg> </div> <div style="flex:1;min-width:0;"> <div style="font-weight:700;color:#334155;font-size:13px;text-transform:capitalize;">${platform} Profile</div> <div style="font-size:10px;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${url}</div> </div> <div style="color:#cbd5e1;">${ICONS.arrowRight}</div> </a>`.replace(/\n/g, '').replace(/\s+/g, ' ');
                } else {
                    if (!label && (url.startsWith("mailto:") || url.startsWith("tel:")))
                        label = url.replace(/^(mailto|tel):/, "");
                    else if (!label && url.includes("@") && !url.startsWith("http")) {
                        label = url;
                        url = "mailto:" + url;
                    } else if (!label && url.match(/^(\+84|0)\d{9,10}$/)) {
                        label = url;
                        url = "tel:" + url;
                    }
                    const color = role === "user" ? "#bfdbfe" : "#ea580c";
                    result += `<a href="${url}" target="_blank" style="color:${color};text-decoration:underline;text-underline-offset:4px;font-weight:500;">${label || url
                        }</a>`;
                }
                lastIdx = regex.lastIndex;
            }
            result += escape(str.substring(lastIdx));
            // Inline code (backtick)
            result = result.replace(
                /`([^`]+)`/g,
                '<code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-family:monospace;font-size:0.9em;color:#ef4444;">$1</code>',
            );
            // Multi-step Bold: Use a non-capturing group for better safety
            result = result.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
            return result;
        };

        const lines = text.split("\n");
        let htmlBlocks = [];
        let currentList = [];
        let currentTable = [];

        const flushList = () => {
            if (currentList.length > 0) {
                htmlBlocks.push(
                    `<ul style="margin: 12px 0 !important; padding-left: 24px !important; list-style-type: disc !important; list-style-position: outside !important; display: block !important;">${currentList.join(
                        "",
                    )}</ul>`,
                );
                currentList = [];
            }
        };

        const flushTable = () => {
            if (currentTable.length > 0) {
                // Must have at least 2 rows (header + separator)
                if (currentTable.length >= 2) {
                    const header = currentTable[0]
                        .split("|")
                        .map((c) => c.trim())
                        .filter((c) => c);
                    const separator = currentTable[1]
                        .split("|")
                        .map((c) => c.trim())
                        .filter((c) => c);
                    const rows = currentTable.slice(2).map((row) =>
                        row
                            .split("|")
                            .map((c) => c.trim())
                            .filter((c) => c),
                    ); // Keep empty cells? filter(c=>c) removes empty cells which might break alignment.
                    // Correct split logic: | A | B | -> ["", " A ", " B ", ""]
                    // Better: split('|').slice(1, -1) if pipe at ends.

                    const parseRow = (line) => {
                        const parts = line.split("|");
                        if (
                            parts.length > 2 &&
                            parts[0].trim() === "" &&
                            parts[parts.length - 1].trim() === ""
                        ) {
                            return parts.slice(1, -1);
                        }
                        return parts;
                    };

                    const headers = parseRow(currentTable[0]);
                    const bodyRows = currentTable.slice(2).map((r) => parseRow(r));

                    let tableHtml = `<div style="overflow-x:auto;margin:16px 0;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;"><table style="width:100%;border-collapse:collapse;font-size:13px;background:white;">`;

                    // Header
                    tableHtml += `<thead style="background:#f8fafc;border-bottom:1px solid #e2e8f0;"><tr>`;
                    headers.forEach((h) => {
                        tableHtml += `<th style="padding:12px 16px;text-align:left;font-weight:700;color:#1e293b;border-right:1px solid #f1f5f9;white-space:nowrap;">${parseInline(
                            h.trim(),
                        )}</th>`;
                    });
                    tableHtml += `</tr></thead>`;

                    // Body
                    tableHtml += `<tbody>`;
                    bodyRows.forEach((row, idx) => {
                        const bg = idx % 2 === 0 ? "#ffffff" : "#fcfcfc";
                        tableHtml += `<tr style="background:${bg};border-bottom:1px solid #f1f5f9;">`;
                        row.forEach((cell) => {
                            // FIX: Decode <br> tags in table cells
                            tableHtml += `<td style="padding:12px 16px;vertical-align:top;border-right:1px solid #f1f5f9;color:#334155;line-height:1.5;">${parseInline(
                                cell.trim(),
                            ).replace(/&lt;br\s*\/?&gt;/gi, "<br/>")}</td>`;
                        });
                        tableHtml += `</tr>`;
                    });
                    tableHtml += `</tbody></table></div>`;
                    htmlBlocks.push(tableHtml);
                }
                currentTable = [];
            }
        };

        lines.forEach((line) => {
            const trimmed = line.trim();
            // Table Detection: Starts with |
            if (trimmed.startsWith("|")) {
                flushList();
                currentTable.push(trimmed);
                return;
            } else {
                flushTable();
            }

            // Match bullet points: - item, * item, • item, – item, 1. item . REQUIRE space after bullet to avoid **Bold** confusion
            const listMatch = trimmed.match(/^([-*•–—]|\d+\.)\s+(.*)$/);
            const isIndented = line.startsWith("  ") || line.startsWith("\t");

            if (listMatch) {
                currentList.push(
                    `<li style="margin-bottom: 6px; line-height: 1.6;">${parseInline(
                        listMatch[2],
                    )}</li>`,
                );
            } else if (isIndented && currentList.length > 0 && trimmed) {
                // Continuation of list or sub-item (indented)
                currentList.push(
                    `<li style="margin-bottom: 6px; line-height: 1.6; list-style-type: none;">${parseInline(
                        trimmed,
                    )}</li>`,
                );
            } else {
                flushList();
                if (trimmed) {
                    if (trimmed.startsWith("### ")) {
                        htmlBlocks.push(
                            `<h3 style="margin: 16px 0 8px 0; font-size: 16px; font-weight: 800; color: #1e293b;">${parseInline(
                                trimmed.substring(4),
                            )}</h3>`,
                        );
                    } else if (trimmed.startsWith("## ")) {
                        htmlBlocks.push(
                            `<h2 style="margin: 20px 0 10px 0; font-size: 18px; font-weight: 800; color: #1e293b;">${parseInline(
                                trimmed.substring(3),
                            )}</h2>`,
                        );
                    } else {
                        htmlBlocks.push(
                            `<div style="margin-bottom: 10px; line-height: 1.6;">${parseInline(
                                trimmed,
                            )}</div>`,
                        );
                    }
                } else {
                    // Empty line spacer
                    htmlBlocks.push(`<div style="height: 8px;"></div>`);
                }
            }
        });
        flushList();
        flushTable();

        return htmlBlocks.join("");
    };

    // Nav Link Suggestion
    const renderNavLink = (txt) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const matches = txt.match(urlRegex);
        if (!matches || matches.length !== 1) return "";
        const url = matches[0].replace(/[.,!?;:)\]]+$/, "");
        if (url.match(/\.(jpg|png|gif|webp|pdf|doc|xls|zip)$/i)) return "";

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
        console.log("[MF AI] renderApp called");
        if (document.getElementById("mf-root")) return window.__mf_app;
        const root = document.createElement("div");
        root.id = "mf-root";
        root.lang = "vi"; // Force Vietnamese hint for browser
        root.className = "mf-ignore-tracking"; // Signal to tracker to ignore EVERYTHING inside
        root.innerHTML = `
            <div id="mf-window" class="mf-ignore-tracking">
                <div id="mf-header" class="mf-ignore-tracking">
                    <div class="mf-bg-pattern"></div>
                    <div style="display:flex;align-items:center;gap:16px;position:relative;z-index:10;" class="mf-ignore-tracking">
                        <div class="mf-avatar-box mf-ignore-tracking">
                            ${CONFIG.botAvatar
                ? `<img src="${CONFIG.botAvatar}" style="width:100%;height:100%;object-fit:cover;">`
                : ICONS.bot
            }
                            <div class="mf-pulse" style="position:absolute;top:-4px;right:-4px;width:20px;height:20px;background:#10b981;border:4px solid white;border-radius:50%;animation:mfBounce 1s infinite;"></div>
                        </div>
                        <div>
                            <div style="font-weight:700;font-size:16px;display:flex;align-items:center;gap:6px;line-height:1.2;">
                                ${CONFIG.botName} ${ICONS.shield}
                            </div>
                            <div style="font-size:11px;opacity:0.8;font-weight:600;letter-spacing:0.05em;margin-top:2px;">SẴN SÀNG HỖ TRỢ 24/7</div>
                        </div>
                    </div>
                    <div class="mf-header-actions" style="display:flex;gap:8px;position:relative;z-index:10;align-items:center;">
                        <button id="mf-sound-btn" title="Bật âm thanh">${State.isSoundEnabled ? ICONS.volume2 : ICONS.volumeX
            }</button>
                        <button id="mf-live-btn" title="Live Voice">${ICONS.activity
            }</button>
                        <button id="mf-full-btn" title="Toàn màn hình">${ICONS.fullScreen
            }</button>
                        <button id="mf-close-btn" title="Đóng">${ICONS.x
            }</button>
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
                         <button id="mf-mobile-live-btn" class="mf-live-autostart mf-ignore-tracking" title="Live Voice" style="display:none; position:absolute; left:6px; top:50%; transform:translateY(-50%); z-index:2147483647; border:none; background:${CONFIG.brandColor
            }; cursor:pointer; padding:0; border-radius:50%; width:40px; height:40px; align-items:center; justify-content:center; color:white; box-shadow: 0 4px 10px rgba(236, 72, 153, 0.4); transition:0.2s; pointer-events:auto !important;">
                            ${ICONS.activity}
                         </button>

                        <input type="text" id="mf-input" class="mf-ignore-tracking" placeholder="Nhập câu hỏi của mình..." autocomplete="off" maxlength="200" 
                               style="width:100%; padding: 16px 60px 16px 20px; border-radius: 99px; border: 1px solid #e2e8f0; background: #f8fafc; outline:none; font-size:14px; box-shadow: 0 2px 5px rgba(0,0,0,0.02); position:relative; z-index:1;">
                        
                        <div style="position:absolute; right:6px; display:flex; gap:6px; align-items:center; z-index: 10;">
                             <button id="mf-mic" class="mf-ignore-tracking" title="Nhập bằng giọng nói" style="display:none; border:none; background:white; cursor:pointer; padding:8px; border-radius:50%; color:#64748b; box-shadow: 0 2px 5px rgba(0,0,0,0.05); transition:0.2s;">${ICONS.mic
            }</button>
                             <button id="mf-send" class="mf-ignore-tracking" disabled style="border:none; background:#cbd5e1; cursor:not-allowed; padding:0; border-radius:14px; width:38px; height:38px; display:flex; align-items:center; justify-content:center; color:white; transition:0.2s;">${ICONS.send
            }</button>
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
                            <strong class="mf-ignore-tracking">Miễn trừ trách nhiệm AI:</strong><br/>
                            Nguồn huấn luyện: <strong class="mf-ignore-tracking">${CONFIG.botName ||
            CONFIG.companyName ||
            "Dữ liệu doanh nghiệp"
            }</strong>.<br/>
                            Phản hồi được tạo ra dựa trên cơ sở kiến thức nội bộ được kiểm soát chặt chặt chẽ và mô hình Gemini để mang đến nguồn tham khảo chuẩn và nhanh nhất cho người dùng. Dữ liệu internet bên ngoài được loại bỏ để đảm bảo tính liên quan. Những thông tin quan trọng như thời gian, học phí có thể thay đổi theo chính sách tùy thuộc vào từng thời điểm. Vui lòng xác minh với người hỗ trợ của bạn trước khi đăng ký tham gia
                        </div>
                    </div>
                </div>
            </div>
            <div id="mf-trigger" class="mf-ignore-tracking">
                <div style="position:relative;" class="mf-ignore-tracking">
                    <div style="position:absolute;top:-4px;right:-4px;width:20px;height:20px;background:#10b981;border:4px solid white;border-radius:50%;animation:mfBounce 1s infinite;" class="mf-ignore-tracking"></div>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4m0 0h2m-2 0h-2"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M9 16a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm8 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"/></svg>
                </div>
                <div id="mf-teaser" class="mf-ignore-tracking">
                    <div class="mf-live-dot mf-ignore-tracking"></div>
                    <span id="mf-teaser-text" class="mf-ignore-tracking">${CONFIG.teaserMsg}</span>
                    <div id="mf-teaser-close" class="mf-ignore-tracking">×</div>
                </div>
            </div>

            <div id="mf-live-overlay" class="mf-ignore-tracking">
                <button id="mf-live-close" class="mf-live-close">${ICONS.x
            }</button>
                <div class="mf-live-orb">
                   <div class="mf-live-waves">
                       <div class="mf-live-wave"></div>
                       <div class="mf-live-wave"></div>
                       <div class="mf-live-wave"></div>
                   </div>
                   <div id="mf-live-icon" style="color:white; z-index:5;">${ICONS.mic
            }</div>
                </div>
                <!-- Live Text reduced size and styled -->
                <div id="mf-live-text" class="mf-live-text">
                    <div id="mf-lyric-wrapper">
                        <div class="mf-lyric-line active">Đang lắng nghe...</div>
                    </div>
                </div>
                <!-- Quick Actions Container (fixed at bottom, outside scroll area) -->
                <div id="mf-live-quick-actions" style="position:absolute; bottom:80px; left:50%; transform:translateX(-50%); display:none; flex-wrap:wrap; gap:6px; justify-content:center; max-width:90%; opacity:0.85; z-index:2147483647; pointer-events:auto;"></div>
            </div>
        `;
        document.body.appendChild(root);

        // Bind Elements
        const win = document.getElementById("mf-window");
        const trigger = document.getElementById("mf-trigger");
        const msgContainer = document.getElementById("mf-messages");
        const quickContainer = document.getElementById("mf-quick");
        const input = document.getElementById("mf-input");
        const sendBtn = document.getElementById("mf-send");

        // Init Voice
        initVoice();

        // Logic helpers (scrollBottom, syncMessages, syncQuick, toggleLive, toggle)
        // have been moved to the outer scope to ensure accessibility.

        // Bind Events

        trigger.onclick = () => {
            toggle(true);
            State.userClosed = false; // Reset when manually opened
            saveState();
        };

        const teaser = document.getElementById("mf-teaser");
        if (teaser) {
            teaser.onclick = (e) => {
                e.stopPropagation();
                toggle(true);
                State.userClosed = false;
                saveState();
            };
            const teaserClose = document.getElementById("mf-teaser-close");
            if (teaserClose) teaserClose.onclick = (e) => {
                e.stopPropagation();
                teaser.style.display = "none";
                // Optionally save this preference if you want it to stay hidden
            };
        }

        document.getElementById("mf-close-btn").onclick = () => {
            toggle(false);
            State.userClosed = true; // Mark as closed by user
            saveState();
        };

        // SOUND BTN
        const soundBtn = document.getElementById("mf-sound-btn");
        if (soundBtn)
            soundBtn.onclick = () => {
                State.isSoundEnabled = !State.isSoundEnabled;
                soundBtn.innerHTML = State.isSoundEnabled
                    ? ICONS.volume2
                    : ICONS.volumeX;
                soundBtn.title = State.isSoundEnabled
                    ? "Đọc văn bản (Bật)"
                    : "Đọc văn bản (Tắt)";
                console.log("[MF AI] Sound toggled:", State.isSoundEnabled);
                if (!State.isSoundEnabled) {
                    if (State.currentAudio) {
                        State.currentAudio.pause();
                        State.currentAudio.src = "";
                    }
                    State.isSpeaking = false;
                    streamAudioQueue = [];
                    isStreamPlaying = false;
                }
            };

        // LIVE BTN
        const liveBtn = document.getElementById("mf-live-btn");
        if (liveBtn)
            liveBtn.onclick = () => {
                console.log("[MF AI] Live button clicked from header");
                toggleLive(true);
            };

        const liveClose = document.getElementById("mf-live-close");
        if (liveClose) liveClose.onclick = () => toggleLive(false);

        document.getElementById("mf-full-btn").onclick = () => {
            if (State.isMaximized) {
                State.isMaximized = false;
                win.classList.remove("maximized");
            }
            State.isFullScreen = !State.isFullScreen;
            win.classList.toggle("full-screen", State.isFullScreen);
            document.getElementById("mf-full-btn").innerHTML = State.isFullScreen
                ? ICONS.minimize
                : ICONS.fullScreen;
        };
        input.oninput = (e) => {
            const val = e.target.value;
            State.inputValue = val; // CRITICAL: Update State

            const counter = document.getElementById("mf-char-counter");
            counter.innerText = `${val.length}/200`;
            counter.classList.toggle("limit", val.length >= 200);
            counter.classList.add("visible");

            updateSendState(); // Update Button State immediately
        };

        // Cooldown Tick
        // Cooldown Tick
        setInterval(() => {
            if (State.cooldown > 0) {
                State.cooldown--;
                updateSendState();

                // AUTO SHOW QUICK ACTIONS AFTER COOLDOWN
                if (State.cooldown === 0) {
                    syncQuick(); // Try showing actions now that cooldown is over
                    if (State.isOpen) {
                        const inputEl = document.getElementById("mf-input");
                        if (inputEl) inputEl.focus();
                    }
                }
            }
        }, 1000);

        input.onkeypress = (e) => {
            // Prevent send if on cooldown
            if (e.key === "Enter" && State.cooldown === 0) handleSend();
        };

        sendBtn.onclick = () => handleSend();

        return { toggle, updateSendState };
    };

    // --- GLOBAL HELPERS ---
    const updateSendState = () => {
        const sendBtn = document.getElementById("mf-send");
        const inputEl = document.getElementById("mf-input");
        /*
        console.log("[MF AI] updateSendState", {
            hasBtn: !!sendBtn,
            hasInput: !!inputEl,
            val: State.inputValue,
            cooldown: State.cooldown,
        });
        */
        if (!sendBtn || !inputEl) return;

        const hasValue = State.inputValue.trim().length > 0;
        const isCooldown = State.cooldown > 0;

        sendBtn.disabled = !hasValue || isCooldown;
        // ENABLE INPUT ALWAYS so they can type next message
        inputEl.disabled = false;

        if (!sendBtn.disabled) {
            sendBtn.style.background = CONFIG.brandColor;
            sendBtn.style.cursor = "pointer";
        } else {
            sendBtn.style.background = "#cbd5e1";
            sendBtn.style.cursor = "not-allowed";
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
        const isUser = msg.role === "user";
        const div = document.createElement("div");
        div.className = `mf-row mf-anim-in ${isUser ? "user" : ""}`;

        const botIcon = CONFIG.botAvatar
            ? `<img src="${CONFIG.botAvatar}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">`
            : ICONS.bot;

        const avatarHtml = isUser
            ? `<div class="mf-avatar" style="background:#e2e8f0;color:#475569;border:none;">${ICONS.user}</div>`
            : `<div class="mf-avatar" style="background:white;color:${CONFIG.brandColor};border:1px solid #f1f5f9;">${botIcon}</div>`;
        const bubbleStyle = isUser
            ? `background:${CONFIG.brandColor};color:white;`
            : `background:#f8fafc;color:#0f172a;border:1px solid #e2e8f0;border-top-left-radius:0;`;

        let cleanContent = msg.content;
        let showLead = false;
        const leadPattern = /\[\s*SHOW[_ ]LEAD[_ ]FORM\s*\]/gi;

        if (leadPattern.test(cleanContent)) {
            showLead = true;
            // Remove the tag so it doesn't get caught by other cleaners or rendered as text
            cleanContent = cleanContent.replace(leadPattern, "").trim();
        }

        // Strip [ACTIONS:...] tags
        cleanContent = cleanContent.replace(
            /\[(?:ACTIONS|ACTION|BUTTONS|BUTTON|OPTIONS):?(.*?)\]/gi,
            "",
        );
        // FIX: Allow trailing whitespace
        cleanContent = cleanContent
            .replace(/\[([^\[\]]+)\]\s*$/, (match, group1) => {
                if (group1.includes("|") || group1.length < 100) return "";
                return match;
            })
            .trim();

        // If startEmpty is true, we leave content empty for the typing effect to fill
        const contentHtml = startEmpty
            ? ""
            : renderMarkdown(cleanContent) + (showLead ? renderLeadForm() : "");

        // Timestamp
        const timeStr = new Date(msg.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });
        const timeStyle = isUser
            ? "font-size:10px;color:rgba(255,255,255,0.8);margin-top:4px;text-align:right;"
            : "font-size:10px;color:#94a3b8;margin-top:4px;";

        // Feedback Like Button (Only for Bot & RAG messages)
        // Feedback Like Button (Only for Bot & RAG messages)
        // Show for all bot messages so user can test UI. ID check happens on backend.
        const canLike = !isUser;
        const likedClass = msg.liked ? "liked" : "";
        const likeBtnHtml = canLike
            ? `<button class="mf-like-btn ${likedClass}" onclick="window.mfLike('${msg.id
            }')" title="Hữu ích" style="background:none;border:none;cursor:pointer;padding:0 4px;margin-left:8px;color:${msg.liked ? "#ef4444" : "#94a3b8"
            };transition:0.2s;">
                 <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="${msg.liked ? "currentColor" : "none"
            }" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
               </button>`
            : "";

        div.innerHTML = `
            ${avatarHtml}
            <div class="mf-bubble ${isUser ? "user" : ""
            }" style="${bubbleStyle}">
                <div class="mf-content">${contentHtml}</div>
                <div style="display:flex;align-items:center;justify-content:space-between;margin-top:4px;">
                    <div class="mf-time" style="${timeStyle.replace(
                "margin-top:4px;",
                "",
            )}">${timeStr}</div>
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
        targetEl.style.opacity = "0";
        targetEl.style.transform = "translateY(5px)";
        targetEl.style.transition =
            "opacity 0.5s ease-out, transform 0.5s ease-out";

        // LIVE MODE MIRROR REMOVED - Handled by speakText onPlay

        requestAnimationFrame(() => {
            targetEl.style.opacity = "1";
            targetEl.style.transform = "translateY(0)";
            if (onComplete) setTimeout(onComplete, 500); // Wait for transition
        });
    };

    // --- SEND LOGIC (DEBOUNCED & BATCHED) ---
    const handleSend = (text = null) => {
        console.log("[MF AI] handleSend triggered", text || State.inputValue);

        // --- CHẾ ĐỘ HỦY YÊU CẦU CŨ NẾU CÓ ---
        stopAllVoices();

        const val = text || State.inputValue;
        if (!val.trim()) return;

        if (silenceTimer) {
            clearTimeout(silenceTimer);
            silenceTimer = null;
        }

        logVoice(`🚀 handleSend processing: "${val}"`);

        // iOS FIX: Unlock audio context on user interaction (send message)
        // This ensures stream audio can play even though it arrives later
        unlockIOSAudio();

        State.loading = true;
        State.messages.push({
            id: Date.now().toString(),
            role: "user",
            content: val.trim(),
            timestamp: Date.now(),
        });

        State.inputValue = "";
        const inputEl = document.getElementById("mf-input");
        if (inputEl) {
            inputEl.value = "";
            const counter = document.getElementById("mf-char-counter");
            if (counter) counter.innerText = "0/200";
        }

        updateSendState();
        State.quickActions = [];
        syncQuick(); // This will clear both normal and live Quick Actions

        const qBox = document.getElementById("mf-quick");
        if (qBox) qBox.style.display = "none";

        const msgContainer = document.getElementById("mf-messages");
        const lastMsg = State.messages[State.messages.length - 1];
        if (msgContainer) {
            msgContainer.appendChild(createMessageEl(lastMsg));
            msgContainer.scrollTop = msgContainer.scrollHeight;
        }

        State.sendBuffer.push(val.trim());
        if (window.__mf_app) window.__mf_app.updateSendState();

        const btn = document.getElementById("mf-send");
        if (btn) btn.disabled = true;

        if (State.sendTimer) clearTimeout(State.sendTimer);
        executeAPI();
        saveState();
    };

    const executeAPI = async () => {
        const currentSession = State.ttsSessionId;
        console.log("[MF AI] executeAPI called, session:", currentSession, "buffer:", State.sendBuffer);
        if (State.sendBuffer.length === 0) return;

        const text = State.sendBuffer.join("\n");

        showTyping(true);
        if (State.isLiveMode) {
            const wrapper = document.getElementById("mf-lyric-wrapper");
            if (wrapper) {
                wrapper.innerHTML = `
                    <div class="mf-text-pulse" style="display:flex; flex-direction:column; align-items:center; gap:15px; width: 100%;">
                        <div style="font-size: 14px; letter-spacing: 1px; opacity: 1; color: #ffffffb6;">TÌM THẤY THÔNG TIN</div>
                        <div class="mf-waiting-dots">
                            <div class="mf-waiting-dot"></div><div class="mf-waiting-dot"></div><div class="mf-waiting-dot"></div>
                        </div>
                        <div class="mf-anim-in" style="font-size: 15px; font-weight: 600; color: white; text-align: center; width: 100%; line-height: 1.4; margin-top: 5px; animation: fadeInUp 0.4s ease-out;">
                            "${text}"
                        </div>
                    </div>
                `;
                wrapper.style.transform = "translateY(60px)";
            }
            const orb = document.querySelector(".mf-live-orb");
            if (orb) orb.classList.add("loading");
            const icon = document.getElementById("mf-live-icon");
            if (icon) icon.innerHTML = ICONS.sparkles;
        }

        State.cooldown = 5;
        const messageText = State.isLiveMode
            ? `${text} [Voice system: Dựa theo ngữ cảnh và điểm gần giống vì có thể phát âm không chuẩn - Trả lời ngắn gọn]`
            : text;

        // Ensure we always have a visitor ID (Fallback for Incognito/No-Track-Script)
        let vid = localStorage.getItem("_mf_vid");
        if (!vid) {
            // Generate a simple casual UUID
            vid = "v_anon_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
            localStorage.setItem("_mf_vid", vid);
            console.log("[MF AI] Auto-generated Anonymous Visitor ID:", vid);
        }

        const payload = {
            message: messageText,
            property_id: CONFIG.propertyId,
            visitor_id: vid,
            conversation_id: State.conversationId,
            history: !State.conversationId
                ? State.messages
                    .filter((m) => m.content && !m.isError)
                    .map((m) => ({
                        role: m.role === "assistant" ? "model" : "user",
                        parts: [{ text: m.content }],
                    }))
                    .slice(0, -1)
                : undefined,
            context: {
                current_url: window.location.href,
                path: window.location.pathname,
            },
            is_test: CONFIG.isTest,
            stream: true, // ⚡ ENABLE STREAMING
        };

        State.sendBuffer = [];

        // Khởi tạo AbortController mới cho request này
        const abortController = new AbortController();
        State.abortController = abortController;
        window._currentStreamAbortController = abortController;

        logVoice("📨 executeAPI FETCH start session " + currentSession);

        try {
            const res = await fetch(CONFIG.apiEndpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "chat",
                    property_id: CONFIG.propertyId,
                    visitor_id: localStorage.getItem("_mf_vid"),
                    conversation_id: State.conversationId,
                    message: text, // Use 'text' which is State.sendBuffer.join('\n')
                    stream: true,
                }),
                signal: abortController.signal, // Enable abort
            });

            if (currentSession !== State.ttsSessionId) return;

            if (!res.ok) throw new Error("Network response was not ok");

            // [NEW] Sync Conversation ID from Header (CRITICAL for new conversations)
            const serverConvId = res.headers.get("X-Conversation-Id");
            if (serverConvId && serverConvId !== State.conversationId) {
                console.log("[MF AI] Syncing Conversation ID from Header:", serverConvId);
                State.conversationId = serverConvId;
                saveState();
            }

            const contentType = res.headers.get("content-type");

            if (contentType && contentType.includes("application/json")) {
                const json = await res.json();
                showTyping(false);

                // If human takeover or empty success, just exit silently and wait for manual reply
                if (json.human_takeover || (json.success && (json.data?.message === "" || json.message === ""))) {
                    State.loading = false;
                    if (window.__mf_app && window.__mf_app.updateSendState)
                        window.__mf_app.updateSendState();
                    startPolling();
                    return;
                }

                const msgSource = json.data?.message || json.message || "Xin lỗi, đã có lỗi xảy ra.";
                // Split multi-bubble messages (separator could be ||| or \n\n\n\n from our backend)
                let bubbles = msgSource.split(msgSource.includes('\n\n\n\n') ? '\n\n\n\n' : '|||');
                bubbles = bubbles.map(b => b.trim()).filter(b => b);
                if (bubbles.length === 0) bubbles = ["Xin lỗi, đã có lỗi xảy ra."];

                for (let i = 0; i < bubbles.length; i++) {
                    const txt = bubbles[i];
                    
                    showTyping(true);
                    await new Promise(r => setTimeout(r, i === 0 ? 800 : 1200));
                    showTyping(false);

                    const err = {
                        id: Date.now().toString() + "_" + i,
                        role: "assistant",
                        content: txt,
                        timestamp: Date.now(),
                        isError: !json.success,
                    };
                    State.messages.push(err);
                    document
                        .getElementById("mf-messages")
                        .appendChild(createMessageEl(err));
                    document.getElementById("mf-messages").scrollTop =
                        document.getElementById("mf-messages").scrollHeight;
                    saveState();
                    
                    if (State.isLiveMode || State.isSoundEnabled) {
                        speakTextStreaming(txt, currentSession);
                    }
                }

                State.loading = false;
                State.cooldown = 0; // Clear cooldown on response
                if (window.__mf_app && window.__mf_app.updateSendState)
                    window.__mf_app.updateSendState();
                updateSendState(); // Also call local version
                startPolling();

                // Parse actions from JSON response too (Robust Regex) - Only check the last bubble!
                const lastBubbleTxt = bubbles[bubbles.length - 1];
                const actionMatch = lastBubbleTxt.match(
                    /\[(?:ACTIONS|ACTION|BUTTONS|BUTTON|OPTIONS):?\s*([\s\S]*?)\]/i,
                );
                if (actionMatch && actionMatch[1]) {
                    State.quickActions = actionMatch[1]
                        .split(/[|,]/)
                        .map((a) => a.trim())
                        .filter((a) => a);
                    syncQuick();
                } else {
                    // Fallback for case without brackets
                    const rawMatch = lastBubbleTxt.match(
                        /(?:ACTIONS|ACTION|BUTTONS|BUTTON|OPTIONS):?\s*([^\]\n]+)/i,
                    );
                    if (rawMatch && rawMatch[1]) {
                        State.quickActions = rawMatch[1]
                            .split(/[|,]/)
                            .map((a) => a.trim())
                            .filter((a) => a);
                        syncQuick();
                    }
                }

                return;
            }

            // showTyping(false); // Do not hide typing indicator yet
            // Initial message creation removed to show full content only at the end
            // const botMsg = ...

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let fullContent = "";
            let sentenceBuffer = "";
            let isFirstChunk = true;
            let streamFetchCount = 0;

            // let lastRenderTime = 0; // Removed as we no longer stream render to the bubble
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                let chunk = decoder.decode(value, { stream: true });

                if (isFirstChunk && chunk.trim()) {
                    logVoice("⚡ FIRST STREAM CHUNK received");
                    isFirstChunk = false;
                }

                // BỎ QUA "..." FAKE TOKEN TỪ BACKEND - AGGRESSIVE FILTER
                // Loại bỏ nếu chunk CHỈ chứa "..." (có thể có khoảng trắng)
                const trimmedChunk = chunk.trim();
                if (
                    trimmedChunk === "..." ||
                    trimmedChunk === "…" ||
                    /^\.{3,}$/.test(trimmedChunk)
                ) {
                    console.log(
                        '[MF AI] Skipping fake "..." chunk:',
                        JSON.stringify(chunk),
                    );
                    continue; // Skip entirely
                }

                // Nếu fullContent vẫn rỗng và chunk bắt đầu bằng "...", loại bỏ nó
                if (fullContent === "" && trimmedChunk.startsWith("...")) {
                    console.log('[MF AI] Removing "..." prefix from first chunk');
                    chunk = chunk.replace(/^\.{3,}\s*/, ""); // Remove "..." and trailing spaces
                    if (!chunk.trim()) {
                        console.log(
                            '[MF AI] Chunk became empty after removing "...", skipping',
                        );
                        continue;
                    }
                }

                fullContent += chunk;
                sentenceBuffer += chunk;

                // --- NEW: SQUELCH JSON RESPONSES DURING STREAMING ---
                // If the first part looks like our API's JSON response, skip real-time speech
                if (fullContent.trim().startsWith("{")) {
                    // We check for "success":true or "version": to be sure
                    if (
                        fullContent.includes('"success":') ||
                        fullContent.includes('"data":')
                    ) {
                        continue;
                    }
                }

                // Real-time rendering to the bubble disabled; show full content at the end only

                if (isFirstChunk) {
                    isFirstChunk = false;
                    // FIX: Không gỡ 'loading' ngay chunk đầu tiên để giữ hiệu ứng hạt
                    // cho đến khi AI thực sự bắt đầu nói.
                }

                while (true) {
                    const trimmedBuffer = sentenceBuffer.trim();
                    if (!trimmedBuffer) break;

                    // --- MAXIMUM SPEED: Đọc ngay khi có 3 từ (trước là 4) ---
                    let targetWords = streamFetchCount === 0 ? 3 : 18;
                    if (streamFetchCount >= 3) targetWords = 25;

                    const words = trimmedBuffer.split(/\s+/);
                    // CHỈ ngắt câu nếu dấu câu có khoảng trắng theo sau hoặc ở cuối câu chuẩn
                    const hasPunctuation = /([.!?\n。！？]+(?:\s|$))/.test(
                        sentenceBuffer,
                    );
                    const hasComma = /([,，;；]+(?:\s|$))/.test(sentenceBuffer);

                    // FAST START check: "Dạ...", "Chào...", "Vâng..."
                    const fastStartReg =
                        /^(Dạ|Chào|Vâng|Ok|Dạ cho hỏi|Chào anh|Chào chị)/i;
                    const isFastStart =
                        streamFetchCount === 0 &&
                        fastStartReg.test(trimmedBuffer) &&
                        words.length >= 2;

                    // ĐẶC BIỆT: Không ngắt nếu đang ở giữa một con số (VD: 5.400)
                    const isInMiddleOfNumber = /[0-9][.,]$/.test(sentenceBuffer.trim());

                    const shouldTrigger =
                        !isInMiddleOfNumber &&
                        (isFastStart ||
                            (streamFetchCount === 0 &&
                                ((words.length >= targetWords &&
                                    (hasPunctuation || hasComma)) ||
                                    words.length >= 8)) ||
                            (words.length >= targetWords && hasPunctuation) ||
                            words.length >= targetWords * 1.5);

                    if (shouldTrigger) {
                        // Regex tách câu thông minh: Chỉ ngắt khi có dấu câu và có khoảng trắng theo sau
                        const splitRegex =
                            streamFetchCount === 0 || words.length > 30
                                ? /([,，;；.!?\n。！？]+(?:\s|$))/
                                : /([.!?\n。！？]+(?:\s|$))/;
                        let parts = sentenceBuffer.split(splitRegex);
                        parts = parts.filter((p) => p !== "");

                        let speechPart = "";
                        let currentWords = 0;

                        while (parts.length > 0 && currentWords < targetWords) {
                            const segment = parts.shift();
                            const punc = parts.shift() || "";
                            speechPart += segment + punc;
                            currentWords += segment.trim().split(/\s+/).length;
                        }

                        // --- ĐẢM BẢO KHÔNG NGẮT Ở TỪ XƯNG HÔ HOẶC GIÁ CẢ (Dạ, Vâng, Anh, Chị, Giá...) ---
                        const bridgeRegex =
                            /^(Dạ|Vâng|Da|Anh|Chị|Em|Chào|Giá|Học phí|Bao nhiêu|Dạ cho hỏi|Vâng ạ|Dạ anh|Dạ chị|Dạ em|Chào anh|Chào chị)[,T.!?]?$/i;
                        if (speechPart.trim().match(bridgeRegex) && parts.length > 0) {
                            const nextSegment = parts.shift();
                            const nextPunc = parts.shift() || "";
                            speechPart +=
                                (speechPart.endsWith(" ") ? "" : " ") + nextSegment + nextPunc;
                        }

                        // Cập nhật lại buffer còn lại
                        sentenceBuffer = parts.join("");

                        if (speechPart.trim().length > 1) {
                            streamFetchCount++;
                            speakTextStreaming(speechPart.trim(), currentSession);
                        }
                        continue;
                    } else break;
                }
                if (currentSession !== State.ttsSessionId) break;
            }

            if (currentSession === State.ttsSessionId) {
                // --- DETECT AND PARSE JSON RESPONSES (e.g. Fallbacks/Errors) ---
                let finalContent = fullContent;
                let isJsonResponse = false;

                if (
                    fullContent.trim().startsWith("{") &&
                    fullContent.trim().endsWith("}")
                ) {
                    try {
                        const parsed = JSON.parse(fullContent.trim());
                        // If it's our standard API format, extract the message
                        if (
                            parsed.success &&
                            parsed.data &&
                            typeof parsed.data.message === "string"
                        ) {
                            finalContent = parsed.data.message;
                            isJsonResponse = true;
                            // Also sync quick actions if provided in the JSON
                            if (
                                parsed.data.quick_actions &&
                                Array.isArray(parsed.data.quick_actions) &&
                                parsed.data.quick_actions.length > 0
                            ) {
                                State.quickActions = parsed.data.quick_actions;
                                syncQuick();
                            }
                        } else if (typeof parsed.message === "string") {
                            finalContent = parsed.message;
                            isJsonResponse = true;
                        }
                    } catch (e) {
                        // Not valid JSON, or different format - keep as is
                    }
                }

                // --- FINAL SPEECH TRIGGER ---
                if (State.isLiveMode || State.isSoundEnabled) {
                    if (isJsonResponse || streamFetchCount === 0) {
                        // If it was a JSON block (piecewise speech was skipped) or very short msg
                        if (finalContent.trim().length > 1) {
                            speakTextStreaming(finalContent, currentSession);
                        }
                    } else if (sentenceBuffer.trim().length > 1) {
                        // Normal stream: Speak the remaining buffer
                        speakTextStreaming(sentenceBuffer.trim(), currentSession);
                    }
                }

                // --- ACTIONS PARSING (If not already handled by JSON) ---
                if (!isJsonResponse) {
                    const actionMatch = fullContent.match(
                        /\[(?:ACTIONS|ACTION|BUTTONS|BUTTON|OPTIONS):?\s*([\s\S]*?)\]/i,
                    );
                    if (actionMatch && actionMatch[1]) {
                        State.quickActions = actionMatch[1]
                            .split(/[|,]/)
                            .map((a) => a.trim())
                            .filter((a) => a);
                        syncQuick();
                    } else {
                        // Secondary check for patterns without brackets
                        const rawMatch = fullContent.match(
                            /(?:ACTIONS|ACTION|BUTTONS|BUTTON|OPTIONS):?\s*([^\]\n]+)/i,
                        );
                        if (
                            rawMatch &&
                            rawMatch[1] &&
                            (fullContent.includes("ACTIONS:") ||
                                fullContent.includes("BUTTONS:"))
                        ) {
                            const actions = rawMatch[1]
                                .split(/[|,]/)
                                .map((a) => a.trim())
                                .filter((a) => a);
                            if (actions.length > 0) {
                                State.quickActions = actions;
                                syncQuick();
                            }
                        }
                    }
                }

                showTyping(false);

                const botMsg = {
                    id: Date.now().toString(),
                    role: "assistant",
                    content: finalContent,
                    timestamp: Date.now(),
                };
                State.messages.push(botMsg);
                const msgEl = createMessageEl(botMsg);
                const msgContainer = document.getElementById("mf-messages");
                if (msgContainer) {
                    msgContainer.appendChild(msgEl);
                    msgContainer.scrollTop = msgContainer.scrollHeight;
                }

                State.loading = false;
                State.cooldown = 0; // Clear cooldown on response
                // botMsg.content = fullContent; // Already set in constructor above
                saveState();
                checkEndOfResponse();
                if (window.__mf_app && window.__mf_app.updateSendState)
                    window.__mf_app.updateSendState();
                updateSendState(); // Also call local version
                startPolling();
            }
        } catch (e) {
            showTyping(false);
            if (e.name === "AbortError") {
                console.log("[MF AI] Request aborted");
                State.ignoreNextSTTResult = false; // Reset on abort too
                return;
            }
            console.error("[MF AI] API Error:", e);

            // CRITICAL: Reset ignoreNextSTTResult on error to prevent stuck state
            State.ignoreNextSTTResult = false;

            // --- LIVE MODE ERROR HANDLING ---
            if (State.isLiveMode) {
                const wrapper = document.getElementById("mf-lyric-wrapper");
                if (wrapper) {
                    wrapper.innerHTML = `<div class="mf-lyric-line active" style="color:#ff5252;">Lỗi kết nối mạng. Vui lòng thử lại.</div>`;
                }
                // Speak error message if possible
                speakTextStreaming("Xin lỗi, kết nối mạng gặp sự cố.");

                // Turn off Live Mode after a user-friendly delay
                setTimeout(() => toggleLive(false), 3000);
            }

            State.loading = false;
            const err = {
                id: Date.now().toString(),
                role: "assistant",
                content: "Xin lỗi, đã có lỗi xảy ra hoặc mất kết nối mạng.",
                timestamp: Date.now(),
                isError: true,
            };
            State.messages.push(err);

            const msgContainer = document.getElementById("mf-messages");
            if (msgContainer) {
                msgContainer.appendChild(createMessageEl(err));
                msgContainer.scrollTop = msgContainer.scrollHeight;
            }
            saveState();
            if (window.__mf_app && window.__mf_app.updateSendState)
                window.__mf_app.updateSendState();
            startPolling();
        }
    };

    const speakTextStreaming = (text, sessionId = null) => {
        const targetSession = sessionId || State.ttsSessionId;
        // console.log("[MF AI] speakTextStreaming called for session:", targetSession, "Text snippet:", text.substring(0, 30));

        if (!State.isSoundEnabled && !State.isLiveMode) return;
        if (targetSession !== State.ttsSessionId) {
            // console.warn("[MF AI] speakTextStreaming: Session mismatch! Segment belongs to", targetSession, "but current is", State.ttsSessionId);
            return;
        }

        // 1. Convert [ACTIONS:...] to natural speech for BOTH display and TTS
        const naturalSpeech = convertActionsToSpeech(text);

        // 2. Prepare DISPLAY TEXT (Lyrics): Standard words, no pronunciation hacks
        const displayText = naturalSpeech
            .replace(/\[\s*SHOW[_ ]LEAD[_ ]FORM\s*\]/gi, "")
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1") // Links
            .replace(/[*#_~`]/g, "") // Markdown
            .trim();

        // 3. Prepare TTS TEXT: Phonetic/Spoken fixes
        let cleanForTTS = displayText;

        // FIX: Add period to bullet points for natural TTS pauses
        cleanForTTS = cleanForTTS
            .split("\n")
            .map((line) => {
                // Check if line is a bullet point (starts with -, •, *, or number)
                const isBullet =
                    /^\s*[-•*]\s+/.test(line) || /^\s*\d+[\.)]\s+/.test(line);
                if (isBullet) {
                    if (!/[.!?:;,]$/.test(line.trim())) {
                        return line.trim() + ".";
                    }
                }
                return line;
            })
            .join("\n");

        const correctedTTS = correctTTSText(cleanForTTS);

        if (!displayText.trim() && !correctedTTS.trim()) return;

        const segment = {
            text: correctedTTS, // For TTS (Phonetic)
            displayText: displayText, // For lyrics (Standard Text)
            audioBuffer: null,
            status: "pending",
            sessionId: sessionId || State.ttsSessionId,
        };

        streamSegments.push(segment);
        fetchStreamSegment(segment);
        if (!isStreamPlaying) processStreamPlayback();
    };

    const fetchStreamSegment = async (segment) => {
        // console.log("[TTS DEBUG] Calling TTS for text:", segment.text);
        // console.trace("[TTS DEBUG] Call stack:");

        if (!audioCtx) unlockIOSAudio();
        segment.status = "fetching";
        try {
            const propId =
                CONFIG.propertyId ||
                new URLSearchParams(window.location.search).get("id");
            const baseUrl =
                CONFIG.apiUrl ||
                (CONFIG.apiEndpoint
                    ? CONFIG.apiEndpoint.replace(/\/[^\/]+$/, "/")
                    : "api/");
            const url = `${baseUrl}gemini_tts.php`;

            if (segment.sessionId !== State.ttsSessionId) return;

            // CHUYỂN SANG POST ĐỂ TỐI ƯU TỐC ĐỘ VÀ VĂN BẢN DÀI
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    text: segment.text,
                    property_id: propId,
                }),
            });

            if (segment.sessionId !== State.ttsSessionId) return;

            if (!response.ok) throw new Error("TTS Fetch failed");
            const arrayBuffer = await response.arrayBuffer();

            if (segment.sessionId !== State.ttsSessionId) return;

            audioCtx.decodeAudioData(
                arrayBuffer,
                (buffer) => {
                    if (segment.sessionId !== State.ttsSessionId) return;
                    segment.audioBuffer = buffer;
                    segment.status = "ready";
                    State.isSpeaking = true;
                },
                (e) => {
                    if (segment.sessionId !== State.ttsSessionId) return;
                    segment.status = "error";
                },
            );
        } catch (e) {
            if (segment.sessionId !== State.ttsSessionId) return;
            segment.status = "error";
        }
    };

    const processStreamPlayback = async () => {
        if (streamPlaybackIndex >= streamSegments.length) {
            const now = audioCtx ? audioCtx.currentTime : 0;
            if (now < nextAt) {
                setTimeout(processStreamPlayback, 100);
                return;
            }
            isStreamPlaying = false;
            State.isSpeaking = false;
            checkEndOfResponse();
            return;
        }

        const segment = streamSegments[streamPlaybackIndex];
        if (!segment || segment.sessionId !== State.ttsSessionId) {
            /*
            console.log(
                "[MF AI] processStreamPlayback: SESSION MISMATCH OR END. Session:",
                segment ? segment.sessionId : "none",
                "Expected:",
                State.ttsSessionId,
            );
            */
            isStreamPlaying = false;
            return;
        }

        /*
        console.log(
            "[MF AI] processStreamPlayback: Segment",
            streamPlaybackIndex + 1,
            "/",
            streamSegments.length,
            "Session:",
            segment.sessionId,
            "Status:",
            segment.status,
        );
        */

        isStreamPlaying = true;
        if (segment.status === "pending" || segment.status === "fetching") {
            setTimeout(processStreamPlayback, 20);
            return;
        }
        if (segment.status === "error" || !segment.audioBuffer) {
            streamPlaybackIndex++;
            processStreamPlayback();
            return;
        }

        // iOS FIX: Ensure audioCtx is ready
        if (!audioCtx) unlockIOSAudio();

        // iOS FIX: AGGRESSIVELY resume context before EVERY playback
        // iOS can suspend the context at any time (background, lock screen, etc.)
        if (audioCtx) {
            if (audioCtx.state === "suspended") {
                try {
                    await audioCtx.resume();
                    console.log(
                        "[MF AI] AudioContext resumed from suspended, state:",
                        audioCtx.state,
                    );

                    // Wait a bit to ensure it's truly running
                    let retries = 0;
                    while (audioCtx.state !== "running" && retries < 10) {
                        await new Promise((resolve) => setTimeout(resolve, 50));
                        retries++;
                    }

                    if (audioCtx.state !== "running") {
                        console.error(
                            "[MF AI] AudioContext failed to resume after retries, state:",
                            audioCtx.state,
                        );
                        // Skip this segment and try next
                        streamPlaybackIndex++;
                        processStreamPlayback();
                        return;
                    }
                } catch (e) {
                    console.error("[MF AI] Failed to resume AudioContext:", e);
                    // Skip this segment and try next
                    streamPlaybackIndex++;
                    processStreamPlayback();
                    return;
                }
            } else if (audioCtx.state === "closed") {
                console.error("[MF AI] AudioContext is closed, recreating...");
                // Try to recreate
                if (AudioContext) {
                    audioCtx = new AudioContext();
                    unlockIOSAudio();
                }
            }
        }

        const buffer = segment.audioBuffer;
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = 1.1; // ⚡ SPEED BOOST 1.1x

        // --- VOLUME BOOST: Add GainNode ---
        const gainNode = audioCtx.createGain();
        gainNode.gain.value = 2.0; // Boost volume by 100% (was 1.5)
        source.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        currentStreamSources.push(source);

        const now = audioCtx.currentTime;
        // --- ZERO DELAY STITCHING: Gap of only 1ms (0.001) ---
        if (nextAt < now) nextAt = now + 0.001;
        const scheduledTime = nextAt;
        const sessionAtStart = State.liveSessionId;

        try {
            source.start(scheduledTime);
            source.onended = () => {
                currentStreamSources = currentStreamSources.filter((s) => s !== source);
                checkEndOfResponse();
            };
        } catch (e) {
            console.error("[MF AI] Failed to start audio source:", e);
            // Skip this segment
            streamPlaybackIndex++;
            processStreamPlayback();
            return;
        }
        const delayMs = Math.max(0, (scheduledTime - now) * 1000);
        setTimeout(
            () => {
                // CRITICAL: Check session ID to prevent stale lyrics from old sessions
                if (segment.sessionId !== State.ttsSessionId) {
                    console.log(
                        "[MF AI] Skipping lyrics for stale session:",
                        segment.sessionId,
                        "Current:",
                        State.ttsSessionId,
                    );
                    return;
                }

                // Also CHECK if user is currently speaking/listening (Soundwave active). If so, DO NOT update lyrics.
                // UNLOCK LYRICS RIGHT HERE: If audio is starting, we can now safely allow lyrics update
                if (State.ignoreNextSTTResult) {
                    console.log(
                        "[MF AI] Audio started -> Unlocking Lyrics Update (State.ignoreNextSTTResult = false)",
                    );
                    State.ignoreNextSTTResult = false;
                }

                if (
                    State.isLiveMode &&
                    (State.isSpeaking || (!isListening && !hasDetectedSound)) &&
                    !State.ignoreNextSTTResult
                ) {
                    const wrapper = document.getElementById("mf-lyric-wrapper");
                    if (wrapper) {
                        const displayText = segment.displayText || segment.text;
                        const pulse = wrapper.querySelector(".mf-text-pulse");

                        // FORCE CLEAR PULSE: Even if it's not detected smoothly, if audio starts, kill the pulse
                        // This fixes the issue where lyrics don't show because pulse is stuck
                        if (pulse || wrapper.innerHTML.includes('TÌM THẤY THÔNG TIN')) {
                            wrapper.innerHTML = "";
                        }

                        const line = document.createElement("div");
                        line.className = "mf-lyric-line";
                        line.textContent = displayText;
                        wrapper.appendChild(line);

                        const lines = Array.from(
                            wrapper.querySelectorAll(".mf-lyric-line"),
                        );
                        const activeIndex = lines.length - 1;

                        // Update classes for each line based on its position
                        lines.forEach((l, idx) => {
                            l.classList.remove("active", "previous", "hidden");
                            if (idx === activeIndex) {
                                l.classList.add("active");
                            } else if (idx === activeIndex - 1) {
                                l.classList.add("previous");
                            } else {
                                l.classList.add("hidden");
                            }
                        });

                        // DYNAMIC CENTER LOGIC
                        // We want the 'active' line to be at the vertical center of the container (110px now)
                        const containerHeight = 220;
                        const centerPoint = containerHeight / 2;
                        const offset = centerPoint - line.offsetTop - line.offsetHeight / 2;

                        wrapper.style.transform = `translateY(${offset}px)`;

                        // DOM Cleanup
                        if (lines.length > 5) {
                            const oldLine = lines[0];
                            setTimeout(() => {
                                if (oldLine.parentNode) oldLine.remove();
                            }, 700);
                        }

                        // PROGRESS BARS - Show segment indicators
                        const totalSegments = streamSegments.length;
                        const currentSegment = streamPlaybackIndex;

                        // Create or update progress bar container
                        let progressContainer =
                            document.getElementById("mf-lyric-progress");
                        if (!progressContainer) {
                            progressContainer = document.createElement("div");
                            progressContainer.id = "mf-lyric-progress";
                            progressContainer.className = "mf-lyric-progress";

                            // Insert after wrapper
                            const overlay = document.getElementById("mf-live-overlay");
                            if (overlay) {
                                const textArea = overlay.querySelector(".mf-live-text");
                                if (textArea) {
                                    textArea.appendChild(progressContainer);
                                }
                            }
                        }

                        // Update progress bars
                        progressContainer.innerHTML = "";
                        for (let i = 0; i < totalSegments; i++) {
                            const bar = document.createElement("div");
                            bar.className = "mf-progress-bar";
                            if (i < currentSegment) {
                                bar.classList.add("completed");
                            } else if (i === currentSegment) {
                                bar.classList.add("active");
                            }
                            progressContainer.appendChild(bar);
                        }
                    }
                    const orb = document.querySelector(".mf-live-orb");
                    const icon = document.getElementById("mf-live-icon");
                    if (orb) {
                        orb.classList.remove("loading");
                        orb.classList.add("speaking");
                    }
                    if (icon) icon.innerHTML = ICONS.soundwave;
                }
            },
            Math.max(0, delayMs),
        );
        nextAt = scheduledTime + buffer.duration / source.playbackRate.value;
        streamPlaybackIndex++;
        processStreamPlayback();
    };

    const checkEndOfResponse = () => {
        const hasActiveStreams = currentStreamSources.length > 0;
        // console.log("[MF AI] checkEndOfResponse: Loading:", State.loading, "Segments:", streamPlaybackIndex, "/", streamSegments.length, "IsSpeaking:", State.isSpeaking, "Streams:", currentStreamSources.length);
        if (
            !State.loading &&
            streamPlaybackIndex >= streamSegments.length &&
            !State.isSpeaking &&
            !State.currentAudio &&
            !hasActiveStreams
        ) {
            const progressContainer = document.getElementById("mf-lyric-progress");
            if (progressContainer) progressContainer.remove();

            if (State.isLiveMode && !isListening && !isProcessingSTT) {
                console.log(
                    "[MF AI] Everything finished. Restarting Mic after delay...",
                );

                // Reset orb and icon to listening state
                const orb = document.querySelector(".mf-live-orb");
                const icon = document.getElementById("mf-live-icon");
                if (orb) {
                    orb.classList.remove("speaking", "loading");
                }
                if (icon) {
                    icon.innerHTML = ICONS.mic;
                }

                setTimeout(() => {
                    if (
                        State.isLiveMode &&
                        !isListening &&
                        !State.isSpeaking &&
                        !State.currentAudio &&
                        !isProcessingSTT
                    ) {
                        try {
                            startGoogleSTT();
                            console.log("[MF AI] Mic restarted (Google STT)");
                        } catch (e) { }
                    }
                }, 100);
            }
        }
    };

    // --- POLLING LOGIC ---
    function startPolling() {
        if (pollInterval) return;
        // Faster polling (3s instead of 10s) for better real-time manual replies
        pollInterval = setInterval(pollMessages, 3000);
    }

    function stopPolling() {
        if (pollInterval) clearInterval(pollInterval);
        pollInterval = null;
    }

    const pollMessages = async () => {
        if (!State.conversationId || !State.isOpen) return;
        // Prevent race condition: Don't poll while generating response
        if (State.loading) return;

        try {
            const res = await fetch(
                `${CONFIG.apiEndpoint}?action=get_messages&conversation_id=${State.conversationId}`,
            );
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
                const serverMsgs = data.data;
                const localMsgs = State.messages;
                let newMsgsFound = false;

                for (const sMsg of serverMsgs) {
                    const sRole = (sMsg.sender === "visitor" || sMsg.sender === "user") ? "user" : "assistant";
                    const sContent = sMsg.message;
                    const sTime = new Date(sMsg.created_at).getTime();

                    // Better duplicate check: 
                    // 1. If we have the server ID matched exactly, it exists.
                    // 2. If it's a 'user' message and content matches, it's likely an echo of what we just sent.
                    // 3. IMPORTANT: Human replies ('human' sender) should almost always be shown if not present by ID.
                    const alreadyExists = localMsgs.some((lMsg, index) => {
                        // Match by ID if available
                        if (lMsg.id === sMsg.id) return true;

                        const sClean = sContent.trim().replace(/\s+/g, " ").normalize("NFC");
                        const lClean = (lMsg.content || "").trim().replace(/\s+/g, " ").normalize("NFC");

                        // For assistant/human messages
                        if (sMsg.sender === "human" || sMsg.sender === "assistant" || sMsg.sender === "ai") {
                            if (lMsg.role !== "assistant") return false;

                            // CRITICAL FIX: If it matches the LAST message content, ignore timestamp.
                            // This fixes duplication when Client Clock is wrong (skewed from Server).
                            const isLast = index === localMsgs.length - 1;
                            if (isLast && lClean === sClean) return true;

                            // Otherwise enforce time window to allow legitimate repeats later
                            return lClean === sClean && Math.abs(lMsg.timestamp - sTime) < 30000;
                        }

                        // For user messages, hide if content matches (echo prevention)
                        // Also apply LAST MESSAGE check for user role to fix clock skew dups
                        if (lMsg.role === sRole && lClean === sClean) {
                            const isLast = index >= localMsgs.length - 2; // Check last 2 messages for safety
                            if (isLast) return true;
                            return Math.abs(lMsg.timestamp - sTime) < 30000;
                        }
                        return false;
                    });

                    if (!alreadyExists) {
                        const m = {
                            id: sMsg.id,
                            role: sRole,
                            content: sContent,
                            timestamp: sTime,
                            isManual: sMsg.sender === "human"
                        };
                        State.messages.push(m);
                        newMsgsFound = true;

                        // [UI] Speak human replies automatically if sound is on
                        if (sMsg.sender === "human" && (State.isSoundEnabled || State.isLiveMode)) {
                            speakText(sContent);
                        }
                    }
                }

                if (newMsgsFound) {
                    syncMessages(); // Use centralized rendering to respect limits
                    saveState();
                }
            }
        } catch (e) { }
    };

    const showTyping = (show) => {
        const id = "mf-typing-row";
        const exist = document.getElementById(id);

        if (!show) {
            if (exist) exist.remove();
            return;
        }

        if (exist) return; // Already showing, stop here to avoid flicker

        const div = document.createElement("div");
        div.id = id;
        div.className = "mf-row mf-anim-in";
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
        document.getElementById("mf-messages").appendChild(div);
        document.getElementById("mf-messages").scrollTop =
            document.getElementById("mf-messages").scrollHeight;
    };

    // --- PERSISTENCE ---
    const saveState = () => {
        const s = {
            messages: State.messages.slice(-50),
            isOpen: State.isOpen,
            convId: State.conversationId,
        };
        localStorage.setItem(
            `mailflow_chat_store_${CONFIG.propertyId || "default"}`,
            JSON.stringify({
                ...s,
                userClosed: State.userClosed
            }),
        );
    };

    const loadState = () => {
        try {
            const raw = localStorage.getItem(
                `mailflow_chat_store_${CONFIG.propertyId || "default"}`,
            );
            if (raw) {
                const s = JSON.parse(raw);
                if (s.messages) State.messages = s.messages;
                if (typeof s.isOpen === "boolean") State.isOpen = s.isOpen;
                if (typeof s.userClosed === "boolean") State.userClosed = s.userClosed;
                if (s.convId) State.conversationId = s.convId;
            }
        } catch (e) { }
    };

    // --- INIT ---
    const init = async () => {
        console.log("[MF AI] Initializing with Property:", CONFIG.propertyId);
        loadState(); // <-- LOAD STATE FIRST

        try {
            const vid = localStorage.getItem("_mf_vid") || "";
            let url = `${CONFIG.apiEndpoint}?action=get_settings&property_id=${CONFIG.propertyId}&visitor_id=${vid}`;
            if (CONFIG.isTest) url += "&is_test=1";

            console.log("[MF AI] Fetching settings from:", url);
            const res = await fetch(url);
            if (!res.ok) {
                console.error("[MF AI] Settings fetch failed with status:", res.status);
                return;
            }
            const data = await res.json();
            console.log("[MF AI] Settings received:", data);

            if (
                data.success &&
                data.data &&
                (data.data.is_enabled == 1 || CONFIG.isTest)
            ) {
                const s = data.data;
                CONFIG.botName = s.bot_name || CONFIG.botName;
                CONFIG.companyName = s.company_name || CONFIG.companyName;
                CONFIG.brandColor = s.brand_color || CONFIG.brandColor;
                CONFIG.welcomeMsg = s.welcome_msg || CONFIG.welcomeMsg;
                CONFIG.botAvatar = s.bot_avatar;
                if (s.widget_position) CONFIG.position = s.widget_position;

                // [REMOVED FROM HERE - MOVED AFTER RENDER]

                // Update existing welcome message if it was the default one
                // Check if the FIRST message is the welcome message (id='init' or just first) and update it if it differs
                if (State.messages.length > 0 && (State.messages[0].id === "init" || State.messages.length === 1)) {
                    // Only update if it's the assistant's message
                    if (State.messages[0].role === 'assistant' && State.messages[0].content !== CONFIG.welcomeMsg) {
                        State.messages[0].content = CONFIG.welcomeMsg;
                        syncMessages();
                    }
                }

                // Parse Initial Quick Actions
                if (s.quick_actions) {
                    try {
                        const qa = typeof s.quick_actions === 'string' ? JSON.parse(s.quick_actions) : s.quick_actions;
                        if (Array.isArray(qa) && qa.length > 0) {
                            State.quickActions = qa.filter(item => typeof item === 'string' && item.trim());
                            syncQuick();
                        }
                    } catch (e) {
                        console.warn("[MF AI] Failed to parse quick_actions", e);
                        // Fallback: If it's a string like '["A", "B"]' but JSON.parse failed? Unlikely but possible if escaped poorly.
                    }
                }

                // Exclusions (Skip if isTest)
                if (!CONFIG.isTest) {
                    if (s.excluded_pages) {
                        try {
                            const ex =
                                typeof s.excluded_pages === "string"
                                    ? JSON.parse(s.excluded_pages)
                                    : s.excluded_pages;
                            if (Array.isArray(ex)) {
                                const normUrl = window.location.href.replace(/\/$/, "").split('?')[0].toLowerCase();
                                const normPath = window.location.pathname.replace(/\/$/, "").toLowerCase();
                                if (ex.some(u => {
                                    const cleanU = u.trim().replace(/\/$/, "").split('?')[0].toLowerCase();
                                    return normUrl === cleanU || normPath === cleanU;
                                })) {
                                    return; // Cancel init
                                }
                            }
                        } catch (e) { }
                    }
                    if (s.excluded_paths) {
                        try {
                            const ex =
                                typeof s.excluded_paths === "string"
                                    ? JSON.parse(s.excluded_paths)
                                    : s.excluded_paths;
                            if (Array.isArray(ex)) {
                                const normPath = window.location.pathname.toLowerCase();
                                if (ex.some(u => {
                                    const cleanU = u.trim().toLowerCase();
                                    return cleanU.length > 0 && normPath.startsWith(cleanU);
                                })) {
                                    return; // Cancel init
                                }
                            }
                        } catch (e) { }
                    }
                }

                if (s.quick_actions) {
                    try {
                        const qa =
                            typeof s.quick_actions === "string"
                                ? JSON.parse(s.quick_actions)
                                : s.quick_actions;
                        if (Array.isArray(qa) && qa.length > 0) State.quickActions = qa;
                    } catch (e) { }
                }

                if (CONFIG.isTest) {
                    State.messages = [];
                    State.conversationId = null;
                }
                injectStyles();
                window.__mf_app = renderApp();

                if (State.isOpen) {
                    window.__mf_app.toggle(true);
                } else {
                    // [MOVED HERE] Initialize Teaser after render
                    if (s.teaser_msg) {
                        CONFIG.teaserMsg = s.teaser_msg;
                        const teaserText = document.getElementById("mf-teaser-text");
                        if (teaserText) teaserText.innerText = CONFIG.teaserMsg;
                    }
                    const teaserEl = document.getElementById("mf-teaser");
                    if (teaserEl && CONFIG.teaserMsg) {
                        teaserEl.style.display = "block";
                    }
                }

                // Auto Open (Faster if isTest)
                let shouldAutoOpen = (s.auto_open == 1 || CONFIG.isTest);

                // [NEW] CRITICAL: Re-check userClosed flag
                if (State.userClosed) {
                    console.log("[MF AI] Auto-open suppressed because user manually closed chat previously.");
                    shouldAutoOpen = false;
                }

                // Auto Open Exclusions
                if (shouldAutoOpen && !CONFIG.isTest) {
                    if (s.auto_open_excluded_pages) {
                        try {
                            const ex = typeof s.auto_open_excluded_pages === "string" ? JSON.parse(s.auto_open_excluded_pages) : s.auto_open_excluded_pages;
                            if (Array.isArray(ex)) {
                                const normUrl = window.location.href.replace(/\/$/, "").split('?')[0].toLowerCase();
                                const normPath = window.location.pathname.replace(/\/$/, "").toLowerCase();
                                if (ex.some(u => {
                                    const cleanU = u.trim().replace(/\/$/, "").split('?')[0].toLowerCase();
                                    return normUrl === cleanU || normPath === cleanU;
                                })) {
                                    shouldAutoOpen = false;
                                }
                            }
                        } catch (e) { }
                    }
                    if (shouldAutoOpen && s.auto_open_excluded_paths) {
                        try {
                            const ex = typeof s.auto_open_excluded_paths === "string" ? JSON.parse(s.auto_open_excluded_paths) : s.auto_open_excluded_paths;
                            if (Array.isArray(ex)) {
                                const normPath = window.location.pathname.toLowerCase();
                                if (ex.some(u => {
                                    const cleanU = u.trim().toLowerCase();
                                    return cleanU.length > 0 && normPath.startsWith(cleanU);
                                })) {
                                    shouldAutoOpen = false;
                                }
                            }
                        } catch (e) { }
                    }
                }

                if (
                    shouldAutoOpen &&
                    State.messages.length <= 1 &&
                    !State.isOpen
                ) {
                    setTimeout(
                        () => window.__mf_app.toggle(true),
                        CONFIG.isTest ? 500 : 2000,
                    );
                }
            }
        } catch (e) {
            console.error("[MF AI] Init failed", e);
        }
    };

    if (document.readyState === "loading")
        window.addEventListener("DOMContentLoaded", init);
    else init();

    // --- FEEDBACK LOGIC ---
    // --- FEEDBACK LOGIC ---
    window.mfLike = (msgId) => {
        const msg = State.messages.find((m) => m.id === msgId);
        if (!msg) return;

        // TOGGLE STATE
        const isLike = !msg.liked;
        msg.liked = isLike;

        // Update UI
        const btns = document.querySelectorAll(
            `button[onclick="window.mfLike('${msgId}')"]`,
        );
        btns.forEach((btn) => {
            const svg = btn.querySelector("svg");
            if (isLike) {
                // LIKE
                btn.style.color = "#ef4444";
                svg.setAttribute("fill", "currentColor");
                btn.classList.add("liked");

                // POP EFFECT
                btn.classList.remove("popping");
                void btn.offsetWidth; // trigger reflow
                btn.classList.add("popping");

                // SPARKLE BURST
                const rect = btn.getBoundingClientRect();
                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 2;

                for (let i = 0; i < 8; i++) {
                    const spark = document.createElement("div");
                    spark.className = "mf-ray";
                    spark.style.left = cx + "px";
                    spark.style.top = cy + "px";
                    spark.style.setProperty("--ang", i * 45 + "deg");
                    document.body.appendChild(spark);
                    setTimeout(() => spark.remove(), 600);
                }
            } else {
                // UNLIKE
                btn.style.color = "#94a3b8"; // Default grey
                svg.setAttribute("fill", "none");
                btn.classList.remove("liked");
            }
        });

        // Send API only if we have chunks to boost
        if (msg.chunk_ids && msg.chunk_ids.length > 0) {
            fetch(`https://automation.ideas.edu.vn/mail_api/chat_feedback.php`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chunk_ids: msg.chunk_ids,
                    action: isLike ? "like" : "unlike",
                }),
            }).catch((err) => console.error("Feedback error", err));
        }
    };
})();
