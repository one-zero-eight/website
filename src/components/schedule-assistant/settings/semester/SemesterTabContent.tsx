import type { ConfigLoadResult } from "@/components/schedule-assistant/settings/ConfigLoadModal.tsx";
import {
  useConfig,
  useUploadScheduleConfigYamlMutation,
} from "@/components/schedule-assistant/config/useConfig.tsx";
import { ConfigLoadModal } from "@/components/schedule-assistant/settings/ConfigLoadModal.tsx";
import { SemesterDetails } from "@/components/schedule-assistant/settings/SettingsSidebarDetails.tsx";
import { useState } from "react";
import { stringify } from "yaml";

export function SemesterTabContent() {
  const { config } = useConfig();
  const { mutateAsync: uploadConfigYaml, isPending: isUploading } =
    useUploadScheduleConfigYamlMutation();
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);

  async function loadConfigFiles(
    configFile: File | null,
  ): Promise<ConfigLoadResult> {
    try {
      if (!configFile) {
        return { ok: false, message: "Выберите файл config.yaml." };
      }
      await uploadConfigYaml({ body: await configFile.text() });
      return { ok: true };
    } catch (e: unknown) {
      return {
        ok: false,
        message: `Ошибка загрузки YAML: ${(e as Error)?.message || String(e)}`,
      };
    }
  }

  function exportConfig() {
    if (!config) return;
    const text = stringify(config);
    const blob = new Blob([text], { type: "application/x-yaml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "config.yaml";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto px-0.5 pt-0.5 pb-1">
      <section className="flex flex-col gap-4">
        <h3 className="text-base-content text-base font-semibold">
          Семестр и общие параметры
        </h3>
        <div className="border-base-300 bg-base-100 rounded-box border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={isUploading}
              onClick={() => setIsLoadModalOpen(true)}
            >
              Загрузить конфигурацию
            </button>
            <button
              type="button"
              className="btn btn-outline btn-secondary btn-sm"
              disabled={!config}
              onClick={exportConfig}
            >
              Выгрузить конфигурацию
            </button>
          </div>
        </div>
        <ConfigLoadModal
          open={isLoadModalOpen}
          onOpenChange={setIsLoadModalOpen}
          onLoad={loadConfigFiles}
        />
        <SemesterDetails />
      </section>
    </div>
  );
}
