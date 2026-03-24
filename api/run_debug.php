<?php
ob_start();
require_once 'debug_campaign_send.php';
$output = ob_get_clean();
file_put_contents('debug_output.log', $output);
echo "Debug finished. Result saved to debug_output.log";
