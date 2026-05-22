"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useLinks(serviceFilter, typeFilter) {
  const { profile, isAdmin } = useAuth();
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("backlinks").select("*").order("created_at", { ascending: false });
    if (!isAdmin && profile?.assigned_service) {
      query = query.eq("service", profile.assigned_service);
    } else if (serviceFilter && serviceFilter !== "all") {
      query = query.eq("service", serviceFilter);
    }
    if (typeFilter === "guest_post") query = query.eq("type", "guest_post");
    if (typeFilter === "backlink") query = query.eq("type", "backlink");
    const { data, error } = await query;
    if (!error) setLinks(data || []);
    setLoading(false);
  }, [supabase, isAdmin, profile, serviceFilter, typeFilter]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  return { links, loading, refetch: fetchLinks, setLinks };
}
