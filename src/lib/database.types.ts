// Hand-written to match supabase/migrations/0001_init.sql.
// If the schema changes, regenerate with:
//   npx supabase gen types typescript --project-id <ref> > src/lib/database.types.ts

export type PublicOrPrivate = "public" | "private" | "unknown";
export type FriendshipStatus = "pending" | "accepted";

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string | null;
          email: string;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          name?: string | null;
          email: string;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
        Relationships: [];
      };
      courses: {
        Row: {
          id: string;
          name: string;
          city: string | null;
          state: string | null;
          public_or_private: PublicOrPrivate;
          photo_url: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          city?: string | null;
          state?: string | null;
          public_or_private?: PublicOrPrivate;
          photo_url?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["courses"]["Insert"]>;
        Relationships: [];
      };
      plays: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          date_played: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          date_played?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["plays"]["Insert"]>;
        Relationships: [];
      };
      comparisons: {
        Row: {
          id: string;
          user_id: string;
          course_id_winner: string;
          course_id_loser: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id_winner: string;
          course_id_loser: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["comparisons"]["Insert"]>;
        Relationships: [];
      };
      friendships: {
        Row: {
          id: string;
          user_id: string;
          friend_id: string;
          status: FriendshipStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          friend_id: string;
          status?: FriendshipStatus;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["friendships"]["Insert"]>;
        Relationships: [];
      };
      want_to_play: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["want_to_play"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      find_user_by_email: {
        Args: { lookup_email: string };
        Returns: { id: string; name: string | null; email: string }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
