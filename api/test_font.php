<?php
$info = gd_info();
echo "FreeType Support: " . ($info['FreeType Support'] ? 'Yes' : 'No') . "\n";
$fontPath = __DIR__ . '/fonts/Roboto-Bold.ttf';
echo "Font Path: $fontPath\n";
echo "File Exists: " . (file_exists($fontPath) ? 'Yes' : 'No') . "\n";

$im = imagecreatetruecolor(100, 100);
$color = imagecolorallocate($im, 255, 255, 255);
// Try drawing
try {
    $bbox = imagettfbbox(20, 0, $fontPath, "Test");
    echo "imagettfbbox success. Coords: " . implode(',', $bbox) . "\n";
} catch (Throwable $e) {
    echo "imagettfbbox Error: " . $e->getMessage() . "\n";
}
?>