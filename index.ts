// Import all dependencies, mostly using destructuring for better view.
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
import { Client } from "@notionhq/client";

const tsl = {
  selectPurposeTitle: "用途を選んでください",
  selectPurposeText: "以下から選んでください。",
  birthday: "誕生日",
  celebration: "お祝",
  offering: "お供え",
  homeUse: "ご自宅用",

  selectColorTitle: "色味を選んでください",
  selectColorText: "以下から選んでください。",
  redColor: "赤系",
  pinkColor: "ピンク系",
  yellowOrangeColor: "黄色・オレンジ系",
  mixedColor: "ミックス",

  budgetPrompt: "ご予算を入力してください。（税込み）",
  budgetThankYouPrefix: "ありがとうございます！ご予算は",
  budgetThankYouSuffix: "ですね。",

  nameAknowledgement: "Got it! Your name is",
  phoneAknowledgement: "Got it! Your name is",

  pleaseEnterReservationName: "予約のお名前を入力してください。",
  pleaseEnterPhoneNumber: "お電話番号を入力してください。",
  finalThankYou:
    "ありがとうございます！ご注文の承認後、改めてご連絡をさせていただきますので、しばらくお待ちください！",

  callIfWithin3Hours:
    "3時間以内のご注文の場合は、{phoneNumber}までお電話ください。それ以外の方は以下より日時を選んでください。",
};

const notionOrdersDatabaseId = "f131d30fddd24b1faefd80fc7b430375";
const shopPhoneNumber = "055-993-1187";
const userState: Record<
  string,
  {
    awaitingBudget?: boolean;
    awaitingName?: boolean;
    awaitingOrder?: boolean;
    awaitingPhoneNumber?: boolean;
  }
> = {};

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

async function createNewDbRow(userId: string, date: Date) {
  const res = await notion.pages.create({
    parent: {
      database_id: notionOrdersDatabaseId,
    },
    properties: {
      UserId: {
        title: [
          {
            text: {
              content: userId,
            },
          },
        ],
      },
      Date: {
        date: {
          start: date.toISOString(),
        },
      },
    },
  });

  return res;
}

async function updateDbRowByUserId(
  userId: string,
  columnToUpdate: string,
  newVal: string,
) {
  const queryRes = await notion.databases.query({
    database_id: notionOrdersDatabaseId,
    filter: {
      and: [
        {
          property: "UserId",
          title: {
            equals: userId,
          },
        },
        {
          property: "Status",
          status: {
            equals: "Form not complete",
          },
        },
      ],
    },
  });

  if (queryRes.results.length === 0) {
    console.log("No page found with that userId");
    return;
  }

  const page = queryRes.results[0];
  const pageId = page.id;

  await notion.pages.update({
    page_id: pageId,
    properties: {
      [columnToUpdate]: {
        rich_text: [
          {
            text: {
              content: newVal,
            },
          },
        ],
      },
    },
  });
}

function convertQueryString(queryString: string) {
  const params = new URLSearchParams(queryString);
  let keyValues: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    keyValues[key] = value;
  }
  return keyValues;
}

(async () => {
  // Any initialization logic you might have
})();

const clientConfig: ClientConfig = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || "",
};

const middlewareConfig: MiddlewareConfig = {
  channelSecret: process.env.CHANNEL_SECRET || "",
};

const PORT = process.env.PORT || 3000;

const client = new messagingApi.MessagingApiClient(clientConfig);
const app: Application = express();

const textEventHandler = async (
  event: webhook.Event,
): Promise<MessageAPIResponseBase | undefined> => {
  console.log("new event", event);
  const userId = event.source.userId;
  if (userState[userId] == null) {
    userState[userId] = {};
  }

  console.log("userState", userState[event.source.userId]);

  // SELECTED DATE
  if (
    event.type === "postback" &&
    event.postback.data.includes("action=selectDate")
  ) {
    const postbackData = event.postback;
    const data = convertQueryString(postbackData.data);
    const selectedDate = postbackData.params.datetime;
    const userId = data.userId;

    await createNewDbRow(userId, new Date(selectedDate));

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
          text: `${tsl.nameAknowledgement} ${customerNameValue}`,
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

    await updateDbRowByUserId(userId, "Phone Number", customerNameValue);

    await client.replyMessage({
      replyToken: event.replyToken,
      messages: [
        {
          type: "text",
          text: `${tsl.phoneAknowledgement} ${customerNameValue}`,
        },
        {
          type: "text",
          text: tsl.finalThankYou,
        },
      ],
    });
  }

  if (event.type !== "message" || event.message.type !== "text") {
    return;
  }

  // Handle the "予約" command
  if (event.message.text.toLowerCase().trim() === "hello") {
    if (!event.replyToken) return;

    const earliestDateString = formatDateToDateString(
      addHoursToDate(new Date(), 3),
    );
    const callIfWithin3Hours = tsl.callIfWithin3Hours.replace(
      "{phoneNumber}",
      shopPhoneNumber,
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
};

// Register the LINE middleware.
app.get("/", async (_: Request, res: Response): Promise<Response> => {
  return res.status(200).json({
    status: "success",
    message: "Connected successfully!",
  });
});

app.post(
  "/callback",
  middleware(middlewareConfig),
  async (req: Request, res: Response): Promise<Response> => {
    const callbackRequest: webhook.CallbackRequest = req.body;
    const events: webhook.Event[] = callbackRequest.events!;

    const results = await Promise.all(
      events.map(async (event: webhook.Event) => {
        try {
          await textEventHandler(event);
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

app.listen(PORT, () => {
  console.log(`Application is live and listening on port ${PORT}`);
});

function addMonthsToDate(date: Date, months: number) {
  const newDate = new Date(date);
  newDate.setMonth(newDate.getMonth() + months);
  return newDate;
}

function addHoursToDate(date: Date, hours: number) {
  const newDate = new Date(date);
  newDate.setHours(newDate.getHours() + hours);
  return newDate;
}

function formatDateToDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}t${hours}:${minutes}`;
}
