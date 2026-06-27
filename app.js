/* ============================================================
   app.js — La Compra Diaria  ·  v2.0 COMPLETO
   ============================================================ */

'use strict';

// ══════════════════════════════════════════════════════════════
// 1. CLAVES LOCALSTORAGE
// ══════════════════════════════════════════════════════════════
const LS = {
  SECCIONES:   'lcd_secciones',
  PRODUCTOS:   'lcd_productos',
  DARK_MODE:   'lcd_dark_mode',
  INITIALIZED: 'lcd_initialized'
};

// ══════════════════════════════════════════════════════════════
// 2. ESTADO GLOBAL
// ══════════════════════════════════════════════════════════════
const State = {
  secciones:    [],
  productos:    [],
  darkMode:     false,
  activeTab:    'compra',
  subSectionId: null
};

// ══════════════════════════════════════════════════════════════
// 3. DATOS POR DEFECTO
// ══════════════════════════════════════════════════════════════
function buildDefaultSecciones() {
  const defs = [
    { nombre: 'Supermercado', icono: '🏪' },
    { nombre: 'Frutería',     icono: '🍎' },
    { nombre: 'Carnicería',   icono: '🥩' },
    { nombre: 'Embutidos',    icono: '🌭' },
    { nombre: 'Quesos',       icono: '🧀' },
    { nombre: 'Conservas',    icono: '🥫' },
    { nombre: 'Especias',     icono: '🌶️' },
    { nombre: 'Encurtidos',   icono: '🫙' },
    { nombre: 'Pescadería',   icono: '🐟' },
    { nombre: 'Congelados',   icono: '❄️' },
    { nombre: 'Droguería',    icono: '🧴' },
    { nombre: 'Casa',         icono: '🏠' }
  ];
  return defs.map(d => ({ id: uid(), ...d }));
}

// Iconos sugeridos para el selector de emoji rápido
const ICONOS_SECCION = ['🏪','🍎','🥩','🌭','🧀','🥫','🌶️','🫙','🐟','❄️','🧴','🏠','🥦','🥐','🍷','🧹','🐾','👶','💊','🌿','🫒','🥚'];
const ICONOS_PRODUCTO = ['🍎','🥩','🧀','🥛','🥚','🍞','🥦','🧅','🍋','🫐','🍌','🥕','🧄','🍅','🍇','🥑','🫑','🌽','🥜','🍯','🧈','🫙','🥫','🐟','🦐','🥶','🧴','🧼','🪥','🧻','🫧','🍷','☕','🧃','💊','🌿','🛒'];
const URGENCIAS = [
  { value: 'rojo',     label: '🔴 Urgente',   bg: 'bg-red-50 dark:bg-red-900/20',    ring: 'ring-red-400',    text: 'text-red-600 dark:text-red-400' },
  { value: 'amarillo', label: '🟡 Normal',    bg: 'bg-amber-50 dark:bg-amber-900/20', ring: 'ring-amber-400',  text: 'text-amber-600 dark:text-amber-400' },
  { value: 'verde',    label: '🟢 Sin prisa', bg: 'bg-emerald-50 dark:bg-emerald-900/20', ring: 'ring-emerald-400', text: 'text-emerald-600 dark:text-emerald-400' }
];

// ══════════════════════════════════════════════════════════════
// 4. UTILIDADES
// ══════════════════════════════════════════════════════════════
function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
function lsGet(key) {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : null; }
  catch { return null; }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); }
  catch (e) { console.error('[LCD]', e); }
}
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Toast ──────────────────────────────────────────────────────
let _toastTimer = null;
function showToast(msg, ms = 2200) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

// ══════════════════════════════════════════════════════════════
// 5. MODAL SHEET (bottom-sheet tipo iOS)
// ══════════════════════════════════════════════════════════════

/**
 * showSheet({ title, html, onSubmit, submitLabel, submitStyle })
 * Abre el bottom-sheet genérico y resuelve con el resultado de onSubmit().
 * onSubmit recibe el FormData del formulario interno.
 */
function showSheet({ title, html, onSubmit, submitLabel = 'Guardar', submitStyle = 'primary', cancelLabel = 'Cancelar' }) {
  return new Promise(resolve => {
    const overlay = document.getElementById('sheet-overlay');
    const box     = document.getElementById('sheet-box');
    const titleEl = document.getElementById('sheet-title');
    const bodyEl  = document.getElementById('sheet-body');
    const submitEl= document.getElementById('sheet-submit');
    const cancelEl= document.getElementById('sheet-cancel');

    titleEl.textContent   = title;
    bodyEl.innerHTML      = html;
    submitEl.textContent  = submitLabel;
    cancelEl.textContent  = cancelLabel;
    submitEl.className    = submitStyle === 'danger'
      ? 'flex-1 py-3 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 active:scale-95 transition-all'
      : 'flex-1 py-3 rounded-xl text-sm font-bold bg-brand-500 text-white hover:bg-brand-600 active:scale-95 transition-all';

    // Abrir con animación
    overlay.style.display = 'flex';
    requestAnimationFrame(() => {
      overlay.classList.add('open');
      box.classList.add('open');
    });

    // Focus en primer input
    setTimeout(() => {
      const first = bodyEl.querySelector('input,select,textarea');
      if (first) first.focus();
    }, 300);

    function close(result) {
      overlay.classList.remove('open');
      box.classList.remove('open');
      setTimeout(() => { overlay.style.display = 'none'; }, 350);
      resolve(result);
    }

    // Submit
    submitEl.onclick = () => {
      const form = bodyEl.querySelector('form');
      if (form && !form.checkValidity()) { form.reportValidity(); return; }
      const result = onSubmit ? onSubmit() : true;
      if (result !== false) close(result);
    };

    // Cancel (botón texto y botón X)
    cancelEl.onclick = () => close(null);
    const cancelX = document.getElementById('sheet-cancel-x');
    if (cancelX) cancelX.onclick = () => close(null);

    // Tap outside
    overlay.onclick = e => { if (e.target === overlay) close(null); };
  });
}

