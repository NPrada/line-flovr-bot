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
import { SHOP_CONFIGS } from "./shop-configs.js";
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
  // Call it once on startup or wherever you handle your app’s initialization
})();

Object.values(SHOP_CONFIGS).forEach((config) => {
  try {
    const clientConfig: ClientConfig = {
      channelAccessToken: config.channelAccessToken || "",
    };
    const middlewareConfig: MiddlewareConfig = {
      channelSecret: config.channelSecret || "",
    };

    const client = new messagingApi.MessagingApiClient(clientConfig);

    //setup the rich menu for the specific shop
    initRichMenu(client, config.channelAccessToken).catch(console.error);
    //setup the webhook address for the specific shop
    const webhookFullPath = "/callback" + config.webhookPath
    app.post(
      webhookFullPath,
      middleware(middlewareConfig),
      async (req: Request, res: Response): Promise<Response> => {
        const callbackRequest: webhook.CallbackRequest = req.body;
        const events: webhook.Event[] = callbackRequest.events!;

        const results = await Promise.all(
          events.map(async (event: webhook.Event) => {
            try {
              await textEventHandler(client, event);
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
          }),
        );

        return res.status(200).json({
          status: "success",
          results,
        });
      },
    );

    console.log("setup webhook for:", webhookFullPath);
  } catch (e) {
    console.error("error setting up for shop: ", config.shopId, e);
  }
});

// Register the LINE middleware.
app.get("/", async (_: Request, res: Response): Promise<Response> => {
  return res.status(200).json({
    status: "success",
    message: "Connected successfully!",
  });
});

const textEventHandler = async (
  client: messagingApi.MessagingApiClient,
  event: webhook.Event,
): Promise<MessageAPIResponseBase | undefined> => {
  console.log("new event", event);
  const userId = event.source.userId;
  if (userState[userId] == null) {
    userState[userId] = {};
  }

  // Handle the "予約" command
  // PICK A DATE
  if (
    event.type === "message" &&
    event.message.type === "text" &&
    (event.message.text === "予約" ||
      event.message.text.toLowerCase().trim() === "hello")
  ) {
    if (!event.replyToken) return;

    const earliestDateString = formatDateToDateString(
      addHoursToDate(new Date(), 3),
    );

    const botInfo = await client.getBotInfo();

    const callIfWithin3Hours = tsl.callIfWithin3Hours.replace(
      "{phoneNumber}",
      SHOP_CONFIGS[botInfo.basicId].shopPhoneNumber,
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

  // SELECTED DATE
  if (
    event.type === "postback" &&
    event.postback.data.includes("action=selectDate")
  ) {
    const postbackData = event.postback;
    const data = convertQueryString(postbackData.data);
    const selectedDate = postbackData.params.datetime;
    const userId = data.userId;

    const res = await client.getBotInfo();

    await createNewDbRow(
      userId,
      new Date(selectedDate),
      res.basicId,
      res.displayName,
    );

    if (!event.replyToken) return;

    await client.replyMessage({
      replyToken: event.replyToken,
      messages: [
        {
          type: "text",
          text: `${selectedDate}`,
        },
        {
          type: "template",
          altText: "Three-button menu",
          template: {
            type: "buttons",
            title: tsl.selectPurposeTitle,
            text: tsl.selectPurposeText,
            actions: [
              {
                type: "postback",
                label: tsl.birthday,
                displayText: tsl.birthday,
                data: `action=purposeSelect&itemType=${tsl.birthday}-birthday&userId=${userId}`,
              },
              {
                type: "postback",
                label: tsl.celebration,
                displayText: tsl.celebration,
                data: `action=purposeSelect&itemType=${tsl.celebration}-celebration&userId=${userId}`,
              },
              {
                type: "postback",
                label: tsl.offering,
                displayText: tsl.offering,
                data: `action=purposeSelect&itemType=${tsl.offering}-offering&userId=${userId}`,
              },
              {
                type: "postback",
                label: tsl.homeUse,
                displayText: tsl.homeUse,
                data: `action=purposeSelect&itemType=${tsl.homeUse}-homeuse&userId=${userId}`,
              },
            ],
          },
        },
      ],
    });
  } else if (
    event.type === "postback" &&
    event.postback.data.includes("action=purposeSelect")
  ) {
    const data = convertQueryString(event.postback.data);
    const itemType = data.itemType;
    const userId = data.userId;

    await updateDbRowByUserId(userId, "Purpose", itemType);

    if (!event.replyToken) return;

    await client.replyMessage({
      replyToken: event.replyToken,
      messages: [
        {
          type: "template",
          altText: "Three-button menu",
          template: {
            type: "buttons",
            title: tsl.selectColorTitle,
            text: tsl.selectColorText,
            actions: [
              {
                type: "postback",
                label: tsl.redColor,
                displayText: tsl.redColor,
                data: `action=colorSelect&itemType=${tsl.redColor}-red&userId=${userId}`,
              },
              {
                type: "postback",
                label: tsl.pinkColor,
                displayText: tsl.pinkColor,
                data: `action=colorSelect&itemType=${tsl.pinkColor}-pink&userId=${userId}`,
              },
              {
                type: "postback",
                label: tsl.yellowOrangeColor,
                displayText: tsl.yellowOrangeColor,
                data: `action=colorSelect&itemType=${tsl.yellowOrangeColor}-yellow-orange&userId=${userId}`,
              },
              {
                type: "postback",
                label: tsl.mixedColor,
                displayText: tsl.mixedColor,
                data: `action=colorSelect&itemType=${tsl.mixedColor}-mix&userId=${userId}`,
              },
            ],
          },
        },
      ],
    });
  } else if (
    event.type === "postback" &&
    event.postback.data.includes("action=colorSelect")
  ) {
    const data = convertQueryString(event.postback.data);
    const itemType = data.itemType;
    const userId = data.userId;

    await updateDbRowByUserId(userId, "Color", itemType);

    if (!event.replyToken) return;

    await client.replyMessage({
      replyToken: event.replyToken,
      messages: [
        {
          type: "text",
          text: tsl.budgetPrompt,
        },
      ],
    });
    userState[userId].awaitingBudget = true;
  } else if (
    event.type === "message" &&
    event.message.type === "text" &&
    userState[event.source.userId].awaitingBudget &&
    event.message.text !== tsl.pinkColor
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
  } else if (
    event.type === "message" &&
    event.message.type === "text" &&
    userState[event.source.userId].awaitingName
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
  } else if (
    event.type === "message" &&
    event.message.type === "text" &&
    userState[event.source.userId].awaitingPhoneNumber
  ) {
    userState[event.source.userId].awaitingPhoneNumber = false;
    const userId = event.source.userId;
    const customerNameValue = event.message.text;

    const updated = await updateDbRowByUserId(
      userId,
      "Phone Number",
      customerNameValue,
    );
    console.log("updated", updated);

    const pageId = updated.id;
    //'17d8c555-5d0f-8116-ae38-cb9837d715ed'
    const summaryString = await createOrderSummary(pageId);

    console.log(summaryString);

    await client.replyMessage({
      replyToken: event.replyToken,
      messages: [
        {
          type: "text",
          text: tsl.phoneNumberAknowledgement.replace(
            "{phoneNumber}",
            customerNameValue,
          ),
        },
        {
          type: "text",
          text: summaryString,
        },
      ],
    });

    await updateDbRowByUserId(userId, "Updated time", new Date().toISOString());
    await updateDbRowByUserId(userId, "Status", "Form Complete");
    delete userState[event.source.userId]; //clear the user state so memory does not fill up
  }
};

/**
 * Fetches a single order (page) from Notion by its pageId
 * and returns a human-readable summary string.
 */
export async function createOrderSummary(pageId: string): Promise<string> {
  try {
    // 1. Retrieve the page from the Notion database
    const page = await notion.pages.retrieve({ page_id: pageId });

    const props = (page as any).properties!;

    // 2. Extract the data from each property
    //    For rich_text, you may want to access [0]?.plain_text safely.
    //    Adjust the property keys below to match what you have in your DB.

    // const userId = props["UserId"]?.title?.[0]?.plain_text || "";
    const customerName =
      props["Customer Name"]?.rich_text?.[0]?.plain_text || "";
    const phoneNumber = props["Phone Number"]?.rich_text?.[0]?.plain_text || "";
    // const email = props["Email "]?.email || "";
    const date = props["Date"]?.date?.start || "";
    const purpose = props["Purpose"]?.rich_text?.[0]?.plain_text || "";
    const budget = props["Budget"]?.rich_text?.[0]?.plain_text || "";
    const color = props["Color"]?.rich_text?.[0]?.plain_text || "";
    const orderNum = props["Order Num"]?.unique_id?.number || "";

    // 3. Build a confirmation summary message
    //    Feel free to adjust the text/format to your preference
    const summaryMessage = `
      ありがとう ${customerName} 様、

      以下の内容でご予約（ご注文）を承りました。
      ---------------------
      ■ ご注文番号: ${orderNum}
      ■ 日時: ${date}
      ■ 目的: ${purpose}
      ■ ご予算: ${budget}
      ■ ご希望の色: ${color}
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
