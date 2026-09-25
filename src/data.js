// Dữ liệu thuần: nguyên liệu, công thức, nâng cấp, sự kiện, cấu hình kinh tế.

export const ING = {
  cup:       { n: 'Ly + nắp',     cost: 1500, life: 0,  pack: 10 },
  beans:     { n: 'Cà phê hạt',   cost: 3000, life: 0,  pack: 10 },
  condensed: { n: 'Sữa đặc',      cost: 1500, life: 14, pack: 10 },
  milk:      { n: 'Sữa tươi',     cost: 2500, life: 3,  pack: 10 },
  ice:       { n: 'Đá viên',      cost: 300,  life: 1,  pack: 10 },
  caramel:   { n: 'Siro caramel', cost: 2000, life: 0,  pack: 10 },
  saltcream: { n: 'Kem muối',     cost: 3000, life: 2,  pack: 10 },
};

// Thành phần người chơi bỏ vào ly -> nguyên liệu bị trừ trong kho.
export const COMP = {
  shot:      { n: 'Espresso',     s: 'Shot',     ing: 'beans',     color: 0x3b2314, h: 0.26 },
  condensed: { n: 'Sữa đặc',      s: 'Sữa đặc',  ing: 'condensed', color: 0xf3e2b8, h: 0.10 },
  milk:      { n: 'Sữa tươi',     s: 'Sữa',      ing: 'milk',      color: 0xfbf7ee, h: 0.30 },
  steam:     { n: 'Sữa đánh nóng',s: 'Sữa nóng', ing: 'milk',      color: 0xe9d3b0, h: 0.32 },
  water:     { n: 'Nước nóng',    s: 'Nước',     ing: null,        color: 0x7a4a2a, h: 0.32 },
  caramel:   { n: 'Siro caramel', s: 'Caramel',  ing: 'caramel',   color: 0xc9812c, h: 0.07 },
  saltcream: { n: 'Kem muối',     s: 'Kem muối', ing: 'saltcream', color: 0xfff6e6, h: 0.12 },
};

export const DRINKS = {
  den:       { n: 'Cà phê đen',   s: 'Đen',       c: '#3b2314', comps: ['shot'],                           price: 20000, unlock: 0,      temps: ['iced', 'hot'] },
  sua:       { n: 'Cà phê sữa',   s: 'Cà phê sữa', c: '#8a5a3b', comps: ['shot', 'condensed'],             price: 25000, unlock: 0,      temps: ['iced', 'hot'] },
  bacxiu:    { n: 'Bạc xỉu',      s: 'Bạc xỉu',   c: '#c8a27a', comps: ['shot', 'condensed', 'milk'],     price: 29000, unlock: 150000, temps: ['iced'] },
  americano: { n: 'Americano',    s: 'Americano', c: '#5a3520', comps: ['shot', 'water'],                  price: 30000, unlock: 200000, temps: ['hot', 'iced'] },
  latte:     { n: 'Latte',        s: 'Latte',     c: '#d9b48a', comps: ['shot', 'steam'],                  price: 39000, unlock: 350000, temps: ['hot', 'iced'] },
  muoi:      { n: 'Cà phê muối',  s: 'Cà phê muối', c: '#b8875a', comps: ['shot', 'condensed', 'saltcream'], price: 35000, unlock: 450000, temps: ['iced'] },
  caramel:   { n: 'Caramel latte', s: 'Caramel',  c: '#c9812c', comps: ['shot', 'steam', 'caramel'],       price: 45000, unlock: 600000, temps: ['iced', 'hot'] },
};

export const UPG = [
  { id: 'sign',    n: 'Biển hiệu đèn neon', d: 'Thêm 20% khách ghé quán',                 cost: 400000 },
  { id: 'seats',   n: 'Bàn ghế ngồi lại',   d: 'Khách chịu chờ lâu hơn 25%',              cost: 500000 },
  { id: 'grinder', n: 'Máy xay chuyên nghiệp', d: 'Chiết espresso nhanh hơn 30%, vùng chuẩn rộng hơn', cost: 700000 },
  { id: 'slot4',   n: 'Mở rộng quầy',       d: 'Phục vụ cùng lúc 4 khách',                cost: 800000 },
];

