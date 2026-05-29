import type { ConfigLoadResult } from "@/components/schedule-assistant/settings/ConfigLoadModal.tsx";
import {
  nextGroupIdentifiers,
  programCodeForGroupIdentifiers,
} from "@/components/schedule-assistant/config/groupIdentifiers.ts";
import {
  SchemaCourseConfig,
  SchemaScheduleConfig,
  SchemaInstructorConfig,
  SchemaSectionProgram,
  SchemaStudentsGroups,
  SchemaTermConfig,
  SectionProgramLanguageAnyOf0,
} from "@/api/schedule-assistant/types.ts";
import { parse, stringify } from "yaml";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { proxy, subscribe } from "valtio";
import { useSnapshot } from "valtio/react";

export type ConfigContextType = {
  state: ConfigState;
  actions: ConfigActions;
};

type ConfigState = {
  config: SchemaScheduleConfig | null;
};

export type ConfigActions = {
  setConfigData: (configData: SchemaScheduleConfig | null) => void;
  updateConfigData: (mutator: (draft: SchemaScheduleConfig) => void) => void;
  loadConfigFiles: (configFile: File | null) => Promise<ConfigLoadResult>;
  exportConfig: () => void;
  addProgram: (sectionCode: string) => void;
  addRoom: () => void;
  addCourse: () => void;
  addInstructor: () => void;
  moveTrack: (
    sectionCode: string,
    programIndex: number,
    fromIndex: number,
    toIndex: number,
  ) => void;
  deleteTrackAtIndex: (
    sectionCode: string,
    programIndex: number,
    trackIndex: number,
  ) => void;
  addGroupToTrack: (
    sectionCode: string,
    programIndex: number,
    trackIndex: number,
    program: SchemaSectionProgram | null,
  ) => void;
  removeGroupFromTrackAndConfig: (
    sectionCode: string,
    programIndex: number,
    trackIndex: number,
    groupId: string,
  ) => void;
};

export type ConfigView = ConfigState & ConfigActions;

const ConfigContext = createContext<ConfigContextType | null>(null);
const CONFIG_STORAGE_KEY = "schedule-assistant:config-state";

function createEmptyScheduleConfigDraft(): SchemaScheduleConfig {
  return {
    $schema: null,
    term: {
      name: "",
      starting_day: "Mon",
      semester: {
        start_date: "1970-01-01",
        end_date: "1970-01-01",
      },
      days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      time_slots: [
        "09:00-10:30",
        "10:40-12:10",
        "12:40-14:10",
        "14:20-15:50",
        "16:00-17:30",
        "17:40-19:10",
        "19:20-20:50",
      ],
    },
    rooms: [],
    instructors: [],
    sections: [],
    students_groups: [],
    courses: [],
  };
}

function readStoredConfigState(): ConfigState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      config: parsed?.config ?? null,
    };
  } catch {
    window.localStorage.removeItem(CONFIG_STORAGE_KEY);
    return null;
  }
}

