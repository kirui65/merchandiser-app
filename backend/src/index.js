const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const logger = require('./utils/logger');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const salesRoutes = require('./routes/sales.routes');
const outletsRoutes = require('./routes/outlets.routes');
const productsRoutes = require('./routes/products.routes');
const repsRoutes = require('./routes/reps.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const routesRoutes = require('./routes/routes.routes');
const mpesaRoutes = require('./routes/mpesa.routes');

const app = express();

app.use(cors({ origin: env.allowedOrigins }));
app.use(express.json({ limit: '5mb' })); // generous-ish for base64 photo payloads if used before object storage

app.get('/health', (req, res) => res.json({ status: 'ok', env: env.nodeEnv }));

app.use('/api/auth', authRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/outlets', outletsRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/reps', repsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/routes', routesRoutes);
app.use('/api/mpesa', mpesaRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.port, () => {
  logger.info(`Backend listening on port ${env.port} (${env.nodeEnv})`);
});

module.exports = app;
