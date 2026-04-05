import { google } from 'googleapis';
import http from 'http';
import url from 'url';

/**
 * 🛠️ GOOGLE DRIVE TOKEN GENERATOR
 * 
 * Instructions:
 * 1. Go to Google Cloud Console > APIs & Services > Credentials.
 * 2. Edit your OAuth 2.0 Client ID (834792094975...).
 * 3. Add http://localhost:3001 to "Authorized redirect URIs".
 * 4. Run this script: node scripts/get-refresh-token.mjs
 * 5. Visit the link shown in your terminal.
 */

// CREDENTIALS - ALWAYS SET IN .env.local
const CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3001';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const scopes = [
  'https://www.googleapis.com/auth/drive.file'
];

async function main() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('❌ ERROR: Missing GOOGLE_DRIVE_CLIENT_ID or GOOGLE_DRIVE_CLIENT_SECRET in environment.');
    console.log('Please make sure you have these set in your .env.local file.');
    process.exit(1);
  }

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // CRITICAL: This gets you the refresh token
    scope: scopes,
    prompt: 'consent' // CRITICAL: Ensures you get a new refresh token every time you run this
  });

  console.log('\n🚀 ACTION REQUIRED: Visit this URL in your browser to authorize your app:');
  console.log('-------------------------------------------------------------------------');
  console.log(authUrl);
  console.log('-------------------------------------------------------------------------\n');

  const server = http.createServer(async (req, res) => {
    console.log(`[Server] Received request: ${req.url}`);
    
    try {
      if (req.url.includes('code=')) {
        const queryData = url.parse(req.url, true).query;
        const code = queryData.code;

        if (code) {
          console.log('[Server] Successfully caught the authorization code!');
          const { tokens } = await oauth2Client.getToken(code);

          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<h1>Auth Successful!</h1><p>You can close this tab now and check your <b>terminal</b> for the token.</p>');
          
          console.log('\n✅ REFRESH TOKEN GENERATED:');
          console.log('----------------------------');
          console.log(tokens.refresh_token);
          console.log('----------------------------\n');
          console.log('Paste this into your .env.local as GOOGLE_DRIVE_REFRESH_TOKEN\n');
          
          server.close();
          process.exit(0);
        }
      } else if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Waiting for Google authorization code...');
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    } catch (e) {
      console.error('\n❌ ERROR:', e.message);
      res.writeHead(500);
      res.end('Authentication failed. Check your terminal for details.');
      process.exit(1);
    }
  }).listen(3001, 'localhost', () => {
    console.log('Local server listening at http://localhost:3001');
  });

  console.log('Waiting for you to log in at the link above...\n');
}

main().catch(console.error);
