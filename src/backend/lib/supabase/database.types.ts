export type Database = {
  public: {
    Tables: {
      events: {
        Row: {
          id: string;
          title: string;
          description: string;
          category: string;
          starts_at: string;
          ends_at: string;
          venue: string;
          capacity: number | null;
          registration_deadline: string | null;
          organizer_id: string;
          approved_by: string | null;
          status: Database["public"]["Enums"]["event_status"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          category: string;
          starts_at: string;
          ends_at: string;
          venue: string;
          capacity?: number | null;
          registration_deadline?: string | null;
          organizer_id: string;
          approved_by?: string | null;
          status?: Database["public"]["Enums"]["event_status"];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          category?: string;
          starts_at?: string;
          ends_at?: string;
          venue?: string;
          capacity?: number | null;
          registration_deadline?: string | null;
          organizer_id?: string;
          approved_by?: string | null;
          status?: Database["public"]["Enums"]["event_status"];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          display_name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          role?: Database["public"]["Enums"]["app_role"];
          display_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          display_name?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      event_registrations: {
        Row: { id: string; event_id: string; student_id: string; full_name: string; email: string; phone: string; college_name: string; student_number: string; year_or_semester: string; graduation_year: number; participation_type: "solo" | "team"; status: Database["public"]["Enums"]["registration_status"]; attendance: Database["public"]["Enums"]["attendance_status"]; attended_by: string | null; attendance_marked_at: string | null; created_at: string };
        Insert: { id?: string; event_id: string; student_id: string; full_name: string; email: string; phone: string; college_name: string; student_number: string; year_or_semester: string; graduation_year: number; participation_type: "solo" | "team"; status?: Database["public"]["Enums"]["registration_status"]; attendance?: Database["public"]["Enums"]["attendance_status"]; attended_by?: string | null; attendance_marked_at?: string | null; created_at?: string };
        Update: { attendance?: Database["public"]["Enums"]["attendance_status"]; attended_by?: string | null; attendance_marked_at?: string | null };
        Relationships: [];
      };
      event_review_remarks: {
        Row: { id: string; event_id: string; faculty_id: string; remark: string; created_at: string };
        Insert: { id?: string; event_id: string; faculty_id: string; remark: string; created_at?: string };
        Update: Record<string, never>;
        Relationships: [];
      };
      notifications: {
        Row: { id: string; recipient_id: string; event_id: string | null; notification_type: "event_rejected" | "event_submitted" | "organizer_approved" | "organizer_rejected" | "organizer_removed" | "organizer_restored"; event_title: string; message: string; dedupe_key: string; created_at: string; read_at: string | null };
        Insert: { id?: string; recipient_id: string; event_id?: string | null; notification_type: "event_rejected" | "event_submitted" | "organizer_approved" | "organizer_rejected" | "organizer_removed" | "organizer_restored"; event_title: string; message: string; dedupe_key: string; created_at?: string; read_at?: string | null };
        Update: { read_at?: string | null };
        Relationships: [];
      };
      organizer_applications: {
        Row: { organizer_id: string; status: "pending" | "approved" | "rejected" | "removed"; submitted_at: string; rejected_reason: string | null; removed_reason: string | null };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      reject_event_with_remark: { Args: { target_event: string; rejection_remark: string }; Returns: string };
      manage_organizer_application: { Args: { target_organizer: string; requested_status: string; action_reason?: string | null }; Returns: string };
      list_organizer_applications: { Args: Record<string, never>; Returns: OrganizerApplication[] };
      claim_organizer_email_outbox: { Args: { target_id: string }; Returns: OrganizerEmailOutbox[] };
      finish_organizer_email_outbox: { Args: { target_id: string; succeeded: boolean; failure_detail?: string | null }; Returns: undefined };
      update_organizer_profile: { Args: { target_organizer: string; new_display_name: string }; Returns: undefined };
    };
    Enums: {
      app_role: "student" | "organizer" | "faculty_admin";
      event_status: "draft" | "pending_approval" | "approved" | "rejected" | "cancelled" | "completed";
      registration_status: "registered" | "cancelled";
      attendance_status: "pending" | "attended" | "absent";
    };
    CompositeTypes: Record<string, never>;
  };
};

export type CampusEvent = Database["public"]["Tables"]["events"]["Row"];
export type OrganizerApplication = {
  organizer_id: string;
  display_name: string | null;
  email: string;
  status: "pending" | "approved" | "rejected" | "removed";
  submitted_at: string;
  approved_at: string | null;
  approved_by_name: string | null;
  decided_at: string | null;
  decided_by_name: string | null;
  rejected_reason: string | null;
  removed_at: string | null;
  removed_by_name: string | null;
  removed_reason: string | null;
};
export type OrganizerEmailOutbox = {
  id: string;
  organizer_id: string;
  transition_id: string;
  notification_type: "organizer_approved" | "organizer_rejected" | "organizer_removed" | "organizer_restored";
  email: string;
  display_name: string;
  reason: string | null;
  status: "pending" | "sending" | "sent" | "failed";
  attempts: number;
  last_attempt_at: string | null;
  delivered_at: string | null;
  last_error: string | null;
  created_at: string;
};
