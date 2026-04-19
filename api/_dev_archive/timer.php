<?php
// Vector Logic Timer v4 - Adjusted sizing + Fixed rendering loop

header('Content-Type: image/png');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

function getRGB_local($hex)
{
    if (!$hex)
        return [0, 0, 0];
    $hex = ltrim($hex, '#');
    if (strlen($hex) == 3) {
        $hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] . $hex[2] . $hex[2];
    }
    if (strlen($hex) != 6) {
        return [0, 0, 0];
    }
    return [
        hexdec(substr($hex, 0, 2)),
        hexdec(substr($hex, 2, 2)),
        hexdec(substr($hex, 4, 2))
    ];
}

// 1. Get Parameters
$targetDateStr = $_GET['target'] ?? '';
$digitColorHex = $_GET['color'] ?? 'ffffff';
$bgHex = $_GET['bg'] ?? 'transparent';

// 2. Calculate Time Difference
$target = strtotime($targetDateStr);
$now = time();
$diff = max(0, $target - $now);

$days = floor($diff / 86400);
$hours = floor(($diff % 86400) / 3600);
$minutes = floor(($diff % 3600) / 60);

// 3. Image Dimensions - Keep width generous
$width = 500;
$height = 110;

// 4. Create Image
$im = imagecreatetruecolor($width, $height);

// 5. Handle Transparency
if ($bgHex === 'transparent') {
    imagesavealpha($im, true);
    $bg = imagecolorallocatealpha($im, 0, 0, 0, 127);
} else {
    [$r, $g, $b] = getRGB_local($bgHex);
    $bg = imagecolorallocate($im, $r, $g, $b);
}
imagefill($im, 0, 0, $bg);

// 6. Digit Color
[$dr, $dg, $db] = getRGB_local($digitColorHex);
$digitColor = imagecolorallocate($im, $dr, $dg, $db);

// 7. Render Logic using "Vector" drawing
$cols = 3;
$colWidth = $width / $cols;

function pad($n)
{
    return $n < 10 ? "0$n" : $n;
}

$numbers = [
    pad($days),
    pad($hours),
    pad($minutes)
];

// Helper to draw a single digit
function drawDigit($im, $x, $y, $w, $h, $digit, $color)
{
    // Make strokes BOLDER
    $thickness = max(6, round($w / 4));

    // Definitions of segments
    /*
      A
     F B
      G
     E C
      D
    */

    $segments = [
        0 => ['A', 'B', 'C', 'D', 'E', 'F'],
        1 => ['B', 'C'],
        2 => ['A', 'B', 'G', 'E', 'D'],
        3 => ['A', 'B', 'G', 'C', 'D'],
        4 => ['F', 'G', 'B', 'C'],
        5 => ['A', 'F', 'G', 'C', 'D'],
        6 => ['A', 'F', 'E', 'D', 'C', 'G'],
        7 => ['A', 'B', 'C'],
        8 => ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
        9 => ['A', 'B', 'C', 'D', 'F', 'G']
    ];

    $activeSegments = $segments[$digit] ?? [];

    // Coordinates
    $left = $x;
    $right = $x + $w - $thickness;
    $top = $y;
    $mid = $y + ($h / 2) - ($thickness / 2);
    $bot = $y + $h - $thickness;

    $vertH = ($h / 2);

    foreach ($activeSegments as $seg) {
        switch ($seg) {
            case 'A':
                imagefilledrectangle($im, $left, $top, $x + $w, $top + $thickness, $color);
                break;
            case 'B':
                imagefilledrectangle($im, $right, $top, $x + $w, $mid + $thickness, $color);
                break; // Extend down slightly to join
            case 'C':
                imagefilledrectangle($im, $right, $mid, $x + $w, $y + $h, $color);
                break;
            case 'D':
                imagefilledrectangle($im, $left, $bot, $x + $w, $y + $h, $color);
                break;
            case 'E':
                imagefilledrectangle($im, $left, $mid, $left + $thickness, $y + $h, $color);
                break;
            case 'F':
                imagefilledrectangle($im, $left, $top, $left + $thickness, $mid + $thickness, $color);
                break;
            case 'G':
                imagefilledrectangle($im, $left, $mid, $x + $w, $mid + $thickness, $color);
                break;
        }
    }
}

foreach ($numbers as $i => $numStr) {
    // Determine position for this group of 2 digits
    $groupCenterX = ($i * $colWidth) + ($colWidth / 2);

    // Config for digits - SMALLER now
    $digitW = 20;   // Reduced from 50
    $digitH = 35;   // Reduced from 90
    $gap = 10;      // Gap between digits

    // Calculate starting X to center the pair
    $totalTypoWidth = ($digitW * 2) + $gap;
    $startX = $groupCenterX - ($totalTypoWidth / 2);
    $targetY = ($height - $digitH) / 2;

    // Ensure numStr is treated as string
    $s = (string) $numStr;
    if (strlen($s) < 2)
        $s = "0" . $s;

    // Draw first digit
    drawDigit($im, $startX, $targetY, $digitW, $digitH, $s[0], $digitColor);

    // Draw second digit
    drawDigit($im, $startX + $digitW + $gap, $targetY, $digitW, $digitH, $s[1], $digitColor);
}

imagepng($im);
imagedestroy($im);
?>