import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FleetBridgeEngine } from '../dist/engine/fleetBridge.js';

test('FleetBridgeEngine formats Trilium notes into standardized Ikmal sync payloads', () => {
    const bridge = new FleetBridgeEngine({
        enabled: true,
        serverUrl: 'https://fleetsync.example.com',
        authToken: 'test_token_123',
    });

    assert.equal(bridge.isConfigured(), true);

    const note = {
        noteId: 'abc123note',
        title: 'Complete FleetSync Bridge Integration',
        labels: [
            { name: 'status', value: 'in_progress' },
            { name: 'priority', value: 'high' },
            { name: 'utcDateCreated', value: '2026-08-01T09:00:00.000Z' },
        ],
        content: '<p>Integration details for FleetSync sync engine...</p>',
    };

    const payload = bridge.formatNoteForSync(note);

    assert.equal(payload.noteId, 'abc123note');
    assert.equal(payload.title, 'Complete FleetSync Bridge Integration');
    assert.equal(payload.status, 'in_progress');
    assert.equal(payload.priority, 'high');
    assert.equal(payload.utcDateCreated, '2026-08-01T09:00:00.000Z');
    assert.ok(payload.contentSnippet.includes('Integration details'));
});

test('FleetBridgeEngine reports unconfigured status when credentials are missing', () => {
    const unconfigured = new FleetBridgeEngine({ enabled: false });
    assert.equal(unconfigured.isConfigured(), false);
});
