const fs = require('fs');
let code = fs.readFileSync('api/voucher_claim.php', 'utf8');

// 1. Extract Campaign checker and move it UP
const campCheckRegex = /\/\/ 2\. Ki[\s\S]*?Chi[\s\S]*?d[\s\S]*?ch d[\s\S]*?k[\s\S]*?t th[\s\S]*?c\.", \$redirectEmpty\);\r?\n\}/;
const match = code.match(campCheckRegex);
if (!match) throw new Error('Could not find Campaign block');

const campBlock = match[0];
code = code.replace(campBlock, ''); // Remove from original spot

// Insert it right before // 1. Identiy / Upsert Subscriber
const identiyPos = code.indexOf('// 1. Identiy / Upsert Subscriber');
code = code.slice(0, identiyPos) + campBlock + '\n\n' + code.slice(identiyPos);

// 2. Modify Upsert array to include workspace_id
const oldUpsert = "        $upsertFields = ['id' => $sid, 'status' => 'active', 'source' => 'Voucher Claim: ' . $campaignId];";
const newUpsert = "        $upsertFields = ['id' => $sid, 'status' => 'active', 'source' => 'Voucher Claim: ' . $campaignId, 'workspace_id' => $camp['workspace_id']];";

if (!code.includes(oldUpsert)) {
    throw new Error('Could not find oldUpsert line!');
}

code = code.replace(oldUpsert, newUpsert);

fs.writeFileSync('api/voucher_claim.php', code);
console.log('Patched voucher_claim.php successfully!');
