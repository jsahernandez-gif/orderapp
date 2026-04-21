const {
  digitsOnly,
  getSalespersonByPhoneDigits,
  json,
  looksLikeEmail,
  readBody,
  supabaseFetch,
  SUPABASE_ANON_KEY,
} = require("../_lib/supabase");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  try {
    const body = await readBody(req);
    const identifier = String(body.identifier || "").trim();
    const password = String(body.password || "");

    if (!identifier || !password) return json(res, 400, { error: "Identifier and password are required" });

    let email = identifier.toLowerCase();
    if (!looksLikeEmail(identifier)) {
      const phoneDigits = digitsOnly(identifier);
      const salesperson = await getSalespersonByPhoneDigits(phoneDigits);
      email = salesperson?.auth_email || salesperson?.email || "";
    }

    if (!email) return json(res, 401, { error: "Invalid credentials" });

    const session = await supabaseFetch("/auth/v1/token?grant_type=password", {
      method: "POST",
      token: SUPABASE_ANON_KEY,
      apikey: SUPABASE_ANON_KEY,
      body: {
        email,
        password,
      },
    });

    return json(res, 200, session);
  } catch (error) {
    return json(res, error.status || 401, { error: "Invalid credentials" });
  }
};
