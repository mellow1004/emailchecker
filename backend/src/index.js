import 'dotenv/config';
import express from 'express';
import checkRoutes from './routes/check.js';
import generateRoutes from './routes/generate.js';
import rewriteRoutes from './routes/rewrite.js';

const app = express();
app.use(express.json());

// Log every request to confirm proxy is forwarding
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.use('/api/check', checkRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/rewrite', rewriteRoutes);

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';
app.listen(PORT, HOST, () => {
  console.log('Server ready');
  console.log(`Backend running on http://${HOST}:${PORT}`);
});
