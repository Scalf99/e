const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const morgan = require('morgan');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));

// Configure multer for file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Create unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// Configure file upload limits and filters
const maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB default
const allowedFileTypes = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,application/pdf,text/plain').split(',');

const fileFilter = (req, file, cb) => {
  if (allowedFileTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'), false);
  }
};

const upload = multer({ 
  storage,
  limits: { fileSize: maxFileSize },
  fileFilter
});

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'API Server is running',
    endpoints: {
      upload: '/api/upload',
      files: '/api/files'
    }
  });
});

// File upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // Return file information
  const fileInfo = {
    originalName: req.file.originalname,
    filename: req.file.filename,
    mimetype: req.file.mimetype,
    size: req.file.size,
    path: `/uploads/${req.file.filename}`, // Public URL path
    uploadedAt: new Date()
  };

  res.status(201).json({
    message: 'File uploaded successfully',
    file: fileInfo
  });
});

// List uploaded files endpoint
app.get('/api/files', (req, res) => {
  const uploadDir = path.join(__dirname, 'uploads');
  
  if (!fs.existsSync(uploadDir)) {
    return res.status(200).json({ files: [] });
  }

  try {
    const files = fs.readdirSync(uploadDir);
    const fileDetails = files.map(filename => {
      const filePath = path.join(uploadDir, filename);
      const stats = fs.statSync(filePath);
      return {
        filename,
        path: `/uploads/${filename}`,
        size: stats.size,
        uploadedAt: stats.mtime
      };
    });

    res.status(200).json({ files: fileDetails });
  } catch (error) {
    res.status(500).json({ error: 'Failed to read files directory' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // A Multer error occurred
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: `File too large. Maximum file size is ${maxFileSize / 1048576}MB`
      });
    }
    return res.status(400).json({ error: err.message });
  } else if (err) {
    // Some other error occurred
    return res.status(500).json({ error: err.message });
  }
  next();
});

// Handle 404 errors
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start the server
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`);
    console.log(`For production, deploy to Vercel and configure custom domain`);
  });
}

// Export for Vercel
module.exports = app; 