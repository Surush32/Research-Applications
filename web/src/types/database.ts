export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  website: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfileUpdate = Pick<
  Profile,
  "full_name" | "username" | "bio" | "avatar_url" | "website"
>;
