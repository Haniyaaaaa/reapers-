// Hand-authored to match supabase/migrations/0001_foundation.sql until a live project exists.
// Once you've run `supabase link` against your project, regenerate this file for real with:
//   supabase gen types typescript --linked > src/services/supabase/types.ts
// and keep it in sync after every migration — never hand-edit it once that command is available.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = 'gamer' | 'developer' | 'expert';
export type ChatroomKind = 'room' | 'dm' | 'server' | 'global';
export type MessageKind = 'text' | 'gif' | 'voice' | 'image' | 'video' | 'sticker';
export type EventType = 'Online' | 'Physical' | 'Hybrid';
export type RsvpStatus = 'going' | 'interested' | 'not_going';
export type ReportTarget = 'message' | 'room' | 'demo' | 'event' | 'user' | 'post' | 'post_comment';
export type PostKind = 'text' | 'photo' | 'activity';
export type TeamWorkMode = 'onsite' | 'remote' | 'hybrid';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type BillingInterval = 'monthly' | 'yearly' | '30_days';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired';
export type PaymentOrderStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'partially_refunded' | 'disputed';
export type PaymentMethodKind = 'card' | 'bank_account' | 'wallet';
export type TicketStatus = 'open' | 'in_progress' | 'resolved';
export type EventApplicationStatus = 'pending' | 'approved' | 'rejected';
export type RoomRole = 'owner' | 'admin' | 'member';
export type RoomInviteStatus = 'pending' | 'accepted' | 'declined';
export type RoomJoinRequestStatus = 'pending' | 'approved' | 'rejected';

