"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function usePages(serviceFilter, weekFilter, yearFilter) {
  const { isAdmin, user } = useAuth();
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchPages = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("page_rankings")
      .select("*")
      .order("clicks", { ascending: false });

    if (!isAdmin && user?.id) {
      query = query.eq("created_by", user.id);
    } else if (serviceFilter && serviceFilter !== "all") {
      query = query.eq("service", serviceFilter);
    }
    if (weekFilter && weekFilter !== "all") {
      query = query.eq("week_number", Number(weekFilter));
    }
    if (yearFilter && yearFilter !== "all") {
      query = query.eq("year", Number(yearFilter));
    }

    const { data, error } = await query;
    if (!error) setPages(data || []);
    setLoading(false);
  }, [supabase, isAdmin, user, serviceFilter, weekFilter, yearFilter]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  return { pages, loading, refetch: fetchPages };
}
