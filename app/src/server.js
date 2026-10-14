require('dotenv').config();
const path = require('path');
const express = require('express');
const { pool, initDb } = require('./db');
const { register, httpRequestCounter, visitCounter } = require('./metrics');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Request metrics middleware
app.use((req, res, next) => {
  res.on('finish', () => {
    httpRequestCounter.inc({
      method: req.method,
      route: req.path,
      status: res.statusCode,
    });
  });
  next();
});

// Serve static frontend from ./public
app.use(express.static(path.join(__dirname, '..', 'public')));

// Record a visit
app.post('/api/visit', async (req, res) => {
  try {
    await pool.query('INSERT INTO visits DEFAULT VALUES');
    visitCounter.inc();
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List visits (frontend counts the array length)
app.get('/api/visits', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM visits ORDER BY id DESC LIMIT 100');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health endpoints
app.get('/health', (req, res) => res.status(200).json({ status: 'healthy' }));
app.get('/ready', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ready' });
  } catch {
    res.status(503).json({ status: 'not ready' });
  }
});

// Prometheus metrics
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Start
if (require.main === module) {
  initDb()
    .then(() => {
      app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch((err) => {
      console.error('Failed to init DB:', err);
      process.exit(1);
    });
}

module.exports = app;
