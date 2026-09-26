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
  // kim cương: tiền giữ qua mọi chi nhánh, dùng ở Kho báu
  gemsPerStar: 1,            // mỗi mốc cấp của trạm
  gemsPerTask: 1,            // mỗi lần nhận thưởng nhiệm vụ
  gemsMove: 5,               // mỗi lần chuyển sang chi nhánh mới
  boost: { mul: 2, dur: 180, cd: 420 },                           // tăng tốc: tiền ×2 trong 3 phút, hồi 7 phút
  // khách VIP: khoảng 1,5–2,5 phút một người. Tới quầy thì chờ người chơi tự tay rót ly trong wait giây,
  // quá giờ thì gấu pha giúp với giá auto. Rót: giữ pour giây thì đầy ly; band = bề rộng vùng ngon,
  // gold = bề rộng vạch vàng (tỷ lệ chiều cao ly); q = tiền và kim cương theo hạng rót.
  vip: {
    every: [90, 150], wait: 25, pour: 1.6, band: 0.26, gold: 0.09,
    q: { perfect: { mul: 10, gems: 2 }, good: { mul: 5, gems: 1 }, miss: { mul: 2, gems: 0 } },
    auto: { mul: 2, gems: 0 },
  },
  hot: { every: [80, 140], dur: 45, mul: 2, share: 0.5 },         // món hot: 45 giây, nửa số khách gọi món này
};

// Tính năng mở dần theo tiến độ (skill liveops-retention): người mới chỉ thấy vòng chơi chính.
// tasks = số nhiệm vụ đã nhận ở chi nhánh đầu, stations = số trạm đang mở; từ chi nhánh thứ hai mọi thứ đã mở.
export const FEATURES = {
  boost: { n: 'Tăng tốc ×2', d: 'Bấm nút tăng tốc: mọi món bán gấp đôi trong 3 phút, miễn phí.', tasks: 2 },
  hot:   { n: 'Món hot', d: 'Thỉnh thoảng một món thành món hot: khách gọi nhiều hơn và trả gấp đôi.', stations: 2 },
  vip:   { n: 'Khách VIP', d: 'Khách đội vương miện thỉnh thoảng ghé và ngồi ở bàn VIP riêng. Chạm vào khách rồi tự tay rót: trúng vạch vàng thì tiền gấp nhiều lần, kèm kim cương.', tasks: 5 },
  vault: { n: 'Kho báu', d: 'Dùng kim cương mua buff vĩnh viễn, giữ qua mọi chi nhánh.', gems: 1 },
};

// Kho báu: buff vĩnh viễn mua bằng kim cương, giữ qua mọi chi nhánh. per = tác dụng mỗi cấp.
export const VAULT = [
  { id: 'profit',  n: 'Công thức bí truyền', d: 'Mọi món bán thêm 10% mỗi cấp',                  max: 5, per: 0.1 },
  { id: 'walk',    n: 'Giày êm cho gấu',     d: 'Gấu đi nhanh hơn 10% mỗi cấp',                   max: 5, per: 0.1 },
  { id: 'prep',    n: 'Tay nghề lão luyện',  d: 'Pha nhanh hơn 10% mỗi cấp',                      max: 5, per: 0.1 },
  { id: 'spawn',   n: 'Khách quen',          d: 'Khách tới đông hơn 10% mỗi cấp',                 max: 5, per: 0.1 },
  { id: 'offline', n: 'Két sắt lớn',         d: 'Tiền lúc vắng mặt tính thêm 1 giờ mỗi cấp',      max: 4, per: 1 },
  { id: 'boost',   n: 'Cà phê đậm đặc',      d: 'Tăng tốc kéo dài thêm 1 phút mỗi cấp',           max: 3, per: 60 },
  { id: 'vip',     n: 'Thẻ thành viên',      d: 'Khách VIP ghé thường hơn 25% mỗi cấp',           max: 3, per: 0.25 },
  { id: 'start',   n: 'Vốn khởi nghiệp',     d: 'Chi nhánh mới bắt đầu với thêm 50% vốn mỗi cấp', max: 3, per: 0.5 },
];
export const VAULT_COST = [5, 10, 20, 40, 80];   // kim cương cho cấp 1, 2, 3…

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
  vipSpot: [-2.0, 1.8],      // ghế ở bàn VIP (góc trái dưới, trong khung máy quay dọc, tránh lối khách đi từ cửa vào quầy)
  vipFace: 0.7,              // hướng ngồi: quay về phía bàn và người chơi để thấy rõ vương miện
  staffHome: [0, -1.1, 1.1, -2.2, 2.2, -0.55, 0.55],
};

