/**
 * In-Memory Data Store
 * Simple storage for the training exercise - no database needed
 */

const { createCustomer, createTenant, createDefaultOnboardingSteps } = require('../models');

// In-memory storage
const store = {
  customers: [],
  tenants: [],
  onboardingStates: []
};

function seedCustomer({ id, name, industry, region, contactEmail, createdAt, clientSource, tenantId, plan }) {
  store.customers.push(createCustomer({
    id,
    name,
    industry,
    region,
    contactEmail,
    clientSource,
    createdAt
  }));
  store.tenants.push(createTenant({
    id: tenantId,
    customerId: id,
    status: 'pending',
    plan,
    createdAt
  }));
  store.onboardingStates.push({
    customerId: id,
    steps: createDefaultOnboardingSteps(),
    progressPercent: 0
  });
}

// Seed with example data
function seedData() {
  seedCustomer({
    id: 'cust_001',
    name: 'Acme Corporation',
    industry: 'Manufacturing',
    region: 'North America',
    contactEmail: 'onboarding@acme.example.com',
    createdAt: '2025-01-15T10:00:00Z',
    tenantId: 'tenant_001',
    plan: 'professional'
  });
  seedCustomer({
    id: 'cust_abc',
    name: 'ABC Accounting',
    industry: 'Accounting',
    region: 'United States',
    contactEmail: 'onboarding@abc.example.com',
    clientSource: 'CustomerA_ABCAccounting',
    createdAt: '2025-02-01T10:00:00Z',
    tenantId: 'tenant_abc',
    plan: 'professional'
  });
  seedCustomer({
    id: 'cust_xyz',
    name: 'XYZ Financial Services',
    industry: 'Financial Services',
    region: 'United States',
    contactEmail: 'onboarding@xyz.example.com',
    clientSource: 'CustomerB_XYZFinancialServices',
    createdAt: '2025-02-02T10:00:00Z',
    tenantId: 'tenant_xyz',
    plan: 'professional'
  });
  seedCustomer({
    id: 'cust_premier',
    name: 'Premier Bookkeeping',
    industry: 'Bookkeeping',
    region: 'United Kingdom',
    contactEmail: 'onboarding@premier.example.com',
    clientSource: 'CustomerC_PremierBookkeeping',
    createdAt: '2025-02-03T10:00:00Z',
    tenantId: 'tenant_premier',
    plan: 'professional'
  });
}

// Initialize with seed data
seedData();

// Store access functions
function getCustomers() {
  return [...store.customers];
}

function getCustomerById(id) {
  return store.customers.find(c => c.id === id);
}

function addCustomer(customer) {
  store.customers.push(customer);
  return customer;
}

function updateCustomer(id, updates) {
  const customer = store.customers.find((item) => item.id === id);
  if (!customer) return null;
  Object.assign(customer, updates, { id: customer.id });
  return customer;
}

function getTenants() {
  return [...store.tenants];
}

function getTenantByCustomerId(customerId) {
  return store.tenants.find(t => t.customerId === customerId);
}

function addTenant(tenant) {
  store.tenants.push(tenant);
  return tenant;
}

function getOnboardingState(customerId) {
  return store.onboardingStates.find(s => s.customerId === customerId);
}

function getAllOnboardingStates() {
  return [...store.onboardingStates];
}

function addOnboardingState(state) {
  store.onboardingStates.push(state);
  return state;
}

function updateOnboardingState(customerId, updates) {
  const index = store.onboardingStates.findIndex(s => s.customerId === customerId);
  if (index !== -1) {
    store.onboardingStates[index] = { ...store.onboardingStates[index], ...updates };
    return store.onboardingStates[index];
  }
  return null;
}

module.exports = {
  getCustomers,
  getCustomerById,
  addCustomer,
  updateCustomer,
  getTenants,
  getTenantByCustomerId,
  addTenant,
  getOnboardingState,
  getAllOnboardingStates,
  addOnboardingState,
  updateOnboardingState
};
