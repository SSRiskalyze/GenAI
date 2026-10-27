const fs = require('fs');
const path = require('path');
const store = require('../data/store');
const { calculateProgress } = require('../models');
const { parseCsv, rowsToObjects } = require('../customerInfo/normalizeClients');
const { getDataMapping } = require('../dataMapping');
const { DATE_ORDERS, normalizeFile } = require('./normalizeRecords');

const SAMPLE_ROOT = path.join(__dirname, '../../../sample-data');
const PREVIEW_LIMIT = 5;

function tenantSetupComplete(state) {
  const step = state?.steps?.find((item) => item.id === 'step_3');
  return step?.status === 'completed';
}

function readSourceRows(clientSource, fileName) {
  const text = fs.readFileSync(path.join(SAMPLE_ROOT, clientSource, fileName), 'utf8');
  return rowsToObjects(parseCsv(text));
}

function presentFile(file) {
  const invalid = file.records.filter((record) => !record.valid);
  const previewSource = [...invalid, ...file.records.filter((record) => record.valid)];
  return {
    id: file.id,
    label: file.label,
    total: file.total,
    invalid: file.invalid,
    preview: previewSource.slice(0, PREVIEW_LIMIT).map((record) => {
      const { valid, errors, row, ...fields } = record;
      return valid ? fields : { ...fields, errors };
    })
  };
}

function fileIssues(file) {
  return file.records.flatMap((record) => (
    record.errors.map((error) => `${file.label} row ${record.row}: ${error}`)
  ));
}

function buildFiles(customer) {
  const mapping = getDataMapping(customer.id);
  const dateOrder = DATE_ORDERS[customer.clientSource];
  return mapping.body.files
    .filter((file) => file.id !== 'profile')
    .map((file) => {
      const sourceRows = readSourceRows(customer.clientSource, file.sourceFile.split('/')[1]);
      return normalizeFile(file.id, sourceRows, file.mapping, dateOrder);
    });
}

function profileBody(customer, state) {
  const profile = {
    name: customer.name,
    industry: customer.industry,
    region: customer.region,
    contactEmail: customer.contactEmail
  };
  const issues = [];
  if (!profile.name) issues.push('Name is required');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.contactEmail || '')) {
    issues.push('Contact email is required');
  }
  return {
    customerId: customer.id,
    customerName: customer.name,
    mode: 'profile',
    tenantSetupComplete: tenantSetupComplete(state),
    imported: Boolean(store.getPlatformData(customer.id)),
    ready: issues.length === 0,
    issues,
    profile
  };
}

function filesBody(customer, state) {
  const files = buildFiles(customer);
  const issues = files.flatMap(fileIssues);
  return {
    customerId: customer.id,
    customerName: customer.name,
    mode: 'files',
    tenantSetupComplete: tenantSetupComplete(state),
    imported: Boolean(store.getPlatformData(customer.id)),
    ready: issues.length === 0 && files.every((file) => file.total > 0),
    issues: issues.slice(0, 20),
    files: files.map(presentFile),
    records: files
  };
}

function getImport(customerId) {
  const customer = store.getCustomerById(customerId);
  if (!customer) return { status: 404, body: { error: 'Customer not found' } };
  const state = store.getOnboardingState(customerId);
  const body = customer.clientSource ? filesBody(customer, state) : profileBody(customer, state);
  const { records, ...preview } = body;
  return { status: 200, body: preview };
}

function completeImport(customerId, platformData) {
  const state = store.getOnboardingState(customerId);
  const steps = state.steps.map((step) => (
    step.id === 'step_4' ? { ...step, status: 'completed' } : step
  ));
  store.savePlatformData(customerId, platformData);
  return store.updateOnboardingState(customerId, {
    steps,
    progressPercent: calculateProgress(steps)
  });
}

function cleanRecords(file) {
  return file.records.map((record) => {
    const { valid, errors, row, ...fields } = record;
    return fields;
  });
}

function runImport(customerId) {
  const customer = store.getCustomerById(customerId);
  if (!customer) return { status: 404, body: { error: 'Customer not found' } };
  const state = store.getOnboardingState(customerId);
  if (!tenantSetupComplete(state)) {
    return { status: 400, body: { error: 'Finish tenant setup before importing data' } };
  }

  if (!customer.clientSource) {
    const body = profileBody(customer, state);
    if (!body.ready) return { status: 400, body: { error: body.issues[0], issues: body.issues } };
    const saved = completeImport(customerId, {
      importedAt: new Date().toISOString(),
      mode: 'profile',
      profile: body.profile
    });
    return {
      status: 200,
      body: { ...body, imported: true, progressPercent: saved.progressPercent }
    };
  }

  const built = filesBody(customer, state);
  if (!built.ready) {
    return { status: 400, body: { error: built.issues[0] || 'Customer data is not ready to import', issues: built.issues } };
  }
  const saved = completeImport(customerId, {
    importedAt: new Date().toISOString(),
    mode: 'files',
    files: Object.fromEntries(built.records.map((file) => [file.id, cleanRecords(file)]))
  });
  const { records, ...preview } = built;
  return {
    status: 200,
    body: { ...preview, imported: true, progressPercent: saved.progressPercent }
  };
}

module.exports = {
  getImport,
  runImport
};
