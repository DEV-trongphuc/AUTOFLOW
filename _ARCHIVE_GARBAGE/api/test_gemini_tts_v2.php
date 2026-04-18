<?php
// public/test_gemini_tts_v2.php
// A test page for Gemini TTS with Parallel Buffering and PCM-to-WAV conversion.
?>
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gemini 2.5 TTS - Ultra Fast Stream</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Inter', sans-serif;
            background: #0f172a;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
        }

        .container {
            background: #1e293b;
            padding: 40px;
            border-radius: 32px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            width: 100%;
            max-width: 800px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        h1 {
            margin-bottom: 24px;
            font-size: 28px;
            text-align: center;
            background: linear-gradient(90deg, #60a5fa, #f472b6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        textarea {
            width: 100%;
            height: 150px;
            padding: 20px;
            border-radius: 16px;
            border: 2px solid #334155;
            background: #0f172a;
            color: white;
            font-family: inherit;
            font-size: 16px;
            resize: none;
            margin-bottom: 20px;
            box-sizing: border-box;
            transition: 0.3s;
        }

        textarea:focus {
            outline: none;
            border-color: #60a5fa;
            box-shadow: 0 0 0 4px rgba(96, 165, 250, 0.2);
        }

        .controls {
            display: flex;
            gap: 16px;
            margin-bottom: 30px;
        }

        button {
            flex: 1;
            padding: 16px;
            border-radius: 16px;
            border: none;
            background: #3b82f6;
            color: white;
            font-weight: 700;
            cursor: pointer;
            transition: 0.2s;
            font-size: 16px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        button:hover {
            background: #2563eb;
            transform: translateY(-2px);
        }

        button:disabled {
            background: #475569;
            cursor: not-allowed;
            transform: none;
        }

        .status-box {
            background: #0f172a;
            padding: 24px;
            border-radius: 20px;
            border: 1px solid #334155;
        }

        .chunk-list {
            list-style: none;
            padding: 0;
            margin: 15px 0 0 0;
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 12px;
        }

        .chunk-item {
            padding: 12px 16px;
            background: #1e293b;
            border-radius: 12px;
            border-left: 4px solid #475569;
            font-size: 13px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: 0.3s;
        }

        .chunk-item.active {
            border-left-color: #60a5fa;
            background: #2563eb20;
        }

        .chunk-item.done {
            border-left-color: #10b981;
            opacity: 0.6;
        }

        .badge {
            font-size: 11px;
            padding: 4px 10px;
            border-radius: 99px;
            background: #334155;
            color: #94a3b8;
            font-weight: 700;
        }

        .active .badge {
            background: #3b82f6;
            color: white;
        }

        .done .badge {
            background: #10b981;
            color: white;
        }
    </style>
</head>

<body>

    <div class="container">
        <h1>Gemini 2.5 TTS - Ultra Turbo</h1>
        <textarea
            id="tts-input">MailFlow Pro hỗ trợ đa kênh, tích hợp AI mạnh mẽ để chăm sóc khách hàng tự động. Hệ thống mới sử dụng Gemini 2.5 Turbo giúp phản hồi giọng nói nhanh hơn 500ms so với thế hệ cũ. Chúng tôi cam kết mang lại trải nghiệm mượt mà nhất cho người dùng Việt Nam. Hãy thử nhập đoạn văn bản dài để thấy khả năng xử lý song song và phát âm thanh ngay lập tức!</textarea>

        <div class="controls">
            <button id="play-btn">🎮 PHÁT AUDIO (SIÊU NHANH)</button>
            <button id="stop-btn" style="background: #ef4444;">🛑 DỪNG</button>
        </div>

        <div class="status-box">
            <div style="font-weight: 700; color: #94a3b8; margin-bottom: 10px;">TRẠNG THÁI HỆ THỐNG: <span
                    id="overall-status" style="color:#60a5fa">Sẵn sàng</span></div>
            <ul class="chunk-list" id="chunk-list"></ul>
        </div>
    </div>

    <script>
        const API_KEY = "AIzaSyDRbVHNrcHGa4GNsHjGpkBqsNikvOg0-v8";
        const MODEL = "gemini-2.5-flash-lite-preview-tts"; // Flash is faster than Pro for TTS
        const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

        const playBtn = document.getElementById('play-btn');
        const stopBtn = document.getElementById('stop-btn');
        const input = document.getElementById('tts-input');
        const chunkList = document.getElementById('chunk-list');
        const overallStatus = document.getElementById('overall-status');

        let isPlaying = false;
        let audioQueue = [];
        let currentChunkIndex = 0;
        let globalAudio = null;

        // HELPER: Convert Raw PCM L16 to WAV for browser playback
        function pcmToWav(base64Data, sampleRate = 24000) {
            const binaryString = atob(base64Data);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);

            // WAV Header
            const header = new ArrayBuffer(44);
            const view = new DataView(header);

            view.setUint32(0, 0x52494646, false); // "RIFF"
            view.setUint32(4, 36 + len, true);    // chunk size
            view.setUint32(8, 0x57415645, false); // "WAVE"
            view.setUint32(12, 0x666d7420, false); // "fmt "
            view.setUint32(16, 16, true);          // subchunk1size (16 for PCM)
            view.setUint16(20, 1, true);           // audio format (1 for PCM)
            view.setUint16(22, 1, true);           // num channels (1)
            view.setUint32(24, sampleRate, true);  // sample rate
            view.setUint32(28, sampleRate * 2, true); // byte rate (SampleRate * NumChannels * BitsPerSample/8)
            view.setUint16(32, 2, true);           // block align (NumChannels * BitsPerSample/8)
            view.setUint16(34, 16, true);          // bits per sample (16)
            view.setUint32(36, 0x64617461, false); // "data"
            view.setUint32(40, len, true);         // data size

            const wavBlob = new Blob([header, bytes], { type: 'audio/wav' });
            return URL.createObjectURL(wavBlob);
        }

        function splitText(text) {
            // Split into smaller chunks for faster first-byte
            return text.split(/([.,!?;。！？\n]+)/g).reduce((acc, part, i) => {
                if (i % 2 === 0) acc.push(part);
                else if (acc.length > 0) acc[acc.length - 1] += part;
                return acc;
            }, []).map(s => s.trim()).filter(s => s.length > 2);
        }

        async function fetchAudio(text) {
            try {
                const response = await fetch(ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: text }] }],
                        generationConfig: {
                            responseModalities: ["AUDIO"],
                            speechConfig: {
                                voiceConfig: {
                                    prebuiltVoiceConfig: { voiceName: "Aoede" }
                                }
                            }
                        }
                    })
                });
                if (!response.ok) throw new Error("API Limit or Error");
                const data = await response.json();
                const b64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
                const sampleRate = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType?.includes('24000') ? 24000 : 16000;

                return b64 ? pcmToWav(b64, sampleRate) : null;
            } catch (e) {
                console.error("API Fetch Error", e);
                return null;
            }
        }

        function updateChunkUI(index, status, label) {
            const items = chunkList.querySelectorAll('.chunk-item');
            if (items[index]) {
                items[index].className = `chunk-item ${status}`;
                if (label) items[index].querySelector('.badge').innerText = label;
            }
        }

        // Parallel Buffering Logic
        async function startBuffering() {
            // Buffer in batches of 3 to not overwhelm browser/API but keep speed
            const batchSize = 3;
            for (let i = 0; i < audioQueue.length; i += batchSize) {
                if (!isPlaying) break;

                const batch = [];
                for (let j = i; j < i + batchSize && j < audioQueue.length; j++) {
                    const idx = j;
                    batch.push((async () => {
                        updateChunkUI(idx, '', '⚡ Đang tải...');
                        const src = await fetchAudio(audioQueue[idx].text);
                        audioQueue[idx].blobUrl = src || "ERROR";
                        if (!audioQueue[idx].isPlaying) updateChunkUI(idx, '', src ? '✅ Sẵn sàng' : '❌ Lỗi');
                    })());
                }
                await Promise.all(batch);
            }
        }

        async function playQueue() {
            if (!isPlaying) return;

            if (currentChunkIndex >= audioQueue.length) {
                overallStatus.innerText = "🎉 Hoàn thành!";
                isPlaying = false;
                playBtn.disabled = false;
                return;
            }

            const chunk = audioQueue[currentChunkIndex];

            // Wait for chunk if not ready
            if (!chunk.blobUrl) {
                overallStatus.innerText = `⏳ Chờ đoạn ${currentChunkIndex + 1}...`;
                // Exponential backoff or just wait
                setTimeout(playQueue, 50);
                return;
            }

            if (chunk.blobUrl === "ERROR") {
                currentChunkIndex++;
                playQueue();
                return;
            }

            chunk.isPlaying = true;
            overallStatus.innerText = `🔊 Đang phát ${currentChunkIndex + 1}/${audioQueue.length}`;
            updateChunkUI(currentChunkIndex, 'active', '🎤 Đang phát');

            globalAudio = new Audio(chunk.blobUrl);
            globalAudio.onended = () => {
                updateChunkUI(currentChunkIndex, 'done', '👌 Xong');
                currentChunkIndex++;
                playQueue();
            };

            globalAudio.play().catch(e => {
                console.warn("Play blocked or failed", e);
                currentChunkIndex++;
                playQueue();
            });
        }

        playBtn.onclick = () => {
            const text = input.value.trim();
            if (!text) return;

            isPlaying = true;
            playBtn.disabled = true;
            currentChunkIndex = 0;
            chunkList.innerHTML = "";

            const chunks = splitText(text);
            audioQueue = chunks.map(t => ({ text: t, blobUrl: null, isPlaying: false }));

            chunks.forEach((t, i) => {
                const li = document.createElement('li');
                li.className = 'chunk-item';
                li.innerHTML = `<span>${t.substring(0, 45)}...</span> <span class="badge">⌛ Chờ</span>`;
                chunkList.appendChild(li);
            });

            // Run buffering and playback in parallel
            startBuffering();
            playQueue();
        };

        stopBtn.onclick = () => {
            isPlaying = false;
            if (globalAudio) globalAudio.pause();
            overallStatus.innerText = "⏹️ Đã dừng";
            playBtn.disabled = false;
        };
    </script>
</body>

</html>