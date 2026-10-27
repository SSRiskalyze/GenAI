const { describe, it } = require('node:test');
const assert = require('node:assert');
const { getDataMapping, saveDataMapping } = require('./index');
const { saveCustomerInfo } = require('../customerInfo');

describe('data mapping', () => {
  it('suggests a complete platform map for ABC Accounting', () => {
    const result = getDataMapping('cust_abc');
    assert.strictEqual(result.status, 200);
    assert.strictEqual(result.body.ready, true);
    const clients = result.body.files.find((file) => file.id === 'clients');
    assert.strictEqual(clients.mapping['Client ID'], 'clientId');
    assert.strictEqual(clients.mapping['Date Onboarded'], 'startDate');
    const transactions = result.body.files.find((file) => file.id === 'transactions');
    assert.strictEqual(transactions.mapping['Transaction Type'], 'direction');
  });

  it('suggests Premier nominal codes and XYZ transaction columns', () => {
    const premier = getDataMapping('cust_premier').body.files.find((file) => file.id === 'accounts');
    const xyz = getDataMapping('cust_xyz').body.files.find((file) => file.id === 'transactions');
    assert.strictEqual(premier.mapping.nominal_code, 'accountCode');
    assert.strictEqual(xyz.mapping.txnAmount, 'amount');
    assert.strictEqual(xyz.mapping.entryType, 'direction');
  });

  it('rejects a map that leaves a required platform field empty', () => {
    saveCustomerInfo('cust_abc', {});
    const current = getDataMapping('cust_abc').body;
    const mappings = Object.fromEntries(current.files.map((file) => [file.id, { ...file.mapping }]));
    mappings.clients['Client Name'] = '';
    const result = saveDataMapping('cust_abc', { mappings });
    assert.strictEqual(result.status, 400);
    assert.match(result.body.error, /Name is not mapped/);
  });

  it('blocks mapping until customer info is complete', () => {
    const result = saveDataMapping('cust_xyz', {});
    assert.strictEqual(result.status, 400);
    assert.strictEqual(result.body.error, 'Finish customer info before mapping data');
  });

  it('saves a ready map and marks the step complete', () => {
    saveCustomerInfo('cust_premier', {});
    const result = saveDataMapping('cust_premier', {});
    assert.strictEqual(result.status, 200);
    assert.strictEqual(result.body.progressPercent, 50);
    const again = getDataMapping('cust_premier');
    assert.strictEqual(again.body.files[0].mapping.customer_id, 'clientId');
  });
});