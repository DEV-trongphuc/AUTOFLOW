const fs = require("fs");
const path = "e:/AUTOFLOW/AUTOMATION_FLOW/components/flows/modals/StepParticipantsModal.tsx";
let text = fs.readFileSync(path, "utf8");

const maps = [
    [/Danh s\?ch t\?i:/g, "Danh sách tại:"],
    [/T\?ng s\?:\s(\d+)\skh\?ch h\?ng/g, "Tổng số: $1 khách hàng"],
    [/T\?m ki\?m email\.\.\./g, "Tìm kiếm email..."],
    [/ \ di qua/g, " Đã đi qua"],
    [/ di qua/g, " Đã đi qua"],
    [/ ang ch\?/g, " Đang chờ"],
    [/TR\?NG TH\?I/g, "TRẠNG THÁI"],
    [/TH\?I GIAN/g, "THỜI GIAN"],
    [/Kh\?ng t\?m th\?y d\? li\?u n\?o\./g, "Không tìm thấy dữ liệu nào."],
    [/Danh s\?ch ho\?n th\?nh/g, "Danh sách hoàn thành"],
    [/BU\?C CU\?I C\?NG/g, "BƯỚC CUỐI CÙNG"]
];

maps.forEach(([reg, rep]) => {
    text = text.replace(reg, rep);
});

fs.writeFileSync(path, text, "utf8");
console.log("Done!");
