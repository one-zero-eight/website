import { EnrollmentType, SchemaEnrollment } from "@/api/workshops/types";
import { cn } from "@/lib/ui/cn";
import { eventFieldClass } from "./formStyles";

export type EnrollmentFormValue = {
  type: EnrollmentType;
  url: string;
  capacity: string;
};

export function defaultEnrollmentForm(): EnrollmentFormValue {
  return {
    type: EnrollmentType.internal,
    url: "",
    capacity: "",
  };
}

export function enrollmentApiToForm(
  enrollment: SchemaEnrollment | null | undefined,
): EnrollmentFormValue {
  if (!enrollment) {
    return defaultEnrollmentForm();
  }

  return {
    type: enrollment.type,
    url: enrollment.url ?? "",
    capacity:
      enrollment.capacity === null || enrollment.capacity === undefined
        ? ""
        : String(enrollment.capacity),
  };
}

export function enrollmentFormToApi(
  value: EnrollmentFormValue,
): SchemaEnrollment | null {
  if (value.type === EnrollmentType.external) {
    const url = value.url.trim();
    if (!url) {
      return null;
    }

    return {
      type: EnrollmentType.external,
      url,
      capacity: null,
    };
  }

  const capacityTrimmed = value.capacity.trim();
  const capacity = capacityTrimmed ? Number(capacityTrimmed) : null;
  if (
    capacityTrimmed &&
    (!Number.isFinite(capacity) || capacity === null || capacity < 1)
  ) {
    return null;
  }

  return {
    type: EnrollmentType.internal,
    url: null,
    capacity,
  };
}

export function EnrollmentFields({
  value,
  onChange,
  disabled,
}: {
  value: EnrollmentFormValue;
  onChange: (value: EnrollmentFormValue) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm">Enrollment</span>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={cn(
            "btn btn-sm",
            value.type === EnrollmentType.internal
              ? "btn-primary"
              : "btn-ghost border",
          )}
          disabled={disabled}
          onClick={() =>
            onChange({ ...value, type: EnrollmentType.internal, url: "" })
          }
        >
          On InNoHassle
        </button>
        <button
          type="button"
          className={cn(
            "btn btn-sm",
            value.type === EnrollmentType.external
              ? "btn-primary"
              : "btn-ghost border",
          )}
          disabled={disabled}
          onClick={() =>
            onChange({ ...value, type: EnrollmentType.external, capacity: "" })
          }
        >
          External
        </button>
      </div>

      {value.type === EnrollmentType.internal ? (
        <label className="flex flex-col gap-1 text-sm">
          <span>Max participants</span>
          <input
            type="number"
            min={1}
            step={1}
            className={eventFieldClass()}
            placeholder="Unlimited"
            disabled={disabled}
            value={value.capacity}
            onChange={(e) => onChange({ ...value, capacity: e.target.value })}
          />
        </label>
      ) : (
        <label className="flex flex-col gap-1 text-sm">
          <span>Enrollment URL</span>
          <input
            type="url"
            className={eventFieldClass()}
            placeholder="https://"
            disabled={disabled}
            value={value.url}
            onChange={(e) => onChange({ ...value, url: e.target.value })}
          />
        </label>
      )}
    </div>
  );
}
