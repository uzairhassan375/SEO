"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { isAdminProfile, ADMIN_EMAIL } from "@/lib/constants";

const PROFILE_FIELDS =
  "id, email, full_name, role, assigned_service, avatar_url";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const initDone = useRef(false);
  const supabase = useMemo(() => (hasSupabaseEnv() ? createClient() : null), []);

  const ensureProfile = useCallback(
    async (authUser) => {
      if (!supabase) return null;
      if (!authUser) {
        setProfile(null);
        return null;
      }

      const { data: existing } = await supabase
        .from("profiles")
        .select(PROFILE_FIELDS)
        .eq("id", authUser.id)
        .maybeSingle();

      if (existing) {
        if (existing.email === ADMIN_EMAIL && existing.role !== "admin") {
          existing.role = "admin";
        }
        setProfile(existing);
        return existing;
      }

      const newProfile = {
        id: authUser.id,
        email: authUser.email,
        full_name:
          authUser.user_metadata?.full_name ||
          authUser.email?.split("@")[0] ||
          "User",
        role: authUser.email === ADMIN_EMAIL ? "admin" : "member",
        assigned_service: null,
      };

      const { data: created, error } = await supabase
        .from("profiles")
        .insert(newProfile)
        .select(PROFILE_FIELDS)
        .single();

      if (error) {
        console.error("Profile create failed:", error);
        setProfile(newProfile);
        return newProfile;
      }

      setProfile(created);
      return created;
    },
    [supabase]
  );

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        const authUser = session?.user ?? null;
        setUser(authUser);
        setLoading(false);
        initDone.current = true;
        if (authUser) ensureProfile(authUser);
        else setProfile(null);
      } catch (e) {
        console.error("Auth init error:", e);
        if (mounted) setLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "INITIAL_SESSION" && initDone.current) return;

        const authUser = session?.user ?? null;
        setUser(authUser);
        if (authUser) ensureProfile(authUser);
        else setProfile(null);
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, ensureProfile]);

  const signIn = async (email, password) => {
    if (!supabase) {
      throw new Error(
        "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
      );
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

    const authUser = data.user;
    setUser(authUser);
    setLoading(false);
    if (authUser) ensureProfile(authUser);
    return authUser;
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) await ensureProfile(user);
  };

  const isAdmin = isAdminProfile(profile);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAdmin,
        signIn,
        signOut,
        refreshProfile,
        supabase,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
