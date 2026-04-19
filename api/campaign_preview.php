<?php
require_once 'db_connect.php';
require_once 'flow_helpers.php';
require_once 'auth_middleware.php';
apiHeaders();

// [SECURITY] Require authenticated workspace session
if (empty($GLOBALS['current_admin_id']) && empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

// Accept both GET and POST for flexibility
$method = $_SERVER['REQUEST_METHOD'];
$data = [];

if ($method === 'GET') {
    $data = $_GET;
} elseif ($method === 'POST') {
    $inputData = json_decode(file_get_contents("php://input"), true);
    $data = $inputData ?: [];
} else {
    jsonResponse(false, null, 'Method not allowed');
}

$campaignId = $data['campaign_id'] ?? null;
$templateId = $data['template_id'] ?? null;
$email = $data['email'] ?? null;
$reminderId = $data['reminder_id'] ?? null;

// Require either campaign_id or template_id
if (!$campaignId && !$templateId) {
    jsonResponse(false, null, 'Either campaign_id or template_id is required');
}

try {
    // 1. Fetch Subscriber (Optional for general preview)
    $subscriber = ['first_name' => 'Khách hàng', 'last_name' => '', 'email' => 'customer@example.com'];
    if ($email) {
        $stmtSub = $pdo->prepare("SELECT * FROM subscribers WHERE email = ? LIMIT 1");
        $stmtSub->execute([$email]);
        $fetchedSub = $stmtSub->fetch(PDO::FETCH_ASSOC);
        if ($fetchedSub)
            $subscriber = $fetchedSub;
    }

    // 2. Fetch Content
    $htmlContent = '';
    $subject = '';

    if ($reminderId) {
        // Fetch Reminder Content
        $stmtRem = $pdo->prepare("SELECT * FROM campaign_reminders WHERE id = ? LIMIT 1");
        $stmtRem->execute([$reminderId]);
        $reminder = $stmtRem->fetch(PDO::FETCH_ASSOC);

        if ($reminder) {
            $subject = $reminder['subject'];
            $htmlContent = resolveEmailContent($pdo, $reminder['template_id'], '', '');
        }
    } elseif ($templateId && !$campaignId) {
        // NEW: Direct template preview (for template selection step)
        $subject = 'Template Preview';
        $htmlContent = resolveEmailContent($pdo, $templateId, '', '');
    } else {
        // Fetch Main Campaign Content
        $stmtCamp = $pdo->prepare("SELECT * FROM campaigns WHERE id = ? LIMIT 1");
        $stmtCamp->execute([$campaignId]);
        $campaign = $stmtCamp->fetch(PDO::FETCH_ASSOC);

        if ($campaign) {
            $subject = $campaign['subject'];

            // Handle ZNS Type
            if (($campaign['type'] ?? 'email') === 'zalo_zns' && !empty($campaign['template_id'])) {
                $stmtTpl = $pdo->prepare("SELECT template_name, template_data FROM zalo_templates WHERE template_id = ? LIMIT 1");
                $stmtTpl->execute([$campaign['template_id']]);
                $tpl = $stmtTpl->fetch(PDO::FETCH_ASSOC);

                if ($tpl) {
                    $subject = "ZNS: " . $tpl['template_name'];
                    $tplData = json_decode($tpl['template_data'], true);
                    $previewUrl = $tplData['detail']['previewUrl'] ?? '';

                    if ($previewUrl) {
                        // Embed Zalo Preview URL
                        $htmlContent = '<html><body style="margin:0;padding:0;"><iframe src="' . htmlspecialchars($previewUrl) . '" style="width:100%; height:100vh; border:none;"></iframe></body></html>';
                    } else {
                        // Fallback: Display Params
                        $htmlContent = '<div style="font-family:sans-serif; padding:20px;"><h3>' . htmlspecialchars($tpl['template_name']) . '</h3><p>Template ID: ' . htmlspecialchars($campaign['template_id']) . '</p>';
                        $htmlContent .= '<p>Preview URL not available. Please sync template details.</p></div>';
                    }
                } else {
                    $subject = "ZNS Template Not Found";
                    $htmlContent = "Template ID: " . htmlspecialchars($campaign['template_id']) . " not found in local database.";
                }
            } else {
                // Standard Email
                $htmlContent = resolveEmailContent($pdo, $campaign['template_id'], $campaign['custom_html'] ?? '', $campaign['content_body']);
            }
        }
    }

    if (empty($htmlContent)) {
        jsonResponse(false, null, 'Content not found');
    }

    // 3. Personalize
    $finalSubject = replaceMergeTags($subject, $subscriber);
    $finalHtml = replaceMergeTags($htmlContent, $subscriber);

    jsonResponse(true, [
        'subject' => $finalSubject,
        'html' => $finalHtml
    ]);

} catch (Exception $e) {
    jsonResponse(false, null, $e->getMessage());
}
