const fs = require('fs');
const path = require('path');

// --- Helper Functions ---
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomItem = (arr) => arr[randomInt(0, arr.length - 1)];

const subDays = (date, days) => new Date(date.getTime() - days * 24 * 60 * 60 * 1000);
const subHours = (date, hours) => new Date(date.getTime() - hours * 60 * 60 * 1000);
const subMinutes = (date, minutes) => new Date(date.getTime() - minutes * 60 * 1000);

const firstNames = ['Hoàng', 'Minh', 'Tuấn', 'Thanh', 'Ngọc', 'Hải', 'Linh', 'Nga', 'Vy', 'Dung', 'Bình', 'Phong', 'Quân', 'Thảo', 'Hương', 'Nhật', 'Khang', 'Tâm', 'Trang', 'Loan'];
const lastNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Vũ', 'Đặng', 'Bùi', 'Võ', 'Huỳnh', 'Phan', 'Lý', 'Đỗ', 'Hồ', 'Ngô', 'Dương'];

const now = new Date();

// --- 1. Generate Campaigns ---
const generateCampaigns = () => {
    return [
        {
            id: "camp_1", name: "Bản tin Tháng 4 - AI Marketing Xu Hướng Mới", subject: "🚀 Cập nhật xu hướng AI Marketing mới nhất tháng 4!",
            status: "sent", sentAt: subDays(now, 2).toISOString(), createdAt: subDays(now, 5).toISOString(),
            target: { listIds: ["list_vip", "list_fb"] },
            stats: { sent: 2665, opened: 1250, clicked: 430, bounced: 12, spam: 2, unsubscribed: 5, failed: 0 },
            senderEmail: "marketing@domation.vn", trackingEnabled: true,
            linkedFlow: { id: "flow_care_after_campaign", name: "Chăm sóc Sau Chiến dịch Tháng 4", status: "active" }
        },
        {
            id: "camp_2", name: "Khuyến mãi Đặc Quyền VIP - Giảm 30%", subject: "🎁 Món quà đặc biệt dành riêng cho bạn (Giảm 30%)",
            status: "sent", sentAt: subDays(now, 1).toISOString(), createdAt: subDays(now, 3).toISOString(),
            target: { listIds: ["list_vip"] },
            stats: { sent: 125, opened: 98, clicked: 65, bounced: 0, spam: 0, unsubscribed: 0, failed: 0 },
            senderEmail: "ceo@domation.vn", trackingEnabled: true
        },
        {
            id: "camp_welcome_1", name: "Welcome Series - Email 1 (Chào Mừng)", subject: "🎉 Chào mừng bạn đến với DOMATION",
            status: "sent", sentAt: subDays(now, 10).toISOString(), createdAt: subDays(now, 15).toISOString(),
            target: { listIds: [] },
            stats: { sent: 1250, opened: 850, clicked: 320, bounced: 5, spam: 1, unsubscribed: 12, failed: 0 },
            senderEmail: "hello@domation.vn", trackingEnabled: true
        },
        {
            id: "camp_3", name: "Giới thiệu Tính năng Automation Workflow", subject: "Tự động hóa mọi thứ với DOMATION Workflow mới",
            status: "sending", createdAt: subHours(now, 2).toISOString(), target: { listIds: ["list_misa"] },
            stats: { sent: 1500, opened: 200, clicked: 45, bounced: 5, spam: 0, unsubscribed: 1, failed: 0 },
            senderEmail: "product@domation.vn", trackingEnabled: true, totalTargetAudience: 5200
        },
        {
            id: "camp_4", name: "Chăm sóc Khách hàng Ngủ Đông (Re-engagement)", subject: "Bạn đã bỏ lỡ những cập nhật quan trọng này...",
            status: "scheduled", scheduledAt: subDays(now, -2).toISOString(), createdAt: subDays(now, 1).toISOString(), target: { listIds: ["list_cold"] },
            stats: { sent: 0, opened: 0, clicked: 0, bounced: 0, spam: 0, unsubscribed: 0, failed: 0 },
            senderEmail: "marketing@domation.vn", trackingEnabled: true
        }
    ];
};

const campaigns = generateCampaigns();

