# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| latest (main) | ✅ |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability, please report it via [GitHub's private vulnerability reporting](https://github.com/brain-byt-es/nextjs-expo-monorepo/security/advisories/new).

Include as much of the following as possible:
- Type of issue (e.g. SQL injection, XSS, auth bypass)
- Affected file(s) and line numbers
- Steps to reproduce
- Potential impact

You'll receive a response within 48 hours. If the issue is confirmed, a patch will be released as soon as possible.

## Security Best Practices for Users

- **Never commit `.env.local`** — all secrets stay local
- Rotate `BETTER_AUTH_SECRET` and `STRIPE_WEBHOOK_SECRET` if exposed
- Use environment-specific Stripe keys (test vs. live)
- Enable Vercel's [Attack Challenge Mode](https://vercel.com/docs/security/attack-challenge-mode) in production
