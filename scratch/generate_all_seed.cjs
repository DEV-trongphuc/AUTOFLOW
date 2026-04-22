const fs = require('fs');

const generateData = () => {
    const data = {};

    // ==========================================
    // 1. AUDIENCE CORE (Lists, Tags, Segments, Subscribers)
    // ==========================================
    data.mailflow_lists = [
        { id: "list_vip", name: "Khách Hàng VIP (Đã mua > 5M)", status: 1, count: 125, createdAt: new Date().toISOString() },
        { id: "list_fb", name: "Lead từ Facebook Ads Tháng 4", status: 1, count: 2540, createdAt: new Date().toISOString() },
        { id: "list_webinar", name: "Đăng ký Webinar AI Marketing", status: 1, count: 850, createdAt: new Date().toISOString() },
        { id: "list_misa", name: "Đồng bộ từ MISA CRM", status: 1, count: 5200, createdAt: new Date().toISOString(), source: "MISA CRM" },
        { id: "list_cold", name: "Khách hàng Ngủ Đông", status: 1, count: 1400, createdAt: new Date().toISOString() }
    ];

    data.mailflow_tags = [
        { id: "tag_hot", name: "Hot Lead", color: "red", count: 450 },
        { id: "tag_ceo", name: "Chủ Doanh Nghiệp", color: "purple", count: 120 },
        { id: "tag_b2b", name: "B2B", color: "orange", count: 300 },
        { id: "tag_loyal", name: "Khách Trung Thành", color: "indigo", count: 2500 }
    ];

    data.mailflow_segments = [
        { id: "seg_1", name: "Tất cả Lead Nóng", count: 450, filters: [{ field: "tag", operator: "contains", value: "Hot Lead" }] },
        { id: "seg_2", name: "Mở mail trong 30 ngày qua", count: 1200, filters: [{ field: "last_open", operator: "recent", value: 30 }] }
    ];

    const generateSubscribers = (count) => {
        const subs = [];
        const names = ["Dung", "Tuấn", "Phong", "Nga", "Thảo", "Hương", "Minh", "Bình", "Vy", "Linh", "Hải", "Quân", "An", "Cường", "Duy", "Giang", "Hạnh", "Khôi", "Long", "Nam", "Phúc", "Quốc", "Sơn", "Trâm"];
        const lastNames = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý"];
        const domains = ["gmail.com", "outlook.com", "fpt.com.vn", "vinamilk.com.vn", "viettel.vn", "vietcombank.com.vn", "vinhomes.vn", "thegioididong.com"];
        const statuses = ["subscribed", "unsubscribed", "bounced", "customer", "lead", "active"];
        
        for (let i = 0; i < count; i++) {
            const first = names[Math.floor(Math.random() * names.length)];
            const last = lastNames[Math.floor(Math.random() * lastNames.length)];
            const domain = domains[Math.floor(Math.random() * domains.length)];
            const status = statuses[Math.random() > 0.8 ? Math.floor(Math.random() * statuses.length) : 0];
            
            subs.push({
                id: `sub_${i}`,
                email: `${last.toLowerCase()}.${first.toLowerCase()}.${i}@${domain}`,
                firstName: first,
                lastName: last,
                phoneNumber: `09${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
                status: status,
                createdAt: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
                joinedAt: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
                lastActivityAt: new Date(Date.now() - Math.random() * 1000000000).toISOString(),
                score: Math.floor(Math.random() * 100),
                leadScore: Math.floor(Math.random() * 100),
                chatCount: Math.floor(Math.random() * 50),
                verified: Math.random() > 0.7 ? 1 : 0,
                meta_psid: Math.random() > 0.8 ? '123456789' : '0',
                tags: Math.random() > 0.5 ? [data.mailflow_tags[Math.floor(Math.random()*data.mailflow_tags.length)].name] : [],
                lists: [data.mailflow_lists[Math.floor(Math.random()*data.mailflow_lists.length)].id],
                stats: { lastOpenAt: new Date().toISOString() }
            });
        }
        return subs;
    };
    data.mailflow_subscribers = generateSubscribers(300);

    // ==========================================
    // 2. CAMPAIGNS, FORMS, SURVEYS
    // ==========================================
    data.mailflow_forms = [
        { id: "form_lead", name: "Popup Nhận Ebook AI Marketing", targetListId: "list_fb", stats: { views: 15000, submissions: 2540, conversion: 16.9 }, status: "published" }
    ];

    data.mailflow_surveys = [
        { id: "survey_nps", name: "Đánh giá mức độ hài lòng (NPS Q2)", status: "published", createdAt: new Date().toISOString(), stats: { views: 1200, starts: 950, completes: 800, completion_rate: 84.2, avg_time_sec: 45 } }
    ];

    data.mailflow_campaigns = [];
    for (let i = 1; i <= 5; i++) {
        const total = Math.floor(Math.random() * 15000) + 2000;
        data.mailflow_campaigns.push({
            id: `camp_${i}`,
            name: `Chiến dịch Marketing Tháng ${i} - Bản tin Tự động`,
            subject: `🔥 Khám phá cơ hội x3 doanh thu tháng ${i}`,
            status: i <= 3 ? "sent" : "scheduled",
            totalTargetAudience: total,
            stats: { sent: Math.floor(total * 0.9), opened: Math.floor(total * 0.4), clicked: Math.floor(total * 0.1), bounced: 10, unsubscribed: 5 },
            createdAt: new Date().toISOString(),
            sentAt: i <= 3 ? new Date().toISOString() : null,
            lists: ["list_fb"]
        });
    }

    // ==========================================
    // 3. ZALO OA & SCENARIOS (DEEP MOCK)
    // ==========================================
    data.mailflow_zalo_oa = [
        { id: "oa_demo_001", name: "DOMATION Official", status: "active", followers: 45200, is_verified: true, avatar: "https://automation.ideas.edu.vn/imgs/ICON.png" },
        { id: "oa_demo_002", name: "DOMATION Support", status: "active", followers: 12400, is_verified: false, avatar: "https://automation.ideas.edu.vn/imgs/ICON.png" }
    ];

    data.mailflow_zalo_scenarios = [
        {
            id: "scenario_welcome",
            oa_config_id: "oa_demo_001",
            type: "keyword",
            trigger_text: "QUAN TAM",
            name: "Kịch bản Chào Mừng & Tặng Mã Giảm Giá",
            message_type: "text_with_buttons",
            text_content: "Chào bạn, cảm ơn bạn đã quan tâm. Đây là mã giảm giá 20%: WELCOME20",
            buttons: [{ id: "btn1", title: "Xem Khóa Học", type: "url", url: "https://domation.vn" }],
            status: "active",
            created_at: new Date().toISOString()
        },
        {
            id: "scenario_cart",
            oa_config_id: "oa_demo_001",
            type: "keyword",
            trigger_text: "GIO HANG",
            name: "Nhắc nhở Giỏ Hàng Bỏ Quên (Abandon Cart)",
            message_type: "image",
            text_content: "Bạn ơi, giỏ hàng của bạn đang chờ. Hoàn tất ngay để nhận quà!",
            image_url: "https://placehold.co/600x400/f59e0b/white?text=Cart+Reminder",
            buttons: [{ id: "btn1", title: "Thanh toán ngay", type: "url", url: "https://domation.vn/checkout" }],
            status: "active",
            created_at: new Date().toISOString()
        }
    ];

    // ==========================================
    // 4. ADMIN USERS (DEEP MOCK)
    // ==========================================
    data.mailflow_admin_users = [
        { id: "admin_1", name: "Duy Phuc", email: "admin@domation.vn", role: "superadmin", last_active: new Date().toISOString(), status: "active" },
        { id: "admin_2", name: "Marketing Team", email: "marketing@domation.vn", role: "editor", last_active: new Date(Date.now() - 3600000).toISOString(), status: "active" },
        { id: "admin_3", name: "Support Agent", email: "support@domation.vn", role: "viewer", last_active: new Date(Date.now() - 86400000).toISOString(), status: "active" }
    ];

    // ==========================================
    // 5. VOUCHERS (DEEP MOCK)
    // ==========================================
    data.mailflow_vouchers = [
        { id: "v_welcome", code: "WELCOME2026", type: "percentage", value: 20, max_claims: 1000, current_claims: 854, status: "active", expires_at: new Date(Date.now() + 86400000 * 30).toISOString(), created_at: new Date().toISOString() },
        { id: "v_vip", code: "VIP500K", type: "fixed", value: 500000, max_claims: 100, current_claims: 100, status: "exhausted", expires_at: new Date(Date.now() + 86400000 * 10).toISOString(), created_at: new Date().toISOString() }
    ];

    // ==========================================
    // 6. WEB TRACKING PROPERTIES & AI CHATBOTS
    // ==========================================
    data.mailflow_web_tracking_properties = [
        { id: "prop_1", name: "DOMATION Landing Page", domain: "domation.vn", status: "active", created_at: new Date().toISOString() },
        { id: "prop_2", name: "Khóa Học Academy", domain: "academy.domation.vn", status: "active", created_at: new Date().toISOString() }
    ];

    data.mailflow_ai_chatbots = [
        { id: "bot_1", property_id: "prop_1", bot_name: "DOMATION AI Sales", status: "active", knowledge_base_count: 15, theme_color: "#f59e0b" },
        { id: "bot_2", property_id: "prop_2", bot_name: "DOMATION Support", status: "active", knowledge_base_count: 42, theme_color: "#3b82f6" }
    ];

    // ==========================================
    // 7. DASHBOARD STATS (To prevent blank overview)
    // ==========================================
    data.mailflow_system_stats = {
        totalSubscribers: 32540,
        activeFlows: 18,
        totalSent: 1450000,
        avgOpenRate: "28.5%",
        avgClickRate: "12.4%",
        monthlyGrowth: "+15.2%"
    };

    // ==========================================
    // 8. TEMPLATES, FLOWS & INTEGRATIONS
    // ==========================================
    data.mailflow_templates = [
        { id: "tpl_welcome", name: "Welcome Series - 2026", subject: "Chào mừng bạn đến với DOMATION", content_html: "<html><body><h1>Chào mừng bạn!</h1><p>Cảm ơn bạn đã đăng ký.</p></body></html>", category: "Welcome", status: "active", created_at: new Date().toISOString() },
        { id: "tpl_abandoned", name: "Giỏ Hàng Bị Bỏ Quên (Abandoned Cart)", subject: "Bạn quên đồ trong giỏ hàng này!", content_html: "<html><body><h1>Giỏ hàng của bạn đang chờ!</h1><p>Hoàn tất thanh toán ngay để nhận ưu đãi 10%.</p></body></html>", category: "E-commerce", status: "active", created_at: new Date().toISOString() },
        { id: "tpl_newsletter", name: "Bản Tin Tháng 4 - AI Update", subject: "Cập nhật mới nhất về AI Marketing", content_html: "<html><body><h1>Bản tin Tháng 4</h1><p>Các tính năng mới...</p></body></html>", category: "Newsletter", status: "active", created_at: new Date().toISOString() }
    ];

    data.mailflow_flows = [
        { 
            id: "flow_1", 
            name: "Chào mừng Khách Hàng Mới", 
            status: "active", 
            triggerType: "List Join", 
            stats: { enrolled: 1250, completed: 1100 },
            nodes: [
                { id: "trigger", type: "trigger", position: { x: 250, y: 50 }, data: { label: "Khi KH vào danh sách" } },
                { id: "delay_1", type: "delay", position: { x: 250, y: 150 }, data: { label: "Chờ 10 phút" } },
                { id: "email_1", type: "email", position: { x: 250, y: 250 }, data: { label: "Gửi Email Welcome" } }
            ],
            edges: [
                { id: "e1", source: "trigger", target: "delay_1" },
                { id: "e2", source: "delay_1", target: "email_1" }
            ],
            created_at: new Date().toISOString() 
        },
        { 
            id: "flow_2", 
            name: "Abandoned Cart Recovery", 
            status: "active", 
            triggerType: "API Event", 
            stats: { enrolled: 450, completed: 210 },
            nodes: [
                { id: "trigger", type: "trigger", position: { x: 250, y: 50 }, data: { label: "API: checkout_abandoned" } },
                { id: "delay_1", type: "delay", position: { x: 250, y: 150 }, data: { label: "Chờ 1 giờ" } },
                { id: "email_1", type: "email", position: { x: 250, y: 250 }, data: { label: "Gửi Email Nhắc Nhở" } }
            ],
            edges: [
                { id: "e1", source: "trigger", target: "delay_1" },
                { id: "e2", source: "delay_1", target: "email_1" }
            ],
            created_at: new Date().toISOString() 
        }
    ];

    data.mailflow_integrations = [
        { id: "int_shopify", provider: "Shopify", status: "connected", account_name: "domation-store.myshopify.com", last_sync: new Date().toISOString() },
        { id: "int_zalo", provider: "Zalo ZNS", status: "connected", account_name: "DOMATION Official", last_sync: new Date().toISOString() },
        { id: "int_haravan", provider: "Haravan", status: "disconnected", account_name: "", last_sync: null }
    ];

    return data;
};

const jsonData = JSON.stringify(generateData(), null, 2);
fs.writeFileSync('seed_data_v6.json', jsonData);
console.log('Successfully generated seed_data_v6.json with massive mock expansions!');
