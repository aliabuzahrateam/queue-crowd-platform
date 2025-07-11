import app from './app';
import * as dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
  console.log(`Branch Service listening on port ${PORT}`);
}); 