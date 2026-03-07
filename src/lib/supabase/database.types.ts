export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      rounds: {
        Row: {
          benchmark_bracket: string | null
          benchmark_handicap: number | null
          benchmark_version: string | null
          birdies: number
          bogeys: number
          calibration_version: string | null
          course_name: string
          course_rating: number
          created_at: string
          double_bogeys: number
          eagles: number
          fairway_attempts: number
          fairways_hit: number | null
          greens_in_regulation: number | null
          handicap_index: number
          id: string
          methodology_version: string | null
          pars: number
          penalty_strokes: number
          played_at: string
          reconciliation_flags: string[]
          reconciliation_scale_factor: number | null
          sand_save_attempts: number | null
          sand_saves: number | null
          score: number
          sg_approach: number | null
          sg_around_the_green: number | null
          sg_off_the_tee: number | null
          sg_putting: number | null
          sg_total: number | null
          slope_rating: number
          three_putts: number | null
          total_anchor_mode: string | null
          total_anchor_value: number | null
          total_putts: number
          triple_plus: number
          trust_reasons: string[]
          trust_scored_at: string | null
          trust_status: string
          up_and_down_attempts: number | null
          up_and_down_converted: number | null
          user_id: string | null
        }
        Insert: {
          benchmark_bracket?: string | null
          benchmark_handicap?: number | null
          benchmark_version?: string | null
          birdies: number
          bogeys: number
          calibration_version?: string | null
          course_name: string
          course_rating: number
          created_at?: string
          double_bogeys: number
          eagles: number
          fairway_attempts: number
          fairways_hit?: number | null
          greens_in_regulation?: number | null
          handicap_index: number
          id?: string
          methodology_version?: string | null
          pars: number
          penalty_strokes: number
          played_at: string
          reconciliation_flags?: string[]
          reconciliation_scale_factor?: number | null
          sand_save_attempts?: number | null
          sand_saves?: number | null
          score: number
          sg_approach?: number | null
          sg_around_the_green?: number | null
          sg_off_the_tee?: number | null
          sg_putting?: number | null
          sg_total?: number | null
          slope_rating: number
          three_putts?: number | null
          total_anchor_mode?: string | null
          total_anchor_value?: number | null
          total_putts: number
          triple_plus: number
          trust_reasons?: string[]
          trust_scored_at?: string | null
          trust_status?: string
          up_and_down_attempts?: number | null
          up_and_down_converted?: number | null
          user_id?: string | null
        }
        Update: {
          benchmark_bracket?: string | null
          benchmark_handicap?: number | null
          benchmark_version?: string | null
          birdies?: number
          bogeys?: number
          calibration_version?: string | null
          course_name?: string
          course_rating?: number
          created_at?: string
          double_bogeys?: number
          eagles?: number
          fairway_attempts?: number
          fairways_hit?: number | null
          greens_in_regulation?: number | null
          handicap_index?: number
          id?: string
          methodology_version?: string | null
          pars?: number
          penalty_strokes?: number
          played_at?: string
          reconciliation_flags?: string[]
          reconciliation_scale_factor?: number | null
          sand_save_attempts?: number | null
          sand_saves?: number | null
          score?: number
          sg_approach?: number | null
          sg_around_the_green?: number | null
          sg_off_the_tee?: number | null
          sg_putting?: number | null
          sg_total?: number | null
          slope_rating?: number
          three_putts?: number | null
          total_anchor_mode?: string | null
          total_anchor_value?: number | null
          total_putts?: number
          triple_plus?: number
          trust_reasons?: string[]
          trust_scored_at?: string | null
          trust_status?: string
          up_and_down_attempts?: number | null
          up_and_down_converted?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      sg_shadow_comparisons: {
        Row: {
          anchor_mode: string | null
          calibration_version: string | null
          created_at: string
          id: string
          methodology_v1: string | null
          methodology_v3: string | null
          reconciliation_scale_factor: number | null
          round_id: string | null
          v1_categories: Json | null
          v1_total: number | null
          v3_categories: Json | null
          v3_total: number | null
        }
        Insert: {
          anchor_mode?: string | null
          calibration_version?: string | null
          created_at?: string
          id?: string
          methodology_v1?: string | null
          methodology_v3?: string | null
          reconciliation_scale_factor?: number | null
          round_id?: string | null
          v1_categories?: Json | null
          v1_total?: number | null
          v3_categories?: Json | null
          v3_total?: number | null
        }
        Update: {
          anchor_mode?: string | null
          calibration_version?: string | null
          created_at?: string
          id?: string
          methodology_v1?: string | null
          methodology_v3?: string | null
          reconciliation_scale_factor?: number | null
          round_id?: string | null
          v1_categories?: Json | null
          v1_total?: number | null
          v3_categories?: Json | null
          v3_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sg_shadow_comparisons_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

