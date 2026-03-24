<?php
// Debug script for timer.php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

echo "<h1>Timer Debug</h1>";

// Check if timer.php has syntax errors
$output = [];
$return_var = 0;
exec('php -l ' . __DIR__ . '/timer.php', $output, $return_var);

echo "<h3>Syntax Check:</h3>";
if ($return_var === 0) {
    echo "<span style='color:green'>Syntax OK</span><br>";
} else {
    echo "<span style='color:red'>Syntax Error!</span><br>";
    echo "<pre>" . implode("\n", $output) . "</pre>";
}

// Check GD requirements
echo "<h3>GD Requiremets:</h3>";
echo "GD Loaded: " . (extension_loaded('gd') ? "✅ Yes" : "❌ No") . "<br>";
echo "imagefttext: " . (function_exists('imagefttext') ? "✅ Yes" : "❌ No") . "<br>";
echo "imagecreatetruecolor: " . (function_exists('imagecreatetruecolor') ? "✅ Yes" : "❌ No") . "<br>";

// Simulate Timer Execution
echo "<h3>Runtime Test:</h3>";
try {
    // Include timer logic but capture output buffering to avoid binary mess
    ob_start();

    // Set mock GET params
    $_GET['target'] = date('Y-m-d H:i:s', strtotime('+1 day'));
    $_GET['color'] = '000000';
    $_GET['bg'] = 'transparent';

    // We can't include timer.php directly because it sets headers.
    // So let's reproduce the core logic here to see if it crashes.

    $width = 500;
    $height = 110;
    $im = imagecreatetruecolor($width, $height);

    if (!$im)
        throw new Exception("Failed to create image");
    echo "✅ Image resource created<br>";

    $fontDir = __DIR__ . '/fonts';
    $fontPath = realpath($fontDir) . DIRECTORY_SEPARATOR . 'Roboto-Bold.ttf';
    echo "Font Path: $fontPath<br>";
    echo "Font Exists: " . (file_exists($fontPath) ? "✅ Yes" : "❌ No") . "<br>";

    // Check FreeType Bounding Box
    if (file_exists($fontPath) && function_exists('imageftbbox')) {
        $bbox = imageftbbox(100, 0, $fontPath, "00");
        if ($bbox) {
            echo "✅ imageftbbox working: [" . implode(',', $bbox) . "]<br>";
        } else {
            echo "❌ imageftbbox failed<br>";
        }
    }

    ob_end_clean();
    echo "✅ Runtime simulation completed without fatal error.<br>";

} catch (Throwable $e) {
    ob_end_clean();
    echo "<span style='color:red'>Runtime Exception: " . $e->getMessage() . "</span><br>";
    echo "<pre>" . $e->getTraceAsString() . "</pre>";
}

echo "<br><br><a href='timer.php?target=" . urlencode(date('Y-m-d H:i:s', strtotime('+1 day'))) . "&color=000000&bg=transparent'>Try Direct Link</a>";
?>