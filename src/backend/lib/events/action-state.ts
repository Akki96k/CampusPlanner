export type EventFormState = {
  status: "idle" | "error" | "success";
  message?: string;
};

export const initialEventFormState: EventFormState = { status: "idle" };
