import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth';
import customersRouter from './routes/customers';
import productsRouter from './routes/products';
import challansRouter from './routes/challans';
import { errorHandler } from './middleware/error';

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', authRouter);
app.use('/customers', customersRouter);
app.use('/products', productsRouter);
app.use('/challans', challansRouter);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

// Catch-all 404
app.use((req, res, next) => {
  res.status(404).json({ status: 'error', message: 'Endpoint not found' });
});

// Error handling middleware
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});
