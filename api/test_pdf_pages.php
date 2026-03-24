<?php
// test_pdf_pages.php — Đọc số trang PDF (không cần thư viện)

$pageCount = null;
$fileName = null;
$fileSize = null;
$error = null;
$method = 'none';
$timeMs = null;
$isAjax = isset($_POST['ajax']);

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['pdf'])) {
    $file = $_FILES['pdf'];

    if ($file['error'] !== UPLOAD_ERR_OK) {
        $error = 'Upload lỗi: code ' . $file['error'];
    } elseif (strtolower(pathinfo($file['name'], PATHINFO_EXTENSION)) !== 'pdf') {
        $error = 'Chỉ chấp nhận file .pdf';
    } else {
        $fileName = $file['name'];
        $fileSize = $file['size'];
        $t0 = microtime(true);

        $content = file_get_contents($file['tmp_name']);

        // Method 1: /Count từ /Pages dict (chính xác nhất)
        preg_match('/\/Count\s+(\d+)/', $content, $m2);
        $count2 = isset($m2[1]) ? (int) $m2[1] : 0;

        // Method 2: Đếm /Type /Page
        preg_match_all('/\/Type\s*\/Page[^s]/s', $content, $m1);
        $count1 = count($m1[0]);

        if ($count2 > 0) {
            $pageCount = $count2;
            $method = '/Count từ /Pages dict';
        } elseif ($count1 > 0) {
            $pageCount = $count1;
            $method = 'Đếm /Type /Page';
        } else {
            $pageCount = 0;
            $method = 'Không xác định được';
        }

        $timeMs = round((microtime(true) - $t0) * 1000, 2);
    }
}

