// env.ts tự load dotenv — import nó trước tất cả module khác
import { env } from './common/config/env';
import app from './app';

app.listen(env.PORT, () => {
  console.log(`=======================================================`);
  console.log(`🦀 5Cua Smart Farm Backend  |  Port: ${env.PORT}`);
  console.log(`🌱 Environment: ${env.NODE_ENV}`);
  console.log(`📡 Health: http://localhost:${env.PORT}/health`);
  console.log(`=======================================================`);
});
