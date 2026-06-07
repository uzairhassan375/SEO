"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useKeywords(serviceFilter) {
  const { isAdmin, user } = useAuth();
  const [keywords, setKeywords] = useState([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchKeywords = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("keywords").select("*").order("created_at", { ascending: false });
    if (!isAdmin && user?.id) {
      query = query.eq("added_by", user.id);
    } else if (serviceFilter && serviceFilter !== "all") {
      query = query.eq("service", serviceFilter);
    }
    const { data, error } = await query;
    if (!error) setKeywords(data || []);
    setLoading(false);
  }, [supabase, isAdmin, user, serviceFilter]);

  useEffect(() => {
    fetchKeywords();
  }, [fetchKeywords]);

  return { keywords, loading, refetch: fetchKeywords, setKeywords };
}
