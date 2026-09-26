// Dữ liệu thuần: chuỗi quán, trạm pha, nâng cấp, nhiệm vụ, bố cục và cấu hình kinh tế.
// Mọi con số chỉnh cân bằng nằm ở đây; logic.js và kiểm thử đọc từ đây.

export const CFG = {
  growth: 1.16,              // mỗi cấp trạm đắt hơn cấp trước 16%
  maxLv: 100,
  milestones: [10, 25, 50, 75, 100], // mỗi mốc: tiền một ly của trạm ×2
  capAt: [25, 75],           // từ cấp này trạm có thêm một chỗ pha (2 rồi 3 người pha cùng lúc)
  walk: 2.1,                 // mét/giây
  queue: 3,                  // số khách đứng chờ ở quầy lúc đầu
  staff: 1,                  // số pha chế lúc đầu
  offlineCapH: 2,            // tiền lúc vắng mặt tính tối đa 2 giờ
  offlineMin: 60,            // vắng dưới 60 giây thì không hiện bảng tiền vắng mặt
  backupEvery: 300,          // giây chơi giữa hai bản dự phòng
};

// Bố cục quán tính bằng mét, dùng chung cho mô phỏng (logic.js) và cảnh 3D (scene.js).
// Trục z: khách ở phía âm, quầy trước ở z = frontZ, lối đi của nhân viên, quầy pha ở z = backZ.
export const LAYOUT = {
  door: [3.6, -4.4],
  custZ: -1.25,
  frontZ: -0.2,
  serveZ: 0.5,               // chỗ nhân viên đứng đưa ly qua quầy
  workZ: 1.2,                // chỗ nhân viên đứng pha trước trạm
  backZ: 2.0,
  stationX: [-2.2, -1.1, 0, 1.1, 2.2],
  spotDX: [0, -0.3, 0.3],  // chỗ đứng thứ 1, 2, 3 trước một trạm
  slotsX: { 3: [-1.5, 0, 1.5], 4: [-1.95, -0.65, 0.65, 1.95], 5: [-2.2, -1.1, 0, 1.1, 2.2] },
  staffHome: [0, -1.1, 1.1, -2.2, 2.2, -0.55, 0.55],
};