// Modal de confirmación simple
function showConfirm({ title, body, confirmLabel = 'Confirmar', confirmStyle = 'danger' }) {
  return new Promise(resolve => {
    const overlay = document.getElementById('modal-overlay');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML    = body || '';
    const actEl = document.getElementById('modal-actions');
    actEl.innerHTML = '';

    [
      { label: 'Cancelar',     style: 'secondary', val: false },
      { label: confirmLabel,   style: confirmStyle, val: true  }
    ].forEach(({ label, style, val }) => {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.className = style === 'danger'
        ? 'flex-1 py-2.5 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition-colors'
        : style === 'primary'
        ? 'flex-1 py-2.5 rounded-xl text-sm font-bold bg-brand-500 text-white hover:bg-brand-600 transition-colors'
        : 'flex-1 py-2.5 rounded-xl text-sm font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300';
      btn.onclick = () => { overlay.classList.remove('open'); resolve(val); };
      actEl.appendChild(btn);
    });
    overlay.classList.add('open');
  });
}

// ══════════════════════════════════════════════════════════════
// 6. HELPERS DE FORMULARIO
// ══════════════════════════════════════════════════════════════

function buildIconPicker(name, selected, icons) {
  return `
  <div class="flex flex-wrap gap-2 mt-1" id="iconpicker-${name}">
    ${icons.map(ic => `
      <button type="button"
        class="icon-opt w-10 h-10 text-xl rounded-xl flex items-center justify-center
               border-2 transition-all ${ic === selected
                 ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 scale-110'
                 : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700'}"
        data-icon="${ic}" data-picker="${name}" onclick="pickIcon(this)">${ic}</button>
    `).join('')}
  </div>
  <input type="hidden" id="hidden-${name}" name="${name}" value="${selected}" required/>`;
}

function pickIcon(btn) {
  const picker = btn.dataset.picker;
  document.querySelectorAll(`#iconpicker-${picker} .icon-opt`).forEach(b => {
    b.className = b.className
      .replace('border-brand-500 bg-brand-50 dark:bg-brand-900/30 scale-110', '')
      + ' border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700';
  });
  btn.className = btn.className
    .replace('border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700', '')
    + ' border-brand-500 bg-brand-50 dark:bg-brand-900/30 scale-110';
  document.getElementById(`hidden-${picker}`).value = btn.dataset.icon;
}

function buildUrgenciaPicker(selected = 'amarillo') {
  return `
  <div class="flex gap-2 mt-1" id="urgencia-picker">
    ${URGENCIAS.map(u => `
      <button type="button"
        class="urg-opt flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${u.value === selected
          ? `${u.ring} ${u.bg} ${u.text} ring-2`
          : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700'}"
        data-urg="${u.value}" onclick="pickUrgencia(this)">${u.label}</button>
    `).join('')}
  </div>
  <input type="hidden" id="hidden-urgencia" name="urgencia" value="${selected}" required/>`;
}

function pickUrgencia(btn) {
  const val = btn.dataset.urg;
  const u   = URGENCIAS.find(x => x.value === val);
  document.querySelectorAll('#urgencia-picker .urg-opt').forEach(b => {
    const bDef = URGENCIAS.find(x => x.value === b.dataset.urg);
    b.className = `urg-opt flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all
      border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700`;
  });
  btn.className = `urg-opt flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all
    ${u.ring} ${u.bg} ${u.text} ring-2`;
  document.getElementById('hidden-urgencia').value = val;
}

const inputCls = `w-full px-3 py-2.5 rounded-xl text-sm border
  border-slate-200 dark:border-slate-600
  bg-white dark:bg-slate-700
  text-slate-800 dark:text-slate-100
  placeholder-slate-400 dark:placeholder-slate-500
  focus:outline-none focus:ring-2 focus:ring-brand-400
  transition-colors`;

const labelCls = 'block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1 mt-3';

// ══════════════════════════════════════════════════════════════
// 7. CRUD — SECCIONES
// ══════════════════════════════════════════════════════════════

async function anadirSeccion() {
  const result = await showSheet({
    title: 'Nueva sección',
    submitLabel: 'Crear sección',
    html: `
      <form id="form-sec" class="space-y-1" onsubmit="return false">
        <label class="${labelCls}">Nombre</label>
        <input id="sec-nombre" name="nombre" type="text" maxlength="32"
          placeholder="Ej: Panadería" class="${inputCls}" required autocomplete="off"/>

        <label class="${labelCls}">Icono</label>
        ${buildIconPicker('icono', '🏪', ICONOS_SECCION)}
      </form>`,
    onSubmit() {
      const nombre = document.getElementById('sec-nombre').value.trim();
      const icono  = document.getElementById('hidden-icono').value;
      if (!nombre) return false;
      return { nombre, icono };
    }
  });

  if (!result) return;
  const sec = { id: uid(), nombre: result.nombre, icono: result.icono };
  State.secciones.push(sec);
  saveState();
  renderGestion();
  showToast(`✅ Sección "${sec.nombre}" creada`);
}

async function editarSeccion(id) {
  const sec = State.secciones.find(s => s.id === id);
  if (!sec) return;

  const result = await showSheet({
    title: 'Editar sección',
    submitLabel: 'Guardar cambios',
    html: `
      <form id="form-sec" class="space-y-1" onsubmit="return false">
        <label class="${labelCls}">Nombre</label>
        <input id="sec-nombre" name="nombre" type="text" maxlength="32"
          value="${esc(sec.nombre)}" class="${inputCls}" required autocomplete="off"/>

        <label class="${labelCls}">Icono</label>
        ${buildIconPicker('icono', sec.icono, ICONOS_SECCION)}
      </form>`,
    onSubmit() {
      const nombre = document.getElementById('sec-nombre').value.trim();
      const icono  = document.getElementById('hidden-icono').value;
      if (!nombre) return false;
      return { nombre, icono };
    }
  });

  if (!result) return;
  sec.nombre = result.nombre;
  sec.icono  = result.icono;
  saveState();
  renderGestion();
  // Actualizar header si sub-pantalla está abierta
  if (State.subSectionId === id) {
    document.getElementById('sub-icon').textContent  = sec.icono;
    document.getElementById('sub-title').textContent = sec.nombre;
  }
  showToast(`✏️ Sección actualizada`);
}

async function eliminarSeccion(id) {
  const sec = State.secciones.find(s => s.id === id);
  if (!sec) return;
  const nProd = State.productos.filter(p => p.sectionId === id).length;
  const ok = await showConfirm({
    title: `Eliminar "${sec.nombre}"`,
    body:  `<p class="mt-1 text-slate-600 dark:text-slate-300">Se eliminarán también sus <strong>${nProd} producto${nProd !== 1 ? 's' : ''}</strong>. Esta acción no se puede deshacer.</p>`,
    confirmLabel: 'Eliminar'
  });
  if (!ok) return;
  State.secciones = State.secciones.filter(s => s.id !== id);
  State.productos  = State.productos.filter(p => p.sectionId !== id);
  saveState();
  renderGestion();
  showToast(`🗑️ "${sec.nombre}" eliminada`);
}

// ══════════════════════════════════════════════════════════════
// 8. CRUD — PRODUCTOS
// ══════════════════════════════════════════════════════════════

function buildProductoForm(sectionId, prod = null) {
  const secOptions = State.secciones.map(s =>
    `<option value="${esc(s.id)}" ${s.id === (prod ? prod.sectionId : sectionId) ? 'selected' : ''}>${esc(s.icono)} ${esc(s.nombre)}</option>`
  ).join('');

  return `
    <form id="form-prod" class="space-y-1" onsubmit="return false">
      <label class="${labelCls}">Nombre del producto</label>
      <input id="prod-nombre" name="nombre" type="text" maxlength="48"
        value="${prod ? esc(prod.nombre) : ''}"
        placeholder="Ej: Leche entera" class="${inputCls}" required autocomplete="off"/>

      <label class="${labelCls}">Icono</label>
      ${buildIconPicker('prod-icono', prod ? prod.icono : '🛒', ICONOS_PRODUCTO)}

      <label class="${labelCls}">Sección</label>
      <select id="prod-seccion" name="sectionId" class="${inputCls}">
        ${secOptions}
      </select>

      <label class="${labelCls}">Urgencia</label>
      ${buildUrgenciaPicker(prod ? prod.urgencia : 'amarillo')}
    </form>`;
}

async function anadirProducto(sectionId) {
  if (!State.secciones.length) {
    showToast('⚠️ Crea al menos una sección primero');
    return;
  }

  const result = await showSheet({
    title: 'Nuevo producto',
    submitLabel: 'Añadir producto',
    html: buildProductoForm(sectionId),
    onSubmit() {
      const nombre    = document.getElementById('prod-nombre').value.trim();
      const icono     = document.getElementById('hidden-prod-icono').value;
      const sectionId = document.getElementById('prod-seccion').value;
      const urgencia  = document.getElementById('hidden-urgencia').value;
      if (!nombre) return false;
      return { nombre, icono, sectionId, urgencia };
    }
  });

  if (!result) return;

  const prod = {
    id:        uid(),
    sectionId: result.sectionId,
    nombre:    result.nombre,
    icono:     result.icono,
    urgencia:  result.urgencia,
    estado:    'pendiente'
  };
  State.productos.push(prod);
  saveState();

  // Re-renderizar donde corresponda
  if (State.subSectionId) renderSubScreen(State.subSectionId);
  if (State.activeTab === 'compra') renderCompra();
  showToast(`✅ "${prod.nombre}" añadido`);
}

async function editarProducto(id) {
  const prod = State.productos.find(p => p.id === id);
  if (!prod) return;

  const result = await showSheet({
    title: 'Editar producto',
    submitLabel: 'Guardar cambios',
    html: buildProductoForm(prod.sectionId, prod),
    onSubmit() {
      const nombre    = document.getElementById('prod-nombre').value.trim();
      const icono     = document.getElementById('hidden-prod-icono').value;
      const sectionId = document.getElementById('prod-seccion').value;
      const urgencia  = document.getElementById('hidden-urgencia').value;
      if (!nombre) return false;
      return { nombre, icono, sectionId, urgencia };
    }
  });

  if (!result) return;
  prod.nombre    = result.nombre;
  prod.icono     = result.icono;
  prod.sectionId = result.sectionId;
  prod.urgencia  = result.urgencia;
  saveState();

  if (State.subSectionId) renderSubScreen(State.subSectionId);
  if (State.activeTab === 'compra') renderCompra();
  showToast(`✏️ "${prod.nombre}" actualizado`);
}

async function eliminarProducto(id) {
  const prod = State.productos.find(p => p.id === id);
  if (!prod) return;
  const ok = await showConfirm({
    title: `Eliminar "${prod.nombre}"`,
    body:  `<p class="mt-1 text-slate-600 dark:text-slate-300">Se eliminará permanentemente de tu lista.</p>`,
    confirmLabel: 'Eliminar'
  });
  if (!ok) return;
  State.productos = State.productos.filter(q => q.id !== id);
  saveState();
  if (State.subSectionId) renderSubScreen(State.subSectionId);
  if (State.activeTab === 'compra') renderCompra();
  showToast(`🗑️ "${prod.nombre}" eliminado`);
}

// ══════════════════════════════════════════════════════════════
// 9. TOGGLE PRODUCTO (marcar comprado / pendiente)
// ══════════════════════════════════════════════════════════════

function toggleProducto(id) {
  const p = State.productos.find(p => p.id === id);
  if (!p) return;
  p.estado = p.estado === 'pendiente' ? 'comprado' : 'pendiente';
  saveState();
  renderCompra();
  if (State.subSectionId === p.sectionId) renderSubScreen(p.sectionId);
  showToast(p.estado === 'comprado' ? `✅ ${p.nombre} ¡comprado!` : `↩️ ${p.nombre} de vuelta a la lista`);
}

// ══════════════════════════════════════════════════════════════
// 10. PERSISTENCIA
// ══════════════════════════════════════════════════════════════

function saveState() {
  lsSet(LS.SECCIONES, State.secciones);
  lsSet(LS.PRODUCTOS,  State.productos);
  lsSet(LS.DARK_MODE,  State.darkMode);
}

function loadState() {
  const secciones = lsGet(LS.SECCIONES);
  const productos  = lsGet(LS.PRODUCTOS);
  const dark       = lsGet(LS.DARK_MODE);

  if (!lsGet(LS.INITIALIZED)) {
    State.secciones = buildDefaultSecciones();
    State.productos  = [];
    lsSet(LS.INITIALIZED, true);
    saveState();
  } else {
    State.secciones = Array.isArray(secciones) ? secciones : [];
    State.productos  = Array.isArray(productos)  ? productos  : [];
  }
  State.darkMode = dark === true;
}

// ══════════════════════════════════════════════════════════════
// 11. MODO OSCURO
// ══════════════════════════════════════════════════════════════

function applyDarkMode(dark) {
  document.documentElement.classList.toggle('dark', dark);
  document.getElementById('meta-theme-color').content = dark ? '#0f172a' : '#10b981';
  document.getElementById('dark-icon').textContent    = dark ? '☀️' : '🌙';
}

function toggleDarkMode() {
  State.darkMode = !State.darkMode;
  applyDarkMode(State.darkMode);
  lsSet(LS.DARK_MODE, State.darkMode);
  showToast(State.darkMode ? '🌙 Modo oscuro' : '☀️ Modo claro');
  // Refrescar toggle de gestión si está visible
  if (State.activeTab === 'gestion') renderGestion();
}

// ══════════════════════════════════════════════════════════════
// 12. NAVEGACIÓN
// ══════════════════════════════════════════════════════════════

function switchTab(tab) {
  State.activeTab = tab;

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const screen = document.getElementById(`screen-${tab}`);
  if (screen) screen.classList.add('active');

  document.querySelectorAll('.nav-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === tab));

  const titles = { compra: 'La Compra Diaria', categorias: 'Secciones', resumen: 'Resumen', gestion: 'Gestión' };
  document.getElementById('header-title').textContent = titles[tab] || 'La Compra Diaria';

  // FAB principal: visible en categorías y gestión
  const fab = document.getElementById('fab-add');
  fab.style.display = (tab === 'categorias' || tab === 'gestion') ? 'flex' : 'none';

  renderScreen(tab);
}

function renderScreen(tab) {
  switch (tab) {
    case 'compra':     renderCompra();     break;
    case 'categorias': renderCategorias(); break;
    case 'resumen':    renderResumen();    break;
    case 'gestion':    renderGestion();    break;
  }
}

// ══════════════════════════════════════════════════════════════
// 13. SUB-PANTALLA
// ══════════════════════════════════════════════════════════════

function openSubScreen(sectionId) {
  const sec = State.secciones.find(s => s.id === sectionId);
  if (!sec) return;
  State.subSectionId = sectionId;
  document.getElementById('sub-icon').textContent  = sec.icono;
  document.getElementById('sub-title').textContent = sec.nombre;
  renderSubScreen(sectionId);
  document.getElementById('sub-screen').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeSubScreen() {
  document.getElementById('sub-screen').classList.remove('open');
  document.body.style.overflow = '';
  State.subSectionId = null;
  // Refrescar categorías por si cambió el conteo
  if (State.activeTab === 'categorias') renderCategorias();
}

// ══════════════════════════════════════════════════════════════
// 14. RENDERS
// ══════════════════════════════════════════════════════════════

// ── 14a. Pantalla Compra ──────────────────────────────────────
function renderCompra() {
  const list  = document.getElementById('compra-list');
  const empty = document.getElementById('compra-empty');

  const pendientes = State.productos.filter(p => p.estado === 'pendiente');

  if (!pendientes.length) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  // Ordenar: rojo=0 > amarillo=1 > verde=2
  const ord = { rojo: 0, amarillo: 1, verde: 2 };
  const sorted = [...pendientes].sort((a, b) => (ord[a.urgencia] ?? 1) - (ord[b.urgencia] ?? 1));

  const dotColor = { rojo: '#ef4444', amarillo: '#f59e0b', verde: '#10b981' };

  // Agrupar por urgencia para mostrar separador
  let lastUrg = null;
  const rows = sorted.map(p => {
    const sec     = State.secciones.find(s => s.id === p.sectionId);
    const dot     = dotColor[p.urgencia] || dotColor.verde;
    const urgLabel = { rojo: '🔴 Urgente', amarillo: '🟡 Normal', verde: '🟢 Sin prisa' };
    let header = '';
    if (p.urgencia !== lastUrg) {
      header = `
        <div class="flex items-center gap-2 px-1 pt-2 pb-0.5">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            ${urgLabel[p.urgencia] || p.urgencia}
          </span>
          <div class="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
        </div>`;
      lastUrg = p.urgencia;
    }

    return `${header}
    <div class="flex items-center gap-3 px-4 py-3
                bg-white dark:bg-slate-800 rounded-xl shadow-sm
                border border-slate-100 dark:border-slate-700
                active:scale-[.98] transition-transform cursor-pointer select-none"
         onclick="toggleProducto('${esc(p.id)}')">

      <!-- Urgencia dot -->
      <span style="width:9px;height:9px;border-radius:50%;background:${dot};flex-shrink:0;display:inline-block;margin-top:1px;"></span>

      <!-- Icono producto -->
      <span class="text-xl" aria-hidden="true">${esc(p.icono)}</span>

      <!-- Info -->
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate leading-tight">${esc(p.nombre)}</p>
        ${sec ? `<p class="text-xs text-slate-400 dark:text-slate-500 truncate">${esc(sec.icono)} ${esc(sec.nombre)}</p>` : ''}
      </div>

      <!-- Checkbox visual -->
      <span class="w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center
                   border-slate-300 dark:border-slate-600
                   transition-all duration-150"
            aria-label="Marcar como comprado">
      </span>
    </div>`;
  });

  list.innerHTML = rows.join('');
}

// ── 14b. Pantalla Categorías ──────────────────────────────────
function renderCategorias() {
  const list = document.getElementById('categorias-list');

  if (!State.secciones.length) {
    list.innerHTML = `
      <div class="flex flex-col items-center justify-center py-24 text-center">
        <div class="text-5xl mb-3">📂</div>
        <p class="text-sm font-semibold text-slate-500 dark:text-slate-400">Sin secciones todavía</p>
        <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">Crea una desde Gestión o pulsa ＋</p>
      </div>`;
    return;
  }

  list.innerHTML = State.secciones.map(sec => {
    const total      = State.productos.filter(p => p.sectionId === sec.id).length;
    const pendientes = State.productos.filter(p => p.sectionId === sec.id && p.estado === 'pendiente').length;
    const comprados  = total - pendientes;
    const pct        = total > 0 ? Math.round((comprados / total) * 100) : 0;

    return `
    <button class="w-full flex items-center gap-3 px-4 py-3
                   bg-white dark:bg-slate-800 rounded-xl shadow-sm
                   border border-slate-100 dark:border-slate-700
                   text-left transition-all active:scale-[.98]
                   hover:border-brand-300 dark:hover:border-brand-700"
            onclick="openSubScreen('${esc(sec.id)}')">
      <span class="text-2xl">${esc(sec.icono)}</span>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">${esc(sec.nombre)}</p>
        <div class="flex items-center gap-2 mt-1">
          <div class="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div class="h-full rounded-full bg-brand-400 transition-all duration-500" style="width:${pct}%"></div>
          </div>
          <span class="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">${pendientes} pendiente${pendientes !== 1 ? 's' : ''}</span>
        </div>
      </div>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round" class="text-slate-300 dark:text-slate-600 flex-shrink-0">
        <path d="M6 4l4 4-4 4"/>
      </svg>
    </button>`;
  }).join('');
}

// ── 14c. Sub-pantalla productos de sección ────────────────────
function renderSubScreen(sectionId) {
  const content  = document.getElementById('sub-content');
  const productos = State.productos.filter(p => p.sectionId === sectionId);

  if (!productos.length) {
    content.innerHTML = `
      <div class="flex flex-col items-center justify-center py-24 text-center">
        <div class="text-5xl mb-3">🛍️</div>
        <p class="text-sm font-semibold text-slate-500 dark:text-slate-400">Sección vacía</p>
        <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">Pulsa ＋ para añadir tu primer producto</p>
      </div>`;
    return;
  }

  const urgBadge = {
    rojo:     'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    amarillo: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    verde:    'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
  };
  const urgLabel = { rojo: '🔴 Urgente', amarillo: '🟡 Normal', verde: '🟢 Sin prisa' };
  const dotColor = { rojo: '#ef4444', amarillo: '#f59e0b', verde: '#10b981' };

  content.innerHTML = productos.map(p => `
    <div class="flex items-center gap-3 px-4 py-3
                bg-white dark:bg-slate-800 rounded-xl shadow-sm
                border border-slate-100 dark:border-slate-700
                transition-opacity ${p.estado === 'comprado' ? 'opacity-40' : ''}">

      <span style="width:9px;height:9px;border-radius:50%;background:${dotColor[p.urgencia]||'#10b981'};flex-shrink:0;display:inline-block;"></span>
      <span class="text-xl">${esc(p.icono)}</span>

      <div class="flex-1 min-w-0 cursor-pointer" onclick="toggleProducto('${esc(p.id)}')">
        <p class="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate
                  ${p.estado === 'comprado' ? 'line-through text-slate-400 dark:text-slate-500' : ''}">
          ${esc(p.nombre)}
        </p>
        <span class="text-xs font-medium px-2 py-0.5 rounded-full ${urgBadge[p.urgencia]||urgBadge.verde}">
          ${urgLabel[p.urgencia]||p.urgencia}
        </span>
      </div>

      <div class="flex items-center gap-1.5 flex-shrink-0">
        <button onclick="editarProducto('${esc(p.id)}')"
          class="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700
                 text-slate-500 dark:text-slate-400
                 hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors"
          aria-label="Editar">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 2l2 2-7 7H3v-2l7-7z"/>
          </svg>
        </button>
        <button onclick="eliminarProducto('${esc(p.id)}')"
          class="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/20
                 text-red-500 dark:text-red-400
                 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
          aria-label="Eliminar">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="2 4 12 4"/><path d="M5 4V2h4v2"/><path d="M5 6v5M9 6v5"/><rect x="3" y="4" width="8" height="8" rx="1"/>
          </svg>
        </button>
      </div>
    </div>`).join('');
}

// ── 14d. Pantalla Resumen ─────────────────────────────────────
function renderResumen() {
  const el       = document.getElementById('resumen-content');
  const total    = State.productos.length;
  const comprados = State.productos.filter(p => p.estado === 'comprado').length;
  const pendientes= total - comprados;
  const pct      = total > 0 ? Math.round((comprados / total) * 100) : 0;

  // Stats por urgencia
  const urgStats = URGENCIAS.map(u => ({
    ...u,
    total:    State.productos.filter(p => p.urgencia === u.value).length,
    pendiente:State.productos.filter(p => p.urgencia === u.value && p.estado === 'pendiente').length
  }));

  // Top secciones por pendientes
  const topSec = State.secciones
    .map(s => ({ ...s, pend: State.productos.filter(p => p.sectionId === s.id && p.estado === 'pendiente').length }))
    .filter(s => s.pend > 0)
    .sort((a, b) => b.pend - a.pend)
    .slice(0, 5);

  el.innerHTML = `
    <!-- Progreso global -->
    <div class="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm
                border border-slate-100 dark:border-slate-700 mb-4">
      <div class="flex items-end justify-between mb-3">
        <div>
          <p class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Progreso</p>
          <p class="text-3xl font-bold text-slate-800 dark:text-slate-100 leading-none mt-0.5">${pct}<span class="text-lg font-semibold text-slate-400">%</span></p>
        </div>
        <span class="text-4xl">${pct === 100 && total > 0 ? '🎉' : pct > 60 ? '💪' : '🛒'}</span>
      </div>
      <div class="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div class="h-full rounded-full transition-all duration-700"
             style="width:${pct}%;background:linear-gradient(90deg,#34d399,#10b981)"></div>
      </div>
      <p class="text-xs text-slate-400 dark:text-slate-500 mt-2 text-right">
        ${comprados} de ${total} productos comprados
      </p>
    </div>

    <!-- Cards stats -->
    <div class="grid grid-cols-2 gap-3 mb-4">
      ${statCard('📦', 'Total', total, 'bg-slate-50 dark:bg-slate-800/60')}
      ${statCard('⏳', 'Pendientes', pendientes, 'bg-amber-50 dark:bg-amber-900/20')}
      ${statCard('✅', 'Comprados', comprados, 'bg-emerald-50 dark:bg-emerald-900/20')}
      ${statCard('📂', 'Secciones', State.secciones.length, 'bg-blue-50 dark:bg-blue-900/20')}
    </div>

    <!-- Por urgencia -->
    <p class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 mb-2">Por urgencia</p>
    <div class="space-y-2 mb-4">
      ${urgStats.map(u => `
      <div class="flex items-center gap-3 px-4 py-3 rounded-xl ${u.bg}
                  border border-slate-100 dark:border-slate-700">
        <span class="text-base font-bold ${u.text} w-20 truncate">${u.label}</span>
        <div class="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div class="h-full rounded-full transition-all duration-500"
               style="width:${u.total > 0 ? Math.round((u.pendiente/u.total)*100) : 0}%;
                      background:${u.value==='rojo'?'#ef4444':u.value==='amarillo'?'#f59e0b':'#10b981'}"></div>
        </div>
        <span class="text-xs font-bold ${u.text} w-14 text-right">${u.pendiente}/${u.total}</span>
      </div>`).join('')}
    </div>

    ${topSec.length ? `
    <!-- Secciones con más pendientes -->
    <p class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 mb-2">Secciones pendientes</p>
    <div class="space-y-2">
      ${topSec.map(s => `
      <div class="flex items-center gap-3 px-4 py-2.5 rounded-xl
                  bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
        <span class="text-xl">${esc(s.icono)}</span>
        <span class="flex-1 text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">${esc(s.nombre)}</span>
        <span class="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30
                     px-2 py-0.5 rounded-full">${s.pend}</span>
      </div>`).join('')}
    </div>` : ''}

    ${pct === 100 && total > 0 ? `
    <div class="mt-4 flex flex-col items-center py-8 bg-emerald-50 dark:bg-emerald-900/20
                rounded-2xl border border-emerald-100 dark:border-emerald-800">
      <span class="text-5xl mb-2">🎉</span>
      <p class="text-base font-bold text-emerald-700 dark:text-emerald-300">¡Compra completada!</p>
      <p class="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Puedes marcar todo como pendiente desde Gestión</p>
    </div>` : ''}`;
}

function statCard(icon, label, value, bg) {
  return `
  <div class="flex flex-col items-center py-4 rounded-xl ${bg}
              border border-slate-100 dark:border-slate-700 shadow-sm">
    <span class="text-2xl mb-1">${icon}</span>
    <span class="text-2xl font-bold text-slate-800 dark:text-slate-100">${value}</span>
    <span class="text-xs text-slate-500 dark:text-slate-400 font-semibold">${label}</span>
  </div>`;
}

// ── 14e. Pantalla Gestión ─────────────────────────────────────
function renderGestion() {
  const el = document.getElementById('gestion-content');

  el.innerHTML = `
    <div class="space-y-3">

      <!-- Dark mode -->
      <div class="flex items-center justify-between px-4 py-3.5
                  bg-white dark:bg-slate-800 rounded-xl shadow-sm
                  border border-slate-100 dark:border-slate-700">
        <div class="flex items-center gap-3">
          <span class="text-xl">${State.darkMode ? '☀️' : '🌙'}</span>
          <span class="text-sm font-semibold text-slate-700 dark:text-slate-300">
            ${State.darkMode ? 'Cambiar a claro' : 'Cambiar a oscuro'}
          </span>
        </div>
        <button onclick="toggleDarkMode()"
          class="relative w-12 h-6 rounded-full transition-colors duration-300
                 ${State.darkMode ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-600'}"
          role="switch" aria-checked="${State.darkMode}" aria-label="Modo oscuro">
          <span class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md
                       transition-transform duration-300
                       ${State.darkMode ? 'translate-x-6' : 'translate-x-0'}"></span>
        </button>
      </div>

      <!-- Reset compra -->
      <button onclick="resetearCompra()"
        class="w-full flex items-center gap-3 px-4 py-3.5
               bg-white dark:bg-slate-800 rounded-xl shadow-sm
               border border-slate-100 dark:border-slate-700
               text-left hover:border-brand-300 dark:hover:border-brand-700 transition-colors">
        <span class="text-xl">🔄</span>
        <div>
          <p class="text-sm font-semibold text-slate-700 dark:text-slate-300">Reiniciar compra</p>
          <p class="text-xs text-slate-400">Marca todos los productos como pendientes</p>
        </div>
      </button>

      <!-- Secciones -->
      <div class="flex items-center justify-between px-1 pt-2 pb-0.5">
        <p class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Secciones (${State.secciones.length})
        </p>
        <button onclick="anadirSeccion()"
          class="text-xs font-bold text-brand-600 dark:text-brand-400
                 hover:text-brand-700 dark:hover:text-brand-300 transition-colors">
          + Añadir
        </button>
      </div>

      ${State.secciones.length === 0 ? `
        <p class="text-sm text-slate-400 dark:text-slate-500 px-1 py-2 text-center">
          No hay secciones. Pulsa "+ Añadir" o el botón ＋.
        </p>` : ''}

      ${State.secciones.map(sec => {
        const nProd = State.productos.filter(p => p.sectionId === sec.id).length;
        return `
        <div class="flex items-center gap-3 px-4 py-3
                    bg-white dark:bg-slate-800 rounded-xl shadow-sm
                    border border-slate-100 dark:border-slate-700">
          <span class="text-xl">${esc(sec.icono)}</span>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">${esc(sec.nombre)}</p>
            <p class="text-xs text-slate-400 dark:text-slate-500">${nProd} producto${nProd !== 1 ? 's' : ''}</p>
          </div>
          <div class="flex items-center gap-1.5">
            <button onclick="editarSeccion('${esc(sec.id)}')"
              class="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700
                     text-slate-500 dark:text-slate-400
                     hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors"
              aria-label="Editar sección">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10 2l2 2-7 7H3v-2l7-7z"/>
              </svg>
            </button>
            <button onclick="eliminarSeccion('${esc(sec.id)}')"
              class="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/20
                     text-red-500 dark:text-red-400
                     hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
              aria-label="Eliminar sección">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="2 4 12 4"/><path d="M5 4V2h4v2"/><path d="M5 6v5M9 6v5"/><rect x="3" y="4" width="8" height="8" rx="1"/>
              </svg>
            </button>
          </div>
        </div>`;
      }).join('')}

      <!-- Datos -->
      <div class="px-1 pt-2 pb-0.5">
        <p class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Datos</p>
      </div>

      <button onclick="exportarDB()"
        class="w-full flex items-center gap-3 px-4 py-3.5
               bg-white dark:bg-slate-800 rounded-xl shadow-sm
               border border-slate-100 dark:border-slate-700
               text-left hover:border-brand-300 dark:hover:border-brand-700 transition-colors">
        <span class="text-xl">📤</span>
        <div>
          <p class="text-sm font-semibold text-slate-700 dark:text-slate-300">Exportar base de datos</p>
          <p class="text-xs text-slate-400">Descarga un fichero JSON con todo</p>
        </div>
      </button>

      <label class="w-full flex items-center gap-3 px-4 py-3.5
                    bg-white dark:bg-slate-800 rounded-xl shadow-sm
                    border border-slate-100 dark:border-slate-700
                    text-left hover:border-brand-300 dark:hover:border-brand-700 transition-colors cursor-pointer">
        <span class="text-xl">📥</span>
        <div class="flex-1">
          <p class="text-sm font-semibold text-slate-700 dark:text-slate-300">Importar base de datos</p>
          <p class="text-xs text-slate-400">Carga un JSON exportado previamente</p>
        </div>
        <input type="file" accept=".json" class="hidden" onchange="importarDB(event)"/>
      </label>

      <!-- Zona peligrosa -->
      <div class="px-1 pt-2 pb-0.5">
        <p class="text-xs font-bold uppercase tracking-wider text-red-400">Zona peligrosa</p>
      </div>

      <button onclick="resetearTodo()"
        class="w-full flex items-center gap-3 px-4 py-3.5
               bg-red-50 dark:bg-red-900/20 rounded-xl shadow-sm
               border border-red-100 dark:border-red-800
               text-left hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
        <span class="text-xl">🗑️</span>
        <div>
          <p class="text-sm font-semibold text-red-600 dark:text-red-400">Borrar todos los datos</p>
          <p class="text-xs text-red-400 dark:text-red-500">Restaura la app al estado inicial</p>
        </div>
      </button>

    </div>`;
}

// ══════════════════════════════════════════════════════════════
// 15. ACCIONES DE GESTIÓN
// ══════════════════════════════════════════════════════════════

async function resetearCompra() {
  const comprados = State.productos.filter(p => p.estado === 'comprado').length;
  if (!comprados) { showToast('ℹ️ No hay productos comprados'); return; }
  const ok = await showConfirm({
    title: 'Reiniciar compra',
    body:  `<p class="mt-1 text-slate-600 dark:text-slate-300">Se marcarán como pendientes los <strong>${comprados} producto${comprados !== 1 ? 's' : ''}</strong> comprados. ¿Continuar?</p>`,
    confirmLabel: 'Reiniciar',
    confirmStyle: 'primary'
  });
  if (!ok) return;
  State.productos.forEach(p => { p.estado = 'pendiente'; });
  saveState();
  renderScreen(State.activeTab);
  showToast('🔄 Compra reiniciada');
}

function exportarDB() {
  const data = {
    version: 2,
    exportedAt: new Date().toISOString(),
    secciones: State.secciones,
    productos:  State.productos
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), {
    href: url,
    download: `compra-diaria-${new Date().toISOString().slice(0, 10)}.json`
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('📤 Base de datos exportada');
}

async function importarDB(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!Array.isArray(data.secciones) || !Array.isArray(data.productos)) throw new Error('bad format');
    const ok = await showConfirm({
      title: 'Importar datos',
      body:  `<p class="mt-1 text-slate-600 dark:text-slate-300">Esto reemplazará todos los datos actuales con los de <strong>${esc(file.name)}</strong>.</p>`,
      confirmLabel: 'Importar',
      confirmStyle: 'primary'
    });
    if (!ok) { event.target.value = ''; return; }
    State.secciones = data.secciones;
    State.productos  = data.productos;
    saveState();
    renderScreen(State.activeTab);
    showToast('📥 Datos importados');
  } catch {
    showToast('❌ Fichero inválido o corrupto');
  }
  event.target.value = '';
}

async function resetearTodo() {
  const ok = await showConfirm({
    title: '⚠️ Borrar todos los datos',
    body:  `<p class="mt-1 text-slate-600 dark:text-slate-300">Se eliminarán <strong>todas</strong> las secciones y productos. La app volverá al estado inicial. Esta acción <strong>no se puede deshacer</strong>.</p>`,
    confirmLabel: 'Borrar todo'
  });
  if (!ok) return;
  localStorage.removeItem(LS.INITIALIZED);
  loadState();
  renderScreen(State.activeTab);
  showToast('🗑️ Datos restablecidos');
}

// ══════════════════════════════════════════════════════════════
// 16. SERVICE WORKER
// ══════════════════════════════════════════════════════════════

function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js')
    .then(reg => {
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller)
            showToast('🔄 Actualización disponible — recarga la app', 4000);
        });
      });
    })
    .catch(e => console.error('[LCD] SW:', e));
}

