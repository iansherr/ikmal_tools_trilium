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

test('Ikmal Editor keeps word count inside the editable note footer', () => {
    const source = fs.readFileSync(new URL('src/artifacts/notes-system-word-count.js', root), 'utf8');

    assert.match(source, /ikmal-editor-footer/);
    assert.match(source, /note-detail-editable-text/);
    assert.match(source, /Ikmal Editor/);
    assert.match(source, /editorElements/);
    assert.match(source, /component\.note-split/);
    assert.match(source, /ikmal-selection-menu/);
    assert.match(source, /editorIssues/);
    assert.match(source, /contextmenu/);
    assert.match(source, /checks in this paragraph/);
    assert.match(source, /local \$\{issueCount === 1 \? 'issue' : 'issues'\}/);
    assert.match(source, /ikmal-editor-status-ok/);
    assert.match(source, /bx-check-circle/);
    assert.match(source, /duplicateHighlightName/);
    assert.match(source, /duplicateWordRanges/);
    assert.match(source, /duplicate-word/);
    assert.doesNotMatch(source, /LanguageTool remains available/);
    assert.doesNotMatch(source, /event\.preventDefault\(\)/);
    assert.doesNotMatch(source, /statusBar\.appendChild/);
});

test('build stages Ikmal Editor as an independent component without copying the package tree', () => {
    const editorManifest = JSON.parse(fs.readFileSync(new URL('manifests/ikmal-editor.json', root), 'utf8'));
    const bundleManifest = JSON.parse(fs.readFileSync(new URL('manifests/ikmal-tools-bundle.json', root), 'utf8'));

    assert.equal(editorManifest.id, 'iansherr/ikmal_editor_trilium');
    assert.equal(editorManifest.staged, true);
    assert.deepEqual(editorManifest.artifacts.map((artifact) => artifact.id), ['ikmal-editor', 'ikmal-editor-css']);
    assert.match(editorManifest.artifacts[0].source, /^dist\/artifacts\//);
    assert.match(editorManifest.artifacts[1].source, /^dist\/artifacts\/ikmal-editor\.css$/);
    assert.ok(editorManifest.artifacts.every((artifact) => /^sha256-[A-Za-z0-9+/]{43}=$/.test(artifact.integrity)));

    assert.equal(bundleManifest.kind, 'bundle');
    assert.equal(bundleManifest.staged, true);
    assert.deepEqual(bundleManifest.components.map((component) => component.id), [
        'iansherr/ikmal_tools_trilium',
        'iansherr/ikmal_editor_trilium'
    ]);
    assert.equal(bundleManifest.components[1].defaultEnabled, true);
});

test('launcher registers native configurable launchbar entries', () => {
    const launcherSource = fs.readFileSync(new URL('src/artifacts/notes-system-launcher.js', root), 'utf8');

    assert.match(launcherSource, /createOrUpdateLauncher/);
    assert.match(launcherSource, /scriptInLauncherContent/);
    assert.match(launcherSource, /iconClass/);
    assert.doesNotMatch(launcherSource, /text-primary/);
    assert.match(launcherSource, /New Project Hub/);
    assert.match(launcherSource, /New Edit/);
    assert.match(launcherSource, /New Email/);
    assert.match(launcherSource, /__ikmalQuickCapture/);
    assert.match(launcherSource, /Live Editor Status Bar Word Count launcher/);
    assert.match(launcherSource, /Header Launcher Bar & Hotkey launcher/);
    assert.match(launcherSource, /getParentBranches/);
});

test('focused Today page hides the workspace Open Tasks widget and repairs daily-note sections', () => {
    const todayPageSource = fs.readFileSync(new URL('src/artifacts/notes-system-today-page.jsx', root), 'utf8');
    const homepageSource = fs.readFileSync(new URL('src/components/TodayHomepage.tsx', root), 'utf8');
    const bootstrapSource = fs.readFileSync(new URL('src/artifacts/notes-system-workspace-bootstrap.js', root), 'utf8');

    assert.match(todayPageSource, /showOpenTasks: false/);
    assert.match(homepageSource, /widget\.id !== 'openTasks'/);
    assert.match(homepageSource, /openJournalNote/);
    assert.match(homepageSource, /journalWidthPercent/);
    assert.match(bootstrapSource, /cleanDailyNotes/);
    assert.match(bootstrapSource, /cleanDailyTemplate/);
    assert.match(bootstrapSource, /removeProjectDashboardsFromDailyNotes/);
    assert.match(bootstrapSource, /notes\/\$\{noteId\}\/data/);
    assert.match(bootstrapSource, /data-box-size="expandable"/);
});

test('workspace bootstrap is a startup artifact and project dashboards are render artifacts', () => {
    const bootstrap = manifest.artifacts.find((artifact) => artifact.id === 'notes-system-workspace-bootstrap');
    const projectDashboard = manifest.artifacts.find((artifact) => artifact.id === 'notes-system-project-dashboard');

    assert.equal(bootstrap?.type, 'frontend');
    assert.equal(bootstrap?.activation, 'startup');
    assert.equal(projectDashboard?.type, 'render');
    assert.equal(projectDashboard?.activation, 'manual');

    const source = fs.readFileSync(new URL('src/artifacts/notes-system-workspace-bootstrap.js', root), 'utf8');
    assert.match(source, /findOrCreateVisibleToday/);
    assert.match(source, /attachProjectDashboards/);
    assert.match(source, /#extTemplate/);
    assert.match(source, /projectHub/);
    assert.match(source, /markerValue/);
    assert.match(source, /hasMarker/);
    assert.match(source, /extHubDashboard/);
    assert.match(source, /repairTodayBranches/);
    assert.match(source, /clone-to-note/);
    assert.match(source, /quick-search/);
    assert.match(source, /preserving any text the user entered there/);
});

test('project dashboards support legacy hubs and show live related work', () => {
    const source = fs.readFileSync(new URL('src/artifacts/notes-system-project-dashboard.js', root), 'utf8');
    assert.match(source, /extProjectHub/);
    assert.match(source, /extTemplate.*projectHub/);
    assert.match(source, /noteType.*projectHub/);
    assert.match(source, /searchRelated/);
    assert.match(source, /Awaiting replies & follow-ups/);
    assert.match(source, /Archive project/);
    assert.match(source, /container-type: inline-size/);
    assert.match(source, /@container project-dashboard/);
    assert.match(source, /getParentNoteIds/);
    assert.match(source, /getParentNotes/);
});

test('Today has a separate visible page from the workspace settings dashboard', () => {
    const todayPage = manifest.artifacts.find((artifact) => artifact.id === 'notes-system-today-page');
    assert.equal(todayPage?.type, 'render');
    assert.equal(todayPage?.activation, 'manual');

    const source = fs.readFileSync(new URL('src/artifacts/notes-system-today-page.jsx', root), 'utf8');
    const homepageSource = fs.readFileSync(new URL('src/components/TodayHomepage.tsx', root), 'utf8');
    assert.match(source, /showEditor: false/);
    assert.match(source, /showJournalCard: true/);
    assert.match(homepageSource, /renderActiveProjects/);
    assert.match(homepageSource, /#kind AND #status = active/);
    assert.doesNotMatch(source, /renderSettingsStudio/);
});
