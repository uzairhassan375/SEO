"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useTasks(weekNumber) {
  const { isAdmin, user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("tasks").select("*").order("due_date", { ascending: true });

    if (weekNumber) query = query.eq("week_number", weekNumber);
    if (!isAdmin && user?.id) {
      query = query.eq("assigned_to", user.id);
    }

    const { data, error } = await query;
    if (!error) setTasks(data || []);
    setLoading(false);
  }, [supabase, isAdmin, user, weekNumber]);

  const fetchProfiles = useCallback(async () => {
    const { data } = await supabase.from("profiles").select("id, full_name, email, assigned_service");
    setProfiles(data || []);
  }, [supabase]);

  useEffect(() => {
    fetchTasks();
    fetchProfiles();
  }, [fetchTasks, fetchProfiles]);

  return { tasks, profiles, loading, refetch: fetchTasks, setTasks };
}
