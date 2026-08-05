import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

const rootDir = process.cwd();
const packageManifestPath = path.join(rootDir, 'trilium-package.json');
const distArtifactsDir = path.join(rootDir, 'dist', 'artifacts');
const stagedManifestDir = path.join(rootDir, 'manifests');

console.log('📦 Building Ikmal Tools for Trilium package bundle...');

if (!fs.existsSync(distArtifactsDir)) {
    fs.mkdirSync(distArtifactsDir, { recursive: true });
}

// 1. Bundle jsx/ts artifacts into standalone browser/backend JS using esbuild
try {
    // The engines and components are compiled to dist/ as well as bundled into the
    // artifacts. The test suite imports dist/, so without this step it would keep
    // asserting against whatever was compiled last rather than the current source.
    console.log('🔨 Compiling engines and components to dist/...');
    execSync('npx tsc -p tsconfig.build.json', { stdio: 'inherit' });

    console.log('🔨 Bundling dashboard render artifact...');
    execSync('npx esbuild src/artifacts/notes-system-dashboard.jsx --loader:.jsx=tsx --bundle --format=iife --target=es2020 --outfile=dist/artifacts/notes-system-dashboard.js', { stdio: 'inherit' });

    console.log('🔨 Bundling Today page render artifact...');
    execSync('npx esbuild src/artifacts/notes-system-today-page.jsx --loader:.jsx=tsx --bundle --format=iife --target=es2020 --outfile=dist/artifacts/notes-system-today-page.js', { stdio: 'inherit' });

    console.log('🔨 Bundling project dashboard render artifact...');
    execSync('npx esbuild src/artifacts/notes-system-project-dashboard.js --bundle --format=iife --target=es2020 --outfile=dist/artifacts/notes-system-project-dashboard.js', { stdio: 'inherit' });

    console.log('🔨 Bundling standalone kanban render artifact...');
    execSync('npx esbuild src/artifacts/notes-system-kanban.jsx --loader:.jsx=tsx --bundle --format=iife --target=es2020 --outfile=dist/artifacts/notes-system-kanban.js', { stdio: 'inherit' });

    console.log('🔨 Bundling standalone insights render artifact...');
    execSync('npx esbuild src/artifacts/notes-system-insights.jsx --loader:.jsx=tsx --bundle --format=iife --target=es2020 --outfile=dist/artifacts/notes-system-insights.js', { stdio: 'inherit' });

    console.log('🔨 Bundling standalone quick capture toolbar artifact...');
    execSync('npx esbuild src/artifacts/notes-system-quick-capture.jsx --loader:.jsx=tsx --bundle --format=iife --target=es2020 --outfile=dist/artifacts/notes-system-quick-capture.js', { stdio: 'inherit' });

    console.log('🔨 Bundling standalone weather render artifact...');
    execSync('npx esbuild src/artifacts/notes-system-weather.jsx --loader:.jsx=tsx --bundle --format=iife --target=es2020 --outfile=dist/artifacts/notes-system-weather.js', { stdio: 'inherit' });

    console.log('🔨 Bundling standalone on-this-day render artifact...');
    execSync('npx esbuild src/artifacts/notes-system-on-this-day.jsx --loader:.jsx=tsx --bundle --format=iife --target=es2020 --outfile=dist/artifacts/notes-system-on-this-day.js', { stdio: 'inherit' });

    console.log('🔨 Bundling standalone stale-notes render artifact...');
    execSync('npx esbuild src/artifacts/notes-system-stale-notes.jsx --loader:.jsx=tsx --bundle --format=iife --target=es2020 --outfile=dist/artifacts/notes-system-stale-notes.js', { stdio: 'inherit' });

    console.log('🔨 Bundling standalone canvas render artifact (beta)...');
    execSync('npx esbuild src/artifacts/notes-system-canvas.jsx --loader:.jsx=tsx --bundle --format=iife --target=es2020 --outfile=dist/artifacts/notes-system-canvas.js', { stdio: 'inherit' });

    console.log('🔨 Bundling launcher artifact...');
    execSync('npx esbuild src/artifacts/notes-system-launcher.js --bundle --format=iife --target=es2020 --outfile=dist/artifacts/notes-system-launcher.js', { stdio: 'inherit' });

    console.log('🔨 Bundling word count status bar artifact...');
    execSync('npx esbuild src/artifacts/notes-system-word-count.js --bundle --format=iife --target=es2020 --outfile=dist/artifacts/notes-system-word-count.js', { stdio: 'inherit' });

    console.log('🔨 Bundling workspace bootstrap artifact...');
    execSync('npx esbuild src/artifacts/notes-system-workspace-bootstrap.js --bundle --format=iife --target=es2020 --outfile=dist/artifacts/notes-system-workspace-bootstrap.js', { stdio: 'inherit' });

    console.log('🔨 Copying CSS stylesheet...');
    const stylesheetSource = fs.readFileSync(path.join(rootDir, 'src', 'artifacts', 'notes-system.css'), 'utf8');
    fs.writeFileSync(path.join(distArtifactsDir, 'notes-system.css'), stylesheetSource);

    const editorStart = '/* Ikmal Editor standalone styles begin. Keep this marked block extractable so';
    const editorEnd = '/* Ikmal Editor standalone styles end. */';
    const editorStartIndex = stylesheetSource.indexOf(editorStart);
    const editorEndIndex = stylesheetSource.indexOf(editorEnd, editorStartIndex);
    if (editorStartIndex < 0 || editorEndIndex < 0) throw new Error('Ikmal Editor stylesheet extraction markers are missing.');
    const editorStyles = stylesheetSource.slice(editorStartIndex, editorEndIndex + editorEnd.length).trim() + '\n';
    fs.writeFileSync(path.join(distArtifactsDir, 'ikmal-editor.css'), editorStyles);

    const distBackendDir = path.join(rootDir, 'dist', 'backend');
    if (!fs.existsSync(distBackendDir)) {
        fs.mkdirSync(distBackendDir, { recursive: true });
    }
    const srcBackendDir = path.join(rootDir, 'src', 'backend');
    if (fs.existsSync(srcBackendDir)) {
        console.log('🔨 Copying backend event scripts...');
        for (const file of fs.readdirSync(srcBackendDir)) {
            if (file.endsWith('.js')) {
                fs.copyFileSync(path.join(srcBackendDir, file), path.join(distBackendDir, file));
            }
        }
    }
} catch (err) {
    console.error('❌ Bundling failed:', err.message);
    process.exit(1);
}

