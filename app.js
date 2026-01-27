// ==================== CARGA CSV ====================
async function loadCSV() {
  const res = await fetch('./ventas_raw.csv');
  if (!res.ok) throw new Error('No se pudo cargar el CSV');
  return await res.text();
}

// ==================== PARSER CSV ====================
function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const obj = {};
    headers.forEach((h, j) => obj[h] = values[j]);
    rows.push(obj);
  }
  return rows;
}

// ==================== NORMALIZACIÓN ====================
function normalizeFranja(v) {
  v = v.toLowerCase();
  return v.includes('desa') ? 'Desayuno' : 'Comida';
}

function normalizeFamilia(v) {
  v = v.toLowerCase();
  if (v.includes('beb')) return 'Bebida';
  if (v.includes('entra')) return 'Entrante';
  if (v.includes('post')) return 'Postre';
  return 'Principal';
}

function normalizeProducto(v) {
  return v.trim().toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/^\w/, c => c.toUpperCase());
}

// ==================== LIMPIEZA ====================
function cleanData(rows) {
  const clean = [];
  const seen = new Set();

  for (const r of rows) {
    const fecha = new Date(r.fecha);
    const unidades = Number(r.unidades);
    const precio = Number(r.precio_unitario);

    if (isNaN(fecha)) continue;
    if (!r.producto || r.producto.trim() === '') continue;
    if (unidades <= 0 || precio <= 0) continue;

    const row = {
      fecha: fecha.toISOString().slice(0,10),
      franja: normalizeFranja(r.franja),
      producto: normalizeProducto(r.producto),
      familia: normalizeFamilia(r.familia),
      unidades,
      precio_unitario: precio,
      importe: +(unidades * precio).toFixed(2)
    };

    const key = JSON.stringify(row);
    if (seen.has(key)) continue;
    seen.add(key);

    clean.push(row);
  }

  return clean;
}

// ==================== KPIS ====================
function computeKPIs(data) {
  const k = {
    totalVentas: 0,
    totalUnidades: 0,
    porProducto: {},
    porFranja: {},
    porFamilia: {}
  };

  data.forEach(r => {
    k.totalVentas += r.importe;
    k.totalUnidades += r.unidades;
    k.porProducto[r.producto] = (k.porProducto[r.producto] || 0) + r.importe;
    k.porFranja[r.franja] = (k.porFranja[r.franja] || 0) + r.importe;
    k.porFamilia[r.familia] = (k.porFamilia[r.familia] || 0) + r.importe;
  });

  return k;
}

// ==================== TABLAS ====================
function renderTable(data, id) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  let html = '<table><tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr>';

  data.slice(0,10).forEach(r => {
    html += '<tr>' + headers.map(h => `<td>${r[h]}</td>`).join('') + '</tr>';
  });

  html += '</table>';
  document.getElementById(id).innerHTML = html;
}

// ==================== GRÁFICOS ====================
function renderCharts(k) {
  new Chart(chartTop5, {
    type: 'bar',
    data: {
      labels: Object.keys(k.porProducto).slice(0,5),
      datasets: [{ data: Object.values(k.porProducto).slice(0,5) }]
    }
  });

  new Chart(chartFranja, {
    type: 'pie',
    data: {
      labels: Object.keys(k.porFranja),
      datasets: [{ data: Object.values(k.porFranja) }]
    }
  });

  new Chart(chartFamilia, {
    type: 'pie',
    data: {
      labels: Object.keys(k.porFamilia),
      datasets: [{ data: Object.values(k.porFamilia) }]
    }
  });
}

// ==================== DESCARGA CSV LIMPIO ====================
function downloadClean(data) {
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(r => Object.values(r).join(','));
  const csv = [headers, ...rows].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'ventas_clean.csv';
  a.click();
}

// ==================== MAIN ====================
let cleanDataGlobal = [];

window.onload = async () => {
  const text = await loadCSV();
  const raw = parseCSV(text);
  cleanDataGlobal = cleanData(raw);

  document.getElementById('counts').textContent =
    `Filas antes: ${raw.length} | Filas después: ${cleanDataGlobal.length}`;

  const kpis = computeKPIs(cleanDataGlobal);

  document.getElementById('kpis').innerHTML = `
    <div class="kpi">Ventas totales: €${kpis.totalVentas.toFixed(2)}</div>
    <div class="kpi">Unidades totales: ${kpis.totalUnidades}</div>
  `;

  renderTable(raw, 'rawTable');
  renderTable(cleanDataGlobal, 'cleanTable');
  renderCharts(kpis);
};

document.getElementById('downloadCleanBtn').onclick = () => {
  downloadClean(cleanDataGlobal);
};
