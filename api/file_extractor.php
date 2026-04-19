<?php
/**
 * api/file_extractor.php
 * Trích xu?t text có c?u trúc t? PDF, DOCX, TXT
 * H? tr? nh?n bi?t Chuong / M?c / Trang d? AI trích d?n chính xác
 */

if (!function_exists('extractTextFromFile')) {

    /**
     * Entry point: Phát hi?n lo?i file và g?i extractor phù h?p
     *
     * @param string $filePath  Ðu?ng d?n tuy?t d?i t?i file trên server
     * @param string $ext       Extension: pdf | docx | doc | txt
     * @param string $apiKey    Gemini API Key (c?n cho PDF qua Gemini Files API)
     * @return array {
     *   book_title, author, language, chapters: [
     *     { index, title, sections: [
     *       { index, title, content, page_start, page_end }
     *     ]}
     *   ]
     * } | { error: string }
     */
    function extractTextFromFile(string $filePath, string $ext, string $apiKey = ''): array
    {
        if (!file_exists($filePath)) {
            return ['error' => 'File không t?n t?i: ' . $filePath];
        }

        $ext = strtolower(trim($ext));

        switch ($ext) {
            case 'pdf':
                return extractPdfText($filePath, $apiKey);

            case 'docx':
                return extractDocxText($filePath);

            case 'doc':
                // .doc cu ? th? convert ho?c fallback v? Gemini
                return extractDocText($filePath, $apiKey);

            case 'txt':
            default:
                return extractTxtText($filePath);
        }
    }

    // =========================================================
    // TXT EXTRACTOR
    // =========================================================

    /**
     * Ð?c file .txt và heuristic phát hi?n chuong/m?c
     */
    function extractTxtText(string $filePath): array
    {
        $raw = file_get_contents($filePath);
        if ($raw === false)
            return ['error' => 'Không d?c du?c file TXT'];

        // Normalize encoding
        if (!mb_detect_encoding($raw, 'UTF-8', true)) {
            $raw = mb_convert_encoding($raw, 'UTF-8', 'auto');
        }

        return parseTextIntoChapters($raw);
    }

    // =========================================================
    // DOCX EXTRACTOR (d?c XML bên trong ZIP - không c?n thu vi?n)
    // =========================================================

    function extractDocxText(string $filePath): array
    {
        if (!class_exists('ZipArchive')) {
            return ['error' => 'ZipArchive extension không kh? d?ng'];
        }

        $zip = new ZipArchive();
        if ($zip->open($filePath) !== true) {
            return ['error' => 'Không m? du?c file DOCX'];
        }

        $xmlContent = $zip->getFromName('word/document.xml');
        $coreXml = $zip->getFromName('docProps/core.xml');
        $zip->close();

        if (!$xmlContent)
            return ['error' => 'File DOCX không h?p l? (thi?u document.xml)'];

        // L?y metadata t? core.xml
        $bookTitle = '';
        $author = '';
        if ($coreXml) {
            $cXml = @simplexml_load_string($coreXml);
            if ($cXml) {
                $ns = $cXml->getNamespaces(true);
                $dc = $cXml->children($ns['dc'] ?? 'http://purl.org/dc/elements/1.1/');
                $bookTitle = (string) ($dc->title ?? '');
                $author = (string) ($dc->creator ?? '');
            }
        }

        // Parse document.xml
        $xmlContent = preg_replace('/xmlns[^=]*="[^"]*"/i', '', $xmlContent);
        $xmlContent = str_replace(['w:', 'r:', 'a:'], '', $xmlContent);

        $xml = @simplexml_load_string($xmlContent);
        if (!$xml) {
            // Fallback: crude strip-tags extraction
            $plain = strip_tags(str_replace(['</p>', '</w:p>', '<br', '<w:br'], "\n", $xmlContent));
            return parseTextIntoChapters($plain, $bookTitle, $author);
        }

        // Walk paragraphs
        $chapters = [];
        $currentChapter = ['index' => 0, 'title' => 'T?ng quan', 'sections' => []];
        $currentSection = ['index' => 1, 'title' => 'T?ng quan', 'content' => '', 'page_start' => 1, 'page_end' => 1];
        $chapterIdx = 0;
        $sectionIdx = 1;
        $pageNum = 1;

        $paragraphs = $xml->xpath('//body/p') ?: $xml->xpath('//p') ?: [];

        foreach ($paragraphs as $para) {
            // Detect style
            $styleNodes = $para->xpath('pPr/pStyle/@val');
            $style = isset($styleNodes[0]) ? (string) $styleNodes[0] : '';

            // Extract text
            $textNodes = $para->xpath('.//t');
            $text = '';
            foreach ($textNodes as $t) {
                $text .= (string) $t;
            }
            $text = trim($text);

            // Page break detection
            if ($para->xpath('.//br[@type="page"]') || $para->xpath('.//lastRenderedPageBreak')) {
                $pageNum++;
                $currentSection['page_end'] = $pageNum;
            }

            if (empty($text))
                continue;

            $styleLower = strtolower($style);

            // Heading 1 / Title ? New Chapter
            if (
                preg_match('/^(heading1|1|heading\s*1|title|chuong|chapter)/i', $styleLower) ||
                isChapterHeading($text)
            ) {
                // Flush current section & chapter
                if (!empty(trim($currentSection['content']))) {
                    $currentChapter['sections'][] = $currentSection;
                }
                if (!empty($currentChapter['sections']) || $chapterIdx > 0) {
                    $chapters[] = $currentChapter;
                }
                $chapterIdx++;
                $sectionIdx = 1;
                $currentChapter = ['index' => $chapterIdx, 'title' => $text, 'sections' => []];
                $currentSection = [
                    'index' => $sectionIdx,
                    'title' => $text,
                    'content' => '',
                    'page_start' => $pageNum,
                    'page_end' => $pageNum
                ];
            }
            // Heading 2 ? New Section
            elseif (
                preg_match('/^(heading2|2|heading\s*2|subtitle)/i', $styleLower) ||
                isSectionHeading($text)
            ) {
                if (!empty(trim($currentSection['content']))) {
                    $currentChapter['sections'][] = $currentSection;
                }
                $sectionIdx++;
                $currentSection = [
                    'index' => $sectionIdx,
                    'title' => $text,
                    'content' => '',
                    'page_start' => $pageNum,
                    'page_end' => $pageNum
                ];
            }
            // Normal paragraph
            else {
                $currentSection['content'] .= $text . "\n";
                $currentSection['page_end'] = $pageNum;
            }
        }

        // Flush remaining
        if (!empty(trim($currentSection['content']))) {
            $currentChapter['sections'][] = $currentSection;
        }
        if (!empty($currentChapter['sections'])) {
            $chapters[] = $currentChapter;
        }

        // N?u không parse du?c gì, fallback
        if (empty($chapters)) {
            $plain = '';
            foreach ($paragraphs as $p) {
                $tNodes = $p->xpath('.//t');
                foreach ($tNodes as $t)
                    $plain .= (string) $t . "\n";
            }
            return parseTextIntoChapters($plain, $bookTitle, $author);
        }

        return [
            'book_title' => $bookTitle,
            'author' => $author,
            'language' => 'vi',
            'chapters' => $chapters,
        ];
    }

    // =========================================================
    // PDF EXTRACTOR - Dùng Gemini Files API (t?t nh?t cho PDF)
    // =========================================================

    function extractPdfText(string $filePath, string $apiKey): array
    {
        // Option A: pdftotext n?u có trên server (ki?m tra shell_exec và exec có b? disable không)
        if (function_exists('shell_exec') && function_exists('exec')) {
            $hasPdftotext = trim(shell_exec('which pdftotext 2>/dev/null') ?: '');
            if (!empty($hasPdftotext)) {
                $result = extractPdfViaPdftotext($filePath);
                if (!isset($result['error']))
                    return $result;
            }
        }

        // Option B: Gemini Files API (fallback, t?t nh?t)
        if (!empty($apiKey)) {
            return extractPdfViaGemini($filePath, $apiKey);
        }

        return ['error' => 'Không có phuong th?c d?c PDF. C?n pdftotext ho?c Gemini API Key.'];
    }

    // =========================================================
    // [NEW] UPLOAD PDF 1 L?N ? L?y fileUri dùng nhi?u l?n
    // =========================================================

    /**
     * Upload file lên Gemini Files API, tr? v? fileUri.
     * fileUri này t?n t?i 48h, có th? dùng cho nhi?u l?n g?i.
     */
    function uploadFileToGeminiFiles(string $filePath, string $apiKey, string $mimeType = 'application/pdf'): array
    {
        if (empty($apiKey))
            return ['error' => 'Thi?u API Key'];
        if (!file_exists($filePath))
            return ['error' => 'File không t?n t?i: ' . $filePath];

        $fileSize = filesize($filePath);
        $startUrl = "https://generativelanguage.googleapis.com/upload/v1beta/files?uploadType=resumable&key={$apiKey}";

        // Step 1: Kh?i t?o resumable upload
        $ch = curl_init($startUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                "X-Goog-Upload-Protocol: resumable",
                "X-Goog-Upload-Command: start",
                "X-Goog-Upload-Header-Content-Length: {$fileSize}",
                "X-Goog-Upload-Header-Content-Type: {$mimeType}",
                "Content-Type: application/json",
            ],
            CURLOPT_POSTFIELDS => json_encode(['file' => ['display_name' => basename($filePath)]]),
            CURLOPT_HEADER => true,
            CURLOPT_TIMEOUT => 30,
        ]);
        $startResponse = curl_exec($ch);
        curl_close($ch);

        preg_match('/x-goog-upload-url:\s*(https?:\/\/[^\r\n]+)/i', $startResponse, $m);
        $uploadUrl = trim($m[1] ?? '');
        if (empty($uploadUrl)) {
            if (function_exists('training_log'))
                training_log("uploadFileToGeminiFiles: Không l?y du?c upload URL. Response header: " . mb_substr($startResponse, 0, 500));
            return ['error' => 'Không kh?i t?o du?c upload lên Gemini Files API'];
        }

        // Step 2: Upload bytes
        $fh = fopen($filePath, 'rb');
        $ch = curl_init($uploadUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_PUT => true,
            CURLOPT_INFILE => $fh,
            CURLOPT_INFILESIZE => $fileSize,
            CURLOPT_HTTPHEADER => [
                "Content-Length: {$fileSize}",
                "X-Goog-Upload-Command: upload, finalize",
                "X-Goog-Upload-Offset: 0",
                "Content-Type: {$mimeType}",
            ],
            CURLOPT_TIMEOUT => 180,
        ]);
        $uploadResult = json_decode(curl_exec($ch), true);
        $uploadHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        fclose($fh);

        $fileUri = $uploadResult['file']['uri'] ?? null;
        $fileName = $uploadResult['file']['name'] ?? null; // e.g. "files/abc123"

        if (!$fileUri) {
            if (function_exists('training_log'))
                training_log("uploadFileToGeminiFiles: Upload failed HTTP {$uploadHttpCode}. Response: " . json_encode($uploadResult));
            return ['error' => 'Upload PDF lên Gemini th?t b?i (HTTP ' . $uploadHttpCode . ')'];
        }

        if (function_exists('training_log'))
            training_log("uploadFileToGeminiFiles: OK. URI={$fileUri}");

        // Ch? Gemini x? lý file (d?c bi?t quan tr?ng cho file l?n)
        sleep(3);

        return ['file_uri' => $fileUri, 'file_name' => $fileName, 'file_size' => $fileSize];
    }

    // =========================================================
    // [NEW] EXTRACT THEO PAGE RANGE (1 l?n g?i don l?)
    // =========================================================

    /**
     * Trích xu?t n?i dung t? 1 range trang c?a PDF dã upload.
     *
     * @param string $fileUri  URI t? Gemini Files API
     * @param int    $pageStart Trang b?t d?u (1-indexed)
     * @param int    $pageEnd   Trang k?t thúc
     * @param string $apiKey
     * @return array chapters array | ['error' => ...]
     */
    function extractPdfPageRange(string $fileUri, int $pageStart, int $pageEnd, string $apiKey): array
    {
        $prompt = <<<PROMPT
B?n là công c? trích xu?t n?i dung sách. Hãy d?c ÐO?N PDF t? TRANG {$pageStart} Ð?N TRANG {$pageEnd} và tr? v? JSON v?i c?u trúc:

{
  "chapters": [
    {
      "index": 1,
      "title": "Tên chuong ho?c tiêu d? l?n nh?t trong do?n này",
      "sections": [
        {
          "index": 1,
          "title": "Tên m?c/tiêu d? ph? (n?u có, n?u không thì d? tr?ng)",
          "page_start": {$pageStart},
          "page_end": {$pageEnd},
          "content": "Toàn b? n?i dung van b?n, gi? nguyên câu ch?, KHÔNG tóm t?t"
        }
      ]
    }
  ]
}

Quy t?c:
- CH? x? lý trang {$pageStart} d?n {$pageEnd}, b? qua n?i dung ngoài kho?ng này
- Gi? NGUYÊN V?N toàn b? n?i dung, không tóm t?t, không b? sót
- M?i Heading 1/Chuong t?o chapter m?i; Heading 2/M?c t?o section m?i
- Tr? v? JSON thu?n túy (không markdown wrapper)
PROMPT;

        // Dùng gemini-2.5-flash-lite (nh?t quán toàn b? file)
        $apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key={$apiKey}";
        $payload = [
            "contents" => [
                [
                    "parts" => [
                        ["file_data" => ["mime_type" => "application/pdf", "file_uri" => $fileUri]],
                        ["text" => $prompt]
                    ]
                ]
            ],
            "generationConfig" => [
                "response_mime_type" => "application/json",
                "temperature" => 0.1,
                "max_output_tokens" => 65536,
            ]
        ];

        $ch = curl_init($apiUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_TIMEOUT => 300,
            CURLOPT_CONNECTTIMEOUT => 15,
        ]);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr = curl_error($ch);
        curl_close($ch);

        if ($curlErr)
            return ['error' => "CURL Error (pages {$pageStart}-{$pageEnd}): " . $curlErr];
        if ($httpCode !== 200) {
            $errDetail = json_decode($response, true);
            $msg = $errDetail['error']['message'] ?? "HTTP {$httpCode}";
            return ['error' => "Gemini Error pages {$pageStart}-{$pageEnd}: {$msg}"];
        }

        $result = json_decode($response, true);
        $rawJson = $result['candidates'][0]['content']['parts'][0]['text'] ?? null;
        if (!$rawJson)
            return ['error' => "Gemini tr? v? r?ng (pages {$pageStart}-{$pageEnd})"];

        $rawJson = preg_replace('/^```json\s*/i', '', trim($rawJson));
        $rawJson = preg_replace('/```\s*$/i', '', $rawJson);

        $parsed = json_decode($rawJson, true);
        if (!$parsed || empty($parsed['chapters'])) {
            // Fallback: treat as plain text
            return [
                'chapters' => [
                    [
                        'index' => 1,
                        'title' => "Trang {$pageStart}-{$pageEnd}",
                        'sections' => [
                            ['index' => 1, 'title' => '', 'page_start' => $pageStart, 'page_end' => $pageEnd, 'content' => $rawJson]
                        ]
                    ]
                ]
            ];
        }

        return $parsed;
    }

    // =========================================================
    // [NEW] MULTI: G?i 5 page-range requests song song
    // =========================================================

    /**
     * G?i Ð?NG TH?I t?i da 5 Gemini page-range requests dùng curl_multi.
     *
     * @param string $fileUri
     * @param array  $pageRanges  [ ['start'=>1,'end'=>5,'chunk_index'=>0], ... ] t?i da 5 ph?n t?
     * @param string $apiKey
     * @return array  Indexed by chunk_index: [ chunk_index => result_array | error_array ]
     */
    function extractPdfPageRangeMulti(string $fileUri, array $pageRanges, string $apiKey): array
    {
        $apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key={$apiKey}";
        $mh = curl_multi_init();
        $handles = [];

        foreach ($pageRanges as $range) {
            $pageStart = $range['start'];
            $pageEnd = $range['end'];
            $chunkIndex = $range['chunk_index'];

            $prompt = <<<PROMPT
B?n là công c? trích xu?t n?i dung sách. Hãy d?c ÐO?N PDF t? TRANG {$pageStart} Ð?N TRANG {$pageEnd} và tr? v? JSON v?i c?u trúc:

{
  "chapters": [
    {
      "index": 1,
      "title": "Tên chuong ho?c tiêu d? l?n nh?t trong do?n này",
      "sections": [
        {
          "index": 1,
          "title": "Tên m?c/tiêu d? ph? (n?u có)",
          "page_start": {$pageStart},
          "page_end": {$pageEnd},
          "content": "Toàn b? n?i dung van b?n, gi? nguyên câu ch?, KHÔNG tóm t?t"
        }
      ]
    }
  ]
}

Quy t?c:
- CH? x? lý trang {$pageStart} d?n {$pageEnd}
- Gi? NGUYÊN V?N n?i dung, không tóm t?t, không b? sót
- M?i Heading 1/Chuong ? chapter m?i; Heading 2/M?c ? section m?i
- Tr? v? JSON thu?n túy (không markdown wrapper)
PROMPT;

            $payload = [
                "contents" => [
                    [
                        "parts" => [
                            ["file_data" => ["mime_type" => "application/pdf", "file_uri" => $fileUri]],
                            ["text" => $prompt]
                        ]
                    ]
                ],
                "generationConfig" => [
                    "response_mime_type" => "application/json",
                    "temperature" => 0.1,
                    "max_output_tokens" => 65536,
                ]
            ];

            $ch = curl_init($apiUrl);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => json_encode($payload),
                CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
                CURLOPT_TIMEOUT => 300,
                CURLOPT_CONNECTTIMEOUT => 15,
            ]);

            curl_multi_add_handle($mh, $ch);
            $handles[$chunkIndex] = ['ch' => $ch, 'range' => $range];
        }

        // Ch? t?t c? 5 requests hoàn thành
        $active = null;
        do {
            $status = curl_multi_exec($mh, $active);
            if ($active > 0) {
                curl_multi_select($mh, 1.0); // Wait up to 1s for activity
            }
        } while ($active > 0 && $status === CURLM_OK);

        // Thu th?p k?t qu?
        $results = [];
        foreach ($handles as $chunkIndex => $info) {
            $ch = $info['ch'];
            $range = $info['range'];

            $response = curl_multi_getcontent($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlErr = curl_error($ch);

            curl_multi_remove_handle($mh, $ch);
            curl_close($ch);

            if ($curlErr) {
                $results[$chunkIndex] = ['error' => "CURL Error pages {$range['start']}-{$range['end']}: {$curlErr}"];
                continue;
            }
            if ($httpCode === 429) {
                // Rate limit – tr? v? error d? caller re-queue
                $results[$chunkIndex] = ['error' => 'rate_limit', 'retry' => true];
                continue;
            }
            if ($httpCode !== 200) {
                $errDetail = json_decode($response, true);
                $msg = $errDetail['error']['message'] ?? "HTTP {$httpCode}";
                $results[$chunkIndex] = ['error' => "Gemini Error pages {$range['start']}-{$range['end']}: {$msg}"];
                continue;
            }

            $result = json_decode($response, true);
            $rawJson = $result['candidates'][0]['content']['parts'][0]['text'] ?? null;

            if (!$rawJson) {
                $results[$chunkIndex] = ['error' => "Gemini r?ng pages {$range['start']}-{$range['end']}"];
                continue;
            }

            $rawJson = preg_replace('/^```json\s*/i', '', trim($rawJson));
            $rawJson = preg_replace('/```\s*$/i', '', $rawJson);
            $parsed = json_decode($rawJson, true);

            if (!$parsed || empty($parsed['chapters'])) {
                // Fallback plain text
                $parsed = [
                    'chapters' => [
                        [
                            'index' => 1,
                            'title' => "Trang {$range['start']}-{$range['end']}",
                            'sections' => [
                                ['index' => 1, 'title' => '', 'page_start' => $range['start'], 'page_end' => $range['end'], 'content' => $rawJson]
                            ]
                        ]
                    ]
                ];
            }

            $results[$chunkIndex] = $parsed;
        }

        curl_multi_close($mh);

        if (function_exists('training_log')) {
            $ok = count(array_filter($results, fn($r) => !isset($r['error'])));
            $err = count($results) - $ok;
            training_log("extractPdfPageRangeMulti: {$ok} success, {$err} error out of " . count($pageRanges) . " requests");
        }

        return $results;
    }


    /**
     * Ð?c PDF b?ng pdftotext (c?n cài trên server Linux)
     */
    function extractPdfViaPdftotext(string $filePath): array
    {
        $escaped = escapeshellarg($filePath);
        $output = [];
        $code = 0;
        exec("pdftotext -layout {$escaped} - 2>&1", $output, $code);

        if ($code !== 0 || empty($output)) {
            return ['error' => 'pdftotext th?t b?i'];
        }

        $text = implode("\n", $output);
        // Detect page markers from pdftotext (form feed char \x0c)
        $pages = explode("\x0c", $text);

        $fullText = '';
        $pageMap = []; // [charOffset => pageNum]
        $offset = 0;
        $pageNum = 1;

        foreach ($pages as $pageContent) {
            $pageMap[$offset] = $pageNum;
            $fullText .= $pageContent;
            $offset += strlen($pageContent);
            $pageNum++;
        }

        return parseTextIntoChapters($fullText);
    }

    /**
     * Upload PDF lên Gemini Files API d? l?y text có c?u trúc
     * Gemini có th? d?c PDF, hình ?nh, scan
     */
    function extractPdfViaGemini(string $filePath, string $apiKey): array
    {
        training_log("Extracting PDF via Gemini Files API: " . basename($filePath));

        $mimeType = 'application/pdf';
        $fileSize = filesize($filePath);

        // Step 1: Kh?i t?o resumable upload
        $startUrl = "https://generativelanguage.googleapis.com/upload/v1beta/files?uploadType=resumable&key={$apiKey}";

        $ch = curl_init($startUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                "X-Goog-Upload-Protocol: resumable",
                "X-Goog-Upload-Command: start",
                "X-Goog-Upload-Header-Content-Length: {$fileSize}",
                "X-Goog-Upload-Header-Content-Type: {$mimeType}",
                "Content-Type: application/json",
            ],
            CURLOPT_POSTFIELDS => json_encode(['file' => ['display_name' => basename($filePath)]]),
            CURLOPT_HEADER => true,
            CURLOPT_TIMEOUT => 30,
        ]);
        $startResponse = curl_exec($ch);
        curl_close($ch);

        // L?y upload URL t? header
        preg_match('/x-goog-upload-url:\s*(https?:\/\/[^\r\n]+)/i', $startResponse, $m);
        $uploadUrl = trim($m[1] ?? '');

        if (empty($uploadUrl)) {
            training_log("Gemini Files API: Không l?y du?c upload URL");
            return ['error' => 'Không kh?i t?o du?c upload lên Gemini'];
        }

        // Step 2: Upload bytes
        $fileHandle = fopen($filePath, 'rb');
        $ch = curl_init($uploadUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_PUT => true,
            CURLOPT_INFILE => $fileHandle,
            CURLOPT_INFILESIZE => $fileSize,
            CURLOPT_HTTPHEADER => [
                "Content-Length: {$fileSize}",
                "X-Goog-Upload-Command: upload, finalize",
                "X-Goog-Upload-Offset: 0",
                "Content-Type: {$mimeType}",
            ],
            CURLOPT_TIMEOUT => 120,
        ]);
        $uploadResult = json_decode(curl_exec($ch), true);
        curl_close($ch);
        fclose($fileHandle);

        $fileUri = $uploadResult['file']['uri'] ?? null;
        if (!$fileUri) {
            training_log("Gemini Files API upload failed: " . json_encode($uploadResult));
            return ['error' => 'Upload PDF lên Gemini th?t b?i'];
        }

        training_log("Gemini Files API: Uploaded successfully. URI = {$fileUri}");
        sleep(3);

        // Step 3: Yêu c?u Gemini trích xu?t c?u trúc JSON
        $prompt = <<<'PROMPT'
