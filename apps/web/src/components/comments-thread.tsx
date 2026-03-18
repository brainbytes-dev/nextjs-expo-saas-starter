"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useTranslations, useLocale } from "next-intl"
import {
  IconCornerDownRight,
  IconEdit,
  IconTrash,
  IconSend,
  IconX,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  MentionInput,
  type Member,
  type MentionInputHandle,
} from "@/components/mention-input"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface CommentUser {
  userId: string
  userName: string | null
  userEmail: string
  userImage: string | null
}

interface CommentRow extends CommentUser {
  id: string
  parentId: string | null
  body: string
  mentions: string[] | null
  createdAt: string
  updatedAt: string
  replies: CommentRow[]
}

export interface CommentsThreadProps {
  entityType: string
  entityId: string
  /** Pass the org ID explicitly; component falls back to cookie "orgId" */
  orgId?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const RTF_LOCALES: Record<string, string> = {
  de: "de-CH",
  fr: "fr-CH",
  it: "it-CH",
  en: "en-GB",
}

function relativeTime(dateStr: string, locale: string): string {
  try {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
    const rtf = new Intl.RelativeTimeFormat(RTF_LOCALES[locale] ?? "de-CH", {
      numeric: "auto",
    })
    if (diff < 60) return rtf.format(-Math.round(diff), "second")
    if (diff < 3600) return rtf.format(-Math.round(diff / 60), "minute")
    if (diff < 86400) return rtf.format(-Math.round(diff / 3600), "hour")
    if (diff < 2592000) return rtf.format(-Math.round(diff / 86400), "day")
    return rtf.format(-Math.round(diff / 2592000), "month")
  } catch {
    return dateStr
  }
}

function isEdited(row: CommentRow): boolean {
  return (
    new Date(row.updatedAt).getTime() - new Date(row.createdAt).getTime() > 2000
  )
}

function Avatar({ user }: { user: CommentUser }) {
  if (user.userImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.userImage}
        alt=""
        className="size-7 rounded-full object-cover shrink-0"
      />
    )
  }
  const initials = (user.userName ?? user.userEmail).slice(0, 2).toUpperCase()
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
      {initials}
    </span>
  )
}

/**
 * Renders comment body with @-mentions highlighted in blue.
 */
