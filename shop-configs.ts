import "dotenv/config";

export type Weekdays = 'Monday' | "Tuesday" | "Wednesday"|  'Thursday'|  'Friday'|  'Saturday'|  'Sunday'

export interface ShopConfig {
  shopId: string;
  channelSecret: string;
  channelAccessToken: string;
  shopPhoneNumber: string;
  webhookPath: `/${string}`;
  shopEmail: `${string}@${string}`;
  minArrangementPrice: number;
  faxNumber?: string; //OPTIONAL
  workingHours: {
    day: Weekdays;
    openingTime: `${string}:${string}`;
    closingTime: `${string}:${string}`;
  }[];
}

export const SHOP_CONFIGS: Record<string, ShopConfig> = {
  //HANABUN
  "@221uygiy": {
    shopId: "@221uygiy",
    channelSecret: process.env.HANABUN_SHOP_CHANNEL_SECRET ?? "",
    channelAccessToken: process.env.HANABUN_SHOP_ACCESS_TOKEN ?? "",
    shopPhoneNumber: "055-993-1187",
    webhookPath: "/@221uygiy",
    shopEmail: "niccolo.prada@gmail.com", //mail@hanabun.co.jp
    minArrangementPrice: 3300,
    faxNumber: "055-993-0507", //OPTIONAL
    workingHours: [
      { day: "Monday", openingTime: "09:00", closingTime: "18:00" },
      { day: "Wednesday", openingTime: "09:00", closingTime: "18:00" },
      { day: "Thursday", openingTime: "09:00", closingTime: "18:00" },
      { day: "Friday", openingTime: "09:00", closingTime: "18:00" },
      { day: "Saturday", openingTime: "09:00", closingTime: "18:00" },
      { day: "Sunday", openingTime: "09:00", closingTime: "17:00" },
    ],
  },
  // "@2211111": {
  //   shopId: "@2211111",
  //   channelSecret: process.env.SHOP_B_SECRET ?? "",
  //   channelAccessToken: process.env.SHOP_B_ACCESS_TOKEN ?? "",
  //   shopPhoneNumber: "999-8888-7777",
  //   webhookPath: '/fakeshop'
  // },
};