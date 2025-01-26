import {
  ClientConfig,
  MessageAPIResponseBase,
  messagingApi,
  middleware,
  MiddlewareConfig,
  webhook,
  HTTPFetchError,
} from "@line/bot-sdk";
import express, { Application, Request, Response } from "express";
import "dotenv/config";
import { initRichMenu } from "./src/rich-menu.js";
import { SHOP_CONFIGS, ShopConfig } from "./shop-configs.js";
import {
  createNewDbRow,
  notion,
  updateDbRowByUserId,
} from "./src/notion-utilities.js";
import { tsl } from "./src/translations.js";
import {
  convertQueryString,
  addMonthsToDate,
  addHoursToDate,
  formatDateToDateString,
} from "./src/utils.js";

const userState: Record<
  string,
  {
    awaitingBudget?: boolean;
    awaitingName?: boolean;
    awaitingOrder?: boolean;
    awaitingPhoneNumber?: boolean;
  }
> = {};

const PORT = process.env.PORT || 3000;

const app: Application = express();

(async () => {
  // Any initialization logic you might have
})();

(async () => {
  // Loop over each config sequentially
  for (const config of Object.values(SHOP_CONFIGS)) {
    try {
      const clientConfig: ClientConfig = {
        channelAccessToken: config.channelAccessToken || "",
      };
      const middlewareConfig: MiddlewareConfig = {
        channelSecret: config.channelSecret || "",
      };

      console.log("config", config);

      const client = new messagingApi.MessagingApiClient(clientConfig);
      const botInfo = await client.getBotInfo();

      // Set up webhook endpoint
      const webhookFullPath = "/webhook" + config.webhookPath;
      app.post(
        webhookFullPath,
        middleware(middlewareConfig),
        async (req: Request, res: Response): Promise<Response> => {
          const callbackRequest: webhook.CallbackRequest = req.body;
          const events: webhook.Event[] = callbackRequest.events!;

          const results = await Promise.all(
            events.map(async (event: webhook.Event) => {
              try {
                await textEventHandler(client, event, botInfo, config);
              } catch (err: unknown) {
                if (err instanceof HTTPFetchError) {
                  console.error(err.status);
                  console.error(err.headers.get("x-line-request-id"));
                  console.error(err.body);
                } else if (err instanceof Error) {
                  console.error(err);
                }
                return res.status(500).json({
                  status: "error",
                });
              }
            })
          );

          return res.status(200).json({
            status: "success",
            results,
          });
        }
      );

      // Initialize rich menu if needed
      await initRichMenu(client, config.channelAccessToken);

      console.log("setup webhook for:", webhookFullPath);
    } catch (e) {
      console.error("error setting up for shop: ", config.shopId, e);
    }
  }
})();

// Register the LINE middleware.
app.get("/", async (_: Request, res: Response): Promise<Response> => {
  return res.status(200).json({
    status: "success",
    message: "Connected successfully!",
  });
});

