const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, 'api');
const archiveApiFiles = path.join(__dirname, '_ARCHIVE_GARBAGE', 'api');

if (!fs.existsSync(archiveApiFiles)) fs.mkdirSync(archiveApiFiles, { recursive: true });

const irregularPrefixes = [
    'add_', 'apply_', 'api_check', 'api_fix', 'api_rescue', 
    'auto_cleanup', 'auto_migrate', 'auto_reset', 'backfill_', 
    'clear_', 'deep_clean', 'deep_sync', 'delete_yesterday', 
    'dump_', 'emergency_', 'exec_', 'execute_', 'explain_',
    'final_', 'find_', 'force_', 'inspect_', 'investigate_', 
    'list_tables', 'list_users', 'list_templates', 'nuclear_', 
    'optimize_', 'poke_', 'polished_', 'prune_', 'purge_', 
    'rebuild_', 'recalc_', 'rescue_', 'reset_', 'restore_', 
    'retry_', 'revive_', 'run_', 'show_', 'simulate_', 'solve_', 
    'standardize_', 'ultra_fast', 'upgrade_', 'verification_'
];

const exactIrregularFiles = [
    'check.php', 'diag.php', 'stop2.php', 'test.php', 'testp.php'
];

let movedApiCount = 0;

function scanAndMoveApiFiles(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const fPath = path.join(dir, file);
        if (!fs.statSync(fPath).isFile()) return;

        let basename = path.basename(file).toLowerCase();
        let shouldMove = false;

        // Check Irregular Prefix
        for (const pre of irregularPrefixes) {
            if (basename.startsWith(pre)) {
                shouldMove = true;
                break;
            }
        }

        // Check Exact Match
        if (exactIrregularFiles.includes(basename)) {
            shouldMove = true;
        }

        // Move stray logs
        if (basename.endsWith('.log') && basename !== 'error_log') {
            shouldMove = true;
        }

        if (shouldMove) {
            try {
                fs.renameSync(fPath, path.join(archiveApiFiles, file));
                movedApiCount++;
            } catch (e) {
                console.error(`Error moving ${file}:`, e.message);
            }
        }
    });
}

scanAndMoveApiFiles(apiDir);
console.log(`Deep Cleanup Quarantined: ${movedApiCount} additional files.`);
