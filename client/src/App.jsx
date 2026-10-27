import React, { useState, useEffect } from 'react';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'customer-info', label: 'Customer Info' },
  { id: 'data-mapping', label: 'Data Mapping' },
  { id: 'tenant-setup', label: 'Tenant Setup' },
  { id: 'import', label: 'Import' }
];

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [onboardingData, setOnboardingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  function loadOnboarding() {
    return fetch('/api/onboarding')
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error('Invalid response format');
        return data;
      })
      .then(data => {
        setOnboardingData(data);
        setError(null);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch onboarding data:', err);
        setError(err.message);
        setOnboardingData([]);
        setLoading(false);
      });
  }

  useEffect(() => {
    loadOnboarding();
  }, []);

  return (
    <div className="app">
      <header>
        <h1>Onboarding Dashboard</h1>
        <p>Customer Success Team - Internal Tool</p>
      </header>

      <nav className="tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="content">
        {activeTab === 'dashboard' && (
          <DashboardTab data={onboardingData} loading={loading} error={error} />
        )}
        {activeTab === 'customer-info' && (
          <CustomerInfoTab customers={onboardingData} onSaved={loadOnboarding} />
        )}
        {activeTab === 'data-mapping' && (
          <PlaceholderTab title="Data Mapping" description="Map customer data to platform configuration" />
        )}
        {activeTab === 'tenant-setup' && (
          <PlaceholderTab title="Tenant Setup" description="Provision and configure customer tenant" />
        )}
        {activeTab === 'import' && (
          <PlaceholderTab title="Import" description="Import customer data into the platform" />
        )}
      </main>
    </div>
  );
}

