export const DEMO_USER = {
  id: "demo-user-123",
  email: "demo@example.com",
  name: "Demo User",
  image: null,
  role: "user" as const,
  emailVerified: true,
  createdAt: new Date("2025-01-15"),
};

export const DEMO_SESSION = {
  user: DEMO_USER,
  session: {
    id: "demo-session-123",
    token: "demo-token-123",
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  },
};
