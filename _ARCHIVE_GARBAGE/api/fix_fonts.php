<?php
// api/fix_fonts.php
// Helper script to download the required font if missing
header('Content-Type: text/plain');

$fontDir = __DIR__ . '/fonts';
$fontFile = $fontDir . '/Roboto-Bold.ttf';
$fontUrl = 'https://github.com/google/fonts/raw/main/apache/roboto/Roboto-Bold.ttf';

if (!is_dir($fontDir)) {
    echo "Creating fonts directory...\n";
    if (!mkdir($fontDir, 0755, true)) {
        die("Failed to create directory: $fontDir");
    }
}

if (!file_exists($fontFile)) {
    echo "Downloading font from $fontUrl...\n";
    $content = @file_get_contents($fontUrl);

    // Fallback if file_get_contents is blocked
    if (!$content && function_exists('curl_init')) {
        echo "Using cURL...\n";
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $fontUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, 1);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $content = curl_exec($ch);
        curl_close($ch);
    }

    if ($content) {
        if (file_put_contents($fontFile, $content)) {
            echo "Font downloaded successfully to: $fontFile\n";
            echo "Size: " . filesize($fontFile) . " bytes\n";
        } else {
            echo "Failed to write font file.\n";
        }
    } else {
        echo "Failed to download font. Please upload 'Roboto-Bold.ttf' to 'api/fonts/' manually.\n";
    }
} else {
    echo "Font already exists at: $fontFile\n";
    echo "Size: " . filesize($fontFile) . " bytes\n";
}

// Test GD
$info = gd_info();
echo "\nGD Info:\n";
echo "FreeType Support: " . ($info['FreeType Support'] ? 'Yes' : 'No') . "\n";
?>