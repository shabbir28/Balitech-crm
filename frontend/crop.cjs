const Jimp = require('jimp');

async function main() {
    try {
        const imgPath = 'public/assets/Go Connectivo 1.png';
        const img = await Jimp.read(imgPath);
        const w = img.bitmap.width;
        const h = img.bitmap.height;
        console.log(`Image size: ${w}x${h}`);
        
        // Assuming the logo is on the left and is roughly square, with the height determining the size.
        // Or if it's perfectly square, let's just make it a square cropping from the left.
        const cropSize = Math.min(w, h); // Try cropping a square block from the left
        const newImg = img.clone().crop(0, 0, cropSize, cropSize);
        await newImg.writeAsync('public/assets/favicon_custom.png');
        console.log('Saved favicon_custom.png');
    } catch(err) {
        console.error(err);
    }
}
main();
