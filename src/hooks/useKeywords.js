"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useKeywords(serviceFilter) {
  const { profile, isAdmin } = useAuth();
  const [keywords, setKeywords] = useState([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchKeywords = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("keywords").select("*").order("created_at", { ascending: false });
    if (!isAdmin && profile?.assigned_service) {
      query = query.eq("service", profile.assigned_service);
    } else if (serviceFilter && serviceFilter !== "all") {
      query = query.eq("service", serviceFilter);
    }
    const { data, error } = await query;
    if (!error) setKeywords(data || []);
    setLoading(false);
  }, [supabase, isAdmin, profile, serviceFilter]);

  useEffect(() => {
    fetchKeywords();
  }, [fetchKeywords]);

  return { keywords, loading, refetch: fetchKeywords, setKeywords };
}
