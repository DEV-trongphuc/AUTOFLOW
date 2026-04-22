import { subDays, subHours } from 'date-fns';

const DEMO_VERSION = 'v4.1.0';

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomItem = <T>(arr: T[]): T => arr[randomInt(0, arr.length - 1)];

const firstNames = ['Hoàng', 'Minh', 'Tuấn', 'Thanh', 'Ngọc', 'Hải', 'Linh', 'Nga', 'Vy', 'Dung', 'Bình', 'Phong', 'Quân', 'Thảo', 'Hương', 'Nhật', 'Khang', 'Tâm', 'Trang', 'Loan'];
const lastNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Vũ', 'Đặng', 'Bùi', 'Võ', 'Huỳnh', 'Phan', 'Lý', 'Đỗ', 'Hồ', 'Ngô', 'Dương'];

const generateSubscribers = (count: number) => {
    return Array.from({ length: count }).map((_, i) => {
        const firstName = randomItem(firstNames);
        const lastName = randomItem(lastNames);
        // Weighted random for status
        const rand = Math.random();
        let status = 'subscribed';
        if (rand > 0.9) status = 'bounced';
        else if (rand > 0.8) status = 'unsubscribed';
        else if (rand > 0.7) status = 'lead';
        else if (rand > 0.6) status = 'customer';

        return {
            id: `sub_${i}`,
            email: `demo.${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@company.com`,
            firstName,
            lastName,
            phoneNumber: `09${randomInt(10000000, 99999999)}`,
            status,
            createdAt: subDays(new Date(), randomInt(1, 100)).toISOString(),
            joinedAt: subDays(new Date(), randomInt(1, 100)).toISOString(),
            lastActivityAt: subHours(new Date(), randomInt(1, 240)).toISOString(),
            score: randomInt(0, 100),
            leadScore: randomInt(0, 100),
            chatCount: randomInt(0, 50),
            verified: Math.random() > 0.5 ? 1 : 0,
            meta_psid: Math.random() > 0.8 ? '123456789' : '0',
            tags: Math.random() > 0.5 ? [randomItem(['Hot Lead', 'Chủ Doanh Nghiệp', 'B2B', 'Khách Trung Thành'])] : [],
            lists: [randomItem(['list_vip', 'list_fb', 'list_webinar', 'list_misa', 'list_cold'])],
            stats: {
                lastOpenAt: subDays(new Date(), randomInt(0, 30)).toISOString(),
                emailsSent: randomInt(5, 50),
                emailsOpened: randomInt(0, 20),
                linksClicked: randomInt(0, 10)
            }
        };
    });
};

