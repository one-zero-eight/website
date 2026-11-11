export const CHECKS_RETURN_FROM = "checks" as const;

export type ChecksReturnFrom = typeof CHECKS_RETURN_FROM;

export function isChecksReturnFrom(
  value: string | undefined,
): value is ChecksReturnFrom {
  return value === CHECKS_RETURN_FROM;
}
