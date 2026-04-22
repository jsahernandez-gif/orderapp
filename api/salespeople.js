const {
  buildSalespersonPayload,
  createAuthUser,
  createSalespersonRow,
  deleteAuthUser,
  deleteSalespersonRow,
  json,
  listAdmins,
  readBody,
  requireAdmin,
  updateAuthUser,
  updateSalespersonRow,
  getSalespersonById,
  looksLikeUuid,
} = require("./_lib/supabase");

module.exports = async function handler(req, res) {
  try {
    await requireAdmin(req);

    if (req.method === "POST") {
      const body = await readBody(req);
      const payload = buildSalespersonPayload(body);

      if (!payload.name) return json(res, 400, { error: "Name is required" });
      if (!payload.auth_email && !payload.phone_digits) return json(res, 400, { error: "Email or phone is required" });
      if (!body.password) return json(res, 400, { error: "Password is required" });

      let createdUser = null;
      try {
        const created = await createAuthUser({
          email: payload.auth_email,
          password: body.password,
          name: payload.name,
          phone: payload.phone,
        });
        createdUser = created.user;

        const salesperson = await createSalespersonRow({
          ...payload,
          auth_user_id: createdUser.id,
        });

        return json(res, 200, salesperson);
      } catch (error) {
        if (createdUser?.id) {
          try { await deleteAuthUser(createdUser.id); } catch {}
        }
        throw error;
      }
    }

    if (req.method === "PATCH") {
      const body = await readBody(req);
      if (!body.id) return json(res, 400, { error: "Salesperson id is required" });

      const existing = await getSalespersonById(body.id);
      if (!existing) return json(res, 404, { error: "Salesperson not found" });

      const admins = await listAdmins();
      if (existing.is_admin && body.is_admin === false && admins.length <= 1) {
        return json(res, 409, { error: "At least one admin must remain active" });
      }

      const payload = buildSalespersonPayload(body, existing);
      if (!payload.name) return json(res, 400, { error: "Name is required" });
      if (!payload.auth_email && !payload.phone_digits) return json(res, 400, { error: "Email or phone is required" });

      let authUserId = existing.auth_user_id;
      if (looksLikeUuid(authUserId)) {
        await updateAuthUser(authUserId, {
          email: payload.auth_email,
          password: body.password || "",
          name: payload.name,
          phone: payload.phone,
        });
      } else if (body.password) {
        const created = await createAuthUser({
          email: payload.auth_email,
          password: body.password,
          name: payload.name,
          phone: payload.phone,
        });
        authUserId = created.user?.id || null;
      }

      const salesperson = await updateSalespersonRow(existing.id, { ...payload, auth_user_id: authUserId || existing.auth_user_id || null });
      return json(res, 200, salesperson);
    }

    if (req.method === "DELETE") {
      const id = String(req.query.id || "").trim();
      if (!id) return json(res, 400, { error: "Salesperson id is required" });

      const existing = await getSalespersonById(id);
      if (!existing) return json(res, 404, { error: "Salesperson not found" });

      const admins = await listAdmins();
      if (existing.is_admin && admins.length <= 1) {
        return json(res, 409, { error: "At least one admin must remain active" });
      }

      if (looksLikeUuid(existing.auth_user_id)) await deleteAuthUser(existing.auth_user_id);
      await deleteSalespersonRow(id);
      return json(res, 200, { ok: true });
    }

    return json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    return json(res, error.status || 500, { error: error.message || "Unexpected error" });
  }
};