const generateFlows = () => {
    return [
        {
            id: "flow_welcome",
            name: "Welcome Series - Chào mừng Lead mới",
            description: "Gửi chuỗi email chăm sóc khi khách hàng điền form đăng ký.",
            status: "active",
            createdAt: subDays(new Date(), 10).toISOString(),
            stats: { enrolled: 1250, completed: 850, totalSent: 2500, totalOpened: 1800, uniqueOpened: 1100, totalClicked: 450, uniqueClicked: 320 },
            config: { type: "realtime", activeDays: [1,2,3,4,5,6,7], startTime: "00:00", endTime: "23:59", frequencyCap: 1 },
            triggerType: "Form Submit",
            steps: [
                { id: "step_1", type: "trigger", label: "Điền Form Đăng Ký", iconName: "FormInput", config: { formId: "form_1" }, nextStepId: "step_2" },
                { id: "step_2", type: "wait", label: "Chờ 1 giờ", iconName: "Clock", config: { delay: 60 }, nextStepId: "step_3" },
                { id: "step_3", type: "action", label: "Gửi Email #1: Chào mừng", iconName: "Mail", config: { campaignId: "camp_welcome_1" }, stats: { entered: 1250, waiting: 0, completed: 1250 }, nextStepId: "step_4" },
                { id: "step_4", type: "condition", label: "Đã mở Email #1?", iconName: "HelpCircle", config: { field: "email_open", value: "camp_welcome_1" }, yesStepId: "step_5_yes", noStepId: "step_5_no" },
                { id: "step_5_yes", type: "action", label: "Gửi Zalo ZNS Cảm ơn", iconName: "MessageCircle", config: { znsTemplateId: "zns_1" }, stats: { entered: 850, completed: 850 } },
                { id: "step_5_no", type: "action", label: "Gửi Email #2: Reminder", iconName: "Mail", config: { campaignId: "camp_welcome_2" }, stats: { entered: 400, completed: 400 } }
            ]
        },
        {
            id: "flow_abandoned_cart",
            name: "Giỏ Hàng Bị Bỏ Quên (Abandoned Cart)",
            description: "Nhắc nhở khách hàng khi thêm vào giỏ nhưng không thanh toán.",
            status: "active",
            createdAt: subDays(new Date(), 30).toISOString(),
            stats: { enrolled: 450, completed: 320, totalSent: 450, totalOpened: 200, uniqueOpened: 180, totalClicked: 80, uniqueClicked: 75 },
            config: { type: "realtime", activeDays: [1,2,3,4,5,6,7], startTime: "00:00", endTime: "23:59", frequencyCap: 1 },
            triggerType: "Custom Event",
            steps: [
                { id: "step_1", type: "trigger", label: "Event: Add to Cart", iconName: "ShoppingCart", config: { eventId: "event_cart" }, nextStepId: "step_2" },
                { id: "step_2", type: "wait", label: "Chờ 2 giờ", iconName: "Clock", config: { delay: 120 }, stats: { entered: 450, waiting: 10, completed: 440 }, nextStepId: "step_3" },
                { id: "step_3", type: "condition", label: "Đã Checkout?", iconName: "HelpCircle", config: { eventId: "event_checkout" }, yesStepId: "step_exit", noStepId: "step_4" },
                { id: "step_4", type: "split_test", label: "A/B Testing Tiêu Đề", iconName: "SplitSquareHorizontal", config: { ratio: 50 }, pathAStepId: "step_5a", pathBStepId: "step_5b", stats: { entered: 320, completed: 320 } },
                { id: "step_5a", type: "action", label: "Email: Tiêu đề Ngắn", iconName: "Mail", config: { campaignId: "camp_cart_a" }, stats: { entered: 160, completed: 160 }, nextStepId: "step_exit" },
                { id: "step_5b", type: "action", label: "Email: Tiêu đề Dài (Cảm xúc)", iconName: "Mail", config: { campaignId: "camp_cart_b" }, stats: { entered: 160, completed: 160 }, nextStepId: "step_exit" },
                { id: "step_exit", type: "action", label: "Kết thúc", iconName: "LogOut", config: {}, stats: { entered: 120, completed: 120 } }
            ]
        },
        {
            id: "flow_b2b_nurture",
            name: "B2B Lead Nurturing (Drip Campaign)",
            description: "Chuỗi 5 ngày nuôi dưỡng khách hàng doanh nghiệp.",
            status: "paused",
            createdAt: subDays(new Date(), 45).toISOString(),
            stats: { enrolled: 2100, completed: 1800, totalSent: 8400, totalOpened: 3200, uniqueOpened: 1500, totalClicked: 800, uniqueClicked: 400 },
            config: { type: "batch", activeDays: [2,3,4,5,6], startTime: "09:00", endTime: "17:00", frequencyCap: 1 },
            triggerType: "Tag Added",
            steps: [
                { id: "step_1", type: "trigger", label: "Thêm Tag: B2B", iconName: "Tag", config: { tagId: "tag_b2b" }, nextStepId: "step_2" },
                { id: "step_2", type: "action", label: "Email #1: Giới thiệu Giải pháp", iconName: "Mail", config: { campaignId: "camp_b2b_1" }, nextStepId: "step_3" },
                { id: "step_3", type: "wait", label: "Chờ 2 ngày", iconName: "Clock", config: { delay: 2880 }, nextStepId: "step_4" },
                { id: "step_4", type: "action", label: "Email #2: Case Study", iconName: "Mail", config: { campaignId: "camp_b2b_2" }, nextStepId: "step_5" },
                { id: "step_5", type: "wait", label: "Chờ 3 ngày", iconName: "Clock", config: { delay: 4320 }, nextStepId: "step_6" },
                { id: "step_6", type: "action", label: "Tạo Task cho Sale Call", iconName: "PhoneCall", config: {} }
            ]
        },
        {
            id: "flow_care_after_campaign",
            name: "Chăm sóc Sau Chiến dịch Tháng 4",
            description: "Tự động nuôi dưỡng lead đã mở email chiến dịch, phân nhánh theo hành vi click.",
            status: "active",
            createdAt: subDays(new Date(), 3).toISOString(),
            stats: { enrolled: 1250, completed: 680, totalSent: 2800, totalOpened: 1100, uniqueOpened: 890, totalClicked: 320, uniqueClicked: 280 },
            config: { type: "realtime", activeDays: [1,2,3,4,5,6,7], startTime: "07:00", endTime: "22:00", frequencyCap: 1 },
            triggerType: "Campaign Opened",
            steps: [
                { id: "step_1", type: "trigger", label: "Đã mở Email Tháng 4", iconName: "Mail", config: { type: "campaign", targetId: "camp_1" }, stats: { entered: 1250, waiting: 0, completed: 1250 }, nextStepId: "step_2" },
                { id: "step_2", type: "wait", label: "Chờ 30 phút", iconName: "Clock", config: { delay: 30 }, stats: { entered: 1250, waiting: 45, completed: 1205 }, nextStepId: "step_3" },
                { id: "step_3", type: "condition", label: "Đã click link ưu đãi?", iconName: "HelpCircle", config: { field: "link_click", value: "domation.vn/uu-dai" }, yesStepId: "step_4_hot", noStepId: "step_4_cold", stats: { entered: 1205, completed: 1205 } },
                { id: "step_4_hot", type: "action", label: "🔥 Gắn Tag: HOT_LEAD", iconName: "Tag", config: { tag: "HOT_LEAD" }, stats: { entered: 520, completed: 520 }, nextStepId: "step_5" },
                { id: "step_4_cold", type: "action", label: "Gửi Email: Nhắc nhở ưu đãi", iconName: "Mail", config: { campaignId: "camp_reminder_1" }, stats: { entered: 685, completed: 685 }, nextStepId: "step_5" },
                { id: "step_5", type: "wait", label: "Chờ 1 ngày", iconName: "Clock", config: { delay: 1440 }, stats: { entered: 520, waiting: 20, completed: 500 }, nextStepId: "step_6" },
                { id: "step_6", type: "split_test", label: "A/B: Giảm 20% vs Tặng Voucher", iconName: "SplitSquareHorizontal", config: { ratio: 50 }, pathAStepId: "step_7a", pathBStepId: "step_7b", stats: { entered: 500, completed: 500 } },
                { id: "step_7a", type: "action", label: "Email A: Giảm ngay 20%", iconName: "Mail", config: { campaignId: "camp_offer_20pct" }, stats: { entered: 250, completed: 250 } },
                { id: "step_7b", type: "action", label: "Email B: Tặng Voucher 100K", iconName: "Mail", config: { campaignId: "camp_offer_voucher" }, stats: { entered: 250, completed: 250 } },
                { id: "step_8", type: "action", label: "Tạo Task: Gọi điện tư vấn", iconName: "PhoneCall", config: { assignTo: "sale_team" }, stats: { entered: 480, completed: 480 } }
            ]
        },
        {
            id: "flow_birthday", name: "Chúc mừng Sinh nhật Tự động",
            description: "Gửi email + ZNS chúc mừng sinh nhật vào đúng ngày.", status: "active",
            createdAt: subDays(new Date(), 60).toISOString(),
            stats: { enrolled: 320, completed: 290, totalSent: 640, totalOpened: 510, uniqueOpened: 310, totalClicked: 120, uniqueClicked: 98 },
            config: { frequency: "recurring", enrollmentCooldownHours: 8760 }, triggerType: "date",
            steps: [
                { id: "s1", type: "trigger", label: "Sinh nhật Khách hàng", iconName: "Cake", config: { type: "date", dateField: "dateOfBirth", offsetType: "on", offsetValue: 0, triggerHour: 8 }, nextStepId: "s2" },
                { id: "s2", type: "action", label: "Email Chúc Sinh Nhật", iconName: "Mail", config: { campaignId: "camp_welcome_1" }, stats: { entered: 320, completed: 318 }, nextStepId: "s3" },
                { id: "s3", type: "action", label: "Gửi ZNS Tặng Voucher SN", iconName: "MessageCircle", config: { znsTemplateId: "zns_bday" }, stats: { entered: 318, completed: 315 } }
            ]
        },
        {
            id: "flow_zalo_follow", name: "Chào mừng Quan tâm Zalo OA",
            description: "Tự động khi khách nhấn Quan tâm Zalo OA.", status: "active",
            createdAt: subDays(new Date(), 20).toISOString(),
            stats: { enrolled: 850, completed: 820, totalSent: 850, totalOpened: 790, uniqueOpened: 790, totalClicked: 210, uniqueClicked: 195 },
            config: { frequency: "one-time" }, triggerType: "zalo_follow",
            steps: [
                { id: "s1", type: "trigger", label: "Quan tâm Zalo OA", iconName: "UserPlus", config: { type: "zalo_follow" }, nextStepId: "s2" },
                { id: "s2", type: "action", label: "ZNS Chào mừng", iconName: "MessageCircle", config: { znsTemplateId: "zns_welcome" }, stats: { entered: 850, completed: 848 }, nextStepId: "s3" },
                { id: "s3", type: "wait", label: "Chờ 1 ngày", iconName: "Clock", config: { duration: 1, unit: "days" }, stats: { entered: 848, waiting: 12, completed: 836 }, nextStepId: "s4" },
                { id: "s4", type: "action", label: "Email Giới thiệu sản phẩm", iconName: "Mail", config: { campaignId: "camp_b2b_1" }, stats: { entered: 836, completed: 820 } }
            ]
        },
        {
            id: "flow_segment_vip", name: "Chăm sóc Phân khúc VIP",
            description: "Kéo toàn bộ khách VIP vào luồng chăm sóc đặc biệt.", status: "active",
            createdAt: subDays(new Date(), 15).toISOString(),
            stats: { enrolled: 125, completed: 80, totalSent: 250, totalOpened: 210, uniqueOpened: 120, totalClicked: 55, uniqueClicked: 48 },
            config: { frequency: "one-time", enrollStrategy: "new_only" }, triggerType: "segment",
            steps: [
                { id: "s1", type: "trigger", label: "Vào Phân khúc VIP", iconName: "Layers", config: { type: "segment", targetId: "seg_1", enrollStrategy: "new_only" }, nextStepId: "s2" },
                { id: "s2", type: "action", label: "Email Chào mừng VIP Club", iconName: "Mail", config: { campaignId: "camp_2" }, stats: { entered: 125, completed: 124 }, nextStepId: "s3" },
                { id: "s3", type: "wait", label: "Chờ 3 ngày", iconName: "Clock", config: { duration: 3, unit: "days" }, stats: { entered: 124, waiting: 44, completed: 80 }, nextStepId: "s4" },
                { id: "s4", type: "action", label: "Tặng Voucher VIP 200K", iconName: "Ticket", config: { voucherCampaignId: "vc_1" }, stats: { entered: 80, completed: 80 } }
            ]
        },
        {
            id: "flow_tag_hot", name: "Follow-up HOT LEAD sau gắn tag",
            description: "Khi sale gắn tag HOT_LEAD, tự động gửi email offer.", status: "active",
            createdAt: subDays(new Date(), 8).toISOString(),
            stats: { enrolled: 450, completed: 380, totalSent: 900, totalOpened: 620, uniqueOpened: 410, totalClicked: 200, uniqueClicked: 175 },
            config: { frequency: "one-time" }, triggerType: "tag",
            steps: [
                { id: "s1", type: "trigger", label: "Được gắn Tag: HOT_LEAD", iconName: "Tag", config: { type: "tag", targetId: "HOT_LEAD" }, nextStepId: "s2" },
                { id: "s2", type: "wait", label: "Chờ 15 phút", iconName: "Clock", config: { duration: 15, unit: "minutes" }, stats: { entered: 450, waiting: 5, completed: 445 }, nextStepId: "s3" },
                { id: "s3", type: "action", label: "Email: Offer giảm 25% chỉ 24h", iconName: "Mail", config: { campaignId: "camp_cart_a" }, stats: { entered: 445, completed: 440 }, nextStepId: "s4" },
                { id: "s4", type: "condition", label: "Đã click offer?", iconName: "HelpCircle", config: { field: "link_click" }, yesStepId: "s5_yes", noStepId: "s5_no", stats: { entered: 440, completed: 440 } },
                { id: "s5_yes", type: "action", label: "Tạo task Gọi chốt", iconName: "PhoneCall", config: { assignTo: "sale_team" }, stats: { entered: 200, completed: 200 } },
                { id: "s5_no", type: "action", label: "Email: Nhắc nhở lần cuối", iconName: "Mail", config: { campaignId: "camp_cart_b" }, stats: { entered: 240, completed: 180 } }
            ]
        },
        {
            id: "flow_inbound_msg", name: "Trả lời Tin nhắn Keyword 'GIÁ'",
            description: "Khi khách nhắn từ khóa GIÁ trên Zalo/Meta, tự động gửi bảng giá.", status: "active",
            createdAt: subDays(new Date(), 5).toISOString(),
            stats: { enrolled: 280, completed: 260, totalSent: 280, totalOpened: 270, uniqueOpened: 270, totalClicked: 95, uniqueClicked: 88 },
            config: { frequency: "recurring", enrollmentCooldownHours: 24 }, triggerType: "inbound_message",
            steps: [
                { id: "s1", type: "trigger", label: "Tin nhắn chứa: GIÁ", iconName: "MessageSquare", config: { type: "inbound_message", targetId: "GIA,BANG GIA,PRICE" }, nextStepId: "s2" },
                { id: "s2", type: "action", label: "ZNS Bảng giá tự động", iconName: "MessageCircle", config: { znsTemplateId: "zns_price" }, stats: { entered: 280, completed: 278 }, nextStepId: "s3" },
                { id: "s3", type: "action", label: "Gắn Tag: HỎI_GIÁ", iconName: "Tag", config: { tag: "HOI_GIA" }, stats: { entered: 278, completed: 260 } }
            ]
        }
    ].map(f => ({ ...f, steps: Array.isArray(f.steps) ? f.steps : [] }));
};

