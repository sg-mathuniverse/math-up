const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const source = fs.readFileSync('apps-script/Code.gs', 'utf8');
const start = source.indexOf('function upsertRow_(sheetName,data) {');
const end = source.indexOf('function json_(payload) {', start);
assert.ok(start >= 0 && end > start, 'Could not locate sheet write helpers in Code.gs.');

function makeSheet(headers, rows = []) {
  const values = [headers, ...rows];
  return {
    values,
    getLastColumn() { return headers.length; },
    getRange(row, col, numRows, numCols) {
      return {
        getDisplayValues() {
          return Array.from({ length: numRows }, (_, r) =>
            Array.from({ length: numCols }, (_, c) => String(values[row - 1 + r]?.[col - 1 + c] ?? ''))
          );
        },
        getValues() {
          return Array.from({ length: numRows }, (_, r) =>
            Array.from({ length: numCols }, (_, c) => values[row - 1 + r]?.[col - 1 + c] ?? '')
          );
        },
        setValues(next) {
          next.forEach((line, r) => {
            values[row - 1 + r] = [...line];
          });
        }
      };
    },
    appendRow(row) { values.push([...row]); }
  };
}

const headers = ['id', 'name', 'photoUrl', 'role', 'createdAt', 'updatedAt', 'photoFileId', 'legacyExtra'];
const existingRow = ['u1', 'Old Name', 'old-url', 'Guru', 'created', 'updated', 'private-file-123', 'keep-me'];
const sheet = makeSheet(headers, [existingRow]);
const context = {
  HEADERS: { Users: ['id', 'email', 'name', 'photoUrl', 'role', 'createdAt', 'updatedAt', 'photoFileId'] },
  getSpreadsheet_: () => ({ getSheetByName: () => sheet }),
  findRow_: (name, id) => id === 'u1' ? { rowNumber: 2, data: Object.fromEntries(headers.map((h, i) => [h, existingRow[i]])) } : null
};
vm.runInNewContext(source.slice(start, end), context);

context.updateRow_('Users', 2, { id: 'u1', name: 'New Name', photoUrl: '', updatedAt: 'new-updated' });
assert.deepEqual(sheet.values[1], ['u1', 'New Name', '', 'Guru', 'created', 'new-updated', 'private-file-123', 'keep-me'],
  'Updates must preserve omitted fields and columns while allowing intentional clearing.');

context.findRow_ = () => null;
context.upsertRow_('Users', {
  id: 'u2', email: 'teacher@genius.sch.id', name: 'Second Teacher',
  photoUrl: '', role: 'Guru', createdAt: 'c2', updatedAt: 'u2', photoFileId: 'photo-2'
});
assert.deepEqual(sheet.values[2], ['u2', 'Second Teacher', '', 'Guru', 'c2', 'u2', 'photo-2', ''],
  'Inserts must follow the actual sheet header order, not the latest HEADERS order.');

console.log('Schema migration tests passed: actual header order, omitted-field preservation, intentional clearing, and extra columns.');
