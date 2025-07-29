# Google OAuth Setup Guide

This guide will help you set up Google OAuth authentication for your Fina application.

## Prerequisites

- A Google account
- Access to Google Cloud Console

## Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown and create a new project
3. Give your project a name (e.g., "Fina App")
4. Click "Create"

## Step 2: Enable Google+ API

1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Google+ API" 
3. Click on it and then click "Enable"

## Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type (unless you have Google Workspace)
3. Fill in the required information:
   - App name: "Fina"
   - User support email: Your email
   - Developer contact information: Your email
4. Click "Save and Continue"
5. Skip the "Scopes" step for now
6. Add test users (your email) if needed
7. Click "Save and Continue"

## Step 4: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application" as the application type
4. Give it a name (e.g., "Fina Web Client")
5. Add authorized redirect URIs:
   - For development: `http://localhost:3000/api/auth/callback/google`
   - For production: `https://yourdomain.com/api/auth/callback/google`
6. Click "Create"

## Step 5: Update Environment Variables

1. Copy the Client ID and Client Secret from the credentials you just created
2. Update your `.env` file:

```bash
GOOGLE_CLIENT_ID="your-actual-google-client-id-here"
GOOGLE_CLIENT_SECRET="your-actual-google-client-secret-here"
```

## Step 6: Test the Integration

1. Start your development server: `npm run dev`
2. Go to `http://localhost:3000/auth/signin`
3. Click "Sign in with Google"
4. You should be redirected to Google's OAuth consent screen
5. After authorizing, you'll be redirected back to your app

## Troubleshooting

### Common Issues:

1. **Redirect URI mismatch**: Make sure the redirect URI in Google Console exactly matches `http://localhost:3000/api/auth/callback/google`

2. **Invalid client error**: Double-check that your Client ID and Secret are correctly copied to the `.env` file

3. **Consent screen not configured**: Make sure to complete the OAuth consent screen setup

4. **API not enabled**: Ensure Google+ API is enabled in your project

### Security Notes:

- Never commit your `.env` file to version control
- For production, use environment variables or a secure secrets management system
- Regularly rotate your OAuth credentials
- Only add necessary scopes to minimize data access

## Production Deployment

When deploying to production:

1. Update the authorized redirect URI in Google Console to match your production domain
2. Set the environment variables in your production environment
3. Consider setting up domain verification in Google Console
4. Review and publish your OAuth consent screen if needed

## Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [NextAuth.js Google Provider Documentation](https://next-auth.js.org/providers/google)