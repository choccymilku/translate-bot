const altnames = ['rj', 'rio', 'riodejaneiro', 'rjd', 'rdj'];
const isChainable = true;

const fs = require('fs');
const axios = require('axios');
const dotenv = require('dotenv').config();
const sharp = require('sharp');
const path = require('path');
const { generate } = require('text-to-image');

module.exports = {
    run: async function handleMessage(message, client, currentAttachments, isChained, userID) {
        const attachment = currentAttachments.first() || message.attachments.first();
        if (message.content.includes('help')) {
            return message.reply({
                content: 'Adds a **Rio De Janeiro** instagram filter over an image\n' +
                    'Arguments: `rio:intesity` where intensity is a number between 2 and 8. (default is 5)\nrio:customtext` where customtext is any different text you want (can be combined with intesity)\n' +
                    'Available alt names:`' + `${altnames.join(', ')}` + '`',
            });
        } else if (!attachment) {
            return message.reply({ content: 'Please provide an audio or video file to process.' });
        }
        const userName = userID;
        const args = message.content.split(' ');
        let intensityDecimal = 0.5; // Default intensity

        if (args.length > 1 && args[1].includes(':')) {
            const parts = args[1].split(':');
            if (parts.length === 2) {
            if (isNaN(parts[1])) {
                customText = parts[1];
            } else {
                intensityDecimal = parseInt(parts[1], 10) / 10 || 0.5;
            }
            } else if (parts.length === 3) {
            intensityDecimal = parseInt(parts[1], 10) / 10 || 0.5;
            customText = parts[2];
            }
            console.log('Intensity:', intensityDecimal);
            console.log('Custom Text:', customText);
        }

        const imageUrl = attachment.url;

        try {
            const userName = userID;
            const opacity = intensityDecimal;
            const rnd5dig = Math.floor(Math.random() * 90000) + 10000;

            // Download the base image
            const downloadImage = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            const originalImagePath = `temp/${userName}-RIO.png`;
            fs.writeFileSync(originalImagePath, downloadImage.data);

            // Get image dimensions using sharp for text positioning
            const metadata = await sharp(originalImagePath).metadata();
            const width = metadata.width;
            const height = metadata.height;

            const fontPath = 'fonts/InstagramSans.ttf'; // Path to custom font file
            const overlaidImagePath = `temp/${userName}-RIO-OVERLAID.png`;

            // set the font size to 1/10th of the image entire size
            const fontSize = Math.floor(Math.min(width, height) / 10);
            console.log('Font Size:', fontSize);

            // Call function to overlay image and text
            await overlayImageAndText(width, height, fontSize, fontPath, originalImagePath, overlaidImagePath, opacity, userName, rnd5dig, customText);

            const imageURL = process.env.UPLOADURL + userName + `-RIO-FINAL-${rnd5dig}.png`;
            console.log('Final Image:', imageURL);
            return imageURL;

        } catch (error) {
            console.error('Error processing the image:', error);
            return message.reply({ content: 'Error processing the image.' });
        } finally {
            // Clean up temp files
             fs.unlinkSync(`temp/${userName}-RIO.png`);
            fs.unlinkSync(`temp/${userName}-RIO-OVERLAID.png`);
            fs.unlinkSync(`temp/${userName}-RIO-TEXT.png`);
        }
    }
};

async function overlayImageAndText(width, height, fontSize, fontPath, originalImagePath, overlaidImagePath, opacity, userName, rnd5dig, customText) {
    try {
        // Resize 'riodejaneiro.png' to match the specified width and height and set opacity
        const overlayImage = await sharp(`images/riodejaneiro.png`)
            .resize(width, height)
            .ensureAlpha(opacity)
            .toBuffer();

        await sharp(originalImagePath)
            .composite([{ input: overlayImage, blend: 'over' }])
            .toFile(overlaidImagePath);

        // Generate text image using 'text-to-image' module
        const dataUri = await generate(customText ? customText : 'Rio De Janeiro', {
            debug: true,
            maxWidth: width,
            customHeight: height,
            fontSize: fontSize,
            fontPath: fontPath,
            fontFamily: 'InstagramSans',
            lineHeight: fontSize * 1.2,
            bgColor: 'transparent',
            textColor: 'white',
            textAlign: 'center',
            verticalAlign: 'center',
        });
        const base64Data = dataUri.replace(/^data:image\/png;base64,/, '');
        fs.writeFileSync(`temp/${userName}-RIO-TEXT.png`, base64Data, 'base64');

        // Overlay the text image on top of the base image
        const finalImagePath = `temp/${userName}-RIO-FINAL-${rnd5dig}.png`;
        const finalImage = await sharp(overlaidImagePath)
            .jpeg({ quality: 90 })
            .composite([{ input: `temp/${userName}-RIO-TEXT.png`, blend: 'over' }])
            .toFile(finalImagePath);
        // turn off cache
        sharp.cache(false);
        return finalImage;
    } catch (error) {
        console.error('Error processing image:', error);
        throw error;
    }
}