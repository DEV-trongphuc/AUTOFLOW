const fs = require("fs");

const fixes = [
    {
        file: "e:/AUTOFLOW/AUTOMATION_FLOW/components/ai/training/AITrainingDetail.tsx",
        from: "{ var: \"{$isIdentified}\", desc: \"Tr\u1ea1ng th\u00e1i\" \u0110\u00c3 \u0110\u1ecdNH DANH ho\u1eb7c CH\u01afA \u0110\u1ecdNH DANH.\" },",
        to:   "{ var: \"{$isIdentified}\", desc: \"Tr\u1ea1ng th\u00e1i - \u0110\u00c3 \u0110\u1ecdNH DANH ho\u1eb7c CH\u01afA \u0110\u1ecdNH DANH.\" },"
    },
    {
        file: "e:/AUTOFLOW/AUTOMATION_FLOW/components/campaigns/CampaignDetailDrawer.tsx",
        from: "{ id: \"activity\", label: \"Nh\u1eadt k\u00fd\" Live\", icon: Activity },",
        to:   "{ id: \"activity\", label: \"Nh\u1eadt k\u00fd Live\", icon: Activity },"
    },
    {
        file: "e:/AUTOFLOW/AUTOMATION_FLOW/components/flows/tabs/FlowAnalyticsTab.tsx",
        from: "label: \"Ho\u00e0n th\u00e0nh\" Flow\",",
        to:   "label: \"Ho\u00e0n th\u00e0nh Flow\","
    },
    {
        file: "e:/AUTOFLOW/AUTOMATION_FLOW/components/web-tracking/VisitorsTab.tsx",
        from: "{ id: \"loyalty\", label: \"B\u00e1o c\u00e1o\" Trung th\u00e0nh\", icon: BarChart3 },",
        to:   "{ id: \"loyalty\", label: \"B\u00e1o c\u00e1o Trung th\u00e0nh\", icon: BarChart3 },"
    }
];

fixes.forEach(({ file, from, to }) => {
    if (!fs.existsSync(file)) { console.log("NOT FOUND: " + file); return; }
    let c = fs.readFileSync(file, "utf8");
    const before = c;
    c = c.split(from).join(to);
    if (c !== before) {
        fs.writeFileSync(file, c, "utf8");
        console.log("Fixed: " + file.split("/").pop());
    } else {
        console.log("No match (may need manual check): " + file.split("/").pop());
    }
});
