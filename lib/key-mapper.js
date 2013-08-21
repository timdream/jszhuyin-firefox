'use strict';

exports.KeyMapper = {
  shiftMapping: {
    '<': '，', // XXX: Not available: ．《〈【〖〔
    '>': '。', // XXX: Not available: 》〉】〗〕
    '?': '？',
    '"': '、', // XXX: Not available: ＂
    ':': '：',
    '{': '『',
    '}': '』',
    '!': '！',
    '@': '＠',
    '#': '＃',
    '$': '＄',
    '%': '％',
    '^': '︿',
    '&': '＆',
    '*': '＊',
    '(': '（',
    ')': '）',
    '_': '—',
    '+': '＋',
    '~': '～',
    '|': '｜'
  },

  zhuyinMapping: {
    ',': 'ㄝ',
    '-': 'ㄦ',
    '.': 'ㄡ',
    '/': 'ㄥ',
    '0': 'ㄢ',
    '1': 'ㄅ',
    '2': 'ㄉ',
    '3': 'ˇ',
    '4': 'ˋ',
    '5': 'ㄓ',
    '6': 'ˊ',
    '7': '˙',
    '8': 'ㄚ',
    '9': 'ㄞ',
    ';': 'ㄤ',
    'a': 'ㄇ',
    'b': 'ㄖ',
    'c': 'ㄏ',
    'd': 'ㄎ',
    'e': 'ㄍ',
    'f': 'ㄑ',
    'g': 'ㄕ',
    'h': 'ㄘ',
    'i': 'ㄛ',
    'j': 'ㄨ',
    'k': 'ㄜ',
    'l': 'ㄠ',
    'm': 'ㄩ',
    'n': 'ㄙ',
    'o': 'ㄟ',
    'p': 'ㄣ',
    'q': 'ㄆ',
    'r': 'ㄐ',
    's': 'ㄋ',
    't': 'ㄔ',
    'u': 'ㄧ',
    'v': 'ㄒ',
    'w': 'ㄊ',
    'x': 'ㄌ',
    'y': 'ㄗ',
    'z': 'ㄈ',
    ' ': 'ˉ',

    // in MS Photonic IME, '`' is the dead-key for all full-width punctuation.
    // such functionality is not available here yet.
    '`': '，', // XXX: Not available: ｀

    '=': '＝',
    '[': '「',
    ']': '」',
    '\\': '＼', // XXX: Not available: ／
    '\'': '＇'
  },

  getSymbolCodeFromCode: function km_getSymbolCodeFromCode(code, shiftKey) {
    var chr = String.fromCharCode(code);

    if (shiftKey) {
      if (this.shiftMapping[chr]) {
        return this.shiftMapping[chr].charCodeAt(0);
      } else {
        return chr.toLowerCase().charCodeAt(0);
      }
    }

    if (this.zhuyinMapping[chr]) {
      return this.zhuyinMapping[chr].charCodeAt(0);
    } else {
      return code;
    }
  }
};