async function textEventHandler(
  client: messagingApi.MessagingApiClient,
  event: webhook.Event,
  botInfo: messagingApi.BotInfoResponse,
  shopConfig: ShopConfig
): Promise<MessageAPIResponseBase | undefined> {
  console.log("new event", event);
  const userId = event.source.userId;
  if (userState[userId] == null) {
    userState[userId] = {};
  }

  // 0) Handle the "予約" command or "hello"
  if (
    event.type === "message" &&
    event.message.type === "text" &&
    (event.message.text === "予約" ||
      event.message.text.toLowerCase().trim() === "hello")
  ) {
    if (!event.replyToken) return;

    const earliestDateString = formatDateToDateString(
      addHoursToDate(new Date(), 3)
    );

    const callIfWithin3Hours = tsl.callIfWithin3Hours.replace(
      "{phoneNumber}",
      SHOP_CONFIGS[botInfo.basicId].shopPhoneNumber
    );

    await client.replyMessage({
      replyToken: event.replyToken,
      messages: [
        {
          type: "template",
          altText: callIfWithin3Hours,
          template: {
            type: "buttons",
            text: callIfWithin3Hours,
            actions: [
              {
                type: "datetimepicker",
                label: "Select date",
                data: `action=selectDate&userId=${userId}`,
                mode: "datetime",
                initial: earliestDateString,
                max: formatDateToDateString(addMonthsToDate(new Date(), 6)),
                min: earliestDateString,
              },
            ],
          },
        },
      ],
    });
  }

  // 1) SELECTED DATE
  if (
    event.type === "postback" &&
    event.postback.data.includes("action=selectDate")
  ) {
    const postbackData = event.postback;
    const data = convertQueryString(postbackData.data);
    const selectedDate = postbackData.params.datetime; // e.g. "2025-01-19T14:00"
    const userId = data.userId;

    // Create (or update) DB row with the newly selected date
    await createNewDbRow(
      userId,
      new Date(selectedDate),
      botInfo.basicId,
      botInfo.displayName
    );

    if (!event.replyToken) return;

    // Now ask for the new "Item Type" question
    await client.replyMessage({
      replyToken: event.replyToken,
      messages: [
        {
          type: "template",
          altText: tsl.pleaseSelectItem,
          template: {
            type: "buttons",
            title: tsl.pleaseSelectItem,
            text: tsl.pleaseSelectItemText,
            actions: [
              {
                type: "postback",
                label: tsl.arrangement,
                displayText: tsl.arrangement,
                data: `action=itemSelect&itemVal=アレンジメント-arrangement&userId=${userId}`,
              },
              {
                type: "postback",
                label: tsl.bouquet,
                displayText: tsl.bouquet,
                data: `action=itemSelect&itemVal=花束-bouquet&userId=${userId}`,
              },
            ],
          },
        },
      ],
    });
  }

  // 2) ITEM SELECTED → Ask for PURPOSE
  else if (
    event.type === "postback" &&
    event.postback.data.includes("action=itemSelect")
  ) {
    const data = convertQueryString(event.postback.data);
    const selectedItem = data.itemVal;
    const userId = data.userId;

    // Store the selected item in Notion (Item Type column)
    await updateDbRowByUserId(userId, "Item Type", selectedItem);

    if (!event.replyToken) return;

    // Now proceed to ask for the purpose
    await client.replyMessage({
      replyToken: event.replyToken,
      messages: [
        {
          type: "template",
          altText: "Purpose selection menu",
          template: {
            type: "buttons",
            title: tsl.selectPurposeTitle,
            text: tsl.selectPurposeText,
            actions: [
              {
                type: "postback",
                label: tsl.birthday,
                displayText: tsl.birthday,
                data: `action=purposeSelect&purposeVal=${tsl.birthday}-birthday&userId=${userId}`,
              },
              {
                type: "postback",
                label: tsl.celebration,
                displayText: tsl.celebration,
                data: `action=purposeSelect&purposeVal=${tsl.celebration}-celebration&userId=${userId}`,
              },
              {
                type: "postback",
                label: tsl.offering,
                displayText: tsl.offering,
                data: `action=purposeSelect&purposeVal=${tsl.offering}-offering&userId=${userId}`,
              },
              {
                type: "postback",
                label: tsl.homeUse,
                displayText: tsl.homeUse,
                data: `action=purposeSelect&purposeVal=${tsl.homeUse}-homeuse&userId=${userId}`,
              },
            ],
          },
        },
      ],
    });
  }

  // 3) PURPOSE SELECTED → Ask for COLOR
  else if (
    event.type === "postback" &&
    event.postback.data.includes("action=purposeSelect")
  ) {
    const data = convertQueryString(event.postback.data);
    const purposeSelected = data.purposeVal;
    const userId = data.userId;

    // Store the selected purpose in Notion
    await updateDbRowByUserId(userId, "Purpose", purposeSelected);

    if (!event.replyToken) return;

    // Now proceed to ask for the color
    await client.replyMessage({
      replyToken: event.replyToken,
      messages: [
        {
          type: "template",
          altText: tsl.selectColorText,
          template: {
            type: "buttons",
            title: tsl.selectColorTitle,
            text: tsl.selectColorText,
            actions: [
              {
                type: "postback",
                label: tsl.redColor,
                displayText: tsl.redColor,
                data: `action=colorSelect&colorVal=${tsl.redColor}-red&userId=${userId}`,
              },
              {
                type: "postback",
                label: tsl.pinkColor,
                displayText: tsl.pinkColor,
                data: `action=colorSelect&colorVal=${tsl.pinkColor}-pink&userId=${userId}`,
              },
              {
                type: "postback",
                label: tsl.yellowOrangeColor,
                displayText: tsl.yellowOrangeColor,
                data: `action=colorSelect&colorVal=${tsl.yellowOrangeColor}-yellow-orange&userId=${userId}`,
              },
              {
                type: "postback",
                label: tsl.whiteColor,
                displayText: tsl.whiteColor,
                data: `action=colorSelect&colorVal=${tsl.whiteColor}-white&userId=${userId}`,
              },
              {
                type: "postback",
                label: tsl.mixedColor,
                displayText: tsl.mixedColor,
                data: `action=colorSelect&colorVal=${tsl.mixedColor}-mix&userId=${userId}`,
              },
            ],
          },
        },
      ],
    });
  }

  // 4) COLOR SELECTED → Ask for BUDGET
  else if (
    event.type === "postback" &&
    event.postback.data.includes("action=colorSelect")
  ) {
    const data = convertQueryString(event.postback.data);
    const colorSelected = data.colorVal;
    const userId = data.userId;

    // Update the color in Notion (returns the updated page object)
    const updatedPage = await updateDbRowByUserId(
      userId,
      "Color",
      colorSelected
    );
    console.log("updatedPage", updatedPage);
    // Now let's see which item type they picked (arrangement vs. bouquet)
    // by reading from Notion
    const itemType = (updatedPage as any).properties["Item Type"]?.rich_text?.[0]?.plain_text || "";

    if (!event.replyToken) return;

    await client.replyMessage({
      replyToken: event.replyToken,
      messages: [
        {
          type: "text",
          text: itemType.includes("arrangement")
            ? tsl.budgetPromptArrangement.replace(
                "{minPrice}",
                String(shopConfig.minArrangementPrice)
              )
            : tsl.budgetPromptBouquet,
        },
      ],
    });

    userState[userId].awaitingBudget = true;
  }

  // 5) BUDGET ENTERED
  else if (
    event.type === "message" &&
    event.message.type === "text" &&
    userState[event.source.userId]?.awaitingBudget
  ) {
    userState[event.source.userId].awaitingBudget = false;
    const userId = event.source.userId;
    const budgetValue = event.message.text;

    await updateDbRowByUserId(userId, "Budget", budgetValue);

    await client.replyMessage({
      replyToken: event.replyToken,
      messages: [
        {
          type: "text",
          text: `${tsl.budgetThankYouPrefix}${budgetValue}${tsl.budgetThankYouSuffix}`,
        },
        {
          type: "text",
          text: tsl.pleaseEnterReservationName,
        },
      ],
    });

    userState[userId].awaitingName = true;
  }

  // 6) NAME ENTERED
  else if (
    event.type === "message" &&
    event.message.type === "text" &&
    userState[event.source.userId]?.awaitingName
  ) {
    userState[event.source.userId].awaitingName = false;
    const userId = event.source.userId;
    const customerNameValue = event.message.text;

    await updateDbRowByUserId(userId, "Customer Name", customerNameValue);

    await client.replyMessage({
      replyToken: event.replyToken,
      messages: [
        {
          type: "text",
          text: tsl.nameAknowledgement.replace("{name}", customerNameValue),
        },
        {
          type: "text",
          text: tsl.pleaseEnterPhoneNumber,
        },
      ],
    });

    userState[userId].awaitingPhoneNumber = true;
  }

  // 7) PHONE NUMBER ENTERED
  else if (
    event.type === "message" &&
    event.message.type === "text" &&
    userState[event.source.userId]?.awaitingPhoneNumber
  ) {
    userState[event.source.userId].awaitingPhoneNumber = false;
    const userId = event.source.userId;
    const phoneNumberValue = event.message.text;

    const updated = await updateDbRowByUserId(
      userId,
      "Phone Number",
      phoneNumberValue
    );

    const pageId = updated.id;
    const summaryString = await createOrderSummary(pageId);

    console.log(summaryString);

    await client.replyMessage({
      replyToken: event.replyToken,
      messages: [
        {
          type: "text",
          text: tsl.phoneNumberAknowledgement.replace(
            "{phoneNumber}",
            phoneNumberValue
          ),
        },
        {
          type: "text",
          text: summaryString,
        },
      ],
    });

    // Mark form complete in Notion
    await updateDbRowByUserId(userId, "Updated time", new Date().toISOString());
    await updateDbRowByUserId(userId, "Status", "Form Complete");
    delete userState[event.source.userId]; // Clear user state
  }
}