export type AvatarLook = {
  hairColor?: string;
  skinColor?: string;
  backgroundColor?: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string;
          bio: string;
          avatar_uri: string | null;
          avatar_id: string | null;
          avatar_look: AvatarLook | null;
          roles: UserRole[];
          skills: string[];
          games: string[];
          tags: string[];
          portfolio_url: string | null;
          linkedin_url: string | null;
          location: string | null;
          years_experience: number | null;
          interests: string[];
          credibility: number;
          followers_count: number;
          following_count: number;
          posts_count: number;
          is_expert: boolean;
          is_admin: boolean;
          onboarded: boolean;
          first_name: string;
          last_name: string;
          phone: string | null;
          approval_status: ApprovalStatus;
          approval_rejection_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name: string;
          bio?: string;
          avatar_uri?: string | null;
          avatar_id?: string | null;
          avatar_look?: AvatarLook | null;
          roles?: UserRole[];
          skills?: string[];
          games?: string[];
          tags?: string[];
          portfolio_url?: string | null;
          linkedin_url?: string | null;
          location?: string | null;
          years_experience?: number | null;
          interests?: string[];
          first_name?: string;
          last_name?: string;
          phone?: string | null;
        };
        Update: {
          username?: string;
          display_name?: string;
          bio?: string;
          avatar_uri?: string | null;
          avatar_id?: string | null;
          avatar_look?: AvatarLook | null;
          roles?: UserRole[];
          skills?: string[];
          games?: string[];
          tags?: string[];
          portfolio_url?: string | null;
          linkedin_url?: string | null;
          location?: string | null;
          years_experience?: number | null;
          interests?: string[];
          onboarded?: boolean;
          first_name?: string;
          last_name?: string;
          phone?: string | null;
          approval_status?: ApprovalStatus;
          approval_rejection_reason?: string | null;
        };
        Relationships: [];
      };
      demos: {
        Row: {
          id: string;
          developer_id: string;
          title: string;
          genre: string;
          description: string;
          thumbnail_url: string | null;
          video_url: string | null;
          duration_sec: number;
          external_url: string | null;
          review_count: number;
          score_gameplay: number;
          score_art: number;
          score_concept: number;
          score_polish: number;
          total_score: number;
          is_jam_entry: boolean;
          play_count: number;
          screenshot_urls: string[];
          tags: string[];
          platforms: string[];
          portfolio_url: string | null;
          press_kit_url: string | null;
          created_at: string;
        };
        Insert: {
          developer_id: string;
          title: string;
          genre: string;
          description?: string;
          thumbnail_url?: string | null;
          video_url?: string | null;
          duration_sec: number;
          external_url?: string | null;
          is_jam_entry?: boolean;
          screenshot_urls?: string[];
          tags?: string[];
          platforms?: string[];
          portfolio_url?: string | null;
          press_kit_url?: string | null;
        };
        Update: {
          title?: string;
          genre?: string;
          description?: string;
          thumbnail_url?: string | null;
          video_url?: string | null;
          duration_sec?: number;
          external_url?: string | null;
          is_jam_entry?: boolean;
          screenshot_urls?: string[];
          tags?: string[];
          platforms?: string[];
          portfolio_url?: string | null;
          press_kit_url?: string | null;
        };
        Relationships: [];
      };
      demo_reviews: {
        Row: {
          id: string;
          demo_id: string;
          reviewer_id: string;
          score_gameplay: number;
          score_art: number;
          score_concept: number;
          score_polish: number;
          comment: string;
          upvotes: number;
          downvotes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          demo_id: string;
          reviewer_id: string;
          score_gameplay: number;
          score_art: number;
          score_concept: number;
          score_polish: number;
          comment?: string;
        };
        Update: {
          score_gameplay?: number;
          score_art?: number;
          score_concept?: number;
          score_polish?: number;
          comment?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      demo_comments: {
        Row: {
          id: string;
          demo_id: string;
          user_id: string;
          text: string;
          likes_count: number;
          created_at: string;
        };
        Insert: {
          demo_id: string;
          user_id: string;
          text: string;
        };
        Update: {
          text?: string;
          likes_count?: number;
        };
        Relationships: [];
      };
      posts: {
        Row: {
          id: string;
          user_id: string;
          kind: PostKind;
          content: string;
          activity_tag: string | null;
          media_url: string | null;
          media_thumbnail_url: string | null;
          deleted: boolean;
          deleted_by: string | null;
          deleted_at: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          kind?: PostKind;
          content?: string;
          activity_tag?: string | null;
          media_url?: string | null;
          media_thumbnail_url?: string | null;
        };
        Update: {
          content?: string;
          deleted?: boolean;
          deleted_by?: string | null;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      post_reactions: {
        Row: { post_id: string; user_id: string; emoji: string; created_at: string };
        Insert: { post_id: string; user_id: string; emoji: string };
        Update: Record<string, never>;
        Relationships: [];
      };
      post_comments: {
        Row: { id: string; post_id: string; user_id: string; text: string; created_at: string };
        Insert: { post_id: string; user_id: string; text: string };
        Update: { text?: string };
        Relationships: [];
      };
      demo_bookmarks: {
        Row: { demo_id: string; user_id: string; created_at: string };
        Insert: { demo_id: string; user_id: string };
        Update: Record<string, never>;
        Relationships: [];
      };
      demo_review_votes: {
        Row: { review_id: string; voter_id: string; vote: number; created_at: string };
        Insert: { review_id: string; voter_id: string; vote: number };
        Update: { vote?: number };
        Relationships: [];
      };
      communities: {
        Row: {
          id: string;
          short_name: string;
          name: string;
          description: string;
          logo_url: string | null;
          location: string | null;
          member_count: number;
          created_by: string | null;
          tags: string[];
          created_at: string;
        };
        Insert: {
          short_name: string;
          name: string;
          description?: string;
          logo_url?: string | null;
          location?: string | null;
          created_by: string;
          tags?: string[];
        };
        Update: {
          short_name?: string;
          name?: string;
          description?: string;
          logo_url?: string | null;
          location?: string | null;
          tags?: string[];
        };
        Relationships: [];
      };
      community_members: {
        Row: { community_id: string; user_id: string; joined_at: string };
        Insert: { community_id: string; user_id: string };
        Update: Record<string, never>;
        Relationships: [];
      };
      chatrooms: {
        Row: {
          id: string;
          name: string;
          tag: string;
          description: string;
          kind: ChatroomKind;
          server_region: string | null;
          community_id: string | null;
          is_private: boolean;
          requires_approval: boolean;
          avatar_url: string | null;
          member_count: number;
          created_by: string | null;
          created_at: string;
          last_message_at: string;
        };
        Insert: {
          name: string;
          tag?: string;
          description?: string;
          kind?: ChatroomKind;
          server_region?: string | null;
          community_id?: string | null;
          is_private?: boolean;
          requires_approval?: boolean;
          avatar_url?: string | null;
          created_by: string;
        };
        Update: {
          name?: string;
          tag?: string;
          description?: string;
          avatar_url?: string | null;
          is_private?: boolean;
          requires_approval?: boolean;
        };
        Relationships: [];
      };
      chatroom_members: {
        Row: {
          chatroom_id: string;
          user_id: string;
          joined_at: string;
          pinned: boolean;
          muted: boolean;
          last_read_at: string;
          streak_count: number;
          last_chat_at: string | null;
          role: RoomRole;
        };
        Insert: { chatroom_id: string; user_id: string; role?: RoomRole };
        Update: {
          pinned?: boolean;
          muted?: boolean;
          last_read_at?: string;
          streak_count?: number;
          last_chat_at?: string | null;
          role?: RoomRole;
        };
        Relationships: [];
      };
      room_invites: {
        Row: {
          id: string;
          chatroom_id: string;
          inviter_id: string;
          invitee_id: string;
          status: RoomInviteStatus;
          created_at: string;
        };
        Insert: { chatroom_id: string; inviter_id: string; invitee_id: string; status?: RoomInviteStatus };
        Update: { status?: RoomInviteStatus };
        Relationships: [];
      };
      room_join_requests: {
        Row: {
          id: string;
          chatroom_id: string;
          requester_id: string;
          status: RoomJoinRequestStatus;
          created_at: string;
        };
        Insert: { chatroom_id: string; requester_id: string; status?: RoomJoinRequestStatus };
        Update: { status?: RoomJoinRequestStatus };
        Relationships: [];
      };
      chatroom_messages: {
        Row: {
          id: string;
          chatroom_id: string;
          sender_id: string;
          content: string;
          kind: MessageKind;
          gif_uri: string | null;
          voice_url: string | null;
          voice_duration_sec: number | null;
          reply_to_id: string | null;
          forwarded: boolean;
          edited: boolean;
          deleted: boolean;
          pinned: boolean;
          media_url: string | null;
          media_thumbnail_url: string | null;
          created_at: string;
        };
        Insert: {
          chatroom_id: string;
          sender_id: string;
          content?: string;
          kind?: MessageKind;
          gif_uri?: string | null;
          voice_url?: string | null;
          voice_duration_sec?: number | null;
          reply_to_id?: string | null;
          forwarded?: boolean;
          media_url?: string | null;
          media_thumbnail_url?: string | null;
        };
        Update: {
          content?: string;
          edited?: boolean;
          deleted?: boolean;
          pinned?: boolean;
        };
        Relationships: [];
      };
      message_hides: {
        Row: { message_id: string; user_id: string; created_at: string };
        Insert: { message_id: string; user_id: string };
        Update: Record<string, never>;
        Relationships: [];
      };
      message_reactions: {
        Row: { message_id: string; user_id: string; emoji: string; created_at: string };
        Insert: { message_id: string; user_id: string; emoji: string };
        Update: Record<string, never>;
        Relationships: [];
      };
      message_stars: {
        Row: { message_id: string; user_id: string };
        Insert: { message_id: string; user_id: string };
        Update: Record<string, never>;
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          host_id: string;
          title: string;
          description: string;
          type: EventType;
          category: string | null;
          starts_at: string;
          ends_at: string | null;
          registration_closes_before_minutes: number;
          location: string;
          cover_url: string | null;
          attendee_count: number;
          max_attendees: number | null;
          paid: boolean;
          price: number | null;
          currency: string | null;
          payout_contact_note: string | null;
          lat: number | null;
          lng: number | null;
          created_at: string;
        };
        Insert: {
          host_id: string;
          title: string;
          description?: string;
          type: EventType;
          category?: string | null;
          starts_at: string;
          ends_at?: string | null;
          registration_closes_before_minutes?: number;
          location?: string;
          cover_url?: string | null;
          max_attendees?: number | null;
          paid?: boolean;
          price?: number | null;
          currency?: string | null;
          payout_contact_note?: string | null;
          lat?: number | null;
          lng?: number | null;
        };
        Update: {
          title?: string;
          description?: string;
          type?: EventType;
          category?: string | null;
          starts_at?: string;
          ends_at?: string | null;
          registration_closes_before_minutes?: number;
          location?: string;
          cover_url?: string | null;
          max_attendees?: number | null;
          paid?: boolean;
          price?: number | null;
          currency?: string | null;
          payout_contact_note?: string | null;
          lat?: number | null;
          lng?: number | null;
        };
        Relationships: [];
      };
      experts: {
        Row: {
          id: string;
          role: string;
          company: string;
          bio: string;
          specialties: string[];
          rating: number;
          review_count: number;
          years_experience: number | null;
          linkedin_url: string | null;
          portfolio_url: string | null;
          work: { title: string; company: string; years: string }[] | null;
          verified: boolean;
          applied_at: string;
          verified_at: string | null;
          verified_by: string | null;
          rejection_reason: string | null;
        };
        Insert: {
          id: string;
          role?: string;
          company?: string;
          bio?: string;
          specialties?: string[];
          years_experience?: number | null;
          linkedin_url?: string | null;
          portfolio_url?: string | null;
        };
        Update: {
          role?: string;
          company?: string;
          bio?: string;
          specialties?: string[];
          years_experience?: number | null;
          linkedin_url?: string | null;
          portfolio_url?: string | null;
          verified?: boolean;
          verified_at?: string | null;
          verified_by?: string | null;
          rejection_reason?: string | null;
        };
        Relationships: [];
      };
      bookings: {
        Row: {
          id: string;
          expert_id: string;
          requester_id: string;
          starts_at: string;
          ends_at: string;
          status: string;
          meeting_link: string | null;
          created_at: string;
        };
        Insert: {
          expert_id: string;
          requester_id: string;
          starts_at: string;
          ends_at: string;
        };
        Update: {
          status?: string;
          meeting_link?: string | null;
        };
        Relationships: [];
      };
      expert_reviews: {
        Row: {
          id: string;
          expert_id: string;
          booking_id: string;
          reviewer_id: string;
          rating: number;
          comment: string;
          created_at: string;
        };
        Insert: {
          expert_id: string;
          booking_id: string;
          reviewer_id: string;
          rating: number;
          comment?: string;
        };
        Update: { rating?: number; comment?: string };
        Relationships: [];
      };
      connections: {
        Row: {
          requester_id: string;
          addressee_id: string;
          status: 'pending' | 'accepted' | 'declined';
          created_at: string;
          updated_at: string;
        };
        Insert: { requester_id: string; addressee_id: string };
        Update: { status?: 'pending' | 'accepted' | 'declined'; updated_at?: string };
        Relationships: [];
      };
      team_requests: {
        Row: {
          id: string;
          poster_id: string;
          project: string;
          excerpt: string;
          roles: string[];
          studio: string | null;
          team_size: number | null;
          stage: TeamStage | null;
          engine: string | null;
          location: string | null;
          hours_per_week: number | null;
          compensation: TeamCompensation | null;
          needed_by: string | null;
          work_mode: TeamWorkMode | null;
          created_at: string;
        };
        Insert: {
          poster_id: string;
          project: string;
          excerpt?: string;
          roles?: string[];
          studio?: string | null;
          team_size?: number | null;
          stage?: TeamStage | null;
          engine?: string | null;
          location?: string | null;
          hours_per_week?: number | null;
          compensation?: TeamCompensation | null;
          needed_by?: string | null;
          work_mode?: TeamWorkMode | null;
        };
        Update: {
          project?: string;
          excerpt?: string;
          roles?: string[];
          studio?: string | null;
          team_size?: number | null;
          stage?: TeamStage | null;
          engine?: string | null;
          location?: string | null;
          hours_per_week?: number | null;
          compensation?: TeamCompensation | null;
          needed_by?: string | null;
          work_mode?: TeamWorkMode | null;
        };
        Relationships: [];
      };
      team_request_applications: {
        Row: { team_request_id: string; applicant_id: string; created_at: string };
        Insert: { team_request_id: string; applicant_id: string };
        Update: Record<string, never>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          body: string;
          target: Json;
          read: boolean;
          created_at: string;
        };
        Insert: Record<string, never>;
        Update: { read?: boolean };
        Relationships: [];
      };
      user_settings: {
        Row: {
          user_id: string;
          notify_chat: boolean;
          notify_events: boolean;
          notify_demos: boolean;
          notify_bookings: boolean;
          discoverable: boolean;
          updated_at: string;
        };
        Insert: { user_id: string };
        Update: {
          notify_chat?: boolean;
          notify_events?: boolean;
          notify_demos?: boolean;
          notify_bookings?: boolean;
          discoverable?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      push_tokens: {
        Row: { user_id: string; token: string; platform: 'ios' | 'android'; created_at: string };
        Insert: { user_id: string; token: string; platform: 'ios' | 'android' };
        Update: Record<string, never>;
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          target_type: ReportTarget;
          target_id: string;
          reason: string;
          status: string;
          created_at: string;
        };
        Insert: {
          reporter_id: string;
          target_type: ReportTarget;
          target_id: string;
          reason: string;
        };
        Update: { status?: string };
        Relationships: [];
      };
      blocked_users: {
        Row: { blocker_id: string; blocked_id: string; created_at: string };
        Insert: { blocker_id: string; blocked_id: string };
        Update: Record<string, never>;
        Relationships: [];
      };
      expert_availability: {
        Row: { expert_id: string; weekday: number };
        Insert: { expert_id: string; weekday: number };
        Update: Record<string, never>;
        Relationships: [];
      };
      expert_time_slots: {
        Row: { id: string; expert_id: string; weekday: number; starts_at: string; ends_at: string };
        Insert: { expert_id: string; weekday: number; starts_at: string; ends_at: string };
        Update: Record<string, never>;
        Relationships: [];
      };
      subscription_plans: {
        Row: {
          id: string;
          name: string;
          price: number;
          billing_interval: BillingInterval;
          is_active: boolean;
          community_limit: number | null;
          event_limit: number | null;
          demo_upload_allowed: boolean;
          avatar_custom_allowed: boolean;
          expert_booking_allowed: boolean;
          created_at: string;
        };
        Insert: {
          name: string;
          price: number;
          billing_interval: BillingInterval;
          is_active?: boolean;
          community_limit?: number | null;
          event_limit?: number | null;
          demo_upload_allowed?: boolean;
          avatar_custom_allowed?: boolean;
          expert_booking_allowed?: boolean;
        };
        Update: {
          name?: string;
          price?: number;
          billing_interval?: BillingInterval;
          is_active?: boolean;
          community_limit?: number | null;
          event_limit?: number | null;
          demo_upload_allowed?: boolean;
          avatar_custom_allowed?: boolean;
          expert_booking_allowed?: boolean;
        };
        Relationships: [];
      };
      user_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan_id: string;
          status: SubscriptionStatus;
          renews_at: string | null;
          expires_at: string | null;
          payment_order_id: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          plan_id: string;
          status?: SubscriptionStatus;
          renews_at?: string | null;
          expires_at?: string | null;
          payment_order_id?: string | null;
        };
        Update: {
          status?: SubscriptionStatus;
          renews_at?: string | null;
          expires_at?: string | null;
          payment_order_id?: string | null;
        };
        Relationships: [];
      };
      payment_orders: {
        Row: {
          id: string;
          user_id: string;
          plan_id: string;
          amount: number;
          currency: string;
          provider: string;
          provider_order_id: string;
          status: PaymentOrderStatus;
          payment_method: PaymentMethodKind | null;
          provider_transaction_id: string | null;
          masked_account: string | null;
          refunded_amount: number | null;
          disputed_at: string | null;
          raw_response: Record<string, unknown> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          plan_id: string;
          amount: number;
          currency?: string;
          provider?: string;
          provider_order_id: string;
          status?: PaymentOrderStatus;
          payment_method?: PaymentMethodKind | null;
          provider_transaction_id?: string | null;
          masked_account?: string | null;
          raw_response?: Record<string, unknown> | null;
        };
        Update: {
          status?: PaymentOrderStatus;
          payment_method?: PaymentMethodKind | null;
          provider_transaction_id?: string | null;
          masked_account?: string | null;
          refunded_amount?: number | null;
          disputed_at?: string | null;
          raw_response?: Record<string, unknown> | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      event_venues: {
        Row: { event_id: string; venue: string };
        Insert: { event_id: string; venue: string };
        Update: { venue?: string };
        Relationships: [];
      };
      payment_webhook_events: {
        Row: {
          id: string;
          provider: string;
          dedupe_key: string;
          event_type: string | null;
          tracker_token: string | null;
          payload: Record<string, unknown>;
          processed_at: string | null;
          created_at: string;
        };
        Insert: {
          provider?: string;
          dedupe_key: string;
          event_type?: string | null;
          tracker_token?: string | null;
          payload: Record<string, unknown>;
          processed_at?: string | null;
        };
        Update: {
          processed_at?: string | null;
        };
        Relationships: [];
      };
      support_tickets: {
        Row: { id: string; user_id: string; subject: string; status: TicketStatus; created_at: string };
        Insert: { user_id: string; subject: string; status?: TicketStatus };
        Update: { status?: TicketStatus };
        Relationships: [];
      };
      support_ticket_messages: {
        Row: { id: string; ticket_id: string; sender_id: string; message: string; created_at: string };
        Insert: { ticket_id: string; sender_id: string; message: string };
        Update: Record<string, never>;
        Relationships: [];
      };
      event_rsvps: {
        Row: {
          event_id: string;
          user_id: string;
          status: RsvpStatus;
          paid_by_user: boolean;
          ticket_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          event_id: string;
          user_id: string;
          status: RsvpStatus;
          paid_by_user?: boolean;
        };
        Update: {
          status?: RsvpStatus;
          paid_by_user?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      event_payout_accounts: {
        Row: {
          id: string;
          event_id: string;
          bank_name: string;
          account_title: string;
          account_number: string;
          iban: string | null;
          created_at: string;
        };
        Insert: {
          event_id: string;
          bank_name: string;
          account_title: string;
          account_number: string;
          iban?: string | null;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      event_ticket_plans: {
        Row: { id: string; event_id: string; name: string; price: number; sort_order: number; created_at: string };
        Insert: { event_id: string; name: string; price: number; sort_order?: number };
        Update: { name?: string; price?: number; sort_order?: number };
        Relationships: [];
      };
      event_payment_applications: {
        Row: {
          id: string;
          event_id: string;
          applicant_id: string;
          payout_account_id: string | null;
          proof_screenshot_path: string;
          status: EventApplicationStatus;
          rejection_reason: string | null;
          reservation_code: string | null;
          created_at: string;
          reviewed_at: string | null;
          ticket_plan_id: string | null;
          plan_name: string | null;
          unit_price: number | null;
          quantity: number;
          total_amount: number | null;
        };
        Insert: {
          event_id: string;
          applicant_id: string;
          payout_account_id?: string | null;
          proof_screenshot_path: string;
          status?: EventApplicationStatus;
          ticket_plan_id?: string | null;
          quantity?: number;
        };
        Update: {
          payout_account_id?: string | null;
          proof_screenshot_path?: string;
          ticket_plan_id?: string | null;
          quantity?: number;
          status?: EventApplicationStatus;
          rejection_reason?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      list_network_people: {
        Args: { viewer_id: string };
        Returns: Database['public']['Tables']['profiles']['Row'][];
      };
      profile_stats: {
        Args: { p_user_id: string };
        Returns: { connections_count: number; sessions_count: number }[];
      };
      effective_limits: {
        Args: { uid: string };
        Returns: { community_limit: number | null; event_limit: number | null; demo_upload_allowed: boolean; avatar_custom_allowed: boolean; expert_booking_allowed: boolean }[];
      };
      list_connected_people: {
        Args: { viewer_id: string; search: string | null; limit_count: number; offset_count: number; exclude_ids: string[] };
        Returns: { id: string; display_name: string; roles: string[]; skills: string[]; avatar_uri: string | null; avatar_id: string | null }[];
      };
      admin_get_user_email: {
        Args: { target_id: string };
        Returns: string;
      };
      admin_role_breakdown: {
        Args: Record<string, never>;
        Returns: { role: string; count: number }[];
      };
    };
  };
};

export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export type DemoRow = Database['public']['Tables']['demos']['Row'];
export type DemoInsert = Database['public']['Tables']['demos']['Insert'];
export type DemoUpdate = Database['public']['Tables']['demos']['Update'];

export type DemoReviewRow = Database['public']['Tables']['demo_reviews']['Row'];
export type DemoBookmarkRow = Database['public']['Tables']['demo_bookmarks']['Row'];
export type DemoReviewVoteRow = Database['public']['Tables']['demo_review_votes']['Row'];
export type DemoReviewInsert = Database['public']['Tables']['demo_reviews']['Insert'];

export type DemoCommentRow = Database['public']['Tables']['demo_comments']['Row'];
export type PostRow = Database['public']['Tables']['posts']['Row'];
export type PostInsert = Database['public']['Tables']['posts']['Insert'];
export type PostUpdate = Database['public']['Tables']['posts']['Update'];
export type PostReactionRow = Database['public']['Tables']['post_reactions']['Row'];
export type PostCommentRow = Database['public']['Tables']['post_comments']['Row'];
export type DemoCommentInsert = Database['public']['Tables']['demo_comments']['Insert'];

export type CommunityRow = Database['public']['Tables']['communities']['Row'];
export type CommunityInsert = Database['public']['Tables']['communities']['Insert'];

export type ChatroomRow = Database['public']['Tables']['chatrooms']['Row'];
export type ChatroomInsert = Database['public']['Tables']['chatrooms']['Insert'];
export type ChatroomUpdate = Database['public']['Tables']['chatrooms']['Update'];

export type ChatroomMemberRow = Database['public']['Tables']['chatroom_members']['Row'];

export type RoomInviteRow = Database['public']['Tables']['room_invites']['Row'];
export type RoomJoinRequestRow = Database['public']['Tables']['room_join_requests']['Row'];

export type ChatroomMessageRow = Database['public']['Tables']['chatroom_messages']['Row'];
export type ChatroomMessageInsert = Database['public']['Tables']['chatroom_messages']['Insert'];

export type EventRow = Database['public']['Tables']['events']['Row'];
export type EventInsert = Database['public']['Tables']['events']['Insert'];
export type EventUpdate = Database['public']['Tables']['events']['Update'];

export type EventRsvpRow = Database['public']['Tables']['event_rsvps']['Row'];

export type EventPayoutAccountRow = Database['public']['Tables']['event_payout_accounts']['Row'];
export type EventTicketPlanRow = Database['public']['Tables']['event_ticket_plans']['Row'];
export type EventPaymentApplicationRow = Database['public']['Tables']['event_payment_applications']['Row'];

export type ExpertRow = Database['public']['Tables']['experts']['Row'];
export type ExpertInsert = Database['public']['Tables']['experts']['Insert'];
export type ExpertUpdate = Database['public']['Tables']['experts']['Update'];

export type BookingRow = Database['public']['Tables']['bookings']['Row'];
export type ExpertReviewRow = Database['public']['Tables']['expert_reviews']['Row'];
export type BookingInsert = Database['public']['Tables']['bookings']['Insert'];

export type ConnectionRow = Database['public']['Tables']['connections']['Row'];

export type TeamStage = 'idea' | 'prototype' | 'vertical_slice' | 'production' | 'live';
export type TeamCompensation = 'paid' | 'revenue_share' | 'unpaid';

export type TeamRequestRow = Database['public']['Tables']['team_requests']['Row'];
export type TeamRequestInsert = Database['public']['Tables']['team_requests']['Insert'];

export type NotificationRow = Database['public']['Tables']['notifications']['Row'];

export type UserSettingsRow = Database['public']['Tables']['user_settings']['Row'];
export type BlockedUserRow = Database['public']['Tables']['blocked_users']['Row'];

export type ExpertAvailabilityRow = Database['public']['Tables']['expert_availability']['Row'];
export type ExpertTimeSlotRow = Database['public']['Tables']['expert_time_slots']['Row'];

export type SubscriptionPlanRow = Database['public']['Tables']['subscription_plans']['Row'];
export type SubscriptionPlanInsert = Database['public']['Tables']['subscription_plans']['Insert'];
export type SubscriptionPlanUpdate = Database['public']['Tables']['subscription_plans']['Update'];

export type UserSubscriptionRow = Database['public']['Tables']['user_subscriptions']['Row'];

export type PaymentOrderRow = Database['public']['Tables']['payment_orders']['Row'];
export type PaymentWebhookEventRow = Database['public']['Tables']['payment_webhook_events']['Row'];

export type SupportTicketRow = Database['public']['Tables']['support_tickets']['Row'];
export type SupportTicketMessageRow = Database['public']['Tables']['support_ticket_messages']['Row'];
