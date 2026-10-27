const fs = require('fs');
const path = require('path');
const store = require('../data/store');
const { calculateProgress } = require('../models');
const { normalizeClients } = require('./normalizeClients');

const SAMPLE_ROOT = path.join(__dirname, '../../../sample-data');

function readClientFile(clientSource) {
  const filePath = path.join(SAMPLE_ROOT, clientSource, 'clients.csv');
  return fs.readFileSync(filePath, 'utf8');
}

function completeCustomerInfo(customerId) {
  const state = store.getOnboardingState(customerId);
  if (!state) return null;
  const steps = state.steps.map((step) => (
    step.id === 'step_1' ? { ...step, status: 'completed' } : step
  ));
  return store.updateOnboardingState(customerId, {
    steps,
    progressPercent: calculateProgress(steps)
  });
}

function getCustomerInfo(customerId) {
  const customer = store.getCustomerById(customerId);
  if (!customer) return { status: 404, body: { error: 'Customer not found' } };

  if (!customer.clientSource) {
    return {
      status: 200,
      body: {
        customerId: customer.id,
        customerName: customer.name,
        mode: 'profile',
        profile: {
          name: customer.name,
          industry: customer.industry,
          region: customer.region,
          contactEmail: customer.contactEmail
        }
      }
    };
  }

  const normalized = normalizeClients(readClientFile(customer.clientSource), customer.clientSource);
  return {
    status: 200,
    body: {
      customerId: customer.id,
      customerName: customer.name,
      mode: 'clients',
      sourceFile: `${customer.clientSource}/clients.csv`,
      ...normalized
    }
  };
}

function saveProfile(customer, body) {
  const name = String(body.name || '').trim().replace(/\s+/g, ' ');
  const contactEmail = String(body.contactEmail || '').trim().toLowerCase();
  const industry = String(body.industry || '').trim().replace(/\s+/g, ' ');
  const region = String(body.region || '').trim().replace(/\s+/g, ' ');
  const errors = [];

  if (!name) errors.push('Name is required');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    errors.push('Contact email is required');
  }
  if (errors.length > 0) {
    return { status: 400, body: { error: errors[0], errors } };
  }

  store.updateCustomer(customer.id, { name, contactEmail, industry, region });
  const state = completeCustomerInfo(customer.id);
  return {
    status: 200,
    body: {
      customerId: customer.id,
      customerName: name,
      mode: 'profile',
      profile: { name, industry, region, contactEmail },
      progressPercent: state.progressPercent
    }
  };
}

function saveCustomerInfo(customerId, body = {}) {
  const customer = store.getCustomerById(customerId);
  if (!customer) return { status: 404, body: { error: 'Customer not found' } };

  if (!customer.clientSource) return saveProfile(customer, body);

  const info = getCustomerInfo(customerId);
  if (info.body.summary.invalid > 0) {
    return {
      status: 400,
      body: {
        error: 'Customer info has invalid clients',
        summary: info.body.summary
      }
    };
  }

  const state = completeCustomerInfo(customerId);
  return {
    status: 200,
    body: {
      ...info.body,
      progressPercent: state.progressPercent
    }
  };
}

module.exports = {
  getCustomerInfo,
  saveCustomerInfo
};
