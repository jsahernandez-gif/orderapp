
// ─── Supabase via CDN ────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";

const SUPA_URL = "https://gptrtvsigrkpporzhomv.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwdHJ0dnNpZ3JrcHBvcnpob212Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0ODc4NzksImV4cCI6MjA5MjA2Mzg3OX0.X43NfdKRx2vgKwpEyFUAqGs3i0W-fydfMolEhPVKt3w";

// ─── Minimal Supabase client ─────────────────────────────────────────────────
const headers = (extra = {}) => ({
  "Content-Type": "application/json",
  "apikey": SUPA_KEY,
  "Authorization": `Bearer ${window.__sb_token || SUPA_KEY}`,
  ...extra,
});

const sb = {
  // Auth
  auth: {
    signIn: async (email, password) => {
      const r = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=password`, {
        method: "POST", headers: headers(),
        body: JSON.stringify({ email, password }),
      });
      return r.json();
    },
    signOut: async () => {
      await fetch(`${SUPA_URL}/auth/v1/logout`, { method: "POST", headers: headers() });
      window.__sb_token = null;
    },
    getUser: async () => {
      if (!window.__sb_token) return null;
      const r = await fetch(`${SUPA_URL}/auth/v1/user`, { headers: headers() });
      if (!r.ok) return null;
      return r.json();
    },
  },
  // DB
  from: (table) => ({
    select: async (cols = "*", opts = {}) => {
      let url = `${SUPA_URL}/rest/v1/${table}?select=${cols}`;
      if (opts.eq) Object.entries(opts.eq).forEach(([k, v]) => url += `&${k}=eq.${v}`);
      if (opts.order) url += `&order=${opts.order}`;
      if (opts.limit) url += `&limit=${opts.limit}`;
      const r = await fetch(url, { headers: headers({ "Prefer": "return=representation" }) });
      return r.json();
    },
    insert: async (data) => {
      const r = await fetch(`${SUPA_URL}/rest/v1/${table}`, {
        method: "POST", headers: headers({ "Prefer": "return=representation" }),
        body: JSON.stringify(Array.isArray(data) ? data : [data]),
      });
      const json = await r.json();
      return Array.isArray(json) ? json[0] : json;
    },
    update: async (data, opts = {}) => {
      let url = `${SUPA_URL}/rest/v1/${table}?`;
      if (opts.eq) Object.entries(opts.eq).forEach(([k, v]) => url += `${k}=eq.${encodeURIComponent(v)}&`);
      const r = await fetch(url, {
        method: "PATCH", headers: headers({ "Prefer": "return=representation" }),
        body: JSON.stringify(data),
      });
      return r.json();
    },
    upsert: async (data, opts = {}) => {
      const r = await fetch(`${SUPA_URL}/rest/v1/${table}`, {
        method: "POST",
        headers: headers({ "Prefer": `resolution=merge-duplicates,return=representation` }),
        body: JSON.stringify(Array.isArray(data) ? data : [data]),
      });
      return r.json();
    },
    delete: async (opts = {}) => {
      let url = `${SUPA_URL}/rest/v1/${table}?`;
      if (opts.eq) Object.entries(opts.eq).forEach(([k, v]) => url += `${k}=eq.${encodeURIComponent(v)}&`);
      await fetch(url, { method: "DELETE", headers: headers() });
    },
    rpc: async (fn, params = {}) => {
      const r = await fetch(`${SUPA_URL}/rest/v1/rpc/${fn}`, {
        method: "POST", headers: headers(),
        body: JSON.stringify(params),
      });
      return r.json();
    },
  }),
  // Realtime via Server-Sent Events polling fallback
  subscribe: (table, cb) => {
    let active = true;
    const poll = async () => {
      while (active) {
        await new Promise(r => setTimeout(r, 4000));
        if (active) cb();
      }
    };
    poll();
    return () => { active = false; };
  },
};

// ─── i18n ────────────────────────────────────────────────────────────────────
const T = {
  en: {
    login:"Sign In", logout:"Sign Out", email:"Email", password:"Password",
    loginError:"Invalid email or password.", loading:"Loading…",
    newOrder:"New Order", clients:"Clients", products:"Products",
    history:"History", salesTeam:"Team", profile:"Business", settings:"Settings",
    selectClient:"Select Client", searchProducts:"Search…", all:"All",
    cart:"Cart", clear:"Clear", discount:"Discount %", notes:"Notes…",
    subtotal:"Subtotal", total:"Total", quotation:"Quotation", invoice:"Invoice",
    change:"Change", noItems:"Add products to get started.",
    salesperson:"Salesperson", selectSp:"Assign salesperson",
    addClient:"Add Client", searchClients:"Search clients…",
    edit:"Edit", delete:"Delete", noClients:"No clients yet.",
    viewProfile:"Profile", clientProfile:"Client Profile",
    totalOrders:"Orders", totalSpent:"Paid", pendingLbl:"Pending",
    addProduct:"Add Product", noProducts:"No products yet.",
    price:"Price", unit:"Unit", name:"Name",
    phone:"Phone", address:"Address", newCategory:"New Category", add:"Add",
    orderHistory:"Orders", noOrders:"No orders yet.",
    status:"Status", ordered:"Ordered", delivered:"Delivered",
    paid:"Paid", cancelled:"Cancelled", changeStatus:"Change Status",
    confirmDelete:"Delete this permanently?", confirmBtn:"Delete",
    editOrder:"Edit", addSp:"Add Member", noTeam:"No team members yet.",
    spName:"Full Name", role:"Role", businessProfile:"Business",
    businessName:"Business Name", rnc:"RNC / Tax ID",
    bPhone:"Phone", bEmail:"Email", bAddress:"Address",
    uploadLogo:"Upload Logo", logoHint:"PNG or JPG · max 2MB",
    saveProfile:"Save", profileSaved:"Saved ✓",
    settingsTitle:"Settings", language:"Language",
    currency:"Currency", currSymbol:"Symbol", currPos:"Position",
    before:"$100", after:"100$", taxes:"Taxes", taxName:"Name",
    taxRate:"Rate %", addTax:"Add Tax", removeTax:"Remove",
    save:"Save", close:"Close", cancel:"Cancel",
    print:"Print / PDF", shareWA:"WhatsApp", date:"Date", billTo:"Bill To",
    withTax:"Tax included", withoutTax:"No tax",
    orderNum:"Order #", setSequence:"Set starting order number",
    sequenceSaved:"Sequence saved.",
    adminOnly:"Admin only", welcome:"Welcome",
    qty:"Qty", manualQty:"Type quantity",
    waMsg: (doc, items, total) =>
      `Hello ${doc.client_snapshot?.name},\n\nHere is your ${doc.type} *${doc.order_number}*:\n\n${items}\n\n*Total: ${total}*\n\nThank you!`,
  },
  es: {
    login:"Iniciar Sesión", logout:"Cerrar Sesión", email:"Correo", password:"Contraseña",
    loginError:"Correo o contraseña incorrectos.", loading:"Cargando…",
    newOrder:"Nuevo Pedido", clients:"Clientes", products:"Productos",
    history:"Historial", salesTeam:"Equipo", profile:"Empresa", settings:"Ajustes",
    selectClient:"Seleccionar Cliente", searchProducts:"Buscar…", all:"Todos",
    cart:"Carrito", clear:"Limpiar", discount:"Descuento %", notes:"Notas…",
    subtotal:"Subtotal", total:"Total", quotation:"Cotización", invoice:"Factura",
    change:"Cambiar", noItems:"Agrega productos para comenzar.",
    salesperson:"Vendedor", selectSp:"Asignar vendedor",
    addClient:"Agregar Cliente", searchClients:"Buscar clientes…",
    edit:"Editar", delete:"Eliminar", noClients:"Sin clientes aún.",
    viewProfile:"Perfil", clientProfile:"Perfil del Cliente",
    totalOrders:"Pedidos", totalSpent:"Pagado", pendingLbl:"Pendiente",
    addProduct:"Agregar Producto", noProducts:"Sin productos aún.",
    price:"Precio", unit:"Unidad", name:"Nombre",
    phone:"Teléfono", address:"Dirección", newCategory:"Nueva Categoría", add:"Agregar",
    orderHistory:"Pedidos", noOrders:"Sin pedidos aún.",
    status:"Estado", ordered:"Pedido", delivered:"Entregado",
    paid:"Pagado", cancelled:"Cancelado", changeStatus:"Cambiar Estado",
    confirmDelete:"¿Eliminar permanentemente?", confirmBtn:"Eliminar",
    editOrder:"Editar", addSp:"Agregar Miembro", noTeam:"Sin miembros aún.",
    spName:"Nombre Completo", role:"Rol", businessProfile:"Empresa",
    businessName:"Nombre Empresa", rnc:"RNC / ID Fiscal",
    bPhone:"Teléfono", bEmail:"Correo", bAddress:"Dirección",
    uploadLogo:"Subir Logo", logoHint:"PNG o JPG · máx 2MB",
    saveProfile:"Guardar", profileSaved:"Guardado ✓",
    settingsTitle:"Ajustes", language:"Idioma",
    currency:"Moneda", currSymbol:"Símbolo", currPos:"Posición",
    before:"$100", after:"100$", taxes:"Impuestos", taxName:"Nombre",
    taxRate:"Tasa %", addTax:"Agregar", removeTax:"Quitar",
    save:"Guardar", close:"Cerrar", cancel:"Cancelar",
    print:"Imprimir / PDF", shareWA:"WhatsApp", date:"Fecha", billTo:"Facturar a",
    withTax:"Con impuesto", withoutTax:"Sin impuesto",
    orderNum:"Pedido #", setSequence:"Establecer número de inicio",
    sequenceSaved:"Secuencia guardada.",
    adminOnly:"Solo administrador", welcome:"Bienvenido",
    qty:"Cant.", manualQty:"Ingresar cantidad",
    waMsg: (doc, items, total) =>
      `Hola ${doc.client_snapshot?.name},\n\nAquí está su ${doc.type} *${doc.order_number}*:\n\n${items}\n\n*Total: ${total}*\n\n¡Gracias!`,
  },
};

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#f7f7f5",
  surface: "#ffffff",
  card: "#ffffff",
  border: "#e8e8e4",
  borderDark: "#d0d0c8",
  accent: "#1a1a1a",
  accentSoft: "#f0ede8",
  text: "#1a1a1a",
  muted: "#888880",
  mutedLight: "#c8c8c0",
  danger: "#c0392b",
  success: "#27ae60",
  info: "#2980b9",
  warn: "#d4821a",
  white: "#ffffff",
  shadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  shadowMd: "0 4px 12px rgba(0,0,0,0.08)",
};

const STATUS_COLOR = { ordered: C.info, delivered: C.warn, paid: C.success, cancelled: C.danger };
const STATUS_BG = { ordered: "#eaf4fb", delivered: "#fef6ec", paid: "#eafaf1", cancelled: "#fdecea" };

// ─── Utilities ────────────────────────────────────────────────────────────────
const uid = () => crypto.randomUUID?.() || Math.random().toString(36).slice(2);
const todayStr = () => new Date().toLocaleDateString("en-GB");
const mkFmt = (sym, pos) => (n) => {
  const num = Number(n).toFixed(2);
  return pos === "after" ? `${num}${sym}` : `${sym}${num}`;
};
const match = (obj, q) => !q || Object.values(obj).some(v => String(v || "").toLowerCase().includes(q.toLowerCase()));
const cls = (...args) => args.filter(Boolean).join(" ");

// ─── Global styles ────────────────────────────────────────────────────────────
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #root { height: 100%; }
    body { font-family: 'Geist', -apple-system, sans-serif; background: ${C.bg}; color: ${C.text}; -webkit-font-smoothing: antialiased; }
    input, select, textarea, button { font-family: inherit; }
    input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: ${C.mutedLight}; border-radius: 4px; }
    .fade-in { animation: fadeIn 0.2s ease; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
    .slide-up { animation: slideUp 0.25s ease; }
    @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  `}</style>
);

// ─── UI primitives ────────────────────────────────────────────────────────────
const Btn = ({ children, onClick, variant = "primary", size = "md", disabled, full, style = {} }) => {
  const sz = { sm: { padding: "5px 12px", fontSize: "12px" }, md: { padding: "9px 18px", fontSize: "13px" }, lg: { padding: "12px 24px", fontSize: "14px" } }[size];
  const vars = {
    primary: { background: C.accent, color: "#fff", border: "none" },
    ghost: { background: "transparent", color: C.muted, border: `1px solid ${C.border}` },
    danger: { background: C.danger, color: "#fff", border: "none" },
    success: { background: C.success, color: "#fff", border: "none" },
    soft: { background: C.accentSoft, color: C.accent, border: "none" },
    outline: { background: "transparent", color: C.accent, border: `1.5px solid ${C.accent}` },
  };
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled}
      style={{ ...sz, ...vars[variant], borderRadius: "8px", cursor: disabled ? "not-allowed" : "pointer", fontWeight: "500", display: "inline-flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap", transition: "opacity .15s", opacity: disabled ? 0.4 : 1, width: full ? "100%" : "auto", justifyContent: full ? "center" : "flex-start", flexShrink: 0, letterSpacing: "-0.01em", ...style }}>
      {children}
    </button>
  );
};

