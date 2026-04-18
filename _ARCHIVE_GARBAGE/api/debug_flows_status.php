<?php
require_once 'db_connect.php';

// Set header for HTML output
header('Content-Type: text/html; charset=utf-8');

/**
 * Helper to get step label from flow steps JSON
 */
function getStepLabel($stepsJson, $stepId)
{
    if (empty($stepsJson))
        return $stepId;
    $steps = json_decode($stepsJson, true);
    if (!is_array($steps))
        return $stepId;

    foreach ($steps as $step) {
        if (($step['id'] ?? '') == $stepId) {
            return ($step['label'] ?? 'Untitled Step') . " (" . ($step['type'] ?? 'unknown') . ")";
        }
    }
    return $stepId;
}

try {
    // 1. Get Summary Stats
    $summary = $pdo->query("SELECT status, COUNT(*) as count FROM subscriber_flow_states GROUP BY status")->fetchAll(PDO::FETCH_KEY_PAIR);

    // 2. Get Active Flows with count
    $activeFlows = $pdo->query("
        SELECT f.name, f.id, COUNT(sfs.id) as active_count 
        FROM flows f
        JOIN subscriber_flow_states sfs ON f.id = sfs.flow_id
        WHERE sfs.status IN ('waiting', 'processing')
        GROUP BY f.id
        ORDER BY active_count DESC
    ")->fetchAll();

    // 3. Get Recent/Active Queue Details
    $details = $pdo->query("
        SELECT 
            sfs.*, 
            s.email as sub_email, 
            f.name as flow_name, 
            f.steps as flow_steps
        FROM subscriber_flow_states sfs
        JOIN subscribers s ON sfs.subscriber_id = s.id
        JOIN flows f ON sfs.flow_id = f.id
        WHERE sfs.status != 'completed'
        ORDER BY sfs.updated_at DESC
        LIMIT 100
    ")->fetchAll();

    ?>
    <!DOCTYPE html>
    <html lang="vi">

    <head>
        <meta charset="UTF-8">
        <title>Flow Monitor - Diagnostic Tool</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
            body {
                font-family: 'Inter', sans-serif;
                background: #f8fafc;
            }

            .glass {
                background: rgba(255, 255, 255, 0.7);
                backdrop-filter: blur(10px);
            }
        </style>
    </head>

    <body class="p-8">
        <div class="max-w-7xl mx-auto">
            <div class="flex justify-between items-center mb-8">
                <h1 class="text-3xl font-bold text-slate-900">🔍 Flow Execution Monitor</h1>
                <div class="text-sm text-slate-500">Last Refresh:
                    <?php echo date('H:i:s'); ?>
                </div>
            </div>

            <!-- Summary Cards -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                <?php
                $statuses = ['waiting' => 'bg-blue-500', 'processing' => 'bg-yellow-500', 'completed' => 'bg-green-500', 'failed' => 'bg-red-500'];
                foreach ($statuses as $status => $color):
                    $count = $summary[$status] ?? 0;
                    ?>
                    <div class="glass p-6 rounded-2xl shadow-sm border border-slate-200">
                        <div class="text-slate-500 text-sm font-semibold uppercase tracking-wider">
                            <?php echo $status; ?>
                        </div>
                        <div class="flex items-center mt-2">
                            <div class="text-4xl font-bold text-slate-900">
                                <?php echo number_format($count); ?>
                            </div>
                            <div class="ml-auto w-3 h-3 rounded-full <?php echo $color; ?> animate-pulse"></div>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <!-- Active Flows List -->
                <div class="lg:col-span-1">
                    <div class="glass p-6 rounded-2xl shadow-sm border border-slate-200 h-full">
                        <h2 class="text-xl font-bold text-slate-900 mb-6">Active Flows</h2>
                        <div class="space-y-4">
                            <?php if (empty($activeFlows)): ?>
                                <p class="text-slate-400 italic">No flows currently running.</p>
                            <?php endif; ?>
                            <?php foreach ($activeFlows as $f): ?>
                                <div
                                    class="flex items-center p-4 rounded-xl bg-white border border-slate-100 hover:border-blue-300 transition-all cursor-default">
                                    <div class="flex-1">
                                        <div class="font-semibold text-slate-800">
                                            <?php echo htmlspecialchars($f['name']); ?>
                                        </div>
                                        <div class="text-xs text-slate-400">ID:
                                            <?php echo $f['id']; ?>
                                        </div>
                                    </div>
                                    <div class="bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-bold text-sm">
                                        <?php echo $f['active_count']; ?>
                                    </div>
                                </div>
                            <?php endforeach; ?>
                        </div>
                    </div>
                </div>

                <!-- Detailed Queue -->
                <div class="lg:col-span-2">
                    <div class="glass p-6 rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <h2 class="text-xl font-bold text-slate-900 mb-6 font-display">Live Queue Details (Top 100)</h2>
                        <div class="overflow-x-auto">
                            <table class="w-full text-left">
                                <thead>
                                    <tr class="border-b border-slate-100">
                                        <th class="pb-4 font-semibold text-slate-600 text-sm">Subscriber</th>
                                        <th class="pb-4 font-semibold text-slate-600 text-sm">Flow & Current Step</th>
                                        <th class="pb-4 font-semibold text-slate-600 text-sm">Scheduled / Updated</th>
                                        <th class="pb-4 font-semibold text-slate-600 text-sm">Status</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-50">
                                    <?php if (empty($details)): ?>
                                        <tr>
                                            <td colspan="4" class="py-10 text-center text-slate-400">No active queue items
                                                found.</td>
                                        </tr>
                                    <?php endif; ?>
                                    <?php foreach ($details as $row):
                                        $stepLabel = getStepLabel($row['flow_steps'], $row['step_id']);
                                        $isStale = (strtotime($row['scheduled_at']) < time() && $row['status'] === 'waiting');
                                        ?>
                                        <tr class="hover:bg-slate-50 transition-colors">
                                            <td class="py-4">
                                                <div class="font-medium text-slate-900 text-sm">
                                                    <?php echo htmlspecialchars($row['sub_email']); ?>
                                                </div>
                                                <div class="text-[10px] text-slate-400">UID:
                                                    <?php echo $row['subscriber_id']; ?>
                                                </div>
                                            </td>
                                            <td class="py-4">
                                                <div class="text-sm font-semibold text-blue-600">
                                                    <?php echo htmlspecialchars($row['flow_name']); ?>
                                                </div>
                                                <div class="text-xs text-slate-600 mt-1">
                                                    <?php echo htmlspecialchars($stepLabel); ?>
                                                </div>
                                            </td>
                                            <td class="py-4">
                                                <div
                                                    class="text-xs <?php echo $isStale ? 'text-red-500 font-bold' : 'text-slate-700'; ?>">
                                                    <?php echo date('d/m H:i:s', strtotime($row['scheduled_at'])); ?>
                                                    <?php if ($isStale)
                                                        echo " (Stale!)"; ?>
                                                </div>
                                                <div class="text-[10px] text-slate-400 mt-1">Up:
                                                    <?php echo date('H:i:s', strtotime($row['updated_at'])); ?>
                                                </div>
                                            </td>
                                            <td class="py-4">
                                                <?php
                                                $statusClass = [
                                                    'waiting' => 'bg-blue-100 text-blue-700',
                                                    'processing' => 'bg-yellow-100 text-yellow-700',
                                                    'failed' => 'bg-red-100 text-red-700'
                                                ];
                                                $cls = $statusClass[$row['status']] ?? 'bg-slate-100 text-slate-700';
                                                ?>
                                                <span
                                                    class="px-2.5 py-1 rounded-full text-xs font-bold uppercase <?php echo $cls; ?>">
                                                    <?php echo $row['status']; ?>
                                                </span>
                                                <?php if (!empty($row['last_error'])): ?>
                                                    <div class="text-[10px] text-red-500 mt-1 max-w-[150px] truncate"
                                                        title="<?php echo htmlspecialchars($row['last_error']); ?>">
                                                        ERR:
                                                        <?php echo htmlspecialchars($row['last_error']); ?>
                                                    </div>
                                                <?php endif; ?>
                                            </td>
                                        </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Diagnostic Help -->
            <div class="mt-8 p-6 glass rounded-2xl border border-blue-100 bg-blue-50/30">
                <h3 class="text-sm font-bold text-blue-900 uppercase tracking-widest mb-4">Quick Diagnostic Guide</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-blue-800">
                    <div class="flex gap-3">
                        <div class="font-bold text-blue-600 shrink-0">01.</div>
                        <div>Nếu thấy nhiều <strong>Stale!</strong> (màu đỏ): Nghĩa là tiến trình Cronjob đang bị chậm hoặc
                            không chạy thường xuyên.</div>
                    </div>
                    <div class="flex gap-3">
                        <div class="font-bold text-blue-600 shrink-0">02.</div>
                        <div>Nếu trạng thái <strong>processing</strong> kéo dài > 5 phút: Có thể script bị lỗi Fatal Error
                            hoặc Timeout giữa chừng.</div>
                    </div>
                    <div class="flex gap-3">
                        <div class="font-bold text-blue-600 shrink-0">03.</div>
                        <div><strong>Failed</strong>: Luôn kiểm tra cột mã lỗi (ERR) để biết nguyên nhân (Sai API key Zalo,
                            SMTP lỗi, v.v.).</div>
                    </div>
                </div>
            </div>
        </div>
    </body>

    </html>
    <?php
} catch (Exception $e) {
    die("<div style='color:red; padding:20px;'>FATAL ERROR: " . $e->getMessage() . "</div>");
}
