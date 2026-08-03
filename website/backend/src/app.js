const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const routes = require('./routes');
const env = require('./config/env');
const { globalLimiter } = require('./middleware/rateLimiters');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

const corsOptions =
  env.corsOrigin === '*'
    ? { origin: '*' }
    : {
        origin: env.corsOrigin.split(',').map((origin) => origin.trim()),
        credentials: true,
      };

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors(corsOptions));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(globalLimiter);

if (env.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

app.get('/health', (_req, res) => {
  res.json({ success: true, service: 'KaamSaathi Web Backend', status: 'ok' });
});

app.use(routes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
