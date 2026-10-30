// Non-destructive dashboard session minter.
// Produces an HS256 JWT identical in shape to src/lib/auth/dashboardSession.js
// createDashboardAuthToken(): payload { authenticated:true, iat, exp:iat+24h },
// header { alg:"HS256" }, signed with the host's real ~/.9router/jwt-secret.
// Uses only node:crypto — no jose needed (standalone bundles jose into chunks).
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const os = require("os");

const DATA_DIR = process.env.DATA_DIR || path.join(os.homedir(), ".9router");
const secret = fs.readFileSync(path.join(DATA_DIR, "jwt-secret"), "utf8").trim();

const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const header = b64url({ alg: "HS256" });
const payload = b64url({ authenticated: true, iat: now, exp: now + 86400 });
const sig = crypto.createHmac("sha256", secret).update(header + "." + payload).digest("base64url");

console.log("MINTED_TOKEN:" + header + "." + payload + "." + sig);