function DashboardTab({ data, loading, error }) {
  if (loading) {
    return <div className="placeholder"><p>Loading...</p></div>;
  }

  if (error) {
    return (
      <div className="placeholder">
        <p style={{ color: '#dc2626' }}>⚠️ Failed to load onboarding data</p>
        <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>{error}</p>
      </div>
    );
  }

  if (data.length === 0) {
    return <div className="placeholder"><p>No customers in the onboarding queue</p></div>;
  }

  return (
    <div>
      <h2>Onboarding Queue</h2>
      <p style={{ color: '#6b7280', marginBottom: '20px' }}>
        {data.length} customer(s) awaiting onboarding
      </p>

      {data.map(item => (
        <div key={item.customerId} className="customer-card">
          <h3>{item.customerName}</h3>
          <div className="customer-meta">
            <span>📍 {item.customerRegion}</span>
            <span>🏭 {item.customerIndustry}</span>
          </div>

          <div className="progress-section">
            <ProgressBar percent={item.progressPercent} />
            <Checklist steps={item.steps} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ProgressBar({ percent }) {
  return (
    <div className="progress-bar-container">
      <div 
        className="progress-bar" 
        style={{ width: `${Math.max(percent, 0)}%` }}
      >
        {percent > 0 ? `${percent}%` : ''}
      </div>
    </div>
  );
}

function Checklist({ steps }) {
  return (
    <ul className="checklist">
      {steps.map(step => (
        <li key={step.id}>
          <span className={`step-status ${step.status}`}>
            {step.status === 'completed' ? '✓' : step.order}
          </span>
          <span>{step.name}</span>
          <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: '#9ca3af' }}>
            {step.status.replace('_', ' ')}
          </span>
        </li>
      ))}
    </ul>
  );
}

function CustomerInfoTab({ customers, onSaved }) {
  const [selectedId, setSelectedId] = useState(customers[0]?.customerId || '');
  const [info, setInfo] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedMessage, setSavedMessage] = useState('');

  useEffect(() => {
    if (!selectedId && customers[0]) setSelectedId(customers[0].customerId);
  }, [customers, selectedId]);

  useEffect(() => {
    if (!selectedId) return undefined;
    let ignore = false;
    setInfo(null);
    setProfile(null);
    setLoading(true);
    setError('');
    setSavedMessage('');
    fetch(`/api/customers/${selectedId}/customer-info`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        return data;
      })
      .then((data) => {
        if (ignore) return;
        setInfo(data);
        setProfile(data.profile || null);
        setLoading(false);
      })
      .catch((err) => {
        if (ignore) return;
        setInfo(null);
        setError(err.message);
        setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [selectedId]);

  function save(body) {
    setError('');
    setSavedMessage('');
    return fetch(`/api/customers/${selectedId}/customer-info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        return data;
      })
      .then((data) => {
        setInfo(data);
        setProfile(data.profile || null);
        setSavedMessage('Customer info saved. This step is complete.');
        onSaved();
      })
      .catch((err) => setError(err.message));
  }

  return (
    <div>
      <h2 className="section-heading">Customer Info</h2>
      <p className="section-copy">Collect customer info, then validate and normalize it.</p>
      <div className="customer-picker">
        {customers.map((customer) => (
          <button
            key={customer.customerId}
            type="button"
            className={`picker-button ${selectedId === customer.customerId ? 'active' : ''}`}
            onClick={() => setSelectedId(customer.customerId)}
          >
            {customer.customerName}
          </button>
        ))}
      </div>
      {loading && <p>Loading...</p>}
      {error && <p className="field-error">{error}</p>}
      {savedMessage && <p className="summary-line">{savedMessage}</p>}
      {info?.mode === 'clients' && (
        <ClientTable info={info} onSave={() => save({})} />
      )}
      {info?.mode === 'profile' && profile && (
        <ProfileForm
          profile={profile}
          onChange={setProfile}
          onSave={() => save(profile)}
        />
      )}
    </div>
  );
}

function ClientTable({ info, onSave }) {
  const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  return (
    <div>
      <p className="summary-line">
        {info.summary.valid} of {info.summary.total} clients are valid.
        {' '}Source: {info.sourceFile}
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Type</th>
              <th>Start date</th>
              <th>Revenue</th>
              <th>Terms</th>
              <th>Contact</th>
              <th>Check</th>
            </tr>
          </thead>
          <tbody>
            {info.clients.map((client) => (
              <tr key={client.id || client.name} className={client.valid ? '' : 'row-invalid'}>
                <td>{client.name}</td>
                <td>{client.status}</td>
                <td>{client.entityType}</td>
                <td>{client.startDate}</td>
                <td>{client.annualRevenue === null ? '' : money.format(client.annualRevenue)}</td>
                <td>{client.paymentTerms}</td>
                <td>{client.primaryContact}</td>
                <td className={client.valid ? '' : 'field-error'}>
                  {client.valid ? 'Valid' : client.errors.join(', ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" className="primary-button" disabled={info.summary.invalid > 0} onClick={onSave}>
        Save customer info
      </button>
    </div>
  );
}

function ProfileForm({ profile, onChange, onSave }) {
  function update(field, value) {
    onChange({ ...profile, [field]: value });
  }

  return (
    <form
      className="profile-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <label>
        Name
        <input value={profile.name} onChange={(event) => update('name', event.target.value)} />
      </label>
      <label>
        Industry
        <input value={profile.industry} onChange={(event) => update('industry', event.target.value)} />
      </label>
      <label>
        Region
        <input value={profile.region} onChange={(event) => update('region', event.target.value)} />
      </label>
      <label>
        Contact email
        <input value={profile.contactEmail} onChange={(event) => update('contactEmail', event.target.value)} />
      </label>
      <button type="submit" className="primary-button">Save customer info</button>
    </form>
  );
}

function PlaceholderTab({ title, description }) {
  return (
    <div className="placeholder">
      <h2>{title}</h2>
      <p>{description}</p>
      <p style={{ marginTop: '20px', fontSize: '0.9rem' }}>
        🚧 This section is ready to be built
      </p>
    </div>
  );
}

export default App;
