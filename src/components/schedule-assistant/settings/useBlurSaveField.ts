import { useSettingsSaveStatusContext } from "@/components/schedule-assistant/settings/settingsSaveStatus.tsx";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
} from "react";

/** Локальный черновик поля: сохранение только по blur, без блокировки других полей. */
export function useBlurSaveField(
  serverValue: string,
  onSave: (value: string) => void,
) {
  const fieldId = useId();
  const { setFieldDirty } = useSettingsSaveStatusContext();
  const [draft, setDraft] = useState(serverValue);
  const [committed, setCommitted] = useState(serverValue);
  const isFocusedRef = useRef(false);
  const isDirty = draft !== committed;

  useEffect(() => {
    if (isFocusedRef.current) return;
    setDraft(serverValue);
    setCommitted(serverValue);
  }, [serverValue]);

  useEffect(() => {
    setFieldDirty(fieldId, isDirty);
    return () => setFieldDirty(fieldId, false);
  }, [fieldId, isDirty, setFieldDirty]);

  return {
    value: draft,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setDraft(event.target.value);
    },
    onFocus: () => {
      isFocusedRef.current = true;
    },
    onBlur: (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      isFocusedRef.current = false;
      const value = event.currentTarget.value;
      setDraft(value);
      if (value === committed) return;
      setCommitted(value);
      onSave(value);
    },
  };
}