// Nhân viên là các bạn gấu, vào ca theo thứ tự này (bạn đầu có sẵn, ba bạn sau thuê bằng nâng cấp).
export const BEARS = [
  { id: 'brown', n: 'Gấu Nâu',  d: 'Đội mũ lưỡi trai đỏ, thích pha cà phê đậm' },
  { id: 'panda', n: 'Gấu Trúc', d: 'Cài nơ hồng, hay vẫy tay chào khách' },
  { id: 'white', n: 'Gấu Trắng', d: 'Quàng khăn xanh, ít nói mà pha rất nhanh' },
  { id: 'honey', n: 'Gấu Mật',  d: 'Cài lá trên đầu, lúc nào cũng tươi cười' },
];

// Năm chi nhánh nối nhau. Mỗi chi nhánh: 5 trạm (mỗi trạm một món), danh sách nâng cấp mua một lần và danh sách
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
      { k: 'served', v: 120,             r: 3000 },
      { k: 'unlock', st: 'bacxiu',       r: 5000 },
      { k: 'level', st: 'den', v: 25,    r: 10000 },
      { k: 'upg', id: 'staff3',          r: 20000 },
      { k: 'unlock', st: 'trada',        r: 40000 },
      { k: 'level', st: 'bacxiu', v: 25, r: 1e5 },
      { k: 'unlock', st: 'ame',          r: 3e5 },
      { k: 'served', v: 400,             r: 5e5 },
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
      { k: 'served', v: 150,               r: 1.5e5 },
      { k: 'unlock', st: 'tradao',         r: 2.5e5 },
      { k: 'level', st: 'muoi', v: 25,     r: 6e5 },
      { k: 'upg', id: 'staff3',            r: 1e6 },
      { k: 'unlock', st: 'sinhto',         r: 2.5e6 },
      { k: 'level', st: 'tradao', v: 25,   r: 6e6 },
      { k: 'upg', id: 'grind',             r: 1e7 },
      { k: 'unlock', st: 'caramel',        r: 3e7 },
      { k: 'level', st: 'sinhto', v: 25,   r: 1e8 },
      { k: 'served', v: 360,               r: 1.5e8 },
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
      { k: 'served', v: 180,               r: 8e6 },
      { k: 'unlock', st: 'coldbrew',       r: 1.2e7 },
      { k: 'level', st: 'cotdua', v: 25,   r: 3e7 },
      { k: 'upg', id: 'staff3',            r: 5e7 },
      { k: 'unlock', st: 'capu',           r: 1.2e8 },
      { k: 'level', st: 'coldbrew', v: 25, r: 3e8 },
      { k: 'upg', id: 'grind',             r: 5e8 },
      { k: 'unlock', st: 'mocha',          r: 1.5e9 },
      { k: 'level', st: 'capu', v: 25,     r: 5e9 },
      { k: 'level', st: 'trung', v: 50,    r: 1e10 },
      { k: 'served', v: 450,               r: 1.5e10 },
    ],
  },
  {
    id: 'rooftop', n: 'Rooftop Sài Gòn', d: 'Sân thượng lúc hoàng hôn, dây đèn lấp lánh, nhìn ra cả thành phố.',
    start: 7.5e6, gap: 2.1,
    // sân thượng ngoài trời: dựng cảnh riêng (rooftop.js), trời hoàng hôn, lan can kính, nhà cao tầng phía xa
    theme: { style: 'rooftop', floor: 0xc9a27e, plank: 0xb38b66, wall: 0xffffff, wainscot: 0xffb3c1, rug: 0xa0c4ff, chair: 0xffd166, sky: 0xf7c4b0, apron: 0x9b6bd1, flags: [0xffd166, 0xff8fa3, 0xa0c4ff, 0xffffff] },
    stations: [
      { id: 'tonic',    n: 'Espresso tonic',     c: '#c98a3a', ice: true,  prop: 'espresso', price: 5e5,   time: 3.2, unlock: 0,       cost: 2e6 },
      { id: 'matcha',   n: 'Matcha latte',       c: '#8fbf6a', ice: true,  prop: 'pitcher',  price: 3e6,   time: 3.2, unlock: 2.4e8,   cost: 3e7 },
      { id: 'duaxay',   n: 'Cà phê dừa đá xay',  c: '#efe3cf', ice: true,  prop: 'icebin',   price: 1.8e7, time: 3.4, unlock: 1.45e9,  cost: 1.8e8 },
      { id: 'camsa',    n: 'Cold brew cam sả',   c: '#e8912f', ice: true,  prop: 'kettle',   price: 1.1e8, time: 3.8, unlock: 8.5e9,   cost: 1.1e9 },
      { id: 'affogato', n: 'Affogato kem vani',  c: '#f3e2b8', ice: false, prop: 'cream',    price: 6.5e8, time: 4.2, unlock: 5e10,    cost: 6.5e9 },
    ],
    upgrades: [
      { id: 'staff2', n: 'Thuê Gấu Trúc',            d: 'Thêm một bạn gấu pha chế',          cost: 1.5e7,   fx: 'staff' },
      { id: 'sign',   n: 'Dây đèn lấp lánh',         d: 'Khách tới nhiều hơn 30%',           cost: 1.8e8,   fx: 'spawn', v: 1.3 },
      { id: 'shoes',  n: 'Thang máy riêng',          d: 'Nhân viên đi nhanh hơn 30%',        cost: 4.5e8,   fx: 'walk', v: 1.3 },
      { id: 'staff3', n: 'Thuê Gấu Trắng',           d: 'Thêm một bạn gấu pha chế',          cost: 1.2e9,   fx: 'staff' },
      { id: 'queue4', n: 'Ghế lười ngắm cảnh',       d: 'Thêm một chỗ khách chờ ở quầy',     cost: 2.25e9,  fx: 'queue' },
      { id: 'tonicw', n: 'Nước tonic nhập khẩu',     d: 'Espresso tonic bán gấp 3',          cost: 7.5e9,   fx: 'profit', st: 'tonic', v: 3 },
      { id: 'grind',  n: 'Máy pha đôi chuyên nghiệp', d: 'Pha nhanh hơn 30%',                cost: 2.25e10, fx: 'prep', v: 1.3 },
      { id: 'staff4', n: 'Thuê Gấu Mật',             d: 'Thêm một bạn gấu pha chế',          cost: 6e10,    fx: 'staff' },
      { id: 'queue5', n: 'Mở thêm góc ngắm cảnh',    d: 'Thêm một chỗ khách chờ ở quầy',     cost: 1.5e11,  fx: 'queue' },
      { id: 'dj',     n: 'DJ chơi nhạc hoàng hôn',   d: 'Mọi món bán gấp 2',                 cost: 4.5e11,  fx: 'profit', st: 'all', v: 2 },
    ],
    tasks: [
      { k: 'level', st: 'tonic', v: 10,     r: 7.5e6 },
      { k: 'upg', id: 'staff2',             r: 1.5e7 },
      { k: 'unlock', st: 'matcha',          r: 5e7 },
      { k: 'level', st: 'tonic', v: 25,     r: 1.25e8 },
      { k: 'upg', id: 'sign',               r: 2.5e8 },
      { k: 'served', v: 200,                r: 4e8 },
      { k: 'unlock', st: 'duaxay',          r: 6e8 },
      { k: 'level', st: 'matcha', v: 25,    r: 1.5e9 },
      { k: 'upg', id: 'staff3',             r: 2.5e9 },
      { k: 'unlock', st: 'camsa',           r: 6e9 },
      { k: 'level', st: 'duaxay', v: 25,    r: 1.5e10 },
      { k: 'upg', id: 'grind',              r: 2.5e10 },
      { k: 'unlock', st: 'affogato',        r: 7.5e10 },
      { k: 'level', st: 'camsa', v: 25,     r: 2.5e11 },
      { k: 'level', st: 'tonic', v: 50,     r: 5e11 },
      { k: 'served', v: 450,                r: 7.5e11 },
    ],
  },
  {
    id: 'dalat', n: 'Đồi Thông Đà Lạt', d: 'Nhà gỗ trên đồi thông, lò sưởi ấm, khách ngồi nghe mưa uống cacao nóng.',
    start: 3.75e8, gap: 2.0,
    // nhà gỗ trong nhà: phòng thường cộng thêm lò sưởi, cây thông trong chậu, vách gỗ (cabin trong scene.js)
    theme: { style: 'cabin', floor: 0xb88a63, plank: 0xa47550, wall: 0xf0e2cf, wainscot: 0x8a6446, rug: 0xd9534f, chair: 0x6fb57a, sky: 0xdfe8ef, apron: 0x4a7c59, flags: [0xd9534f, 0xfff1e0, 0x6fb57a, 0xffd166] },
    stations: [
      { id: 'cacao',   n: 'Cacao nóng',            c: '#6b3a24', ice: false, prop: 'pitcher',  price: 2.5e7,  time: 3.2, unlock: 0,        cost: 1e8 },
      { id: 'dauna',   n: 'Sữa đậu nành nóng',     c: '#efe0b8', ice: false, prop: 'kettle',   price: 1.5e8,  time: 3.2, unlock: 1.2e10,   cost: 1.5e9 },
      { id: 'atiso',   n: 'Trà atiso',             c: '#7a8a3a', ice: false, prop: 'syrup',    price: 9e8,    time: 3.4, unlock: 7.25e10,  cost: 9e9 },
      { id: 'caudat',  n: 'Cà phê phin Cầu Đất',   c: '#3b2314', ice: false, prop: 'espresso', price: 5.5e9,  time: 3.8, unlock: 4.25e11,  cost: 5.5e10 },
      { id: 'dautam',  n: 'Sữa chua dâu tằm',      c: '#b0306a', ice: true,  prop: 'can',      price: 3.25e10, time: 4.2, unlock: 2.5e12,  cost: 3.25e11 },
    ],
    upgrades: [
      { id: 'staff2', n: 'Thuê Gấu Trúc',            d: 'Thêm một bạn gấu pha chế',          cost: 7.5e8,    fx: 'staff' },
      { id: 'sign',   n: 'Bảng gỗ khắc tay',         d: 'Khách tới nhiều hơn 30%',           cost: 9e9,      fx: 'spawn', v: 1.3 },
      { id: 'shoes',  n: 'Lối đi lát đá',            d: 'Nhân viên đi nhanh hơn 30%',        cost: 2.25e10,  fx: 'walk', v: 1.3 },
      { id: 'staff3', n: 'Thuê Gấu Trắng',           d: 'Thêm một bạn gấu pha chế',          cost: 6e10,     fx: 'staff' },
      { id: 'queue4', n: 'Ghế bành bên lò sưởi',     d: 'Thêm một chỗ khách chờ ở quầy',     cost: 1.125e11, fx: 'queue' },
      { id: 'cacaow', n: 'Cacao nguyên chất',        d: 'Cacao nóng bán gấp 3',              cost: 3.75e11,  fx: 'profit', st: 'cacao', v: 3 },
      { id: 'grind',  n: 'Máy xay tay gỗ thông',     d: 'Pha nhanh hơn 30%',                 cost: 1.125e12, fx: 'prep', v: 1.3 },
      { id: 'staff4', n: 'Thuê Gấu Mật',             d: 'Thêm một bạn gấu pha chế',          cost: 3e12,     fx: 'staff' },
      { id: 'queue5', n: 'Mở gác xép',               d: 'Thêm một chỗ khách chờ ở quầy',     cost: 7.5e12,   fx: 'queue' },
      { id: 'mist',   n: 'Sương sớm lãng mạn',       d: 'Mọi món bán gấp 2',                 cost: 2.25e13,  fx: 'profit', st: 'all', v: 2 },
    ],
    tasks: [
      { k: 'level', st: 'cacao', v: 10,     r: 3.75e8 },
      { k: 'upg', id: 'staff2',             r: 7.5e8 },
      { k: 'unlock', st: 'dauna',           r: 2.5e9 },
      { k: 'level', st: 'cacao', v: 25,     r: 6.25e9 },
      { k: 'upg', id: 'sign',               r: 1.25e10 },
      { k: 'served', v: 220,                r: 2e10 },
      { k: 'unlock', st: 'atiso',           r: 3e10 },
      { k: 'level', st: 'dauna', v: 25,     r: 7.5e10 },
      { k: 'upg', id: 'staff3',             r: 1.25e11 },
      { k: 'unlock', st: 'caudat',          r: 3e11 },
      { k: 'level', st: 'atiso', v: 25,     r: 7.5e11 },
      { k: 'upg', id: 'grind',              r: 1.25e12 },
      { k: 'unlock', st: 'dautam',          r: 3.75e12 },
      { k: 'level', st: 'caudat', v: 25,    r: 1.25e13 },
      { k: 'level', st: 'cacao', v: 50,     r: 2.5e13 },
      { k: 'served', v: 450,                r: 3.75e13 },
    ],
  },
];
