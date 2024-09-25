// Based on @fullcalendar/icalendar
import { createPlugin, PluginDef } from "@fullcalendar/core";
import { eventSourceDef } from "./event-source-def.ts";

export default createPlugin({
  name: "<%= pkgName %>",
  eventSourceDefs: [eventSourceDef],
}) as PluginDef;
