require('dotenv').config();
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

// Root — frontend-ish landing
app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM visits');
    const count = result.rows[0].count;
    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>DevOps Capstone</title></head>
        <body style="font-family: sans-serif; text-align:center; padding:50px;">
          <h1>DevOps Capstone App</h1>
          <p>Node.js + PostgreSQL running on Kubernetes</p>
          <p><strong>Total visits:</strong> ${count}</p>
          <button onclick="fetch('/api/visit',{method:'POST'}).then(()=>location.reload())">
            Record a visit
          </button>
        </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send('Database error: ' + err.message);
  }
});

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

// List visits
app.get('/api/visits', async (req, res) => {
  const result = await pool.query('SELECT * FROM visits ORDER BY id DESC LIMIT 20');
  res.json(result.rows);
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
