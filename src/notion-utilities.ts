import { Client } from "@notionhq/client";

const notionOrdersDatabaseId = "f131d30fddd24b1faefd80fc7b430375";

export const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

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
