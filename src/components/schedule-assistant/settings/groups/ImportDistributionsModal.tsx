import {
  $scheduleAssistant,
  scheduleAssistantFetch,
} from "@/api/schedule-assistant";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import type {
  SchemaDistributionPreviewResponse,
  SchemaScheduleConfig,
} from "@/api/schedule-assistant/types.ts";
import { getScheduleSections } from "@/components/schedule-assistant/config/scheduleConfigUtils.ts";
import { Modal } from "@/components/common/Modal.tsx";
import { SectionTabsBar } from "@/components/schedule-assistant/settings/SectionTabsBar.tsx";
import { useToast } from "@/components/toast";
import { useQueryClient } from "@tanstack/react-query";
import { Fragment, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/ui/cn";

function buildPreviewFormData({
  file,
  sectionCode,
  sheetName,
  emailColumn,
  membershipColumns,
  forwardFillColumns,
}: {
  file: File;
  sectionCode: string;
  sheetName?: string | null;
  emailColumn?: string | null;
  membershipColumns?: string[] | null;
  forwardFillColumns?: string[] | null;
}): FormData {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("section_code", sectionCode);
  if (sheetName) formData.append("sheet_name", sheetName);
  if (emailColumn) formData.append("email_column", emailColumn);
  if (membershipColumns) {
    formData.append("membership_columns", JSON.stringify(membershipColumns));
  }
  if (forwardFillColumns) {
    formData.append("forward_fill_columns", JSON.stringify(forwardFillColumns));
  }
  return formData;
}

function formatUploadDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isInnopolisEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return (
    normalized.endsWith("@innopolis.university") ||
    normalized.endsWith("@innopolis.ru")
  );
}

function StatChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: "ok" | "warn" | "muted";
}) {
  return (
    <span
      className={cn(
        "rounded-btn inline-flex items-center gap-1.5 px-2 py-1 text-xs",
        tone === "ok" && "bg-success/15 text-success",
        tone === "warn" && "bg-warning/15 text-warning-content",
        tone === "muted" && "bg-base-300/60 text-base-content/70",
        !tone && "bg-base-300/60 text-base-content/80",
      )}
    >
      <span className="text-base-content/50 font-medium">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </span>
  );
}

