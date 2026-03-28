const express = require('express');
const cors = require('cors');
require('dotenv').config();

const keywordsRouter = require('./routes/keywords');
const bundleSummaryRouter = require('./routes/bundle-summary');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3002;

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/keywords', keywordsRouter);
app.use('/bundle-summary', bundleSummaryRouter);

app.listen(PORT, () => {
  console.log(`service-ai running on port ${PORT}`);
});

module.exports = app;
