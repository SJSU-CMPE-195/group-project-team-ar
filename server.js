const express = require('express');
const app = express();

app.get('/ping', (req, res) => {
  res.json({ message: 'server is alive' });
});

app.listen(5000, () => console.log('Running on http://localhost:5000'));