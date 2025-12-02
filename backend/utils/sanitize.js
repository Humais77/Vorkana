const xss = require('xss');

const sanitizeHtml = (str) => {
  if (typeof str !== 'string') return str;
  return xss(str, {
    whiteList: {},          // Allow NO tags
    stripIgnoreTag: true,   // Remove <script>, <iframe>, etc.
    stripIgnoreTagBody: ['script', 'style', 'iframe']
  }).trim();
};

module.exports = { sanitizeHtml };