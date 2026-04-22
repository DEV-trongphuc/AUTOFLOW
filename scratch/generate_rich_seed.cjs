const fs = require('fs');

const generateData = () => {
    const data = {};

    data.mailflow_lists = [
        { id: "list_vip", name: "Khách Hàng VIP (Đã mua > 5M)", status: 1, count: 125, createdAt: new Date().toISOString() },
        { id: "list_fb", name: "Lead từ Facebook Ads Tháng 4", status: 1, count: 2540, createdAt: new Date().toISOString() },
        { id: "list_webinar", name: "Đăng ký Webinar AI Marketing", status: 1, count: 850, createdAt: new Date().toISOString() },
        { id: "list_misa", name: "Đồng bộ từ MISA CRM", status: 1, count: 5200, createdAt: new Date().toISOString(), source: "MISA CRM" },
        { id: "list_cold", name: "Khách hàng Ngủ Đông", status: 1, count: 1400, createdAt: new Date().toISOString() },
        { id: "list_tiktok", name: "Khách hàng từ TikTok Shop", status: 1, count: 3200, createdAt: new Date().toISOString() },
        { id: "list_shopee", name: "Khách hàng từ Shopee", status: 1, count: 18500, createdAt: new Date().toISOString() }
    ];

    data.mailflow_tags = [
        { id: "tag_hot", name: "Hot Lead", color: "red", count: 450 },
        { id: "tag_ceo", name: "Chủ Doanh Nghiệp", color: "purple", count: 120 },
        { id: "tag_mba", name: "Quan tâm MBA", color: "blue", count: 890 },
        { id: "tag_b2b", name: "B2B", color: "orange", count: 300 },
        { id: "tag_churn", name: "Rủi ro Churn", color: "slate", count: 50 },
        { id: "tag_wholesale", name: "Khách Sỉ", color: "green", count: 150 },
        { id: "tag_loyal", name: "Khách Trung Thành", color: "indigo", count: 2500 }
    ];

    const generateSubscribers = (count) => {
        const subs = [];
        const names = ["Dung", "Tuấn", "Phong", "Nga", "Thảo", "Hương", "Minh", "Bình", "Cường", "Vy", "Linh", "Hải", "Quân", "Trang", "An"];
        const lastNames = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương"];
        const statuses = ["subscribed", "unsubscribed", "bounced"];
        
        for (let i = 0; i < count; i++) {
            const first = names[Math.floor(Math.random() * names.length)];
            const last = lastNames[Math.floor(Math.random() * lastNames.length)];
            const status = statuses[Math.random() > 0.8 ? (Math.random() > 0.5 ? 1 : 2) : 0];
            
            subs.push({
                id: `sub_${i}`,
                email: `demo.khachhang.${i}@company.com`,
                firstName: first,
                lastName: last,
                phoneNumber: `09${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
                status: status,
                createdAt: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
                score: Math.floor(Math.random() * 100),
                tags: Math.random() > 0.5 ? [data.mailflow_tags[Math.floor(Math.random()*data.mailflow_tags.length)].name] : [],
                lists: [data.mailflow_lists[Math.floor(Math.random()*data.mailflow_lists.length)].id]
            });
        }
        return subs;
    };
    data.mailflow_subscribers = generateSubscribers(200);

    data.mailflow_forms = [
        { id: "form_lead", name: "Popup Nhận Ebook AI Marketing", targetListId: "list_fb", stats: { views: 15000, submissions: 2540, conversion: 16.9 }, status: "published", fields: [] },
        { id: "form_contact", name: "Form Đăng ký Tư vấn", targetListId: "list_vip", stats: { views: 5000, submissions: 850, conversion: 17.0 }, status: "published", fields: [] }
    ];

    data.mailflow_surveys = [
        { id: "survey_nps", name: "Đánh giá mức độ hài lòng (NPS Q2)", status: "published", createdAt: new Date().toISOString(), stats: { views: 1200, starts: 950, completes: 800, completion_rate: 84.2, avg_time_sec: 45 } },
        { id: "survey_quiz", name: "Trắc nghiệm: Doanh nghiệp của bạn cần giải pháp gì?", status: "published", createdAt: new Date().toISOString(), stats: { views: 4500, starts: 3200, completes: 1500, completion_rate: 46.8, avg_time_sec: 180 } }
    ];

    data.mailflow_campaigns = [];
    for (let i = 1; i <= 12; i++) {
        const isSent = i <= 8;
        const total = Math.floor(Math.random() * 10000) + 1000;
        const delivered = Math.floor(total * 0.98);
        const opened = Math.floor(delivered * (Math.random() * 0.3 + 0.2)); // 20-50%
        const clicked = Math.floor(opened * (Math.random() * 0.2 + 0.05)); // 5-25%
        
        data.mailflow_campaigns.push({
            id: `camp_${i}`,
            name: `Chiến dịch Marketing Tháng ${i} - Bản tin Tự động`,
            subject: `🔥 Khám phá cơ hội x3 doanh thu tháng ${i}`,
            status: isSent ? "sent" : (i === 9 ? "scheduled" : "draft"),
            totalRecipients: total,
            metrics: isSent ? { delivered, opened, clicked, bounced: total - delivered, unsubscribed: Math.floor(Math.random() * 50) } : { delivered: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0 },
            createdAt: new Date(Date.now() - (13 - i) * 86400000 * 30).toISOString()
        });
    }

    data.mailflow_flows = [
        {
            id: "flow_onboarding",
            name: "Hành trình Chăm sóc Lead Webinar & Cấp Voucher",
            status: "active",
            triggerType: "form",
            stats: { enrolled: 850, completed: 420, totalSent: 2000, totalOpened: 1200, uniqueOpened: 850, totalClicked: 500, totalFailed: 10, totalUnsubscribed: 5 },
            createdAt: new Date().toISOString(),
            steps: [
                { id: "step_trigger", type: "trigger", config: { type: "form", targetId: "form_lead" }, position: { x: 400, y: 50 }, nextStepId: "step_tag" },
                { id: "step_tag", type: "action", config: { type: "tag", action: "add", tags: ["Quan tâm Webinar"] }, position: { x: 400, y: 200 }, nextStepId: "step_email1" },
                { id: "step_email1", type: "action", config: { type: "email", subject: "Xác nhận đăng ký thành công", templateId: "tpl_1" }, position: { x: 400, y: 350 }, nextStepId: "step_wait1" },
                { id: "step_wait1", type: "wait", config: { duration: 1, unit: "days" }, position: { x: 400, y: 500 }, nextStepId: "step_cond1" },
                { id: "step_cond1", type: "condition", config: { conditionType: "opened", targetStepId: "step_email1" }, position: { x: 400, y: 650 }, yesStepId: "step_email2", noStepId: "step_zalo" },
                { id: "step_email2", type: "action", config: { type: "email", subject: "Tài liệu chuẩn bị cho sự kiện" }, position: { x: 200, y: 800 } },
                { id: "step_zalo", type: "zalo_zns", config: { templateId: "zns_1", message: "Gửi ZNS nhắc nhở" }, position: { x: 600, y: 800 } }
            ]
        },
        {
            id: "flow_birthday",
            name: "Chúc mừng Sinh nhật Khách hàng VIP",
            status: "active",
            triggerType: "date",
            stats: { enrolled: 12500, completed: 3500, totalSent: 12500, totalOpened: 8000, uniqueOpened: 7000, totalClicked: 4000, totalFailed: 20, totalUnsubscribed: 100 },
            createdAt: new Date().toISOString(),
            steps: [
                { id: "step_trigger2", type: "trigger", config: { type: "date", dateField: "dateOfBirth" }, position: { x: 400, y: 50 }, nextStepId: "step_email_bd" },
                { id: "step_email_bd", type: "action", config: { type: "email", subject: "🎁 Chúc mừng sinh nhật bạn!" }, position: { x: 400, y: 200 } }
            ]
        },
        {
            id: "flow_abandoned_cart",
            name: "Khôi phục Giỏ hàng Bỏ quên (Abandoned Cart)",
            status: "active",
            triggerType: "custom_event",
            stats: { enrolled: 4500, completed: 3200, totalSent: 4500, totalOpened: 3000, uniqueOpened: 2800, totalClicked: 1500, totalFailed: 5, totalUnsubscribed: 12 },
            createdAt: new Date().toISOString(),
            steps: [
                { id: "step_trigger3", type: "trigger", config: { type: "custom_event", eventName: "abandoned_cart" }, position: { x: 400, y: 50 }, nextStepId: "step_wait2" },
                { id: "step_wait2", type: "wait", config: { duration: 2, unit: "hours" }, position: { x: 400, y: 200 }, nextStepId: "step_email3" },
                { id: "step_email3", type: "action", config: { type: "email", subject: "Giỏ hàng của bạn đang chờ!" }, position: { x: 400, y: 350 } }
            ]
        },
        {
            id: "flow_nurture",
            name: "Nuôi dưỡng Lead B2B Lạnh (Nurturing Sequence)",
            status: "paused",
            triggerType: "segment",
            stats: { enrolled: 800, completed: 150, totalSent: 1500, totalOpened: 600, uniqueOpened: 500, totalClicked: 100, totalFailed: 0, totalUnsubscribed: 20 },
            createdAt: new Date().toISOString(),
            steps: []
        },
        {
            id: "flow_post_purchase",
            name: "Up-sell & Cross-sell Sau mua hàng",
            status: "active",
            triggerType: "custom_event",
            stats: { enrolled: 5600, completed: 5000, totalSent: 10000, totalOpened: 7000, uniqueOpened: 6500, totalClicked: 2000, totalFailed: 15, totalUnsubscribed: 50 },
            createdAt: new Date().toISOString(),
            steps: [
                 { id: "step_trigger4", type: "trigger", config: { type: "custom_event", eventName: "purchase" }, position: { x: 400, y: 50 }, nextStepId: "step_wait4" },
                 { id: "step_wait4", type: "wait", config: { duration: 3, unit: "days" }, position: { x: 400, y: 200 }, nextStepId: "step_email4" },
                 { id: "step_email4", type: "action", config: { type: "email", subject: "Bạn có hài lòng với sản phẩm?" }, position: { x: 400, y: 350 }, nextStepId: "step_wait5" },
                 { id: "step_wait5", type: "wait", config: { duration: 7, unit: "days" }, position: { x: 400, y: 500 }, nextStepId: "step_email5" },
                 { id: "step_email5", type: "action", config: { type: "email", subject: "Gợi ý phụ kiện đi kèm giảm 20%" }, position: { x: 400, y: 650 } }
            ]
        }
    ];

    data.mailflow_overview_stats = {
        total_subscribers: 28450,
        active_subscribers: 25800,
        unsubscribed: 1450,
        bounced: 1200,
        emails_sent_month: 145600,
        avg_open_rate: 42.5,
        avg_click_rate: 18.2,
        recent_activity: [
            { id: 1, type: "subscribe", email: "ceo.nguyen@company.vn", time: new Date().toISOString(), listName: "Đăng ký Webinar AI Marketing" },
            { id: 2, type: "open", email: "marketing@agency.com", time: new Date(Date.now()-3600000).toISOString(), campaignName: "Bản tin AI Marketing Tháng 4" }
        ]
    };

    let fileContent = `// AUTO-GENERATED MASSIVE DEMO SEED DATA
export const seedDemoData = () => {
    const set = (key: string, data: any) => localStorage.setItem(key, JSON.stringify(data));
`;

    for (const [key, value] of Object.entries(data)) {
        fileContent += `    set('${key}', ${JSON.stringify(value)});\n`;
    }

    fileContent += `
    console.log('🌟 Seeded MASSIVE Demo Data to LocalStorage (Forms, Surveys, Flows, Templates, Integrations...)');
};
`;

    fs.writeFileSync('e:/AUTOFLOW/AUTOMATION_FLOW/utils/demoSeed.ts', fileContent);
    console.log('Generated demoSeed.ts successfully!');
};

generateData();
