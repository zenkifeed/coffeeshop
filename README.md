# Quán Cà Phê Nhỏ

Game quản lý chuỗi quán cà phê 3D phong cách dễ thương, chạy thẳng trên trình duyệt, lối chơi giống Eatventure. Khách tự tới, các bạn gấu nhân viên tự pha và bán, tiền tự vào két. Bạn chạm vào các trạm pha để nâng cấp, mở thêm món, thuê thêm người, làm nhiệm vụ để chuyển sang chi nhánh lớn hơn. Tắt game thì quán vẫn bán: lần sau mở lại được nhận tiền lúc vắng mặt.

- **Chơi ngay:** https://happycoffeeshop.vercel.app
- **Mã nguồn:** https://github.com/zenkifeed/coffeeshop

Toàn bộ đồ hoạ 3D dựng bằng code Three.js, không có file ảnh hay model. Gấu và khách chibi dựng từ khối tròn bóng mịn, có khuôn mặt đổi biểu cảm; phòng màu pastel, có cờ dây và thảm tròn; đồ vật trên quầy (máy espresso, lon sữa, ấm, chai siro, ly mang đi) dựng bằng khối xoay và khối bo góc, bóng mịn, có phản chiếu nhẹ để ra chất inox, sứ, thuỷ tinh. Âm thanh và nhạc nền lo-fi tổng hợp bằng Web Audio, không có file âm thanh. Không cần build.

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

Chọn học thì bong bóng chỉ dẫn hiện đúng lúc có việc để làm, mỗi bước một lần:

1. Ngay từ đầu: chạm vào trạm cà phê đen, rồi bấm **Nâng cấp** trong bảng trạm.
2. Lần đầu đủ tiền mở trạm mới: chạm vào thùng hàng, rồi bấm **Mở trạm**.
3. Lần đầu đủ tiền một nâng cấp quán: vào nút **Nâng cấp** ở thanh dưới và mua.
4. Lần đầu nhận hết thưởng nhiệm vụ: vào **Nhiệm vụ** và bấm **Chuyển sang chi nhánh mới**.

Bong bóng không chặn thao tác, bong bóng nào cũng có nút "Bỏ qua hướng dẫn". Dù tắt hướng dẫn, **dòng nhiệm vụ** dưới thanh trên vẫn luôn gợi ý việc nên làm tiếp; chạm vào đó để mở danh sách nhiệm vụ.

### Quán chạy thế nào

- Góc nhìn từ phía khách: khách đứng dưới cùng, quầy đưa ly ở giữa, các bạn gấu đứng sau quầy hướng mặt ra khách, trạm pha xếp trên quầy sát tường với mặt máy quay ra phía khách. Nhãn cấp nằm phía trên mỗi máy.
- Khách vào từ mép dưới màn hình, đứng chờ ở quầy (lúc đầu 3 chỗ, tối đa 5) và gọi ngẫu nhiên một món trong các trạm đã mở. Quầy kín chỗ thì khách mới chưa vào.
- Bạn gấu rảnh tay nhận đơn của khách chờ lâu nhất, đi tới trạm của món đó, pha xong thì bưng ra quầy. Khách nhận ly thì trả tiền (số tiền bay lên từ đầu khách) và thả tim.
- Mỗi trạm lúc đầu chỉ cho một bạn gấu pha cùng lúc; cấp 25 thêm chỗ thứ hai, cấp 75 thêm chỗ thứ ba.
- Thanh trên hiện tiền trong két và thu nhập ước tính mỗi giây.

### Đội gấu

Nhân viên là bốn bạn gấu, vào ca theo thứ tự:

| Gấu | Nhận ra bằng | Vào ca |
|---|---|---|
| Gấu Nâu | mũ lưỡi trai đỏ | có sẵn |
| Gấu Trúc | nơ hồng trên tai | nâng cấp "Thuê Gấu Trúc" |
| Gấu Trắng | khăn quàng xanh | nâng cấp "Thuê Gấu Trắng" |
| Gấu Mật | chiếc lá trên đầu | nâng cấp "Thuê Gấu Mật" |