const Field = ({ label, children, required }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
    {label && <label style={{ fontSize: "11px", fontWeight: "600", color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}{required && " *"}</label>}
    {children}
  </div>
);

const inputStyle = (sm) => ({
  background: C.surface, border: `1px solid ${C.border}`, borderRadius: "8px",
  padding: sm ? "7px 10px" : "9px 12px", color: C.text,
  fontSize: sm ? "13px" : "14px", outline: "none", width: "100%",
  transition: "border-color .15s",
});

const Inp = ({ label, value, onChange, type = "text", placeholder, required, sm }) => (
  <Field label={label} required={required}>
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={inputStyle(sm)}
      onFocus={e => e.target.style.borderColor = C.accent}
      onBlur={e => e.target.style.borderColor = C.border} />
  </Field>
);

const Sel = ({ label, value, onChange, options }) => (
  <Field label={label}>
    <select value={value} onChange={e => onChange(e.target.value)} style={{ ...inputStyle(), appearance: "none", cursor: "pointer" }}>
      {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
    </select>
  </Field>
);

const Badge = ({ children, color, bg }) => (
  <span style={{ background: bg || color + "18", color, borderRadius: "5px", padding: "2px 7px", fontSize: "11px", fontWeight: "600", textTransform: "capitalize", whiteSpace: "nowrap", letterSpacing: "-0.01em" }}>{children}</span>
);

const Divider = () => <div style={{ height: 1, background: C.border, margin: "0" }} />;

const Card = ({ children, style = {}, onClick }) => (
  <div onClick={onClick} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "12px", boxShadow: C.shadow, overflow: "hidden", cursor: onClick ? "pointer" : "default", ...style }}>
    {children}
  </div>
);

// ─── Modal ────────────────────────────────────────────────────────────────────
const Modal = ({ title, children, onClose, wide }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200, backdropFilter: "blur(4px)" }}
    onClick={e => e.target === e.currentTarget && onClose()}>
    <div className="slide-up" style={{ background: C.surface, borderRadius: "20px 20px 0 0", padding: "0", width: "100%", maxWidth: wide ? "760px" : "520px", maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 -8px 40px rgba(0,0,0,.12)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px", borderBottom: `1px solid ${C.border}` }}>
        <span style={{ fontSize: "15px", fontWeight: "600", letterSpacing: "-0.02em" }}>{title}</span>
        <button onClick={onClose} style={{ background: C.accentSoft, border: "none", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center", color: C.muted }}>✕</button>
      </div>
      <div style={{ overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
        {children}
      </div>
    </div>
  </div>
);

// ─── Confirm dialog ───────────────────────────────────────────────────────────
const Confirm = ({ message, onConfirm, onCancel, t }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, backdropFilter: "blur(4px)", padding: "20px" }}>
    <div className="fade-in" style={{ background: C.surface, borderRadius: "16px", padding: "28px", maxWidth: "340px", width: "100%", textAlign: "center", boxShadow: C.shadowMd }}>
      <div style={{ fontSize: "32px", marginBottom: "12px" }}>⚠️</div>
      <div style={{ fontSize: "14px", color: C.text, marginBottom: "22px", lineHeight: "1.5" }}>{message}</div>
      <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
        <Btn variant="ghost" onClick={onCancel}>{t.cancel}</Btn>
        <Btn variant="danger" onClick={onConfirm}>{t.confirmBtn}</Btn>
      </div>
    </div>
  </div>
);

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ msg }) => (
  <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: C.accent, color: "#fff", padding: "10px 20px", borderRadius: "100px", fontSize: "13px", fontWeight: "500", zIndex: 400, boxShadow: C.shadowMd, whiteSpace: "nowrap" }}>{msg}</div>
);

