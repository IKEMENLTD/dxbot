// ===== Supabase Database 型定義 =====
// 設計書 v5.3 DDL に基づく

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
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
        };
        Insert: {
          id?: string;
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
        };
        Update: {
          id?: string;
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
          type: 'step_completed' | 'stumble' | 'step_skipped' | 'cta_fired' | 'status_change' | 'techstars_start' | 'techstars_complete' | 'rediagnosis' | 'deal_created' | 'note_added';
          description: string;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'step_completed' | 'stumble' | 'step_skipped' | 'cta_fired' | 'status_change' | 'techstars_start' | 'techstars_complete' | 'rediagnosis' | 'deal_created' | 'note_added';
          description: string;
          metadata?: Record<string, unknown>;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: 'step_completed' | 'stumble' | 'step_skipped' | 'cta_fired' | 'status_change' | 'techstars_start' | 'techstars_complete' | 'rediagnosis' | 'deal_created' | 'note_added';
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
    };
    Views: {
      hot_users_view: {
        Row: {
          id: string;
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
