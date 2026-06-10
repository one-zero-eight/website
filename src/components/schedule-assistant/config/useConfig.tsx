import { $scheduleAssistant } from "@/api/schedule-assistant";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import type {
  SchemaCourseConfig,
  SchemaInstructor,
  SchemaRoom,
  SchemaScheduleConfig,
  SchemaSectionProgram,
  SchemaStudentsGroups,
  SchemaTermConfig,
} from "@/api/schedule-assistant/types.ts";
import {
  buildScheduleConfig,
  deleteStudentGroupFromCourses,
  deleteStudentGroupFromTerm,
  getProgramFromTerm,
  mutateProgramInTerm,
  renameStudentGroupInCourses,
  renameStudentGroupInTerm,
} from "@/components/schedule-assistant/config/scheduleConfigUtils.ts";
import { useToast } from "@/components/toast";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

export {
  deleteStudentGroupFromCourses,
  deleteStudentGroupFromTerm,
  formatTermTimeSlots,
  getProgramFromTerm,
  getScheduleSections,
  mutateProgramInTerm,
  parseTermTimeSlotsText,
  renameStudentGroupInCourses,
  renameStudentGroupInTerm,
} from "@/components/schedule-assistant/config/scheduleConfigUtils.ts";

function combineQueryState(
  queries: Array<{
    isPending: boolean;
    isError: boolean;
    error: unknown;
  }>,
) {
  return {
    isPending: queries.some((query) => query.isPending),
    isError: queries.some((query) => query.isError),
    error: queries.find((query) => query.error)?.error,
  };
}

function useScheduleConfigInvalidation() {
  const queryClient = useQueryClient();
  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["scheduleAssistant"] });
  }, [queryClient]);
}

function useScheduleConfigMutationToast() {
  const { showError } = useToast();
  return useCallback(
    (error: unknown) => {
      showError("Ошибка сохранения", formatApiErrorMessage(error));
    },
    [showError],
  );
}

export function useTermQuery() {
  return $scheduleAssistant.useQuery("get", "/schedule-config/term");
}

export function useCoursesQuery() {
  return $scheduleAssistant.useQuery("get", "/schedule-config/courses");
}

export function useRoomsQuery() {
  return $scheduleAssistant.useQuery("get", "/schedule-config/rooms");
}

export function useInstructorsQuery() {
  return $scheduleAssistant.useQuery("get", "/schedule-config/instructors");
}

export function useStudentGroupsQuery() {
  return $scheduleAssistant.useQuery("get", "/schedule-config/student-groups");
}

export function useConfig() {
  return useScheduleConfig();
}

export function ScheduleConfigStatus({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isPending, isError, error } = useScheduleConfig();
  if (isPending) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-8">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="text-error flex min-h-0 flex-1 items-center justify-center p-8 text-sm">
        {formatApiErrorMessage(error)}
      </div>
    );
  }
  return children;
}

export function useScheduleConfig() {
  const termQuery = useTermQuery();
  const coursesQuery = useCoursesQuery();
  const roomsQuery = useRoomsQuery();
  const instructorsQuery = useInstructorsQuery();
  const studentGroupsQuery = useStudentGroupsQuery();
  const queryState = combineQueryState([
    termQuery,
    coursesQuery,
    roomsQuery,
    instructorsQuery,
    studentGroupsQuery,
  ]);

  const config = useMemo((): SchemaScheduleConfig | null => {
    if (!termQuery.data) return null;
    return buildScheduleConfig(
      termQuery.data,
      coursesQuery.data ?? [],
      roomsQuery.data ?? [],
      instructorsQuery.data ?? [],
      studentGroupsQuery.data ?? [],
    );
  }, [
    termQuery.data,
    coursesQuery.data,
    roomsQuery.data,
    instructorsQuery.data,
    studentGroupsQuery.data,
  ]);

  return {
    config,
    ...queryState,
  };
}

export function useRoom(roomId: string) {
  const query = $scheduleAssistant.useQuery(
    "get",
    "/schedule-config/rooms",
    {},
    {
      select: (rooms) => {
        const roomIndex = rooms.findIndex((room) => room.id === roomId);
        return {
          room: roomIndex >= 0 ? rooms[roomIndex] : undefined,
          roomIndex,
        };
      },
    },
  );

  return {
    room: query.data?.room,
    roomIndex: query.data?.roomIndex ?? -1,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  };
}

export function useCourse(courseIndex: number) {
  const query = $scheduleAssistant.useQuery(
    "get",
    "/schedule-config/courses",
    {},
    {
      select: (courses) => ({
        course: courses[courseIndex],
        courseIndex,
        courseName: courses[courseIndex]?.name,
      }),
    },
  );

  return {
    course: query.data?.course,
    courseIndex: query.data?.courseIndex ?? courseIndex,
    courseName: query.data?.courseName,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  };
}

