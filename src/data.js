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

// Bố cục quán tính bằng mét, dùng chung cho mô phỏng (logic.js) và cảnh 3D (scene.js). Máy quay ở phía +z nhìn vào:
// khách đứng gần máy quay (z dương), quầy đưa ly ở giữa, gấu đứng sau quầy mặt hướng ra khách,
// trạm pha trên quầy sát tường (z âm), mặt máy cũng quay ra phía khách.
export const LAYOUT = {
  door: [3.9, 5.2],          // khách vào và ra từ mép dưới màn hình
  custZ: 1.0,
  frontZ: 0.1,
  serveZ: -0.7,              // chỗ gấu đứng đưa ly qua quầy
  workZ: -1.35,              // chỗ gấu đứng pha trước trạm
  backZ: -2.2,
  stationX: [-2.2, -1.1, 0, 1.1, 2.2],
  spotDX: [0, -0.3, 0.3],    // chỗ đứng thứ 1, 2, 3 trước một trạm
  slotsX: { 3: [-1.5, 0, 1.5], 4: [-1.95, -0.65, 0.65, 1.95], 5: [-2.2, -1.1, 0, 1.1, 2.2] },
  staffHome: [0, -1.1, 1.1, -2.2, 2.2, -0.55, 0.55],
};

// Nhân viên là các bạn gấu, vào ca theo thứ tự này (bạn đầu có sẵn, ba bạn sau thuê bằng nâng cấp).
export const BEARS = [
  { id: 'brown', n: 'Gấu Nâu',  d: 'Đội mũ lưỡi trai đỏ, thích pha cà phê đậm' },
  { id: 'panda', n: 'Gấu Trúc', d: 'Cài nơ hồng, hay vẫy tay chào khách' },
  { id: 'white', n: 'Gấu Trắng', d: 'Quàng khăn xanh, ít nói mà pha rất nhanh' },
  { id: 'honey', n: 'Gấu Mật',  d: 'Cài lá trên đầu, lúc nào cũng tươi cười' },
];

