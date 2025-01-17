import { messagingApi } from '@line/bot-sdk';
import axios from 'axios';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tsl = {
  placeOrder: '注文する',
};

export async function initRichMenu(client: messagingApi.MessagingApiClient, channelAccessToken: string) {
  try {
    // Step 1: Create the rich menu
    const richMenu = await client.createRichMenu({
      size: {
        width: 2500,
        height: 643,
      },
      selected: false,
      name: 'Simple Order Menu',
      chatBarText: tsl.placeOrder,
      areas: [
        {
          bounds: {
            x: 0,
            y: 0,
            width: 2500,
            height: 643,
          },
          action: {
            type: 'message',
            text: '予約',
          },
        },
      ],
    });

    // Step 2: Load your own image
    const imagePath =  path.resolve('./images/', 'rich-menu.png');
    console.log('testPath',imagePath)
    const imageBuffer = fs.readFileSync(imagePath);

    // Optional: resize or convert the image with Sharp
    const finalImage = await sharp(imageBuffer).resize(2500, 643).toBuffer();

    // Step 3: Upload the image using axios
    const uploadUrl = `https://api-data.line.me/v2/bot/richmenu/${richMenu.richMenuId}/content`;
    await axios.post(uploadUrl, finalImage, {
      headers: {
        Authorization: `Bearer ${channelAccessToken}`,
        'Content-Type': 'image/jpeg',
      },
    });

    // Step 4: Set the rich menu as the default
    await client.setDefaultRichMenu(richMenu.richMenuId);

    console.log('Rich menu created with ID:', richMenu.richMenuId);
  } catch (error) {
    console.error('Error initializing rich menu:', error);
  }
}
