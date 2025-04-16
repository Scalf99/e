const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3000;

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
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 