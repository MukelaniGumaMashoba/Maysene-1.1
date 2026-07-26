/**
 * Import stop points and offloading points from Excel into Supabase.
 *
 * Usage:
 *   node scripts/import-stop-points.js --dry     (preview without writing)
 *   node scripts/import-stop-points.js --exec    (actually insert into DB)
 */

const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// ── Supabase ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://jbactgkcijnkjpyqqzxv.supabase.co';
const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpiYWN0Z2tjaWpua2pweXFxenh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTE2NzYxOSwiZXhwIjoyMDgwNTI3NjE5fQ.AZSepp-cDN7RULvGgiipmjde9zX2OL2RY9uJgUDK-f8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── CLI ───────────────────────────────────────────────────────────────────────
const mode = process.argv[2]; // --dry or --exec
if (mode !== '--dry' && mode !== '--exec') {
  console.log('Usage:  node scripts/import-stop-points.js [--dry | --exec]');
  process.exit(1);
}
const DRY = mode === '--dry';

// ── Helpers ───────────────────────────────────────────────────────────────────
const EXCEL_PATH = path.join(
  __dirname,
  '..',
  'supabase',
  'migrations',
  'OFFLOADING AND TRUCK STOP SHEET.xlsx'
);

/** European-style decimals (comma → dot) */
function fixDecimal(v) {
  if (v == null) return null;
  const s = String(v).replace(/,/g, '.');
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

/** Build "lat,lng,0 lat,lng,0 ..." from a rows array */
function buildCoords(rows) {
  return rows
    .map((r) => {
      const lng = fixDecimal(r.lng);
      const lat = fixDecimal(r.lat);
      if (lng == null || lat == null) return null;
      return `${lat},${lng},0`;
    })
    .filter(Boolean)
    .join(' ');
}

// ── Read workbook ─────────────────────────────────────────────────────────────
const wb = XLSX.readFile(EXCEL_PATH);
console.log(`Workbook sheets: ${wb.SheetNames.join(', ')}\n`);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. TRUCK STOP → stop_points
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const truckStopRows = XLSX.utils.sheet_to_json(wb.Sheets['TRUCK STOP']);
console.log(`TRUCK STOP: ${truckStopRows.length} rows`);

const stopPoints = truckStopRows
  .filter((r) => r.Name)
  .map((r) => {
    // Excel coords are "lng,lat,0 lng,lat,0" → we need "lat,lng,0 lat,lng,0"
    const raw = String(r.Coordinates || '').trim();
    const pairs = raw
      .split(/\s+/)
      .filter(Boolean)
      .map((pair) => {
        const parts = pair.split(',');
        if (parts.length < 2) return null;
        const lng = parseFloat(parts[0]);
        const lat = parseFloat(parts[1]);
        if (isNaN(lng) || isNaN(lat)) return null;
        return `${lat},${lng},0`;
      })
      .filter(Boolean);

    return {
      name: String(r.Name || '').trim(),
      type: 'truck_stop',
      coordinates: pairs.join(' '),
    };
  })
  .filter((s) => s.name && s.coordinates);

console.log(`  → ${stopPoints.length} valid stop points\n`);
stopPoints.forEach((s, i) => {
  console.log(`  ${i + 1}. ${s.name}`);
  console.log(`     coords: ${s.coordinates.substring(0, 80)}${s.coordinates.length > 80 ? '...' : ''}`);
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. OFFLOADING POINTS 1 → clients  (centre + min/max as 6-point polygon)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const offload1Rows = XLSX.utils.sheet_to_json(wb.Sheets['OFFLOADING POINTS 1']);
console.log(`\nOFFLOADING POINTS 1: ${offload1Rows.length} rows`);

const offloadClients1 = offload1Rows
  .filter((r) => r.Name)
  .map((r) => {
    const clng = fixDecimal(r['Centre Longitude']);
    const clat = fixDecimal(r['Centre Latitude']);
    const mlng = fixDecimal(r['Min Longitude']);
    const mlat = fixDecimal(r['Min Latitude']);
    const xlng = fixDecimal(r['Max Longitude']);
    const xlat = fixDecimal(r['Max Latitude']);

    const coords = [
      clng != null && clat != null ? `${clat},${clng},0` : null,
      mlng != null && mlat != null ? `${mlat},${mlng},0` : null,
      xlng != null && xlat != null ? `${xlat},${xlng},0` : null,
    ]
      .filter(Boolean)
      .join(' ');

    return {
      name: String(r.Name || '').trim(),
      coordinates: coords,
      style_url: r['Style URL'] || null,
    };
  })
  .filter((c) => c.name && c.coordinates);

console.log(`  → ${offloadClients1.length} valid clients\n`);
offloadClients1.forEach((c, i) => {
  console.log(`  ${i + 1}. ${c.name}`);
  console.log(`     coords: ${c.coordinates}`);
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. OFFLOADING POINTS 2 → clients  (polygon vertices grouped by name)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const offload2Rows = XLSX.utils.sheet_to_json(wb.Sheets['OFFLOADING POINTS 2']);
console.log(`\nOFFLOADING POINTS 2: ${offload2Rows.length} rows`);

// Group by Placemark Name, preserving vertex order
const grouped = {};
offload2Rows.forEach((r) => {
  const name = String(r['Placemark Name'] || '').trim();
  if (!name) return;
  if (!grouped[name]) grouped[name] = [];
  grouped[name].push({
    lng: r.Longitude,
    lat: r.Latitude,
    vertex: r['Vertex Number'] || 0,
  });
});

// Sort vertices by vertex number within each group
Object.values(grouped).forEach((vertices) => {
  vertices.sort((a, b) => (a.vertex || 0) - (b.vertex || 0));
});

const offloadClients2 = Object.entries(grouped).map(([name, vertices]) => ({
  name,
  coordinates: buildCoords(vertices),
}));

console.log(`  → ${offloadClients2.length} unique clients\n`);
offloadClients2.forEach((c, i) => {
  console.log(
    `  ${i + 1}. ${c.name} (${c.coordinates.split(' ').length} vertices)`
  );
  console.log(`     coords: ${c.coordinates.substring(0, 80)}...`);
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. MERGE: OFFLOADING POINTS 2 coordinates INTO OFFLOADING POINTS 1 entries
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// For clients that appear in both sheets, prefer the full polygon from sheet 2
const allClientsMap = new Map();
offloadClients1.forEach((c) => allClientsMap.set(c.name, c));
offloadClients2.forEach((c) => {
  if (allClientsMap.has(c.name)) {
    // Sheet 2 has full polygon — use it, keep style_url from sheet 1
    const existing = allClientsMap.get(c.name);
    allClientsMap.set(c.name, { ...existing, coordinates: c.coordinates });
  } else {
    allClientsMap.set(c.name, c);
  }
});
const allClients = Array.from(allClientsMap.values());
console.log(`\nMERGED clients: ${allClients.length} unique\n`);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. EXECUTE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function run() {
  if (DRY) {
    console.log('\n========================================');
    console.log('  DRY RUN — no data was written');
    console.log('========================================');
    console.log(`\nWould insert:`);
    console.log(`  • ${stopPoints.length} rows into stop_points`);
    console.log(`  • ${allClients.length} rows into clients`);
    console.log('\nRun with --exec to apply.');
    return;
  }

  console.log('\nStarting import...\n');

  // ── Stop Points ─────────────────────────────────────────────────────────────
  let stopOk = 0;
  let stopFail = 0;
  for (const sp of stopPoints) {
    const { error } = await supabase.from('stop_points').insert({
      name: sp.name,
      type: sp.type,
      coordinates: sp.coordinates,
    });
    if (error) {
      console.error(`  ✗ stop_points: ${sp.name} — ${error.message}`);
      stopFail++;
    } else {
      console.log(`  ✓ stop_points: ${sp.name}`);
      stopOk++;
    }
  }

  // ── Clients ─────────────────────────────────────────────────────────────────
  let clientOk = 0;
  let clientFail = 0;
  for (const cl of allClients) {
    const { error } = await supabase.from('clients').insert({
      name: cl.name,
      coordinates: cl.coordinates,
      style_url: cl.style_url || null,
      type: 'warehouse',
      status: 'Active',
    });
    if (error) {
      console.error(`  ✗ clients: ${cl.name} — ${error.message}`);
      clientFail++;
    } else {
      console.log(`  ✓ clients: ${cl.name}`);
      clientOk++;
    }
  }

  console.log('\n========================================');
  console.log('  IMPORT COMPLETE');
  console.log('========================================');
  console.log(`  stop_points: ${stopOk} inserted, ${stopFail} failed`);
  console.log(`  clients:     ${clientOk} inserted, ${clientFail} failed`);
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
