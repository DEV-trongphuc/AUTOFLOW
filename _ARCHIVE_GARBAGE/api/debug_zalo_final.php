<?php
// debug_zalo_final.php
// Script TEST CỨNG - PKCE CHUẨN ZALO (43 CHARS ALPHANUMERIC)

// 1. App ID (Theo ảnh)
$app_id = '178678706857849180';

// 2. Callback URL (Theo ảnh)
$callback_url = 'https://automation.ideas.edu.vn/mail_api/zalo_oauth_callback.php';

// 3. PKCE Generator
function base64UrlEncode($bytes)
{
    return rtrim(strtr(base64_encode($bytes), '+/', '-_'), '=');
}

// Generate Verifier: STRICTLY 43 CHARS ALPHANUMERIC (A-Z, a-z, 0-9)
$chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
$verifier = '';
for ($i = 0; $i < 43; $i++) {
    $verifier .= $chars[random_int(0, strlen($chars) - 1)];
}

// Generate Challenge (SHA256)
$hash = hash('sha256', $verifier, true);
$challenge = base64UrlEncode($hash);

$state = 'TEST_STATE_' . time();

// 4. Build URL thủ công (Manual encoding)
$encoded_redirect = urlencode($callback_url);
$auth_url = "https://oauth.zaloapp.com/v4/oa/permission?app_id={$app_id}&redirect_uri={$encoded_redirect}&code_challenge={$challenge}&state={$state}&code_challenge_method=S256";

// 5. Build URL bằng hàm chuẩn
$auth_url_standard = 'https://oauth.zaloapp.com/v4/oa/permission?' . http_build_query([
    'app_id' => $app_id,
    'redirect_uri' => $callback_url,
    'code_challenge' => $challenge,
    'state' => $state,
    'code_challenge_method' => 'S256'
]);

?>
<!DOCTYPE html>
<html>

<head>
    <title>Zalo Debug Final (Valid PKCE 43 Chars)</title>
    <style>
        body {
            font-family: sans-serif;
            padding: 20px;
            line-height: 1.6;
        }

        .box {
            background: #f0f9ff;
            border: 1px solid #bae6fd;
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 8px;
        }

        .btn {
            display: inline-block;
            background: #0084ff;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
        }

        .code {
            background: #eee;
            padding: 2px 5px;
            border-radius: 3px;
            font-family: monospace;
        }

        .tiny {
            font-size: 11px;
            color: #666;
        }
    </style>
</head>

<body>
    <h1>Công cụ kiểm tra Zalo Auth (Final + PKCE 43 Chars)</h1>

    <div class="box">
        <h3>Thông tin cấu hình</h3>
        <p>App ID: <span class="code"><?php echo $app_id; ?></span></p>
        <p>Callback URL: <span class="code"><?php echo $callback_url; ?></span></p>
        <p>Generated Verifier: <span class="code tiny"><?php echo $verifier; ?></span>
            <br>Analysis: Length=<?php echo strlen($verifier); ?>, Type=Alphanumeric (Strict)
        </p>
        <p>Generated Challenge: <span class="code tiny"><?php echo $challenge; ?></span></p>
    </div>

    <div class="box">
        <h3>TEST 1: URL Nối chuỗi thủ công</h3>
        <p>Link: <span class="code" style="word-break: break-all; font-size: 12px;"><?php echo $auth_url; ?></span></p>
        <a href="<?php echo $auth_url; ?>" class="btn" target="_blank">👉 Bấm để thử TEST 1</a>
    </div>

    <div class="box">
        <h3>TEST 2: URL Hàm chuẩn (http_build_query)</h3>
        <p>Link: <span class="code"
                style="word-break: break-all; font-size: 12px;"><?php echo $auth_url_standard; ?></span></p>
        <a href="<?php echo $auth_url_standard; ?>" class="btn" style="background: #059669;" target="_blank">👉 Bấm để
            thử TEST 2</a>
    </div>

    <div class="box" style="background: #fffcdb; border-color: #fceea6;">
        <p>Nếu file này chạy OK -> Bạn hãy upload file `api/zalo_helpers.php` (Mình đã sửa giống hệt file này) lên
            server để ứng dụng chính chạy được.</p>
    </div>
</body>

</html>