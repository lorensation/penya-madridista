/**
 * Marketing campaign email template.
 * Used for admin-created marketing campaigns sent to opted-in users.
 */

import { renderEmailLayout, getListUnsubscribeHeaders } from "./layout"

export interface MarketingTemplateData {
  /** The email subject (also used for preview text fallback) */
  subject: string
  /** Optional preview text */
  previewText?: string
  /** HTML body content (the campaign content, rendered inside the layout) */
  htmlContent: string
  /** Preferences token for unsubscribe/manage links */
  preferencesToken?: string
}

export function renderMarketingEmail(data: MarketingTemplateData): string {
  return renderEmailLayout({
    body: data.htmlContent,
    previewText: data.previewText || data.subject,
    includeUnsubscribe: true,
    preferencesToken: data.preferencesToken,
  })
}

export { getListUnsubscribeHeaders }
