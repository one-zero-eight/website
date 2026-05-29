import {
  SchemaScheduleConfig,
  SchemaSectionProgram,
  SchemaStudentsGroups,
  SchemaTermConfig,
} from "@/api/schedule-assistant/types.ts";
import { createContext, useContext, useEffect, useMemo } from "react";
import { proxy, subscribe } from "valtio";
import { useSnapshot } from "valtio/react";

export type ConfigContextType = {
  state: ConfigState;
  setConfigData: (configData: SchemaScheduleConfig) => void;
  updateConfigData: (mutator: (draft: SchemaScheduleConfig) => void) => void;
};

type ConfigState = {
  config: SchemaScheduleConfig;
};

const ConfigContext = createContext<ConfigContextType | null>(null);
const CONFIG_STORAGE_KEY = "schedule-assistant:config-state";

function createDefaultScheduleConfig(): SchemaScheduleConfig {
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

function readStoredConfigState(): ConfigState {
  if (typeof window === "undefined") {
    return { config: createDefaultScheduleConfig() };
  }
  try {
    const raw = window.localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) {
      return { config: createDefaultScheduleConfig() };
    }
    const parsed = JSON.parse(raw);
    return {
      config: parsed.config ?? createDefaultScheduleConfig(),
    };
  } catch {
    window.localStorage.removeItem(CONFIG_STORAGE_KEY);
    return { config: createDefaultScheduleConfig() };
  }
}

function createConfigStore(initialState: ConfigState): ConfigContextType {
  const state = proxy<ConfigState>({
    config: initialState.config,
  });

  function setConfigData(configData: SchemaScheduleConfig) {
    state.config = configData;
  }

  function updateConfigData(mutator: (draft: SchemaScheduleConfig) => void) {
    mutator(state.config);
  }

  return {
    state,
    setConfigData,
    updateConfigData,
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

export function useConfig() {
  const ctx = useContext(ConfigContext);
  if (!ctx) {
    throw new Error("useConfig must be used inside ConfigProvider.");
  }
  const snap = useSnapshot(ctx.state, { sync: true });
  return {
    config: snap.config as SchemaScheduleConfig,
    configState: ctx.state.config,
    setConfigData: ctx.setConfigData,
    updateConfigData: ctx.updateConfigData,
  };
}

export function useRoom(roomId: string) {
  const { config, configState } = useConfig();
  const roomIndex = config.rooms.findIndex((room) => room.id === roomId);
  const room = config.rooms[roomIndex];
  const roomState = configState.rooms[roomIndex];

  return {
    room,
    roomState,
    roomIndex,
  };
}

export function getProgramFromConfig(
  configData: SchemaScheduleConfig,
  sectionCode: string,
  programIndex: number,
): SchemaSectionProgram {
  const section = configData.sections.find(
    (candidate) => candidate.code === sectionCode,
  )!;
  return section.programs[programIndex];
}

export function mutateProgramInDraft(
  draft: SchemaScheduleConfig,
  sectionCode: string,
  programIndex: number,
  mutator: (program: SchemaSectionProgram) => void,
) {
  const section = draft.sections.find(
    (candidate) => candidate.code === sectionCode,
  )!;
  mutator(section.programs[programIndex]);
}

function replaceStudentGroupInCourses(
  draft: SchemaScheduleConfig,
  oldCode: string,
  newCode: string | null,
) {
  for (const course of draft.courses) {
    for (const component of course.components) {
      component.student_groups = component.student_groups
        .map((token) => (token !== oldCode ? token : newCode))
        .filter((token): token is string => token != null);
      for (const series of component.sessions!) {
        series.audience = series.audience
          .map((token) => (token !== oldCode ? token : newCode))
          .filter((token): token is string => token != null);
      }
    }
  }
}

export function renameStudentGroupInDraft(
  draft: SchemaScheduleConfig,
  oldCode: string,
  newCode: string,
) {
  if (oldCode === newCode) return;
  const alreadyExists = draft.students_groups.some(
    (candidate) => candidate.code === newCode,
  );
  if (alreadyExists) return;

  const target = draft.students_groups.find(
    (candidate) => candidate.code === oldCode,
  )!;
  target.code = newCode;

  replaceStudentGroupInCourses(draft, oldCode, newCode);

  for (const section of draft.sections) {
    for (const program of section.programs) {
      for (const track of program.tracks) {
        track.groups = track.groups.map((code) =>
          code === oldCode ? newCode : code,
        );
      }
      program.groups = program.groups.map((code) =>
        code === oldCode ? newCode : code,
      );
    }
  }
}

export function deleteStudentGroupFromDraft(
  draft: SchemaScheduleConfig,
  groupCode: string,
) {
  replaceStudentGroupInCourses(draft, groupCode, null);

  draft.students_groups = draft.students_groups.filter(
    (candidate) => candidate.code !== groupCode,
  );

  for (const section of draft.sections) {
    for (const program of section.programs) {
      for (const track of program.tracks) {
        track.groups = track.groups.filter((code) => code !== groupCode);
      }
      program.groups = program.groups.filter((code) => code !== groupCode);
    }
  }
}

export function useCourse(courseIndex: number) {
  const { config, configState } = useConfig();
  const course = config.courses[courseIndex];
  const courseState = configState.courses[courseIndex];

  return {
    course,
    courseState,
    courseIndex,
  };
}

export function useProgram(sectionCode: string, programIndex: number) {
  const { config, configState } = useConfig();
  const program = useMemo(
    () => getProgramFromConfig(config, sectionCode, programIndex),
    [config, sectionCode, programIndex],
  );
  const programState = getProgramFromConfig(
    configState,
    sectionCode,
    programIndex,
  );

  return {
    program,
    programState,
    sectionCode,
    programIndex,
  };
}

export function useTrack(
  sectionCode: string,
  programIndex: number,
  trackIndex: number,
) {
  const { config, configState } = useConfig();
  const program = useMemo(
    () => getProgramFromConfig(config, sectionCode, programIndex),
    [config, sectionCode, programIndex],
  );
  const track = program.tracks[trackIndex];
  const programState = getProgramFromConfig(
    configState,
    sectionCode,
    programIndex,
  );
  const trackState = programState.tracks[trackIndex];

  return {
    track,
    trackState,
    sectionCode,
    programIndex,
    trackIndex,
  };
}

export function useStudentGroup(groupCode: string) {
  const { config, configState } = useConfig();
  const studentGroup = useMemo((): SchemaStudentsGroups => {
    return config.students_groups.find(
      (candidate) => candidate.code === groupCode,
    )! as SchemaStudentsGroups;
  }, [config, groupCode]);
  const studentGroupState = configState.students_groups.find(
    (candidate) => candidate.code === groupCode,
  )!;

  return {
    studentGroup,
    studentGroupState,
    groupCode,
  };
}

export function useInstructor(instructorIndex: number) {
  const { config, configState } = useConfig();
  const instructor = config.instructors[instructorIndex];
  const instructorState = configState.instructors[instructorIndex];

  return {
    instructor,
    instructorState,
    instructorIndex,
  };
}

export function useSemesterSettings() {
  const { config, configState } = useConfig();
  const term = config.term as SchemaTermConfig;
  const termState = configState.term as SchemaTermConfig;

  return {
    term,
    termState,
  };
}
