<?php
// api/test_click_api.php - Test API exactly like frontend calls it
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'db_connect.php';

echo "<pre>";
echo "========================================\n";
echo "TESTING CLICK API ENDPOINTS\n";
echo "========================================\n\n";

// Test 1: Flow with clicks
$flowId = '0e5c79b1-91f3-4dd3-8d5e-902781b022d3';
$stepId = '6c22f701-f38c-4104-9a86-dcd289c954e9';

echo "1. Testing Flow 'Gia nhập Danh sách':\n";
echo "   Flow ID: $flowId\n";
echo "   Step ID: $stepId\n\n";

// Simulate click_summary call
echo "   A. Click Summary (all steps):\n";
$_GET['route'] = 'click_summary';
$_GET['id'] = $flowId;
unset($_GET['step_id']);

ob_start();
include 'flows.php';
$response = ob_get_clean();
$data = json_decode($response, true);

if ($data && $data['success']) {
    echo "      ✓ API Success\n";
    echo "      Response: " . json_encode($data['data'], JSON_PRETTY_PRINT) . "\n\n";
} else {
    echo "      ✗ API Failed\n";
    echo "      Response: $response\n\n";
}

// Simulate click_summary call with step_id
echo "   B. Click Summary (specific step):\n";
$_GET['route'] = 'click_summary';
$_GET['id'] = $flowId;
$_GET['step_id'] = $stepId;

ob_start();
include 'flows.php';
$response = ob_get_clean();
$data = json_decode($response, true);

if ($data && $data['success']) {
    echo "      ✓ API Success\n";
    echo "      Response: " . json_encode($data['data'], JSON_PRETTY_PRINT) . "\n\n";
} else {
    echo "      ✗ API Failed\n";
    echo "      Response: $response\n\n";
}

// Test 2: Campaign with clicks
$campaignId = '69594d0719832';

echo "2. Testing Campaign (ID: $campaignId):\n\n";

echo "   A. Click Summary:\n";
$_GET['route'] = 'click_summary';
$_GET['id'] = $campaignId;
unset($_GET['step_id']);

ob_start();
include 'campaigns.php';
$response = ob_get_clean();
$data = json_decode($response, true);

if ($data && $data['success']) {
    echo "      ✓ API Success\n";
    echo "      Response: " . json_encode($data['data'], JSON_PRETTY_PRINT) . "\n\n";
} else {
    echo "      ✗ API Failed\n";
    echo "      Response: $response\n\n";
}

// Test 3: Participants endpoint (what UI actually uses for details)
echo "3. Testing Participants Endpoint (Flow):\n\n";

$_GET['route'] = 'participants';
$_GET['type'] = 'clicks';
$_GET['id'] = $flowId;
$_GET['step_id'] = $stepId;
$_GET['page'] = 1;
$_GET['limit'] = 50;
$_GET['search'] = '';
$_GET['link'] = '';

ob_start();
include 'flows.php';
$response = ob_get_clean();
$data = json_decode($response, true);

if ($data && $data['success']) {
    echo "   ✓ API Success\n";
    echo "   Total clicks: " . ($data['data']['pagination']['total'] ?? 0) . "\n";
    echo "   Clicks returned: " . count($data['data']['data'] ?? []) . "\n\n";

    if (!empty($data['data']['data'])) {
        echo "   Sample click:\n";
        echo "   " . json_encode($data['data']['data'][0], JSON_PRETTY_PRINT) . "\n\n";
    }
} else {
    echo "   ✗ API Failed\n";
    echo "   Response: $response\n\n";
}

echo "========================================\n";
echo "DIAGNOSIS\n";
echo "========================================\n\n";

echo "If all tests show ✓ API Success with data:\n";
echo "  → Backend is working correctly\n";
echo "  → Problem is in Frontend (React component)\n\n";

echo "If tests show ✗ API Failed or empty data:\n";
echo "  → Backend has an issue\n";
echo "  → Need to fix API endpoint\n\n";

echo "Next steps:\n";
echo "1. Check Browser DevTools → Network tab\n";
echo "2. Find the API call to 'click_summary'\n";
echo "3. Compare request URL with working test above\n";
echo "4. Check if flow_id/campaign_id matches\n\n";

echo "========================================\n";
echo "</pre>";
?>