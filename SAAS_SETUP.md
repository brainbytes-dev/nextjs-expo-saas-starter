# SaaS Setup Guide

This template includes production-ready integrations for **Better-Auth**, **Stripe**, and **Supabase**. Follow this guide to set up each service.

## Quick Start

1. Copy `.env.example` to `.env.local`
2. Fill in credentials for the services you want to use
3. Run `pnpm install` to install dependencies
4. Follow service-specific setup steps below

---

## 🔐 Better-Auth (Authentication)

Better-Auth provides a secure, open-source authentication solution with support for email/password, OAuth, and more.

### Setup

1. **Generate Secret Key**
   ```bash
   openssl rand -hex 32
   ```
   Copy the output to `BETTER_AUTH_SECRET` in `.env.local`

2. **Configure Database**
   Edit `apps/web/src/lib/auth.ts` to set up your database:

   **SQLite (Development)**
   ```typescript
   database: {
     type: "sqlite",
     db: new Database("auth.db")
   }
   ```

   **PostgreSQL (Production)**
   ```typescript
   database: {
     type: "postgres",
     db: postgres({
       connectionString: process.env.DATABASE_URL
     })
   }
   ```

3. **Run Migrations**
   ```bash
   cd apps/web
   npx better-auth migrate
   ```

### Usage

**Web App** (`apps/web`)
```tsx
import { signIn, signUp, useSession } from "@/lib/auth-client";

export function LoginComponent() {
  const { data: session } = useSession();

  if (!session) {
    return (
      <button onClick={() => signIn({ email: "user@example.com", password: "password" })}>
        Sign In
      </button>
    );
  }

  return (
    <div>
      Welcome {session.user.name}!
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  );
}
```

**Mobile App** (`apps/mobile`)
```tsx
import { signIn, signUp, useSession } from "@/lib/auth-client";
import { View, Text, Pressable } from "react-native";

export function LoginScreen() {
  const { data: session } = useSession();

  if (!session) {
    return (
      <View className="flex-1 justify-center items-center">
        <Pressable
          onPress={() => signIn({ email: "user@example.com", password: "password" })}
          className="bg-blue-500 px-4 py-2 rounded"
        >
          <Text className="text-white">Sign In</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 justify-center items-center">
      <Text>Welcome {session.user.name}!</Text>
    </View>
  );
}
```

