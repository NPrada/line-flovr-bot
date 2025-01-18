import "dotenv/config";

export interface ShopConfig {
  shopId: string;
  channelSecret: string;
  channelAccessToken: string;
  shopPhoneNumber: string;
  webhookPath: `/${string}`
}

export const SHOP_CONFIGS: Record<string, ShopConfig> = {
  //HANABUN
  "@221uygiy": { 
    shopId: "@221uygiy",
    channelSecret: process.env.HANABUN_SHOP_CHANNEL_SECRET ?? "",
    channelAccessToken: process.env.HANABUN_SHOP_ACCESS_TOKEN ?? "",
    shopPhoneNumber: "055-993-1187",
    webhookPath: '/@221uygiy'
  },
  // "@2211111": {
  //   shopId: "@2211111",
  //   channelSecret: process.env.SHOP_B_SECRET ?? "",
  //   channelAccessToken: process.env.SHOP_B_ACCESS_TOKEN ?? "",
  //   shopPhoneNumber: "999-8888-7777",
  //   webhookPath: '/fakeshop'
  // },
};