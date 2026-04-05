import { supabase } from "./supabaseClient";

const normalizeRole = (role) => {
  const roles = ["viewer", "analyst", "admin"];
  return roles.includes(role) ? role : "viewer";
};

const mapProfileError = (error) => {
  if (!error) {
    return error;
  }

  const message = error.message || "";
  if (message.includes("Could not find the table 'public.user_profiles'")) {
    return {
      ...error,
      message:
        "Supabase table public.user_profiles is missing in schema cache. Run data/user.psql in Supabase SQL Editor, then try again.",
    };
  }

  return error;
};

const upsertUserProfile = async (email, role) => {
  const { error } = await supabase.from("user_profiles").upsert(
    {
      email: email.toLowerCase(),
      role: normalizeRole(role),
    },
    { onConflict: "email" },
  );

  return { error };
};

export const signUp = async (email, password, role) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: normalizeRole(role),
      },
    },
  });

  if (!error && data?.user?.email) {
    const profileResult = await upsertUserProfile(data.user.email, role);
    if (profileResult.error) {
      return { data, error: mapProfileError(profileResult.error) };
    }
  }

  return { data, error };
};

export const signIn = async (email, password, role) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (!error && data?.user?.email) {
    const profileResult = await upsertUserProfile(data.user.email, role);
    if (profileResult.error) {
      return { data, error: mapProfileError(profileResult.error) };
    }
  }

  return { data, error };
};

export const getUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const onAuthStateChange = (callback) => {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });

  return () => {
    subscription.unsubscribe();
  };
};
