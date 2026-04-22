import json
from datetime import datetime, timedelta
import random
import uuid

def generate_ts():
    def t(days_ago=0, hours_ago=0):
        d = datetime.now() - timedelta(days=days_ago, hours=hours_ago)
        return d.isoformat() + "Z"

    # --- 1. Lists ---
    lists = [
        {"id": "list_vip", "name": "Khách Hàng VIP (Đã mua > 5M)", "status": 1, "count": 125, "createdAt": t(120)},
        {"id": "list_fb", "name": "Lead từ Facebook Ads Tháng 4", "status": 1, "count": 2540, "createdAt": t(15)},
        {"id": "list_webinar", "name": "Đăng ký Webinar AI Marketing", "status": 1, "count": 850, "createdAt": t(5)},
        {"id": "list_misa", "name": "Đồng bộ từ MISA CRM", "status": 1, "count": 5200, "createdAt": t(200), "source": "MISA CRM"},
        {"id": "list_cold", "name": "Khách hàng Ngủ Đông", "status": 1, "count": 1400, "createdAt": t(300)}
    ]

    # --- 2. Tags ---
    tags = [
        {"id": "tag_hot", "name": "Hot Lead", "color": "red", "count": 450},
        {"id": "tag_ceo", "name": "Chủ Doanh Nghiệp", "color": "purple", "count": 120},
        {"id": "tag_mba", "name": "Quan tâm MBA", "color": "blue", "count": 890},
        {"id": "tag_b2b", "name": "B2B", "color": "orange", "count": 300},
        {"id": "tag_churn", "name": "Rủi ro Churn", "color": "slate", "count": 50}
    ]

    # --- 3. Subscribers ---
    subscribers = []
    first_names = ["An", "Bình", "Cường", "Dung", "Hải", "Hương", "Linh", "Minh", "Nga", "Phong", "Quân", "Thảo", "Trang", "Tuấn", "Vy"]
    last_names = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương"]
    for i in range(150):
        status = random.choice(["subscribed", "subscribed", "subscribed", "unsubscribed", "bounced"])
        subscribers.append({
            "id": f"sub_{i}",
            "email": f"demo.khachhang.{i}@company.com",
            "firstName": random.choice(first_names),
            "lastName": random.choice(last_names),
            "phoneNumber": f"09{random.randint(10000000, 99999999)}",
            "status": status,
            "createdAt": t(random.randint(1, 100)),
            "score": random.randint(0, 100),
            "tags": random.sample([t["name"] for t in tags], random.randint(0, 3)),
            "lists": random.sample([l["id"] for l in lists], random.randint(1, 3))
        })

    # --- 4. Segments ---
    segments = [
        {"id": "seg_1", "name": "Tất cả Lead Nóng", "count": 450, "filters": [{"field": "tag", "operator": "contains", "value": "Hot Lead"}]},
        {"id": "seg_2", "name": "Mở mail trong 30 ngày qua", "count": 1200, "filters": [{"field": "last_open", "operator": "recent", "value": 30}]},
        {"id": "seg_3", "name": "CEO & Founders", "count": 120, "filters": [{"field": "tag", "operator": "contains", "value": "Chủ Doanh Nghiệp"}]}
    ]

    # --- 5. Forms ---
    forms = [
        {"id": "form_lead", "name": "Popup Nhận Ebook AI Marketing", "targetListId": "list_fb", "stats": {"views": 15000, "submissions": 2540, "conversion": 16.9}, "status": "published", "fields": [{"id": "f1", "dbField": "email", "label": "Email công việc", "required": True}, {"id": "f2", "dbField": "firstName", "label": "Tên", "required": True}]},
        {"id": "form_contact", "name": "Form Đăng ký Tư vấn", "targetListId": "list_vip", "stats": {"views": 5000, "submissions": 850, "conversion": 17.0}, "status": "published", "fields": [{"id": "f1", "dbField": "email", "label": "Email", "required": True}, {"id": "f2", "dbField": "phoneNumber", "label": "Số Zalo", "required": True}]},
        {"id": "form_event", "name": "Sự kiện Offline Hà Nội", "targetListId": "list_webinar", "stats": {"views": 1200, "submissions": 500, "conversion": 41.6}, "status": "published", "fields": [{"id": "f1", "dbField": "email", "label": "Email", "required": True}]}
    ]

    # --- 6. Surveys ---
    surveys = [
        {"id": "survey_nps", "name": "Đánh giá mức độ hài lòng (NPS Q2)", "status": "published", "createdAt": t(10), "stats": {"views": 1200, "starts": 950, "completes": 800, "completion_rate": 84.2, "avg_time_sec": 45}},
        {"id": "survey_quiz", "name": "Trắc nghiệm: Doanh nghiệp của bạn cần giải pháp gì?", "status": "published", "createdAt": t(5), "stats": {"views": 4500, "starts": 3200, "completes": 1500, "completion_rate": 46.8, "avg_time_sec": 180}},
        {"id": "survey_feedback", "name": "Góp ý chất lượng dịch vụ CSKH", "status": "draft", "createdAt": t(1), "stats": {"views": 0, "starts": 0, "completes": 0, "completion_rate": 0, "avg_time_sec": 0}}
    ]

    # --- 7. Campaigns ---
    campaigns = [
        {"id": "camp_1", "name": "Bản tin AI Marketing Tháng 4", "subject": "🚀 Khám phá 5 cách AI tăng gấp đôi doanh thu của bạn", "status": "sent", "totalRecipients": 5200, "metrics": {"delivered": 5100, "opened": 2300, "clicked": 850, "bounced": 90, "unsubscribed": 10}, "createdAt": t(2)},
        {"id": "camp_2", "name": "Mời tham dự Webinar Thực chiến", "subject": "Thư mời độc quyền: Xây dựng hệ thống tự động hoá 2026", "status": "sent", "totalRecipients": 2540, "metrics": {"delivered": 2500, "opened": 1200, "clicked": 400, "bounced": 30, "unsubscribed": 5}, "createdAt": t(10)},
        {"id": "camp_3", "name": "Chương trình Tri ân Khách VIP", "subject": "Quà tặng đặc biệt dành riêng cho bạn 🎁", "status": "draft", "totalRecipients": 125, "metrics": {"delivered": 0, "opened": 0, "clicked": 0, "bounced": 0, "unsubscribed": 0}, "createdAt": t(0, 5)},
        {"id": "camp_4", "name": "Chiến dịch Flash Sale 24h", "subject": "Chỉ còn 3 tiếng nữa: Giảm 50% toàn bộ dịch vụ!", "status": "scheduled", "totalRecipients": 8000, "metrics": {"delivered": 0, "opened": 0, "clicked": 0, "bounced": 0, "unsubscribed": 0}, "createdAt": t(1)},
        {"id": "camp_5", "name": "Thông báo bảo trì hệ thống", "subject": "Bảo trì nâng cấp Server Định kỳ", "status": "sent", "totalRecipients": 12000, "metrics": {"delivered": 11800, "opened": 6000, "clicked": 100, "bounced": 100, "unsubscribed": 2}, "createdAt": t(20)}
    ]

    # --- 8. Vouchers ---
    vouchers = [
        {"id": "vc_1", "name": "Voucher Tặng Ebook", "codeType": "static", "staticCode": "FREE-EBOOK-2026", "status": "active", "createdAt": t(15)},
        {"id": "vc_2", "name": "Mã Giảm 50% Khoá Học", "codeType": "dynamic", "status": "active", "createdAt": t(5)}
    ]

    # --- 9. Flows (Hành trình) ---
    flows = [
        {
            "id": "flow_onboarding", 
            "name": "Hành trình Chăm sóc Lead Webinar", 
            "status": "active", 
            "triggerType": "form", 
            "enrolledCount": 850, 
            "completedCount": 420, 
            "createdAt": t(20),
            "steps": [
                {"id": "step_trigger", "type": "trigger", "config": {"type": "form", "targetId": "form_lead"}, "position": {"x": 400, "y": 50}, "nextStepId": "step_tag"},
                {"id": "step_tag", "type": "action", "config": {"type": "tag", "action": "add", "tags": ["Quan tâm Webinar"]}, "position": {"x": 400, "y": 200}, "nextStepId": "step_email1"},
                {"id": "step_email1", "type": "action", "config": {"type": "email", "subject": "Xác nhận đăng ký thành công", "templateId": "tpl_1"}, "position": {"x": 400, "y": 350}, "nextStepId": "step_wait1"},
                {"id": "step_wait1", "type": "wait", "config": {"duration": 1, "unit": "days"}, "position": {"x": 400, "y": 500}, "nextStepId": "step_cond1"},
                {"id": "step_cond1", "type": "condition", "config": {"conditionType": "opened", "targetStepId": "step_email1"}, "position": {"x": 400, "y": 650}, "yesStepId": "step_email2", "noStepId": "step_zalo"},
                {"id": "step_email2", "type": "action", "config": {"type": "email", "subject": "Tài liệu chuẩn bị cho sự kiện"}, "position": {"x": 200, "y": 800}},
                {"id": "step_zalo", "type": "zalo_zns", "config": {"templateId": "zns_1", "message": "Gửi ZNS nhắc nhở"}, "position": {"x": 600, "y": 800}}
            ]
        },
        {
            "id": "flow_birthday", 
            "name": "Chúc mừng Sinh nhật Tự động", 
            "status": "active", 
            "triggerType": "date", 
            "enrolledCount": 12500, 
            "completedCount": 3500, 
            "createdAt": t(100),
            "steps": [
                {"id": "step_trigger2", "type": "trigger", "config": {"type": "date", "dateField": "dateOfBirth"}, "position": {"x": 400, "y": 50}, "nextStepId": "step_email_bd"},
                {"id": "step_email_bd", "type": "action", "config": {"type": "email", "subject": "🎁 Chúc mừng sinh nhật bạn!"}, "position": {"x": 400, "y": 200}}
            ]
        },
        {
            "id": "flow_cart", 
            "name": "Nhắc nhở Giỏ hàng bỏ quên", 
            "status": "paused", 
            "triggerType": "custom_event", 
            "enrolledCount": 420, 
            "completedCount": 120, 
            "createdAt": t(5),
            "steps": []
        }
    ]

    # --- 10. Templates ---
    templates = [
        {"id": "tpl_1", "name": "Bản tin Chào mừng", "category": "marketing", "thumbnail": "", "createdAt": t(50)},
        {"id": "tpl_2", "name": "Cảm ơn mua hàng", "category": "transactional", "thumbnail": "", "createdAt": t(30)},
        {"id": "tpl_3", "name": "Voucher Sinh Nhật", "category": "promotion", "thumbnail": "", "createdAt": t(10)}
    ]

    # --- 11. Integrations ---
    integrations = [
        {"id": "int_misa", "name": "MISA AMIS CRM", "status": "connected", "type": "crm", "lastSync": t(0, 1)},
        {"id": "int_fb", "name": "Facebook Lead Ads", "status": "connected", "type": "social", "lastSync": t(0, 0)},
        {"id": "int_gs", "name": "Google Sheets", "status": "disconnected", "type": "data", "lastSync": None}
    ]

    # --- 12. Settings / Organization ---
    settings = {
        "org_name": "Công ty TNHH Demo Automation",
        "sender_email": "hello@demo.com",
        "sender_name": "Team Automation",
        "timezone": "Asia/Ho_Chi_Minh"
    }

    # --- 13. Overview Stats (Dashboard) ---
    overviewStats = {
        "total_subscribers": 12450,
        "active_subscribers": 11800,
        "unsubscribed": 450,
        "bounced": 200,
        "emails_sent_month": 45600,
        "avg_open_rate": 38.5,
        "avg_click_rate": 14.2,
        "recent_activity": [
            {"id": 1, "type": "subscribe", "email": "ceo.nguyen@company.vn", "time": t(0, 1), "listName": "Đăng ký Webinar AI Marketing"},
            {"id": 2, "type": "open", "email": "marketing@agency.com", "time": t(0, 2), "campaignName": "Bản tin AI Marketing Tháng 4"},
            {"id": 3, "type": "click", "email": "tran.binh@gmail.com", "time": t(0, 3), "campaignName": "Bản tin AI Marketing Tháng 4"},
            {"id": 4, "type": "survey_complete", "email": "info@startup.vn", "time": t(0, 5), "surveyName": "Trắc nghiệm: Doanh nghiệp của bạn cần giải pháp gì?"},
            {"id": 5, "type": "flow_enter", "email": "ceo.nguyen@company.vn", "time": t(0, 1), "flowName": "Hành trình Chăm sóc Lead Webinar"},
            {"id": 6, "type": "form_submit", "email": "ngoc.tran@demo.vn", "time": t(0, 6), "formName": "Sự kiện Offline Hà Nội"}
        ]
    }

    ts_content = f"""// AUTO-GENERATED MASSIVE DEMO SEED DATA
export const seedDemoData = () => {{
    const set = (key: string, data: any) => localStorage.setItem(key, JSON.stringify(data));

    set('mailflow_lists', {json.dumps(lists, ensure_ascii=False)});
    set('mailflow_tags', {json.dumps(tags, ensure_ascii=False)});
    set('mailflow_segments', {json.dumps(segments, ensure_ascii=False)});
    set('mailflow_subscribers', {json.dumps(subscribers, ensure_ascii=False)});
    set('mailflow_forms', {json.dumps(forms, ensure_ascii=False)});
    set('mailflow_surveys', {json.dumps(surveys, ensure_ascii=False)});
    set('mailflow_campaigns', {json.dumps(campaigns, ensure_ascii=False)});
    set('mailflow_voucher_campaigns', {json.dumps(vouchers, ensure_ascii=False)});
    set('mailflow_flows', {json.dumps(flows, ensure_ascii=False)});
    set('mailflow_templates', {json.dumps(templates, ensure_ascii=False)});
    set('mailflow_integrations', {json.dumps(integrations, ensure_ascii=False)});
    set('mailflow_settings', {json.dumps(settings, ensure_ascii=False)});
    set('mailflow_overview_stats', {json.dumps(overviewStats, ensure_ascii=False)});

    console.log('🌟 Seeded MASSIVE Demo Data to LocalStorage (Forms, Surveys, Flows, Templates, Integrations...)');
}};
"""
    with open('utils/demoSeed.ts', 'w', encoding='utf-8') as f:
        f.write(ts_content)

if __name__ == "__main__":
    generate_ts()
    print("demoSeed.ts updated successfully with massive data.")
