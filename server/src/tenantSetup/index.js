const store = require('../data/store');
const { calculateProgress } = require('../models');

const PLANS = ['starter', 'professional', 'enterprise'];

function dataMappingComplete(state) {
  const step = state?.steps?.find((item) => item.id === 'step_2');
  return step?.status === 'completed';
}

function presentTenant(customer) {
  const tenant = store.getTenantByCustomerId(customer.id);
  if (!tenant) return null;
  return {
    id: tenant.id,
    status: tenant.status,
    plan: tenant.plan,
    region: tenant.region || customer.region
  };
}

function getTenantSetup(customerId) {
  const customer = store.getCustomerById(customerId);
  if (!customer) return { status: 404, body: { error: 'Customer not found' } };
  const state = store.getOnboardingState(customerId);
  return {
    status: 200,
    body: {
      customerId: customer.id,
      customerName: customer.name,
      dataMappingComplete: dataMappingComplete(state),
      plans: PLANS,
      tenant: presentTenant(customer)
    }
  };
}

function completeTenantStep(customerId) {
  const state = store.getOnboardingState(customerId);
  const steps = state.steps.map((step) => (
    step.id === 'step_3' ? { ...step, status: 'completed' } : step
  ));
  return store.updateOnboardingState(customerId, {
    steps,
    progressPercent: calculateProgress(steps)
  });
}

function provisionTenant(customerId, body = {}) {
  const customer = store.getCustomerById(customerId);
  if (!customer) return { status: 404, body: { error: 'Customer not found' } };
  const state = store.getOnboardingState(customerId);
  if (!dataMappingComplete(state)) {
    return { status: 400, body: { error: 'Finish data mapping before creating the tenant' } };
  }

  const plan = String(body.plan || '').trim();
  const region = String(body.region || '').trim().replace(/\s+/g, ' ');
  if (!PLANS.includes(plan)) {
    return { status: 400, body: { error: 'Choose a starter, professional, or enterprise plan' } };
  }
  if (!region) {
    return { status: 400, body: { error: 'Region is required' } };
  }

  const existing = store.getTenantByCustomerId(customerId);
  const tenant = existing
    ? store.updateTenant(customerId, { plan, region, status: 'active' })
    : store.addTenant({
      id: `tenant_${customerId}`,
      customerId,
      plan,
      region,
      status: 'active',
      createdAt: new Date().toISOString()
    });
  const saved = completeTenantStep(customerId);
  return {
    status: 200,
    body: {
      customerId: customer.id,
      customerName: customer.name,
      dataMappingComplete: true,
      plans: PLANS,
      tenant: {
        id: tenant.id,
        status: tenant.status,
        plan: tenant.plan,
        region: tenant.region
      },
      progressPercent: saved.progressPercent
    }
  };
}

module.exports = {
  getTenantSetup,
  provisionTenant,
  PLANS
};