const generateCampaigns = () => {
    const linkedFlow = { id: "flow_care_after_campaign", name: "Chăm sóc Sau Chiến dịch Tháng 4", status: "active" };
    return [
        {
            id: "camp_1",
            name: "Bản tin Tháng 4 - AI Marketing Xu Hướng Mới",
            subject: "🚀 Cập nhật xu hướng AI Marketing mới nhất tháng 4!",
            status: "sent",
            sentAt: subDays(new Date(), 2).toISOString(),
            createdAt: subDays(new Date(), 5).toISOString(),
            target: { listIds: ["list_vip", "list_fb"], segmentIds: [], tagIds: [], individualIds: [] },
            stats: { sent: 2665, opened: 1250, clicked: 430, bounced: 12, spam: 2, unsubscribed: 5, failed: 0 },
            senderEmail: "marketing@domation.vn",
            trackingEnabled: true,
            linkedFlow
        },
        {
            id: "camp_welcome_1",
            name: "Welcome Series - Email 1 (Chào Mừng)",
            subject: "🎉 Chào mừng bạn đến với DOMATION",
            status: "sent",
            sentAt: subDays(new Date(), 10).toISOString(),
            createdAt: subDays(new Date(), 15).toISOString(),
            target: { listIds: [], segmentIds: [], tagIds: [], individualIds: [] },
            stats: { sent: 1250, opened: 850, clicked: 320, bounced: 5, spam: 1, unsubscribed: 12, failed: 0 },
            senderEmail: "hello@domation.vn",
            trackingEnabled: true
        },
        {
            id: "camp_welcome_2",
            name: "Welcome Series - Email 2 (Reminder)",
            subject: "Bạn đã xem món quà này chưa?",
            status: "sent",
            sentAt: subDays(new Date(), 9).toISOString(),
            createdAt: subDays(new Date(), 15).toISOString(),
            target: { listIds: [], segmentIds: [], tagIds: [], individualIds: [] },
            stats: { sent: 400, opened: 120, clicked: 45, bounced: 2, spam: 0, unsubscribed: 8, failed: 0 },
            senderEmail: "hello@domation.vn",
            trackingEnabled: true
        },
        {
            id: "camp_cart_a",
            name: "Abandoned Cart - Variant A",
            subject: "Bạn quên đồ trong giỏ kìa!",
            status: "sent",
            sentAt: subDays(new Date(), 3).toISOString(),
            createdAt: subDays(new Date(), 5).toISOString(),
            target: { listIds: [], segmentIds: [], tagIds: [], individualIds: [] },
            stats: { sent: 160, opened: 80, clicked: 20, bounced: 1, spam: 0, unsubscribed: 1, failed: 0 },
            senderEmail: "marketing@domation.vn",
            trackingEnabled: true
        },
        {
            id: "camp_cart_b",
            name: "Abandoned Cart - Variant B",
            subject: "Đừng bỏ lỡ sản phẩm yêu thích của bạn!",
            status: "sent",
            sentAt: subDays(new Date(), 3).toISOString(),
            createdAt: subDays(new Date(), 5).toISOString(),
            target: { listIds: [], segmentIds: [], tagIds: [], individualIds: [] },
            stats: { sent: 160, opened: 120, clicked: 40, bounced: 0, spam: 0, unsubscribed: 0, failed: 0 },
            senderEmail: "marketing@domation.vn",
            trackingEnabled: true
        },
        {
            id: "camp_b2b_1",
            name: "B2B Nurture - Giới thiệu giải pháp",
            subject: "Giải pháp tối ưu hóa quy trình doanh nghiệp",
            status: "sent",
            sentAt: subDays(new Date(), 10).toISOString(),
            createdAt: subDays(new Date(), 15).toISOString(),
            target: { listIds: [], segmentIds: [], tagIds: [], individualIds: [] },
            stats: { sent: 2100, opened: 1500, clicked: 400, bounced: 50, spam: 12, unsubscribed: 45, failed: 0 },
            senderEmail: "b2b@domation.vn",
            trackingEnabled: true
        },
        {
            id: "camp_b2b_2",
            name: "B2B Nurture - Case Study",
            subject: "Case Study: Cách doanh nghiệp tăng 300% doanh thu",
            status: "sent",
            sentAt: subDays(new Date(), 8).toISOString(),
            createdAt: subDays(new Date(), 15).toISOString(),
            target: { listIds: [], segmentIds: [], tagIds: [], individualIds: [] },
            stats: { sent: 1800, opened: 1100, clicked: 350, bounced: 20, spam: 5, unsubscribed: 20, failed: 0 },
            senderEmail: "b2b@domation.vn",
            trackingEnabled: true
        },
        {
            id: "camp_2",
            name: "Khuyến mãi Đặc Quyền VIP - Giảm 30%",
            subject: "🎁 Món quà đặc biệt dành riêng cho bạn (Giảm 30%)",
            status: "sent",
            sentAt: subDays(new Date(), 1).toISOString(),
            createdAt: subDays(new Date(), 3).toISOString(),
            target: { listIds: ["list_vip"], segmentIds: [], tagIds: [], individualIds: [] },
            stats: { sent: 125, opened: 98, clicked: 65, bounced: 0, spam: 0, unsubscribed: 0, failed: 0 },
            senderEmail: "ceo@domation.vn",
            trackingEnabled: true
        },
        {
            id: "camp_3",
            name: "Giới thiệu Tính năng Automation Workflow",
            subject: "Tự động hóa mọi thứ với DOMATION Workflow mới",
            status: "sending",
            createdAt: subHours(new Date(), 2).toISOString(),
            target: { listIds: ["list_misa"], segmentIds: [], tagIds: [], individualIds: [] },
            stats: { sent: 1500, opened: 200, clicked: 45, bounced: 5, spam: 0, unsubscribed: 1, failed: 0 },
            senderEmail: "product@domation.vn",
            trackingEnabled: true,
            totalTargetAudience: 5200
        },
        {
            id: "camp_4",
            name: "Chăm sóc Khách hàng Ngủ Đông (Re-engagement)",
            subject: "Bạn đã bỏ lỡ những cập nhật quan trọng này...",
            status: "scheduled",
            scheduledAt: subDays(new Date(), -2).toISOString(),
            createdAt: subDays(new Date(), 1).toISOString(),
            target: { listIds: ["list_cold"], segmentIds: [], tagIds: [], individualIds: [] },
            stats: { sent: 0, opened: 0, clicked: 0, bounced: 0, spam: 0, unsubscribed: 0, failed: 0 },
            senderEmail: "marketing@domation.vn",
            trackingEnabled: true
        },
        {
            id: "camp_zalo_1",
            name: "Zalo ZNS - Nhắc nợ thanh toán cước",
            subject: "[ZNS] Thông báo cước phí",
            status: "sent",
            type: "zalo_zns",
            sentAt: subHours(new Date(), 5).toISOString(),
            createdAt: subDays(new Date(), 1).toISOString(),
            target: { listIds: ["list_vip"], segmentIds: [], tagIds: [], individualIds: [] },
            stats: { sent: 120, opened: 115, clicked: 40, bounced: 2, spam: 0, unsubscribed: 0, failed: 3 },
            senderEmail: "Zalo OA",
            trackingEnabled: true
        }
    ];
};

