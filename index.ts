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

const notionOrdersDatabaseId = "174ccfeeb33081fc9ffcc2fffa2dda4c";

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
  // 1. Find the page via a filter on the 'UserId' title field.
  const userIdToFind = userId;
  // const queryRes = await notion.databases.query({
  //   database_id: notionOrdersDatabaseId,
  //   filter: {
  //     property: "UserId", // "userId" column is your title property
  //     title: {
  //       equals: userIdToFind,
  //     },
  //   },
  // });
  const queryRes = await notion.databases.query({
    database_id: notionOrdersDatabaseId,
    filter: {
      and: [
        {
          property: 'UserId', // "userId" column is your title property
          title: {
            equals: userId,
          },
        },
        {
          property: 'Status', // "Status" is a status property
          status: {
            equals: 'Form not complete',
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

  // 2. Update the Date property of the found page.
  // Make sure 'Date' is indeed the name of the date property in your DB.
  const updatedPage = await notion.pages.update({
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

  console.log("Updated page:", updatedPage);
}

(async () => {
  // const res = await notion.databases.update({database_id: notionOrdersDatabaseId, properties: {
  //   // UserId: '123'

  // }})

  // const res = await createNewDbRow("1234", new Date());
  const res = await updateDbRowByUserId("1234", "User Name", "New Name")

  // const res = await notion.databases.retrieve({database_id: notionOrdersDatabaseId})

  console.log("res", res);
})();

// Setup all LINE client and Express configurations.
const clientConfig: ClientConfig = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || "",
};

const middlewareConfig: MiddlewareConfig = {
  channelSecret: process.env.CHANNEL_SECRET || "",
};

const PORT = process.env.PORT || 3000;

// Create a new LINE SDK client.
const client = new messagingApi.MessagingApiClient(clientConfig);

// Create a new Express application.
const app: Application = express();

// Function handler to receive the text.
const textEventHandler = async (
  event: webhook.Event,
): Promise<MessageAPIResponseBase | undefined> => {
  // Process all variables here.
  console.log("new event", event);
  const userId = event.source.userId;

  // Check if for a text message
  if (event.type !== "message" || event.message.type !== "text") {
    return;
  }

  // Process all message related variables here.

  // Check if message is repliable
  if (!event.replyToken) return;

  const earliestDateString = formatDateToDateString(
    addHoursToDate(new Date(), 3),
  );
  await client.replyMessage({
    replyToken: event.replyToken,
    messages: [
      {
        type: "template",
        altText: "日付を選択してください",
        template: {
          type: "buttons",
          text: "日付を選択してください",
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
};

// Register the LINE middleware.
// As an alternative, you could also pass the middleware in the route handler, which is what is used here.
// app.use(middleware(middlewareConfig));

// Route handler to receive webhook events.
// This route is used to receive connection tests.
app.get("/", async (_: Request, res: Response): Promise<Response> => {
  return res.status(200).json({
    status: "success",
    message: "Connected successfully!",
  });
});

// This route is used for the Webhook.
app.post(
  "/callback",
  middleware(middlewareConfig),
  async (req: Request, res: Response): Promise<Response> => {
    const callbackRequest: webhook.CallbackRequest = req.body;
    const events: webhook.Event[] = callbackRequest.events!;

    // Process all the received events asynchronously.
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

          // Return an error message.
          return res.status(500).json({
            status: "error",
          });
        }
      }),
    );

    // Return a successful message.
    return res.status(200).json({
      status: "success",
      results,
    });
  },
);

// Create a server and listen to it.
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

  const dateString = `${year}-${month}-${day}t${hours}:${minutes}`;

  return dateString;
}
