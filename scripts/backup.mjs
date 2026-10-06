import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const projectRef = 'nptmzqetvlzfhoisubav';
const backupDir = path.resolve(process.cwd(), 'backups', '2026-10-06');

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const tables = [
  'movie_sessions',
  'session_people',
  'movie_proposals',
  'movie_ratings',
  'watched_movies',
  'detailed_ratings',
  'favourite_movies',
  'proposal_comments',
];

function runQuery(sql) {
  const cmd = `npx supabase db query --linked --project-ref ${projectRef} "${sql.replace(/"/g, '\\"')}"`;
  const output = execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
  
  // Find JSON boundary in output
  const jsonStart = output.indexOf('{');
  if (jsonStart === -1) {
    throw new Error(`Unexpected query output: ${output}`);
  }
  const parsed = JSON.parse(output.slice(jsonStart));
  return parsed.rows;
}

function jsonToCsv(items) {
  if (!items || items.length === 0) return '';
  const headers = Object.keys(items[0]);
  const lines = [headers.join(',')];
  for (const item of items) {
    const values = headers.map(header => {
      const val = item[header];
      if (val === null || val === undefined) return '';
      const stringVal = String(val);
      if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
        return `"${stringVal.replace(/"/g, '""')}"`;
      }
      return stringVal;
    });
    lines.push(values.join(','));
  }
  return lines.join('\n');
}

console.log(`Starting database backup into ${backupDir}...`);
const fullBackup = {};

for (const table of tables) {
  console.log(`Backing up table: ${table}...`);
  try {
    const rows = runQuery(`SELECT json_agg(t) FROM (SELECT * FROM ${table}) t;`);
    const data = rows && rows[0] && rows[0].json_agg ? rows[0].json_agg : [];
    fullBackup[table] = data;

    fs.writeFileSync(
      path.join(backupDir, `${table}_rows.json`),
      JSON.stringify(data, null, 2),
      'utf-8'
    );

    const csv = jsonToCsv(data);
    fs.writeFileSync(
      path.join(backupDir, `${table}_rows.csv`),
      csv,
      'utf-8'
    );

    console.log(`  -> Saved ${data.length} rows for ${table}`);
  } catch (err) {
    console.error(`Error backing up table ${table}:`, err.message);
  }
}

// Backup full unified JSON
fs.writeFileSync(
  path.join(backupDir, 'full_database_backup.json'),
  JSON.stringify(fullBackup, null, 2),
  'utf-8'
);

// Backup current policies
console.log('Backing up current RLS policies...');
try {
  const policyRows = runQuery(
    `SELECT 'CREATE POLICY ' || quote_ident(policyname) || ' ON ' || quote_ident(schemaname) || '.' || quote_ident(tablename) || ' AS ' || permissive || ' FOR ' || cmd || ' TO ' || array_to_string(roles, ', ') || CASE WHEN qual IS NOT NULL THEN ' USING (' || qual || ')' ELSE '' END || CASE WHEN with_check IS NOT NULL THEN ' WITH CHECK (' || with_check || ')' ELSE '' END || ';' AS ddl FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;`
  );
  const ddls = policyRows.map(r => r.ddl).join('\n');
  fs.writeFileSync(path.join(backupDir, 'active_policies_backup.sql'), ddls, 'utf-8');
  console.log('  -> Saved active_policies_backup.sql');
} catch (err) {
  console.error('Error backing up policies:', err.message);
}

console.log('Database backup completed successfully!');

