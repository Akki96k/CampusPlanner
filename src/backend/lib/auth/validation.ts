export type AuthCredentials = {
  email: string;
  password: string;
};

export type ValidationResult =
  | { success: true; credentials: AuthCredentials }
  | { success: false; message: string };

export function validateAuthCredentials(
  emailValue: FormDataEntryValue | null,
  passwordValue: FormDataEntryValue | null,
): ValidationResult {
  if (typeof emailValue !== "string" || typeof passwordValue !== "string") {
    return { success: false, message: "Enter your email and password." };
  }

  const email = emailValue.trim().toLowerCase();
  const password = passwordValue;

  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, message: "Enter a valid email address." };
  }

  if (password.length < 8) {
    return {
      success: false,
      message: "Your password must contain at least 8 characters.",
    };
  }

  if (password.length > 128) {
    return {
      success: false,
      message: "Your password must contain no more than 128 characters.",
    };
  }

  return { success: true, credentials: { email, password } };
}

export function passwordsMatch(
  password: string,
  confirmationValue: FormDataEntryValue | null,
): boolean {
  return typeof confirmationValue === "string" && password === confirmationValue;
}