// 2. Read trilium-package.json
const manifestRaw = fs.readFileSync(packageManifestPath, 'utf8');
const manifest = JSON.parse(manifestRaw);

// 3. Calculate SRI sha256 integrity hashes for bundled dist/artifacts
for (const artifact of manifest.artifacts) {
    const distRelPath = artifact.source.replace(/^src\//, 'dist/').replace(/\.jsx$/, '.js');
    const artifactPath = path.join(rootDir, distRelPath);
    if (!fs.existsSync(artifactPath)) {
        console.warn(`⚠️ Bundled artifact file missing: ${distRelPath}`);
        continue;
    }

    const fileContent = fs.readFileSync(artifactPath);
    const hash = crypto.createHash('sha256').update(fileContent).digest('base64');
    artifact.integrity = `sha256-${hash}`;
    console.log(`  ✓ ${artifact.id} -> ${artifact.integrity}`);
}

// 4. Save updated trilium-package.json
fs.writeFileSync(packageManifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('✅ Updated trilium-package.json with computed SRI hashes.');
// 5. Generate staged standalone component metadata from the same build outputs.
// These manifests are intentionally not registered or deployed until the host
// ownership-transfer migration is ready; generation must not create a second
// live package tree.
if (!fs.existsSync(stagedManifestDir)) fs.mkdirSync(stagedManifestDir, { recursive: true });
const sriFor = (relativePath) => {
    const bytes = fs.readFileSync(path.join(rootDir, relativePath));
    return `sha256-${crypto.createHash('sha256').update(bytes).digest('base64')}`;
};
const editorManifest = {
    id: 'iansherr/ikmal_editor_trilium',
    version: '0.1.0',
    name: 'Ikmal Editor',
    description: 'Local Trilium editor decorations with word count, selection details, and non-destructive duplicate-word highlighting.',
    author: manifest.author,
    maintainer: manifest.maintainer,
    repository: manifest.repository,
    homepage: manifest.homepage,
    license: manifest.license,
    maintenance: manifest.maintenance,
    securityStatus: manifest.securityStatus,
    compatibility: manifest.compatibility,
    permissions: ['read-notes'],
    artifacts: [
        {
            id: 'ikmal-editor',
            type: 'frontend',
            source: 'dist/artifacts/notes-system-word-count.js',
            integrity: sriFor('dist/artifacts/notes-system-word-count.js'),
            title: 'Ikmal Editor',
            activation: 'startup'
        },
        {
            id: 'ikmal-editor-css',
            type: 'css',
            source: 'dist/artifacts/ikmal-editor.css',
            integrity: sriFor('dist/artifacts/ikmal-editor.css'),
            title: 'Ikmal Editor styles',
            activation: 'startup'
      }
    ],
    staged: true,
    stagedReason: 'Publish after the compatibility package ownership transfer is validated.'
};
fs.writeFileSync(path.join(stagedManifestDir, 'ikmal-editor.json'), JSON.stringify(editorManifest, null, 2) + '\n');

const bundleManifest = {
    schemaVersion: 1,
    kind: 'bundle',
    id: 'iansherr/ikmal_tools',
    version: '0.1.0',
    name: 'Ikmal Tools',
    description: 'A selectable bundle of independently managed Ikmal Trilium apps.',
    repository: manifest.repository,
    staged: true,
    stagedReason: 'Publish after component ownership transfer and bundle lifecycle UI are validated.',
    components: [
        { id: manifest.id, role: 'core', required: true },
        { id: editorManifest.id, role: 'editor', required: false, defaultEnabled: true }
    ]
};
fs.writeFileSync(path.join(stagedManifestDir, 'ikmal-tools-bundle.json'), JSON.stringify(bundleManifest, null, 2) + '\n');

const shortcutsManifest = {
    id: 'iansherr/ikmal_shortcuts_trilium',
    version: '0.1.0',
    name: 'Ikmal Shortcuts & Quick Capture',
    description: 'Global keyboard hotkeys (Alt+T/S/M, Cmd+Shift+K), searchable hotkey cheatsheet, and quick capture command palette.',
    author: manifest.author,
    maintainer: manifest.maintainer,
    repository: manifest.repository,
    homepage: manifest.homepage,
    license: manifest.license,
    maintenance: manifest.maintenance,
    securityStatus: manifest.securityStatus,
    compatibility: manifest.compatibility,
    permissions: ['read-notes', 'write-notes'],
    artifacts: [
        {
            id: 'ikmal-shortcuts-launcher',
            type: 'frontend',
            source: 'dist/artifacts/notes-system-launcher.js',
            integrity: sriFor('dist/artifacts/notes-system-launcher.js'),
            title: 'Ikmal Shortcuts & Quick Capture',
            activation: 'startup'
        }
    ]
};
fs.writeFileSync(path.join(stagedManifestDir, 'ikmal-shortcuts.json'), JSON.stringify(shortcutsManifest, null, 2) + '\n');

const kanbanManifest = {
    id: 'iansherr/ikmal_kanban_trilium',
    version: '0.1.0',
    name: 'Ikmal Standalone Kanban Board',
    description: 'Native HTML5 drag-and-drop Kanban board for task status tracking, priority pill badges, and completion animations.',
    author: manifest.author,
    maintainer: manifest.maintainer,
    repository: manifest.repository,
    homepage: manifest.homepage,
    license: manifest.license,
    maintenance: manifest.maintenance,
    securityStatus: manifest.securityStatus,
    compatibility: manifest.compatibility,
    permissions: ['read-notes', 'write-notes'],
    artifacts: [
        {
            id: 'ikmal-kanban-board',
            type: 'render',
            source: 'dist/artifacts/notes-system-kanban.js',
            integrity: sriFor('dist/artifacts/notes-system-kanban.js'),
            title: 'Ikmal Standalone Kanban Board',
            activation: 'manual'
        }
    ]
};
fs.writeFileSync(path.join(stagedManifestDir, 'ikmal-kanban.json'), JSON.stringify(kanbanManifest, null, 2) + '\n');

console.log('✅ Generated staged Ikmal Editor, Shortcuts, Kanban, and Ikmal Tools bundle manifests.');
console.log('🎉 Build completed successfully!');
