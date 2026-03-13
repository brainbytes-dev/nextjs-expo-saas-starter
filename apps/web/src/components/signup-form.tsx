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
import { signUp } from "@/lib/auth-client"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import * as Sentry from "@sentry/nextjs"
import { sendWelcomeEmail } from "@/lib/email"

const signupSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
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
              message: ctx.error.message || "Sign up failed",
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
        message: err instanceof Error ? err.message : "An error occurred",
      })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={cn("flex flex-col gap-6", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Fill in the form below to create your account
          </p>
        </div>

        {errors.email && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {errors.email.message}
          </div>
        )}

        <Field>
          <FieldLabel htmlFor="name">Full Name</FieldLabel>
          <Input
            id="name"
            type="text"
            placeholder="John Doe"
            {...register("name")}
            disabled={isSubmitting}
          />
          {errors.name && (
            <p className="text-sm text-red-700">{errors.name.message}</p>
          )}
        </Field>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="m@example.com"
            {...register("email")}
            disabled={isSubmitting}
          />
          <FieldDescription>
            We&apos;ll use this to contact you. We will not share your email
            with anyone else.
          </FieldDescription>
          {errors.email && (
            <p className="text-sm text-red-700">{errors.email.message}</p>
          )}
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            type="password"
            {...register("password")}
            disabled={isSubmitting}
          />
          <FieldDescription>
            Must be at least 8 characters long.
          </FieldDescription>
          {errors.password && (
            <p className="text-sm text-red-700">{errors.password.message}</p>
          )}
        </Field>
        <Field>
          <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
          <Input
            id="confirm-password"
            type="password"
            {...register("confirmPassword")}
            disabled={isSubmitting}
          />
          <FieldDescription>Please confirm your password.</FieldDescription>
          {errors.confirmPassword && (
            <p className="text-sm text-red-700">{errors.confirmPassword.message}</p>
          )}
        </Field>
        <Field>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating Account..." : "Create Account"}
          </Button>
        </Field>
        <FieldDescription className="text-center">
          Already have an account?{" "}
          <a href="/login" className="underline underline-offset-4">
            Sign in
          </a>
        </FieldDescription>
      </FieldGroup>
    </form>
  )
}
