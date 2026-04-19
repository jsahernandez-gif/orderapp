import { useState, useEffect, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════
   SUPABASE CLIENT
═══════════════════════════════════════════════════════════ */
const SUPA_URL = "https://gptrtvsigrkpporzhomv.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwdHJ0dnNpZ3JrcHBvcnpob212Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0ODc4NzksImV4cCI6MjA5MjA2Mzg3OX0.X43NfdKRx2vgKwpEyFUAqGs3i0W-fydfMolEhPVKt3w";

const getToken = () => window.__sb_token || SUPA_KEY;
const authHeaders = (extra = {}) => ({
  "Content-Type": "application/json",
  "apikey": SUPA_KEY,
  "Authorization": `Bearer ${getToken()}`,
  ...extra,
});

const sb = {
  auth: {
    signIn: async (email, password) => {
      const r = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=password`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ email, password }),
      });
      return r.json();
    },
    signOut: async () => {
      await fetch(`${SUPA_URL}/auth/v1/logout`, { method: "POST", headers: authHeaders() });
      window.__sb_token = null;
    },
    getUser: async () => {
      if (!window.__sb_token) return null;
      const r = await fetch(`${SUPA_URL}/auth/v1/user`, { headers: authHeaders() });
      if (!r.ok) return null;
      return r.json();
    },
  },
  from: (table) => ({
    select: async (cols = "*", opts = {}) => {
      let url = `${SUPA_URL}/rest/v1/${table}?select=${cols}`;
      if (opts.eq) Object.entries(opts.eq).forEach(([k, v]) => { url += `&${k}=eq.${encodeURIComponent(v)}`; });
      if (opts.order) url += `&order=${opts.order}`;
      if (opts.limit) url += `&limit=${opts.limit}`;
      const r = await fetch(url, { headers: authHeaders({ "Prefer": "return=representation" }) });
      if (!r.ok) return [];
      return r.json();
    },
    insert: async (data) => {
      const r = await fetch(`${SUPA_URL}/rest/v1/${table}`, {
        method: "POST", headers: authHeaders({ "Prefer": "return=representation" }),
        body: JSON.stringify(Array.isArray(data) ? data : [data]),
      });
      const j = await r.json();
      return Array.isArray(j) ? j[0] : j;
    },
    update: async (data, opts = {}) => {
      let url = `${SUPA_URL}/rest/v1/${table}?`;
      if (opts.eq) Object.entries(opts.eq).forEach(([k, v]) => { url += `${k}=eq.${encodeURIComponent(v)}&`; });
      const r = await fetch(url, {
        method: "PATCH", headers: authHeaders({ "Prefer": "return=representation" }),
        body: JSON.stringify(data),
      });
      return r.json();
    },
    upsert: async (data) => {
      const r = await fetch(`${SUPA_URL}/rest/v1/${table}`, {
        method: "POST",
        headers: authHeaders({ "Prefer": "resolution=merge-duplicates,return=representation" }),
        body: JSON.stringify(Array.isArray(data) ? data : [data]),
      });
      return r.json();
    },
    delete: async (opts = {}) => {
      let url = `${SUPA_URL}/rest/v1/${table}?`;
      if (opts.eq) Object.entries(opts.eq).forEach(([k, v]) => { url += `${k}=eq.${encodeURIComponent(v)}&`; });
      await fetch(url, { method: "DELETE", headers: authHeaders() });
    },
  }),
  storage: {
    upload: async (bucket, path, file) => {
      const r = await fetch(`${SUPA_URL}/storage/v1/object/${bucket}/${path}`, {
        method: "POST",
        headers: { "apikey": SUPA_KEY, "Authorization": `Bearer ${getToken()}` },
        body: file,
      });
      return r.json();
    },
    getUrl: (bucket, path) => `${SUPA_URL}/storage/v1/object/public/${bucket}/${path}`,
    remove: async (bucket, paths) => {
      await fetch(`${SUPA_URL}/storage/v1/object/${bucket}`, {
        method: "DELETE",
        headers: authHeaders(),
        body: JSON.stringify({ prefixes: paths }),
      });
    },
  },
};

/* ═══════════════════════════════════════════════════════════
   TRANSLATIONS
═══════════════════════════════════════════════════════════ */
const T = {
  en: {
    login:"Sign In", logout:"Sign Out", email:"Email", password:"Password",
    loginErr:"Invalid email or password.", loading:"Loading…",
    orders:"Orders", newOrder:"New Order", clients:"Clients",
    products:"Products", team:"Team", business:"Business", settings:"Settings", more:"More",
    selectClient:"Select Client", searchProducts:"Search products…",
    all:"All", cart:"Cart", clear:"Clear",
    discount:"Discount %", notes:"Notes…", subtotal:"Subtotal", total:"Total",
    quotation:"Quotation", invoice:"Invoice", change:"Change",
    noItems:"Tap a product to add it to the order.",
    salesperson:"Salesperson", selectSp:"Assign salesperson",
    paymentType:"Payment Type", cash:"Cash", credit:"Credit",
    creditDays:"Credit Days", customDays:"Custom days",
    dueDate:"Due Date", daysLeft:"days left", overdue:"OVERDUE",
    addClient:"Add Client", searchClients:"Search clients…",
    edit:"Edit", delete:"Delete", noClients:"No clients yet.",
    viewProfile:"Profile", clientProfile:"Client Profile",
    totalOrders:"Orders", collected:"Collected", owed:"Owed",
    addProduct:"Add Product", noProducts:"No products yet.",
    price:"Price", unit:"Unit", name:"Name", email2:"Email",
    phone:"Phone", address:"Address", newCat:"New Category", add:"Add",
    noOrders:"No orders yet.", status:"Status",
    ordered:"Pending", delivered:"Delivered", paid:"Paid", cancelled:"Cancelled",
    changeStatus:"Change Status", confirmDelete:"Delete permanently?",
    confirmBtn:"Delete", addMember:"Add Member", noTeam:"No team members yet.",
    spName:"Full Name", role:"Role", businessProfile:"Business Profile",
    businessName:"Business Name", rnc:"RNC / Tax ID",
    bPhone:"Phone", bEmail:"Email", bAddress:"Address",
    uploadLogo:"Upload Logo", logoHint:"PNG or JPG · max 2MB",
    saveProfile:"Save Profile", profileSaved:"Profile saved ✓",
    settingsTitle:"Settings", language:"Language",
    currency:"Currency", currSymbol:"Symbol", currPos:"Position",
    taxes:"Taxes", taxName:"Name", taxRate:"Rate %",
    addTax:"Add Tax", removeTax:"Remove",
    save:"Save", close:"Close", cancel:"Cancel",
    print:"Print / PDF", shareWA:"WhatsApp",
    date:"Date", billTo:"Bill To",
    withTax:"With tax", withoutTax:"No tax",
    orderNum:"Order #", setSequence:"Set Starting Number",
    sequenceSaved:"Sequence updated ✓",
    qty:"Qty", addImage:"Add Image", tapToEnlarge:"Tap image to enlarge",
    productImage:"Product Image", clientImage:"Client Photo",
    uploadImage:"Upload Image", removeImage:"Remove",
    paymentTerms:"Payment Terms", dueIn:"Due in",
    filterAll:"All", filterPending:"Pending", filterDelivered:"Delivered",
    filterPaid:"Paid", filterCancelled:"Cancelled",
    search:"Search…", adminOnly:"Admin only",
    waMsg: (doc, items, total, due) =>
      `Hello ${doc.client_snapshot?.name},\n\nHere is your ${doc.type} *${doc.order_number}*:\n\n${items}\n\n*Total: ${total}*${due ? `\n*Due date: ${due}*` : ""}\n\nThank you!`,
  },
  es: {
    login:"Iniciar Sesión", logout:"Cerrar Sesión", email:"Correo", password:"Contraseña",
    loginErr:"Correo o contraseña incorrectos.", loading:"Cargando…",
    orders:"Pedidos", newOrder:"Nuevo Pedido", clients:"Clientes",
    products:"Productos", team:"Equipo", business:"Empresa", settings:"Ajustes", more:"Más",
    selectClient:"Seleccionar Cliente", searchProducts:"Buscar productos…",
    all:"Todos", cart:"Carrito", clear:"Limpiar",
    discount:"Descuento %", notes:"Notas…", subtotal:"Subtotal", total:"Total",
    quotation:"Cotización", invoice:"Factura", change:"Cambiar",
    noItems:"Toca un producto para agregarlo al pedido.",
    salesperson:"Vendedor", selectSp:"Asignar vendedor",
    paymentType:"Tipo de Pago", cash:"Contado", credit:"Crédito",
    creditDays:"Días de Crédito", customDays:"Días personalizados",
    dueDate:"Fecha Límite", daysLeft:"días restantes", overdue:"VENCIDO",
    addClient:"Agregar Cliente", searchClients:"Buscar clientes…",
    edit:"Editar", delete:"Eliminar", noClients:"Sin clientes aún.",
    viewProfile:"Perfil", clientProfile:"Perfil del Cliente",
    totalOrders:"Pedidos", collected:"Cobrado", owed:"Pendiente",
    addProduct:"Agregar Producto", noProducts:"Sin productos aún.",
    price:"Precio", unit:"Unidad", name:"Nombre", email2:"Correo",
    phone:"Teléfono", address:"Dirección", newCat:"Nueva Categoría", add:"Agregar",
    noOrders:"Sin pedidos aún.", status:"Estado",
    ordered:"Pendiente", delivered:"Entregado", paid:"Pagado", cancelled:"Cancelado",
    changeStatus:"Cambiar Estado", confirmDelete:"¿Eliminar permanentemente?",
    confirmBtn:"Eliminar", addMember:"Agregar Miembro", noTeam:"Sin miembros aún.",
    spName:"Nombre Completo", role:"Rol", businessProfile:"Perfil Empresarial",
    businessName:"Nombre Empresa", rnc:"RNC / ID Fiscal",
    bPhone:"Teléfono", bEmail:"Correo", bAddress:"Dirección",
    uploadLogo:"Subir Logo", logoHint:"PNG o JPG · máx 2MB",
    saveProfile:"Guardar", profileSaved:"Guardado ✓",
    settingsTitle:"Ajustes", language:"Idioma",
    currency:"Moneda", currSymbol:"Símbolo", currPos:"Posición",
    taxes:"Impuestos", taxName:"Nombre", taxRate:"Tasa %",
    addTax:"Agregar", removeTax:"Quitar",
    save:"Guardar", close:"Cerrar", cancel:"Cancelar",
    print:"Imprimir / PDF", shareWA:"WhatsApp",
    date:"Fecha", billTo:"Facturar a",
    withTax:"Con impuesto", withoutTax:"Sin impuesto",
    orderNum:"Pedido #", setSequence:"Establecer Número Inicial",
    sequenceSaved:"Secuencia actualizada ✓",
    qty:"Cant.", addImage:"Agregar Imagen", tapToEnlarge:"Toca para ampliar",
    productImage:"Imagen del Producto", clientImage:"Foto del Cliente",
    uploadImage:"Subir Imagen", removeImage:"Quitar",
    paymentTerms:"Términos de Pago", dueIn:"Vence en",
    filterAll:"Todos", filterPending:"Pendiente", filterDelivered:"Entregado",
    filterPaid:"Pagado", filterCancelled:"Cancelado",
    search:"Buscar…", adminOnly:"Solo admin",
    waMsg: (doc, items, total, due) =>
      `Hola ${doc.client_snapshot?.name},\n\nAquí está su ${doc.type} *${doc.order_number}*:\n\n${items}\n\n*Total: ${total}*${due ? `\n*Fecha límite: ${due}*` : ""}\n\n¡Gracias!`,
  },
};

/* ═══════════════════════════════════════════════════════════
   DESIGN TOKENS
═══════════════════════════════════════════════════════════ */
const C = {
  bg: "#f5f5f3",
  surface: "#ffffff",
  border: "#e8e8e4",
  text: "#1a1a1a",
  muted: "#7a7a72",
  mutedLight: "#c8c8c0",
  accent: "#1a1a1a",
  accentSoft: "#f0ede8",
  danger: "#c0392b",
  dangerSoft: "#fdecea",
  success: "#27ae60",
  successSoft: "#eafaf1",
  info: "#2980b9",
  infoSoft: "#eaf4fb",
  warn: "#d4821a",
  warnSoft: "#fef6ec",
  shadow: "0 1px 3px rgba(0,0,0,0.07)",
  shadowMd: "0 4px 16px rgba(0,0,0,0.1)",
};

const STATUS = {
  ordered:   { color: C.info,    bg: C.infoSoft,    label: "ordered" },
  delivered: { color: C.warn,    bg: C.warnSoft,    label: "delivered" },
  paid:      { color: C.success, bg: C.successSoft, label: "paid" },
  cancelled: { color: C.danger,  bg: C.dangerSoft,  label: "cancelled" },
};

/* ═══════════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════════ */
const uid = () => (crypto.randomUUID?.() || Math.random().toString(36).slice(2));
const todayISO = () => new Date().toISOString().split("T")[0];
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-GB") : "";
const mkFmt = (sym, pos) => (n) => {
  const num = Number(n).toFixed(2);
  return pos === "after" ? `${num}${sym}` : `${sym}${num}`;
};
const match = (obj, q) =>
  !q || Object.values(obj).some(v => String(v || "").toLowerCase().includes(q.toLowerCase()));

// Dominican Republic phone formatter
const fmtPhone = (raw) => {
  const d = raw.replace(/\D/g, "");
  if (d.length === 0) return "";
  if (d.startsWith("1") && d.length <= 11) {
    const n = d.slice(1);
    if (n.length <= 3) return `+1 (${n}`;
    if (n.length <= 6) return `+1 (${n.slice(0,3)}) ${n.slice(3)}`;
    return `+1 (${n.slice(0,3)}) ${n.slice(3,6)}-${n.slice(6,10)}`;
  }
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0,3)}) ${d.slice(3)}`;
  return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6,10)}`;
};

// Days until due date
const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date(todayISO());
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const addDays = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
};

/* ═══════════════════════════════════════════════════════════
   GLOBAL STYLES
═══════════════════════════════════════════════════════════ */
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { height: 100%; }
    body { font-family: 'Geist', -apple-system, BlinkMacSystemFont, sans-serif;
      background: ${C.bg}; color: ${C.text}; height: 100%;
      -webkit-font-smoothing: antialiased; overscroll-behavior: none; }
    #root { height: 100%; display: flex; flex-direction: column; }
    input, select, textarea, button { font-family: inherit; }
    input[type=number] { -moz-appearance: textfield; }
    input[type=number]::-webkit-inner-spin-button,
    input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
    ::-webkit-scrollbar { width: 3px; height: 3px; }
    ::-webkit-scrollbar-thumb { background: ${C.mutedLight}; border-radius: 4px; }
    .fade { animation: fade .18s ease; }
    @keyframes fade { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
    .sheet { animation: sheet .22s cubic-bezier(.32,.72,0,1); }
    @keyframes sheet { from { transform:translateY(100%); } to { transform:translateY(0); } }
    img { display: block; max-width: 100%; }
    textarea { resize: vertical; }
    button { cursor: pointer; }
    input:focus, select:focus, textarea:focus { outline: none; }
  `}</style>
);

/* ═══════════════════════════════════════════════════════════
   UI PRIMITIVES
═══════════════════════════════════════════════════════════ */
const Btn = ({ children, onClick, variant = "primary", size = "md", disabled, full, style = {} }) => {
  const sizes = { sm: "5px 11px", md: "9px 18px", lg: "12px 22px" };
  const fz = { sm: "12px", md: "13px", lg: "14px" };
  const vars = {
    primary: { background: C.accent, color: "#fff", border: "none" },
    ghost:   { background: "transparent", color: C.muted, border: `1px solid ${C.border}` },
    danger:  { background: C.danger, color: "#fff", border: "none" },
    success: { background: C.success, color: "#fff", border: "none" },
    soft:    { background: C.accentSoft, color: C.accent, border: "none" },
    outline: { background: "transparent", color: C.accent, border: `1.5px solid ${C.accent}` },
    info:    { background: C.infoSoft, color: C.info, border: "none" },
  };
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled}
      style={{ padding: sizes[size], fontSize: fz[size], borderRadius: "8px", fontWeight: "500",
        display: "inline-flex", alignItems: "center", gap: "5px", whiteSpace: "nowrap",
        transition: "opacity .15s, transform .1s", opacity: disabled ? 0.4 : 1,
        width: full ? "100%" : "auto", justifyContent: full ? "center" : undefined,
        flexShrink: 0, letterSpacing: "-0.01em", ...vars[variant], ...style }}>
      {children}
    </button>
  );
};

