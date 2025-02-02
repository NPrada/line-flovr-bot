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

// webhook paths are formatted with https://line-flovr-bot.fly.dev/webhook/@455gncyk for example

export const SHOP_CONFIGS: Record<string, ShopConfig> = {
  //DAFFODII admin
  "@455gncyk": {
    shopId: "@455gncyk",
    channelSecret: process.env.DAFFODII_SHOP_CHANNEL_SECRET ?? "",
    channelAccessToken: process.env.DAFFODII_SHOP_ACCESS_TOKEN ?? "",
    shopPhoneNumber: "+818069604599",
    webhookPath: "/@455gncyk",
    shopEmail: "niccolo.prada@gmail.com",
    minArrangementPrice: 3300,
    // faxNumber: "055-993-0507", //OPTIONAL
    workingHours: [
      { day: "Monday", openingTime: "09:00", closingTime: "18:00" },
      { day: "Wednesday", openingTime: "09:00", closingTime: "18:00" },
      { day: "Thursday", openingTime: "09:00", closingTime: "18:00" },
      { day: "Friday", openingTime: "09:00", closingTime: "18:00" },
      { day: "Saturday", openingTime: "09:00", closingTime: "18:00" },
      { day: "Sunday", openingTime: "09:00", closingTime: "17:00" },
    ],
  },
  //HANABUN
  "@221uygiy": {
    shopId: "@221uygiy",
    channelSecret: process.env.HANABUN_SHOP_CHANNEL_SECRET ?? "",
    channelAccessToken: process.env.HANABUN_SHOP_ACCESS_TOKEN ?? "",
    shopPhoneNumber: "055-993-1187",
    webhookPath: "/@221uygiy",
    // shopEmail: "niccolo.prada@gmail.com", //mail@hanabun.co.jp
    shopEmail: "mail@hanabun.co.jp",
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
};