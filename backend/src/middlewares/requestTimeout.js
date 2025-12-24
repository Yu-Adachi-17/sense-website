module.exports = function requestTimeout(timeoutMs = 600000) {
  return (req, res, next) => {
    req.setTimeout(timeoutMs, () => {
      console.error('Request timed out.');
      res.set({
        'Access-Control-Allow-Origin': req.headers.origin || '*',
        'Access-Control-Allow-Credentials': 'true',
      });
      res.status(503).send('Service Unavailable: request timed out.');
    });
    next();
  };
};