const inputBase = {
  background: C.surface, border: `1px solid ${C.border}`, borderRadius: "9px",
  padding: "10px 13px", color: C.text, fontSize: "14px", width: "100%",
  transition: "border-color .15s",
};
const inputBaseSm = { ...inputBase, padding: "7px 10px", fontSize: "13px" };

const Inp = ({ label, value, onChange, type = "text", placeholder, required, sm, onFocus, onBlur }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
    {label && <label style={{ fontSize: "11px", fontWeight: "600", color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}{required && " *"}</label>}
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={sm ? inputBaseSm : inputBase}
      onFocus={e => { e.target.style.borderColor = C.accent; onFocus?.(e); }}
      onBlur={e => { e.target.style.borderColor = C.border; onBlur?.(e); }}
    />
  </div>
);

// Phone input with DR formatting
const PhoneInp = ({ label, value, onChange }) => (
  <Inp label={label} value={value}
    onChange={v => onChange(fmtPhone(v.replace(/\D/g, "")))}
    type="tel" placeholder="(809) 000-0000" />
);

// Quantity input — clears on focus, numeric only
const QtyInput = ({ value, onChange, style = {} }) => (
  <input
    type="number" inputMode="numeric" pattern="[0-9]*"
    value={value === 0 ? "" : value}
    onChange={e => onChange(parseInt(e.target.value) || 0)}
    onFocus={e => { e.target.select(); }}
    placeholder="0"
    style={{ textAlign: "center", fontWeight: "700", fontSize: "14px", color: value > 0 ? C.accent : C.muted,
      background: "transparent", border: "none", outline: "none", fontFamily: "inherit",
      width: "100%", ...style }}
  />
);

const Sel = ({ label, value, onChange, options }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
    {label && <label style={{ fontSize: "11px", fontWeight: "600", color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</label>}
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ ...inputBase, appearance: "none", WebkitAppearance: "none" }}>
      {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
    </select>
  </div>
);

const Badge = ({ children, color, bg }) => (
  <span style={{ background: bg || color + "18", color, borderRadius: "5px",
    padding: "2px 7px", fontSize: "11px", fontWeight: "600",
    textTransform: "capitalize", whiteSpace: "nowrap" }}>{children}</span>
);

const Divider = ({ my = 0 }) => (
  <div style={{ height: 1, background: C.border, margin: `${my}px 0` }} />
);

const Card = ({ children, style = {}, onClick, pad = 14 }) => (
  <div onClick={onClick} style={{ background: C.surface, border: `1px solid ${C.border}`,
    borderRadius: "12px", boxShadow: C.shadow, overflow: "hidden",
    padding: pad, cursor: onClick ? "pointer" : undefined, ...style }}>
    {children}
  </div>
);

const Section = ({ title, right, children }) => (
  <div style={{ marginBottom: "4px" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
      <div style={{ fontSize: "11px", fontWeight: "700", color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em" }}>{title}</div>
      {right}
    </div>
    {children}
  </div>
);

/* ═══════════════════════════════════════════════════════════
   SWIPEABLE MODAL (sheet from bottom, swipe-down to close)
═══════════════════════════════════════════════════════════ */
const Sheet = ({ title, children, onClose, wide }) => {
  const sheetRef = useRef(null);
  const startY = useRef(null);
  const curY = useRef(0);

  // Browser back closes modal
  useEffect(() => {
    window.history.pushState({ modal: true }, "");
    const onPop = () => onClose();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [onClose]);

  const onTouchStart = (e) => { startY.current = e.touches[0].clientY; };
  const onTouchMove = (e) => {
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0 && sheetRef.current) {
      curY.current = dy;
      sheetRef.current.style.transform = `translateY(${dy}px)`;
    }
  };
  const onTouchEnd = () => {
    if (curY.current > 90) { onClose(); }
    else if (sheetRef.current) { sheetRef.current.style.transform = ""; }
    curY.current = 0;
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", zIndex: 200,
        backdropFilter: "blur(3px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div ref={sheetRef} className="sheet"
        style={{ background: C.surface, borderRadius: "20px 20px 0 0",
          width: "100%", maxWidth: wide ? "780px" : "540px",
          maxHeight: "93vh", display: "flex", flexDirection: "column",
          boxShadow: "0 -6px 32px rgba(0,0,0,.12)", transition: "transform .15s ease", touchAction: "none" }}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        {/* Drag handle */}
        <div style={{ padding: "10px 0 4px", display: "flex", justifyContent: "center", flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, background: C.border, borderRadius: 4 }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "8px 18px 14px", flexShrink: 0, borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontSize: "15px", fontWeight: "600", letterSpacing: "-0.02em" }}>{title}</span>
          <button onClick={onClose} style={{ background: C.accentSoft, border: "none",
            borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center",
            justifyContent: "center", color: C.muted, fontSize: "14px" }}>✕</button>
        </div>
        <div style={{ overflowY: "auto", padding: "18px", display: "flex",
            flexDirection: "column", gap: "13px", flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   CONFIRM DIALOG
═══════════════════════════════════════════════════════════ */
const Confirm = ({ message, onConfirm, onCancel, t }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400,
      padding: "20px", backdropFilter: "blur(4px)" }}>
    <div className="fade" style={{ background: C.surface, borderRadius: "16px",
        padding: "28px 24px", maxWidth: "320px", width: "100%", textAlign: "center",
        boxShadow: C.shadowMd }}>
      <div style={{ fontSize: "30px", marginBottom: "12px" }}>⚠️</div>
      <div style={{ fontSize: "14px", color: C.text, marginBottom: "22px", lineHeight: "1.5" }}>{message}</div>
      <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
        <Btn variant="ghost" onClick={onCancel}>{t.cancel}</Btn>
        <Btn variant="danger" onClick={onConfirm}>{t.confirmBtn}</Btn>
      </div>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════
   TOAST
═══════════════════════════════════════════════════════════ */
const Toast = ({ msg }) => (
  <div style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
    background: C.accent, color: "#fff", padding: "10px 20px", borderRadius: "100px",
    fontSize: "13px", fontWeight: "500", zIndex: 500, boxShadow: C.shadowMd,
    whiteSpace: "nowrap", pointerEvents: "none" }}>{msg}</div>
);

/* ═══════════════════════════════════════════════════════════
   IMAGE UPLOADER
═══════════════════════════════════════════════════════════ */
const ImageUploader = ({ url, onUpload, onRemove, label = "Image", size = 80 }) => {
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `${uid()}-${file.name.replace(/\s/g, "_")}`;
    await sb.storage.upload("images", path, file);
    const publicUrl = sb.storage.getUrl("images", path);
    onUpload(publicUrl);
    setUploading(false);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
      <div onClick={() => !url && fileRef.current?.click()}
        style={{ width: size, height: size, borderRadius: "10px", overflow: "hidden",
          border: `1.5px dashed ${url ? "transparent" : C.border}`,
          background: url ? "transparent" : C.bg,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: url ? "default" : "pointer", flexShrink: 0 }}>
        {url ? <img src={url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ fontSize: "24px" }}>📷</span>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <Btn size="sm" variant="soft" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? "Uploading…" : url ? "Change" : label}
        </Btn>
        {url && <Btn size="sm" variant="ghost" onClick={onRemove} style={{ color: C.danger }}>Remove</Btn>}
        <input ref={fileRef} type="file" accept="image/*" capture="environment"
          onChange={handleFile} style={{ display: "none" }} />
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   IMAGE LIGHTBOX
═══════════════════════════════════════════════════════════ */
const Lightbox = ({ url, onClose }) => (
  <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.9)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 600,
      padding: "20px" }}>
    <img src={url} style={{ maxWidth: "100%", maxHeight: "90vh", borderRadius: "12px",
      objectFit: "contain" }} />
    <button onClick={onClose} style={{ position: "absolute", top: 20, right: 20,
      background: "rgba(255,255,255,.15)", border: "none", borderRadius: "50%",
      width: 36, height: 36, color: "#fff", fontSize: "18px",
      display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
  </div>
);

/* ═══════════════════════════════════════════════════════════
   DUE DATE BADGE
═══════════════════════════════════════════════════════════ */
const DueBadge = ({ dueDate, t }) => {
  if (!dueDate) return null;
  const days = daysUntil(dueDate);
  if (days === null) return null;
  const overdue = days < 0;
  const urgent = days >= 0 && days <= 3;
  return (
    <span style={{ background: overdue ? C.dangerSoft : urgent ? C.warnSoft : C.infoSoft,
      color: overdue ? C.danger : urgent ? C.warn : C.info,
      borderRadius: "5px", padding: "2px 7px", fontSize: "11px", fontWeight: "600",
      whiteSpace: "nowrap" }}>
      {overdue ? `⚠ ${t.overdue}` : `${days}d`}
    </span>
  );
};

/* ═══════════════════════════════════════════════════════════
   PDF GENERATOR
═══════════════════════════════════════════════════════════ */
const makePDF = (doc, profile, fmt, t) => {
  const snap = doc.client_snapshot || {};
  const taxRows = (doc.tax_lines || []).filter(tx => tx.rate > 0)
    .map(tx => `<tr><td colspan="4" style="text-align:right;padding:4px 8px;color:#666">${tx.name} (${tx.rate}%)</td><td style="text-align:right;padding:4px 8px">+${fmt(tx.amt)}</td></tr>`).join("");
  const logo = profile?.logo
    ? `<img src="${profile.logo}" style="max-height:56px;max-width:160px;object-fit:contain"/>`
    : `<b style="font-size:20px">${profile?.business_name || "OrderApp"}</b>`;
  const dueStr = doc.due_date ? `<div style="margin-top:6px;font-size:12px;color:#666">${t.dueDate}: <b>${fmtDate(doc.due_date)}</b></div>` : "";
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${doc.order_number}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,Helvetica,sans-serif;color:#1a1a1a;padding:44px}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:20px;border-bottom:2px solid #1a1a1a}
.type{font-size:26px;font-weight:200;text-transform:uppercase;letter-spacing:.08em;color:#888;margin-top:4px}
.info{font-size:12px;color:#555;line-height:1.65}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px}
.lbl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#bbb;margin-bottom:5px;border-bottom:1px solid #f0f0f0;padding-bottom:3px}
table{width:100%;border-collapse:collapse;font-size:13px}
th{background:#f7f7f5;padding:8px 10px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#999;border-bottom:1px solid #eee}
td{padding:8px 10px;border-bottom:1px solid #f5f5f5}
.totals{margin-left:auto;width:230px;font-size:13px;margin-top:6px}
.totals td{border:none;padding:3px 8px}
.total-row td{font-weight:700;font-size:16px;border-top:2px solid #1a1a1a;padding-top:9px!important}
.footer{margin-top:40px;padding-top:14px;border-top:1px solid #eee;font-size:11px;color:#bbb;text-align:center}
</style></head><body>
<div class="hdr">
  <div>${logo}<div class="info" style="margin-top:7px">${[profile?.business_name, profile?.rnc ? "RNC: " + profile.rnc : "", profile?.phone, profile?.email, profile?.address].filter(Boolean).join("<br>")}</div></div>
  <div style="text-align:right">
    <div class="type">${doc.type}</div>
    <div style="font-size:13px;color:#555;margin-top:4px"><b>${doc.order_number}</b></div>
    <div style="font-size:12px;color:#888;margin-top:3px">${t.date}: ${fmtDate(doc.created_at)}</div>
    ${doc.payment_type ? `<div style="margin-top:5px;font-size:12px;color:#888">${doc.payment_type === "credit" ? "Credit" : "Cash"}</div>` : ""}
    ${dueStr}
  </div>
</div>
<div class="cols">
  <div><div class="lbl">${t.billTo}</div><div class="info"><b>${snap.name || ""}</b><br>${[snap.rnc ? "RNC: " + snap.rnc : "", snap.email, snap.phone, snap.address].filter(Boolean).join("<br>")}</div></div>
  <div>${doc.salesperson_name ? `<div class="lbl">${t.salesperson}</div><div style="font-size:13px;font-weight:600">${doc.salesperson_name}</div>` : ""}${doc.notes ? `<div class="lbl" style="margin-top:${doc.salesperson_name ? "12px" : "0"}">Notes</div><div class="info">${doc.notes}</div>` : ""}</div>
</div>
<table><thead><tr><th>#</th><th>Item</th><th style="text-align:right">Unit Price</th><th style="text-align:center">${t.qty}</th><th style="text-align:right">Total</th></tr></thead>
<tbody>${(doc.items || []).map((i, n) => `<tr><td style="color:#bbb">${n + 1}</td><td><b>${i.name}</b><div style="font-size:11px;color:#bbb">${i.unit || ""}</div></td><td style="text-align:right">${fmt(i.price)}</td><td style="text-align:center;font-weight:600">${i.qty}</td><td style="text-align:right;font-weight:600">${fmt(i.price * i.qty)}</td></tr>`).join("")}</tbody></table>
<table class="totals"><tbody>
<tr><td>${t.subtotal}</td><td style="text-align:right">${fmt(doc.subtotal)}</td></tr>
${doc.discount > 0 ? `<tr><td>Discount (${doc.discount}%)</td><td style="text-align:right;color:#c0392b">−${fmt(doc.discount_amt)}</td></tr>` : ""}
${taxRows}
<tr class="total-row"><td>${t.total}</td><td style="text-align:right">${fmt(doc.total)}</td></tr>
</tbody></table>
<div class="footer">OrderApp · ${fmtDate(new Date().toISOString())}${profile?.business_name ? " · " + profile.business_name : ""}</div>
</body></html>`;
};

/* ═══════════════════════════════════════════════════════════
   ROOT APP
═══════════════════════════════════════════════════════════ */
export default function App() {
  const [user, setUser] = useState(null);
  const [salesperson, setSalesperson] = useState(null);
  const [booting, setBooting] = useState(true);
  const [settings, setSettingsState] = useState({ lang: "es", currencySymbol: "RD$", currencyPosition: "before", taxes: [{ id: "t1", name: "ITBIS", rate: 18 }] });
  const [profile, setProfileState] = useState({ business_name: "", rnc: "", phone: "", email: "", address: "", logo: "" });
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [lightbox, setLightbox] = useState(null);

  const t = T[settings.lang] || T.es;
  const fmt = mkFmt(settings.currencySymbol, settings.currencyPosition);

  const showToast = useCallback((msg, ms = 2400) => {
    setToast(msg);
    setTimeout(() => setToast(null), ms);
  }, []);

  const askConfirm = useCallback((msg, cb) => setConfirm({ msg, cb }), []);

  useEffect(() => {
    (async () => {
      const stored = localStorage.getItem("sb_token");
      if (stored) window.__sb_token = stored;
      const u = await sb.auth.getUser();
      if (u?.id) {
        setUser(u);
        const sp = await sb.from("salespeople").select("*", { eq: { auth_user_id: u.id } });
        if (Array.isArray(sp) && sp[0]) setSalesperson(sp[0]);
      }
      try {
        const rows = await sb.from("app_config").select("*");
        if (Array.isArray(rows)) {
          const s = rows.find(r => r.key === "settings");
          if (s?.value) setSettingsState(s.value);
        }
        const pr = await sb.from("business_profile").select("*");
        if (Array.isArray(pr) && pr[0]) setProfileState(pr[0]);
      } catch {}
      setBooting(false);
    })();
  }, []);

  const handleLogin = async (email, password) => {
    const data = await sb.auth.signIn(email, password);
    if (data.access_token) {
      window.__sb_token = data.access_token;
      localStorage.setItem("sb_token", data.access_token);
      setUser(data.user);
      const sp = await sb.from("salespeople").select("*", { eq: { auth_user_id: data.user.id } });
      if (Array.isArray(sp) && sp[0]) setSalesperson(sp[0]);
      const rows = await sb.from("app_config").select("*");
      if (Array.isArray(rows)) { const s = rows.find(r => r.key === "settings"); if (s?.value) setSettingsState(s.value); }
      const pr = await sb.from("business_profile").select("*");
      if (Array.isArray(pr) && pr[0]) setProfileState(pr[0]);
      return true;
    }
    return false;
  };

  const handleLogout = async () => {
    await sb.auth.signOut();
    localStorage.removeItem("sb_token");
    setUser(null); setSalesperson(null);
  };

  const saveSettings = async (s) => {
    setSettingsState(s);
    await sb.from("app_config").upsert({ key: "settings", value: s });
  };

  const saveProfile = async (p) => {
    setProfileState(p);
    if (p.id) await sb.from("business_profile").update(p, { eq: { id: p.id } });
    else { const r = await sb.from("business_profile").insert(p); if (r?.id) setProfileState({ ...p, id: r.id }); }
    showToast(t.profileSaved);
  };

  if (booting) return (
    <>
      <GlobalStyle />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: C.bg }}>
        <div style={{ textAlign: "center", color: C.muted }}>
          <div style={{ fontSize: "36px", marginBottom: "10px" }}>⚡</div>
          <div style={{ fontSize: "13px" }}>{t.loading}</div>
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
      <MainApp user={user} salesperson={salesperson} t={t} fmt={fmt}
        settings={settings} saveSettings={saveSettings}
        profile={profile} saveProfile={saveProfile}
        showToast={showToast} askConfirm={askConfirm}
        onLogout={handleLogout} setLightbox={setLightbox} />
      {toast && <Toast msg={toast} />}
      {confirm && <Confirm message={confirm.msg} t={t}
        onConfirm={() => { confirm.cb(); setConfirm(null); }}
        onCancel={() => setConfirm(null)} />}
      {lightbox && <Lightbox url={lightbox} onClose={() => setLightbox(null)} />}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   LOGIN
═══════════════════════════════════════════════════════════ */
function LoginScreen({ t, onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email || !password) return;
    setLoading(true); setErr("");
    const ok = await onLogin(email, password);
    if (!ok) setErr(t.loginErr);
    setLoading(false);
  };

  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        background: C.bg, padding: "24px" }}>
      <div className="fade" style={{ width: "100%", maxWidth: "340px" }}>
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <div style={{ fontSize: "42px", marginBottom: "12px" }}>⚡</div>
          <div style={{ fontSize: "22px", fontWeight: "700", letterSpacing: "-0.03em" }}>OrderApp</div>
          <div style={{ fontSize: "13px", color: C.muted, marginTop: "4px" }}>Sign in to continue</div>
        </div>
        <Card style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <Inp label={t.email} value={email} onChange={setEmail} type="email" placeholder="you@example.com" />
          <Inp label={t.password} value={password} onChange={setPassword} type="password" placeholder="••••••••" />
          {err && <div style={{ fontSize: "13px", color: C.danger, textAlign: "center" }}>{err}</div>}
          <Btn onClick={submit} full size="lg" disabled={loading} style={{ marginTop: "4px" }}>
            {loading ? t.loading : t.login}
          </Btn>
        </Card>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN APP SHELL
═══════════════════════════════════════════════════════════ */
function MainApp({ user, salesperson, t, fmt, settings, saveSettings, profile, saveProfile, showToast, askConfirm, onLogout, setLightbox }) {
  const [tab, setTab] = useState("orders");
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [team, setTeam] = useState([]);
  const [moreOpen, setMoreOpen] = useState(false);
  const isAdmin = salesperson?.is_admin !== false;

  // Order builder state
  const [selClient, setSelClient] = useState(null);
  const [cart, setCart] = useState({});
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [selSp, setSelSp] = useState(salesperson?.id || "");
  const [useTax, setUseTax] = useState(true);
  const [payType, setPayType] = useState("cash");
  const [creditDays, setCreditDays] = useState(30);
  const [editingId, setEditingId] = useState(null);
  const [activeCat, setActiveCat] = useState("All");
  const [searchQ, setSearchQ] = useState("");

  // Modals
  const [modal, setModal] = useState(null);
  const [editObj, setEditObj] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);

  const loadAll = useCallback(async () => {
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

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => {
    let active = true;
    const poll = async () => { while (active) { await new Promise(r => setTimeout(r, 5000)); if (active) loadAll(); } };
    poll();
    return () => { active = false; };
  }, [loadAll]);

  // Cart math
  const cartItems = Object.entries(cart).filter(([, q]) => q > 0)
    .map(([id, qty]) => ({ ...products.find(p => p.id === id), qty })).filter(x => x.id);
  const subtotal = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
  const discountAmt = subtotal * (discount / 100);
  const afterDiscount = subtotal - discountAmt;
  const taxLines = useTax
    ? (settings.taxes || []).filter(tx => tx.rate > 0).map(tx => ({ ...tx, amt: afterDiscount * (tx.rate / 100) }))
    : [];
  const taxTotal = taxLines.reduce((s, tx) => s + tx.amt, 0);
  const total = afterDiscount + taxTotal;
  const cartCount = cartItems.reduce((s, i) => s + i.qty, 0);

  const setQty = (pid, qty) => setCart(c => ({ ...c, [pid]: Math.max(0, qty) }));
  const clearOrder = () => {
    setCart({}); setSelClient(null); setDiscount(0); setNotes("");
    setSelSp(salesperson?.id || ""); setUseTax(true); setPayType("cash");
    setCreditDays(30); setEditingId(null);
  };

  const getNextNum = async () => {
    const rows = await sb.from("app_settings").select("*", { eq: { key: "order_sequence" } });
    const cur = parseInt(Array.isArray(rows) && rows[0] ? rows[0].value : "1000");
    await sb.from("app_settings").update({ value: String(cur + 1) }, { eq: { key: "order_sequence" } });
    return String(cur).padStart(5, "0");
  };

  const finalizeOrder = async (type) => {
    if (!selClient || cartItems.length === 0) return;
    const spRow = team.find(s => s.id === selSp);
    const dueDate = payType === "credit" ? addDays(creditDays) : null;
    const orderNum = editingId
      ? orders.find(o => o.id === editingId)?.order_number
      : await getNextNum();
    const payload = {
      type, order_number: orderNum, status: "ordered",
      client_id: selClient.id, client_snapshot: selClient,
      items: cartItems, subtotal, discount, discount_amt: discountAmt,
      tax_lines: taxLines, tax_total: taxTotal, total, notes,
      salesperson_id: spRow?.id || null, salesperson_name: spRow?.name || "",
      currency_symbol: settings.currencySymbol, currency_position: settings.currencyPosition,
      payment_type: payType, credit_days: payType === "credit" ? creditDays : null,
      due_date: dueDate, created_by: user.id,
    };
    let saved;
    if (editingId) {
      await sb.from("orders").update(payload, { eq: { id: editingId } });
      saved = { ...payload, id: editingId };
      setOrders(os => os.map(o => o.id === editingId ? { ...o, ...payload } : o));
    } else {
      saved = await sb.from("orders").insert(payload);
      if (saved?.id) setOrders(os => [saved, ...os]);
    }
    setPreviewDoc(saved || payload);
    setModal("invoice");
    clearOrder();
    showToast(type === "invoice" ? "Invoice created ✓" : "Quotation created ✓");
  };

  const loadEditOrder = (order) => {
    setEditingId(order.id);
    setSelClient(order.client_snapshot || {});
    const c = {};
    (order.items || []).forEach(i => { c[i.id] = i.qty; });
    setCart(c);
    setDiscount(order.discount || 0);
    setNotes(order.notes || "");
    setSelSp(order.salesperson_id || "");
    setUseTax((order.tax_lines || []).length > 0);
    setPayType(order.payment_type || "cash");
    setCreditDays(order.credit_days || 30);
    setTab("orders"); setModal("newOrder");
  };

  // CRUD helpers
  const saveClient = async (c) => {
    if (c.id) { await sb.from("clients").update(c, { eq: { id: c.id } }); setClients(cs => cs.map(x => x.id === c.id ? c : x)); }
    else { const r = await sb.from("clients").insert(c); if (r?.id) setClients(cs => [...cs, r]); }
  };
  const delClient = async (id) => { await sb.from("clients").delete({ eq: { id } }); setClients(cs => cs.filter(x => x.id !== id)); };
  const saveProduct = async (p) => {
    if (p.id) { await sb.from("products").update(p, { eq: { id: p.id } }); setProducts(ps => ps.map(x => x.id === p.id ? p : x)); }
    else { const r = await sb.from("products").insert(p); if (r?.id) setProducts(ps => [...ps, r]); }
  };
  const delProduct = async (id) => { await sb.from("products").delete({ eq: { id } }); setProducts(ps => ps.filter(x => x.id !== id)); };
  const savePerson = async (p) => {
    if (p.id) { await sb.from("salespeople").update(p, { eq: { id: p.id } }); setTeam(ts => ts.map(x => x.id === p.id ? p : x)); }
    else { const r = await sb.from("salespeople").insert(p); if (r?.id) setTeam(ts => [...ts, r]); }
  };
  const delPerson = async (id) => { await sb.from("salespeople").delete({ eq: { id } }); setTeam(ts => ts.filter(x => x.id !== id)); };
  const delOrder = async (id) => { await sb.from("orders").delete({ eq: { id } }); setOrders(os => os.filter(o => o.id !== id)); };
  const updateStatus = async (id, status) => {
    await sb.from("orders").update({ status }, { eq: { id } });
    setOrders(os => os.map(o => o.id === id ? { ...o, status } : o));
  };
  const saveCat = async (name) => { await sb.from("categories").insert({ name, sort_order: categories.length }); setCategories(cs => [...cs, name]); };
  const delCat = async (name) => { await sb.from("categories").delete({ eq: { name } }); setCategories(cs => cs.filter(c => c !== name)); };
  const renameCat = async (old, neu) => {
    await sb.from("categories").update({ name: neu }, { eq: { name: old } });
    setCategories(cs => cs.map(c => c === old ? neu : c));
    setProducts(ps => ps.map(p => p.category === old ? { ...p, category: neu } : p));
  };

  // Bottom nav
  const primaryTabs = [
    { id: "orders", icon: "📋", label: t.orders },
    { id: "clients", icon: "👥", label: t.clients },
    { id: "products", icon: "📦", label: t.products },
    { id: "business", icon: "🏢", label: t.business },
    { id: "more", icon: "⋯", label: t.more },
  ];
  const moreTabs = [
    ...(isAdmin ? [{ id: "team", icon: "👔", label: t.team }] : []),
    { id: "settings", icon: "⚙️", label: t.settings },
    { id: "logout", icon: "↩", label: t.logout },
  ];

  const handleTabPress = (id) => {
    if (id === "more") { setMoreOpen(v => !v); return; }
    if (id === "logout") { onLogout(); return; }
    setMoreOpen(false);
    setTab(id);
  };

  const sharedProps = { t, fmt, settings, showToast, askConfirm, isAdmin, user, setLightbox };
  const orderBuilderProps = { clients, products, categories, team, cart, setQty, cartItems, subtotal, discount, setDiscount, total, taxLines, discountAmt, taxTotal, cartCount, selClient, setSelClient, activeCat, setActiveCat, searchQ, setSearchQ, notes, setNotes, selSp, setSelSp, useTax, setUseTax, payType, setPayType, creditDays, setCreditDays, finalizeOrder, clearOrder, editingId, salesperson };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
      {/* Page header */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "12px 16px",
          display: "flex", alignItems: "center", gap: "10px", flexShrink: 0, boxShadow: C.shadow }}>
        {profile?.logo
          ? <img src={profile.logo} style={{ height: "26px", maxWidth: "80px", objectFit: "contain" }} />
          : <span style={{ fontSize: "15px", fontWeight: "700", letterSpacing: "-0.03em" }}>⚡ {profile?.business_name || "OrderApp"}</span>}
        <div style={{ flex: 1 }} />
        {tab === "orders" && (
          <Btn size="sm" variant="primary" onClick={() => setModal("newOrder")}>+ {t.newOrder}</Btn>
        )}
        <div style={{ fontSize: "12px", color: C.muted, display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.success, display: "inline-block" }} />
          {salesperson?.name || user?.email?.split("@")[0]}
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {tab === "orders" && <OrdersView {...sharedProps} orders={orders} clients={clients} delOrder={delOrder} updateStatus={updateStatus} setPreviewDoc={setPreviewDoc} setModal={setModal} setEditObj={setEditObj} loadEditOrder={loadEditOrder} />}
        {tab === "clients" && <ClientsView {...sharedProps} clients={clients} orders={orders} saveClient={saveClient} delClient={delClient} setModal={setModal} setEditObj={setEditObj} />}
        {tab === "products" && <ProductsView {...sharedProps} products={products} categories={categories} saveProduct={saveProduct} delProduct={delProduct} saveCat={saveCat} delCat={delCat} renameCat={renameCat} setModal={setModal} setEditObj={setEditObj} />}
        {tab === "business" && <ProfileView {...sharedProps} profile={profile} saveProfile={saveProfile} />}
        {tab === "team" && isAdmin && <TeamView {...sharedProps} team={team} savePerson={savePerson} delPerson={delPerson} setModal={setModal} setEditObj={setEditObj} />}
        {tab === "settings" && <SettingsView {...sharedProps} saveSettings={saveSettings} isAdmin={isAdmin} />}
      </div>

      {/* More menu */}
      {moreOpen && (
        <div onClick={() => setMoreOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 90 }}>
          <div className="fade" onClick={e => e.stopPropagation()}
            style={{ position: "absolute", bottom: 62, right: 8, background: C.surface,
              border: `1px solid ${C.border}`, borderRadius: "14px", boxShadow: C.shadowMd,
              overflow: "hidden", minWidth: "160px" }}>
            {moreTabs.map(tb => (
              <button key={tb.id} onClick={() => handleTabPress(tb.id)}
                style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%",
                  padding: "13px 16px", border: "none", background: "transparent",
                  color: tb.id === "logout" ? C.danger : C.text, fontSize: "14px",
                  fontWeight: "500", borderBottom: `1px solid ${C.border}`, cursor: "pointer",
                  fontFamily: "inherit" }}>
                <span>{tb.icon}</span><span>{tb.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom navigation */}
      <div style={{ background: C.surface, borderTop: `1px solid ${C.border}`,
          display: "flex", padding: "4px 0 max(4px, env(safe-area-inset-bottom))",
          flexShrink: 0, boxShadow: "0 -1px 0 rgba(0,0,0,.06)" }}>
        {primaryTabs.map(tb => {
          const active = tb.id !== "more" && tab === tb.id;
          return (
            <button key={tb.id} onClick={() => handleTabPress(tb.id)}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                gap: "3px", padding: "6px 4px", border: "none", background: "transparent",
                color: active ? C.accent : C.muted, cursor: "pointer", transition: "color .15s" }}>
              <span style={{ fontSize: "18px", lineHeight: 1 }}>{tb.icon}</span>
              <span style={{ fontSize: "10px", fontWeight: active ? "700" : "500", letterSpacing: "-0.01em" }}>{tb.label}</span>
            </button>
          );
        })}
      </div>

      {/* Modals */}
      {modal === "newOrder" && (
        <Sheet title={editingId ? t.edit + " " + t.orders : t.newOrder} onClose={() => { setModal(null); if (!editingId) clearOrder(); }} wide>
          <OrderBuilder {...orderBuilderProps} t={t} fmt={fmt} settings={settings} setModal={setModal} setEditObj={setEditObj} />
        </Sheet>
      )}
      {modal === "clientPick" && (
        <Sheet title={t.selectClient} onClose={() => setModal("newOrder")}>
          <ClientPickModal t={t} clients={clients} onPick={c => { setSelClient(c); setModal("newOrder"); }} onNew={() => setModal("client")} />
        </Sheet>
      )}
      {modal === "client" && <Sheet title={editObj ? t.edit : t.addClient} onClose={() => { setModal(null); setEditObj(null); }}>
        <ClientForm t={t} client={editObj} onSave={async c => { await saveClient(c); setModal(null); setEditObj(null); showToast("Saved ✓"); }} onClose={() => { setModal(null); setEditObj(null); }} />
      </Sheet>}
      {modal === "product" && <Sheet title={editObj ? t.edit : t.addProduct} onClose={() => { setModal(null); setEditObj(null); }}>
        <ProductForm t={t} product={editObj} categories={categories} onSave={async p => { await saveProduct(p); setModal(null); setEditObj(null); showToast("Saved ✓"); }} />
      </Sheet>}
      {modal === "person" && <Sheet title={editObj ? t.edit : t.addMember} onClose={() => { setModal(null); setEditObj(null); }}>
        <PersonForm t={t} person={editObj} onSave={async p => { await savePerson(p); setModal(null); setEditObj(null); showToast("Saved ✓"); }} />
      </Sheet>}
      {modal === "clientProfile" && editObj && <Sheet title={t.clientProfile} onClose={() => { setModal(null); setEditObj(null); }} wide>
        <ClientProfileView t={t} fmt={fmt} client={editObj} orders={orders} loadEditOrder={o => { loadEditOrder(o); setModal(null); setEditObj(null); }} />
      </Sheet>}
      {modal === "status" && editObj && <Sheet title={t.changeStatus} onClose={() => { setModal(null); setEditObj(null); }}>
        <StatusPicker t={t} current={editObj.status} onPick={async s => { await updateStatus(editObj.id, s); setModal(null); setEditObj(null); showToast("Updated ✓"); }} />
      </Sheet>}
      {modal === "catMgr" && <Sheet title="Categories" onClose={() => setModal(null)}>
        <CatManager t={t} categories={categories} products={products} saveCat={saveCat} delCat={delCat} renameCat={renameCat} askConfirm={askConfirm} />
      </Sheet>}
      {modal === "sequence" && isAdmin && <Sheet title={t.setSequence} onClose={() => setModal(null)}>
        <SequencePicker t={t} showToast={showToast} onClose={() => setModal(null)} />
      </Sheet>}
      {modal === "invoice" && previewDoc && <Sheet title={`${(previewDoc.type || "").toUpperCase()} · ${previewDoc.order_number}`} onClose={() => { setModal(null); setPreviewDoc(null); }} wide>
        <InvoicePreview t={t} doc={previewDoc} fmt={mkFmt(previewDoc.currency_symbol || settings.currencySymbol, previewDoc.currency_position || settings.currencyPosition)} profile={profile} onClose={() => { setModal(null); setPreviewDoc(null); }} />
      </Sheet>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ORDERS VIEW (main screen)
═══════════════════════════════════════════════════════════ */
function OrdersView({ t, fmt, orders, delOrder, updateStatus, setPreviewDoc, setModal, setEditObj, loadEditOrder, askConfirm, isAdmin }) {
  const [q, setQ] = useState("");
  const [sf, setSf] = useState("all");

  const filtered = orders.filter(o => {
    const snap = o.client_snapshot || {};
    const mq = !q || match({ num: o.order_number, client: snap.name || "", sp: o.salesperson_name || "" }, q);
    return mq && (sf === "all" || o.status === sf);
  });

  const filters = ["all", "ordered", "delivered", "paid", "cancelled"];

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "14px" }}>
      {/* Search */}
      <input value={q} onChange={e => setQ(e.target.value)} placeholder={t.search}
        style={{ ...inputBase, marginBottom: "10px" }} />
      {/* Status filters */}
      <div style={{ display: "flex", gap: "5px", overflowX: "auto", paddingBottom: "10px" }}>
        {filters.map(s => {
          const active = sf === s;
          const color = s === "all" ? C.accent : STATUS[s]?.color || C.muted;
          return (
            <button key={s} onClick={() => setSf(s)}
              style={{ padding: "5px 13px", borderRadius: "20px", border: "none", whiteSpace: "nowrap",
                fontWeight: "600", fontSize: "12px", cursor: "pointer", transition: "all .15s",
                background: active ? color : C.surface,
                color: active ? (s === "all" ? "#fff" : "#fff") : C.muted,
                border: `1px solid ${active ? color : C.border}` }}>
              {s === "all" ? t.all : t[s]}
            </button>
          );
        })}
      </div>

      {/* Orders list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {filtered.map(o => {
          const snap = o.client_snapshot || {};
          const st = STATUS[o.status] || STATUS.ordered;
          const docFmt = mkFmt(o.currency_symbol || "$", o.currency_position || "before");
          return (
            <Card key={o.id} pad={13} style={{ borderLeft: `3px solid ${st.color}` }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "3px" }}>
                    <span style={{ fontWeight: "700", fontSize: "14px" }}>{o.order_number}</span>
                    <Badge color={o.type === "invoice" ? C.success : C.info}>{o.type}</Badge>
                    <Badge color={st.color} bg={st.bg}>{t[o.status] || o.status}</Badge>
                    {o.due_date && <DueBadge dueDate={o.due_date} t={t} />}
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: "500", marginBottom: "2px" }}>{snap.name}</div>
                  <div style={{ fontSize: "11px", color: C.muted }}>{fmtDate(o.created_at)}{o.salesperson_name ? ` · ${o.salesperson_name}` : ""}</div>
                </div>
                <div style={{ fontWeight: "700", fontSize: "15px", flexShrink: 0 }}>{docFmt(o.total)}</div>
              </div>
              <Divider my={10} />
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                <Btn size="sm" variant="soft" onClick={() => { setPreviewDoc(o); setModal("invoice"); }}>View</Btn>
                <Btn size="sm" variant="ghost" onClick={() => loadEditOrder(o)}>{t.edit}</Btn>
                <Btn size="sm" variant="ghost" onClick={() => { setEditObj(o); setModal("status"); }}>{t.status}</Btn>
                {isAdmin && <Btn size="sm" variant="ghost" onClick={() => askConfirm(t.confirmDelete, () => delOrder(o.id))} style={{ color: C.danger, marginLeft: "auto" }}>✕</Btn>}
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", color: C.muted, padding: "60px 20px", fontSize: "14px" }}>{t.noOrders}</div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ORDER BUILDER (inside sheet)
═══════════════════════════════════════════════════════════ */
function OrderBuilder({ t, fmt, settings, clients, products, categories, team, cart, setQty, cartItems, subtotal, discount, setDiscount, total, taxLines, discountAmt, taxTotal, cartCount, selClient, setSelClient, activeCat, setActiveCat, searchQ, setSearchQ, notes, setNotes, selSp, setSelSp, useTax, setUseTax, payType, setPayType, creditDays, setCreditDays, finalizeOrder, clearOrder, editingId, salesperson, setModal, setEditObj }) {
  const allCats = ["All", ...categories];
  const filtered = products.filter(p =>
    (activeCat === "All" || p.category === activeCat) && match(p, searchQ)
  );
  const [lightbox, setLb] = useState(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {lightbox && <Lightbox url={lightbox} onClose={() => setLb(null)} />}

      {/* Client */}
      {selClient ? (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", background: C.accentSoft, borderRadius: "10px", padding: "10px 13px" }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: C.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", fontSize: "13px", flexShrink: 0 }}>{selClient.name?.[0]}</div>
          <div style={{ flex: 1 }}><div style={{ fontWeight: "600", fontSize: "14px" }}>{selClient.name}</div></div>
          <Btn size="sm" variant="ghost" onClick={() => setSelClient(null)}>{t.change}</Btn>
        </div>
      ) : (
        <Btn full variant="soft" onClick={() => setModal("clientPick")}>👤 {t.selectClient}</Btn>
      )}

      {/* Payment type */}
      <div style={{ display: "flex", gap: "8px" }}>
        {["cash", "credit"].map(pt => (
          <button key={pt} onClick={() => setPayType(pt)}
            style={{ flex: 1, padding: "10px", borderRadius: "9px", fontFamily: "inherit", fontWeight: "600",
              fontSize: "13px", cursor: "pointer", border: `1.5px solid ${payType === pt ? C.accent : C.border}`,
              background: payType === pt ? C.accentSoft : C.bg, color: payType === pt ? C.accent : C.muted }}>
            {pt === "cash" ? `💵 ${t.cash}` : `📅 ${t.credit}`}
          </button>
        ))}
      </div>
      {payType === "credit" && (
        <div>
          <div style={{ fontSize: "11px", fontWeight: "600", color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>{t.creditDays}</div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {[15, 30, 45, 60].map(d => (
              <button key={d} onClick={() => setCreditDays(d)}
                style={{ padding: "6px 14px", borderRadius: "8px", border: `1.5px solid ${creditDays === d ? C.accent : C.border}`, background: creditDays === d ? C.accentSoft : C.bg, color: creditDays === d ? C.accent : C.muted, fontFamily: "inherit", fontWeight: "600", fontSize: "13px", cursor: "pointer" }}>{d}d</button>
            ))}
            <input type="number" placeholder={t.customDays} value={![15,30,45,60].includes(creditDays) ? creditDays : ""}
              onChange={e => setCreditDays(parseInt(e.target.value) || 30)}
              style={{ ...inputBase, width: "110px", padding: "6px 10px", fontSize: "13px" }} />
          </div>
          {creditDays > 0 && (
            <div style={{ fontSize: "12px", color: C.info, marginTop: "6px" }}>
              {t.dueDate}: <b>{fmtDate(addDays(creditDays))}</b>
            </div>
          )}
        </div>
      )}

      {/* Salesperson */}
      {team.length > 0 && (
        <Sel label={t.salesperson} value={selSp} onChange={setSelSp}
          options={[{ value: "", label: t.selectSp }, ...team.map(s => ({ value: s.id, label: s.name }))]} />
      )}

      {/* Category filter */}
      <div style={{ display: "flex", gap: "5px", overflowX: "auto" }}>
        {allCats.map(c => (
          <button key={c} onClick={() => setActiveCat(c)}
            style={{ padding: "5px 12px", borderRadius: "20px", border: "none", cursor: "pointer",
              fontWeight: "500", fontSize: "12px", whiteSpace: "nowrap",
              background: activeCat === c ? C.accent : C.accentSoft,
              color: activeCat === c ? "#fff" : C.muted }}>
            {c}
          </button>
        ))}
      </div>

      {/* Search */}
      <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder={`🔍 ${t.searchProducts}`}
        style={inputBase} />

      {/* Product grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "8px" }}>
        {filtered.map(p => {
          const qty = cart[p.id] || 0;
          return (
            <div key={p.id} style={{ background: qty > 0 ? C.accentSoft : C.bg,
                border: `1.5px solid ${qty > 0 ? C.accent : C.border}`, borderRadius: "10px",
                padding: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
              {p.image_url && (
                <div onClick={() => setLb(p.image_url)} style={{ cursor: "zoom-in" }}>
                  <img src={p.image_url} style={{ width: "100%", height: "70px", objectFit: "cover", borderRadius: "7px" }} />
                </div>
              )}
              <div style={{ fontSize: "10px", color: C.muted, textTransform: "uppercase" }}>{p.category}</div>
              <div style={{ fontWeight: "600", fontSize: "13px", lineHeight: "1.3" }}>{p.name}</div>
              <div style={{ fontWeight: "700", fontSize: "13px" }}>{fmt(p.price)}<span style={{ color: C.muted, fontWeight: "400", fontSize: "11px" }}> /{p.unit}</span></div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <button onClick={() => setQty(p.id, qty - 1)} style={{ width: 26, height: 26, borderRadius: "7px", border: "none", background: qty > 0 ? C.border : C.bg, color: qty > 0 ? C.accent : C.mutedLight, fontSize: "17px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700" }}>−</button>
                <QtyInput value={qty} onChange={v => setQty(p.id, v)} />
                <button onClick={() => setQty(p.id, qty + 1)} style={{ width: 26, height: 26, borderRadius: "7px", border: "none", background: C.accentSoft, color: C.accent, fontSize: "17px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700" }}>+</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cart summary */}
      {cartItems.length > 0 && (
        <Card style={{ background: C.bg }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px", marginBottom: "10px" }}>
            {cartItems.map(i => (
              <div key={i.id} style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: C.muted }}>{i.name} ×{i.qty}</span>
                <span style={{ fontWeight: "600" }}>{fmt(i.price * i.qty)}</span>
              </div>
            ))}
            <Divider my={6} />
            <div style={{ display: "flex", justifyContent: "space-between", color: C.muted }}><span>{t.subtotal}</span><span>{fmt(subtotal)}</span></div>
            {discount > 0 && <div style={{ display: "flex", justifyContent: "space-between", color: C.danger }}><span>−{discount}%</span><span>−{fmt(discountAmt)}</span></div>}
            {taxLines.map(tx => <div key={tx.id} style={{ display: "flex", justifyContent: "space-between", color: C.muted }}><span>{tx.name} {tx.rate}%</span><span>+{fmt(tx.amt)}</span></div>)}
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "700", fontSize: "16px" }}><span>{t.total}</span><span>{fmt(total)}</span></div>
          </div>
        </Card>
      )}

      {/* Options row */}
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button onClick={() => setUseTax(v => !v)} style={{ width: 34, height: 18, borderRadius: "9px", border: "none", background: useTax ? C.accent : C.border, cursor: "pointer", position: "relative" }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: useTax ? 19 : 3, transition: "left .2s" }} />
          </button>
          <span style={{ fontSize: "12px", color: C.muted }}>{useTax ? t.withTax : t.withoutTax}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "auto" }}>
          <span style={{ fontSize: "12px", color: C.muted }}>{t.discount}</span>
          <input type="number" min="0" max="100" value={discount} onChange={e => setDiscount(+e.target.value)}
            style={{ ...inputBase, width: "64px", padding: "6px 8px", fontSize: "13px", textAlign: "center" }} />
        </div>
      </div>

      <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder={t.notes} rows={2}
        style={{ ...inputBase, resize: "vertical", fontSize: "13px" }} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        <Btn onClick={() => finalizeOrder("quotation")} disabled={!selClient || cartItems.length === 0} variant="outline" full>📄 {t.quotation}</Btn>
        <Btn onClick={() => finalizeOrder("invoice")} disabled={!selClient || cartItems.length === 0} variant="primary" full>🧾 {t.invoice}</Btn>
      </div>
      {editingId && <Btn variant="ghost" full onClick={clearOrder}>{t.cancel}</Btn>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CLIENTS VIEW
═══════════════════════════════════════════════════════════ */
function ClientsView({ t, fmt, clients, orders, saveClient, delClient, setModal, setEditObj, askConfirm, showToast, setLightbox }) {
  const [q, setQ] = useState("");
  const filtered = clients.filter(c => match(c, q));

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "14px" }}>
      <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={t.searchClients} style={{ ...inputBase, flex: 1 }} />
        <Btn onClick={() => { setEditObj(null); setModal("client"); }}>+ {t.addClient}</Btn>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {filtered.map(c => {
          const co = orders.filter(o => o.client_id === c.id || o.client_snapshot?.id === c.id);
          const paidOrders = co.filter(o => o.status === "paid");
          const owedOrders = co.filter(o => o.status === "ordered" || o.status === "delivered");
          const collected = paidOrders.reduce((s, o) => s + o.total, 0);
          const owed = owedOrders.reduce((s, o) => s + o.total, 0);
          return (
            <Card key={c.id}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {c.image_url
                  ? <img src={c.image_url} onClick={() => setLightbox(c.image_url)} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", cursor: "zoom-in", flexShrink: 0 }} />
                  : <div style={{ width: 40, height: 40, borderRadius: "50%", background: C.accentSoft, color: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", fontSize: "15px", flexShrink: 0 }}>{c.name?.[0]}</div>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: "600", fontSize: "14px" }}>{c.name}</div>
                  <div style={{ fontSize: "12px", color: C.muted }}>{[c.email, c.phone].filter(Boolean).join(" · ")}</div>
                  <div style={{ display: "flex", gap: "8px", marginTop: "5px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "12px" }}><span style={{ color: C.success, fontWeight: "600" }}>{fmt(collected)}</span> <span style={{ color: C.muted }}>{t.collected}</span></span>
                    {owed > 0 && <span style={{ fontSize: "12px" }}><span style={{ color: C.danger, fontWeight: "600" }}>{fmt(owed)}</span> <span style={{ color: C.muted }}>{t.owed}</span></span>}
                  </div>
                </div>
              </div>
              <Divider my={10} />
              <div style={{ display: "flex", gap: "6px" }}>
                <Btn size="sm" variant="soft" onClick={() => { setEditObj(c); setModal("clientProfile"); }}>{t.viewProfile}</Btn>
                <Btn size="sm" variant="ghost" onClick={() => { setEditObj(c); setModal("client"); }}>{t.edit}</Btn>
                <Btn size="sm" variant="ghost" onClick={() => askConfirm(t.confirmDelete, () => delClient(c.id))} style={{ color: C.danger, marginLeft: "auto" }}>✕</Btn>
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && <div style={{ textAlign: "center", color: C.muted, padding: "60px 20px" }}>{t.noClients}</div>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PRODUCTS VIEW
═══════════════════════════════════════════════════════════ */
function ProductsView({ t, fmt, products, categories, saveProduct, delProduct, saveCat, delCat, renameCat, setModal, setEditObj, askConfirm, setLightbox }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const filtered = products.filter(p => (cat === "All" || p.category === cat) && match(p, q));

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "14px" }}>
      <div style={{ display: "flex", gap: "8px", marginBottom: "10px", flexWrap: "wrap" }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={t.searchProducts}
          style={{ ...inputBase, flex: 1, minWidth: "140px" }} />
        <Btn size="sm" variant="ghost" onClick={() => setModal("catMgr")}>🏷 Cats</Btn>
        <Btn onClick={() => { setEditObj(null); setModal("product"); }}>+</Btn>
      </div>
      <div style={{ display: "flex", gap: "5px", overflowX: "auto", marginBottom: "12px" }}>
        {["All", ...categories].map(c => (
          <button key={c} onClick={() => setCat(c)}
            style={{ padding: "5px 12px", borderRadius: "20px", border: "none", whiteSpace: "nowrap",
              fontWeight: "500", fontSize: "12px", cursor: "pointer",
              background: cat === c ? C.accent : C.accentSoft, color: cat === c ? "#fff" : C.muted }}>
            {c}
          </button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "8px" }}>
        {filtered.map(p => (
          <Card key={p.id} pad={12}>
            {p.image_url && (
              <div onClick={() => setLightbox(p.image_url)} style={{ marginBottom: "8px", cursor: "zoom-in" }}>
                <img src={p.image_url} style={{ width: "100%", height: "90px", objectFit: "cover", borderRadius: "8px" }} />
              </div>
            )}
            <div style={{ fontSize: "10px", color: C.muted, textTransform: "uppercase", marginBottom: "3px" }}>{p.category}</div>
            <div style={{ fontWeight: "600", fontSize: "13px", marginBottom: "4px" }}>{p.name}</div>
            <div style={{ fontWeight: "700", fontSize: "15px" }}>{fmt(p.price)}<span style={{ color: C.muted, fontWeight: "400", fontSize: "11px" }}> /{p.unit}</span></div>
            <div style={{ display: "flex", gap: "5px", marginTop: "10px" }}>
              <Btn size="sm" variant="ghost" onClick={() => { setEditObj(p); setModal("product"); }}>{t.edit}</Btn>
              <Btn size="sm" variant="ghost" onClick={() => askConfirm(t.confirmDelete, () => delProduct(p.id))} style={{ color: C.danger }}>✕</Btn>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && <div style={{ gridColumn: "1/-1", textAlign: "center", color: C.muted, padding: "60px 20px" }}>{t.noProducts}</div>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CLIENT PROFILE VIEW
═══════════════════════════════════════════════════════════ */
function ClientProfileView({ t, fmt, client, orders, loadEditOrder }) {
  const co = orders.filter(o => o.client_id === client.id || o.client_snapshot?.id === client.id);
  const paidOrders = co.filter(o => o.status === "paid");
  const owedOrders = co.filter(o => o.status === "ordered" || o.status === "delivered");
  const collected = paidOrders.reduce((s, o) => s + o.total, 0);
  const owed = owedOrders.reduce((s, o) => s + o.total, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        {client.image_url
          ? <img src={client.image_url} style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover" }} />
          : <div style={{ width: 52, height: 52, borderRadius: "50%", background: C.accentSoft, color: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", fontSize: "20px" }}>{client.name?.[0]}</div>}
        <div>
          <div style={{ fontWeight: "700", fontSize: "17px" }}>{client.name}</div>
          <div style={{ fontSize: "13px", color: C.muted }}>{client.email}</div>
          {client.phone && <div style={{ fontSize: "13px", color: C.muted }}>{client.phone}</div>}
          {client.rnc && <div style={{ fontSize: "12px", color: C.muted }}>RNC: {client.rnc}</div>}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
        {[{ l: t.totalOrders, v: co.length, c: C.info }, { l: t.collected, v: fmt(collected), c: C.success }, { l: t.owed, v: fmt(owed), c: owed > 0 ? C.danger : C.muted }].map(s => (
          <div key={s.l} style={{ background: C.bg, borderRadius: "10px", padding: "12px", textAlign: "center" }}>
            <div style={{ fontSize: "18px", fontWeight: "700", color: s.c }}>{s.v}</div>
            <div style={{ fontSize: "11px", color: C.muted, marginTop: "2px" }}>{s.l}</div>
          </div>
        ))}
      </div>

      <Divider />
      <div style={{ fontWeight: "600", fontSize: "13px", color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{t.orders}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {co.map(o => {
          const st = STATUS[o.status] || STATUS.ordered;
          const docFmt = mkFmt(o.currency_symbol || "$", o.currency_position || "before");
          return (
            <div key={o.id} style={{ background: C.bg, borderRadius: "9px", padding: "10px 12px",
                display: "flex", alignItems: "center", gap: "8px", borderLeft: `3px solid ${st.color}` }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "600", fontSize: "13px" }}>{o.order_number} <Badge color={st.color} bg={st.bg}>{t[o.status]}</Badge>{o.due_date && <DueBadge dueDate={o.due_date} t={t} />}</div>
                <div style={{ fontSize: "11px", color: C.muted }}>{fmtDate(o.created_at)} · {(o.items || []).length} item(s)</div>
              </div>
              <div style={{ fontWeight: "700", fontSize: "13px" }}>{docFmt(o.total)}</div>
              <Btn size="sm" variant="soft" onClick={() => loadEditOrder(o)}>{t.edit}</Btn>
            </div>
          );
        })}
        {co.length === 0 && <div style={{ color: C.muted, fontSize: "13px", textAlign: "center", padding: "20px" }}>{t.noOrders}</div>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TEAM VIEW
═══════════════════════════════════════════════════════════ */
function TeamView({ t, team, savePerson, delPerson, setModal, setEditObj, askConfirm }) {
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <h2 style={{ fontSize: "17px", fontWeight: "700" }}>{t.team}</h2>
        <Btn onClick={() => { setEditObj(null); setModal("person"); }}>+ {t.addMember}</Btn>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {team.map(p => (
          <Card key={p.id}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: C.accentSoft, color: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", fontSize: "15px", flexShrink: 0 }}>{p.name?.[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "600", fontSize: "14px" }}>{p.name} {p.is_admin && <Badge color={C.warn}>Admin</Badge>}</div>
                <div style={{ fontSize: "12px", color: C.muted }}>{p.role}{p.email ? ` · ${p.email}` : ""}</div>
              </div>
              <Btn size="sm" variant="ghost" onClick={() => { setEditObj(p); setModal("person"); }}>{t.edit}</Btn>
              <Btn size="sm" variant="ghost" onClick={() => askConfirm(t.confirmDelete, () => delPerson(p.id))} style={{ color: C.danger }}>✕</Btn>
            </div>
          </Card>
        ))}
        {team.length === 0 && <div style={{ textAlign: "center", color: C.muted, padding: "60px 20px" }}>{t.noTeam}</div>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PROFILE VIEW
═══════════════════════════════════════════════════════════ */
function ProfileView({ t, profile, saveProfile, showToast }) {
  const [form, setForm] = useState(profile);
  useEffect(() => setForm(profile), [profile]);
  const f = k => v => setForm(p => ({ ...p, [k]: v }));
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "14px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "14px", maxWidth: "560px", margin: "0 auto" }}>
        <Card>
          <div style={{ fontWeight: "600", fontSize: "13px", color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "14px" }}>🏢 {t.businessProfile}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <Inp label={t.businessName} value={form.business_name || ""} onChange={f("business_name")} />
            <Inp label={t.rnc} value={form.rnc || ""} onChange={f("rnc")} placeholder="101-12345-6" />
            <PhoneInp label={t.bPhone} value={form.phone || ""} onChange={f("phone")} />
            <Inp label={t.bEmail} value={form.email || ""} onChange={f("email")} />
            <Inp label={t.bAddress} value={form.address || ""} onChange={f("address")} />
          </div>
        </Card>
        <Card>
          <div style={{ fontWeight: "600", fontSize: "13px", color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "12px" }}>Logo</div>
          <ImageUploader url={form.logo} size={72}
            onUpload={url => setForm(p => ({ ...p, logo: url }))}
            onRemove={() => setForm(p => ({ ...p, logo: "" }))}
            label={t.uploadLogo} />
          <div style={{ fontSize: "11px", color: C.muted, marginTop: "8px" }}>{t.logoHint}</div>
        </Card>
        <Btn onClick={() => saveProfile(form)} full size="lg">{t.saveProfile}</Btn>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SETTINGS VIEW
═══════════════════════════════════════════════════════════ */
function SettingsView({ t, settings, saveSettings, isAdmin, showToast }) {
  const [s, setS] = useState(settings);
  useEffect(() => setS(settings), [settings]);
  const upd = (k, v) => setS(p => ({ ...p, [k]: v }));
  const addTax = () => setS(p => ({ ...p, taxes: [...(p.taxes || []), { id: uid(), name: "Tax", rate: 0 }] }));
  const removeTax = id => setS(p => ({ ...p, taxes: p.taxes.filter(x => x.id !== id) }));
  const updTax = (id, k, v) => setS(p => ({ ...p, taxes: p.taxes.map(x => x.id === id ? { ...x, [k]: v } : x) }));

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "14px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "14px", maxWidth: "520px", margin: "0 auto" }}>
        <Card>
          <div style={{ fontWeight: "600", fontSize: "12px", color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "12px" }}>🌐 {t.language}</div>
          <div style={{ display: "flex", gap: "8px" }}>
            {[{ v: "en", l: "English 🇬🇧" }, { v: "es", l: "Español 🇩🇴" }].map(lng => (
              <button key={lng.v} onClick={() => upd("lang", lng.v)}
                style={{ flex: 1, padding: "10px", borderRadius: "8px", fontFamily: "inherit",
                  fontWeight: "600", fontSize: "13px", cursor: "pointer",
                  border: `1.5px solid ${s.lang === lng.v ? C.accent : C.border}`,
                  background: s.lang === lng.v ? C.accentSoft : C.bg,
                  color: s.lang === lng.v ? C.accent : C.muted }}>{lng.l}</button>
            ))}
          </div>
        </Card>
        <Card>
          <div style={{ fontWeight: "600", fontSize: "12px", color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "12px" }}>💱 {t.currency}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <Inp label={t.currSymbol} value={s.currencySymbol} onChange={v => upd("currencySymbol", v)} sm />
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              <div style={{ fontSize: "11px", fontWeight: "600", color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{t.currPos}</div>
              <div style={{ display: "flex", gap: "6px" }}>
                {[{ v: "before", l: `${s.currencySymbol || "RD$"}100` }, { v: "after", l: `100${s.currencySymbol || "RD$"}` }].map(pos => (
                  <button key={pos.v} onClick={() => upd("currencyPosition", pos.v)}
                    style={{ flex: 1, padding: "8px 4px", borderRadius: "8px", fontFamily: "inherit",
                      fontWeight: "600", fontSize: "12px", cursor: "pointer",
                      border: `1.5px solid ${s.currencyPosition === pos.v ? C.accent : C.border}`,
                      background: s.currencyPosition === pos.v ? C.accentSoft : C.bg,
                      color: s.currencyPosition === pos.v ? C.accent : C.muted }}>{pos.l}</button>
                ))}
              </div>
            </div>
          </div>
        </Card>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div style={{ fontWeight: "600", fontSize: "12px", color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>🧾 {t.taxes}</div>
            <Btn size="sm" variant="soft" onClick={addTax}>{t.addTax}</Btn>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {(s.taxes || []).map(tx => (
              <div key={tx.id} style={{ display: "grid", gridTemplateColumns: "1fr 80px auto", gap: "8px", alignItems: "flex-end" }}>
                <Inp value={tx.name} onChange={v => updTax(tx.id, "name", v)} sm />
                <Inp type="number" value={tx.rate} onChange={v => updTax(tx.id, "rate", parseFloat(v) || 0)} sm />
                <button onClick={() => removeTax(tx.id)} style={{ background: "none", border: "none", color: C.danger, fontSize: "18px", cursor: "pointer", paddingBottom: "2px" }}>✕</button>
              </div>
            ))}
            {!(s.taxes || []).length && <div style={{ color: C.muted, fontSize: "12px", textAlign: "center" }}>No taxes configured.</div>}
          </div>
        </Card>
        {isAdmin && (
          <Card>
            <div style={{ fontWeight: "600", fontSize: "12px", color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "12px" }}>📋 {t.orderNum}</div>
            <SequencePicker t={t} showToast={showToast} onClose={() => {}} inline />
          </Card>
        )}
        <Btn onClick={() => saveSettings(s)} full size="lg">{t.save}</Btn>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   FORM COMPONENTS
═══════════════════════════════════════════════════════════ */
function ClientForm({ t, client, onSave }) {
  const [f, setF] = useState({ name: "", email: "", phone: "", address: "", rnc: "", image_url: "", ...client });
  const u = k => v => setF(p => ({ ...p, [k]: v }));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <ImageUploader url={f.image_url} onUpload={url => setF(p => ({ ...p, image_url: url }))} onRemove={() => setF(p => ({ ...p, image_url: "" }))} label={t.clientImage} />
      <Inp label={t.name} value={f.name} onChange={u("name")} required />
      <Inp label={t.email2} type="email" value={f.email} onChange={u("email")} />
      <PhoneInp label={t.phone} value={f.phone} onChange={u("phone")} />
      <Inp label={t.address} value={f.address} onChange={u("address")} />
      <Inp label={t.rnc} value={f.rnc} onChange={u("rnc")} placeholder="Optional" />
      <Btn onClick={() => f.name && onSave(f)} full size="lg">{t.save}</Btn>
    </div>
  );
}

function ProductForm({ t, product, categories, onSave }) {
  const [f, setF] = useState({ name: "", category: categories[0] || "", price: "", unit: "unit", image_url: "", ...product, price: product?.price?.toString() || "" });
  const [nc, setNc] = useState("");
  const u = k => v => setF(p => ({ ...p, [k]: v }));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <ImageUploader url={f.image_url} onUpload={url => setF(p => ({ ...p, image_url: url }))} onRemove={() => setF(p => ({ ...p, image_url: "" }))} label={t.productImage} />
      <Inp label={t.name} value={f.name} onChange={u("name")} required />
      <Sel label={t.category} value={f.category} onChange={u("category")} options={categories.length ? categories : ["General"]} />
      <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}><Inp label={t.newCat} value={nc} onChange={setNc} placeholder="e.g. Accessories" /></div>
        <Btn size="sm" variant="soft" onClick={() => nc.trim() && setF(p => ({ ...p, category: nc.trim() }))}>{t.add}</Btn>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <Inp label={t.price} type="number" value={f.price} onChange={u("price")} required />
        <Inp label={t.unit} value={f.unit} onChange={u("unit")} placeholder="bottle, kg…" />
      </div>
      <Btn onClick={() => f.name && f.price && onSave({ ...f, price: parseFloat(f.price) })} full size="lg">{t.save}</Btn>
    </div>
  );
}

function PersonForm({ t, person, onSave }) {
  const [f, setF] = useState({ name: "", role: "", email: "", phone: "", is_admin: false, ...person });
  const u = k => v => setF(p => ({ ...p, [k]: v }));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <Inp label={t.spName} value={f.name} onChange={u("name")} required />
      <Inp label={t.role} value={f.role} onChange={u("role")} placeholder="Sales Rep, Manager…" />
      <Inp label={t.email2} value={f.email} onChange={u("email")} />
      <PhoneInp label={t.phone} value={f.phone} onChange={u("phone")} />
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <button onClick={() => u("is_admin")(!f.is_admin)}
          style={{ width: 36, height: 20, borderRadius: "10px", border: "none",
            background: f.is_admin ? C.accent : C.border, cursor: "pointer", position: "relative" }}>
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff",
            position: "absolute", top: 3, left: f.is_admin ? 19 : 3, transition: "left .2s" }} />
        </button>
        <span style={{ fontSize: "13px", color: C.muted }}>Admin access</span>
      </div>
      <Btn onClick={() => f.name && onSave(f)} full size="lg">{t.save}</Btn>
    </div>
  );
}

function ClientPickModal({ t, clients, onPick, onNew }) {
  const [q, setQ] = useState("");
  const filtered = clients.filter(c => match(c, q));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder={t.searchClients} style={inputBase} />
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {filtered.map(c => (
          <button key={c.id} onClick={() => onPick(c)}
            style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: "10px",
              padding: "11px 13px", cursor: "pointer", textAlign: "left",
              display: "flex", alignItems: "center", gap: "10px" }}>
            {c.image_url
              ? <img src={c.image_url} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
              : <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.accentSoft, color: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", fontSize: "13px", flexShrink: 0 }}>{c.name?.[0]}</div>}
            <div>
              <div style={{ fontWeight: "600", fontSize: "13px" }}>{c.name}</div>
              <div style={{ fontSize: "11px", color: C.muted }}>{c.email}</div>
            </div>
          </button>
        ))}
      </div>
      <Btn variant="ghost" onClick={onNew} full>+ {t.addClient}</Btn>
    </div>
  );
}

function StatusPicker({ t, current, onPick }) {
  const statuses = ["ordered", "delivered", "paid", "cancelled"];
  const icons = { ordered: "📦", delivered: "🚚", paid: "✅", cancelled: "✕" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
      {statuses.map(s => {
        const st = STATUS[s];
        return (
          <button key={s} onClick={() => onPick(s)}
            style={{ padding: "13px 15px", borderRadius: "10px", fontFamily: "inherit",
              fontWeight: "600", fontSize: "14px", cursor: "pointer", textAlign: "left",
              display: "flex", alignItems: "center", gap: "10px",
              border: `1.5px solid ${current === s ? st.color : C.border}`,
              background: current === s ? st.bg : C.bg,
              color: current === s ? st.color : C.muted }}>
            <span>{icons[s]}</span>
            <span style={{ textTransform: "capitalize" }}>{t[s]}</span>
            {current === s && <span style={{ marginLeft: "auto" }}>✓</span>}
          </button>
        );
      })}
    </div>
  );
}

function CatManager({ t, categories, products, saveCat, delCat, renameCat, askConfirm }) {
  const [nc, setNc] = useState("");
  const [editing, setEditing] = useState(null);
  const [ev, setEv] = useState("");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div style={{ display: "flex", gap: "8px" }}>
        <input value={nc} onChange={e => setNc(e.target.value)} placeholder="New category…" style={{ ...inputBase, flex: 1 }} />
        <Btn size="sm" variant="soft" onClick={() => { if (nc.trim()) { saveCat(nc.trim()); setNc(""); } }}>{t.add}</Btn>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {categories.map(cat => (
          <div key={cat} style={{ background: C.bg, borderRadius: "9px", padding: "10px 12px", display: "flex", alignItems: "center", gap: "8px" }}>
            {editing === cat
              ? <input value={ev} onChange={e => setEv(e.target.value)} autoFocus style={{ ...inputBase, flex: 1, padding: "6px 10px" }} />
              : <span style={{ flex: 1, fontWeight: "500", fontSize: "13px" }}>{cat}</span>}
            <Badge color={C.muted}>{products.filter(p => p.category === cat).length}</Badge>
            {editing === cat
              ? <>
                <Btn size="sm" variant="soft" onClick={() => { if (ev.trim() && ev !== cat) renameCat(cat, ev.trim()); setEditing(null); }}>Save</Btn>
                <Btn size="sm" variant="ghost" onClick={() => setEditing(null)}>✕</Btn>
              </>
              : <>
                <Btn size="sm" variant="ghost" onClick={() => { setEditing(cat); setEv(cat); }}>{t.edit}</Btn>
                <Btn size="sm" variant="ghost" onClick={() => askConfirm(`Delete "${cat}"?`, () => delCat(cat))} style={{ color: C.danger }}>✕</Btn>
              </>}
          </div>
        ))}
      </div>
    </div>
  );
}

function SequencePicker({ t, showToast, onClose, inline }) {
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
    if (!inline) onClose();
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div style={{ fontSize: "13px", color: C.muted, lineHeight: "1.5" }}>
        The next order created will use this number. The system increments automatically from there.
      </div>
      {loading ? <div style={{ color: C.muted, fontSize: "13px" }}>{t.loading}</div>
        : <Inp label={t.orderNum} value={val} onChange={setVal} type="number" />}
      <Btn onClick={save} full>{t.save}</Btn>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   INVOICE PREVIEW
═══════════════════════════════════════════════════════════ */
function InvoicePreview({ t, doc, fmt, profile, onClose }) {
  const snap = doc.client_snapshot || {};
  const shareWA = () => {
    const items = (doc.items || []).map(i => `• ${i.name} ×${i.qty} — ${fmt(i.price * i.qty)}`).join("\n");
    const dueStr = doc.due_date ? fmtDate(doc.due_date) : null;
    window.open(`https://wa.me/?text=${encodeURIComponent(t.waMsg(doc, items, fmt(doc.total), dueStr))}`, "_blank");
  };
  const printDoc = () => {
    const html = makePDF(doc, profile, fmt, t);
    const w = window.open("", "_blank");
    w.document.write(html); w.document.close();
    setTimeout(() => w.print(), 400);
  };
  const st = STATUS[doc.status] || STATUS.ordered;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Badges */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
        <Badge color={doc.type === "invoice" ? C.success : C.info}>{doc.type}</Badge>
        <Badge color={st.color} bg={st.bg}>{t[doc.status]}</Badge>
        {doc.payment_type && <Badge color={doc.payment_type === "credit" ? C.warn : C.info}>{doc.payment_type === "credit" ? t.credit : t.cash}</Badge>}
        {doc.salesperson_name && <Badge color={C.muted}>{doc.salesperson_name}</Badge>}
        <span style={{ fontSize: "12px", color: C.muted, marginLeft: "auto" }}>{fmtDate(doc.created_at)}</span>
      </div>

      {/* Due date */}
      {doc.due_date && (
        <div style={{ background: C.warnSoft, borderRadius: "9px", padding: "10px 13px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "13px", color: C.warn, fontWeight: "500" }}>{t.dueDate}: <b>{fmtDate(doc.due_date)}</b></span>
          <DueBadge dueDate={doc.due_date} t={t} />
        </div>
      )}

      {/* Business */}
      {(profile?.business_name || profile?.logo) && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", background: C.bg, borderRadius: "9px", padding: "10px 12px" }}>
          {profile.logo && <img src={profile.logo} style={{ height: "26px", maxWidth: "80px", objectFit: "contain" }} />}
          <div>
            {profile.business_name && <div style={{ fontWeight: "600", fontSize: "13px" }}>{profile.business_name}</div>}
            {profile.rnc && <div style={{ fontSize: "11px", color: C.muted }}>RNC: {profile.rnc}</div>}
          </div>
        </div>
      )}

      {/* Client */}
      <div style={{ background: C.bg, borderRadius: "9px", padding: "10px 12px" }}>
        <div style={{ fontWeight: "600", fontSize: "14px", marginBottom: "2px" }}>{snap.name}</div>
        {snap.rnc && <div style={{ fontSize: "12px", color: C.muted }}>RNC: {snap.rnc}</div>}
        {snap.email && <div style={{ fontSize: "12px", color: C.muted }}>{snap.email}</div>}
        {snap.phone && <div style={{ fontSize: "12px", color: C.muted }}>{snap.phone}</div>}
      </div>

      <Divider />

      {/* Items */}
      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
        {(doc.items || []).map((i, idx) => (
          <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", padding: "5px 0", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ flex: 1, color: C.text }}>{i.name} <span style={{ color: C.muted }}>×{i.qty}</span></span>
            <span style={{ fontWeight: "600" }}>{fmt(i.price * i.qty)}</span>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", color: C.muted }}><span>{t.subtotal}</span><span>{fmt(doc.subtotal)}</span></div>
        {doc.discount > 0 && <div style={{ display: "flex", justifyContent: "space-between", color: C.danger }}><span>−{doc.discount}%</span><span>−{fmt(doc.discount_amt)}</span></div>}
        {(doc.tax_lines || []).filter(tx => tx.rate > 0).map(tx => (
          <div key={tx.id} style={{ display: "flex", justifyContent: "space-between", color: C.muted }}><span>{tx.name} {tx.rate}%</span><span>+{fmt(tx.amt)}</span></div>
        ))}
        <Divider my={4} />
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "700", fontSize: "17px" }}><span>{t.total}</span><span>{fmt(doc.total)}</span></div>
      </div>

      {doc.notes && <div style={{ background: C.bg, borderRadius: "8px", padding: "9px 12px", fontSize: "12px", color: C.muted }}>{doc.notes}</div>}

      {/* Actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        <Btn onClick={printDoc} full variant="soft">🖨 {t.print}</Btn>
        <Btn onClick={shareWA} full variant="success">💬 {t.shareWA}</Btn>
      </div>
    </div>
  );
}
