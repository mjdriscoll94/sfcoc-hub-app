const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

async function createFavicon() {
  try {
    // Read the source PNG
    const inputPath = path.join(process.cwd(), 'src', 'app', 'favicon.ico');
    const outputPath = path.join(process.cwd(), 'src', 'app', 'favicon.ico.tmp');
    
    // Create a 32x32 PNG favicon (standard size)
    await sharp(inputPath)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(outputPath);

    // Replace the original file
    await fs.rename(outputPath, inputPath);
    
    console.log('Favicon has been successfully created!');
  } catch (error) {
    console.error('Error creating favicon:', error);
  }
}

createFavicon(); 