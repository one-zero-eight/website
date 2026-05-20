import type { ConfigLoadResult } from "@/components/schedule-assistant/settings/ConfigLoadModal.tsx";
import {
  nextGroupIdentifiers,
  programCodeForGroupIdentifiers,
} from "@/components/schedule-assistant/groupIdentifiers.ts";
import type {
  ScheduleConfigCourse,
  ScheduleConfigDraft,
  ScheduleConfigInstructor,
  ScheduleConfigProgram,
  ScheduleConfigSectionProgram,
  ScheduleConfigStudentsGroup,
  ScheduleConfigTerm,
} from "@/components/schedule-assistant/settings/configTypes.ts";
import { parse, stringify } from "yaml";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { proxy, subscribe } from "valtio";
import { useSnapshot } from "valtio/react";

export type ConfigStore = {
  state: ConfigState;
  actions: ConfigActions;
};

type ConfigState = {
  configData: ScheduleConfigDraft | null;
  outputData: unknown;
};

export type ConfigActions = {
  setConfigData: (configData: ScheduleConfigDraft | null) => void;
  setOutputData: (outputData: unknown) => void;
  updateConfigData: (mutator: (draft: ScheduleConfigDraft) => void) => void;
  loadConfigFiles: (
    configFile: File | null,
    outputFile: File | null,
  ) => Promise<ConfigLoadResult>;
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
    program: ScheduleConfigSectionProgram | ScheduleConfigProgram | null,
  ) => void;
  removeGroupFromTrackAndConfig: (
    sectionCode: string,
    programIndex: number,
    trackIndex: number,
    groupId: string,
  ) => void;
};

export type ConfigView = ConfigState & ConfigActions;

const ConfigContext = createContext<ConfigStore | null>(null);
const CONFIG_STORAGE_KEY = "schedule-assistant:config-state";

function createEmptyScheduleConfigDraft(): ScheduleConfigDraft {
  return {
    term: {
      name: "",
      semester: {
        start_date: "1970-01-01",
        end_date: "1970-01-01",
      },
      days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      time_slots: [
        "09:00",
        "10:30",
        "12:10",
        "14:00",
        "15:30",
        "17:10",
        "18:40",
      ],
    },
    rooms: [],
    instructors: [],
    sections: [],
    programs: {},
    students_groups: [],
    courses: [],
  };
}

function readStoredConfigState(): {
  configData: ScheduleConfigDraft | null;
  outputData: unknown;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      configData: parsed?.configData ?? null,
      outputData: parsed?.outputData ?? null,
    };
  } catch {
    window.localStorage.removeItem(CONFIG_STORAGE_KEY);
    return null;
  }
}

export function useConfigState(
  initialConfig: ScheduleConfigDraft | null = null,
): ConfigStore {
  const store = useMemo(
    () => createConfigStore(initialConfig),
    [initialConfig],
  );

  useEffect(() => {
    return subscribe(store.state, () => {
      if (typeof window === "undefined") return;
      try {
        window.localStorage.setItem(
          CONFIG_STORAGE_KEY,
          JSON.stringify({
            configData: store.state.configData,
            outputData: store.state.outputData,
          }),
        );
      } catch {
        // Ignore storage errors in private mode/quota cases.
      }
    });
  }, [store]);

  return store;
}