export function useProgram(sectionCode: string, programIndex: number) {
  const query = useTermQuery();
  const program = useMemo(
    () =>
      query.data
        ? getProgramFromTerm(query.data, sectionCode, programIndex)
        : null,
    [query.data, sectionCode, programIndex],
  );

  return {
    program,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  };
}

export function useTrack(
  sectionCode: string,
  programIndex: number,
  trackIndex: number,
) {
  const { program, isPending, isError, error } = useProgram(
    sectionCode,
    programIndex,
  );
  const track = program?.tracks[trackIndex];

  return {
    track,
    program,
    sectionCode,
    programIndex,
    trackIndex,
    isPending,
    isError,
    error,
  };
}

export function useStudentGroup(groupCode: string) {
  const query = $scheduleAssistant.useQuery(
    "get",
    "/schedule-config/student-groups",
    {},
    {
      select: (groups) =>
        groups.find((group) => group.code === groupCode) ?? null,
    },
  );

  return {
    studentGroup: query.data,
    groupCode,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  };
}

export function useInstructor(instructorIndex: number) {
  const query = $scheduleAssistant.useQuery(
    "get",
    "/schedule-config/instructors",
    {},
    {
      select: (instructors) => ({
        instructor: instructors[instructorIndex],
        instructorIndex,
        instructorId: instructors[instructorIndex]?.id,
      }),
    },
  );

  return {
    instructor: query.data?.instructor,
    instructorIndex: query.data?.instructorIndex ?? instructorIndex,
    instructorId: query.data?.instructorId,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  };
}

export function useSemesterSettings() {
  const query = useTermQuery();
  return {
    term: query.data,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  };
}

export function useUpdateTermMutation() {
  const invalidate = useScheduleConfigInvalidation();
  const onError = useScheduleConfigMutationToast();
  return $scheduleAssistant.useMutation("put", "/schedule-config/term", {
    onSuccess: invalidate,
    onError,
  });
}

export function useUploadScheduleConfigYamlMutation() {
  const invalidate = useScheduleConfigInvalidation();
  const onError = useScheduleConfigMutationToast();
  return $scheduleAssistant.useMutation("put", "/schedule-config/yaml", {
    onSuccess: invalidate,
    onError,
  });
}

export function useCreateRoomMutation() {
  const invalidate = useScheduleConfigInvalidation();
  const onError = useScheduleConfigMutationToast();
  return $scheduleAssistant.useMutation("post", "/schedule-config/rooms", {
    onSuccess: invalidate,
    onError,
  });
}

export function useUpdateRoomMutation() {
  const invalidate = useScheduleConfigInvalidation();
  const onError = useScheduleConfigMutationToast();
  return $scheduleAssistant.useMutation(
    "put",
    "/schedule-config/rooms/{room_id}",
    {
      onSuccess: invalidate,
      onError,
    },
  );
}

export function useDeleteRoomMutation() {
  const invalidate = useScheduleConfigInvalidation();
  const onError = useScheduleConfigMutationToast();
  return $scheduleAssistant.useMutation(
    "delete",
    "/schedule-config/rooms/{room_id}",
    {
      onSuccess: invalidate,
      onError,
    },
  );
}

export function useCreateInstructorMutation() {
  const invalidate = useScheduleConfigInvalidation();
  const onError = useScheduleConfigMutationToast();
  return $scheduleAssistant.useMutation(
    "post",
    "/schedule-config/instructors",
    {
      onSuccess: invalidate,
      onError,
    },
  );
}

export function useUpdateInstructorMutation() {
  const invalidate = useScheduleConfigInvalidation();
  const onError = useScheduleConfigMutationToast();
  return $scheduleAssistant.useMutation(
    "put",
    "/schedule-config/instructors/{instructor_id}",
    {
      onSuccess: invalidate,
      onError,
    },
  );
}

export function useDeleteInstructorMutation() {
  const invalidate = useScheduleConfigInvalidation();
  const onError = useScheduleConfigMutationToast();
  return $scheduleAssistant.useMutation(
    "delete",
    "/schedule-config/instructors/{instructor_id}",
    {
      onSuccess: invalidate,
      onError,
    },
  );
}

export function useCreateCourseMutation() {
  const invalidate = useScheduleConfigInvalidation();
  const onError = useScheduleConfigMutationToast();
  return $scheduleAssistant.useMutation("post", "/schedule-config/courses", {
    onSuccess: invalidate,
    onError,
  });
}

export function useUpdateCourseMutation() {
  const invalidate = useScheduleConfigInvalidation();
  const onError = useScheduleConfigMutationToast();
  return $scheduleAssistant.useMutation(
    "put",
    "/schedule-config/courses/{course_name}",
    {
      onSuccess: invalidate,
      onError,
    },
  );
}

