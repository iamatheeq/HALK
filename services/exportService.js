import * as Print from 'expo-print';
// The default `expo-file-system` export now points at the new File/Directory API,
// which has no `documentDirectory`/`writeAsStringAsync`/`EncodingType.UTF8` — those
// classic helpers still live under the explicit legacy import (see backupService.js,
// which hit the same issue).
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { formatCurrency } from '../theme/theme';
import { suppressNextBackgroundLock } from './systemUIGuard';

function toCsv(rows, fields) {
  const escapeCell = (value) => {
    const str = value === null || value === undefined ? '' : String(value);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const header = fields.join(',');
  const body = rows.map((row) => fields.map((f) => escapeCell(row[f])).join(',')).join('\n');
  return `${header}\n${body}`;
}

const CSV_FIELDS = ['month_year', 'total_income', 'total_expenses', 'rollover_amount', 'rollover_target'];

function buildCsv(snapshots) {
  if (!snapshots || snapshots.length === 0) {
    throw new Error('No historical data available to export.');
  }
  return toCsv(snapshots, CSV_FIELDS);
}

/** Saves the CSV straight into a folder the person picks (e.g. Downloads) via
 * Android's Storage Access Framework — a real "download", not a share-sheet
 * handoff that only persists a file if the chosen app happens to save it.
 * Android only — there is no SAF equivalent on iOS. */
export async function saveHistoryCsvToDevice(snapshots) {
  if (Platform.OS !== 'android') {
    throw new Error('Direct download is only available on Android — use Export (share) on this device.');
  }
  const csv = buildCsv(snapshots);

  // Opening the SAF folder picker backgrounds the app just like the share sheet
  // does — without this, the AppState-based auto-lock logs the user out mid-save.
  suppressNextBackgroundLock();
  const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!permissions.granted) {
    throw new Error('Folder access was not granted.');
  }

  const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
    permissions.directoryUri,
    `halk_history_export_${Date.now()}.csv`,
    'text/csv'
  );
  await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
  return fileUri;
}

function buildSummaryHtml({ title, subtitle, snapshots, categories }) {
  const rows = (snapshots || [])
    .map((s) => {
      const net = (s.total_income ?? 0) - (s.total_expenses ?? 0);
      return `
        <tr>
          <td>${s.month_year}</td>
          <td class="num">${formatCurrency(s.total_income)}</td>
          <td class="num">${formatCurrency(s.total_expenses)}</td>
          <td class="num ${net >= 0 ? 'positive' : 'negative'}">${formatCurrency(net)}</td>
          <td class="num">${formatCurrency(s.rollover_amount)}</td>
        </tr>`;
    })
    .join('');

  const categoryRows = (categories || [])
    .map(
      (c) => `
        <tr>
          <td>${c.name}</td>
          <td>${c.bucket}</td>
          <td class="num">${formatCurrency(c.allocated_amount)}</td>
        </tr>`
    )
    .join('');

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #0b1c30; padding: 32px; }
          h1 { color: #006e2f; margin-bottom: 4px; }
          h2 { margin-top: 32px; color: #0b1c30; font-size: 16px; }
          p.subtitle { color: #545f73; margin-top: 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th { text-align: left; background: #e5eeff; padding: 8px; font-size: 11px; text-transform: uppercase; color: #545f73; }
          td { padding: 8px; border-bottom: 1px solid #e5eeff; font-size: 13px; }
          td.num { text-align: right; font-variant-numeric: tabular-nums; }
          td.positive { color: #006e2f; font-weight: 600; }
          td.negative { color: #ba1a1a; font-weight: 600; }
          .badge { display: inline-block; background: #0f172a; color: #f8fafc; padding: 4px 10px; border-radius: 999px; font-size: 11px; margin-top: 8px; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p class="subtitle">${subtitle}</p>
        <span class="badge">100% On-Device &bull; Encrypted Export</span>

        <h2>Monthly Reconciliation</h2>
        <table>
          <thead>
            <tr><th>Month</th><th>Income</th><th>Expenses</th><th>Net</th><th>Rollover</th></tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="5">No snapshots recorded yet.</td></tr>'}</tbody>
        </table>

        ${
          categories && categories.length
            ? `<h2>Current Budget Allocation</h2>
        <table>
          <thead><tr><th>Category</th><th>Bucket</th><th>Allocated</th></tr></thead>
          <tbody>${categoryRows}</tbody>
        </table>`
            : ''
        }
      </body>
    </html>`;
}

/**
 * Renders an HTML summary of budget health / history and opens the native print
 * dialog — Android/iOS's own print framework includes "Save as PDF" as a built-in
 * option, so this never hands a generated file to a *different* module (expo-print
 * writing it, expo-sharing then reading it back) the way printToFileAsync + share
 * did. That handoff is what threw "Not allowed to read file under given URL".
 */
export async function exportSummaryToPdf({ title = 'HALK Financial Summary', subtitle = '', snapshots = [], categories = [] }) {
  const html = buildSummaryHtml({ title, subtitle, snapshots, categories });
  // Printing opens a system UI surface, same as the share sheet — suppress the
  // AppState background-triggered auto-lock the same way.
  suppressNextBackgroundLock();
  await Print.printAsync({ html });
}
