import { ConfigLoadModal } from "@/components/schedule-assistant/settings/ConfigLoadModal.tsx";
import { SemesterDetails } from "@/components/schedule-assistant/settings/SettingsSidebarDetails.tsx";
import { useConfig } from "@/components/schedule-assistant/config/useConfig.tsx";
import { useState } from "react";

export function SemesterTabContent() {
  const { config, loadConfigFiles, exportConfig } = useConfig();
  const canExportConfig = config != null;
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);

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
              onClick={() => setIsLoadModalOpen(true)}
            >
              Загрузить конфигурацию
            </button>
            <button
              type="button"
              className="btn btn-outline btn-secondary btn-sm"
              disabled={!canExportConfig}
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
