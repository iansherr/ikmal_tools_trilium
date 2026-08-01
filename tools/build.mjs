import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

const rootDir = process.cwd();
const packageManifestPath = path.join(rootDir, 'trilium-package.json');
const distArtifactsDir = path.join(rootDir, 'dist', 'artifacts');

console.log('📦 Building Trilium Notes System Plugin Bundle...');

if (!fs.existsSync(distArtifactsDir)) {
    fs.mkdirSync(distArtifactsDir, { recursive: true });
}

// 1. Bundle jsx/ts artifacts into standalone browser/backend JS using esbuild
try {
    console.log('🔨 Bundling dashboard render artifact...');
    execSync('npx esbuild src/artifacts/notes-system-dashboard.jsx --loader:.jsx=tsx --bundle --format=iife --target=es2020 --outfile=dist/artifacts/notes-system-dashboard.js', { stdio: 'inherit' });

    console.log('🔨 Bundling backend worker artifact...');
    execSync('npx esbuild src/artifacts/notes-system-backend.js --bundle --format=cjs --target=es2020 --outfile=dist/artifacts/notes-system-backend.js', { stdio: 'inherit' });

    console.log('🔨 Bundling launcher artifact...');
    execSync('npx esbuild src/artifacts/notes-system-launcher.js --bundle --format=iife --target=es2020 --outfile=dist/artifacts/notes-system-launcher.js', { stdio: 'inherit' });

    console.log('🔨 Copying CSS stylesheet...');
    fs.copyFileSync(path.join(rootDir, 'src', 'artifacts', 'notes-system.css'), path.join(distArtifactsDir, 'notes-system.css'));
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
console.log('🎉 Build completed successfully!');
