declare global {
  namespace NodeJS {
    interface ProcessEnv {
      HANABUN_SHOP_CHANNEL_SECRET: string;
      HANABUN_SHOP_ACCESS_TOKEN: string;
      PORT: string;
    }
  }
}

export {};