import express from 'express';
import cors from 'cors';
import branchRoutes from './routes/branchRoutes';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'branch-service', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/branches', branchRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error',
    message: err.message 
  });
});

// 404 handler
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({ 
    success: false, 
    error: 'Route not found' 
  });
});

export default app; 