const generateVouchers = () => {
    return [
        {
            id: "vc_1",
            name: "Voucher Giảm 100k cho Đơn > 500k",
            description: "Áp dụng cho mọi dịch vụ. Hạn sử dụng 30 ngày.",
            codeType: "dynamic",
            prefixList: "TET26,XMAS",
            startDate: subDays(new Date(), 10).toISOString(),
            endDate: subDays(new Date(), -20).toISOString(),
            status: "active",
            createdAt: subDays(new Date(), 15).toISOString(),
            rewards: [{ id: "rw_1", discountType: "fixed_amount", discountValue: 100000 }],
            stats: { totalGenerated: 5000, totalDistributed: 1250, totalRedeemed: 430 }
        },
        {
            id: "vc_2",
            name: "Mã Tĩnh Khai Trương Trụ Sở - FREE30",
            description: "Dùng chung mã FREE30. Giới hạn 1000 lượt.",
            codeType: "static",
            staticCode: "FREE30",
            totalUsageLimit: 1000,
            startDate: subDays(new Date(), 60).toISOString(),
            endDate: subDays(new Date(), -5).toISOString(),
            status: "active",
            createdAt: subDays(new Date(), 65).toISOString(),
            rewards: [{ id: "rw_2", discountType: "percentage", discountValue: 30 }],
            stats: { totalGenerated: 1, totalDistributed: 980, totalRedeemed: 980 }
        },
        {
            id: "vc_3",
            name: "Tặng Áo Thun Kỷ Niệm 1 Năm",
            description: "Quà tặng vật lý dành cho khách tham dự Workshop.",
            codeType: "dynamic",
            startDate: subDays(new Date(), 100).toISOString(),
            endDate: subDays(new Date(), 90).toISOString(),
            status: "expired",
            createdAt: subDays(new Date(), 110).toISOString(),
            rewards: [{ id: "rw_3", discountType: "physical_gift", giftTitle: "Áo thun DOMATION" }],
            stats: { totalGenerated: 200, totalDistributed: 200, totalRedeemed: 185 }
        }
    ];
};

