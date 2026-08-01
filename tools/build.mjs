import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

const rootDir = process.cwd();
const packageManifestPath = path.join(rootDir, 'trilium-package.json');

console.log('📦 Building Trilium Notes System Plugin...');

// 1. Run TypeScript check & emit JS to dist/
try {
    console.log('🔨 Running TypeScript compilation...');
    execSync('npx tsc --noEmit false --outDir dist --moduleResolution nodeNext --module nodeNext --target ES2022 --jsx react --jsxFactory TriliumReact.createElement --jsxFragmentFactory TriliumReact.Fragment', { stdio: 'inherit' });
} catch (err) {
    console.error('❌ TypeScript compilation failed:', err.message);
    process.exit(1);
}

// 2. Read trilium-package.json
const manifestRaw = fs.readFileSync(packageManifestPath, 'utf8');
const manifest = JSON.parse(manifestRaw);

// 3. Calculate SRI sha256 integrity hashes for artifacts
for (const artifact of manifest.artifacts) {
    const artifactPath = path.join(rootDir, artifact.source);
    if (!fs.existsSync(artifactPath)) {
        console.warn(`⚠️ Artifact source file missing: ${artifact.source}`);
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
