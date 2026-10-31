import { describe, expect, it } from "vitest";
import { validateEventDraft } from "@/backend/lib/events/validation";

function validEventForm(): FormData {
  const startsAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const endsAt = startsAt + 60 * 60 * 1000;
  const deadline = startsAt - 60 * 60 * 1000;
  const formData = new FormData();
  formData.set("title", "  Campus workshop  ");
  formData.set("description", "Learn something useful.");
  formData.set("category", "Workshop");
  formData.set("venue", "Main Hall");
  formData.set("startsAt", new Date(startsAt).toISOString());
  formData.set("endsAt", new Date(endsAt).toISOString());
  formData.set("registrationDeadline", new Date(deadline).toISOString());
  formData.set("capacity", "40");
  return formData;
}

describe("validateEventDraft", () => {
  it("trims text and normalizes event times", () => {
    expect(validateEventDraft(validEventForm())).toEqual({
      success: true,
      event: {
        title: "Campus workshop",
        description: "Learn something useful.",
        category: "Workshop",
        startsAt: expect.any(String),
        endsAt: expect.any(String),
        venue: "Main Hall",
        capacity: 40,
        registrationDeadline: expect.any(String),
      },
    });
  });

  it("rejects end times that are not after the start", () => {
    const formData = validEventForm();
    const startsAt = formData.get("startsAt");
    formData.set("endsAt", new Date(Date.parse(String(startsAt)) - 1000).toISOString());
    expect(validateEventDraft(formData)).toEqual({
      success: false,
      message: "The event end time must be after its start time.",
    });
  });

  it("requires an explicit timezone in submitted timestamps", () => {
    const formData = validEventForm();
    formData.set("startsAt", "2026-11-01T12:00");
    expect(validateEventDraft(formData)).toEqual({
      success: false,
      message: "Choose valid event dates and times.",
    });
  });

  it("rejects an event that has already started", () => {
    const formData = validEventForm();
    formData.set("startsAt", "2020-01-01T12:00:00.000Z");
    formData.set("endsAt", "2020-01-01T13:00:00.000Z");
    expect(validateEventDraft(formData)).toEqual({
      success: false,
      message: "The event start time must be in the future.",
    });
  });

  it("rejects invalid capacity and late registration deadlines", () => {
    const formData = validEventForm();
    formData.set("capacity", "1.5");
    expect(validateEventDraft(formData)).toEqual({
      success: false,
      message: "Capacity must be a whole number.",
    });

    formData.set("capacity", "40");
    const startsAt = formData.get("startsAt");
    formData.set("registrationDeadline", new Date(Date.parse(String(startsAt)) + 30 * 60 * 1000).toISOString());
    expect(validateEventDraft(formData)).toEqual({
      success: false,
      message: "The registration deadline must be before the event starts.",
    });
  });
});
