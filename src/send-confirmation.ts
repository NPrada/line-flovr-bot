import { Resend } from "resend";
import "dotenv/config";
import { ShopConfig } from "../shop-configs.js";
import { sendFaxConfirmation } from "./send-fax.js";

const resend = new Resend(process.env.RESEND_API_TOKEN);

export interface OrderSummary {
  customerName: string;
  phoneNumber: string;
  purpose: string;
  budget: string;
  color: string;
  itemType: string;
  orderNum: string;
  human_date: string;
  human_created_at: string;
  human_placed_at: string;
}

export async function sendOrderConfirmation(
  order: OrderSummary,
  shopConfig: ShopConfig
) {
  await sendEmailConfirmation(order, shopConfig);
  if (shopConfig.faxNumber) {
    // await sendFaxConfirmation(order, shopConfig);
  }
}

async function sendEmailConfirmation(
  order: OrderSummary,
  shopConfig: ShopConfig
) {
  try {
    const res = await resend.emails.send({
      // from: "Acme <onboarding@resend.dev>",
      from: "Daffodii <notification@notifications.daffodii.com>",
      to: [shopConfig.shopEmail],
      subject: "New Order: " + order.orderNum,
      tags: [
        {
          name: "category",
          value: "order_email",
        },
      ],
      html: `
      <!DOCTYPE html>
        <html lang="ja">
        <head>
          <meta charset="UTF-8">
          <title>Order Notification</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
            }
            .order-summary {
              border: 1px solid #ddd;
              padding: 16px;
              max-width: 600px;
              margin: 20px auto;
              background-color: #f9f9f9;
            }
            .order-summary h2 {
              margin-top: 0;
              font-size: 20px;
              color: #333;
            }
            .order-summary table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            .order-summary table th,
            .order-summary table td {
              padding: 8px;
              text-align: left;
              border-bottom: 1px solid #ddd;
            }
          </style>
        </head>
        <body>
          <div class="order-summary">
            <h2>お客様が注文をしました</h2>
            <p>以下は注文の詳細です：</p>
            <table>
              <tr>
                <th>ご注文番号</th>
                <td>${order.orderNum}</td>
              </tr>
              <tr>
                <th>注文日時</th>
                <td>${order.human_placed_at}</td>
              </tr>
              <tr>
                <th>引き取り日時</th>
                <td>${order.human_date}</td>
              </tr>
              <tr>
                <th>商品</th>
                <td>${order.itemType.split("-")[0]}</td>
              </tr>
              <tr>
                <th>目的</th>
                <td>${order.purpose.split("-")[0]}</td>
              </tr>
              <tr>
                <th>ご予算</th>
                <td>${order.budget}</td>
              </tr>
              <tr>
                <th>ご希望の色</th>
                <td>${order.color.split("-")[0]}</td>
              </tr>
              <tr>
                <th>電話番号</th>
                <td>${order.phoneNumber}</td>
              </tr>
            </table>
            <p>ご不明な点がございましたら、お気軽にご連絡ください。</p>
          </div>
        </body>
        </html>
    `,
    });

    console.log("email sent", res);
  } catch (error) {
    console.error("failed to send email confirmation", error);
  }
}
