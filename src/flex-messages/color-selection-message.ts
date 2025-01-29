import { tsl } from "../translations.js";

export const buildColorSelectLineMessage = (userId: string) => ({
  type: "flex",
  altText: "This is a Flex Message",
  contents: {
    type: "bubble",
    size: 'hecto',
    hero: {
      type: "image",
      url: "https://d3p3fw3rutb1if.cloudfront.net/photos/20853f34-0577-48ef-a1b4-54b5d2f36de8",
      size: "full",
      aspectRatio: "15:8",
      aspectMode: "cover",
      action: {
        type: "uri",
        uri: "https://line.me/",
      },
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: "色味を選んでください。",
          weight: "bold",
          size: "xl",
        },
        {
          type: "box",
          layout: "vertical",
          margin: "lg",
          spacing: "sm",
          contents: [
            {
              type: "box",
              layout: "baseline",
              spacing: "sm",
              contents: [
                {
                  type: "text",
                  text: "以下から選択してください。",
                  color: "#aaaaaa",
                  size: "sm",
                  flex: 1,
                },
              ],
            },
          ],
        },
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        {
          type: "button",
          style: "link",
          height: "sm",
          action: {
            type: "postback",
            label: tsl.redColor,
            displayText: tsl.redColor,
            data: `action=colorSelect&colorVal=${tsl.redColor}-red&userId=${userId}`,
          },
        },
        {
          type: "button",
          style: "link",
          height: "sm",
          action: {
            type: "postback",
            label: tsl.pinkColor,
            displayText: tsl.pinkColor,
            data: `action=colorSelect&colorVal=${tsl.pinkColor}-pink&userId=${userId}`,
          },
        },
        {
          type: "button",
          height: "sm",
          style: "link",
          action: {
            type: "postback",
            label: tsl.yellowOrangeColor,
            displayText: tsl.yellowOrangeColor,
            data: `action=colorSelect&colorVal=${tsl.yellowOrangeColor}-yellow-orange&userId=${userId}`,
          },
        },
        {
          type: "button",
          height: "sm",
          style: "link",
          action: {
            type: "postback",
            label: tsl.whiteColor,
            displayText: tsl.whiteColor,
            data: `action=colorSelect&colorVal=${tsl.whiteColor}-white&userId=${userId}`,
          },
        },
        {
          type: "button",
          height: "sm",
          style: "link",
          action: {
            type: "postback",
            label: tsl.mixedColor,
            displayText: tsl.mixedColor,
            data: `action=colorSelect&colorVal=${tsl.mixedColor}-mix&userId=${userId}`,
          },
        },
      ],
      flex: 0,
    },
  },
});
