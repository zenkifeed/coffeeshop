# Quy tắc cho dự án Quán Cà Phê Nhỏ

- **Đồng bộ tài liệu với mọi thay đổi.** Thay đổi tính năng hay cách chơi thì sửa `README.md` trong cùng commit nếu phần giới thiệu hoặc cách chơi bị ảnh hưởng, kèm chữ hướng dẫn trong game (thẻ chào mừng, bong bóng chỉ dẫn trong `runCoach`, mô tả trong Cài đặt).
- **README chỉ viết tổng quát:** giới thiệu game và cách chơi. Không ghi công thức, số liệu cân bằng, bảng giá hay chi tiết bên trong game (những thứ đó nằm ở `src/data.js` và comment trong code).
- **Kiểm thử trước khi commit:** `npm test` phải đạt hết. Đổi cân bằng game thì xem lại mô phỏng ba chi nhánh trong output (chi tiết: `node tools/balance.mjs`).
- **Commit:** tác giả chỉ ghi `namdp <namdp@ondigames.com>`, không thêm dòng Co-Authored-By. Đặt qua biến môi trường `GIT_AUTHOR_NAME/EMAIL`, `GIT_COMMITTER_NAME/EMAIL`, không sửa `.gitconfig`.
- **Đưa lên web:** đẩy lên GitHub (`origin`, nhánh `main`) là Vercel tự deploy lên https://happycoffeeshop.vercel.app, không chạy thêm `vercel deploy --prod` (sẽ ra hai bản deploy trùng). Sau khi push, kiểm tra bản mới bằng `npx vercel ls coffeeshop`. Không commit `.env.local`, `.vercel/` hay `.data/`.
- **Mã bí mật:** `DISCORD_CLIENT_SECRET`, `SESSION_SECRET` và mã Upstash chỉ nằm trong `.env.local` và biến môi trường Vercel, không bao giờ ghi vào code hay commit. Client ID Discord không phải mã bí mật.
