// ===== Supabase Database 型定義 =====
// 設計書 v5.3 DDL に基づく

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          line_user_id: string | null;
          preferred_name: string;
          company_name: string;
          industry: string;
          level: number;
          score: number;
          recommended_exit: 'techstars' | 'taskmate' | 'veteran_ai' | 'custom_dev';
          customer_status: 'prospect' | 'contacted' | 'meeting' | 'customer' | 'churned' | 'techstars_active' | 'techstars_grad';
          lead_source: 'apo' | 'threads' | 'x' | 'instagram' | 'referral' | 'other';
          lead_note: string | null;
          axis_scores: { a1: number; a2: number; b: number; c: number; d: number };
          prev_scores: { a1: number; a2: number; b: number; c: number; d: number } | null;
          weak_axis: string;
          badges: string[];
          last_action_at: string;
          last_completed_step: string | null;
          steps_completed: number;
          stumble_count: number;
          stumble_how_count: number;
          created_at: string;
          techstars_started_at: string | null;
          techstars_completed_at: string | null;
          paused_until: string | null;
          tracking_link_id: string | null;
          tags: string[];
          profile_picture_url: string | null;
          status_message: string | null;
        };
        Insert: {
          id?: string;
          line_user_id?: string | null;
          preferred_name: string;
          company_name: string;
          industry: string;
          level?: number;
          score?: number;
          recommended_exit?: 'techstars' | 'taskmate' | 'veteran_ai' | 'custom_dev';
          customer_status?: 'prospect' | 'contacted' | 'meeting' | 'customer' | 'churned' | 'techstars_active' | 'techstars_grad';
          lead_source?: 'apo' | 'threads' | 'x' | 'instagram' | 'referral' | 'other';
          lead_note?: string | null;
          axis_scores?: { a1: number; a2: number; b: number; c: number; d: number };
          prev_scores?: { a1: number; a2: number; b: number; c: number; d: number } | null;
          weak_axis?: string;
          badges?: string[];
          last_action_at?: string;
          last_completed_step?: string | null;
          steps_completed?: number;
          stumble_count?: number;
          stumble_how_count?: number;
          techstars_started_at?: string | null;
          techstars_completed_at?: string | null;
          paused_until?: string | null;
          tags?: string[];
          tracking_link_id?: string | null;
          profile_picture_url?: string | null;
          status_message?: string | null;
        };
        Update: {
          id?: string;
          line_user_id?: string | null;
          preferred_name?: string;
          company_name?: string;
          industry?: string;
          level?: number;
          score?: number;
          recommended_exit?: 'techstars' | 'taskmate' | 'veteran_ai' | 'custom_dev';
          customer_status?: 'prospect' | 'contacted' | 'meeting' | 'customer' | 'churned' | 'techstars_active' | 'techstars_grad';
          lead_source?: 'apo' | 'threads' | 'x' | 'instagram' | 'referral' | 'other';
          lead_note?: string | null;
          axis_scores?: { a1: number; a2: number; b: number; c: number; d: number };
          prev_scores?: { a1: number; a2: number; b: number; c: number; d: number } | null;
          weak_axis?: string;
          badges?: string[];
          last_action_at?: string;
          last_completed_step?: string | null;
          steps_completed?: number;
          stumble_count?: number;
          stumble_how_count?: number;
          techstars_started_at?: string | null;
          techstars_completed_at?: string | null;
          paused_until?: string | null;
          tags?: string[];
          tracking_link_id?: string | null;
          profile_picture_url?: string | null;
          status_message?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: '';
            columns: [];
            isOneToOne: false;
            referencedRelation: '';
            referencedColumns: [];
          },
        ];
      };
      tags: {
        Row: {
          id: string;
          label: string;
          color: 'green' | 'orange' | 'gray';
          sort_order: number;
        };
        Insert: {
          id: string;
          label: string;
          color: 'green' | 'orange' | 'gray';
          sort_order?: number;
        };
        Update: {
          id?: string;
          label?: string;
          color?: 'green' | 'orange' | 'gray';
          sort_order?: number;
        };
        Relationships: [];
      };
      deals: {
        Row: {
          id: string;
          user_id: string;
          exit_type: 'techstars' | 'taskmate' | 'veteran_ai' | 'custom_dev';
          deal_amount: number;
          subsidy_amount: number;
          deal_stage: number;
          status: 'active' | 'completed' | 'cancelled';
          started_at: string;
          completed_at: string | null;
          note: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          exit_type: 'techstars' | 'taskmate' | 'veteran_ai' | 'custom_dev';
          deal_amount: number;
          subsidy_amount?: number;
          deal_stage?: number;
          status?: 'active' | 'completed' | 'cancelled';
          started_at?: string;
          completed_at?: string | null;
          note?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          exit_type?: 'techstars' | 'taskmate' | 'veteran_ai' | 'custom_dev';
          deal_amount?: number;
          subsidy_amount?: number;
          deal_stage?: number;
          status?: 'active' | 'completed' | 'cancelled';
          started_at?: string;
          completed_at?: string | null;
          note?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'deals_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      user_steps: {
        Row: {
          id: string;
          user_id: string;
          step_id: string;
          step_name: string;
          status: 'not_started' | 'in_progress' | 'completed' | 'skipped';
          stumble_type: 'how' | 'motivation' | 'time' | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          step_id: string;
          step_name: string;
          status?: 'not_started' | 'in_progress' | 'completed' | 'skipped';
          stumble_type?: 'how' | 'motivation' | 'time' | null;
          started_at?: string | null;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          step_id?: string;
          step_name?: string;
          status?: 'not_started' | 'in_progress' | 'completed' | 'skipped';
          stumble_type?: 'how' | 'motivation' | 'time' | null;
          started_at?: string | null;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'user_steps_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      cta_history: {
        Row: {
          id: string;
          user_id: string;
          trigger: 'action_boost' | 'apo_early' | 'subsidy_timing' | 'lv40_reached' | 'invoice_stumble' | 'it_literacy';
          recommended_exit: 'techstars' | 'taskmate' | 'veteran_ai' | 'custom_dev';
          fired_at: string;
          result: 'pending' | 'clicked' | 'converted' | 'ignored';
        };
        Insert: {
          id?: string;
          user_id: string;
          trigger: 'action_boost' | 'apo_early' | 'subsidy_timing' | 'lv40_reached' | 'invoice_stumble' | 'it_literacy';
          recommended_exit: 'techstars' | 'taskmate' | 'veteran_ai' | 'custom_dev';
          fired_at?: string;
          result?: 'pending' | 'clicked' | 'converted' | 'ignored';
        };
        Update: {
          id?: string;
          user_id?: string;
          trigger?: 'action_boost' | 'apo_early' | 'subsidy_timing' | 'lv40_reached' | 'invoice_stumble' | 'it_literacy';
          recommended_exit?: 'techstars' | 'taskmate' | 'veteran_ai' | 'custom_dev';
          fired_at?: string;
          result?: 'pending' | 'clicked' | 'converted' | 'ignored';
        };
        Relationships: [
          {
            foreignKeyName: 'cta_history_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      user_timeline: {
        Row: {
          id: string;
          user_id: string;
          type: 'step_completed' | 'stumble' | 'step_skipped' | 'cta_fired' | 'status_change' | 'techstars_start' | 'techstars_complete' | 'rediagnosis' | 'deal_created' | 'note_added' | 'reminder_sent';
          description: string;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'step_completed' | 'stumble' | 'step_skipped' | 'cta_fired' | 'status_change' | 'techstars_start' | 'techstars_complete' | 'rediagnosis' | 'deal_created' | 'note_added' | 'reminder_sent';
          description: string;
          metadata?: Record<string, unknown>;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: 'step_completed' | 'stumble' | 'step_skipped' | 'cta_fired' | 'status_change' | 'techstars_start' | 'techstars_complete' | 'rediagnosis' | 'deal_created' | 'note_added' | 'reminder_sent';
          description?: string;
          metadata?: Record<string, unknown>;
        };
        Relationships: [
          {
            foreignKeyName: 'user_timeline_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      chat_messages: {
        Row: {
          id: string;
          user_id: string;
          sender: 'user' | 'admin';
          content: string;
          media_attachments: Record<string, unknown>[];
          read: boolean;
          direction: 'inbound' | 'outbound';
          line_user_id: string | null;
          line_message_id: string | null;
          message_type: 'text' | 'image' | 'sticker' | 'postback';
          sent_at: string;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          sender: 'user' | 'admin';
          content: string;
          media_attachments?: Record<string, unknown>[];
          read?: boolean;
          direction: 'inbound' | 'outbound';
          line_user_id?: string | null;
          line_message_id?: string | null;
          message_type?: 'text' | 'image' | 'sticker' | 'postback';
          sent_at?: string;
          read_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          sender?: 'user' | 'admin';
          content?: string;
          media_attachments?: Record<string, unknown>[];
          read?: boolean;
          direction?: 'inbound' | 'outbound';
          line_user_id?: string | null;
          line_message_id?: string | null;
          message_type?: 'text' | 'image' | 'sticker' | 'postback';
          sent_at?: string;
          read_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'chat_messages_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      conversation_states: {
        Row: {
          line_user_id: string;
          user_id: string | null;
          state: Record<string, unknown>;
          preferred_name: string | null;
          industry: string | null;
          lead_source: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          line_user_id: string;
          user_id?: string | null;
          state: Record<string, unknown>;
          preferred_name?: string | null;
          industry?: string | null;
          lead_source?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          line_user_id?: string;
          user_id?: string | null;
          state?: Record<string, unknown>;
          preferred_name?: string | null;
          industry?: string | null;
          lead_source?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      app_settings: {
        Row: {
          key: string;
          value: Record<string, unknown>;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: Record<string, unknown>;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: Record<string, unknown>;
          updated_at?: string;
        };
        Relationships: [];
      };
      recommend_scores: {
        Row: {
          id: string;
          user_id: string;
          exit_type: 'techstars' | 'taskmate' | 'veteran_ai' | 'custom_dev';
          score: number;
          reason: string;
          calculated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          exit_type: 'techstars' | 'taskmate' | 'veteran_ai' | 'custom_dev';
          score: number;
          reason?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          exit_type?: 'techstars' | 'taskmate' | 'veteran_ai' | 'custom_dev';
          score?: number;
          reason?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'recommend_scores_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      tracking_clicks: {
        Row: {
          id: string;
          tracking_link_id: string;
          device_type: string | null;
          os: string | null;
          browser: string | null;
          referer: string | null;
          utm_source: string | null;
          utm_medium: string | null;
          utm_campaign: string | null;
          utm_content: string | null;
          language: string | null;
          country: string | null;
          clicked_at: string;
        };
        Insert: {
          id?: string;
          tracking_link_id: string;
          device_type?: string | null;
          os?: string | null;
          browser?: string | null;
          referer?: string | null;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          utm_content?: string | null;
          language?: string | null;
          country?: string | null;
          clicked_at?: string;
        };
        Update: {
          id?: string;
          tracking_link_id?: string;
          device_type?: string | null;
          os?: string | null;
          browser?: string | null;
          referer?: string | null;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          utm_content?: string | null;
          language?: string | null;
          country?: string | null;
          clicked_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tracking_clicks_tracking_link_id_fkey';
            columns: ['tracking_link_id'];
            isOneToOne: false;
            referencedRelation: 'tracking_links';
            referencedColumns: ['id'];
          },
        ];
      };
      tracking_links: {
        Row: {
          id: string;
          code: string;
          label: string;
          lead_source: string;
          destination_url: string;
          click_count: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          label: string;
          lead_source: string;
          destination_url: string;
          click_count?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          label?: string;
          lead_source?: string;
          destination_url?: string;
          click_count?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      hot_users_view: {
        Row: {
          id: string;
          line_user_id: string | null;
          preferred_name: string;
          company_name: string;
          industry: string;
          level: number;
          score: number;
          recommended_exit: 'techstars' | 'taskmate' | 'veteran_ai' | 'custom_dev';
          customer_status: 'prospect' | 'contacted' | 'meeting' | 'customer' | 'churned' | 'techstars_active' | 'techstars_grad';
          lead_source: 'apo' | 'threads' | 'x' | 'instagram' | 'referral' | 'other';
          lead_note: string | null;
          axis_scores: { a1: number; a2: number; b: number; c: number; d: number };
          prev_scores: { a1: number; a2: number; b: number; c: number; d: number } | null;
          weak_axis: string;
          badges: string[];
          last_action_at: string;
          last_completed_step: string | null;
          steps_completed: number;
          stumble_count: number;
          stumble_how_count: number;
          created_at: string;
          techstars_started_at: string | null;
          techstars_completed_at: string | null;
          paused_until: string | null;
          profile_picture_url: string | null;
          status_message: string | null;
        };
        Relationships: [];
      };
      weekly_kpi_view: {
        Row: {
          week: string;
          inflow: number;
          diagnosed: number;
          step_started: number;
          cta_fired: number;
          meeting: number;
          converted: number;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
  };
}
