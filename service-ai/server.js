const express = require('express');
require('dotenv').config();

const keywordsRouter = require('./routes/keywords');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3002;

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/keywords', keywordsRouter);

app.listen(PORT, () => {
  console.log(`service-ai running on port ${PORT}`);
});

module.exports = app;
