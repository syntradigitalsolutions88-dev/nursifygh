const fs = require('fs');
const sharp = require('sharp');

async function generate() {
    // 1. Convert the original SVG to a high-res PNG in memory
    const svgBuffer = fs.readFileSync('public/favicon.svg');
    const basePng = await sharp(svgBuffer)
        .resize(1024, 1024, { fit: 'inside' }) // Render it large
        .png()
        .toBuffer();

    // 2. AUTO-CROP: Trim away any transparent or white borders around the logo
    const trimmedPng = await sharp(basePng)
        .trim() 
        .toBuffer();

    // 3. Resize the trimmed logo to fit perfectly inside a 320x320 box
    const logo320 = await sharp(trimmedPng)
        .resize(320, 320, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .toBuffer();

    // 4. Create the 512x512 white background and composite the logo in the center
    await sharp({
        create: { width: 512, height: 512, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } }
    })
    .composite([{ input: logo320, gravity: 'center' }]) // Put it dead center
    .png()
    .toFile('public/pwa-512x512.png');

    // 5. Create the 192x192 version
    await sharp({
        create: { width: 192, height: 192, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } }
    })
    .composite([{ input: await sharp(trimmedPng).resize(120, 120, { fit: 'contain' }).toBuffer(), gravity: 'center' }])
    .png()
    .toFile('public/pwa-192x192.png');

    console.log('✅ Generated perfectly centered PWA icons');
}

generate().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});