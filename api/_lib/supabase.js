const SUPABASE_URL = process.env.SUPABASE_URL || "https://gptrtvsigrkpporzhomv.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwdHJ0dnNpZ3JrcHBvcnpob212Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0ODc4NzksImV4cCI6MjA5MjA2Mzg3OX0.X43NfdKRx2vgKwpEyFUAqGs3i0W-fydfMolEhPVKt3w";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const INTERNAL_AUTH_DOMAIN = "auth.orderapp.local";

const DEFAULT_PERMS = { orders: true, clients: true, products: true, companies: false, team: false, settings: false };
const ADMIN_PERMS = { orders: true, clients: true, products: true, companies: true, team: true, settings: true };

const json = (res, status, payload) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
};

const ensureServiceRole = () => {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    const error = new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
    error.status = 500;
    throw error;
  }
};

const readBody = async (req) => {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
};

const digitsOnly = (value = "") => String(value).replace(/\D/g, "");
const looksLikeEmail = (value = "") => /\S+@\S+\.\S+/.test(String(value).trim());
const buildAuthEmail = ({ email, phoneDigits }) => {
  if (email) return email;
  if (phoneDigits) return `user-${phoneDigits}@${INTERNAL_AUTH_DOMAIN}`;
  return "";
};
const normalizePermissions = (isAdmin, permissions = {}) => (
  isAdmin ? { ...ADMIN_PERMS } : { ...DEFAULT_PERMS, ...(permissions || {}) }
);

const supabaseFetch = async (path, { method = "GET", token = SUPABASE_SERVICE_ROLE_KEY, apikey = SUPABASE_SERVICE_ROLE_KEY, body, headers = {} } = {}) => {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(apikey ? { apikey } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text || null;
  }

  if (!response.ok) {
    const error = new Error(data?.msg || data?.message || data?.error_description || data?.error || "Supabase request failed");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

const getUserFromToken = async (accessToken) => {
  if (!accessToken) return null;
  return supabaseFetch("/auth/v1/user", {
    method: "GET",
    token: accessToken,
    apikey: SUPABASE_ANON_KEY,
  });
};

const selectSingle = async (path) => {
  const rows = await supabaseFetch(path, {
    method: "GET",
    headers: { Prefer: "return=representation" },
  });
  return Array.isArray(rows) ? rows[0] || null : null;
};

const getSalespersonByAuthUserId = async (authUserId) => {
  ensureServiceRole();
  return selectSingle(`/rest/v1/salespeople?select=*&auth_user_id=eq.${encodeURIComponent(authUserId)}&limit=1`);
};

const getSalespersonById = async (id) => {
  ensureServiceRole();
  return selectSingle(`/rest/v1/salespeople?select=*&id=eq.${encodeURIComponent(id)}&limit=1`);
};

const getSalespersonByPhoneDigits = async (phoneDigits) => {
  ensureServiceRole();
  return selectSingle(`/rest/v1/salespeople?select=*&phone_digits=eq.${encodeURIComponent(phoneDigits)}&limit=1`);
};

const listAdmins = async () => {
  ensureServiceRole();
  const rows = await supabaseFetch("/rest/v1/salespeople?select=id,is_admin&is_admin=is.true");
  return Array.isArray(rows) ? rows : [];
};

const createSalespersonRow = async (payload) => {
  ensureServiceRole();
  const rows = await supabaseFetch("/rest/v1/salespeople", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: [payload],
  });
  return Array.isArray(rows) ? rows[0] : rows;
};

const updateSalespersonRow = async (id, payload) => {
  ensureServiceRole();
  const rows = await supabaseFetch(`/rest/v1/salespeople?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: payload,
  });
  return Array.isArray(rows) ? rows[0] : rows;
};

const deleteSalespersonRow = async (id) => {
  ensureServiceRole();
  await supabaseFetch(`/rest/v1/salespeople?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
};

const createAuthUser = async ({ email, password, name, phone }) => {
  ensureServiceRole();
  return supabaseFetch("/auth/v1/admin/users", {
    method: "POST",
    body: {
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        phone: phone || null,
      },
    },
  });
};

const updateAuthUser = async (authUserId, { email, password, name, phone }) => {
  ensureServiceRole();
  const payload = {
    email,
    user_metadata: {
      name,
      phone: phone || null,
    },
  };
  if (password) payload.password = password;
  return supabaseFetch(`/auth/v1/admin/users/${encodeURIComponent(authUserId)}`, {
    method: "PUT",
    body: payload,
  });
};

const deleteAuthUser = async (authUserId) => {
  ensureServiceRole();
  await supabaseFetch(`/auth/v1/admin/users/${encodeURIComponent(authUserId)}`, {
    method: "DELETE",
  });
};

const requireAdmin = async (req) => {
  ensureServiceRole();
  const authHeader = req.headers.authorization || req.headers.Authorization || "";
  const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!accessToken) {
    const error = new Error("Missing authorization token");
    error.status = 401;
    throw error;
  }

  const user = await getUserFromToken(accessToken);
  const salesperson = await getSalespersonByAuthUserId(user?.id);
  if (!salesperson?.is_admin) {
    const error = new Error("Admin access required");
    error.status = 403;
    throw error;
  }

  return { user, salesperson };
};

const buildSalespersonPayload = (body, existing = null) => {
  const hasEmailField = Object.prototype.hasOwnProperty.call(body, "email");
  const hasPhoneField = Object.prototype.hasOwnProperty.call(body, "phone");
  const hasPermissionsField = Object.prototype.hasOwnProperty.call(body, "permissions");
  const rawEmail = hasEmailField ? String(body.email || "").trim().toLowerCase() : String(existing?.email || "").trim().toLowerCase();
  const rawPhone = hasPhoneField ? String(body.phone || "").trim() : String(existing?.phone || "").trim();
  const phoneDigits = digitsOnly(rawPhone);
  const authEmail = buildAuthEmail({ email: rawEmail, phoneDigits }) || existing?.auth_email || existing?.email || "";
  const isAdmin = Object.prototype.hasOwnProperty.call(body, "is_admin") ? Boolean(body.is_admin) : Boolean(existing?.is_admin);

  return {
    name: String(body.name || existing?.name || "").trim(),
    role: String(body.role || existing?.role || "").trim(),
    email: rawEmail || null,
    auth_email: authEmail || null,
    phone: rawPhone || null,
    phone_digits: phoneDigits || null,
    is_admin: isAdmin,
    permissions: normalizePermissions(isAdmin, hasPermissionsField ? body.permissions : existing?.permissions),
  };
};

module.exports = {
  ADMIN_PERMS,
  DEFAULT_PERMS,
  buildAuthEmail,
  buildSalespersonPayload,
  createAuthUser,
  createSalespersonRow,
  deleteAuthUser,
  deleteSalespersonRow,
  digitsOnly,
  getSalespersonByAuthUserId,
  getSalespersonById,
  getSalespersonByPhoneDigits,
  json,
  listAdmins,
  looksLikeEmail,
  normalizePermissions,
  readBody,
  requireAdmin,
  supabaseFetch,
  SUPABASE_ANON_KEY,
  updateAuthUser,
  updateSalespersonRow,
};
