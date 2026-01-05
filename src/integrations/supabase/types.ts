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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          center_id: string
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          location: string | null
          name: string
          requires_approval: boolean | null
          start_date: string
          updated_at: string | null
        }
        Insert: {
          center_id: string
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          name: string
          requires_approval?: boolean | null
          start_date: string
          updated_at?: string | null
        }
        Update: {
          center_id?: string
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          name?: string
          requires_approval?: boolean | null
          start_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_approvals: {
        Row: {
          activity_id: string
          approved: boolean | null
          created_at: string | null
          id: string
          notes: string | null
          parent_id: string
          response_date: string | null
          student_id: string
        }
        Insert: {
          activity_id: string
          approved?: boolean | null
          created_at?: string | null
          id?: string
          notes?: string | null
          parent_id: string
          response_date?: string | null
          student_id: string
        }
        Update: {
          activity_id?: string
          approved?: boolean | null
          created_at?: string | null
          id?: string
          notes?: string | null
          parent_id?: string
          response_date?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_approvals_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_approvals_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_approvals_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_halaqat: {
        Row: {
          activity_id: string
          created_at: string | null
          halqa_id: string
          id: string
        }
        Insert: {
          activity_id: string
          created_at?: string | null
          halqa_id: string
          id?: string
        }
        Update: {
          activity_id?: string
          created_at?: string | null
          halqa_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_halaqat_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_halaqat_halqa_id_fkey"
            columns: ["halqa_id"]
            isOneToOne: false
            referencedRelation: "halaqat"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          center_id: string | null
          content: string
          created_at: string | null
          expires_at: string | null
          halqa_id: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          published_at: string | null
          target_roles: Database["public"]["Enums"]["app_role"][] | null
          title: string
        }
        Insert: {
          center_id?: string | null
          content: string
          created_at?: string | null
          expires_at?: string | null
          halqa_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          published_at?: string | null
          target_roles?: Database["public"]["Enums"]["app_role"][] | null
          title: string
        }
        Update: {
          center_id?: string | null
          content?: string
          created_at?: string | null
          expires_at?: string | null
          halqa_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          published_at?: string | null
          target_roles?: Database["public"]["Enums"]["app_role"][] | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_halqa_id_fkey"
            columns: ["halqa_id"]
            isOneToOne: false
            referencedRelation: "halaqat"
            referencedColumns: ["id"]
          },
        ]
      }
      badge_settings: {
        Row: {
          created_at: string | null
          description: string | null
          icon_name: string | null
          id: string
          is_active: boolean | null
          name: string
          points_value: number
          requirements_type: string
          requirements_value: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          points_value?: number
          requirements_type: string
          requirements_value?: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          points_value?: number
          requirements_type?: string
          requirements_value?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      centers: {
        Row: {
          created_at: string | null
          description: string | null
          email: string | null
          id: string
          is_active: boolean | null
          location: string | null
          logo_url: string | null
          name: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          logo_url?: string | null
          name: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      course_registrations: {
        Row: {
          certificate_issued: boolean | null
          course_id: string
          created_at: string | null
          id: string
          registration_date: string | null
          status: string | null
          student_id: string
        }
        Insert: {
          certificate_issued?: boolean | null
          course_id: string
          created_at?: string | null
          id?: string
          registration_date?: string | null
          status?: string | null
          student_id: string
        }
        Update: {
          certificate_issued?: boolean | null
          course_id?: string
          created_at?: string | null
          id?: string
          registration_date?: string | null
          status?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_registrations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_registrations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          center_id: string
          created_at: string | null
          description: string | null
          end_date: string
          id: string
          is_active: boolean | null
          max_participants: number | null
          name: string
          start_date: string
          supervisor_id: string | null
          updated_at: string | null
        }
        Insert: {
          center_id: string
          created_at?: string | null
          description?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          max_participants?: number | null
          name: string
          start_date: string
          supervisor_id?: string | null
          updated_at?: string | null
        }
        Update: {
          center_id?: string
          created_at?: string | null
          description?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          max_participants?: number | null
          name?: string
          start_date?: string
          supervisor_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_payments: {
        Row: {
          amount_paid: number
          created_at: string | null
          fee_id: string
          id: string
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          student_id: string
        }
        Insert: {
          amount_paid: number
          created_at?: string | null
          fee_id: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          student_id: string
        }
        Update: {
          amount_paid?: number
          created_at?: string | null
          fee_id?: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_payments_fee_id_fkey"
            columns: ["fee_id"]
            isOneToOne: false
            referencedRelation: "fees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      fees: {
        Row: {
          amount: number
          center_id: string
          created_at: string | null
          description: string | null
          due_date: string | null
          halqa_id: string | null
          id: string
          is_active: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          center_id: string
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          halqa_id?: string | null
          id?: string
          is_active?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          center_id?: string
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          halqa_id?: string | null
          id?: string
          is_active?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fees_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fees_halqa_id_fkey"
            columns: ["halqa_id"]
            isOneToOne: false
            referencedRelation: "halaqat"
            referencedColumns: ["id"]
          },
        ]
      }
      halaqat: {
        Row: {
          category: string | null
          center_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          max_students: number | null
          name: string
          teacher_id: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          center_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_students?: number | null
          name: string
          teacher_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          center_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_students?: number | null
          name?: string
          teacher_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "halaqat_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "halaqat_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      halqa_badges: {
        Row: {
          badge_name: string
          description: string | null
          earned_at: string | null
          halqa_id: string
          id: string
          points_value: number | null
        }
        Insert: {
          badge_name: string
          description?: string | null
          earned_at?: string | null
          halqa_id: string
          id?: string
          points_value?: number | null
        }
        Update: {
          badge_name?: string
          description?: string | null
          earned_at?: string | null
          halqa_id?: string
          id?: string
          points_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "halqa_badges_halqa_id_fkey"
            columns: ["halqa_id"]
            isOneToOne: false
            referencedRelation: "halaqat"
            referencedColumns: ["id"]
          },
        ]
      }
      halqa_points: {
        Row: {
          created_at: string | null
          halqa_id: string
          id: string
          points: number
          reason: string
        }
        Insert: {
          created_at?: string | null
          halqa_id: string
          id?: string
          points?: number
          reason: string
        }
        Update: {
          created_at?: string | null
          halqa_id?: string
          id?: string
          points?: number
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "halqa_points_halqa_id_fkey"
            columns: ["halqa_id"]
            isOneToOne: false
            referencedRelation: "halaqat"
            referencedColumns: ["id"]
          },
        ]
      }
      halqa_purchase_votes: {
        Row: {
          created_at: string | null
          ends_at: string | null
          halqa_id: string
          id: string
          initiated_by: string
          required_votes: number
          status: string | null
          store_item_id: string
          total_students: number
          votes_against: number | null
          votes_for: number | null
        }
        Insert: {
          created_at?: string | null
          ends_at?: string | null
          halqa_id: string
          id?: string
          initiated_by: string
          required_votes: number
          status?: string | null
          store_item_id: string
          total_students: number
          votes_against?: number | null
          votes_for?: number | null
        }
        Update: {
          created_at?: string | null
          ends_at?: string | null
          halqa_id?: string
          id?: string
          initiated_by?: string
          required_votes?: number
          status?: string | null
          store_item_id?: string
          total_students?: number
          votes_against?: number | null
          votes_for?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "halqa_purchase_votes_halqa_id_fkey"
            columns: ["halqa_id"]
            isOneToOne: false
            referencedRelation: "halaqat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "halqa_purchase_votes_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "halqa_purchase_votes_store_item_id_fkey"
            columns: ["store_item_id"]
            isOneToOne: false
            referencedRelation: "store_items"
            referencedColumns: ["id"]
          },
        ]
      }
      holiday_attendance: {
        Row: {
          attended: boolean | null
          created_at: string | null
          holiday_id: string
          id: string
          marked_at: string | null
          marked_by: string | null
          notes: string | null
          parent_approved: boolean | null
          parent_id: string | null
          parent_response_date: string | null
          student_id: string
        }
        Insert: {
          attended?: boolean | null
          created_at?: string | null
          holiday_id: string
          id?: string
          marked_at?: string | null
          marked_by?: string | null
          notes?: string | null
          parent_approved?: boolean | null
          parent_id?: string | null
          parent_response_date?: string | null
          student_id: string
        }
        Update: {
          attended?: boolean | null
          created_at?: string | null
          holiday_id?: string
          id?: string
          marked_at?: string | null
          marked_by?: string | null
          notes?: string | null
          parent_approved?: boolean | null
          parent_id?: string | null
          parent_response_date?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "holiday_attendance_holiday_id_fkey"
            columns: ["holiday_id"]
            isOneToOne: false
            referencedRelation: "holidays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holiday_attendance_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holiday_attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      holiday_halaqat: {
        Row: {
          created_at: string | null
          halqa_id: string
          holiday_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          halqa_id: string
          holiday_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          halqa_id?: string
          holiday_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "holiday_halaqat_halqa_id_fkey"
            columns: ["halqa_id"]
            isOneToOne: false
            referencedRelation: "halaqat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holiday_halaqat_holiday_id_fkey"
            columns: ["holiday_id"]
            isOneToOne: false
            referencedRelation: "holidays"
            referencedColumns: ["id"]
          },
        ]
      }
      holidays: {
        Row: {
          center_id: string | null
          created_at: string | null
          end_date: string
          id: string
          is_recurring: boolean | null
          name: string
          reason: string | null
          start_date: string
        }
        Insert: {
          center_id?: string | null
          created_at?: string | null
          end_date: string
          id?: string
          is_recurring?: boolean | null
          name: string
          reason?: string | null
          start_date: string
        }
        Update: {
          center_id?: string | null
          created_at?: string | null
          end_date?: string
          id?: string
          is_recurring?: boolean | null
          name?: string
          reason?: string | null
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "holidays_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_read: boolean | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      parents: {
        Row: {
          created_at: string | null
          full_name: string
          id: string
          phone: string
          updated_at: string | null
          user_id: string | null
          work: string | null
        }
        Insert: {
          created_at?: string | null
          full_name: string
          id?: string
          phone: string
          updated_at?: string | null
          user_id?: string | null
          work?: string | null
        }
        Update: {
          created_at?: string | null
          full_name?: string
          id?: string
          phone?: string
          updated_at?: string | null
          user_id?: string | null
          work?: string | null
        }
        Relationships: []
      }
      points_conversions: {
        Row: {
          amount: number
          conversion_type: string
          created_at: string | null
          id: string
          result: number
          student_id: string
        }
        Insert: {
          amount: number
          conversion_type: string
          created_at?: string | null
          id?: string
          result: number
          student_id: string
        }
        Update: {
          amount?: number
          conversion_type?: string
          created_at?: string | null
          id?: string
          result?: number
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_conversions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name: string
          id: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string | null
          device_id: string | null
          id: string
          is_active: boolean | null
          platform: string
          token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_id?: string | null
          id?: string
          is_active?: boolean | null
          platform: string
          token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_id?: string | null
          id?: string
          is_active?: boolean | null
          platform?: string
          token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      recitations: {
        Row: {
          created_at: string | null
          from_ayah: number
          grade: number | null
          id: string
          notes: string | null
          report_entry_id: string
          surah: string
          to_ayah: number
          type: Database["public"]["Enums"]["recitation_type"]
        }
        Insert: {
          created_at?: string | null
          from_ayah: number
          grade?: number | null
          id?: string
          notes?: string | null
          report_entry_id: string
          surah: string
          to_ayah: number
          type: Database["public"]["Enums"]["recitation_type"]
        }
        Update: {
          created_at?: string | null
          from_ayah?: number
          grade?: number | null
          id?: string
          notes?: string | null
          report_entry_id?: string
          surah?: string
          to_ayah?: number
          type?: Database["public"]["Enums"]["recitation_type"]
        }
        Relationships: [
          {
            foreignKeyName: "recitations_report_entry_id_fkey"
            columns: ["report_entry_id"]
            isOneToOne: false
            referencedRelation: "report_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      report_entries: {
        Row: {
          attendance_status:
            | Database["public"]["Enums"]["attendance_status"]
            | null
          created_at: string | null
          id: string
          notes: string | null
          report_id: string
          student_id: string
        }
        Insert: {
          attendance_status?:
            | Database["public"]["Enums"]["attendance_status"]
            | null
          created_at?: string | null
          id?: string
          notes?: string | null
          report_id: string
          student_id: string
        }
        Update: {
          attendance_status?:
            | Database["public"]["Enums"]["attendance_status"]
            | null
          created_at?: string | null
          id?: string
          notes?: string | null
          report_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_entries_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_entries_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string | null
          halqa_id: string
          id: string
          report_date: string
          review_notes: string | null
          reviewer_id: string | null
          status: string | null
          teacher_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          halqa_id: string
          id?: string
          report_date: string
          review_notes?: string | null
          reviewer_id?: string | null
          status?: string | null
          teacher_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          halqa_id?: string
          id?: string
          report_date?: string
          review_notes?: string | null
          reviewer_id?: string | null
          status?: string | null
          teacher_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_halqa_id_fkey"
            columns: ["halqa_id"]
            isOneToOne: false
            referencedRelation: "halaqat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      store_items: {
        Row: {
          badges_cost: number | null
          center_id: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          item_type: string
          name: string
          points_cost: number | null
          stock_quantity: number | null
          updated_at: string | null
        }
        Insert: {
          badges_cost?: number | null
          center_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          item_type?: string
          name: string
          points_cost?: number | null
          stock_quantity?: number | null
          updated_at?: string | null
        }
        Update: {
          badges_cost?: number | null
          center_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          item_type?: string
          name?: string
          points_cost?: number | null
          stock_quantity?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_items_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      student_badges: {
        Row: {
          badge_setting_id: string
          earned_at: string | null
          earned_date: string | null
          id: string
          notes: string | null
          student_id: string
        }
        Insert: {
          badge_setting_id: string
          earned_at?: string | null
          earned_date?: string | null
          id?: string
          notes?: string | null
          student_id: string
        }
        Update: {
          badge_setting_id?: string
          earned_at?: string | null
          earned_date?: string | null
          id?: string
          notes?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_badges_badge_setting_id_fkey"
            columns: ["badge_setting_id"]
            isOneToOne: false
            referencedRelation: "badge_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_badges_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_parents: {
        Row: {
          created_at: string | null
          id: string
          parent_id: string
          relationship: string | null
          student_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          parent_id: string
          relationship?: string | null
          student_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          parent_id?: string
          relationship?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_parents_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_parents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_points: {
        Row: {
          created_at: string | null
          id: string
          points: number
          reason: string
          recitation_id: string | null
          report_entry_id: string | null
          student_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          points?: number
          reason: string
          recitation_id?: string | null
          report_entry_id?: string | null
          student_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          points?: number
          reason?: string
          recitation_id?: string | null
          report_entry_id?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_points_recitation_id_fkey"
            columns: ["recitation_id"]
            isOneToOne: false
            referencedRelation: "recitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_points_report_entry_id_fkey"
            columns: ["report_entry_id"]
            isOneToOne: false
            referencedRelation: "report_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_points_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_purchases: {
        Row: {
          badges_spent: number | null
          delivered_at: string | null
          id: string
          points_spent: number | null
          purchased_at: string | null
          status: string | null
          store_item_id: string
          student_id: string
        }
        Insert: {
          badges_spent?: number | null
          delivered_at?: string | null
          id?: string
          points_spent?: number | null
          purchased_at?: string | null
          status?: string | null
          store_item_id: string
          student_id: string
        }
        Update: {
          badges_spent?: number | null
          delivered_at?: string | null
          id?: string
          points_spent?: number | null
          purchased_at?: string | null
          status?: string | null
          store_item_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_purchases_store_item_id_fkey"
            columns: ["store_item_id"]
            isOneToOne: false
            referencedRelation: "store_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_purchases_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_votes: {
        Row: {
          id: string
          student_id: string
          vote: boolean
          vote_id: string
          voted_at: string | null
        }
        Insert: {
          id?: string
          student_id: string
          vote: boolean
          vote_id: string
          voted_at?: string | null
        }
        Update: {
          id?: string
          student_id?: string
          vote?: boolean
          vote_id?: string
          voted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_votes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_votes_vote_id_fkey"
            columns: ["vote_id"]
            isOneToOne: false
            referencedRelation: "halqa_purchase_votes"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          birth_date: string | null
          center_id: string
          created_at: string | null
          current_residence: string | null
          full_name: string
          halqa_id: string | null
          id: string
          is_active: boolean | null
          join_date: string | null
          notes: string | null
          phone: string | null
          photo_url: string | null
          previous_memorization_ayah: number | null
          previous_memorization_surah: string | null
          previous_residence: string | null
          province: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          birth_date?: string | null
          center_id: string
          created_at?: string | null
          current_residence?: string | null
          full_name: string
          halqa_id?: string | null
          id?: string
          is_active?: boolean | null
          join_date?: string | null
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          previous_memorization_ayah?: number | null
          previous_memorization_surah?: string | null
          previous_residence?: string | null
          province?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          birth_date?: string | null
          center_id?: string
          created_at?: string | null
          current_residence?: string | null
          full_name?: string
          halqa_id?: string | null
          id?: string
          is_active?: boolean | null
          join_date?: string | null
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          previous_memorization_ayah?: number | null
          previous_memorization_surah?: string | null
          previous_residence?: string | null
          province?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_halqa_id_fkey"
            columns: ["halqa_id"]
            isOneToOne: false
            referencedRelation: "halaqat"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          key: string
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          center_id: string | null
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          center_id?: string | null
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          center_id?: string | null
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_recitation_points: {
        Args: {
          _from_ayah: number
          _grade: number
          _recitation_type: string
          _to_ayah: number
        }
        Returns: number
      }
      can_access_center: {
        Args: { _center_id: string; _user_id: string }
        Returns: boolean
      }
      get_attendance_points: { Args: { _status: string }; Returns: number }
      get_center_halaqat_counts: {
        Args: never
        Returns: {
          center_id: string
          halaqat_count: number
        }[]
      }
      get_center_student_counts: {
        Args: never
        Returns: {
          center_id: string
          student_count: number
        }[]
      }
      get_halqa_center_id: { Args: { _halqa_id: string }; Returns: string }
      get_halqa_total_points: { Args: { _halqa_id: string }; Returns: number }
      get_student_available_badges: {
        Args: { _student_id: string }
        Returns: number
      }
      get_student_available_points: {
        Args: { _student_id: string }
        Returns: number
      }
      get_student_center_id: { Args: { _student_id: string }; Returns: string }
      get_student_points_details: {
        Args: { _student_id: string }
        Returns: {
          created_at: string
          id: string
          points: number
          reason: string
        }[]
      }
      get_student_total_points: {
        Args: { _student_id: string }
        Returns: number
      }
      get_user_center_ids: { Args: { _user_id: string }; Returns: string[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "center_admin"
        | "teacher"
        | "communication_officer"
        | "parent"
        | "student"
      attendance_status:
        | "present"
        | "absent"
        | "absent_with_permission"
        | "escaped"
      recitation_type: "new_memorization" | "review" | "recitation" | "talqeen"
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
      app_role: [
        "super_admin",
        "center_admin",
        "teacher",
        "communication_officer",
        "parent",
        "student",
      ],
      attendance_status: [
        "present",
        "absent",
        "absent_with_permission",
        "escaped",
      ],
      recitation_type: ["new_memorization", "review", "recitation", "talqeen"],
    },
  },
} as const
