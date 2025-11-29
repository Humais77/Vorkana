const sanitizeInput = (str) => String(str).replace(/[<>$]/g, '').trim();

module.exports = { sanitizeInput };