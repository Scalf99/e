# API File Upload Service

A Node.js API service for file uploads, ready to deploy to Vercel and use with your custom domain (api.domain.com).

## Features

- File upload endpoint with customizable size limits and file type filtering
- List all uploaded files
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
- `POST /api/upload` - Upload a file (use form-data with 'file' field)
- `GET /api/files` - List all uploaded files
- `GET /uploads/:filename` - Access an uploaded file

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
- `ALLOWED_FILE_TYPES`: Comma-separated list of allowed MIME types

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