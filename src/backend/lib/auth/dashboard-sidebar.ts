export type DashboardSidebarKind = "faculty" | "organizer" | "student";

/**
 * Determines which dashboard sidebar to display based on the authenticated user's actual role.
 * Organizers always receive the OrganizerSidebar regardless of approval status (pending, approved, rejected, removed).
 * Faculty administrators receive the FacultySidebar.
 * Students and unknown/unassigned accounts receive the StudentSidebar.
 */
export function resolveDashboardSidebarKind(role: string | null | undefined): DashboardSidebarKind {
  if (role === "faculty_admin") {
    return "faculty";
  }
  if (role === "organizer") {
    return "organizer";
  }
  return "student";
}