export function useDeleteCourseMutation() {
  const invalidate = useScheduleConfigInvalidation();
  const onError = useScheduleConfigMutationToast();
  return $scheduleAssistant.useMutation(
    "delete",
    "/schedule-config/courses/{course_name}",
    {
      onSuccess: invalidate,
      onError,
    },
  );
}

export function useCreateStudentGroupMutation() {
  const invalidate = useScheduleConfigInvalidation();
  const onError = useScheduleConfigMutationToast();
  return $scheduleAssistant.useMutation(
    "post",
    "/schedule-config/student-groups",
    {
      onSuccess: invalidate,
      onError,
    },
  );
}

export function useUpdateStudentGroupMutation() {
  const invalidate = useScheduleConfigInvalidation();
  const onError = useScheduleConfigMutationToast();
  return $scheduleAssistant.useMutation(
    "put",
    "/schedule-config/student-groups/{code}",
    {
      onSuccess: invalidate,
      onError,
    },
  );
}

export function useDeleteStudentGroupMutation() {
  const invalidate = useScheduleConfigInvalidation();
  const onError = useScheduleConfigMutationToast();
  return $scheduleAssistant.useMutation(
    "delete",
    "/schedule-config/student-groups/{code}",
    {
      onSuccess: invalidate,
      onError,
    },
  );
}

export function useUpdateProgramMutation(
  sectionCode: string,
  programIndex: number,
) {
  const { data: term } = useTermQuery();
  const {
    mutate: updateTerm,
    isPending,
    isError,
    error,
  } = useUpdateTermMutation();

  const updateProgram = useCallback(
    (mutator: (program: SchemaSectionProgram) => void) => {
      if (!term) return;
      updateTerm({
        body: mutateProgramInTerm(term, sectionCode, programIndex, mutator),
      });
    },
    [programIndex, sectionCode, term, updateTerm],
  );

  return { updateProgram, isPending, isError, error };
}

export function usePatchTermMutation() {
  const { data: term } = useTermQuery();
  const {
    mutate: updateTerm,
    isPending,
    isError,
    error,
  } = useUpdateTermMutation();

  const patchTerm = useCallback(
    (patch: (current: SchemaTermConfig) => SchemaTermConfig) => {
      if (!term) return;
      updateTerm({ body: patch(term) });
    },
    [term, updateTerm],
  );

  return { patchTerm, isPending, isError, error };
}

export function usePatchRoomMutation(roomId: string) {
  const { room } = useRoom(roomId);
  const { mutate, isPending, isError, error } = useUpdateRoomMutation();

  const patchRoom = useCallback(
    (patch: Partial<SchemaRoom>) => {
      if (!room) return;
      mutate({
        params: { path: { room_id: roomId } },
        body: { ...room, ...patch },
      });
    },
    [mutate, room, roomId],
  );

  return { patchRoom, isPending, isError, error };
}

export function usePatchInstructorMutation(instructorId: string | undefined) {
  const { mutate, isPending, isError, error } = useUpdateInstructorMutation();
  const query = $scheduleAssistant.useQuery(
    "get",
    "/schedule-config/instructors",
    {},
    {
      enabled: !!instructorId,
      select: (instructors) =>
        instructors.find((instructor) => instructor.id === instructorId),
    },
  );

  const patchInstructor = useCallback(
    (patch: Partial<SchemaInstructor>) => {
      if (!instructorId || !query.data) return;
      mutate({
        params: { path: { instructor_id: instructorId } },
        body: { ...query.data, ...patch },
      });
    },
    [instructorId, mutate, query.data],
  );

  return { patchInstructor, isPending, isError, error };
}

export function usePatchCourseMutation(courseName: string | undefined) {
  const { mutate, isPending, isError, error } = useUpdateCourseMutation();
  const query = $scheduleAssistant.useQuery(
    "get",
    "/schedule-config/courses",
    {},
    {
      enabled: !!courseName,
      select: (courses) => courses.find((course) => course.name === courseName),
    },
  );

  const patchCourse = useCallback(
    (patch: Partial<SchemaCourseConfig>) => {
      if (!courseName || !query.data) return;
      mutate({
        params: { path: { course_name: courseName } },
        body: { ...query.data, ...patch },
      });
    },
    [courseName, mutate, query.data],
  );

  return { patchCourse, isPending, isError, error };
}

export function usePatchStudentGroupMutation(groupCode: string) {
  const { studentGroup } = useStudentGroup(groupCode);
  const { mutate, isPending, isError, error } = useUpdateStudentGroupMutation();

  const patchStudentGroup = useCallback(
    (patch: Partial<SchemaStudentsGroups>) => {
      if (!studentGroup) return;
      mutate({
        params: { path: { code: groupCode } },
        body: { ...studentGroup, ...patch },
      });
    },
    [groupCode, mutate, studentGroup],
  );

  return { patchStudentGroup, isPending, isError, error };
}

