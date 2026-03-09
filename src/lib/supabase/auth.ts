import { createClient } from "./server";
import type { User } from "@supabase/supabase-js";

export async function getUser(): Promise<User | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}
