// ── Tabla de RAM por modelo ────────────────────────────────────────────
const RAM_TABLE = {

  // ── iPhone ──────────────────────────────────────────────────────────
  'iPhone 6':                    '1',
  'iPhone 6S':                   '2',
  'iPhone 7':                    '2',
  'iPhone 7 Plus':               '3',
  'iPhone 8':                    '2',
  'iPhone 8 Plus':               '3',
  'iPhone X':                    '3',
  'iPhone XR':                   '3',
  'iPhone XS':                   '4',
  'iPhone XS Max':               '4',
  'iPhone 11':                   '4',
  'iPhone 11 Pro':               '4',
  'iPhone 11 Pro Max':           '4',
  'iPhone 12':                   '4',
  'iPhone 12 Mini':              '4',
  'iPhone 12 Pro':               '6',
  'iPhone 12 Pro Max':           '6',
  'iPhone 13':                   '4',
  'iPhone 13 Mini':              '4',
  'iPhone 13 Pro':               '6',
  'iPhone 13 Pro Max':           '6',
  'iPhone 14':                   '6',
  'iPhone 14 Plus':              '6',
  'iPhone 14 Pro':               '6',
  'iPhone 14 Pro Max':           '6',
  'iPhone 15':                   '6',
  'iPhone 15 Plus':              '6',
  'iPhone 15 Pro':               '8',
  'iPhone 15 Pro Max':           '8',
  'iPhone 16':                   '8',
  'iPhone 16 Plus':              '8',
  'iPhone 16 Pro':               '8',
  'iPhone 16 Pro Max':           '8',
  'iPhone 17':                   '8',
  'iPhone 17 Plus':              '8',
  'iPhone 17 Pro':               '12',
  'iPhone 17 Pro Max':           '12',
  'iPhone 18':                   '8',
  'iPhone 18 Plus':              '8',
  'iPhone 18 Pro':               '12',
  'iPhone 18 Pro Max':           '12',

  // ── Samsung Galaxy A ────────────────────────────────────────────────
  'Samsung Galaxy A05':          '4',
  'Samsung Galaxy A05s':         '4',
  'Samsung Galaxy A14':          '4',
  'Samsung Galaxy A15':          '4',
  'Samsung Galaxy A25':          '6',
  'Samsung Galaxy A34':          '6',
  'Samsung Galaxy A35':          '6',
  'Samsung Galaxy A54':          '8',
  'Samsung Galaxy A55':          '8',

  // ── Samsung Galaxy S ────────────────────────────────────────────────
  'Samsung Galaxy S23':          '8',
  'Samsung Galaxy S23+':         '8',
  'Samsung Galaxy S23 Ultra':    '12',
  'Samsung Galaxy S24':          '8',
  'Samsung Galaxy S24+':         '12',
  'Samsung Galaxy S24 Ultra':    '12',
  'Samsung Galaxy S25':          '12',
  'Samsung Galaxy S25+':         '12',
  'Samsung Galaxy S25 Ultra':    '12',
  'Samsung Galaxy S26':          '12',
  'Samsung Galaxy S26+':         '12',
  'Samsung Galaxy S26 Ultra':    '16',

  // ── Samsung Galaxy Z ────────────────────────────────────────────────
  'Samsung Galaxy Z Fold 5':     '12',
  'Samsung Galaxy Z Fold 6':     '12',
  'Samsung Galaxy Z Fold 7':     '12',
  'Samsung Galaxy Z Flip 5':     '8',
  'Samsung Galaxy Z Flip 6':     '12',
  'Samsung Galaxy Z Flip 7':     '12',

  // ── Motorola Moto G ─────────────────────────────────────────────────
  'Motorola Moto G04':           '4',
  'Motorola Moto G14':           '4',
  'Motorola Moto G24':           '4',
  'Motorola Moto G34':           '4',
  'Motorola Moto G54':           '8',
  'Motorola Moto G84':           '12',

  // ── Motorola Edge ───────────────────────────────────────────────────
  'Motorola Edge 40':            '8',
  'Motorola Edge 40 Neo':        '8',
  'Motorola Edge 40 Pro':        '12',
  'Motorola Edge 50':            '8',
  'Motorola Edge 50 Pro':        '12',
  'Motorola Edge 50 Ultra':      '12',

  // ── Motorola Razr ───────────────────────────────────────────────────
  'Motorola Razr 40':            '8',
  'Motorola Razr 40 Ultra':      '8',
  'Motorola Razr 50':            '8',
  'Motorola Razr 50 Ultra':      '12',

  // ── Xiaomi Redmi ────────────────────────────────────────────────────
  'Xiaomi Redmi 12':             '4',
  'Xiaomi Redmi 12C':            '4',
  'Xiaomi Redmi 13':             '6',
  'Xiaomi Redmi 13C':            '4',
  'Xiaomi Redmi Note 12':        '4',
  'Xiaomi Redmi Note 13':        '6',
  'Xiaomi Redmi Note 13 Pro':    '8',

  // ── Xiaomi ──────────────────────────────────────────────────────────
  'Xiaomi 13':                   '8',
  'Xiaomi 13 Pro':               '12',
  'Xiaomi 13T':                  '8',
  'Xiaomi 13T Pro':              '12',
  'Xiaomi 14':                   '12',
  'Xiaomi 14 Pro':               '16',
  'Xiaomi 14T':                  '12',
  'Xiaomi 14T Pro':              '12',

  // ── POCO ────────────────────────────────────────────────────────────
  'POCO X5':                     '6',
  'POCO X5 Pro':                 '8',
  'POCO X6':                     '8',
  'POCO X6 Pro':                 '12',
  'POCO M6 Pro':                 '8',
  'POCO F5':                     '8',
  'POCO F6':                     '12',
};

// ── Helper: obtener RAM por modelo ────────────────────────────────────
function getRAM(model) {
  if (RAM_TABLE[model]) return RAM_TABLE[model];
  // Búsqueda parcial
  for (const [key, value] of Object.entries(RAM_TABLE)) {
    if (model.includes(key) || key.includes(model)) return value;
  }
  return '8'; // fallback
}

module.exports = { RAM_TABLE, getRAM };
