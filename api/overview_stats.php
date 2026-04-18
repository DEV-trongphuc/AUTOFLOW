<?php
require_once 'bootstrap.php';
require_once 'auth_middleware.php'; // [FIX] Dashboard stats must be workspace-scoped

header('Content-Type: application/json');

$workspace_id = get_current_workspace_id();

// Get the days explicitly
$days = isset($_GET['days']) ? (int)$_GET['days'] : 7;
if ($days < 1 || $days > 90) {
    $days = 7;
}

$startDate = date('Y-m-d 00:00:00', strtotime("-$days days"));
$endDate = date('Y-m-d 23:59:59');


try {
    // 1. Web Analytics (web_page_views) — scoped by workspace_id
    $stmtWeb = $pdo->prepare("
        SELECT DATE(loaded_at) as date, COUNT(*) as count 
        FROM web_page_views 
        WHERE workspace_id = ? AND loaded_at BETWEEN ? AND ? 
        GROUP BY DATE(loaded_at)
    ");
    $stmtWeb->execute([$workspace_id, $startDate, $endDate]);
    $rawWebStats = $stmtWeb->fetchAll(PDO::FETCH_KEY_PAIR);

    // 2. AI Messages — scoped by workspace_id
    $stmtAi = $pdo->prepare("
        SELECT DATE(created_at) as date, COUNT(*) as count 
        FROM ai_messages 
        WHERE workspace_id = ? AND sender IN ('ai', 'bot', 'model') 
        AND created_at BETWEEN ? AND ? 
        GROUP BY DATE(created_at)
    ");
    $stmtAi->execute([$workspace_id, $startDate, $endDate]);
    $rawAiStats = $stmtAi->fetchAll(PDO::FETCH_KEY_PAIR);

    // 3. New Leads (subscribers) — scoped by workspace_id
    $stmtLead = $pdo->prepare("
        SELECT DATE(joined_at) as date, COUNT(*) as count 
        FROM subscribers 
        WHERE workspace_id = ? AND joined_at BETWEEN ? AND ? 
        GROUP BY DATE(joined_at)
    ");
    $stmtLead->execute([$workspace_id, $startDate, $endDate]);
    $rawLeadStats = $stmtLead->fetchAll(PDO::FETCH_KEY_PAIR);


    // Prepare Date Range Series
    $chartData = [];
    $totalWeb = 0;
    $totalAi = 0;
    $totalLeads = 0;

    for ($i = $days - 1; $i >= 0; $i--) {
        $d = date('Y-m-d', strtotime("-$i days"));
        $w = $rawWebStats[$d] ?? 0;
        $a = $rawAiStats[$d] ?? 0;
        $l = $rawLeadStats[$d] ?? 0;

        $totalWeb += $w;
        $totalAi += $a;
        $totalLeads += $l;

        $chartData[] = [
            'date' => date('d/m', strtotime($d)),
            'web' => $w,
            'ai' => $a,
            'leads' => $l
        ];
    }

    // 4. Top Campaigns — scoped by workspace_id
    $stmtCamp = $pdo->prepare("
        SELECT name, type, status, count_opened as stat_total_opened, count_sent as stat_total_sent, count_clicked as stat_total_clicked 
        FROM campaigns 
        WHERE workspace_id = ? AND status IN ('sent', 'sending', 'scheduled') 
        ORDER BY count_opened DESC, count_sent DESC 
        LIMIT 5
    ");
    $stmtCamp->execute([$workspace_id]);
    $topCampaigns = $stmtCamp->fetchAll(PDO::FETCH_ASSOC);

    // 5. Top Flows — scoped by workspace_id
    $stmtFlow = $pdo->prepare("
        SELECT name, trigger_type, stat_enrolled, stat_completed 
        FROM flows 
        WHERE workspace_id = ? AND status = 'active' 
        ORDER BY stat_enrolled DESC 
        LIMIT 5
    ");
    $stmtFlow->execute([$workspace_id]);
    $topFlows = $stmtFlow->fetchAll(PDO::FETCH_ASSOC);



    // --- ADVANCED: Calculate "Percentage Growth" vs Previous Period ---
    $prevStart = date('Y-m-d 00:00:00', strtotime("-" . ($days * 2) . " days"));
    $prevEnd = date('Y-m-d 23:59:59', strtotime("-" . ($days + 1) . " days"));

    $stmtWebPrev = $pdo->prepare("SELECT COUNT(*) FROM web_page_views WHERE workspace_id = ? AND loaded_at BETWEEN ? AND ?");
    $stmtWebPrev->execute([$workspace_id, $prevStart, $prevEnd]);
    $prevWeb = $stmtWebPrev->fetchColumn();

    $stmtAiPrev = $pdo->prepare("SELECT COUNT(*) FROM ai_messages WHERE workspace_id = ? AND sender IN ('ai', 'bot', 'model') AND created_at BETWEEN ? AND ?");
    $stmtAiPrev->execute([$workspace_id, $prevStart, $prevEnd]);
    $prevAi = $stmtAiPrev->fetchColumn();

    $stmtLeadPrev = $pdo->prepare("SELECT COUNT(*) FROM subscribers WHERE workspace_id = ? AND joined_at BETWEEN ? AND ?");
    $stmtLeadPrev->execute([$workspace_id, $prevStart, $prevEnd]);
    $prevLead = $stmtLeadPrev->fetchColumn();


    $calcGrowth = function($current, $prev) {
        if ($prev == 0) return $current > 0 ? 100 : 0;
        return round((($current - $prev) / $prev) * 100, 1);
    };

    $growthWeb = $calcGrowth($totalWeb, $prevWeb);
    $growthAi = $calcGrowth($totalAi, $prevAi);
    $growthLeads = $calcGrowth($totalLeads, $prevLead);

    echo json_encode([
        'success' => true,
        'summary' => [
            'total_web' => $totalWeb,
            'growth_web' => $growthWeb,
            'total_ai' => $totalAi,
            'growth_ai' => $growthAi,
            'total_leads' => $totalLeads,
            'growth_leads' => $growthLeads,
        ],
        'chart_data' => $chartData,
        'top_campaigns' => $topCampaigns,
        'top_flows' => $topFlows
    ]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