// Ba quán nối nhau. Mỗi quán: 5 trạm (mỗi trạm một món), danh sách nâng cấp mua một lần và danh sách
// nhiệm vụ. Nhận hết thưởng nhiệm vụ thì chuyển sang quán kế tiếp; tiền và trạm ở quán cũ để lại.
// Trạm: price = tiền một ly ở cấp 1, time = giây pha, unlock = giá mở, cost = giá lên cấp 2.
// Nâng cấp fx: staff (+người), walk (×tốc độ đi), prep (×tốc độ pha), spawn (×khách tới), queue (+chỗ chờ),
// profit (×tiền một ly, st = một trạm, danh sách trạm hoặc 'all').
export const SHOPS = [
  {
    id: 'gocpho', n: 'Góc Phố', d: 'Quán nhỏ đầu hẻm, bán cà phê cho người đi làm.',
    start: 6e4, gap: 2.6,
    theme: { floor: 0xc49a6c, plank: 0xb58a5e, wall: 0xf4dfc4, wainscot: 0x9c6b48, rug: 0x7fb7a4, chair: 0xe2574c, sky: 0xf3e3cc },
    stations: [
      { id: 'den',    n: 'Cà phê đen',  c: '#3b2314', ice: true,  prop: 'espresso', price: 5e3,   time: 2.6, unlock: 0,     cost: 2e4 },
      { id: 'sua',    n: 'Cà phê sữa',  c: '#8a5a3b', ice: true,  prop: 'can',      price: 3e4,   time: 3,   unlock: 2.4e6, cost: 3e5 },
      { id: 'bacxiu', n: 'Bạc xỉu',     c: '#c8a27a', ice: true,  prop: 'carton',   price: 1.8e5, time: 3.4, unlock: 1.4e7, cost: 1.8e6 },
      { id: 'trada',  n: 'Trà đá',      c: '#c98a3a', ice: true,  prop: 'icebin',   price: 1.1e6, time: 2.8, unlock: 8.8e7, cost: 1.1e7 },
      { id: 'ame',    n: 'Americano',   c: '#5a3520', ice: false, prop: 'kettle',   price: 6.5e6, time: 3.8, unlock: 5.2e8, cost: 6.5e7 },
    ],
    upgrades: [
      { id: 'staff2', n: 'Thuê pha chế thứ hai',      d: 'Thêm một người pha',               cost: 1.8e5, fx: 'staff' },
      { id: 'sign',   n: 'Biển hiệu đèn neon',        d: 'Khách tới nhiều hơn 30%',          cost: 1.8e6, fx: 'spawn', v: 1.3 },
      { id: 'shoes',  n: 'Giày thể thao cho quán',    d: 'Nhân viên đi nhanh hơn 30%',       cost: 4.5e6, fx: 'walk', v: 1.3 },
      { id: 'queue4', n: 'Kê thêm chỗ đứng',          d: 'Thêm một chỗ khách chờ ở quầy',    cost: 1.2e7, fx: 'queue' },
      { id: 'staff3', n: 'Thuê pha chế thứ ba',       d: 'Thêm một người pha',               cost: 3.6e7, fx: 'staff' },
      { id: 'beans',  n: 'Hạt Robusta Cầu Đất',       d: 'Cà phê đen bán gấp 3',             cost: 9e7,   fx: 'profit', st: 'den', v: 3 },
      { id: 'grind',  n: 'Máy xay chuyên nghiệp',     d: 'Pha nhanh hơn 30%',                cost: 1.5e8, fx: 'prep', v: 1.3 },
      { id: 'milk',   n: 'Sữa đặc loại ngon',         d: 'Cà phê sữa và bạc xỉu bán gấp 2',  cost: 3e8,   fx: 'profit', st: ['sua', 'bacxiu'], v: 2 },
      { id: 'queue5', n: 'Mái hiên che nắng',         d: 'Thêm một chỗ khách chờ ở quầy',    cost: 6e8,   fx: 'queue' },
      { id: 'staff4', n: 'Thuê pha chế thứ tư',       d: 'Thêm một người pha',               cost: 1e9,   fx: 'staff' },
    ],
    tasks: [
      { k: 'level', st: 'den', v: 5,     r: 3e4 },
      { k: 'upg', id: 'staff2',          r: 1e5 },
      { k: 'level', st: 'den', v: 10,    r: 3e5 },
      { k: 'unlock', st: 'sua',          r: 6e5 },
      { k: 'level', st: 'sua', v: 10,    r: 1.5e6 },
      { k: 'upg', id: 'sign',            r: 2e6 },
      { k: 'unlock', st: 'bacxiu',       r: 5e6 },
      { k: 'level', st: 'den', v: 25,    r: 1e7 },
      { k: 'upg', id: 'staff3',          r: 2e7 },
      { k: 'unlock', st: 'trada',        r: 4e7 },
      { k: 'level', st: 'bacxiu', v: 25, r: 1e8 },
      { k: 'unlock', st: 'ame',          r: 3e8 },
    ],
  },
  {
    id: 'sanvuon', n: 'Sân Vườn', d: 'Quán có giàn hoa giấy, khách ngồi lâu, gọi món cầu kỳ.',
    start: 3e6, gap: 2.4,
    theme: { floor: 0xa9b98a, plank: 0x93a577, wall: 0xf1ead2, wainscot: 0x6f8f5a, rug: 0xe8a07a, chair: 0x4fa883, sky: 0xe9f0d8 },
    stations: [
      { id: 'latte',   n: 'Latte',          c: '#d9b48a', ice: false, prop: 'pitcher',  price: 2e5,   time: 3,   unlock: 0,      cost: 8e5 },
      { id: 'muoi',    n: 'Cà phê muối',    c: '#b8875a', ice: true,  prop: 'cream',    price: 1.2e6, time: 3.2, unlock: 9.6e7,  cost: 1.2e7 },
      { id: 'tradao',  n: 'Trà đào',        c: '#f0a060', ice: true,  prop: 'syrup',    price: 7.2e6, time: 3.4, unlock: 5.8e8,  cost: 7.2e7 },
      { id: 'sinhto',  n: 'Sinh tố bơ',     c: '#9fc46a', ice: true,  prop: 'carton',   price: 4.3e7, time: 3.6, unlock: 3.5e9,  cost: 4.3e8 },
      { id: 'caramel', n: 'Caramel latte',  c: '#c9812c', ice: true,  prop: 'espresso', price: 2.6e8, time: 4,   unlock: 2.1e10, cost: 2.6e9 },
    ],
    upgrades: [
      { id: 'staff2', n: 'Thuê pha chế thứ hai',      d: 'Thêm một người pha',               cost: 6e6,    fx: 'staff' },
      { id: 'sign',   n: 'Cổng hoa giấy',             d: 'Khách tới nhiều hơn 30%',          cost: 7.5e7,  fx: 'spawn', v: 1.3 },
      { id: 'shoes',  n: 'Lối đi lát gạch',           d: 'Nhân viên đi nhanh hơn 30%',       cost: 1.8e8,  fx: 'walk', v: 1.3 },
      { id: 'staff3', n: 'Thuê pha chế thứ ba',       d: 'Thêm một người pha',               cost: 4.5e8,  fx: 'staff' },
      { id: 'queue4', n: 'Thêm ghế đá',               d: 'Thêm một chỗ khách chờ ở quầy',    cost: 9e8,    fx: 'queue' },
      { id: 'grind',  n: 'Máy pha hai vòi',           d: 'Pha nhanh hơn 30%',                cost: 3.6e9,  fx: 'prep', v: 1.3 },
      { id: 'peach',  n: 'Đào ngâm nhà làm',          d: 'Trà đào bán gấp 3',                cost: 9e9,    fx: 'profit', st: 'tradao', v: 3 },
      { id: 'staff4', n: 'Thuê pha chế thứ tư',       d: 'Thêm một người pha',               cost: 2.4e10, fx: 'staff' },
      { id: 'queue5', n: 'Mở thêm khoảnh sân',        d: 'Thêm một chỗ khách chờ ở quầy',    cost: 6e10,   fx: 'queue' },
      { id: 'music',  n: 'Nhạc acoustic cuối tuần',   d: 'Mọi món bán gấp 2',                cost: 1.8e11, fx: 'profit', st: 'all', v: 2 },
    ],
    tasks: [
      { k: 'level', st: 'latte', v: 10,    r: 3e6 },
      { k: 'upg', id: 'staff2',            r: 6e6 },
      { k: 'unlock', st: 'muoi',           r: 2e7 },
      { k: 'level', st: 'latte', v: 25,    r: 5e7 },
      { k: 'upg', id: 'sign',              r: 1e8 },
      { k: 'unlock', st: 'tradao',         r: 2.5e8 },
      { k: 'level', st: 'muoi', v: 25,     r: 6e8 },
      { k: 'upg', id: 'staff3',            r: 1e9 },
      { k: 'unlock', st: 'sinhto',         r: 2.5e9 },
      { k: 'level', st: 'tradao', v: 25,   r: 6e9 },
      { k: 'upg', id: 'grind',             r: 1e10 },
      { k: 'unlock', st: 'caramel',        r: 3e10 },
      { k: 'level', st: 'sinhto', v: 25,   r: 1e11 },
    ],
  },
  {
    id: 'phoco', n: 'Phố Cổ', d: 'Căn gác cũ giữa phố cổ, khách du lịch xếp hàng thử cà phê trứng.',
    start: 1.5e8, gap: 2.2,
    theme: { floor: 0x9a6b4f, plank: 0x87593f, wall: 0xf2d27a, wainscot: 0x7a3f2c, rug: 0xc23b30, chair: 0x2f5d8a, sky: 0xf6e3b4 },
    stations: [
      { id: 'trung',    n: 'Cà phê trứng',   c: '#e2b86a', ice: false, prop: 'cream',    price: 1e7,    time: 3.2, unlock: 0,       cost: 4e7 },
      { id: 'cotdua',   n: 'Cà phê cốt dừa', c: '#efe3cf', ice: true,  prop: 'can',      price: 6e7,    time: 3.2, unlock: 4.8e9,   cost: 6e8 },
      { id: 'coldbrew', n: 'Cold brew',      c: '#4a2a18', ice: true,  prop: 'kettle',   price: 3.6e8,  time: 3.4, unlock: 2.9e10,  cost: 3.6e9 },
      { id: 'capu',     n: 'Cappuccino',     c: '#c9a27c', ice: false, prop: 'pitcher',  price: 2.2e9,  time: 3.8, unlock: 1.7e11,  cost: 2.2e10 },
      { id: 'mocha',    n: 'Mocha sô-cô-la', c: '#6b3a24', ice: false, prop: 'espresso', price: 1.3e10, time: 4.2, unlock: 1e12,    cost: 1.3e11 },
    ],
    upgrades: [
      { id: 'staff2', n: 'Thuê pha chế thứ hai',      d: 'Thêm một người pha',               cost: 3e8,    fx: 'staff' },
      { id: 'sign',   n: 'Đèn lồng Hội An',           d: 'Khách tới nhiều hơn 30%',          cost: 3.6e9,  fx: 'spawn', v: 1.3 },
      { id: 'shoes',  n: 'Cầu thang mới',             d: 'Nhân viên đi nhanh hơn 30%',       cost: 9e9,    fx: 'walk', v: 1.3 },
      { id: 'staff3', n: 'Thuê pha chế thứ ba',       d: 'Thêm một người pha',               cost: 2.4e10, fx: 'staff' },
      { id: 'queue4', n: 'Ghế đẩu vỉa hè',            d: 'Thêm một chỗ khách chờ ở quầy',    cost: 4.5e10, fx: 'queue' },
      { id: 'egg',    n: 'Trứng gà ta',               d: 'Cà phê trứng bán gấp 3',           cost: 1.5e11, fx: 'profit', st: 'trung', v: 3 },
      { id: 'grind',  n: 'Máy rang tại chỗ',          d: 'Pha nhanh hơn 30%',                cost: 4.5e11, fx: 'prep', v: 1.3 },
      { id: 'staff4', n: 'Thuê pha chế thứ tư',       d: 'Thêm một người pha',               cost: 1.2e12, fx: 'staff' },
      { id: 'queue5', n: 'Mở tầng hai',               d: 'Thêm một chỗ khách chờ ở quầy',    cost: 3e12,   fx: 'queue' },
      { id: 'guide',  n: 'Lên sách hướng dẫn du lịch', d: 'Mọi món bán gấp 2',               cost: 9e12,   fx: 'profit', st: 'all', v: 2 },
    ],
    tasks: [
      { k: 'level', st: 'trung', v: 10,    r: 1.5e8 },
      { k: 'upg', id: 'staff2',            r: 3e8 },
      { k: 'unlock', st: 'cotdua',         r: 1e9 },
      { k: 'level', st: 'trung', v: 25,    r: 2.5e9 },
      { k: 'upg', id: 'sign',              r: 5e9 },
      { k: 'unlock', st: 'coldbrew',       r: 1.2e10 },
      { k: 'level', st: 'cotdua', v: 25,   r: 3e10 },
      { k: 'upg', id: 'staff3',            r: 5e10 },
      { k: 'unlock', st: 'capu',           r: 1.2e11 },
      { k: 'level', st: 'coldbrew', v: 25, r: 3e11 },
      { k: 'upg', id: 'grind',             r: 5e11 },
      { k: 'unlock', st: 'mocha',          r: 1.5e12 },
      { k: 'level', st: 'capu', v: 25,     r: 5e12 },
      { k: 'level', st: 'trung', v: 50,    r: 1e13 },
    ],
  },
];
