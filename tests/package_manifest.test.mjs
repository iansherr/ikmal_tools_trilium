import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(fs.readFileSync(new URL('trilium-package.json', root), 'utf8'));

test('side-effect frontend artifacts are not declared as custom-widget launchers', () => {
    const launcherArtifact = manifest.artifacts.find((artifact) => artifact.id === 'notes-system-launcher');
    const wordCountArtifact = manifest.artifacts.find((artifact) => artifact.id === 'notes-system-word-count');

    assert.equal(launcherArtifact?.type, 'frontend');
    assert.equal(launcherArtifact?.activation, 'startup');
    assert.equal(wordCountArtifact?.type, 'frontend');
    assert.equal(wordCountArtifact?.activation, 'startup');
});