export const EVENTS = {
  weekend: { n: 'Cuối tuần',        d: 'Khách đông hơn 25%',                     mul: 1.25 },
  holiday: { n: 'Ngày lễ',          d: 'Khách đông gấp rưỡi, tip gấp đôi',        mul: 1.5, tip: 2 },
  hot:     { n: 'Trời nắng gắt',    d: 'Khách đông hơn 20%, hầu hết gọi đá',      mul: 1.2 },
  rain:    { n: 'Trời mưa',         d: 'Khách ít hơn 25%, nhiều người gọi nóng',  mul: 0.75 },
  trend:   { n: 'Món hot trên mạng',d: '% được gọi nhiều gấp đôi',                mul: 1.1 },
  sale:    { n: 'Nhà cung cấp giảm giá', d: 'Nhập % rẻ hơn 30% hôm nay',          mul: 1 },
};

export const CFG = {
  startMoney: 300000,
  dayMinutes: 3,          // phút thật cho một ngày bán 7:00–22:00
  openHour: 7, closeHour: 22,
  rent: 40000,
  utilBase: 20000,
  utilPerUpg: 8000,
  sizeL: 5000,            // phụ thu size L gợi ý
  sizeLMax: 20000,
  priceMaxMul: 2.5,       // giá bán tối đa so với giá gợi ý
  levels: { l2: 4, l3: 10 },
  patience: 50,           // giây chờ gốc
  shot: { rate: 0.42, lo: 0.62, hi: 0.86, spill: 1.12 },
  reviewWindow: 30,
};

export const FIRST = ['An', 'Bảo', 'Chi', 'Dũng', 'Giang', 'Hà', 'Hải', 'Hân', 'Hùng', 'Khang', 'Khoa', 'Lan', 'Linh', 'Long', 'Mai', 'Minh', 'My', 'Nam', 'Ngân', 'Ngọc', 'Nhi', 'Phong', 'Phúc', 'Quân', 'Quỳnh', 'Sơn', 'Tâm', 'Thảo', 'Thư', 'Trang', 'Trí', 'Tú', 'Tuấn', 'Uyên', 'Vy', 'Yến'];

export const REVIEW = {
  great:   ['Cà phê đậm vừa, uống là tỉnh cả người', 'Pha nhanh mà ngon, sẽ quay lại', 'Quán dễ thương, cà phê thơm', 'Đúng vị mình thích, 10 điểm', 'Barista tay nghề cứng thật', 'Ly nào cũng chuẩn, ghiền rồi'],
  ok:      ['Ổn áp, không có gì để chê', 'Uống được, giá hợp lý', 'Cà phê ngon, chờ hơi lâu xíu', 'Tạm ổn, lần sau thử món khác'],
  wait:    ['Chờ lâu quá, suýt trễ làm', 'Đông mà pha chậm, đứng mỏi chân', 'Ngon nhưng đợi lâu quá trời'],
  weak:    ['Shot hơi nhạt, uống như nước', 'Cà phê hơi đắng khét', 'Espresso chưa chuẩn lắm'],
  wrong:   ['Gọi một đằng ra một nẻo', 'Làm sai món mình dặn', 'Nhầm món, phải chờ làm lại'],
  pricey:  ['Giá hơi chát so với ly cà phê', 'Đắt quá, quán khác rẻ hơn nhiều', 'Ngon nhưng giá không hợp túi tiền'],
  cheap:   ['Giá sinh viên mà ngon bất ngờ', 'Rẻ mà chất lượng, hời quá', 'Giá mềm, uống mỗi ngày được'],
  timeout: ['Đợi mãi không tới lượt, bỏ về', 'Quán bỏ mặc khách, không quay lại', 'Chờ quá lâu nên đi quán khác'],
  soldout: ['Hết món mình muốn, tiếc ghê', 'Tới nơi thì hết hàng', 'Quán nên chuẩn bị nhiều hàng hơn'],
};
