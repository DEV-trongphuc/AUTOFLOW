import https from 'https';

const url = 'https://automation.ideas.edu.vn/mail_api/test_ping.php';

https.get(url, (res) => {
    console.log('Status Code:', res.statusCode);
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        console.log('Body:', data);
    });
}).on('error', (err) => {
    console.error('Error:', err.message);
});
