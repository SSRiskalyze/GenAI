const SCHEMAS = {
  CustomerA_ABCAccounting: {
    id: 'Client ID',
    name: 'Client Name',
    entityType: 'Business Type',
    status: 'Status',
    startDate: 'Date Onboarded',
    taxId: 'Tax ID',
    revenue: 'Annual Revenue',
    industry: 'Industry',
    terms: 'Payment Terms',
    contact: 'Primary Contact',
    dateOrder: 'MDY'
  },
  CustomerB_XYZFinancialServices: {
    id: 'clientCode',
    name: 'companyName',
    entityType: 'entityType',
    status: 'clientStatus',
    startDate: 'startDate',
    taxId: 'federalTaxId',
    revenue: 'yearlyRevenue',
    industry: 'sectorCode',
    terms: 'billingTerms',
    contact: 'mainContact',
    dateOrder: 'YMD'
  },
  CustomerC_PremierBookkeeping: {
    id: 'customer_id',
    name: 'business_name',
    entityType: 'legal_structure',
    status: 'account_status',
    startDate: 'registration_date',
    taxId: 'tax_reference',
    revenue: 'gross_revenue',
    industry: 'industry_sector',
    terms: 'credit_terms',
    contact: 'key_contact_name',
    dateOrder: 'DMY'
  }
};

const STATUS_MAP = {
  active: 'Active',
  a: 'Active',
  inactive: 'Inactive',
  i: 'Inactive',
  dormant: 'Inactive',
  pending: 'Pending',
  p: 'Pending',
  suspended: 'Pending'
};

const ENTITY_MAP = {
  corporation: 'Corporation',
  corp: 'Corporation',
  'limited company': 'Corporation',
  's-corporation': 'S-Corporation',
  scorp: 'S-Corporation',
  llc: 'LLC',
  llp: 'LLC',
  partnership: 'Partnership',
  part: 'Partnership',
  'sole proprietorship': 'Sole Proprietor',
  sole: 'Sole Proprietor',
  'sole trader': 'Sole Proprietor',
  'non-profit': 'Non-Profit',
  nprof: 'Non-Profit'
};

const TERMS_MAP = {
  net30: 'Net 30',
  '30days': 'Net 30',
  net15: 'Net 15',
  net45: 'Net 45',
  '45days': 'Net 45',
  net60: 'Net 60',
  '60days': 'Net 60',
  '14days': 'Net 14',
  dueonreceipt: 'Due on receipt',
  cod: 'Due on receipt',
  immediate: 'Due on receipt'
};

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const source = String(text).replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (inQuotes) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      field = '';
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((value) => value !== '')) rows.push(row);
  }

  return rows;
}

function rowsToObjects(rows) {
  if (rows.length === 0) return [];
  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((values) => {
    const cells = values.slice();
    if (cells.length > headers.length) {
      const head = cells.slice(0, headers.length - 1);
      const tail = cells.slice(headers.length - 1).join(',');
      cells.splice(0, cells.length, ...head, tail);
    }
    return Object.fromEntries(headers.map((header, index) => [header, (cells[index] || '').trim()]));
  });
}

function isoDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    return null;
  }
  const monthText = String(month).padStart(2, '0');
  const dayText = String(day).padStart(2, '0');
  return `${year}-${monthText}-${dayText}`;
}

function normalizeDate(value, dateOrder) {
  const text = String(value || '').trim();
  const matchers = {
    MDY: /^(\d{2})\/(\d{2})\/(\d{4})$/,
    YMD: /^(\d{4})-(\d{2})-(\d{2})$/,
    DMY: /^(\d{2})-(\d{2})-(\d{4})$/
  };
  const match = text.match(matchers[dateOrder]);
  if (!match) return null;
  if (dateOrder === 'MDY') return isoDate(Number(match[3]), Number(match[1]), Number(match[2]));
  if (dateOrder === 'YMD') return isoDate(Number(match[1]), Number(match[2]), Number(match[3]));
  return isoDate(Number(match[3]), Number(match[2]), Number(match[1]));
}

function normalizeContact(value) {
  const text = String(value || '').trim().replace(/\s+/g, ' ');
  const swapped = text.match(/^([^,]+),\s*(.+)$/);
  if (!swapped) return text;
  return `${swapped[2].trim()} ${swapped[1].trim()}`.replace(/\s+/g, ' ');
}

function normalizeTerms(value) {
  const text = String(value || '').trim().replace(/\s+/g, ' ');
  if (!text) return '';
  const key = text.toLowerCase().replace(/\s+/g, '');
  return TERMS_MAP[key] || text;
}

function normalizeRevenue(value) {
  const text = String(value || '').trim().replace(/[$,]/g, '');
  if (!text) return null;
  const amount = Number(text);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return amount;
}

function normalizeClients(csvText, sourceKey) {
  const schema = SCHEMAS[sourceKey];
  if (!schema) {
    return { clients: [], summary: { total: 0, valid: 0, invalid: 0 } };
  }

  const records = rowsToObjects(parseCsv(csvText));
  const clients = records.map((record) => {
    const errors = [];
    const id = record[schema.id] || '';
    const name = (record[schema.name] || '').replace(/\s+/g, ' ').trim();
    const entityType = ENTITY_MAP[String(record[schema.entityType] || '').trim().toLowerCase()] || '';
    const status = STATUS_MAP[String(record[schema.status] || '').trim().toLowerCase()] || '';
    const startDate = normalizeDate(record[schema.startDate], schema.dateOrder);
    const annualRevenue = normalizeRevenue(record[schema.revenue]);

    if (!id) errors.push('Client id is required');
    if (!name) errors.push('Client name is required');
    if (!entityType) errors.push('Business type is not recognized');
    if (!status) errors.push('Status is not recognized');
    if (!startDate) errors.push('Start date is not a valid date');
    if (annualRevenue === null) errors.push('Annual revenue is not a valid number');

    return {
      id,
      name,
      entityType,
      status,
      startDate,
      taxId: record[schema.taxId] || '',
      annualRevenue,
      industry: (record[schema.industry] || '').replace(/\s+/g, ' ').trim(),
      paymentTerms: normalizeTerms(record[schema.terms]),
      primaryContact: normalizeContact(record[schema.contact]),
      valid: errors.length === 0,
      errors
    };
  });

  const valid = clients.filter((client) => client.valid).length;
  return {
    clients,
    summary: {
      total: clients.length,
      valid,
      invalid: clients.length - valid
    }
  };
}

module.exports = {
  SCHEMAS,
  ENTITY_MAP,
  STATUS_MAP,
  normalizeClients,
  parseCsv,
  rowsToObjects,
  normalizeDate,
  normalizeContact,
  normalizeTerms,
  normalizeRevenue
};
