import { useState, useCallback } from 'react';

export const useDropboxService = () => {
    const APP_KEY = process.env.REACT_APP_DROPBOX_KEY;
    const APP_SECRET = process.env.REACT_APP_DROPBOX_SECRET;
    const REDIRECT_URI = process.env.REACT_APP_REDIRECT_URI || window.location.origin;
    const [status, setStatus] = useState('');

    // Generate a random string for the state parameter
    const generateRandomString = (length = 64) => {
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let text = '';
        for (let i = 0; i < length; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    };

    const initiateAuth = useCallback(() => {
        console.log('Initiating auth with key:', APP_KEY);
        console.log('Redirect URI:', REDIRECT_URI);
        
        const scopes = encodeURIComponent('files.metadata.read files.content.read');
        const state = generateRandomString(); // Use state instead of PKCE for now
        localStorage.setItem('dropbox_auth_state', state);

        const authUrl = `https://www.dropbox.com/oauth2/authorize` +
            `?client_id=${APP_KEY}` +
            `&response_type=code` +
            `&token_access_type=offline` +
            `&scope=${scopes}` +
            `&state=${state}` +
            `&redirect_uri=${REDIRECT_URI}`;
        
        console.log('Auth URL:', authUrl);
        window.location.href = authUrl;
    }, [APP_KEY, REDIRECT_URI]);

    const handleAuthCode = useCallback(async (code, state) => {
        try {
            console.log('Handling auth code:', code);
            setStatus('Exchanging auth code for tokens...');
            
            // Verify state
            const savedState = localStorage.getItem('dropbox_auth_state');
            if (state !== savedState) {
                throw new Error('State mismatch - possible security issue');
            }
            localStorage.removeItem('dropbox_auth_state');

            // Create Basic Auth header
            const basicAuth = btoa(`${APP_KEY}:${APP_SECRET}`);

            const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${basicAuth}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    code,
                    grant_type: 'authorization_code',
                    redirect_uri: REDIRECT_URI,
                }),
            });

            const data = await response.json();
            console.log('Token response:', data);

            if (!response.ok) {
                throw new Error(data.error_description || 'Failed to get tokens');
            }

            localStorage.setItem('dropboxAccessToken', data.access_token);
            localStorage.setItem('dropboxRefreshToken', data.refresh_token);
            localStorage.setItem('dropboxTokenExpiry', Date.now() + (data.expires_in * 1000));
            
            console.log('Tokens stored successfully');
            return data.access_token;
        } catch (err) {
            console.error('Auth error:', err);
            throw err;
        }
    }, [APP_KEY, APP_SECRET, REDIRECT_URI]);

    // Rest of your existing code stays the same...
    const refreshAccessToken = useCallback(async () => {
        console.log('Attempting to refresh token');
        const refreshToken = localStorage.getItem('dropboxRefreshToken');
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        const basicAuth = btoa(`${APP_KEY}:${APP_SECRET}`);

        const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${basicAuth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshToken
            }),
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error_description || 'Failed to refresh token');
        }

        localStorage.setItem('dropboxAccessToken', data.access_token);
        localStorage.setItem('dropboxTokenExpiry', Date.now() + (data.expires_in * 1000));
        
        console.log('Token refreshed successfully');
        return data.access_token;
    }, [APP_KEY, APP_SECRET]);

    const getValidAccessToken = useCallback(async () => {
        console.log('Getting valid access token');
        const accessToken = localStorage.getItem('dropboxAccessToken');
        const tokenExpiry = localStorage.getItem('dropboxTokenExpiry');

        console.log('Current token status:', {
            hasToken: !!accessToken,
            hasExpiry: !!tokenExpiry,
            expiry: tokenExpiry ? new Date(Number(tokenExpiry)).toISOString() : 'none'
        });

        if (!accessToken || !tokenExpiry) {
            return null;
        }

        if (Date.now() > Number(tokenExpiry) - 60000) {
            try {
                return await refreshAccessToken();
            } catch (err) {
                console.error('Failed to refresh token:', err);
                return null;
            }
        }

        return accessToken;
    }, [refreshAccessToken]);

    const listFiles = useCallback(async () => {
        const token = await getValidAccessToken();
        if (!token) {
            throw new Error('No valid access token');
        }

        const response = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                path: '',
                recursive: true
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error_summary || 'Failed to fetch files');
        }
        
        return data.entries;
    }, [getValidAccessToken]);

    const getFileContent = useCallback(async (path) => {
        const token = await getValidAccessToken();
        if (!token) {
            throw new Error('No valid access token');
        }

        const response = await fetch('https://content.dropboxapi.com/2/files/download', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Dropbox-API-Arg': JSON.stringify({
                    path: path
                })
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const content = await response.text();
        return JSON.parse(content);
    }, [getValidAccessToken]);

    return {
        initiateAuth,
        handleAuthCode,
        listFiles,
        getFileContent,
        status
    };
};