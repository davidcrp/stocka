// Production URL - used for all auth redirects and email links
const PRODUCTION_URL = "https://dashboard-concessionaria.vercel.app";

export const getBaseUrl = (): string => {
  // Use env var if set, otherwise production URL
  if (import.meta.env.VITE_APP_URL) {
    return import.meta.env.VITE_APP_URL as string;
  }
  return PRODUCTION_URL;
};
