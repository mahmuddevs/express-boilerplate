import app from './app.js';
import { env } from './app/config/env.js';

const PORT = env.port;

(async () => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
})();
