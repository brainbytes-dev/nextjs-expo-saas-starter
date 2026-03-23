"use client"

import { useState, useRef } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import {
  IconBug,
  IconBulb,
  IconMessageCircle,
  IconBook,
  IconStatusChange,
  IconMail,
  IconSend,
  IconExternalLink,
  IconQuestionMark,
  IconLifebuoy,
} from "@tabler/icons-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

// ---------------------------------------------------------------------------
// Quick Link Card
// ---------------------------------------------------------------------------
function QuickLinkCard({
  icon: Icon,
  title,
  description,
  href,
  external,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  href: string
  external?: boolean
}) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="group block"
    >
      <Card className="h-full transition-colors hover:border-primary/40 hover:bg-muted/30">
        <CardContent className="flex flex-col items-center text-center gap-2 p-5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-5" />
          </div>
          <div className="flex items-center gap-1.5 text-sm font-medium">
            {title}
            {external && (
              <IconExternalLink className="size-3 text-muted-foreground" />
            )}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {description}
          </p>
        </CardContent>
      </Card>
    </a>
  )
}

// ---------------------------------------------------------------------------
// Support Form
// ---------------------------------------------------------------------------
function SupportForm() {
  const t = useTranslations("support")
  const [type, setType] = useState<"bug" | "feature" | "question">("bug")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState("normal")
  const [loading, setLoading] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const currentPage =
    typeof window !== "undefined" ? window.location.href : ""

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !description.trim()) return

    setLoading(true)
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title: title.trim(),
          description: description.trim(),
          priority: type === "bug" ? priority : "normal",
          page: currentPage,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Request failed")
      }

      toast.success(t("submitSuccess"))
      setTitle("")
      setDescription("")
      setPriority("normal")
    } catch (err) {
      toast.error(
        t("submitError") +
          (err instanceof Error ? `: ${err.message}` : "")
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconLifebuoy className="size-5" />
          {t("formTitle")}
        </CardTitle>
        <CardDescription>{t("formDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs
          value={type}
          onValueChange={(v) => setType(v as typeof type)}
          className="w-full"
        >
          <TabsList className="mb-6 w-full">
            <TabsTrigger value="bug" className="flex items-center gap-1.5">
              <IconBug className="size-4" />
              {t("typeBug")}
            </TabsTrigger>
            <TabsTrigger value="feature" className="flex items-center gap-1.5">
              <IconBulb className="size-4" />
              {t("typeFeature")}
            </TabsTrigger>
            <TabsTrigger
              value="question"
              className="flex items-center gap-1.5"
            >
              <IconMessageCircle className="size-4" />
              {t("typeQuestion")}
            </TabsTrigger>
          </TabsList>

          {/* All types share the same form — only priority is conditional */}
          <TabsContent value={type}>
            <form
              ref={formRef}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="support-title">{t("titleLabel")}</Label>
                <Input
                  id="support-title"
                  placeholder={t("titlePlaceholder")}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  maxLength={200}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="support-description">
                  {t("descriptionLabel")}
                </Label>
                <Textarea
                  id="support-description"
                  placeholder={t("descriptionPlaceholder")}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={5}
                  maxLength={5000}
                />
              </div>

              {type === "bug" && (
                <div className="space-y-2">
                  <Label htmlFor="support-priority">
                    {t("priorityLabel")}
                  </Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger id="support-priority" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{t("priorityLow")}</SelectItem>
                      <SelectItem value="normal">
                        {t("priorityNormal")}
                      </SelectItem>
                      <SelectItem value="high">
                        {t("priorityHigh")}
                      </SelectItem>
                      <SelectItem value="critical">
                        {t("priorityCritical")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="support-page">{t("pageLabel")}</Label>
                <Input
                  id="support-page"
                  value={currentPage}
                  readOnly
                  className="text-muted-foreground"
                />
              </div>

              <Button
                type="submit"
                disabled={loading || !title.trim() || !description.trim()}
                className="w-full gap-2"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    {t("submitting")}
                  </span>
                ) : (
                  <>
                    <IconSend className="size-4" />
                    {t("submitButton")}
                  </>
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// FAQ Section
// ---------------------------------------------------------------------------
function FaqSection() {
  const t = useTranslations("support")

  const faqs = [
    { q: t("faqPasswordQ"), a: t("faqPasswordA") },
    { q: t("faqInviteQ"), a: t("faqInviteA") },
    { q: t("faqImportQ"), a: t("faqImportA") },
    { q: t("faqBarcodeQ"), a: t("faqBarcodeA") },
    { q: t("faqLanguageQ"), a: t("faqLanguageA") },
    { q: t("faqDsgvoQ"), a: t("faqDsgvoA") },
    { q: t("faqContactQ"), a: t("faqContactA") },
    { q: t("faqRequirementsQ"), a: t("faqRequirementsA") },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconQuestionMark className="size-5" />
          {t("faqTitle")}
        </CardTitle>
        <CardDescription>{t("faqDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger>{faq.q}</AccordionTrigger>
              <AccordionContent>
                <p className="text-muted-foreground">{faq.a}</p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Contact Section
// ---------------------------------------------------------------------------
function ContactSection() {
  const t = useTranslations("support")

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconMail className="size-5" />
          {t("contactTitle")}
        </CardTitle>
        <CardDescription>{t("contactDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <a
          href="mailto:support@zentory.ch"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <IconMail className="size-4" />
          support@zentory.ch
        </a>
        <p className="text-sm text-muted-foreground">
          {t("contactResponseTime")}
        </p>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function SupportPage() {
  const t = useTranslations("support")

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4 md:p-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("pageTitle")}</h1>
        <p className="mt-1 text-muted-foreground">{t("pageSubtitle")}</p>
      </div>

      {/* Section 1: Quick Links */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">{t("quickLinksTitle")}</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <QuickLinkCard
            icon={IconBook}
            title={t("quickDocs")}
            description={t("quickDocsDesc")}
            href="https://docs.zentory.ch"
            external
          />
          <QuickLinkCard
            icon={IconQuestionMark}
            title={t("quickFaq")}
            description={t("quickFaqDesc")}
            href="#faq"
          />
          <QuickLinkCard
            icon={IconStatusChange}
            title={t("quickStatus")}
            description={t("quickStatusDesc")}
            href="/status"
          />
          <QuickLinkCard
            icon={IconMail}
            title={t("quickContact")}
            description={t("quickContactDesc")}
            href="mailto:support@zentory.ch"
          />
        </div>
      </section>

      {/* Section 2: Support Form */}
      <section>
        <SupportForm />
      </section>

      {/* Section 3: FAQ */}
      <section id="faq">
        <FaqSection />
      </section>

      {/* Section 4: Contact */}
      <section>
        <ContactSection />
      </section>
    </div>
  )
}
