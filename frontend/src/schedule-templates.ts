import type { ScheduleEntry } from "./types";

export interface ScheduleTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  schedule: Record<string, ScheduleEntry[]>;
}

const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"];
const WEEKEND = ["saturday", "sunday"];

function buildSchedule(
  weekdayEntries: ScheduleEntry[],
  weekendEntries: ScheduleEntry[]
): Record<string, ScheduleEntry[]> {
  const schedule: Record<string, ScheduleEntry[]> = {};
  for (const day of WEEKDAYS) schedule[day] = [...weekdayEntries];
  for (const day of WEEKEND) schedule[day] = [...weekendEntries];
  return schedule;
}

function uniformSchedule(
  entries: ScheduleEntry[]
): Record<string, ScheduleEntry[]> {
  return buildSchedule(entries, entries);
}

export const SCHEDULE_TEMPLATES: ScheduleTemplate[] = [
  {
    id: "workday_9_5",
    name: "9-5 Workday",
    description: "Warm mornings & evenings, away during work",
    icon: "mdi:briefcase-outline",
    schedule: buildSchedule(
      [
        { time: "06:00", temp: "home" },
        { time: "08:30", temp: "away" },
        { time: "16:30", temp: "home" },
        { time: "22:30", temp: "away" },
      ],
      [
        { time: "08:00", temp: "home" },
        { time: "23:00", temp: "away" },
      ]
    ),
  },
  {
    id: "work_from_home",
    name: "Work from Home",
    description: "Warm all day, cool overnight",
    icon: "mdi:laptop",
    schedule: uniformSchedule([
      { time: "07:00", temp: "home" },
      { time: "22:30", temp: "away" },
    ]),
  },
  {
    id: "early_bird",
    name: "Early Bird",
    description: "Early start, home by 4pm",
    icon: "mdi:weather-sunset-up",
    schedule: buildSchedule(
      [
        { time: "05:30", temp: "home" },
        { time: "07:30", temp: "away" },
        { time: "16:00", temp: "home" },
        { time: "22:00", temp: "away" },
      ],
      [
        { time: "08:00", temp: "home" },
        { time: "23:00", temp: "away" },
      ]
    ),
  },
  {
    id: "always_home",
    name: "Always Home",
    description: "Comfortable temperature 24/7",
    icon: "mdi:home",
    schedule: uniformSchedule([{ time: "00:00", temp: "home" }]),
  },
  {
    id: "always_away",
    name: "Always Away",
    description: "Energy saving, minimum heating",
    icon: "mdi:snowflake",
    schedule: uniformSchedule([{ time: "00:00", temp: "away" }]),
  },
];