function CommentBody({ body }: { body: string }) {
  const parts = body.split(/(@\S+)/g)
  return (
    <p className="text-sm whitespace-pre-wrap break-words">
      {parts.map((part, i) =>
        part.startsWith("@") ? (
          <span key={i} className="font-medium text-blue-600">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </p>
  )
}

// ---------------------------------------------------------------------------
// Single comment card
// ---------------------------------------------------------------------------
interface CommentCardProps {
  comment: CommentRow
  currentUserId: string | null
  currentUserRole: string | null
  orgId: string
  locale: string
  t: ReturnType<typeof useTranslations>
  onUpdated(updated: CommentRow): void
  onDeleted(id: string): void
  onReply(parentId: string): void
  isReply?: boolean
}

function CommentCard({
  comment,
  currentUserId,
  currentUserRole,
  orgId,
  locale,
  t,
  onUpdated,
  onDeleted,
  onReply,
  isReply = false,
}: CommentCardProps) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(comment.body)
  const [editSaving, setEditSaving] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isOwn = currentUserId === comment.userId
  const isAdmin = currentUserRole === "admin"
  const canModify = isOwn || isAdmin

  const handleSaveEdit = useCallback(async () => {
    if (!editValue.trim()) return
    setEditSaving(true)
    try {
      const res = await fetch(`/api/comments/${comment.id}?orgId=${orgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: editValue.trim() }),
      })
      if (res.ok) {
        const updated = await res.json()
        onUpdated({ ...comment, ...updated, replies: comment.replies })
        setEditing(false)
      }
    } catch {
      // TODO: toast
    } finally {
      setEditSaving(false)
    }
  }, [comment, editValue, onUpdated, orgId])

  const handleDelete = useCallback(async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/comments/${comment.id}?orgId=${orgId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        onDeleted(comment.id)
      }
    } catch {
      // TODO: toast
    } finally {
      setDeleting(false)
      setShowDeleteDialog(false)
    }
  }, [comment.id, onDeleted, orgId])

  return (
    <>
      <div className={`flex gap-3 ${isReply ? "ml-8 mt-2" : ""}`}>
        <Avatar user={comment} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-1.5">
            <span className="text-sm font-semibold">
              {comment.userName ?? comment.userEmail}
            </span>
            <span className="text-xs text-muted-foreground">
              {relativeTime(comment.createdAt, locale)}
            </span>
            {isEdited(comment) && (
              <span className="text-xs text-muted-foreground italic">
                ({t("edited")})
              </span>
            )}
          </div>

          {editing ? (
            <div className="mt-2 space-y-2">
              <textarea
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                rows={3}
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={editSaving || !editValue.trim()}
                >
                  <IconSend className="size-3.5" />
                  {t("send")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditing(false)
                    setEditValue(comment.body)
                  }}
                >
                  <IconX className="size-3.5" />
                  {t("cancel")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-0.5">
              <CommentBody body={comment.body} />
            </div>
          )}

          {!editing && (
            <div className="mt-1 flex items-center gap-2">
              {!isReply && (
                <button
                  onClick={() => onReply(comment.id)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <IconCornerDownRight className="size-3" />
                  {t("reply")}
                </button>
              )}
              {canModify && (
                <>
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <IconEdit className="size-3" />
                    {t("edit")}
                  </button>
                  <button
                    onClick={() => setShowDeleteDialog(true)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <IconTrash className="size-3" />
                    {t("delete")}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("delete")}</DialogTitle>
            <DialogDescription>{t("deleteConfirm")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleting}
            >
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ---------------------------------------------------------------------------
// Main CommentsThread component
// ---------------------------------------------------------------------------
export function CommentsThread({
  entityType,
  entityId,
  orgId,
}: CommentsThreadProps) {
  const t = useTranslations("comments")
  const locale = useLocale()

  const [commentList, setCommentList] = useState<CommentRow[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [resolvedOrgId, setResolvedOrgId] = useState<string | null>(
    orgId ?? null
  )

  // New comment
  const inputRef = useRef<MentionInputHandle>(null)
  const [submitting, setSubmitting] = useState(false)

  // Reply state
  const [replyParentId, setReplyParentId] = useState<string | null>(null)
  const replyInputRef = useRef<MentionInputHandle>(null)
  const [replySubmitting, setReplySubmitting] = useState(false)

  // ---------------------------------------------------------------------------
  // Load data
  // ---------------------------------------------------------------------------
  useEffect(() => {
    async function init() {
      try {
        let oid = orgId
        if (!oid) {
          // Try to read from cookie set by the org-switcher component
          const cookieOrgId =
            document.cookie
              .split("; ")
              .find((row) => row.startsWith("orgId="))
              ?.split("=")[1] ?? null
          oid = cookieOrgId ?? undefined
        }

        // Get current user via Better-Auth session endpoint
        const sessionRes = await fetch("/api/auth/get-session", {
          headers: oid ? { "x-organization-id": oid } : {},
        })
        if (sessionRes.ok) {
          const s = await sessionRes.json()
          setCurrentUserId(s?.user?.id ?? null)
          setCurrentUserRole(s?.user?.role ?? null)
          if (!oid && s?.session?.activeOrganizationId) {
            oid = s.session.activeOrganizationId
          }
        }

        if (!oid) {
          setLoading(false)
          return
        }
        setResolvedOrgId(oid)

        const [commentsRes, membersRes] = await Promise.all([
          fetch(
            `/api/comments?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}&orgId=${oid}`
          ),
          fetch(`/api/organizations/${oid}/members`, {
            headers: { "x-organization-id": oid },
          }),
        ])

        if (commentsRes.ok) {
          const data = await commentsRes.json()
          setCommentList(Array.isArray(data) ? data : [])
        }
        if (membersRes.ok) {
          const data = await membersRes.json()
          setMembers(
            Array.isArray(data)
              ? data.map((m: Record<string, unknown>) => ({
                  userId: String(m.userId),
                  userName: (m.userName as string | null) ?? null,
                  userEmail: String(m.userEmail),
                  userImage: (m.userImage as string | null) ?? null,
                }))
              : []
          )
        }
      } catch {
        // fail silently; section stays empty
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [entityType, entityId, orgId])

  // ---------------------------------------------------------------------------
  // Submit new top-level comment
  // ---------------------------------------------------------------------------
  const handleSubmit = useCallback(async () => {
    const body = inputRef.current?.getValue().trim()
    const mentionIds = inputRef.current?.getMentions() ?? []
    if (!body || !resolvedOrgId) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/comments?orgId=${resolvedOrgId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": resolvedOrgId,
        },
        body: JSON.stringify({
          entityType,
          entityId,
          body,
          mentions: mentionIds.length ? mentionIds : undefined,
        }),
      })
      if (res.ok) {
        const created: CommentRow = await res.json()
        setCommentList((prev) => [...prev, created])
        inputRef.current?.reset()
      }
    } catch {
      // TODO: toast
    } finally {
      setSubmitting(false)
    }
  }, [entityType, entityId, resolvedOrgId])

  // ---------------------------------------------------------------------------
  // Submit reply
  // ---------------------------------------------------------------------------
  const handleReplySubmit = useCallback(async () => {
    const body = replyInputRef.current?.getValue().trim()
    const mentionIds = replyInputRef.current?.getMentions() ?? []
    if (!body || !replyParentId || !resolvedOrgId) return

    setReplySubmitting(true)
    try {
      const res = await fetch(`/api/comments?orgId=${resolvedOrgId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": resolvedOrgId,
        },
        body: JSON.stringify({
          entityType,
          entityId,
          body,
          mentions: mentionIds.length ? mentionIds : undefined,
          parentId: replyParentId,
        }),
      })
      if (res.ok) {
        const created: CommentRow = await res.json()
        setCommentList((prev) =>
          prev.map((c) =>
            c.id === replyParentId
              ? { ...c, replies: [...(c.replies ?? []), created] }
              : c
          )
        )
        replyInputRef.current?.reset()
        setReplyParentId(null)
      }
    } catch {
      // TODO: toast
    } finally {
      setReplySubmitting(false)
    }
  }, [entityType, entityId, replyParentId, resolvedOrgId])

  // ---------------------------------------------------------------------------
  // Update / delete handlers from child cards
  // ---------------------------------------------------------------------------
  const handleUpdated = useCallback((updated: CommentRow) => {
    setCommentList((prev) =>
      prev.map((c) => {
        if (c.id === updated.id) return { ...updated, replies: c.replies }
        return {
          ...c,
          replies: (c.replies ?? []).map((r) =>
            r.id === updated.id ? updated : r
          ),
        }
      })
    )
  }, [])

  const handleDeleted = useCallback((id: string) => {
    setCommentList((prev) =>
      prev
        .filter((c) => c.id !== id)
        .map((c) => ({
          ...c,
          replies: (c.replies ?? []).filter((r) => r.id !== id),
        }))
    )
  }, [])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="space-y-3 py-4">
        {[1, 2].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="size-7 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  const sharedCardProps = {
    currentUserId,
    currentUserRole,
    orgId: resolvedOrgId ?? "",
    locale,
    t,
    onUpdated: handleUpdated,
    onDeleted: handleDeleted,
  }

  const totalCount = commentList.reduce(
    (sum, c) => sum + 1 + (c.replies?.length ?? 0),
    0
  )

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {t("title")}
        {totalCount > 0 && (
          <span className="ml-1.5 text-xs normal-case font-normal">
            ({totalCount})
          </span>
        )}
      </h3>

      {commentList.length === 0 && (
        <p className="text-sm text-muted-foreground py-2">{t("noComments")}</p>
      )}

      <div className="space-y-4">
        {commentList.map((comment, idx) => (
          <div
            key={comment.id}
            className={`space-y-2 ${idx > 0 ? "border-t pt-4" : ""}`}
          >
            <CommentCard
              comment={comment}
              {...sharedCardProps}
              onReply={(parentId) => {
                setReplyParentId(
                  parentId === replyParentId ? null : parentId
                )
                requestAnimationFrame(() => replyInputRef.current?.reset())
              }}
            />

            {/* Replies */}
            {(comment.replies ?? []).map((reply) => (
              <CommentCard
                key={reply.id}
                comment={reply}
                {...sharedCardProps}
                onReply={() => {}}
                isReply
              />
            ))}

            {/* Inline reply box */}
            {replyParentId === comment.id && (
              <div className="ml-8 space-y-2 pt-1">
                <p className="text-xs text-muted-foreground">
                  {t("replyTo", {
                    name: comment.userName ?? comment.userEmail,
                  })}
                </p>
                <MentionInput
                  ref={replyInputRef}
                  members={members}
                  placeholder={t("placeholder")}
                  onSubmit={handleReplySubmit}
                  disabled={replySubmitting}
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleReplySubmit}
                    disabled={replySubmitting}
                  >
                    <IconSend className="size-3.5" />
                    {t("send")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setReplyParentId(null)}
                  >
                    <IconX className="size-3.5" />
                    {t("cancel")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* New top-level comment */}
      <div className="border-t pt-4 space-y-2">
        <MentionInput
          ref={inputRef}
          members={members}
          placeholder={t("placeholder")}
          onSubmit={handleSubmit}
          disabled={submitting}
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={handleSubmit} disabled={submitting}>
            <IconSend className="size-3.5" />
            {t("addComment")}
          </Button>
        </div>
      </div>
    </div>
  )
}
