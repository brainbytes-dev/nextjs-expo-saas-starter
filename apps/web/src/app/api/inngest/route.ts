import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import { sendWelcomeEmailFn } from "@/inngest/send-welcome-email";
import { paymentFailedReminderFn } from "@/inngest/payment-failed-reminder";
import { subscriptionCanceledFn } from "@/inngest/subscription-canceled";
import { cleanupSessionsFn } from "@/inngest/cleanup-sessions";
import { syncIntegrationsFn } from "@/inngest/sync-integrations";
import { checkLowStockFn } from "@/inngest/check-low-stock";
import { sendScheduledReportsFn } from "@/inngest/send-scheduled-reports";
import { checkReorderFn } from "@/inngest/check-reorder";
import { detectAnomaliesFn } from "@/inngest/detect-anomalies";
import { sendShiftReportFn } from "@/inngest/send-shift-report";
import { deleteUserDataFn } from "@/inngest/delete-user-data";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    sendWelcomeEmailFn,
    paymentFailedReminderFn,
    subscriptionCanceledFn,
    cleanupSessionsFn,
    syncIntegrationsFn,
    checkLowStockFn,
    sendScheduledReportsFn,
    checkReorderFn,
    detectAnomaliesFn,
    sendShiftReportFn,
    deleteUserDataFn,
  ],
});