function courseReferencesStudentGroup(
  course: SchemaCourseConfig,
  groupCode: string,
): boolean {
  for (const component of course.components) {
    if (component.student_groups.includes(groupCode)) return true;
    for (const series of component.sessions ?? []) {
      if (series.audience.includes(groupCode)) return true;
    }
  }
  return false;
}

export function useAddProgramToSection(sectionCode: string) {
  const { data: term } = useTermQuery();
  const {
    mutate: updateTerm,
    isPending,
    isError,
    error,
  } = useUpdateTermMutation();

  const addProgram = useCallback(
    (program: SchemaSectionProgram) => {
      if (!term) return;
      const nextTerm = structuredClone(term);
      const section = (nextTerm.sections ?? []).find(
        (candidate) => candidate.code === sectionCode,
      );
      if (!section) return;
      section.programs.push(program);
      updateTerm({ body: nextTerm });
    },
    [sectionCode, term, updateTerm],
  );

  return { addProgram, isPending, isError, error };
}

export function useDeleteProgramFromSection(
  sectionCode: string,
  programIndex: number,
) {
  const { data: term } = useTermQuery();
  const {
    mutate: updateTerm,
    isPending,
    isError,
    error,
  } = useUpdateTermMutation();

  const deleteProgram = useCallback(() => {
    if (!term) return;
    const nextTerm = structuredClone(term);
    const section = (nextTerm.sections ?? []).find(
      (candidate) => candidate.code === sectionCode,
    );
    if (!section?.programs?.[programIndex]) return;
    section.programs.splice(programIndex, 1);
    updateTerm({ body: nextTerm });
  }, [programIndex, sectionCode, term, updateTerm]);

  return { deleteProgram, isPending, isError, error };
}

export function useRenameStudentGroup() {
  const { data: term } = useTermQuery();
  const { data: courses } = useCoursesQuery();
  const { data: studentGroups } = useStudentGroupsQuery();
  const {
    mutateAsync: updateStudentGroup,
    isPending,
    isError,
    error,
  } = useUpdateStudentGroupMutation();
  const { mutateAsync: updateCourse } = useUpdateCourseMutation();
  const { mutateAsync: updateTerm } = useUpdateTermMutation();

  const renameStudentGroup = useCallback(
    async (oldCode: string, newCode: string) => {
      if (!term || !courses || !studentGroups || oldCode === newCode) return;
      if (studentGroups.some((group) => group.code === newCode)) return;
      const group = studentGroups.find(
        (candidate) => candidate.code === oldCode,
      );
      if (!group) return;

      await updateStudentGroup({
        params: { path: { code: oldCode } },
        body: { ...group, code: newCode },
      });

      for (const course of courses) {
        if (!courseReferencesStudentGroup(course, oldCode)) continue;
        const [updatedCourse] = renameStudentGroupInCourses(
          [course],
          oldCode,
          newCode,
        );
        await updateCourse({
          params: { path: { course_name: course.name } },
          body: updatedCourse,
        });
      }

      await updateTerm({
        body: renameStudentGroupInTerm(term, oldCode, newCode),
      });
    },
    [
      courses,
      studentGroups,
      term,
      updateCourse,
      updateStudentGroup,
      updateTerm,
    ],
  );

  return { renameStudentGroup, isPending, isError, error };
}

export function useDeleteStudentGroupCascade() {
  const { data: term } = useTermQuery();
  const { data: courses } = useCoursesQuery();
  const {
    mutateAsync: deleteStudentGroup,
    isPending,
    isError,
    error,
  } = useDeleteStudentGroupMutation();
  const { mutateAsync: updateCourse } = useUpdateCourseMutation();
  const { mutateAsync: updateTerm } = useUpdateTermMutation();

  const deleteStudentGroupCascade = useCallback(
    async (groupCode: string) => {
      if (!term || !courses) return;

      await updateTerm({
        body: deleteStudentGroupFromTerm(term, groupCode),
      });

      for (const course of courses) {
        if (!courseReferencesStudentGroup(course, groupCode)) continue;
        const [updatedCourse] = deleteStudentGroupFromCourses(
          [course],
          groupCode,
        );
        await updateCourse({
          params: { path: { course_name: course.name } },
          body: updatedCourse,
        });
      }

      await deleteStudentGroup({
        params: { path: { code: groupCode } },
      });
    },
    [courses, deleteStudentGroup, term, updateCourse, updateTerm],
  );

  return { deleteStudentGroupCascade, isPending, isError, error };
}
