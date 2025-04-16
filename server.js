const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 6200;

// Log all incoming requests to help debug
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - ${req.realIp || req.ip}`);
    console.log('Headers:', req.headers);
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

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = 'public/transcripts';
        // Create directory if it doesn't exist
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'transcript_' + uniqueSuffix + '.html');
    }
});

const upload = multer({ storage: storage });

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
        
        // Store metadata in a JSON file (you might want to use a database in production)
        const metadata = {
            ticketId,
            username,
            ticketType,
            inquiry,
            openedAt,
            closedAt,
            filename: req.file.filename,
            uploadedAt: new Date().toISOString()
        };

        const metadataPath = path.join('public/transcripts', 'metadata.json');
        let allMetadata = [];
        
        if (fs.existsSync(metadataPath)) {
            allMetadata = JSON.parse(fs.readFileSync(metadataPath));
        }
        
        allMetadata.push(metadata);
        fs.writeFileSync(metadataPath, JSON.stringify(allMetadata, null, 2));

        res.json({
            success: true,
            filename: req.file.filename,
            url: `/transcripts/${req.file.filename}`
        });
    } catch (error) {
        console.error('Error uploading transcript:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to upload transcript'
        });
    }
});

// Endpoint to list all transcripts
app.get('/api/transcripts', (req, res) => {
    try {
        const metadataPath = path.join('public/transcripts', 'metadata.json');
        if (!fs.existsSync(metadataPath)) {
            return res.json([]);
        }
        
        const metadata = JSON.parse(fs.readFileSync(metadataPath));
        res.json(metadata);
    } catch (error) {
        console.error('Error fetching transcripts:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch transcripts'
        });
    }
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