const e = require('express');
const express = require('express');
const app = express();
let port = 3000;

app.use(express.static(__dirname+ '/'));

app.listen(port, function() {
  console.log(`Server is running on http://localhost:${port}.`);
});

app.use(function(err, req, res, next) {
  console.error(err.stack);
  res.status(500).send('500 Error.', err);
  res.status(404).send('404 Not found.', err);
  res.status(403).send('403 Forbidden.', err);
});

module.exports = app;