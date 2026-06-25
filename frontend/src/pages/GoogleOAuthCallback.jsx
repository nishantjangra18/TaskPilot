import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLabel } from '../components/GoogleBranding';
import {
  GOOGLE_OAUTH_STATUS_KEY,
  GOOGLE_TOKEN_KEY,
} from '../config/googleCalendarOAuth';

const GoogleOAuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const queryParams = new URLSearchParams(window.location.search);
    const token = hashParams.get('access_token');
    const error = hashParams.get('error') || queryParams.get('error');
    const errorDescription = hashParams.get('error_description') || queryParams.get('error_description');

    if (token) {
      localStorage.setItem(GOOGLE_TOKEN_KEY, token);
      localStorage.setItem(GOOGLE_OAUTH_STATUS_KEY, 'Google Calendar connected.');
    } else if (error) {
      localStorage.setItem(GOOGLE_OAUTH_STATUS_KEY, errorDescription || `Google OAuth failed: ${error}`);
    } else {
      localStorage.setItem(GOOGLE_OAUTH_STATUS_KEY, 'Google OAuth callback did not include an access token.');
    }

    navigate('/calendar', { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center text-sm font-semibold">
      <GoogleLabel kind="calendar" size="md">Connecting Google Calendar...</GoogleLabel>
    </div>
  );
};

export default GoogleOAuthCallback;
