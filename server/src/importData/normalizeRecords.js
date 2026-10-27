const { FILES } = require('../dataMapping/catalog');
const {
  ENTITY_MAP,
  STATUS_MAP,
  normalizeDate,
  normalizeContact,
  normalizeTerms,
  normalizeRevenue
} = require('../customerInfo/normalizeClients');

const DATE_ORDERS = {
  CustomerA_ABCAccounting: 'MDY',
  CustomerB_XYZFinancialServices: 'YMD',
  CustomerC_PremierBookkeeping: 'DMY'
};

const CONTACT_STATUS = {
  ...STATUS_MAP,
  y: 'Active',
  yes: 'Active',
  '1': 'Active',
  true: 'Active',
  n: 'Inactive',
  no: 'Inactive',
  '0': 'Inactive',
  false: 'Inactive'
};

const ACCOUNT_TYPE = {
  asset: 'Asset',
  assets: 'Asset',
  liability: 'Liability',
  liabilities: 'Liability',
  equity: 'Equity',
  capital: 'Equity',
  revenue: 'Revenue',
  income: 'Revenue',
  expense: 'Expense',
  'direct costs': 'Expense',
  overheads: 'Expense',
  'finance costs': 'Expense'
};

const DIRECTION = {
  debit: 'Debit',
  dr: 'Debit',
  d: 'Debit',
  credit: 'Credit',
  cr: 'Credit',
  c: 'Credit'
};

const TXN_STATUS = {
  cleared: 'Completed',
  posted: 'Completed',
  reconciled: 'Completed',
  pending: 'Pending',
  unreconciled: 'Pending',
  voided: 'Cancelled',
  void: 'Cancelled',
  cancelled: 'Cancelled',
  canceled: 'Cancelled'
};

const PAYMENT_METHOD = {
  ach: 'ACH',
  eft: 'ACH',
  bacs: 'ACH',
  'bank transfer': 'Bank Transfer',
  bank: 'Bank Transfer',
  'wire transfer': 'Wire Transfer',
  wire: 'Wire Transfer',
  cash: 'Cash',
  'petty cash': 'Cash',
  check: 'Check',
  cheque: 'Check',
  'credit card': 'Credit Card',
  card: 'Credit Card',
  'card payment': 'Credit Card',
  'direct deposit': 'Direct Deposit',
  'direct debit': 'Direct Debit',
  'standing order': 'Standing Order',
  'bank charge': 'Bank Charge',
  fee: 'Bank Charge',
  financing: 'Financing',
  lease: 'Financing',
  hp: 'Financing',
  'journal entry': 'Journal Entry',
  je: 'Journal Entry',
  'online payment': 'Online Payment'
};

const CHANNEL = {
  email: 'Email',
  phone: 'Phone',
  text: 'Text',
  sms: 'Text'
};

const KINDS = {
  clients: {
    clientId: 'requiredText',
    name: 'requiredText',
    entityType: 'entity',
    status: 'clientStatus',
    startDate: 'date',
    taxId: 'text',
    annualRevenue: 'money',
    industry: 'text',
    paymentTerms: 'terms',
    primaryContact: 'contact'
  },
  contacts: {
    contactId: 'requiredText',
    clientId: 'requiredText',
    firstName: 'requiredText',
    lastName: 'requiredText',
    email: 'email',
    phone: 'text',
    title: 'text',
    status: 'contactStatus',
    preferredChannel: 'channel',
    department: 'text'
  },
  accounts: {
    accountCode: 'requiredText',
    name: 'requiredText',
    accountType: 'accountType',
    normalBalance: 'direction',
    active: 'active'
  },
  transactions: {
    transactionId: 'requiredText',
    date: 'date',
    clientId: 'requiredText',
    accountCode: 'requiredText',
    description: 'text',
    direction: 'direction',
    amount: 'money',
    paymentMethod: 'payment',
    status: 'txnStatus'
  }
};

