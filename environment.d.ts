declare global {
  namespace NodeJS {
    interface ProcessEnv {
      CLICKSEND_USERNAME: string;
      CLICKSEND_API_KEY: string;
      RESEND_API_TOKEN: string;
      HANABUN_SHOP_CHANNEL_SECRET: string;
      HANABUN_SHOP_ACCESS_TOKEN: string;
      PORT: string;
    }
  }
}

export {};