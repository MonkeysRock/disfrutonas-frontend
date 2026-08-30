import "dotenv/config";
import { scrape } from "./index.js";

scrape().catch((error) => {
  console.error(
    "❌ Error general:",
    error.response?.data || error.message
  );

  process.exitCode = 1;
});