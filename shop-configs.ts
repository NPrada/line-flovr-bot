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
  openingTime: `${string}:${string}`;
  closingTime: `${string}:${string}`;
  workingDays: Weekdays[]
}

export const SHOP_CONFIGS: Record<string, ShopConfig> = {
  //HANABUN
  "@221uygiy": {
    shopId: "@221uygiy",
    channelSecret: process.env.HANABUN_SHOP_CHANNEL_SECRET ?? "",
    channelAccessToken: process.env.HANABUN_SHOP_ACCESS_TOKEN ?? "",
    shopPhoneNumber: "055-993-1187",
    webhookPath: "/@221uygiy",
    shopEmail: "niccolo.prada@gmail.com",
    minArrangementPrice: 3300,
    faxNumber: "+61261111111", //OPTIONAL
    openingTime: '09:15',
    closingTime: "18:00",
    workingDays: ['Monday', "Wednesday", 'Thursday', 'Friday', 'Saturday', 'Sunday']
  },
  // "@2211111": {
  //   shopId: "@2211111",
  //   channelSecret: process.env.SHOP_B_SECRET ?? "",
  //   channelAccessToken: process.env.SHOP_B_ACCESS_TOKEN ?? "",
  //   shopPhoneNumber: "999-8888-7777",
  //   webhookPath: '/fakeshop'
  // },
};