function lookupKey(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function text(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function pick(map, value) {
  const key = lookupKey(value);
  if (!key) return '';
  return map[key] || '';
}

function normalizeValue(kind, value, dateOrder) {
  if (kind === 'requiredText') {
    const cleaned = text(value);
    return cleaned ? { value: cleaned } : { value: '', error: 'required' };
  }
  if (kind === 'text') return { value: text(value) };
  if (kind === 'contact') return { value: normalizeContact(value) };
  if (kind === 'terms') return { value: normalizeTerms(value) };
  if (kind === 'email') {
    const email = text(value).toLowerCase();
    if (!email) return { value: '', error: 'required' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { value: email, error: 'invalid' };
    return { value: email };
  }
  if (kind === 'date') {
    const date = normalizeDate(value, dateOrder);
    return date ? { value: date } : { value: '', error: 'invalid' };
  }
  if (kind === 'money') {
    const amount = normalizeRevenue(value);
    return amount === null ? { value: null, error: 'invalid' } : { value: amount };
  }
  if (kind === 'entity') {
    const entityType = pick(ENTITY_MAP, value);
    return entityType ? { value: entityType } : { value: '', error: 'invalid' };
  }
  if (kind === 'clientStatus') {
    const status = pick(STATUS_MAP, value);
    return status ? { value: status } : { value: '', error: 'invalid' };
  }
  if (kind === 'contactStatus' || kind === 'active') {
    const status = pick(CONTACT_STATUS, value);
    if (!lookupKey(value)) return { value: '' };
    return status ? { value: status } : { value: '', error: 'invalid' };
  }
  if (kind === 'accountType') {
    const accountType = pick(ACCOUNT_TYPE, value);
    return accountType ? { value: accountType } : { value: '', error: 'invalid' };
  }
  if (kind === 'direction') {
    const direction = pick(DIRECTION, value);
    return direction ? { value: direction } : { value: '', error: 'invalid' };
  }
  if (kind === 'txnStatus') {
    if (!lookupKey(value)) return { value: '' };
    const status = pick(TXN_STATUS, value);
    return status ? { value: status } : { value: '', error: 'invalid' };
  }
  if (kind === 'payment') {
    if (!lookupKey(value)) return { value: '' };
    const method = pick(PAYMENT_METHOD, value);
    return method ? { value: method } : { value: '', error: 'invalid' };
  }
  if (kind === 'channel') {
    if (!lookupKey(value)) return { value: '' };
    const channel = pick(CHANNEL, value);
    return channel ? { value: channel } : { value: '', error: 'invalid' };
  }
  return { value: text(value) };
}

function fieldError(field, kindError) {
  if (kindError === 'required') return `${field.label} is required`;
  if (field.id === 'startDate' || field.id === 'date') return `${field.label} is not a valid date`;
  if (field.id === 'annualRevenue' || field.id === 'amount') return `${field.label} is not a valid number`;
  if (field.id === 'email') return 'Email is required';
  return `${field.label} is not recognized`;
}

function normalizeFile(fileId, sourceRows, mapping, dateOrder) {
  const file = FILES[fileId];
  const kinds = KINDS[fileId];
  const records = sourceRows.map((source, index) => {
    const errors = [];
    const record = {};
    file.fields.forEach((field) => {
      const column = Object.keys(mapping).find((name) => mapping[name] === field.id);
      const raw = column ? source[column] : '';
      const normalized = normalizeValue(kinds[field.id], raw, dateOrder);
      record[field.id] = normalized.value;
      if (normalized.error) errors.push(fieldError(field, normalized.error));
      if (!column && field.required && !normalized.error) {
        errors.push(`${field.label} is not mapped`);
      }
    });
    return { ...record, valid: errors.length === 0, errors, row: index + 1 };
  });
  return {
    id: fileId,
    label: file.label,
    total: records.length,
    invalid: records.filter((record) => !record.valid).length,
    records
  };
}

module.exports = {
  DATE_ORDERS,
  normalizeFile
};