Mọi bạn gấu mặc tạp dề màu của chi nhánh, có túi hình tim. Sang chi nhánh mới thì Gấu Nâu đi cùng, các bạn khác thuê lại.

- **Động tác:** đi lạch bạch, hai tay lắc lắc khi pha, bưng ly bằng hai tay, nhún người khi đưa ly cho khách. Rảnh tay thì quay mặt ra phía khách, ngẩng lên nhìn, thỉnh thoảng vẫy tay, vươn vai ngáp hay ngó quanh; tai giật nhẹ. Khách vừa tới quầy thì một bạn gấu đang rảnh vẫy tay chào.
- **Biểu cảm:** chớp mắt, mắt hơi híp khi tập trung pha, cười híp mắt khi đưa ly hay ăn mừng, nhắm mắt há miệng khi ngáp.
- **Ăn mừng:** gấu mới vào ca thì xoay một vòng; trạm nào qua mốc cấp hay vừa sang chi nhánh mới thì cả đội giơ tay nhảy lên.
- **Chạm vào gấu** thì gấu vẫy chào, bắn tim nhỏ. Chạm vào khách thì khách vẫy lại.

Nút **Quán** có danh sách đội gấu: ai đang làm, ai chưa thuê và giá thuê.

### Trạm pha

Chạm vào một trạm (hoặc nhãn cấp dưới trạm) để mở bảng trạm:

- **Cấp 1–100.** Mỗi cấp đắt hơn cấp trước 16%. Tiền mỗi ly = tiền cấp 1 × cấp.
- **Mốc cấp 10, 25, 50, 75, 100:** mỗi mốc được một sao và tiền mỗi ly ×2.
- Chọn mua **x1**, **x10**, **Tới mốc** hoặc **Tối đa** (nhiều nhất đủ tiền). **Giữ nút Nâng cấp** để nâng liên tục.
- Nhãn dưới trạm: cấp hiện tại, số sao, mũi tên xanh khi đủ tiền lên cấp, vạch xanh khi đang có gấu pha.

Trạm chưa mở là **thùng hàng**. Trạm mở lần lượt từ trái sang phải; trạm sau đắt hơn nhưng mỗi ly bán được nhiều hơn hẳn.

### Nâng cấp quán

Nút **Nâng cấp** ở thanh dưới: danh sách mua một lần, dùng mãi ở chi nhánh đó. Có thuê thêm bạn gấu, tăng khách tới, nhân viên đi nhanh hơn, thêm chỗ chờ ở quầy, pha nhanh hơn, và các món bán gấp 2–3. Mua biển hiệu thì biển tên quán trên tường chuyển sang đèn neon.

### Nhiệm vụ và chuyển chi nhánh

Mỗi chi nhánh có 12–14 nhiệm vụ (nâng trạm lên cấp nào đó, mở trạm, mua nâng cấp). Xong thì bấm **Nhận** để lấy thưởng. Nhận hết thưởng thì mở nút **Chuyển sang** chi nhánh kế tiếp:

- Tiền, trạm và nâng cấp ở chi nhánh cũ để lại. Chi nhánh mới bắt đầu với vốn riêng, chỉ mở sẵn trạm đầu tiên.
- Giữ nguyên tên quán và tổng số khách đã phục vụ. Gấu Nâu đi cùng, các bạn gấu khác thuê lại.
- Chuỗi có 3 chi nhánh: **Góc Phố → Sân Vườn → Phố Cổ**, mỗi nơi 5 món, màu sàn và tường riêng. Xong Phố Cổ thì chơi tiếp ở đó.

Nút **Quán** ở thanh dưới: đổi tên quán (tối đa 30 ký tự, có xúc xắc gợi ý tên), xem chuỗi chi nhánh và số liệu.

