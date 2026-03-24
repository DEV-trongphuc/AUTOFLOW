<?php
// api/test_form_trigger.php - Debug forms.php trigger
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: text/plain; charset=utf-8');

echo "=== FORM TRIGGER DEBUG ===\n\n";

// Check if forms.php has hardcoded URL
$formsFile = file_get_contents(__DIR__ . '/forms.php');

if (strpos($formsFile, 'https://automation.ideas.edu.vn/mail_api/worker_priority.php') !== false) {
    echo "✅ forms.php has HARDCODED domain\n";
} else {
    echo "❌ forms.php is using DYNAMIC URL (WRONG!)\n";
    echo "This is why worker is not triggered!\n\n";

    // Show the actual curl line
    preg_match('/\$workerUrl = (.+?);/', $formsFile, $matches);
    if ($matches) {
        echo "Current URL line: " . $matches[0] . "\n";
    }
}

// Check purchase_events.php too
echo "\n=== PURCHASE TRIGGER DEBUG ===\n\n";
$purchaseFile = file_get_contents(__DIR__ . '/purchase_events.php');

if (strpos($purchaseFile, 'https://automation.ideas.edu.vn/mail_api/worker_priority.php') !== false) {
    echo "✅ purchase_events.php has HARDCODED domain\n";
} else {
    echo "❌ purchase_events.php is using DYNAMIC URL (WRONG!)\n";
}

// Check custom_events.php
echo "\n=== CUSTOM EVENT TRIGGER DEBUG ===\n\n";
$customFile = file_get_contents(__DIR__ . '/custom_events.php');

if (strpos($customFile, 'https://automation.ideas.edu.vn/mail_api/worker_priority.php') !== false) {
    echo "✅ custom_events.php has HARDCODED domain\n";
} else {
    echo "❌ custom_events.php is using DYNAMIC URL (WRONG!)\n";
}
?>