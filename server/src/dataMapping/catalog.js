const FILES = {
  clients: {
    label: 'Clients',
    fileName: 'clients.csv',
    fields: [
      { id: 'clientId', label: 'Client id', required: true },
      { id: 'name', label: 'Name', required: true },
      { id: 'entityType', label: 'Business type', required: true },
      { id: 'status', label: 'Status', required: true },
      { id: 'startDate', label: 'Start date', required: true },
      { id: 'taxId', label: 'Tax id', required: false },
      { id: 'annualRevenue', label: 'Annual revenue', required: true },
      { id: 'industry', label: 'Industry', required: false },
      { id: 'paymentTerms', label: 'Payment terms', required: false },
      { id: 'primaryContact', label: 'Primary contact', required: false }
    ]
  },
  contacts: {
    label: 'Contacts',
    fileName: 'contacts.csv',
    fields: [
      { id: 'contactId', label: 'Contact id', required: true },
      { id: 'clientId', label: 'Client id', required: true },
      { id: 'firstName', label: 'First name', required: true },
      { id: 'lastName', label: 'Last name', required: true },
      { id: 'email', label: 'Email', required: true },
      { id: 'phone', label: 'Phone', required: false },
      { id: 'title', label: 'Title', required: false },
      { id: 'status', label: 'Status', required: false },
      { id: 'preferredChannel', label: 'Preferred channel', required: false },
      { id: 'department', label: 'Department', required: false }
    ]
  },
  accounts: {
    label: 'Chart of accounts',
    fileName: 'chart_of_accounts.csv',
    fields: [
      { id: 'accountCode', label: 'Account code', required: true },
      { id: 'name', label: 'Account name', required: true },
      { id: 'accountType', label: 'Account type', required: true },
      { id: 'normalBalance', label: 'Normal balance', required: true },
      { id: 'active', label: 'Active', required: false }
    ]
  },
  transactions: {
    label: 'Transactions',
    fileName: 'transactions.csv',
    fields: [
      { id: 'transactionId', label: 'Transaction id', required: true },
      { id: 'date', label: 'Date', required: true },
      { id: 'clientId', label: 'Client id', required: true },
      { id: 'accountCode', label: 'Account code', required: true },
      { id: 'description', label: 'Description', required: false },
      { id: 'direction', label: 'Debit or credit', required: true },
      { id: 'amount', label: 'Amount', required: true },
      { id: 'paymentMethod', label: 'Payment method', required: false },
      { id: 'status', label: 'Status', required: false }
    ]
  }
};

const PROFILE_FIELDS = [
  { id: 'customerName', label: 'Customer name', required: true },
  { id: 'industry', label: 'Industry', required: false },
  { id: 'region', label: 'Region', required: false },
  { id: 'contactEmail', label: 'Contact email', required: true }
];

const SOURCE_MAPS = {
  CustomerA_ABCAccounting: {
    clients: {
      'Client ID': 'clientId',
      'Client Name': 'name',
      'Business Type': 'entityType',
      Status: 'status',
      'Date Onboarded': 'startDate',
      'Tax ID': 'taxId',
      'Annual Revenue': 'annualRevenue',
      Industry: 'industry',
      'Payment Terms': 'paymentTerms',
      'Primary Contact': 'primaryContact'
    },
    contacts: {
      'Contact ID': 'contactId',
      'Client ID': 'clientId',
      'First Name': 'firstName',
      'Last Name': 'lastName',
      Email: 'email',
      Phone: 'phone',
      Role: 'title',
      Status: 'status',
      'Preferred Contact Method': 'preferredChannel',
      Department: 'department'
    },
    accounts: {
      'Account Number': 'accountCode',
      'Account Name': 'name',
      'Account Type': 'accountType',
      'Normal Balance': 'normalBalance',
      Status: 'active'
    },
    transactions: {
      'Transaction ID': 'transactionId',
      Date: 'date',
      'Client ID': 'clientId',
      'Account Number': 'accountCode',
      Description: 'description',
      'Transaction Type': 'direction',
      Amount: 'amount',
      'Payment Method': 'paymentMethod',
      Status: 'status'
    }
  },
  CustomerB_XYZFinancialServices: {
    clients: {
      clientCode: 'clientId',
      companyName: 'name',
      entityType: 'entityType',
      clientStatus: 'status',
      startDate: 'startDate',
      federalTaxId: 'taxId',
      yearlyRevenue: 'annualRevenue',
      sectorCode: 'industry',
      billingTerms: 'paymentTerms',
      mainContact: 'primaryContact'
    },
    contacts: {
      contactId: 'contactId',
      clientCode: 'clientId',
      firstName: 'firstName',
      lastName: 'lastName',
      emailAddress: 'email',
      phoneNumber: 'phone',
      jobTitle: 'title',
      isActive: 'status',
      communicationPreference: 'preferredChannel',
      businessUnit: 'department'
    },
    accounts: {
      acctCode: 'accountCode',
      acctName: 'name',
      acctCategory: 'accountType',
      balanceType: 'normalBalance',
      activeFlag: 'active'
    },
    transactions: {
      txnId: 'transactionId',
      txnDate: 'date',
      clientCode: 'clientId',
      acctCode: 'accountCode',
      memo: 'description',
      entryType: 'direction',
      txnAmount: 'amount',
      paymentType: 'paymentMethod',
      txnStatus: 'status'
    }
  },
  CustomerC_PremierBookkeeping: {
    clients: {
      customer_id: 'clientId',
      business_name: 'name',
      legal_structure: 'entityType',
      account_status: 'status',
      registration_date: 'startDate',
      tax_reference: 'taxId',
      gross_revenue: 'annualRevenue',
      industry_sector: 'industry',
      credit_terms: 'paymentTerms',
      key_contact_name: 'primaryContact'
    },
    contacts: {
      contact_ref: 'contactId',
      customer_id: 'clientId',
      given_name: 'firstName',
      family_name: 'lastName',
      email: 'email',
      telephone: 'phone',
      position: 'title',
      contact_status: 'status',
      preferred_channel: 'preferredChannel',
      division: 'department'
    },
    accounts: {
      nominal_code: 'accountCode',
      account_title: 'name',
      category: 'accountType',
      debit_credit: 'normalBalance',
      is_active: 'active'
    },
    transactions: {
      transaction_ref: 'transactionId',
      posting_date: 'date',
      customer_id: 'clientId',
      nominal_code: 'accountCode',
      narrative: 'description',
      dr_cr: 'direction',
      amount_gbp: 'amount',
      settlement_method: 'paymentMethod',
      posting_status: 'status'
    }
  }
};

const PROFILE_MAP = {
  Name: 'customerName',
  Industry: 'industry',
  Region: 'region',
  'Contact email': 'contactEmail'
};

function mappingIssues(columns, mapping, fields) {
  const issues = [];
  const used = {};
  columns.forEach((column) => {
    const target = mapping[column] || '';
    if (!target) return;
    if (!fields.some((field) => field.id === target)) {
      issues.push(`${column} maps to an unknown platform field`);
      return;
    }
    if (used[target]) {
      issues.push(`${used[target]} and ${column} both map to the same platform field`);
      return;
    }
    used[target] = column;
  });
  fields.filter((field) => field.required).forEach((field) => {
    if (!used[field.id]) issues.push(`${field.label} is not mapped`);
  });
  return issues;
}

module.exports = {
  FILES,
  PROFILE_FIELDS,
  PROFILE_MAP,
  SOURCE_MAPS,
  mappingIssues
};
