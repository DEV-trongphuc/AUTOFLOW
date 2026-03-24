<?php
// api/debug_rag_v2.php
// Công cụ chẩn đoán RAG & Knowledge Base tối ưu cho AI Chatbot
// Hiển thị chi tiết điểm số, độ tự tin và dữ liệu gửi cho Gemini

ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: text/html; charset=utf-8');

require_once 'db_connect.php';
require_once 'chat_rag.php';

// FIX: Override JSON header from db_connect.php
ob_clean();
header('Content-Type: text/html; charset=utf-8');

// Logic simulate từ ai_chatbot.php
function getSettingsLocal($pdo, $propertyId)
{
    $stmt = $pdo->prepare("SELECT * FROM ai_chatbot_settings WHERE property_id = ? LIMIT 1");
    $stmt->execute([$propertyId]);
    return $stmt->fetch(PDO::FETCH_ASSOC);
}

function buildSystemPromptLocal($settings, $activityContext, $relevantContext, $isIdentified, $currentPage)
{
    $botName = $settings['bot_name'] ?? 'AI Consultant';
    $companyName = $settings['company_name'] ?? 'MailFlow Pro';
    $today = date("d/m/Y");
    $kbContent = (!empty($relevantContext)) ? $relevantContext : "Hiện chưa có thông tin cụ thể trong Knowledge Base.";

    $kbHeader = "### KNOWLEDGE BASE\nDưới đây là thông tin DUY NHẤT VÀ ĐÚNG NHẤT, MỚI NHẤT bạn được cung cấp. Linh hoạt CHỌN LỌC và KẾT HỢP, chỉ trả lời dựa trên thông tin này...\n---------------------\nKNOWLEDGE BASE: {\$kbContent}\n---------------------\n\n";
    $userTemplate = $settings['system_instruction'] ?? "Bạn là trợ lý ảo của {\$companyName}. Hãy hỗ trợ khách hàng chuyên nghiệp.";

    if (strpos($userTemplate, '### KNOWLEDGE BASE') !== false) {
        $parts = explode('---------------------', $userTemplate);
        if (count($parts) >= 3) {
            $userTemplate = trim(implode('---------------------', array_slice($parts, 2)));
        }
    }

    $fullPromptTemplate = $kbHeader . $userTemplate;
    $replacements = [
        '{$botName}' => $botName,
        '{$companyName}' => $companyName,
        '{$today}' => $today,
        '{$kbContent}' => $kbContent,
        '{$currentPage}' => $currentPage,
        '{$activityContext}' => $activityContext,
        '{$isIdentified}' => $isIdentified ? 'ĐÃ ĐỊNH DANH' : 'CHƯA ĐỊNH DANH',
    ];

    return str_replace(array_keys($replacements), array_values($replacements), $fullPromptTemplate);
}

$propertyId = $_GET['property_id'] ?? '';
$message = $_GET['message'] ?? '';
$history = $_GET['history'] ?? '';
$nocache = isset($_GET['nocache']) && $_GET['nocache'] === '1';

?>
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Chatbot - RAG Diagnosis Tool</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Inter', sans-serif;
            background-color: #f1f5f9;
        }

        pre {
            white-space: pre-wrap;
            word-break: break-all;
        }

        .score-bar {
            height: 8px;
            border-radius: 4px;
            background: #e2e8f0;
            overflow: hidden;
        }

        .score-fill {
            height: 100%;
            border-radius: 4px;
            transition: width 0.5s ease-out;
        }
    </style>
</head>

