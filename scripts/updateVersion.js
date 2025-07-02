const fs = require('fs');
const path = require('path');

// Read package.json
const packageJson = require('../package.json');

// Update version.ts
const versionFilePath = path.join(__dirname, '../src/lib/version.ts');
const versionContent = `export const APP_VERSION = '${packageJson.version}';
export const APP_NAME = 'SFCOC Hub';
`;

fs.writeFileSync(versionFilePath, versionContent);
console.log(`Updated version.ts to version ${packageJson.version}`); 