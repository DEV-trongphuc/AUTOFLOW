import { format, subHours, subMinutes, subDays } from 'date-fns';
import demoTemplates from './demo_templates.json';

export const getDynamicReport = (resource: string, endpoint: string): any | null => {
    const url = new URL('http://localhost/' + endpoint);
    const route = url.searchParams.get('route');
    const action = url.searchParams.get('action');
    const id = url.searchParams.get('id') || url.searchParams.get('campaign_id');
    const mode = url.searchParams.get('mode') || 'yearly';
    const year = parseInt(url.searchParams.get('year') || String(new Date().getFullYear()));
    const month = parseInt(url.searchParams.get('month') || String(new Date().getMonth() + 1));
    const days = parseInt(url.searchParams.get('days') || '7');

    // ─── 0. System / Auth / Report ───────────────────────────────────────────
    if (resource === 'auth') {
        if (action === 'check') return { user: { id: 'demo_user', name: 'Demo Guest', email: 'guest@domation.vn', role: 'admin' }, workspace: { id: 'ws_demo', name: 'DOMATION Demo' } };
        if (action === 'logs') return [
            { id: 1, action: 'login', ip_address: '192.168.1.1', user_agent: 'Chrome', created_at: new Date().toISOString() }
        ];
    }
    if (resource === 'workspaces' && action === 'users') {
        return [
            { id: 'usr_1', name: 'Demo Guest', email: 'guest@domation.vn', role: 'admin', is_owner: 1, last_login: new Date().toISOString() },
            { id: 'usr_2', name: 'Marketing Staff', email: 'mkt@domation.vn', role: 'editor', is_owner: 0, last_login: subDays(new Date(), 2).toISOString() }
        ];
    }
    if (resource === 'roles' && action === 'list') {
        return [
            { id: 'admin', name: 'Admin', description: 'Toàn quyền' },
            { id: 'editor', name: 'Editor', description: 'Chỉnh sửa' },
            { id: 'viewer', name: 'Viewer', description: 'Chỉ xem' }
        ];
    }
    if (resource === 'audience_report') {
        return {
            growth: 150,
            growth_trend: 5.2,
            active: 2100,
            active_trend: 12.4,
            churn: 12,
            churn_trend: -2.1,
            summary: { total_subscribers: 2540, new_subscribers: 150, unsubscribed: 12, growth_rate: 5.2 },
            timeline: Array.from({ length: 30 }).map((_, i) => ({
                date: format(subDays(new Date(), 29 - i), 'dd/MM'),
                new: Math.floor(Math.random() * 50) + 10,
                unsubscribed: Math.floor(Math.random() * 5)
            })),
            sources: [
                { source: 'Landing Page', count: 1200 },
                { source: 'Facebook', count: 800 },
                { source: 'Direct', count: 540 }
            ],
            health: { active: 2100, inactive: 400, bounced: 40 }
        };
    }

    // ─── 1. Overview Stats (main dashboard modal) ────────────────────────────
    if (resource === 'subscribers' && !route && !action && !id) {
        const storedSubs: any[] = JSON.parse(localStorage.getItem('mailflow_subscribers') || '[]');
        return {
            data: storedSubs,
            pagination: { page: 1, limit: 20, total: storedSubs.length, totalPages: 1 },
            globalStats: { customer: Math.floor(storedSubs.length * 0.4), unsubscribed: 12, lead: Math.floor(storedSubs.length * 0.6) }
        };
    }
    
    if (resource === 'subscriber_ai_summary') {
        return {
            summary: "Khách hàng này thường xuyên tương tác với các email liên quan đến Automation Marketing. Tỷ lệ mở email cao (>80%). Gần đây có truy cập trang Bảng giá nhưng chưa có hành động mua hàng. Có thể tiếp cận bằng cách gửi ưu đãi đặc biệt hoặc mời tham gia Webinar."
        };
    }

    if (resource === 'subscribers' && id) {
        const storedSubs: any[] = JSON.parse(localStorage.getItem('mailflow_subscribers') || '[]');
        const sub = storedSubs.find((s: any) => s.id === id);
        if (sub) {
            sub.activity = Array.from({ length: 5 }).map((_, i) => ({
                id: `act_${i}`,
                type: ['email_open', 'email_click', 'page_view', 'form_submit', 'tag_added'][i % 5],
                title: ['Mở email Bản tin', 'Click link ưu đãi', 'Truy cập Bảng giá', 'Điền form Đăng ký', 'Thêm tag Khách hàng mới'][i % 5],
                createdAt: subHours(new Date(), i * 12 + Math.random() * 5).toISOString(),
                metadata: { campaignId: 'camp_1' }
            }));
            return sub;
        }
    }

    if (resource === 'overview_stats' && !route) {
        const chartData = Array.from({ length: days }).map((_, i) => ({
            date: format(subDays(new Date(), days - 1 - i), 'dd/MM'),
            web: Math.floor(Math.random() * 400) + 150,
            ai: Math.floor(Math.random() * 120) + 40,
        }));
        const storedCampaigns: any[] = JSON.parse(localStorage.getItem('mailflow_campaigns') || '[]');
            const storedFlows: any[] = JSON.parse(localStorage.getItem('mailflow_flows') || '[]').map((f: any) => ({
            ...f,
            steps: Array.isArray(f.steps) ? f.steps : (typeof f.steps === 'string' ? (() => { try { return JSON.parse(f.steps); } catch { return []; } })() : [])
        }));
        return {
            summary: {
                total_ai: 1250,
                growth_ai: 18.5,
                total_web: 45200,
                growth_web: 12.3,
                total_leads: 2540,
                growth_leads: 22.1,
            },
            chart_data: chartData,
            top_campaigns: storedCampaigns.filter((c: any) => c.status === 'sent').slice(0, 5).map((c: any) => ({
                name: c.name,
                stat_total_sent: c.stats?.sent || 0,
                stat_total_opened: c.stats?.opened || 0,
                stat_total_clicked: c.stats?.clicked || 0,
            })),
            top_flows: storedFlows.slice(0, 5).map((f: any) => ({
                name: f.name,
                stat_enrolled: f.stats?.enrolled || 0,
                stat_completed: f.stats?.completed || 0,
                trigger_type: f.triggerType,
            })),
        };
    }

    // ─── 2. Email Sent Chart ─────────────────────────────────────────────────
    if (resource === 'overview_stats' && route === 'email_sent_chart') {
        const monthNames = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];
        let data: any[] = [];
        let total = 0;
        let peak = 0;

        if (mode === 'yearly') {
            data = monthNames.map((label, i) => {
                const sent = i < new Date().getMonth() + 1 ? Math.floor(Math.random() * 18000) + 3000 : 0;
                total += sent;
                if (sent > peak) peak = sent;
                return { label, sent };
            });
        } else {
            const daysInMonth = new Date(year, month, 0).getDate();
            data = Array.from({ length: daysInMonth }, (_, i) => {
                const sent = Math.floor(Math.random() * 2500) + 100;
                total += sent;
                if (sent > peak) peak = sent;
                return { label: String(i + 1).padStart(2, '0'), sent };
            });
        }
        return {
            data,
            summary: { total, peak },
            years: [new Date().getFullYear() - 1, new Date().getFullYear()],
        };
    }

    // ─── 3. Flow History Logs ────────────────────────────────────────────────
    if (resource === 'flows' && route === 'history') {
        const logs = [];
        const types = ['sent', 'delivered', 'opened', 'clicked'];
        const emails = ['nguyen.van.a@gmail.com', 'ceo@company.vn', 'marketing@agency.com', 'demo.khachhang@gmail.com', 'khach.hang.b2b@corp.vn'];
        for (let i = 0; i < 25; i++) {
            const time = subMinutes(new Date(), Math.floor(Math.random() * 60 * 24));
            const type = types[Math.floor(Math.random() * types.length)];
            logs.push({
                id: `log_${i}`,
                email: emails[i % emails.length],
                type,
                createdAt: time.toISOString(),
                device: Math.random() > 0.5 ? 'iPhone' : 'Windows PC',
                location: Math.random() > 0.5 ? 'Hồ Chí Minh, VN' : 'Hà Nội, VN',
            });
        }
        return { data: logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), pagination: { page: 1, limit: 25, total: 25, totalPages: 1 } };
    }

    // ─── 4. Campaign Audience Stats ──────────────────────────────────────────
    if (resource === 'campaigns' && route === 'audience_stats') {
        return {
            total_current: 2540,
            count_sent: 2500,
            gap: 40,
            count_unsubscribed: 5,
            timeline: Array.from({ length: 24 }).map((_, i) => ({
                date: format(subHours(new Date(), 23 - i), 'HH:00'),
                opens: Math.floor(Math.random() * 120) + 10,
                clicks: Math.floor(Math.random() * 40) + 5,
            })),
            devices: [
                { name: 'Apple iOS', count: 1200 },
                { name: 'Windows', count: 800 },
                { name: 'Android', count: 500 },
            ],
            locations: { 'Ho Chi Minh': 1500, 'Ha Noi': 800, 'Da Nang': 200 },
        };
    }

    // ─── 5. Campaign Tech Stats ──────────────────────────────────────────────
    if (resource === 'campaigns' && route === 'tech_stats') {
        return {
            browsers: [{ name: 'Chrome', count: 1500 }, { name: 'Safari', count: 800 }, { name: 'Firefox', count: 200 }],
            os: [{ name: 'iOS', count: 1200 }, { name: 'Windows', count: 900 }, { name: 'Android', count: 400 }],
        };
    }

    // ─── 6. QR Tracking Report ───────────────────────────────────────────────
    if (resource === 'links_qr' && action === 'stats') {
        return {
            total_visits: 1250,
            unique_visitors: 850,
            timeline: Array.from({ length: 7 }).map((_, i) => ({
                date: format(subDays(new Date(), 6 - i), 'dd/MM'),
                visits: Math.floor(Math.random() * 200) + 50,
            })),
            devices: [
                { name: 'iPhone', count: 650 },
                { name: 'Samsung', count: 400 },
                { name: 'Other', count: 200 },
            ],
            os: [
                { name: 'iOS', count: 650 },
                { name: 'Android', count: 400 },
                { name: 'Windows', count: 200 },
            ],
            country: [
                { name: 'Vietnam', count: 1200 },
                { name: 'US', count: 50 },
            ],
            recent_clicks: Array.from({ length: 12 }).map((_, i) => ({
                id: i,
                ip: `113.190.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
                os: Math.random() > 0.5 ? 'iOS' : 'Android',
                browser: 'Safari',
                scanned_at: subMinutes(new Date(), Math.floor(Math.random() * 180)).toISOString(),
            })),
        };
    }

    // ─── 7. Flow Analytics (detail view) ────────────────────────────────────
    if (resource === 'flows') {
        if (route === 'sync') return { synced: true };
        if (route === 'migrate-users') return { affected: 50 };
        
        if (id) {
            if (route === 'distribution') {
                return {
                    'step_1': { count: 120, avg_wait: 45 },
                    'step_2': { count: 45, avg_wait: 120 },
                };
            }
            if (route === 'completed-users') {
                return {
                    total: 250,
                    byBranch: { 'yes': 150, 'no': 100 }
                };
            }
            if (route === 'active-count') {
                return { active_users: Math.floor(Math.random() * 500) };
            }
            if (route === 'stats') {
                return { enrolled: 1200, completed: 800, waiting: 400 };
            }
            if (route === 'participants' || route === 'step-errors' || route === 'step-unsubscribes') {
                const stepId = url.searchParams.get('step_id') || '';
                const search = url.searchParams.get('search') || '';
                const type = url.searchParams.get('type') || '';
                
                // Mock participants based on step
                const participants = Array.from({ length: 12 }).map((_, i) => ({
                    id: `p_${i}`,
                    email: `demo.user.${i}@company.vn`,
                    firstName: ['Hoàng', 'Minh', 'Tuấn', 'Thanh', 'Ngọc'][i % 5],
                    lastName: ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Vũ'][i % 5],
                    status: route === 'step-errors' ? 'failed' : (route === 'step-unsubscribes' ? 'unsubscribed' : 'active'),
                    error_message: route === 'step-errors' ? 'SMTP Error: Connection timed out' : null,
                    unsubscribed_at: route === 'step-unsubscribes' ? subDays(new Date(), 1).toISOString() : null,
                    last_interaction_at: subHours(new Date(), 2).toISOString(),
                })).filter(p => !search || p.email.includes(search) || p.firstName.includes(search));

                return { 
                    data: participants, 
                    pagination: { page: 1, limit: 12, total: participants.length, totalPages: 1 } 
                };
            }
            if (!route) {
                const stored = localStorage.getItem('mailflow_flows');
                if (stored) {
                    const flows = JSON.parse(stored);
                    const flow = flows.find((f: any) => f.id === id);
                    if (flow) {
                        flow.steps = (flow.steps || []).map((step: any) => ({
                            ...step,
                            stats: step.stats || {
                                entered: Math.floor(Math.random() * 500) + 100,
                                completed: Math.floor(Math.random() * 400) + 50,
                                waiting: step.type === 'wait' ? Math.floor(Math.random() * 50) + 10 : 0,
                            },
                        }));
                        return flow;
                    }
                }
            }
        }
    }

    // ─── 8. Web Tracking ─────────────────────────────────────────────────────
    if (resource === 'web_tracking') {
        if (action === 'list') {
            const stored: any[] = JSON.parse(localStorage.getItem('mailflow_web_properties') || '[]');
            if (stored.length > 0) return stored;
            const defaults = [
                { id: 'wp_001', name: 'Website Chính - DOMATION', domain: 'domation.vn', ai_enabled: true, stats: { docs_count: 42, queries_count: 1250 } },
                { id: 'wp_002', name: 'Landing Page Bảng Giá', domain: 'gia.domation.vn', ai_enabled: true, stats: { docs_count: 12, queries_count: 380 } },
                { id: 'wp_003', name: 'Blog & Nội dung SEO', domain: 'blog.domation.vn', ai_enabled: false, stats: { docs_count: 0, queries_count: 0 } },
            ];
            localStorage.setItem('mailflow_web_properties', JSON.stringify(defaults));
            return defaults;
        }
        if (action === 'get_settings') {
            return {
                property_id: id || 'wp_001', is_enabled: 1,
                bot_name: 'AI DOMATION', company_name: 'DOMATION Vietnam',
                brand_color: '#ffa900', bot_avatar: '',
                welcome_msg: 'Chào bạn! Tôi có thể giúp gì cho bạn?',
                teaser_msg: 'Chat với AI',
                persona_prompt: 'Bạn là trợ lý ảo của DOMATION.',
                gemini_api_key: '',
                quick_actions: ['Giá dịch vụ', 'Liên hệ tư vấn', 'Xem tính năng'],
                similarity_threshold: 0.45, top_k: 12, history_limit: 10,
                widget_position: 'bottom-right', auto_open: 0,
            };
        }
        if (action === 'visitors' && !url.searchParams.get('visitor_id')) {
            const visitors = Array.from({ length: 15 }).map((_, i) => ({
                id: `v_${i}`,
                ip: `192.168.1.${i}`,
                country: 'VN',
                city: i % 2 === 0 ? 'Hồ Chí Minh' : 'Hà Nội',
                device: i % 3 === 0 ? 'mobile' : 'desktop',
                os: i % 2 === 0 ? 'iOS' : 'Windows',
                browser: 'Chrome',
                first_seen: subDays(new Date(), Math.floor(Math.random() * 30)).toISOString(),
                last_seen: new Date().toISOString(),
                is_returning: i % 2 !== 0,
                pageviews: Math.floor(Math.random() * 20) + 1,
            }));
            return { visitors, pagination: { page: 1, limit: 15, total: 150 }, live_count: 12 };
        }
        if (action === 'visitors' && url.searchParams.get('visitor_id') || action === 'visitor_journey') {
            const timeline = Array.from({ length: 8 }).map((_, i) => ({
                id: `ev_${i}`,
                type: i === 0 ? 'pageview' : (i % 3 === 0 ? 'click' : 'scroll'),
                created_at: subMinutes(new Date(), i * 5).toISOString(),
                page_title: i % 2 === 0 ? 'Trang Chủ' : 'Sản Phẩm',
                url: i % 2 === 0 ? '/' : '/san-pham',
                target: i === 0 ? null : 'Nút Đăng Ký',
                duration: 45
            }));
            return { timeline, stats: { total_duration: 360, bounce_rate: 15 } };
        }
        if (action === 'retention') {
            return {
                cohorts: Array.from({ length: 5 }).map((_, i) => ({
                    date: format(subDays(new Date(), i * 7), 'dd/MM/yyyy'),
                    total: Math.floor(Math.random() * 1000) + 500,
                    retention: [100, Math.floor(Math.random() * 50) + 20, Math.floor(Math.random() * 20) + 5, Math.floor(Math.random() * 10) + 1]
                }))
            };
        }
        if (action === 'live_visitors') {
            return Array.from({ length: 8 }).map((_, i) => ({
                id: `live_${i}`,
                ip: `192.168.1.${100 + i}`,
                country: 'VN',
                city: 'Hà Nội',
                current_page: '/',
                duration: Math.floor(Math.random() * 300),
                device: i % 2 === 0 ? 'desktop' : 'mobile'
            }));
        }
        // action === 'stats' or Default: overview stats
        return {
            pageviews: 45200, sessions: 12800, unique_users: 8540,
            bounce_rate: 38.2, avg_session_duration: 185,
            timeline: Array.from({ length: 30 }).map((_, i) => ({
                date: format(subDays(new Date(), 29 - i), 'dd/MM'),
                sessions: Math.floor(Math.random() * 600) + 200,
                pageviews: Math.floor(Math.random() * 1800) + 600,
            })),
            top_pages: [
                { path: '/san-pham', title: 'Trang Sản Phẩm', pageviews: 8200, avg_time: 145, bounce: 32 },
                { path: '/', title: 'Trang Chủ', pageviews: 6500, avg_time: 95, bounce: 55 },
                { path: '/gia-ca', title: 'Bảng Giá', pageviews: 4800, avg_time: 210, bounce: 28 },
                { path: '/lien-he', title: 'Liên Hệ', pageviews: 3200, avg_time: 65, bounce: 42 },
                { path: '/blog', title: 'Blog & Tin Tức', pageviews: 2800, avg_time: 320, bounce: 22 },
            ],
            traffic_sources: [
                { name: 'Organic Search', value: 45 }, { name: 'Direct', value: 28 },
                { name: 'Social Media', value: 18 }, { name: 'Referral', value: 9 },
            ],
            conversions: { form_fills: 380, email_captures: 2540, purchases: 145 },
        };
    }

    // ─── 9. AI Training & Org Chat ───────────────────────────────────────────
    if (resource === 'ai_training') {
        if (action === 'stats') {
            return {
                total_sessions: 3840,
                avg_accuracy: 92.8,
                total_ai: 1250,
                total_datasets: 6,
                datasets_trained: 4,
            };
        }
        if (action === 'list_global_knowledge') {
            return [
                { id: 'gk_1', filename: 'Chính sách bảo mật 2026.pdf', size: 1024000, created_at: new Date().toISOString() }
            ];
        }
        // list or default
        return [
            { id: 'ds_1', name: 'FAQ Sản Phẩm & Dịch Vụ', status: 'trained', samples: 450, accuracy: 94.2, createdAt: subDays(new Date(), 30).toISOString() },
            { id: 'ds_2', name: 'Chính sách Đổi Trả', status: 'trained', samples: 120, accuracy: 97.8, createdAt: subDays(new Date(), 25).toISOString() },
            { id: 'ds_3', name: 'Hỏi Đáp Giá Cả & Khuyến Mãi', status: 'trained', samples: 280, accuracy: 91.5, createdAt: subDays(new Date(), 20).toISOString() },
            { id: 'ds_4', name: 'Script Tư Vấn B2B', status: 'trained', samples: 85, accuracy: 88.3, createdAt: subDays(new Date(), 15).toISOString() },
            { id: 'ds_5', name: 'Catalogue Sản Phẩm 2026', status: 'training', samples: 640, accuracy: 0, createdAt: subDays(new Date(), 3).toISOString() },
            { id: 'ds_6', name: 'Review & Feedback Khách hàng', status: 'draft', samples: 0, accuracy: 0, createdAt: subDays(new Date(), 1).toISOString() },
        ];
    }
    if (resource === 'ai_org_chatbot') {
        if (action === 'get_workspace_docs') return [];
        if (action === 'check_pdf_status') return { status: 'completed' };
        if (action === 'summarize_conversation') return { summary: 'Khách hàng quan tâm đến tính năng tự động hóa và bảng giá.' };
        if (action === 'search_messages') return [];
        if (action === 'get_conversation_history') {
            return {
                messages: [
                    { id: 'm1', role: 'user', content: 'Chào bạn, tôi muốn xem catalogue sản phẩm mới nhất.', timestamp: subMinutes(new Date(), 5).toISOString() },
                    { id: 'm2', role: 'assistant', content: 'Chào bạn! Đây là Catalogue sản phẩm năm 2026. Bạn có thể xem trực tiếp tài liệu đính kèm bên dưới nhé.', timestamp: subMinutes(new Date(), 4).toISOString(), attachments: [{ id: 'att_1', name: 'Catalogue_2026.pdf', type: 'application/pdf', size: 2048576, previewUrl: '' }], quickActions: ['Báo giá sỉ', 'Đăng ký tư vấn', 'Gặp tư vấn viên'] }
                ]
            };
        }
    }
    if (resource === 'ai_chatbots') {
        if (action === 'list_categories') return JSON.parse(localStorage.getItem('mailflow_ai_categories') || '[]');
        const stored = JSON.parse(localStorage.getItem('mailflow_ai_chatbots') || '[]');
        if (action === 'list') return stored;
        if (action === 'get') return stored.find((b: any) => b.id === id) || stored[0];
    }
    if (resource === 'ai_conversations') {
        const stored = JSON.parse(localStorage.getItem('mailflow_ai_conversations') || '[]');
        if (action === 'list') return stored;
        if (action === 'get') return stored.find((c: any) => c.id === id) || stored[0];
        if (action === 'messages') {
            const messages = JSON.parse(localStorage.getItem('mailflow_ai_messages') || '[]');
            return messages.filter((m: any) => String(m.conversation_id) === String(id)).sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        }
    }
    if (resource === 'get_global_assets' || resource === 'get_global_assets.php') {
        if (action === 'list') {
            return [
                { id: 'a1', url: 'https://placehold.co/400x300', name: 'Banner.jpg', type: 'image' }
            ];
        }
    }

    // ─── 10. AI Chat Overview ────────────────────────────────────────────────
    if (resource === 'ai_chat') {
        return {
            total_conversations: 1250,
            response_rate: 94.2,
            avg_response_time_sec: 4.5,
            satisfaction_score: 4.7,
            unanswered: 73,
            timeline: Array.from({ length: 14 }).map((_, i) => ({
                date: format(subDays(new Date(), 13 - i), 'dd/MM'),
                conversations: Math.floor(Math.random() * 120) + 40,
                resolved: Math.floor(Math.random() * 100) + 30,
            })),
        };
    }

    // ─── 11. Admin Users list ────────────────────────────────────────────────
    if (resource === 'admin_users') {
        const stored = localStorage.getItem('mailflow_admin_users');
        if (stored) return JSON.parse(stored);
        return [];
    }

    // ─── 12. Campaign Report Detail ──────────────────────────────────────────
    if (resource === 'campaigns' && (action === 'report' || action === 'get_report')) {
        const storedCampaigns: any[] = JSON.parse(localStorage.getItem('mailflow_campaigns') || '[]');
        const campaign = storedCampaigns.find((c: any) => c.id === id) || storedCampaigns[0] || {};
        const sent = campaign?.stats?.sent || 0;
        const opened = campaign?.stats?.opened || 0;
        const clicked = campaign?.stats?.clicked || 0;
        const bounced = campaign?.stats?.bounced || 0;
        const unsubscribed = campaign?.stats?.unsubscribed || 0;
        return {
            id: campaign?.id || id,
            name: campaign?.name || 'Chiến dịch Demo',
            subject: campaign?.subject || 'Email Chương Trình Ưu Đãi Đặc Biệt',
            status: campaign?.status || 'sent',
            sent_at: campaign?.sentAt || subDays(new Date(), 3).toISOString(),
            stats: {
                total_sent: sent, total_opened: opened, total_clicked: clicked,
                total_bounced: bounced, total_unsubscribed: unsubscribed,
                open_rate: sent > 0 ? parseFloat(((opened / sent) * 100).toFixed(1)) : 0,
                click_rate: sent > 0 ? parseFloat(((clicked / sent) * 100).toFixed(1)) : 0,
                bounce_rate: sent > 0 ? parseFloat(((bounced / sent) * 100).toFixed(2)) : 0,
                unsubscribe_rate: sent > 0 ? parseFloat(((unsubscribed / sent) * 100).toFixed(2)) : 0,
                click_to_open_rate: opened > 0 ? parseFloat(((clicked / opened) * 100).toFixed(1)) : 0,
            },
            timeline: Array.from({ length: 24 }).map((_, i) => ({
                hour: `${String(i).padStart(2, '0')}:00`,
                opens: i >= 7 && i <= 22 ? Math.floor(Math.random() * 80) + 10 : Math.floor(Math.random() * 10),
                clicks: i >= 7 && i <= 22 ? Math.floor(Math.random() * 25) + 2 : Math.floor(Math.random() * 3),
            })),
            devices: [
                { name: 'iPhone / iOS', count: Math.floor(opened * 0.48), pct: 48 },
                { name: 'Windows PC', count: Math.floor(opened * 0.32), pct: 32 },
                { name: 'Android', count: Math.floor(opened * 0.15), pct: 15 },
                { name: 'Mac', count: Math.floor(opened * 0.05), pct: 5 },
            ],
            top_links: [
                { url: 'https://domation.vn/uu-dai', label: 'Xem ưu đãi ngay', clicks: Math.floor(clicked * 0.42) },
                { url: 'https://domation.vn/san-pham', label: 'Khám phá sản phẩm', clicks: Math.floor(clicked * 0.28) },
                { url: 'https://domation.vn/lien-he', label: 'Đăng ký tư vấn', clicks: Math.floor(clicked * 0.18) },
                { url: 'https://domation.vn/blog', label: 'Đọc bài viết', clicks: Math.floor(clicked * 0.12) },
            ],
            locations: [
                { city: 'Hồ Chí Minh', pct: 52 }, { city: 'Hà Nội', pct: 28 },
                { city: 'Đà Nẵng', pct: 8 }, { city: 'Cần Thơ', pct: 5 }, { city: 'Khác', pct: 7 },
            ],
        };
    }

    // ─── 13. Flow Step Mail Report ───────────────────────────────────────────
    if (resource === 'flows' && (action === 'step_report' || action === 'email_step_log')) {
        const stepId = url.searchParams.get('step_id') || 'step_1';
        const logs = Array.from({ length: 30 }).map((_, i) => ({
            id: `log_step_${i}`,
            email: ['nguyen.van.a@gmail.com', 'ceo@corp.vn', 'khach.hang@company.com', 'marketing@agency.vn'][i % 4],
            type: ['sent', 'delivered', 'opened', 'clicked', 'sent'][i % 5],
            step_id: stepId,
            sent_at: subMinutes(new Date(), Math.floor(Math.random() * 1440)).toISOString(),
        }));
        return {
            step_id: stepId,
            stats: { sent: 2540, delivered: 2488, opened: 1143, clicked: 356, bounced: 31 },
            logs,
        };
    }


    // ─── 14. Extra Triggers, Forms, and Vouchers Data ────────────────────────
    if (resource === 'forms') {
        return JSON.parse(localStorage.getItem('mailflow_forms') || '[]');
    }

    if (resource === 'custom_events' || resource === 'purchase_events') {
        return JSON.parse(localStorage.getItem('mailflow_custom_events') || '[]');
    }

    if (resource === 'voucher_campaigns' || resource === 'vouchers') {
        return JSON.parse(localStorage.getItem('mailflow_voucher_campaigns') || '[]');
    }

    if (resource === 'voucher_codes') {
        const campId = url.searchParams.get('campaign_id');
        if (!campId) return [];
        return Array.from({ length: 15 }).map((_, i) => ({
            id: `vc_${campId}_${i}`,
            campaign_id: campId,
            code: `VIP2026-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
            isClaimed: i < 5,
            claimedAt: i < 5 ? subDays(new Date(), i).toISOString() : null,
            claimedByInfo: i < 5 ? { name: `Customer ${i}`, email: `user${i}@example.com` } : null,
            claimedSource: i < 5 ? 'Flow: Welcome Series' : null,
            createdAt: subDays(new Date(), 10).toISOString()
        }));
    }

    // ─── 15. Surveys ─────────────────────────────────────────────────────────
    if (resource === 'surveys') {
        if (action === 'analytics') {
            return {
                overview: { views: 1250, starts: 850, completions: 521, completionRate: 61.3, avgTimeSeconds: 145 },
                responsesByDate: Array.from({ length: 14 }).map((_, i) => ({
                    date: format(subDays(new Date(), 13 - i), 'dd/MM'),
                    count: Math.floor(Math.random() * 50) + 10
                })),
                questionStats: [
                    { id: 'q1', type: 'rating', average: 4.5, distribution: { '1': 2, '2': 5, '3': 15, '4': 45, '5': 120 } },
                    { id: 'q2', type: 'multiple_choice', breakdown: { 'Email Builder': 150, 'Automation Flow': 250, 'AI Chatbot': 80, 'Báo cáo': 41 } }
                ]
            };
        }
        if (action === 'respondents') {
            return Array.from({ length: 20 }).map((_, i) => ({
                id: `resp_${i}`,
                email: `user_${i}@example.com`,
                submittedAt: subMinutes(new Date(), Math.floor(Math.random() * 10000)).toISOString(),
                duration: Math.floor(Math.random() * 300) + 30,
                isAnonymous: Math.random() > 0.8
            }));
        }

        const stored = JSON.parse(localStorage.getItem('mailflow_surveys') || 'null');
        if (stored && !id) return stored;
        
        if (id) {
            const list = stored || [];
            return list.find((s: any) => s.id === id) || list[0];
        }

        const surveys = [
            {
                id: 'sv_1', name: 'Khảo sát Mức độ Hài lòng Sản phẩm Q2/2026',
                slug: 'khao-sat-hai-long-q2', status: 'active',
                createdAt: subDays(new Date(), 15).toISOString(),
                questions: [
                    { id: 'q1', type: 'rating', label: 'Bạn đánh giá sản phẩm của chúng tôi thế nào?', required: true },
                    { id: 'q2', type: 'multiple_choice', label: 'Tính năng bạn thích nhất?', options: ['Email Builder', 'Automation Flow', 'AI Chatbot', 'Báo cáo'], required: false },
                    { id: 'q3', type: 'text', label: 'Góp ý thêm của bạn?', required: false }
                ],
                stats: { responses: 284, completion_rate: 78, avg_score: 4.2 }
            },
            {
                id: 'sv_2', name: 'Khảo sát Nhu cầu Webinar AI Marketing',
                slug: 'nhu-cau-webinar-ai', status: 'active',
                createdAt: subDays(new Date(), 5).toISOString(),
                questions: [
                    { id: 'q1', type: 'multiple_choice', label: 'Chủ đề bạn muốn học?', options: ['AI Email Marketing', 'Automation Workflow', 'Lead Generation', 'Data Analytics'], required: true },
                    { id: 'q2', type: 'rating', label: 'Thời gian rảnh để tham dự?', required: false }
                ],
                stats: { responses: 521, completion_rate: 92, avg_score: 4.5 }
            },
            {
                id: 'sv_3', name: 'Khảo sát Sau Khóa học Team Building',
                slug: 'sau-khoa-hoc-team-building', status: 'closed',
                createdAt: subDays(new Date(), 30).toISOString(),
                questions: [
                    { id: 'q1', type: 'rating', label: 'Bạn đánh giá khóa học thế nào?', required: true }
                ],
                stats: { responses: 145, completion_rate: 95, avg_score: 4.7 }
            }
        ];
        localStorage.setItem('mailflow_surveys', JSON.stringify(surveys));
        return surveys;
    }

    // ─── 16. Links & QR Tracking (list) ─────────────────────────────────────
    if (resource === 'links_qr') {
        if (action === 'list') {
            const stored = JSON.parse(localStorage.getItem('mailflow_links_qr') || 'null');
            if (stored) return stored;
            const links = [
                {
                    id: 'lk_1', name: 'QR Landing Page Webinar AI', type: 'qr',
                    originalUrl: 'https://domation.vn/webinar-ai-marketing',
                    shortCode: 'webinar-ai', shortUrl: 'https://go.domation.vn/webinar-ai',
                    createdAt: subDays(new Date(), 10).toISOString(),
                    qrConfig: { foreground: '#1a1a2e', background: '#ffffff', logo: '' },
                    stats: { total_visits: 1250, unique_visitors: 850, last_scan: subHours(new Date(), 2).toISOString() }
                },
                {
                    id: 'lk_2', name: 'Link Theo dõi Email Campaign Tháng 4', type: 'link',
                    originalUrl: 'https://domation.vn/uu-dai-thang-4',
                    shortCode: 'uu-dai-t4', shortUrl: 'https://go.domation.vn/uu-dai-t4',
                    createdAt: subDays(new Date(), 5).toISOString(),
                    stats: { total_visits: 430, unique_visitors: 380, last_scan: subHours(new Date(), 1).toISOString() }
                },
                {
                    id: 'lk_3', name: 'QR Brochure Offline - Trifold', type: 'qr',
                    originalUrl: 'https://domation.vn/catalogue-2026',
                    shortCode: 'catalogue', shortUrl: 'https://go.domation.vn/catalogue',
                    createdAt: subDays(new Date(), 20).toISOString(),
                    qrConfig: { foreground: '#ffa900', background: '#ffffff', logo: '' },
                    stats: { total_visits: 320, unique_visitors: 290, last_scan: subDays(new Date(), 1).toISOString() }
                },
                {
                    id: 'lk_4', name: 'Link Khảo sát Hài lòng Sau mua', type: 'link',
                    originalUrl: 'https://domation.vn/khao-sat',
                    shortCode: 'ks-sau-mua', shortUrl: 'https://go.domation.vn/ks-sau-mua',
                    createdAt: subDays(new Date(), 8).toISOString(),
                    stats: { total_visits: 185, unique_visitors: 140, last_scan: subHours(new Date(), 6).toISOString() }
                }
            ];
            localStorage.setItem('mailflow_links_qr', JSON.stringify(links));
            return links;
        }
        if (action === 'stats') {
            return {
                total_visits: 1250, unique_visitors: 850,
                timeline: Array.from({ length: 7 }).map((_, i) => ({
                    date: format(subDays(new Date(), 6 - i), 'dd/MM'),
                    visits: Math.floor(Math.random() * 200) + 50,
                })),
                devices: [{ name: 'iPhone', count: 650 }, { name: 'Samsung', count: 400 }, { name: 'Other', count: 200 }],
                os: [{ name: 'iOS', count: 650 }, { name: 'Android', count: 400 }, { name: 'Windows', count: 200 }],
                country: [{ name: 'Vietnam', count: 1200 }, { name: 'US', count: 50 }],
                recent_clicks: Array.from({ length: 12 }).map((_, i) => ({
                    id: i, ip: `113.190.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
                    os: Math.random() > 0.5 ? 'iOS' : 'Android', browser: 'Safari',
                    scanned_at: subMinutes(new Date(), Math.floor(Math.random() * 180)).toISOString(),
                })),
            };
        }
    }

    // ─── 17. Templates & Template Groups ─────────────────────────────────────
    if (resource === 'template_groups') {
        const stored = JSON.parse(localStorage.getItem('mailflow_template_groups') || 'null');
        if (stored) return stored;
        const groups = [
            { id: 'tg_1', name: 'Chào mừng & Onboarding', count: 3 },
            { id: 'tg_2', name: 'Khuyến mãi & Sales', count: 2 },
            { id: 'tg_3', name: 'Tin tức & Cập nhật', count: 3 },
        ];
        localStorage.setItem('mailflow_template_groups', JSON.stringify(groups));
        return groups;
    }

    if (resource === 'templates') {
        const stored = JSON.parse(localStorage.getItem('mailflow_templates') || 'null');
        if (stored && stored.length > 0 && !id) return stored;
        
        const templates = demoTemplates.map((t: any, idx: number) => ({
            ...t,
            groupId: ['tg_1', 'tg_2', 'tg_3'][idx % 3],
            previewText: t.subject ? t.subject.substring(0, 30) + '...' : 'Email đặc biệt dành cho bạn',
            tags: ['email', 'marketing']
        }));
        localStorage.setItem('mailflow_templates', JSON.stringify(templates));
        
        if (id) {
            const list = stored && stored.length > 0 ? stored : templates;
            return list.find((t: any) => t.id === id) || list[0];
        }
        return templates;
    }

    // ─── 18. Settings ─────────────────────────────────────────────────────────
    if (resource === 'settings') {
        return {
            smtp_host: 'smtp.sendgrid.net', smtp_port: 587,
            smtp_user: 'apikey', smtp_pass: '••••••••••••',
            from_email: 'marketing@domation.vn', from_name: 'DOMATION Marketing',
            daily_limit: 50000, hourly_limit: 5000, batch_size: 200,
            tracking_enabled: true, unsubscribe_enabled: true,
            workspace_name: 'DOMATION Vietnam', timezone: 'Asia/Ho_Chi_Minh'
        };
    }

    // ─── 19. Logs (Settings page) ────────────────────────────────────────────
    if (resource === 'logs') {
        const logType = url.searchParams.get('type') || 'delivery';
        if (logType === 'delivery') {
            return Array.from({ length: 20 }).map((_, i) => ({
                id: `log_${i}`, email: `user${i}@example.vn`,
                status: ['delivered', 'delivered', 'delivered', 'bounced', 'failed'][i % 5],
                campaign: 'Bản tin Tháng 4', sent_at: subMinutes(new Date(), i * 8).toISOString(),
                error: i % 5 === 4 ? 'SMTP Connection Timeout' : null
            }));
        }
        return Array.from({ length: 10 }).map((_, i) => ({
            id: i, type: logType, message: `[Worker] Job processed successfully (batch ${i + 1})`,
            created_at: subMinutes(new Date(), i * 15).toISOString(), level: i % 7 === 0 ? 'error' : 'info'
        }));
    }

    // ─── 20. Health Check ────────────────────────────────────────────────────
    if (resource === 'health_check') {
        return {
            status: 'healthy', db: 'connected', smtp: 'connected',
            queue_pending: 3, queue_failed: 0, workers_active: 2,
            memory_mb: 128, uptime_hours: 72, version: '4.2.1'
        };
    }

    // ─── 21. API Triggers ────────────────────────────────────────────────────
    if (resource === 'api_triggers' || resource === 'integrations') {
        return [
            { id: 'int_1', name: 'MISA CRM Sync', type: 'webhook', status: 'active', url: 'https://api.misa.com/v2/webhook', lastTriggered: subHours(new Date(), 2).toISOString(), totalTriggers: 1250 },
            { id: 'int_2', name: 'Shopee Order Import', type: 'api', status: 'active', url: 'https://open.shopee.com/api/v2', lastTriggered: subHours(new Date(), 1).toISOString(), totalTriggers: 4820 },
            { id: 'int_3', name: 'Zalo OA Webhook', type: 'webhook', status: 'active', url: 'https://openapi.zalo.me/v3', lastTriggered: subMinutes(new Date(), 30).toISOString(), totalTriggers: 8900 },
            { id: 'int_4', name: 'Google Sheets Export', type: 'oauth', status: 'inactive', url: 'https://sheets.googleapis.com/v4', lastTriggered: subDays(new Date(), 3).toISOString(), totalTriggers: 45 }
        ];
    }

    return null;
};

