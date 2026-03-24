<?php
header('Content-Type: text/plain; charset=utf-8');

$file = __DIR__ . '/worker_flow.php';

echo "=== CHECKING DEPLOYED CODE ===\n\n";

// Check if debug logging exists
$content = file_get_contents($file);

$checks = [
    'Debug logging for email success' => '[DEBUG] Email success - nextStepId:',
    'Debug logging for chain continuation' => '[DEBUG] Chain continuation check',
    'Debug logging for no nextStepId' => '[DEBUG] No nextStepId found',
    'Trim nextStepId fix' => "\$s['nextStepId'] = isset(\$s['nextStepId']) ? trim(\$s['nextStepId']) : null;",
    'Case wait fix' => 'case \'wait\':',
];

echo "File: $file\n";
echo "Size: " . filesize($file) . " bytes\n";
echo "Last modified: " . date('Y-m-d H:i:s', filemtime($file)) . "\n\n";

echo "--- CODE CHECKS ---\n\n";

foreach ($checks as $name => $searchStr) {
    $found = strpos($content, $searchStr) !== false;
    $status = $found ? '✅ FOUND' : '❌ NOT FOUND';
    echo "$status - $name\n";
}

echo "\n--- RECENT MODIFICATIONS ---\n\n";

// Find lines with [DEBUG] or [FIX]
$lines = explode("\n", $content);
$debugLines = [];

foreach ($lines as $idx => $line) {
    if (strpos($line, '[DEBUG]') !== false || strpos($line, '[FIX]') !== false) {
        $lineNum = $idx + 1;
        $debugLines[] = "Line $lineNum: " . trim($line);
    }
}

if (empty($debugLines)) {
    echo "No [DEBUG] or [FIX] markers found in code.\n";
} else {
    echo "Found " . count($debugLines) . " debug/fix markers:\n\n";
    foreach (array_slice($debugLines, 0, 20) as $line) {
        echo "$line\n";
    }
}
