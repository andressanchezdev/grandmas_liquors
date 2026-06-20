function sendError(res, error) {
  res.status(500).json({ success: false, message: error.message });
}

function parseId(value) {
  return Number.parseInt(value, 10);
}

module.exports = { sendError, parseId };
