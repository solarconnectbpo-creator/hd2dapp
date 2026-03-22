/**
 * Types for `import { ... } from '@env'` (react-native-dotenv).
 * Add keys here when you add variables to `.env`.
 */
declare module "@env" {
  export const EXPO_PUBLIC_API_URL: string;
  export const EXPO_PUBLIC_DOMAIN: string;
  export const EXPO_PUBLIC_ENVIRONMENT: string;
  export const EXPO_PUBLIC_MAPBOX_TOKEN: string;
  export const EXPO_PUBLIC_OPENAI_API_KEY: string;
  export const EXPO_PUBLIC_MODEL: string;
  /** String from env; use `parseFloat` if you need a number. */
  export const EXPO_PUBLIC_TEMPERATURE: string;
  /** String from env; use `parseInt(..., 10)` if you need a number. */
  export const EXPO_PUBLIC_MAX_TOKENS: string;
  export const EXPO_PUBLIC_EAVEMEASURE_URL: string | undefined;
  export const EXPO_PUBLIC_SUPABASE_URL: string;
  export const EXPO_PUBLIC_SUPABASE_ANON_KEY: string;
  export const EXPO_PUBLIC_SUPABASE_LEADS_TABLE: string;
  export const EXPO_PUBLIC_BOOTSTRAP_PRECISION_MEASUREMENT: string | undefined;
  export const EXPO_PUBLIC_ALLOW_CLIENT_MEASUREMENT: string | undefined;
  export const EXPO_PUBLIC_NEARMAP_API_KEY: string | undefined;
  export const EXPO_PUBLIC_EAGLEVIEW_ACCESS_TOKEN: string | undefined;
  export const EXPO_PUBLIC_EAGLEVIEW_CLIENT_ID: string | undefined;
  export const EXPO_PUBLIC_EAGLEVIEW_CLIENT_SECRET: string | undefined;
}