const generateCustomEvents = () => {
    return [
        { id: "evt_purchase", name: "Thanh toán thành công", createdAt: subDays(new Date(), 120).toISOString(), stats: { count: 1450 } },
        { id: "evt_add_to_cart", name: "Thêm vào giỏ hàng", createdAt: subDays(new Date(), 120).toISOString(), stats: { count: 8500 } },
        { id: "evt_login", name: "Đăng nhập App", createdAt: subDays(new Date(), 90).toISOString(), stats: { count: 12400 } },
        { id: "evt_download_ebook", name: "Tải Ebook B2B", createdAt: subDays(new Date(), 30).toISOString(), stats: { count: 320 } }
    ];
};

const generateForms = () => {
    return [
        {
            id: "form_1",
            name: "Đăng ký nhận Bản tin (Newsletter)",
            targetListId: "list_fb",
            fields: [{ id: "f1", dbField: "email", label: "Email", required: true, type: "email" }, { id: "f2", dbField: "firstName", label: "Tên", required: false, type: "text" }],
            stats: { submissions: 1250 },
            notificationEnabled: true
        },
        {
            id: "form_2",
            name: "Popup Thoát Trang (Exit Intent) - Tặng Ebook",
            targetListId: "list_webinar",
            fields: [{ id: "f1", dbField: "email", label: "Email", required: true, type: "email" }],
            stats: { submissions: 850 }
        }
    ];
};

