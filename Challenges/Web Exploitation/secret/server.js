require("dotenv").config();
const express = require("express");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = process.env.PORT || 3000;
// Use a strong secret from environment variables
const SECRET = process.env.JWT_SECRET || "idkya";
const FLAG = process.env.FLAG || "FLAG_NOT_FOUND";

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public", { index: false }));
app.use(cookieParser());

app.use((req, res, next) => {
// Skip for static assets
if (req.path.startsWith('/public') || req.path.endsWith('.css') || req.path.endsWith('.js')) {
    return next();
}

// Set no-cache headers for all other routes
res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
res.set('Pragma', 'no-cache');
res.set('Expires', '0');
res.set('Surrogate-Control', 'no-store');
next();
});

// Add rate limiting for authentication attempts
const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 attempts per window
  message: "Too many login attempts, please try again later"
});

// Middleware to verify token
function verifyToken(req, res, next) {
    const token = req.cookies.token;
    if (!token) return res.redirect("/signin");
    
    try {
        const decoded = jwt.verify(token, SECRET, { algorithms: ["HS256"] });
        req.user = decoded;
        next();
    } catch (err) {
        res.clearCookie("token", { 
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: 'strict' 
        });
        res.redirect("/signin");
    }
}

// Login Endpoint with rate limiting
app.post("/login", loginLimiter, (req, res) => {
    const { username, password } = req.body;
    
    // In a real application, passwords should be hashed
    // This is a simplified example - use a proper password hashing library in production
    const validUsers = {
        "user": "pass1234",
        "admin": "N4h_This_IS_SECUre"
    };
    
    // Check if user exists
    if (!validUsers[username] || validUsers[username]!==password) {
        // Use constant-time comparison to prevent timing attacks
        return res.redirect("/signin?error=Invalid%20credentials");
    }
    
    const role = username;
    const token = jwt.sign(
        { username, role },
        SECRET,
        { 
            algorithm: "HS256",
            expiresIn: "1h" // Add token expiration
        }
    );
    
    // Set more secure cookie
    res.cookie("token", token, { 
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // Only send over HTTPS in production
        sameSite: 'strict',
        maxAge: 3600000 // 1 hour in milliseconds
    });
    
    res.redirect("/index");
});

app.get("/api/auth-check", verifyToken, (req, res) => {
    res.status(200).json({ authenticated: true, username: req.user.username, role: req.user.role });
});

app.get("/", (req, res) => {
    const token = req.cookies.token;
    if (!token) {
        return res.redirect("/signin");
    }
    res.redirect("/index");
});

// Index Page - Protected Route for all logged-in users
app.get("/index", verifyToken, (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
});

// Index Page - Protected Route for all logged-in users
app.get("/signin", (req, res) => {
    res.sendFile(__dirname + "/public/login.html");
});

// Admin Panel - Protected Route for admin only
app.get("/admin", verifyToken, (req, res) => {
    res.sendFile(__dirname + "/public/admin.html");
});

app.post("/logout", (req, res) => {
    // Clear the token cookie with the same settings used when setting it
    res.clearCookie("token", { 
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: 'strict'
    });
    
    // Send a successful response
    res.status(200).json({ message: "Logged out successfully" });
});

// Movie Reviews API - Protected Route
app.get("/api/reviews", verifyToken, (req, res) => {
    const reviews = [
        { title: "The Matrix", rating: "9/10" },
        { title: "Inception", rating: "8.8/10" }
    ];
    res.json(reviews);
});

// Admin Flag API - Protected Route
app.get("/api/flag", verifyToken, (req, res) => {
    if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
    }
    res.json({ flag: FLAG });
});

// Add error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));