function createConfigStore(
  initialConfig: ScheduleConfigDraft | null,
): ConfigStore {
  const storedState = readStoredConfigState();
  const state = proxy<ConfigState>({
    configData: storedState?.configData ?? initialConfig,
    outputData: storedState?.outputData ?? null,
  });

  function setConfigData(configData: ScheduleConfigDraft | null) {
    state.configData = configData;
  }

  function setOutputData(outputData: unknown) {
    state.outputData = outputData;
  }

  async function readYamlFile(file: File | null) {
    if (!file) return null;
    return parse(await file.text());
  }

  async function loadConfigFiles(
    configFile: File | null,
    outputFile: File | null,
  ): Promise<ConfigLoadResult> {
    try {
      if (!configFile) {
        return { ok: false, message: "Выберите файл config.yaml." };
      }
      const config = await readYamlFile(configFile);
      if (!outputFile) {
        setConfigData((config || null) as ScheduleConfigDraft | null);
        setOutputData(null);
        return { ok: true };
      }
      const output = await readYamlFile(outputFile);
      if (!output?.schedule?.courses) {
        return {
          ok: false,
          message: "Некорректный output.yaml: не найден schedule.courses.",
        };
      }
      setConfigData((config || null) as ScheduleConfigDraft | null);
      setOutputData(output);
      return { ok: true };
    } catch (e: any) {
      return {
        ok: false,
        message: `Ошибка чтения YAML: ${e?.message || String(e)}`,
      };
    }
  }

  function exportConfig() {
    if (state.configData == null) return;
    const text = stringify(state.configData);
    const blob = new Blob([text], { type: "application/x-yaml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "config.yaml";
    a.click();
    URL.revokeObjectURL(url);
  }

  function updateConfigData(mutator: (draft: ScheduleConfigDraft) => void) {
    if (state.configData == null) {
      state.configData = createEmptyScheduleConfigDraft();
    }
    mutator(state.configData);
  }

  function addProgram(sectionCode: string) {
    updateConfigData((draft) => {
      const sections = Array.isArray(draft.sections) ? draft.sections : [];
      const section = sections.find(
        (s) => String(s?.code || "") === sectionCode,
      );
      if (section) {
        if (!Array.isArray(section.programs)) section.programs = [];
        const newProgram: ScheduleConfigSectionProgram = {
          code: `new-program-${section.programs.length + 1}`,
          name: "Новая программа",
          kind: "degree_year",
          degree: null,
          language: "en",
          year: null,
          applies_to: [],
          tracks: [],
          groups: [],
        };
        section.programs.push(newProgram);
        return;
      }

      if (!draft.programs || typeof draft.programs !== "object")
        draft.programs = {};
      if (!Array.isArray(draft.programs[sectionCode]))
        draft.programs[sectionCode] = [];
      const rootProgram: ScheduleConfigProgram = {
        code: `new-program-${draft.programs[sectionCode].length + 1}`,
        name: "Новая программа",
        language: "en",
        year: null,
        tracks: [],
      };
      draft.programs[sectionCode].push(rootProgram);
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
        name: "",
        role: null,
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
    program: ScheduleConfigSectionProgram | ScheduleConfigProgram | null,
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
      setOutputData,
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

export function ConfigProvider({
  value,
  children,
}: {
  value: ConfigStore;
  children: ReactNode;
}) {
  return (
    <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
  );
}

export function useConfigStore() {
  const ctx = useContext(ConfigContext);
  if (!ctx) {
    throw new Error("useConfig must be used inside ConfigProvider.");
  }
  return ctx;
}

export function useConfig(): ConfigView {
  const ctx = useConfigStore();
  const snap = useSnapshot(ctx.state, { sync: true });
  return {
    configData: snap.configData as unknown as ScheduleConfigDraft | null,
    outputData: snap.outputData,
    ...ctx.actions,
  };
}

export function useRoom(roomId: string) {
  const { state } = useConfigStore();
  const snap = useSnapshot(state, { sync: true });
  const { updateConfigData } = useConfig();
  const rooms = Array.isArray(snap.configData?.rooms)
    ? snap.configData.rooms
    : [];
  const roomIndex = rooms.findIndex(
    (room) => String(room?.id ?? "") === roomId,
  );
  const room = roomIndex >= 0 ? rooms[roomIndex] : null;
  const roomState =
    roomIndex >= 0 ? (state.configData?.rooms?.[roomIndex] ?? null) : null;

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
  configData: ScheduleConfigDraft | null,
  sectionCode: string,
  programIndex: number,
): ScheduleConfigSectionProgram | ScheduleConfigProgram | null {
  if (!configData) return null;
  const section = configData.sections.find(
    (candidate) => String(candidate.code) === sectionCode,
  );
  if (section?.programs?.[programIndex]) return section.programs[programIndex];
  const rootPrograms = configData.programs?.[sectionCode];
  if (Array.isArray(rootPrograms) && rootPrograms[programIndex])
    return rootPrograms[programIndex];
  return null;
}

function mutateProgramInDraft(
  draft: ScheduleConfigDraft,
  sectionCode: string,
  programIndex: number,
  mutator: (
    program: ScheduleConfigSectionProgram | ScheduleConfigProgram,
  ) => void,
) {
  const section = draft.sections.find(
    (candidate) => String(candidate.code) === sectionCode,
  );
  if (section?.programs?.[programIndex]) {
    mutator(section.programs[programIndex]);
    return;
  }
  const rootPrograms = draft.programs?.[sectionCode];
  if (Array.isArray(rootPrograms) && rootPrograms[programIndex]) {
    mutator(rootPrograms[programIndex]);
  }
}

function renameStudentGroupInDraft(
  draft: ScheduleConfigDraft,
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

  for (const section of draft.sections) {
    if (!Array.isArray(section?.programs)) continue;
    for (const program of section.programs) {
      if (Array.isArray(program?.tracks)) {
        for (const track of program.tracks) {
          if (!Array.isArray(track?.groups)) continue;
          track.groups = track.groups.map((code) =>
            String(code) === oldCode ? newCode : code,
          );
        }
      }
      if (Array.isArray(program?.groups)) {
        program.groups = program.groups.map((code) =>
          String(code) === oldCode ? newCode : code,
        );
      }
    }
  }

  if (draft.programs && typeof draft.programs === "object") {
    for (const sectionCode of Object.keys(draft.programs)) {
      const programs = draft.programs[sectionCode];
      if (!Array.isArray(programs)) continue;
      for (const program of programs) {
        if (!Array.isArray(program?.tracks)) continue;
        for (const track of program.tracks) {
          if (!Array.isArray(track?.groups)) continue;
          track.groups = track.groups.map((code) =>
            String(code) === oldCode ? newCode : code,
          );
        }
      }
    }
  }
}

function deleteStudentGroupFromDraft(
  draft: ScheduleConfigDraft,
  groupCode: string,
) {
  draft.students_groups = draft.students_groups.filter(
    (candidate) => String(candidate.code) !== groupCode,
  );

  for (const section of draft.sections) {
    if (!Array.isArray(section?.programs)) continue;
    for (const program of section.programs) {
      if (Array.isArray(program?.tracks)) {
        for (const track of program.tracks) {
          if (!Array.isArray(track?.groups)) continue;
          track.groups = track.groups.filter(
            (code) => String(code) !== groupCode,
          );
        }
      }
      if (Array.isArray(program?.groups)) {
        program.groups = program.groups.filter(
          (code) => String(code) !== groupCode,
        );
      }
    }
  }

  if (draft.programs && typeof draft.programs === "object") {
    for (const sectionCode of Object.keys(draft.programs)) {
      const programs = draft.programs[sectionCode];
      if (!Array.isArray(programs)) continue;
      for (const program of programs) {
        if (!Array.isArray(program?.tracks)) continue;
        for (const track of program.tracks) {
          if (!Array.isArray(track?.groups)) continue;
          track.groups = track.groups.filter(
            (code) => String(code) !== groupCode,
          );
        }
      }
    }
  }
}

export function useCourse(courseIndex: number) {
  const { state } = useConfigStore();
  const snap = useSnapshot(state, { sync: true });
  const { updateConfigData } = useConfig();
  const course =
    Number.isInteger(courseIndex) &&
    courseIndex >= 0 &&
    Array.isArray(snap.configData?.courses)
      ? snap.configData.courses[courseIndex] || null
      : null;
  const courseState =
    Number.isInteger(courseIndex) && courseIndex >= 0
      ? (state.configData?.courses?.[courseIndex] ?? null)
      : null;

  const updateCourseComponents = useCallback(
    (components: ScheduleConfigCourse["components"]) => {
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
  const { state } = useConfigStore();
  const snap = useSnapshot(state, { sync: true });
  const { updateConfigData } = useConfig();
  const program = useMemo(
    () =>
      getProgramFromConfig(
        snap.configData as unknown as ScheduleConfigDraft | null,
        sectionCode,
        programIndex,
      ),
    [snap.configData, sectionCode, programIndex],
  );
  const programState = getProgramFromConfig(
    state.configData as unknown as ScheduleConfigDraft | null,
    sectionCode,
    programIndex,
  );

  const addTrack = useCallback(() => {
    if (!sectionCode || !Number.isInteger(programIndex) || programIndex < 0)
      return;
    updateConfigData((draft) => {
      mutateProgramInDraft(draft, sectionCode, programIndex, (target) => {
        if (!Array.isArray(target.tracks)) target.tracks = [];
        if ("groups" in target) {
          const sectionTrack = {
            code: `new-track-${target.tracks.length + 1}`,
            name: `Новый трек ${target.tracks.length + 1}`,
            kind: null,
            groups: [],
          };
          (target.tracks as ScheduleConfigSectionProgram["tracks"]).push(
            sectionTrack,
          );
          return;
        }
        target.tracks.push({
          name: `Новый трек ${target.tracks.length + 1}`,
          groups: [],
        });
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
      if (section?.programs?.[programIndex]) {
        section.programs.splice(programIndex, 1);
        return;
      }
      const rootPrograms = draft.programs?.[sectionCode];
      if (Array.isArray(rootPrograms) && rootPrograms[programIndex]) {
        rootPrograms.splice(programIndex, 1);
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
  const { state } = useConfigStore();
  const snap = useSnapshot(state, { sync: true });
  const { updateConfigData } = useConfig();
  const program = useMemo(
    () =>
      getProgramFromConfig(
        snap.configData as unknown as ScheduleConfigDraft | null,
        sectionCode,
        programIndex,
      ),
    [snap.configData, sectionCode, programIndex],
  );
  const track =
    Number.isInteger(trackIndex) &&
    trackIndex >= 0 &&
    Array.isArray(program?.tracks)
      ? program.tracks[trackIndex] || null
      : null;
  const programState = getProgramFromConfig(
    state.configData as unknown as ScheduleConfigDraft | null,
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
  const { state } = useConfigStore();
  const snap = useSnapshot(state, { sync: true });
  const { updateConfigData } = useConfig();
  const studentGroup = useMemo((): ScheduleConfigStudentsGroup | null => {
    const found =
      snap.configData?.students_groups.find(
        (candidate) => String(candidate.code) === groupCode,
      ) || null;
    return found as unknown as ScheduleConfigStudentsGroup | null;
  }, [snap.configData, groupCode]);
  const studentGroupState =
    state.configData?.students_groups.find(
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
  const { state, actions } = useConfigStore();
  const snap = useSnapshot(state, { sync: true });
  const configData = snap.configData as unknown as ScheduleConfigDraft | null;
  const instructorState =
    Number.isInteger(instructorIndex) && instructorIndex >= 0
      ? (state.configData?.instructors?.[instructorIndex] ?? null)
      : null;
  const instructor = useMemo((): ScheduleConfigInstructor | null => {
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
  const { state } = useConfigStore();
  const snap = useSnapshot(state, { sync: true });
  const { updateConfigData } = useConfig();
  const term = (snap.configData?.term || null) as ScheduleConfigTerm | null;
  const termState = (state.configData?.term ||
    null) as ScheduleConfigTerm | null;

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
