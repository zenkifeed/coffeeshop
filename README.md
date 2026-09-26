# Quán Cà Phê Nhỏ

Game quản lý chuỗi quán cà phê 3D phong cách dễ thương, chơi ngay trên trình duyệt. Khách tự tới, các bạn gấu nhân viên tự pha và bán, tiền tự vào két. Việc của bạn là nâng cấp máy pha, mở thêm món, thuê thêm gấu và mở rộng chuỗi quán. Tắt game thì quán vẫn bán, lần sau quay lại có tiền chờ sẵn.

- **Chơi ngay:** https://happycoffeeshop.vercel.app
- **Mã nguồn:** https://github.com/zenkifeed/coffeeshop

Mọi hình ảnh, âm thanh và nhạc nền đều được tạo bằng code ngay trong trình duyệt, không cần cài đặt gì.

## Cách chơi

### Bắt đầu

Lần đầu vào game có thẻ chào mừng. Chọn **"Chỉ mình cách chơi"** để được bong bóng chỉ dẫn từng bước, hoặc **"Bỏ qua, mình tự chơi"**. Dòng nhiệm vụ ở phía trên màn hình luôn gợi ý việc nên làm tiếp.

### Quán vận hành

Khách xếp hàng ở quầy và gọi món. Các bạn gấu nhận đơn, chạy tới máy pha, pha xong thì bưng ra đưa cho khách, khách trả tiền và thả tim. Bạn không cần làm gì, chỉ ngồi xem quán chạy và lo phần phát triển.

### Nâng cấp máy pha

Chạm vào một máy pha để mở bảng nâng cấp. Cấp càng cao thì mỗi ly bán càng được giá, qua các mốc cấp còn được thưởng lớn. Có thể nâng từng cấp, nâng nhiều cấp một lúc, hoặc giữ nút để nâng liên tục.

Máy chưa mở hiện thành thùng hàng. Mở máy mới để khách có thêm món, món sau đắt hơn món trước.

### Nâng cấp quán

Nút **Nâng cấp** ở thanh dưới có các nâng cấp mua một lần cho cả quán: thuê thêm gấu, kéo thêm khách, pha nhanh hơn, thêm chỗ chờ, món bán được giá hơn…

### Đội gấu

Bốn bạn gấu lần lượt vào ca: **Gấu Nâu** đội mũ đỏ, **Gấu Trúc** cài nơ hồng, **Gấu Trắng** quàng khăn xanh và **Gấu Mật** cài lá trên đầu. Các bạn biết chào khách, cười khi đưa ly, vươn vai lúc rảnh và nhảy mừng khi quán có chuyện vui. Chạm vào gấu để được chào lại nhé.

### Nhiệm vụ và chi nhánh mới

Mỗi quán có một danh sách nhiệm vụ, xong thì bấm **Nhận** lấy thưởng. Nhận hết thưởng thì được chuyển sang chi nhánh mới lớn hơn, với món mới và không gian mới: **Góc Phố → Sân Vườn → Phố Cổ**. Góc Phố là quán vỉa hè với ghế nhựa, mái hiên và xe máy đỗ bên lề; các chi nhánh sau là quán trong nhà.

### Khi vắng mặt

Đóng game hay chuyển sang tab khác một lúc thì quán vẫn bán. Lúc quay lại sẽ có bảng tiền kiếm được trong lúc vắng mặt.

### Cài đặt

Nút bánh răng ở góc trên: bật tắt nhạc nền, âm thanh hiệu ứng, rung khi chạm; khôi phục bản tự lưu; chơi lại từ đầu.

### Lưu tiến trình

Game tự lưu trong trình duyệt, không cần tài khoản. Muốn giữ tiến trình khi đổi máy hay xoá dữ liệu trình duyệt thì vào **Cài đặt › Đăng nhập bằng Discord**: tiến trình được lưu lên mây và tự tải về khi đăng nhập ở máy khác. Game chỉ đọc tên và ảnh đại diện Discord của bạn.

### Thêm vào màn hình chính

Chơi như một app, có icon Gấu Trắng riêng và mở toàn màn hình:

- **iPhone, iPad (Safari):** mở game, bấm nút **Chia sẻ** rồi chọn **Thêm vào MH chính**.
- **Android (Chrome):** mở game, bấm menu **⋮** rồi chọn **Cài đặt ứng dụng** (hoặc **Thêm vào màn hình chính**).

Trên iPhone, app ở màn hình chính lưu dữ liệu riêng, tách khỏi Safari. Muốn chơi tiếp tiến trình đang có trong Safari thì đăng nhập Discord ở cả hai nơi.

## Dành cho người phát triển

Cần [Node.js](https://nodejs.org) 20.11 trở lên.

```bash
npm start   # chạy ở http://localhost:5173
npm test    # kiểm thử
```

Đăng nhập Discord cần các biến môi trường trong `.env.local` (khi chạy trên máy) và trên Vercel: `DISCORD_CLIENT_SECRET`, `SESSION_SECRET`, cùng kho Upstash Redis (`KV_REST_API_URL`, `KV_REST_API_TOKEN`). Khi chạy trên máy mà chưa có Redis thì bản lưu nằm trong thư mục `.data/`.

Đẩy code lên nhánh `main` của GitHub thì bản online trên Vercel tự cập nhật.
