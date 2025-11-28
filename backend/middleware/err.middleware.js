module.exports = (err, req, res, next) => {
  console.error(err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Server Error';
  res.status(status).json({ success: false, message });
};