// --- 2. Generate Flows ---
const flows = [
    {
        id: "flow_welcome", name: "Welcome Series - Chào mừng Lead mới", description: "Gửi chuỗi email chăm sóc khi khách hàng điền form đăng ký.",
        status: "active", createdAt: subDays(now, 10).toISOString(),
        stats: { enrolled: 1250, completed: 850, totalSent: 2500, totalOpened: 1800, uniqueOpened: 1100, totalClicked: 450, uniqueClicked: 320 },
        config: { type: "realtime", activeDays: [1,2,3,4,5,6,7], startTime: "00:00", endTime: "23:59", frequencyCap: 1 },
        triggerType: "Form Submit",
        steps: [
            { id: "step_1", type: "trigger", label: "Điền Form Đăng Ký", iconName: "FormInput", config: { formId: "form_1" }, nextStepId: "step_2" },
            { id: "step_2", type: "wait", label: "Chờ 1 giờ", iconName: "Clock", config: { delay: 60 }, nextStepId: "step_3", stats: { entered: 1250, waiting: 0, completed: 1250 } },
            { id: "step_3", type: "action", label: "Gửi Email #1: Chào mừng", iconName: "Mail", config: { campaignId: "camp_welcome_1" }, stats: { entered: 1250, waiting: 0, completed: 1250 }, nextStepId: "step_4" },
            { id: "step_4", type: "condition", label: "Đã mở Email #1?", iconName: "HelpCircle", config: { field: "email_open", value: "camp_welcome_1" }, yesStepId: "step_5_yes", noStepId: "step_5_no", stats: { entered: 1250, completed: 1250 } },
            { id: "step_5_yes", type: "action", label: "Gửi Zalo ZNS Cảm ơn", iconName: "MessageCircle", config: { znsTemplateId: "zns_1" }, stats: { entered: 850, completed: 850 } },
            { id: "step_5_no", type: "action", label: "Gửi Email #2: Reminder", iconName: "Mail", config: { campaignId: "camp_welcome_2" }, stats: { entered: 400, completed: 400 } }
        ]
    },
    {
        id: "flow_abandoned_cart", name: "Giỏ Hàng Bị Bỏ Quên (Abandoned Cart)", description: "Nhắc nhở khách hàng khi thêm vào giỏ nhưng không thanh toán.",
        status: "active", createdAt: subDays(now, 30).toISOString(),
        stats: { enrolled: 450, completed: 320, totalSent: 450, totalOpened: 200, uniqueOpened: 180, totalClicked: 80, uniqueClicked: 75 },
        config: { type: "realtime", activeDays: [1,2,3,4,5,6,7], startTime: "00:00", endTime: "23:59", frequencyCap: 1 },
        triggerType: "Custom Event",
        steps: [
            { id: "step_1", type: "trigger", label: "Event: Add to Cart", iconName: "ShoppingCart", config: { eventId: "event_cart" }, nextStepId: "step_2" },
            { id: "step_2", type: "wait", label: "Chờ 2 giờ", iconName: "Clock", config: { delay: 120 }, stats: { entered: 450, waiting: 10, completed: 440 }, nextStepId: "step_3" },
            { id: "step_3", type: "condition", label: "Đã Checkout?", iconName: "HelpCircle", config: { eventId: "event_checkout" }, yesStepId: "step_exit", noStepId: "step_4", stats: { entered: 440, completed: 440 } },
            { id: "step_4", type: "split_test", label: "A/B Testing Tiêu Đề", iconName: "SplitSquareHorizontal", config: { ratio: 50 }, pathAStepId: "step_5a", pathBStepId: "step_5b", stats: { entered: 320, completed: 320 } },
            { id: "step_5a", type: "action", label: "Email: Tiêu đề Ngắn", iconName: "Mail", config: { campaignId: "camp_cart_a" }, stats: { entered: 160, completed: 160 }, nextStepId: "step_exit" },
            { id: "step_5b", type: "action", label: "Email: Tiêu đề Dài (Cảm xúc)", iconName: "Mail", config: { campaignId: "camp_cart_b" }, stats: { entered: 160, completed: 160 }, nextStepId: "step_exit" },
            { id: "step_exit", type: "action", label: "Kết thúc", iconName: "LogOut", config: {}, stats: { entered: 120, completed: 120 } }
        ]
    }
];

