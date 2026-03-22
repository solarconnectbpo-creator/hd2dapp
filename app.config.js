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
    },
  },
});
