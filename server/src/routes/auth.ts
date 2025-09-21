import { Router } from 'express';
import querystring from 'querystring';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();
const router = Router();

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!;
const REDIRECT_URI = process.env.REDIRECT_URI!;

// 1. Redirect user to Spotify for authorization
router.get('/login', (req, res) => {
  const scope = [
    'user-read-private',
    'user-read-email',
    'playlist-read-private',
    'playlist-modify-public',
    'streaming'
  ].join(' ');
  const params = querystring.stringify({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope
  });
  res.redirect(`https://accounts.spotify.com/authorize?${params}`);
});

// 2. Handle callback and exchange code for tokens
router.get('/callback', async (req, res) => {
  const code = req.query.code as string;
  try {
    const tokenResponse = await axios.post(
      'https://accounts.spotify.com/api/token',
      querystring.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization:
            'Basic ' +
            Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')
        }
      }
    );
    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    // Store tokens in secure HTTP-only cookies or session
    res.cookie('access_token', access_token, { httpOnly: true });
    res.cookie('refresh_token', refresh_token, { httpOnly: true });
    res.redirect(process.env.CLIENT_URL || 'http://localhost:3000');
  } catch (error) {
    console.error(error);
    res.status(500).send('Authentication error');
  }
});

// 3. Refresh access token
router.get('/refresh_token', async (req, res) => {
  const refresh_token = req.cookies.refresh_token;
  try {
    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      querystring.stringify({
        grant_type: 'refresh_token',
        refresh_token
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization:
            'Basic ' +
            Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')
        }
      }
    );
    const { access_token, expires_in } = response.data;
    res.cookie('access_token', access_token, { httpOnly: true });
    res.json({ access_token, expires_in });
  } catch (error) {
    console.error(error);
    res.status(500).send('Token refresh error');
  }
});

export default router;
