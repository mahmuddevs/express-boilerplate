import dns from "node:dns";

dns.setServers(["1.1.1.1", "8.8.8.8"]);

import app from "./app.js";
import { env } from "./app/config/env.js";
import connectDB from "./app/config/db-config.js";

const PORT = env.port;

connectDB()
  .then(() => {
    console.log("Database connection successful.");
    app.listen(PORT, () => {
      console.log(`Server is live at ${env.appUrl}:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Database connection failed!");
    console.error(err.message);
    process.exit(1);
  });