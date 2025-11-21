const { execSync } = require('child_process');

const envs = {
    NEXT_PUBLIC_FIREBASE_API_KEY: 'AIzaSyDl0BvJnN3m2AVSZpCr6Dqbt3mIMa7ZITM',
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'viaticos-d5652.firebaseapp.com',
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'viaticos-d5652'
};

const token = 'Ii7lNSW4c38rr3g7fvpEvkqQ';

Object.entries(envs).forEach(([key, value]) => {
    try {
        // Remove existing
        try {
            execSync(`vercel env rm ${key} production --yes --token ${token}`, { stdio: 'inherit' });
        } catch (e) {
            // Ignore error if var doesn't exist
        }

        // Add new
        console.log(`Adding ${key}...`);
        // We pipe the value directly to stdin of the command to avoid shell parsing issues
        execSync(`echo ${value} | vercel env add ${key} production --token ${token}`, { stdio: 'inherit' });
    } catch (error) {
        console.error(`Error setting ${key}:`, error);
    }
});