### Tiền lúc vắng mặt

Đóng game hoặc chuyển sang tab khác từ 60 giây trở lên thì lúc quay lại có bảng **"Quán vẫn bán khi bạn vắng"**. Tiền nhận = thu nhập ước tính mỗi giây × thời gian vắng, tính tối đa **2 giờ**.

### Số liệu

Tiền hiển thị theo k, tr, tỷ, nghìn tỷ. Người chơi mua tối ưu (mô phỏng trong kiểm thử) xong mỗi chi nhánh trong khoảng 17–20 phút; người chơi thật thường lâu hơn.

<details><summary><b>Góc Phố</b>: vốn đầu 60k, khách tới khoảng mỗi 2,6 giây</summary>

| Trạm | Mỗi ly ở cấp 1 | Pha | Giá mở | Lên cấp 2 |
|---|---|---|---|---|
| Cà phê đen | 5k | 2,6 giây | có sẵn | 20k |
| Cà phê sữa | 30k | 3 giây | 2,4 tr | 300k |
| Bạc xỉu | 180k | 3,4 giây | 14 tr | 1,8 tr |
| Trà đá | 1,1 tr | 2,8 giây | 88 tr | 11 tr |
| Americano | 6,5 tr | 3,8 giây | 520 tr | 65 tr |

| Nâng cấp | Giá | Tác dụng |
|---|---|---|
| Thuê Gấu Trúc | 180k | Thêm một bạn gấu pha chế |
| Biển hiệu đèn neon | 1,8 tr | Khách tới nhiều hơn 30% |
| Giày thể thao cho quán | 4,5 tr | Nhân viên đi nhanh hơn 30% |
| Kê thêm chỗ đứng | 12 tr | Thêm một chỗ khách chờ ở quầy |
| Thuê Gấu Trắng | 36 tr | Thêm một bạn gấu pha chế |
| Hạt Robusta Cầu Đất | 90 tr | Cà phê đen bán gấp 3 |
| Máy xay chuyên nghiệp | 150 tr | Pha nhanh hơn 30% |
| Sữa đặc loại ngon | 300 tr | Cà phê sữa và bạc xỉu bán gấp 2 |
| Mái hiên che nắng | 600 tr | Thêm một chỗ khách chờ ở quầy |
| Thuê Gấu Mật | 1 tỷ | Thêm một bạn gấu pha chế |

| Nhiệm vụ | Thưởng |
|---|---|
| Nâng Cà phê đen lên cấp 5 | 30k |
| Thuê Gấu Trúc | 100k |
| Nâng Cà phê đen lên cấp 10 | 300k |
| Mở trạm Cà phê sữa | 600k |
| Nâng Cà phê sữa lên cấp 10 | 1,5 tr |
| Biển hiệu đèn neon | 2 tr |
| Mở trạm Bạc xỉu | 5 tr |
| Nâng Cà phê đen lên cấp 25 | 10 tr |
| Thuê Gấu Trắng | 20 tr |
| Mở trạm Trà đá | 40 tr |
| Nâng Bạc xỉu lên cấp 25 | 100 tr |
| Mở trạm Americano | 300 tr |

</details>

<details><summary><b>Sân Vườn</b>: vốn đầu 3 tr, khách tới khoảng mỗi 2,4 giây</summary>

| Trạm | Mỗi ly ở cấp 1 | Pha | Giá mở | Lên cấp 2 |
|---|---|---|---|---|
| Latte | 200k | 3 giây | có sẵn | 800k |
| Cà phê muối | 1,2 tr | 3,2 giây | 96 tr | 12 tr |
| Trà đào | 7,2 tr | 3,4 giây | 580 tr | 72 tr |
| Sinh tố bơ | 43 tr | 3,6 giây | 3,5 tỷ | 430 tr |
| Caramel latte | 260 tr | 4 giây | 21 tỷ | 2,6 tỷ |

