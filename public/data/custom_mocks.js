/**
 * FILE NÀY ĐƯỢC LOAD ĐỘNG BỞI TRANG open.domation.net (KHÔNG CẦN BUILD LẠI REACT).
 * BẠN CHỈ CẦN SỬA FILE NÀY VÀ UPLOAD LÊN SERVER LÀ DỮ LIỆU SẼ THAY ĐỔI NGAY LẬP TỨC.
 */
window.MAILFLOW_CUSTOM_MOCKS = function(resource, endpoint, id, action, route) {
    const subHours = (d, h) => new Date(d.getTime() - h * 3600000);
    const subDays = (d, days) => new Date(d.getTime() - days * 86400000);
    const now = new Date();

    // === 1. THÊM LỊCH SỬ HOẠT ĐỘNG (OPEN/CLICK/HEATMAP) CHO CAMPAIGN ===
    if (resource === 'campaigns' && action === 'report') {
        const storedCampaigns = JSON.parse(localStorage.getItem('mailflow_campaigns') || '[]');
        const camp = storedCampaigns.find(c => c.id === id);
        
        if (camp) {
            return {
                ...camp,
                stats: {
                    total_sent: 2500, total_opened: 1800, total_clicked: 850,
                    total_bounced: 15, total_unsubscribed: 5,
                    open_rate: 72.0, click_rate: 47.2, bounce_rate: 0.6,
                    unsubscribe_rate: 0.2, click_to_open_rate: 65.5
                },
                timeline: Array.from({ length: 24 }).map((_, i) => ({
                    hour: `${String(i).padStart(2, '0')}:00`,
                    opens: i > 7 && i < 22 ? Math.floor(Math.random() * 150) + 20 : Math.floor(Math.random() * 10),
                    clicks: i > 7 && i < 22 ? Math.floor(Math.random() * 80) + 10 : Math.floor(Math.random() * 5),
                })),
                devices: [
                    { name: 'iPhone / iOS', count: 1200, pct: 66.6 },
                    { name: 'Windows PC', count: 400, pct: 22.2 },
                    { name: 'Android', count: 200, pct: 11.2 },
                ],
                top_links: [
                    { url: 'https://domation.vn/uu-dai-dac-biet', label: 'Xem Ưu Đãi Đặc Biệt', clicks: 600 },
                    { url: 'https://domation.vn/dang-ky', label: 'Đăng ký ngay', clicks: 250 },
                ],
                locations: [
                    { city: 'Hồ Chí Minh', pct: 55 }, { city: 'Hà Nội', pct: 35 }, { city: 'Khác', pct: 10 }
                ]
            };
        }
    }

    // === 2. THÊM LOGS / LỊCH SỬ SEND CHO FLOW ===
    if (resource === 'flows' && route === 'history') {
        return {
            data: Array.from({ length: 20 }).map((_, i) => {
                const types = ['opened', 'clicked', 'sent', 'bounced'];
                const weights = [0.5, 0.2, 0.25, 0.05]; // 50% open, 20% click, 25% sent, 5% bounce
                let rnd = Math.random();
                let selectedType = types[0];
                for(let j = 0; j < weights.length; j++) {
                    if (rnd < weights[j]) { selectedType = types[j]; break; }
                    rnd -= weights[j];
                }

                return {
                    id: `log_js_${i}_${Date.now()}`,
                    email: `demo.khachhang${i}@company.com`,
                    type: selectedType,
                    createdAt: subHours(now, Math.random() * 48).toISOString(),
                    device: Math.random() > 0.5 ? 'iPhone 15 Pro' : 'Windows 11',
                    location: Math.random() > 0.4 ? 'Hồ Chí Minh, VN' : 'Hà Nội, VN'
                };
            }),
            pagination: { page: 1, limit: 20, total: 120, totalPages: 6 }
        };
    }

    // === 3. TẠO EMAIL TEMPLATES MẪU ===
    if (resource === 'email_templates' && !id && !route) {
        return [
            {
                id: 'tpl_welcome',
                name: 'Welcome Email (Giao diện chuẩn)',
                thumbnail: 'https://images.unsplash.com/photo-1557200134-90327ee9fafa?w=500&h=300&fit=crop',
                subject: 'Chào mừng bạn đến với Domation',
                content: '<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e2e8f0;border-radius:10px;"><h1 style="color:#0f172a;text-align:center;">Chào mừng bạn! 👋</h1><p style="color:#475569;font-size:16px;line-height:1.6;">Cảm ơn bạn đã đăng ký dịch vụ của chúng tôi. Chúng tôi rất vui được đồng hành cùng bạn.</p><div style="text-align:center;margin:30px 0;"><a href="https://domation.vn" style="background:#ffa900;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;">Bắt đầu ngay</a></div><p style="color:#94a3b8;font-size:12px;text-align:center;">Nếu có bất kỳ thắc mắc nào, hãy phản hồi email này.</p></div>',
                createdAt: subDays(now, 5).toISOString(),
            },
            {
                id: 'tpl_promo',
                name: 'Email Khuyến mãi Sinh nhật',
                thumbnail: 'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?w=500&h=300&fit=crop',
                subject: '🎁 Tặng bạn Mã giảm giá 50% nhân dịp sinh nhật',
                content: '<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#fffaf0;border-radius:10px;text-align:center;"><h1 style="color:#ea580c;">Chúc Mừng Sinh Nhật! 🎂</h1><p style="color:#475569;font-size:16px;">Tặng bạn mã ưu đãi đặc biệt giảm ngay 50% cho đơn hàng tiếp theo.</p><div style="background:#fff;border:2px dashed #f97316;padding:15px;margin:20px auto;width:max-content;font-size:24px;font-weight:900;color:#f97316;letter-spacing:2px;">BDAY50</div><a href="https://domation.vn/shop" style="background:#f97316;color:#fff;padding:12px 30px;border-radius:30px;text-decoration:none;font-weight:bold;display:inline-block;margin-top:10px;">Sử Dụng Ngay</a></div>',
                createdAt: subDays(now, 2).toISOString(),
            }
        ];
    }

    // === 4. TẠO KHẢO SÁT / FORMS ===
    if (resource === 'forms' && !id && !route) {
        return [
            {
                id: 'form_1',
                name: 'Khảo sát Mức độ hài lòng của Khách hàng',
                type: 'survey',
                status: 'active',
                views: 1250,
                submissions: 342,
                conversionRate: 27.3,
                createdAt: subDays(now, 10).toISOString()
            },
            {
                id: 'form_2',
                name: 'Đăng ký nhận Bảng báo giá chi tiết',
                type: 'popup',
                status: 'active',
                views: 5400,
                submissions: 680,
                conversionRate: 12.5,
                createdAt: subDays(now, 30).toISOString()
            }
        ];
    }
    
    // Khảo sát chi tiết (thống kê)
    if (resource === 'forms' && route === 'stats' && id) {
        return {
            total_views: 1250,
            total_submissions: 342,
            conversion_rate: 27.3,
            daily_stats: Array.from({length: 14}).map((_, i) => ({
                date: subDays(now, 13 - i).toISOString().split('T')[0],
                views: Math.floor(Math.random() * 100) + 20,
                submissions: Math.floor(Math.random() * 30) + 5
            })),
            fields_summary: [
                {
                    label: 'Mức độ hài lòng',
                    type: 'rating',
                    average: 4.6,
                    distribution: { '5 Sao': 200, '4 Sao': 100, '3 Sao': 30, '2 Sao': 10, '1 Sao': 2 }
                },
                {
                    label: 'Tính năng yêu thích nhất',
                    type: 'radio',
                    distribution: { 'Automation Flow': 150, 'Email Builder': 120, 'Web Tracking': 72 }
                }
            ]
        };
    }

    // === 5. CẬP NHẬT TẤT CẢ SUBSCRIBERS CÓ ĐẦY ĐỦ DATA TRONG MODAL ===
    if (resource === 'subscribers' && id && !route && !action) {
        const storedSubs = JSON.parse(localStorage.getItem('mailflow_subscribers') || '[]');
        const sub = storedSubs.find(s => s.id === id);
        if (sub) {
            // Đảm bảo có activity
            if (!sub.activity || sub.activity.length === 0) {
                const isCustomer = sub.status === 'customer';
                const isLead = sub.status === 'lead';
                
                sub.activity = Array.from({ length: isCustomer ? 15 : (isLead ? 8 : 4) }).map((_, i) => {
                    const daysAgo = Math.random() * 60; // Spread over 60 days
                    const actTypes = [
                        { type: 'web_pageview', title: 'Truy cập trang Bảng Giá', icon: 'Globe' },
                        { type: 'web_click', title: 'Click nút "Xem chi tiết"', icon: 'MousePointer2' },
                        { type: 'open_email', title: 'Mở email Cập nhật tính năng mới', icon: 'MailOpen' },
                        { type: 'click_link', title: 'Click link Đăng ký dùng thử', icon: 'MousePointer2' },
                        { type: 'enter_segment', title: 'Lọt vào phân khúc: Khách hàng Tiềm năng', icon: 'Layers' },
                        { type: 'tag_added', title: 'Gắn Tag: Quan tâm Bảng Giá', icon: 'Tag' },
                        { type: 'form_submit', title: 'Điền form: Đăng ký tư vấn', icon: 'FileText' },
                    ];
                    
                    if (isCustomer && i === 0) {
                        return { id: `act_pur_${i}`, type: 'purchase', title: 'Mua gói Doanh nghiệp (1 năm)', createdAt: subDays(now, daysAgo).toISOString(), details: '24,000,000 VND' };
                    }
                    
                    const randAct = actTypes[Math.floor(Math.random() * actTypes.length)];
                    return {
                        id: `act_${i}_${Date.now()}`,
                        type: randAct.type,
                        title: randAct.title,
                        label: randAct.title, // For display
                        createdAt: subDays(now, daysAgo).toISOString(),
                        date: subDays(now, daysAgo).toISOString(), // For display compatibility
                        details: Math.random() > 0.5 ? 'Thiết bị: iPhone 14 Pro, Vị trí: HCM' : ''
                    };
                }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            }

            // Gắn cứng thêm một vài điểm chạm thực tế
            sub.tags = [...(sub.tags || []), 'Đã tương tác', 'Nguồn Website'];
            sub.source = 'Web Tracking';
            sub.customAttributes = {
                ...sub.customAttributes,
                browser: 'Chrome 122.0',
                os: 'macOS 14.3',
                device: 'Desktop'
            };

            return sub;
        }
    }

    // TRẢ VỀ NULL ĐỂ HỆ THỐNG TỰ ĐỘNG DÙNG DỮ LIỆU CỐT LÕI NẾU KHÔNG MATCH
    return null;
};