// AUTO-GENERATED MASSIVE DEMO SEED DATA
export const seedDemoData = async () => {
    const set = (key: string, data: any) => localStorage.setItem(key, JSON.stringify(data));
    
    // Always clear cache in demo mode to keep data fresh, EXCEPT login tokens
    const adminAuth = localStorage.getItem('mailflow_admin');
    const token = localStorage.getItem('_mf_token');

    console.log(`[DemoSeed] Force wiping demo data to ensure fresh state...`);
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('mailflow_') || key.startsWith('demo_')) && key !== 'mailflow_admin') {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    
    if (adminAuth) localStorage.setItem('mailflow_admin', adminAuth);
    if (token) localStorage.setItem('_mf_token', token);

    // Seed empty state
        set('mailflow_lists', [
            { id: "list_vip", name: "Khách Hàng VIP (Đã mua > 5M)", status: 1, count: 125, createdAt: subDays(new Date(), 60).toISOString() },
            { id: "list_fb", name: "Lead từ Facebook Ads Tháng 4", status: 1, count: 2540, createdAt: subDays(new Date(), 30).toISOString() },
            { id: "list_webinar", name: "Đăng ký Webinar AI Marketing", status: 1, count: 850, createdAt: subDays(new Date(), 15).toISOString() },
            { id: "list_misa", name: "Đồng bộ từ MISA CRM", status: 1, count: 5200, createdAt: subDays(new Date(), 90).toISOString(), source: "MISA CRM" },
            { id: "list_cold", name: "Khách hàng Ngủ Đông", status: 1, count: 1400, createdAt: subDays(new Date(), 120).toISOString() }
        ]);

        set('mailflow_tags', [
            { id: "tag_hot", name: "HOT_LEAD", color: "red", subscriber_count: 450, description: "Khách hàng tiềm năng cao, đang trong quá trình tư vấn" },
            { id: "tag_ceo", name: "CHU_DOANH_NGHIEP", color: "purple", subscriber_count: 120, description: "Chủ doanh nghiệp, giám đốc, founder" },
            { id: "tag_b2b", name: "B2B", color: "orange", subscriber_count: 300, description: "Khách hàng doanh nghiệp, mua số lượng lớn" },
            { id: "tag_loyal", name: "KHACH_TRUNG_THANH", color: "indigo", subscriber_count: 2500, description: "Khách hàng mua lặp lại trên 3 lần" },
            { id: "tag_webinar", name: "DA_THAM_WEBINAR", color: "blue", subscriber_count: 850, description: "Đã tham gia webinar AI Marketing" },
            { id: "tag_trial", name: "DANG_DUNG_TRIAL", color: "green", subscriber_count: 180, description: "Đang trong giai đoạn dùng thử 14 ngày" }
        ]);

        set('mailflow_segments', [
            { id: "seg_1", name: "Tất cả Lead Nóng", count: 450, filters: [{ field: "tag", operator: "contains", value: "Hot Lead" }] },
            { id: "seg_2", name: "Mở mail trong 30 ngày qua", count: 1200, filters: [{ field: "last_open", operator: "recent", value: 30 }] },
            { id: "seg_3", name: "Chủ Doanh Nghiệp hoặc B2B", count: 420, filters: [{ field: "tag", operator: "contains", value: "Chủ Doanh Nghiệp" }] }
        ]);

        try {
            console.log('[DemoSeed] Fetching real SQL demo data...');
            const res = await fetch('/data/real_demo_data.json');
            if (res.ok) {
                const data = await res.json();
                
                if (data.ai_chatbot_categories) set('mailflow_ai_categories', data.ai_chatbot_categories);
                if (data.ai_chatbots) set('mailflow_ai_chatbots', data.ai_chatbots);
                if (data.ai_chatbot_settings) set('mailflow_ai_settings', data.ai_chatbot_settings);
                if (data.ai_chatbot_scenarios) set('mailflow_ai_scenarios', data.ai_chatbot_scenarios);
                if (data.ai_conversations) set('mailflow_ai_conversations', data.ai_conversations);
                if (data.ai_messages) set('mailflow_ai_messages', data.ai_messages);
                
                if (data.subscribers && data.subscribers.length > 0) set('mailflow_subscribers', data.subscribers);
                else set('mailflow_subscribers', generateSubscribers(300));
                
                if (data.campaigns && data.campaigns.length > 0) set('mailflow_campaigns', data.campaigns);
                else set('mailflow_campaigns', generateCampaigns());
                
                if (data.flows && data.flows.length > 0) set('mailflow_flows', data.flows);
                else set('mailflow_flows', generateFlows());
            } else {
                throw new Error('Failed to fetch real_demo_data.json');
            }
        } catch (e) {
            console.warn('[DemoSeed] Fallback to generated data due to fetch error:', e);
            set('mailflow_subscribers', generateSubscribers(300));
            set('mailflow_flows', generateFlows());
            set('mailflow_campaigns', generateCampaigns());
        }

        set('mailflow_voucher_campaigns', generateVouchers());
        set('mailflow_custom_events', generateCustomEvents());
        set('mailflow_forms', generateForms());
        
        console.log(`[DemoSeed] Massive Demo Data Generation Complete! Version: ${DEMO_VERSION}`);
};
