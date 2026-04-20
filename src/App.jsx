import { useState, useEffect, useRef, useCallback } from "react";

/* ════════════════════════════════════════════════════════════
   SUPABASE
════════════════════════════════════════════════════════════ */
const SUPA_URL = "https://gptrtvsigrkpporzhomv.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwdHJ0dnNpZ3JrcHBvcnpob212Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0ODc4NzksImV4cCI6MjA5MjA2Mzg3OX0.X43NfdKRx2vgKwpEyFUAqGs3i0W-fydfMolEhPVKt3w";
const tok = () => window.__sb_token || SUPA_KEY;
const H = (x = {}) => ({ "Content-Type": "application/json", apikey: SUPA_KEY, Authorization: `Bearer ${tok()}`, ...x });

const sb = {
  auth: {
    signIn: async (email, pw) => {
      const r = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: H(), body: JSON.stringify({ email, password: pw }) });
      return r.json();
    },
    signOut: async () => { await fetch(`${SUPA_URL}/auth/v1/logout`, { method: "POST", headers: H() }); window.__sb_token = null; },
    me: async () => { if (!window.__sb_token) return null; const r = await fetch(`${SUPA_URL}/auth/v1/user`, { headers: H() }); return r.ok ? r.json() : null; },
  },
  q: (table) => ({
    select: async (cols = "*", opts = {}) => {
      let u = `${SUPA_URL}/rest/v1/${table}?select=${cols}`;
      if (opts.eq) Object.entries(opts.eq).forEach(([k, v]) => { u += `&${k}=eq.${encodeURIComponent(v)}`; });
      if (opts.order) u += `&order=${opts.order}`;
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
      return r.ok ? r.json() : null;
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
    login:"Sign In", logout:"Sign Out", email:"Email", password:"Password", loginErr:"Invalid credentials.",
    loading:"Loading…", orders:"Orders", newOrder:"New Order", clients:"Clients", products:"Products",
    team:"Team", settings:"Settings", more:"More", companies:"Companies",
    selectClient:"Select Client", searchProducts:"Search…", all:"All", cart:"Cart", clear:"Clear",
    discount:"Discount %", notes:"Notes…", subtotal:"Subtotal", total:"Total",
    quotation:"Quotation", invoice:"Invoice", change:"Change", noItems:"Add products to start.",
    open:"Open", packing:"Packing", openOrder:"Open Order", saveOpenOrder:"Save Open Order",
    finalize:"Finalize", finalizeInvoice:"Finalize Invoice", finalizeQuotation:"Finalize Quotation",
    openOrderHelp:"Open orders stay editable. Finalize only after warehouse adjustments are confirmed.",
    finalizeHelp:"NCF and taxes are applied only when the order is finalized.",
    workflowStage:"Workflow", finalizeConfirm:"Finalize this order and generate the document?",
    salesperson:"Salesperson", selectSp:"Assign salesperson",
    paymentType:"Payment Type", cash:"Cash", credit:"Credit",
    creditDays:"Credit Days", customDays:"Custom", dueDate:"Due Date",
    overdue:"OVERDUE", daysLeft:"days left",
    addClient:"Add Client", searchClients:"Search clients…", edit:"Edit", delete:"Delete",
    noClients:"No clients yet.", viewProfile:"Profile", clientProfile:"Client Profile",
    totalOrders:"Orders", collected:"Collected", owed:"Owed",
    addProduct:"Add Product", noProducts:"No products yet.",
    price:"Price", unit:"Unit", name:"Name", phone:"Phone", address:"Address",
    newCat:"New Category", add:"Add", noOrders:"No orders yet.",
    status:"Status", pending:"Pending", delivered:"Delivered", paid:"Paid", cancelled:"Cancelled",
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
    company:"Company", selectCompany:"Select company", taxEnabled:"Fiscal (with tax)",
    ncfConfig:"NCF Configuration", ncfPrefix:"NCF Prefix", ncfSequence:"Current Sequence",
    ncfStart:"Sequence Start", ncfEnd:"Sequence End (0 = unlimited)",
