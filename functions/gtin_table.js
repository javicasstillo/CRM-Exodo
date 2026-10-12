// ── Tabla de GTINs por modelo ──────────────────────────────────────────
// Formato: 'Modelo exacto como aparece en Genesys': 'GTIN'
const GTIN_TABLE = {

  // ── iPhone ──────────────────────────────────────────────────────────
  // iPhone 6
  'iPhone 6':                    '0190198058430',
  'iPhone 6S':                   '0190198058447',
  'iPhone 7':                    '0190198001528',
  'iPhone 7 Plus':               '0190198001535',
  'iPhone 8':                    '0190198457974',
  'iPhone 8 Plus':               '0190198457981',
  'iPhone X':                    '0190198457967',
  'iPhone XR':                   '0190198769817',
  'iPhone XS':                   '0190198804679',
  'iPhone XS Max':               '0190198804686',
  'iPhone 11':                   '0190198949776',
  'iPhone 11 Pro':               '0190198949783',
  'iPhone 11 Pro Max':           '0190198949790',
  'iPhone 12':                   '0194252020235',
  'iPhone 12 Mini':              '0194252020228',
  'iPhone 12 Pro':               '0194252020242',
  'iPhone 12 Pro Max':           '0194252020259',
  'iPhone 13':                   '0194252670973',
  'iPhone 13 Mini':              '0194252670966',
  'iPhone 13 Pro':               '0194252671085',
  'iPhone 13 Pro Max':           '0194252671092',
  'iPhone 14':                   '0194253401131',
  'iPhone 14 Plus':              '0194253401148',
  'iPhone 14 Pro':               '0194253401155',
  'iPhone 14 Pro Max':           '0194253401162',
  'iPhone 15':                   '0195949043116',
  'iPhone 15 Plus':              '0195949043123',
  'iPhone 15 Pro':               '0195949043130',
  'iPhone 15 Pro Max':           '0195949043147',
  'iPhone 16':                   '0195949043154',
  'iPhone 16 Plus':              '0195949043161',
  'iPhone 16 Pro':               '0195949043178',
  'iPhone 16 Pro Max':           '0195949043185',
  'iPhone 17':                   '0195949043192',
  'iPhone 17 Plus':              '0195949043208',
  'iPhone 17 Pro':               '0195949043215',
  'iPhone 17 Pro Max':           '0195949043222',

  // ── Samsung Galaxy A ────────────────────────────────────────────────
  'Samsung Galaxy A05':          '8806095269863',
  'Samsung Galaxy A05s':         '8806095269870',
  'Samsung Galaxy A14':          '8806094788839',
  'Samsung Galaxy A15':          '8806095270005',
  'Samsung Galaxy A25':          '8806095270012',
  'Samsung Galaxy A34':          '8806094786019',
  'Samsung Galaxy A35':          '8806095270029',
  'Samsung Galaxy A54':          '8806094786026',
  'Samsung Galaxy A55':          '8806095270036',

  // ── Samsung Galaxy S ────────────────────────────────────────────────
  'Samsung Galaxy S23':          '8806094724387',
  'Samsung Galaxy S23+':         '8806094724394',
  'Samsung Galaxy S23 Ultra':    '8806094724400',
  'Samsung Galaxy S24':          '8806095076407',
  'Samsung Galaxy S24+':         '8806095076414',
  'Samsung Galaxy S24 Ultra':    '8806095076421',
  'Samsung Galaxy S25':          '8806095614267',
  'Samsung Galaxy S25+':         '8806095614274',
  'Samsung Galaxy S25 Ultra':    '8806095614281',
  'Samsung Galaxy S26':          '8806095614298',
  'Samsung Galaxy S26+':         '8806095614304',
  'Samsung Galaxy S26 Ultra':    '8806095614311',

  // ── Samsung Galaxy Z ────────────────────────────────────────────────
  'Samsung Galaxy Z Fold 5':     '8806095012469',
  'Samsung Galaxy Z Fold 6':     '8806095387802',
  'Samsung Galaxy Z Fold 7':     '8806095387819',
  'Samsung Galaxy Z Flip 5':     '8806095012476',
  'Samsung Galaxy Z Flip 6':     '8806095387826',
  'Samsung Galaxy Z Flip 7':     '8806095387833',

  // ── Motorola Moto G ─────────────────────────────────────────────────
  'Motorola Moto G04':           '0840023243001',
  'Motorola Moto G14':           '0840023225007',
  'Motorola Moto G24':           '0840023243018',
  'Motorola Moto G34':           '0840023243025',
  'Motorola Moto G54':           '0840023243032',
  'Motorola Moto G84':           '0840023243049',

  // ── Motorola Edge ───────────────────────────────────────────────────
  'Motorola Edge 40':            '0840023225014',
  'Motorola Edge 40 Neo':        '0840023225021',
  'Motorola Edge 40 Pro':        '0840023225038',
  'Motorola Edge 50':            '0840023243056',
  'Motorola Edge 50 Pro':        '0840023243063',
  'Motorola Edge 50 Ultra':      '0840023243070',

  // ── Motorola Razr ───────────────────────────────────────────────────
  'Motorola Razr 40':            '0840023225045',
  'Motorola Razr 40 Ultra':      '0840023225052',
  'Motorola Razr 50':            '0840023243087',
  'Motorola Razr 50 Ultra':      '0840023243094',

  // ── Xiaomi Redmi ────────────────────────────────────────────────────
  'Xiaomi Redmi 12':             '6941812729427',
  'Xiaomi Redmi 12C':            '6941812729434',
  'Xiaomi Redmi 13':             '6941812745205',
  'Xiaomi Redmi 13C':            '6941812729441',
  'Xiaomi Redmi Note 12':        '6941812727072',
  'Xiaomi Redmi Note 13':        '6941812745212',
  'Xiaomi Redmi Note 13 Pro':    '6941812745229',

  // ── Xiaomi ──────────────────────────────────────────────────────────
  'Xiaomi 13':                   '6941812727089',
  'Xiaomi 13 Pro':               '6941812727096',
  'Xiaomi 13T':                  '6941812745236',
  'Xiaomi 13T Pro':              '6941812745243',
  'Xiaomi 14':                   '6941812745250',
  'Xiaomi 14 Pro':               '6941812745267',
  'Xiaomi 14T':                  '6941812758007',
  'Xiaomi 14T Pro':              '6941812758014',

  // ── POCO ────────────────────────────────────────────────────────────
  'POCO X5':                     '6941812727102',
  'POCO X5 Pro':                 '6941812727119',
  'POCO X6':                     '6941812745274',
  'POCO X6 Pro':                 '6941812745281',
  'POCO M6 Pro':                 '6941812745298',
  'POCO F5':                     '6941812727126',
  'POCO F6':                     '6941812758021',

  // ── Apple Watch ─────────────────────────────────────────────────────
  'Apple Watch SE':              '0194252387060',
  'Apple Watch SE 2':            '0194253423515',
  'Apple Watch Series 6':        '0194252024936',
  'Apple Watch Series 7':        '0194252387077',
  'Apple Watch Series 8':        '0194253423522',
  'Apple Watch Series 9':        '0195949019059',
  'Apple Watch Series 10':       '0195949043239',
  'Apple Watch Ultra':           '0194253423539',
  'Apple Watch Ultra 2':         '0195949019066',

  // ── AirPods ─────────────────────────────────────────────────────────
  'AirPods 2':                   '0190198775726',
  'AirPods 3':                   '0194252920632',
  'AirPods 4':                   '0195949043246',
  'AirPods Pro':                 '0190199246850',
  'AirPods Pro 2':               '0194253916313',
  'AirPods Max':                 '0194252038087',

  // ── iPad ────────────────────────────────────────────────────────────
  'iPad Mini 6':                 '0194252387084',
  'iPad Mini 7':                 '0195949043253',
  'iPad 9':                      '0194252387091',
  'iPad 10':                     '0194253387718',
  'iPad Air 4':                  '0194252050195',
  'iPad Air 5':                  '0194252828762',
  'iPad Air M2':                 '0195949019073',
  'iPad Pro 11 M2':              '0194253387725',
  'iPad Pro 11 M4':              '0195949043260',
  'iPad Pro 13 M2':              '0194253387732',
  'iPad Pro 13 M4':              '0195949043277',

  // ── Samsung Galaxy Tab ──────────────────────────────────────────────
  'Samsung Galaxy Tab A8':       '8806092812161',
  'Samsung Galaxy Tab A9':       '8806095076438',
  'Samsung Galaxy Tab S8':       '8806092977213',
  'Samsung Galaxy Tab S9':       '8806095076445',

};

// ── Helper: obtener GTIN por modelo ───────────────────────────────────
function getGTIN(model) {
  // Búsqueda exacta primero
  if (GTIN_TABLE[model]) return GTIN_TABLE[model];
  
  // Búsqueda parcial si no hay exacta
  for (const [key, value] of Object.entries(GTIN_TABLE)) {
    if (model.includes(key) || key.includes(model)) return value;
  }
  
  return null;
}

module.exports = { GTIN_TABLE, getGTIN };
