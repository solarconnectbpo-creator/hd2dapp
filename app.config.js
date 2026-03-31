/** @param {{ expo?: Record<string, unknown> }} config */
module.exports = ({ config }) => ({
  ...config,
  expo: {
    ...config.expo,
    extra: {
      ...(typeof config.expo?.extra === "object" && config.expo.extra !== null
        ? config.expo.extra
        : {}),
      openaiApiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
      model: process.env.EXPO_PUBLIC_MODEL,
      temperature: process.env.EXPO_PUBLIC_TEMPERATURE,
      maxTokens: process.env.EXPO_PUBLIC_MAX_TOKENS,
      // Supabase (also set EXPO_PUBLIC_* in .env / EAS Secrets — embedded at build time)
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
      supabaseLeadsTable: process.env.EXPO_PUBLIC_SUPABASE_LEADS_TABLE ?? "roof_leads",
    },
  },
});
