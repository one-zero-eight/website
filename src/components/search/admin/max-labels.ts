import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";

export const ACCESS_LABELS = {
  ready: msg`access confirmed`,
  unknown: msg`access not confirmed`,
  removed: msg`the chat is unavailable to the account`,
  no_permission: msg`no access to messages`,
};

export const HISTORY_LABELS = {
  idle: msg`not requested`,
  pending: msg`waiting to be loaded`,
  running: msg`loading`,
  complete: msg`all the history available to the account through the API is loaded`,
  partial: msg`loaded partially`,
  failed: msg`loading failed`,
  cancelled: msg`stopped`,
};

export const CATCHUP_LABELS = {
  idle: msg`no gap found`,
  pending: msg`waiting for recovery`,
  running: msg`recovering`,
  complete: msg`available messages recovered`,
  partial: msg`recovered partially`,
  failed: msg`recovery failed`,
  cancelled: msg`stopped`,
};

export const CATALOG_LABELS = {
  idle: msg`not updated`,
  running: msg`updating`,
  complete: msg`updated`,
  partial: msg`incomplete (partial)`,
  failed: msg`update failed`,
};

export const REASON_LABELS = {
  login_required: msg`Login required: run catix-maxuserbot login in the terminal.`,
  account_mismatch: msg`The session belongs to another account; an operator must check it.`,
  identity_range: msg`The source id is outside the supported range.`,
  protocol_error: msg`The MAX answer does not match the expected protocol.`,
  processing_error: msg`The source data could not be processed.`,
  metadata_error: msg`The access information could not be updated.`,
  source_status_unknown: msg`The chat status is unknown; reading is not allowed.`,
  catalog_pagination_unknown: msg`MAX did not report the catalog continuation; the list is incomplete.`,
  catalog_cursor_stalled: msg`The catalog continuation does not advance; the list is incomplete.`,
  history_error: msg`A history page could not be fetched.`,
  history_timestamp_boundary: msg`The time boundary does not allow to continue the history; only a part is loaded.`,
  message_unavailable: msg`The message is unavailable; its absence is not counted as a deletion.`,
  deletion_reconciliation_partial: msg`Not all the bulk deletions could be confirmed.`,
  publication_error: msg`The search index update is waiting to be sent again.`,
};

export const UNKNOWN_REASON = msg`The operation could not be completed; refresh the data and try again.`;

export const REPEATABLE_HISTORY = [
  "complete",
  "partial",
  "failed",
  "cancelled",
];

export function labelOf(
  labels: Record<string, MessageDescriptor>,
  key: string | null | undefined,
): MessageDescriptor | undefined {
  return key ? labels[key] : undefined;
}
