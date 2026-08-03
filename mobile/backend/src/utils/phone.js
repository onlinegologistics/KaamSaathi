const normalizePhone = (phone) => String(phone || '').replace(/[\s-]/g, '');

module.exports = { normalizePhone };
