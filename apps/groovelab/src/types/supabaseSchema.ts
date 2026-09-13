/**
 * ==============================================================================
 * CAMPUS-GROOVELAB AUTO-GENERATED DATABASE & DTO SCHEMAS
 * Generated automatically from Live PostgreSQL Schema
 * ==============================================================================
 */

export interface Database {
  public: {
    Tables: {
      schools: {
        Row: {
          id: string;
          name: string;
          subdomain: string | null;
          logo_url: string | null;
          primary_color: string | null;
          city: string | null;
          has_campus_subscription: boolean;
          has_groovelab_subscription: boolean;
          created_at: string;
        };
      };
      users_raw: {
        Row: {
          id: string;
          school_id: string | null;
          first_name: string;
          last_name: string;
          role: 'admin' | 'secretary' | 'teacher' | 'student';
          is_active: boolean;
          created_at: string;
        };
      };
      schedules: {
        Row: {
          id: string;
          school_id: string;
          teacher_id: string;
          student_id: string | null;
          day_of_week: number;
          start_time: string;
          duration_minutes: number;
        };
      };
      campus_direct_messages: {
        Row: {
          id: string;
          sender_id: string;
          recipient_id: string;
          body?: string;
          content?: string;
          is_read: boolean;
          created_at: string;
          message_type?: string | null;
          subject?: string | null;
          parent_message_id?: string | null;
          channel_id?: string | null;
          group_id?: string | null;
          occurrence_id?: string | null;
          read_at?: string | null;
          acknowledged_at?: string | null;
        };
      };
    };
    Functions: {
      search_public_schools: {
        Args: { p_query?: string };
        Returns: Array<{
          id: string;
          name: string;
          city: string | null;
          logo_url: string | null;
          subdomain: string | null;
          has_campus_subscription: boolean;
          has_groovelab_subscription: boolean;
        }>;
      };
      get_public_school_theme: {
        Args: { p_subdomain: string };
        Returns: {
          id: string;
          name: string;
          primary_color: string;
          logo_url: string | null;
          is_campus_active: boolean;
          is_groovelab_active: boolean;
        };
      };
      get_authenticated_student_profile: {
        Args: { p_user_id: string };
        Returns: any;
      };
      acquire_idempotency_lock: {
        Args: { p_key: string; p_endpoint: string; p_request_hash?: string };
        Returns: {
          status: 'proceed' | 'completed' | 'in_flight';
          is_cached: boolean;
          status_code?: number;
          response?: any;
        };
      };
    };
  };
}
