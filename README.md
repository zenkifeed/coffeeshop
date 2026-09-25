# Quán Cà Phê Nhỏ

Game quản lý quán cà phê 3D chạy thẳng trên trình duyệt. Mỗi ngày bạn nhập hàng, đặt giá, mở cửa, rồi tự tay pha từng ly cho khách trong khoảng 3 phút (7:00–22:00 trong game). Pha nhanh, đúng món, giá hợp lý thì được nhiều sao, sao cao thì khách đông.

- **Chơi ngay:** https://happycoffeeshop.vercel.app
- **Mã nguồn:** https://github.com/zenkifeed/coffeeshop

Toàn bộ đồ hoạ 3D là khối low-poly dựng bằng code Three.js, không có file ảnh hay model. Âm thanh tổng hợp bằng Web Audio, không có file âm thanh. Không cần build.

## Chạy trên máy

Cần [Node.js](https://nodejs.org) 20.11 trở lên và có mạng (Three.js và phông chữ tải từ CDN).

```bash
npm start
```

Mở `http://localhost:5173`. Phải mở qua server vì game dùng ES module, mở file trực tiếp bằng `file://` sẽ không chạy.

Thử trên điện thoại: điện thoại cùng mạng wifi với máy tính thì mở `http://<IP máy tính>:5173`.

## Cách chơi

### Lần đầu chơi

Sau màn mở có thẻ chào mừng với hai lựa chọn: **"Chỉ mình cách chơi"** hoặc **"Bỏ qua, mình tự chơi"**.

Chọn học thì bong bóng chỉ dẫn trỏ vào từng chỗ cần chạm: gợi ý nhập hàng → Nhập hàng → Mở cửa → lấy ly → giữ máy espresso (bong bóng báo lúc cần thả tay) → thêm nguyên liệu → giao cho khách. Bong bóng không chặn thao tác, bong bóng nào cũng có nút "Bỏ qua hướng dẫn". Giao xong ly đầu tiên thì hướng dẫn tắt hẳn.

Lần đầu có đủ tiền mở món mới, bong bóng chỉ vào chỗ mở món.

**Nhiệm vụ tân binh** ở màn chuẩn bị, xong thì bấm "Nhận" để lấy thưởng:

| Nhiệm vụ | Thưởng |
|---|---|
| Bán ly cà phê đầu tiên | 30k |
| Chiết một shot Hoàn hảo | 40k |
| Được một khách chấm 5 sao | 40k |
| Đặt tên cho quán | 20k |
| Mở thêm một món mới | 80k |

Nhận hết thì danh sách tự ẩn.

### Chuẩn bị (đầu mỗi ngày)

- **Kho:** nhập ly, cà phê hạt, sữa, đá… theo gói 10 phần. Mỗi thứ có hạn dùng riêng, quá hạn cuối ngày thì bị đổ bỏ. Nút "Gợi ý nhập đủ khoảng 30 ly" chọn sẵn lượng hàng.

  | Nguyên liệu | Giá mỗi phần | Hạn dùng |
  |---|---|---|
  | Ly + nắp | 1,5k | không hết hạn |
  | Cà phê hạt | 3k | không hết hạn |
  | Sữa đặc | 1,5k | 14 ngày |
  | Sữa tươi | 2,5k | 3 ngày |
  | Đá viên | 0,3k | dùng trong ngày |
  | Siro caramel | 2k | không hết hạn |
  | Kem muối | 3k | 2 ngày |

- **Menu & giá:** mở thêm món, chỉnh giá bán và phụ thu size L (gợi ý 5k; trên 7k thì ít khách chọn size L). So với giá gợi ý:
  - rẻ hơn 90%: khách kéo tới đông hơn, dễ được thêm sao;
  - đắt hơn 125%: khách chê, bị trừ sao;
  - đắt hơn 160%: 80% khách không gọi món đó, đổi món khác hoặc bỏ về.

  | Món | Công thức | Giá gợi ý | Giá mở |
  |---|---|---|---|
  | Cà phê đen | Shot | 20k | có sẵn |
  | Cà phê sữa | Shot + sữa đặc | 25k | có sẵn |
  | Bạc xỉu | Shot + sữa đặc + sữa tươi | 29k | 150k |
  | Americano | Shot + nước nóng | 30k | 200k |
  | Cà phê muối | Shot + sữa đặc + kem muối | 35k | 450k |
  | Latte | Shot + sữa đánh nóng | 39k | 350k |
  | Caramel latte | Shot + sữa đánh nóng + caramel | 45k | 600k |

- **Nâng cấp:**

  | Nâng cấp | Giá | Tác dụng |
  |---|---|---|
  | Biển hiệu đèn neon | 400k | Thêm 20% khách, biển hiệu 3D chuyển sang đèn neon |
  | Bàn ghế ngồi lại | 500k | Khách chịu chờ lâu hơn 25% |
  | Máy xay chuyên nghiệp | 700k | Chiết espresso nhanh hơn 30%, vùng chuẩn rộng hơn |
  | Mở rộng quầy | 800k | Phục vụ cùng lúc 4 khách thay vì 3 |

  Mỗi nâng cấp làm tiền điện nước tăng 8k/ngày.

- **Đổi tên quán:** bấm "Đổi tên", gõ tên (tối đa 30 ký tự) hoặc lắc xúc xắc lấy tên ngẫu nhiên. Tên hiện trên biển hiệu 3D treo trên tường quán.

### Bán hàng

1. Chạm chồng **ly M** hoặc **ly L**.
2. **Nhấn giữ máy espresso**, thả tay khi vạch vào vùng xanh. Thả đúng giữa vùng xanh là **"Hoàn hảo"**. Thả sớm thì shot nhạt, thả muộn thì đắng, giữ quá lâu thì tràn ly.
3. Chạm sữa đặc, sữa tươi, sữa nóng, nước, đá… theo món khách gọi. Bong bóng thoại trên đầu khách vẽ ly: có ống hút và đá là uống đá, bốc hơi là uống nóng, huy hiệu **L** là size lớn.
4. **Chạm vào khách** để giao ly. Sai món thì ly bị đổ, khách mất 30% thời gian chờ. Lỡ tay thì chạm thùng rác để đổ ly làm lại.

Vòng sáng vàng chỉ chỗ cần chạm tiếp theo trong 5 ngày đầu, dòng gợi ý phía dưới luôn nói bước tiếp theo.

**Sao và tip:** khách bắt đầu với 5 sao, bị trừ khi phải chờ quá nửa thời gian, shot không chuẩn, giá đắt hoặc giao sai món; thỉnh thoảng gặp khách khó tính trừ thêm 1 sao. Giao càng nhanh tip càng cao. Sao trung bình của 30 đánh giá gần nhất quyết định lượng khách. Nhiều khách 5 sao liên tiếp thì hiện **chuỗi 5 sao**.

**Tiến trình:**
- Từ ngày 4 khách chọn uống nóng hay đá. Từ ngày 10 một khách có thể gọi 2–3 ly.
- Khách đông nhất buổi sáng, vãn buổi chiều, đông lại buổi tối.
- Sự kiện ngày: cuối tuần (đông hơn 25%), ngày lễ mỗi 15 ngày (đông gấp rưỡi, tip gấp đôi), trời nắng, trời mưa, món hot trên mạng, nhà cung cấp giảm giá 30%.
- Cuối ngày trừ mặt bằng 40k và điện nước. Vốn đầu 300k. Két âm cuối ngày là phá sản.

### Cài đặt

Nút bánh răng trên thanh trên: âm thanh, rung khi chạm, vòng sáng chỉ dẫn (Tự động: 5 ngày đầu / Luôn bật / Tắt). Ở màn chuẩn bị còn có "Khôi phục bản tự lưu" và "Chơi lại từ đầu".

## Lưu tiến trình

Tiến trình lưu trong trình duyệt (`localStorage`), không có máy chủ hay tài khoản.

- Lưu cả trong lúc bán: sau mỗi ly giao xong, khi có khách bỏ về, mỗi 10 giây và khi đóng trang. Mở lại giữa ngày thì chỉ có một lựa chọn: bán tiếp đúng giờ đó.
- Tự giữ 3 bản dự phòng của 3 cuối ngày gần nhất, khôi phục trong **Cài đặt › Khôi phục bản tự lưu**.
- Bản lưu hỏng được cất riêng, không bị ghi đè. Máy chặn lưu (tab ẩn danh, iPhone chặn cookie) thì game báo ngay kèm cách sửa.

Xoá dữ liệu trình duyệt là mất tiến trình. Chưa có mã sao lưu để chuyển sang máy khác.

## Kiểm thử

```bash
npm test
```

Kiểm thử logic thuần bằng Node: công thức món, gợi ý từng bước, kho theo mẻ, sinh đơn, chấm sao, lưu trữ (với `localStorage` giả), hướng dẫn lần đầu và nhiệm vụ tân binh, và mô phỏng kinh tế 30 ngày để giữ cân bằng game.

## Cấu trúc

```
index.html          trang game, importmap trỏ Three.js
style.css           giao diện
src/data.js         số liệu: nguyên liệu, món, nâng cấp, sự kiện, nhiệm vụ tân binh, cấu hình kinh tế
src/logic.js        luật chơi thuần, không dính DOM hay 3D (kiểm thử được bằng Node)
src/scene.js        cảnh 3D: quán, quầy, khách, ly, biển hiệu, hạt hiệu ứng, máy quay
src/game.js         điều phối: màn chuẩn bị, bán hàng, tổng kết, giao diện, pop-up, hướng dẫn
src/coach.js        bong bóng chỉ dẫn cho người mới (trỏ vào nút hoặc điểm 3D)
src/save.js         lưu trữ: bản chính, bản dự phòng, phát hiện máy chặn lưu
src/feel.js         rung, tuỳ chọn người chơi, giảm chuyển động
src/audio.js        âm thanh tổng hợp bằng Web Audio
tools/serve.mjs     server tĩnh không phụ thuộc gì
tools/selftest.mjs  kiểm thử
```

Muốn chỉnh cân bằng game (giá, hạn dùng, lượng khách, thời gian một ngày, thưởng nhiệm vụ) thì sửa `src/data.js`, rồi chạy `npm test` để xem mô phỏng 30 ngày còn hợp lý không.

## Đưa lên web

Bản chơi online chạy trên Vercel (project `coffeeshop`) dưới dạng trang tĩnh, không có bước build, ở địa chỉ https://happycoffeeshop.vercel.app.

Project đã nối với repo GitHub: **đẩy code lên nhánh `main` là Vercel tự cập nhật bản online** sau vài giây, không cần làm gì thêm. Đổi tên miền ở *Vercel › coffeeshop › Settings › Domains*.

Muốn đưa lên từ máy mà không qua GitHub thì chạy `npx vercel deploy --prod`. Lần đầu trên máy mới cần `npx vercel login` và `npx vercel link --project coffeeshop`; lệnh link tạo file `.env.local` chứa token, file này đã nằm trong `.gitignore`.

## Cập nhật tài liệu

Mỗi thay đổi về tính năng, số liệu hay cách chơi đều phải sửa README này trong cùng commit, cùng với chữ hướng dẫn trong game (thẻ chào mừng, bong bóng chỉ dẫn, mô tả trong Cài đặt). Số liệu trong các bảng ở trên lấy từ `src/data.js`, đổi số ở đó thì đổi bảng ở đây.

## Ghi chú

- **Rung khi chạm:** chạy trên Android Chrome. iPhone không hỗ trợ rung trên web.
- **Giảm chuyển động:** máy bật "giảm chuyển động" thì rung lắc màn hình tự dịu đi, âm thanh và rung vẫn giữ.