// ══════════════════════════════════════════════════════════════
// 17. OFFLINE DETECTION
// ══════════════════════════════════════════════════════════════

function initOfflineDetection() {
  const badge = document.getElementById('offline-badge');
  const update = () => {
    badge.classList.toggle('hidden', navigator.onLine);
    if (!navigator.onLine) showToast('📡 Modo offline', 3000);
  };
  window.addEventListener('online',  update);
  window.addEventListener('offline', update);
  update();
}

// ══════════════════════════════════════════════════════════════
// 18. EVENTOS DOM
// ══════════════════════════════════════════════════════════════

function initEvents() {
  // Tabs
  document.querySelectorAll('.nav-btn').forEach(btn =>
    btn.addEventListener('click', () => switchTab(btn.dataset.tab))
  );

  // Header dark toggle
  document.getElementById('header-dark-toggle').addEventListener('click', toggleDarkMode);

  // FAB principal (categorías → añadir producto; gestión → añadir sección)
  document.getElementById('fab-add').addEventListener('click', () => {
    if (State.activeTab === 'gestion') anadirSeccion();
    else if (State.activeTab === 'categorias') {
      // Prompt rápido: elegir sección
      if (!State.secciones.length) { showToast('⚠️ Crea una sección primero desde Gestión'); return; }
      anadirProducto(State.secciones[0].id);
    }
  });

  // FAB sub-pantalla
  document.getElementById('fab-sub-add').addEventListener('click', () => {
    if (State.subSectionId) anadirProducto(State.subSectionId);
  });

  // Volver de sub-pantalla
  document.getElementById('sub-back').addEventListener('click', closeSubScreen);

  // Cerrar modal al pulsar overlay
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) e.currentTarget.classList.remove('open');
  });

  // Swipe-back (deslizar hacia derecha) en sub-pantalla
  let startX = 0;
  const sub = document.getElementById('sub-screen');
  sub.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  sub.addEventListener('touchend',   e => {
    if (e.changedTouches[0].clientX - startX > 80 && startX < 60) closeSubScreen();
  }, { passive: true });
}

// ══════════════════════════════════════════════════════════════
// 19. INICIALIZACIÓN
// ══════════════════════════════════════════════════════════════

function init() {
  loadState();
  applyDarkMode(State.darkMode);
  registerSW();
  initOfflineDetection();
  initEvents();

  // Ocultar splash tras animación de carga (1.7s)
  setTimeout(() => {
    const splash = document.getElementById('splash');
    const shell  = document.getElementById('app-shell');
    splash.classList.add('hidden');
    shell.style.display = 'flex';
    switchTab('compra');
    setTimeout(() => splash.remove(), 600);
  }, 1700);
}

document.addEventListener('DOMContentLoaded', init);
