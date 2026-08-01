import http from 'node:http';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FleetBridgeEngine } from '../dist/engine/fleetBridge.js';

test('FleetBridgeEngine performs live HTTP POST sync roundtrip with mock FleetSync server', async () => {
    let receivedPayload = null;
    let receivedAuthHeader = null;

    // Spin up a lightweight local mock FleetSync server on port 38090
    const server = http.createServer((req, res) => {
        if (req.method === 'POST' && req.url === '/api/v1/sync/items') {
            receivedAuthHeader = req.headers['authorization'];
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                receivedPayload = JSON.parse(body);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, syncedAt: new Date().toISOString() }));
            });
        } else {
            res.writeHead(404);
            res.end();
        }
    });

    await new Promise((resolve) => server.listen(38090, resolve));

    try {
        const bridge = new FleetBridgeEngine({
            enabled: true,
            serverUrl: 'http://127.0.0.1:38090',
            authToken: 'fleetcrew_mock_token_777',
        });

        const note = {
            noteId: 'task_sync_999',
            title: 'Deploy FleetSync Integration Test',
            labels: [
                { name: 'status', value: 'in_progress' },
                { name: 'priority', value: 'high' },
                { name: 'ikmalSynced', value: 'true' },
            ],
            content: '<p>Targeted item sync payload details...</p>',
        };

        const payload = bridge.formatNoteForSync(note);
        const result = await bridge.pushItem(payload);

        assert.equal(result.success, true);
        assert.equal(receivedAuthHeader, 'Bearer fleetcrew_mock_token_777');
        assert.equal(receivedPayload.noteId, 'task_sync_999');
        assert.equal(receivedPayload.title, 'Deploy FleetSync Integration Test');
        assert.equal(receivedPayload.status, 'in_progress');
        assert.equal(receivedPayload.priority, 'high');
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
});
