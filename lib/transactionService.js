import { supabase } from "./supabaseClient";

const MAX_TRANSACTION_ROWS = 200;
const FETCH_COOLDOWN_MS = 4000;

let lastFetchAt = 0;
let cachedRows = [];

const mapTransactionError = (error) => {
  if (!error) {
    return error;
  }

  const message = error.message || "";
  if (error.status === 429 || message.toLowerCase().includes("rate limit")) {
    return {
      ...error,
      message: "Rate limit reached. Please wait a moment and try again.",
    };
  }

  if (message.includes("public.transaction_sheet")) {
    return {
      ...error,
      message:
        "Supabase table public.transaction_sheet is missing in schema cache. Run data/transactions.psql in Supabase SQL Editor, then refresh the dashboard.",
    };
  }

  if (message.includes("get_transaction_sheet_limited")) {
    return {
      ...error,
      message:
        "Supabase function get_transaction_sheet_limited is missing. Run data/transactions.psql in Supabase SQL Editor, then refresh the dashboard.",
    };
  }

  return error;
};

export const getTransactionSheet = async ({
  force = false,
  limit = MAX_TRANSACTION_ROWS,
} = {}) => {
  const now = Date.now();
  if (
    !force &&
    cachedRows.length > 0 &&
    now - lastFetchAt < FETCH_COOLDOWN_MS
  ) {
    return {
      data: cachedRows,
      error: null,
      fromCache: true,
    };
  }

  const safeLimit = Math.min(
    Math.max(Number(limit) || MAX_TRANSACTION_ROWS, 1),
    MAX_TRANSACTION_ROWS,
  );
  const { data, error } = await supabase.rpc("get_transaction_sheet_limited", {
    p_limit: safeLimit,
  });

  if (!error) {
    cachedRows = data || [];
    lastFetchAt = now;
  }

  return {
    data: data || [],
    error: mapTransactionError(error),
    fromCache: false,
  };
};

export const addTransaction = async (transaction) => {
  const { data, error } = await supabase
    .from("transaction_sheet")
    .insert([transaction])
    .select();

  if (!error && data) {
    // Clear cache to force refresh
    cachedRows = [];
    lastFetchAt = 0;
  }

  return {
    data: data || [],
    error: mapTransactionError(error),
  };
};

export const deleteTransaction = async (id) => {
  const { error } = await supabase
    .from("transaction_sheet")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (!error) {
    // Clear cache to force refresh
    cachedRows = [];
    lastFetchAt = 0;
  }

  return {
    error: mapTransactionError(error),
  };
};

export const restoreTransaction = async (id) => {
  const { error } = await supabase
    .from("transaction_sheet")
    .update({ deleted_at: null })
    .eq("id", id);

  if (!error) {
    // Clear cache to force refresh
    cachedRows = [];
    lastFetchAt = 0;
  }

  return {
    error: mapTransactionError(error),
  };
};

export const createNotification = async (type, message, adminEmail) => {
  const { data, error } = await supabase
    .from("notifications")
    .insert([
      {
        type,
        message,
        admin_email: adminEmail,
      },
    ])
    .select();

  return {
    data: data || [],
    error: mapTransactionError(error),
  };
};

export const getNotifications = async () => {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  return {
    data: data || [],
    error: mapTransactionError(error),
  };
};
