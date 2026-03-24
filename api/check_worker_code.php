<?php
header('Content-Type: text/plain; charset=utf-8');

echo "=== CHECKING WORKER CODE ===\n\n";

$file = __DIR__ . '/worker_integrations.php';
$content = file_get_contents($file);

// Check for 'info' column references
$infoCount = substr_count($content, "'info'");
$customAttributesCount = substr_count($content, 'custom_attributes');

echo "File: $file\n";
echo "File size: " . filesize($file) . " bytes\n";
echo "Last modified: " . date('Y-m-d H:i:s', filemtime($file)) . "\n\n";

echo "Code analysis:\n";
echo "  - References to 'info': $infoCount\n";
echo "  - References to 'custom_attributes': $customAttributesCount\n\n";

if ($customAttributesCount > 0) {
    echo "✓ Code appears to be UPDATED (using custom_attributes)\n";
} else {
    echo "✗ Code appears to be OLD (still using info)\n";
}

// Show processBatch function
echo "\n=== processBatch Function ===\n";
preg_match('/function processBatch.*?^\s*}/ms', $content, $matches);
if (!empty($matches[0])) {
    $lines = explode("\n", $matches[0]);
    $first10 = array_slice($lines, 0, 15);
    echo implode("\n", $first10) . "\n...\n";
}

echo "\n=== END ===\n";
