const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateFavicons() {
  // Read the SVG file
  const svgBuffer = fs.readFileSync(path.join(__dirname, '../public/images/logo_colored.svg'));

  // Generate favicon.ico (32x32)
  await sharp(svgBuffer)
    .resize(32, 32)
    .toFile(path.join(__dirname, '../public/favicon.ico'));

  // Generate apple-touch-icon.png (180x180)
  await sharp(svgBuffer)
    .resize(180, 180)
    .toFile(path.join(__dirname, '../public/apple-touch-icon.png'));

  console.log('Favicon files generated successfully!');
}

generateFavicons().catch(console.error); 