export async function createOrderSummary(pageId: string): Promise<string> {
  try {
    // 1. Retrieve the page from the Notion database
    const page = await notion.pages.retrieve({ page_id: pageId });
    const props = (page as any).properties!;

    // 2. Extract the data from each property
    const customerName =
      props["Customer Name"]?.rich_text?.[0]?.plain_text || "";
    const phoneNumber = props["Phone Number"]?.rich_text?.[0]?.plain_text || "";
    const date = props["Date"]?.date?.start || "";
    const purpose = props["Purpose"]?.rich_text?.[0]?.plain_text || "";
    const budget = props["Budget"]?.rich_text?.[0]?.plain_text || "";
    const color = props["Color"]?.rich_text?.[0]?.plain_text || "";
    const itemType = props["Item Type"]?.rich_text?.[0]?.plain_text || "";
    const orderNum = props["Order Num"]?.unique_id?.number || "";

    const tokyoTime = date.toLocaleString("ja_JP", {
      timeZone: "Asia/Tokyo",
    });

    console.log(tokyoTime);

    // 3. Build a confirmation summary message
    const summaryMessage = `
      ${customerName} 様、ありがとうございます。

      以下の内容で仮予約が完了しました。注文確定次第、花文より連絡をいたしますので、少々お待ちください。
      ---------------------
      ■ ご注文番号: ${orderNum}
      ■ 日時: ${tokyoTime}
      ■ 商品: ${itemType.split("-")[0]}  
      ■ 目的: ${purpose.split("-")[0]}  
      ■ ご予算: ${budget}
      ■ ご希望の色: ${color.split("-")[0]}
      ■ 電話番号: ${phoneNumber}
      ---------------------
      もしご不明な点がございましたら、お気軽にご連絡くださいませ。
    `;

    return summaryMessage.trim();
  } catch (error) {
    console.error("Error fetching order from Notion:", error);
    throw error;
  }
}

app.listen(PORT, () => {
  console.log(`Application is live and listening on port ${PORT}`);
});
