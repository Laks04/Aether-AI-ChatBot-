import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");
console.log("pdf type:", typeof pdf);
console.log("pdf keys:", Object.keys(pdf));
console.log("pdf default:", typeof pdf.default);
try {
  pdf(Buffer.from("")).then(() => {}).catch(e => console.log("Call as function error (expected):", e.message));
} catch(e) {
  console.log("Call as function throws:", e.message);
}
process.exit(0);
