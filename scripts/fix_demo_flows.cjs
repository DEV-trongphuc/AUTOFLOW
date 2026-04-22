const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../public/data/real_demo_data.json');
const d = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const demoFlows = [
    {
        id: "flow_welcome_series",
        name: "Welcome Series - Chào mừng Lead mới",
        description: "Gửi chuỗi email chăm sóc khi khách hàng điền form đăng ký.",
        status: "active",
        createdAt: new Date(Date.now() - 10*86400000).toISOString(),
        triggerType: "Form Submit",
        stats: { enrolled: 1250, completed: 850, totalSent: 2500, totalOpened: 1800, uniqueOpened: 1100, totalClicked: 450, uniqueClicked: 320 },
        config: { type: "realtime", activeDays: [1,2,3,4,5,6,7], startTime: "00:00", endTime: "23:59", frequencyCap: 1, enrollStrategy: "new_only" },
        steps: [
            { id: "s1", type: "trigger", label: "Điền Form Đăng Ký", iconName: "FormInput", config: { type: "form", targetId: "form_1" }, nextStepId: "s2" },
            { id: "s2", type: "wait", label: "Chờ 1 giờ", iconName: "Clock", config: { duration: 60, unit: "minutes" }, stats: { entered: 1250, waiting: 15, completed: 1235 }, nextStepId: "s3" },
            { id: "s3", type: "action", label: "Gửi Email #1: Chào mừng", iconName: "Mail", config: { campaignId: "camp_welcome_1" }, stats: { entered: 1235, completed: 1235 }, nextStepId: "s4" },
            { id: "s4", type: "condition", label: "Đã mở Email #1?", iconName: "HelpCircle", config: { field: "email_open", value: "camp_welcome_1" }, yesStepId: "s5_yes", noStepId: "s5_no", stats: { entered: 1235, completed: 1235 } },
            { id: "s5_yes", type: "action", label: "ZNS Cảm ơn", iconName: "MessageCircle", config: { znsTemplateId: "zns_thanks" }, stats: { entered: 850, completed: 848 } },
            { id: "s5_no", type: "action", label: "Email #2: Nhắc nhở", iconName: "Mail", config: { campaignId: "camp_welcome_2" }, stats: { entered: 385, completed: 380 } }
        ]
    },
    {
        id: "flow_abandoned_cart",
        name: "Giỏ Hàng Bị Bỏ Quên",
        description: "Nhắc khách khi thêm vào giỏ nhưng không thanh toán.",
        status: "active",
        createdAt: new Date(Date.now() - 30*86400000).toISOString(),
        triggerType: "Custom Event",
        stats: { enrolled: 450, completed: 320, totalSent: 450, totalOpened: 200, uniqueOpened: 180, totalClicked: 80, uniqueClicked: 75 },
        config: { type: "realtime", activeDays: [1,2,3,4,5,6,7], startTime: "00:00", endTime: "23:59", frequencyCap: 1 },
        steps: [
            { id: "s1", type: "trigger", label: "Event: Add to Cart", iconName: "ShoppingCart", config: { type: "custom_event", targetId: "evt_add_to_cart" }, nextStepId: "s2" },
            { id: "s2", type: "wait", label: "Chờ 2 giờ", iconName: "Clock", config: { duration: 120, unit: "minutes" }, stats: { entered: 450, waiting: 10, completed: 440 }, nextStepId: "s3" },
            { id: "s3", type: "condition", label: "Đã Checkout?", iconName: "HelpCircle", config: { type: "custom_event", targetId: "evt_purchase" }, yesStepId: "s_exit", noStepId: "s4", stats: { entered: 440, completed: 440 } },
            { id: "s4", type: "split_test", label: "A/B Testing Tiêu Đề", iconName: "SplitSquareHorizontal", config: { ratio: 50 }, pathAStepId: "s5a", pathBStepId: "s5b", stats: { entered: 320, completed: 320 } },
            { id: "s5a", type: "action", label: "Email A: Tiêu đề ngắn gọn", iconName: "Mail", config: { campaignId: "camp_cart_a" }, stats: { entered: 160, completed: 160 }, nextStepId: "s_exit" },
            { id: "s5b", type: "action", label: "Email B: Tiêu đề cảm xúc", iconName: "Mail", config: { campaignId: "camp_cart_b" }, stats: { entered: 160, completed: 160 }, nextStepId: "s_exit" },
            { id: "s_exit", type: "action", label: "Kết thúc Flow", iconName: "LogOut", config: {}, stats: { entered: 120, completed: 120 } }
        ]
    },
    {
        id: "flow_b2b_nurture",
        name: "B2B Lead Nurturing (Drip)",
        description: "Chuỗi 5 ngày nuôi dưỡng khách hàng doanh nghiệp.",
        status: "paused",
        createdAt: new Date(Date.now() - 45*86400000).toISOString(),
        triggerType: "Tag Added",
        stats: { enrolled: 2100, completed: 1800, totalSent: 8400, totalOpened: 3200, uniqueOpened: 1500, totalClicked: 800, uniqueClicked: 400 },
        config: { type: "batch", activeDays: [2,3,4,5,6], startTime: "09:00", endTime: "17:00", frequencyCap: 1 },
        steps: [
            { id: "s1", type: "trigger", label: "Gắn Tag: B2B", iconName: "Tag", config: { type: "tag", targetId: "B2B" }, nextStepId: "s2" },
            { id: "s2", type: "action", label: "Email #1: Giới thiệu giải pháp", iconName: "Mail", config: { campaignId: "camp_b2b_1" }, stats: { entered: 2100, completed: 2100 }, nextStepId: "s3" },
            { id: "s3", type: "wait", label: "Chờ 2 ngày", iconName: "Clock", config: { duration: 2, unit: "days" }, stats: { entered: 2100, waiting: 0, completed: 2100 }, nextStepId: "s4" },
            { id: "s4", type: "action", label: "Email #2: Case Study", iconName: "Mail", config: { campaignId: "camp_b2b_2" }, stats: { entered: 2100, completed: 2050 }, nextStepId: "s5" },
            { id: "s5", type: "wait", label: "Chờ 3 ngày", iconName: "Clock", config: { duration: 3, unit: "days" }, stats: { entered: 2050, waiting: 250, completed: 1800 }, nextStepId: "s6" },
            { id: "s6", type: "action", label: "Tạo Task: Sale Call", iconName: "PhoneCall", config: { assignTo: "sale_team" }, stats: { entered: 1800, completed: 1800 } }
        ]
    },
    {
        id: "flow_campaign_care",
        name: "Chăm sóc Sau Chiến dịch Tháng 4",
        description: "Nuôi dưỡng lead đã mở email, phân nhánh theo hành vi click.",
        status: "active",
        createdAt: new Date(Date.now() - 3*86400000).toISOString(),
        triggerType: "Campaign Opened",
        stats: { enrolled: 1250, completed: 680, totalSent: 2800, totalOpened: 1100, uniqueOpened: 890, totalClicked: 320, uniqueClicked: 280 },
        config: { type: "realtime", activeDays: [1,2,3,4,5,6,7], startTime: "07:00", endTime: "22:00", frequencyCap: 1 },
        steps: [
            { id: "s1", type: "trigger", label: "Mở Email Tháng 4", iconName: "Mail", config: { type: "campaign", targetId: "camp_1" }, stats: { entered: 1250, waiting: 0, completed: 1250 }, nextStepId: "s2" },
            { id: "s2", type: "wait", label: "Chờ 30 phút", iconName: "Clock", config: { duration: 30, unit: "minutes" }, stats: { entered: 1250, waiting: 45, completed: 1205 }, nextStepId: "s3" },
            { id: "s3", type: "condition", label: "Đã click link ưu đãi?", iconName: "HelpCircle", config: { field: "link_click", value: "domation.vn/uu-dai" }, yesStepId: "s4_hot", noStepId: "s4_cold", stats: { entered: 1205, completed: 1205 } },
            { id: "s4_hot", type: "action", label: "🔥 Gắn Tag HOT_LEAD", iconName: "Tag", config: { tag: "HOT_LEAD" }, stats: { entered: 520, completed: 520 }, nextStepId: "s5" },
            { id: "s4_cold", type: "action", label: "Email: Nhắc nhở ưu đãi", iconName: "Mail", config: { campaignId: "camp_reminder_1" }, stats: { entered: 685, completed: 685 }, nextStepId: "s5" },
            { id: "s5", type: "wait", label: "Chờ 1 ngày", iconName: "Clock", config: { duration: 1, unit: "days" }, stats: { entered: 520, waiting: 20, completed: 500 }, nextStepId: "s6" },
            { id: "s6", type: "split_test", label: "A/B: Giảm 20% vs Voucher", iconName: "SplitSquareHorizontal", config: { ratio: 50 }, pathAStepId: "s7a", pathBStepId: "s7b", stats: { entered: 500, completed: 500 } },
            { id: "s7a", type: "action", label: "Email A: Giảm 20%", iconName: "Mail", config: { campaignId: "camp_offer_20pct" }, stats: { entered: 250, completed: 250 } },
            { id: "s7b", type: "action", label: "Email B: Voucher 100K", iconName: "Mail", config: { campaignId: "camp_offer_voucher" }, stats: { entered: 250, completed: 250 } }
        ]
    },
    {
        id: "flow_birthday",
        name: "Chúc mừng Sinh nhật Tự động",
        description: "Email + ZNS chúc mừng sinh nhật khách hàng đúng ngày.",
        status: "active",
        createdAt: new Date(Date.now() - 60*86400000).toISOString(),
        triggerType: "date",
        stats: { enrolled: 320, completed: 290, totalSent: 640, totalOpened: 510, uniqueOpened: 310, totalClicked: 120, uniqueClicked: 98 },
        config: { frequency: "recurring", enrollmentCooldownHours: 8760 },
        steps: [
            { id: "s1", type: "trigger", label: "Sinh nhật Khách hàng", iconName: "Cake", config: { type: "date", dateField: "dateOfBirth", offsetType: "on", triggerHour: 8 }, nextStepId: "s2" },
            { id: "s2", type: "action", label: "Email Chúc Sinh Nhật", iconName: "Mail", config: { campaignId: "camp_bday" }, stats: { entered: 320, completed: 318 }, nextStepId: "s3" },
            { id: "s3", type: "action", label: "ZNS Tặng Voucher", iconName: "MessageCircle", config: { znsTemplateId: "zns_bday" }, stats: { entered: 318, completed: 315 } }
        ]
    },
    {
        id: "flow_tag_hot",
        name: "Follow-up HOT LEAD sau gắn tag",
        description: "Sale gắn tag HOT_LEAD → tự động gửi offer mạnh.",
        status: "active",
        createdAt: new Date(Date.now() - 8*86400000).toISOString(),
        triggerType: "tag",
        stats: { enrolled: 450, completed: 380, totalSent: 900, totalOpened: 620, uniqueOpened: 410, totalClicked: 200, uniqueClicked: 175 },
        config: { frequency: "one-time" },
        steps: [
            { id: "s1", type: "trigger", label: "Gắn Tag: HOT_LEAD", iconName: "Tag", config: { type: "tag", targetId: "HOT_LEAD" }, nextStepId: "s2" },
            { id: "s2", type: "wait", label: "Chờ 15 phút", iconName: "Clock", config: { duration: 15, unit: "minutes" }, stats: { entered: 450, waiting: 5, completed: 445 }, nextStepId: "s3" },
            { id: "s3", type: "action", label: "Email Offer 25%", iconName: "Mail", config: { campaignId: "camp_cart_a" }, stats: { entered: 445, completed: 440 }, nextStepId: "s4" },
            { id: "s4", type: "condition", label: "Đã click offer?", iconName: "HelpCircle", config: { field: "link_click" }, yesStepId: "s5_yes", noStepId: "s5_no", stats: { entered: 440, completed: 440 } },
            { id: "s5_yes", type: "action", label: "Task: Gọi chốt sale", iconName: "PhoneCall", config: { assignTo: "sale_team" }, stats: { entered: 200, completed: 200 } },
            { id: "s5_no", type: "action", label: "Email Nhắc cuối", iconName: "Mail", config: { campaignId: "camp_cart_b" }, stats: { entered: 240, completed: 180 } }
        ]
    },
    {
        id: "flow_zalo_follow",
        name: "Chào mừng Quan tâm Zalo OA",
        description: "Tự động khi khách nhấn Quan tâm Zalo OA.",
        status: "active",
        createdAt: new Date(Date.now() - 20*86400000).toISOString(),
        triggerType: "zalo_follow",
        stats: { enrolled: 850, completed: 820, totalSent: 850, totalOpened: 790, uniqueOpened: 790, totalClicked: 210, uniqueClicked: 195 },
        config: { frequency: "one-time" },
        steps: [
            { id: "s1", type: "trigger", label: "Quan tâm Zalo OA", iconName: "UserPlus", config: { type: "zalo_follow" }, nextStepId: "s2" },
            { id: "s2", type: "action", label: "ZNS Chào mừng", iconName: "MessageCircle", config: { znsTemplateId: "zns_welcome" }, stats: { entered: 850, completed: 848 }, nextStepId: "s3" },
            { id: "s3", type: "wait", label: "Chờ 1 ngày", iconName: "Clock", config: { duration: 1, unit: "days" }, stats: { entered: 848, waiting: 12, completed: 836 }, nextStepId: "s4" },
            { id: "s4", type: "action", label: "Email Giới thiệu", iconName: "Mail", config: { campaignId: "camp_b2b_1" }, stats: { entered: 836, completed: 820 } }
        ]
    },
    {
        id: "flow_reengagement",
        name: "Re-engagement Khách Ngủ Đông",
        description: "Đánh thức khách không tương tác 90 ngày.",
        status: "active",
        createdAt: new Date(Date.now() - 15*86400000).toISOString(),
        triggerType: "segment",
        stats: { enrolled: 1400, completed: 420, totalSent: 2800, totalOpened: 560, uniqueOpened: 420, totalClicked: 85, uniqueClicked: 72 },
        config: { frequency: "one-time", enrollStrategy: "new_only" },
        steps: [
            { id: "s1", type: "trigger", label: "Vào Segment: Ngủ Đông", iconName: "Layers", config: { type: "segment", targetId: "seg_cold", enrollStrategy: "new_only" }, nextStepId: "s2" },
            { id: "s2", type: "action", label: "Email: Chúng tôi nhớ bạn!", iconName: "Mail", config: { campaignId: "camp_4" }, stats: { entered: 1400, completed: 1380 }, nextStepId: "s3" },
            { id: "s3", type: "wait", label: "Chờ 3 ngày", iconName: "Clock", config: { duration: 3, unit: "days" }, stats: { entered: 1380, waiting: 960, completed: 420 }, nextStepId: "s4" },
            { id: "s4", type: "condition", label: "Đã mở email?", iconName: "HelpCircle", config: { field: "email_open" }, yesStepId: "s5_win", noStepId: "s5_remove", stats: { entered: 420, completed: 420 } },
            { id: "s5_win", type: "action", label: "Gắn Tag: TRỞ_LẠI", iconName: "Tag", config: { tag: "TRO_LAI" }, stats: { entered: 420, completed: 420 } },
            { id: "s5_remove", type: "action", label: "Gỡ khỏi danh sách", iconName: "UserMinus", config: { action: "unsubscribe" }, stats: { entered: 0, completed: 0 } }
        ]
    }
];

