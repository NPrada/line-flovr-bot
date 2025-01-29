import { Client } from "@notionhq/client";
import { OrderSummary } from "./send-confirmation.js";

const notionOrdersDatabaseId = "f131d30fddd24b1faefd80fc7b430375";

export const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

export async function getOrderSummary(pageId: string): Promise<OrderSummary> {
  // 1. Retrieve the page from the Notion database
  const page = await notion.pages.retrieve({ page_id: pageId });
  const props = (page as any).properties!;

  // 2. Extract the data from each property
  const customerName = props["Customer Name"]?.rich_text?.[0]?.plain_text || "";
  const phoneNumber = props["Phone Number"]?.rich_text?.[0]?.plain_text || "";
  const date = props["Date"]?.date?.start || "";
  const purpose = props["Purpose"]?.rich_text?.[0]?.plain_text || "";
  const budget = props["Budget"]?.rich_text?.[0]?.plain_text || "";
  const color = props["Color"]?.rich_text?.[0]?.plain_text || "";
  const itemType = props["Item Type"]?.rich_text?.[0]?.plain_text || "";
  const orderNum = props["Order Num"]?.unique_id?.number || "";
  const created_at = props["Created time"]?.created_time || "";
  const placed_at = props["Updated time"]?.date?.start || "";
  // console.log('props',props)
  console.log('created_at', created_at)
   console.log('created_at formatted', new Date(created_at).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
  }))
  console.log('placed_at', placed_at)
  console.log('placed_at formatted', new Date(placed_at).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
  }))
 
 
  return {
    customerName,
    phoneNumber,
    purpose,
    budget,
    color,
    itemType,
    orderNum,
    human_date: new Date(date).toLocaleString("ja-JP", {
      timeZone: "Asia/Tokyo",
    }),
    human_placed_at: new Date(placed_at).toLocaleString("ja-JP", {
      timeZone: "Asia/Tokyo",
    }),
    human_created_at: new Date(created_at).toLocaleString("ja-JP", {
      timeZone: "Asia/Tokyo",
    }),
  };
}

export async function createNewDbRow(
  userId: string,
  date: Date,
  shopId: string,
  shopName: string,
) {
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
      "Shop Id": {
        rich_text: [
          {
            text: {
              content: shopId,
            },
          },
        ],
      },
      "Shop Name": {
        rich_text: [
          {
            text: {
              content: shopName,
            },
          },
        ],
      },
    },
  });

  return res;
}

export async function updateDbRowByUserId(
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

  if (columnToUpdate === "Updated time" || columnToUpdate === "Created time") {
    return await notion.pages.update({
      page_id: pageId,
      properties: {
        [columnToUpdate]: {
          date: {
            start: newVal,
          },
        },
      },
    });
  } else if (columnToUpdate === "Status") {
    return await notion.pages.update({
      page_id: pageId,
      properties: {
        Status: {
          status: {
            name: newVal,
          },
        },
      },
    });
  } else {
    return await notion.pages.update({
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
}
