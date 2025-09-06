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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      detailed_ratings: {
        Row: {
          created_at: string
          id: string
          person_id: string
          rating: number
          updated_at: string
          watched_movie_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          person_id: string
          rating: number
          updated_at?: string
          watched_movie_id: string
        }
        Update: {
          created_at?: string
          id?: string
          person_id?: string
          rating?: number
          updated_at?: string
          watched_movie_id?: string
        }
        Relationships: []
      }
      movie_proposals: {
        Row: {
          created_at: string
          director: string | null
          genre: string | null
          id: string
          imdb_id: string | null
          imdb_rating: string | null
          movie_title: string
          person_id: string
          plot: string | null
          poster: string | null
          runtime: string | null
          session_id: string
          year: string | null
        }
        Insert: {
          created_at?: string
          director?: string | null
          genre?: string | null
          id?: string
          imdb_id?: string | null
          imdb_rating?: string | null
          movie_title: string
          person_id: string
          plot?: string | null
          poster?: string | null
          runtime?: string | null
          session_id: string
          year?: string | null
        }
        Update: {
          created_at?: string
          director?: string | null
          genre?: string | null
          id?: string
          imdb_id?: string | null
          imdb_rating?: string | null
          movie_title?: string
          person_id?: string
          plot?: string | null
          poster?: string | null
          runtime?: string | null
          session_id?: string
          year?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movie_proposals_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "session_people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movie_proposals_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "movie_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      movie_ratings: {
        Row: {
          created_at: string
          id: string
          person_id: string
          proposal_id: string | null
          rating: number
          updated_at: string
          watched_movie_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          person_id: string
          proposal_id: string | null
          rating: number
          updated_at?: string
          watched_movie_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          person_id?: string
          proposal_id?: string | null
          rating?: number
          updated_at?: string
          watched_movie_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movie_ratings_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "session_people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movie_ratings_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "movie_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movie_ratings_watched_movie_id_fkey"
            columns: ["watched_movie_id"]
            isOneToOne: false
            referencedRelation: "watched_movies"
            referencedColumns: ["id"]
          }
        ]
      }
      movie_sessions: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      session_people: {
        Row: {
          created_at: string
          id: string
          is_present: boolean
          name: string
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_present?: boolean
          name: string
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_present?: boolean
          name?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_people_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "movie_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      watched_movies: {
        Row: {
          created_at: string
          director: string | null
          genre: string | null
          id: string
          imdb_id: string | null
          imdb_rating: string | null
          movie_title: string
          plot: string | null
          poster: string | null
          proposed_by: string
          runtime: string | null
          session_id: string
          updated_at: string
          watched_at: string
          year: string | null
        }
        Insert: {
          created_at?: string
          director?: string | null
          genre?: string | null
          id?: string
          imdb_id?: string | null
          imdb_rating?: string | null
          movie_title: string
          plot?: string | null
          poster?: string | null
          proposed_by: string
          runtime?: string | null
          session_id: string
          updated_at?: string
          watched_at?: string
          year?: string | null
        }
        Update: {
          created_at?: string
          director?: string | null
          genre?: string | null
          id?: string
          imdb_id?: string | null
          imdb_rating?: string | null
          movie_title?: string
          plot?: string | null
          poster?: string | null
          proposed_by?: string
          runtime?: string | null
          session_id?: string
          updated_at?: string
          watched_at?: string
          year?: string | null
        }
        Relationships: []
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
    : never,
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
    Enums: {},
  },
} as const