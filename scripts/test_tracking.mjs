import https from 'https';

// Dest URL: https://google.com
// Base64 encoded: aHR0cHM6Ly9nb29nbGUuY29t
const destUrl = 'aHR0cHM6Ly9nb29nbGUuY29t';
const trackingUrl = `https://automation.ideas.edu.vn/mail_api/webhook.php?type=click&sid=1&fid=1&url=${destUrl}`;

const testRequest = (headers = {}) => {
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                ...headers
            }
        };

        https.get(trackingUrl, options, (res) => {
            resolve({
                statusCode: res.statusCode,
                headers: res.headers
            });
        }).on('error', reject);
    });
};

async function runTests() {
    console.log('--- RUNNING EMAIL CLICK TRACKING AUDIT ---');

    // Test 1: Standard human click (expecting redirect)
    try {
        const res = await testRequest();
        console.log('Test 1 (Human click):');
        console.log('  Status Code:', res.statusCode);
        console.log('  Location redirect:', res.headers.location);
    } catch (e) {
        console.error('Test 1 failed:', e.message);
    }

    // Test 2: Scanner prefetch bot (expecting redirect but we check headers for prefetch block)
    try {
        const res = await testRequest({
            'HTTP_PURPOSE': 'prefetch',
            'User-Agent': 'GoogleImageProxy'
        });
        console.log('Test 2 (Scanner prefetch):');
        console.log('  Status Code:', res.statusCode);
        console.log('  Location redirect:', res.headers.location);
    } catch (e) {
        console.error('Test 2 failed:', e.message);
    }
}

runTests();
