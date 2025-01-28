import { OrderSummary } from "../send-confirmation.js";

export const buildConfirmationLineMessage = (order: OrderSummary) => ({
  type: "flex",
  altText: "This is a Flex Message",
  contents: {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: "予約確認票",
          weight: "bold",
          color: "#1DB446",
          size: "sm",
        },
        {
          type: "text",
          text: `${order.customerName || "お客様"}様`,
          weight: "bold",
          size: "xxl",
          margin: "md",
        },
        {
          type: "text",
          text: "以下の内容で注文を承りました。",
          size: "xs",
          color: "#aaaaaa",
          wrap: true,
        },
        {
          type: "separator",
          margin: "xxl",
        },
        {
          type: "box",
          layout: "vertical",
          margin: "xxl",
          spacing: "sm",
          contents: [
            {
              type: "box",
              layout: "horizontal",
              contents: [
                {
                  type: "text",
                  text: "ご来店日時",
                  size: "sm",
                  color: "#555555",
                  flex: 0,
                },
                {
                  type: "text",
                  text: order.human_date || "未定",
                  size: "sm",
                  color: "#111111",
                  align: "end",
                },
              ],
            },
            {
              type: "box",
              layout: "horizontal",
              contents: [
                {
                  type: "text",
                  text: "商品",
                  size: "sm",
                  color: "#555555",
                  flex: 0,
                },
                {
                  type: "text",
                  text: order.itemType?.split("-")[0] || "N/A",
                  size: "sm",
                  color: "#111111",
                  align: "end",
                },
              ],
            },
            {
              type: "box",
              layout: "horizontal",
              contents: [
                {
                  type: "text",
                  text: "目的",
                  size: "sm",
                  color: "#555555",
                },
                {
                  type: "text",
                  text: order.purpose?.split("-")[0] || "N/A",
                  size: "sm",
                  color: "#111111",
                  align: "end",
                },
              ],
            },
            {
              type: "box",
              layout: "horizontal",
              contents: [
                {
                  type: "text",
                  text: "ご希望のお色",
                  size: "sm",
                  color: "#555555",
                },
                {
                  type: "text",
                  text: order.color.split("-")[0] || "指定なし",
                  size: "sm",
                  color: "#111111",
                  align: "end",
                },
              ],
            },
            {
              type: "box",
              layout: "horizontal",
              contents: [
                {
                  type: "text",
                  text: "お電話番号",
                  size: "sm",
                  color: "#555555",
                },
                {
                  type: "text",
                  text: order.phoneNumber || "N/A",
                  size: "sm",
                  color: "#111111",
                  align: "end",
                },
              ],
            },
            {
              type: "box",
              layout: "horizontal",
              contents: [
                {
                  type: "text",
                  text: "合計金額",
                  color: "#555555",
                  size: "xl",
                  flex: 0,
                  weight: "bold",
                },
                {
                  type: "text",
                  text: `¥${order.budget || "0"}`,
                  align: "end",
                  color: "#111111",
                  size: "xl",
                  weight: "bold",
                },
              ],
            },
          ],
        },
        {
          type: "separator",
          margin: "xxl",
        },
        {
          type: "box",
          layout: "horizontal",
          margin: "md",
          contents: [
            {
              type: "text",
              text: "ご注文番号",
              size: "xs",
              color: "#aaaaaa",
              flex: 0,
            },
            {
              type: "text",
              text: String(order.orderNum) || "N/A",
              color: "#aaaaaa",
              size: "xs",
              align: "end",
            },
          ],
        },
      ],
    },
    styles: {
      footer: {
        separator: true,
      },
    },
  },
});
