// server.ts
// A simple server that simulates a cold start of ~300ms
const BOOT_DELAY = 300; 

console.log("Server starting...");

setTimeout(() => {
  Bun.serve({
    port: 3000,
    fetch(req) {
      return new Response("OK");
    },
  });
  console.log("Server listening on http://localhost:3000");
}, BOOT_DELAY);