const demoCampaigns = [
    {
        id: "camp_1", name: "Bản tin Tháng 4 - AI Marketing xu hướng mới",
        subject: "🚀 Cập nhật xu hướng AI Marketing mới nhất tháng 4!",
        status: "sent", type: "email",
        sentAt: new Date(Date.now() - 2*86400000).toISOString(),
        createdAt: new Date(Date.now() - 5*86400000).toISOString(),
        senderEmail: "marketing@domation.vn",
        target: { listIds: ["list_vip", "list_fb"], segmentIds: [], tagIds: [], individualIds: [] },
        stats: { sent: 2665, opened: 1250, clicked: 430, bounced: 12, spam: 2, unsubscribed: 5, failed: 0 },
        trackingEnabled: true,
        linkedFlow: { id: "flow_campaign_care", name: "Chăm sóc Sau Chiến dịch Tháng 4", status: "active" }
    },
    {
        id: "camp_welcome_1", name: "Welcome Series - Email 1 (Chào Mừng)",
        subject: "🎉 Chào mừng bạn đến với DOMATION",
        status: "sent", type: "email",
        sentAt: new Date(Date.now() - 10*86400000).toISOString(),
        createdAt: new Date(Date.now() - 15*86400000).toISOString(),
        senderEmail: "hello@domation.vn",
        target: { listIds: [], segmentIds: [], tagIds: [], individualIds: [] },
        stats: { sent: 1250, opened: 850, clicked: 320, bounced: 5, spam: 1, unsubscribed: 12, failed: 0 },
        trackingEnabled: true
    },
    {
        id: "camp_welcome_2", name: "Welcome Series - Email 2 (Reminder)",
        subject: "Bạn đã xem món quà này chưa?",
        status: "sent", type: "email",
        sentAt: new Date(Date.now() - 9*86400000).toISOString(),
        createdAt: new Date(Date.now() - 15*86400000).toISOString(),
        senderEmail: "hello@domation.vn",
        target: { listIds: [], segmentIds: [], tagIds: [], individualIds: [] },
        stats: { sent: 400, opened: 120, clicked: 45, bounced: 2, spam: 0, unsubscribed: 8, failed: 0 },
        trackingEnabled: true
    },
    {
        id: "camp_cart_a", name: "Abandoned Cart - Variant A",
        subject: "Bạn quên đồ trong giỏ kìa!",
        status: "sent", type: "email",
        sentAt: new Date(Date.now() - 3*86400000).toISOString(),
        createdAt: new Date(Date.now() - 5*86400000).toISOString(),
        senderEmail: "marketing@domation.vn",
        target: { listIds: [], segmentIds: [], tagIds: [], individualIds: [] },
        stats: { sent: 160, opened: 80, clicked: 20, bounced: 1, spam: 0, unsubscribed: 1, failed: 0 },
        trackingEnabled: true
    },
    {
        id: "camp_cart_b", name: "Abandoned Cart - Variant B",
        subject: "Đừng bỏ lỡ sản phẩm yêu thích!",
        status: "sent", type: "email",
        sentAt: new Date(Date.now() - 3*86400000).toISOString(),
        createdAt: new Date(Date.now() - 5*86400000).toISOString(),
        senderEmail: "marketing@domation.vn",
        target: { listIds: [], segmentIds: [], tagIds: [], individualIds: [] },
        stats: { sent: 160, opened: 120, clicked: 40, bounced: 0, spam: 0, unsubscribed: 0, failed: 0 },
        trackingEnabled: true
    },
    {
        id: "camp_b2b_1", name: "B2B Nurture - Giới thiệu giải pháp",
        subject: "Giải pháp tối ưu hóa quy trình doanh nghiệp",
        status: "sent", type: "email",
        sentAt: new Date(Date.now() - 10*86400000).toISOString(),
        createdAt: new Date(Date.now() - 15*86400000).toISOString(),
        senderEmail: "b2b@domation.vn",
        target: { listIds: [], segmentIds: [], tagIds: [], individualIds: [] },
        stats: { sent: 2100, opened: 1500, clicked: 400, bounced: 50, spam: 12, unsubscribed: 45, failed: 0 },
        trackingEnabled: true
    },
    {
        id: "camp_b2b_2", name: "B2B Nurture - Case Study",
        subject: "Case Study: Tăng 300% doanh thu với Automation",
        status: "sent", type: "email",
        sentAt: new Date(Date.now() - 8*86400000).toISOString(),
        createdAt: new Date(Date.now() - 15*86400000).toISOString(),
        senderEmail: "b2b@domation.vn",
        target: { listIds: [], segmentIds: [], tagIds: [], individualIds: [] },
        stats: { sent: 1800, opened: 1100, clicked: 350, bounced: 20, spam: 5, unsubscribed: 20, failed: 0 },
        trackingEnabled: true
    },
    {
        id: "camp_2", name: "Khuyến mãi VIP - Giảm 30%",
        subject: "🎁 Món quà đặc biệt dành riêng cho bạn (Giảm 30%)",
        status: "sent", type: "email",
        sentAt: new Date(Date.now() - 1*86400000).toISOString(),
        createdAt: new Date(Date.now() - 3*86400000).toISOString(),
        senderEmail: "ceo@domation.vn",
        target: { listIds: ["list_vip"], segmentIds: [], tagIds: [], individualIds: [] },
        stats: { sent: 125, opened: 98, clicked: 65, bounced: 0, spam: 0, unsubscribed: 0, failed: 0 },
        trackingEnabled: true
    },
    {
        id: "camp_3", name: "Giới thiệu Tính năng Automation Workflow",
        subject: "Tự động hóa mọi thứ với DOMATION Workflow mới",
        status: "sending", type: "email",
        createdAt: new Date(Date.now() - 2*3600000).toISOString(),
        senderEmail: "product@domation.vn",
        target: { listIds: ["list_misa"], segmentIds: [], tagIds: [], individualIds: [] },
        stats: { sent: 1500, opened: 200, clicked: 45, bounced: 5, spam: 0, unsubscribed: 1, failed: 0 },
        totalTargetAudience: 5200,
        trackingEnabled: true
    },
    {
        id: "camp_4", name: "Re-engagement: Chúng tôi nhớ bạn!",
        subject: "Bạn đã bỏ lỡ những cập nhật quan trọng...",
        status: "scheduled", type: "email",
        scheduledAt: new Date(Date.now() + 2*86400000).toISOString(),
        createdAt: new Date(Date.now() - 1*86400000).toISOString(),
        senderEmail: "marketing@domation.vn",
        target: { listIds: ["list_cold"], segmentIds: [], tagIds: [], individualIds: [] },
        stats: { sent: 0, opened: 0, clicked: 0, bounced: 0, spam: 0, unsubscribed: 0, failed: 0 },
        trackingEnabled: true
    },
    {
        id: "camp_zalo_1", name: "Zalo ZNS - Nhắc thanh toán",
        subject: "[ZNS] Thông báo cước phí",
        status: "sent", type: "zalo_zns",
        sentAt: new Date(Date.now() - 5*3600000).toISOString(),
        createdAt: new Date(Date.now() - 1*86400000).toISOString(),
        senderEmail: "Zalo OA",
        target: { listIds: ["list_vip"], segmentIds: [], tagIds: [], individualIds: [] },
        stats: { sent: 120, opened: 115, clicked: 40, bounced: 2, spam: 0, unsubscribed: 0, failed: 3 },
        trackingEnabled: true
    }
];

// Replace with rich demo data
d.flows = demoFlows;
d.campaigns = demoCampaigns;

fs.writeFileSync(filePath, JSON.stringify(d, null, 2));
console.log('Done!');
console.log('flows:', d.flows.length, '| campaigns:', d.campaigns.length);
console.log('flow[0] steps isArray:', Array.isArray(d.flows[0].steps), '| count:', d.flows[0].steps.length);
