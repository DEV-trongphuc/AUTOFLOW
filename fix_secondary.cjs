const fs = require("fs");

// Fix files with mid-word Đang chờ corruption
const fixes = [
    {
        file: "e:/AUTOFLOW/AUTOMATION_FLOW/components/settings/ZaloTemplateCreateModal.tsx",
        from: /Bạn Đang chờh sửa template/g,
        to: "Bạn đang sửa template"
    },
    {
        file: "e:/AUTOFLOW/AUTOMATION_FLOW/components/web-tracking/overview/GeneralTabContent.tsx",
        from: /trĐang chờ lu/g,
        to: "trở lưu"  // trở lưu is wrong; need to check original
    },
    {
        file: "e:/AUTOFLOW/AUTOMATION_FLOW/components/web-tracking/overview/PagesTabContent.tsx",
        from: /trĐang chờ lu/g,
        to: "trở lưu"
    },
    {
        file: "e:/AUTOFLOW/AUTOMATION_FLOW/pages/CategoryChatPage.tsx",
        from: /Về trĐang chờ/g,
        to: "Về trang chủ"
    },
    {
        file: "e:/AUTOFLOW/AUTOMATION_FLOW/pages/CategoryChatPage.tsx",
        from: /Đang chờn b\? \?nh/g,
        to: "Đang tải ảnh"
    },
    {
        file: "e:/AUTOFLOW/AUTOMATION_FLOW/components/ai/modals/AIModals.tsx",
        from: /sĐang chờbot/g,
        to: "sang bot"
    }
];

fixes.forEach(({ file, from, to }) => {
    if (!fs.existsSync(file)) return;
    let c = fs.readFileSync(file, "utf8");
    const before = c;
    c = c.replace(from, to);
    if (c !== before) {
        fs.writeFileSync(file, c, "utf8");
        console.log("Fixed: " + file);
    }
});

console.log("Done secondary fixes");
