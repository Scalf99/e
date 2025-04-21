const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const morgan = require('morgan');
const dotenv = require('dotenv');
const crypto = require('crypto');
const axios = require('axios');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Discord bot token - required for channel message fetching
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

// Enhanced CORS configuration for remote bot access
app.use(cors({
  origin: '*', // Allow all origins (your Discord bot could be hosted anywhere)
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

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
    
    // For Discord transcripts, create a dedicated directory
    if (file.mimetype === 'text/html' && req.path.includes('/transcripts')) {
      const transcriptsDir = path.join(uploadDir, 'transcripts');
      if (!fs.existsSync(transcriptsDir)) {
        fs.mkdirSync(transcriptsDir, { recursive: true });
      }
      return cb(null, transcriptsDir);
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // For Discord transcripts, keep the original filename if provided
    if (file.mimetype === 'text/html' && req.path.includes('/transcripts')) {
      // If a custom filename is provided, use it
      if (req.body.customFilename) {
        return cb(null, req.body.customFilename);
      }
      
      // Otherwise, create a filename from ticket info
      const ticketId = req.body.ticketId || 'unknown';
      const username = req.body.username || 'user';
      return cb(null, `cali_${username}_${ticketId}.html`);
    }
    
    // Default naming for other files
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// Configure file upload limits and filters
const maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB default
const allowedFileTypes = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,application/pdf,text/plain,text/html').split(',');

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
      files: '/api/files',
      transcripts: '/api/transcripts/upload',
      generateTranscript: '/api/transcripts/generate/:channelId'
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

// Discord transcript upload endpoint - enhanced for remote bot uploads
app.post('/api/transcripts/upload', upload.single('transcript'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No transcript file uploaded' });
  }

  // Extract ticket metadata from request
  const ticketId = req.body.ticketId || 'unknown';
  const userId = req.body.userId || 'unknown';
  const guildId = req.body.guildId || 'unknown';
  const closedBy = req.body.closedBy || 'unknown';
  const username = req.body.username || 'user';

  // Get the clean filename (what was actually saved)
  const cleanFileName = req.file.filename;
  
  // Create the direct URL to the HTML file that can be accessed in a browser
  // Use the actual host from the request, or fall back to api.scalf.dev
  const host = req.get('host') || 'api.scalf.dev';
  
  // Create the direct public URL to the transcript
  const publicViewUrl = `https://${host}/uploads/transcripts/${cleanFileName}`;
  
  const fileInfo = {
    ticketId,
    userId,
    guildId,
    closedBy,
    username,
    filename: cleanFileName,
    mimetype: req.file.mimetype,
    size: req.file.size,
    path: `/uploads/transcripts/${cleanFileName}`, // Public URL path
    url: publicViewUrl, // Direct URL to the HTML file
    uploadedAt: new Date()
  };

  res.status(201).json({
    message: 'Transcript uploaded successfully',
    file: fileInfo
  });
});

// New endpoint to generate transcripts server-side from a Discord channel ID
app.post('/api/transcripts/generate', async (req, res) => {
  try {
    const { 
      channelId, 
      userId, 
      guildId, 
      username = 'user', 
      closedBy = 'unknown',
      limit = 100 // Number of messages to fetch
    } = req.body;

    if (!channelId) {
      return res.status(400).json({ error: 'Channel ID is required' });
    }

    if (!DISCORD_BOT_TOKEN) {
      return res.status(500).json({ error: 'Discord bot token not configured on server' });
    }

    // Fetch messages from Discord API
    const response = await axios.get(
      `https://discord.com/api/v10/channels/${channelId}/messages?limit=${limit}`,
      {
        headers: {
          'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.data || !Array.isArray(response.data)) {
      return res.status(500).json({ error: 'Failed to fetch Discord messages' });
    }

    // Sort messages by timestamp (oldest first)
    const messages = response.data.sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );

    // Get channel info
    const channelResponse = await axios.get(
      `https://discord.com/api/v10/channels/${channelId}`,
      {
        headers: {
          'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const channelName = channelResponse.data.name || 'unknown-channel';

    // Generate HTML transcript
    const html = generateHtmlTranscript(messages, {
      channelId,
      channelName,
      guildId,
      username
    });

    // Save HTML file
    const fileName = `cali_${username}_${channelId}.html`;
    const transcriptsDir = path.join(__dirname, 'uploads', 'transcripts');
    
    if (!fs.existsSync(transcriptsDir)) {
      fs.mkdirSync(transcriptsDir, { recursive: true });
    }
    
    const filePath = path.join(transcriptsDir, fileName);
    fs.writeFileSync(filePath, html);

    // Create response with file info
    const host = req.get('host') || 'api.scalf.dev';
    const publicViewUrl = `https://${host}/uploads/transcripts/${fileName}`;
    
    const fileInfo = {
      ticketId: channelId,
      userId,
      guildId,
      closedBy,
      username,
      filename: fileName,
      mimetype: 'text/html',
      size: html.length,
      path: `/uploads/transcripts/${fileName}`,
      url: publicViewUrl,
      uploadedAt: new Date(),
      messageCount: messages.length
    };

    res.status(201).json({
      message: 'Transcript generated successfully',
      file: fileInfo
    });

  } catch (error) {
    console.error('Error generating transcript:', error.message);
    if (error.response) {
      console.error('Discord API response:', error.response.data);
      return res.status(error.response.status).json({ 
        error: `Discord API error: ${error.response.data.message || error.message}` 
      });
    }
    res.status(500).json({ error: `Failed to generate transcript: ${error.message}` });
  }
});

// Function to generate HTML transcript from Discord messages
function generateHtmlTranscript(messages, channelInfo) {
  const { channelId, channelName, guildId, username } = channelInfo;
  
  let html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Transcript for #${channelName}</title>
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 0; 
            padding: 20px; 
            color: #333; 
            background-color: #f6f6f6;
            line-height: 1.5;
          }
          .header {
            background-color: #5865F2;
            color: white;
            padding: 20px;
            margin-bottom: 20px;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          }
          .message {
            padding: 10px 15px;
            margin-bottom: 10px;
            background-color: white;
            border-radius: 5px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          .message:nth-child(even) {
            background-color: #f9f9f9;
          }
          .message-header {
            display: flex;
            align-items: center;
            margin-bottom: 5px;
          }
          .avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            margin-right: 10px;
            background-color: #ddd;
            overflow: hidden;
          }
          .avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .author {
            font-weight: bold;
            color: #5865F2;
          }
          .bot-tag {
            background-color: #5865F2;
            color: white;
            font-size: 0.7em;
            padding: 2px 5px;
            border-radius: 3px;
            margin-left: 5px;
          }
          .timestamp {
            color: #888;
            font-size: 0.8em;
            margin-left: 10px;
          }
          .content {
            margin-left: 50px;
            word-break: break-word;
          }
          .attachment {
            margin-top: 10px;
            margin-left: 50px;
          }
          .attachment img {
            max-width: 400px;
            max-height: 300px;
            border-radius: 3px;
          }
          .embed {
            margin-top: 5px;
            margin-left: 50px;
            padding: 10px;
            border-left: 4px solid #5865F2;
            background-color: #f2f3f5;
            border-radius: 0 3px 3px 0;
          }
          .embed-title {
            font-weight: bold;
            margin-bottom: 5px;
          }
          .embed-description {
            font-size: 0.95em;
          }
          .footer {
            margin-top: 20px;
            text-align: center;
            color: #888;
            font-size: 0.9em;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Transcript for #${channelName}</h1>
          <div>Channel ID: ${channelId}</div>
          <div>Guild ID: ${guildId}</div>
        </div>
        <div class="messages">
  `;

  // Process each message
  messages.forEach(message => {
    const timestamp = new Date(message.timestamp).toLocaleString();
    const isBot = message.author.bot;
    const avatarUrl = message.author.avatar 
      ? `https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.png` 
      : 'https://cdn.discordapp.com/embed/avatars/0.png';
    
    html += `
      <div class="message">
        <div class="message-header">
          <div class="avatar">
            <img src="${avatarUrl}" alt="Avatar" onerror="this.src='https://cdn.discordapp.com/embed/avatars/0.png'">
          </div>
          <div class="author">
            ${escapeHtml(message.author.username)}
            ${isBot ? '<span class="bot-tag">BOT</span>' : ''}
          </div>
          <div class="timestamp">${timestamp}</div>
        </div>
        <div class="content">${formatMessageContent(message.content)}</div>
    `;

    // Add attachments if any
    if (message.attachments && message.attachments.length > 0) {
      message.attachments.forEach(attachment => {
        if (attachment.content_type && attachment.content_type.startsWith('image/')) {
          html += `
            <div class="attachment">
              <img src="${attachment.url}" alt="Attachment" onerror="this.style.display='none'">
            </div>
          `;
        } else {
          html += `
            <div class="attachment">
              <a href="${attachment.url}" target="_blank">${attachment.filename}</a>
            </div>
          `;
        }
      });
    }

    // Add embeds if any
    if (message.embeds && message.embeds.length > 0) {
      message.embeds.forEach(embed => {
        html += `<div class="embed">`;
        
        if (embed.title) {
          html += `<div class="embed-title">${escapeHtml(embed.title)}</div>`;
        }
        
        if (embed.description) {
          html += `<div class="embed-description">${formatMessageContent(embed.description)}</div>`;
        }
        
        html += `</div>`;
      });
    }

    html += `</div>`;
  });

  html += `
        </div>
        <div class="footer">
          <p>End of transcript. Generated at ${new Date().toLocaleString()}</p>
          <p>cali Transcript System</p>
        </div>
      </body>
    </html>
  `;

  return html;
}

// Helper function to escape HTML
function escapeHtml(text) {
  if (!text) return '';
  
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Helper function to format message content
function formatMessageContent(content) {
  if (!content) return '';
  
  // Escape HTML
  let formatted = escapeHtml(content);
  
  // Convert line breaks to <br>
  formatted = formatted.replace(/\n/g, '<br>');
  
  // Format mentions
  formatted = formatted.replace(/<@!?(\d+)>/g, '<span style="color: #5865F2; font-weight: bold;">@User</span>');
  formatted = formatted.replace(/<#(\d+)>/g, '<span style="color: #5865F2; font-weight: bold;">#channel</span>');
  formatted = formatted.replace(/<@&(\d+)>/g, '<span style="color: #5865F2; font-weight: bold;">@Role</span>');
  
  // Format code blocks
  formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre style="background-color: #f5f5f5; padding: 10px; border-radius: 5px; font-family: monospace;">$2</pre>');
  formatted = formatted.replace(/`([^`]+)`/g, '<code style="background-color: #f5f5f5; padding: 2px 5px; border-radius: 3px; font-family: monospace;">$1</code>');
  
  // Format markdown (bold, italic, underline)
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  formatted = formatted.replace(/__([^_]+)__/g, '<u>$1</u>');
  
  return formatted;
}

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

// List Discord transcripts endpoint
app.get('/api/transcripts', (req, res) => {
  const transcriptsDir = path.join(__dirname, 'uploads', 'transcripts');
  
  if (!fs.existsSync(transcriptsDir)) {
    return res.status(200).json({ transcripts: [] });
  }

  try {
    const files = fs.readdirSync(transcriptsDir);
    const host = req.get('host') || 'api.scalf.dev';
    
    const transcripts = files.filter(file => file.endsWith('.html'))
      .map(filename => {
        const filePath = path.join(transcriptsDir, filename);
        const stats = fs.statSync(filePath);
        return {
          filename,
          path: `/uploads/transcripts/${filename}`,
          url: `https://${host}/uploads/transcripts/${filename}`,
          size: stats.size,
          uploadedAt: stats.mtime
        };
      });

    res.status(200).json({ transcripts });
  } catch (error) {
    res.status(500).json({ error: 'Failed to read transcripts directory' });
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