function createConfigStore(
  initialState: ConfigState | null,
): ConfigContextType {
  const state = proxy<ConfigState>({
    config: initialState?.config ?? null,
  });

  function setConfigData(configData: SchemaScheduleConfig | null) {
    state.config = configData;
  }

  async function readYamlFile(file: File | null) {
    if (!file) return null;
    return parse(await file.text());
  }

  async function loadConfigFiles(
    configFile: File | null,
  ): Promise<ConfigLoadResult> {
    try {
      if (!configFile) {
        return { ok: false, message: "Выберите файл config.yaml." };
      }
      const parsed = await readYamlFile(configFile);
      if (!parsed || typeof parsed !== "object") {
        return { ok: false, message: "Некорректный config.yaml." };
      }
      setConfigData(parsed as SchemaScheduleConfig);
      return { ok: true };
    } catch (e: any) {
      return {
        ok: false,
        message: `Ошибка чтения YAML: ${e?.message || String(e)}`,
      };
    }
  }

  function exportConfig() {
    if (state.config == null) return;
    const text = stringify(state.config);
    const blob = new Blob([text], { type: "application/x-yaml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "config.yaml";
    a.click();
    URL.revokeObjectURL(url);
  }

  function updateConfigData(mutator: (draft: SchemaScheduleConfig) => void) {
    if (state.config == null) {
      state.config = createEmptyScheduleConfigDraft();
    }
    mutator(state.config);
  }

  function addProgram(sectionCode: string) {
    updateConfigData((draft) => {
      const sections = Array.isArray(draft.sections) ? draft.sections : [];
      const section = sections.find(
        (s) => String(s?.code || "") === sectionCode,
      );
      if (section) {
        if (!Array.isArray(section.programs)) section.programs = [];
        const newProgram: SchemaSectionProgram = {
          code: `new-program-${section.programs.length + 1}`,
          name: "Новая программа",
          kind: "degree_year",
          degree: null,
          language: SectionProgramLanguageAnyOf0.en,
          year: null,
          applies_to: [],
          tracks: [],
          groups: [],
        };
        section.programs.push(newProgram);
        return;
      }
    });
  }

  function addRoom() {
    updateConfigData((draft) => {
      if (!Array.isArray(draft.rooms)) draft.rooms = [];
      draft.rooms.push({
        id: `NEW-${draft.rooms.length + 1}`,
        name: "",
        capacity: 0,
      });
    });
  }

  function addCourse() {
    updateConfigData((draft) => {
      if (!Array.isArray(draft.courses)) draft.courses = [];
      draft.courses.push({
        name: "Новый курс",
        course_tags: [],
        components: [],
      });
    });
  }

  function addInstructor() {
    updateConfigData((draft) => {
      if (!Array.isArray(draft.instructors)) draft.instructors = [];
      draft.instructors.push({
        id: `new-instructor-${draft.instructors.length + 1}`,
        alias: null,
        email: null,
        name_en: null,
        name_ru: null,
        position: null,
      });
    });
  }

  function moveTrack(
    sectionCode: string,
    programIndex: number,
    fromIndex: number,
    toIndex: number,
  ) {
    updateConfigData((draft) => {
      mutateProgramInDraft(draft, sectionCode, programIndex, (target) => {
        const draftTracks = Array.isArray(target.tracks) ? target.tracks : null;
        if (!draftTracks || !draftTracks[fromIndex]) return;
        if (toIndex < 0 || toIndex >= draftTracks.length) return;
        const [moved] = draftTracks.splice(fromIndex, 1);
        draftTracks.splice(toIndex, 0, moved);
      });
    });
  }

  function deleteTrackAtIndex(
    sectionCode: string,
    programIndex: number,
    trackIndex: number,
  ) {
    updateConfigData((draft) => {
      mutateProgramInDraft(draft, sectionCode, programIndex, (target) => {
        if (!target.tracks?.[trackIndex]) return;
        target.tracks.splice(trackIndex, 1);
      });
    });
  }

  function addGroupToTrack(
    sectionCode: string,
    programIndex: number,
    trackIndex: number,
    program: SchemaSectionProgram | null,
  ) {
    updateConfigData((draft) => {
      mutateProgramInDraft(draft, sectionCode, programIndex, (target) => {
        const draftTrack = Array.isArray(target.tracks)
          ? target.tracks[trackIndex]
          : null;
        if (!draftTrack) return;
        if (!Array.isArray(draftTrack.groups)) draftTrack.groups = [];
        const studentsGroupsList = Array.isArray(draft.students_groups)
          ? draft.students_groups
          : [];
        const existingIds = [...draftTrack.groups];
        const { code: newGroupId, name: newGroupName } = nextGroupIdentifiers(
          existingIds,
          (id) => {
            const entity = studentsGroupsList.find(
              (candidate) => String(candidate.code) === String(id),
            );
            return entity?.name != null ? String(entity.name) : undefined;
          },
          {
            programCode: programCodeForGroupIdentifiers(
              program,
              sectionCode,
              programIndex,
            ),
            track: draftTrack,
          },
        );
        draftTrack.groups.push(newGroupId);
        studentsGroupsList.push({
          code: newGroupId,
          kind: "core",
          name: newGroupName,
          estimated_size: null,
          students: [],
        });
      });
    });
  }

  function removeGroupFromTrackAndConfig(
    sectionCode: string,
    programIndex: number,
    trackIndex: number,
    groupId: string,
  ) {
    updateConfigData((draft) => {
      mutateProgramInDraft(draft, sectionCode, programIndex, (target) => {
        const draftTrack = Array.isArray(target.tracks)
          ? target.tracks[trackIndex]
          : null;
        if (!draftTrack || !Array.isArray(draftTrack.groups)) return;
        draftTrack.groups = draftTrack.groups.filter(
          (current) => String(current) !== String(groupId),
        );
      });
      draft.students_groups = draft.students_groups.filter(
        (candidate) => String(candidate.code) !== String(groupId),
      );
    });
  }

  return {
    state,
    actions: {
      setConfigData,
      updateConfigData,
      loadConfigFiles,
      exportConfig,
      addProgram,
      addRoom,
      addCourse,
      addInstructor,
      moveTrack,
      deleteTrackAtIndex,
      addGroupToTrack,
      removeGroupFromTrackAndConfig,
    },
  };
}

export function ConfigProvider({ children }: React.PropsWithChildren) {
  const configStore = useMemo(
    () => createConfigStore(readStoredConfigState()),
    [],
  );

  useEffect(() => {
    return subscribe(configStore.state, () => {
      if (typeof window === "undefined") return;
      try {
        window.localStorage.setItem(
          CONFIG_STORAGE_KEY,
          JSON.stringify({
            config: configStore.state.config,
          }),
        );
      } catch {
        // Ignore storage errors in private mode/quota cases.
      }
    });
  }, [configStore]);

  return (
    <ConfigContext.Provider value={configStore}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfigContext() {
  const ctx = useContext(ConfigContext);
  if (!ctx) {
    throw new Error("useConfig must be used inside ConfigProvider.");
  }
  return ctx;
}

export function useConfig(): ConfigView {
  const ctx = useConfigContext();
  const snap = useSnapshot(ctx.state, { sync: true });
  return {
    config: snap.config as unknown as SchemaScheduleConfig | null,
    ...ctx.actions,
  };
}

export function useRoom(roomId: string) {
  const { state } = useConfigContext();
  const snap = useSnapshot(state, { sync: true });
  const { updateConfigData } = useConfig();
  const rooms = Array.isArray(snap.config?.rooms) ? snap.config.rooms : [];
  const roomIndex = rooms.findIndex(
    (room) => String(room?.id ?? "") === roomId,
  );
  const room = roomIndex >= 0 ? rooms[roomIndex] : null;
  const roomState =
    roomIndex >= 0 ? (state.config?.rooms?.[roomIndex] ?? null) : null;

  const deleteRoom = useCallback(() => {
    if (roomIndex < 0) return;
    updateConfigData((draft) => {
      if (!Array.isArray(draft.rooms) || !draft.rooms[roomIndex]) return;
      draft.rooms.splice(roomIndex, 1);
    });
  }, [roomIndex, updateConfigData]);

  return {
    room,
    roomState,
    roomIndex,
    deleteRoom,
  };
}

function getProgramFromConfig(
  configData: SchemaScheduleConfig | null,
  sectionCode: string,
  programIndex: number,
): SchemaSectionProgram | null {
  if (!configData) return null;
  const section = configData.sections.find(
    (candidate) => String(candidate.code) === sectionCode,
  );
  return section?.programs[programIndex] ?? null;
}

function mutateProgramInDraft(
  draft: SchemaScheduleConfig,
  sectionCode: string,
  programIndex: number,
  mutator: (program: SchemaSectionProgram) => void,
) {
  const section = draft.sections.find(
    (candidate) => String(candidate.code) === sectionCode,
  );
  if (section?.programs[programIndex]) {
    mutator(section.programs[programIndex]);
  }
}

function replaceStudentGroupInCourses(
  draft: SchemaScheduleConfig,
  oldCode: string,
  newCode: string | null,
) {
  for (const course of draft.courses) {
    for (const component of course.components || []) {
      if (Array.isArray(component.student_groups)) {
        component.student_groups = component.student_groups
          .map((token) => {
            if (String(token) !== oldCode) return token;
            return newCode;
          })
          .filter((token): token is string => {
            return token != null && String(token).length > 0;
          });
      }
      for (const series of component.sessions || []) {
        if (!Array.isArray(series?.audience)) continue;
        series.audience = series.audience
          .map((token) => {
            if (String(token) !== oldCode) return token;
            return newCode;
          })
          .filter((token): token is string => {
            return token != null && String(token).length > 0;
          });
      }
    }
  }
}

function renameStudentGroupInDraft(
  draft: SchemaScheduleConfig,
  oldCode: string,
  newCode: string,
) {
  if (!oldCode || !newCode || oldCode === newCode) return;
  const alreadyExists = draft.students_groups.some(
    (candidate) => String(candidate.code) === newCode,
  );
  if (alreadyExists) return;

  const target = draft.students_groups.find(
    (candidate) => String(candidate.code) === oldCode,
  );
  if (target) target.code = newCode;

  replaceStudentGroupInCourses(draft, oldCode, newCode);

  for (const section of draft.sections) {
    if (!Array.isArray(section.programs)) continue;
    for (const program of section.programs) {
      if (Array.isArray(program.tracks)) {
        for (const track of program.tracks) {
          if (!Array.isArray(track.groups)) continue;
          track.groups = track.groups.map((code) =>
            String(code) === oldCode ? newCode : code,
          );
        }
      }
      if (Array.isArray(program.groups)) {
        program.groups = program.groups.map((code) =>
          String(code) === oldCode ? newCode : code,
        );
      }
    }
  }
}

function deleteStudentGroupFromDraft(
  draft: SchemaScheduleConfig,
  groupCode: string,
) {
  replaceStudentGroupInCourses(draft, groupCode, null);

  draft.students_groups = draft.students_groups.filter(
    (candidate) => String(candidate.code) !== groupCode,
  );

  for (const section of draft.sections) {
    if (!Array.isArray(section.programs)) continue;
    for (const program of section.programs) {
      if (Array.isArray(program.tracks)) {
        for (const track of program.tracks) {
          if (!Array.isArray(track.groups)) continue;
          track.groups = track.groups.filter(
            (code) => String(code) !== groupCode,
          );
        }
      }
      if (Array.isArray(program.groups)) {
        program.groups = program.groups.filter(
          (code) => String(code) !== groupCode,
        );
      }
    }
  }
}

export function useCourse(courseIndex: number) {
  const { state } = useConfigContext();
  const snap = useSnapshot(state, { sync: true });
  const { updateConfigData } = useConfig();
  const course =
    Number.isInteger(courseIndex) &&
    courseIndex >= 0 &&
    Array.isArray(snap.config?.courses)
      ? snap.config.courses[courseIndex] || null
      : null;
  const courseState =
    Number.isInteger(courseIndex) && courseIndex >= 0
      ? (state.config?.courses?.[courseIndex] ?? null)
      : null;

  const updateCourseComponents = useCallback(
    (components: SchemaCourseConfig["components"]) => {
      if (!Number.isInteger(courseIndex) || courseIndex < 0) return;
      updateConfigData((draft) => {
        const draftCourse = draft.courses[courseIndex];
        if (!draftCourse) return;
        draftCourse.components = components;
      });
    },
    [courseIndex, updateConfigData],
  );

  const deleteCourse = useCallback(() => {
    if (!Number.isInteger(courseIndex) || courseIndex < 0) return;
    updateConfigData((draft) => {
      if (!draft.courses[courseIndex]) return;
      draft.courses.splice(courseIndex, 1);
    });
  }, [courseIndex, updateConfigData]);

  return {
    course,
    courseState,
    courseIndex,
    updateCourseComponents,
    deleteCourse,
  };
}

export function useProgram(sectionCode: string, programIndex: number) {
  const { state } = useConfigContext();
  const snap = useSnapshot(state, { sync: true });
  const { updateConfigData } = useConfig();
  const program = useMemo(
    () =>
      getProgramFromConfig(
        snap.config as unknown as SchemaScheduleConfig | null,
        sectionCode,
        programIndex,
      ),
    [snap.config, sectionCode, programIndex],
  );
  const programState = getProgramFromConfig(
    state.config as unknown as SchemaScheduleConfig | null,
    sectionCode,
    programIndex,
  );

  const addTrack = useCallback(() => {
    if (!sectionCode || !Number.isInteger(programIndex) || programIndex < 0)
      return;
    updateConfigData((draft) => {
      mutateProgramInDraft(draft, sectionCode, programIndex, (target) => {
        if (!Array.isArray(target.tracks)) target.tracks = [];
        const sectionTrack = {
          code: `new-track-${target.tracks.length + 1}`,
          name: `Новый трек ${target.tracks.length + 1}`,
          kind: null,
          groups: [],
        };
        (target.tracks as SchemaSectionProgram["tracks"]).push(sectionTrack);
      });
    });
  }, [sectionCode, programIndex, updateConfigData]);

  const deleteProgram = useCallback(() => {
    if (!sectionCode || !Number.isInteger(programIndex) || programIndex < 0)
      return;
    updateConfigData((draft) => {
      const section = draft.sections.find(
        (candidate) => String(candidate.code) === sectionCode,
      );
      if (section?.programs[programIndex]) {
        section.programs.splice(programIndex, 1);
      }
    });
  }, [sectionCode, programIndex, updateConfigData]);

  return {
    program,
    programState,
    sectionCode,
    programIndex,
    addTrack,
    deleteProgram,
  };
}

export function useTrack(
  sectionCode: string,
  programIndex: number,
  trackIndex: number,
) {
  const { state } = useConfigContext();
  const snap = useSnapshot(state, { sync: true });
  const { updateConfigData } = useConfig();
  const program = useMemo(
    () =>
      getProgramFromConfig(
        snap.config as unknown as SchemaScheduleConfig | null,
        sectionCode,
        programIndex,
      ),
    [snap.config, sectionCode, programIndex],
  );
  const track =
    Number.isInteger(trackIndex) &&
    trackIndex >= 0 &&
    Array.isArray(program?.tracks)
      ? program.tracks[trackIndex] || null
      : null;
  const programState = getProgramFromConfig(
    state.config as unknown as SchemaScheduleConfig | null,
    sectionCode,
    programIndex,
  );
  const trackState =
    Number.isInteger(trackIndex) &&
    trackIndex >= 0 &&
    Array.isArray(programState?.tracks)
      ? programState.tracks[trackIndex] || null
      : null;

  const setTrackGroups = useCallback(
    (groups: string[]) => {
      if (
        !sectionCode ||
        !Number.isInteger(programIndex) ||
        !Number.isInteger(trackIndex) ||
        trackIndex < 0
      )
        return;
      updateConfigData((draft) => {
        mutateProgramInDraft(draft, sectionCode, programIndex, (target) => {
          const draftTrack = target.tracks?.[trackIndex];
          if (!draftTrack) return;
          draftTrack.groups = groups.map(String);
        });
      });
    },
    [sectionCode, programIndex, trackIndex, updateConfigData],
  );

  const deleteTrack = useCallback(() => {
    if (
      !sectionCode ||
      !Number.isInteger(programIndex) ||
      !Number.isInteger(trackIndex) ||
      trackIndex < 0
    )
      return;
    updateConfigData((draft) => {
      mutateProgramInDraft(draft, sectionCode, programIndex, (target) => {
        if (!target.tracks?.[trackIndex]) return;
        target.tracks.splice(trackIndex, 1);
      });
    });
  }, [sectionCode, programIndex, trackIndex, updateConfigData]);

  return {
    track,
    trackState,
    sectionCode,
    programIndex,
    trackIndex,
    setTrackGroups,
    deleteTrack,
  };
}

export function useStudentGroup(groupCode: string) {
  const { state } = useConfigContext();
  const snap = useSnapshot(state, { sync: true });
  const { updateConfigData } = useConfig();
  const studentGroup = useMemo((): SchemaStudentsGroups | null => {
    const found =
      snap.config?.students_groups.find(
        (candidate) => String(candidate.code) === groupCode,
      ) || null;
    return found as unknown as SchemaStudentsGroups | null;
  }, [snap.config, groupCode]);
  const studentGroupState =
    state.config?.students_groups.find(
      (candidate) => String(candidate.code) === groupCode,
    ) ?? null;

  const renameStudentGroup = useCallback(
    (newCode: string) => {
      if (!groupCode) return;
      const normalized = newCode.trim();
      if (!normalized) return;
      updateConfigData((draft) => {
        renameStudentGroupInDraft(draft, groupCode, normalized);
      });
    },
    [groupCode, updateConfigData],
  );

  const deleteStudentGroup = useCallback(() => {
    if (!groupCode) return;
    updateConfigData((draft) => {
      deleteStudentGroupFromDraft(draft, groupCode);
    });
  }, [groupCode, updateConfigData]);

  return {
    studentGroup,
    studentGroupState,
    groupCode,
    renameStudentGroup,
    deleteStudentGroup,
  };
}

export function useInstructor(instructorIndex: number) {
  const { state, actions } = useConfigContext();
  const snap = useSnapshot(state, { sync: true });
  const configData = snap.config as unknown as SchemaScheduleConfig | null;
  const instructorState =
    Number.isInteger(instructorIndex) && instructorIndex >= 0
      ? (state.config?.instructors?.[instructorIndex] ?? null)
      : null;
  const instructor = useMemo((): SchemaInstructorConfig | null => {
    if (
      !Number.isInteger(instructorIndex) ||
      instructorIndex < 0 ||
      !Array.isArray(configData?.instructors)
    ) {
      return null;
    }
    return configData.instructors[instructorIndex] ?? null;
  }, [configData, instructorIndex]);

  const deleteInstructor = useCallback(() => {
    if (!Number.isInteger(instructorIndex) || instructorIndex < 0) return;
    actions.updateConfigData((draft) => {
      if (!draft.instructors[instructorIndex]) return;
      draft.instructors.splice(instructorIndex, 1);
    });
  }, [actions, instructorIndex]);

  return {
    instructor,
    instructorState,
    instructorIndex,
    deleteInstructor,
  };
}

export function useSemesterSettings() {
  const { state } = useConfigContext();
  const snap = useSnapshot(state, { sync: true });
  const { updateConfigData } = useConfig();
  const term = (snap.config?.term || null) as SchemaTermConfig | null;
  const termState = (state.config?.term || null) as SchemaTermConfig | null;

  const updateTermName = useCallback(
    (value: string) => {
      updateConfigData((draft) => {
        draft.term.name = value;
      });
    },
    [updateConfigData],
  );

  const updateSemesterDate = useCallback(
    (field: "start_date" | "end_date", value: string) => {
      updateConfigData((draft) => {
        draft.term.semester[field] = value;
      });
    },
    [updateConfigData],
  );

  const updateTermDays = useCallback(
    (days: string[]) => {
      updateConfigData((draft) => {
        draft.term.days = days.map(String);
      });
    },
    [updateConfigData],
  );

  const updateTermTimeSlots = useCallback(
    (timeSlots: string[]) => {
      updateConfigData((draft) => {
        draft.term.time_slots = timeSlots.map(String);
      });
    },
    [updateConfigData],
  );

  return {
    term,
    termState,
    updateTermName,
    updateSemesterDate,
    updateTermDays,
    updateTermTimeSlots,
  };
}
