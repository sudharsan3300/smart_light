// Integration test verifying api.js against an actual HTTP ESP8266 mock server
const http = require('http');

// Spin up a mock ESP8266 HTTP server on port 8081
const mockServer = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.url === '/data') {
        res.writeHead(200);
        res.end(JSON.stringify({
            voltage: 5.02,
            current: 120.50,
            power: 0.60,
            energy: 0.0245,
            light: true
        }));
    } else if (req.url === '/on') {
        res.writeHead(200);
        res.end(JSON.stringify({ status: 'success', light: true }));
    } else if (req.url === '/off') {
        res.writeHead(200);
        res.end(JSON.stringify({ status: 'success', light: false }));
    } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'not found' }));
    }
});

mockServer.listen(8081, async () => {
    console.log('Mock ESP8266 Server listening on http://localhost:8081');

    try {
        global.window = global;
        require('./js/config.js');
        require('./js/mockData.js');
        require('./js/api.js');

        // Test 1: Mock mode fetch
        CONFIG.USE_MOCK_DATA = true;
        const mockReading = await window.apiService.fetchData();
        console.log('[PASS] Demo mode fetch successful:', mockReading);

        // Test 2: Real ESP8266 mode fetch against port 8081
        CONFIG.USE_MOCK_DATA = false;
        CONFIG.ESP8266_API_URL = 'http://localhost:8081';
        const realReading = await window.apiService.fetchData();
        console.log('[PASS] Real ESP8266 endpoint /data fetch successful:', realReading);

        // Test 3: Light ON command
        const onRes = await window.apiService.turnLightOn();
        console.log('[PASS] Real ESP8266 endpoint /on command successful:', onRes);

        // Test 4: Light OFF command
        const offRes = await window.apiService.turnLightOff();
        console.log('[PASS] Real ESP8266 endpoint /off command successful:', offRes);

        // Test 5: Error handling test (non-existent server port)
        CONFIG.ESP8266_API_URL = 'http://localhost:8999';
        let caughtError = false;
        try {
            await window.apiService.fetchData();
        } catch (e) {
            caughtError = true;
            console.log('[PASS] Error handling correctly intercepted offline ESP8266:', e.message);
        }
        if (!caughtError) throw new Error('Failed to intercept offline server');

        console.log('\n=== ALL INTEGRATION & API TESTS PASSED! ===');
    } catch (err) {
        console.error('Integration test failed:', err);
        process.exit(1);
    } finally {
        mockServer.close();
    }
});
