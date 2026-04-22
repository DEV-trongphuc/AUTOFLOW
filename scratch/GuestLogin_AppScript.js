// ==========================================
// GOOGLE APPS SCRIPT: GUEST LOGIN WEBHOOK
// ==========================================
// HƯỚNG DẪN:
// 1. Vào https://script.google.com tạo Project mới.
// 2. Dán toàn bộ code này vào file Code.gs
// 3. Chọn Deploy -> New Deployment -> Chọn loại Web App
// 4. Execute as: "Me"
// 5. Who has access: "Anyone"
// 6. Copy link dán vào biến APPSCRIPT_URL trong file Login.tsx
// ==========================================

const ADMIN_EMAIL = 'dom.marketing.vn@gmail.com';

function doPost(e) {
  try {
    // Với fetch 'no-cors', dữ liệu thường truyền dưới dạng text/plain trong e.postData.contents
    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch(err) {
      // Fallback cho form data thông thường nếu có
      data = e.parameter;
    }
    
    var name = data.name || "Khách ẩn danh";
    var email = data.email || "Không có email";
    var phone = data.phone || "Không có số ĐT";
    var website = data.website || "Không có Website";
    var timestamp = new Date().toLocaleString("vi-VN", {timeZone: "Asia/Ho_Chi_Minh"});

    // ----------------------------------------------------
    // 1. GỬI EMAIL THÔNG BÁO CHO ADMIN
    // ----------------------------------------------------
    var adminSubject = "🔥 CÓ LEAD MỚI XEM DEMO: " + name;
    var adminBody = "Xin chào Admin,\n\n" +
                    "Vừa có một khách hàng đăng nhập để xem bản Demo hệ thống Automation.\n\n" +
                    "- Họ tên: " + name + "\n" +
                    "- Email: " + email + "\n" +
                    "- SĐT: " + phone + "\n" +
                    "- Website: " + website + "\n" +
                    "- Thời gian truy cập: " + timestamp + "\n\n" +
                    "Vui lòng theo dõi hoặc liên hệ chăm sóc nếu cần!\n" +
                    "Hệ thống tự động Domation.";
                    
    MailApp.sendEmail(ADMIN_EMAIL, adminSubject, adminBody);


    // ----------------------------------------------------
    // 2. GỬI EMAIL CẢM ƠN & CHÀO MỪNG CHO KHÁCH HÀNG (HTML ĐẸP)
    // ----------------------------------------------------
    if (email && email.indexOf("@") !== -1) {
      var guestSubject = "🎉 Chào mừng bạn đến với Hệ sinh thái Domation Automation!";
      
      var guestHtmlBody = `
        <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #f1f5f9; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 40px 20px; text-align: center;">
            <img src="https://automation.ideas.edu.vn/imgs/ICON.png" alt="DOMATION" style="width: 60px; height: 60px; object-fit: contain; margin: 0 auto 12px; display: block;" />
            <h1 style="color: #ffffff; font-size: 28px; margin: 0; font-weight: 900; letter-spacing: 2px; text-align: center;">DOMATION</h1>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 30px;">
            <h2 style="color: #0f172a; font-size: 22px; margin-top: 0;">Xin chào ${name},</h2>
            <p style="color: #475569; font-size: 16px; line-height: 1.6;">
              Cảm ơn bạn đã quan tâm và trải nghiệm bản <strong>Demo Hệ sinh thái Domation</strong>.
            </p>
            <p style="color: #475569; font-size: 16px; line-height: 1.6;">
              Bản Demo bạn đang xem được tích hợp sẵn các dữ liệu mô phỏng chân thực nhất, giúp bạn dễ dàng hình dung sức mạnh của:
            </p>
            
            <ul style="color: #475569; font-size: 15px; line-height: 1.6; padding-left: 20px; margin: 25px 0;">
              <li style="margin-bottom: 10px;">⚡ <strong>Multichannel Automation:</strong> Kịch bản tự động chéo kênh (Email, Zalo, SMS).</li>
              <li style="margin-bottom: 10px;">⚡ <strong>Tracking thời gian thực:</strong> Theo dõi hành vi khách truy cập website.</li>
              <li style="margin-bottom: 10px;">⚡ <strong>AI Vision:</strong> Cá nhân hóa nội dung thông minh.</li>
            </ul>

            <div style="background-color: #f8fafc; border-left: 4px solid #f59e0b; padding: 20px; margin: 30px 0; border-radius: 0 12px 12px 0;">
              <p style="margin: 0; color: #334155; font-size: 14px; line-height: 1.5;">
                <strong>Lưu ý:</strong> Mọi thao tác Thêm/Sửa/Xóa của bạn trên bản Demo đều được lưu cục bộ trên trình duyệt để đảm bảo trải nghiệm riêng tư, và sẽ tự động làm mới khi đóng cửa sổ.
              </p>
            </div>

            <p style="color: #475569; font-size: 16px; line-height: 1.6;">
              Nếu bạn có bất kỳ thắc mắc nào hoặc muốn tư vấn giải pháp thực tế cho <strong>${website !== 'Không có Website' ? website : 'doanh nghiệp của bạn'}</strong>, đừng ngần ngại reply lại email này nhé!
            </p>

            <div style="margin-top: 40px;">
              <p style="color: #0f172a; font-size: 16px; font-weight: bold; margin: 0;">Trân trọng,</p>
              <p style="color: #475569; font-size: 14px; margin-top: 5px;">Đội ngũ phát triển Domation</p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #0f172a; padding: 20px; text-align: center;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">© 2026 Domation Ecosystem. All rights reserved.</p>
          </div>
        </div>
      `;

      MailApp.sendEmail({
        to: email,
        subject: guestSubject,
        htmlBody: guestHtmlBody,
        name: "Domation Automation"
      });
    }

    // ----------------------------------------------------
    // 3. TRẢ VỀ RESPONSE 
    // ----------------------------------------------------
    return ContentService.createTextOutput(JSON.stringify({"status": "success", "message": "Email sent"}))
                         .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": error.toString()}))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}