### Documentation
- [Better-Auth Docs](https://www.better-auth.com/)
- [API Reference](https://www.better-auth.com/docs/api)

---

## 💳 Stripe (Payments)

Stripe enables subscription management, one-time payments, and more.

### Setup

1. **Get API Keys**
   - Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
   - Copy **Publishable Key** → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - Copy **Secret Key** → `STRIPE_SECRET_KEY`

2. **Setup Webhooks**
   - Go to [Webhooks Settings](https://dashboard.stripe.com/webhooks)
   - Create a new endpoint: `https://yourdomain.com/api/webhooks/stripe`
   - Select events: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`
   - Copy signing secret → `STRIPE_WEBHOOK_SECRET`

3. **Install Stripe CLI** (for local testing)
   ```bash
   brew install stripe/stripe-cli/stripe  # macOS
   stripe login
   stripe listen --forward-to localhost:3003/api/webhooks/stripe
   ```

### Usage

**Create Checkout Session**
```tsx
import { getStripe } from "@/lib/stripe";
import { loadStripe } from "@stripe/stripe-js";

async function handleCheckout(priceId: string) {
  const response = await fetch("/api/checkout", {
    method: "POST",
    body: JSON.stringify({ priceId }),
  });
  const { sessionId } = await response.json();

  const stripe = await getStripe();
  await stripe?.redirectToCheckout({ sessionId });
}
```

**Customer Portal**
```tsx
async function handlePortal() {
  const response = await fetch("/api/portal", { method: "POST" });
  const { url } = await response.json();
  window.location.href = url;
}
```

### Webhook Handling

The webhook endpoint at `/api/webhooks/stripe` handles:
- `checkout.session.completed` - Update subscription in database
- `customer.subscription.updated` - Sync subscription status
- `customer.subscription.deleted` - Cancel subscription
- `invoice.payment_succeeded` - Mark invoice as paid
- `invoice.payment_failed` - Handle failed payments

Update the webhook handlers to sync with your database.

### Documentation
- [Stripe Docs](https://stripe.com/docs)
- [Checkout Sessions](https://stripe.com/docs/payments/checkout)
- [Subscriptions](https://stripe.com/docs/billing/subscriptions)
- [Webhooks](https://stripe.com/docs/webhooks)

---

## 🗄️ Supabase (Database & Auth)

Supabase provides PostgreSQL database, real-time APIs, and authentication.

### Setup (Optional)

1. **Create Project**
   - Sign up at [supabase.com](https://supabase.com)
   - Create a new project
   - Copy project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Copy anon key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. **Optional: Server-Side Access**
   - Go to project settings → API
   - Copy service role key → `SUPABASE_SERVICE_ROLE_KEY`

3. **Create Tables**
   Use Supabase dashboard or SQL:
   ```sql
   -- Example: Users table
   CREATE TABLE users (
     id UUID PRIMARY KEY,
     email TEXT UNIQUE NOT NULL,
     stripe_customer_id TEXT,
     subscription_status TEXT,
     created_at TIMESTAMP DEFAULT NOW()
   );

   -- Enable RLS
   ALTER TABLE users ENABLE ROW LEVEL SECURITY;

   CREATE POLICY "Users can view own data"
     ON users FOR SELECT
     USING (auth.uid() = id);
   ```

### Usage

**Web App** (`apps/web`)
```tsx
import { supabase } from "@/lib/supabase";

// Fetch data
const { data, error } = await supabase
  .from("users")
  .select("*")
  .eq("id", userId);

// Insert data
const { data, error } = await supabase
  .from("users")
  .insert([{ email: "user@example.com" }]);

// Real-time subscription
supabase
  .from("users")
  .on("*", (payload) => {
    console.log("Change:", payload);
  })
  .subscribe();
```

**Mobile App** (`apps/mobile`)
```tsx
import { supabase } from "@/lib/supabase";

// Works the same as web
// AsyncStorage is used for session persistence
const { data, error } = await supabase
  .from("users")
  .select("*");
```

### Documentation
- [Supabase Docs](https://supabase.com/docs)
- [Database Guide](https://supabase.com/docs/guides/database)
- [Auth Guide](https://supabase.com/docs/guides/auth)
- [Real-time](https://supabase.com/docs/guides/realtime)

---

## 🔄 Integration Example: Complete Flow

Here's how to combine all services:

### 1. User Signs Up (Better-Auth)
```tsx
const { user } = await signUp({
  email: "user@example.com",
  password: "secure_password",
  name: "John Doe",
});
```

### 2. Create Stripe Customer (Webhook or Server Action)
```tsx
// In server action or webhook
const stripeCustomer = await stripe.customers.create({
  email: user.email,
  metadata: { userId: user.id },
});

// Store in Supabase
await supabase.from("users").insert({
  id: user.id,
  email: user.email,
  stripe_customer_id: stripeCustomer.id,
});
```

### 3. User Subscribes (Stripe Checkout)
```tsx
const { sessionId } = await createCheckoutSession("price_1234567890");
await stripe?.redirectToCheckout({ sessionId });
```

### 4. Webhook Updates Subscription (Stripe Webhook)
```typescript
case "checkout.session.completed": {
  const { customer, subscription } = session;
  await supabase
    .from("users")
    .update({ subscription_status: "active" })
    .eq("stripe_customer_id", customer);
  break;
}
```

### 5. User Views Dashboard
```tsx
const { data: user } = await supabase
  .from("users")
  .select("*")
  .eq("id", session.user.id)
  .single();

return <Dashboard subscription={user.subscription_status} />;
```

---

## 🛡️ Security Checklist

- [ ] All secrets are in `.env.local` (never commit)
- [ ] Database URLs use secure connections
- [ ] Row-level security (RLS) enabled on Supabase
- [ ] Webhook signatures verified
- [ ] API keys rotated regularly
- [ ] Stripe test mode used during development
- [ ] CORS properly configured
- [ ] Rate limiting implemented for auth endpoints
- [ ] HTTPS enforced in production
- [ ] Sensitive operations require authentication

---

## 🚀 Deployment

### Environment Variables

Set in your deployment platform:
1. All `NEXT_PUBLIC_*` variables (public)
2. All secret variables (private):
   - `BETTER_AUTH_SECRET`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `SUPABASE_SERVICE_ROLE_KEY`

### Stripe Webhook for Production

1. Update webhook URL to production domain:
   ```
   https://yourdomain.com/api/webhooks/stripe
   ```

2. Create separate webhook signing secret for production

3. Store in `STRIPE_WEBHOOK_SECRET` on production

### Database Migration

For production Supabase/PostgreSQL:

1. Update connection in auth.ts
2. Run migrations: `npx better-auth migrate`
3. Set up automated backups in Supabase dashboard
4. Enable point-in-time recovery

---

## ❓ Troubleshooting

**"Better-Auth secret is not set"**
→ Add `BETTER_AUTH_SECRET` to `.env.local`

**"Stripe API key missing"**
→ Add `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` and `STRIPE_SECRET_KEY`

**"Supabase connection error"**
→ Check `NEXT_PUBLIC_SUPABASE_URL` and anon key

**"Webhook signature verification failed"**
→ Ensure `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard

**"Session not persisting on mobile"**
→ Ensure AsyncStorage is installed: `pnpm add @react-native-async-storage/async-storage`

---

## 📚 Next Steps

1. Review database schema in Supabase
2. Set up proper RLS policies
3. Implement user profile management
4. Add subscription tiers/pricing
5. Set up email notifications
6. Add analytics/monitoring
7. Deploy to production