// Nếu là AJAX request, chỉ trả về phần result HTML
if ($isAjax) {
    if ($error): ?>
        <div class="error-box">❌ <?= htmlspecialchars($error) ?></div>
    <?php elseif ($pageCount !== null): ?>
        <div class="result">
            <div class="result-header">
                <div class="page-badge"><?= $pageCount ?></div>
                <div>
                    <div class="page-label">Số trang PDF</div>
                    <div class="page-text" title="<?= htmlspecialchars($fileName) ?>">
                        <?= mb_strimwidth(htmlspecialchars($fileName), 0, 40, '...') ?></div>
                </div>
            </div>
            <div class="result-body">
                <div class="meta-row">
                    <span>Kích thước file</span>
                    <span><?= number_format($fileSize / 1024, 1) ?> KB</span>
                </div>
                <div class="meta-row">
                    <span>Thời gian đọc</span>
                    <span><?= $timeMs ?> ms ⚡</span>
                </div>
                <div class="meta-row">
                    <span>Phương thức</span>
                    <span><?= htmlspecialchars($method) ?></span>
                </div>
            </div>
        </div>
    <?php endif;
    exit;
}
?>
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <title>Test: Đọc số trang PDF</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
            background: #0b0f17;
            color: #e2e8f0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
        }

        .card {
            background: #1e2532;
            border: 1px solid #334155;
            border-radius: 1.5rem;
            padding: 2.5rem;
            width: 100%;
            max-width: 480px;
            box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5);
        }

        h1 {
            font-size: 1.1rem;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.15em;
            color: #f8fafc;
            margin-bottom: 0.4rem;
        }

        .subtitle {
            font-size: 0.7rem;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            margin-bottom: 2rem;
        }

        .drop-zone {
            border: 2px dashed #334155;
            border-radius: 1rem;
            padding: 2.5rem 1.5rem;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s;
            background: #0b0f17;
            margin-bottom: 1rem;
            position: relative;
        }

        .drop-zone:hover,
        .drop-zone.dragover {
            border-color: #6366f1;
            background: #1e2532;
        }

        .drop-zone input[type=file] {
            position: absolute;
            inset: 0;
            opacity: 0;
            cursor: pointer;
        }

        .drop-icon {
            font-size: 2.5rem;
            margin-bottom: 0.75rem;
        }

        .drop-label {
            font-size: 0.85rem;
            color: #94a3b8;
            font-weight: 600;
        }

        .drop-hint {
            font-size: 0.7rem;
            color: #475569;
            margin-top: 0.4rem;
        }

        #submitBtn {
            width: 100%;
            padding: 0.9rem;
            margin-top: 0.5rem;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            color: white;
            border: none;
            border-radius: 0.875rem;
            font-size: 0.75rem;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.15em;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 4px 20px rgba(99, 102, 241, 0.3);
        }

        #submitBtn:hover {
            filter: brightness(1.1);
            transform: translateY(-1px);
        }

        #submitBtn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }

        .file-name-display {
            padding: 0.5rem 0.875rem;
            background: #0b0f17;
            border: 1px solid #334155;
            border-radius: 0.5rem;
            font-size: 0.7rem;
            color: #6366f1;
            font-weight: 700;
            display: none;
            word-break: break-all;
            margin-bottom: 0.5rem;
        }

        .result {
            margin-top: 2rem;
            border-radius: 1rem;
            overflow: hidden;
        }

        .result-header {
            background: linear-gradient(135deg, #1e3a5f, #1e2d47);
            border: 1px solid #1d4ed8;
            border-bottom: none;
            padding: 1.25rem 1.5rem;
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .page-badge {
            background: linear-gradient(135deg, #2563eb, #4f46e5);
            border-radius: 0.75rem;
            padding: 0.5rem 1rem;
            font-size: 2rem;
            font-weight: 900;
            color: white;
            line-height: 1;
            box-shadow: 0 4px 15px rgba(37, 99, 235, 0.4);
            min-width: 3rem;
            text-align: center;
        }

        .page-label {
            font-size: 0.7rem;
            text-transform: uppercase;
            letter-spacing: 0.15em;
            color: #93c5fd;
            font-weight: 700;
        }

        .page-text {
            font-size: 0.9rem;
            font-weight: 800;
            color: #f0f9ff;
            margin-top: 0.2rem;
        }

        .result-body {
            background: #0b0f17;
            border: 1px solid #1d4ed8;
            border-top: none;
            padding: 1rem 1.5rem;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }

        .meta-row {
            display: flex;
            justify-content: space-between;
            font-size: 0.7rem;
            color: #64748b;
            font-weight: 600;
        }

        .meta-row span:last-child {
            color: #94a3b8;
            font-weight: 700;
        }

        .error-box {
            margin-top: 1.5rem;
            padding: 1rem 1.25rem;
            background: #1c0a0a;
            border: 1px solid #7f1d1d;
            border-radius: 0.875rem;
            color: #fca5a5;
            font-size: 0.8rem;
            font-weight: 600;
        }
    </style>
</head>

<body>
    <div class="card">
        <h1>📄 PDF Page Counter</h1>
        <p class="subtitle">Đọc số trang PDF — Không cần thư viện</p>

        <div class="drop-zone" id="dropZone">
            <div class="drop-icon">📂</div>
            <p class="drop-label">Kéo thả hoặc click để chọn file PDF</p>
            <p class="drop-hint">Chỉ chấp nhận .pdf</p>
            <input type="file" name="pdf" accept=".pdf" id="fileInput">
        </div>

        <div class="file-name-display" id="fileNameDisplay"></div>
        <button id="submitBtn">⚡ Đọc số trang ngay</button>

        <div id="resultArea"></div>
    </div>

    <script>
        const dz = document.getElementById('dropZone');
        const fi = document.getElementById('fileInput');
        const fn = document.getElementById('fileNameDisplay');
        const btn = document.getElementById('submitBtn');
        let selectedFile = null;

        function showFile(file) {
            selectedFile = file;
            fn.style.display = 'block';
            fn.textContent = '📎 ' + file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)';
            dz.style.borderColor = '#6366f1';
        }

        fi.addEventListener('change', () => { if (fi.files[0]) showFile(fi.files[0]); });

        dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dragover'); });
        dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
        dz.addEventListener('drop', e => {
            e.preventDefault();
            dz.classList.remove('dragover');
            const f = e.dataTransfer.files[0];
            if (f) showFile(f);
        });

        btn.addEventListener('click', async () => {
            const file = selectedFile || fi.files[0];
            if (!file) { alert('Vui lòng chọn file PDF trước!'); return; }
            if (!file.name.toLowerCase().endsWith('.pdf')) { alert('Chỉ chấp nhận file .pdf'); return; }

            btn.textContent = '⏳ Đang đọc...';
            btn.disabled = true;

            const fd = new FormData();
            fd.append('pdf', file);
            fd.append('ajax', '1');

            try {
                const res = await fetch('', { method: 'POST', body: fd });
                const html = await res.text();
                document.getElementById('resultArea').innerHTML = html;
            } catch (e) {
                document.getElementById('resultArea').innerHTML =
                    '<div class="error-box">❌ Lỗi: ' + e.message + '</div>';
            } finally {
                btn.textContent = '⚡ Đọc số trang ngay';
                btn.disabled = false;
            }
        });
    </script>
</body>

</html>