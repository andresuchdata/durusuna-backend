#!/usr/bin/env bun
import knex from "knex";
import config from "../src/knexfile";

export interface SeederOptions {
  teacherEmail: string;
  singleDate?: string;
  rangeStart?: string;
  rangeEnd?: string;
  overwrite?: boolean;
  dryRun?: boolean;
}

type ClassSubjectRow = {
  class_subject_id: string;
  class_subject_schedule?: unknown;
  class_name?: string;
  subject_name?: string;
  subject_code?: string;
  class_offering_id?: string | null;
  offering_schedule?: unknown;
};

type ExistingLessonKey = `${string}|${string}`;

type TimeRange = {
  start: string;
  end: string;
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

type DayName = (typeof DAY_NAMES)[number];

export type SeederContext = {
  db?: knex.Knex;
  environment?: string;
  quiet?: boolean;
};

export async function seedLessons(options: SeederOptions, ctx: SeederContext = {}): Promise<number> {
  const environment = ctx.environment ?? process.env.NODE_ENV ?? "development";
  const knexConfig = config[environment];
  const db = ctx.db ?? knex(knexConfig);
  const ownsDb = !ctx.db;
  const log = ctx.quiet ? (() => {}) : console.log;

  try {
    log("\n📘 Lesson Seeder");
    log("Environment:", environment);

    const teacher = await db("users")
      .whereRaw("LOWER(email) = ?", options.teacherEmail.toLowerCase())
      .first("id", "email", "first_name", "last_name");

    if (!teacher) {
      throw new Error(`Teacher with email ${options.teacherEmail} not found.`);
    }

    log(`👤 Teacher: ${teacher.first_name ?? ""} ${teacher.last_name ?? ""}`.trim() || "Unknown name");

    const dateStrings = buildDateList(options);
    log("🗓️  Target dates:", dateStrings.join(", "));

    const classSubjects = await fetchClassSubjects(db, teacher.id as string);

    if (classSubjects.length === 0) {
      log("⚠️  No active class subjects found for this teacher. Nothing to seed.");
      return 0;
    }

    log(`📚 Found ${classSubjects.length} class subjects assigned to teacher.`);

    const { startBoundary, endBoundary } = buildRangeBoundaries(dateStrings);
    const existingLessons = await fetchExistingLessons(db, classSubjects, startBoundary, endBoundary);

    if (options.overwrite && existingLessons.size > 0) {
      log("🧹 Overwrite enabled – removing existing lessons in range...");
      await db("lesson_instances")
        .whereBetween("scheduled_start", [startBoundary.toISOString(), endBoundary.toISOString()])
        .whereIn(
          "class_subject_id",
          classSubjects.map((cs) => cs.class_subject_id),
        )
        .del();
      existingLessons.clear();
      log("   ➜ Existing lessons removed.");
    }

    const lessonsToInsert = buildLessonsForRange(dateStrings, classSubjects, teacher.id as string, existingLessons);

    if (lessonsToInsert.length === 0) {
      log("ℹ️  No new lessons generated (possible duplicates or no schedules).");
      return 0;
    }

    if (options.dryRun) {
      log("🔍 Dry run – lessons to insert:");
      lessonsToInsert.forEach((lesson) => {
        log(
          `   • ${lesson.class_subject_id} | ${lesson.title ?? lesson.description ?? "lesson"} | ${lesson.scheduled_start} → ${lesson.scheduled_end}`,
        );
      });
      log(`Total lessons that would be inserted: ${lessonsToInsert.length}`);
      return lessonsToInsert.length;
    }

    await db("lesson_instances").insert(lessonsToInsert);
    log(`✅ Inserted ${lessonsToInsert.length} lesson instances.`);
    return lessonsToInsert.length;
  } finally {
    if (ownsDb) {
      await db.destroy();
    }
  }
}

async function main() {
  const args = process.argv.slice(2);

  const isDbResetMode = process.env.DB_RESET_MODE?.toLowerCase() === "true";
  const hasDateArg = args.some((arg) => arg.startsWith("--date") || arg.startsWith("--from") || arg.startsWith("--to"));
  if (isDbResetMode && !hasDateArg) {
    const fallbackDate = formatDate(new Date());
    args.push(`--date=${fallbackDate}`);
    console.log(`⚙️  DB_RESET_MODE detected – defaulting to current date (${fallbackDate}).`);
  }

  try {
    const options = parseArgs(args);
    await seedLessons(options);
  } catch (error) {
    console.error("❌ Seeder failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
function parseArgs(args: string[]): SeederOptions {
  const options: Partial<SeederOptions> = {};

  for (const arg of args) {
    if (!arg.startsWith("--")) {
      if (!options.teacherEmail) {
        options.teacherEmail = arg;
      }
      continue;
    }

    const [flag, value] = arg.includes("=") ? arg.split("=", 2) : [arg, undefined];

    switch (flag) {
      case "--email":
        if (!value) throw new Error("--email requires a value");
        options.teacherEmail = value;
        break;
      case "--date":
        if (!value) throw new Error("--date requires a value");
        options.singleDate = value;
        break;
      case "--from":
        if (!value) throw new Error("--from requires a value");
        options.rangeStart = value;
        break;
      case "--to":
        if (!value) throw new Error("--to requires a value");
        options.rangeEnd = value;
        break;
      case "--overwrite":
        options.overwrite = true;
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      default:
        throw new Error(`Unknown argument: ${flag}`);
    }
  }

  if (!options.teacherEmail) {
    throw new Error("Teacher email is required (use positional argument or --email=<email>).");
  }

  if (options.singleDate && (options.rangeStart || options.rangeEnd)) {
    throw new Error("Use either --date or --from/--to, not both.");
  }

  if ((options.rangeStart && !options.rangeEnd) || (!options.rangeStart && options.rangeEnd)) {
    throw new Error("Both --from and --to must be provided for a date range.");
  }

  if (!options.singleDate && !options.rangeStart) {
    throw new Error("Provide --date=<YYYY-MM-DD> or --from/--to for a range.");
  }

  return options as SeederOptions;
}

function buildDateList(options: SeederOptions): string[] {
  if (options.singleDate) {
    validateDate(options.singleDate, "--date");
    return [options.singleDate];
  }

  const { rangeStart, rangeEnd } = options;
  if (!rangeStart || !rangeEnd) throw new Error("Range start and end are required.");
  validateDate(rangeStart, "--from");
  validateDate(rangeEnd, "--to");

  const start = parseDate(rangeStart);
  const end = parseDate(rangeEnd);
  if (start > end) {
    throw new Error("--from date must be on or before --to date");
  }

  const dates: string[] = [];
  let cursor = new Date(start);
  while (cursor <= end) {
    dates.push(formatDate(cursor));
    cursor = addDays(cursor, 1);
  }
  return dates;
}

function validateDate(value: string, label: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} must be in YYYY-MM-DD format`);
  }
  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label} is not a valid date`);
  }
}

function parseDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

async function fetchClassSubjects(db: knex.Knex, teacherId: string): Promise<ClassSubjectRow[]> {
  const rows = await db("class_subjects as cs")
    .leftJoin("class_offerings as co", "cs.class_offering_id", "co.id")
    .leftJoin("class_offering_teachers as cot", "cs.class_offering_id", "cot.class_offering_id")
    .leftJoin("classes as c", "cs.class_id", "c.id")
    .leftJoin("subjects as s", "cs.subject_id", "s.id")
    .where("cs.is_active", true)
    .where(function () {
      this.where("cs.teacher_id", teacherId)
        .orWhere("co.primary_teacher_id", teacherId)
        .orWhere(function () {
          this.where("cot.teacher_id", teacherId).andWhere("cot.is_active", true);
        });
    })
    .distinct([
      "cs.id as class_subject_id",
      "cs.schedule as class_subject_schedule",
      "co.schedule as offering_schedule",
      "cs.class_offering_id",
      "c.name as class_name",
      "s.name as subject_name",
      "s.code as subject_code",
    ]);

  return rows as ClassSubjectRow[];
}

function buildRangeBoundaries(dateStrings: string[]) {
  const first = parseDate(dateStrings[0]);
  const last = parseDate(dateStrings[dateStrings.length - 1]);

  const startBoundary = new Date(first);
  startBoundary.setUTCHours(0, 0, 0, 0);

  const endBoundary = new Date(last);
  endBoundary.setUTCHours(23, 59, 59, 999);

  return { startBoundary, endBoundary };
}

async function fetchExistingLessons(
  db: knex.Knex,
  classSubjects: ClassSubjectRow[],
  start: Date,
  end: Date,
): Promise<Set<ExistingLessonKey>> {
  const subjectIds = classSubjects.map((cs) => cs.class_subject_id);
  const rows = await db("lesson_instances")
    .whereIn("class_subject_id", subjectIds)
    .whereBetween("scheduled_start", [start.toISOString(), end.toISOString()])
    .select("class_subject_id", "scheduled_start");

  const set: Set<ExistingLessonKey> = new Set();
  for (const row of rows) {
    set.add(`${row.class_subject_id}|${new Date(row.scheduled_start).toISOString()}`);
  }
  return set;
}

function buildLessonsForRange(
  dateStrings: string[],
  classSubjects: ClassSubjectRow[],
  teacherId: string,
  existingLessons: Set<ExistingLessonKey>,
) {
  const lessons: Record<string, any>[] = [];

  for (const date of dateStrings) {
    const dayName = getDayName(date);

    for (const classSubject of classSubjects) {
      const timeRanges = resolveTimeRangesForDate(classSubject, dayName) ?? [defaultTimeRange()];

      for (const range of timeRanges) {
        const scheduledStart = buildDateTime(date, range.start);
        const scheduledEnd = buildDateTime(date, range.end);

        const key: ExistingLessonKey = `${classSubject.class_subject_id}|${scheduledStart.toISOString()}`;
        if (existingLessons.has(key)) {
          continue;
        }

        existingLessons.add(key);
        lessons.push({
          id: crypto.randomUUID(),
          class_subject_id: classSubject.class_subject_id,
          schedule_slot_id: null,
          scheduled_start: scheduledStart.toISOString(),
          scheduled_end: scheduledEnd.toISOString(),
          actual_start: null,
          actual_end: null,
          status: "planned",
          title: buildTitle(classSubject, date, range),
          description: buildDescription(classSubject, date),
          objectives: JSON.stringify([]),
          materials: JSON.stringify([]),
          notes: null,
          cancellation_reason: null,
          created_by: teacherId,
          updated_by: teacherId,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }
  }

  return lessons;
}

function getDayName(dateString: string): DayName {
  const date = parseDate(dateString);
  return DAY_NAMES[date.getUTCDay()];
}

function resolveTimeRangesForDate(classSubject: ClassSubjectRow, dayName: DayName): TimeRange[] | null {
  const schedule = parseSchedule(classSubject.class_subject_schedule) ?? parseSchedule(classSubject.offering_schedule);
  if (!schedule) return null;

  const key = dayName.toLowerCase();
  const ranges = schedule[key];
  if (!ranges || ranges.length === 0) return null;

  const parsed = ranges
    .map(parseTimeRange)
    .filter((range): range is TimeRange => range !== null && isRangeValid(range));

  return parsed.length > 0 ? parsed : null;
}

type NormalizedSchedule = Record<string, string[]>;

function parseSchedule(input: unknown): NormalizedSchedule | null {
  if (!input) return null;

  let scheduleData: unknown = input;

  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return null;
    try {
      scheduleData = JSON.parse(trimmed);
    } catch {
      try {
        scheduleData = JSON.parse(trimmed.replace(/'/g, '"'));
      } catch {
        return null;
      }
    }
  }

  if (typeof scheduleData !== "object" || scheduleData === null) {
    return null;
  }

  const normalized: NormalizedSchedule = {};
  for (const [key, value] of Object.entries(scheduleData)) {
    if (!key) continue;
    const lowerKey = key.toLowerCase();
    if (!normalized[lowerKey]) {
      normalized[lowerKey] = [];
    }

    if (typeof value === "string") {
      normalized[lowerKey].push(...splitScheduleValue(value));
    } else if (Array.isArray(value)) {
      const strings = value.filter((item): item is string => typeof item === "string");
      normalized[lowerKey].push(...strings.flatMap(splitScheduleValue));
    }
  }

  for (const day of Object.keys(normalized)) {
    normalized[day] = normalized[day].map((segment) => segment.trim()).filter(Boolean);
    if (normalized[day].length === 0) {
      delete normalized[day];
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : null;
}

function splitScheduleValue(value: string): string[] {
  return value
    .split(/[,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseTimeRange(value: string): TimeRange | null {
  const match = value.match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
  if (match) {
    return {
      start: normalizeTime(match[1]),
      end: normalizeTime(match[2]),
    };
  }

  if (/^\d{1,2}:\d{2}$/.test(value)) {
    const start = normalizeTime(value);
    const [hour, minute] = start.split(":").map(Number);
    const endDate = new Date(Date.UTC(2000, 0, 1, hour, minute));
    endDate.setUTCMinutes(endDate.getUTCMinutes() + 60);
    return {
      start,
      end: normalizeTime(`${endDate.getUTCHours()}:${`${endDate.getUTCMinutes()}`.padStart(2, "0")}`),
    };
  }

  return null;
}

function normalizeTime(value: string): string {
  const [hour, minute] = value.split(":").map(Number);
  const clampedHour = Math.max(0, Math.min(23, hour));
  const clampedMinute = Math.max(0, Math.min(59, minute));
  return `${clampedHour.toString().padStart(2, "0")}:${clampedMinute.toString().padStart(2, "0")}`;
}

function isRangeValid(range: TimeRange): boolean {
  return range.start !== range.end;
}

function defaultTimeRange(): TimeRange {
  return { start: "08:00", end: "09:00" };
}

function buildDateTime(dateString: string, timeString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  const [hour, minute] = timeString.split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour, minute));
}

function buildTitle(classSubject: ClassSubjectRow, date: string, range: TimeRange): string {
  const subject = classSubject.subject_name ?? classSubject.subject_code ?? "Lesson";
  return `${subject} (${date} ${range.start})`;
}

function buildDescription(classSubject: ClassSubjectRow, date: string): string {
  const className = classSubject.class_name ?? "class";
  const subject = classSubject.subject_name ?? classSubject.subject_code ?? "lesson";
  return `${subject} for ${className} on ${date}`;
}

main();
