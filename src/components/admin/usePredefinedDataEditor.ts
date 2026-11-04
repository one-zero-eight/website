import { $schedule, scheduleTypes } from "@/api/schedule";
import { msg } from "@lingui/core/macro";
import { formatApiErrorDescriptor } from "@/api/helpers/create-query-client";
import { useToast } from "@/components/toast";
import { useQueryClient } from "@tanstack/react-query";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function getAcademicGroupKey(group: {
  name: string;
  event_group_alias?: string | null;
}) {
  return `${group.name}::${group.event_group_alias ?? ""}`;
}

export function usePredefinedDataEditor(
  predefined: scheduleTypes.SchemaJsonPredefinedUsers | undefined,
) {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const { mutate, isPending } = $schedule.useMutation(
    "post",
    "/update-predefined-data",
    {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: $schedule.queryOptions("get", "/get-predefined-data")
            .queryKey,
        });
        showSuccess(msg`Success`, msg`Predefined data updated`);
      },
      onError: (error) => {
        showError(msg`Error`, formatApiErrorDescriptor(error));
      },
    },
  );

  function save(data: scheduleTypes.SchemaJsonPredefinedUsers) {
    mutate({ body: data });
  }

  function removePredefinedUser(email: string) {
    if (!predefined) return;

    save({
      ...predefined,
      users: predefined.users?.filter((user) => user.email !== email),
      academic_groups: predefined.academic_groups?.map((group) => ({
        ...group,
        user_emails: group.user_emails?.filter(
          (groupEmail) => groupEmail !== email,
        ),
      })),
    });
  }

  function addEmailToAcademicGroup(groupIndex: number, email: string) {
    if (!predefined) return false;

    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail.includes("@")) {
      showError(msg`Error`, msg`Enter a valid email.`);
      return false;
    }

    const group = predefined.academic_groups?.[groupIndex];
    if (!group) {
      showError(msg`Error`, msg`Academic group not found.`);
      return false;
    }

    if (
      group.user_emails?.some(
        (groupEmail) => groupEmail.toLowerCase() === normalizedEmail,
      )
    ) {
      showError(msg`Error`, msg`This email is already in the group.`);
      return false;
    }

    save({
      ...predefined,
      academic_groups: predefined.academic_groups?.map((item, index) =>
        index === groupIndex
          ? {
              ...item,
              user_emails: [...(item.user_emails ?? []), normalizedEmail],
            }
          : item,
      ),
    });
    return true;
  }

  function removeEmailFromAcademicGroup(groupIndex: number, email: string) {
    if (!predefined) return;

    save({
      ...predefined,
      academic_groups: predefined.academic_groups?.map((group, index) =>
        index === groupIndex
          ? {
              ...group,
              user_emails: group.user_emails?.filter(
                (groupEmail) => groupEmail !== email,
              ),
            }
          : group,
      ),
    });
  }

  return {
    isPending,
    removePredefinedUser,
    addEmailToAcademicGroup,
    removeEmailFromAcademicGroup,
  };
}
