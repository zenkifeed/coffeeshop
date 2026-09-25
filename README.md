# Quán Cà Phê Nhỏ

Game quản lý quán cà phê 3D chạy thẳng trên trình duyệt. Mỗi ngày bạn nhập hàng, đặt giá, mở cửa, rồi tự tay pha từng ly cho khách trong khoảng 3 phút (7:00–22:00 trong game). Pha nhanh, đúng món, giá hợp lý thì được nhiều sao, sao cao thì khách đông.

Toàn bộ đồ hoạ 3D là khối low-poly dựng bằng code Three.js, không có file ảnh hay model. Không cần build.

## Chạy game

Cần [Node.js](https://nodejs.org) 20.11 trở lên và có mạng (Three.js và phông chữ tải từ CDN).

```bash
npm start
```

Mở `http://localhost:5173`. Phải mở qua server vì game dùng ES module, mở file trực tiếp bằng `file://` sẽ không chạy.

Thử trên điện thoại: điện thoại cùng mạng wifi với máy tính thì mở `http://<IP máy tính>:5173`.

## Cách chơi

**Chuẩn bị** (đầu mỗi ngày):
- **Kho:** nhập ly, cà phê hạt, sữa, đá… Mỗi thứ có hạn dùng riêng, quá hạn cuối ngày thì bị đổ bỏ (đá dùng trong ngày, sữa tươi 3 ngày).
- **Menu & giá:** mở thêm món, chỉnh giá. Rẻ thì khách thích, đắt quá thì khách bỏ đi.
- **Nâng cấp:** biển hiệu neon, bàn ghế, máy xay tốt hơn, mở rộng quầy.

**Bán hàng:**
1. Chạm chồng **ly M** hoặc **ly L**.
2. **Nhấn giữ máy espresso**, thả tay khi vạch vào vùng xanh. Vào giữa vùng xanh là "Hoàn hảo".
3. Chạm sữa đặc, sữa tươi, sữa nóng, nước, đá… theo món khách gọi.
4. **Chạm vào khách** để giao ly. Sai món thì ly bị đổ, khách mất kiên nhẫn.

Vòng sáng vàng luôn chỉ chỗ cần chạm tiếp theo, dòng gợi ý phía dưới nói bước tiếp theo.

**Tiến trình:** từ ngày 4 khách chọn uống nóng hay đá, từ ngày 10 một khách có thể gọi 2–3 ly. Có sự kiện ngày: cuối tuần, ngày lễ, trời nắng, trời mưa, món hot, nhà cung cấp giảm giá. Két âm cuối ngày là phá sản.

**Món:** cà phê đen, cà phê sữa, bạc xỉu, americano, latte, cà phê muối, caramel latte.

## Lưu tiến trình

Tiến trình lưu trong trình duyệt (`localStorage`), không có máy chủ hay tài khoản.

- Lưu cả trong lúc bán: sau mỗi ly giao xong, mỗi 10 giây và khi đóng trang. Mở lại giữa ngày thì bán tiếp đúng giờ đó.
- Tự giữ 3 bản dự phòng của 3 cuối ngày gần nhất, khôi phục trong **Cài đặt › Khôi phục bản tự lưu**.
- Bản lưu hỏng được cất riêng, không bị ghi đè. Máy chặn lưu (tab ẩn danh, iPhone chặn cookie) thì game báo ngay kèm cách sửa.

Xoá dữ liệu trình duyệt là mất tiến trình.

## Kiểm thử

```bash
npm test
```

Kiểm thử logic thuần bằng Node: công thức món, gợi ý từng bước, kho theo mẻ, sinh đơn, chấm sao, lưu trữ (với `localStorage` giả), và mô phỏng kinh tế 30 ngày để giữ cân bằng game.

## Cấu trúc

```
index.html          trang game, importmap trỏ Three.js
style.css           giao diện
src/data.js         số liệu: nguyên liệu, món, nâng cấp, sự kiện, cấu hình kinh tế
src/logic.js        luật chơi thuần, không dính DOM hay 3D (kiểm thử được bằng Node)
src/scene.js        cảnh 3D: quán, quầy, khách, ly, hạt hiệu ứng, máy quay
src/game.js         điều phối: màn chuẩn bị, bán hàng, tổng kết, giao diện, pop-up
src/save.js         lưu trữ: bản chính, bản dự phòng, phát hiện máy chặn lưu
src/feel.js         rung, tuỳ chọn người chơi, giảm chuyển động
src/audio.js        âm thanh tổng hợp bằng Web Audio, không cần file
tools/serve.mjs     server tĩnh không phụ thuộc gì
tools/selftest.mjs  kiểm thử
```

Muốn chỉnh cân bằng game (giá, hạn dùng, lượng khách, thời gian một ngày) thì sửa `src/data.js`, rồi chạy `npm test` để xem mô phỏng 30 ngày còn hợp lý không.

## Ghi chú

- **Rung khi chạm:** chạy trên Android Chrome. iPhone không hỗ trợ rung trên web.
- **Giảm chuyển động:** máy bật "giảm chuyển động" thì rung lắc màn hình tự dịu đi, âm thanh và rung vẫn giữ.
