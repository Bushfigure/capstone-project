const client = require('prom-client');

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestCounter = new client.Counter({
  name: 'app_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

const visitCounter = new client.Counter({
  name: 'app_visits_total',
  help: 'Total visit events recorded',
  registers: [register],
});

module.exports = { register, httpRequestCounter, visitCounter };
