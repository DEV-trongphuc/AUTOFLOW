<?php
/**
 * Zalo OAuth Callback Handler (Stateful / DB-backed)
 * Handles default redirections and token exchange using DB-stored PKCE verifier.
 */

require_once 'db_connect.php';
require_once 'zalo_helpers.php';
require_once 'zalo_config.php';

// 1. Validate Input
$code = $_GET['code'] ?? null;
$state = $_GET['state'] ?? null; // This corresponds to the Config ID we created temporarily

if (!$code) {
    die('Authorization code missing.');
}

if (!$state) {
    die('State parameter missing.');
}

// 2. Retrieve Verifier from DB using State (Session ID)
$stmt = $pdo->prepare("SELECT id, pkce_verifier, app_id, app_secret FROM zalo_oa_configs WHERE id = ?");
$stmt->execute([$state]);
$session_config = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$session_config) {
    die('Invalid state or session expired (Record not found in DB). Please try connecting again.');
}

$code_verifier = $session_config['pkce_verifier'];
// Master Config Priority
$app_id = defined('ZALO_APP_ID') ? ZALO_APP_ID : $session_config['app_id'];
$app_secret = defined('ZALO_APP_SECRET') ? ZALO_APP_SECRET : $session_config['app_secret'];

if (empty($code_verifier)) {
    die('PKCE Verifier missing from session record.');
}

// 3. Exchange Code for Access Token
$token_url = 'https://oauth.zaloapp.com/v4/oa/access_token';

$params = [
    'code' => $code,
    'app_id' => $app_id,
    'grant_type' => 'authorization_code',
    'code_verifier' => $code_verifier
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $token_url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($params));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/x-www-form-urlencoded',
    'secret_key: ' . $app_secret
]);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($http_code !== 200) {
    die('Failed to exchange token: ' . $response);
}

$token_data = json_decode($response, true);

if (!isset($token_data['access_token'])) {
    die('Zalo Token Error: ' . ($token_data['error_name'] ?? 'Unknown') . ' - ' . ($token_data['error_description'] ?? $response));
}

$access_token = $token_data['access_token'];
$refresh_token = $token_data['refresh_token'];
$expires_in = $token_data['expires_in'];
$expires_at = date('Y-m-d H:i:s', time() + $expires_in);

// 4. Get OA Information
$info_url = 'https://openapi.zalo.me/v2.0/oa/getoa';
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $info_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'access_token: ' . $access_token
]);

$info_response = curl_exec($ch);
$info_data = json_decode($info_response, true);
curl_close($ch);

$oa_name = 'Zalo OA';
$oa_real_id = '';

if (isset($info_data['data'])) {
    $oa_name = $info_data['data']['name'] ?? 'Zalo OA';
    $oa_real_id = $info_data['data']['oa_id'] ?? '';
}

// 5. Update Database Logic
$final_oa_config_id = $state;

if ($oa_real_id) {
    // Check if this OA ID already exists in another record (Clean up duplicates)
    $stmt = $pdo->prepare("SELECT id FROM zalo_oa_configs WHERE oa_id = ? AND id != ?");
    $stmt->execute([$oa_real_id, $state]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($existing) {
        // Conflict: Update the OLD record, Delete the TEMP record (current session)
        $target_id = $existing['id'];

        $stmt = $pdo->prepare("
            UPDATE zalo_oa_configs 
            SET access_token=?, 
                refresh_token=?, 
                token_expires_at=?, 
                status='active', 
                updated_at=NOW(),
                avatar=?,
                app_id=?, 
                app_secret=?
            WHERE id=?
        ");
        $stmt->execute([
            $access_token,
            $refresh_token,
            $expires_at,
            $info_data['data']['avatar'] ?? '',
            $app_id,
            $app_secret,
            $target_id
        ]);

        // Delete the temp session record
        $pdo->prepare("DELETE FROM zalo_oa_configs WHERE id=?")->execute([$state]);

        $final_oa_config_id = $target_id;
    } else {
        // No conflict: Update the TEMP record to be the REAL record
        $stmt = $pdo->prepare("
            UPDATE zalo_oa_configs 
            SET oa_id=?, 
                name=?, 
                avatar=?,
                access_token=?, 
                refresh_token=?, 
                token_expires_at=?, 
                status='active', 
                updated_at=NOW()
            WHERE id=?
        ");
        $stmt->execute([
            $oa_real_id,
            $oa_name,
            $info_data['data']['avatar'] ?? '',
            $access_token,
            $refresh_token,
            $expires_at,
            $state
        ]);
    }
} else {
    // Fallback: Update tokens on the temp record
    $stmt = $pdo->prepare("
            UPDATE zalo_oa_configs 
            SET access_token=?, 
                refresh_token=?, 
                token_expires_at=?, 
                status='active', 
                updated_at=NOW()
            WHERE id=?
        ");
    $stmt->execute([
        $access_token,
        $refresh_token,
        $expires_at,
        $state
    ]);
}

?>
<!DOCTYPE html>
<html>

<head>
    <title>Kết nối thành công</title>
    <style>
        body {
            font-family: -apple-system, sans-serif;
            text-align: center;
            padding-top: 50px;
        }

        .success-icon {
            color: #10b981;
            font-size: 48px;
            margin-bottom: 20px;
        }

        h2 {
            color: #0f172a;
            margin: 0 0 10px;
        }
    </style>
</head>

<body>
    <div class="success-icon">✓</div>
    <h2>Kết nối OA "<?php echo htmlspecialchars($oa_name); ?>" thành công!</h2>
    <p>Bạn có thể đóng cửa sổ này và quay lại trang quản trị.</p>

    <button onclick="closeWindow()"
        style="background: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 16px; margin-top: 20px;">Đóng
        cửa sổ</button>

    <script>
        function closeWindow() {
            if (window.opener) {
                try {
                    window.opener.postMessage({ type: 'ZALO_AUTH_SUCCESS', oaId: '<?php echo $final_oa_config_id; ?>' }, '*');
                } catch (e) { console.error(e); }
            }
            window.close();
        }

        setTimeout(closeWindow, 2000);
    </script>
</body>

</html>