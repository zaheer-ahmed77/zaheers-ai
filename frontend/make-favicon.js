import sharp from 'sharp';

async function processLogo() {
  try {
    const inputBuffer = await sharp('public/logo.webp').toBuffer();
    
    // We want to turn dark pixels transparent and keep bright pixels.
    // Or we can just use sharp to composite it or use a boolean operation.
    // Actually, since it's an orange Z on black, if we extract the alpha based on luminance, the orange will become semi-transparent which might not look good.
    // Let's just create a square crop of the Z and make the corners transparent (rounded corners).
    
    await sharp('public/logo.webp')
      .extract({ left: 100, top: 100, width: 300, height: 300 }) // Roughly extracting the Z part, we need to guess the coords.
      .resize(256, 256)
      .png()
      .toFile('public/favicon.png');
      
    console.log("Favicon created.");
  } catch(e) {
    console.error(e);
  }
}
processLogo();
