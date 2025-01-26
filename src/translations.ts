import { OrderSummary } from "./send-confirmation.js";

export const tsl = {
  selectPurposeTitle: "用途を選んでください",
  selectPurposeText: "以下から選んでください。",
  birthday: "誕生日",
  celebration: "お祝",
  offering: "お供え",
  homeUse: "ご自宅用",

  dateSelectionTooSoon: `3時間以内のご注文の場合は、 {shopPhoneNumber}までお電話ください。それ以外の方は以下より日時を選んでください。`,

  pleaseSelectItem: `商品を選んでください。`,
  pleaseSelectItemText: "以下から選んでください。",
  arrangement: `アレンジメント`,
  bouquet: `花束`,

  selectColorTitle: "色味を選んでください",
  selectColorText: "以下から選んでください。",
  redColor: "赤系",
  pinkColor: "ピンク系",
  yellowOrangeColor: "黄色・オレンジ系",
  whiteColor: "白系",
  mixedColor: "ミックス",

  budgetPromptBouquet: "ご予算を入力してください。（税込み）",
  budgetPromptArrangement: `ご予算を入力してください。（税込み）
  アレンジメントは¥{minPrice}からご注文可能です。`,
  budgetThankYouPrefix: "ありがとうございます！ご予算は",
  budgetThankYouSuffix: "ですね。",

  nameAknowledgement: "予約名{name}様で承りました。",
  phoneNumberAknowledgement:
    "ありがとうございます！お色味は{phoneNumber}ですね。",

  pleaseEnterReservationName: "予約のお名前を入力してください。",
  pleaseEnterPhoneNumber: "お電話番号を入力してください。",
  finalThankYou:
    "ありがとうございます！ご注文の承認後、改めてご連絡をさせていただきますので、しばらくお待ちください！",

  callIfWithin3Hours:
    "3時間以内のご注文の場合は、{phoneNumber}までお電話ください。それ以外の方は以下より日時を選んでください。",
} as const;



export function createOrderSummary(order: OrderSummary): string {
  try {
    // 3. Build a confirmation summary message
    const summaryMessage = `
      ${order.customerName} 様、ありがとうございます。

      以下の内容で仮予約が完了しました。注文確定次第、花文より連絡をいたしますので、少々お待ちください。
      ---------------------
      ■ ご注文番号: ${order.orderNum}
      ■ 日時: ${order.date}
      ■ 商品: ${order.itemType.split("-")[0]}  
      ■ 目的: ${order.purpose.split("-")[0]}  
      ■ ご予算: ${order.budget}
      ■ ご希望の色: ${order.color.split("-")[0]}
      ■ 電話番号: ${order.phoneNumber}
      ---------------------
      もしご不明な点がございましたら、お気軽にご連絡くださいませ。
    `;

    return summaryMessage.trim();
  } catch (error) {
    console.error("Error creating order summary", error);
    throw error;
  }
}