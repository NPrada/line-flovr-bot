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
import { SHOP_CONFIGS, ShopConfig, Weekdays } from "./shop-configs.js";
import {
  createNewDbRow,
  getOrderSummary,
  updateDbRowByUserId,
} from "./src/notion-utilities.js";
import { createOrderSummary, tsl } from "./src/translations.js";
import {
  convertQueryString,
  addMonthsToDate,
  addHoursToDate,
  formatDateToDateString,
  isDateOutsideOfWorkingHours,
} from "./src/utils.js";
import {
  OrderSummary,
  sendOrderConfirmation,
} from "./src/send-confirmation.js";

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

    if (isDateOutsideOfWorkingHours(shopConfig, selectedDate)) {
      if (!event.replyToken) return;
      await client.replyMessage({
        replyToken: event.replyToken,
        messages: [
          {
            type: "text",
            text: `Sorry, we are closed at that time. Our working days are: ${shopConfig.workingDays.join(
              ", "
            )}. Our working hours are from ${shopConfig.openingTime} to ${
              shopConfig.closingTime
            }`,
          },
        ],
      });
      // Abort booking
      delete userState[userId];
    }

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
          altText: "Choose an option",
          template: {
            type: "carousel",
            columns: [
              {
                title: "Option Group 1",
                text: "Select one:",
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
                ],
              },
              {
                title: "Option Group 2",
                text: "Select one:",
                actions: [
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
                  {
                    type: "postback",
                    label: "-",
                    displayText: "-",
                    data: `action=colorSelect&colorVal=other&userId=${userId}`,
                  },
                ],
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

    // Now let's see which item type they picked (arrangement vs. bouquet)
    // by reading from Notion
    const itemType =
      (updatedPage as any).properties["Item Type"]?.rich_text?.[0]
        ?.plain_text || "";

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
    const order = await getOrderSummary(pageId);
    const summaryString = createOrderSummary(order);

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
    await sendOrderConfirmation(order, shopConfig);
    delete userState[event.source.userId]; // Clear user state
  }
}

app.listen(PORT, () => {
  console.log(`Application is live and listening on port ${PORT}`);
});

