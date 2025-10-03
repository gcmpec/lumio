import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const LISBON_TIME_ZONE = "Europe/Lisbon";

const timestampFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: LISBON_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZoneName: "shortOffset",
});

function normalizeOffset(value: string) {
  if (!value) return "+00:00";

  let cleaned = value.replace("GMT", "").replace("UTC", "").trim();
  if (!cleaned) return "+00:00";

  cleaned = cleaned.replace("\u2212", "-");

  let sign = "+";
  if (cleaned.startsWith("-")) {
    sign = "-";
    cleaned = cleaned.slice(1);
  } else if (cleaned.startsWith("+")) {
    cleaned = cleaned.slice(1);
  }

  if (!cleaned.includes(":")) {
    if (cleaned.length === 0) {
      cleaned = "00:00";
    } else if (cleaned.length === 1) {
      cleaned = `0${cleaned}:00`;
    } else if (cleaned.length === 2) {
      cleaned = `${cleaned}:00`;
    } else if (cleaned.length === 3) {
      cleaned = `${cleaned.slice(0, 2)}:${cleaned.slice(2)}0`;
    } else if (cleaned.length === 4) {
      cleaned = `${cleaned.slice(0, 2)}:${cleaned.slice(2)}`;
    }
  }

  return `${sign}${cleaned}`;
}

export function getLisbonTimestamp(date: Date = new Date()): string {
  const parts = timestampFormatter.formatToParts(date).reduce<Record<string, string>>(
    (acc, part) => {
      if (part.type !== "literal") {
        acc[part.type] = part.value;
      }
      return acc;
    },
    {},
  );

  const offset = normalizeOffset(parts.timeZoneName ?? "");

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${offset}`;
}

export function getLisbonDayRange(date: Date = new Date()) {
  const timestamp = getLisbonTimestamp(date);
  const day = timestamp.slice(0, 10);
  const offset = timestamp.slice(-6);

  return {
    startOfDay: `${day}T00:00:00${offset}`,
    endOfDay: `${day}T23:59:59${offset}`,
  };
}
