/**
 * Hand-maintained subset of the Supabase generated types.
 *
 * Keep in sync with `supabase/migrations/*.sql`.
 * To regenerate fully, run:
 *   npx supabase gen types typescript --project-id <PROJECT_ID> > src/types/database.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "admin" | "user";

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string;
          role?: UserRole;
          updated_at?: string;
        };
      };
      user_profiles: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      advent_days: {
        Row: {
          id: string;
          day_number: number;
          title: string;
          description: string;
          unlock_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          day_number: number;
          title: string;
          description: string;
          unlock_date: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          day_number?: number;
          title?: string;
          description?: string;
          unlock_date?: string;
          updated_at?: string;
        };
      };
      village_locations: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string;
          position_x: number;
          position_y: number;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description: string;
          position_x: number;
          position_y: number;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          slug?: string;
          name?: string;
          description?: string;
          position_x?: number;
          position_y?: number;
          sort_order?: number;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      village_hotspots: {
        Row: {
          id: string;
          location_id: string;
          slug: string;
          name: string;
          kind: string;
          position_x: number;
          position_y: number;
          day_number: number | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          location_id: string;
          slug: string;
          name: string;
          kind: string;
          position_x: number;
          position_y: number;
          day_number?: number | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          location_id?: string;
          slug?: string;
          name?: string;
          kind?: string;
          position_x?: number;
          position_y?: number;
          day_number?: number | null;
          sort_order?: number;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      village_hotspot_messages: {
        Row: {
          id: string;
          hotspot_id: string;
          hint: string;
          nico_message: string;
          nico_expression: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          hotspot_id: string;
          hint?: string;
          nico_message?: string;
          nico_expression?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          hotspot_id?: string;
          hint?: string;
          nico_message?: string;
          nico_expression?: string;
          updated_at?: string;
        };
      };
      physical_contents: {
        Row: {
          id: string;
          hotspot_id: string | null;
          day_number: number;
          kind: string;
          title: string;
          content: string;
          password_required: boolean;
          password_hint: string | null;
          sort_order: number;
          is_active: boolean;
          image_url: string | null;
          admin_notes: string;
          success_message: string;
          activation_conditions: Json;
          category: string;
          rarity: string;
          special_description: string;
          show_silhouette: boolean;
          clue_group: string | null;
          related_content_ids: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          hotspot_id?: string | null;
          day_number: number;
          kind: string;
          title: string;
          content?: string;
          password_required?: boolean;
          password_hint?: string | null;
          sort_order?: number;
          is_active?: boolean;
          image_url?: string | null;
          admin_notes?: string;
          success_message?: string;
          activation_conditions?: Json;
          category?: string;
          rarity?: string;
          special_description?: string;
          show_silhouette?: boolean;
          clue_group?: string | null;
          related_content_ids?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          hotspot_id?: string | null;
          day_number?: number;
          kind?: string;
          title?: string;
          content?: string;
          password_required?: boolean;
          password_hint?: string | null;
          sort_order?: number;
          is_active?: boolean;
          image_url?: string | null;
          admin_notes?: string;
          success_message?: string;
          activation_conditions?: Json;
          category?: string;
          rarity?: string;
          special_description?: string;
          show_silhouette?: boolean;
          clue_group?: string | null;
          related_content_ids?: Json;
          updated_at?: string;
        };
      };
      physical_gifts: {
        Row: {
          id: string;
          location_id: string;
          day_number: number;
          name: string;
          description: string;
          image_url: string | null;
          preparation_status: string;
          admin_notes: string;
          delivery_instructions: string;
          is_active: boolean;
          sort_order: number;
          category: string;
          rarity: string;
          special_description: string;
          show_silhouette: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          location_id: string;
          day_number: number;
          name: string;
          description: string;
          image_url?: string | null;
          preparation_status?: string;
          admin_notes?: string;
          delivery_instructions?: string;
          is_active?: boolean;
          sort_order?: number;
          category?: string;
          rarity?: string;
          special_description?: string;
          show_silhouette?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          location_id?: string;
          day_number?: number;
          name?: string;
          description?: string;
          image_url?: string | null;
          preparation_status?: string;
          admin_notes?: string;
          delivery_instructions?: string;
          is_active?: boolean;
          sort_order?: number;
          category?: string;
          rarity?: string;
          special_description?: string;
          show_silhouette?: boolean;
          updated_at?: string;
        };
      };
      gift_symbols: {
        Row: {
          id: string;
          gift_id: string;
          symbol: string;
          description: string;
          image_url: string | null;
          day_number: number | null;
          location_id: string | null;
          discovery_conditions: Json;
          is_active: boolean;
          category: string;
          rarity: string;
          show_silhouette: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          gift_id: string;
          symbol: string;
          description?: string;
          image_url?: string | null;
          day_number?: number | null;
          location_id?: string | null;
          discovery_conditions?: Json;
          is_active?: boolean;
          category?: string;
          rarity?: string;
          show_silhouette?: boolean;
          created_at?: string;
        };
        Update: {
          gift_id?: string;
          symbol?: string;
          description?: string;
          image_url?: string | null;
          day_number?: number | null;
          location_id?: string | null;
          discovery_conditions?: Json;
          is_active?: boolean;
          category?: string;
          rarity?: string;
          show_silhouette?: boolean;
        };
      };
      elf_messages: {
        Row: {
          id: string;
          day_number: number;
          author: string;
          message: string;
          is_active: boolean;
          scheduled_for: string | null;
          event_key: string | null;
          image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          day_number: number;
          author: string;
          message: string;
          is_active?: boolean;
          scheduled_for?: string | null;
          event_key?: string | null;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          day_number?: number;
          author?: string;
          message?: string;
          is_active?: boolean;
          scheduled_for?: string | null;
          event_key?: string | null;
          image_url?: string | null;
          updated_at?: string;
        };
      };
      secret_messages: {
        Row: {
          id: string;
          user_id: string;
          day_number: number;
          content: string;
          author: string;
          is_active: boolean;
          scheduled_for: string | null;
          event_key: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          day_number: number;
          content: string;
          author?: string;
          is_active?: boolean;
          scheduled_for?: string | null;
          event_key?: string | null;
          created_at?: string;
        };
        Update: {
          content?: string;
          author?: string;
          is_active?: boolean;
          scheduled_for?: string | null;
          event_key?: string | null;
        };
      };
      quizzes: {
        Row: {
          id: string;
          day_number: number;
          question: string;
          location_id: string | null;
          hint: string;
          points: number;
          is_required: boolean;
          is_active: boolean;
          unlock_conditions: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          day_number: number;
          question: string;
          location_id?: string | null;
          hint?: string;
          points?: number;
          is_required?: boolean;
          is_active?: boolean;
          unlock_conditions?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          day_number?: number;
          question?: string;
          location_id?: string | null;
          hint?: string;
          points?: number;
          is_required?: boolean;
          is_active?: boolean;
          unlock_conditions?: Json;
          updated_at?: string;
        };
      };
      quiz_answers: {
        Row: {
          id: string;
          quiz_id: string;
          answer_text: string;
          is_correct: boolean;
          hint: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          quiz_id: string;
          answer_text: string;
          is_correct: boolean;
          hint?: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          answer_text?: string;
          is_correct?: boolean;
          hint?: string;
          sort_order?: number;
          is_active?: boolean;
        };
      };
      user_quiz_attempts: {
        Row: {
          id: string;
          user_id: string;
          quiz_id: string;
          selected_answer_id: string | null;
          is_correct: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          quiz_id: string;
          selected_answer_id?: string | null;
          is_correct: boolean;
          created_at?: string;
        };
        Update: Record<string, never>;
      };
      user_openings: {
        Row: {
          id: string;
          user_id: string;
          day_number: number;
          opened_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          day_number: number;
          opened_at?: string;
        };
        Update: Record<string, never>;
      };
      user_photos: {
        Row: {
          id: string;
          user_id: string;
          day_number: number;
          storage_path: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          day_number: number;
          storage_path: string;
          created_at?: string;
        };
        Update: Record<string, never>;
      };
      memory_spheres: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          note: string | null;
          photo_url: string | null;
          day_number: number | null;
          location_id: string | null;
          is_unlocked: boolean;
          unlocked_at: string | null;
          discovered_at: string | null;
          sort_order: number;
          activation_conditions: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          note?: string | null;
          photo_url?: string | null;
          day_number?: number | null;
          location_id?: string | null;
          is_unlocked?: boolean;
          unlocked_at?: string | null;
          discovered_at?: string | null;
          sort_order?: number;
          activation_conditions?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          note?: string | null;
          photo_url?: string | null;
          day_number?: number | null;
          location_id?: string | null;
          is_unlocked?: boolean;
          unlocked_at?: string | null;
          discovered_at?: string | null;
          sort_order?: number;
          activation_conditions?: Json;
          updated_at?: string;
        };
      };
      notification_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          keys_p256dh: string;
          keys_auth: string;
          user_agent: string;
          platform: string;
          is_active: boolean;
          last_seen_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          keys_p256dh: string;
          keys_auth: string;
          user_agent?: string;
          platform?: string;
          is_active?: boolean;
          last_seen_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          keys_p256dh?: string;
          keys_auth?: string;
          user_agent?: string;
          platform?: string;
          is_active?: boolean;
          last_seen_at?: string;
          updated_at?: string;
        };
      };
      notification_preferences: {
        Row: {
          user_id: string;
          enabled: boolean;
          daily_reminders: boolean;
          reminder: boolean;
          clues: boolean;
          quizzes: boolean;
          special: boolean;
          finale: boolean;
          preferred_time: string;
          quiet_hours_start: string;
          quiet_hours_end: string;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          enabled?: boolean;
          daily_reminders?: boolean;
          reminder?: boolean;
          clues?: boolean;
          quizzes?: boolean;
          special?: boolean;
          finale?: boolean;
          preferred_time?: string;
          quiet_hours_start?: string;
          quiet_hours_end?: string;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          enabled?: boolean;
          daily_reminders?: boolean;
          reminder?: boolean;
          clues?: boolean;
          quizzes?: boolean;
          special?: boolean;
          finale?: boolean;
          preferred_time?: string;
          quiet_hours_start?: string;
          quiet_hours_end?: string;
          timezone?: string;
          updated_at?: string;
        };
      };
      notification_deliveries: {
        Row: {
          id: string;
          notification_id: string | null;
          user_id: string;
          subscription_id: string | null;
          kind: string;
          title: string;
          dedupe_key: string;
          status: string;
          attempts: number;
          error: string | null;
          sent_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          notification_id?: string | null;
          user_id: string;
          subscription_id?: string | null;
          kind: string;
          title?: string;
          dedupe_key: string;
          status?: string;
          attempts?: number;
          error?: string | null;
          sent_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: string;
          attempts?: number;
          error?: string | null;
          sent_at?: string | null;
          updated_at?: string;
        };
      };
      app_settings: {
        Row: {
          id: string;
          key: string;
          value: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          value: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          value?: Json;
          updated_at?: string;
        };
      };
      physical_passwords: {
        Row: {
          id: string;
          content_id: string;
          password_hash: string;
          hint: string;
          success_message: string;
          max_attempts: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          content_id: string;
          password_hash: string;
          hint?: string;
          success_message?: string;
          max_attempts?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          password_hash?: string;
          hint?: string;
          success_message?: string;
          max_attempts?: number | null;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      password_attempts: {
        Row: {
          id: string;
          user_id: string;
          content_id: string;
          success: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          content_id: string;
          success?: boolean;
          created_at?: string;
        };
        Update: Record<string, never>;
      };
      password_completions: {
        Row: {
          user_id: string;
          content_id: string;
          completed_at: string;
        };
        Insert: {
          user_id: string;
          content_id: string;
          completed_at?: string;
        };
        Update: Record<string, never>;
      };
      final_box_completions: {
        Row: {
          user_id: string;
          box_id: string;
          completed_at: string;
        };
        Insert: {
          user_id: string;
          box_id: string;
          completed_at?: string;
        };
        Update: Record<string, never>;
      };
      final_gift_boxes: {
        Row: {
          id: string;
          name: string;
          description: string;
          image_url: string | null;
          shape: string;
          color: string;
          decorations: Json;
          symbol: string | null;
          intro_message: string;
          clues: Json;
          objects: Json;
          password_enabled: boolean;
          password_hash: string | null;
          password_hint: string;
          opening_sequence: Json;
          final_message: string;
          reveal_day: number;
          physical_gift_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name?: string;
          description?: string;
          image_url?: string | null;
          shape?: string;
          color?: string;
          decorations?: Json;
          symbol?: string | null;
          intro_message?: string;
          clues?: Json;
          objects?: Json;
          password_enabled?: boolean;
          password_hash?: string | null;
          password_hint?: string;
          opening_sequence?: Json;
          final_message?: string;
          reveal_day?: number;
          physical_gift_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string;
          image_url?: string | null;
          shape?: string;
          color?: string;
          decorations?: Json;
          symbol?: string | null;
          intro_message?: string;
          clues?: Json;
          objects?: Json;
          password_enabled?: boolean;
          password_hash?: string | null;
          password_hint?: string;
          opening_sequence?: Json;
          final_message?: string;
          reveal_day?: number;
          physical_gift_id?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      scheduled_notifications: {
        Row: {
          id: string;
          day_number: number | null;
          title: string;
          body: string;
          scheduled_for: string | null;
          event_key: string | null;
          conditions: Json;
          kind: string;
          url: string;
          audience: string;
          target_user_id: string | null;
          dedupe_key: string | null;
          status: string;
          attempts: number;
          recipients_count: number;
          sent_at: string | null;
          last_error: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          day_number?: number | null;
          title: string;
          body: string;
          scheduled_for?: string | null;
          event_key?: string | null;
          conditions?: Json;
          kind?: string;
          url?: string;
          audience?: string;
          target_user_id?: string | null;
          dedupe_key?: string | null;
          status?: string;
          attempts?: number;
          recipients_count?: number;
          sent_at?: string | null;
          last_error?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          day_number?: number | null;
          title?: string;
          body?: string;
          scheduled_for?: string | null;
          event_key?: string | null;
          conditions?: Json;
          kind?: string;
          url?: string;
          audience?: string;
          target_user_id?: string | null;
          dedupe_key?: string | null;
          status?: string;
          attempts?: number;
          recipients_count?: number;
          sent_at?: string | null;
          last_error?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      admin_date_simulations: {
        Row: {
          admin_id: string;
          simulated_date: string | null;
          note: string;
          is_active: boolean;
          updated_at: string;
        };
        Insert: {
          admin_id: string;
          simulated_date?: string | null;
          note?: string;
          is_active?: boolean;
          updated_at?: string;
        };
        Update: {
          simulated_date?: string | null;
          note?: string;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      memory_entries: {
        Row: {
          id: string;
          placement: string;
          kind: string;
          title: string;
          description: string;
          content: string;
          image_url: string | null;
          day_number: number | null;
          related_content_id: string | null;
          activation_conditions: Json;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          placement?: string;
          kind?: string;
          title: string;
          description?: string;
          content?: string;
          image_url?: string | null;
          day_number?: number | null;
          related_content_id?: string | null;
          activation_conditions?: Json;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          placement?: string;
          kind?: string;
          title?: string;
          description?: string;
          content?: string;
          image_url?: string | null;
          day_number?: number | null;
          related_content_id?: string | null;
          activation_conditions?: Json;
          is_active?: boolean;
          sort_order?: number;
          updated_at?: string;
        };
      };
      diary_events: {
        Row: {
          id: string;
          user_id: string;
          event_key: string;
          category: string;
          title: string;
          description: string;
          day_number: number | null;
          image_url: string | null;
          source_type: string | null;
          source_id: string | null;
          occurred_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_key: string;
          category: string;
          title: string;
          description?: string;
          day_number?: number | null;
          image_url?: string | null;
          source_type?: string | null;
          source_id?: string | null;
          occurred_at?: string;
          created_at?: string;
        };
        Update: Record<string, never>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export type Tables = Database["public"]["Tables"];
export type Row<T extends keyof Tables> = Tables[T]["Row"];
export type InsertRow<T extends keyof Tables> = Tables[T]["Insert"];
