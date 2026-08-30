import { scrapeFeverDetail } from "./scrape-detail.mjs";

const TEST_URL = "https://feverup.com/m/645776";

try {
  const event = await scrapeFeverDetail(TEST_URL, "Alicante");

  console.log("\nEVENTO EXTRAÍDO:\n");
  console.dir(event, {
    depth: null,
    colors: true,
  });
} catch (error) {
  console.error("Error:", error.message);
  process.exitCode = 1;
}