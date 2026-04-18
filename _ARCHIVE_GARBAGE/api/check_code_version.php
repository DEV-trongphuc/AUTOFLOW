<?php
// api/check_code_version.php
// Check if the fix has been deployed to production

ini_set('display_errors', 1);
error_reporting(E_ALL);

echo "<!DOCTYPE html><html><head><meta charset='UTF-8'><title>Code Version Check</title>";
echo "<style>
    body { font-family: monospace; padding: 20px; background: #1e1e1e; color: #d4d4d4; }
    .container { background: #252526; padding: 20px; border-radius: 8px; max-width: 1200px; margin: 0 auto; }
    .success { color: #4ec9b0; }
    .error { color: #f48771; }
    .warning { color: #dcdcaa; }
    pre { background: #1e1e1e; padding: 15px; border-radius: 4px; overflow-x: auto; }
    h2 { color: #569cd6; }
</style></head><body><div class='container'>";

echo "<h1>🔍 Code Version Check - worker_flow.php</h1>";
echo "<p>Time: " . date('Y-m-d H:i:s') . "</p><hr>";

// Read the worker_flow.php file
$filePath = __DIR__ . '/worker_flow.php';

if (!file_exists($filePath)) {
    echo "<p class='error'>❌ File not found: $filePath</p>";
    echo "</div></body></html>";
    exit;
}

$content = file_get_contents($filePath);

// Check for the fix (break after condition case)
echo "<h2>1. Checking for the FIX (break after condition case)</h2>";

// Look for the pattern: $isInstantStep = true; followed by break; before case 'advanced_condition'
$pattern = '/\$isInstantStep\s*=\s*true;\s*break;\s*case\s+[\'"]advanced_condition[\'"]/s';

if (preg_match($pattern, $content)) {
    echo "<p class='success'>✅ FIX FOUND: break statement exists after condition case</p>";
    echo "<p>The code has been properly fixed!</p>";
} else {
    echo "<p class='error'>❌ FIX NOT FOUND: Missing break statement!</p>";
    echo "<p class='warning'>⚠️ The server is still running the OLD buggy code!</p>";

    // Show the problematic section
    $pattern2 = '/case\s+[\'"]condition[\'"].*?case\s+[\'"]advanced_condition[\'"]/s';
    if (preg_match($pattern2, $content, $matches)) {
        echo "<h3>Current Code (BUGGY):</h3>";
        echo "<pre>" . htmlspecialchars($matches[0]) . "</pre>";
    }
}

echo "<hr>";

// Check line count to see if file is correct version
$lines = explode("\n", $content);
$totalLines = count($lines);

echo "<h2>2. File Statistics</h2>";
echo "<ul>";
echo "<li>Total Lines: <strong>$totalLines</strong></li>";
echo "<li>File Size: <strong>" . number_format(strlen($content)) . " bytes</strong></li>";
echo "<li>Last Modified: <strong>" . date('Y-m-d H:i:s', filemtime($filePath)) . "</strong></li>";
echo "</ul>";

// Show the specific lines around the fix
echo "<h2>3. Code Around Line 737 (Condition Case)</h2>";

$startLine = 730;
$endLine = 745;

echo "<pre>";
for ($i = $startLine; $i <= $endLine && $i < $totalLines; $i++) {
    $lineNum = $i + 1;
    $line = $lines[$i];

    // Highlight important lines
    if (strpos($line, 'break;') !== false && $i > 735 && $i < 740) {
        echo "<span class='success'>$lineNum: " . htmlspecialchars($line) . "</span>\n";
    } elseif (strpos($line, "case 'advanced_condition'") !== false) {
        echo "<span class='warning'>$lineNum: " . htmlspecialchars($line) . "</span>\n";
    } else {
        echo "$lineNum: " . htmlspecialchars($line) . "\n";
    }
}
echo "</pre>";

echo "<hr>";

// Check if there are any other missing breaks
echo "<h2>4. Checking for Other Potential Issues</h2>";

$casePattern = '/case\s+[\'"](\w+)[\'"]:/';
preg_match_all($casePattern, $content, $cases);

echo "<p>Found " . count($cases[1]) . " case statements in switch</p>";

// Check each case has a break or return
$missingBreaks = [];
$casePositions = [];

foreach ($cases[0] as $index => $caseMatch) {
    $caseName = $cases[1][$index];
    $pos = strpos($content, $caseMatch);

    // Find next case or end of switch
    $nextCasePos = strlen($content);
    for ($i = $index + 1; $i < count($cases[0]); $i++) {
        $nextPos = strpos($content, $cases[0][$i], $pos + 1);
        if ($nextPos !== false) {
            $nextCasePos = $nextPos;
            break;
        }
    }

    // Check if there's a break or return between this case and next
    $caseBlock = substr($content, $pos, $nextCasePos - $pos);

    if (
        strpos($caseBlock, 'break;') === false &&
        strpos($caseBlock, 'return') === false &&
        strpos($caseBlock, 'exit') === false &&
        $caseName !== 'default'
    ) {
        $missingBreaks[] = $caseName;
    }
}

if (empty($missingBreaks)) {
    echo "<p class='success'>✅ All cases have proper break/return statements</p>";
} else {
    echo "<p class='error'>❌ Cases missing break/return: " . implode(', ', $missingBreaks) . "</p>";
}

echo "<hr>";
echo "<h2>5. Recommendation</h2>";

if (preg_match($pattern, $content)) {
    echo "<p class='success'>✅ Code is up to date. The fix has been deployed.</p>";
    echo "<p>If you're still experiencing issues, check:</p>";
    echo "<ul>";
    echo "<li>Worker process might be cached - restart it</li>";
    echo "<li>Check worker logs for errors</li>";
    echo "<li>Verify database connection</li>";
    echo "</ul>";
} else {
    echo "<p class='error'>❌ CODE NEEDS TO BE RE-UPLOADED!</p>";
    echo "<p>The fix is not present in the production file. Please:</p>";
    echo "<ol>";
    echo "<li>Re-upload the fixed worker_flow.php to the server</li>";
    echo "<li>Clear any PHP opcode cache (if using OPcache)</li>";
    echo "<li>Restart the worker process</li>";
    echo "</ol>";
}

echo "</div></body></html>";
?>