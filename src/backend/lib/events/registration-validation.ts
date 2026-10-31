export type RegistrationInput = {
  fullName: string; email: string; phone: string; collegeName: string; studentNumber: string;
  yearOrSemester: string; graduationYear: number; participationType: "solo" | "team";
};

export function validateRegistration(formData: FormData): { success: true; value: RegistrationInput } | { success: false; message: string } {
  const text = (key: string) => formData.get(key);
  const keys = ["fullName", "email", "phone", "collegeName", "studentNumber", "yearOrSemester"];
  if (keys.some((key) => typeof text(key) !== "string")) return { success: false, message: "Complete all required fields." };
  const [fullName, email, phone, collegeName, studentNumber, yearOrSemester] = keys.map((key) => String(text(key)).trim().replace(/\s+/g, " "));
  const rawYear = text("graduationYear");
  const participationType = text("participationType");
  const graduationYear = typeof rawYear === "string" ? Number(rawYear) : NaN;
  if (fullName.length < 2 || fullName.length > 120) return { success: false, message: "Enter a full name between 2 and 120 characters." };
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { success: false, message: "Enter a valid email address." };
  if (!/^\+?[0-9() .-]{7,30}$/.test(phone)) return { success: false, message: "Enter a valid phone number." };
  if (collegeName.length < 2 || collegeName.length > 160 || studentNumber.length < 1 || studentNumber.length > 60 || yearOrSemester.length < 1 || yearOrSemester.length > 40) return { success: false, message: "Check your college, student ID, and year or semester." };
  if (!Number.isInteger(graduationYear) || graduationYear < new Date().getFullYear() || graduationYear > new Date().getFullYear() + 15) return { success: false, message: "Enter a valid expected graduation year." };
  if (participationType !== "solo" && participationType !== "team") return { success: false, message: "Choose solo or team participation." };
  return { success: true, value: { fullName, email: email.toLowerCase(), phone, collegeName, studentNumber, yearOrSemester, graduationYear, participationType } };
}