| Nâng cấp | Giá | Tác dụng |
|---|---|---|
| Thuê Gấu Trúc | 6 tr | Thêm một bạn gấu pha chế |
| Cổng hoa giấy | 75 tr | Khách tới nhiều hơn 30% |
| Lối đi lát gạch | 180 tr | Nhân viên đi nhanh hơn 30% |
| Thuê Gấu Trắng | 450 tr | Thêm một bạn gấu pha chế |
| Thêm ghế đá | 900 tr | Thêm một chỗ khách chờ ở quầy |
| Máy pha hai vòi | 3,6 tỷ | Pha nhanh hơn 30% |
| Đào ngâm nhà làm | 9 tỷ | Trà đào bán gấp 3 |
| Thuê Gấu Mật | 24 tỷ | Thêm một bạn gấu pha chế |
| Mở thêm khoảnh sân | 60 tỷ | Thêm một chỗ khách chờ ở quầy |
| Nhạc acoustic cuối tuần | 180 tỷ | Mọi món bán gấp 2 |

| Nhiệm vụ | Thưởng |
|---|---|
| Nâng Latte lên cấp 10 | 3 tr |
| Thuê Gấu Trúc | 6 tr |
| Mở trạm Cà phê muối | 20 tr |
| Nâng Latte lên cấp 25 | 50 tr |
| Cổng hoa giấy | 100 tr |
| Mở trạm Trà đào | 250 tr |
| Nâng Cà phê muối lên cấp 25 | 600 tr |
| Thuê Gấu Trắng | 1 tỷ |
| Mở trạm Sinh tố bơ | 2,5 tỷ |
| Nâng Trà đào lên cấp 25 | 6 tỷ |
| Máy pha hai vòi | 10 tỷ |
| Mở trạm Caramel latte | 30 tỷ |
| Nâng Sinh tố bơ lên cấp 25 | 100 tỷ |

</details>

<details><summary><b>Phố Cổ</b>: vốn đầu 150 tr, khách tới khoảng mỗi 2,2 giây</summary>

| Trạm | Mỗi ly ở cấp 1 | Pha | Giá mở | Lên cấp 2 |
|---|---|---|---|---|
| Cà phê trứng | 10 tr | 3,2 giây | có sẵn | 40 tr |
| Cà phê cốt dừa | 60 tr | 3,2 giây | 4,8 tỷ | 600 tr |
| Cold brew | 360 tr | 3,4 giây | 29 tỷ | 3,6 tỷ |
| Cappuccino | 2,2 tỷ | 3,8 giây | 170 tỷ | 22 tỷ |
| Mocha sô-cô-la | 13 tỷ | 4,2 giây | 1 nghìn tỷ | 130 tỷ |

| Nâng cấp | Giá | Tác dụng |
|---|---|---|
| Thuê Gấu Trúc | 300 tr | Thêm một bạn gấu pha chế |
| Đèn lồng Hội An | 3,6 tỷ | Khách tới nhiều hơn 30% |
| Cầu thang mới | 9 tỷ | Nhân viên đi nhanh hơn 30% |
| Thuê Gấu Trắng | 24 tỷ | Thêm một bạn gấu pha chế |
| Ghế đẩu vỉa hè | 45 tỷ | Thêm một chỗ khách chờ ở quầy |
| Trứng gà ta | 150 tỷ | Cà phê trứng bán gấp 3 |
| Máy rang tại chỗ | 450 tỷ | Pha nhanh hơn 30% |
| Thuê Gấu Mật | 1,2 nghìn tỷ | Thêm một bạn gấu pha chế |
| Mở tầng hai | 3 nghìn tỷ | Thêm một chỗ khách chờ ở quầy |
| Lên sách hướng dẫn du lịch | 9 nghìn tỷ | Mọi món bán gấp 2 |

