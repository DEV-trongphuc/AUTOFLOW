
(function (window, document, endpoint, propertyId) {
    'use strict';

    // SINGLETON GUARD
    if (window._mfTrackerLoaded) {
        console.warn('MailFlow Tracker: Already loaded');
        return;
    }
    
    // BOT & CRAWLER PROTECTION
    var botRegex = /bot|crawler|spider|crawling|headless|lighthouse|slurp|facebookexternalhit|whatsapp|telegram|discordbot|google|bing|yahoo|duckduckbot|baiduspider|yandex|qwant|sogou|curl|wget/i;
    if (botRegex.test(navigator.userAgent || '') || navigator.webdriver) {
        window._mfTrackerLoaded = true;
        console.warn('MailFlow Tracker: Bot/Crawler detected. Tracking disabled to prevent 0s noise.');
        return;
    }
    
    window._mfTrackerLoaded = true;

    var CONFIG = {
        endpoint: endpoint,
        propertyId: propertyId,
        heartbeat: 10000,
        batchInterval: 3000
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

    // --- STATE ---
    var visitorId = getStorage('_mf_vid');
    if (!visitorId) {
        visitorId = generateUUID();
        setStorage('_mf_vid', visitorId);
    }
    var sessionStart = Date.now();
    var eventQueue = [];
    var isProcessing = false;
    var maxScroll = 0;
    var totalActiveTime = 0;
    var lastVisibleResume = Date.now();
    var lastPing = 0;

    // --- DETECTION ---
    function detectOS() {
        var ua = navigator.userAgent;
        if (/Windows/.test(ua)) return 'Windows';
        if (/Macintosh/.test(ua)) return 'macOS';
        if (/Linux/.test(ua)) return 'Linux';
        if (/Android/.test(ua)) return 'Android';
        if (/iOS|iPhone|iPad/.test(ua)) return 'iOS';
        return 'Unknown';
    }

    function detectBrowser() {
        var ua = navigator.userAgent;
        if (/Chrome/.test(ua) && !/Edge|OPR/.test(ua)) return 'Chrome';
        if (/Safari/.test(ua) && !/Chrome/.test(ua)) return 'Safari';
        if (/Firefox/.test(ua)) return 'Firefox';
        if (/Edge/.test(ua)) return 'Edge';
        if (/OPR/.test(ua)) return 'Opera';
        return 'Unknown';
    }

    // --- COLLECTOR ---
    function track(type, data) {
        eventQueue.push({ type: type, data: data || {}, timestamp: Date.now() });
        saveQueue();
        if (type === 'identify' || type === 'pageview' || eventQueue.length >= 5) flush();
    }

    function saveQueue() { setStorage('_mf_queue', JSON.stringify(eventQueue)); }
    function loadQueue() {
        var q = getStorage('_mf_queue');
        if (q) { try { var items = JSON.parse(q); if (Array.isArray(items)) eventQueue = items.concat(eventQueue); } catch (e) { } }
    }

    function flush(isUnload) {
        if (eventQueue.length === 0 || (isProcessing && !isUnload) || !navigator.onLine) return;
        isProcessing = true;

        var batchSize = isUnload ? 20 : 10;
        var batch = eventQueue.slice(0, batchSize);
        var payload = {
            property_id: CONFIG.propertyId,
            visitor_id: visitorId,
            device_info: {
                ua: navigator.userAgent,
                screen: window.screen.width + 'x' + window.screen.height,
                lang: navigator.language,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                os: detectOS(),
                browser: detectBrowser()
            },
            events: batch
        };
        var data = JSON.stringify(payload);

        if (isUnload && navigator.sendBeacon) {
            var blob = new Blob([data], { type: 'application/json' });
            navigator.sendBeacon(CONFIG.endpoint, blob);
            eventQueue.splice(0, batch.length);
            saveQueue();
            isProcessing = false;
            return;
        }

        var xhr = new XMLHttpRequest();
        xhr.open('POST', CONFIG.endpoint, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                isProcessing = false;
                if (xhr.status >= 200 && xhr.status < 300) {
                    eventQueue.splice(0, batch.length);
                    saveQueue();
                    if (eventQueue.length > 0) setTimeout(function () { flush(false); }, 1000);
                } else { console.warn('Tracker Sync Failed', xhr.status); }
            }
        };
        xhr.send(data);
    }

    // Reliability: Flush on visibility hidden (tab switch/minimize) or unload
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') flush(true);
    });
    window.addEventListener('pagehide', function () { flush(true); });

    // --- AUTO TRACKING ---
    function trackPageView() {
        totalActiveTime = 0;
        lastVisibleResume = Date.now();
        maxScroll = 0;
        var currentUrl = window.location.href;
        var retryCount = 0;
        var maxRetries = 10; // Try for 5 seconds (500ms * 10)

        function getAndTrack() {
            var pageTitle = document.title;
            var h1 = document.querySelector('h1');
            var h1Text = h1 && h1.innerText ? h1.innerText.trim() : '';

            // Flexible Title Logic: 
            // If document.title is empty or looks like a URL/Link, try to use H1 text
            var isUrl = /^(https?:\/\/|www\.)/i.test(pageTitle);
            if ((isUrl || !pageTitle) && h1Text) {
                pageTitle = h1Text;
            }

            // If still empty and we have retries left, wait and try again
            if (!pageTitle && retryCount < maxRetries) {
                retryCount++;
                setTimeout(getAndTrack, 500);
                return;
            }

            // If completely empty after retries, use a placeholder or part of URL
            if (!pageTitle) {
                var path = window.location.pathname;
                pageTitle = path === '/' ? 'Home' : path.split('/').pop().replace(/[-_]/g, ' ') || 'Untitled';
            }

            track('pageview', {
                url: currentUrl,
                title: pageTitle,
                referrer: document.referrer,
                source: getTrafficSource()
            });
        }

        getAndTrack();
    }

    // Initial load
    trackPageView();

    // SPA Route Change Detection
    var lastUrl = window.location.href;

    // Listen for popstate (back/forward)
    window.addEventListener('popstate', function () {
        if (window.location.href !== lastUrl) {
            lastUrl = window.location.href;
            trackPageView();
        }
    });

    // Override pushState and replaceState to catch client-side routing
    var originalPushState = history.pushState;
    history.pushState = function () {
        originalPushState.apply(this, arguments);
        if (window.location.href !== lastUrl) {
            lastUrl = window.location.href;
            trackPageView();
        }
    };

    var originalReplaceState = history.replaceState;
    history.replaceState = function () {
        originalReplaceState.apply(this, arguments);
        if (window.location.href !== lastUrl) {
            lastUrl = window.location.href;
            trackPageView();
        }
    };

    // --- CLICK TRACKING ---
    function findMeaningfulText(el, level) {
        if (!el || level > 3) return '';

        // 0. Explicit tracking label (highest priority — set by marketer)
        // Allows: <button data-track-name="Register Now">...</button>
        var trackName = el.getAttribute('data-track-name') || el.getAttribute('data-track') || '';
        if (trackName.trim()) return trackName.trim();

        // 1. Attributes
        var attr = el.getAttribute('aria-label') || el.title || el.placeholder || el.alt || (el.tagName === 'INPUT' ? el.value : '') || '';
        if (attr.trim()) return attr.trim();

        // 2. Direct Text Nodes
        for (var i = 0; i < el.childNodes.length; i++) {
            var node = el.childNodes[i];
            if (node.nodeType === 3 && node.textContent.trim()) {
                var txt = node.textContent.trim();
                if (txt.length > 1) return txt;
            }
        }

        // 3. SVG Titles
        if (el.tagName.toLowerCase() === 'svg') {
            var title = el.querySelector('title');
            if (title && title.textContent) return title.textContent.trim();
        }

        // 4. Children
        for (var j = 0; j < el.children.length; j++) {
            var childText = findMeaningfulText(el.children[j], level + 1);
            if (childText) return childText;
        }

        return '';
    }

    function discoverClickText(target) {
        var el = target;
        var upLevel = 0;
        var maxUp = 5;

        // Strategy: 
        // 1. Check current element and its children (via findMeaningfulText)
        // 2. If nothing found, check immediate siblings (common for labels next to icons)
        // 3. If still nothing, move up to parent and repeat

        while (el && upLevel < maxUp && el.tagName !== 'BODY' && el.tagName !== 'HTML') {
            // Check self and children
            var text = findMeaningfulText(el, 0);
            if (text && text.length > 1 && text.length < 200) return text.trim();

            // Check immediate siblings (only for original target or 1st level parent)
            if (upLevel <= 1) {
                var prev = el.previousElementSibling;
                if (prev) {
                    var pText = findMeaningfulText(prev, 1);
                    if (pText && pText.length > 1 && pText.length < 100) return pText.trim() + ' (near)';
                }
                var next = el.nextElementSibling;
                if (next) {
                    var nText = findMeaningfulText(next, 1);
                    if (nText && nText.length > 1 && nText.length < 100) return nText.trim() + ' (near)';
                }
            }

            el = el.parentElement;
            upLevel++;
        }
        return '';
    }

    // Improved Click Listener
    document.addEventListener('click', function (e) {
        // Ignore clicks that are part of text selection (user is copying text)
        var selection = window.getSelection();
        if (selection && selection.toString().length > 0) {
            return; // User is selecting text, not clicking
        }

        var target = e.target;
        // Prioritize interactive elements, but also track containers with class 'trackable' or pointers
        var element = target.closest('a, button, input[type="submit"], [role="button"], [onclick], .trackable');

        // Fallback: If no interactive element found but target has pointer cursor, treat as click
        if (!element && target && target.tagName !== 'BODY') {
            try {
                var style = window.getComputedStyle(target);
                if (style && style.cursor === 'pointer') {
                    element = target;
                }
            } catch (err) {}
        }

        var meta = {
            x: e.pageX, y: e.pageY,
            vw: window.innerWidth, vh: window.innerHeight,
            path: window.location.pathname
        };

        // Strategy: 
        // Try to discover the most meaningful text by looking at children and parents
        var trackedText = discoverClickText(element || target);

        // Clean text
        var trackedTag = element ? element.tagName.toLowerCase() : target.tagName.toLowerCase();
        if (trackedText.length > 100) trackedText = trackedText.substring(0, 100) + '...';
        if (!trackedText) trackedText = 'Unknown Click';

        function getSelector(el) {
            if (el.id) return '#' + el.id;
            if (el.className && typeof el.className === 'string' && el.className.trim()) return '.' + el.className.trim().split(/\s+/).join('.');
            return el.tagName.toLowerCase();
        }

        if (element) {
            track('click', {
                tag: element.tagName,
                text: trackedText,
                href: element.href || null,
                id: element.id || null,
                class: element.className || null,
                selector: getSelector(element),
                ...meta
            });
            // If it's a link, flush immediately to avoid missing data during fast navigation
            if (element.tagName === 'A') flush(true);
        } else {
            // For canvas clicks, try to gather surrounding context
            var contextTexts = [];

            // Try to get better text if we have "Unknown Click"
            if (!trackedText || trackedText === 'Unknown Click') {
                // 1. First try direct textContent from target
                var directText = (target.textContent || '').trim();
                if (directText && directText.length > 0 && directText.length < 200) {
                    trackedText = directText.substring(0, 100);
                }
            }

            // Collect context from siblings for additional info
            var parent = target.parentElement;
            if (parent) {
                var siblings = Array.from(parent.children);
                siblings.forEach(function (sibling) {
                    if (sibling !== target) {
                        var sibText = (sibling.textContent || '').trim();
                        if (sibText && sibText.length > 0 && sibText.length < 100) {
                            contextTexts.push(sibText.substring(0, 50));
                        }
                    }
                });
            }

            // Limit context to top 3 items, max 150 chars total
            var context = contextTexts.slice(0, 3).join(' | ').substring(0, 150);

            track('canvas_click', {
                ...meta,
                element: trackedTag,
                text: trackedText,
                context: context || null,
                classes: target.className || null,
                selector: getSelector(target)
            });
        }

    }, true);

    // --- SELECTION & COPY TRACKING ---
    document.addEventListener('copy', function () {
        var selection = window.getSelection().toString().trim();
        if (selection && selection.length > 0) {
            track('copy', {
                text: selection.substring(0, 500),
                path: window.location.pathname
            });
            flush(true); // Important to catch before they might leave
        }
    });

    var selectionTimer = null;
    document.addEventListener('mouseup', function () {
        // Use mouseup because selectionchange fires too frequently during typing/dragging
        clearTimeout(selectionTimer);
        selectionTimer = setTimeout(function () {
            var selection = window.getSelection().toString().trim();
            if (selection.length > 3) {
                track('select', {
                    text: selection.substring(0, 300),
                    path: window.location.pathname
                });
            }
        }, 1500);
    });

    // --- OTHER LISTENERS ---
    var scrollTimer = null;
    document.addEventListener('scroll', function () {
        if (scrollTimer) return;
        scrollTimer = setTimeout(function () {
            var p = Math.round((window.scrollY + window.innerHeight) / document.body.scrollHeight * 100);
            if (p > maxScroll) {
                maxScroll = p;
                if ([25, 50, 75, 90].some(function (m) { return maxScroll >= m && maxScroll < m + 5; })) track('scroll', { depth: maxScroll });
            }
            scrollTimer = null;
        }, 500);
    });

    // --- AGGRESSIVE INPUT TRACKING ---
    // Track email/phone as soon as user types valid data
    // Priority: 1 (Interaction/Form), 0 (Passive Scan)
    var identifiedData = { email: null, phone: null, priority: -1 };
    var identifyTimer = null;

    function validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function validatePhone(phone) {
        // Vietnamese phone: 10-11 digits, starts with 0
        var cleaned = (phone || '').replace(/[\s\-\(\)]/g, '');
        return /^0\d{9,10}$/.test(cleaned);
    }

    function attemptIdentify(email, phone, priority) {
        priority = priority || 0;
        var hasNew = false;
        var data = {};

        // If current data is from high priority, ignore low priority updates
        if (priority < identifiedData.priority) return;

        // Update stored values if new valid data OR higher priority
        if (email && validateEmail(email) && (email !== identifiedData.email || priority > identifiedData.priority)) {
            identifiedData.email = email;
            hasNew = true;
        }

        if (phone && validatePhone(phone) && (phone !== identifiedData.phone || priority > identifiedData.priority)) {
            identifiedData.phone = phone;
            hasNew = true;
        }

        if (hasNew) {
            identifiedData.priority = priority;
            if (identifiedData.email) data.email = identifiedData.email;
            if (identifiedData.phone) data.phone = identifiedData.phone;

            if (Object.keys(data).length > 0) {
                track('identify', data);
            }
        }
    }

    // Listen to ALL input fields for email/phone
    document.addEventListener('input', function (e) {
        var input = e.target;
        if (input.tagName !== 'INPUT') return;

        var type = input.type;
        var name = (input.name || '').toLowerCase();
        var value = (input.value || '').trim();

        if (!value) return;

        // Debounce to avoid too many requests
        clearTimeout(identifyTimer);
        identifyTimer = setTimeout(function () {
            var email = null;
            var phone = null;

            if (type === 'email' || name.includes('email') || name.includes('mail')) {
                if (validateEmail(value)) email = value;
            }

            if (type === 'tel' || name.includes('phone') || name.includes('tel') || name.includes('mobile')) {
                if (validatePhone(value)) phone = value;
            }

            if (email || phone) attemptIdentify(email, phone, 1); // High priority
        }, 1000);
    }, true);

    document.addEventListener('change', function (e) {
        var input = e.target;
        if (input.tagName !== 'INPUT') return;

        var type = input.type;
        var name = (input.name || '').toLowerCase();
        var value = (input.value || '').trim();

        if (!value) return;

        var email = null;
        var phone = null;

        if (type === 'email' || name.includes('email') || name.includes('mail')) {
            if (validateEmail(value)) email = value;
        }

        if (type === 'tel' || name.includes('phone') || name.includes('tel') || name.includes('mobile')) {
            if (validatePhone(value)) phone = value;
        }

        if (email || phone) attemptIdentify(email, phone, 1); // High priority
    }, true);

    // --- DOM SCANNER FOR VISIBLE EMAIL/PHONE ---
    // Aggressive global scan
    function scanPageForIdentifiers() {
        var emailRegex = /\b[A-Za-z0-9._%+-]+@gmail\.com\b/g; // Phổ biến nhất
        var genericEmailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        var phoneRegex = /\b0\d{9,10}\b/g;

        var blacklistPrefixes = ['support@', 'info@', 'contact@', 'admin@', 'hello@', 'sale@', 'care@', 'noreply@'];
        var foundEmails = [];
        var foundPhones = [];

        // Walker quét TOÀN BỘ text node trong body
        var walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function (node) {
                    var parent = node.parentElement;
                    if (!parent) return NodeFilter.FILTER_REJECT;
                    var tag = parent.tagName;
                    // Chỉ bỏ qua các thẻ code/kỹ thuật
                    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME'].indexOf(tag) !== -1) return NodeFilter.FILTER_REJECT;
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        var node;
        while (node = walker.nextNode()) {
            processText(node.textContent);
            if (node.parentElement) {
                // Quét cả thuộc tính ẩn (nơi dev thường giấu data)
                ['title', 'aria-label', 'placeholder', 'value', 'data-user', 'data-email'].forEach(function (attr) {
                    var val = node.parentElement.getAttribute(attr);
                    if (val) processText(val);
                });
            }
        }

        function processText(str) {
            if (!str || typeof str !== 'string') return;
            // Ưu tiên quét Gmail trước, sau đó mới đến các email khác
            [emailRegex, genericEmailRegex].forEach(function (reg) {
                var matches = str.match(reg);
                if (matches) {
                    matches.forEach(function (em) {
                        em = em.toLowerCase();
                        var isBlacklisted = blacklistPrefixes.some(function (p) { return em.indexOf(p) === 0; });
                        if (!isBlacklisted && validateEmail(em) && foundEmails.indexOf(em) === -1) foundEmails.push(em);
                    });
                }
            });
            var phones = str.match(phoneRegex);
            if (phones) {
                phones.forEach(function (ph) {
                    if (validatePhone(ph) && foundPhones.indexOf(ph) === -1) foundPhones.push(ph);
                });
            }
        }

        if (foundEmails.length > 0 || foundPhones.length > 0) {
            attemptIdentify(foundEmails[0] || null, foundPhones[0] || null, 0);
        }
    }

    // --- STORAGE & COOKIE SCANNER ---
    // Quét sạch sẽ Cookie và Local/Session Storage
    function scanStorage() {
        var emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        var found = [];

        // 1. Web Storage
        [localStorage, sessionStorage].forEach(function (s) {
            try {
                for (var i = 0; i < s.length; i++) {
                    var k = s.key(i);
                    var v = s.getItem(k);
                    if (v && v.length < 1000) { // Chỉ quét nếu value không quá lớn (tránh lag)
                        var m = v.match(emailRegex);
                        if (m) m.forEach(function (em) { found.push(em.toLowerCase()); });
                    }
                }
            } catch (e) { }
        });

        // 2. Cookies
        try {
            var c = document.cookie;
            if (c) {
                var m = c.match(emailRegex);
                if (m) m.forEach(function (em) { found.push(em.toLowerCase()); });
            }
        } catch (e) { }

        if (found.length > 0) {
            found.forEach(function (em) {
                if (validateEmail(em)) attemptIdentify(em, null, 0);
            });
        }
    }

    // --- DEEP SCRIPT SCANNER ---
    function scanScripts() {
        var scripts = document.scripts;
        var emailRegex = /\b[A-Za-z0-9._%+-]+@gmail\.com\b/g;
        var foundEmails = [];

        for (var i = 0; i < scripts.length; i++) {
            var content = scripts[i].textContent;
            if (content && content.length > 0 && content.length < 50000) { // Limit size
                var matches = content.match(emailRegex);
                if (matches) {
                    matches.forEach(function (em) {
                        em = em.toLowerCase();
                        if (validateEmail(em) && foundEmails.indexOf(em) === -1) foundEmails.push(em);
                    });
                }
            }
        }
        if (foundEmails.length > 0) attemptIdentify(foundEmails[0], null, 0);
    }

    // Comprehensive Init
    function runAllScanners() {
        scanStorage();
        scanPageForIdentifiers();
        scanScripts();
    }

    // Scan on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            setTimeout(runAllScanners, 1000);
            setTimeout(runAllScanners, 3000); // Rescan later for dynamic apps
        });
    } else {
        runAllScanners();
        setTimeout(runAllScanners, 3000);
    }

    // Re-scan when DOM changes (e.g., Google login button appears)
    // [FIX] Target document.body instead of document to avoid observing <head> and
    // inline <script> mutations which fire relentlessly on dynamic dashboards.
    // Only watch childList (node additions) — attribute mutations are irrelevant for
    // email/phone detection and cause excessive callbacks on e-commerce sites.
    var scanTimer = null;
    var observer = new MutationObserver(function (mutations) {
        // [PERF] Only re-scan if actual DOM nodes were added (not attribute changes)
        var hasNodeAdditions = mutations.some(function (m) { return m.addedNodes.length > 0; });
        if (!hasNodeAdditions) return;
        clearTimeout(scanTimer);
        scanTimer = setTimeout(scanPageForIdentifiers, 3000); // Debounce 3s
    });

    // Observe body only — avoids head/script mutations & reduces callback frequency
    var observeTarget = document.body || document;
    observer.observe(observeTarget, {
        childList: true,
        subtree: true
        // No 'attributes: true' — attribute churn is the main perf killer on SPAs
    });

    // Keep original submit listener as backup
    document.addEventListener('submit', function (e) {
        var f = e.target;
        var em = f.querySelector('input[type="email"], input[name*="email"]');
        var ph = f.querySelector('input[type="tel"], input[name*="phone"]');
        var d = {};
        if (em && em.value) d.email = em.value;
        if (ph && ph.value) d.phone = ph.value;
        if (Object.keys(d).length) track('identify', d);
    });

    // Heartbeat
    function sendPing(isUnload) {
        // Don't ping if tab is hidden to avoid fake duration
        if (document.visibilityState === 'hidden' && !isUnload) return;

        if (Date.now() - lastPing < 1000 && !isUnload) return;
        lastPing = Date.now();

        var currentActive = totalActiveTime;
        if (document.visibilityState === 'visible') {
            currentActive += Date.now() - lastVisibleResume;
        }

        var d = {
            duration: Math.floor((Date.now() - sessionStart) / 1000),
            page_time: Math.floor(currentActive / 1000),
            max_scroll: maxScroll,
            is_exit: isUnload
        };
        if (isUnload && navigator.sendBeacon) {
            var payload = { property_id: CONFIG.propertyId, visitor_id: visitorId, events: [{ type: 'ping', data: d, timestamp: Date.now() }] };
            navigator.sendBeacon(CONFIG.endpoint, new Blob([JSON.stringify(payload)], { type: 'application/json' }));
        } else { track('ping', d); }
    }

    setInterval(function () { if (document.visibilityState === 'visible') sendPing(false); }, CONFIG.heartbeat);
    window.addEventListener('beforeunload', function () { sendPing(true); });

    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') {
            totalActiveTime += Date.now() - lastVisibleResume;
            sendPing(false);
        } else {
            lastVisibleResume = Date.now();
        }
    });

    loadQueue();
    setInterval(flush, CONFIG.batchInterval);

    // --- AI CHATBOT INJECTION ---
    if (window._mf_config && window._mf_config.ai_chat) {
        var chatScript = document.createElement('script');
        chatScript.src = 'https://automation.ideas.edu.vn/ai-chat-embedded.js';
        chatScript.async = true;
        document.head.appendChild(chatScript);
    }

})(window, document, 'https://automation.ideas.edu.vn/mail_api/track.php', (function(){ if(window._mf_config && window._mf_config.property_id) return window._mf_config.property_id; var c = document.currentScript; if(c && c.getAttribute('data-website-id')) return c.getAttribute('data-website-id'); var s = document.querySelector('script[data-website-id]'); if(s) return s.getAttribute('data-website-id'); return window._mf_property_id || null; })());



