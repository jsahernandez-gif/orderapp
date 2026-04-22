const {
  json,
  readBody,
  requireAdmin,
  supabaseFetch,
  verifyUserPassword,
} = require("./_lib/supabase");

const deleteRows = (table, filter = "id=not.is.null") => (
  supabaseFetch(`/rest/v1/${table}?${filter}`, { method: "DELETE" })
);

const selectRows = (table, query) => (
  supabaseFetch(`/rest/v1/${table}?${query}`, { method: "GET" })
);

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

    const { user } = await requireAdmin(req);
    const body = await readBody(req);
    const action = String(body.action || "");
    const password = String(body.password || "");

    await verifyUserPassword(user?.email, password);

    if (action === "delete-company") {
      const companyId = String(body.companyId || "").trim();
      if (!companyId) return json(res, 400, { error: "Company id is required" });

      const orders = await selectRows("orders", `select=id&company_id=eq.${encodeURIComponent(companyId)}&limit=1`);
      if (Array.isArray(orders) && orders.length > 0) {
        return json(res, 409, { error: "This company has orders/invoices and cannot be deleted. Deactivate it instead." });
      }

      await deleteRows("ncf_history", `company_id=eq.${encodeURIComponent(companyId)}`);
      await deleteRows("ncf_config", `company_id=eq.${encodeURIComponent(companyId)}`);
      await deleteRows("companies", `id=eq.${encodeURIComponent(companyId)}`);
      return json(res, 200, { ok: true });
    }

    if (action === "delete-products") {
      await deleteRows("products");
      return json(res, 200, { ok: true });
    }

    if (action === "delete-clients") {
      const orders = await selectRows("orders", "select=id&client_id=not.is.null&limit=1");
      if (Array.isArray(orders) && orders.length > 0) {
        return json(res, 409, { error: "Clients are used by orders/invoices. Use Full reset or delete related orders first." });
      }
      await deleteRows("clients");
      return json(res, 200, { ok: true });
    }

    if (action === "full-reset") {
      await deleteRows("orders");
      await deleteRows("products");
      await deleteRows("clients");
      return json(res, 200, { ok: true });
    }

    return json(res, 400, { error: "Unknown admin action" });
  } catch (error) {
    return json(res, error.status || 500, { error: error.message || "Admin action failed" });
  }
};
