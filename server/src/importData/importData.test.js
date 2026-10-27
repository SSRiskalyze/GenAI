const { describe, it } = require('node:test');
const assert = require('node:assert');
const store = require('../data/store');
const { saveCustomerInfo } = require('../customerInfo');
const { saveDataMapping } = require('../dataMapping');
const { provisionTenant } = require('../tenantSetup');
const { getImport, runImport } = require('./index');

function provision(customerId, region) {
  saveCustomerInfo(customerId, {});
  saveDataMapping(customerId, {});
  provisionTenant(customerId, { plan: 'professional', region });
}

describe('import', { concurrency: 1 }, () => {
  it('blocks import until the tenant is active', () => {
    const preview = getImport('cust_xyz');
    assert.strictEqual(preview.status, 200);
    assert.strictEqual(preview.body.tenantSetupComplete, false);
    assert.strictEqual(preview.body.mode, 'files');

    const result = runImport('cust_xyz');
    assert.strictEqual(result.status, 400);
    assert.strictEqual(result.body.error, 'Finish tenant setup before importing data');
  });

  it('imports the sample files with platform values', () => {
    provision('cust_abc', 'United States');
    provision('cust_xyz', 'United States');
    provision('cust_premier', 'United Kingdom');

    const abc = runImport('cust_abc');
    assert.strictEqual(abc.status, 200);
    assert.strictEqual(abc.body.ready, true);
    assert.deepStrictEqual(abc.body.issues, []);
    assert.deepStrictEqual(
      abc.body.files.map((file) => [file.id, file.total, file.invalid]),
      [
        ['clients', 10, 0],
        ['contacts', 15, 0],
        ['accounts', 39, 0],
        ['transactions', 25, 0]
      ]
    );
    assert.strictEqual(abc.body.progressPercent, 100);
    const abcClients = store.getPlatformData('cust_abc').files.clients;
    const abcTxn = store.getPlatformData('cust_abc').files.transactions.find((row) => row.transactionId === 'TXN001');
    assert.strictEqual(abcClients[0].name, 'Riverside Manufacturing LLC');
    assert.strictEqual(abcClients[0].startDate, '2023-01-15');
    assert.strictEqual(abcClients[0].paymentTerms, 'Net 30');
    assert.strictEqual(abcTxn.direction, 'Credit');
    assert.strictEqual(abcTxn.paymentMethod, 'Wire Transfer');
    assert.strictEqual(abcTxn.status, 'Completed');
    assert.strictEqual(abcTxn.date, '2024-01-15');
    assert.strictEqual(abcTxn.amount, 15000);

    const xyz = runImport('cust_xyz');
    assert.strictEqual(xyz.status, 200);
    assert.deepStrictEqual(xyz.body.issues, []);
    assert.deepStrictEqual(
      xyz.body.files.map((file) => file.total),
      [12, 18, 39, 25]
    );
    const xyzClients = store.getPlatformData('cust_xyz').files.clients;
    const xyzTxn = store.getPlatformData('cust_xyz').files.transactions.find((row) => row.transactionId === 'T-10001');
    assert.strictEqual(xyzClients[0].primaryContact, 'Robert Williams');
    assert.strictEqual(xyzClients[0].status, 'Active');
    assert.strictEqual(xyzClients[0].entityType, 'Corporation');
    assert.strictEqual(xyzClients[0].paymentTerms, 'Net 30');
    assert.strictEqual(xyzTxn.direction, 'Credit');
    assert.strictEqual(xyzTxn.paymentMethod, 'Wire Transfer');
    assert.strictEqual(xyzTxn.status, 'Completed');

    const premier = runImport('cust_premier');
    assert.strictEqual(premier.status, 200);
    assert.deepStrictEqual(premier.body.issues, []);
    assert.deepStrictEqual(
      premier.body.files.map((file) => file.total),
      [12, 20, 39, 25]
    );
    const premierClients = store.getPlatformData('cust_premier').files.clients;
    const premierTxns = store.getPlatformData('cust_premier').files.transactions;
    const premierAccounts = store.getPlatformData('cust_premier').files.accounts;
    assert.strictEqual(premierClients[0].entityType, 'Sole Proprietor');
    assert.strictEqual(premierClients[0].status, 'Active');
    assert.strictEqual(premierClients[0].paymentTerms, 'Due on receipt');
    assert.strictEqual(premierClients[0].startDate, '2023-03-15');
    assert.strictEqual(premierClients.find((row) => row.clientId === 'PB-0004').status, 'Inactive');
    assert.strictEqual(premierTxns.find((row) => row.transactionId === 'TRN-00001').paymentMethod, 'ACH');
    assert.strictEqual(premierTxns.find((row) => row.transactionId === 'TRN-00001').direction, 'Credit');
    assert.strictEqual(premierTxns.find((row) => row.transactionId === 'TRN-00001').status, 'Completed');
    assert.strictEqual(premierTxns.find((row) => row.transactionId === 'TRN-00002').paymentMethod, 'Check');
    assert.strictEqual(premierTxns.find((row) => row.transactionId === 'TRN-00004').paymentMethod, 'Standing Order');
    assert.strictEqual(premierTxns.find((row) => row.transactionId === 'TRN-00005').status, 'Pending');
    assert.strictEqual(premierTxns.find((row) => row.transactionId === 'TRN-00009').paymentMethod, 'Financing');
    assert.strictEqual(premierAccounts[0].accountType, 'Asset');
    assert.strictEqual(premierAccounts[0].normalBalance, 'Debit');
    assert.strictEqual(premierAccounts[0].active, 'Active');

    const again = getImport('cust_abc');
    assert.strictEqual(again.body.imported, true);
    assert.strictEqual(again.body.files[0].preview[0].name, 'Riverside Manufacturing LLC');
  });

  it('imports an Acme profile once the tenant is active', () => {
    saveCustomerInfo('cust_001', {
      name: 'Acme Corporation',
      industry: 'Manufacturing',
      region: 'North America',
      contactEmail: 'Onboarding@Acme.example.com'
    });
    saveDataMapping('cust_001', {});
    const blocked = runImport('cust_001');
    assert.strictEqual(blocked.status, 400);

    provisionTenant('cust_001', { plan: 'starter', region: 'North America' });
    const result = runImport('cust_001');
    assert.strictEqual(result.status, 200);
    assert.strictEqual(result.body.mode, 'profile');
    assert.strictEqual(result.body.profile.contactEmail, 'onboarding@acme.example.com');
    assert.strictEqual(result.body.progressPercent, 100);
    assert.strictEqual(store.getPlatformData('cust_001').profile.name, 'Acme Corporation');
  });

  it('returns not found for an unknown customer', () => {
    assert.strictEqual(getImport('missing').status, 404);
    assert.strictEqual(runImport('missing').status, 404);
  });
});
