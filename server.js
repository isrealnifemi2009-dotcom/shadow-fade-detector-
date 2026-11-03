const express = require("express");
const session = require("express-session");
const crypto = require("crypto");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const ACCESS_PASSWORD = process.env.ACCESS_PASSWORD;
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!ACCESS_PASSWORD || !SESSION_SECRET) {
  console.error("Set ACCESS_PASSWORD and SESSION_SECRET before starting the server.");
  process.exit(1);
}

app.disable("x-powered-by");
app.use(express.json({ limit: "20kb" }));
app.use(session({
  name: "shadow.sid",
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 8
  }
}));

const attempts = new Map();
function loginLimiter(req, res, next) {
  const key = req.ip || "unknown";
  const now = Date.now();
  const entry = attempts.get(key) || { count: 0, until: now + 10 * 60 * 1000 };
  if (now > entry.until) { entry.count = 0; entry.until = now + 10 * 60 * 1000; }
  if (entry.count >= 8) return res.status(429).json({ error: "Too many attempts. Try again in a few minutes." });
  req.loginAttempt = entry;
  next();
}
function safeEqual(a, b) {
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}
function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) return next();
  return res.status(401).json({ error: "Please sign in again." });
}

app.post("/api/login", loginLimiter, (req, res) => {
  const password = req.body && req.body.password;
  if (typeof password !== "string" || !safeEqual(password, ACCESS_PASSWORD)) {
    req.loginAttempt.count += 1;
    attempts.set(req.ip || "unknown", req.loginAttempt);
    return res.status(401).json({ error: "Incorrect access password." });
  }
  attempts.delete(req.ip || "unknown");
  req.session.regenerate(err => {
    if (err) return res.status(500).json({ error: "Could not create a secure session." });
    req.session.authenticated = true;
    res.json({ ok: true });
  });
});

app.post("/api/logout", requireAuth, (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get("/api/session", (req, res) => {
  res.json({ authenticated: !!(req.session && req.session.authenticated) });
});

app.post("/api/check", requireAuth, (req, res) => {
  const platform = req.body && req.body.platform;
  const phoneNumber = req.body && req.body.phoneNumber;
  const evidence = req.body && req.body.evidence;
  const accountStatus = req.body && req.body.accountStatus;

  if (!["WhatsApp", "Telegram"].includes(platform)) {
    return res.status(400).json({ error: "Choose WhatsApp or Telegram." });
  }
  if (typeof phoneNumber !== "string") {
    return res.status(400).json({ error: "Enter the account phone number." });
  }

  // Validate and immediately mask the number. It is not looked up or stored.
  const digits = phoneNumber.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) {
    return res.status(400).json({ error: "Enter a valid international phone number, including its country code." });
  }
  const maskedNumber = `••••••${digits.slice(-4)}`;

  if (typeof evidence !== "string" || evidence.length > 5000) {
    return res.status(400).json({ error: "Enter an official notice or error message (maximum 5,000 characters)." });
  }

  const text = evidence.toLowerCase();
  let result = "INCONCLUSIVE";
  let title = "UNKNOWN SHADOW";
  let detail = "There is not enough reliable wording to determine the account's restriction status. The phone number was not queried against WhatsApp or Telegram. Check the account in the official app or its official support channel.";

  const permanent = [
    /permanently\s+(banned|disabled|suspended|restricted)/,
    /(ban|restriction|suspension)\s+(is\s+)?permanent/,
    /account\s+has\s+been\s+permanently\s+(banned|disabled|suspended)/
  ];
  const temporary = [
    /temporarily\s+(banned|disabled|suspended|restricted)/,
    /(ban|restriction|suspension)\s+(is\s+)?temporary/
  ];

  if (permanent.some(re => re.test(text))) {
    result = "PERMANENT";
    title = "SHADOW FALL";
    detail = "The supplied text explicitly describes a permanent restriction. This is an interpretation of the notice you pasted, not an independent lookup. Follow the platform's official review or appeal process if offered.";
  } else if (temporary.some(re => re.test(text))) {
    result = "TEMPORARY";
    title = "SHADOW FADE";
    detail = "The supplied text explicitly describes a temporary restriction. This is an interpretation of the notice you pasted, not an independent lookup. Follow the waiting period and instructions shown by the platform.";
  } else if (!text.trim() && accountStatus === "active") {
    result = "NO_RESTRICTION_REPORTED";
    title = "SHADOWS UNTOUCHED";
    detail = "You confirmed that the account is working normally. This is user-reported information, not an independent platform verification.";
  }

  res.json({
    platform, maskedNumber, result, title, detail,
    checkedAt: new Date().toISOString(),
    basis: result === "NO_RESTRICTION_REPORTED"
      ? "User-confirmed active status"
      : (result === "INCONCLUSIVE" ? "No decisive wording found; no live lookup performed" : "Explicit wording in supplied notice")
  });
});

app.use(express.static(path.join(__dirname, "public")));
app.get("/{*splat}", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, () => console.log(`SHADOW FADE DETECTOR running on port ${PORT}`));
