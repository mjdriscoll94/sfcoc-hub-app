const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateFavicons() {
  // Read the SVG file
  const svgBuffer = fs.readFileSync(path.join(__dirname, '../public/favicon.svg'));

  // Generate favicon.ico (32x32)
  await sharp(svgBuffer)
    .resize(32, 32)
    .toFormat('png')
    .toFile(path.join(__dirname, '../public/favicon-32.png'));

  // Generate apple-touch-icon.png (180x180)
  await sharp(svgBuffer)
    .resize(180, 180)
    .toFile(path.join(__dirname, '../public/apple-touch-icon.png'));

  // Convert 32x32 PNG to ICO
  const { execSync } = require('child_process');
  try {
    // Try using ImageMagick's convert command if available
    execSync('convert public/favicon-32.png public/favicon.ico');
  } catch (error) {
    console.log('ImageMagick not available, keeping PNG favicon');
    // If ImageMagick is not available, we'll just rename the PNG to .ico
    fs.renameSync(
      path.join(__dirname, '../public/favicon-32.png'),
      path.join(__dirname, '../public/favicon.ico')
    );
  }

  // Clean up the temporary PNG file if it still exists
  try {
    fs.unlinkSync(path.join(__dirname, '../public/favicon-32.png'));
  } catch (error) {
    // File might already be renamed/removed, ignore error
  }

  console.log('Favicon files generated successfully!');
}

generateFavicons().catch(console.error); 