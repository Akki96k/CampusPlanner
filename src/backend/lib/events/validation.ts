export type EventDraft = {
  title: string;
  description: string;
  category: string;
  startsAt: string;
  endsAt: string;
  venue: string;
  capacity: number | null;
  registrationDeadline: string | null;
};

type EventDraftValidation =
  | { success: true; event: EventDraft }
  | { success: false; message: string };

export function validateEventDraft(formData: FormData): EventDraftValidation {
  const title = readText(formData, "title");
  const description = readText(formData, "description");
  const category = readText(formData, "category");
  const venue = readText(formData, "venue");

  if (!title || title.length > 160) {
    return { success: false, message: "Enter an event title of 1 to 160 characters." };
  }
  if (!description || description.length > 10000) {
    return { success: false, message: "Enter a description of 1 to 10,000 characters." };
  }
  if (!category || category.length > 60) {
    return { success: false, message: "Enter a category of 1 to 60 characters." };
  }
  if (!venue || venue.length > 200) {
    return { success: false, message: "Enter a venue of 1 to 200 characters." };
  }

  const startsAt = readZonedDateTime(formData, "startsAt");
  const endsAt = readZonedDateTime(formData, "endsAt");
  const registrationDeadline = readOptionalZonedDateTime(formData, "registrationDeadline");
  if (!startsAt || !endsAt || registrationDeadline === undefined) {
    return { success: false, message: "Choose valid event dates and times." };
  }

  const startMilliseconds = Date.parse(startsAt);
  const endMilliseconds = Date.parse(endsAt);
  const deadlineMilliseconds = registrationDeadline ? Date.parse(registrationDeadline) : null;
  if (startMilliseconds <= Date.now()) {
    return { success: false, message: "The event start time must be in the future." };
  }
  if (endMilliseconds <= startMilliseconds) {
    return { success: false, message: "The event end time must be after its start time." };
  }
  if (deadlineMilliseconds !== null && deadlineMilliseconds <= Date.now()) {
    return { success: false, message: "The registration deadline must be in the future." };
  }
  if (deadlineMilliseconds !== null && deadlineMilliseconds > startMilliseconds) {
    return { success: false, message: "The registration deadline must be before the event starts." };
  }

  const capacityValue = readText(formData, "capacity");
  let capacity: number | null = null;
  if (capacityValue) {
    if (!/^\d+$/.test(capacityValue)) {
      return { success: false, message: "Capacity must be a whole number." };
    }
    capacity = Number(capacityValue);
    if (!Number.isSafeInteger(capacity) || capacity < 1 || capacity > 100000) {
      return { success: false, message: "Capacity must be between 1 and 100,000." };
    }
  }

  return {
    success: true,
    event: {
      title,
      description,
      category,
      startsAt,
      endsAt,
      venue,
      capacity,
      registrationDeadline,
    },
  };
}

function readText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function readZonedDateTime(formData: FormData, name: string): string | null {
  const value = readText(formData, name);
  if (!hasTimeZone(value)) return null;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) ? new Date(milliseconds).toISOString() : null;
}

function readOptionalZonedDateTime(formData: FormData, name: string): string | null | undefined {
  const value = readText(formData, name);
  if (!value) return null;
  return readZonedDateTime(formData, name) ?? undefined;
}

function hasTimeZone(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value);
}
