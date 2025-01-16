import { ClientConfig, messagingApi } from "@line/bot-sdk";
import axios from "axios";
import sharp from "sharp";

const clientConfig: ClientConfig = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || "",
};

const client = new messagingApi.MessagingApiClient(clientConfig);

const tsl = {
  placeOrder: "注文する",
};

async function generatePlaceholderImage() {
  return await sharp({
    create: {
      width: 2500,
      height: 843,
      channels: 3,
      background: { r: 200, g: 200, b: 200 }, // Light gray background
    },
  })
    .jpeg()
    .toBuffer();
}

export async function initRichMenu() {
  try {
    // Step 1: Create the rich menu
    const richMenu = await client.createRichMenu({
      size: {
        width: 2500,
        height: 643,
      },
      selected: false,
      name: "Simple Order Menu",
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
            type: "message",
            text: "予約",
          },
        },
      ],
    });

    console.log("Rich menu created with ID:", richMenu.richMenuId);

    // Step 2: Generate placeholder image
    const placeholderImage = await generatePlaceholderImage();

    // Step 3: Upload the image using axios
    const uploadUrl = `https://api-data.line.me/v2/bot/richmenu/${richMenu.richMenuId}/content`;
    await axios.post(uploadUrl, placeholderImage, {
      headers: {
        Authorization: `Bearer ${clientConfig.channelAccessToken}`,
        "Content-Type": "image/jpeg",
      },
    });
    console.log("Rich menu placeholder image uploaded");

    // Step 4: Set the rich menu as the default
    await client.setDefaultRichMenu(richMenu.richMenuId);
    console.log("Rich menu set as default!");
  } catch (error) {
    console.error("Error initializing rich menu:", error);
  }
}
