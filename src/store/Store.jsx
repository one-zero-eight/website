import { combineReducers, configureStore } from "@reduxjs/toolkit";
import calendarSlice from "./slices/calendarSlice";

const rootReducer = combineReducers({
  calendarSlice,
});
const store = configureStore({
  reducer: rootReducer,
});

export default store;