| Nhiệm vụ | Thưởng |
|---|---|
| Nâng Cà phê trứng lên cấp 10 | 150 tr |
| Thuê Gấu Trúc | 300 tr |
| Mở trạm Cà phê cốt dừa | 1 tỷ |
| Nâng Cà phê trứng lên cấp 25 | 2,5 tỷ |
| Đèn lồng Hội An | 5 tỷ |
| Mở trạm Cold brew | 12 tỷ |
| Nâng Cà phê cốt dừa lên cấp 25 | 30 tỷ |
| Thuê Gấu Trắng | 50 tỷ |
| Mở trạm Cappuccino | 120 tỷ |
| Nâng Cold brew lên cấp 25 | 300 tỷ |
| Máy rang tại chỗ | 500 tỷ |
| Mở trạm Mocha sô-cô-la | 1,5 nghìn tỷ |
| Nâng Cappuccino lên cấp 25 | 5 nghìn tỷ |
| Nâng Cà phê trứng lên cấp 50 | 10 nghìn tỷ |

</details>

### Cài đặt

Nút bánh răng trên thanh trên:

- **Nhạc nền** và **Âm thanh hiệu ứng** bật tắt riêng. Nhạc nền là một bản lo-fi chill (piano điện, bass, trống chổi, kalimba, tiếng lách tách đĩa than) tự tổng hợp, hai đoạn luân phiên nên nghe lâu không lặp y hệt. Nhạc tự nhỏ lại lúc trạm qua mốc hay lúc chuyển chi nhánh, và dừng khi chuyển sang tab khác.
- **Rung khi chạm.**
- "Khôi phục bản tự lưu" và "Chơi lại từ đầu" (giữ tên quán).

Các tuỳ chọn này lưu riêng trong trình duyệt, không mất khi chơi lại từ đầu.

## Lưu tiến trình

Tiến trình lưu trong trình duyệt (`localStorage`), không có máy chủ hay tài khoản.

- Tự lưu mỗi 10 giây, sau mỗi lần mua và khi đóng trang hay chuyển tab.
- Tự giữ 3 bản dự phòng: cứ 5 phút chơi thêm một bản và mỗi lần chuyển chi nhánh. Khôi phục trong **Cài đặt › Khôi phục bản tự lưu**.
- Bản lưu hỏng được cất riêng, không bị ghi đè. Máy chặn lưu (tab ẩn danh, iPhone chặn cookie) thì game báo ngay kèm cách sửa.
- Người chơi bản pha tay cũ: tiến trình cũ không chuyển sang được vì luật chơi khác hẳn, nhưng tên quán được giữ và thẻ chào mừng nói rõ quán đã đổi cách chơi.

Xoá dữ liệu trình duyệt là mất tiến trình. Chưa có mã sao lưu để chuyển sang máy khác.

## Kiểm thử

```bash
npm test
```

Kiểm thử logic thuần bằng Node, chạy trên chính engine của game:

- Số liệu hợp lệ (trạm, nâng cấp, nhiệm vụ trỏ đúng nhau), định dạng tiền, giá cấp, mốc, mua theo lô.
- Mô phỏng 10 phút khách và nhân viên: tiền chỉ tăng, không trạm nào quá số người pha, không khách nào kẹt.
- Ước lượng thu nhập mỗi giây (dùng cho tiền lúc vắng mặt) không lệch mô phỏng thật quá 0,7–1,4 lần.
- Nhiệm vụ, chuyển chi nhánh, cờ hướng dẫn, lưu trữ (với `localStorage` giả).
- **Mô phỏng cân bằng:** người chơi giả (seed cố định) chơi hết ba chi nhánh; kiểm thử trượt nếu một chi nhánh xong ngoài khoảng 10–35/40/45 phút, thưởng đầu tiên tới sau 1,5 phút, hay phải chờ quá 6 phút giữa hai lần nhận thưởng.

Xem chi tiết từng mốc thưởng: `node tools/balance.mjs`.

## Cấu trúc

