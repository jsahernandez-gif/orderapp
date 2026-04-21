import { useState, useEffect, useRef, useCallback } from "react";

/* ════════════════════════════════════════════════════════════
   SUPABASE
════════════════════════════════════════════════════════════ */
const SUPA_URL = "https://gptrtvsigrkpporzhomv.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwdHJ0dnNpZ3JrcHBvcnpob212Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0ODc4NzksImV4cCI6MjA5MjA2Mzg3OX0.X43NfdKRx2vgKwpEyFUAqGs3i0W-fydfMolEhPVKt3w";
const SESSION_KEY = "sb_session";
const tok = () => window.__sb_token || SUPA_KEY;
const H = (x = {}) => ({ "Content-Type": "application/json", apikey: SUPA_KEY, Authorization: `Bearer ${tok()}`, ...x });
const getStoredSession = () => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const persistSession = (session) => {
  if (!session?.access_token || !session?.refresh_token) return;
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  }));
};
const clearStoredSession = () => localStorage.removeItem(SESSION_KEY);
const apiJson = async (path, { method = "GET", body, headers = {} } = {}) => {
  const r = await fetch(path, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(window.__sb_token ? { Authorization: `Bearer ${window.__sb_token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || data.message || "Request failed");
  return data;
};

const sb = {
  auth: {
    signIn: async (identifier, pw) => {
      return apiJson("/api/auth/login", { method: "POST", body: { identifier, password: pw } });
    },
    refresh: async (refreshToken = window.__sb_refresh_token) => {
      if (!refreshToken) return null;
      const r = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPA_KEY },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      const data = await r.json().catch(() => null);
      return r.ok ? data : null;
    },
    setSession: (session) => {
      window.__sb_token = session?.access_token || null;
      window.__sb_refresh_token = session?.refresh_token || null;
      if (session?.access_token && session?.refresh_token) persistSession(session);
      else clearStoredSession();
    },
    clearSession: () => {
      window.__sb_token = null;
      window.__sb_refresh_token = null;
      clearStoredSession();
    },
    signOut: async () => {
      await fetch(`${SUPA_URL}/auth/v1/logout`, { method: "POST", headers: H() });
      sb.auth.clearSession();
    },
    me: async () => {
      if (!window.__sb_token) return null;
      const r = await fetch(`${SUPA_URL}/auth/v1/user`, { headers: H() });
      return r.ok ? r.json() : null;
    },
  },
  q: (table) => ({
    select: async (cols = "*", opts = {}) => {
      let u = `${SUPA_URL}/rest/v1/${table}?select=${cols}`;
      if (opts.eq) Object.entries(opts.eq).forEach(([k, v]) => { u += `&${k}=eq.${encodeURIComponent(v)}`; });
      if (opts.order) u += `&order=${opts.order}`;
      if (opts.limit) u += `&limit=${opts.limit}`;
      const r = await fetch(u, { headers: H({ Prefer: "return=representation" }) });
      return r.ok ? r.json() : [];
    },
    insert: async (d) => {
      const r = await fetch(`${SUPA_URL}/rest/v1/${table}`, { method: "POST", headers: H({ Prefer: "return=representation" }), body: JSON.stringify(Array.isArray(d) ? d : [d]) });
      const j = await r.json(); return Array.isArray(j) ? j[0] : j;
    },
    update: async (d, opts = {}) => {
      let u = `${SUPA_URL}/rest/v1/${table}?`;
      if (opts.eq) Object.entries(opts.eq).forEach(([k, v]) => { u += `${k}=eq.${encodeURIComponent(v)}&`; });
      const r = await fetch(u, { method: "PATCH", headers: H({ Prefer: "return=representation" }), body: JSON.stringify(d) });
      return r.json();
    },
    upsert: async (d) => {
      const r = await fetch(`${SUPA_URL}/rest/v1/${table}`, { method: "POST", headers: H({ Prefer: "resolution=merge-duplicates,return=representation" }), body: JSON.stringify(Array.isArray(d) ? d : [d]) });
      return r.json();
    },
    delete: async (opts = {}) => {
      let u = `${SUPA_URL}/rest/v1/${table}?`;
      if (opts.eq) Object.entries(opts.eq).forEach(([k, v]) => { u += `${k}=eq.${encodeURIComponent(v)}&`; });
      await fetch(u, { method: "DELETE", headers: H() });
    },
    rpc: async (fn, params = {}) => {
      const r = await fetch(`${SUPA_URL}/rest/v1/rpc/${fn}`, { method: "POST", headers: H(), body: JSON.stringify(params) });
      if (!r.ok) { const e = await r.json(); throw new Error(e.message || "RPC error"); }
      return r.json();
    },
  }),
  storage: {
    upload: async (bucket, path, file) => {
      const r = await fetch(`${SUPA_URL}/storage/v1/object/${bucket}/${path}`, { method: "POST", headers: { apikey: SUPA_KEY, Authorization: `Bearer ${tok()}` }, body: file });
      return r.json();
    },
    url: (bucket, path) => `${SUPA_URL}/storage/v1/object/public/${bucket}/${path}`,
  },
};

/* ════════════════════════════════════════════════════════════
   TRANSLATIONS
════════════════════════════════════════════════════════════ */
const T = {
  en: {
    appName: "OrderApp",
    login:"Sign In", logout:"Sign Out", email:"Email", password:"Password", loginId:"Email or phone", setPassword:"Password", newPassword:"New Password", loginErr:"Invalid credentials.", loading:"Loading…",
    signInHint:"Use your email or phone number to continue.",
    orders:"Orders", newOrder:"New Order", clients:"Clients", products:"Products",
    team:"Team", settings:"Settings", more:"More", companies:"Companies",
    openOrders:"Open Orders", finalizeOrder:"Finalize → Invoice",
    orderOpen:"Open", orderFinalized:"Finalized",
    openOrderNote:"This order is open. Edit freely before finalizing.",
    finalizeConfirm:"Convert this open order into an invoice?",
    finalizeBtn:"Yes, Finalize",
    adjustQty:"Adjust quantities before finalizing",
    noOpenOrders:"No open orders.",
    createOpenOrder:"Create Open Order",
    selectClient:"Select Client", searchProducts:"Search…", all:"All",
    cart:"Cart", clear:"Clear", discount:"Discount %", notes:"Notes…",
    subtotal:"Subtotal", total:"Total", quotation:"Quotation", invoice:"Invoice",
    change:"Change", noItems:"Add products to start.", salesperson:"Salesperson",
    selectSp:"Assign salesperson", paymentType:"Payment", cash:"Cash", credit:"Credit",
    creditDays:"Credit Days", customDays:"Custom", dueDate:"Due Date",
    overdue:"OVERDUE",
    addClient:"Add Client", searchClients:"Search clients…", edit:"Edit", delete:"Delete",
    noClients:"No clients yet.", viewProfile:"Profile", clientProfile:"Client Profile",
    totalOrders:"Orders", collected:"Collected", owed:"Owed",
    addProduct:"Add Product", noProducts:"No products yet.",
    price:"Price", unit:"Unit", name:"Name", phone:"Phone", address:"Address",
    newCat:"New Category", add:"Add",
    noOrders:"No orders yet.", status:"Status",
    open:"Open", pending:"Pending", delivered:"Delivered", paid:"Paid", cancelled:"Cancelled",
    changeStatus:"Change Status", confirmDelete:"Delete permanently?", confirmBtn:"Delete",
    addMember:"Add Member", noTeam:"No team members yet.", spName:"Full Name", role:"Role",
    businessName:"Business Name", rnc:"RNC / Tax ID", bPhone:"Phone", bEmail:"Email", bAddress:"Address",
    uploadLogo:"Upload Logo", logoHint:"PNG or JPG · max 2MB", saveProfile:"Save", profileSaved:"Saved ✓",
    language:"Language", currency:"Currency", currSymbol:"Symbol", currPos:"Position",
    taxes:"Taxes", taxName:"Name", taxRate:"Rate %", addTax:"Add Tax",
    save:"Save", close:"Close", cancel:"Cancel", print:"Print / PDF", shareWA:"WhatsApp",
    date:"Date", billTo:"Bill To", withTax:"Tax", withoutTax:"No tax",
    orderNum:"Order #", setSequence:"Set Starting Number", sequenceSaved:"Sequence saved ✓",
    qty:"Qty", moreOptions:"More options", hideOptions:"Hide options",
    company:"Company", taxEnabled:"Fiscal (with tax)",
    ncfConfig:"NCF Configuration", ncfPrefix:"NCF Prefix", ncfSequence:"Current Sequence",
    ncfStart:"Start", ncfEnd:"End (0 = unlimited)", ncfNext:"Next NCF", ncfPadLength:"Padding digits",
    ncfSaved:"NCF saved ✓", ncfWarning:"⚠ NCF sequence nearing limit",
    ncfExhausted:"🚫 NCF sequence exhausted — update config",
    addCompany:"Add Company", editCompany:"Edit Company", noCompanies:"No companies.",
    fiscalInvoice:"Fiscal Invoice", commercialInvoice:"Commercial Invoice",
    ncf:"NCF", itbis:"ITBIS", baseAmount:"Taxable Amount",
    dgiiNote:"This document complies with DGII fiscal requirements.",
    permissions:"Permissions", permOrders:"Orders", permClients:"Clients",
    permProducts:"Products", permCompanies:"Companies", permTeam:"Team", permSettings:"Settings",
    adminOnly:"Admin only", search:"Search…", exitOrderConfirm:"Are you sure you want to exit this order? All unsaved changes will be lost.", exitOrder:"Exit Order",
    waMsg: (doc, items, total, due) =>
      `Hello ${doc.client_snapshot?.name},\n\nHere is your ${doc.type} *${doc.order_number}*${doc.ncf ? `\nNCF: ${doc.ncf}` : ""}\n\n${items}\n\n*Total: ${total}*${due ? `\nDue: ${due}` : ""}\n\nThank you!`,
  },
  es: {
    appName: "OrderApp",
    login:"Iniciar Sesión", logout:"Cerrar Sesión", email:"Correo", password:"Contraseña", loginId:"Correo o teléfono", setPassword:"Contraseña", newPassword:"Nueva Contraseña", loginErr:"Credenciales incorrectas.", loading:"Cargando…",
    signInHint:"Usa tu correo o teléfono para continuar.",
    orders:"Pedidos", newOrder:"Nuevo Pedido", clients:"Clientes", products:"Productos",
    team:"Equipo", settings:"Ajustes", more:"Más", companies:"Empresas",
    openOrders:"Pedidos Abiertos", finalizeOrder:"Finalizar → Factura",
    orderOpen:"Abierto", orderFinalized:"Finalizado",
    openOrderNote:"Este pedido está abierto. Edítalo libremente antes de finalizar.",
    finalizeConfirm:"¿Convertir este pedido abierto en una factura?",
    finalizeBtn:"Sí, Finalizar",
    adjustQty:"Ajustar cantidades antes de finalizar",
    noOpenOrders:"Sin pedidos abiertos.",
    createOpenOrder:"Crear Pedido Abierto",
    selectClient:"Seleccionar Cliente", searchProducts:"Buscar…", all:"Todos",
    cart:"Carrito", clear:"Limpiar", discount:"Descuento %", notes:"Notas…",
    subtotal:"Subtotal", total:"Total", quotation:"Cotización", invoice:"Factura",
    change:"Cambiar", noItems:"Agrega productos para comenzar.", salesperson:"Vendedor",
    selectSp:"Asignar vendedor", paymentType:"Pago", cash:"Contado", credit:"Crédito",
    creditDays:"Días de Crédito", customDays:"Personalizado", dueDate:"Fecha Límite",
    overdue:"VENCIDO",
    addClient:"Agregar Cliente", searchClients:"Buscar clientes…", edit:"Editar", delete:"Eliminar",
    noClients:"Sin clientes aún.", viewProfile:"Perfil", clientProfile:"Perfil del Cliente",
    totalOrders:"Pedidos", collected:"Cobrado", owed:"Pendiente",
    addProduct:"Agregar Producto", noProducts:"Sin productos aún.",
    price:"Precio", unit:"Unidad", name:"Nombre", phone:"Teléfono", address:"Dirección",
    newCat:"Nueva Categoría", add:"Agregar",
    noOrders:"Sin pedidos aún.", status:"Estado",
    open:"Abierto", pending:"Pendiente", delivered:"Entregado", paid:"Pagado", cancelled:"Cancelado",
    changeStatus:"Cambiar Estado", confirmDelete:"¿Eliminar permanentemente?", confirmBtn:"Eliminar",
    addMember:"Agregar Miembro", noTeam:"Sin miembros.", spName:"Nombre Completo", role:"Rol",
    businessName:"Nombre Empresa", rnc:"RNC / ID Fiscal", bPhone:"Teléfono", bEmail:"Correo", bAddress:"Dirección",
    uploadLogo:"Subir Logo", logoHint:"PNG o JPG · máx 2MB", saveProfile:"Guardar", profileSaved:"Guardado ✓",
    language:"Idioma", currency:"Moneda", currSymbol:"Símbolo", currPos:"Posición",
    taxes:"Impuestos", taxName:"Nombre", taxRate:"Tasa %", addTax:"Agregar",
    save:"Guardar", close:"Cerrar", cancel:"Cancelar", print:"Imprimir / PDF", shareWA:"WhatsApp",
    date:"Fecha", billTo:"Facturar a", withTax:"Con impuesto", withoutTax:"Sin impuesto",
    orderNum:"Pedido #", setSequence:"Número Inicial", sequenceSaved:"Secuencia guardada ✓",
    qty:"Cant.", moreOptions:"Más opciones", hideOptions:"Ocultar opciones",
    company:"Empresa", taxEnabled:"Fiscal (con impuesto)",
    ncfConfig:"Config NCF", ncfPrefix:"Prefijo NCF", ncfSequence:"Secuencia Actual",
    ncfStart:"Inicio", ncfEnd:"Fin (0 = ilimitado)", ncfNext:"Próximo NCF", ncfPadLength:"Dígitos",
    ncfSaved:"NCF guardado ✓", ncfWarning:"⚠ Secuencia NCF próxima al límite",
    ncfExhausted:"🚫 Secuencia NCF agotada — actualizar config",
    addCompany:"Agregar Empresa", editCompany:"Editar Empresa", noCompanies:"Sin empresas.",
    fiscalInvoice:"Factura Fiscal", commercialInvoice:"Factura Comercial",
    ncf:"NCF", itbis:"ITBIS", baseAmount:"Monto Gravable",
    dgiiNote:"Este documento cumple con los requisitos fiscales de la DGII.",
    permissions:"Permisos", permOrders:"Pedidos", permClients:"Clientes",
    permProducts:"Productos", permCompanies:"Empresas", permTeam:"Equipo", permSettings:"Ajustes",
    adminOnly:"Solo administrador", search:"Buscar…", exitOrderConfirm:"¿Seguro que quieres salir de este pedido? Todos los cambios no guardados se perderán.", exitOrder:"Salir del Pedido",
    waMsg: (doc, items, total, due) =>
      `Hola ${doc.client_snapshot?.name},\n\nAquí está su ${doc.type} *${doc.order_number}*${doc.ncf ? `\nNCF: ${doc.ncf}` : ""}\n\n${items}\n\n*Total: ${total}*${due ? `\nVence: ${due}` : ""}\n\n¡Gracias!`,
  },
};

/* ════════════════════════════════════════════════════════════
   DESIGN TOKENS
════════════════════════════════════════════════════════════ */
const C = {
  bg:"#f4f4f2", surface:"#ffffff", border:"#e6e6e2", borderDark:"#d0d0ca",
  text:"#1a1a1a", muted:"#78786e", mutedLight:"#c4c4bc",
  accent:"#1a1a1a", accentSoft:"#efece6",
  danger:"#b83232", dangerSoft:"#fceaea",
  success:"#247a47", successSoft:"#e8f5ee",
  info:"#1e6fa8", infoSoft:"#e6f0f9",
  warn:"#c47a1a", warnSoft:"#fdf3e3",
  fiscal:"#4a1a8a", fiscalSoft:"#f0eaf8",
  openOrder:"#0f5c3a", openOrderSoft:"#e6f7ef",
  shadow:"0 1px 3px rgba(0,0,0,0.07)", shadowMd:"0 4px 16px rgba(0,0,0,0.09)",
};

const STATUS = {
  open:      { color:C.openOrder, bg:C.openOrderSoft, icon:"📂" },
  ordered:   { color:C.info,      bg:C.infoSoft,      icon:"📦" },
  delivered: { color:C.warn,      bg:C.warnSoft,      icon:"🚚" },
  paid:      { color:C.success,   bg:C.successSoft,   icon:"✅" },
  cancelled: { color:C.danger,    bg:C.dangerSoft,    icon:"✕"  },
};

const ALL_PERMS = ["orders","clients","products","companies","team","settings"];
const DEFAULT_PERMS = { orders:true, clients:true, products:true, companies:false, team:false, settings:false };
const ADMIN_PERMS   = { orders:true, clients:true, products:true, companies:true,  team:true,  settings:true  };

/* ════════════════════════════════════════════════════════════
   UTILITIES
════════════════════════════════════════════════════════════ */
const uid       = () => crypto.randomUUID?.() || Math.random().toString(36).slice(2);
const todayISO  = () => new Date().toISOString().split("T")[0];
const fmtDate   = (d) => d ? new Date(d).toLocaleDateString("es-DO") : "";
const mkFmt     = (sym, pos) => (n) => { const v = Number(n).toFixed(2); return pos==="after" ? `${v}${sym}` : `${sym}${v}`; };
const match     = (obj, q) => !q || Object.values(obj).some(v => String(v||"").toLowerCase().includes(q.toLowerCase()));
const addDays   = (n) => { const d=new Date(); d.setDate(d.getDate()+n); return d.toISOString().split("T")[0]; };
const daysUntil = (s) => { if(!s) return null; return Math.ceil((new Date(s)-new Date(todayISO()))/86400000); };
const digitsOnly = (raw = "") => String(raw).replace(/\D/g,"");
const looksLikeEmail = (value = "") => /\S+@\S+\.\S+/.test(String(value).trim());
const isInternalAuthEmail = (email = "") => String(email).toLowerCase().endsWith("@auth.orderapp.local");
const fmtPhone  = (raw) => { const d=digitsOnly(raw).slice(0,10); if(d.length<=3) return d.length?`(${d}`:""; if(d.length<=6) return `(${d.slice(0,3)}) ${d.slice(3)}`; return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`; };
const buildNCF  = (prefix, seq, pad) => `${prefix}${String(seq).padStart(pad,"0")}`;
const ncfPct    = (cfg) => (!cfg||!cfg.sequence_end||cfg.sequence_end===0) ? 0 : Math.round((cfg.current_sequence/cfg.sequence_end)*100);
const hasPerm   = (sp, key) => sp?.is_admin || (sp?.permissions?.[key] ?? DEFAULT_PERMS[key] ?? false);
const normalizeOrderRecord = (order = {}) => {
  const isOpen = order.status === "open" || order.type === "open" || order.is_finalized === false;
  return {
    ...order,
    status: isOpen ? "open" : (order.status || "ordered"),
    is_finalized: isOpen ? false : (order.is_finalized ?? true),
  };
};
const sortOrders = (rows = []) => [...rows]
  .map(normalizeOrderRecord)
  .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
const upsertOrderList = (rows, order) => sortOrders([normalizeOrderRecord(order), ...rows.filter(x => x.id !== order.id)]);
const normalizePersonRecord = (person = {}) => ({
  ...person,
  permissions: person.is_admin ? { ...ADMIN_PERMS } : { ...DEFAULT_PERMS, ...(person.permissions || {}) },
});
const sortTeam = (rows = []) => [...rows]
  .map(normalizePersonRecord)
  .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
const visibleTeamContact = (person = {}) => [person.role, person.email, person.phone].filter(Boolean).join(" · ");
const useMediaQuery = (query) => {
  const getMatches = () => typeof window !== "undefined" && window.matchMedia(query).matches;
  const [matches, setMatches] = useState(getMatches);
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const media = window.matchMedia(query);
    const onChange = (event) => setMatches(event.matches);
    setMatches(media.matches);
    if (media.addEventListener) media.addEventListener("change", onChange);
    else media.addListener(onChange);
    return () => {
      if (media.removeEventListener) media.removeEventListener("change", onChange);
      else media.removeListener(onChange);
    };
  }, [query]);
  return matches;
};

/* ════════════════════════════════════════════════════════════
   GLOBAL CSS
════════════════════════════════════════════════════════════ */
const GStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    html,body,#root{height:100%;font-family:'Geist',-apple-system,sans-serif;background:${C.bg};color:${C.text};-webkit-font-smoothing:antialiased;overscroll-behavior:none}
    #root{display:flex;flex-direction:column}
    input,select,textarea,button{font-family:inherit}
    input[type=number]{-moz-appearance:textfield}
    input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
    ::-webkit-scrollbar{width:3px;height:3px}
    ::-webkit-scrollbar-thumb{background:${C.mutedLight};border-radius:4px}
    .fade{animation:fadeIn .18s ease}
    @keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
    .sheet{animation:sheetUp .22s cubic-bezier(.32,.72,0,1)}
    @keyframes sheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
    img{display:block;max-width:100%}
    button{cursor:pointer}
    a{color:inherit;text-decoration:none}
  `}</style>
);

/* ════════════════════════════════════════════════════════════
   UI PRIMITIVES
════════════════════════════════════════════════════════════ */
const Btn = ({ children, onClick, variant="primary", size="md", disabled, full, style={} }) => {
  const sz={sm:"5px 11px",md:"9px 17px",lg:"12px 22px"}[size];
  const fz={sm:"12px",md:"13px",lg:"14px"}[size];
  const V={
    primary:{background:C.accent,color:"#fff",border:"none"},
    ghost:{background:"transparent",color:C.muted,border:`1px solid ${C.border}`},
    danger:{background:C.danger,color:"#fff",border:"none"},
    success:{background:C.success,color:"#fff",border:"none"},
    soft:{background:C.accentSoft,color:C.accent,border:"none"},
    outline:{background:"transparent",color:C.accent,border:`1.5px solid ${C.accent}`},
    fiscal:{background:C.fiscal,color:"#fff",border:"none"},
    open:{background:C.openOrder,color:"#fff",border:"none"},
    info:{background:C.infoSoft,color:C.info,border:"none"},
    warn:{background:C.warnSoft,color:C.warn,border:`1px solid ${C.warn}44`},
  };
  return (
    <button onClick={disabled?undefined:onClick} disabled={disabled}
      style={{padding:sz,fontSize:fz,borderRadius:"8px",fontWeight:"500",display:"inline-flex",alignItems:"center",gap:"5px",whiteSpace:"nowrap",transition:"opacity .15s",opacity:disabled?0.4:1,width:full?"100%":undefined,justifyContent:full?"center":undefined,flexShrink:0,letterSpacing:"-0.01em",...V[variant],...style}}>
      {children}
    </button>
  );
};

const iBase={background:C.surface,border:`1px solid ${C.border}`,borderRadius:"9px",padding:"10px 13px",color:C.text,fontSize:"14px",width:"100%",outline:"none",transition:"border-color .15s"};
const iSm={...iBase,padding:"7px 10px",fontSize:"13px"};

const Inp=({label,value,onChange,type="text",placeholder,required,sm,readOnly})=>(
  <div style={{display:"flex",flexDirection:"column",gap:"5px"}}>
    {label&&<label style={{fontSize:"11px",fontWeight:"600",color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em"}}>{label}{required&&" *"}</label>}
    <input type={type} value={value} onChange={e=>onChange?.(e.target.value)} placeholder={placeholder} readOnly={readOnly}
      style={{...(sm?iSm:iBase),background:readOnly?C.bg:C.surface}}
      onFocus={e=>!readOnly&&(e.target.style.borderColor=C.accent)}
      onBlur={e=>(e.target.style.borderColor=C.border)}/>
  </div>
);

const PhoneInp=({label,value,onChange})=>(
  <Inp label={label} value={value} onChange={v=>onChange(fmtPhone(v.replace(/\D/g,"")))} type="tel" placeholder="(809) 000-0000"/>
);

const QtyInput=({value,onChange,style={}})=>(
  <input type="number" inputMode="numeric" pattern="[0-9]*"
    value={value===0?"":value}
    onChange={e=>onChange(parseInt(e.target.value)||0)}
    onFocus={e=>e.target.select()} placeholder="0"
    style={{textAlign:"center",fontWeight:"700",fontSize:"14px",color:value>0?C.accent:C.muted,background:"transparent",border:"none",outline:"none",fontFamily:"inherit",width:"100%",...style}}/>
);

const Sel=({label,value,onChange,options})=>(
  <div style={{display:"flex",flexDirection:"column",gap:"5px"}}>
    {label&&<label style={{fontSize:"11px",fontWeight:"600",color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em"}}>{label}</label>}
    <select value={value} onChange={e=>onChange(e.target.value)} style={{...iBase,appearance:"none",WebkitAppearance:"none"}}>
      {options.map(o=><option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}
    </select>
  </div>
);

const Badge=({children,color,bg})=>(
  <span style={{background:bg||color+"18",color,borderRadius:"5px",padding:"2px 7px",fontSize:"11px",fontWeight:"600",textTransform:"capitalize",whiteSpace:"nowrap"}}>{children}</span>
);

const Divider=({my=0})=><div style={{height:1,background:C.border,margin:`${my}px 0`}}/>;

const Card=({children,style={},pad=14,onClick})=>(
  <div onClick={onClick} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:"12px",boxShadow:C.shadow,padding:pad,overflow:"hidden",cursor:onClick?"pointer":undefined,...style}}>
    {children}
  </div>
);

const Toggle=({on,onToggle,label})=>(
  <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
    <button onClick={onToggle} style={{width:36,height:20,borderRadius:"10px",border:"none",background:on?C.accent:C.border,cursor:"pointer",position:"relative",flexShrink:0}}>
      <div style={{width:14,height:14,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:on?19:3,transition:"left .2s"}}/>
    </button>
    {label&&<span style={{fontSize:"13px",color:C.muted}}>{label}</span>}
  </div>
);

const DueBadge=({dueDate,t})=>{
  if(!dueDate) return null;
  const d=daysUntil(dueDate);
  const over=d<0,urgent=d>=0&&d<=3;
  return <span style={{background:over?C.dangerSoft:urgent?C.warnSoft:C.infoSoft,color:over?C.danger:urgent?C.warn:C.info,borderRadius:"5px",padding:"2px 7px",fontSize:"11px",fontWeight:"600"}}>{over?`⚠ ${t.overdue}`:`${d}d`}</span>;
};

/* ════════════════════════════════════════════════════════════
   SHEET MODAL — swipe-down + browser back
════════════════════════════════════════════════════════════ */
const Sheet=({title,children,onClose,wide,titleBadge,disableBackdropClose=false,disableSwipeClose=false})=>{
  const ref=useRef(null);
  const startY=useRef(null);
  const dy=useRef(0);

  useEffect(()=>{
    window.history.pushState({modal:true},"");
    const pop=()=>onClose();
    window.addEventListener("popstate",pop);
    return()=>window.removeEventListener("popstate",pop);
  },[onClose]);

  const ts=e=>{startY.current=e.touches[0].clientY;};
  const tm=e=>{
    if(disableSwipeClose) return;
    const d=e.touches[0].clientY-startY.current;
    if(d>0&&ref.current){dy.current=d;ref.current.style.transform=`translateY(${d}px)`;}
  };
  const te=()=>{
    if(disableSwipeClose) return;
    if(dy.current>80)onClose();
    else if(ref.current)ref.current.style.transform="";
    dy.current=0;
  };

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.32)",zIndex:200,backdropFilter:"blur(3px)",display:"flex",alignItems:"flex-end",justifyContent:"center"}}
      onClick={e=>e.target===e.currentTarget&&!disableBackdropClose&&onClose()}>
      <div ref={ref} className="sheet" onTouchStart={ts} onTouchMove={tm} onTouchEnd={te}
        style={{background:C.surface,borderRadius:"20px 20px 0 0",width:"100%",maxWidth:wide?"800px":"540px",maxHeight:"93vh",display:"flex",flexDirection:"column",boxShadow:"0 -6px 32px rgba(0,0,0,.1)",transition:"transform .15s",touchAction:disableSwipeClose?"auto":"none"}}>
        <div style={{padding:"10px 0 4px",display:"flex",justifyContent:"center",flexShrink:0}}>
          <div style={{width:36,height:4,background:C.border,borderRadius:4}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 18px 14px",flexShrink:0,borderBottom:`1px solid ${C.border}`}}>
          <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
            <span style={{fontSize:"15px",fontWeight:"600",letterSpacing:"-0.02em"}}>{title}</span>
            {titleBadge}
          </div>
          <button onClick={onClose} style={{background:C.accentSoft,border:"none",borderRadius:"50%",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",color:C.muted,fontSize:"14px"}}>✕</button>
        </div>
        <div style={{overflowY:"auto",padding:"18px",flex:1,display:"flex",flexDirection:"column",gap:"13px"}}>
          {children}
        </div>
      </div>
    </div>
  );
};

const Confirm=({message,onConfirm,onCancel,t,confirmLabel,confirmVariant="danger"})=>(
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:400,padding:"20px",backdropFilter:"blur(4px)"}}>
    <div className="fade" style={{background:C.surface,borderRadius:"16px",padding:"28px 24px",maxWidth:"320px",width:"100%",textAlign:"center",boxShadow:C.shadowMd}}>
      <div style={{fontSize:"30px",marginBottom:"12px"}}>⚠️</div>
      <div style={{fontSize:"14px",marginBottom:"22px",lineHeight:"1.5"}}>{message}</div>
      <div style={{display:"flex",gap:"10px",justifyContent:"center"}}>
        <Btn variant="ghost" onClick={onCancel}>{t.cancel}</Btn>
        <Btn variant={confirmVariant} onClick={onConfirm}>{confirmLabel||t.confirmBtn}</Btn>
      </div>
    </div>
  </div>
);

const Toast=({msg})=>(
  <div style={{position:"fixed",bottom:80,left:"50%",transform:"translateX(-50%)",background:C.accent,color:"#fff",padding:"10px 20px",borderRadius:"100px",fontSize:"13px",fontWeight:"500",zIndex:500,boxShadow:C.shadowMd,whiteSpace:"nowrap",pointerEvents:"none"}}>{msg}</div>
);

const Lightbox=({url,onClose})=>(
  <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.92)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:600,padding:"20px"}}>
    <img src={url} style={{maxWidth:"100%",maxHeight:"90vh",borderRadius:"12px",objectFit:"contain"}}/>
    <button onClick={onClose} style={{position:"absolute",top:20,right:20,background:"rgba(255,255,255,.15)",border:"none",borderRadius:"50%",width:36,height:36,color:"#fff",fontSize:"18px",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
  </div>
);

const ImageUploader=({url,onUpload,onRemove,label="Image",size=72})=>{
  const ref=useRef();
  const [busy,setBusy]=useState(false);
  const handle=async(e)=>{
    const f=e.target.files?.[0];if(!f)return;
    setBusy(true);
    const path=`${uid()}-${f.name.replace(/\s/g,"_")}`;
    await sb.storage.upload("images",path,f);
    onUpload(sb.storage.url("images",path));
    setBusy(false);
  };
  return(
    <div style={{display:"flex",alignItems:"center",gap:"14px"}}>
      <div onClick={()=>!url&&ref.current?.click()} style={{width:size,height:size,borderRadius:"10px",overflow:"hidden",border:`1.5px dashed ${url?"transparent":C.border}`,background:url?"transparent":C.bg,display:"flex",alignItems:"center",justifyContent:"center",cursor:url?"default":"pointer",flexShrink:0}}>
        {url?<img src={url} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:"22px"}}>📷</span>}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:"7px"}}>
        <Btn size="sm" variant="soft" onClick={()=>ref.current?.click()} disabled={busy}>{busy?"Uploading…":url?"Change":label}</Btn>
        {url&&<Btn size="sm" variant="ghost" onClick={onRemove} style={{color:C.danger}}>Remove</Btn>}
        <input ref={ref} type="file" accept="image/*" capture="environment" onChange={handle} style={{display:"none"}}/>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   PDF — FISCAL (DGII)
════════════════════════════════════════════════════════════ */
const makeFiscalPDF=(doc,company,fmt,t)=>{
  const snap=doc.client_snapshot||{};
  const taxRows=(doc.tax_lines||[]).filter(tx=>tx.rate>0)
    .map(tx=>`<tr><td colspan="4" style="text-align:right;padding:5px 10px;color:#555">${tx.name} (${tx.rate}%)</td><td style="text-align:right;padding:5px 10px">${fmt(tx.amt)}</td></tr>`).join("");
  const logo=company?.logo?`<img src="${company.logo}" style="max-height:60px;max-width:160px;object-fit:contain"/>`:`<b style="font-size:22px;color:#4a1a8a">${company?.name||""}</b>`;
  /* NCF displayed in full — no truncation */
  const ncfBlock=doc.ncf?`
    <div style="margin-top:10px;background:#f0eaf8;border:2px solid #4a1a8a;border-radius:8px;padding:10px 16px;display:inline-block;min-width:260px">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#4a1a8a;margin-bottom:4px">Número de Comprobante Fiscal (NCF)</div>
      <div style="font-size:18px;font-weight:900;color:#4a1a8a;letter-spacing:.04em;word-break:break-all">${doc.ncf}</div>
    </div>`:"";
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${doc.order_number}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#111;padding:36px;font-size:12px}
.page{max-width:800px;margin:0 auto}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #4a1a8a;padding-bottom:18px;margin-bottom:22px}
.co-info{font-size:11px;color:#555;line-height:1.7;margin-top:8px}
.doc-type{font-size:24px;font-weight:700;color:#4a1a8a;text-transform:uppercase;letter-spacing:.04em}
.doc-num{font-size:13px;font-weight:600;color:#333;margin-top:4px}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:22px}
.lbl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#aaa;margin-bottom:5px;border-bottom:1px solid #eee;padding-bottom:3px}
.cl{font-size:12px;line-height:1.7}
table{width:100%;border-collapse:collapse;font-size:12px}
thead tr{background:#f0eaf8}
th{padding:8px 10px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#4a1a8a;border-bottom:2px solid #c4aae8}
td{padding:8px 10px;border-bottom:1px solid #f0f0f0}
.tw{display:flex;justify-content:flex-end;margin-top:8px}
.tot{width:260px;font-size:12px}
.tot td{border:none;padding:4px 8px}
.tf td{font-weight:700;font-size:17px;border-top:2px solid #4a1a8a;padding-top:10px!important;color:#4a1a8a}
.fn{margin-top:20px;padding:10px 14px;background:#f0eaf8;border-radius:6px;font-size:10px;color:#4a1a8a;border-left:3px solid #4a1a8a}
.ft{margin-top:16px;padding-top:12px;border-top:1px solid #eee;font-size:10px;color:#bbb;text-align:center}
@media print{body{padding:20px}}
</style></head><body><div class="page">
<div class="hdr">
  <div>${logo}<div class="co-info">${[company?.rnc?`<b>RNC: ${company.rnc}</b>`:"",company?.address,company?.phone,company?.email].filter(Boolean).join("<br>")}</div></div>
  <div style="text-align:right">
    <div class="doc-type">${t.fiscalInvoice}</div>
    <div class="doc-num">${doc.order_number}</div>
    <div style="font-size:11px;color:#888;margin-top:3px">${t.date}: ${fmtDate(doc.created_at)}</div>
    ${ncfBlock}
  </div>
</div>
<div class="cols">
  <div><div class="lbl">${t.billTo}</div><div class="cl"><b>${snap.name||""}</b>${snap.rnc?`<br><b>RNC: ${snap.rnc}</b>`:""}${[snap.address,snap.phone,snap.email].filter(Boolean).map(x=>`<br>${x}`).join("")}</div></div>
  <div>${doc.salesperson_name?`<div class="lbl">${t.salesperson}</div><div style="font-weight:600">${doc.salesperson_name}</div>`:""}${doc.payment_type?`<div class="lbl" style="margin-top:10px">Pago</div><div>${doc.payment_type==="credit"?`${t.credit} (${doc.credit_days}d)`:t.cash}</div>`:""}${doc.due_date?`<div class="lbl" style="margin-top:10px">${t.dueDate}</div><div style="font-weight:600">${fmtDate(doc.due_date)}</div>`:""}${doc.notes?`<div class="lbl" style="margin-top:10px">Notas</div><div>${doc.notes}</div>`:""}</div>
</div>
<table><thead><tr><th>#</th><th>Descripción</th><th style="text-align:right">Precio Unit.</th><th style="text-align:center">${t.qty}</th><th style="text-align:right">Total</th></tr></thead>
<tbody>${(doc.items||[]).map((i,n)=>`<tr><td style="color:#bbb">${n+1}</td><td><b>${i.name}</b><br><span style="font-size:10px;color:#bbb">${i.unit||""}</span></td><td style="text-align:right">${fmt(i.price)}</td><td style="text-align:center;font-weight:600">${i.qty}</td><td style="text-align:right;font-weight:600">${fmt(i.price*i.qty)}</td></tr>`).join("")}</tbody></table>
<div class="tw"><table class="tot"><tbody>
<tr><td>${t.subtotal}</td><td style="text-align:right">${fmt(doc.subtotal)}</td></tr>
${doc.discount>0?`<tr><td>Descuento (${doc.discount}%)</td><td style="text-align:right;color:#b83232">−${fmt(doc.discount_amt)}</td></tr>`:""}
${taxRows}
<tr class="tf"><td>${t.total}</td><td style="text-align:right">${fmt(doc.total)}</td></tr>
</tbody></table></div>
<div class="fn">📋 ${t.dgiiNote}</div>
<div class="ft">OrderApp · ${fmtDate(new Date().toISOString())}${company?.name?" · "+company.name:""}</div>
</div></body></html>`;
};

/* ════════════════════════════════════════════════════════════
   PDF — COMMERCIAL (non-fiscal)
════════════════════════════════════════════════════════════ */
const makeCommercialPDF=(doc,company,fmt,t)=>{
  const snap=doc.client_snapshot||{};
  const logo=company?.logo?`<img src="${company.logo}" style="max-height:60px;max-width:160px;object-fit:contain"/>`:`<b style="font-size:22px">${company?.name||""}</b>`;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${doc.order_number}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#111;padding:36px;font-size:12px}
.page{max-width:800px;margin:0 auto}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1a1a1a;padding-bottom:16px;margin-bottom:20px}
.co-info{font-size:11px;color:#555;line-height:1.7;margin-top:8px}
.doc-type{font-size:24px;font-weight:200;text-transform:uppercase;letter-spacing:.08em;color:#888}
.doc-num{font-size:13px;font-weight:600;color:#333;margin-top:4px}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px}
.lbl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#bbb;margin-bottom:5px;border-bottom:1px solid #f0f0f0;padding-bottom:3px}
table{width:100%;border-collapse:collapse;font-size:12px}
thead tr{background:#f7f7f5}
th{padding:8px 10px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#888;border-bottom:1px solid #eee}
td{padding:8px 10px;border-bottom:1px solid #f5f5f5}
.tot{margin-left:auto;width:230px;font-size:12px;margin-top:6px}
.tot td{border:none;padding:3px 8px}
.tf td{font-weight:700;font-size:17px;border-top:2px solid #1a1a1a;padding-top:10px!important}
.ft{margin-top:28px;padding-top:12px;border-top:1px solid #eee;font-size:10px;color:#bbb;text-align:center}
@media print{body{padding:20px}}
</style></head><body><div class="page">
<div class="hdr">
  <div>${logo}<div class="co-info">${[company?.phone,company?.email,company?.address].filter(Boolean).join("<br>")}</div></div>
  <div>
    <div class="doc-type">${t.commercialInvoice}</div>
    <div class="doc-num">${doc.order_number}</div>
    <div style="font-size:11px;color:#888;margin-top:3px">${t.date}: ${fmtDate(doc.created_at)}</div>
  </div>
</div>
<div class="cols">
  <div><div class="lbl">${t.billTo}</div><div style="font-size:12px;line-height:1.7"><b>${snap.name||""}</b>${[snap.address,snap.phone].filter(Boolean).map(x=>`<br>${x}`).join("")}</div></div>
  <div>${doc.notes?`<div class="lbl">Notas</div><div>${doc.notes}</div>`:""}</div>
</div>
<table><thead><tr><th>#</th><th>Item</th><th style="text-align:right">${t.price}</th><th style="text-align:center">${t.qty}</th><th style="text-align:right">Total</th></tr></thead>
<tbody>${(doc.items||[]).map((i,n)=>`<tr><td style="color:#bbb">${n+1}</td><td><b>${i.name}</b></td><td style="text-align:right">${fmt(i.price)}</td><td style="text-align:center;font-weight:600">${i.qty}</td><td style="text-align:right;font-weight:600">${fmt(i.price*i.qty)}</td></tr>`).join("")}</tbody></table>
<table class="tot"><tbody>
<tr><td>${t.subtotal}</td><td style="text-align:right">${fmt(doc.subtotal)}</td></tr>
${doc.discount>0?`<tr><td>Descuento (${doc.discount}%)</td><td style="text-align:right;color:#b83232">−${fmt(doc.discount_amt)}</td></tr>`:""}
<tr class="tf"><td>${t.total}</td><td style="text-align:right">${fmt(doc.total)}</td></tr>
</tbody></table>
<div class="ft">OrderApp · ${fmtDate(new Date().toISOString())}${company?.name?" · "+company.name:""}</div>
</div></body></html>`;
};

/* ════════════════════════════════════════════════════════════
   ROOT APP
════════════════════════════════════════════════════════════ */
export default function App() {
  const [user,setUser]=useState(null);
  const [salesperson,setSalesperson]=useState(null);
  const [booting,setBooting]=useState(true);
  const [settings,setSettingsState]=useState({lang:"es",currencySymbol:"RD$",currencyPosition:"before",taxes:[{id:"t1",name:"ITBIS",rate:18}]});
  const [toast,setToast]=useState(null);
  const [confirm,setConfirm]=useState(null);
  const [lightbox,setLightbox]=useState(null);

  const t=T[settings.lang]||T.es;
  const fmt=mkFmt(settings.currencySymbol,settings.currencyPosition);

  const showToast=useCallback((msg,ms=2400)=>{setToast(msg);setTimeout(()=>setToast(null),ms);},[]);
  const askConfirm=useCallback((msg,cb,opts={})=>setConfirm({msg,cb,...opts}),[]);
  const loadSettings=useCallback(async()=>{
    try{
      const rows=await sb.q("app_config").select("*");
      if(Array.isArray(rows)){
        const s=rows.find(r=>r.key==="settings");
        if(s?.value) setSettingsState(s.value);
      }
    }catch{}
  },[]);
  const loadSalesperson=useCallback(async(authUser)=>{
    if(!authUser?.id){setSalesperson(null);return null;}
    const sp=await sb.q("salespeople").select("*",{eq:{auth_user_id:authUser.id}});
    const row=Array.isArray(sp)&&sp[0]?normalizePersonRecord(sp[0]):null;
    setSalesperson(row);
    return row;
  },[]);

  useEffect(()=>{
    (async()=>{
      const stored=getStoredSession();
      if(stored) sb.auth.setSession(stored);
      let u=await sb.auth.me();
      if(!u?.id&&stored?.refresh_token){
        const refreshed=await sb.auth.refresh(stored.refresh_token);
        if(refreshed?.access_token){
          sb.auth.setSession(refreshed);
          u=refreshed.user||await sb.auth.me();
        }else{
          sb.auth.clearSession();
        }
      }
      if(u?.id){
        setUser(u);
        await loadSalesperson(u);
      }else{
        sb.auth.clearSession();
      }
      await loadSettings();
      setBooting(false);
    })();
  },[loadSalesperson,loadSettings]);

  const handleLogin=async(identifier,pw)=>{
    try{
      const d=await sb.auth.signIn(identifier,pw);
      if(d.access_token){
        sb.auth.setSession(d);
        const authUser=d.user||await sb.auth.me();
        setUser(authUser);
        await loadSalesperson(authUser);
        await loadSettings();
        return true;
      }
    }catch{}
    return false;
  };

  const handleLogout=async()=>{
    await sb.auth.signOut();
    setUser(null);setSalesperson(null);
  };

  const saveSettings=async(s)=>{
    setSettingsState(s);
    await sb.q("app_config").upsert({key:"settings",value:s});
  };

  if(booting) return(
    <><GStyle/>
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{textAlign:"center",color:C.muted}}>
          <div style={{fontSize:"48px",marginBottom:"10px"}}>🛒</div>
          <div style={{fontSize:"13px"}}>{T.es.loading}</div>
        </div>
      </div>
    </>
  );

  if(!user) return <><GStyle/><LoginScreen t={t} onLogin={handleLogin}/></>;

  return(
    <><GStyle/>
      <MainApp user={user} salesperson={salesperson} t={t} fmt={fmt}
        settings={settings} saveSettings={saveSettings}
        showToast={showToast} askConfirm={askConfirm}
        onLogout={handleLogout} setLightbox={setLightbox}/>
      {toast&&<Toast msg={toast}/>}
      {confirm&&<Confirm message={confirm.msg} t={t} confirmLabel={confirm.confirmLabel} confirmVariant={confirm.confirmVariant}
        onConfirm={()=>{confirm.cb();setConfirm(null);}} onCancel={()=>setConfirm(null)}/>}
      {lightbox&&<Lightbox url={lightbox} onClose={()=>setLightbox(null)}/>}
    </>
  );
}

/* ════════════════════════════════════════════════════════════
   LOGIN
════════════════════════════════════════════════════════════ */
function LoginScreen({t,onLogin}){
  const [identifier,setIdentifier]=useState("");
  const [pw,setPw]=useState("");
  const [err,setErr]=useState("");
  const [busy,setBusy]=useState(false);
  const go=async()=>{
    if(!identifier||!pw)return;
    setBusy(true);setErr("");
    if(!await onLogin(identifier,pw))setErr(t.loginErr);
    setBusy(false);
  };
  return(
    <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}}>
      <div className="fade" style={{width:"100%",maxWidth:"340px"}}>
        <div style={{textAlign:"center",marginBottom:"36px"}}>
          <div style={{fontSize:"52px",marginBottom:"12px"}}>🛒</div>
          <div style={{fontSize:"22px",fontWeight:"700",letterSpacing:"-0.03em"}}>{t.appName}</div>
          <div style={{fontSize:"13px",color:C.muted,marginTop:"4px"}}>{t.signInHint}</div>
        </div>
        <Card style={{display:"flex",flexDirection:"column",gap:"14px"}}>
          <Inp label={t.loginId} value={identifier} onChange={setIdentifier} placeholder="you@example.com / (809) 000-0000"/>
          <Inp label={t.password} value={pw} onChange={setPw} type="password" placeholder="••••••••"/>
          {err&&<div style={{fontSize:"13px",color:C.danger,textAlign:"center"}}>{err}</div>}
          <Btn onClick={go} full size="lg" disabled={busy}>{busy?t.loading:t.login}</Btn>
        </Card>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   MAIN APP SHELL
════════════════════════════════════════════════════════════ */
function MainApp({user,salesperson,t,fmt,settings,saveSettings,showToast,askConfirm,onLogout,setLightbox}){
  const [tab,setTab]=useState("orders");
  const [companies,setCompanies]=useState([]);
  const [ncfConfigs,setNcfConfigs]=useState({});
  const [clients,setClients]=useState([]);
  const [products,setProducts]=useState([]);
  const [categories,setCategories]=useState([]);
  const [orders,setOrders]=useState([]);
  const [team,setTeam]=useState([]);
  const [moreOpen,setMoreOpen]=useState(false);
  const companyStorageKey=`orderapp:selected-company:${user?.id||"guest"}`;

  // ── CRITICAL: selectedCompany is USER-controlled only.
  // We use a ref to track whether user has made an explicit choice,
  // so polling never overrides it.
  const [selCompany,_setSelCompany]=useState(null);
  const userPickedCompany=useRef(false);
  const setSelCompany=useCallback((co)=>{
    userPickedCompany.current=true;
    if(co?.id) localStorage.setItem(companyStorageKey,co.id);
    _setSelCompany(co);
  },[companyStorageKey]);

  // Order builder state
  const [selClient,setSelClient]=useState(null);
  const [cart,setCart]=useState({});
  const [discount,setDiscount]=useState(0);
  const [notes,setNotes]=useState("");
  const [selSp,setSelSp]=useState(salesperson?.id||"");
  const [useTax,setUseTax]=useState(false);
  const [payType,setPayType]=useState("cash");
  const [creditDays,setCreditDays]=useState(30);
  const [editingId,setEditingId]=useState(null);
  const [activeCat,setActiveCat]=useState("All");
  const [searchQ,setSearchQ]=useState("");
  const [orderMode,setOrderMode]=useState("open"); // "open" | "invoice"

  // Modals
  const [modal,setModal]=useState(null);
  const [editObj,setEditObj]=useState(null);
  const [previewDoc,setPreviewDoc]=useState(null);
  const [finalizingOrder,setFinalizingOrder]=useState(null);

  const isAdmin=salesperson?.is_admin===true;
  const perm=(key)=>isAdmin||hasPerm(salesperson,key);

  const loadAll=useCallback(async()=>{
    const [co,cl,pr,ca,or,tm]=await Promise.all([
      sb.q("companies").select("*",{order:"sort_order.asc"}),
      sb.q("clients").select("*",{order:"name.asc"}),
      sb.q("products").select("*",{order:"name.asc"}),
      sb.q("categories").select("*",{order:"sort_order.asc"}),
      sb.q("orders").select("*",{order:"created_at.desc"}),
      sb.q("salespeople").select("*",{order:"name.asc"}),
    ]);

    if(Array.isArray(co)){
      setCompanies(co);
      const storedCompanyId=localStorage.getItem(companyStorageKey);
      const preferredCompany=co.find(c=>c.id===selCompany?.id)||co.find(c=>c.id===storedCompanyId)||co[0]||null;
      if(preferredCompany&&(!userPickedCompany.current||!co.some(c=>c.id===selCompany?.id))){
        if(storedCompanyId) userPickedCompany.current=true;
        _setSelCompany(preferredCompany);
        setUseTax(preferredCompany.tax_enabled);
      }
      // Load NCF configs
      const cfgs={};
      for(const c of co){
        if(c.tax_enabled){
          const rows=await sb.q("ncf_config").select("*",{eq:{company_id:c.id}});
          if(Array.isArray(rows)&&rows[0])cfgs[c.id]=rows[0];
        }
      }
      setNcfConfigs(cfgs);
    }
    if(Array.isArray(cl))setClients(cl);
    if(Array.isArray(pr))setProducts(pr);
    if(Array.isArray(ca))setCategories(ca.map(c=>c.name));
    if(Array.isArray(or))setOrders(sortOrders(or));
    if(Array.isArray(tm))setTeam(sortTeam(tm));
  },[companyStorageKey,selCompany?.id]);

  useEffect(()=>{loadAll();},[loadAll]);

  // Polling — never overrides user company selection (handled in loadAll)
  useEffect(()=>{
    let active=true;
    const poll=async()=>{while(active){await new Promise(r=>setTimeout(r,6000));if(active)loadAll();}};
    poll();
    return()=>{active=false;};
  },[loadAll]);

  useEffect(()=>{
    if(!editingId) setSelSp(salesperson?.id||"");
  },[salesperson?.id,editingId]);

  useEffect(()=>{
    const allowedTabs=[
      perm("orders")&&"orders",
      perm("clients")&&"clients",
      perm("products")&&"products",
      perm("settings")&&"settings",
      perm("companies")&&"companies",
      perm("team")&&"team",
    ].filter(Boolean);
    if(tab!=="more"&&!allowedTabs.includes(tab)&&allowedTabs[0]) setTab(allowedTabs[0]);
  },[perm,tab]);

  // Cart math
  const cartItems=Object.entries(cart).filter(([,q])=>q>0)
    .map(([id,qty])=>({...products.find(p=>p.id===id),qty})).filter(x=>x.id);
  const subtotal=cartItems.reduce((s,i)=>s+i.price*i.qty,0);
  const discountAmt=subtotal*(discount/100);
  const afterDiscount=subtotal-discountAmt;
  const taxLines=useTax?(settings.taxes||[]).filter(tx=>tx.rate>0).map(tx=>({...tx,amt:afterDiscount*(tx.rate/100)})):[];
  const taxTotal=taxLines.reduce((s,tx)=>s+tx.amt,0);
  const total=afterDiscount+taxTotal;
  const cartCount=cartItems.reduce((s,i)=>s+i.qty,0);

  const setQty=(pid,qty)=>setCart(c=>({...c,[pid]:Math.max(0,qty)}));
  const clearOrder=()=>{
    setCart({});setSelClient(null);setDiscount(0);setNotes("");
    setSelSp(salesperson?.id||"");setPayType("cash");setCreditDays(30);setEditingId(null);
    setUseTax(selCompany?.tax_enabled||false);
    setOrderMode("open");setSearchQ("");setActiveCat("All");
  };
  const isOrderDirty=!!editingId||!!selClient||cartCount>0||discount>0||!!notes.trim()||payType!=="cash"||creditDays!==30||orderMode!=="open";
  const requestCloseOrder=useCallback(()=>{
    if(!isOrderDirty){setModal(null);clearOrder();return;}
    askConfirm(t.exitOrderConfirm,()=>{setModal(null);clearOrder();},{confirmLabel:t.exitOrder,confirmVariant:"danger"});
  },[askConfirm,clearOrder,isOrderDirty,t.exitOrder,t.exitOrderConfirm]);

  const getNextOrderNum=async()=>{
    const rows=await sb.q("app_settings").select("*",{eq:{key:"order_sequence"}});
    const cur=parseInt(Array.isArray(rows)&&rows[0]?rows[0].value:"1000");
    await sb.q("app_settings").update({value:String(cur+1)},{eq:{key:"order_sequence"}});
    return String(cur).padStart(5,"0");
  };

  const getNCF=async(companyId)=>{
    try{
      const ncf=await sb.q("ncf_config").rpc("get_next_ncf",{p_company_id:companyId});
      if(ncf){
        await sb.q("ncf_history").insert({company_id:companyId,ncf});
        const rows=await sb.q("ncf_config").select("*",{eq:{company_id:companyId}});
        if(Array.isArray(rows)&&rows[0]){
          const cfg=rows[0];
          setNcfConfigs(prev=>({...prev,[companyId]:cfg}));
          const pct=ncfPct(cfg);
          if(pct>=100)showToast(t.ncfExhausted,5000);
          else if(pct>=80)showToast(t.ncfWarning,4000);
        }
        return ncf;
      }
    }catch(e){showToast(`NCF Error: ${e.message}`);}
    return null;
  };

  // Save as open order
  const saveOpenOrder=async()=>{
    if(!selClient||cartItems.length===0||!selCompany)return;
    const spRow=team.find(s=>s.id===selSp);
    const orderNum=editingId?orders.find(o=>o.id===editingId)?.order_number:await getNextOrderNum();
    const payload={
      type:"open",order_number:orderNum,status:"open",is_finalized:false,
      company_id:selCompany.id,client_id:selClient.id,client_snapshot:selClient,
      items:cartItems,subtotal,discount,discount_amt:discountAmt,
      tax_lines:[],tax_total:0,total:subtotal-discountAmt,notes,
      salesperson_id:spRow?.id||null,salesperson_name:spRow?.name||"",
      currency_symbol:settings.currencySymbol,currency_position:settings.currencyPosition,
      payment_type:payType,credit_days:payType==="credit"?creditDays:null,
      due_date:null,created_by:user.id,ncf:"",is_fiscal:false,
      open_order_notes:notes,
    };
    if(editingId){
      await sb.q("orders").update(payload,{eq:{id:editingId}});
      setOrders(os=>upsertOrderList(os,{...os.find(o=>o.id===editingId),...payload,id:editingId}));
    }else{
      const saved=await sb.q("orders").insert(payload);
      if(saved?.id)setOrders(os=>upsertOrderList(os,saved));
    }
    clearOrder();setModal(null);
    showToast("Open order saved ✓");
  };

  // Finalize open order → invoice
  const finalizeOpenOrder=async(order,type,company)=>{
    const co=company||companies.find(c=>c.id===order.company_id)||selCompany;
    if(!co)return;
    const spRow=team.find(s=>s.id===order.salesperson_id);
    const isFiscal=co.tax_enabled&&type==="invoice";
    const dueDate=order.payment_type==="credit"?addDays(order.credit_days||30):null;

    // Recalculate with taxes if fiscal
    const sub=order.subtotal;
    const dAmt=order.discount_amt;
    const afterD=sub-dAmt;
    const tLines=isFiscal?(settings.taxes||[]).filter(tx=>tx.rate>0).map(tx=>({...tx,amt:afterD*(tx.rate/100)})):[];
    const tTotal=tLines.reduce((s,tx)=>s+tx.amt,0);
    const tot=afterD+tTotal;

    let ncf="";
    if(isFiscal){
      ncf=await getNCF(co.id)||"";
    }

    const payload={
      type,status:"ordered",is_finalized:true,finalized_at:new Date().toISOString(),
      finalized_by:user.id,company_id:co.id,
      tax_lines:tLines,tax_total:tTotal,total:tot,
      due_date:dueDate,ncf,is_fiscal:isFiscal,
    };

    await sb.q("orders").update(payload,{eq:{id:order.id}});
    const finalDoc={...order,...payload,_company:co};
    setOrders(os=>upsertOrderList(os,{...order,...payload}));
    setPreviewDoc(finalDoc);
    setModal("invoice");
    setFinalizingOrder(null);
    showToast(type==="invoice"?"Invoice created ✓":"Quotation created ✓");
  };

  // Create new finalized invoice directly
  const finalizeOrder=async(type)=>{
    if(!selClient||cartItems.length===0||!selCompany)return;
    const spRow=team.find(s=>s.id===selSp);
    const isFiscal=selCompany.tax_enabled&&type==="invoice";
    const dueDate=payType==="credit"?addDays(creditDays):null;
    const orderNum=editingId?orders.find(o=>o.id===editingId)?.order_number:await getNextOrderNum();

    let ncf="";
    if(isFiscal){
      ncf=await getNCF(selCompany.id)||"";
    }

    const payload={
      type,order_number:orderNum,status:"ordered",is_finalized:true,
      finalized_at:new Date().toISOString(),finalized_by:user.id,
      company_id:selCompany.id,client_id:selClient.id,client_snapshot:selClient,
      items:cartItems,subtotal,discount,discount_amt:discountAmt,
      tax_lines:taxLines,tax_total:taxTotal,total,notes,
      salesperson_id:spRow?.id||null,salesperson_name:spRow?.name||"",
      currency_symbol:settings.currencySymbol,currency_position:settings.currencyPosition,
      payment_type:payType,credit_days:payType==="credit"?creditDays:null,
      due_date:dueDate,created_by:user.id,ncf,is_fiscal:isFiscal,
    };

    let saved;
    if(editingId){
      await sb.q("orders").update(payload,{eq:{id:editingId}});
      saved={...payload,id:editingId};
      setOrders(os=>upsertOrderList(os,{...os.find(o=>o.id===editingId),...payload,id:editingId}));
    }else{
      saved=await sb.q("orders").insert(payload);
      if(saved?.id)setOrders(os=>upsertOrderList(os,saved));
    }
    setPreviewDoc({...(saved||payload),_company:selCompany});
    setModal("invoice");clearOrder();
    showToast(type==="invoice"?"Invoice created ✓":"Quotation created ✓");
  };

  const loadEditOrder=(order)=>{
    setEditingId(order.id);
    setSelClient(order.client_snapshot||{});
    const co=companies.find(c=>c.id===order.company_id);
    if(co){setSelCompany(co);setUseTax(co.tax_enabled);}
    const c={};(order.items||[]).forEach(i=>{c[i.id]=i.qty;});
    setCart(c);setDiscount(order.discount||0);setNotes(order.notes||"");
    setSelSp(order.salesperson_id||"");setPayType(order.payment_type||"cash");setCreditDays(order.credit_days||30);
    setOrderMode(order.is_finalized?"invoice":"open");
    setTab("orders");setModal("newOrder");
  };

  // CRUD helpers
  const saveClient=async(c)=>{
    if(c.id){await sb.q("clients").update(c,{eq:{id:c.id}});setClients(cs=>cs.map(x=>x.id===c.id?c:x));}
    else{const r=await sb.q("clients").insert(c);if(r?.id)setClients(cs=>[...cs,r]);}
  };
  const delClient=async(id)=>{await sb.q("clients").delete({eq:{id}});setClients(cs=>cs.filter(x=>x.id!==id));};
  const saveProduct=async(p)=>{
    if(p.id){await sb.q("products").update(p,{eq:{id:p.id}});setProducts(ps=>ps.map(x=>x.id===p.id?p:x));}
    else{const r=await sb.q("products").insert(p);if(r?.id)setProducts(ps=>[...ps,r]);}
  };
  const delProduct=async(id)=>{await sb.q("products").delete({eq:{id}});setProducts(ps=>ps.filter(x=>x.id!==id));};
  const savePerson=async(p)=>{
    const adminCount=team.filter(member=>member.is_admin).length;
    if(p.id&&team.find(member=>member.id===p.id)?.is_admin&&p.is_admin===false&&adminCount<=1){
      throw new Error("At least one admin must remain active.");
    }
    const method=p.id?"PATCH":"POST";
    const payload={
      id:p.id,
      name:p.name,
      role:p.role,
      email:p.email?.trim()||"",
      phone:p.phone||"",
      password:p.password||"",
      is_admin:!!p.is_admin,
      permissions:p.is_admin?{...ADMIN_PERMS}:{...DEFAULT_PERMS,...(p.permissions||{})},
    };
    const saved=await apiJson("/api/salespeople",{method,body:payload});
    if(saved?.id)setTeam(ts=>sortTeam([...ts.filter(x=>x.id!==saved.id),normalizePersonRecord(saved)]));
  };
  const delPerson=async(id)=>{
    const target=team.find(member=>member.id===id);
    if(target?.is_admin&&team.filter(member=>member.is_admin).length<=1){
      throw new Error("At least one admin must remain active.");
    }
    await apiJson(`/api/salespeople?id=${encodeURIComponent(id)}`,{method:"DELETE"});
    setTeam(ts=>sortTeam(ts.filter(x=>x.id!==id)));
  };
  const delOrder=async(id)=>{await sb.q("orders").delete({eq:{id}});setOrders(os=>os.filter(o=>o.id!==id));};
  const updateStatus=async(id,status)=>{
    await sb.q("orders").update({status},{eq:{id}});
    setOrders(os=>upsertOrderList(os,{...os.find(o=>o.id===id),status,is_finalized:status==="open"?false:true}));
  };
  const saveCompany=async(co)=>{
    if(co.id){await sb.q("companies").update(co,{eq:{id:co.id}});setCompanies(cs=>cs.map(x=>x.id===co.id?co:x));}
    else{const r=await sb.q("companies").insert(co);if(r?.id){setCompanies(cs=>[...cs,r]);if(r.tax_enabled)await sb.q("ncf_config").insert({company_id:r.id,prefix:"B01",current_sequence:0,pad_length:8,sequence_start:1,sequence_end:0,auto_increment:true});}}
    await loadAll();
  };
  const saveCat=async(name)=>{await sb.q("categories").insert({name,sort_order:categories.length});setCategories(cs=>[...cs,name]);};
  const delCat=async(name)=>{await sb.q("categories").delete({eq:{name}});setCategories(cs=>cs.filter(c=>c!==name));};
  const renameCat=async(old,neu)=>{
    await sb.q("categories").update({name:neu},{eq:{name:old}});
    setCategories(cs=>cs.map(c=>c===old?neu:c));
    setProducts(ps=>ps.map(p=>p.category===old?{...p,category:neu}:p));
  };

  // Build tabs based on permissions
  const primaryTabs=[
    perm("orders")&&{id:"orders",icon:"📋",label:t.orders},
    perm("clients")&&{id:"clients",icon:"👥",label:t.clients},
    perm("products")&&{id:"products",icon:"📦",label:t.products},
    perm("settings")&&{id:"settings",icon:"⚙️",label:t.settings},
    {id:"more",icon:"⋯",label:t.more},
  ].filter(Boolean);

  const moreTabs=[
    perm("companies")&&{id:"companies",icon:"🏢",label:t.companies},
    perm("team")&&{id:"team",icon:"👔",label:t.team},
    {id:"logout",icon:"↩",label:t.logout},
  ].filter(Boolean);

  const handleTab=(id)=>{
    if(id==="more"){setMoreOpen(v=>!v);return;}
    if(id==="logout"){onLogout();return;}
    setMoreOpen(false);setTab(id);
  };

  const sharedProps={t,fmt,settings,showToast,askConfirm,isAdmin,perm,user,setLightbox};
  const orderBuilderProps={clients,products,categories,team,companies,ncfConfigs,cart,setQty,cartItems,subtotal,discount,setDiscount,total,taxLines,discountAmt,taxTotal,cartCount,selClient,setSelClient,selCompany,setSelCompany,activeCat,setActiveCat,searchQ,setSearchQ,notes,setNotes,selSp,setSelSp,useTax,setUseTax,payType,setPayType,creditDays,setCreditDays,finalizeOrder,saveOpenOrder,clearOrder,editingId,salesperson,setModal,orderMode,setOrderMode};

  const activeCfg=selCompany?ncfConfigs[selCompany?.id]:null;
  const pctVal=ncfPct(activeCfg);

  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",position:"relative"}}>
      {/* Top bar */}
      <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"10px 16px",display:"flex",alignItems:"center",gap:"10px",flexShrink:0,boxShadow:C.shadow}}>
        <span style={{fontSize:"22px"}}>🛒</span>
        <span style={{fontSize:"15px",fontWeight:"700",letterSpacing:"-0.03em",flexShrink:0}}>{t.appName}</span>
        <div style={{flex:1}}/>
        {tab==="orders"&&perm("orders")&&(
          <Btn size="sm" variant="primary" onClick={()=>{clearOrder();setModal("newOrder");}}>+ {t.newOrder}</Btn>
        )}
        <div style={{fontSize:"11px",color:C.muted,display:"flex",alignItems:"center",gap:"5px"}}>
          <span style={{width:6,height:6,borderRadius:"50%",background:C.success,display:"inline-block"}}/>
          {salesperson?.name||user?.email?.split("@")[0]}
        </div>
      </div>

      {/* NCF alert */}
      {pctVal>=80&&selCompany?.tax_enabled&&(
        <div style={{background:pctVal>=100?C.dangerSoft:C.warnSoft,borderBottom:`1px solid ${pctVal>=100?C.danger:C.warn}33`,padding:"8px 16px",fontSize:"12px",color:pctVal>=100?C.danger:C.warn,fontWeight:"500",flexShrink:0}}>
          {pctVal>=100?t.ncfExhausted:t.ncfWarning} — {selCompany.name}
        </div>
      )}

      {/* Main */}
      <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
        {tab==="orders"&&perm("orders")&&<OrdersView {...sharedProps} orders={orders} companies={companies} delOrder={delOrder} updateStatus={updateStatus} setPreviewDoc={setPreviewDoc} setModal={setModal} setEditObj={setEditObj} loadEditOrder={loadEditOrder} setFinalizingOrder={setFinalizingOrder}/>}
        {tab==="clients"&&perm("clients")&&<ClientsView {...sharedProps} clients={clients} orders={orders} saveClient={saveClient} delClient={delClient} setModal={setModal} setEditObj={setEditObj}/>}
        {tab==="products"&&perm("products")&&<ProductsView {...sharedProps} products={products} categories={categories} saveProduct={saveProduct} delProduct={delProduct} saveCat={saveCat} delCat={delCat} renameCat={renameCat} setModal={setModal} setEditObj={setEditObj}/>}
        {tab==="settings"&&perm("settings")&&<SettingsView {...sharedProps} saveSettings={saveSettings}/>}
        {tab==="companies"&&perm("companies")&&<CompaniesView {...sharedProps} companies={companies} saveCompany={saveCompany} ncfConfigs={ncfConfigs} setNcfConfigs={setNcfConfigs} setModal={setModal} setEditObj={setEditObj}/>}
        {tab==="team"&&perm("team")&&<TeamView {...sharedProps} team={team} savePerson={savePerson} delPerson={delPerson} setModal={setModal} setEditObj={setEditObj}/>}
      </div>

      {/* More overflow */}
      {moreOpen&&(
        <div onClick={()=>setMoreOpen(false)} style={{position:"fixed",inset:0,zIndex:90}}>
          <div className="fade" onClick={e=>e.stopPropagation()}
            style={{position:"absolute",bottom:62,right:8,background:C.surface,border:`1px solid ${C.border}`,borderRadius:"14px",boxShadow:C.shadowMd,overflow:"hidden",minWidth:"160px"}}>
            {moreTabs.map(tb=>(
              <button key={tb.id} onClick={()=>handleTab(tb.id)}
                style={{display:"flex",alignItems:"center",gap:"10px",width:"100%",padding:"13px 16px",border:"none",background:"transparent",color:tb.id==="logout"?C.danger:C.text,fontSize:"14px",fontWeight:"500",borderBottom:`1px solid ${C.border}`,cursor:"pointer",fontFamily:"inherit"}}>
                <span>{tb.icon}</span><span>{tb.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <div style={{background:C.surface,borderTop:`1px solid ${C.border}`,display:"flex",padding:"4px 0 max(4px,env(safe-area-inset-bottom))",flexShrink:0}}>
        {primaryTabs.map(tb=>{
          const active=tb.id!=="more"&&tab===tb.id;
          return(
            <button key={tb.id} onClick={()=>handleTab(tb.id)}
              style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:"3px",padding:"6px 4px",border:"none",background:"transparent",color:active?C.accent:C.muted,cursor:"pointer"}}>
              <span style={{fontSize:"18px",lineHeight:1}}>{tb.icon}</span>
              <span style={{fontSize:"10px",fontWeight:active?"700":"500"}}>{tb.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Modals ── */}
      {modal==="newOrder"&&(
        <Sheet title={editingId?`${t.edit} ${t.orders}`:t.newOrder} onClose={requestCloseOrder} wide disableBackdropClose disableSwipeClose
          titleBadge={selCompany&&<Badge color={selCompany.tax_enabled?C.fiscal:C.info} bg={selCompany.tax_enabled?C.fiscalSoft:C.infoSoft}>{selCompany.name}</Badge>}>
          <OrderBuilder {...orderBuilderProps} t={t} fmt={fmt} settings={settings}/>
        </Sheet>
      )}
      {modal==="clientPick"&&<Sheet title={t.selectClient} onClose={()=>setModal("newOrder")}><ClientPickModal t={t} clients={clients} onPick={c=>{setSelClient(c);setModal("newOrder");}} onNew={()=>setModal("client")}/></Sheet>}
      {modal==="client"&&<Sheet title={editObj?t.edit:t.addClient} onClose={()=>{setModal(null);setEditObj(null);}}><ClientForm t={t} client={editObj} onSave={async c=>{await saveClient(c);setModal(null);setEditObj(null);showToast("Saved ✓");}}/></Sheet>}
      {modal==="product"&&<Sheet title={editObj?t.edit:t.addProduct} onClose={()=>{setModal(null);setEditObj(null);}}><ProductForm t={t} product={editObj} categories={categories} onSave={async p=>{await saveProduct(p);setModal(null);setEditObj(null);showToast("Saved ✓");}}/></Sheet>}
      {modal==="person"&&<Sheet title={editObj?t.edit:t.addMember} onClose={()=>{setModal(null);setEditObj(null);}}><PersonForm t={t} person={editObj} onSave={async p=>{try{await savePerson(p);setModal(null);setEditObj(null);showToast("Saved ✓");}catch(e){showToast(e.message||"Unable to save user",4000);}}}/></Sheet>}
      {modal==="company"&&<Sheet title={editObj?t.editCompany:t.addCompany} onClose={()=>{setModal(null);setEditObj(null);}}>
        <CompanyForm t={t} company={editObj} ncfConfig={editObj?ncfConfigs[editObj.id]:null}
          onSave={async(co,ncfCfg)=>{
            await saveCompany(co);
            if(ncfCfg&&co.tax_enabled){
              const id=co.id||companies.find(c=>c.name===co.name)?.id;
              if(id){await sb.q("ncf_config").upsert({...ncfCfg,company_id:id});setNcfConfigs(prev=>({...prev,[id]:ncfCfg}));}
            }
            setModal(null);setEditObj(null);showToast("Saved ✓");
          }}/>
      </Sheet>}
      {modal==="clientProfile"&&editObj&&<Sheet title={t.clientProfile} onClose={()=>{setModal(null);setEditObj(null);}} wide><ClientProfileView t={t} fmt={fmt} client={editObj} orders={orders} companies={companies} loadEditOrder={o=>{loadEditOrder(o);setModal(null);setEditObj(null);}}/></Sheet>}
      {modal==="status"&&editObj&&<Sheet title={t.changeStatus} onClose={()=>{setModal(null);setEditObj(null);}}><StatusPicker t={t} current={editObj.status} onPick={async s=>{await updateStatus(editObj.id,s);setModal(null);setEditObj(null);showToast("Updated ✓");}}/></Sheet>}
      {modal==="catMgr"&&<Sheet title="Categories" onClose={()=>setModal(null)}><CatManager t={t} categories={categories} products={products} saveCat={saveCat} delCat={delCat} renameCat={renameCat} askConfirm={askConfirm}/></Sheet>}
      {modal==="invoice"&&previewDoc&&<Sheet title={`${(previewDoc.type||"").toUpperCase()} · ${previewDoc.order_number}`} onClose={()=>{setModal(null);setPreviewDoc(null);}} wide>
        <InvoicePreview t={t} doc={previewDoc} fmt={mkFmt(previewDoc.currency_symbol||settings.currencySymbol,previewDoc.currency_position||settings.currencyPosition)} company={previewDoc._company||companies.find(c=>c.id===previewDoc.company_id)}/>
      </Sheet>}

      {/* Finalize open order dialog */}
      {finalizingOrder&&(
        <FinalizeDialog t={t} order={finalizingOrder} companies={companies} settings={settings}
          onFinalize={async(type,co)=>{await finalizeOpenOrder(finalizingOrder,type,co);}}
          onClose={()=>setFinalizingOrder(null)} askConfirm={askConfirm}/>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   ORDERS VIEW
════════════════════════════════════════════════════════════ */
function OrdersView({t,fmt,orders,companies,delOrder,updateStatus,setPreviewDoc,setModal,setEditObj,loadEditOrder,askConfirm,isAdmin,perm,setFinalizingOrder}){
  const [q,setQ]=useState("");
  const [sf,setSf]=useState("all");
  const [coFilter,setCoFilter]=useState("all");

  const openOrders=orders.filter(o=>!o.is_finalized||o.status==="open");
  const doneOrders=orders.filter(o=>o.is_finalized&&o.status!=="open");

  const filtered=(sf==="open"?openOrders:sf==="all"?orders:doneOrders).filter(o=>{
    const snap=o.client_snapshot||{};
    const mq=!q||match({num:o.order_number,client:snap.name||"",sp:o.salesperson_name||"",ncf:o.ncf||""},q);
    const ms=sf==="all"||sf==="open"?true:(o.status===sf);
    const mc=coFilter==="all"||o.company_id===coFilter;
    return mq&&ms&&mc;
  });

  return(
    <div style={{flex:1,overflowY:"auto",padding:"14px"}}>
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder={t.search} style={{...iBase,marginBottom:"10px"}}/>
      <div style={{display:"flex",gap:"5px",overflowX:"auto",paddingBottom:"8px",marginBottom:"4px"}}>
        {["all","open","ordered","delivered","paid","cancelled"].map(s=>{
          const a=sf===s;
          const sc=s==="all"?C.accent:s==="open"?C.openOrder:STATUS[s]?.color||C.muted;
          return<button key={s} onClick={()=>setSf(s)} style={{padding:"5px 12px",borderRadius:"20px",border:`1px solid ${a?sc:C.border}`,whiteSpace:"nowrap",fontWeight:"600",fontSize:"12px",cursor:"pointer",background:a?sc:C.surface,color:a?"#fff":C.muted}}>
            {s==="all"?t.all:t[s]||s}
          </button>;
        })}
        {companies.length>1&&companies.map(co=>{
          const a=coFilter===co.id;
          return<button key={co.id} onClick={()=>setCoFilter(a?"all":co.id)} style={{padding:"5px 12px",borderRadius:"20px",border:`1px solid ${a?(co.tax_enabled?C.fiscal:C.info):C.border}`,whiteSpace:"nowrap",fontWeight:"600",fontSize:"12px",cursor:"pointer",background:a?(co.tax_enabled?C.fiscalSoft:C.infoSoft):C.surface,color:a?(co.tax_enabled?C.fiscal:C.info):C.muted}}>{co.name}</button>;
        })}
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
        {filtered.map(o=>{
          const snap=o.client_snapshot||{};
          const isOpen=!o.is_finalized||o.status==="open";
          const st=isOpen?STATUS.open:(STATUS[o.status]||STATUS.ordered);
          const co=companies.find(c=>c.id===o.company_id);
          const docFmt=mkFmt(o.currency_symbol||"$",o.currency_position||"before");
          return(
            <Card key={o.id} style={{borderLeft:`3px solid ${st.color}`}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:"10px"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap",marginBottom:"3px"}}>
                    <span style={{fontWeight:"700",fontSize:"14px"}}>{o.order_number}</span>
                    {isOpen
                      ?<Badge color={C.openOrder} bg={C.openOrderSoft}>📂 {t.open}</Badge>
                      :<><Badge color={o.type==="invoice"?C.success:C.info}>{o.type}</Badge>
                        <Badge color={st.color} bg={st.bg}>{t[o.status]||o.status}</Badge></>}
                    {o.is_fiscal&&o.ncf&&<Badge color={C.fiscal} bg={C.fiscalSoft}>NCF</Badge>}
                    {o.due_date&&!isOpen&&<DueBadge dueDate={o.due_date} t={t}/>}
                  </div>
                  <div style={{fontSize:"13px",fontWeight:"500"}}>{snap.name}</div>
                  <div style={{fontSize:"11px",color:C.muted,marginTop:"2px"}}>
                    {fmtDate(o.created_at)}{o.salesperson_name?` · ${o.salesperson_name}`:""}
                    {co&&<span style={{color:o.is_fiscal?C.fiscal:C.info}}> · {co.name}</span>}
                  </div>
                  {o.ncf&&<div style={{fontSize:"11px",color:C.fiscal,marginTop:"2px",fontWeight:"600",letterSpacing:"0.01em"}}>NCF: {o.ncf}</div>}
                </div>
                <div style={{fontWeight:"700",fontSize:"15px",flexShrink:0}}>{docFmt(o.total)}</div>
              </div>
              <Divider my={10}/>
              <div style={{display:"flex",gap:"5px",flexWrap:"wrap"}}>
                {isOpen?(
                  <>
                    <Btn size="sm" variant="open" onClick={()=>setFinalizingOrder(o)}>🧾 {t.finalizeOrder}</Btn>
                    <Btn size="sm" variant="ghost" onClick={()=>loadEditOrder(o)}>{t.edit}</Btn>
                  </>
                ):(
                  <>
                    <Btn size="sm" variant="soft" onClick={()=>{setPreviewDoc({...o,_company:co});setModal("invoice");}}>View</Btn>
                    <Btn size="sm" variant="ghost" onClick={()=>loadEditOrder(o)}>{t.edit}</Btn>
                    <Btn size="sm" variant="ghost" onClick={()=>{setEditObj(o);setModal("status");}}>{t.status}</Btn>
                  </>
                )}
                {isAdmin&&<Btn size="sm" variant="ghost" onClick={()=>askConfirm(t.confirmDelete,()=>delOrder(o.id))} style={{color:C.danger,marginLeft:"auto"}}>✕</Btn>}
              </div>
            </Card>
          );
        })}
        {filtered.length===0&&<div style={{textAlign:"center",color:C.muted,padding:"60px 20px"}}>{t.noOrders}</div>}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   FINALIZE DIALOG
════════════════════════════════════════════════════════════ */
function FinalizeDialog({t,order,companies,settings,onFinalize,onClose,askConfirm}){
  const [selCo,setSelCo]=useState(companies.find(c=>c.id===order.company_id)||companies[0]);
  const [type,setType]=useState("invoice");
  const [busy,setBusy]=useState(false);
  const snap=order.client_snapshot||{};
  const fmt=mkFmt(order.currency_symbol||settings.currencySymbol,order.currency_position||settings.currencyPosition);

  // Recalc with tax if fiscal
  const isFiscal=selCo?.tax_enabled&&type==="invoice";
  const sub=order.subtotal;
  const dAmt=order.discount_amt;
  const afterD=sub-dAmt;
  const tLines=isFiscal?(settings.taxes||[]).filter(tx=>tx.rate>0).map(tx=>({...tx,amt:afterD*(tx.rate/100)})):[];
  const tTotal=tLines.reduce((s,tx)=>s+tx.amt,0);
  const tot=afterD+tTotal;

  const go=async()=>{
    setBusy(true);
    await onFinalize(type,selCo);
    setBusy(false);
  };

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:300,backdropFilter:"blur(4px)"}}>
      <div className="sheet" style={{background:C.surface,borderRadius:"20px 20px 0 0",width:"100%",maxWidth:"520px",maxHeight:"88vh",display:"flex",flexDirection:"column",boxShadow:"0 -6px 32px rgba(0,0,0,.1)"}}>
        <div style={{padding:"10px 0 4px",display:"flex",justifyContent:"center"}}>
          <div style={{width:36,height:4,background:C.border,borderRadius:4}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 18px 14px",borderBottom:`1px solid ${C.border}`}}>
          <span style={{fontSize:"15px",fontWeight:"600"}}>🧾 {t.finalizeOrder}</span>
          <button onClick={onClose} style={{background:C.accentSoft,border:"none",borderRadius:"50%",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",color:C.muted,fontSize:"14px"}}>✕</button>
        </div>
        <div style={{overflowY:"auto",padding:"18px",display:"flex",flexDirection:"column",gap:"14px"}}>
          {/* Client */}
          <div style={{background:C.bg,borderRadius:"9px",padding:"10px 13px"}}>
            <div style={{fontWeight:"600",fontSize:"14px"}}>{snap.name}</div>
            <div style={{fontSize:"12px",color:C.muted}}>{order.order_number} · {(order.items||[]).length} item(s)</div>
          </div>

          {/* Company selector — determines fiscal vs commercial */}
          <div>
            <div style={{fontSize:"11px",fontWeight:"600",color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:"8px"}}>{t.company}</div>
            <div style={{display:"flex",gap:"7px"}}>
              {companies.filter(c=>c.is_active).map(co=>(
                <button key={co.id} onClick={()=>setSelCo(co)}
                  style={{flex:1,padding:"10px",borderRadius:"9px",fontFamily:"inherit",fontWeight:"600",fontSize:"13px",cursor:"pointer",border:`1.5px solid ${selCo?.id===co.id?(co.tax_enabled?C.fiscal:C.accent):C.border}`,background:selCo?.id===co.id?(co.tax_enabled?C.fiscalSoft:C.accentSoft):C.bg,color:selCo?.id===co.id?(co.tax_enabled?C.fiscal:C.accent):C.muted}}>
                  {co.name}
                  {co.tax_enabled&&<span style={{display:"block",fontSize:"10px",fontWeight:"400",marginTop:"2px",opacity:0.7}}>Fiscal · NCF</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Type */}
          <div style={{display:"flex",gap:"8px"}}>
            {["invoice","quotation"].map(tp=>(
              <button key={tp} onClick={()=>setType(tp)}
                style={{flex:1,padding:"9px",borderRadius:"9px",fontFamily:"inherit",fontWeight:"600",fontSize:"13px",cursor:"pointer",border:`1.5px solid ${type===tp?(selCo?.tax_enabled?C.fiscal:C.accent):C.border}`,background:type===tp?(selCo?.tax_enabled?C.fiscalSoft:C.accentSoft):C.bg,color:type===tp?(selCo?.tax_enabled?C.fiscal:C.accent):C.muted}}>
                {tp==="invoice"?`🧾 ${t.invoice}`:`📄 ${t.quotation}`}
              </button>
            ))}
          </div>

          {/* Items */}
          <div style={{display:"flex",flexDirection:"column",gap:"4px",fontSize:"13px"}}>
            {(order.items||[]).map((i,n)=>(
              <div key={n} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${C.border}`}}>
                <span>{i.name} <span style={{color:C.muted}}>×{i.qty}</span></span>
                <span style={{fontWeight:"600"}}>{fmt(i.price*i.qty)}</span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div style={{background:C.bg,borderRadius:"9px",padding:"10px 13px",display:"flex",flexDirection:"column",gap:"4px",fontSize:"13px"}}>
            <div style={{display:"flex",justifyContent:"space-between",color:C.muted}}><span>{t.subtotal}</span><span>{fmt(sub)}</span></div>
            {order.discount>0&&<div style={{display:"flex",justifyContent:"space-between",color:C.danger}}><span>−{order.discount}%</span><span>−{fmt(dAmt)}</span></div>}
            {tLines.map(tx=><div key={tx.id} style={{display:"flex",justifyContent:"space-between",color:C.fiscal}}><span>{tx.name} {tx.rate}%</span><span>+{fmt(tx.amt)}</span></div>)}
            <Divider my={4}/>
            <div style={{display:"flex",justifyContent:"space-between",fontWeight:"700",fontSize:"16px",color:isFiscal?C.fiscal:C.text}}><span>{t.total}</span><span>{fmt(tot)}</span></div>
          </div>

          {isFiscal&&<div style={{background:C.fiscalSoft,borderRadius:"8px",padding:"9px 12px",fontSize:"12px",color:C.fiscal,fontWeight:"500"}}>🟣 Se generará un NCF automáticamente al finalizar.</div>}

          <Btn onClick={go} full size="lg" variant={isFiscal?"fiscal":"primary"} disabled={busy}>
            {busy?t.loading:`✓ ${t.finalizeBtn}`}
          </Btn>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   ORDER BUILDER
════════════════════════════════════════════════════════════ */
function OrderBuilder({t,fmt,settings,clients,products,categories,team,companies,ncfConfigs,cart,setQty,cartItems,subtotal,discount,setDiscount,total,taxLines,discountAmt,taxTotal,cartCount,selClient,setSelClient,selCompany,setSelCompany,activeCat,setActiveCat,searchQ,setSearchQ,notes,setNotes,selSp,setSelSp,useTax,setUseTax,payType,setPayType,creditDays,setCreditDays,finalizeOrder,saveOpenOrder,clearOrder,editingId,salesperson,setModal,orderMode,setOrderMode}){
  const [showMore,setShowMore]=useState(false);
  const [lb,setLb]=useState(null);
  const isDesktop=useMediaQuery("(min-width: 980px)");
  const filtered=products.filter(p=>(activeCat==="All"||p.category===activeCat)&&match(p,searchQ));
  const cfg=selCompany?ncfConfigs[selCompany.id]:null;
  const nextNCF=cfg?buildNCF(cfg.prefix,cfg.current_sequence+1,cfg.pad_length):null;
  const canSubmit=!!selClient&&cartItems.length>0;

  const actions=orderMode==="open"
    ? <Btn onClick={saveOpenOrder} disabled={!canSubmit} variant="open" full size="lg">📂 {t.createOpenOrder}</Btn>
    : <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
        <Btn onClick={()=>finalizeOrder("quotation")} disabled={!canSubmit} variant="outline" full>📄 {t.quotation}</Btn>
        <Btn onClick={()=>finalizeOrder("invoice")} disabled={!canSubmit} variant={selCompany?.tax_enabled?"fiscal":"primary"} full>🧾 {t.invoice}</Btn>
      </div>;

  const summaryCard=(
    <Card style={{background:C.surface,padding:"16px",position:isDesktop?"sticky":"static",top:isDesktop?0:undefined}}>
      <div style={{fontSize:"11px",fontWeight:"700",color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:"12px"}}>
        {t.cart} · {cartCount} {t.qty}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
        {cartItems.length>0?cartItems.map(i=>(
          <div key={i.id} style={{display:"flex",justifyContent:"space-between",gap:"10px",fontSize:"13px"}}>
            <span style={{color:C.muted,lineHeight:"1.4"}}>{i.name} ×{i.qty}</span>
            <span style={{fontWeight:"600",whiteSpace:"nowrap"}}>{fmt(i.price*i.qty)}</span>
          </div>
        )):<div style={{fontSize:"13px",color:C.muted}}>{t.noItems}</div>}
      </div>
      <Divider my={12}/>
      <div style={{display:"flex",flexDirection:"column",gap:"6px",fontSize:"13px"}}>
        <div style={{display:"flex",justifyContent:"space-between",color:C.muted}}><span>{t.subtotal}</span><span>{fmt(subtotal)}</span></div>
        {discount>0&&<div style={{display:"flex",justifyContent:"space-between",color:C.danger}}><span>−{discount}%</span><span>−{fmt(discountAmt)}</span></div>}
        {taxLines.map(tx=><div key={tx.id} style={{display:"flex",justifyContent:"space-between",color:C.fiscal}}><span>{tx.name} {tx.rate}%</span><span>+{fmt(tx.amt)}</span></div>)}
        <Divider my={4}/>
        <div style={{display:"flex",justifyContent:"space-between",fontWeight:"700",fontSize:"16px"}}><span>{t.total}</span><span>{fmt(total)}</span></div>
      </div>
      <div style={{marginTop:"14px",display:"flex",flexDirection:"column",gap:"8px"}}>
        {actions}
        {editingId&&<Btn variant="ghost" full onClick={clearOrder}>{t.cancel}</Btn>}
      </div>
    </Card>
  );

  return(
    <div style={{display:"grid",gridTemplateColumns:isDesktop?"minmax(0,1fr) 300px":"1fr",gap:"16px",alignItems:"start"}}>
      {lb&&<Lightbox url={lb} onClose={()=>setLb(null)}/>}

      <div style={{display:"flex",flexDirection:"column",gap:"13px",paddingBottom:isDesktop?0:118}}>
        {/* Order mode selector */}
        <div style={{display:"flex",gap:"7px"}}>
          <button onClick={()=>setOrderMode("open")} style={{flex:1,padding:"9px",borderRadius:"9px",fontFamily:"inherit",fontWeight:"600",fontSize:"13px",cursor:"pointer",border:`1.5px solid ${orderMode==="open"?C.openOrder:C.border}`,background:orderMode==="open"?C.openOrderSoft:C.bg,color:orderMode==="open"?C.openOrder:C.muted}}>
            📂 {t.createOpenOrder}
          </button>
          <button onClick={()=>setOrderMode("invoice")} style={{flex:1,padding:"9px",borderRadius:"9px",fontFamily:"inherit",fontWeight:"600",fontSize:"13px",cursor:"pointer",border:`1.5px solid ${orderMode==="invoice"?C.accent:C.border}`,background:orderMode==="invoice"?C.accentSoft:C.bg,color:orderMode==="invoice"?C.accent:C.muted}}>
            🧾 {t.invoice}
          </button>
        </div>

        {orderMode==="open"&&(
          <div style={{background:C.openOrderSoft,borderRadius:"9px",padding:"9px 13px",fontSize:"12px",color:C.openOrder,fontWeight:"500"}}>
            📂 {t.openOrderNote}
          </div>
        )}

        {/* Company selector — stable, user-driven */}
        {companies.length>1&&(
          <div>
            <div style={{fontSize:"11px",fontWeight:"600",color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:"7px"}}>{t.company}</div>
            <div style={{display:"flex",gap:"7px",flexWrap:"wrap"}}>
              {companies.filter(c=>c.is_active).map(co=>(
                <button key={co.id}
                  onClick={()=>{
                    setSelCompany(co);
                    setUseTax(co.tax_enabled);
                  }}
                  style={{flex:"1 1 180px",padding:"10px",borderRadius:"9px",fontFamily:"inherit",fontWeight:"600",fontSize:"13px",cursor:"pointer",border:`1.5px solid ${selCompany?.id===co.id?(co.tax_enabled?C.fiscal:C.accent):C.border}`,background:selCompany?.id===co.id?(co.tax_enabled?C.fiscalSoft:C.accentSoft):C.bg,color:selCompany?.id===co.id?(co.tax_enabled?C.fiscal:C.accent):C.muted}}>
                  {co.name}
                  {co.tax_enabled&&<span style={{display:"block",fontSize:"10px",fontWeight:"400",marginTop:"2px",opacity:0.7}}>Fiscal · ITBIS</span>}
                </button>
              ))}
            </div>
            {selCompany?.tax_enabled&&nextNCF&&orderMode==="invoice"&&(
              <div style={{marginTop:"7px",background:C.fiscalSoft,borderRadius:"8px",padding:"7px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:"8px"}}>
                <span style={{fontSize:"11px",color:C.fiscal,fontWeight:"600"}}>{t.ncfNext}</span>
                <span style={{fontSize:"13px",color:C.fiscal,fontWeight:"700",letterSpacing:"0.02em",wordBreak:"break-all"}}>{nextNCF}</span>
              </div>
            )}
          </div>
        )}

        {/* Client */}
        {selClient?(
          <div style={{display:"flex",alignItems:"center",gap:"10px",background:C.accentSoft,borderRadius:"10px",padding:"10px 13px"}}>
            {selClient.image_url?<img src={selClient.image_url} style={{width:30,height:30,borderRadius:"50%",objectFit:"cover",flexShrink:0}}/>:<div style={{width:30,height:30,borderRadius:"50%",background:C.accent,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"700",fontSize:"13px",flexShrink:0}}>{selClient.name?.[0]}</div>}
            <div style={{flex:1,minWidth:0}}><div style={{fontWeight:"600",fontSize:"13px"}}>{selClient.name}</div>{selClient.rnc&&<div style={{fontSize:"11px",color:C.muted}}>RNC: {selClient.rnc}</div>}</div>
            <Btn size="sm" variant="ghost" onClick={()=>setSelClient(null)}>{t.change}</Btn>
          </div>
        ):(
          <Btn full variant="soft" onClick={()=>setModal("clientPick")}>👤 {t.selectClient}</Btn>
        )}

        {/* Payment type (only for direct invoice mode) */}
        {orderMode==="invoice"&&(
          <>
            <div style={{display:"flex",gap:"8px"}}>
              {["cash","credit"].map(pt=>(
                <button key={pt} onClick={()=>setPayType(pt)}
                  style={{flex:1,padding:"9px",borderRadius:"9px",fontFamily:"inherit",fontWeight:"600",fontSize:"13px",cursor:"pointer",border:`1.5px solid ${payType===pt?C.accent:C.border}`,background:payType===pt?C.accentSoft:C.bg,color:payType===pt?C.accent:C.muted}}>
                  {pt==="cash"?`💵 ${t.cash}`:`📅 ${t.credit}`}
                </button>
              ))}
            </div>
            {payType==="credit"&&(
              <div>
                <div style={{fontSize:"11px",fontWeight:"600",color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:"7px"}}>{t.creditDays}</div>
                <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
                  {[15,30,45,60].map(d=><button key={d} onClick={()=>setCreditDays(d)} style={{padding:"6px 13px",borderRadius:"8px",border:`1.5px solid ${creditDays===d?C.accent:C.border}`,background:creditDays===d?C.accentSoft:C.bg,color:creditDays===d?C.accent:C.muted,fontFamily:"inherit",fontWeight:"600",fontSize:"13px",cursor:"pointer"}}>{d}d</button>)}
                  <input type="number" placeholder={t.customDays} value={![15,30,45,60].includes(creditDays)?creditDays:""} onChange={e=>setCreditDays(parseInt(e.target.value)||30)} style={{...iBase,width:"100px",padding:"6px 9px",fontSize:"13px"}}/>
                </div>
                {creditDays>0&&<div style={{fontSize:"12px",color:C.info,marginTop:"6px"}}>{t.dueDate}: <b>{fmtDate(addDays(creditDays))}</b></div>}
              </div>
            )}
          </>
        )}

        {/* Salesperson */}
        {team.length>0&&(
          <Sel label={t.salesperson} value={selSp} onChange={setSelSp}
            options={[{value:"",label:t.selectSp},...team.map(s=>({value:s.id,label:s.name}))]}/>
        )}

        {/* Categories + Search */}
        <div style={{display:"flex",gap:"5px",overflowX:"auto"}}>
          {["All",...categories].map(c=><button key={c} onClick={()=>setActiveCat(c)} style={{padding:"5px 11px",borderRadius:"20px",border:"none",cursor:"pointer",fontWeight:"500",fontSize:"12px",whiteSpace:"nowrap",background:activeCat===c?C.accent:C.accentSoft,color:activeCat===c?"#fff":C.muted}}>{c}</button>)}
        </div>
        <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder={`🔍 ${t.searchProducts}`} style={iBase}/>

        {/* Product grid */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:"8px"}}>
          {filtered.map(p=>{
            const qty=cart[p.id]||0;
            return(
              <div key={p.id} style={{background:qty>0?C.accentSoft:C.bg,border:`1.5px solid ${qty>0?C.accent:C.border}`,borderRadius:"10px",padding:"10px",display:"flex",flexDirection:"column",gap:"6px"}}>
                {p.image_url&&<div onClick={()=>setLb(p.image_url)} style={{cursor:"zoom-in"}}><img src={p.image_url} style={{width:"100%",height:"68px",objectFit:"cover",borderRadius:"7px"}}/></div>}
                <div style={{fontSize:"10px",color:C.muted,textTransform:"uppercase"}}>{p.category}</div>
                <div style={{fontWeight:"600",fontSize:"13px",lineHeight:"1.3"}}>{p.name}</div>
                <div style={{fontWeight:"700",fontSize:"13px"}}>{fmt(p.price)}<span style={{color:C.muted,fontWeight:"400",fontSize:"10px"}}> /{p.unit}</span></div>
                <div style={{display:"flex",alignItems:"center",gap:"4px"}}>
                  <button onClick={()=>setQty(p.id,qty-1)} style={{width:25,height:25,borderRadius:"7px",border:"none",background:qty>0?C.border:C.bg,color:qty>0?C.accent:C.mutedLight,fontSize:"16px",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"700"}}>−</button>
                  <QtyInput value={qty} onChange={v=>setQty(p.id,v)}/>
                  <button onClick={()=>setQty(p.id,qty+1)} style={{width:25,height:25,borderRadius:"7px",border:"none",background:C.accentSoft,color:C.accent,fontSize:"16px",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"700"}}>+</button>
                </div>
              </div>
            );
          })}
        </div>

        {cartItems.length>0&&(
          <Card style={{background:C.bg}}>
            <div style={{display:"flex",flexDirection:"column",gap:"6px",fontSize:"13px"}}>
              {cartItems.map(i=><div key={i.id} style={{display:"flex",justifyContent:"space-between",gap:"10px"}}><span style={{color:C.muted}}>{i.name} ×{i.qty}</span><span style={{fontWeight:"600"}}>{fmt(i.price*i.qty)}</span></div>)}
            </div>
          </Card>
        )}

        {/* Hidden options (tax/discount) */}
        <button onClick={()=>setShowMore(v=>!v)} style={{background:"none",border:`1px dashed ${C.border}`,borderRadius:"8px",padding:"8px",color:C.muted,fontSize:"12px",cursor:"pointer",fontFamily:"inherit"}}>
          {showMore?`▲ ${t.hideOptions}`:`▼ ${t.moreOptions}`}
        </button>
        {showMore&&(
          <div style={{display:"flex",flexDirection:"column",gap:"10px",padding:"12px",background:C.bg,borderRadius:"10px",border:`1px solid ${C.border}`}}>
            {selCompany?.tax_enabled&&orderMode==="invoice"&&(
              <Toggle on={useTax} onToggle={()=>setUseTax(v=>!v)} label={useTax?t.withTax:t.withoutTax}/>
            )}
            <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
              <span style={{fontSize:"12px",color:C.muted,whiteSpace:"nowrap"}}>{t.discount}</span>
              <input type="number" min="0" max="100" value={discount} onChange={e=>setDiscount(+e.target.value)} style={{...iBase,width:"72px",padding:"6px 8px",fontSize:"13px",textAlign:"center"}}/>
              <span style={{fontSize:"12px",color:C.muted}}>%</span>
            </div>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder={t.notes} rows={2} style={{...iBase,resize:"vertical",fontSize:"13px"}}/>
          </div>
        )}

        {!isDesktop&&(
          <div style={{position:"sticky",bottom:"-18px",margin:"0 -18px -18px",padding:"12px 14px calc(12px + env(safe-area-inset-bottom))",background:"rgba(255,255,255,.96)",backdropFilter:"blur(10px)",borderTop:`1px solid ${C.border}`,display:"flex",flexDirection:"column",gap:"10px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",gap:"10px"}}>
              <div>
                <div style={{fontSize:"11px",fontWeight:"700",color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em"}}>{t.total}</div>
                <div style={{fontSize:"20px",fontWeight:"700"}}>{fmt(total)}</div>
              </div>
              <div style={{fontSize:"12px",color:C.muted,textAlign:"right"}}>
                <div>{t.subtotal}: {fmt(subtotal)}</div>
                {discount>0&&<div style={{color:C.danger}}>−{fmt(discountAmt)}</div>}
              </div>
            </div>
            {actions}
          </div>
        )}
      </div>

      {isDesktop&&summaryCard}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   CLIENTS VIEW
════════════════════════════════════════════════════════════ */
function ClientsView({t,fmt,clients,orders,saveClient,delClient,setModal,setEditObj,askConfirm,showToast,setLightbox}){
  const [q,setQ]=useState("");
  return(
    <div style={{flex:1,overflowY:"auto",padding:"14px"}}>
      <div style={{display:"flex",gap:"8px",marginBottom:"12px"}}>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder={t.searchClients} style={{...iBase,flex:1}}/>
        <Btn onClick={()=>{setEditObj(null);setModal("client");}}>+ {t.addClient}</Btn>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
        {clients.filter(c=>match(c,q)).map(c=>{
          const co=orders.filter(o=>o.client_id===c.id||o.client_snapshot?.id===c.id);
          const collected=co.filter(o=>o.status==="paid").reduce((s,o)=>s+o.total,0);
          const owed=co.filter(o=>["ordered","delivered"].includes(o.status)).reduce((s,o)=>s+o.total,0);
          return(
            <Card key={c.id}>
              <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                {c.image_url?<img src={c.image_url} onClick={()=>setLightbox(c.image_url)} style={{width:40,height:40,borderRadius:"50%",objectFit:"cover",flexShrink:0,cursor:"zoom-in"}}/>:<div style={{width:40,height:40,borderRadius:"50%",background:C.accentSoft,color:C.accent,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"700",fontSize:"15px",flexShrink:0}}>{c.name?.[0]}</div>}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:"600",fontSize:"14px"}}>{c.name}</div>
                  <div style={{fontSize:"12px",color:C.muted}}>{[c.email,c.phone,c.rnc?`RNC: ${c.rnc}`:""].filter(Boolean).join(" · ")}</div>
                  <div style={{display:"flex",gap:"8px",marginTop:"4px"}}>
                    <span style={{fontSize:"12px"}}><b style={{color:C.success}}>{fmt(collected)}</b> <span style={{color:C.muted}}>{t.collected}</span></span>
                    {owed>0&&<span style={{fontSize:"12px"}}><b style={{color:C.danger}}>{fmt(owed)}</b> <span style={{color:C.muted}}>{t.owed}</span></span>}
                  </div>
                </div>
              </div>
              <Divider my={10}/>
              <div style={{display:"flex",gap:"6px"}}>
                <Btn size="sm" variant="soft" onClick={()=>{setEditObj(c);setModal("clientProfile");}}>{t.viewProfile}</Btn>
                <Btn size="sm" variant="ghost" onClick={()=>{setEditObj(c);setModal("client");}}>{t.edit}</Btn>
                <Btn size="sm" variant="ghost" onClick={()=>askConfirm(t.confirmDelete,()=>delClient(c.id))} style={{color:C.danger,marginLeft:"auto"}}>✕</Btn>
              </div>
            </Card>
          );
        })}
        {clients.filter(c=>match(c,q)).length===0&&<div style={{textAlign:"center",color:C.muted,padding:"60px 20px"}}>{t.noClients}</div>}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   PRODUCTS VIEW
════════════════════════════════════════════════════════════ */
function ProductsView({t,fmt,products,categories,saveProduct,delProduct,saveCat,delCat,renameCat,setModal,setEditObj,askConfirm,setLightbox}){
  const [q,setQ]=useState("");const [cat,setCat]=useState("All");
  const filtered=products.filter(p=>(cat==="All"||p.category===cat)&&match(p,q));
  return(
    <div style={{flex:1,overflowY:"auto",padding:"14px"}}>
      <div style={{display:"flex",gap:"8px",marginBottom:"10px",flexWrap:"wrap"}}>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder={t.search} style={{...iBase,flex:1,minWidth:"130px"}}/>
        <Btn size="sm" variant="ghost" onClick={()=>setModal("catMgr")}>🏷</Btn>
        <Btn onClick={()=>{setEditObj(null);setModal("product");}}>+</Btn>
      </div>
      <div style={{display:"flex",gap:"5px",overflowX:"auto",marginBottom:"12px"}}>
        {["All",...categories].map(c=><button key={c} onClick={()=>setCat(c)} style={{padding:"5px 11px",borderRadius:"20px",border:"none",cursor:"pointer",fontWeight:"500",fontSize:"12px",whiteSpace:"nowrap",background:cat===c?C.accent:C.accentSoft,color:cat===c?"#fff":C.muted}}>{c}</button>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:"8px"}}>
        {filtered.map(p=>(
          <Card key={p.id} pad={12}>
            {p.image_url&&<div onClick={()=>setLightbox(p.image_url)} style={{marginBottom:"8px",cursor:"zoom-in"}}><img src={p.image_url} style={{width:"100%",height:"86px",objectFit:"cover",borderRadius:"8px"}}/></div>}
            <div style={{fontSize:"10px",color:C.muted,textTransform:"uppercase",marginBottom:"3px"}}>{p.category}</div>
            <div style={{fontWeight:"600",fontSize:"13px",marginBottom:"4px"}}>{p.name}</div>
            <div style={{fontWeight:"700",fontSize:"15px"}}>{fmt(p.price)}<span style={{color:C.muted,fontWeight:"400",fontSize:"10px"}}> /{p.unit}</span></div>
            <div style={{display:"flex",gap:"5px",marginTop:"10px"}}>
              <Btn size="sm" variant="ghost" onClick={()=>{setEditObj(p);setModal("product");}}>{t.edit}</Btn>
              <Btn size="sm" variant="ghost" onClick={()=>askConfirm(t.confirmDelete,()=>delProduct(p.id))} style={{color:C.danger}}>✕</Btn>
            </div>
          </Card>
        ))}
        {filtered.length===0&&<div style={{gridColumn:"1/-1",textAlign:"center",color:C.muted,padding:"60px 20px"}}>{t.noProducts}</div>}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   COMPANIES VIEW
════════════════════════════════════════════════════════════ */
function CompaniesView({t,companies,saveCompany,ncfConfigs,setNcfConfigs,setModal,setEditObj,showToast,askConfirm}){
  return(
    <div style={{flex:1,overflowY:"auto",padding:"14px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}>
        <h2 style={{fontSize:"17px",fontWeight:"700"}}>{t.companies}</h2>
        <Btn onClick={()=>{setEditObj(null);setModal("company");}}>+ {t.addCompany}</Btn>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
        {companies.map(co=>{
          const cfg=ncfConfigs[co.id];
          const pct=ncfPct(cfg);
          return(
            <Card key={co.id} style={{borderLeft:`3px solid ${co.tax_enabled?C.fiscal:C.info}`}}>
              <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                {co.logo?<img src={co.logo} style={{width:44,height:44,objectFit:"contain",borderRadius:"8px",border:`1px solid ${C.border}`,padding:"4px",background:"#fff"}}/>:<div style={{width:44,height:44,borderRadius:"8px",background:co.tax_enabled?C.fiscalSoft:C.accentSoft,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"20px"}}>🏢</div>}
                <div style={{flex:1}}>
                  <div style={{fontWeight:"700",fontSize:"14px"}}>{co.name}</div>
                  {co.rnc&&<div style={{fontSize:"12px",color:C.muted}}>RNC: {co.rnc}</div>}
                  <div style={{display:"flex",gap:"6px",marginTop:"4px",flexWrap:"wrap"}}>
                    <Badge color={co.tax_enabled?C.fiscal:C.info} bg={co.tax_enabled?C.fiscalSoft:C.infoSoft}>{co.tax_enabled?"Fiscal":"Commercial"}</Badge>
                    {cfg&&<Badge color={pct>=80?C.danger:C.muted}>NCF: {cfg.current_sequence}/{cfg.sequence_end||"∞"}</Badge>}
                  </div>
                </div>
                <Btn size="sm" variant="ghost" onClick={()=>{setEditObj(co);setModal("company");}}>{t.edit}</Btn>
              </div>
              {cfg&&cfg.sequence_end>0&&pct>0&&(
                <div style={{marginTop:"10px"}}>
                  <div style={{height:4,background:C.bg,borderRadius:"4px",overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${Math.min(pct,100)}%`,background:pct>=100?C.danger:pct>=80?C.warn:C.success,borderRadius:"4px",transition:"width .3s"}}/>
                  </div>
                  <div style={{fontSize:"11px",color:C.muted,marginTop:"4px"}}>{pct}% NCF used</div>
                </div>
              )}
            </Card>
          );
        })}
        {companies.length===0&&<div style={{textAlign:"center",color:C.muted,padding:"60px 20px"}}>{t.noCompanies}</div>}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   TEAM VIEW — with permissions editor
════════════════════════════════════════════════════════════ */
function TeamView({t,team,savePerson,delPerson,setModal,setEditObj,askConfirm,showToast}){
  return(
    <div style={{flex:1,overflowY:"auto",padding:"14px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}>
        <h2 style={{fontSize:"17px",fontWeight:"700"}}>{t.team}</h2>
        <Btn onClick={()=>{setEditObj(null);setModal("person");}}>+ {t.addMember}</Btn>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
        {team.map(p=>{
          const perms=p.permissions||DEFAULT_PERMS;
          return(
            <Card key={p.id}>
              <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                <div style={{width:38,height:38,borderRadius:"50%",background:C.accentSoft,color:C.accent,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"700",fontSize:"15px",flexShrink:0}}>{p.name?.[0]}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:"600",fontSize:"14px"}}>{p.name} {p.is_admin&&<Badge color={C.warn}>Admin</Badge>}</div>
                  <div style={{fontSize:"12px",color:C.muted}}>{visibleTeamContact(p)}</div>
                  <div style={{display:"flex",gap:"4px",marginTop:"5px",flexWrap:"wrap"}}>
                    {ALL_PERMS.map(pk=>(
                      <span key={pk} style={{fontSize:"10px",padding:"2px 6px",borderRadius:"4px",background:(p.is_admin||perms[pk])?C.successSoft:C.bg,color:(p.is_admin||perms[pk])?C.success:C.mutedLight,fontWeight:"600"}}>
                        {t[`perm${pk.charAt(0).toUpperCase()+pk.slice(1)}`]||pk}
                      </span>
                    ))}
                  </div>
                </div>
                <Btn size="sm" variant="ghost" onClick={()=>{setEditObj(p);setModal("person");}}>{t.edit}</Btn>
                <Btn size="sm" variant="ghost" onClick={()=>askConfirm(t.confirmDelete,async()=>{try{await delPerson(p.id);}catch(e){showToast(e.message||"Unable to delete user",4000);}})} style={{color:C.danger}}>✕</Btn>
              </div>
            </Card>
          );
        })}
        {team.length===0&&<div style={{textAlign:"center",color:C.muted,padding:"60px 20px"}}>{t.noTeam}</div>}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   SETTINGS VIEW
════════════════════════════════════════════════════════════ */
function SettingsView({t,settings,saveSettings,showToast}){
  const [s,setS]=useState(settings);
  const [val,setVal]=useState("");
  const [seqBusy,setSeqBusy]=useState(true);
  useEffect(()=>setS(settings),[settings]);
  useEffect(()=>{
    sb.q("app_settings").select("*",{eq:{key:"order_sequence"}}).then(rows=>{
      if(Array.isArray(rows)&&rows[0])setVal(rows[0].value);
      setSeqBusy(false);
    });
  },[]);
  const saveSeq=async()=>{await sb.q("app_settings").update({value:String(parseInt(val)||1000)},{eq:{key:"order_sequence"}});showToast(t.sequenceSaved);};
  const upd=(k,v)=>setS(p=>({...p,[k]:v}));
  const addTax=()=>setS(p=>({...p,taxes:[...(p.taxes||[]),{id:uid(),name:"Tax",rate:0}]}));
  const removeTax=id=>setS(p=>({...p,taxes:p.taxes.filter(x=>x.id!==id)}));
  const updTax=(id,k,v)=>setS(p=>({...p,taxes:p.taxes.map(x=>x.id===id?{...x,[k]:v}:x)}));
  return(
    <div style={{flex:1,overflowY:"auto",padding:"14px"}}>
      <div style={{display:"flex",flexDirection:"column",gap:"12px",maxWidth:"520px",margin:"0 auto"}}>
        <Card>
          <div style={{fontSize:"11px",fontWeight:"700",color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:"12px"}}>🌐 {t.language}</div>
          <div style={{display:"flex",gap:"8px"}}>
            {[{v:"en",l:"English 🇬🇧"},{v:"es",l:"Español 🇩🇴"}].map(ln=>(
              <button key={ln.v} onClick={()=>upd("lang",ln.v)} style={{flex:1,padding:"10px",borderRadius:"8px",fontFamily:"inherit",fontWeight:"600",fontSize:"13px",cursor:"pointer",border:`1.5px solid ${s.lang===ln.v?C.accent:C.border}`,background:s.lang===ln.v?C.accentSoft:C.bg,color:s.lang===ln.v?C.accent:C.muted}}>{ln.l}</button>
            ))}
          </div>
        </Card>
        <Card>
          <div style={{fontSize:"11px",fontWeight:"700",color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:"12px"}}>💱 {t.currency}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
            <Inp label={t.currSymbol} value={s.currencySymbol} onChange={v=>upd("currencySymbol",v)} sm/>
            <div style={{display:"flex",flexDirection:"column",gap:"5px"}}>
              <label style={{fontSize:"11px",fontWeight:"600",color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em"}}>{t.currPos}</label>
              <div style={{display:"flex",gap:"6px"}}>
                {[{v:"before",l:`${s.currencySymbol||"RD$"}100`},{v:"after",l:`100${s.currencySymbol||"RD$"}`}].map(pos=>(
                  <button key={pos.v} onClick={()=>upd("currencyPosition",pos.v)} style={{flex:1,padding:"8px 4px",borderRadius:"8px",border:`1.5px solid ${s.currencyPosition===pos.v?C.accent:C.border}`,background:s.currencyPosition===pos.v?C.accentSoft:C.bg,color:s.currencyPosition===pos.v?C.accent:C.muted,fontFamily:"inherit",fontWeight:"600",fontSize:"12px",cursor:"pointer"}}>{pos.l}</button>
                ))}
              </div>
            </div>
          </div>
        </Card>
        <Card>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px"}}>
            <div style={{fontSize:"11px",fontWeight:"700",color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em"}}>🧾 {t.taxes}</div>
            <Btn size="sm" variant="soft" onClick={addTax}>{t.addTax}</Btn>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
            {(s.taxes||[]).map(tx=>(
              <div key={tx.id} style={{display:"grid",gridTemplateColumns:"1fr 80px auto",gap:"8px",alignItems:"flex-end"}}>
                <Inp value={tx.name} onChange={v=>updTax(tx.id,"name",v)} sm/>
                <Inp type="number" value={tx.rate} onChange={v=>updTax(tx.id,"rate",parseFloat(v)||0)} sm/>
                <button onClick={()=>removeTax(tx.id)} style={{background:"none",border:"none",color:C.danger,fontSize:"18px",cursor:"pointer",paddingBottom:"2px"}}>✕</button>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <div style={{fontSize:"11px",fontWeight:"700",color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:"10px"}}>📋 {t.orderNum}</div>
          {seqBusy?<div style={{color:C.muted,fontSize:"13px"}}>{t.loading}</div>:(
            <div style={{display:"flex",gap:"8px"}}>
              <Inp value={val} onChange={setVal} type="number" sm/>
              <Btn size="sm" variant="soft" onClick={saveSeq}>{t.save}</Btn>
            </div>
          )}
        </Card>
        <Btn onClick={()=>saveSettings(s)} full size="lg">{t.save}</Btn>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   FORM COMPONENTS
════════════════════════════════════════════════════════════ */
function ClientForm({t,client,onSave}){
  const [f,setF]=useState({name:"",email:"",phone:"",address:"",rnc:"",image_url:"",...client});
  const u=k=>v=>setF(p=>({...p,[k]:v}));
  return(
    <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
      <ImageUploader url={f.image_url} onUpload={url=>setF(p=>({...p,image_url:url}))} onRemove={()=>setF(p=>({...p,image_url:""}))} label="Client Photo"/>
      <Inp label={t.name} value={f.name} onChange={u("name")} required/>
      <Inp label={t.email} type="email" value={f.email} onChange={u("email")}/>
      <PhoneInp label={t.phone} value={f.phone} onChange={u("phone")}/>
      <Inp label={t.address} value={f.address} onChange={u("address")}/>
      <Inp label={t.rnc} value={f.rnc} onChange={u("rnc")} placeholder="Optional — for fiscal invoices"/>
      <Btn onClick={()=>f.name&&onSave(f)} full size="lg">{t.save}</Btn>
    </div>
  );
}

function ProductForm({t,product,categories,onSave}){
  const [f,setF]=useState({name:"",category:categories[0]||"",price:"",unit:"unit",image_url:"",...product,price:product?.price?.toString()||""});
  const [nc,setNc]=useState("");
  const u=k=>v=>setF(p=>({...p,[k]:v}));
  return(
    <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
      <ImageUploader url={f.image_url} onUpload={url=>setF(p=>({...p,image_url:url}))} onRemove={()=>setF(p=>({...p,image_url:""}))} label="Product Image"/>
      <Inp label={t.name} value={f.name} onChange={u("name")} required/>
      <Sel label={t.category} value={f.category} onChange={u("category")} options={categories.length?categories:["General"]}/>
      <div style={{display:"flex",gap:"8px",alignItems:"flex-end"}}>
        <div style={{flex:1}}><Inp label={t.newCat} value={nc} onChange={setNc} placeholder="New category name"/></div>
        <Btn size="sm" variant="soft" onClick={()=>nc.trim()&&(setF(p=>({...p,category:nc.trim()})),setNc(""))}>{t.add}</Btn>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
        <Inp label={t.price} type="number" value={f.price} onChange={u("price")} required/>
        <Inp label={t.unit} value={f.unit} onChange={u("unit")} placeholder="bottle, kg…"/>
      </div>
      <Btn onClick={()=>f.name&&f.price&&onSave({...f,price:parseFloat(f.price)})} full size="lg">{t.save}</Btn>
    </div>
  );
}

function CompanyForm({t,company,ncfConfig,onSave}){
  const [f,setF]=useState({name:"",rnc:"",phone:"",email:"",address:"",logo:"",tax_enabled:false,is_active:true,...company});
  const [ncf,setNcf]=useState({prefix:"B01",current_sequence:0,sequence_start:1,sequence_end:0,pad_length:8,auto_increment:true,...ncfConfig});
  const u=k=>v=>setF(p=>({...p,[k]:v}));
  const un=k=>v=>setNcf(p=>({...p,[k]:v}));
  const preview=buildNCF(ncf.prefix,ncf.current_sequence+1,ncf.pad_length);
  return(
    <div style={{display:"flex",flexDirection:"column",gap:"13px"}}>
      <ImageUploader url={f.logo} onUpload={url=>setF(p=>({...p,logo:url}))} onRemove={()=>setF(p=>({...p,logo:""}))} label="Company Logo"/>
      <Inp label={t.businessName} value={f.name} onChange={u("name")} required/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
        <PhoneInp label={t.bPhone} value={f.phone} onChange={u("phone")}/>
        <Inp label={t.bEmail} value={f.email} onChange={u("email")}/>
      </div>
      <Inp label={t.bAddress} value={f.address} onChange={u("address")}/>
      <Toggle on={f.tax_enabled} onToggle={()=>setF(p=>({...p,tax_enabled:!p.tax_enabled}))} label={t.taxEnabled}/>
      {f.tax_enabled&&(
        <div style={{background:C.fiscalSoft,borderRadius:"12px",padding:"14px",border:`1px solid ${C.fiscal}33`,display:"flex",flexDirection:"column",gap:"12px"}}>
          <div style={{fontSize:"12px",fontWeight:"700",color:C.fiscal,textTransform:"uppercase",letterSpacing:"0.06em"}}>🟣 {t.ncfConfig}</div>
          <Inp label={t.rnc} value={f.rnc} onChange={u("rnc")} placeholder="101-12345-6"/>
          <Inp label={t.ncfPrefix} value={ncf.prefix} onChange={un("prefix")} placeholder="B01"/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
            <Inp label={t.ncfSequence} type="number" value={ncf.current_sequence} onChange={v=>un("current_sequence")(parseInt(v)||0)}/>
            <Inp label={t.ncfPadLength} type="number" value={ncf.pad_length} onChange={v=>un("pad_length")(parseInt(v)||8)}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
            <Inp label={t.ncfStart} type="number" value={ncf.sequence_start} onChange={v=>un("sequence_start")(parseInt(v)||1)}/>
            <Inp label={t.ncfEnd} type="number" value={ncf.sequence_end} onChange={v=>un("sequence_end")(parseInt(v)||0)}/>
          </div>
          <div style={{background:C.surface,borderRadius:"9px",padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",border:`1px solid ${C.fiscal}44`}}>
            <span style={{fontSize:"12px",color:C.fiscal,fontWeight:"600"}}>{t.ncfNext}</span>
            <span style={{fontSize:"15px",color:C.fiscal,fontWeight:"700",letterSpacing:"0.02em",wordBreak:"break-all"}}>{preview}</span>
          </div>
        </div>
      )}
      <Btn onClick={()=>f.name&&onSave(f,ncf)} full size="lg">{t.save}</Btn>
    </div>
  );
}

function PersonForm({t,person,onSave}){
  const [f,setF]=useState({name:"",role:"",email:"",phone:"",password:"",is_admin:false,permissions:{...DEFAULT_PERMS},...person,password:"",permissions:{...DEFAULT_PERMS,...(person?.permissions||{})}});
  const u=k=>v=>setF(p=>({...p,[k]:v}));
  const togglePerm=pk=>setF(p=>({...p,permissions:{...p.permissions,[pk]:!p.permissions[pk]}}));
  const permLabels={orders:"Orders/Pedidos",clients:"Clients/Clientes",products:"Products/Productos",companies:"Companies/Empresas",team:"Team/Equipo",settings:"Settings/Ajustes"};
  const canSave=!!f.name&&!!(f.email||f.phone)&&(!person?.id||!!f.password);
  return(
    <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
      <Inp label={t.spName} value={f.name} onChange={u("name")} required/>
      <Inp label={t.role} value={f.role} onChange={u("role")}/>
      <Inp label={t.email} value={f.email} onChange={u("email")}/>
      <PhoneInp label={t.phone} value={f.phone} onChange={u("phone")}/>
      <Inp label={person?.id?t.newPassword:t.setPassword} value={f.password} onChange={u("password")} type="password" placeholder={person?.id?"Optional password reset":"Required"} required={!person?.id}/>
      <Toggle on={f.is_admin} onToggle={()=>setF(p=>({...p,is_admin:!p.is_admin,permissions:!p.is_admin?{...ADMIN_PERMS}:p.permissions}))} label="Admin (full access)"/>
      {!f.is_admin&&(
        <div style={{background:C.bg,borderRadius:"10px",padding:"13px",border:`1px solid ${C.border}`}}>
          <div style={{fontSize:"11px",fontWeight:"700",color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:"10px"}}>🔒 {t.permissions}</div>
          <div style={{display:"flex",flexDirection:"column",gap:"9px"}}>
            {ALL_PERMS.map(pk=>(
              <div key={pk} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:"13px",color:C.text}}>{permLabels[pk]||pk}</span>
                <Toggle on={!!f.permissions[pk]} onToggle={()=>togglePerm(pk)}/>
              </div>
            ))}
          </div>
        </div>
      )}
      <Btn onClick={()=>canSave&&onSave(f)} full size="lg" disabled={!canSave}>{t.save}</Btn>
    </div>
  );
}

function ClientPickModal({t,clients,onPick,onNew}){
  const [q,setQ]=useState("");
  return(
    <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder={t.searchClients} style={iBase}/>
      <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
        {clients.filter(c=>match(c,q)).map(c=>(
          <button key={c.id} onClick={()=>onPick(c)} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:"10px",padding:"11px 13px",cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:"10px"}}>
            {c.image_url?<img src={c.image_url} style={{width:32,height:32,borderRadius:"50%",objectFit:"cover",flexShrink:0}}/>:<div style={{width:32,height:32,borderRadius:"50%",background:C.accentSoft,color:C.accent,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"700",fontSize:"13px",flexShrink:0}}>{c.name?.[0]}</div>}
            <div>
              <div style={{fontWeight:"600",fontSize:"13px"}}>{c.name}</div>
              <div style={{fontSize:"11px",color:C.muted}}>{c.email}{c.rnc?` · RNC: ${c.rnc}`:""}</div>
            </div>
          </button>
        ))}
      </div>
      <Btn variant="ghost" full onClick={onNew}>+ {t.addClient}</Btn>
    </div>
  );
}

function ClientProfileView({t,fmt,client,orders,companies,loadEditOrder}){
  const co=orders.filter(o=>o.client_id===client.id||o.client_snapshot?.id===client.id);
  const collected=co.filter(o=>o.status==="paid").reduce((s,o)=>s+o.total,0);
  const owed=co.filter(o=>["ordered","delivered"].includes(o.status)).reduce((s,o)=>s+o.total,0);
  return(
    <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
      <div style={{display:"flex",gap:"12px",alignItems:"center"}}>
        {client.image_url?<img src={client.image_url} style={{width:52,height:52,borderRadius:"50%",objectFit:"cover"}}/>:<div style={{width:52,height:52,borderRadius:"50%",background:C.accentSoft,color:C.accent,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"700",fontSize:"20px"}}>{client.name?.[0]}</div>}
        <div>
          <div style={{fontWeight:"700",fontSize:"17px"}}>{client.name}</div>
          <div style={{fontSize:"12px",color:C.muted}}>{[client.email,client.phone].filter(Boolean).join(" · ")}</div>
          {client.rnc&&<div style={{fontSize:"12px",color:C.muted}}>RNC: {client.rnc}</div>}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px"}}>
        {[{l:t.totalOrders,v:co.length,c:C.info},{l:t.collected,v:fmt(collected),c:C.success},{l:t.owed,v:fmt(owed),c:owed>0?C.danger:C.muted}].map(s=>(
          <div key={s.l} style={{background:C.bg,borderRadius:"10px",padding:"12px",textAlign:"center"}}>
            <div style={{fontSize:"18px",fontWeight:"700",color:s.c}}>{s.v}</div>
            <div style={{fontSize:"11px",color:C.muted,marginTop:"2px"}}>{s.l}</div>
          </div>
        ))}
      </div>
      <Divider/>
      <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
        {co.map(o=>{
          const isOpen=!o.is_finalized||o.status==="open";
          const st=isOpen?STATUS.open:(STATUS[o.status]||STATUS.ordered);
          const comp=companies.find(c=>c.id===o.company_id);
          const docFmt=mkFmt(o.currency_symbol||"$",o.currency_position||"before");
          return(
            <div key={o.id} style={{background:C.bg,borderRadius:"9px",padding:"10px 12px",display:"flex",alignItems:"center",gap:"8px",borderLeft:`3px solid ${st.color}`}}>
              <div style={{flex:1}}>
                <div style={{fontWeight:"600",fontSize:"13px"}}>{o.order_number} <Badge color={st.color} bg={st.bg}>{isOpen?t.open:(t[o.status]||o.status)}</Badge></div>
                <div style={{fontSize:"11px",color:C.muted}}>{fmtDate(o.created_at)}{comp?` · ${comp.name}`:""}</div>
              </div>
              <div style={{fontWeight:"700",fontSize:"13px"}}>{docFmt(o.total)}</div>
              <Btn size="sm" variant="soft" onClick={()=>loadEditOrder(o)}>{t.edit}</Btn>
            </div>
          );
        })}
        {co.length===0&&<div style={{color:C.muted,textAlign:"center",padding:"20px"}}>{t.noOrders}</div>}
      </div>
    </div>
  );
}

function StatusPicker({t,current,onPick}){
  const statuses=["ordered","delivered","paid","cancelled"];
  return(
    <div style={{display:"flex",flexDirection:"column",gap:"7px"}}>
      {statuses.map(s=>{
        const st=STATUS[s];
        return(
          <button key={s} onClick={()=>onPick(s)} style={{padding:"12px 14px",borderRadius:"10px",fontFamily:"inherit",fontWeight:"600",fontSize:"14px",cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:"10px",border:`1.5px solid ${current===s?st.color:C.border}`,background:current===s?st.bg:C.bg,color:current===s?st.color:C.muted}}>
            <span>{st.icon}</span><span style={{textTransform:"capitalize"}}>{t[s]||s}</span>
            {current===s&&<span style={{marginLeft:"auto"}}>✓</span>}
          </button>
        );
      })}
    </div>
  );
}

function CatManager({t,categories,products,saveCat,delCat,renameCat,askConfirm}){
  const [nc,setNc]=useState("");const [editing,setEditing]=useState(null);const [ev,setEv]=useState("");
  return(
    <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
      <div style={{display:"flex",gap:"8px"}}>
        <input value={nc} onChange={e=>setNc(e.target.value)} placeholder="New category…" style={{...iBase,flex:1}}/>
        <Btn size="sm" variant="soft" onClick={()=>{if(nc.trim()){saveCat(nc.trim());setNc("");}}}>{t.add}</Btn>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
        {categories.map(cat=>(
          <div key={cat} style={{background:C.bg,borderRadius:"9px",padding:"10px 12px",display:"flex",alignItems:"center",gap:"8px"}}>
            {editing===cat?<input value={ev} onChange={e=>setEv(e.target.value)} autoFocus style={{...iBase,flex:1,padding:"6px 10px"}}/>:<span style={{flex:1,fontWeight:"500",fontSize:"13px"}}>{cat}</span>}
            <Badge color={C.muted}>{products.filter(p=>p.category===cat).length}</Badge>
            {editing===cat
              ?<><Btn size="sm" variant="soft" onClick={()=>{if(ev.trim()&&ev!==cat)renameCat(cat,ev.trim());setEditing(null);}}>Save</Btn><Btn size="sm" variant="ghost" onClick={()=>setEditing(null)}>✕</Btn></>
              :<><Btn size="sm" variant="ghost" onClick={()=>{setEditing(cat);setEv(cat);}}>{t.edit}</Btn><Btn size="sm" variant="ghost" onClick={()=>askConfirm(`Delete "${cat}"?`,()=>delCat(cat))} style={{color:C.danger}}>✕</Btn></>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   INVOICE PREVIEW
════════════════════════════════════════════════════════════ */
function InvoicePreview({t,doc,fmt,company}){
  const snap=doc.client_snapshot||{};
  const isFiscal=doc.is_fiscal&&company?.tax_enabled;
  const st=STATUS[doc.status]||STATUS.ordered;

  const printDoc=()=>{
    const html=isFiscal?makeFiscalPDF(doc,company,fmt,t):makeCommercialPDF(doc,company,fmt,t);
    const w=window.open("","_blank");
    w.document.write(html);w.document.close();
    setTimeout(()=>w.print(),400);
  };

  const shareWA=()=>{
    const items=(doc.items||[]).map(i=>`• ${i.name} ×${i.qty} — ${fmt(i.price*i.qty)}`).join("\n");
    const due=doc.due_date?fmtDate(doc.due_date):null;
    window.open(`https://wa.me/?text=${encodeURIComponent(t.waMsg(doc,items,fmt(doc.total),due))}`,"_blank");
  };

  return(
    <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
      {/* Badges */}
      <div style={{display:"flex",gap:"6px",flexWrap:"wrap",alignItems:"center"}}>
        <Badge color={doc.type==="invoice"?C.success:C.info}>{doc.type}</Badge>
        <Badge color={st.color} bg={st.bg}>{t[doc.status]||doc.status}</Badge>
        {isFiscal&&<Badge color={C.fiscal} bg={C.fiscalSoft}>FISCAL · DGII</Badge>}
        {doc.payment_type&&<Badge color={doc.payment_type==="credit"?C.warn:C.info}>{doc.payment_type==="credit"?t.credit:t.cash}</Badge>}
        {doc.salesperson_name&&<Badge color={C.muted}>{doc.salesperson_name}</Badge>}
        <span style={{fontSize:"11px",color:C.muted,marginLeft:"auto"}}>{fmtDate(doc.created_at)}</span>
      </div>

      {/* NCF — full display, no truncation */}
      {doc.ncf&&(
        <div style={{background:C.fiscalSoft,border:`2px solid ${C.fiscal}`,borderRadius:"10px",padding:"12px 16px"}}>
          <div style={{fontSize:"10px",fontWeight:"700",color:C.fiscal,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:"5px"}}>Número de Comprobante Fiscal (NCF)</div>
          <div style={{fontSize:"20px",fontWeight:"900",color:C.fiscal,letterSpacing:"0.04em",wordBreak:"break-all",lineHeight:"1.3"}}>{doc.ncf}</div>
        </div>
      )}

      {/* Due date */}
      {doc.due_date&&(
        <div style={{background:C.warnSoft,borderRadius:"9px",padding:"9px 13px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:"12px",color:C.warn,fontWeight:"500"}}>{t.dueDate}: <b>{fmtDate(doc.due_date)}</b></span>
          <DueBadge dueDate={doc.due_date} t={t}/>
        </div>
      )}

      {/* Company */}
      {company&&(
        <div style={{background:C.bg,borderRadius:"9px",padding:"10px 12px",display:"flex",alignItems:"center",gap:"10px"}}>
          {company.logo&&<img src={company.logo} style={{height:"28px",maxWidth:"80px",objectFit:"contain"}}/>}
          <div>
            <div style={{fontWeight:"600",fontSize:"13px"}}>{company.name}</div>
            {company.rnc&&isFiscal&&<div style={{fontSize:"11px",color:C.muted}}>RNC: {company.rnc}</div>}
            {company.phone&&<div style={{fontSize:"11px",color:C.muted}}>{company.phone}</div>}
          </div>
        </div>
      )}

      {/* Client */}
      <div style={{background:C.bg,borderRadius:"9px",padding:"10px 12px"}}>
        <div style={{fontWeight:"600",fontSize:"14px",marginBottom:"2px"}}>{snap.name}</div>
        {snap.rnc&&isFiscal&&<div style={{fontSize:"12px",color:C.muted,fontWeight:"500"}}>RNC: {snap.rnc}</div>}
        {snap.email&&<div style={{fontSize:"12px",color:C.muted}}>{snap.email}</div>}
        {snap.phone&&<div style={{fontSize:"12px",color:C.muted}}>{snap.phone}</div>}
      </div>

      <Divider/>

      {/* Items */}
      <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
        {(doc.items||[]).map((i,idx)=>(
          <div key={idx} style={{display:"flex",justifyContent:"space-between",fontSize:"13px",padding:"6px 0",borderBottom:`1px solid ${C.border}`}}>
            <span style={{flex:1}}>{i.name} <span style={{color:C.muted}}>×{i.qty}</span></span>
            <span style={{fontWeight:"600"}}>{fmt(i.price*i.qty)}</span>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div style={{display:"flex",flexDirection:"column",gap:"4px",fontSize:"13px"}}>
        <div style={{display:"flex",justifyContent:"space-between",color:C.muted}}><span>{t.subtotal}</span><span>{fmt(doc.subtotal)}</span></div>
        {doc.discount>0&&<div style={{display:"flex",justifyContent:"space-between",color:C.danger}}><span>−{doc.discount}%</span><span>−{fmt(doc.discount_amt)}</span></div>}
        {(doc.tax_lines||[]).filter(tx=>tx.rate>0).map(tx=>(
          <div key={tx.id} style={{display:"flex",justifyContent:"space-between",color:isFiscal?C.fiscal:C.muted}}>
            <span>{tx.name} {tx.rate}%</span><span>+{fmt(tx.amt)}</span>
          </div>
        ))}
        <Divider my={4}/>
        <div style={{display:"flex",justifyContent:"space-between",fontWeight:"700",fontSize:"18px",color:isFiscal?C.fiscal:C.text}}><span>{t.total}</span><span>{fmt(doc.total)}</span></div>
      </div>

      {isFiscal&&<div style={{fontSize:"11px",color:C.fiscal,fontStyle:"italic",textAlign:"center"}}>{t.dgiiNote}</div>}
      {doc.notes&&<div style={{background:C.bg,borderRadius:"8px",padding:"9px 12px",fontSize:"12px",color:C.muted}}>{doc.notes}</div>}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
        <Btn onClick={printDoc} full variant={isFiscal?"fiscal":"soft"}>🖨 {t.print}</Btn>
        <Btn onClick={shareWA} full variant="success">💬 {t.shareWA}</Btn>
      </div>
    </div>
  );
}
