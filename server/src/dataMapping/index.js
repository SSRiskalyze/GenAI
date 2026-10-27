const fs = require('fs');
const path = require('path');
const store = require('../data/store');
const { calculateProgress } = require('../models');
const { parseCsv } = require('../customerInfo/normalizeClients');
const {
  FILES,
  PROFILE_FIELDS,
  PROFILE_MAP,
  SOURCE_MAPS,
  mappingIssues
} = require('./catalog');

const SAMPLE_ROOT = path.join(__dirname, '../../../sample-data');

function readHeaders(clientSource, fileName) {
  const text = fs.readFileSync(path.join(SAMPLE_ROOT, clientSource, fileName), 'utf8');
  const rows = parseCsv(text);
  return (rows[0] || []).map((header) => header.trim()).filter(Boolean);
}

function customerInfoComplete(state) {
  const step = state?.steps?.find((item) => item.id === 'step_1');
  return step?.status === 'completed';
}

function savedMaps(state) {
  return state?.dataMapping || {};
}

function defaultMap(columns, suggested) {
  return Object.fromEntries(columns.map((column) => [column, suggested[column] || '']));
}

function fileView(customer, state) {
  const suggested = SOURCE_MAPS[customer.clientSource] || {};
  const stored = savedMaps(state);
  return Object.entries(FILES).map(([id, file]) => {
    const columns = readHeaders(customer.clientSource, file.fileName);
    const mapping = stored[id] || defaultMap(columns, suggested[id] || {});
    const issues = mappingIssues(columns, mapping, file.fields);
    return {
      id,
      label: file.label,
      sourceFile: `${customer.clientSource}/${file.fileName}`,
      columns,
      fields: file.fields,
      mapping,
      issues
    };
  });
}

function profileView(customer, state) {
  const columns = ['Name', 'Industry', 'Region', 'Contact email'];
  const mapping = savedMaps(state).profile || { ...PROFILE_MAP };
  return [{
    id: 'profile',
    label: 'Customer profile',
    sourceFile: 'Profile fields',
    columns,
    fields: PROFILE_FIELDS,
    mapping,
    issues: mappingIssues(columns, mapping, PROFILE_FIELDS)
  }];
}

function getDataMapping(customerId) {
  const customer = store.getCustomerById(customerId);
  if (!customer) return { status: 404, body: { error: 'Customer not found' } };
  const state = store.getOnboardingState(customerId);
  const files = customer.clientSource ? fileView(customer, state) : profileView(customer, state);
  const issues = files.flatMap((file) => file.issues.map((issue) => `${file.label}: ${issue}`));
  return {
    status: 200,
    body: {
      customerId: customer.id,
      customerName: customer.name,
      customerInfoComplete: customerInfoComplete(state),
      files,
      ready: issues.length === 0,
      issues
    }
  };
}

function completeDataMapping(customerId, mapping) {
  const state = store.getOnboardingState(customerId);
  const steps = state.steps.map((step) => (
    step.id === 'step_2' ? { ...step, status: 'completed' } : step
  ));
  return store.updateOnboardingState(customerId, {
    steps,
    dataMapping: mapping,
    progressPercent: calculateProgress(steps)
  });
}

function saveDataMapping(customerId, body = {}) {
  const customer = store.getCustomerById(customerId);
  if (!customer) return { status: 404, body: { error: 'Customer not found' } };
  const state = store.getOnboardingState(customerId);
  if (!customerInfoComplete(state)) {
    return { status: 400, body: { error: 'Finish customer info before mapping data' } };
  }

  const submitted = body.mappings || {};
  const current = getDataMapping(customerId).body;
  const files = current.files.map((file) => {
    const mapping = submitted[file.id] || file.mapping;
    const fields = file.fields;
    return {
      ...file,
      mapping,
      issues: mappingIssues(file.columns, mapping, fields)
    };
  });
  const issues = files.flatMap((file) => file.issues.map((issue) => `${file.label}: ${issue}`));
  if (issues.length > 0) {
    return { status: 400, body: { error: issues[0], issues, files, ready: false } };
  }

  const mappings = Object.fromEntries(files.map((file) => [file.id, file.mapping]));
  const saved = completeDataMapping(customerId, mappings);
  return {
    status: 200,
    body: {
      ...current,
      files,
      ready: true,
      issues: [],
      progressPercent: saved.progressPercent
    }
  };
}

module.exports = {
  getDataMapping,
  saveDataMapping
};
