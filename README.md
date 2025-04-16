# Kansas RP Website with Transcript System

This is a web application that includes a coming soon page and a transcript management system for Discord ticket logs.

## Features

- Coming soon landing page with interactive background
- Transcript upload API endpoint
- Transcript viewing interface
- Automatic metadata storage
- Responsive design

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create required directories:
```bash
mkdir -p public/transcripts
```

3. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

The server will start on port 3000 by default. You can change this by setting the `PORT` environment variable.

## API Endpoints

### Upload Transcript
- **URL:** `/api/transcripts/upload`
- **Method:** POST
- **Content-Type:** multipart/form-data
- **Fields:**
  - `transcript` (file): The HTML transcript file
  - `ticketId` (string): The Discord ticket ID
  - `username` (string): The user's name
  - `ticketType` (string): The type of ticket
  - `inquiry` (string): The ticket inquiry
  - `openedAt` (string): ISO timestamp when ticket was opened
  - `closedAt` (string): ISO timestamp when ticket was closed

### List Transcripts
- **URL:** `/api/transcripts`
- **Method:** GET
- **Response:** JSON array of transcript metadata

## Pages

- `/` - Coming soon landing page
- `/transcripts` - Transcript viewing interface

## File Structure

```
.
├── public/
│   ├── transcripts/    # Stored transcripts and metadata
│   └── transcripts.html # Transcript viewing page
├── index.html          # Coming soon page
├── server.js          # Express server
├── package.json       # Dependencies
└── README.md         # This file
```

## Discord Bot Integration

Update your Discord bot's ticket system to use the `/api/transcripts/upload` endpoint when saving transcripts. Example code for the bot:

```javascript
const axios = require('axios');
const FormData = require('form-data');

async function uploadTranscript(transcriptHtml, metadata) {
    const formData = new FormData();
    formData.append('transcript', Buffer.from(transcriptHtml), 'transcript.html');
    formData.append('ticketId', metadata.ticketId);
    formData.append('username', metadata.username);
    formData.append('ticketType', metadata.ticketType);
    formData.append('inquiry', metadata.inquiry);
    formData.append('openedAt', metadata.openedAt);
    formData.append('closedAt', metadata.closedAt);

    try {
        const response = await axios.post('http://your-website.com/api/transcripts/upload', formData, {
            headers: formData.getHeaders()
        });
        return response.data.url;
    } catch (error) {
        console.error('Failed to upload transcript:', error);
        throw error;
    }
}
``` 