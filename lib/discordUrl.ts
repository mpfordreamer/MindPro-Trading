// Validasi webhook Discord. Anchored + host tetap → mencegah SSRF (mis. discord.com.evil.com, userinfo @, http).
const RE = /^https:\/\/(?:(?:canary|ptb)\.)?discord(?:app)?\.com\/api\/webhooks\/\d{15,25}\/[A-Za-z0-9_-]{20,120}$/;
export const isValidDiscordWebhook = (u: string) => RE.test(u);
export function maskWebhook(u: string): string {
  const m = u.match(/^(https:\/\/[^/]+\/api\/webhooks\/\d+)\//);
  return m ? `${m[1]}/••••••••` : '••••••••';
}