```
index.html          trang game, importmap trỏ Three.js
style.css           giao diện
src/data.js         số liệu: chi nhánh, trạm, nâng cấp, nhiệm vụ, đội gấu, bố cục quán, cấu hình kinh tế
src/logic.js        luật chơi thuần, không dính DOM hay 3D: cấp trạm, derived(), mô phỏng khách và nhân viên,
                    ước lượng thu nhập, nhiệm vụ, chuyển quán, cờ hướng dẫn (kiểm thử được bằng Node)
src/scene.js        cảnh 3D: phòng pastel theo màu chi nhánh, cờ dây, quầy, trạm và thùng hàng, biển hiệu, hạt hiệu ứng, máy quay
src/chars.js        nhân vật: bốn bạn gấu và khách chibi, khuôn mặt đổi biểu cảm, bộ động tác
src/props.js        mô hình đồ vật: ly mang đi, máy espresso, lon, hộp sữa, ấm, thùng đá, chai siro, bát kem, máy tính tiền
src/game.js         điều phối: vòng lặp, thanh trên, nhãn trạm, bảng trượt, chuyển quán, tiền vắng mặt, hướng dẫn
src/ui.js           phản hồi DOM dùng chung: icon SVG, thông báo, chữ bay, xu bay, pháo giấy, hộp thoại
src/coach.js        bong bóng chỉ dẫn cho người mới (trỏ vào nút hoặc điểm 3D)
src/save.js         lưu trữ: bản chính, bản dự phòng, phát hiện máy chặn lưu, nhận ra bản cũ
src/feel.js         rung, tuỳ chọn người chơi, giảm chuyển động
src/audio.js        tiếng hiệu ứng tổng hợp bằng Web Audio, nhánh âm lượng cho hiệu ứng và nhạc
src/music.js        nhạc nền lo-fi tổng hợp, lên lịch nốt trước theo đồng hồ âm thanh
tools/serve.mjs     server tĩnh không phụ thuộc gì
tools/selftest.mjs  kiểm thử
tools/balance.mjs   người chơi giả và mô phỏng cân bằng (dùng trong kiểm thử, chạy riêng được)
```

Muốn chỉnh cân bằng (giá, hệ số tăng giá, mốc, tốc độ khách, thưởng nhiệm vụ) thì sửa `src/data.js`, rồi chạy `npm test` để xem mô phỏng ba chi nhánh còn nằm trong khoảng thời gian mong muốn không.

## Đưa lên web

Bản chơi online chạy trên Vercel (project `coffeeshop`) dưới dạng trang tĩnh, không có bước build, ở địa chỉ https://happycoffeeshop.vercel.app.

Project đã nối với repo GitHub: **đẩy code lên nhánh `main` là Vercel tự cập nhật bản online** sau vài giây, không cần làm gì thêm. Đẩy nhánh khác thì Vercel tạo bản xem thử riêng, không đụng bản chính. Đổi tên miền ở *Vercel › coffeeshop › Settings › Domains*.

Muốn đưa lên từ máy mà không qua GitHub thì chạy `npx vercel deploy --prod`. Lần đầu trên máy mới cần `npx vercel login` và `npx vercel link --project coffeeshop`; lệnh link tạo file `.env.local` chứa token, file này đã nằm trong `.gitignore`.

## Cập nhật tài liệu

Mỗi thay đổi về tính năng, số liệu hay cách chơi đều phải sửa README này trong cùng commit, cùng với chữ hướng dẫn trong game (thẻ chào mừng, bong bóng chỉ dẫn, mô tả trong Cài đặt). Số liệu trong các bảng ở trên lấy từ `src/data.js`, đổi số ở đó thì đổi bảng ở đây.

## Ghi chú

- **Rung khi chạm:** chạy trên Android Chrome. iPhone không hỗ trợ rung trên web.
- **Giảm chuyển động:** máy bật "giảm chuyển động" thì rung lắc màn hình tự dịu đi, âm thanh và rung vẫn giữ.
