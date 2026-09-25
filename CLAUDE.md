# Quy tắc cho dự án Quán Cà Phê Nhỏ

- **Đồng bộ tài liệu với mọi thay đổi.** Thay đổi tính năng, số liệu (`src/data.js`) hay cách chơi thì sửa `README.md` trong cùng commit, kèm chữ hướng dẫn trong game (thẻ chào mừng, bong bóng chỉ dẫn trong `runCoach`, mô tả trong Cài đặt). Bảng số liệu trong README phải khớp `src/data.js`.
- **Kiểm thử trước khi commit:** `npm test` phải đạt hết. Đổi cân bằng game thì xem lại mô phỏng 30 ngày trong output.
- **Commit:** tác giả chỉ ghi `namdp <namdp@ondigames.com>`, không thêm dòng Co-Authored-By. Đặt qua biến môi trường `GIT_AUTHOR_NAME/EMAIL`, `GIT_COMMITTER_NAME/EMAIL`, không sửa `.gitconfig`.
- **Đưa lên web:** đẩy lên GitHub (`origin`, nhánh `main`) là Vercel tự deploy lên https://happycoffeeshop.vercel.app, không chạy thêm `vercel deploy --prod` (sẽ ra hai bản deploy trùng). Sau khi push, kiểm tra bản mới bằng `npx vercel ls coffeeshop`. Không commit `.env.local` hay `.vercel/`.
