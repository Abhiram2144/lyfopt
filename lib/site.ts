const normalizeAbsoluteUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/\/$/, "");
  }

  return `https://${trimmed.replace(/\/$/, "")}`;
};

export const getSiteOrigin = () => {
  const configuredOrigin =
    process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_VERCEL_URL;

  if (configuredOrigin) {
    return normalizeAbsoluteUrl(configuredOrigin);
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "";
};

export const getAuthCallbackUrl = (nextPath = "/onboarding") => {
  const next = encodeURIComponent(nextPath);
  const origin = getSiteOrigin();

  if (!origin) {
    return `/auth/callback?next=${next}`;
  }

  return `${origin}/auth/callback?next=${next}`;
};