export const GMAIL_STORAGE_KEY = "guard_gmail";

export const DEFAULT_MODE = "create" as const;

export const ROLE_LABELS = {
  writer: "Writer",
  reader: "Reader",
} as const;

export const MODE_LABELS = {
  create: "Create Protected Spreadsheet",
  copy: "Copy Existing Spreadsheet",
} as const;

export const MESSAGES = {
  setupSuccess: "Setup Complete!",
  copySuccess: "Copied!",
  deleteConfirm: "Are you sure you want to delete this file?",
  banConfirm: "Are you sure you want to ban this user?",
  unbanConfirm: "Are you sure you want to unban this user?",
  cleanupRecommended:
    "Cleanup recommended: unverified users have access to this file.",
  noAccess: "Нет доступа к документу",
} as const;

export const MAX_LIST_HEIGHT = "max-h-[400px]";