export function ImportDistributionsModal({
  open,
  onOpenChange,
  config,
  initialSectionCode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: SchemaScheduleConfig | null | undefined;
  initialSectionCode: string;
}) {
  const { showSuccess, showError } = useToast();
  const queryClient = useQueryClient();
  const sections = useMemo(() => getScheduleSections(config), [config]);
  const sectionTabs = useMemo(
    () =>
      sections.map((section) => ({
        key: section.code,
        label: section.name || section.code,
      })),
    [sections],
  );

  const [sectionCode, setSectionCode] = useState(initialSectionCode);
  const [file, setFile] = useState<File | null>(null);
  const [sheetName, setSheetName] = useState<string | null>(null);
  const [emailColumn, setEmailColumn] = useState<string | null>(null);
  const [membershipColumns, setMembershipColumns] = useState<string[]>([]);
  const [preview, setPreview] =
    useState<SchemaDistributionPreviewResponse | null>(null);
  const [mapping, setMapping] = useState<Record<string, string | null>>({});
  const [emailsByLabel, setEmailsByLabel] = useState<Record<string, string[]>>(
    {},
  );
  const [editingEmail, setEditingEmail] = useState<{
    label: string;
    index: number;
    value: string;
  } | null>(null);
  const [expandedLabels, setExpandedLabels] = useState<Set<string>>(new Set());
  const [historyOpen, setHistoryOpen] = useState(false);
  const [error, setError] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { mutateAsync: previewMutation, isPending: isPreviewPending } =
    $scheduleAssistant.useMutation("post", "/distributions/preview");
  const { mutateAsync: applyMutation, isPending: isApplyPending } =
    $scheduleAssistant.useMutation("post", "/distributions/apply");

  const {
    data: uploads,
    isPending: isHistoryPending,
    isError: isHistoryError,
    error: historyError,
    refetch: refetchHistory,
  } = $scheduleAssistant.useQuery(
    "get",
    "/distributions/uploads",
    {
      params: {
        query: {
          section_code: sectionCode || undefined,
          limit: 20,
        },
      },
    },
    {
      enabled: open && !!sectionCode,
    },
  );

  const busy = isPreviewPending || isApplyPending;
  const uploadCount = uploads?.length ?? 0;

  useEffect(() => {
    if (!open) return;
    setSectionCode(initialSectionCode || sectionTabs[0]?.key || "");
    setFile(null);
    setSheetName(null);
    setEmailColumn(null);
    setMembershipColumns([]);
    setPreview(null);
    setMapping({});
    setEmailsByLabel({});
    setEditingEmail(null);
    setExpandedLabels(new Set());
    setHistoryOpen(false);
    setError("");
  }, [open, initialSectionCode, sectionTabs]);

  function emailsFromPreview(response: SchemaDistributionPreviewResponse) {
    const next: Record<string, string[]> = {};
    for (const item of response.labels) {
      next[item.label] = [...(item.emails ?? [])];
    }
    return next;
  }

  async function runPreview(
    nextFile: File,
    nextSectionCode: string,
    options?: {
      sheetName?: string | null;
      emailColumn?: string | null;
      membershipColumns?: string[] | null;
      keepMapping?: boolean;
    },
  ) {
    setError("");
    try {
      const response = await previewMutation({
        // @ts-expect-error FormData for multipart upload
        body: buildPreviewFormData({
          file: nextFile,
          sectionCode: nextSectionCode,
          sheetName: options?.sheetName,
          emailColumn: options?.emailColumn,
          membershipColumns: options?.membershipColumns,
          forwardFillColumns: null,
        }),
      });
      setPreview(response);
      setSheetName(response.sheet_name);
      setEmailColumn(response.email_column);
      setMembershipColumns(response.membership_columns);
      setEmailsByLabel(emailsFromPreview(response));
      setEditingEmail(null);
      setExpandedLabels(new Set());
      setMapping((prev) => {
        const next: Record<string, string | null> = {
          ...response.suggested_mapping,
        };
        if (options?.keepMapping) {
          for (const label of Object.keys(next)) {
            if (label in prev) next[label] = prev[label];
          }
        }
        return next;
      });
    } catch (e) {
      setPreview(null);
      setEmailsByLabel({});
      setError(formatApiErrorMessage(e));
    }
  }

  async function handleFileChange(nextFile: File | null) {
    setFile(nextFile);
    setPreview(null);
    setMapping({});
    setEmailsByLabel({});
    setEditingEmail(null);
    setExpandedLabels(new Set());
    if (!nextFile || !sectionCode) return;
    await runPreview(nextFile, sectionCode);
  }

  async function handleSectionChange(nextSectionCode: string) {
    setSectionCode(nextSectionCode);
    if (!file) {
      setPreview(null);
      setMapping({});
      setEmailsByLabel({});
      setEditingEmail(null);
      setExpandedLabels(new Set());
      return;
    }
    await runPreview(file, nextSectionCode);
  }

  async function handleSheetChange(nextSheet: string) {
    if (!file || !sectionCode) return;
    setSheetName(nextSheet);
    await runPreview(file, sectionCode, { sheetName: nextSheet });
  }

  async function handleReparseWithColumns() {
    if (!file || !sectionCode || !emailColumn || membershipColumns.length === 0)
      return;
    await runPreview(file, sectionCode, {
      sheetName,
      emailColumn,
      membershipColumns,
      keepMapping: true,
    });
  }

  function handleToggleMembershipColumn(column: string) {
    setMembershipColumns((prev) =>
      prev.includes(column)
        ? prev.filter((item) => item !== column)
        : [...prev, column],
    );
  }

  function handleToggleLabelExpanded(label: string) {
    setExpandedLabels((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  function handleStartEditEmail(label: string, index: number, email: string) {
    setEditingEmail({ label, index, value: email });
  }

  function handleCommitEditEmail() {
    if (!editingEmail) return;
    const nextValue = editingEmail.value.trim().toLowerCase();
    if (!nextValue) {
      setEditingEmail(null);
      return;
    }
    setEmailsByLabel((prev) => {
      const list = [...(prev[editingEmail.label] ?? [])];
      list[editingEmail.index] = nextValue;
      return { ...prev, [editingEmail.label]: list };
    });
    setEditingEmail(null);
  }

  function handleCancelEditEmail() {
    setEditingEmail(null);
  }

  async function handleDownloadUpload(uploadId: string, filename: string) {
    setDownloadingId(uploadId);
    try {
      const { data, error: downloadError } = await scheduleAssistantFetch.GET(
        "/distributions/uploads/{upload_id}/file",
        {
          params: { path: { upload_id: uploadId } },
          parseAs: "blob",
        },
      );
      if (downloadError || !data) {
        throw downloadError ?? new Error("Не удалось скачать файл");
      }
      const blob = data as Blob;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename || "distribution.xlsx";
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      showError("Ошибка скачивания", formatApiErrorMessage(e));
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleSave() {
    if (!file || !sectionCode || !preview) return;
    setError("");
    try {
      const formData = buildPreviewFormData({
        file,
        sectionCode,
        sheetName: sheetName ?? preview.sheet_name,
        emailColumn: emailColumn ?? preview.email_column,
        membershipColumns:
          membershipColumns.length > 0
            ? membershipColumns
            : preview.membership_columns,
        forwardFillColumns: preview.forward_fill_columns,
      });
      formData.append("mapping", JSON.stringify(mapping));
      formData.append("emails_by_label", JSON.stringify(emailsByLabel));
      const result = await applyMutation({
        // @ts-expect-error FormData for multipart upload
        body: formData,
      });
      await queryClient.invalidateQueries({
        queryKey: ["scheduleAssistant"],
      });
      await refetchHistory();
      showSuccess(
        "Импорт завершён",
        `Обновлено групп: ${result.updated_groups?.length ?? 0}`,
      );
      onOpenChange(false);
    } catch (e) {
      const message = formatApiErrorMessage(e);
      setError(message);
      showError("Ошибка импорта", message);
    }
  }

  const mappedCount = Object.values(mapping).filter(Boolean).length;
  const unmappedCount = Object.values(mapping).filter((value) => !value).length;
  const columnsChanged =
    !!preview &&
    (emailColumn !== preview.email_column ||
      membershipColumns.length !== preview.membership_columns.length ||
      membershipColumns.some(
        (column) => !preview.membership_columns.includes(column),
      ));

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        onOpenChange(next);
      }}
      title="Импорт распределения из Excel"
      containerClassName="max-w-5xl"
      closeOnOutsidePress={!busy}
    >
      <div className="flex max-h-[min(82vh,48rem)] [scrollbar-gutter:stable] flex-col gap-4 overflow-auto pr-0.5">
        {sectionTabs.length ? (
          <SectionTabsBar
            tabs={sectionTabs}
            activeKey={sectionCode}
            onChange={handleSectionChange}
          />
        ) : (
          <div className="text-base-content/70 text-sm">
            В конфигурации нет секций.
          </div>
        )}

        {error ? (
          <div className="alert alert-error alert-soft text-sm">{error}</div>
        ) : null}

        {!file ? (
          <div className="border-base-300 bg-base-100 rounded-box border">
            <button
              type="button"
              className="hover:bg-base-200/60 flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
              onClick={() => setHistoryOpen((prev) => !prev)}
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <span
                  className={cn(
                    "icon-[material-symbols--expand-more] text-base transition-transform",
                    historyOpen && "rotate-180",
                  )}
                />
                История загрузок
                {uploadCount > 0 ? (
                  <span className="badge badge-ghost badge-sm">
                    {uploadCount}
                  </span>
                ) : null}
              </span>
              {isHistoryPending ? (
                <span className="loading loading-spinner loading-sm" />
              ) : null}
            </button>
            {historyOpen ? (
              <div className="border-base-300 border-t px-3 py-2">
                {isHistoryError ? (
                  <div className="alert alert-error alert-soft text-sm">
                    {formatApiErrorMessage(historyError)}
                  </div>
                ) : null}
                {!isHistoryPending && !isHistoryError && uploadCount === 0 ? (
                  <div className="text-base-content/60 py-2 text-sm">
                    Пока нет загрузок для этой секции.
                  </div>
                ) : null}
                {uploadCount > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="table-zebra table-sm table">
                      <thead>
                        <tr>
                          <th>Когда</th>
                          <th>Файл</th>
                          <th>Статистика</th>
                          <th>Кто</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {uploads?.map((upload) => (
                          <tr key={upload.id}>
                            <td className="text-xs whitespace-nowrap">
                              {formatUploadDate(upload.uploaded_at)}
                            </td>
                            <td className="max-w-44 truncate text-sm font-medium">
                              {upload.filename}
                            </td>
                            <td className="text-base-content/70 text-xs">
                              email {upload.stats?.email_count ?? "—"} · меток{" "}
                              {upload.stats?.label_count ?? "—"} · групп{" "}
                              {upload.stats?.updated_group_count ?? "—"} ·
                              пропущено{" "}
                              {upload.stats?.skipped_label_count ?? "—"}
                            </td>
                            <td className="max-w-36 truncate text-xs">
                              {upload.uploaded_by}
                            </td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-ghost btn-xs gap-1"
                                disabled={downloadingId === upload.id}
                                onClick={() => {
                                  void handleDownloadUpload(
                                    upload.id,
                                    upload.filename,
                                  );
                                }}
                              >
                                {downloadingId === upload.id ? (
                                  <span className="loading loading-spinner loading-xs" />
                                ) : (
                                  <span className="icon-[material-symbols--download] text-base" />
                                )}
                                Скачать
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="border-base-300 bg-base-100 rounded-box flex flex-col gap-3 border p-3">
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-base-content/60 text-xs font-medium tracking-wide uppercase">
              Новый файл
            </span>
            <input
              type="file"
              className="file-input file-input-bordered file-input-sm w-full max-w-md"
              accept=".xlsx,.xlsm"
              disabled={busy || !sectionCode}
              onChange={(e) => {
                void handleFileChange(e.target.files?.[0] || null);
              }}
            />
          </div>

          {isPreviewPending ? (
            <div className="text-base-content/70 flex items-center gap-2 text-sm">
              <span className="loading loading-spinner loading-sm" />
              Разбор файла…
            </div>
          ) : null}

          {preview ? (
            <>
              <div className="flex flex-wrap gap-1.5">
                <StatChip label="Строк" value={preview.stats.row_count} />
                <StatChip label="Email" value={preview.stats.email_count} />
                <StatChip label="Меток" value={preview.stats.label_count} />
                <StatChip label="Сопоставлено" value={mappedCount} tone="ok" />
                <StatChip
                  label="Без группы"
                  value={unmappedCount}
                  tone={unmappedCount > 0 ? "warn" : "muted"}
                />
              </div>

              {preview.sheet_names.length > 1 ? (
                <div className="flex max-w-xs flex-col gap-1">
                  <span className="text-base-content/60 text-xs font-medium">
                    Лист
                  </span>
                  <select
                    className="select select-bordered select-sm w-full"
                    value={sheetName ?? preview.sheet_name}
                    disabled={busy}
                    onChange={(e) => {
                      void handleSheetChange(e.target.value);
                    }}
                  >
                    {preview.sheet_names.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div className="grid gap-3 @md/modal:grid-cols-[minmax(12rem,16rem)_1fr]">
                <div className="flex flex-col gap-1">
                  <span className="text-base-content/60 text-xs font-medium">
                    Колонка email
                  </span>
                  <select
                    className="select select-bordered select-sm w-full"
                    value={emailColumn ?? ""}
                    disabled={busy}
                    onChange={(e) => setEmailColumn(e.target.value || null)}
                  >
                    {preview.columns.map((column) => (
                      <option key={column} value={column}>
                        {column}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-base-content/60 text-xs font-medium">
                    Колонки групп / элективов
                  </span>
                  <div className="border-base-300 bg-base-200/40 flex max-h-24 flex-wrap content-start gap-1.5 overflow-auto rounded-lg border p-2">
                    {preview.columns
                      .filter((column) => column !== emailColumn)
                      .map((column) => {
                        const checked = membershipColumns.includes(column);
                        return (
                          <button
                            key={column}
                            type="button"
                            disabled={busy}
                            className={cn(
                              "rounded-btn border px-2 py-1 text-left text-xs transition-colors",
                              checked
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-base-300 bg-base-100 text-base-content/80 hover:border-base-content/30",
                            )}
                            onClick={() => handleToggleMembershipColumn(column)}
                          >
                            {column}
                          </button>
                        );
                      })}
                  </div>
                </div>
              </div>

              {columnsChanged ? (
                <div>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={
                      busy || !emailColumn || membershipColumns.length === 0
                    }
                    onClick={() => {
                      void handleReparseWithColumns();
                    }}
                  >
                    <span className="icon-[material-symbols--refresh] text-base" />
                    Переразобрать с выбранными колонками
                  </button>
                </div>
              ) : null}

              <div className="border-base-300 overflow-hidden rounded-lg border">
                <table className="table-sm table w-full table-fixed">
                  <colgroup>
                    <col className="w-10" />
                    <col className="w-[28%]" />
                    <col className="w-24" />
                    <col />
                  </colgroup>
                  <thead className="bg-base-200/80">
                    <tr>
                      <th />
                      <th>Метка из Excel</th>
                      <th className="text-right">Студентов</th>
                      <th>Группа в конфиге</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.labels.map((item) => {
                      const expanded = expandedLabels.has(item.label);
                      const emails =
                        emailsByLabel[item.label] ?? item.emails ?? [];
                      const hasBadEmail = emails.some(
                        (email) => !isInnopolisEmail(email),
                      );
                      const mapped = Boolean(mapping[item.label]);
                      return (
                        <Fragment key={item.label}>
                          <tr
                            className={cn(
                              "hover:bg-base-200/40",
                              !mapped && "bg-warning/5",
                            )}
                          >
                            <td className="align-middle">
                              <button
                                type="button"
                                className="btn btn-ghost btn-xs btn-square"
                                disabled={emails.length === 0}
                                onClick={() =>
                                  handleToggleLabelExpanded(item.label)
                                }
                              >
                                <span
                                  className={cn(
                                    "icon-[material-symbols--expand-more] text-lg transition-transform",
                                    expanded && "rotate-180",
                                  )}
                                />
                              </button>
                            </td>
                            <td className="truncate font-medium">
                              {item.label}
                            </td>
                            <td className="text-right">
                              <button
                                type="button"
                                className={cn(
                                  "btn btn-ghost btn-xs tabular-nums",
                                  hasBadEmail && "text-error",
                                )}
                                disabled={emails.length === 0}
                                onClick={() =>
                                  handleToggleLabelExpanded(item.label)
                                }
                              >
                                {emails.length}
                              </button>
                            </td>
                            <td>
                              <select
                                className={cn(
                                  "select select-bordered select-sm w-full",
                                  !mapped && "select-warning",
                                )}
                                value={mapping[item.label] ?? ""}
                                disabled={busy}
                                onChange={(e) => {
                                  const value = e.target.value || null;
                                  setMapping((prev) => ({
                                    ...prev,
                                    [item.label]: value,
                                  }));
                                }}
                              >
                                <option value="">— пропустить —</option>
                                {preview.target_groups.map((group) => (
                                  <option key={group.code} value={group.code}>
                                    {group.name && group.name !== group.code
                                      ? `${group.code} (${group.name})`
                                      : group.code}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                          {expanded ? (
                            <tr className="bg-base-200/50">
                              <td colSpan={4} className="p-0">
                                <div className="border-base-300 max-h-40 overflow-auto border-t px-3 py-2">
                                  <div className="text-base-content/50 mb-1.5 text-xs font-medium tracking-wide uppercase">
                                    Студенты ({emails.length})
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {emails.map((email, emailIndex) => {
                                      const isEditing =
                                        editingEmail?.label === item.label &&
                                        editingEmail.index === emailIndex;
                                      const bad = !isInnopolisEmail(
                                        isEditing ? editingEmail.value : email,
                                      );
                                      if (isEditing) {
                                        return (
                                          <span
                                            key={`${item.label}-${emailIndex}`}
                                            className={cn(
                                              "rounded-btn inline-flex items-center gap-1 border px-1.5 py-0.5",
                                              bad
                                                ? "border-error/40 bg-error/10"
                                                : "border-base-300 bg-base-100",
                                            )}
                                          >
                                            <input
                                              autoFocus
                                              className={cn(
                                                "input input-ghost h-6 min-h-6 w-56 px-1 font-mono text-xs",
                                                bad && "text-error",
                                              )}
                                              value={editingEmail.value}
                                              disabled={busy}
                                              onChange={(e) =>
                                                setEditingEmail({
                                                  ...editingEmail,
                                                  value: e.target.value,
                                                })
                                              }
                                              onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                  e.preventDefault();
                                                  handleCommitEditEmail();
                                                }
                                                if (e.key === "Escape") {
                                                  e.preventDefault();
                                                  handleCancelEditEmail();
                                                }
                                              }}
                                              onBlur={() => {
                                                handleCommitEditEmail();
                                              }}
                                            />
                                          </span>
                                        );
                                      }
                                      return (
                                        <span
                                          key={`${item.label}-${emailIndex}`}
                                          className={cn(
                                            "rounded-btn inline-flex items-center gap-0.5 border py-0.5 pr-0.5 pl-2 font-mono text-xs",
                                            bad
                                              ? "border-error/40 bg-error/10 text-error"
                                              : "bg-base-100 border-base-300",
                                          )}
                                        >
                                          {email}
                                          <button
                                            type="button"
                                            className="btn btn-ghost btn-xs btn-square"
                                            disabled={busy}
                                            onClick={() =>
                                              handleStartEditEmail(
                                                item.label,
                                                emailIndex,
                                                email,
                                              )
                                            }
                                          >
                                            <span className="icon-[material-symbols--edit-outline] text-sm" />
                                          </button>
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <div className="border-base-300 mt-1 flex justify-end gap-2 border-t pt-3">
        <button
          type="button"
          className="btn btn-ghost"
          disabled={busy}
          onClick={() => onOpenChange(false)}
        >
          Отмена
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy || !preview || mappedCount === 0}
          onClick={() => {
            void handleSave();
          }}
        >
          {isApplyPending ? (
            <span className="loading loading-spinner loading-sm" />
          ) : null}
          Сохранить
        </button>
      </div>
    </Modal>
  );
}