// ─── PDF generator ────────────────────────────────────────────────────────────
const makePDF = (doc, profile, fmt, t) => {
  const taxRows = (doc.tax_lines || []).filter(tx => tx.rate > 0)
    .map(tx => `<tr><td colspan="4" style="text-align:right;padding:4px 8px;color:#666">${tx.name} (${tx.rate}%)</td><td style="text-align:right;padding:4px 8px">+${fmt(tx.amt)}</td></tr>`).join("");
  const logo = profile?.logo
    ? `<img src="${profile.logo}" style="max-height:60px;max-width:160px;object-fit:contain"/>`
    : `<span style="font-size:22px;font-weight:800;color:#1a1a1a">${profile?.business_name || "OrderApp"}</span>`;
  const snap = doc.client_snapshot || {};
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${doc.order_number}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,Helvetica,sans-serif;color:#1a1a1a;background:#fff;padding:48px}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:24px;border-bottom:2px solid #1a1a1a}
.type{font-size:28px;font-weight:200;text-transform:uppercase;letter-spacing:0.08em;color:#888;margin-top:6px}
.num{font-size:13px;color:#888;margin-top:4px} .info{font-size:12px;color:#666;line-height:1.6}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:28px}
.col-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#bbb;margin-bottom:6px}
table{width:100%;border-collapse:collapse;font-size:13px}
th{background:#f7f7f5;padding:8px 10px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#999;border-bottom:1px solid #eee}
td{padding:9px 10px;border-bottom:1px solid #f5f5f5}
.totals{margin-left:auto;width:240px;font-size:13px;margin-top:8px}
.totals td{border:none;padding:4px 8px}.total-row td{font-weight:700;font-size:16px;border-top:2px solid #1a1a1a;padding-top:10px!important}
.footer{margin-top:48px;padding-top:16px;border-top:1px solid #eee;font-size:11px;color:#bbb;text-align:center}
</style></head><body>
<div class="hdr">
  <div>${logo}<div style="margin-top:8px" class="info">${[profile?.business_name,"RNC: "+profile?.rnc,profile?.phone,profile?.email,profile?.address].filter(x=>x&&x!=="RNC: ").join("<br>")}</div></div>
  <div style="text-align:right"><div class="type">${doc.type}</div><div class="num">${doc.order_number}</div><div style="font-size:12px;color:#888;margin-top:4px">${t.date}: ${doc.created_at ? new Date(doc.created_at).toLocaleDateString("en-GB") : ""}</div>${doc.status ? `<div style="margin-top:8px;display:inline-block;background:#f0f0f0;padding:3px 10px;border-radius:4px;font-size:10px;font-weight:700;text-transform:uppercase">${doc.status}</div>` : ""}</div>
</div>
<div class="cols">
  <div><div class="col-label">${t.billTo}</div><div class="info"><strong>${snap.name||""}</strong><br>${[snap.rnc?"RNC: "+snap.rnc:"",snap.email,snap.phone,snap.address].filter(Boolean).join("<br>")}</div></div>
  <div>${doc.salesperson_name ? `<div class="col-label">${t.salesperson}</div><div style="font-size:13px;font-weight:600">${doc.salesperson_name}</div>` : ""}${doc.notes ? `<div class="col-label" style="margin-top:${doc.salesperson_name?"12px":"0"}">Notes</div><div class="info">${doc.notes}</div>` : ""}</div>
</div>
<table><thead><tr><th>#</th><th>Item</th><th style="text-align:right">Unit Price</th><th style="text-align:center">${t.qty}</th><th style="text-align:right">Total</th></tr></thead>
<tbody>${(doc.items||[]).map((i,n)=>`<tr><td style="color:#bbb">${n+1}</td><td><strong>${i.name}</strong><div style="font-size:11px;color:#bbb">${i.unit||""}</div></td><td style="text-align:right">${fmt(i.price)}</td><td style="text-align:center;font-weight:600">${i.qty}</td><td style="text-align:right;font-weight:600">${fmt(i.price*i.qty)}</td></tr>`).join("")}</tbody></table>
<table class="totals"><tbody>
  <tr><td>${t.subtotal}</td><td style="text-align:right">${fmt(doc.subtotal)}</td></tr>
  ${doc.discount>0?`<tr><td>${t.discount} (${doc.discount}%)</td><td style="text-align:right;color:${C.danger}">−${fmt(doc.discount_amt)}</td></tr>`:""}
  ${taxRows}
  <tr class="total-row"><td>${t.total}</td><td style="text-align:right">${fmt(doc.total)}</td></tr>
</tbody></table>
<div class="footer">Generated by OrderApp · ${new Date().toLocaleDateString("en-GB")}${profile?.business_name?" · "+profile.business_name:""}</div>
</body></html>`;
};

// ════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [user, setUser] = useState(null);        // auth user
  const [salesperson, setSalesperson] = useState(null); // salespeople row
  const [authLoading, setAuthLoading] = useState(true);
  const [settings, setSettingsState] = useState({ lang: "en", currencySymbol: "RD$", currencyPosition: "before", taxes: [{ id: "t1", name: "ITBIS", rate: 18 }] });
  const [profile, setProfileState] = useState({ business_name: "", rnc: "", phone: "", email: "", address: "", logo: "" });
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const t = T[settings.lang] || T.en;
  const fmt = mkFmt(settings.currencySymbol, settings.currencyPosition);

  const showToast = useCallback((msg, ms = 2500) => {
    setToast(msg);
    setTimeout(() => setToast(null), ms);
  }, []);

  const askConfirm = useCallback((msg, cb) => setConfirm({ msg, cb }), []);

  // Boot: check auth + load config
  useEffect(() => {
    (async () => {
      const stored = localStorage.getItem("sb_token");
      if (stored) window.__sb_token = stored;
      const u = await sb.auth.getUser();
      if (u && u.id) {
        setUser(u);
        await loadUserProfile(u);
      }
      // Load settings & profile
      await loadConfig();
      setAuthLoading(false);
    })();
  }, []);

  const loadConfig = async () => {
    try {
      const rows = await sb.from("app_config").select("*");
      if (Array.isArray(rows)) {
        const s = rows.find(r => r.key === "settings");
        if (s?.value) setSettingsState(s.value);
      }
      const pr = await sb.from("business_profile").select("*");
      if (Array.isArray(pr) && pr[0]) setProfileState(pr[0]);
    } catch {}
  };

  const loadUserProfile = async (u) => {
    try {
      const rows = await sb.from("salespeople").select("*", { eq: { auth_user_id: u.id } });
      if (Array.isArray(rows) && rows[0]) setSalesperson(rows[0]);
    } catch {}
  };

  const saveSettings = async (newS) => {
    setSettingsState(newS);
    await sb.from("app_config").upsert({ key: "settings", value: newS });
  };

  const saveProfile = async (newP) => {
    setProfileState(newP);
    if (newP.id) {
      await sb.from("business_profile").update(newP, { eq: { id: newP.id } });
    } else {
      const inserted = await sb.from("business_profile").insert(newP);
      if (inserted?.id) setProfileState({ ...newP, id: inserted.id });
    }
    showToast(t.profileSaved);
  };

  const handleLogin = async (email, password) => {
    const data = await sb.auth.signIn(email, password);
    if (data.access_token) {
      window.__sb_token = data.access_token;
      localStorage.setItem("sb_token", data.access_token);
      setUser(data.user);
      await loadUserProfile(data.user);
      await loadConfig();
      return true;
    }
    return false;
  };

  const handleLogout = async () => {
    await sb.auth.signOut();
    localStorage.removeItem("sb_token");
    setUser(null); setSalesperson(null);
  };

  if (authLoading) return (
    <>
      <GlobalStyle />
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg }}>
        <div style={{ textAlign: "center", color: C.muted }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>⚡</div>
          <div style={{ fontSize: "14px" }}>{t.loading}</div>
        </div>
      </div>
    </>
  );

  if (!user) return (
    <>
      <GlobalStyle />
      <LoginScreen t={t} onLogin={handleLogin} />
    </>
  );

  return (
    <>
      <GlobalStyle />
      <MainApp
        user={user} salesperson={salesperson} t={t} fmt={fmt}
        settings={settings} saveSettings={saveSettings}
        profile={profile} saveProfile={saveProfile}
        showToast={showToast} askConfirm={askConfirm}
        onLogout={handleLogout}
      />
      {toast && <Toast msg={toast} />}
      {confirm && (
        <Confirm message={confirm.msg} t={t}
          onConfirm={() => { confirm.cb(); setConfirm(null); }}
          onCancel={() => setConfirm(null)} />
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// LOGIN SCREEN
// ════════════════════════════════════════════════════════════════════════════
function LoginScreen({ t, onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email || !password) return;
    setLoading(true); setError("");
    const ok = await onLogin(email, password);
    if (!ok) setError(t.loginError);
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div className="fade-in" style={{ width: "100%", maxWidth: "360px" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>⚡</div>
          <div style={{ fontSize: "22px", fontWeight: "700", letterSpacing: "-0.03em" }}>OrderApp</div>
          <div style={{ fontSize: "13px", color: C.muted, marginTop: "4px" }}>Sign in to continue</div>
        </div>
        <Card style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <Inp label={t.email} value={email} onChange={setEmail} type="email" placeholder="you@example.com" />
          <Inp label={t.password} value={password} onChange={setPassword} type="password" placeholder="••••••••" />
          {error && <div style={{ fontSize: "13px", color: C.danger, textAlign: "center" }}>{error}</div>}
          <Btn onClick={submit} full variant="primary" size="lg" disabled={loading} style={{ marginTop: "4px" }}>
            {loading ? t.loading : t.login}
          </Btn>
        </Card>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ════════════════════════════════════════════════════════════════════════════
function MainApp({ user, salesperson, t, fmt, settings, saveSettings, profile, saveProfile, showToast, askConfirm, onLogout }) {
  const [tab, setTab] = useState("order");
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [team, setTeam] = useState([]);
  const [sideOpen, setSideOpen] = useState(false);
  const isAdmin = salesperson?.is_admin ?? true;
  const isMobile = window.innerWidth < 768;

  // Order state
  const [selClient, setSelClient] = useState(null);
  const [cart, setCart] = useState({});
  const [activeCat, setActiveCat] = useState("All");
  const [searchQ, setSearchQ] = useState("");
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [selSp, setSelSp] = useState(salesperson?.id || "");
  const [useTax, setUseTax] = useState(true);
  const [editingOrderId, setEditingOrderId] = useState(null);

  // Modals
  const [modal, setModal] = useState(null);
  const [editObj, setEditObj] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);

  // Load data
  const load = useCallback(async () => {
    const [cl, pr, ca, or, tm] = await Promise.all([
      sb.from("clients").select("*", { order: "name.asc" }),
      sb.from("products").select("*", { order: "name.asc" }),
      sb.from("categories").select("*", { order: "sort_order.asc" }),
      sb.from("orders").select("*", { order: "created_at.desc" }),
      sb.from("salespeople").select("*", { order: "name.asc" }),
    ]);
    if (Array.isArray(cl)) setClients(cl);
    if (Array.isArray(pr)) setProducts(pr);
    if (Array.isArray(ca)) setCategories(ca.map(c => c.name));
    if (Array.isArray(or)) setOrders(or);
    if (Array.isArray(tm)) setTeam(tm);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Realtime polling
  useEffect(() => {
    const unsub = sb.subscribe("orders", load);
    return unsub;
  }, [load]);

  // Cart math
  const cartItems = Object.entries(cart).filter(([, q]) => q > 0)
    .map(([id, qty]) => ({ ...products.find(p => p.id === id), qty })).filter(x => x.id);
  const subtotal = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
  const discountAmt = subtotal * (discount / 100);
  const afterDiscount = subtotal - discountAmt;
  const activeTaxes = useTax ? (settings.taxes || []).filter(tx => tx.rate > 0) : [];
  const taxLines = activeTaxes.map(tx => ({ ...tx, amt: afterDiscount * (tx.rate / 100) }));
  const taxTotal = taxLines.reduce((s, tx) => s + tx.amt, 0);
  const total = afterDiscount + taxTotal;
  const cartCount = cartItems.reduce((s, i) => s + i.qty, 0);

  const setQty = (pid, qty) => setCart(c => ({ ...c, [pid]: Math.max(0, qty) }));
  const clearOrder = () => { setCart({}); setSelClient(null); setDiscount(0); setNotes(""); setSelSp(salesperson?.id || ""); setUseTax(true); setEditingOrderId(null); };

  const getNextOrderNum = async () => {
    const rows = await sb.from("app_settings").select("*", { eq: { key: "order_sequence" } });
    const current = parseInt(Array.isArray(rows) && rows[0] ? rows[0].value : "1000");
    const next = current + 1;
    await sb.from("app_settings").update({ value: String(next) }, { eq: { key: "order_sequence" } });
    return String(current).padStart(5, "0");
  };

  const finalizeOrder = async (type) => {
    if (!selClient || cartItems.length === 0) return;
    const spRow = team.find(s => s.id === selSp);
    const orderNum = editingOrderId
      ? orders.find(o => o.id === editingOrderId)?.order_number
      : await getNextOrderNum();

    const payload = {
      type, order_number: orderNum,
      status: "ordered",
      client_id: selClient.id,
      client_snapshot: selClient,
      items: cartItems,
      subtotal, discount, discount_amt: discountAmt,
      tax_lines: taxLines, tax_total: taxTotal, total, notes,
      salesperson_id: spRow?.id || null,
      salesperson_name: spRow?.name || "",
      currency_symbol: settings.currencySymbol,
      currency_position: settings.currencyPosition,
      created_by: user.id,
    };

    let saved;
    if (editingOrderId) {
      const res = await sb.from("orders").update(payload, { eq: { id: editingOrderId } });
      saved = Array.isArray(res) ? res[0] : { ...payload, id: editingOrderId };
    } else {
      saved = await sb.from("orders").insert(payload);
    }
    await load();
    setPreviewDoc(saved || { ...payload, id: uid() });
    setModal("invoice");
    clearOrder();
    showToast(type === "invoice" ? "Invoice created ✓" : "Quotation created ✓");
  };

  const loadOrderToEdit = (order) => {
    setEditingOrderId(order.id);
    setSelClient(order.client_snapshot || order.client);
    const c = {};
    (order.items || []).forEach(i => { c[i.id] = i.qty; });
    setCart(c);
    setDiscount(order.discount || 0);
    setNotes(order.notes || "");
    setSelSp(order.salesperson_id || "");
    setUseTax((order.tax_lines || []).some(tx => tx.rate > 0));
    setTab("order");
  };

  const deleteOrder = async (id) => {
    await sb.from("orders").delete({ eq: { id } });
    setOrders(os => os.filter(o => o.id !== id));
  };

  const updateStatus = async (id, status) => {
    await sb.from("orders").update({ status }, { eq: { id } });
    setOrders(os => os.map(o => o.id === id ? { ...o, status } : o));
  };

  // Client CRUD
  const saveClient = async (c) => {
    if (c.id) { await sb.from("clients").update(c, { eq: { id: c.id } }); setClients(cs => cs.map(x => x.id === c.id ? c : x)); }
    else { const r = await sb.from("clients").insert(c); setClients(cs => [...cs, r || { ...c, id: uid() }]); }
  };
  const deleteClient = async (id) => { await sb.from("clients").delete({ eq: { id } }); setClients(cs => cs.filter(x => x.id !== id)); };

  // Product CRUD
  const saveProduct = async (p) => {
    if (p.id) { await sb.from("products").update(p, { eq: { id: p.id } }); setProducts(ps => ps.map(x => x.id === p.id ? p : x)); }
    else { const r = await sb.from("products").insert(p); setProducts(ps => [...ps, r || { ...p, id: uid() }]); }
  };
  const deleteProduct = async (id) => { await sb.from("products").delete({ eq: { id } }); setProducts(ps => ps.filter(x => x.id !== id)); };

  // Team CRUD
  const savePerson = async (p) => {
    if (p.id) { await sb.from("salespeople").update(p, { eq: { id: p.id } }); setTeam(ts => ts.map(x => x.id === p.id ? p : x)); }
    else { const r = await sb.from("salespeople").insert(p); setTeam(ts => [...ts, r || { ...p, id: uid() }]); }
  };
  const deletePerson = async (id) => { await sb.from("salespeople").delete({ eq: { id } }); setTeam(ts => ts.filter(x => x.id !== id)); };

  // Category CRUD
  const saveCat = async (name) => {
    await sb.from("categories").insert({ name, sort_order: categories.length });
    setCategories(cs => [...cs, name]);
  };
  const deleteCat = async (name) => {
    await sb.from("categories").delete({ eq: { name } });
    setCategories(cs => cs.filter(c => c !== name));
  };
  const renameCat = async (old, neu) => {
    await sb.from("categories").update({ name: neu }, { eq: { name: old } });
    await Promise.all(products.filter(p => p.category === old).map(p => sb.from("products").update({ category: neu }, { eq: { id: p.id } })));
    setCategories(cs => cs.map(c => c === old ? neu : c));
    setProducts(ps => ps.map(p => p.category === old ? { ...p, category: neu } : p));
  };

  const TABS = [
    { id: "order", icon: "＋", label: t.newOrder },
    { id: "clients", icon: "◎", label: t.clients },
    { id: "products", icon: "◈", label: t.products },
    { id: "history", icon: "≡", label: t.history },
    ...(isAdmin ? [{ id: "salesTeam", icon: "◑", label: t.salesTeam }] : []),
    { id: "profile", icon: "⬡", label: t.profile },
    { id: "settings", icon: "◐", label: t.settings },
  ];

  const sharedProps = { t, fmt, settings, showToast, askConfirm, isAdmin, user };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: C.bg, overflow: "hidden" }}>
      {/* Top bar */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 16px", height: "52px", gap: "8px", flexShrink: 0, boxShadow: C.shadow }}>
        {profile?.logo
          ? <img src={profile.logo} style={{ height: "28px", maxWidth: "90px", objectFit: "contain", flexShrink: 0 }} />
          : <span style={{ fontSize: "15px", fontWeight: "700", letterSpacing: "-0.03em", flexShrink: 0, color: C.text }}>⚡ {profile?.business_name || "OrderApp"}</span>}

        {/* Desktop tabs */}
        <nav style={{ display: "flex", gap: "2px", marginLeft: "12px", flex: 1, overflowX: "auto" }}>
          {TABS.map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id)}
              style={{ padding: "6px 12px", borderRadius: "7px", border: "none", background: tab === tb.id ? C.accentSoft : "transparent", color: tab === tb.id ? C.accent : C.muted, cursor: "pointer", fontWeight: "500", fontSize: "13px", whiteSpace: "nowrap", letterSpacing: "-0.01em", transition: "all .15s", display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ fontSize: "11px", opacity: 0.7 }}>{tb.icon}</span>
              {tb.label}
              {tb.id === "order" && editingOrderId && <span style={{ background: C.info, color: "#fff", borderRadius: "4px", padding: "1px 5px", fontSize: "9px" }}>EDIT</span>}
            </button>
          ))}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          <span style={{ fontSize: "12px", color: C.muted, display: "none" }}>{salesperson?.name || user?.email}</span>
          <Btn variant="ghost" size="sm" onClick={onLogout}>{t.logout}</Btn>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
        {tab === "order" && (
          <OrderView {...sharedProps} {...{ clients, products, categories, team, cart, setQty, cartItems, subtotal, discount, setDiscount, total, taxLines, taxTotal, discountAmt, cartCount, selClient, setSelClient, activeCat, setActiveCat, searchQ, setSearchQ, notes, setNotes, selSp, setSelSp, useTax, setUseTax, finalizeOrder, clearOrder, setModal, setEditObj, editingOrderId, salesperson }} />
        )}
        {tab === "clients" && <ClientsView {...sharedProps} {...{ clients, orders, saveClient, deleteClient, setModal, setEditObj }} />}
        {tab === "products" && <ProductsView {...sharedProps} {...{ products, categories, saveProduct, deleteProduct, saveCat, deleteCat, renameCat, setModal, setEditObj }} />}
        {tab === "history" && <HistoryView {...sharedProps} {...{ orders, deleteOrder, updateStatus, setPreviewDoc, setModal, setEditObj, loadOrderToEdit, isAdmin }} />}
        {tab === "salesTeam" && isAdmin && <SalesTeamView {...sharedProps} {...{ team, savePerson, deletePerson, setModal, setEditObj }} />}
        {tab === "profile" && <ProfileView {...sharedProps} {...{ profile, saveProfile }} />}
        {tab === "settings" && <SettingsView {...sharedProps} {...{ saveSettings, isAdmin }} />}
      </div>

      {/* Bottom nav (mobile) */}
      <div style={{ background: C.surface, borderTop: `1px solid ${C.border}`, display: "flex", padding: "6px 4px", gap: "2px", flexShrink: 0 }}>
        {TABS.slice(0, 5).map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id)}
            style={{ flex: 1, padding: "6px 4px", border: "none", background: "transparent", color: tab === tb.id ? C.accent : C.muted, cursor: "pointer", fontSize: "10px", fontWeight: tab === tb.id ? "700" : "500", display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", transition: "color .15s" }}>
            <span style={{ fontSize: "16px" }}>{tb.icon}</span>
            <span style={{ whiteSpace: "nowrap", overflow: "hidden", maxWidth: "100%", textOverflow: "ellipsis" }}>{tb.label}</span>
          </button>
        ))}
      </div>

      {/* Modals */}
      {modal === "client" && <ClientModal t={t} client={editObj} onSave={async c => { await saveClient(c); setModal(null); setEditObj(null); showToast("Saved ✓"); }} onClose={() => { setModal(null); setEditObj(null); }} />}
      {modal === "product" && <ProductModal t={t} product={editObj} categories={categories} onSave={async p => { await saveProduct(p); setModal(null); setEditObj(null); showToast("Saved ✓"); }} onClose={() => { setModal(null); setEditObj(null); }} />}
      {modal === "clientPick" && <ClientPickModal t={t} clients={clients} onPick={c => { setSelClient(c); setModal(null); }} onClose={() => setModal(null)} onNew={() => { setEditObj(null); setModal("client"); }} />}
      {modal === "clientProfile" && editObj && <ClientProfileModal t={t} fmt={fmt} client={editObj} orders={orders} loadOrderToEdit={loadOrderToEdit} setTab={setTab} setModal={setModal} setEditObj={setEditObj} />}
      {modal === "status" && editObj && <StatusModal t={t} order={editObj} onSave={async s => { await updateStatus(editObj.id, s); setModal(null); setEditObj(null); }} onClose={() => { setModal(null); setEditObj(null); }} />}
      {modal === "salesperson" && <SpModal t={t} person={editObj} onSave={async p => { await savePerson(p); setModal(null); setEditObj(null); showToast("Saved ✓"); }} onClose={() => { setModal(null); setEditObj(null); }} />}
      {modal === "catMgr" && <CatMgrModal t={t} categories={categories} products={products} saveCat={saveCat} deleteCat={deleteCat} renameCat={renameCat} onClose={() => setModal(null)} askConfirm={askConfirm} />}
      {modal === "invoice" && previewDoc && <InvoiceModal t={t} doc={previewDoc} fmt={mkFmt(previewDoc.currency_symbol || settings.currencySymbol, previewDoc.currency_position || settings.currencyPosition)} profile={profile} onClose={() => { setModal(null); setPreviewDoc(null); }} />}
      {modal === "sequence" && isAdmin && <SequenceModal t={t} showToast={showToast} onClose={() => setModal(null)} />}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ORDER VIEW
// ════════════════════════════════════════════════════════════════════════════
function OrderView({ t, fmt, settings, clients, products, categories, team, cart, setQty, cartItems, subtotal, discount, setDiscount, total, taxLines, taxTotal, discountAmt, cartCount, selClient, setSelClient, activeCat, setActiveCat, searchQ, setSearchQ, notes, setNotes, selSp, setSelSp, useTax, setUseTax, finalizeOrder, clearOrder, setModal, editingOrderId, salesperson }) {
  const allCats = ["All", ...categories];
  const filtered = products.filter(p =>
    (activeCat === "All" || p.category === activeCat) && match(p, searchQ)
  );
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden", flexDirection: "row" }}>
      {/* Catalog panel */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Client + search bar */}
        <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "10px 14px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {/* Client row */}
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {selClient ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, background: C.bg, borderRadius: "8px", padding: "7px 10px", border: `1px solid ${C.border}` }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: C.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "700", flexShrink: 0 }}>{selClient.name[0]}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: "600", fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selClient.name}</div>
                </div>
                <Btn variant="ghost" size="sm" onClick={() => setSelClient(null)}>{t.change}</Btn>
              </div>
            ) : (
              <button onClick={() => setModal("clientPick")} style={{ flex: 1, background: C.accentSoft, border: "none", borderRadius: "8px", padding: "9px 14px", color: C.accent, fontWeight: "600", fontSize: "13px", cursor: "pointer", textAlign: "left" }}>
                👤 {t.selectClient}
              </button>
            )}
            {/* Mobile cart btn */}
            <button onClick={() => setCartOpen(v => !v)} style={{ background: C.accent, color: "#fff", border: "none", borderRadius: "8px", padding: "9px 14px", fontWeight: "600", fontSize: "13px", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", gap: "6px" }}>
              🛒 {cartCount > 0 && <span style={{ background: "#fff", color: C.accent, borderRadius: "10px", padding: "1px 7px", fontSize: "11px", fontWeight: "700" }}>{cartCount}</span>}
            </button>
          </div>

          {/* Search + cats */}
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder={`🔍  ${t.searchProducts}`}
            style={{ ...inputStyle(), fontSize: "13px" }} />
          <div style={{ display: "flex", gap: "5px", overflowX: "auto", paddingBottom: "2px" }}>
            {allCats.map(c => (
              <button key={c} onClick={() => setActiveCat(c)}
                style={{ padding: "5px 12px", borderRadius: "20px", border: "none", cursor: "pointer", fontWeight: "500", fontSize: "12px", whiteSpace: "nowrap", background: activeCat === c ? C.accent : C.accentSoft, color: activeCat === c ? "#fff" : C.muted, transition: "all .15s" }}>{c}</button>
            ))}
          </div>
        </div>

        {/* Product grid */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "8px", alignContent: "start" }}>
          {filtered.map(p => {
            const qty = cart[p.id] || 0;
            return (
              <div key={p.id} style={{ background: C.card, border: `1.5px solid ${qty > 0 ? C.accent : C.border}`, borderRadius: "10px", padding: "12px", display: "flex", flexDirection: "column", gap: "8px", boxShadow: qty > 0 ? `0 0 0 2px ${C.accent}22` : C.shadow }}>
                <div style={{ fontSize: "10px", color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{p.category}</div>
                <div style={{ fontWeight: "600", fontSize: "13px", lineHeight: "1.3", flex: 1 }}>{p.name}</div>
                <div style={{ fontWeight: "700", fontSize: "14px", letterSpacing: "-0.02em" }}>{fmt(p.price)}<span style={{ color: C.muted, fontWeight: "400", fontSize: "11px" }}> /{p.unit}</span></div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <button onClick={() => setQty(p.id, qty - 1)} style={{ width: 26, height: 26, borderRadius: "6px", border: "none", background: qty > 0 ? C.accentSoft : C.bg, color: qty > 0 ? C.accent : C.muted, fontSize: "16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700" }}>−</button>
                  <input type="number" min="0" value={qty} onChange={e => setQty(p.id, parseInt(e.target.value) || 0)}
                    style={{ flex: 1, textAlign: "center", fontWeight: "700", fontSize: "14px", color: qty > 0 ? C.accent : C.muted, background: "transparent", border: "none", outline: "none", fontFamily: "inherit" }} />
                  <button onClick={() => setQty(p.id, qty + 1)} style={{ width: 26, height: 26, borderRadius: "6px", border: "none", background: C.accentSoft, color: C.accent, fontSize: "16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700" }}>+</button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <div style={{ gridColumn: "1/-1", textAlign: "center", color: C.muted, padding: "48px 20px", fontSize: "13px" }}>{t.noProducts}</div>}
        </div>
      </div>

      {/* Cart sidebar — slides over on mobile, fixed on desktop */}
      <div style={{
        width: cartOpen || window.innerWidth >= 768 ? "300px" : "0",
        minWidth: cartOpen || window.innerWidth >= 768 ? "300px" : "0",
        background: C.surface, borderLeft: `1px solid ${C.border}`,
        display: "flex", flexDirection: "column", overflow: "hidden",
        transition: "all .25s ease",
        position: window.innerWidth < 768 ? "fixed" : "relative",
        right: 0, top: 52, bottom: 58, zIndex: window.innerWidth < 768 ? 100 : 1,
        boxShadow: window.innerWidth < 768 && cartOpen ? C.shadowMd : "none",
      }}>
        <div style={{ padding: "12px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: "600", fontSize: "14px" }}>{t.cart}</span>
          {cartCount > 0 && <Btn variant="ghost" size="sm" onClick={clearOrder}>{t.clear}</Btn>}
        </div>

        {/* Salesperson select */}
        {team.length > 0 && (
          <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}` }}>
            <select value={selSp} onChange={e => setSelSp(e.target.value)}
              style={{ ...inputStyle(true), fontSize: "12px", color: selSp ? C.text : C.muted }}>
              <option value="">{t.selectSp}</option>
              {team.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}

        {/* Cart items */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px", display: "flex", flexDirection: "column", gap: "5px" }}>
          {cartItems.length === 0
            ? <div style={{ color: C.muted, textAlign: "center", marginTop: "48px", fontSize: "13px" }}>{t.noItems}</div>
            : cartItems.map(item => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px", background: C.bg, borderRadius: "8px" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: "500", fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
                  <div style={{ fontSize: "11px", color: C.muted }}>{fmt(item.price)} × {item.qty}</div>
                </div>
                <div style={{ fontWeight: "700", fontSize: "13px", flexShrink: 0 }}>{fmt(item.price * item.qty)}</div>
                <button onClick={() => setQty(item.id, item.qty - 1)} style={{ width: 20, height: 20, borderRadius: "5px", border: "none", background: C.accentSoft, color: C.accent, cursor: "pointer", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700" }}>−</button>
              </div>
            ))}
        </div>

        {/* Controls */}
        <div style={{ padding: "10px 12px", borderTop: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: "8px" }}>
          {/* Tax toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button onClick={() => setUseTax(v => !v)} style={{ width: 34, height: 18, borderRadius: "9px", border: "none", background: useTax ? C.accent : C.border, cursor: "pointer", position: "relative", flexShrink: 0 }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: useTax ? 19 : 3, transition: "left .2s" }} />
            </button>
            <span style={{ fontSize: "12px", color: C.muted }}>{useTax ? t.withTax : t.withoutTax}</span>
          </div>

          {/* Discount */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: C.muted, whiteSpace: "nowrap" }}>{t.discount}</span>
            <input type="number" min="0" max="100" value={discount} onChange={e => setDiscount(+e.target.value)}
              style={{ ...inputStyle(true), width: "70px", textAlign: "right" }} />
          </div>

          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder={t.notes} rows={2}
            style={{ ...inputStyle(true), resize: "none", fontSize: "12px" }} />

          {/* Totals */}
          <div style={{ background: C.bg, borderRadius: "8px", padding: "8px 10px", display: "flex", flexDirection: "column", gap: "3px", fontSize: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: C.muted }}><span>{t.subtotal}</span><span>{fmt(subtotal)}</span></div>
            {discount > 0 && <div style={{ display: "flex", justifyContent: "space-between", color: C.danger }}><span>−{discount}%</span><span>−{fmt(discountAmt)}</span></div>}
            {taxLines.map(tx => <div key={tx.id} style={{ display: "flex", justifyContent: "space-between", color: C.muted }}><span>{tx.name} {tx.rate}%</span><span>+{fmt(tx.amt)}</span></div>)}
            <Divider />
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "700", fontSize: "15px", paddingTop: "3px" }}><span>{t.total}</span><span>{fmt(total)}</span></div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
            <Btn onClick={() => finalizeOrder("quotation")} disabled={!selClient || cartItems.length === 0} variant="outline" full size="sm">📄 {t.quotation}</Btn>
            <Btn onClick={() => finalizeOrder("invoice")} disabled={!selClient || cartItems.length === 0} variant="primary" full size="sm">🧾 {t.invoice}</Btn>
          </div>
          {editingOrderId && <Btn variant="ghost" size="sm" full onClick={clearOrder}>{t.cancel}</Btn>}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// CLIENTS VIEW
// ════════════════════════════════════════════════════════════════════════════
function ClientsView({ t, fmt, clients, orders, saveClient, deleteClient, setModal, setEditObj, askConfirm, showToast }) {
  const [q, setQ] = useState("");
  const filtered = clients.filter(c => match(c, q));
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px", maxWidth: "820px", width: "100%", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: "700", letterSpacing: "-0.03em" }}>{t.clients}</h2>
        <Btn onClick={() => { setEditObj(null); setModal("client"); }}>{t.addClient}</Btn>
      </div>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder={t.searchClients}
        style={{ ...inputStyle(), marginBottom: "12px" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {filtered.map(c => {
          const co = orders.filter(o => o.client_id === c.id || o.client_snapshot?.id === c.id);
          const pending = co.filter(o => o.status === "ordered" || o.status === "delivered").length;
          return (
            <Card key={c.id} style={{ padding: "13px 15px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "11px" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.accentSoft, color: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", fontSize: "14px", flexShrink: 0 }}>{c.name[0]}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: "600", fontSize: "14px" }}>{c.name}</div>
                  <div style={{ fontSize: "12px", color: C.muted, marginTop: "1px" }}>{[c.email, c.phone, c.rnc ? `RNC: ${c.rnc}` : ""].filter(Boolean).join(" · ")}</div>
                  <div style={{ display: "flex", gap: "5px", marginTop: "5px" }}>
                    <Badge color={C.info}>{co.length} {t.totalOrders.toLowerCase()}</Badge>
                    {pending > 0 && <Badge color={C.danger}>{pending} {t.pendingLbl.toLowerCase()}</Badge>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "5px" }}>
                  <Btn size="sm" variant="soft" onClick={() => { setEditObj(c); setModal("clientProfile"); }}>{t.viewProfile}</Btn>
                  <Btn size="sm" variant="ghost" onClick={() => { setEditObj(c); setModal("client"); }}>{t.edit}</Btn>
                  <Btn size="sm" variant="ghost" onClick={() => askConfirm(t.confirmDelete, () => deleteClient(c.id))} style={{ color: C.danger }}>✕</Btn>
                </div>
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && <div style={{ textAlign: "center", color: C.muted, padding: "60px 20px", fontSize: "14px" }}>{t.noClients}</div>}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PRODUCTS VIEW
// ════════════════════════════════════════════════════════════════════════════
function ProductsView({ t, fmt, products, categories, saveProduct, deleteProduct, saveCat, deleteCat, renameCat, setModal, setEditObj, askConfirm }) {
  const [q, setQ] = useState(""); const [cat, setCat] = useState("All");
  const filtered = products.filter(p => (cat === "All" || p.category === cat) && match(p, q));
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px", maxWidth: "900px", width: "100%", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: "700", letterSpacing: "-0.03em" }}>{t.products}</h2>
        <div style={{ display: "flex", gap: "8px" }}>
          <Btn size="sm" variant="ghost" onClick={() => setModal("catMgr")}>🏷 Categories</Btn>
          <Btn onClick={() => { setEditObj(null); setModal("product"); }}>{t.addProduct}</Btn>
        </div>
      </div>
      <div style={{ display: "flex", gap: "6px", marginBottom: "12px", flexWrap: "wrap" }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={t.searchProducts}
          style={{ ...inputStyle(), flex: 1, minWidth: "160px", fontSize: "13px" }} />
        {["All", ...categories].map(c => <button key={c} onClick={() => setCat(c)} style={{ padding: "7px 12px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "500", fontSize: "12px", background: cat === c ? C.accent : C.accentSoft, color: cat === c ? "#fff" : C.muted, transition: "all .15s" }}>{c}</button>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: "8px" }}>
        {filtered.map(p => (
          <Card key={p.id} style={{ padding: "14px" }}>
            <div style={{ fontSize: "10px", color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>{p.category}</div>
            <div style={{ fontWeight: "600", fontSize: "14px", marginBottom: "4px" }}>{p.name}</div>
            <div style={{ fontWeight: "700", fontSize: "16px", letterSpacing: "-0.02em" }}>{fmt(p.price)}<span style={{ color: C.muted, fontWeight: "400", fontSize: "11px" }}> /{p.unit}</span></div>
            <div style={{ display: "flex", gap: "6px", marginTop: "12px" }}>
              <Btn size="sm" variant="ghost" onClick={() => { setEditObj(p); setModal("product"); }}>{t.edit}</Btn>
              <Btn size="sm" variant="ghost" onClick={() => askConfirm(t.confirmDelete, () => deleteProduct(p.id))} style={{ color: C.danger }}>✕</Btn>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && <div style={{ gridColumn: "1/-1", textAlign: "center", color: C.muted, padding: "60px 20px" }}>{t.noProducts}</div>}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// HISTORY VIEW
// ════════════════════════════════════════════════════════════════════════════
function HistoryView({ t, fmt, orders, deleteOrder, updateStatus, setPreviewDoc, setModal, setEditObj, loadOrderToEdit, askConfirm, isAdmin }) {
  const [q, setQ] = useState(""); const [sf, setSf] = useState("all");
  const filtered = orders.filter(o => {
    const snap = o.client_snapshot || {};
    const mq = !q || match({ number: o.order_number, client: snap.name || "", sp: o.salesperson_name || "", notes: o.notes || "" }, q);
    return mq && (sf === "all" || o.status === sf);
  });
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px", maxWidth: "900px", width: "100%", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: "700", letterSpacing: "-0.03em" }}>{t.orderHistory}</h2>
        {isAdmin && <Btn size="sm" variant="ghost" onClick={() => setModal("sequence")}>#{t.orderNum}</Btn>}
      </div>
      <div style={{ display: "flex", gap: "6px", marginBottom: "12px", flexWrap: "wrap" }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={t.searchClients}
          style={{ ...inputStyle(), flex: 1, minWidth: "160px", fontSize: "13px" }} />
        {["all", "ordered", "delivered", "paid", "cancelled"].map(s => (
          <button key={s} onClick={() => setSf(s)} style={{ padding: "7px 11px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "500", fontSize: "12px", background: sf === s ? (s === "all" ? C.accent : STATUS_COLOR[s]) : C.accentSoft, color: sf === s ? "#fff" : C.muted, transition: "all .15s" }}>
            {s === "all" ? t.all : t[s]}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {filtered.map(o => {
          const sc = STATUS_COLOR[o.status] || C.muted;
          const sb2 = STATUS_BG[o.status] || C.card;
          const snap = o.client_snapshot || {};
          const docFmt = mkFmt(o.currency_symbol || "$", o.currency_position || "before");
          return (
            <div key={o.id} style={{ background: sb2, border: `1px solid ${sc}30`, borderLeft: `3px solid ${sc}`, borderRadius: "10px", padding: "12px 14px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: "180px" }}>
                <div style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "3px", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: "700", fontSize: "14px", letterSpacing: "-0.02em" }}>{o.order_number}</span>
                  <Badge color={o.type === "invoice" ? C.success : C.info}>{o.type}</Badge>
                  <Badge color={sc}>{t[o.status] || o.status}</Badge>
                </div>
                <div style={{ fontSize: "12px", color: C.muted }}>{snap.name} · {o.created_at ? new Date(o.created_at).toLocaleDateString("en-GB") : ""}{o.salesperson_name ? ` · ${o.salesperson_name}` : ""}</div>
                <div style={{ fontSize: "11px", color: C.mutedLight }}>{(o.items || []).length} item(s)</div>
              </div>
              <div style={{ fontWeight: "700", fontSize: "15px", letterSpacing: "-0.02em" }}>{docFmt(o.total)}</div>
              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                <Btn size="sm" variant="soft" onClick={() => { setPreviewDoc(o); setModal("invoice"); }}>View</Btn>
                <Btn size="sm" variant="ghost" onClick={() => loadOrderToEdit(o)}>{t.edit}</Btn>
                <Btn size="sm" variant="ghost" onClick={() => { setEditObj(o); setModal("status"); }}>{t.status}</Btn>
                {isAdmin && <Btn size="sm" variant="ghost" onClick={() => askConfirm(t.confirmDelete, () => deleteOrder(o.id))} style={{ color: C.danger }}>✕</Btn>}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div style={{ textAlign: "center", color: C.muted, padding: "60px 20px" }}>{t.noOrders}</div>}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SALES TEAM VIEW
// ════════════════════════════════════════════════════════════════════════════
function SalesTeamView({ t, team, savePerson, deletePerson, setModal, setEditObj, askConfirm }) {
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px", maxWidth: "700px", width: "100%", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: "700", letterSpacing: "-0.03em" }}>{t.salesTeam}</h2>
        <Btn onClick={() => { setEditObj(null); setModal("salesperson"); }}>{t.addSp}</Btn>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {team.map(p => (
          <Card key={p.id} style={{ padding: "13px 15px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "11px" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.accentSoft, color: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", fontSize: "14px", flexShrink: 0 }}>{p.name[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "600", fontSize: "14px" }}>{p.name} {p.is_admin && <Badge color={C.warn}>Admin</Badge>}</div>
                {p.role && <div style={{ fontSize: "12px", color: C.muted }}>{p.role}</div>}
                {(p.email || p.phone) && <div style={{ fontSize: "12px", color: C.muted }}>{[p.email, p.phone].filter(Boolean).join(" · ")}</div>}
              </div>
              <Btn size="sm" variant="ghost" onClick={() => { setEditObj(p); setModal("salesperson"); }}>{t.edit}</Btn>
              <Btn size="sm" variant="ghost" onClick={() => askConfirm(t.confirmDelete, () => deletePerson(p.id))} style={{ color: C.danger }}>✕</Btn>
            </div>
          </Card>
        ))}
        {team.length === 0 && <div style={{ textAlign: "center", color: C.muted, padding: "60px 20px" }}>{t.noTeam}</div>}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PROFILE VIEW
// ════════════════════════════════════════════════════════════════════════════
function ProfileView({ t, profile, saveProfile, showToast }) {
  const [form, setForm] = useState(profile);
  const fileRef = useRef();
  const f = k => v => setForm(p => ({ ...p, [k]: v }));
  useEffect(() => setForm(profile), [profile]);

  const handleLogo = e => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setForm(p => ({ ...p, logo: ev.target.result }));
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px", maxWidth: "600px", width: "100%", margin: "0 auto" }}>
      <h2 style={{ fontSize: "18px", fontWeight: "700", letterSpacing: "-0.03em", marginBottom: "16px" }}>{t.businessProfile}</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <Card style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <Inp label={t.businessName} value={form.business_name || ""} onChange={f("business_name")} />
          <Inp label={t.rnc} value={form.rnc || ""} onChange={f("rnc")} placeholder="101-12345-6" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <Inp label={t.bPhone} value={form.phone || ""} onChange={f("phone")} />
            <Inp label={t.bEmail} value={form.email || ""} onChange={f("email")} />
          </div>
          <Inp label={t.bAddress} value={form.address || ""} onChange={f("address")} />
        </Card>

        <Card style={{ padding: "16px" }}>
          <div style={{ fontSize: "11px", fontWeight: "600", color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "12px" }}>Logo</div>
          <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
            {form.logo
              ? <img src={form.logo} style={{ height: "60px", maxWidth: "150px", objectFit: "contain", borderRadius: "8px", border: `1px solid ${C.border}`, padding: "6px", background: "#fff" }} />
              : <div style={{ width: 80, height: 60, background: C.bg, borderRadius: "8px", border: `1.5px dashed ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px" }}>🖼️</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <Btn size="sm" variant="soft" onClick={() => fileRef.current?.click()}>{t.uploadLogo}</Btn>
              {form.logo && <Btn size="sm" variant="ghost" onClick={() => setForm(p => ({ ...p, logo: "" }))}>{t.delete}</Btn>}
              <div style={{ fontSize: "11px", color: C.muted }}>{t.logoHint}</div>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg" onChange={handleLogo} style={{ display: "none" }} />
        </Card>

        <Btn onClick={() => saveProfile(form)} full size="lg">{t.saveProfile}</Btn>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SETTINGS VIEW
// ════════════════════════════════════════════════════════════════════════════
function SettingsView({ t, settings, saveSettings }) {
  const [s, setS] = useState(settings);
  useEffect(() => setS(settings), [settings]);
  const upd = (k, v) => setS(p => ({ ...p, [k]: v }));
  const addTax = () => setS(p => ({ ...p, taxes: [...(p.taxes || []), { id: uid(), name: "Tax", rate: 0 }] }));
  const removeTax = id => setS(p => ({ ...p, taxes: (p.taxes || []).filter(x => x.id !== id) }));
  const updTax = (id, k, v) => setS(p => ({ ...p, taxes: (p.taxes || []).map(x => x.id === id ? { ...x, [k]: v } : x) }));

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px", maxWidth: "560px", width: "100%", margin: "0 auto" }}>
      <h2 style={{ fontSize: "18px", fontWeight: "700", letterSpacing: "-0.03em", marginBottom: "16px" }}>{t.settingsTitle}</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

        <Card style={{ padding: "16px" }}>
          <div style={{ fontSize: "11px", fontWeight: "600", color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "12px" }}>🌐 {t.language}</div>
          <div style={{ display: "flex", gap: "8px" }}>
            {[{ v: "en", l: "English 🇬🇧" }, { v: "es", l: "Español 🇪🇸" }].map(lng => (
              <button key={lng.v} onClick={() => upd("lang", lng.v)}
                style={{ flex: 1, padding: "10px", borderRadius: "8px", border: `1.5px solid ${s.lang === lng.v ? C.accent : C.border}`, background: s.lang === lng.v ? C.accentSoft : C.bg, color: s.lang === lng.v ? C.accent : C.muted, fontFamily: "inherit", fontWeight: "600", fontSize: "13px", cursor: "pointer" }}>{lng.l}</button>
            ))}
          </div>
        </Card>

        <Card style={{ padding: "16px" }}>
          <div style={{ fontSize: "11px", fontWeight: "600", color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "12px" }}>💱 {t.currency}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <Inp label={t.currSymbol} value={s.currencySymbol} onChange={v => upd("currencySymbol", v)} placeholder="$, €, RD$" sm />
            <Field label={t.currPos}>
              <div style={{ display: "flex", gap: "6px" }}>
                {[{ v: "before", l: `${s.currencySymbol || "$"}100` }, { v: "after", l: `100${s.currencySymbol || "$"}` }].map(pos => (
                  <button key={pos.v} onClick={() => upd("currencyPosition", pos.v)}
                    style={{ flex: 1, padding: "8px 4px", borderRadius: "8px", border: `1.5px solid ${s.currencyPosition === pos.v ? C.accent : C.border}`, background: s.currencyPosition === pos.v ? C.accentSoft : C.bg, color: s.currencyPosition === pos.v ? C.accent : C.muted, fontFamily: "inherit", fontWeight: "600", fontSize: "12px", cursor: "pointer" }}>{pos.l}</button>
                ))}
              </div>
            </Field>
          </div>
        </Card>

        <Card style={{ padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div style={{ fontSize: "11px", fontWeight: "600", color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>🧾 {t.taxes}</div>
            <Btn size="sm" variant="soft" onClick={addTax}>{t.addTax}</Btn>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {(s.taxes || []).map(tx => (
              <div key={tx.id} style={{ display: "grid", gridTemplateColumns: "1fr 90px auto", gap: "8px", alignItems: "flex-end" }}>
                <Inp value={tx.name} onChange={v => updTax(tx.id, "name", v)} sm />
                <Inp type="number" value={tx.rate} onChange={v => updTax(tx.id, "rate", parseFloat(v) || 0)} sm />
                <Btn size="sm" variant="ghost" onClick={() => removeTax(tx.id)} style={{ color: C.danger, marginBottom: "1px" }}>✕</Btn>
              </div>
            ))}
            {(s.taxes || []).length === 0 && <div style={{ color: C.muted, fontSize: "12px", textAlign: "center", padding: "10px" }}>No taxes configured.</div>}
          </div>
        </Card>

        <Btn onClick={() => saveSettings(s)} full size="lg">{t.save}</Btn>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODALS
// ════════════════════════════════════════════════════════════════════════════
function ClientModal({ t, client, onSave, onClose }) {
  const [f, setF] = useState({ name: "", email: "", phone: "", address: "", rnc: "", ...client });
  const u = k => v => setF(p => ({ ...p, [k]: v }));
  return (
    <Modal title={client ? t.edit + " " + t.clients : t.addClient} onClose={onClose}>
      <Inp label={t.name} value={f.name} onChange={u("name")} required />
      <Inp label={t.email} type="email" value={f.email} onChange={u("email")} />
      <Inp label={t.phone} value={f.phone} onChange={u("phone")} />
      <Inp label={t.address} value={f.address} onChange={u("address")} />
      <Inp label={t.rnc} value={f.rnc} onChange={u("rnc")} placeholder="Optional" />
      <Btn onClick={() => f.name && onSave(f)} full size="lg" style={{ marginTop: "4px" }}>{t.save}</Btn>
    </Modal>
  );
}

function ProductModal({ t, product, categories, onSave, onClose }) {
  const [f, setF] = useState({ name: "", category: categories[0] || "", price: "", unit: "unit", ...product, price: product?.price?.toString() || "" });
  const [nc, setNc] = useState("");
  const u = k => v => setF(p => ({ ...p, [k]: v }));
  return (
    <Modal title={product ? t.edit : t.addProduct} onClose={onClose}>
      <Inp label={t.name} value={f.name} onChange={u("name")} required />
      <Sel label={t.category} value={f.category} onChange={u("category")} options={categories} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "8px", alignItems: "flex-end" }}>
        <Inp label={t.newCategory} value={nc} onChange={setNc} placeholder="e.g. Accessories" />
        <Btn size="sm" variant="soft" onClick={() => { if (nc.trim()) { setF(p => ({ ...p, category: nc.trim() })); setNc(""); } }}>{t.add}</Btn>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <Inp label={t.price} type="number" value={f.price} onChange={u("price")} required />
        <Inp label={t.unit} value={f.unit} onChange={u("unit")} placeholder="bottle, kg…" />
      </div>
      <Btn onClick={() => f.name && f.price && onSave({ ...f, price: parseFloat(f.price) })} full size="lg" style={{ marginTop: "4px" }}>{t.save}</Btn>
    </Modal>
  );
}

function SpModal({ t, person, onSave, onClose }) {
  const [f, setF] = useState({ name: "", role: "", email: "", phone: "", is_admin: false, ...person });
  const u = k => v => setF(p => ({ ...p, [k]: v }));
  return (
    <Modal title={person ? t.edit : t.addSp} onClose={onClose}>
      <Inp label={t.spName} value={f.name} onChange={u("name")} required />
      <Inp label={t.role} value={f.role} onChange={u("role")} placeholder="Sales Rep, Manager…" />
      <Inp label={t.email} value={f.email} onChange={u("email")} />
      <Inp label={t.phone} value={f.phone} onChange={u("phone")} />
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <button onClick={() => u("is_admin")(!f.is_admin)} style={{ width: 34, height: 18, borderRadius: "9px", border: "none", background: f.is_admin ? C.accent : C.border, cursor: "pointer", position: "relative", flexShrink: 0 }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: f.is_admin ? 19 : 3, transition: "left .2s" }} />
        </button>
        <span style={{ fontSize: "13px", color: C.muted }}>Admin access</span>
      </div>
      <Btn onClick={() => f.name && onSave(f)} full size="lg" style={{ marginTop: "4px" }}>{t.save}</Btn>
    </Modal>
  );
}

function ClientPickModal({ t, clients, onPick, onClose, onNew }) {
  const [q, setQ] = useState("");
  const filtered = clients.filter(c => match(c, q));
  return (
    <Modal title={t.selectClient} onClose={onClose}>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder={t.searchClients} style={inputStyle()} />
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "320px", overflowY: "auto" }}>
        {filtered.map(c => (
          <button key={c.id} onClick={() => onPick(c)}
            style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "11px 13px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.accentSoft, color: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", fontSize: "13px", flexShrink: 0 }}>{c.name[0]}</div>
            <div>
              <div style={{ fontWeight: "600", fontSize: "13px" }}>{c.name}</div>
              <div style={{ fontSize: "11px", color: C.muted }}>{c.email}{c.rnc ? ` · RNC: ${c.rnc}` : ""}</div>
            </div>
          </button>
        ))}
      </div>
      <Btn variant="ghost" onClick={onNew} full>+ {t.addClient}</Btn>
    </Modal>
  );
}

function ClientProfileModal({ t, fmt, client, orders, loadOrderToEdit, setTab, setModal, setEditObj }) {
  const co = orders.filter(o => o.client_id === client.id || o.client_snapshot?.id === client.id);
  const paid = co.filter(o => o.status === "paid");
  const pending = co.filter(o => o.status === "ordered" || o.status === "delivered");
  const totalSpent = paid.reduce((s, o) => s + o.total, 0);
  return (
    <Modal title={t.clientProfile} onClose={() => { setModal(null); setEditObj(null); }} wide>
      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: C.accentSoft, color: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", fontSize: "18px", flexShrink: 0 }}>{client.name[0]}</div>
        <div>
          <div style={{ fontWeight: "700", fontSize: "16px" }}>{client.name}</div>
          <div style={{ fontSize: "12px", color: C.muted }}>{[client.email, client.phone, client.rnc ? `RNC: ${client.rnc}` : ""].filter(Boolean).join(" · ")}</div>
        </div>
      </div>
      <Divider />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
        {[{ l: t.totalOrders, v: co.length, c: C.info }, { l: t.totalSpent, v: fmt(totalSpent), c: C.success }, { l: t.pendingLbl, v: pending.length, c: pending.length > 0 ? C.danger : C.muted }].map(s => (
          <div key={s.l} style={{ background: C.bg, borderRadius: "10px", padding: "12px", textAlign: "center" }}>
            <div style={{ fontSize: "20px", fontWeight: "700", color: s.c, letterSpacing: "-0.03em" }}>{s.v}</div>
            <div style={{ fontSize: "11px", color: C.muted, marginTop: "2px" }}>{s.l}</div>
          </div>
        ))}
      </div>
      <Divider />
      <div style={{ display: "flex", flexDirection: "column", gap: "5px", maxHeight: "280px", overflowY: "auto" }}>
        {co.map(o => {
          const sc = STATUS_COLOR[o.status] || C.muted;
          const docFmt = mkFmt(o.currency_symbol || "$", o.currency_position || "before");
          return (
            <div key={o.id} style={{ background: C.bg, borderRadius: "8px", padding: "9px 12px", display: "flex", alignItems: "center", gap: "8px", borderLeft: `3px solid ${sc}` }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "600", fontSize: "13px" }}>{o.order_number} <Badge color={sc}>{t[o.status] || o.status}</Badge></div>
                <div style={{ fontSize: "11px", color: C.muted }}>{o.created_at ? new Date(o.created_at).toLocaleDateString("en-GB") : ""} · {(o.items || []).length} item(s)</div>
              </div>
              <div style={{ fontWeight: "700", fontSize: "13px" }}>{docFmt(o.total)}</div>
              <Btn size="sm" variant="soft" onClick={() => { loadOrderToEdit(o); setModal(null); setEditObj(null); setTab("order"); }}>{t.edit}</Btn>
            </div>
          );
        })}
        {co.length === 0 && <div style={{ color: C.muted, textAlign: "center", padding: "20px", fontSize: "13px" }}>{t.noOrders}</div>}
      </div>
    </Modal>
  );
}

function StatusModal({ t, order, onSave, onClose }) {
  const [s, setS] = useState(order?.status || "ordered");
  const icons = { ordered: "📦", delivered: "🚚", paid: "✅", cancelled: "✕" };
  return (
    <Modal title={t.changeStatus} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {["ordered", "delivered", "paid", "cancelled"].map(st => (
          <button key={st} onClick={() => setS(st)}
            style={{ padding: "12px 14px", borderRadius: "10px", border: `1.5px solid ${s === st ? STATUS_COLOR[st] : C.border}`, background: s === st ? STATUS_BG[st] : C.bg, color: s === st ? STATUS_COLOR[st] : C.muted, fontFamily: "inherit", fontWeight: "600", fontSize: "14px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "10px" }}>
            <span>{icons[st]}</span><span style={{ textTransform: "capitalize" }}>{t[st]}</span>
            {s === st && <span style={{ marginLeft: "auto" }}>✓</span>}
          </button>
        ))}
      </div>
      <Btn onClick={() => onSave(s)} full size="lg">{t.save}</Btn>
    </Modal>
  );
}

function CatMgrModal({ t, categories, products, saveCat, deleteCat, renameCat, onClose, askConfirm }) {
  const [nc, setNc] = useState(""); const [editing, setEditing] = useState(null); const [ev, setEv] = useState("");
  return (
    <Modal title="🏷 Categories" onClose={onClose}>
      <div style={{ display: "flex", gap: "8px" }}>
        <input value={nc} onChange={e => setNc(e.target.value)} placeholder="New category…" style={inputStyle()} />
        <Btn size="sm" variant="soft" onClick={() => { if (nc.trim()) { saveCat(nc.trim()); setNc(""); } }}>{t.add}</Btn>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {categories.map(cat => (
          <div key={cat} style={{ background: C.bg, borderRadius: "8px", padding: "10px 12px", display: "flex", alignItems: "center", gap: "8px" }}>
            {editing === cat
              ? <input value={ev} onChange={e => setEv(e.target.value)} autoFocus style={{ ...inputStyle(true), flex: 1 }} />
              : <span style={{ flex: 1, fontWeight: "500", fontSize: "13px" }}>{cat}</span>}
            <Badge color={C.muted}>{products.filter(p => p.category === cat).length}</Badge>
            {editing === cat
              ? <>
                <Btn size="sm" variant="soft" onClick={() => { if (ev.trim() && ev !== cat) renameCat(cat, ev.trim()); setEditing(null); }}>Save</Btn>
                <Btn size="sm" variant="ghost" onClick={() => setEditing(null)}>✕</Btn>
              </>
              : <>
                <Btn size="sm" variant="ghost" onClick={() => { setEditing(cat); setEv(cat); }}>{t.edit}</Btn>
                <Btn size="sm" variant="ghost" onClick={() => askConfirm(`Delete "${cat}"?`, () => deleteCat(cat))} style={{ color: C.danger }}>✕</Btn>
              </>}
          </div>
        ))}
      </div>
    </Modal>
  );
}

function SequenceModal({ t, showToast, onClose }) {
  const [val, setVal] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    sb.from("app_settings").select("*", { eq: { key: "order_sequence" } }).then(rows => {
      if (Array.isArray(rows) && rows[0]) setVal(rows[0].value);
      setLoading(false);
    });
  }, []);
  const save = async () => {
    await sb.from("app_settings").update({ value: String(parseInt(val) || 1000) }, { eq: { key: "order_sequence" } });
    showToast(t.sequenceSaved);
    onClose();
  };
  return (
    <Modal title={t.setSequence} onClose={onClose}>
      <div style={{ fontSize: "13px", color: C.muted, lineHeight: "1.5" }}>
        The next order will use this number. The system will increment automatically from there.
      </div>
      {loading ? <div style={{ color: C.muted, fontSize: "13px" }}>{t.loading}</div>
        : <Inp label={t.orderNum} value={val} onChange={setVal} type="number" />}
      <Btn onClick={save} full size="lg">{t.save}</Btn>
    </Modal>
  );
}

function InvoiceModal({ t, doc, fmt, profile, onClose }) {
  const snap = doc.client_snapshot || {};
  const shareWA = () => {
    const items = (doc.items || []).map(i => `• ${i.name} ×${i.qty} — ${fmt(i.price * i.qty)}`).join("\n");
    window.open(`https://wa.me/?text=${encodeURIComponent(t.waMsg(doc, items, fmt(doc.total)))}`, "_blank");
  };
  const printDoc = () => {
    const html = makePDF(doc, profile, fmt, t);
    const w = window.open("", "_blank");
    w.document.write(html); w.document.close();
    setTimeout(() => w.print(), 400);
  };
  const sc = STATUS_COLOR[doc.status] || C.muted;
  return (
    <Modal title={`${(doc.type || "").toUpperCase()} · ${doc.order_number}`} onClose={onClose} wide>
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
        <Badge color={doc.type === "invoice" ? C.success : C.info}>{doc.type}</Badge>
        <Badge color={sc}>{t[doc.status] || doc.status}</Badge>
        {doc.salesperson_name && <Badge color={C.warn}>{doc.salesperson_name}</Badge>}
        <span style={{ fontSize: "12px", color: C.muted, marginLeft: "auto" }}>{doc.created_at ? new Date(doc.created_at).toLocaleDateString("en-GB") : ""}</span>
      </div>

      {(profile?.business_name || profile?.logo) && (
        <div style={{ background: C.bg, borderRadius: "8px", padding: "10px 12px", display: "flex", alignItems: "center", gap: "10px" }}>
          {profile.logo && <img src={profile.logo} style={{ height: "28px", maxWidth: "80px", objectFit: "contain" }} />}
          <div>
            {profile.business_name && <div style={{ fontWeight: "600", fontSize: "13px" }}>{profile.business_name}</div>}
            {profile.rnc && <div style={{ fontSize: "11px", color: C.muted }}>RNC: {profile.rnc}</div>}
          </div>
        </div>
      )}

      <div style={{ background: C.bg, borderRadius: "8px", padding: "10px 12px" }}>
        <div style={{ fontWeight: "600", fontSize: "14px", marginBottom: "2px" }}>{snap.name}</div>
        {snap.rnc && <div style={{ fontSize: "12px", color: C.muted }}>RNC: {snap.rnc}</div>}
        {snap.email && <div style={{ fontSize: "12px", color: C.muted }}>{snap.email}</div>}
        {snap.phone && <div style={{ fontSize: "12px", color: C.muted }}>{snap.phone}</div>}
      </div>

      <Divider />
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {(doc.items || []).map((i, idx) => (
          <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", padding: "5px 0", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ flex: 1 }}>{i.name} <span style={{ color: C.muted }}>×{i.qty}</span></span>
            <span style={{ fontWeight: "600" }}>{fmt(i.price * i.qty)}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", color: C.muted }}><span>{t.subtotal}</span><span>{fmt(doc.subtotal)}</span></div>
        {doc.discount > 0 && <div style={{ display: "flex", justifyContent: "space-between", color: C.danger }}><span>−{doc.discount}%</span><span>−{fmt(doc.discount_amt)}</span></div>}
        {(doc.tax_lines || []).filter(tx => tx.rate > 0).map(tx => <div key={tx.id} style={{ display: "flex", justifyContent: "space-between", color: C.muted }}><span>{tx.name} {tx.rate}%</span><span>+{fmt(tx.amt)}</span></div>)}
        <Divider />
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "700", fontSize: "16px", letterSpacing: "-0.02em" }}><span>{t.total}</span><span>{fmt(doc.total)}</span></div>
      </div>

      {doc.notes && <div style={{ background: C.bg, borderRadius: "8px", padding: "9px 11px", fontSize: "12px", color: C.muted }}>{doc.notes}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
        <Btn onClick={printDoc} full size="sm" variant="soft">🖨 {t.print}</Btn>
        <Btn onClick={shareWA} full size="sm" variant="success">💬 {t.shareWA}</Btn>
        <Btn onClick={onClose} full size="sm" variant="ghost">{t.close}</Btn>
      </div>
    </Modal>
  );
}
