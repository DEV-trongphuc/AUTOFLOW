import https from 'https';

const url = 'https://automation.ideas.edu.vn/mail_api/debug_internal.php';

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        console.log('Server File Content:\n', data);
    });
}).on('error', (err) => {
    console.error('Error:', err.message);
});
