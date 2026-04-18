const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, 'api');
const archiveApiDir = path.join(__dirname, '_ARCHIVE_GARBAGE', 'api');

const toRestore = [
    'ai_debug.log',
    'check_ses_quota.php',
    'db_indexes_audit.sql',
    'debug_ai.php',
    'debug_priority.log',
    'force_retrain_all.php',
    'meta_debug.log',
    'meta_webhook_prod.log',
    'migrate_optimizations.php',
    'migrate_system_logic.php',
    'misa_sync_debug.log',
    'prune_queues.php',
    'send_test_email.php',
    'setup_ai_db.php',
    'setup_meta_db.sql',
    'setup_workspace_table.php',
    'test_sync.php',
    'training_debug.log',
    'wait_debug.log',
    'webhook_debug.log',
    'webhook_error.log',
    'worker_campaign.log',
    'worker_debug.log',
    'worker_error.log',
    'worker_flow.log',
    'worker_priority.log',
    'worker_reminder.log',
    'worker_sync.log',
    'worker_trace.log',
    'zns_error.log'
];

let restoredCount = 0;

toRestore.forEach(file => {
    const src = path.join(archiveApiDir, file);
    const dest = path.join(apiDir, file);
    if (fs.existsSync(src)) {
        try {
            fs.renameSync(src, dest);
            restoredCount++;
        } catch(e) {
            console.error(`Failed to restore ${file}: ${e.message}`);
        }
    }
});

console.log(`Successfully restored ${restoredCount} referenced files.`);
