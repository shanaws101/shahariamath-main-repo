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
      blog_posts: {
        Row: {
          author_avatar_url: string | null
          author_name: string
          author_name_bn: string | null
          content: string
          content_bn: string | null
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          excerpt_bn: string | null
          id: string
          images: string[] | null
          is_featured: boolean
          is_published: boolean
          keywords: string[] | null
          meta_description: string | null
          meta_description_bn: string | null
          published_at: string | null
          scheduled_for: string | null
          slug: string
          title: string
          title_bn: string | null
          updated_at: string
          view_count: number
        }
        Insert: {
          author_avatar_url?: string | null
          author_name?: string
          author_name_bn?: string | null
          content?: string
          content_bn?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          excerpt_bn?: string | null
          id?: string
          images?: string[] | null
          is_featured?: boolean
          is_published?: boolean
          keywords?: string[] | null
          meta_description?: string | null
          meta_description_bn?: string | null
          published_at?: string | null
          scheduled_for?: string | null
          slug: string
          title: string
          title_bn?: string | null
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_avatar_url?: string | null
          author_name?: string
          author_name_bn?: string | null
          content?: string
          content_bn?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          excerpt_bn?: string | null
          id?: string
          images?: string[] | null
          is_featured?: boolean
          is_published?: boolean
          keywords?: string[] | null
          meta_description?: string | null
          meta_description_bn?: string | null
          published_at?: string | null
          scheduled_for?: string | null
          slug?: string
          title?: string
          title_bn?: string | null
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      bundle_subjects: {
        Row: {
          bundle_id: string
          id: string
          subject_id: string
        }
        Insert: {
          bundle_id: string
          id?: string
          subject_id: string
        }
        Update: {
          bundle_id?: string
          id?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bundle_subjects_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      bundles: {
        Row: {
          cover_image_url: string | null
          created_at: string
          department: string | null
          description: string | null
          description_bn: string | null
          display_order: number
          id: string
          is_visible: boolean
          original_price: number | null
          price: number
          title: string
          title_bn: string | null
          updated_at: string
          year: number | null
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          department?: string | null
          description?: string | null
          description_bn?: string | null
          display_order?: number
          id?: string
          is_visible?: boolean
          original_price?: number | null
          price?: number
          title: string
          title_bn?: string | null
          updated_at?: string
          year?: number | null
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          department?: string | null
          description?: string | null
          description_bn?: string | null
          display_order?: number
          id?: string
          is_visible?: boolean
          original_price?: number | null
          price?: number
          title?: string
          title_bn?: string | null
          updated_at?: string
          year?: number | null
        }
        Relationships: []
      }
      carousel_banners: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image_url: string
          is_visible: boolean
          link_url: string | null
          title: string | null
          title_bn: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          is_visible?: boolean
          link_url?: string | null
          title?: string | null
          title_bn?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          is_visible?: boolean
          link_url?: string | null
          title?: string | null
          title_bn?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cart_bundles: {
        Row: {
          added_at: string
          bundle_id: string
          id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          bundle_id: string
          id?: string
          user_id: string
        }
        Update: {
          added_at?: string
          bundle_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_bundles_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "bundles"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          added_at: string
          id: string
          subject_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          subject_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          id?: string
          subject_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      chapter_classes: {
        Row: {
          chapter_id: string
          created_at: string
          display_order: number
          id: string
          is_free: boolean
          title: string
          title_bn: string | null
          youtube_url: string
        }
        Insert: {
          chapter_id: string
          created_at?: string
          display_order?: number
          id?: string
          is_free?: boolean
          title: string
          title_bn?: string | null
          youtube_url: string
        }
        Update: {
          chapter_id?: string
          created_at?: string
          display_order?: number
          id?: string
          is_free?: boolean
          title?: string
          title_bn?: string | null
          youtube_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapter_classes_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "subject_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      class_schedules: {
        Row: {
          created_at: string
          demo_video_url: string | null
          department: string | null
          description: string | null
          description_bn: string | null
          end_time: string
          id: string
          is_free: boolean | null
          scheduled_date: string
          start_time: string
          status: Database["public"]["Enums"]["class_status"] | null
          stream_url: string | null
          subject_id: string
          target_years: number[] | null
          title: string
          title_bn: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          demo_video_url?: string | null
          department?: string | null
          description?: string | null
          description_bn?: string | null
          end_time: string
          id?: string
          is_free?: boolean | null
          scheduled_date: string
          start_time: string
          status?: Database["public"]["Enums"]["class_status"] | null
          stream_url?: string | null
          subject_id: string
          target_years?: number[] | null
          title: string
          title_bn?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          demo_video_url?: string | null
          department?: string | null
          description?: string | null
          description_bn?: string | null
          end_time?: string
          id?: string
          is_free?: boolean | null
          scheduled_date?: string
          start_time?: string
          status?: Database["public"]["Enums"]["class_status"] | null
          stream_url?: string | null
          subject_id?: string
          target_years?: number[] | null
          title?: string
          title_bn?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_schedules_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_content: {
        Row: {
          content: Json
          id: string
          section: string
          updated_at: string
        }
        Insert: {
          content?: Json
          id?: string
          section: string
          updated_at?: string
        }
        Update: {
          content?: Json
          id?: string
          section?: string
          updated_at?: string
        }
        Relationships: []
      }
      connected_facebook_pages: {
        Row: {
          connected_by: string
          created_at: string
          id: string
          page_access_token: string
          page_id: string
          page_name: string
          updated_at: string
        }
        Insert: {
          connected_by: string
          created_at?: string
          id?: string
          page_access_token: string
          page_id: string
          page_name: string
          updated_at?: string
        }
        Update: {
          connected_by?: string
          created_at?: string
          id?: string
          page_access_token?: string
          page_id?: string
          page_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      course_pdfs: {
        Row: {
          created_at: string
          department: string | null
          display_order: number | null
          file_size_bytes: number | null
          file_url: string
          id: string
          is_free: boolean | null
          is_visible: boolean | null
          subject_id: string | null
          target_years: number[] | null
          title: string
          title_bn: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          display_order?: number | null
          file_size_bytes?: number | null
          file_url: string
          id?: string
          is_free?: boolean | null
          is_visible?: boolean | null
          subject_id?: string | null
          target_years?: number[] | null
          title: string
          title_bn?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          display_order?: number | null
          file_size_bytes?: number | null
          file_url?: string
          id?: string
          is_free?: boolean | null
          is_visible?: boolean | null
          subject_id?: string | null
          target_years?: number[] | null
          title?: string
          title_bn?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_pdfs_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          current_uses: number
          description: string | null
          discount_percent_owner: number | null
          discount_percent_receiver: number | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          is_referral: boolean | null
          max_uses: number | null
          owner_type: string | null
          owner_user_id: string | null
          short_code: string | null
          subject_id: string | null
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          description?: string | null
          discount_percent_owner?: number | null
          discount_percent_receiver?: number | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          is_referral?: boolean | null
          max_uses?: number | null
          owner_type?: string | null
          owner_user_id?: string | null
          short_code?: string | null
          subject_id?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          description?: string | null
          discount_percent_owner?: number | null
          discount_percent_receiver?: number | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          is_referral?: boolean | null
          max_uses?: number | null
          owner_type?: string | null
          owner_user_id?: string | null
          short_code?: string | null
          subject_id?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_codes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      earned_discounts: {
        Row: {
          created_at: string
          discount_percent: number
          id: string
          redeemed: boolean
          referral_code_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          discount_percent?: number
          id?: string
          redeemed?: boolean
          referral_code_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          discount_percent?: number
          id?: string
          redeemed?: boolean
          referral_code_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "earned_discounts_referral_code_id_fkey"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_permissions: {
        Row: {
          can_manage_analytics: boolean
          can_manage_calendar: boolean
          can_manage_carousel: boolean
          can_manage_cms: boolean
          can_manage_discount_codes: boolean
          can_manage_enrollments: boolean
          can_manage_gallery: boolean
          can_manage_pdfs: boolean
          can_manage_referral_codes: boolean
          can_manage_students: boolean
          can_manage_subject_cms: boolean
          can_manage_subjects: boolean
          can_manage_videos: boolean
          can_view_clicks: boolean
          can_view_enrollments: boolean
          can_view_revenue: boolean
          can_view_signups: boolean
          employee_id: string
          id: string
        }
        Insert: {
          can_manage_analytics?: boolean
          can_manage_calendar?: boolean
          can_manage_carousel?: boolean
          can_manage_cms?: boolean
          can_manage_discount_codes?: boolean
          can_manage_enrollments?: boolean
          can_manage_gallery?: boolean
          can_manage_pdfs?: boolean
          can_manage_referral_codes?: boolean
          can_manage_students?: boolean
          can_manage_subject_cms?: boolean
          can_manage_subjects?: boolean
          can_manage_videos?: boolean
          can_view_clicks?: boolean
          can_view_enrollments?: boolean
          can_view_revenue?: boolean
          can_view_signups?: boolean
          employee_id: string
          id?: string
        }
        Update: {
          can_manage_analytics?: boolean
          can_manage_calendar?: boolean
          can_manage_carousel?: boolean
          can_manage_cms?: boolean
          can_manage_discount_codes?: boolean
          can_manage_enrollments?: boolean
          can_manage_gallery?: boolean
          can_manage_pdfs?: boolean
          can_manage_referral_codes?: boolean
          can_manage_students?: boolean
          can_manage_subject_cms?: boolean
          can_manage_subjects?: boolean
          can_manage_videos?: boolean
          can_view_clicks?: boolean
          can_view_enrollments?: boolean
          can_view_revenue?: boolean
          can_view_signups?: boolean
          employee_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_permissions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string
          id: string
          invited_email: string
          status: string
          sub_role: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          invited_email: string
          status?: string
          sub_role?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          invited_email?: string
          status?: string
          sub_role?: string
          user_id?: string | null
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          enrolled_at: string
          id: string
          payment_id: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          subject_id: string
          user_id: string
        }
        Insert: {
          enrolled_at?: string
          id?: string
          payment_id?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          subject_id: string
          user_id: string
        }
        Update: {
          enrolled_at?: string
          id?: string
          payment_id?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          subject_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      facebook_join_requests: {
        Row: {
          admin_note: string | null
          created_at: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          student_note: string | null
          subject_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          student_note?: string | null
          subject_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          student_note?: string | null
          subject_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      free_videos: {
        Row: {
          compatible_years: number[] | null
          created_at: string
          department: string | null
          description: string | null
          description_bn: string | null
          display_order: number | null
          id: string
          is_visible: boolean | null
          subject_id: string | null
          thumbnail_url: string | null
          title: string
          title_bn: string | null
          youtube_url: string
        }
        Insert: {
          compatible_years?: number[] | null
          created_at?: string
          department?: string | null
          description?: string | null
          description_bn?: string | null
          display_order?: number | null
          id?: string
          is_visible?: boolean | null
          subject_id?: string | null
          thumbnail_url?: string | null
          title: string
          title_bn?: string | null
          youtube_url: string
        }
        Update: {
          compatible_years?: number[] | null
          created_at?: string
          department?: string | null
          description?: string | null
          description_bn?: string | null
          display_order?: number | null
          id?: string
          is_visible?: boolean | null
          subject_id?: string | null
          thumbnail_url?: string | null
          title?: string
          title_bn?: string | null
          youtube_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "free_videos_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_images: {
        Row: {
          alt_text: string
          alt_text_bn: string | null
          created_at: string
          display_order: number
          id: string
          image_url: string
          is_visible: boolean
          updated_at: string
        }
        Insert: {
          alt_text?: string
          alt_text_bn?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          is_visible?: boolean
          updated_at?: string
        }
        Update: {
          alt_text?: string
          alt_text_bn?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          is_visible?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      instructors: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_order: number
          education: string | null
          education_bn: string | null
          id: string
          name: string
          name_bn: string | null
          position: string | null
          position_bn: string | null
          subject_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_order?: number
          education?: string | null
          education_bn?: string | null
          id?: string
          name: string
          name_bn?: string | null
          position?: string | null
          position_bn?: string | null
          subject_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_order?: number
          education?: string | null
          education_bn?: string | null
          id?: string
          name?: string
          name_bn?: string | null
          position?: string | null
          position_bn?: string | null
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instructors_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      legacy_students: {
        Row: {
          claimed_by: string | null
          created_at: string
          department: string | null
          email: string | null
          full_name: string
          id: string
          is_claimed: boolean
          phone: string
          student_id: string | null
          year: number | null
        }
        Insert: {
          claimed_by?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_claimed?: boolean
          phone: string
          student_id?: string | null
          year?: number | null
        }
        Update: {
          claimed_by?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_claimed?: boolean
          phone?: string
          student_id?: string | null
          year?: number | null
        }
        Relationships: []
      }
      live_chat_messages: {
        Row: {
          created_at: string
          id: string
          is_pinned: boolean
          message: string
          session_id: string
          user_id: string
          user_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_pinned?: boolean
          message: string
          session_id: string
          user_id: string
          user_name?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_pinned?: boolean
          message?: string
          session_id?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_sessions: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          created_at: string
          created_by: string
          description: string | null
          description_bn: string | null
          id: string
          is_free: boolean
          recording_expires_at: string | null
          room_name: string | null
          scheduled_start: string | null
          status: string
          subject_id: string | null
          thumbnail_url: string | null
          title: string
          title_bn: string | null
          updated_at: string
          viewer_count: number
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          description_bn?: string | null
          id?: string
          is_free?: boolean
          recording_expires_at?: string | null
          room_name?: string | null
          scheduled_start?: string | null
          status?: string
          subject_id?: string | null
          thumbnail_url?: string | null
          title: string
          title_bn?: string | null
          updated_at?: string
          viewer_count?: number
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          description_bn?: string | null
          id?: string
          is_free?: boolean
          recording_expires_at?: string | null
          room_name?: string | null
          scheduled_start?: string | null
          status?: string
          subject_id?: string | null
          thumbnail_url?: string | null
          title?: string
          title_bn?: string | null
          updated_at?: string
          viewer_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "live_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      math_pricing_tiers: {
        Row: {
          created_at: string
          discount_percent: number
          id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          discount_percent?: number
          id?: string
          quantity: number
        }
        Update: {
          created_at?: string
          discount_percent?: number
          id?: string
          quantity?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          message_bn: string | null
          title: string
          title_bn: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          message_bn?: string | null
          title: string
          title_bn?: string | null
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          message_bn?: string | null
          title?: string
          title_bn?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      otp_codes: {
        Row: {
          attempts: number
          code: string
          created_at: string
          expires_at: string
          id: string
          phone: string
          verified: boolean
        }
        Insert: {
          attempts?: number
          code: string
          created_at?: string
          expires_at?: string
          id?: string
          phone: string
          verified?: boolean
        }
        Update: {
          attempts?: number
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          verified?: boolean
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          gateway_response: Json | null
          id: string
          pending_redemption_points: number | null
          status: Database["public"]["Enums"]["payment_status"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          gateway_response?: Json | null
          id?: string
          pending_redemption_points?: number | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          gateway_response?: Json | null
          id?: string
          pending_redemption_points?: number | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pending_referrals: {
        Row: {
          browser_fingerprint: string
          created_at: string
          expires_at: string
          id: string
          ip: string | null
          referral_code_id: string
        }
        Insert: {
          browser_fingerprint: string
          created_at?: string
          expires_at?: string
          id?: string
          ip?: string | null
          referral_code_id: string
        }
        Update: {
          browser_fingerprint?: string
          created_at?: string
          expires_at?: string
          id?: string
          ip?: string | null
          referral_code_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_referrals_referral_code_id_fkey"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          device_lock_enabled: boolean
          id: string
          max_devices_per_student: number
          session_timeout_minutes: number
          updated_at: string
        }
        Insert: {
          device_lock_enabled?: boolean
          id?: string
          max_devices_per_student?: number
          session_timeout_minutes?: number
          updated_at?: string
        }
        Update: {
          device_lock_enabled?: boolean
          id?: string
          max_devices_per_student?: number
          session_timeout_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          course_type: string | null
          created_at: string
          department: Database["public"]["Enums"]["department"] | null
          email: string | null
          full_name: string
          id: string
          is_blocked: boolean | null
          max_devices: number
          onboarding_completed: boolean | null
          phone: string
          session: string | null
          student_id: string | null
          updated_at: string
          user_id: string
          year: number | null
        }
        Insert: {
          avatar_url?: string | null
          course_type?: string | null
          created_at?: string
          department?: Database["public"]["Enums"]["department"] | null
          email?: string | null
          full_name: string
          id?: string
          is_blocked?: boolean | null
          max_devices?: number
          onboarding_completed?: boolean | null
          phone: string
          session?: string | null
          student_id?: string | null
          updated_at?: string
          user_id: string
          year?: number | null
        }
        Update: {
          avatar_url?: string | null
          course_type?: string | null
          created_at?: string
          department?: Database["public"]["Enums"]["department"] | null
          email?: string | null
          full_name?: string
          id?: string
          is_blocked?: boolean | null
          max_devices?: number
          onboarding_completed?: boolean | null
          phone?: string
          session?: string | null
          student_id?: string | null
          updated_at?: string
          user_id?: string
          year?: number | null
        }
        Relationships: []
      }
      referral_attributions: {
        Row: {
          created_at: string
          referral_code_id: string
          referred_user_id: string
        }
        Insert: {
          created_at?: string
          referral_code_id: string
          referred_user_id: string
        }
        Update: {
          created_at?: string
          referral_code_id?: string
          referred_user_id?: string
        }
        Relationships: []
      }
      referral_clicks: {
        Row: {
          clicked_at: string
          country: string | null
          id: string
          ip: string | null
          referral_code_id: string
          user_agent: string | null
        }
        Insert: {
          clicked_at?: string
          country?: string | null
          id?: string
          ip?: string | null
          referral_code_id: string
          user_agent?: string | null
        }
        Update: {
          clicked_at?: string
          country?: string | null
          id?: string
          ip?: string | null
          referral_code_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_clicks_referral_code_id_fkey"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_conversions: {
        Row: {
          converted_at: string
          id: string
          new_user_id: string
          points_awarded: number
          purchase_id: string | null
          referral_code_id: string
        }
        Insert: {
          converted_at?: string
          id?: string
          new_user_id: string
          points_awarded?: number
          purchase_id?: string | null
          referral_code_id: string
        }
        Update: {
          converted_at?: string
          id?: string
          new_user_id?: string
          points_awarded?: number
          purchase_id?: string | null
          referral_code_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_conversions_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_conversions_referral_code_id_fkey"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_points_ledger: {
        Row: {
          created_at: string
          enrollment_id: string | null
          id: string
          payment_id: string | null
          points: number
          reason: string
          referred_user_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          enrollment_id?: string | null
          id?: string
          payment_id?: string | null
          points: number
          reason: string
          referred_user_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          enrollment_id?: string | null
          id?: string
          payment_id?: string | null
          points?: number
          reason?: string
          referred_user_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      referral_redemptions: {
        Row: {
          bdt_value: number
          created_at: string
          id: string
          payment_id: string
          points_used: number
          user_id: string
        }
        Insert: {
          bdt_value: number
          created_at?: string
          id?: string
          payment_id: string
          points_used: number
          user_id: string
        }
        Update: {
          bdt_value?: number
          created_at?: string
          id?: string
          payment_id?: string
          points_used?: number
          user_id?: string
        }
        Relationships: []
      }
      session_violations: {
        Row: {
          active_device_fingerprint: string | null
          active_device_label: string | null
          blocked_device_fingerprint: string | null
          blocked_device_label: string | null
          blocked_ip: string | null
          created_at: string
          id: string
          user_id: string
          violation_type: string
        }
        Insert: {
          active_device_fingerprint?: string | null
          active_device_label?: string | null
          blocked_device_fingerprint?: string | null
          blocked_device_label?: string | null
          blocked_ip?: string | null
          created_at?: string
          id?: string
          user_id: string
          violation_type?: string
        }
        Update: {
          active_device_fingerprint?: string | null
          active_device_label?: string | null
          blocked_device_fingerprint?: string | null
          blocked_device_label?: string | null
          blocked_ip?: string | null
          created_at?: string
          id?: string
          user_id?: string
          violation_type?: string
        }
        Relationships: []
      }
      sms_campaigns: {
        Row: {
          created_at: string
          failed_count: number
          id: string
          message: string
          recipient_filter: Json
          scheduled_for: string | null
          sent_at: string | null
          sent_by: string | null
          sent_count: number
          status: string
          title: string
          total_recipients: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          failed_count?: number
          id?: string
          message: string
          recipient_filter?: Json
          scheduled_for?: string | null
          sent_at?: string | null
          sent_by?: string | null
          sent_count?: number
          status?: string
          title: string
          total_recipients?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          failed_count?: number
          id?: string
          message?: string
          recipient_filter?: Json
          scheduled_for?: string | null
          sent_at?: string | null
          sent_by?: string | null
          sent_count?: number
          status?: string
          title?: string
          total_recipients?: number
          updated_at?: string
        }
        Relationships: []
      }
      sms_templates: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          message: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          message: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      student_id_counter: {
        Row: {
          current_count: number
          id: number
          year: number
        }
        Insert: {
          current_count?: number
          id?: number
          year?: number
        }
        Update: {
          current_count?: number
          id?: number
          year?: number
        }
        Relationships: []
      }
      student_onboarding: {
        Row: {
          alternative_phone: string | null
          college_name: string | null
          completed_at: string | null
          created_at: string
          district: string | null
          division: string | null
          facebook_id_name: string | null
          has_complaint: boolean | null
          id: string
          referral_source: string | null
          session: string | null
          student_type: string | null
          user_id: string
          whatsapp_number: string | null
        }
        Insert: {
          alternative_phone?: string | null
          college_name?: string | null
          completed_at?: string | null
          created_at?: string
          district?: string | null
          division?: string | null
          facebook_id_name?: string | null
          has_complaint?: boolean | null
          id?: string
          referral_source?: string | null
          session?: string | null
          student_type?: string | null
          user_id: string
          whatsapp_number?: string | null
        }
        Update: {
          alternative_phone?: string | null
          college_name?: string | null
          completed_at?: string | null
          created_at?: string
          district?: string | null
          division?: string | null
          facebook_id_name?: string | null
          has_complaint?: boolean | null
          id?: string
          referral_source?: string | null
          session?: string | null
          student_type?: string | null
          user_id?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      subject_chapters: {
        Row: {
          created_at: string
          description: string | null
          description_bn: string | null
          display_order: number
          id: string
          is_free: boolean
          subject_id: string
          title: string
          title_bn: string | null
          youtube_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          description_bn?: string | null
          display_order?: number
          id?: string
          is_free?: boolean
          subject_id: string
          title: string
          title_bn?: string | null
          youtube_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          description_bn?: string | null
          display_order?: number
          id?: string
          is_free?: boolean
          subject_id?: string
          title?: string
          title_bn?: string | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subject_chapters_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          compatible_years: number[] | null
          course_type: string | null
          created_at: string
          demo_video_url: string | null
          department: string | null
          description: string | null
          description_bn: string | null
          facebook_group_url: string | null
          icon: string | null
          id: string
          instructor_avatars: string[] | null
          is_visible: boolean | null
          name: string
          name_bn: string
          original_price: number | null
          price: number
          slug: string
          subject_type: string | null
          updated_at: string
          whatsapp_support_url: string | null
        }
        Insert: {
          compatible_years?: number[] | null
          course_type?: string | null
          created_at?: string
          demo_video_url?: string | null
          department?: string | null
          description?: string | null
          description_bn?: string | null
          facebook_group_url?: string | null
          icon?: string | null
          id?: string
          instructor_avatars?: string[] | null
          is_visible?: boolean | null
          name: string
          name_bn: string
          original_price?: number | null
          price?: number
          slug: string
          subject_type?: string | null
          updated_at?: string
          whatsapp_support_url?: string | null
        }
        Update: {
          compatible_years?: number[] | null
          course_type?: string | null
          created_at?: string
          demo_video_url?: string | null
          department?: string | null
          description?: string | null
          description_bn?: string | null
          facebook_group_url?: string | null
          icon?: string | null
          id?: string
          instructor_avatars?: string[] | null
          is_visible?: boolean | null
          name?: string
          name_bn?: string
          original_price?: number | null
          price?: number
          slug?: string
          subject_type?: string | null
          updated_at?: string
          whatsapp_support_url?: string | null
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          avatar_url: string | null
          content: string
          content_bn: string | null
          created_at: string
          display_order: number | null
          id: string
          is_visible: boolean | null
          name: string
          name_bn: string | null
          role: string | null
          role_bn: string | null
          screenshot_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          content: string
          content_bn?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          is_visible?: boolean | null
          name: string
          name_bn?: string | null
          role?: string | null
          role_bn?: string | null
          screenshot_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          content?: string
          content_bn?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          is_visible?: boolean | null
          name?: string
          name_bn?: string | null
          role?: string | null
          role_bn?: string | null
          screenshot_url?: string | null
        }
        Relationships: []
      }
      trusted_devices: {
        Row: {
          device_fingerprint: string
          device_label: string | null
          id: string
          ip_address: string | null
          is_revoked: boolean
          last_used_at: string
          registered_at: string
          user_id: string
        }
        Insert: {
          device_fingerprint: string
          device_label?: string | null
          id?: string
          ip_address?: string | null
          is_revoked?: boolean
          last_used_at?: string
          registered_at?: string
          user_id: string
        }
        Update: {
          device_fingerprint?: string
          device_label?: string | null
          id?: string
          ip_address?: string | null
          is_revoked?: boolean
          last_used_at?: string
          registered_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          device_fingerprint: string
          device_label: string | null
          id: string
          ip_address: string | null
          is_active: boolean
          last_active_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_fingerprint: string
          device_label?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean
          last_active_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_fingerprint?: string
          device_label?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean
          last_active_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_discount_codes: {
        Row: {
          code: string | null
          discount_percent_receiver: number | null
          discount_type: string | null
          discount_value: number | null
          is_referral: boolean | null
          subject_id: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code?: string | null
          discount_percent_receiver?: number | null
          discount_type?: string | null
          discount_value?: number | null
          is_referral?: boolean | null
          subject_id?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string | null
          discount_percent_receiver?: number | null
          discount_type?: string | null
          discount_value?: number | null
          is_referral?: boolean | null
          subject_id?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_codes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_click_summaries: {
        Row: {
          click_count: number | null
          country: string | null
          first_click: string | null
          last_click: string | null
          referral_code_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_clicks_referral_code_id_fkey"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      apply_redemption: {
        Args: { _payment: string; _requested_points: number; _user: string }
        Returns: Json
      }
      award_referral_points: {
        Args: {
          _code_id: string
          _enrollment: string
          _payment: string
          _referred: string
          _referrer: string
        }
        Returns: boolean
      }
      can_manage: { Args: { _permission: string }; Returns: boolean }
      create_student_referral_code: {
        Args: { _user_id: string }
        Returns: {
          code: string
          code_id: string
          slug: string
        }[]
      }
      generate_student_id: { Args: never; Returns: string }
      get_admin_referral_report: {
        Args: { _from: string; _to: string }
        Returns: Json
      }
      get_checkout_discount: {
        Args: { _code: string }
        Returns: {
          code: string
          code_id: string
          discount_type: string
          discount_value: number
          is_referral: boolean
          short_code: string
        }[]
      }
      get_or_create_referral_slug: {
        Args: never
        Returns: {
          code: string
          code_id: string
          slug: string
        }[]
      }
      get_referral_balance: { Args: { _user_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_blog_view: { Args: { post_slug: string }; Returns: undefined }
      is_slug_available: { Args: { _slug: string }; Returns: boolean }
      regenerate_referral_slug: {
        Args: never
        Returns: {
          code: string
          code_id: string
          slug: string
        }[]
      }
      update_referral_slug: { Args: { _new_slug: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "student" | "employee"
      class_status: "upcoming" | "live" | "finished" | "cancelled"
      department:
        | "management"
        | "marketing"
        | "accounting"
        | "finance"
        | "economics"
        | "ssc"
        | "hsc"
      payment_status: "pending" | "completed" | "failed" | "refunded"
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
      app_role: ["admin", "student", "employee"],
      class_status: ["upcoming", "live", "finished", "cancelled"],
      department: [
        "management",
        "marketing",
        "accounting",
        "finance",
        "economics",
        "ssc",
        "hsc",
      ],
      payment_status: ["pending", "completed", "failed", "refunded"],
    },
  },
} as const
