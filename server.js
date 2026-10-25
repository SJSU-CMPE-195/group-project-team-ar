const express = require('express');
const app = express();
const port = process.env.PORT || 5050;

app.get('/ping', (req, res) => {
  res.type('text/plain').send('the server is alive');
});

app.listen(port, () => console.log(`Running on http://localhost:${port}`));