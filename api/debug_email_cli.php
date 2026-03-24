<?php
// debug_email_cli.php
// CLI script to debug email sending with verbose output

error_reporting(E_ALL);
ini_set('display_errors', 1);

// Adjust path based on where the script is run
if (file_exists('db_connect.php')) {
    require_once 'db_connect.php';
    require_once 'Mailer.php';
    require_once 'PHPMailer/src/PHPMailer.php';
    require_once 'PHPMailer/src/SMTP.php';
    require_once 'PHPMailer/src/Exception.php';
} else {
    require_once 'api/db_connect.php';
    require_once 'api/Mailer.php';
    require_once 'api/PHPMailer/src/PHPMailer.php';
    require_once 'api/PHPMailer/src/SMTP.php';
    require_once 'api/PHPMailer/src/Exception.php';
}

echo "--- STARTING EMAIL DEBUG ---\n";

// 1. Load Settings
$stmt = $pdo->query("SELECT * FROM system_settings");
$settings = [];
foreach ($stmt->fetchAll() as $row) {
    $settings[$row['key']] = $row['value'];
}

echo "Configuration:\n";
echo "SMTP Enabled: " . ($settings['smtp_enabled'] ?? 'NULL') . "\n";
echo "SMTP Host: " . ($settings['smtp_host'] ?? 'NULL') . "\n";
echo "SMTP User: " . ($settings['smtp_user'] ?? 'NULL') . "\n";
echo "SMTP Pass: " . (isset($settings['smtp_pass']) ? '********' : 'NULL') . "\n";
echo "SMTP Port: " . ($settings['smtp_port'] ?? 'NULL') . "\n";
echo "From Name: " . ($settings['smtp_from_name'] ?? 'NULL') . "\n";
echo "From Email: " . ($settings['smtp_from_email'] ?? 'NULL') . "\n";

if (strpos(strtolower($settings['smtp_host'] ?? ''), 'brevo') !== false) {
    echo "Detected Brevo/Sendinblue.\n";
} else {
    echo "Using standard SMTP/PHPMailer.\n";
}

// 2. Instantiate Mailer
try {
    // Hack: Extend Mailer or use Reflection to set SMTPDebug if possible, 
    // but Mailer class doesn't expose it easily.
    // Instead, we will look at how `Mailer` is implemented. 
    // It creates `new PHPMailer` inside `sendViaPHPMailer`.
    // We can't easily inject debug flags unless we modify provided code or duplicate logic.
    // For this debug script, I will DUPLICATE the PHPMailer logic to force debug output.

    // Check for Brevo/Sendinblue API Key vs SMTP Password
    $isBrevoApi = false;
    if ((strpos(strtolower($settings['smtp_host'] ?? ''), 'brevo') !== false || strpos(strtolower($settings['smtp_host'] ?? ''), 'sendinblue') !== false)) {
        if (isset($settings['smtp_pass']) && strpos($settings['smtp_pass'], 'xkeysib-') === 0) {
            $isBrevoApi = true;
            echo "Detected Brevo API Key (starts with xkeysib-). Switching to API mode.\n";
        }
    }

    if ($isBrevoApi) {
        // --- BREVO API MODE ---
        echo "\n--- ATTEMPTING BREVO API CALL ---\n";
        $url = 'https://api.brevo.com/v3/smtp/email';
        $apiKey = $settings['smtp_pass'];

        $fromEmail = $settings['smtp_from_email'] ?? $settings['smtp_user'];
        $fromName = $settings['smtp_from_name'] ?? 'Debug Script';

        // Target email
        $toEmail = 'marketing@ka-en.com.vn';
        if (!empty($settings['smtp_user']) && filter_var($settings['smtp_user'], FILTER_VALIDATE_EMAIL)) {
            $toEmail = $settings['smtp_user'];
        }

        $data = [
            'sender' => ['name' => $fromName, 'email' => $fromEmail],
            'to' => [['email' => $toEmail]],
            'subject' => 'Debug Email Test (API) ' . date('Y-m-d H:i:s'),
            'htmlContent' => 'This is a debug email sent via Brevo API v3.'
        ];

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'api-key: ' . $apiKey,
            'Content-Type: application/json',
            'Accept: application/json'
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        echo "HTTP Status: $httpCode\n";
        echo "Response: $response\n";

        if ($httpCode >= 200 && $httpCode < 300) {
            echo "\n--- SUCCESS: Email Accepted by Brevo API ---\n";
        } else {
            echo "\n--- ERROR: API Request Failed ---\n";
            echo "Curl Error (if any): $curlError\n";
        }

    } else {
        // --- SMTP MODE (Existing Logic) ---
        echo "\n--- ATTEMPTING DIRECT PHPMAILER CONNECTION (SMTP) ---\n";

        // Requires handled at top of file

        $mail = new PHPMailer\PHPMailer\PHPMailer(true);
        $mail->SMTPDebug = 3; // Detailed debug
        $mail->Debugoutput = function ($str, $level) {
            echo "[$level] $str\n";
        };

        $mail->isSMTP();
        $mail->Host = $settings['smtp_host'];
        $mail->SMTPAuth = true;
        $mail->AuthType = 'LOGIN'; // Force LOGIN
        $mail->Username = $settings['smtp_username'] ?? $settings['smtp_user'];
        $mail->Password = $settings['smtp_pass'];
        $mail->SMTPSecure = ($settings['smtp_port'] == 465) ? 'ssl' : 'tls';
        $mail->Port = $settings['smtp_port'];

        // Auto TLS
        $mail->SMTPAutoTLS = true;

        $fromEmail = $settings['smtp_from_email'] ?? $settings['smtp_user'];
        $fromName = $settings['smtp_from_name'] ?? 'Debug Script';

        $mail->setFrom($fromEmail, $fromName);

        // Send to self (the smtp user)
        $toEmail = 'marketing@ka-en.com.vn'; // Default fallback
        if (!empty($settings['smtp_user']) && filter_var($settings['smtp_user'], FILTER_VALIDATE_EMAIL)) {
            $toEmail = $settings['smtp_user'];
        }

        echo "Sending test email to: $toEmail\n";
        echo "From: $fromEmail ($fromName)\n";

        $mail->addAddress($toEmail);
        $mail->isHTML(true);
        $mail->Subject = 'Debug Email Test ' . date('Y-m-d H:i:s');
        $mail->Body = 'This is a debug email to verify SMTP connectivity.';

        $mail->send();
        echo "\n--- SUCCESS: Email Accepted by SMTP Server ---\n";
    }

} catch (Exception $e) {
    echo "\n--- ERROR: " . $e->getMessage() . " ---\n";
    if (strpos($e->getMessage(), 'Authentication failed') !== false) {
        echo "HINT: If you are using Brevo/Sendinblue, ensure your Password is the 'SMTP Key' (Master Password) from the SMTP & API settings page, NOT your account login password.\n";
    }
}

echo "--- END DEBUG ---\n";
