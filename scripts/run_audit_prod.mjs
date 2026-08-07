import crypto from 'crypto';
import { exec } from 'child_process';

const pass = 'Ideas@812';
const salt = 'autoflow_salt_2026';
const hash = crypto.createHash('sha256').update(pass + salt).digest('hex');
const token = 'af_sec_byp_' + hash;

console.log('Calculated Production Bypass Token: ' + token);
console.log('Connecting to health diagnostic endpoint...\n');

exec(`node scripts/audit.mjs --token ${token}`, (err, stdout, stderr) => {
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    if (err) {
        process.exit(1);
    }
    process.exit(0);
});
