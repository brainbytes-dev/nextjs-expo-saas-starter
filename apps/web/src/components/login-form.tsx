"use client"

import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { signIn } from "@/lib/auth-client"
import { toast } from "sonner"
import { DEMO_MODE } from "@/lib/demo-mode"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import * as Sentry from "@sentry/nextjs"

const loginSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(8, "Passwort muss mindestens 8 Zeichen lang sein"),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter()
  const t = useTranslations("auth")
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const handleDemoLogin = async () => {
    await signIn.email(
      { email: "demo@example.com", password: "demo" },
      {
        onSuccess: () => {
          router.push("/dashboard")
        },
      }
    )
  }

  const handleOAuthSignIn = (provider: "google" | "microsoft" | "apple") => {
    if (DEMO_MODE) {
      toast.info("Im Demo-Modus nicht verfügbar", {
        description: "Social Login ist in der Demo deaktiviert. Nutze E-Mail + Passwort oder starte eine eigene Instanz.",
        duration: 5000,
      })
      return
    }
    signIn.social({ provider, callbackURL: "/dashboard" })
  }

  const onSubmit = async (data: LoginFormData) => {
    try {
      await signIn.email(
        {
          email: data.email,
          password: data.password,
        },
        {
          onSuccess: () => {
            router.push("/dashboard")
          },
          onError: (ctx) => {
            setError("email", {
              message: ctx.error.message || t("loginFailed"),
            })
            Sentry.captureException(ctx.error, {
              tags: { form: "login" },
            })
          },
        }
      )
    } catch (err) {
      Sentry.captureException(err, { tags: { form: "login" } })
      setError("email", {
        message: err instanceof Error ? err.message : t("genericError"),
      })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={cn("flex flex-col gap-6", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">{t("welcomeBack")}</h1>
          <p className="text-sm text-balance text-muted-foreground">
            {t("loginSubtitle")}
          </p>
        </div>

        {errors.email && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {errors.email.message}
          </div>
        )}

        {/* OAuth Buttons */}
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => handleOAuthSignIn("google")}
          >
            <svg className="mr-2 size-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            {t("continueWithGoogle")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => handleOAuthSignIn("microsoft")}
          >
            <svg className="mr-2 size-4" viewBox="0 0 23 23">
              <path fill="#f35325" d="M1 1h10v10H1z" />
              <path fill="#81bc06" d="M12 1h10v10H12z" />
              <path fill="#05a6f0" d="M1 12h10v10H1z" />
              <path fill="#ffba08" d="M12 12h10v10H12z" />
            </svg>
            {t("continueWithMicrosoft")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => handleOAuthSignIn("apple")}
          >
            <svg className="mr-2 size-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            {t("continueWithApple")}
          </Button>
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">{t("orContinueWith")}</span>
          </div>
        </div>

        {/* Email/Password */}
        <Field>
          <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="name@firma.ch"
            {...register("email")}
            disabled={isSubmitting}
          />
        </Field>
        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">{t("password")}</FieldLabel>
            <a
              href="/forgot-password"
              className="ml-auto text-sm underline-offset-4 hover:underline"
            >
              {t("forgotPassword")}
            </a>
          </div>
          <Input
            id="password"
            type="password"
            {...register("password")}
            disabled={isSubmitting}
          />
        </Field>
        <Field>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("loggingIn") : t("login")}
          </Button>
        </Field>
        {DEMO_MODE && (
          <Field>
            <Button type="button" variant="outline" onClick={handleDemoLogin}>
              Demo testen
            </Button>
          </Field>
        )}
        <FieldDescription className="text-center">
          {t("noAccount")}{" "}
          <a href="/signup" className="underline underline-offset-4">
            {t("signup")}
          </a>
        </FieldDescription>
      </FieldGroup>
    </form>
  )
}
