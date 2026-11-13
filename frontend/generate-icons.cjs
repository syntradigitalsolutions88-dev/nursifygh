const fs = require('fs');
const sharp = require('sharp');

async function generate() {
    // 1. Read the existing SVG
    const svgContent = fs.readFileSync('public/favicon.svg', 'utf8');

    // 2. Extract the inner content (remove outer <svg> tags)
    const inner = svgContent
        .replace(/<svg[^>]*>/, '')
        .replace('</svg>', '')
        .replace(/<\?xml[^>]*\?>/, '')
        .replace(/<!DOCTYPE[^>]*>/, '');

    // 3. Wrap in a 512x512 white square, centered
    const svgSquare = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="white"/>
  <g transform="translate(76, 156) scale(9)">
    ${inner}
  </g>
</svg>`;

    fs.writeFileSync('public/icon-square.svg', svgSquare);
    console.log('✅ Created square SVG');

    // 4. Convert to both PNG sizes
    await sharp('public/icon-square.svg').resize(512, 512).png().toFile('public/pwa-512x512.png');
    await sharp('public/icon-square.svg').resize(192, 192).png().toFile('public/pwa-192x192.png');

    console.log('✅ Generated pwa-512x512.png and pwa-192x192.png');
}

generate().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});