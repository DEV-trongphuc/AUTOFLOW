<?php
header('Content-Type: text/plain; charset=utf-8');

echo "=== CLEARING PHP CACHE ===\n\n";

// Clear opcache
if (function_exists('opcache_reset')) {
    opcache_reset();
    echo "✓ OPcache cleared\n";
} else {
    echo "✗ OPcache not available\n";
}

// Clear realpath cache
clearstatcache(true);
echo "✓ Stat cache cleared\n";

echo "\n=== DONE ===\n";
echo "Now try syncing again!\n";