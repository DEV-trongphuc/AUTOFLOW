(function () {
    'use strict';

    // Singleton Guard
    if (window._mfTrackerLoaded) return;
    window._mfTrackerLoaded = true;

    // --- BOT DETECTION ---
    function isBot() {
        var ua = navigator.userAgent.toLowerCase();
        var bots = [
            'googlebot', 'bingbot', 'yandexbot', 'duckduckbot', 'slurp',
            'baiduspider', 'ia_archiver', 'facebot', 'facebookexternalhit',
            'twitterbot', 'rogerbot', 'linkedinbot', 'embedly', 'quora link preview',
            'pinterest/0.', 'showyoubot', 'outbrain', 'pinterestbot', 'chrome-lighthouse',
            'bot', 'spider', 'crawler', 'headlesschrome', 'semrushbot', 'ahrefsbot'
        ];
        for (var i = 0; i < bots.length; i++) {
            if (ua.indexOf(bots[i]) !== -1) return true;
        }
        // Headless detection
        if (navigator.webdriver) return true;
        return false;
    }

    if (isBot()) {
        console.log('[MF] Bot detected, tracking in passive mode.');
    }

    // --- TRAFFIC SOURCE DETECTION (EARLY EXECUTION) ---
    // Capture URL parameters BEFORE they are cleaned by SPA routers or clean-up scripts
    var _initialTrafficSource = (function () {
        var params = new URLSearchParams(window.location.search);
        var source = {
            utm_source: params.get('utm_source') || null,
            utm_medium: params.get('utm_medium') || null,
            utm_campaign: params.get('utm_campaign') || null,
            utm_content: params.get('utm_content') || null,
            utm_term: params.get('utm_term') || null,
            referrer: document.referrer || null,
            full_url: window.location.href // Store initial URL
        };
        // Fallback logic for Organic/Social
        if (!source.utm_source && !source.utm_medium) {
            if (source.referrer && source.referrer.indexOf(window.location.hostname) === -1) {
                if (source.referrer.match(/google|bing|yahoo|duckduckgo/i)) {
                    source.utm_source = 'google'; source.utm_medium = 'organic';
                } else if (source.referrer.match(/facebook|fb\.com/i)) {
                    source.utm_source = 'facebook'; source.utm_medium = 'social';
                } else if (source.referrer.match(/tiktok/i)) {
                    source.utm_source = 'tiktok'; source.utm_medium = 'social';
                } else if (source.referrer.match(/instagram/i)) {
                    source.utm_source = 'instagram'; source.utm_medium = 'social';
                } else {
                    source.utm_source = 'referral'; source.utm_medium = 'referral';
                }
            } else {
                source.utm_source = 'direct'; source.utm_medium = 'none';
            }
        }
        return source;
    })();

    // --- CONFIGURATION ---
    var config = {
        endpoint: (window._mf_config && window._mf_config.endpoint) || 'https://automation.ideas.edu.vn/mail_api/track.php',
        propertyId: (window._mf_config && window._mf_config.property_id) || (document.currentScript ? document.currentScript.getAttribute('data-website-id') : null),
        batchInterval: 5000,
        heartbeat: 20000,
        idleTimeout: 3000,
        passivePollInterval: 15000
    };

    if (!config.propertyId) return;

    // --- AI CHAT COMPONENT ---
    (function initAIChat() {
        if (window._mf_config && window._mf_config.ai_chat) {
            var script = document.createElement('script');
            // Optimistic loader: Try to find where tracker.js was loaded from
            var baseUrl = null;
            if (document.currentScript && document.currentScript.src) {
                var src = document.currentScript.src;
                baseUrl = src.substring(0, src.lastIndexOf('/'));
            }

            if (baseUrl) {
                script.src = baseUrl + '/ai-chat-embedded.js?v=' + new Date().getTime();
            } else {
                // Fallback to API relative path
                script.src = config.endpoint.replace('track.php', '../ai-chat-embedded.js') + '?v=' + new Date().getTime();
            }
            script.async = true;
            document.head.appendChild(script);
        }
    })();

    // --- STATE ---
    var visitorId = getStorage('_mf_vid') || generateUUID();
    var sessionId = getStorage('_mf_sid');
    var lastAct = parseInt(getStorage('_mf_last_act') || 0);
    var now = Date.now();

    // Session Timeout Check (30 mins)
    if (!sessionId || (now - lastAct > 30 * 60 * 1000)) {
        sessionId = generateUUID();
        setStorage('_mf_sid', sessionId);
        setStorage('_mf_sat', '0'); // Reset Session Active Time
    }
    setStorage('_mf_vid', visitorId);
    setStorage('_mf_last_act', now);

    var sessionActiveTime = parseInt(getStorage('_mf_sat') || 0);
    var sessionStart = Date.now(); // Local page start
    var eventQueue = [];
    var isProcessing = false;
    var maxScroll = 0;
    var totalActiveTime = 0; // Page active time
    var lastInteractionTime = now;
    var lastTickTime = now;
    var scanPending = false;

    var identifiedData = {
        email: null,
        phone: null,
        firstName: null,
        lastName: null,
        avatar: null,
        priority: -1
    };

    // --- UTILS ---
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    function getStorage(key) {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    }

    function setStorage(key, value) {
        try { localStorage.setItem(key, value); } catch (e) { }
    }

    function isInsideChat(target) {
        if (!target) return false;
        var el = (target.nodeType === 1) ? target : target.parentElement;
        if (!el) return false;
        if (el.closest && el.closest('#mf-root, #mf-window, #mf-trigger, #mf-chat-widget, .mf-ignore-tracking')) return true;
        return false;
    }

    function getTrafficSource() {
        var params = new URLSearchParams(window.location.search);
        var source = {
            utm_source: params.get('utm_source') || null,
            utm_medium: params.get('utm_medium') || null,
            utm_campaign: params.get('utm_campaign') || null,
            utm_content: params.get('utm_content') || null,
            utm_term: params.get('utm_term') || null,
            referrer: document.referrer || null
        };
        if (!source.utm_source && !source.utm_medium) {
            if (source.referrer && source.referrer.indexOf(window.location.hostname) === -1) {
                if (source.referrer.match(/google|bing|yahoo|duckduckgo/i)) {
                    source.utm_source = 'google'; source.utm_medium = 'organic';
                } else if (source.referrer.match(/facebook|fb\.com/i)) {
                    source.utm_source = 'facebook'; source.utm_medium = 'social';
                } else if (source.referrer.match(/tiktok/i)) {
                    source.utm_source = 'tiktok'; source.utm_medium = 'social';
                } else if (source.referrer.match(/instagram/i)) {
                    source.utm_source = 'instagram'; source.utm_medium = 'social';
                } else {
                    source.utm_source = 'referral'; source.utm_medium = 'referral';
                }
            } else {
                source.utm_source = 'direct'; source.utm_medium = 'none';
            }
        }
        return source;
    }

    function detectOS() {
        var ua = navigator.userAgent;
        if (/Windows/.test(ua)) return 'Windows';
        if (/Android/.test(ua)) return 'Android';
        if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
        if (/Macintosh/.test(ua)) return 'macOS';
        if (/Linux/.test(ua)) return 'Linux';
        return 'Unknown';
    }

    function detectBrowser() {
        var ua = navigator.userAgent;
        if (/Edg\//.test(ua)) return 'Edge';
        if (/Chrome/.test(ua) && !/OPR\/|Edg\//.test(ua)) return 'Chrome';
        if (/Safari/.test(ua) && !/Chrome\/|Edg\//.test(ua)) return 'Safari';
        if (/Firefox/.test(ua)) return 'Firefox';
        if (/OPR\//.test(ua) || /Opera/.test(ua)) return 'Opera';
        return 'Unknown';
    }

    // --- TRACKING CORE ---
    function track(type, data) {
        data = data || {};
        // Global context enrichment: attach current time to every event to prevent data loss 
        // if the final exit ping fails (common on mobile browsers).
        if (typeof data.page_time === 'undefined') data.page_time = Math.floor(totalActiveTime / 1000);
        if (typeof data.duration === 'undefined') data.duration = Math.floor(sessionActiveTime / 1000);
        if (type === 'scroll' && typeof data.max_scroll === 'undefined') data.max_scroll = maxScroll;

        // Optimization for Scroll: Only keep the latest scroll for the same URL in the current queue
        if (type === 'scroll') {
            for (var i = 0; i < eventQueue.length; i++) {
                if (eventQueue[i].type === 'scroll' && eventQueue[i].data.path === data.path) {
                    // Only update if the new scroll percentage is HIGHER than what's already in the queue
                    if (data.percent > (eventQueue[i].data.percent || 0)) {
                        eventQueue[i].data = data;
                        eventQueue[i].timestamp = Date.now();
                        saveQueue();
                    }
                    return;
                }
            }
        }

        eventQueue.push({ type: type, data: data, timestamp: Date.now() });
        saveQueue();
        if (type === 'pageview' || type === 'identify' || eventQueue.length >= 10) {
            flush();
        }
    }

    function saveQueue() { setStorage('_mf_queue', JSON.stringify(eventQueue)); }
    function loadQueue() {
        var q = getStorage('_mf_queue');
        if (q) {
            try {
                var items = JSON.parse(q);
                if (Array.isArray(items)) eventQueue = items.concat(eventQueue);
            } catch (e) { }
        }
    }

    function flush(isUnload) {
        if (eventQueue.length === 0 || (isProcessing && !isUnload) || !navigator.onLine) return;
        isProcessing = true;

        var batchSize = isUnload ? 50 : 20;
        var batch = eventQueue.slice(0, batchSize);
        var payload = {
            property_id: config.propertyId,
            visitor_id: visitorId,
            device_info: {
                ua: navigator.userAgent,
                screen: window.screen.width + 'x' + window.screen.height,
                lang: navigator.language,
                os: detectOS(),
                browser: detectBrowser(),
                language: navigator.language || navigator.userLanguage,
                is_bot: isBot() // [FIX] Include bot flag so server can correctly tag sessions
            },
            traffic_source: _initialTrafficSource,
            events: batch
        };
        var data = JSON.stringify(payload);

        if (isUnload && navigator.sendBeacon) {
            navigator.sendBeacon(config.endpoint, new Blob([data], { type: 'application/json' }));
            eventQueue.splice(0, batch.length);
            saveQueue();
            isProcessing = false;
            return;
        }

        var xhr = new XMLHttpRequest();
        xhr.open('POST', config.endpoint, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                isProcessing = false;
                if (xhr.status === 403) {
                    // Blocked IP Action - Aggressive User Blocking
                    try {
                        document.body.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100vh;background:#f8f9fa;color:#e11d48;font-family:system-ui,-apple-system,sans-serif;text-align:center;flex-direction:column;">' +
                            '<h1 style="font-size:32px;margin-bottom:16px;">Access Restricted</h1>' +
                            '<p style="color:#475569;font-size:16px;">Your device has been blocked from accessing this website.</p>' +
                            '</div>';
                        document.head.innerHTML = ''; // Remove styles/scripts to prevent bypass
                        // Stop all further tracking
                        eventQueue = [];
                        setStorage('_mf_queue', '[]');
                    } catch (e) { }
                    return;
                }

                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        var response = JSON.parse(xhr.responseText);
                        if (response && response.identified_as) {
                            updateIdentityFromServer(response.identified_as);
                        }
                    } catch (e) { }
                    eventQueue.splice(0, batch.length);
                    saveQueue();
                    if (eventQueue.length > 0) setTimeout(function () { flush(false); }, 1000);
                }
            }
        };
        xhr.send(data);
    }

    function updateIdentityFromServer(idAs) {
        if (idAs.email || idAs.phone || idAs.firstName || idAs.lastName) {
            identifiedData.email = idAs.email || identifiedData.email;
            identifiedData.phone = idAs.phone || identifiedData.phone;
            identifiedData.firstName = idAs.firstName || (idAs.name ? idAs.name.split(' ')[0] : identifiedData.firstName);
            identifiedData.lastName = idAs.lastName || (idAs.name ? idAs.name.split(' ').slice(1).join(' ') : identifiedData.lastName);
            identifiedData.avatar = idAs.avatar || identifiedData.avatar;
            persistIdentity();
        }
    }

    // --- ACTIVITY TRACKER ---
    function updateActivity() {
        lastInteractionTime = Date.now();
        setStorage('_mf_last_act', lastInteractionTime);
    }

    setInterval(function () {
        var now = Date.now();
        var dt = now - lastTickTime;
        lastTickTime = now;

        if (document.visibilityState === 'visible' && (now - lastInteractionTime < 40000)) {
            totalActiveTime += dt;
            sessionActiveTime += dt;
            setStorage('_mf_sat', sessionActiveTime);
            setStorage('_mf_last_act', now);
        }
    }, 1000);

    document.addEventListener('mousedown', updateActivity, true);
    document.addEventListener('keydown', updateActivity, true);
    document.addEventListener('scroll', updateActivity, { passive: true });
    // [FIX] Proper mousemove throttle: previous approach checked Date.now() inside the callback
    // but the callback itself still fired hundreds of times/sec (expensive CPU on every mousemove).
    // Using a flag blocks execution at the listener level itself — far more efficient.
    var mouseMoveThrottled = false;
    document.addEventListener('mousemove', function () {
        if (mouseMoveThrottled) return;
        mouseMoveThrottled = true;
        updateActivity();
        setTimeout(function () { mouseMoveThrottled = false; }, 2000);
    }, { passive: true });

    function persistIdentity() {
        setStorage('_mf_identity', JSON.stringify({
            email: identifiedData.email,
            phone: identifiedData.phone,
            firstName: identifiedData.firstName,
            lastName: identifiedData.lastName,
            avatar: identifiedData.avatar,
            priority: identifiedData.priority,
            ts: Date.now()
        }));
    }

    // --- CLICK TRACKING ---
    function isLikelyCode(text) {
        if (!text || text.length < 5) return false;
        var t = text.trim();
        if (/^(document\.|window\.|console\.|function\s*\(|var\s+|const\s+|let\s+|class\s+|import\s+|export\s+|if\s*\(|for\s*\(|while\s*\(|switch\s*\(|return\s+|try\s*\{|catch\s*\(|throw\s+|await\s+)/.test(t)) return true;
        if (t.indexOf('{') !== -1 && t.indexOf('}') !== -1 && t.indexOf(';') !== -1) return true;
        return false;
    }

    function findMeaningfulText(el, level) {
        if (!el || level > 3) return '';
        var tag = el.tagName ? el.tagName.toUpperCase() : '';
        if (['SCRIPT', 'STYLE', 'PRE', 'CODE', 'NOSCRIPT', 'SVG'].indexOf(tag) !== -1) return '';

        var attr = el.getAttribute('aria-label') || el.title || el.placeholder || el.alt || (el.tagName === 'INPUT' ? el.value : '') || '';
        if (attr.trim() && !isLikelyCode(attr)) return attr.trim();

        for (var i = 0; i < el.childNodes.length; i++) {
            var node = el.childNodes[i];
            if (node.nodeType === 3 && node.textContent.trim()) {
                var txt = node.textContent.trim();
                if (txt.length > 1 && !isLikelyCode(txt)) return txt;
            }
        }

        // SVG Handling moved to tag check above or generic recursive

        for (var j = 0; j < el.children.length; j++) {
            var childText = findMeaningfulText(el.children[j], level + 1);
            if (childText) return childText;
        }
        return '';
    }

    function discoverClickText(target) {
        if (!target) return '';

        // 1. Chiến thuật ưu tiên: Tìm văn bản có ý nghĩa (label, title, direct text)
        var text = findMeaningfulText(target, 0);
        if (text) return text.trim();

        // 2. Chiến thuật fallback: Lấy innerText của chính nó nếu ngắn gọn
        var inner = (target.innerText || '').trim();
        if (inner && inner.length > 0 && inner.length < 100 && !isLikelyCode(inner)) return inner;

        // 3. Chiến thuật 'Leo thang': Tìm ở các cấp cha gần nhất
        var el = target.parentElement;
        var upLevel = 0;
        while (el && upLevel < 5 && el.tagName !== 'BODY' && el.tagName !== 'HTML') {
            // Thử tìm meaningful text ở cấp cha
            var pText = findMeaningfulText(el, 0);
            if (pText) return pText.trim();

            // Hoặc lấy innerText dòng đầu tiên của cấp cha
            var pInner = (el.innerText || '').split('\n')[0].trim();
            if (pInner && pInner.length > 1 && pInner.length < 80 && !isLikelyCode(pInner)) return pInner;

            el = el.parentElement;
            upLevel++;
        }
        return '';
    }

    function getSelector(el) {
        if (el.id) return '#' + el.id;
        if (el.className && typeof el.className === 'string' && el.className.trim()) return '.' + el.className.trim().split(/\s+/).join('.');
        return el.tagName.toLowerCase();
    }

    var lastClickData = { text: '', selector: '', ts: 0 };
    var hadSelectionOnMousedown = false;

    // --- MODAL CLOSE DETECTION ---
    // Returns true if the click target is a modal close/dismiss action
    function isModalCloseAction(target, trackedText) {
        if (!target) return false;

        // 1. Skip clicks on modal backdrop overlay (fixed inset-0 / z-index overlay)
        //    Typically a div covering the full screen behind the modal panel
        var el = target;
        if (el.tagName === 'DIV') {
            var style = window.getComputedStyle(el);
            if (style.position === 'fixed' && style.zIndex && parseInt(style.zIndex) >= 100) {
                // Check if it takes most of the screen (backdrop)
                if (el.offsetWidth > window.innerWidth * 0.8 && el.offsetHeight > window.innerHeight * 0.8) {
                    return true;
                }
            }
        }

        // 2. Skip if text is 'undefined', empty, or clearly a close action
        if (!trackedText || trackedText === 'undefined' || trackedText === 'Unknown Click') {
            // Only skip if inside/near a modal-like container (high z-index fixed element)
            var ancestor = el.closest('[class*="fixed"], [class*="modal"], [class*="dialog"], [class*="overlay"]');
            if (ancestor) return true;
        }

        // 3. Skip close (X icon) buttons in modals — button with no text or SVG-only content
        //    that is a sibling/neighbor of a heading inside a fixed overlay
        if (el.tagName === 'BUTTON' || (el.closest && el.closest('button'))) {
            var btn = el.tagName === 'BUTTON' ? el : el.closest('button');
            if (btn) {
                // Check if button is inside a fixed/modal container
                var modalParent = btn.closest('[class*="fixed"], [class*="modal"], [class*="dialog"]');
                if (modalParent) {
                    var btnText = (btn.innerText || btn.textContent || '').trim().toLowerCase();
                    // Close / Cancel / Dismiss labels (Vietnamese + English)
                    var closeLabels = ['hủy', 'huỷ', 'đóng', 'cancel', 'close', 'dismiss', 'thoát', 'quay lại', 'back'];
                    for (var ci = 0; ci < closeLabels.length; ci++) {
                        if (btnText === closeLabels[ci]) return true;
                    }
                    // Button has no meaningful text (X icon only)
                    if (!btnText || btnText.length === 0) return true;
                    // Button text is a single character (like × or X)
                    if (btnText.length <= 1) return true;
                }
            }
        }

        return false;
    }

    document.addEventListener('mousedown', function (e) {
        if (isInsideChat(e.target)) return;
        var sel = window.getSelection();
        hadSelectionOnMousedown = (sel && sel.toString().length > 0);
    }, true);

    document.addEventListener('click', function (e) {
        var selection = window.getSelection();
        if (selection && selection.toString().length > 0) return;

        var target = e.target;

        // IGNORE CHAT WIDGET INTERACTION
        if (isInsideChat(target)) {
            return;
        }

        var element = target.closest('a, button, input[type="submit"], [role="button"], .trackable');
        var trackedText = discoverClickText(element || target);
        var trackedTag = element ? element.tagName.toLowerCase() : target.tagName.toLowerCase();

        if (trackedText.length > 70) trackedText = trackedText.substring(0, 70) + '.....';
        if (!trackedText) trackedText = 'Unknown Click';

        // IGNORE MODAL CLOSE ACTIONS (backdrop click, X button, Hủy/Đóng buttons)
        if (isModalCloseAction(element || target, trackedText)) {
            return;
        }

        // IGNORE 'undefined' and 'Unknown Click' targets — no analytics value
        if (trackedText === 'undefined' || trackedText === 'Unknown Click') {
            return;
        }

        var selector = getSelector(element || target);
        var now = Date.now();

        // 4. DEDUPLICATION: Ignore identical clicks within 1000ms (Double-click / Rage-click prevention)
        if (trackedText === lastClickData.text && selector === lastClickData.selector && (now - lastClickData.ts < 1000)) {
            return;
        }
        lastClickData = { text: trackedText, selector: selector, ts: now };

        var meta = {
            x: e.pageX, y: e.pageY,
            vw: window.innerWidth, vh: window.innerHeight,
            path: window.location.pathname,
            tag: trackedTag,
            text: trackedText,
            selector: selector
        };

        if (element) {
            meta.href = element.href || null;
            meta.id = element.id || null;
            track('click', meta);
        } else {
            if (hadSelectionOnMousedown) return;
            track('canvas_click', meta);
        }
        updateActivity();
    }, true);

    // --- COPY & SELECT TRACKING ---
    document.addEventListener('copy', function () {
        var sel = window.getSelection();
        if (isInsideChat(sel.anchorNode)) return;

        var selectedText = sel.toString();
        if (selectedText.length > 0) {
            track('copy', {
                text: selectedText.length > 70 ? selectedText.substring(0, 70) + '.....' : selectedText,
                length: selectedText.length,
                path: window.location.pathname
            });
            updateActivity();
        }
    });

    var selectTimer = null;
    document.addEventListener('selectionchange', function () {
        clearTimeout(selectTimer);
        selectTimer = setTimeout(function () {
            var sel = window.getSelection();
            if (isInsideChat(sel.anchorNode)) return;

            var selectedText = sel.toString();
            if (selectedText.length > 10) { // Only track meaningful selections
                track('select', {
                    text: selectedText.substring(0, 70) + (selectedText.length > 70 ? '.....' : ''),
                    path: window.location.pathname
                });
                updateActivity();
            }
        }, 3000); // 3s debounce for selection
    });

    // --- AUTO TRACKING ---
    function trackPageView() {
        totalActiveTime = 0;
        maxScroll = 0;
        lastSentScroll = 0;

        // Measure Load Time (Initial Page Load focus)
        var loadTime = 0;
        try {
            if (window.performance) {
                var perf = performance.getEntriesByType('navigation')[0];
                if (perf) {
                    loadTime = Math.round(perf.duration);
                } else if (performance.timing) {
                    loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
                }
                // Fallback: If above are 0 (script executed too early), use performance.now()
                if (loadTime <= 0) loadTime = Math.round(performance.now());
            }
        } catch (e) { }

        // Wait for DOM to be ready for meaningful title
        var retry = 0;
        function send() {
            var title = document.title;
            if (!title && retry < 5) { retry++; setTimeout(send, 500); return; }
            track('pageview', {
                url: window.location.href,
                title: title || h1Fallback() || 'Untitled',
                referrer: document.referrer,
                source: getTrafficSource(),
                load_time: loadTime
            });
        }
        send();
    }

    function h1Fallback() {
        var h1 = document.querySelector('h1');
        return h1 ? h1.innerText.trim() : null;
    }

    // SPA Support
    var lastUrl = window.location.href;
    var checkUrl = function () {
        if (window.location.href !== lastUrl) {
            lastUrl = window.location.href;
            trackPageView();
        }
    };
    window.addEventListener('popstate', checkUrl);
    ['pushState', 'replaceState'].forEach(function (m) {
        var orig = history[m];
        history[m] = function () {
            orig.apply(this, arguments);
            // [FIX] SPA Title Bug: React/Vue Router updates document.title AFTER pushState.
            // Calling checkUrl() synchronously captures the OLD title from the previous page.
            // setTimeout 100ms gives the framework enough time to render and update <title>.
            setTimeout(checkUrl, 100);
        };
    });

    // --- IDENTIFICATION LOGIC ---
    var emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;

    function isValidEmailDomain(email) {
        if (!email) return false;
        var domain = email.split('@')[1];
        if (!domain) return false;

        // Exclude common test/fake domains
        var testDomains = ['example.com', 'test.com', 'localhost', 'domain.com', 'email.com', 'sample.com'];
        return testDomains.indexOf(domain.toLowerCase()) === -1;
    }

    function validateEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
    function isPassiveBlacklisted(email) {
        if (!email) return false;
        var e = email.toLowerCase();

        // Skip generic labels/values if they were accidentally matched
        if (e === 'new visitor' || e === 'form lead') return true;

        // Skip common system/support emails during passive scanning (DOM/Storage)
        var blacklisted = ['info@', 'support@', 'contact@', 'admin@', 'sales@', 'hello@', 'noreply@', 'no-reply@', 'hi@', 'marketing@', 'team@', 'help@'];
        for (var i = 0; i < blacklisted.length; i++) {
            if (e.indexOf(blacklisted[i]) === 0) return true;
        }

        // Also check if it's a valid domain
        if (!isValidEmailDomain(e)) return true;

        return false;
    }

    function validatePhone(phone) {
        var d = (phone || '').replace(/\D/g, '');
        return /^0\d{9,10}$/.test(d);
    }

    // EXPOSE IDENTIFICATION API
    window._mfIdentify = function (email, phone, extra) {
        attemptIdentify(email, phone, 10, extra || {});
    };

    function attemptIdentify(email, phone, priority, extra) {
        priority = priority || 0;
        if (identifiedData.priority >= 10 && priority < 10) return;

        // Shared device rotation
        if (priority >= 10 && identifiedData.email && email && identifiedData.email !== email) {
            visitorId = generateUUID();
            setStorage('_mf_vid', visitorId);
        }

        var changed = false;
        if (email && validateEmail(email) && (email !== identifiedData.email || priority > identifiedData.priority)) {
            identifiedData.email = email;
            changed = true;
        }
        if (phone && validatePhone(phone) && (phone !== identifiedData.phone || priority > identifiedData.priority)) {
            identifiedData.phone = phone;
            changed = true;
        }

        // Handle extra fields (Name, Address, etc.)
        if (extra && typeof extra === 'object') {
            for (var key in extra) {
                if (extra[key] && extra[key] !== identifiedData[key]) {
                    identifiedData[key] = extra[key];
                    changed = true;
                }
            }
        }

        if (changed) {
            identifiedData.priority = Math.max(identifiedData.priority, priority);
            persistIdentity();
            var payload = { priority: identifiedData.priority };
            for (var k in identifiedData) {
                if (identifiedData[k] !== null && k !== 'priority') payload[k] = identifiedData[k];
            }
            track('identify', payload);

            // LOG AS JOURNEY EVENT (Lead Capture)
            var captureDetails = [];
            if (email) captureDetails.push('Email: ' + email);
            if (phone) captureDetails.push('SĐT: ' + phone);
            if (captureDetails.length > 0) {
                track('lead_capture', {
                    text: 'Để lại thông tin: ' + captureDetails.join(', '),
                    path: window.location.pathname
                });
            }

            if (priority >= 1) flush();
        }
    }

    window._mfIdentify = function (email, phone) { attemptIdentify(email, phone, 10); };

    function scanInputs() {
        if (identifiedData.priority >= 10) return;
        var inputs = document.querySelectorAll('input, select, textarea');
        var foundEmail = null, foundPhone = null, extra = {};

        for (var i = 0; i < inputs.length; i++) {
            var el = inputs[i];
            if (isInsideChat(el)) continue;

            var val = (el.value || '').trim();
            if (!val || val.length < 2) continue;

            var name = (el.name || el.id || el.placeholder || '').toLowerCase();
            var type = (el.type || '').toLowerCase();

            if ((type === 'email' || name.includes('email')) && validateEmail(val)) {
                foundEmail = val;
            } else if ((type === 'tel' || name.includes('phone') || name.includes('tel') || name.includes('sdt') || name.includes('dienthoai'))) {
                if (validatePhone(val)) foundPhone = val;
            } else if (name.includes('firstname') || name.includes('ten')) {
                if (val.length > 1) extra.firstName = val;
            } else if (name.includes('lastname') || name.includes('ho')) {
                if (val.length > 1) extra.lastName = val;
            } else if (name.includes('name') || name.includes('target') || name.includes('hoten')) {
                if (val.length > 3) {
                    if (val.indexOf(' ') !== -1) {
                        extra.firstName = val.split(' ')[0];
                        extra.lastName = val.split(' ').slice(1).join(' ');
                    } else {
                        extra.firstName = val;
                    }
                }
            } else if (name.includes('address') || name.includes('diachi')) {
                extra.address = val;
            } else if (name.includes('city') || name.includes('tinh') || name.includes('thanhpho')) {
                extra.city = val;
            }
        }

        if (foundEmail || foundPhone || Object.keys(extra).length > 0) {
            attemptIdentify(foundEmail, foundPhone, 1, extra);
        }
    }

    // Efficient Input & Autofill Listener
    var inputTimer = null;
    function handleInputEvent() {
        clearTimeout(inputTimer);
        inputTimer = setTimeout(scanInputs, 1000);
    }

    document.addEventListener('input', handleInputEvent, true);
    document.addEventListener('change', handleInputEvent, true);

    document.addEventListener('submit', function (e) {
        scanInputs(); // Final scan on submit
        var f = e.target;
        // [FIX] CSS Selector case-insensitivity: input[name*="email"] only matches lowercase 'email'.
        // Adding the 'i' flag (CSS Selectors Level 4) makes it match UserEmail, EMAIL, etc.
        // Also added input[name*="mail" i] to catch newsletter/mailchimp naming conventions.
        var em = f.querySelector('input[type="email"], input[name*="email" i], input[name*="mail" i]');
        var ph = f.querySelector('input[type="tel"], input[name*="phone" i], input[name*="tel" i], input[name*="sdt" i]');
        if (em || ph) attemptIdentify(em ? em.value : null, ph ? ph.value : null, 10);
    });

    // --- PASSIVE SCANNERS (LOAD REDUCED) ---
    function runAllScanners() {
        if (identifiedData.priority >= 10 || scanPending) return;
        scanPending = true;

        var work = function () {
            // ONLY SCAN INPUTS - Reduced noise as requested
            // scanStorage(); // Removed
            // scanDOM();     // Removed
            scanInputs();
            scanPending = false;
        };

        if (typeof window.requestIdleCallback === 'function') {
            window.requestIdleCallback(work, { timeout: config.idleTimeout });
        } else {
            setTimeout(work, 1000);
        }
    }

    function scanStorage() {
        var found = [];
        var seen = {};
        try {
            [localStorage, sessionStorage].forEach(function (s) {
                for (var i = 0; i < s.length; i++) {
                    var key = s.key(i);
                    // Skip our own tracker keys
                    if (key && key.indexOf('_mf_') === 0) continue;

                    var v = s.getItem(key);
                    if (v && v.length < 2000 && v.length > 5) {
                        var m = v.match(emailRegex);
                        if (m) m.forEach(function (e) {
                            var em = e.toLowerCase();
                            if (!seen[em] && validateEmail(em) && !isPassiveBlacklisted(em)) {
                                found.push(em);
                                seen[em] = true;
                            }
                        });
                    }
                }
            });
            var m = document.cookie.match(emailRegex);
            if (m) m.forEach(function (e) {
                var em = e.toLowerCase();
                if (!seen[em] && validateEmail(em) && !isPassiveBlacklisted(em)) {
                    found.push(em);
                    seen[em] = true;
                }
            });
        } catch (e) { }
        if (found.length) attemptIdentify(found[0], null, 0);
    }

    function scanDOM() {
        var body = document.body;
        if (!body) return;

        // Clone and remove script/style tags to avoid false positives
        var clone = body.cloneNode(true);
        var scripts = clone.querySelectorAll('script, style, noscript');
        for (var i = 0; i < scripts.length; i++) {
            scripts[i].remove();
        }

        var text = clone.innerText || clone.textContent || '';
        var m = text.match(emailRegex);
        if (m) {
            var seen = {};
            for (var i = 0; i < m.length; i++) {
                var email = m[i].toLowerCase();
                if (!seen[email] && validateEmail(email) && !isPassiveBlacklisted(email)) {
                    attemptIdentify(email, null, 0);
                    seen[email] = true;
                    break; // Only take the first valid one
                }
            }
        }
    }

    // --- PERFORMANCE & RELIABILITY ---
    function sendPing(isExit) {
        if (document.visibilityState === 'hidden' && !isExit) return;
        var d = {
            duration: Math.floor(sessionActiveTime / 1000),
            page_time: Math.floor(totalActiveTime / 1000),
            max_scroll: maxScroll,
            is_exit: !!isExit
        };
        if (isExit && navigator.sendBeacon) {
            var payload = { property_id: config.propertyId, visitor_id: visitorId, events: [{ type: 'ping', data: d, timestamp: Date.now() }] };
            navigator.sendBeacon(config.endpoint, new Blob([JSON.stringify(payload)], { type: 'application/json' }));
        } else {
            track('ping', d);
        }
    }

    // Event Listeners
    var lastSentScroll = 0;
    window.addEventListener('scroll', function (e) {
        // IGNORE IF SCROLL STARTED INSIDE CHAT WIDGET
        if (isInsideChat(e.target)) {
            return;
        }

        var target = e.target;
        if (target === document) target = document.documentElement;
        
        var clientHeight = target.clientHeight || window.innerHeight;
        // Ignore tiny scrollable elements (like textareas, small dropdown lists)
        if (clientHeight < window.innerHeight * 0.5) return;

        var scrollHeight = target.scrollHeight - clientHeight;
        if (scrollHeight <= 10) return;

        var scrollTop = target.scrollTop || window.scrollY || window.pageYOffset || 0;
        var p = Math.round((scrollTop / scrollHeight) * 100);
        
        if (p < 0) p = 0;
        if (p > 100) p = 100;

        if (p > maxScroll) maxScroll = p;

        // Chỉ gửi nếu phần trăm HIỆN TẠI cao hơn phần trăm cao nhất đã gửi VÀ cách nhau ít nhất 10%
        // Hoặc gửi cột mốc quan trọng (25, 50, 75, 100)
        if (p >= lastSentScroll + 10 || (p >= 25 && lastSentScroll < 25) || (p >= 50 && lastSentScroll < 50) || (p >= 75 && lastSentScroll < 75) || (p === 100 && lastSentScroll < 100)) {
            lastSentScroll = Math.floor(p / 10) * 10; // Làm tròn xuống để giảm số lượng bản ghi
            if (p >= 100) lastSentScroll = 100;

            track('scroll', {
                percent: p,
                path: window.location.pathname,
                title: document.title,
                page_time: Math.floor(totalActiveTime / 1000),
                duration: Math.floor(sessionActiveTime / 1000)
            });
        }
    }, { passive: true, capture: true });

    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') {
            flush(true);
        } else {
            lastTickTime = Date.now();
        }
    });

    window.addEventListener('pagehide', function () { sendPing(true); flush(true); });

    // Initialization
    loadQueue();
    var cached = getStorage('_mf_identity');
    if (cached) {
        try {
            var p = JSON.parse(cached);
            identifiedData = Object.assign(identifiedData, p);
            track('identify', { email: p.email, phone: p.phone, is_cached: true, priority: p.priority });
        } catch (e) { }
    }

    // --- EMAIL CAMPAIGN TRACKING ---
    // Auto-identify from URL parameter (e.g., ?email=user@example.com from email campaigns)
    (function checkEmailParam() {
        try {
            var params = new URLSearchParams(window.location.search);
            var emailParam = params.get('email') || params.get('e') || params.get('subscriber_email');

            if (emailParam && validateEmail(emailParam)) {
                // High priority (10) because this is from a verified email campaign
                attemptIdentify(emailParam, null, 10, { source: 'email_campaign' });

                // Clean URL to remove email parameter for privacy (immediately)
                params.delete('email');
                params.delete('e');
                params.delete('subscriber_email');

                var newSearch = params.toString();
                var cleanUrl = window.location.pathname + (newSearch ? '?' + newSearch : '') + window.location.hash;
                history.replaceState({}, document.title, cleanUrl);
            }
        } catch (e) {
            // Silent fail if URL parsing fails
        }
    })();

    trackPageView();

    // Low-frequency polling
    setInterval(runAllScanners, config.passivePollInterval);
    setInterval(function () { if (document.visibilityState === 'visible') sendPing(false); }, config.heartbeat);
    setInterval(flush, config.batchInterval);

    // Mutation Observer (Throttled)
    var mutTimer = null;
    var observer = new MutationObserver(function () {
        clearTimeout(mutTimer);
        mutTimer = setTimeout(runAllScanners, 2000);
    });
    observer.observe(document, { childList: true, subtree: true });

})();
