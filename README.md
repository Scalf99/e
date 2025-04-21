# API File Upload Service for Discord Transcripts

A Node.js API service for uploading Discord ticket transcripts and other files, ready to deploy to Vercel and use with your custom domain (api.domain.com).

## Features

- Discord ticket transcript upload endpoint
- General file upload capabilities
- List all uploaded files and transcripts
- Ready for Vercel deployment
- CORS enabled
- Custom domain support

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm or yarn
- A Vercel account
- A domain name with DNS access

### Local Development

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm run dev
   ```
4. The API will be available at http://localhost:3000

### API Endpoints

- `GET /` - API info and available endpoints
- `POST /api/upload` - Upload a general file (use form-data with 'file' field)
- `POST /api/transcripts/upload` - Upload a Discord ticket transcript (use form-data with 'transcript' field)
- `GET /api/files` - List all uploaded general files
- `GET /api/transcripts` - List all uploaded Discord transcripts
- `GET /uploads/:filename` - Access an uploaded file
- `GET /uploads/transcripts/:filename` - Access an uploaded transcript

## Discord Bot Integration

To integrate with your Discord bot for ticket transcript uploads, check the example in `examples/discord-upload-example.js`. This shows how to:

1. Generate HTML transcripts from ticket channels
2. Upload them to your API
3. Share the transcript URL back in Discord

### Required fields for transcript uploads:

- `transcript` - The HTML file content
- `ticketId` - Identifier for the ticket
- `userId` - Discord user ID who created the ticket
- `guildId` - Discord server ID
- `closedBy` - Discord user ID who closed the ticket

## Testing the API

See `examples/curl-upload-example.md` for examples of how to test the API using cURL and PowerShell.

### Deployment to Vercel

1. Install the Vercel CLI:
   ```
   npm install -g vercel
   ```

2. Login to Vercel:
   ```
   vercel login
   ```

3. Deploy to Vercel:
   ```
   vercel
   ```

4. For production deployment:
   ```
   vercel --prod
   ```

### Connecting Your Custom Domain (api.domain.com)

1. Log in to your Vercel dashboard
2. Select your deployed project
3. Go to "Settings" > "Domains"
4. Add your domain: `api.domain.com`
5. Follow Vercel's instructions to configure your DNS settings:
   - Add a CNAME record pointing `api` to `cname.vercel-dns.com`
   - Or follow the specific instructions provided by Vercel

## Environment Variables

Configure these in your Vercel project settings:

- `MAX_FILE_SIZE`: Maximum file size in bytes (default: 10MB)
- `ALLOWED_FILE_TYPES`: Comma-separated list of allowed MIME types (includes text/html for transcripts)

## Important Notes for File Storage

Vercel's serverless functions have an ephemeral filesystem, which means:

1. Files uploaded through this API in production will not persist between function invocations
2. For production use, modify the code to use:
   - Vercel Blob Storage
   - Amazon S3
   - Firebase Storage
   - Or another cloud storage solution

## License

MIT 

# Discord Transcript API Examples

This repository contains examples of how to use the API.scalf.dev transcript generation service, which allows you to create HTML transcripts of Discord channels.

## API Overview

The API.scalf.dev service provides a simple way to generate Discord channel transcripts. The API endpoint is:

```
https://api.scalf.dev/api/transcripts/generate
```

## No Authentication Required

The API now works without requiring a Discord bot token on the server side. When no token is configured, it will generate a simplified transcript with placeholder messages. This makes it easy to get started without any authentication setup.

## Transcript Hosting on api.scalf.dev

Transcripts are now hosted directly on api.scalf.dev using Vercel Blob storage. This means users receive a direct URL to view their transcript online, such as:

```
https://api.scalf.dev/api/transcripts/view/transcript_username_channelid_timestamp.html
```

or a direct link to the Vercel Blob storage:

```
https://[blob-storage-id].public.blob.vercel-storage.com/transcript_username_channelid_timestamp.html
```

### Setting Up Vercel Blob Storage

To set up Vercel Blob storage for your own deployment:

1. Install the @vercel/blob package:
   ```
   npm install @vercel/blob
   ```

2. Add the required environment variables to your Vercel project:
   - `BLOB_READ_WRITE_TOKEN`: Your Vercel Blob storage read/write token

3. Create tokens in your Vercel dashboard:
   - Go to your project in the Vercel dashboard
   - Navigate to Storage → Blob
   - Click "Create" if you haven't created a storage yet
   - Create a read/write token and add it to your environment variables

## Examples

This repository includes two example implementations:

1. **Direct API Usage** (`examples/direct-api-usage.js`): A simple example showing how to directly call the transcript API and receive a URL to the hosted transcript.

2. **Discord Bot Integration** (`examples/discord-bot-integration-simplified.js`): A more comprehensive example that demonstrates how to integrate transcript generation into a Discord bot with a ticket system. It uses the hosted transcript URL in Discord embeds.

## Required Parameters

The API requires the following parameters:

- `channelId`: The ID of the Discord channel to generate a transcript for

## Optional Parameters

The API also accepts several optional parameters:

- `guildId`: The ID of the Discord guild (server) that the channel belongs to
- `userId`: ID of the user who created the ticket
- `username`: Username to display in the transcript
- `closedBy`: ID of the user who closed the ticket
- `messageContent`: Custom message content for the placeholder transcript (when no Discord token is configured)
- `apiKey`: Your API key if required
- `includeAttachments`: Whether to include message attachments (default: true)
- `includeReactions`: Whether to include message reactions (default: true)
- `useRelativeTimestamps`: Whether to use relative timestamps (default: true)

## Getting Started

1. Install dependencies:
   ```
   npm install discord.js node-fetch fs path
   ```

2. Run the simple example:
   ```
   node examples/direct-api-usage.js
   ```

3. Or run the Discord bot example (requires a bot token):
   ```
   node examples/discord-bot-integration-simplified.js
   ```

## Response Format

A successful API response will contain a `file` object with:

- `url`: The URL to the hosted transcript on api.scalf.dev or Vercel Blob storage
- `filename`: The filename of the transcript
- `mimetype`: The file type (usually text/html)
- `size`: The file size in bytes
- `messageCount`: Number of messages in the transcript
- `isPlaceholder`: Boolean indicating if this is a placeholder transcript
- `content`: The HTML content (only included as fallback if Blob storage is not available)

## Fallback Behavior

The service has several fallbacks to ensure transcripts are always available:

1. **With Vercel Blob storage**: Transcripts are stored in Blob storage with a public URL
2. **Without Blob storage**: The API generates a URL on api.scalf.dev that serves the transcript
3. **If both fail**: The HTML content is included directly in the API response

## Error Handling

The examples include proper error handling to deal with API errors and other issues that might occur during transcript generation.

## Notes

- Replace placeholder IDs and tokens with your actual Discord IDs and bot token
- The Discord bot example requires Discord.js v14 or later
- For production use, you may want to add additional error handling
- With no Discord token on the server, you'll receive a basic transcript with placeholder messages 