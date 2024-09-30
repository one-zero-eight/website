import { FunctionComponent } from "react";
import { applyVueInReact } from "veaury";
import RoomBookingViewVue from "./BookingTimeline.vue";

const BookingTimeline = applyVueInReact(RoomBookingViewVue);
export default BookingTimeline as FunctionComponent<any>;
