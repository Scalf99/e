const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const transcriptsRouter = require('./api/transcripts');

const app = express();
const port = process.env.PORT || 6200;

// Log all incoming requests to help debug
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Middleware to handle Cloudflare headers
app.set('trust proxy', true);
app.use((req, res, next) => {
    // Get client's real IP from Cloudflare
    req.realIp = req.headers['cf-connecting-ip'] || 
                 req.headers['x-forwarded-for'] || 
                 req.connection.remoteAddress;
    
    // Handle domain and protocol
    const host = req.headers.host || '';
    if (host.includes(':6200') || host.includes('sillydev') || host.includes('ip-')) {
        return res.redirect(301, 'https://kansasrp.com' + req.url);
    }
    
    // Force HTTPS
    if (req.headers['x-forwarded-proto'] !== 'https') {
        return res.redirect(301, 'https://kansasrp.com' + req.url);
    }
    
    next();
});

// Security headers
app.use((req, res, next) => {
    // HSTS
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    
    // XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    next();
});

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// Set up multer for file uploads with memory storage for Vercel
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// API Routes
app.use('/api/transcripts', transcriptsRouter);

// Serve the main coming soon page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API endpoint for transcript upload
app.post('/api/transcripts/upload', upload.single('transcript'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        const { ticketId, username, ticketType, inquiry, openedAt, closedAt } = req.body;
        
        // For Vercel, we'll need to use a database instead of file storage
        // For now, we'll just return success
        res.json({
            success: true,
            message: 'Transcript received. Note: Storage functionality needs to be implemented with a database for Vercel deployment.'
        });
    } catch (error) {
        console.error('Error handling transcript:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to handle transcript'
        });
    }
});

// Endpoint to list all transcripts
app.get('/api/transcripts', (req, res) => {
    // For Vercel, this needs to be implemented with a database
    res.json([]);
});

// Create transcripts page
app.get('/transcripts', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/transcripts.html'));
});

// Start the server
app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running!`);
    console.log(`Port: ${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Time: ${new Date().toISOString()}`);
    console.log(`Access URLs:`);
    console.log(`Local: http://localhost:${port}`);
    console.log(`Network: http://your-ip:${port}`);
    console.log('----------------------------------------');
});

// Export the Express API
module.exports = app; 