export const GMAIL_STORAGE_KEY = "guard_gmail";

export const ROLE_LABELS = {
  writer: "Writer",
  reader: "Reader",
} as const;

export const MESSAGES = {
  setupSuccess: "Setup Complete!",
  copySuccess: "Copied!",
  cleanupRecommended:
    "Cleanup recommended: unverified users have access to this file.",
  noAccess: "No access to the document",
} as const;
