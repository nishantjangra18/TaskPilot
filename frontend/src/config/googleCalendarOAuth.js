export const GOOGLE_EVENTS_KEY = 'taskpilot_google_events';
export const GOOGLE_TOKEN_KEY = 'taskpilot_google_access_token';
export const GOOGLE_SYNC_KEY = 'taskpilot_google_sync_enabled';
export const GOOGLE_SYNCED_IDS_KEY = 'taskpilot_google_synced_event_ids';
export const GOOGLE_SYNCED_AT_KEY = 'taskpilot_google_last_sync_at';
export const GOOGLE_EMAIL_KEY = 'taskpilot_google_calendar_email';
export const GOOGLE_OAUTH_STATUS_KEY = 'taskpilot_google_oauth_status';

export const GOOGLE_OAUTH_REDIRECT_URI = 'http://localhost:5173/auth/google/callback';

export const getGoogleOAuthConfig = () => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return {
    client_id: clientId,
    redirect_uri: GOOGLE_OAUTH_REDIRECT_URI,
    response_type: 'token',
    scope: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly',
    include_granted_scopes: 'true',
    prompt: 'consent',
  };
};

export const buildGoogleAuthUrl = () => {
  const config = getGoogleOAuthConfig();
  if (!config.client_id) return '';

  const params = new URLSearchParams(config);
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  console.log('[TaskPilot Google OAuth] Client ID:', config.client_id);
  console.log('[TaskPilot Google OAuth] Redirect URI:', config.redirect_uri);
  console.log('[TaskPilot Google OAuth] Full OAuth configuration:', config);
  console.log('[TaskPilot Google OAuth] Authorization URL:', authUrl);

  return authUrl;
};
