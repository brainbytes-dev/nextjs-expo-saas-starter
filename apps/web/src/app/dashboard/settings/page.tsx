"use client"

import { useRef, useState, useCallback, useEffect } from "react"
import { useSession } from "@/lib/auth-client"
import { updateProfile, changePassword } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { PasswordInput } from "@/components/ui/password-input"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useTranslations } from "next-intl"
import {
  IconCamera,
  IconAlertTriangle,
  IconCheck,
  IconShieldLock,
  IconDeviceDesktop,
  IconShield,
  IconPlugConnected,
  IconAdjustments,
  IconBuilding,
} from "@tabler/icons-react"
import { DsgvoExportCard } from "@/components/dsgvo-export-card"
import { DsgvoDeleteCard } from "@/components/dsgvo-delete-card"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

// ── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }
  if (email) return email.slice(0, 2).toUpperCase()
  return "??"
}

function formatMemberSince(date?: string | Date | null): string {
  if (!date) return "—"
  try {
    return new Intl.DateTimeFormat("de-CH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(date))
  } catch {
    return "—"
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusMessage({
  error,
  success,
}: {
  error: string | null
  success: string | null
}) {
  if (error) {
    return (
      <p className="flex items-center gap-1.5 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
        <IconAlertTriangle className="size-4 shrink-0" aria-hidden />
        {error}
      </p>
    )
  }
  if (success) {
    return (
      <p className="flex items-center gap-1.5 rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
        <IconCheck className="size-4 shrink-0" aria-hidden />
        {success}
      </p>
    )
  }
  return null
}

// ── 2FA Status Badge ─────────────────────────────────────────────────────────

function TwoFactorBadge() {
  const t = useTranslations("settings")
  const [enabled, setEnabled] = useState<boolean | null>(null)

  useEffect(() => {
    fetch("/api/auth/two-factor/status", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setEnabled(data.enabled === true))
      .catch(() => setEnabled(false))
  }, [])

  if (enabled === null) return null
  if (!enabled) return null

  return (
    <Badge variant="default" className="bg-green-600 hover:bg-green-700">
      <IconCheck className="mr-1 size-3" />
      {t("twoFactorActive")}
    </Badge>
  )
}

// ── Settings Categories ───────────────────────────────────────────────────────

function useSettingsCategories() {
  const t = useTranslations("settings")
  return [
    {
      title: t("catHardware"),
      icon: IconDeviceDesktop,
      links: [
        { label: t("linkScanner"), href: "/dashboard/settings/scanner" },
        { label: t("linkPrinter"), href: "/dashboard/settings/printer" },
        { label: t("linkRfid"), href: "/dashboard/settings/rfid" },
        { label: t("linkKeypad"), href: "/dashboard/settings/keypad" },
      ],
    },
    {
      title: t("catSecurity"),
      icon: IconShield,
      links: [
        { label: t("linkTeam"), href: "/dashboard/settings/team" },
        { label: t("linkRoles"), href: "/dashboard/settings/roles" },
        { label: t("linkSessions"), href: "/dashboard/settings/sessions" },
        { label: t("linkIpAccess"), href: "/dashboard/settings/ip-allowlist" },
        { label: t("linkTwoFactor"), href: "/dashboard/settings/two-factor" },
      ],
    },
    {
      title: t("catIntegrations"),
      icon: IconPlugConnected,
      links: [
        { label: t("linkIntegrations"), href: "/dashboard/settings/integrations" },
        { label: t("linkPlugins"), href: "/dashboard/settings/plugins" },
        { label: t("linkAi"), href: "/dashboard/settings/ai" },
        { label: t("linkEmailInbox"), href: "/dashboard/settings/email-inbox" },
      ],
    },
    {
      title: t("catConfiguration"),
      icon: IconAdjustments,
      links: [
        { label: t("linkAlerts"), href: "/dashboard/settings/alerts" },
        { label: t("linkAutomations"), href: "/dashboard/settings/automations" },
        { label: t("linkCustomFields"), href: "/dashboard/settings/custom-fields" },
        { label: t("linkChecklists"), href: "/dashboard/settings/checklists" },
        { label: t("linkScheduledReports"), href: "/dashboard/settings/scheduled-reports" },
      ],
    },
    {
      title: t("catOrganization"),
      icon: IconBuilding,
      links: [
        { label: t("linkBranding"), href: "/dashboard/settings/branding" },
        { label: t("linkDataRetention"), href: "/dashboard/settings/data-retention" },
      ],
    },
  ]
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { data: session } = useSession()
  const t = useTranslations("settings")
  const tp = useTranslations("profile")
  const ts = useTranslations("security")
  const tc = useTranslations("common")

  const SETTINGS_CATEGORIES = useSettingsCategories()

  // ── Avatar state ──
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)

  // ── Profile form state ──
  const [profileName, setProfileName] = useState(session?.user?.name ?? "")
  const [isProfileLoading, setIsProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null)

  // ── Password form state ──
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [isPasswordLoading, setIsPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)

  // ── Derived values ──
  const user = session?.user as
    | { name?: string | null; email?: string | null; image?: string | null; createdAt?: string | null }
    | undefined

  const currentAvatar = avatarPreview ?? user?.image ?? ""
  const initials = getInitials(user?.name, user?.email)
  const memberSince = formatMemberSince(user?.createdAt)

  // ── Avatar upload handler ──
  const handleAvatarChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      setAvatarError(null)

      const allowed = ["image/jpeg", "image/png", "image/webp"]
      if (!allowed.includes(file.type)) {
        setAvatarError(t("avatarOnlyFormats"))
        return
      }

      if (file.size > 2 * 1024 * 1024) {
        setAvatarError(t("avatarMaxSize"))
        return
      }

      const reader = new FileReader()
      reader.onload = async (ev) => {
        const dataUrl = ev.target?.result as string
        setAvatarPreview(dataUrl)
        setIsUploadingAvatar(true)
        try {
          const result = await updateProfile({ image: dataUrl })
          if (result?.error) {
            setAvatarError(result.error)
            setAvatarPreview(null)
          }
        } catch {
          setAvatarError(t("avatarSaveFailed"))
          setAvatarPreview(null)
        } finally {
          setIsUploadingAvatar(false)
          // Reset so re-selecting the same file triggers onChange again
          if (fileInputRef.current) fileInputRef.current.value = ""
        }
      }
      reader.readAsDataURL(file)
    },
    [t]
  )

  const handleRemoveAvatar = useCallback(async () => {
    setAvatarError(null)
    setIsUploadingAvatar(true)
    try {
      const result = await updateProfile({ image: null })
      if (result?.error) {
        setAvatarError(result.error)
      } else {
        setAvatarPreview(null)
      }
    } catch {
      setAvatarError(t("avatarRemoveFailed"))
    } finally {
      setIsUploadingAvatar(false)
    }
  }, [t])

  // ── Profile save ──
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileError(null)
    setProfileSuccess(null)

    if (!profileName.trim()) {
      setProfileError(t("nameRequired"))
      return
    }

    setIsProfileLoading(true)
    try {
      const result = await updateProfile({ name: profileName.trim() })
      if (result?.error) {
        setProfileError(result.error)
      } else {
        setProfileSuccess(t("profileUpdated"))
        setTimeout(() => setProfileSuccess(null), 3000)
      }
    } catch (err) {
      setProfileError(
        err instanceof Error ? err.message : t("profileUpdateFailed")
      )
    } finally {
      setIsProfileLoading(false)
    }
  }

  // ── Password change ──
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(null)

    const { currentPassword, newPassword, confirmPassword } = passwordForm

    if (!currentPassword) {
      setPasswordError(t("enterCurrentPw"))
      return
    }
    if (!newPassword) {
      setPasswordError(t("enterNewPw"))
      return
    }
    if (newPassword.length < 8) {
      setPasswordError(t("newPwMinLength"))
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t("pwMismatch"))
      return
    }

    setIsPasswordLoading(true)
    try {
      const result = await changePassword({ currentPassword, newPassword })
      if (result?.error) {
        setPasswordError(
          result.error === "Invalid password"
            ? t("wrongPassword")
            : result.error
        )
      } else {
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
        setPasswordSuccess(t("passwordChanged"))
        setTimeout(() => setPasswordSuccess(null), 3000)
      }
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : t("passwordChangeFailed")
      )
    } finally {
      setIsPasswordLoading(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      {/* ── Settings Navigation Grid ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SETTINGS_CATEGORIES.map((category) => (
          <Card key={category.title}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <category.icon className="size-5 text-muted-foreground" />
                {category.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-1">
                {category.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-block text-sm text-muted-foreground transition-colors hover:text-foreground hover:underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator />

      {/* ── Profil ── */}
      <Card>
        <CardHeader>
          <CardTitle>{tp("title")}</CardTitle>
          <CardDescription>
            {t("profileDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-6">
            {/* Avatar + fields row */}
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              {/* Avatar upload */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <Avatar className="size-20 rounded-full text-xl">
                    <AvatarImage src={currentAvatar} alt={user?.name ?? "Avatar"} />
                    <AvatarFallback className="rounded-full text-xl">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  {/* Camera overlay button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    aria-label={t("changePhoto")}
                    className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none disabled:cursor-not-allowed"
                  >
                    <IconCamera className="size-6 text-white" aria-hidden />
                  </button>
                </div>

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={handleAvatarChange}
                  aria-hidden
                />

                <div className="flex flex-col items-center gap-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="text-xs text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isUploadingAvatar ? t("saving") : t("changePhoto")}
                  </button>
                  {(currentAvatar) && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      disabled={isUploadingAvatar}
                      className="text-xs text-muted-foreground hover:text-destructive hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {t("removePhoto")}
                    </button>
                  )}
                </div>

                {avatarError && (
                  <p className="max-w-[140px] text-center text-xs text-destructive">
                    {avatarError}
                  </p>
                )}
              </div>

              {/* Name + Email + Member since */}
              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{tp("name")}</Label>
                  <Input
                    id="name"
                    placeholder={t("namePlaceholder")}
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    disabled={isProfileLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{tp("email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email ?? ""}
                    disabled
                    className="cursor-not-allowed opacity-60"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("emailReadonly")}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    {t("memberSince")}
                  </p>
                  <p className="text-sm">{memberSince}</p>
                </div>
              </div>
            </div>

            {/* Timezone */}
            <div className="space-y-2">
              <Label htmlFor="timezone">{t("timezone")}</Label>
              <Select defaultValue="europe_zurich">
                <SelectTrigger id="timezone" disabled={isProfileLoading}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="europe_zurich">{t("tzEuropeZurich")}</SelectItem>
                  <SelectItem value="europe_berlin">{t("tzEuropeBerlin")}</SelectItem>
                  <SelectItem value="europe_london">{t("tzEuropeLondon")}</SelectItem>
                  <SelectItem value="utc">{t("tzUtc")}</SelectItem>
                  <SelectItem value="america_new_york">{t("tzAmericaNewYork")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <StatusMessage error={profileError} success={profileSuccess} />

            <Button type="submit" disabled={isProfileLoading}>
              {isProfileLoading ? t("saving") : t("saveChanges")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* ── Sprache ── */}
      <Card>
        <CardHeader>
          <CardTitle>{t("language")}</CardTitle>
          <CardDescription>{t("languageDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <LanguageSwitcher />
        </CardContent>
      </Card>

      <Separator />

      {/* ── Passwort ändern ── */}
      <Card>
        <CardHeader>
          <CardTitle>{tp("changePassword")}</CardTitle>
          <CardDescription>
            {t("passwordDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-6">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">{tp("currentPassword")}</Label>
                <PasswordInput
                  id="current-password"
                  placeholder={t("enterCurrentPassword")}
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                  }
                  disabled={isPasswordLoading}
                  autoComplete="current-password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">{tp("newPassword")}</Label>
                <PasswordInput
                  id="new-password"
                  placeholder={t("minChars")}
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                  }
                  disabled={isPasswordLoading}
                  autoComplete="new-password"
                />
                {passwordForm.newPassword.length > 0 &&
                  passwordForm.newPassword.length < 8 && (
                    <p className="text-xs text-destructive">
                      {t("minCharsRequired")}
                    </p>
                  )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">{tp("confirmPassword")}</Label>
                <PasswordInput
                  id="confirm-password"
                  placeholder={t("repeatNewPassword")}
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                  }
                  disabled={isPasswordLoading}
                  autoComplete="new-password"
                />
                {passwordForm.confirmPassword.length > 0 &&
                  passwordForm.newPassword !== passwordForm.confirmPassword && (
                    <p className="text-xs text-destructive">
                      {t("passwordsMismatch")}
                    </p>
                  )}
              </div>
            </div>

            <StatusMessage error={passwordError} success={passwordSuccess} />

            <Button type="submit" disabled={isPasswordLoading}>
              {isPasswordLoading ? t("updating") : t("updatePassword")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* ── Benachrichtigungen & Datenschutz ── */}
      <Card>
        <CardHeader>
          <CardTitle>{t("preferences")}</CardTitle>
          <CardDescription>
            {t("preferencesDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t("emailNotifications")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("emailNotificationsDesc")}
                </p>
              </div>
              <input type="checkbox" defaultChecked className="h-4 w-4" />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t("marketingEmails")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("marketingEmailsDesc")}
                </p>
              </div>
              <input type="checkbox" className="h-4 w-4" />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div>
                  <p className="font-medium">{ts("twoFactor")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("twoFactorDesc")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TwoFactorBadge />
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/settings/two-factor">
                    <IconShieldLock className="mr-1.5 size-4" />
                    {t("configure")}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* ── Gefahrenzone ── */}
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-destructive">{ts("dangerZone")}</CardTitle>
          <CardDescription>
            {t("dangerZoneDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4">
            <p className="mb-1 text-sm font-medium">{ts("deleteAccount")}</p>
            <p className="mb-4 text-sm text-muted-foreground">
              {t("deleteAccountDesc")}
            </p>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  {ts("deleteAccount")}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-destructive">
                    <IconAlertTriangle className="size-5 shrink-0" aria-hidden />
                    {t("deleteAccountConfirmTitle")}
                  </DialogTitle>
                  <DialogDescription>
                    {t("deleteAccountConfirmDesc")}
                  </DialogDescription>
                </DialogHeader>
                <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {t("deleteAccountSupport")}
                  <br />
                  <a
                    href="mailto:support@logistikapp.ch"
                    className="font-medium underline underline-offset-2"
                  >
                    support@logistikapp.ch
                  </a>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">{tc("cancel")}</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* ── DSGVO Datenexport ── */}
      <DsgvoExportCard />

      <Separator />

      {/* ── DSGVO Kontolöschung ── */}
      <DsgvoDeleteCard />

      <Separator />

      {/* Tour restart */}
      <Card>
        <CardHeader>
          <CardTitle>{t("help")}</CardTitle>
          <CardDescription>{t("helpDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={() => {
              window.dispatchEvent(new Event("restart-welcome-tour"))
            }}
          >
            {t("restartTour")}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
