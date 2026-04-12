const fs = require("fs");
const path = "e:/AUTOFLOW/AUTOMATION_FLOW/components/flows/tabs/FlowAnalyticsTab.tsx";
let text = fs.readFileSync(path, "utf8");

const maps = [
    [/T\? l\? ho\?n t\?t/gi, "TỈ LỆ HOÀN TẤT"],
    [/T\? l\? m\? TB/gi, "TỈ LỆ MỞ TB"],
    [/ g\?i/g, "ĐÃ GỬI"],
    [/ m\?/g, "ĐÃ MỞ"],
    [/G\?i l\?i/g, "GỬI LỖI"],
    [/H\?y K/g, "HỦY ĐK"],
    [/KHCH HNG/g, "KHÁCH HÀNG"],
    [/LU\?T M\? DUY NH\?T/g, "LƯỢT MỞ DUY NHẤT"],
    [/LU\?T CLICK/g, "LƯỢT CLICK"],
    [/T\? l\? l\?i/g, "TỈ LỆ LỖI"],
    [/Hnh trnh khch hng/g, "HÀNH TRÌNH KHÁCH HÀNG"],
    [/KHNG TUONG TC/g, "KHÔNG TƯƠNG TÁC"],
    [/ di qua/g, "ĐÃ ĐI QUA"],
    [/ang \? dy/g, "ĐANG Ở ĐÂY"],
    [/Ch\?:\s/g, "CHỜ: "],
    [/Ho\u1ea1t \u0111\u1ed9ng t\?t/g, "Hoạt động tốt"],
    [/L\?i\s\(/g, "Lỗi ("]
];

maps.forEach(([reg, rep]) => {
    text = text.replace(reg, rep);
});

fs.writeFileSync(path, text, "utf8");
console.log("Done!");
