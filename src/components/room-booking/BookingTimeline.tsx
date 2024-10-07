import { FunctionComponent } from "react";
import { applyVueInReact } from "veaury";
import RoomBookingViewVue from "./BookingTimeline.vue";

const BookingTimeline = applyVueInReact(RoomBookingViewVue, {
  vue: {
    componentWrapAttrs: {
      // Fix problem with incorrect 'all: unset' style on Firefox and Safari
      style: {},
      className: "[all:unset]",
    },
  },
});
export default BookingTimeline as FunctionComponent<any>;
