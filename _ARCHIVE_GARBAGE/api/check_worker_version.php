<?php
// Check worker_priority.php version
$file = __DIR__ . '/worker_priority.php';
$content = file_get_contents($file);

// Check for version marker
if (strpos($content, 'V29.6') !== false) {
    echo "✅ worker_priority.php is V29.6 (CORRECT)\n";
} else {
    echo "❌ worker_priority.php is OLD VERSION\n";
}

// Check for key features
$checks = [
    'file_put_contents(__DIR__ . \'/debug_priority.log\'' => 'Debug logging',
    '[Priority-Enroll] Enrolled Subscriber' => 'Enrollment logging',
    'INSERT INTO subscriber_flow_states' => 'Enrollment INSERT',
];

echo "\nFeature Check:\n";
foreach ($checks as $search => $name) {
    if (strpos($content, $search) !== false) {
        echo "  ✅ $name\n";
    } else {
        echo "  ❌ $name MISSING\n";
    }
}
?>