B?n là công c? trích xu?t n?i dung t? sách/tài li?u. Hãy d?c toàn b? tài li?u PDF này và tr? v? JSON v?i c?u trúc chính xác nhu sau:

{
  "book_title": "Tên sách ho?c tài li?u",
  "author": "Tên tác gi? (n?u có)",
  "language": "vi ho?c en",
  "chapters": [
    {
      "index": 1,
      "title": "Tên chuong",
      "sections": [
        {
          "index": 1,
          "title": "Tên m?c/tiêu d? ph?",
          "page_start": 5,
          "page_end": 12,
          "content": "Toàn b? n?i dung van b?n c?a m?c này, gi? nguyên câu ch?, không tóm t?t"
        }
      ]
    }
  ]
}

Quy t?c:
- Gi? NGUYÊN V?N toàn b? n?i dung, không tóm t?t, không b? sót
- M?i Heading 1 / Chuong t?o m?t chapter m?i
- M?i Heading 2 / M?c t?o m?t section m?i trong chapter
- page_start và page_end là s? trang th?c t? trong PDF
- N?u không có c?u trúc chapter rõ ràng, t?o 1 chapter duy nh?t v?i các section theo do?n
- Tr? v? JSON thu?n túy, không có markdown wrapper hay gi?i thích
PROMPT;

        $apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key={$apiKey}";
        $payload = [
            "contents" => [
                [
                    "parts" => [
                        ["file_data" => ["mime_type" => $mimeType, "file_uri" => $fileUri]],
                        ["text" => $prompt]
                    ]
                ]
            ],
            "generationConfig" => [
                "response_mime_type" => "application/json",
                "temperature" => 0.1,
                "max_output_tokens" => 65536,
            ]
        ];

        training_log("Gemini Files API: Requesting content generation (extraction)... This can take 1-5 minutes.");
        $ch = curl_init($apiUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_TIMEOUT => 600,
            CURLOPT_CONNECTTIMEOUT => 30,
        ]);

        $startTime = microtime(true);
        $response = curl_exec($ch);
        $endTime = microtime(true);
        $duration = round($endTime - $startTime, 2);

        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        training_log("Gemini Files API: Response received in {$duration}s. HTTP Code: {$httpCode}");
        if ($curlError) {
            training_log("Gemini Files API: CURL ERROR: " . $curlError);
            return ['error' => "CURL Error: " . $curlError];
        }

        if ($httpCode !== 200) {
            $errorDetail = json_decode($response, true);
            $msg = $errorDetail['error']['message'] ?? 'Unknown Gemini Error';
            training_log("Gemini extraction failed HTTP {$httpCode}: " . $response);
            return ['error' => "Gemini API Error {$httpCode}: {$msg}"];
        }

        $result = json_decode($response, true);
        $rawJson = $result['candidates'][0]['content']['parts'][0]['text'] ?? null;

        if (!$rawJson) {
            training_log("Gemini extraction: No content returned");
            return ['error' => 'Gemini không tr? v? n?i dung'];
        }

        // Strip markdown code fences n?u có
        $rawJson = preg_replace('/^```json\s*/i', '', trim($rawJson));
        $rawJson = preg_replace('/```\s*$/i', '', $rawJson);

        $parsed = json_decode($rawJson, true);
        if (!$parsed || empty($parsed['chapters'])) {
            training_log("Gemini extraction: JSON parse failed. Raw: " . mb_substr($rawJson, 0, 500));
            // Fallback: treat entire response as plain text
            return parseTextIntoChapters($rawJson);
        }

        training_log("Gemini extraction success: " . count($parsed['chapters']) . " chapters");
        return $parsed;
    }

    /**
     * .doc (Word 97-2003) - th? dùng Gemini Files API
     */
    function extractDocText(string $filePath, string $apiKey): array
    {
        if (!empty($apiKey)) {
            // Gemini có th? d?c .doc
            return extractViaGeminiGeneric($filePath, 'application/msword', $apiKey);
        }
        return ['error' => 'C?n Gemini API Key d? d?c file .doc cu'];
    }

    /**
     * Generic Gemini Files API extractor cho m?i lo?i file
     */
    function extractViaGeminiGeneric(string $filePath, string $mimeType, string $apiKey): array
    {
        $fileSize = filesize($filePath);
        $startUrl = "https://generativelanguage.googleapis.com/upload/v1beta/files?uploadType=resumable&key={$apiKey}";

        $ch = curl_init($startUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                "X-Goog-Upload-Protocol: resumable",
                "X-Goog-Upload-Command: start",
                "X-Goog-Upload-Header-Content-Length: {$fileSize}",
                "X-Goog-Upload-Header-Content-Type: {$mimeType}",
                "Content-Type: application/json",
            ],
            CURLOPT_POSTFIELDS => json_encode(['file' => ['display_name' => basename($filePath)]]),
            CURLOPT_HEADER => true,
            CURLOPT_TIMEOUT => 30,
        ]);
        $startResponse = curl_exec($ch);
        curl_close($ch);

        preg_match('/x-goog-upload-url:\s*(https?:\/\/[^\r\n]+)/i', $startResponse, $m);
        $uploadUrl = trim($m[1] ?? '');
        if (empty($uploadUrl))
            return ['error' => 'Upload initiation failed'];

        $fh = fopen($filePath, 'rb');
        $ch = curl_init($uploadUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_PUT => true,
            CURLOPT_INFILE => $fh,
            CURLOPT_INFILESIZE => $fileSize,
            CURLOPT_HTTPHEADER => [
                "Content-Length: {$fileSize}",
                "X-Goog-Upload-Command: upload, finalize",
                "X-Goog-Upload-Offset: 0",
            ],
            CURLOPT_TIMEOUT => 120,
        ]);
        $result = json_decode(curl_exec($ch), true);
        curl_close($ch);
        fclose($fh);

        $uri = $result['file']['uri'] ?? null;
        if (!$uri)
            return ['error' => 'Upload failed'];

        // Trích xu?t
        sleep(3);
        $prompt = "Extract all text content from this document. Return as plain text preserving paragraphs.";
        $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key={$apiKey}";
        $payload = [
            "contents" => [
                [
                    "parts" => [
                        ["file_data" => ["mime_type" => $mimeType, "file_uri" => $uri]],
                        ["text" => $prompt]
                    ]
                ]
            ],
            "generationConfig" => ["temperature" => 0.1, "max_output_tokens" => 65536]
        ];

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_TIMEOUT => 180,
        ]);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200) {
            $errorDetail = json_decode($response, true);
            $msg = $errorDetail['error']['message'] ?? 'Unknown Gemini Error';
            return ['error' => "Gemini API Error {$httpCode}: {$msg}"];
        }

        $res = json_decode($response, true);
        $text = $res['candidates'][0]['content']['parts'][0]['text'] ?? '';
        return parseTextIntoChapters($text);
    }

    // =========================================================
    // HELPER: Parse plain text thành c?u trúc chuong/m?c
    // =========================================================

    /**
     * Heuristic phân tích text thu?n thành chapters/sections
     * Dùng khi không có heading rõ ràng
     */
    function parseTextIntoChapters(string $text, string $bookTitle = '', string $author = ''): array
    {
        $lines = preg_split('/\r?\n/', $text);
        $chapters = [];

        $currentChapter = ['index' => 1, 'title' => 'N?i dung', 'sections' => []];
        $currentSection = [
            'index' => 1,
            'title' => 'Ph?n 1',
            'content' => '',
            'page_start' => 1,
            'page_end' => 1,
        ];
        $chapterIdx = 1;
        $sectionIdx = 1;
        $pageNum = 1;
        $lineCount = 0;

        foreach ($lines as $line) {
            $lineCount++;
            $trimmed = trim($line);

            // Simulate page (m?i ~40 dòng ˜ 1 trang)
            if ($lineCount % 40 === 0) {
                $pageNum++;
                $currentSection['page_end'] = $pageNum;
            }

            if (empty($trimmed)) {
                $currentSection['content'] .= "\n";
                continue;
            }

            if (isChapterHeading($trimmed)) {
                // Flush
                if (!empty(trim($currentSection['content']))) {
                    $currentChapter['sections'][] = $currentSection;
                }
                if (!empty($currentChapter['sections'])) {
                    $chapters[] = $currentChapter;
                }
                $chapterIdx++;
                $sectionIdx = 1;
                $currentChapter = ['index' => $chapterIdx, 'title' => $trimmed, 'sections' => []];
                $currentSection = [
                    'index' => $sectionIdx,
                    'title' => $trimmed,
                    'content' => '',
                    'page_start' => $pageNum,
                    'page_end' => $pageNum,
                ];
            } elseif (isSectionHeading($trimmed)) {
                if (!empty(trim($currentSection['content']))) {
                    $currentChapter['sections'][] = $currentSection;
                }
                $sectionIdx++;
                $currentSection = [
                    'index' => $sectionIdx,
                    'title' => $trimmed,
                    'content' => '',
                    'page_start' => $pageNum,
                    'page_end' => $pageNum,
                ];
            } else {
                $currentSection['content'] .= $line . "\n";
            }
        }

        // Flush remaining
        if (!empty(trim($currentSection['content']))) {
            $currentChapter['sections'][] = $currentSection;
        }
        if (!empty($currentChapter['sections'])) {
            $chapters[] = $currentChapter;
        }

        if (empty($chapters)) {
            // Absolutely no structure - single chapter/section
            $chapters = [
                [
                    'index' => 1,
                    'title' => $bookTitle ?: 'Tài li?u',
                    'sections' => [
                        [
                            'index' => 1,
                            'title' => 'N?i dung',
                            'content' => $text,
                            'page_start' => 1,
                            'page_end' => max(1, intdiv(count($lines), 40)),
                        ]
                    ]
                ]
            ];
        }

        return [
            'book_title' => $bookTitle,
            'author' => $author,
            'language' => 'vi',
            'chapters' => $chapters,
        ];
    }

    // =========================================================
    // HEADING DETECTORS
    // =========================================================

    /**
     * Phát hi?n Chapter Heading (Heading 1 level)
     */
    function isChapterHeading(string $line): bool
    {
        $line = trim($line);
        if (mb_strlen($line) > 120 || mb_strlen($line) < 2)
            return false;

        // Numbered: "Chuong 1", "CHAPTER 1", "I.", "1.", "Ph?n 1"
        if (preg_match('/^(chuong|chapter|ph?n|part|bài|lesson|unit|module)\s*[\d\w]+/iu', $line))
            return true;
        if (preg_match('/^[IVXLC]+\.\s+\S/u', $line))
            return true; // Roman numerals
        if (preg_match('/^(\d+)\.\s+.{5,}/u', $line))
            return true;  // "1. Title"

        // ALL CAPS short line
        if (mb_strlen($line) < 60 && $line === mb_strtoupper($line) && preg_match('/\p{L}{3}/u', $line))
            return true;

        return false;
    }

    /**
     * Phát hi?n Section Heading (Heading 2 level)
     */
    function isSectionHeading(string $line): bool
    {
        $line = trim($line);
        if (mb_strlen($line) > 100 || mb_strlen($line) < 3)
            return false;

        // "1.1", "1.2.3", "A.1" etc
        if (preg_match('/^(\d+\.){2,}\s+\S/u', $line))
            return true;
        if (preg_match('/^[a-zA-Z]\.\d+\.\s+/u', $line))
            return true;

        // Keyword patterns
        if (preg_match('/^(m?c|section|ti?u m?c|di?u|article)\s+[\d\w]+/iu', $line))
            return true;

        return false;
    }
}
