import { Resend } from "resend";
import { APP_NAME } from "@/lib/constants";
import type { User } from "@/types";

interface NotificationEmailPayload {
  type: string;
  message: string;
  link?: string | null;
}

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = `${APP_NAME} <onboarding@resend.dev>`;

const shouldSendEmail = (recipient: User, type: string) => {
  switch (type) {
    case "mention":
      return recipient.user_preferences.mentionAlerts;
    case "resource_approved":
    case "resource_rejected":
      return recipient.user_preferences.resourceAlerts;
    case "resource_request":
      return recipient.user_preferences.requestUpdates;
    default:
      return true;
  }
};

const buildSubject = (type: string) => {
  switch (type) {
    case "mention":
      return `${APP_NAME}: You were mentioned`;
    case "resource_approved":
      return `${APP_NAME}: Resource approved`;
    case "resource_rejected":
      return `${APP_NAME}: Resource rejected`;
    case "resource_request":
      return `${APP_NAME}: Resource request update`;
    case "room_kick":
      return `${APP_NAME}: Room membership changed`;
    case "room_closed":
      return `${APP_NAME}: Study room closed`;
    default:
      return `${APP_NAME}: New notification`;
  }
};

const toAbsoluteLink = (link?: string | null) => {
  if (!link) {
    return null;
  }

  if (link.startsWith("http://") || link.startsWith("https://")) {
    return link;
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${baseUrl}${link.startsWith("/") ? "" : "/"}${link}`;
};

export const sendNotificationEmail = async (recipient: User, payload: NotificationEmailPayload) => {
  if (!process.env.RESEND_API_KEY) {
    return;
  }

  if (!shouldSendEmail(recipient, payload.type)) {
    return;
  }

  const absoluteLink = toAbsoluteLink(payload.link);
  const subject = buildSubject(payload.type);
  const greetingName = recipient.name ?? "there";
  const plainText = absoluteLink ? `${payload.message}\n\nOpen: ${absoluteLink}` : payload.message;
  const html = absoluteLink
    ? `<p>Hello ${greetingName},</p><p>${payload.message}</p><p><a href="${absoluteLink}">Open in ${APP_NAME}</a></p>`
    : `<p>Hello ${greetingName},</p><p>${payload.message}</p>`;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: recipient.email,
      subject,
      text: plainText,
      html
    });
  } catch (error) {
    console.error("Failed to send notification email", error);
  }
};
