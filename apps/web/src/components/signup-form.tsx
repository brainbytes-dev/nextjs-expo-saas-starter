"use client"

import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { signUp } from "@/lib/auth-client"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import * as Sentry from "@sentry/nextjs"
import { sendWelcomeEmail } from "@/lib/email"

const signupSchema = z
  .object({
    name: z.string().min(2, "Name muss mindestens 2 Zeichen lang sein"),
    email: z.string().email("Ungültige E-Mail-Adresse"),
    password: z.string().min(8, "Passwort muss mindestens 8 Zeichen lang sein"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwörter stimmen nicht überein",
    path: ["confirmPassword"],
  })

type SignupFormData = z.infer<typeof signupSchema>

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = async (data: SignupFormData) => {
    try {
      await signUp.email(
        {
          email: data.email,
          password: data.password,
          name: data.name,
        },
        {
          onSuccess: async () => {
            // Send welcome email
            try {
              await sendWelcomeEmail(data.name, data.email)
            } catch (err) {
              console.error("Failed to send welcome email:", err)
              Sentry.captureException(err, { tags: { form: "signup" } })
            }
            router.push("/dashboard")
          },
          onError: (ctx) => {
            setError("email", {
              message: ctx.error.message || "Registrierung fehlgeschlagen",
            })
            Sentry.captureException(ctx.error, {
              tags: { form: "signup" },
            })
          },
        }
      )
    } catch (err) {
      Sentry.captureException(err, { tags: { form: "signup" } })
      setError("email", {
        message: err instanceof Error ? err.message : "Ein Fehler ist aufgetreten",
      })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={cn("flex flex-col gap-6", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Konto erstellen</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Fülle das Formular aus, um dein Konto zu erstellen
          </p>
        </div>

        {errors.email && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {errors.email.message}
          </div>
        )}

        <Field>
          <FieldLabel htmlFor="name">Vollständiger Name</FieldLabel>
          <Input
            id="name"
            type="text"
            placeholder="Max Mustermann"
            {...register("name")}
            disabled={isSubmitting}
          />
          {errors.name && (
            <p className="text-sm text-red-700 dark:text-red-300">{errors.name.message}</p>
          )}
        </Field>
        <Field>
          <FieldLabel htmlFor="email">E-Mail</FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="name@firma.ch"
            {...register("email")}
            disabled={isSubmitting}
          />
          <FieldDescription>
            Diese Adresse verwenden wir für Kontobenachrichtigungen. Wir geben sie nicht weiter.
          </FieldDescription>
          {errors.email && (
            <p className="text-sm text-red-700 dark:text-red-300">{errors.email.message}</p>
          )}
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Passwort</FieldLabel>
          <PasswordInput
            id="password"
            {...register("password")}
            disabled={isSubmitting}
          />
          <FieldDescription>
            Mindestens 8 Zeichen.
          </FieldDescription>
          {errors.password && (
            <p className="text-sm text-red-700 dark:text-red-300">{errors.password.message}</p>
          )}
        </Field>
        <Field>
          <FieldLabel htmlFor="confirm-password">Passwort bestätigen</FieldLabel>
          <PasswordInput
            id="confirm-password"
            {...register("confirmPassword")}
            disabled={isSubmitting}
          />
          <FieldDescription>Bitte Passwort wiederholen.</FieldDescription>
          {errors.confirmPassword && (
            <p className="text-sm text-red-700 dark:text-red-300">{errors.confirmPassword.message}</p>
          )}
        </Field>
        <Field>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Wird erstellt..." : "Konto erstellen"}
          </Button>
        </Field>
        <FieldDescription className="text-center">
          Bereits ein Konto?{" "}
          <a href="/login" className="underline underline-offset-4">
            Anmelden
          </a>
        </FieldDescription>
      </FieldGroup>
    </form>
  )
}
