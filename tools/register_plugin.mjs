import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const pluginManifestPath = path.join(rootDir, 'trilium-package.json');
const registryPath = path.join(rootDir, '../trilium_plugins/registry.json');

console.log('🔄 Registering package in trilium_plugins registry...');

if (!fs.existsSync(pluginManifestPath)) {
    console.error('❌ trilium-package.json not found!');
    process.exit(1);
}

if (!fs.existsSync(registryPath)) {
    console.error('❌ trilium_plugins/registry.json not found!');
    process.exit(1);
}

const packageManifest = JSON.parse(fs.readFileSync(pluginManifestPath, 'utf8'));
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

const existingIndex = registry.packages.findIndex((p) => p.id === packageManifest.id);

if (existingIndex >= 0) {
    registry.packages[existingIndex] = packageManifest;
    console.log(`  ✓ Updated existing package '${packageManifest.id}' in registry.json`);
} else {
    registry.packages.push(packageManifest);
    console.log(`  + Registered new package '${packageManifest.id}' in registry.json`);
}

fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2) + '\n');
console.log('✅ Registry updated successfully!');
