function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getExternalApiConfig() {
  return {
    baseUrl: getRequiredEnv("EXTERNAL_API_BASE_URL").replace(/\/+$/, ""),
    apiKey: getRequiredEnv("EXTERNAL_API_KEY"),
  };
}
