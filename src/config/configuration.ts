export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10) || 3000,
  appUrl: process.env.APP_URL || 'https://api.kakidaki.my.id',
  jwt: {
    secret: process.env.JWT_SECRET || 'dev_secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  },
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY,
    model: process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash',
  },
  googleFit: {
    clientId: process.env.GOOGLE_FIT_CLIENT_ID,
    clientSecret: process.env.GOOGLE_FIT_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_FIT_REDIRECT_URI,
  },
  openMeteo: {
    baseUrl:
      process.env.OPENMETEO_BASE_URL ||
      'https://api.open-meteo.com/v1/forecast',
  },
  midtrans: {
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY,
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  },
  pro: {
    pricePerCredit:
      parseInt(process.env.PRO_PRICE_PER_CREDIT ?? '25000', 10) || 25000,
  },
});