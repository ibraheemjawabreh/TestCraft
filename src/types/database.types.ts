export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_evaluations: {
        Row: {
          ai_score: number
          earned_xp: number
          evaluated_at: string | null
          id: string
          matched_hidden_bug_id: string | null
          quality_feedback: string
          report_id: string | null
        }
        Insert: {
          ai_score: number
          earned_xp: number
          evaluated_at?: string | null
          id?: string
          matched_hidden_bug_id?: string | null
          quality_feedback: string
          report_id?: string | null
        }
        Update: {
          ai_score?: number
          earned_xp?: number
          evaluated_at?: string | null
          id?: string
          matched_hidden_bug_id?: string | null
          quality_feedback?: string
          report_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_evaluations_matched_hidden_bug_id_fkey"
            columns: ["matched_hidden_bug_id"]
            isOneToOne: false
            referencedRelation: "hidden_bugs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_evaluations_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: true
            referencedRelation: "bug_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          description: string
          icon_url: string | null
          id: string
          name: string
        }
        Insert: {
          description: string
          icon_url?: string | null
          id?: string
          name: string
        }
        Update: {
          description?: string
          icon_url?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      bug_reports: {
        Row: {
          actual_result: string
          admin_feedback: string | null
          admin_score: number | null
          attempt_id: string | null
          challenge_id: string | null
          created_at: string | null
          expected_result: string
          id: string
          reported_severity: Database["public"]["Enums"]["severity_level"]
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["report_status"] | null
          steps_to_reproduce: string
          title: string
          user_id: string | null
        }
        Insert: {
          actual_result: string
          admin_feedback?: string | null
          admin_score?: number | null
          attempt_id?: string | null
          challenge_id?: string | null
          created_at?: string | null
          expected_result: string
          id?: string
          reported_severity: Database["public"]["Enums"]["severity_level"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["report_status"] | null
          steps_to_reproduce: string
          title: string
          user_id?: string | null
        }
        Update: {
          actual_result?: string
          admin_feedback?: string | null
          admin_score?: number | null
          attempt_id?: string | null
          challenge_id?: string | null
          created_at?: string | null
          expected_result?: string
          id?: string
          reported_severity?: Database["public"]["Enums"]["severity_level"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["report_status"] | null
          steps_to_reproduce?: string
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bug_reports_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "challenge_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bug_reports_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bug_reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bug_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_attempts: {
        Row: {
          admin_feedback: string | null
          challenge_id: string
          created_at: string
          earned_xp: number | null
          id: string
          is_passed: boolean | null
          review_started_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          score: number | null
          started_at: string
          status: string
          submitted_at: string | null
          time_spent_seconds: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_feedback?: string | null
          challenge_id: string
          created_at?: string
          earned_xp?: number | null
          id?: string
          is_passed?: boolean | null
          review_started_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          score?: number | null
          started_at?: string
          status?: string
          submitted_at?: string | null
          time_spent_seconds?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_feedback?: string | null
          challenge_id?: string
          created_at?: string
          earned_xp?: number | null
          id?: string
          is_passed?: boolean | null
          review_started_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          score?: number | null
          started_at?: string
          status?: string
          submitted_at?: string | null
          time_spent_seconds?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_attempts_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_attempts_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_progress: {
        Row: {
          challenge_id: string
          completed_at: string | null
          created_at: string
          started_at: string
          status: string
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed_at?: string | null
          created_at?: string
          started_at?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed_at?: string | null
          created_at?: string
          started_at?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_progress_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          base_xp_reward: number
          challenge_type: string
          description: string
          description_ar: string | null
          description_en: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          id: string
          instructions: string | null
          instructions_ar: string | null
          instructions_en: string | null
          is_active: boolean | null
          is_required: boolean
          lab_template: string | null
          lesson_id: string | null
          scenario: string | null
          scenario_ar: string | null
          scenario_en: string | null
          sort_order: number
          title: string
          title_ar: string | null
          title_en: string | null
          unlock_after_lesson: boolean
        }
        Insert: {
          base_xp_reward: number
          challenge_type?: string
          description: string
          description_ar?: string | null
          description_en?: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          id?: string
          instructions?: string | null
          instructions_ar?: string | null
          instructions_en?: string | null
          is_active?: boolean | null
          is_required?: boolean
          lab_template?: string | null
          lesson_id?: string | null
          scenario?: string | null
          scenario_ar?: string | null
          scenario_en?: string | null
          sort_order?: number
          title: string
          title_ar?: string | null
          title_en?: string | null
          unlock_after_lesson?: boolean
        }
        Update: {
          base_xp_reward?: number
          challenge_type?: string
          description?: string
          description_ar?: string | null
          description_en?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          id?: string
          instructions?: string | null
          instructions_ar?: string | null
          instructions_en?: string | null
          is_active?: boolean | null
          is_required?: boolean
          lab_template?: string | null
          lesson_id?: string | null
          scenario?: string | null
          scenario_ar?: string | null
          scenario_en?: string | null
          sort_order?: number
          title?: string
          title_ar?: string | null
          title_en?: string | null
          unlock_after_lesson?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "challenges_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      hidden_bugs: {
        Row: {
          actual_severity: Database["public"]["Enums"]["severity_level"]
          bonus_xp: number | null
          bug_title: string
          challenge_id: string | null
          id: string
        }
        Insert: {
          actual_severity: Database["public"]["Enums"]["severity_level"]
          bonus_xp?: number | null
          bug_title: string
          challenge_id?: string | null
          id?: string
        }
        Update: {
          actual_severity?: Database["public"]["Enums"]["severity_level"]
          bonus_xp?: number | null
          bug_title?: string
          challenge_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hidden_bugs_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_paths: {
        Row: {
          created_at: string
          description: string
          description_ar: string | null
          description_en: string | null
          id: string
          is_active: boolean
          slug: string
          sort_order: number
          title: string
          title_ar: string | null
          title_en: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean
          slug: string
          sort_order?: number
          title: string
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean
          slug?: string
          sort_order?: number
          title?: string
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      lesson_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          last_opened_at: string
          lesson_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          last_opened_at?: string
          lesson_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          last_opened_at?: string
          lesson_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          content: string
          content_ar: string | null
          content_en: string | null
          created_at: string
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          estimated_minutes: number
          id: string
          is_published: boolean
          learning_path_id: string
          objectives: string[]
          objectives_ar: string[]
          objectives_en: string[]
          slug: string
          sort_order: number
          summary: string | null
          summary_ar: string | null
          summary_en: string | null
          title: string
          title_ar: string | null
          title_en: string | null
          updated_at: string
        }
        Insert: {
          content: string
          content_ar?: string | null
          content_en?: string | null
          created_at?: string
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          estimated_minutes?: number
          id?: string
          is_published?: boolean
          learning_path_id: string
          objectives?: string[]
          objectives_ar?: string[]
          objectives_en?: string[]
          slug: string
          sort_order?: number
          summary?: string | null
          summary_ar?: string | null
          summary_en?: string | null
          title: string
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          content_ar?: string | null
          content_en?: string | null
          created_at?: string
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          estimated_minutes?: number
          id?: string
          is_published?: boolean
          learning_path_id?: string
          objectives?: string[]
          objectives_ar?: string[]
          objectives_en?: string[]
          slug?: string
          sort_order?: number
          summary?: string | null
          summary_ar?: string | null
          summary_en?: string | null
          title?: string
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_learning_path_id_fkey"
            columns: ["learning_path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          current_level: number | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          total_xp: number | null
          updated_at: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          current_level?: number | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          total_xp?: number | null
          updated_at?: string | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          current_level?: number | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          total_xp?: number | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string | null
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string | null
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      difficulty_level: "Beginner" | "Intermediate" | "Advanced"
      report_status: "Pending" | "Reviewed" | "Rejected"
      severity_level: "Low" | "Medium" | "High" | "Critical"
      user_role: "tester" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      difficulty_level: ["Beginner", "Intermediate", "Advanced"],
      report_status: ["Pending", "Reviewed", "Rejected"],
      severity_level: ["Low", "Medium", "High", "Critical"],
      user_role: ["tester", "admin"],
    },
  },
} as const
