<?php
$logFile = '../api/logs/tts_errors.log';
if (file_exists($logFile)) {
    echo "<pre>";
    echo file_get_contents($logFile);
    echo "</pre>";
} else {
    echo "TTS Error log not found.";
}
