const { describe, it } = require('node:test');
const assert = require('node:assert');
const { getTenantSetup, provisionTenant } = require('./index');
const { saveCustomerInfo } = require('../customerInfo');
const { saveDataMapping } = require('../dataMapping');

describe('tenant setup', () => {
  it('shows a pending tenant with the customer region', () => {
    const result = getTenantSetup('cust_abc');
    assert.strictEqual(result.status, 200);
    assert.strictEqual(result.body.dataMappingComplete, false);
    assert.strictEqual(result.body.tenant.status, 'pending');
    assert.strictEqual(result.body.tenant.plan, 'professional');
    assert.strictEqual(result.body.tenant.region, 'United States');
  });

  it('blocks creation until data mapping is complete', () => {
    const result = provisionTenant('cust_xyz', {
      plan: 'professional',
      region: 'United States'
    });
    assert.strictEqual(result.status, 400);
    assert.strictEqual(result.body.error, 'Finish data mapping before creating the tenant');
  });

  it('creates an active tenant with the chosen plan and region', () => {
    saveCustomerInfo('cust_premier', {});
    saveDataMapping('cust_premier', {});

    const blank = provisionTenant('cust_premier', { plan: 'professional', region: '   ' });
    assert.strictEqual(blank.status, 400);
    assert.strictEqual(blank.body.error, 'Region is required');

    const badPlan = provisionTenant('cust_premier', { plan: 'gold', region: 'United Kingdom' });
    assert.strictEqual(badPlan.status, 400);

    const result = provisionTenant('cust_premier', {
      plan: 'enterprise',
      region: '  United Kingdom  '
    });
    assert.strictEqual(result.status, 200);
    assert.strictEqual(result.body.tenant.status, 'active');
    assert.strictEqual(result.body.tenant.plan, 'enterprise');
    assert.strictEqual(result.body.tenant.region, 'United Kingdom');
    assert.strictEqual(result.body.progressPercent, 75);

    const saved = getTenantSetup('cust_premier');
    assert.strictEqual(saved.body.tenant.status, 'active');
    assert.strictEqual(saved.body.tenant.id, 'tenant_premier');
  });
});