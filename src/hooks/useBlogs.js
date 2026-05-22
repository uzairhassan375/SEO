"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useBlogs(serviceFilter, statusFilter) {
  const { profile, isAdmin } = useAuth();
  const [blogs, setBlogs] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchBlogs = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("blogs")
      .select("*")
      .order("created_at", { ascending: false });

    if (!isAdmin && profile?.assigned_service) {
      query = query.eq("service", profile.assigned_service);
    } else if (serviceFilter && serviceFilter !== "all") {
      query = query.eq("service", serviceFilter);
    }
    if (statusFilter && statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const [{ data: blogData }, { data: profData }] = await Promise.all([
      query,
      supabase.from("profiles").select("id, full_name, email, avatar_url"),
    ]);

    setBlogs(blogData || []);
    setProfiles(profData || []);
    setLoading(false);
  }, [supabase, isAdmin, profile, serviceFilter, statusFilter]);

  useEffect(() => {
    if (profile) fetchBlogs();
  }, [profile, fetchBlogs]);

  return { blogs, profiles, loading, refetch: fetchBlogs };
}