// Ba quán nối nhau. Mỗi quán: 5 trạm (mỗi trạm một món), danh sách nâng cấp mua một lần và danh sách
// nhiệm vụ. Nhận hết thưởng nhiệm vụ thì chuyển sang quán kế tiếp; tiền và trạm ở quán cũ để lại.
// Trạm: price = tiền một ly ở cấp 1, time = giây pha, unlock = giá mở, cost = giá lên cấp 2.
// Nâng cấp fx: staff (+người), walk (×tốc độ đi), prep (×tốc độ pha), spawn (×khách tới), queue (+chỗ chờ),
// profit (×tiền một ly, st = một trạm, danh sách trạm hoặc 'all').
export const SHOPS = [
  {
    id: 'gocpho', n: 'Góc Phố', d: 'Quán vỉa hè đầu hẻm, ghế nhựa, xe máy qua lại, bán cà phê cho người đi làm.',
    start: 60, gap: 2.6,
    // Góc Phố là quán vỉa hè: dựng cảnh đường phố (street.js) thay cho phòng trong nhà.
    theme: { style: 'street', floor: 0xe6ddd2, plank: 0xd3c7b8, wall: 0xffd9b8, wainscot: 0xff8fa3, rug: 0xa8e0d1, chair: 0xff6b6b, sky: 0xcdeaf7, apron: 0xff8fa3, flags: [0xff8fa3, 0xffd166, 0x8fd3c1, 0xa0c4ff] },
    stations: [
      { id: 'den',    n: 'Cà phê đen',  c: '#3b2314', ice: true,  prop: 'espresso', price: 5,   time: 2.6, unlock: 0,     cost: 20 },
      { id: 'sua',    n: 'Cà phê sữa',  c: '#8a5a3b', ice: true,  prop: 'can',      price: 30,   time: 3,   unlock: 2400, cost: 300 },
      { id: 'bacxiu', n: 'Bạc xỉu',     c: '#c8a27a', ice: true,  prop: 'carton',   price: 180, time: 3.4, unlock: 14000, cost: 1800 },
      { id: 'trada',  n: 'Trà đá',      c: '#c98a3a', ice: true,  prop: 'icebin',   price: 1100, time: 2.8, unlock: 88000, cost: 11000 },
      { id: 'ame',    n: 'Americano',   c: '#5a3520', ice: false, prop: 'kettle',   price: 6500, time: 3.8, unlock: 5.2e5, cost: 65000 },
    ],
    upgrades: [
      { id: 'staff2', n: 'Thuê Gấu Trúc',           d: 'Thêm một bạn gấu pha chế',               cost: 180, fx: 'staff' },
      { id: 'sign',   n: 'Biển hiệu đèn neon',        d: 'Khách tới nhiều hơn 30%',          cost: 1800, fx: 'spawn', v: 1.3 },
      { id: 'shoes',  n: 'Giày thể thao cho quán',    d: 'Nhân viên đi nhanh hơn 30%',       cost: 4500, fx: 'walk', v: 1.3 },
      { id: 'queue4', n: 'Kê thêm chỗ đứng',          d: 'Thêm một chỗ khách chờ ở quầy',    cost: 12000, fx: 'queue' },
      { id: 'staff3', n: 'Thuê Gấu Trắng',          d: 'Thêm một bạn gấu pha chế',               cost: 36000, fx: 'staff' },
      { id: 'beans',  n: 'Hạt Robusta Cầu Đất',       d: 'Cà phê đen bán gấp 3',             cost: 90000,   fx: 'profit', st: 'den', v: 3 },
      { id: 'grind',  n: 'Máy xay chuyên nghiệp',     d: 'Pha nhanh hơn 30%',                cost: 1.5e5, fx: 'prep', v: 1.3 },
      { id: 'milk',   n: 'Sữa đặc loại ngon',         d: 'Cà phê sữa và bạc xỉu bán gấp 2',  cost: 3e5,   fx: 'profit', st: ['sua', 'bacxiu'], v: 2 },
      { id: 'queue5', n: 'Mái hiên che nắng',         d: 'Thêm một chỗ khách chờ ở quầy',    cost: 6e5,   fx: 'queue' },
      { id: 'staff4', n: 'Thuê Gấu Mật',            d: 'Thêm một bạn gấu pha chế',               cost: 1e6,   fx: 'staff' },
    ],
    tasks: [
      { k: 'level', st: 'den', v: 5,     r: 30 },
      { k: 'upg', id: 'staff2',          r: 100 },
      { k: 'level', st: 'den', v: 10,    r: 300 },
      { k: 'unlock', st: 'sua',          r: 600 },
      { k: 'level', st: 'sua', v: 10,    r: 1500 },
      { k: 'upg', id: 'sign',            r: 2000 },
      { k: 'unlock', st: 'bacxiu',       r: 5000 },
      { k: 'level', st: 'den', v: 25,    r: 10000 },
      { k: 'upg', id: 'staff3',          r: 20000 },
      { k: 'unlock', st: 'trada',        r: 40000 },
      { k: 'level', st: 'bacxiu', v: 25, r: 1e5 },
      { k: 'unlock', st: 'ame',          r: 3e5 },
    ],
  },
  {
    id: 'sanvuon', n: 'Sân Vườn', d: 'Quán có giàn hoa giấy, khách ngồi lâu, gọi món cầu kỳ.',
    start: 3000, gap: 2.4,
    theme: { floor: 0xcfe3b0, plank: 0xbdd49c, wall: 0xf6fbea, wainscot: 0x9ed39a, rug: 0xffd0a8, chair: 0x8fd3c1, sky: 0xeaf6d8, apron: 0x7cc79a, flags: [0xffd0a8, 0xffffff, 0x9ed39a, 0xffb3c1] },
    stations: [
      { id: 'latte',   n: 'Latte',          c: '#d9b48a', ice: false, prop: 'pitcher',  price: 200,   time: 3,   unlock: 0,      cost: 800 },
      { id: 'muoi',    n: 'Cà phê muối',    c: '#b8875a', ice: true,  prop: 'cream',    price: 1200, time: 3.2, unlock: 96000,  cost: 12000 },
      { id: 'tradao',  n: 'Trà đào',        c: '#f0a060', ice: true,  prop: 'syrup',    price: 7200, time: 3.4, unlock: 5.8e5,  cost: 72000 },
      { id: 'sinhto',  n: 'Sinh tố bơ',     c: '#9fc46a', ice: true,  prop: 'carton',   price: 43000, time: 3.6, unlock: 3.5e6,  cost: 4.3e5 },
      { id: 'caramel', n: 'Caramel latte',  c: '#c9812c', ice: true,  prop: 'espresso', price: 2.6e5, time: 4,   unlock: 2.1e7, cost: 2.6e6 },
    ],
    upgrades: [
      { id: 'staff2', n: 'Thuê Gấu Trúc',           d: 'Thêm một bạn gấu pha chế',               cost: 6000,    fx: 'staff' },
      { id: 'sign',   n: 'Cổng hoa giấy',             d: 'Khách tới nhiều hơn 30%',          cost: 75000,  fx: 'spawn', v: 1.3 },
      { id: 'shoes',  n: 'Lối đi lát gạch',           d: 'Nhân viên đi nhanh hơn 30%',       cost: 1.8e5,  fx: 'walk', v: 1.3 },
      { id: 'staff3', n: 'Thuê Gấu Trắng',          d: 'Thêm một bạn gấu pha chế',               cost: 4.5e5,  fx: 'staff' },
      { id: 'queue4', n: 'Thêm ghế đá',               d: 'Thêm một chỗ khách chờ ở quầy',    cost: 9e5,    fx: 'queue' },
      { id: 'grind',  n: 'Máy pha hai vòi',           d: 'Pha nhanh hơn 30%',                cost: 3.6e6,  fx: 'prep', v: 1.3 },
      { id: 'peach',  n: 'Đào ngâm nhà làm',          d: 'Trà đào bán gấp 3',                cost: 9e6,    fx: 'profit', st: 'tradao', v: 3 },
      { id: 'staff4', n: 'Thuê Gấu Mật',            d: 'Thêm một bạn gấu pha chế',               cost: 2.4e7, fx: 'staff' },
      { id: 'queue5', n: 'Mở thêm khoảnh sân',        d: 'Thêm một chỗ khách chờ ở quầy',    cost: 6e7,   fx: 'queue' },
      { id: 'music',  n: 'Nhạc acoustic cuối tuần',   d: 'Mọi món bán gấp 2',                cost: 1.8e8, fx: 'profit', st: 'all', v: 2 },
    ],
    tasks: [
      { k: 'level', st: 'latte', v: 10,    r: 3000 },
      { k: 'upg', id: 'staff2',            r: 6000 },
      { k: 'unlock', st: 'muoi',           r: 20000 },
      { k: 'level', st: 'latte', v: 25,    r: 50000 },
      { k: 'upg', id: 'sign',              r: 1e5 },
      { k: 'unlock', st: 'tradao',         r: 2.5e5 },
      { k: 'level', st: 'muoi', v: 25,     r: 6e5 },
      { k: 'upg', id: 'staff3',            r: 1e6 },
      { k: 'unlock', st: 'sinhto',         r: 2.5e6 },
      { k: 'level', st: 'tradao', v: 25,   r: 6e6 },
      { k: 'upg', id: 'grind',             r: 1e7 },
      { k: 'unlock', st: 'caramel',        r: 3e7 },
      { k: 'level', st: 'sinhto', v: 25,   r: 1e8 },
    ],
  },
  {
    id: 'phoco', n: 'Phố Cổ', d: 'Căn gác cũ giữa phố cổ, khách du lịch xếp hàng thử cà phê trứng.',
    start: 1.5e5, gap: 2.2,
    theme: { floor: 0xe0b58f, plank: 0xd1a37c, wall: 0xfff0b8, wainscot: 0xf29e7c, rug: 0xffc6d9, chair: 0x9cc5f0, sky: 0xfff1cf, apron: 0xf29e7c, flags: [0xff6b6b, 0xffd166, 0xffffff, 0x9cc5f0] },
    stations: [
      { id: 'trung',    n: 'Cà phê trứng',   c: '#e2b86a', ice: false, prop: 'cream',    price: 10000,    time: 3.2, unlock: 0,       cost: 40000 },
      { id: 'cotdua',   n: 'Cà phê cốt dừa', c: '#efe3cf', ice: true,  prop: 'can',      price: 60000,    time: 3.2, unlock: 4.8e6,   cost: 6e5 },
      { id: 'coldbrew', n: 'Cold brew',      c: '#4a2a18', ice: true,  prop: 'kettle',   price: 3.6e5,  time: 3.4, unlock: 2.9e7,  cost: 3.6e6 },
      { id: 'capu',     n: 'Cappuccino',     c: '#c9a27c', ice: false, prop: 'pitcher',  price: 2.2e6,  time: 3.8, unlock: 1.7e8,  cost: 2.2e7 },
      { id: 'mocha',    n: 'Mocha sô-cô-la', c: '#6b3a24', ice: false, prop: 'espresso', price: 1.3e7, time: 4.2, unlock: 1e9,    cost: 1.3e8 },
    ],
    upgrades: [
      { id: 'staff2', n: 'Thuê Gấu Trúc',           d: 'Thêm một bạn gấu pha chế',               cost: 3e5,    fx: 'staff' },
      { id: 'sign',   n: 'Đèn lồng Hội An',           d: 'Khách tới nhiều hơn 30%',          cost: 3.6e6,  fx: 'spawn', v: 1.3 },
      { id: 'shoes',  n: 'Cầu thang mới',             d: 'Nhân viên đi nhanh hơn 30%',       cost: 9e6,    fx: 'walk', v: 1.3 },
      { id: 'staff3', n: 'Thuê Gấu Trắng',          d: 'Thêm một bạn gấu pha chế',               cost: 2.4e7, fx: 'staff' },
      { id: 'queue4', n: 'Ghế đẩu vỉa hè',            d: 'Thêm một chỗ khách chờ ở quầy',    cost: 4.5e7, fx: 'queue' },
      { id: 'egg',    n: 'Trứng gà ta',               d: 'Cà phê trứng bán gấp 3',           cost: 1.5e8, fx: 'profit', st: 'trung', v: 3 },
      { id: 'grind',  n: 'Máy rang tại chỗ',          d: 'Pha nhanh hơn 30%',                cost: 4.5e8, fx: 'prep', v: 1.3 },
      { id: 'staff4', n: 'Thuê Gấu Mật',            d: 'Thêm một bạn gấu pha chế',               cost: 1.2e9, fx: 'staff' },
      { id: 'queue5', n: 'Mở tầng hai',               d: 'Thêm một chỗ khách chờ ở quầy',    cost: 3e9,   fx: 'queue' },
      { id: 'guide',  n: 'Lên sách hướng dẫn du lịch', d: 'Mọi món bán gấp 2',               cost: 9e9,   fx: 'profit', st: 'all', v: 2 },
    ],
    tasks: [
      { k: 'level', st: 'trung', v: 10,    r: 1.5e5 },
      { k: 'upg', id: 'staff2',            r: 3e5 },
      { k: 'unlock', st: 'cotdua',         r: 1e6 },
      { k: 'level', st: 'trung', v: 25,    r: 2.5e6 },
      { k: 'upg', id: 'sign',              r: 5e6 },
      { k: 'unlock', st: 'coldbrew',       r: 1.2e7 },
      { k: 'level', st: 'cotdua', v: 25,   r: 3e7 },
      { k: 'upg', id: 'staff3',            r: 5e7 },
      { k: 'unlock', st: 'capu',           r: 1.2e8 },
      { k: 'level', st: 'coldbrew', v: 25, r: 3e8 },
      { k: 'upg', id: 'grind',             r: 5e8 },
      { k: 'unlock', st: 'mocha',          r: 1.5e9 },
      { k: 'level', st: 'capu', v: 25,     r: 5e9 },
      { k: 'level', st: 'trung', v: 50,    r: 1e10 },
    ],
  },
];
