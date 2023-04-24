import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  calendar: [],
  calendarCopy: [],
  copied: "",
};

const calendarSlice = createSlice({
  name: "calendarState",
  initialState,
  reducers: {
    setCalendar: (state, action) => {
      state.calendar = state.calendarCopy = action.payload;
    },
    filterCalendar: (state, action) => {
      state.calendar = state.calendarCopy.filter((group) => {
        return group.name.includes(action.payload.toUpperCase());
      });
    },
    setCopied: (state, action) => {
      state.copied = action.payload;
    },
  },
});

export const { setCalendar, filterCalendar, setCopied } = calendarSlice.actions;

export default calendarSlice.reducer;