<body class="p-4 md:p-8">
    <div class="max-w-6xl mx-auto">
        <header class="mb-8 flex items-center justify-between">
            <div>
                <h1 class="text-3xl font-bold text-slate-900">🔍 RAG Diagnosis <span class="text-blue-600">v2.0</span>
                </h1>
                <p class="text-slate-500">Kiểm tra độ tự tin, điểm số và ngữ cảnh gửi cho AI</p>
            </div>
            <div class="text-right">
                <span
                    class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-wider">Active</span>
            </div>
        </header>

        <section class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
            <form method="GET" class="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div class="md:col-span-3">
                    <label class="block text-sm font-semibold text-slate-700 mb-1">Property ID</label>
                    <input type="text" name="property_id" value="<?php echo htmlspecialchars($propertyId); ?>"
                        placeholder="Tên bot (VD: swiss-umef)"
                        class="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        required>
                </div>
                <div class="md:col-span-7">
                    <label class="block text-sm font-semibold text-slate-700 mb-1">Câu hỏi kiểm tra (Query)</label>
                    <input type="text" name="message" value="<?php echo htmlspecialchars($message); ?>"
                        placeholder="Nhập câu khách hàng hay hỏi..."
                        class="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        required>
                </div>
                <div class="md:col-span-2 flex items-end">
                    <button type="submit"
                        class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-all shadow-md active:scale-95">
                        PHÂN TÍCH
                    </button>
                </div>
                <div class="md:col-span-10">
                    <label class="block text-sm font-semibold text-slate-700 mb-1">Lịch sử chat (Giả lập ngữ cảnh - phân
                        cách bởi |)</label>
                    <input type="text" name="history" value="<?php echo htmlspecialchars($history); ?>"
                        placeholder="VD: USER: Học phí bao nhiêu | BOT: Dạ học phí là 5tr..."
                        class="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm">
                </div>
                <div class="md:col-span-2 flex items-center justify-end px-2">
                    <label class="flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" name="nocache" value="1" <?php echo $nocache ? 'checked' : ''; ?>
                            class="w-4 h-4 text-blue-600 rounded">
                        <span class="text-sm font-semibold text-slate-700">Bypass Cache</span>
                    </label>
                </div>
            </form>
        </section>

        <?php if ($propertyId && $message): ?>
            <?php
            $settings = getSettingsLocal($pdo, $propertyId);
            if (!$settings) {
                echo '<div class="bg-red-50 border-l-4 border-red-500 p-4 mb-8 text-red-700 rounded-r-lg">❌ Không tìm thấy Bot với ID này. Hãy kiểm tra lại property_id.</div>';
            } else {
                $apiKey = $settings['gemini_api_key'] ?: getenv('GEMINI_API_KEY');
                $threshold = (float) ($settings['similarity_threshold'] ?? 0.45);

                // RAG Execution
                $ragContextParams = [
                    'last_user_msg' => '',
                    'last_bot_msg' => '',
                    'history_text' => $history,
                    'company_name' => $settings['company_name'] ?? 'MailFlow Pro',
                    'nocache' => $nocache
                ];

                $ragStart = microtime(true);
                $ragData = retrieveContext($pdo, $propertyId, $message, $ragContextParams, $apiKey, 20);
                $ragTime = round((microtime(true) - $ragStart) * 1000, 2);

                $maxScore = (float) ($ragData['max_score'] ?? 0);
                $confidenceThreshold = max(30.0, ($threshold * 100) - 10.0);
                $isLowConfidence = ($maxScore < $confidenceThreshold);
                $confidenceLevel = $isLowConfidence ? 'LOW' : 'HIGH';
                $confidenceColor = $isLowConfidence ? 'text-red-600 bg-red-100' : 'text-green-600 bg-green-100';

                // Simulate weights for UI visualization
                $qLen = mb_strlen($message);
                $vW = round(min(0.95, 0.75 + ($qLen / 400.0)) * 100);
                $kW = 100 - $vW;
                ?>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <!-- PANEL 1: METRICS -->
                    <div class="lg:col-span-1 space-y-6">
                        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            <div class="flex justify-between items-start mb-4">
                                <h2 class="text-sm font-bold text-slate-900 uppercase tracking-widest">MỨC ĐỘ TỰ TIN</h2>
                                <span
                                    class="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded">VECTOR-FIRST</span>
                            </div>
                            <div class="flex items-center justify-between mb-4">
                                <span class="text-4xl font-extrabold text-slate-900"><?php echo round($maxScore, 1); ?>%</span>
                                <span
                                    class="px-3 py-1 <?php echo $confidenceColor; ?> rounded-full text-xs font-bold"><?php echo $confidenceLevel; ?></span>
                            </div>
                            <div class="score-bar mb-2">
                                <div class="score-fill <?php echo $isLowConfidence ? 'bg-red-500' : 'bg-green-500'; ?>"
                                    style="width: <?php echo $maxScore; ?>%"></div>
                            </div>
                            <p class="text-[11px] text-slate-500">Trọng số hiện tại: <b><?php echo $vW; ?>% Thấu hiểu
                                    (Vector)</b> / <b><?php echo $kW; ?>% Từ khóa</b></p>
                            <p class="text-[11px] text-slate-500 mt-1">Ngưỡng tối thiểu:
                                <b><?php echo $confidenceThreshold; ?>%</b>
                            </p>
                            <?php if ($isLowConfidence): ?>
                                <p class="mt-3 text-sm text-red-500 font-medium">⚠️ CẢNH BÁO: AI sẽ trả lời câu mặc định khi không
                                    đủ tự tin.</p>
                            <?php endif; ?>
                        </div>

                        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            <h2 class="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4">TỐC ĐỘ XỬ LÝ</h2>
                            <div class="flex items-center gap-4">
                                <div class="p-3 bg-blue-50 rounded-xl">
                                    <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                            d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                                    </svg>
                                </div>
                                <div>
                                    <p class="text-slate-500 text-xs">Thời gian RAG</p>
                                    <p class="text-xl font-bold text-slate-900">
                                        <?php echo $ragTime; ?>ms
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            <h2 class="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4">CẤU HÌNH PHỐI HỢP</h2>
                            <div class="space-y-3">
                                <div class="flex justify-between text-sm">
                                    <span class="text-slate-500">Mô hình đề xuất</span>
                                    <span class="font-semibold">Gemini 2.5 Flash-Lite</span>
                                </div>
                                <div class="flex justify-between text-sm">
                                    <span class="text-slate-500">Sử dụng Cache</span>
                                    <span class="font-semibold text-blue-600">
                                        <?php echo ($ragData['perf']['cached'] ?? false) ? 'CÓ' : 'KHÔNG'; ?>
                                    </span>
                                </div>
                                <div class="flex justify-between text-sm">
                                    <span class="text-slate-500">Tối ưu Vector</span>
                                    <span class="font-semibold">TRUE</span>
                                </div>
                            </div>
                        </div>

                        <?php if (!empty($ragData['perf']['debug'])): ?>
                            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                                <h2 class="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4">🔍 DEBUG INFO</h2>
                                <div class="space-y-2 text-xs font-mono">
                                    <?php foreach ($ragData['perf']['debug'] as $key => $val): ?>
                                        <div class="flex justify-between">
                                            <span class="text-slate-500"><?php echo htmlspecialchars($key); ?></span>
                                            <span class="font-bold text-slate-900"><?php echo htmlspecialchars($val); ?></span>
                                        </div>
                                    <?php endforeach; ?>
                                </div>
                            </div>
                        <?php endif; ?>
                    </div>

                    <!-- PANEL 2: CHUNKS -->
                    <div class="lg:col-span-2 space-y-6">
                        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            <h2 class="text-sm font-bold text-slate-900 uppercase tracking-widest mb-6">DANH SÁCH CHUNKS TÌM
                                THẤY (TOP 20)</h2>

                            <?php if (empty($ragData['results'])): ?>
                                <div class="p-8 text-center text-slate-400 italic">Không tìm thấy mảnh dữ liệu nào phù hợp.</div>
                            <?php else: ?>
                                <div class="space-y-4">
                                    <?php foreach ($ragData['results'] as $idx => $res): ?>
                                        <?php
                                        $pass = ($res['score'] >= $confidenceThreshold);
                                        $vScore = round(($res['vector_score'] ?? 0) * 100, 1);
                                        $kScore = round(($res['keyword_score'] ?? 0) * 100, 1);
                                        $fScore = round($res['score'], 1);
                                        ?>
                                        <div
                                            class="p-4 rounded-xl border <?php echo $pass ? 'border-green-200 bg-green-50/30' : 'border-slate-200'; ?> transition-all hover:shadow-md">
                                            <div class="flex items-start justify-between mb-3">
                                                <div class="flex items-center gap-3">
                                                    <span
                                                        class="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-900 text-white text-xs font-bold">
                                                        <?php echo $idx + 1; ?>
                                                    </span>
                                                    <div>
                                                        <p class="font-bold text-slate-800 text-sm">
                                                            <?php echo htmlspecialchars($res['source_name']); ?>
                                                        </p>
                                                        <p class="text-[10px] text-slate-400 uppercase font-bold">ID:
                                                            <?php echo $res['chunk_id']; ?>
                                                        </p>
                                                    </div>
                                                </div>
                                                <div class="text-right">
                                                    <div
                                                        class="text-lg font-black <?php echo $pass ? 'text-green-600' : 'text-slate-400'; ?>">
                                                        <?php echo $fScore; ?>%
                                                    </div>
                                                    <div class="text-[10px] uppercase font-bold text-slate-400">Final Score</div>
                                                </div>
                                            </div>

                                            <div class="grid grid-cols-2 gap-4 mb-4">
                                                <div>
                                                    <div class="flex justify-between text-[10px] mb-1 font-bold">
                                                        <span>Vector/Semantic</span>
                                                        <span>
                                                            <?php echo $vScore; ?>%
                                                        </span>
                                                    </div>
                                                    <div class="score-bar">
                                                        <div class="score-fill bg-blue-500/50" style="width: <?php echo $vScore; ?>%">
                                                        </div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <div class="flex justify-between text-[10px] mb-1 font-bold">
                                                        <span>Keyword/FTS</span>
                                                        <span>
                                                            <?php echo $kScore; ?>%
                                                        </span>
                                                    </div>
                                                    <div class="score-bar">
                                                        <div class="score-fill bg-orange-500/50" style="width: <?php echo $kScore; ?>%">
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div
                                                class="bg-white p-3 rounded-lg border border-slate-100 text-sm text-slate-700 font-medium leading-relaxed">
                                                <?php
                                                // Preview content
                                                $content = $res['content'];
                                                if (strpos($content, '[CONTENT]') !== false) {
                                                    $parts = explode('[CONTENT]', $content);
                                                    $content = trim(end($parts));
                                                }
                                                echo nl2br(htmlspecialchars($content));
                                                ?>
                                            </div>
                                        </div>
                                    <?php endforeach; ?>
                                </div>
                            <?php endif; ?>
                        </div>
                    </div>

                    <!-- PANEL 3: FINAL PROMPT -->
                    <div class="lg:col-span-3">
                        <div class="bg-slate-900 p-8 rounded-3xl shadow-xl">
                            <div class="flex items-center justify-between mb-6">
                                <h2 class="text-sm font-bold text-blue-400 uppercase tracking-widest">DỮ LIỆU GỬI CHO GEMINI
                                    (PROMPT SIMULATION)</h2>
                                <span class="px-2 py-1 bg-blue-500 text-white text-[10px] font-bold rounded">RAW DATA</span>
                            </div>

                            <?php
                            $relevantContext = "";
                            foreach (($ragData['results'] ?? []) as $c) {
                                if ($c['score'] >= $confidenceThreshold) {
                                    $relevantContext .= $c['content'] . "\n---\n";
                                }
                            }
                            $finalPrompt = buildSystemPromptLocal($settings, "(GIẢ LẬP CONTEXT)", $relevantContext, false, "(DEBUG_PAGE)");
                            ?>

                            <div
                                class="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 font-mono text-xs text-slate-300 overflow-x-auto leading-relaxed">
                                <?php echo nl2br(htmlspecialchars($finalPrompt)); ?>
                            </div>

                            <div class="mt-8 flex gap-4">
                                <div class="flex-1 bg-white/5 p-4 rounded-xl border border-white/10">
                                    <p class="text-[10px] text-slate-500 font-bold uppercase mb-1">Tokens ước tính</p>
                                    <p class="text-xl font-bold text-white">
                                        <?php echo ceil(strlen($finalPrompt) / 4); ?>
                                    </p>
                                </div>
                                <div class="flex-1 bg-white/5 p-4 rounded-xl border border-white/10">
                                    <p class="text-[10px] text-slate-500 font-bold uppercase mb-1">Dung lượng Context</p>
                                    <p class="text-xl font-bold text-white">
                                        <?php echo round(strlen($relevantContext) / 1024, 1); ?> KB
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            <?php } ?>
        <?php else: ?>
            <div class="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center">
                <div class="mb-4 inline-flex items-center justify-center p-4 bg-blue-50 rounded-full">
                    <svg class="w-12 h-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                </div>
                <h3 class="text-xl font-bold text-slate-900 mb-2">Sẵn sàng phân tích</h3>
                <p class="text-slate-500 max-w-sm mx-auto">Vui lòng nhập <b>Property ID</b> và <b>Câu hỏi</b> ở khung phía
                    trên để bắt đầu chẩn đoán dữ liệu.</p>
            </div>
        <?php endif; ?>

        <footer class="mt-12 text-center text-slate-400 text-sm">
            &copy; 2026 MailFlow Pro - AI Diagnostics Terminal
        </footer>
    </div>
</body>

</html>