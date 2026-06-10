import {
  useEffect,
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
  const [draft, setDraft] = useState(serverValue);
  const isFocusedRef = useRef(false);
  const committedRef = useRef(serverValue);

  useEffect(() => {
    committedRef.current = serverValue;
    if (isFocusedRef.current) return;
    setDraft(serverValue);
  }, [serverValue]);

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
      if (value === committedRef.current) return;
      committedRef.current = value;
      onSave(value);
    },
  };
}
