<?php
// api/test_smtp_connection.php
require_once 'PHPMailer/src/Exception.php';
require_once 'PHPMailer/src/PHPMailer.php';
require_once 'PHPMailer/src/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

// Credentials provided by user
$username = 'AKIAXWQT74VN2BACAOTI';
$password = 'BNLL1hz/J/4LPVr6JznV29LyPnmSgpMLsg5c92LyM6I9';

$tests = [
    ['host' => 'email-smtp.us-east-1.amazonaws.com', 'port' => 587, 'enc' => 'tls'],
    ['host' => 'email-smtp.us-east-2.amazonaws.com', 'port' => 587, 'enc' => 'tls'],
    ['host' => 'email-smtp.us-east-1.amazonaws.com', 'port' => 465, 'enc' => 'ssl'],
    ['host' => 'email-smtp.us-east-2.amazonaws.com', 'port' => 465, 'enc' => 'ssl']
];

echo "STARTING SMTP DIAGNOSTICS...\n";
echo "User: $username\n\n";

foreach ($tests as $t) {
    echo "------------------------------------------------\n";
    echo "Testing: {$t['host']} | Port: {$t['port']} | Enc: {$t['enc']}\n";

    $mail = new PHPMailer(true);
    try {
        // Server settings
        $mail->isSMTP();
        $mail->Host = $t['host'];
        $mail->SMTPAuth = true;
        $mail->Username = $username;
        $mail->Password = $password;
        $mail->SMTPSecure = $t['enc']; // 'tls' or 'ssl'
        $mail->Port = $t['port'];
        $mail->Timeout = 10;

        // Debug output
        $mail->SMTPDebug = SMTP::DEBUG_CONNECTION;

        // Connect only (verify auth)
        if ($mail->smtpConnect()) {
            echo "\n>>>> [SUCCESS] CONNECTED & AUTHENTICATED! <<<<\n";
            $mail->smtpClose();
            break; // Found one that works!
        } else {
            echo "\n[FAIL] Connect failed.\n";
        }
    } catch (Exception $e) {
        echo "\n[ERROR] {$mail->ErrorInfo}\n";
    }
}
echo "\nDIAGNOSTICS COMPLETE.\n";
?>