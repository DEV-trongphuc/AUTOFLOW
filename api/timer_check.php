<?php
// Debug script to check timer.php font status
header('Content-Type: text/html; charset=utf-8');

echo "<h2>Timer Font Debug</h2>";

$fontDir = __DIR__ . '/fonts';
$fontPath = $fontDir . '/Roboto-Bold.ttf';

echo "<h3>1. Font Directory</h3>";
echo "Path: <code>$fontDir</code><br>";
echo "Exists: " . (is_dir($fontDir) ? "✅ YES" : "❌ NO") . "<br>";
echo "Writable: " . (is_writable($fontDir) ? "✅ YES" : "❌ NO") . "<br>";

echo "<h3>2. Font File</h3>";
echo "Path: <code>$fontPath</code><br>";
echo "Exists: " . (file_exists($fontPath) ? "✅ YES" : "❌ NO") . "<br>";
if (file_exists($fontPath)) {
    $size = filesize($fontPath);
    echo "Size: " . $size . " bytes (" . round($size / 1024, 2) . " KB)<br>";
    echo "Readable: " . (is_readable($fontPath) ? "✅ YES" : "❌ NO") . "<br>";
    echo "Valid: " . ($size > 1000 ? "✅ YES" : "❌ NO (file too small)") . "<br>";
}

echo "<h3>3. GD Library</h3>";
if (function_exists('gd_info')) {
    $gd = gd_info();
    echo "GD Version: " . $gd['GD Version'] . "<br>";
    echo "FreeType Support: " . (isset($gd['FreeType Support']) && $gd['FreeType Support'] ? "✅ YES" : "❌ NO") . "<br>";
    echo "FreeType Linkage: " . ($gd['FreeType Linkage'] ?? 'N/A') . "<br>";
} else {
    echo "❌ GD Library not available<br>";
}

echo "<h3>4. Test Font Download</h3>";
if (!file_exists($fontPath)) {
    echo "Attempting to download font...<br>";
    $fontUrl = 'https://github.com/google/fonts/raw/main/apache/roboto/Roboto-Bold.ttf';

    $fontData = @file_get_contents($fontUrl);
    if (!$fontData && function_exists('curl_init')) {
        echo "file_get_contents failed, trying cURL...<br>";
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $fontUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, 1);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $fontData = curl_exec($ch);
        curl_close($ch);
    }

    if ($fontData) {
        $result = @file_put_contents($fontPath, $fontData);
        if ($result) {
            echo "✅ Font downloaded successfully! (" . strlen($fontData) . " bytes)<br>";
        } else {
            echo "❌ Failed to save font file<br>";
        }
    } else {
        echo "❌ Failed to download font<br>";
    }
} else {
    echo "✅ Font already exists<br>";
}

echo "<h3>5. Test Vietnamese Rendering</h3>";
if (file_exists($fontPath) && function_exists('imagettfbbox')) {
    $testText = "NGÀY GIỜ PHÚT";
    $bbox = @imagettfbbox(24, 0, $fontPath, $testText);
    if ($bbox) {
        echo "✅ Vietnamese text rendering test: SUCCESS<br>";
        echo "Text: <strong>$testText</strong><br>";
        echo "Bounding box: [" . implode(", ", $bbox) . "]<br>";
    } else {
        echo "❌ Vietnamese text rendering test: FAILED<br>";
    }
} else {
    echo "⚠️ Cannot test - font file or imagettfbbox not available<br>";
}

echo "<h3>6. Sample Timer Image</h3>";
$sampleUrl = "timer.php?target=" . urlencode(date('Y-m-d H:i:s', strtotime('+1 day'))) . "&color=ffffff&label=004a7c&bg=transparent&v=" . time();
echo "<img src='$sampleUrl' style='border: 1px solid #ccc; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px;' /><br>";
echo "<a href='$sampleUrl' target='_blank'>Open in new tab</a>";
?>