// --- 3. Generate Massive Subscribers with Activities ---
const generateSubscribers = (count) => {
    return Array.from({ length: count }).map((_, i) => {
        const firstName = randomItem(firstNames);
        const lastName = randomItem(lastNames);
        
        const rand = Math.random();
        let status = 'active';
        if (rand > 0.95) status = 'bounced';
        else if (rand > 0.85) status = 'unsubscribed';

        const joinedAt = subDays(now, randomInt(1, 100));
        
        // Generate User Journey (Activity Log)
        const numActivities = randomInt(0, 15);
        const activity = [];
        const activityTypes = [
            { type: 'email_open', title: 'Mở email', cam: true },
            { type: 'email_click', title: 'Click link trong email', cam: true },
            { type: 'page_view', title: 'Truy cập trang', cam: false },
            { type: 'form_submit', title: 'Điền Form Đăng ký', cam: false },
            { type: 'purchase', title: 'Thanh toán đơn hàng', cam: false }
        ];

        let lastActDate = joinedAt;
        for (let a = 0; a < numActivities; a++) {
            lastActDate = new Date(lastActDate.getTime() + randomInt(1, 48) * 3600 * 1000);
            if (lastActDate > now) break;

            const actProto = randomItem(activityTypes);
            let meta = {};
            if (actProto.cam) {
                const camp = randomItem(campaigns);
                meta.campaignId = camp.id;
                meta.campaignName = camp.name;
            } else if (actProto.type === 'page_view') {
                meta.url = randomItem(['https://domation.vn/san-pham', 'https://domation.vn/bang-gia', 'https://domation.vn/ve-chung-toi']);
            }

            activity.push({
                id: `act_${i}_${a}`,
                type: actProto.type,
                title: actProto.title,
                createdAt: lastActDate.toISOString(),
                metadata: meta
            });
        }

        activity.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        return {
            id: `sub_${i}`,
            email: `demo.${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@company.com`,
            firstName, lastName,
            first_name: firstName, last_name: lastName, // ADDED: for compatibility with both snake_case and camelCase
            phoneNumber: `09${randomInt(10000000, 99999999)}`,
            status,
            createdAt: joinedAt.toISOString(),
            joinedAt: joinedAt.toISOString(),
            lastActivityAt: activity.length > 0 ? activity[0].createdAt : joinedAt.toISOString(),
            score: randomInt(0, 100),
            leadScore: randomInt(0, 100),
            chatCount: randomInt(0, 50),
            verified: Math.random() > 0.5 ? 1 : 0,
            tags: Math.random() > 0.5 ? [randomItem(['Hot Lead', 'Chủ Doanh Nghiệp', 'B2B', 'Khách Trung Thành', 'VIP'])] : [],
            lists: [randomItem(['list_vip', 'list_fb', 'list_webinar', 'list_cold'])],
            stats: {
                lastOpenAt: subDays(now, randomInt(0, 30)).toISOString(),
                emailsSent: randomInt(15, 80),
                emailsOpened: randomInt(5, 30),
                linksClicked: randomInt(2, 20)
            },
            activity // injected user journey
        };
    });
};

const subscribers = generateSubscribers(1500);

// --- 3.5 Generate Surveys ---
const surveys = [
    {
        id: "survey_1", name: "Khảo sát Mức độ Hài lòng Sản phẩm Q2/2026", publicUrl: "/s/khao-sat-hai-long-q2",
        status: "active", isLive: true, responseCount: 345, createdAt: subDays(now, 10).toISOString(),
        config: { showLogo: true, brandColor: "#eab308" }
    },
    {
        id: "survey_2", name: "Khảo sát Nhu cầu Webinar AI Marketing", publicUrl: "/s/nhu-cau-webinar-ai",
        status: "active", isLive: true, responseCount: 890, createdAt: subDays(now, 5).toISOString(),
        config: { showLogo: true, brandColor: "#3b82f6" }
    },
    {
        id: "survey_3", name: "Khảo sát Sau Khóa học Team Building", publicUrl: "/s/sau-khoa-hoc-team-building",
        status: "draft", isLive: false, responseCount: 0, createdAt: subDays(now, 20).toISOString(),
        config: { showLogo: true, brandColor: "#10b981" }
    }
];

// --- 3.6 Populate Missing Templates ---
const demoTemplatesPath = path.join(__dirname, '../utils/demo_templates.json');
let templates = [];
if (fs.existsSync(demoTemplatesPath)) {
    templates = JSON.parse(fs.readFileSync(demoTemplatesPath, 'utf-8'));
    templates.forEach(t => {
        if (!t.html_content || t.html_content.trim() === '') {
            t.html_content = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:20px;font-family:Arial,sans-serif;background-color:#f8fafc;"><div style="max-width:600px;margin:0 auto;background:#ffffff;padding:30px;border-radius:12px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);"><h1 style="color:#0f172a;text-align:center;">${t.name}</h1><p style="color:#334155;line-height:1.6;font-size:16px;">Xin chào {{firstName}},<br><br>Đây là nội dung được tạo tự động cho mẫu template chưa có nội dung. Chúc bạn một ngày làm việc hiệu quả và tràn đầy năng lượng!</p><div style="text-align:center;margin-top:30px;"><a href="#" style="background-color:#ea580c;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">Xem chi tiết</a></div></div></body></html>`;
        }
    });
}


// --- 4. Final Data Assembly ---
const output = {
    subscribers,
    campaigns,
    flows,
    surveys,
    templates
};

// Write to public/data/real_demo_data.json
const outPath = path.join(__dirname, '../public/data/real_demo_data.json');
fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');
console.log(`Massive Demo Data Generated successfully at ${outPath}`);
console.log(`- Subscribers: ${subscribers.length}`);
console.log(`- Campaigns: ${campaigns.length}`);
console.log(`- Flows: ${flows.length}`);
