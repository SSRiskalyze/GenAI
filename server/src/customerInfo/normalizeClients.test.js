const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { normalizeClients } = require('./normalizeClients');
const { getCustomerInfo, saveCustomerInfo } = require('./index');

const sampleRoot = path.join(__dirname, '../../../sample-data');

function csv(headers, rows) {
  return [headers.join(','), ...rows].join('\n');
}

describe('normalizeClients', () => {
  it('normalizes ABC Accounting dates, status, and business type', () => {
    const text = csv(
      ['Client ID', 'Client Name', 'Business Type', 'Status', 'Date Onboarded', 'Tax ID', 'Annual Revenue', 'Industry', 'Payment Terms', 'Primary Contact'],
      ['C001,Riverside Manufacturing LLC,Corporation,Active,01/15/2023,12-3456789,2500000.00,Manufacturing,Net 30,John Smith']
    );
    const { clients } = normalizeClients(text, 'CustomerA_ABCAccounting');

    assert.strictEqual(clients[0].startDate, '2023-01-15');
    assert.strictEqual(clients[0].status, 'Active');
    assert.strictEqual(clients[0].entityType, 'Corporation');
    assert.strictEqual(clients[0].paymentTerms, 'Net 30');
    assert.strictEqual(clients[0].annualRevenue, 2500000);
    assert.strictEqual(clients[0].valid, true);
  });

  it('normalizes XYZ contact names and short codes', () => {
    const text = csv(
      ['clientCode', 'companyName', 'entityType', 'clientStatus', 'startDate', 'federalTaxId', 'yearlyRevenue', 'sectorCode', 'billingTerms', 'mainContact'],
      ['XYZ-001,Apex Digital Marketing,CORP,A,2023-02-10,11-2233445,1850000,TECH,NET30,Williams, Robert']
    );
    const { clients } = normalizeClients(text, 'CustomerB_XYZFinancialServices');

    assert.strictEqual(clients[0].primaryContact, 'Robert Williams');
    assert.strictEqual(clients[0].status, 'Active');
    assert.strictEqual(clients[0].entityType, 'Corporation');
    assert.strictEqual(clients[0].paymentTerms, 'Net 30');
    assert.strictEqual(clients[0].startDate, '2023-02-10');
  });

  it('normalizes Premier dates, dormant status, and payment terms', () => {
    const text = csv(
      ['customer_id', 'business_name', 'legal_structure', 'account_status', 'registration_date', 'tax_reference', 'gross_revenue', 'industry_sector', 'credit_terms', 'key_contact_name'],
      [
        'PB-0004,Dockside Imports & Exports,Limited Company,DORMANT,28-01-2022,GB456789012,1250000.00,Import/Export,60 Days,James Crawford',
        'PB-0010,Junction Auto Repairs,Sole Trader,SUSPENDED,14-02-2022,GB012345678,195000.00,Automotive,Immediate,Matthew Barnes'
      ]
    );
    const { clients } = normalizeClients(text, 'CustomerC_PremierBookkeeping');

    assert.strictEqual(clients[0].startDate, '2022-01-28');
    assert.strictEqual(clients[0].status, 'Inactive');
    assert.strictEqual(clients[0].entityType, 'Corporation');
    assert.strictEqual(clients[0].paymentTerms, 'Net 60');
    assert.strictEqual(clients[1].status, 'Pending');
    assert.strictEqual(clients[1].entityType, 'Sole Proprietor');
    assert.strictEqual(clients[1].paymentTerms, 'Due on receipt');
  });

  it('rejects a blank name and an impossible date', () => {
    const text = csv(
      ['Client ID', 'Client Name', 'Business Type', 'Status', 'Date Onboarded', 'Tax ID', 'Annual Revenue', 'Industry', 'Payment Terms', 'Primary Contact'],
      ['C099,,Corporation,Active,02/31/2023,12-3456789,10,Manufacturing,Net 30,Jane Doe']
    );
    const { clients, summary } = normalizeClients(text, 'CustomerA_ABCAccounting');

    assert.strictEqual(summary.invalid, 1);
    assert.ok(clients[0].errors.includes('Client name is required'));
    assert.ok(clients[0].errors.includes('Start date is not a valid date'));
  });

  it('normalizes every bundled client file without errors', () => {
    const sources = [
      'CustomerA_ABCAccounting',
      'CustomerB_XYZFinancialServices',
      'CustomerC_PremierBookkeeping'
    ];

    sources.forEach((source) => {
      const text = fs.readFileSync(path.join(sampleRoot, source, 'clients.csv'), 'utf8');
      const { summary } = normalizeClients(text, source);
      assert.ok(summary.total > 0, source);
      assert.strictEqual(summary.invalid, 0, source);
    });
  });
});

describe('customer info API helpers', () => {
  it('returns normalized ABC clients', () => {
    const result = getCustomerInfo('cust_abc');
    assert.strictEqual(result.status, 200);
    assert.strictEqual(result.body.mode, 'clients');
    assert.strictEqual(result.body.summary.invalid, 0);
    assert.strictEqual(result.body.clients[0].name, 'Riverside Manufacturing LLC');
    assert.strictEqual(result.body.clients[0].startDate, '2023-01-15');
  });

  it('rejects a blank Acme name and keeps progress at 0', () => {
    const result = saveCustomerInfo('cust_001', {
      name: '   ',
      industry: 'Manufacturing',
      region: 'North America',
      contactEmail: 'onboarding@acme.example.com'
    });
    assert.strictEqual(result.status, 400);
    const saved = getCustomerInfo('cust_001');
    assert.strictEqual(saved.body.profile.name, 'Acme Corporation');
  });

  it('normalizes Acme email and marks customer info complete', () => {
    const result = saveCustomerInfo('cust_001', {
      name: '  Acme Corporation  ',
      industry: 'Manufacturing',
      region: 'North America',
      contactEmail: '  Onboarding@Acme.Example.com '
    });
    assert.strictEqual(result.status, 200);
    assert.strictEqual(result.body.profile.contactEmail, 'onboarding@acme.example.com');
    assert.strictEqual(result.body.progressPercent, 25);
  });
});