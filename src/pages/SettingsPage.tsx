import { useState } from 'react';
import { User, Building2, Bell, Shield, Key, CreditCard, Camera } from 'lucide-react';

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div style={{ display: 'flex', gap: 'var(--space-16)', maxWidth: 1000 }}>
      {/* Editorial Settings Sidebar */}
      <div style={{ width: 240, flexShrink: 0, position: 'sticky', top: 'var(--space-12)' }}>
        <h1 className="type-title" style={{ marginBottom: 'var(--space-8)' }}>Settings</h1>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          <div className="type-micro" style={{ padding: '0 var(--space-3)', marginBottom: 'var(--space-2)' }}>Personal</div>
          {['profile', 'notifications', 'security'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="type-ui"
              style={{ 
                display: 'flex', alignItems: 'center', gap: 'var(--space-3)', 
                padding: '8px var(--space-3)', borderRadius: 'var(--radius-md)', 
                backgroundColor: activeTab === tab ? 'var(--bg-app)' : 'transparent', 
                color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)', 
                fontWeight: activeTab === tab ? 500 : 400,
                boxShadow: activeTab === tab ? '0 1px 2px rgba(0,0,0,0.02)' : 'none',
                transition: 'all var(--transition-fast)' 
              }}
            >
              {tab === 'profile' && <User size={16} />}
              {tab === 'notifications' && <Bell size={16} />}
              {tab === 'security' && <Shield size={16} />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
          
          <div className="type-micro" style={{ padding: '0 var(--space-3)', marginTop: 'var(--space-6)', marginBottom: 'var(--space-2)' }}>Workspace</div>
          {['general', 'members', 'billing'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="type-ui"
              style={{ 
                display: 'flex', alignItems: 'center', gap: 'var(--space-3)', 
                padding: '8px var(--space-3)', borderRadius: 'var(--radius-md)', 
                backgroundColor: activeTab === tab ? 'var(--bg-app)' : 'transparent', 
                color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)', 
                fontWeight: activeTab === tab ? 500 : 400,
                boxShadow: activeTab === tab ? '0 1px 2px rgba(0,0,0,0.02)' : 'none',
                transition: 'all var(--transition-fast)' 
              }}
            >
              {tab === 'general' && <Building2 size={16} />}
              {tab === 'members' && <Key size={16} />}
              {tab === 'billing' && <CreditCard size={16} />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Settings Content Area */}
      <div style={{ flex: 1, paddingBottom: 'var(--space-24)', marginTop: 72 }}>
        {activeTab === 'profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
            
            <section>
              <h2 className="type-h1" style={{ marginBottom: 'var(--space-2)' }}>Your Profile</h2>
              <p className="type-body" style={{ marginBottom: 'var(--space-8)' }}>Manage your personal information and how it appears in the workspace.</p>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)', marginBottom: 'var(--space-8)' }}>
                <div style={{ position: 'relative' }}>
                  <div className="avatar" style={{ width: 80, height: 80, fontSize: 'var(--text-xl)', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }}>
                    US
                  </div>
                  <button className="btn-icon" style={{ position: 'absolute', bottom: -4, right: -4, backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }}>
                    <Camera size={14} />
                  </button>
                </div>
                <div>
                  <button className="btn btn-secondary" style={{ marginBottom: 'var(--space-2)' }}>Upload new photo</button>
                  <div className="type-micro" style={{ color: 'var(--text-tertiary)', textTransform: 'none', letterSpacing: 0 }}>At least 800x800px recommended. JPG or PNG.</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <label className="type-ui" style={{ fontWeight: 500 }}>First Name</label>
                  <input className="input" defaultValue="Admin" style={{ backgroundColor: 'transparent', border: '1px solid var(--border-medium)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <label className="type-ui" style={{ fontWeight: 500 }}>Last Name</label>
                  <input className="input" defaultValue="User" style={{ backgroundColor: 'transparent', border: '1px solid var(--border-medium)' }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <label className="type-ui" style={{ fontWeight: 500 }}>Email Address</label>
                <input className="input" type="email" defaultValue="admin@hpxeigen.com" style={{ backgroundColor: 'transparent', border: '1px solid var(--border-medium)' }} />
                <div className="type-micro" style={{ color: 'var(--text-tertiary)', textTransform: 'none', letterSpacing: 0, marginTop: 4 }}>This email will be used for account recovery and important notifications.</div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 'var(--space-8)' }}>
                <button className="btn btn-primary" style={{ padding: '0 var(--space-8)' }}>Save Changes</button>
              </div>
            </section>

            <div style={{ borderTop: '1px solid var(--border-light)' }} />

            <section>
              <h2 className="type-h1" style={{ marginBottom: 'var(--space-2)', color: 'var(--color-danger)' }}>Danger Zone</h2>
              <p className="type-body" style={{ marginBottom: 'var(--space-6)' }}>Irreversible actions for your account.</p>
              
              <div className="surface" style={{ borderColor: 'var(--color-danger)', backgroundColor: 'transparent' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div className="type-ui" style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>Delete Account</div>
                    <div className="type-micro" style={{ color: 'var(--text-tertiary)', textTransform: 'none', letterSpacing: 0 }}>Permanently remove your personal account and all associated data.</div>
                  </div>
                  <button className="btn btn-secondary" style={{ color: 'var(--color-danger)', borderColor: 'var(--border-medium)' }}>Delete Account</button>
                </div>
              </div>
            </section>
            
          </div>
        )}

        {activeTab !== 'profile' && (
          <div style={{ padding: 'var(--space-24) 0', textAlign: 'center' }}>
            <h2 className="type-title" style={{ marginBottom: 'var(--space-2)' }}>Coming Soon</h2>
            <p className="type-body" style={{ color: 'var(--text-tertiary)' }}>This settings panel is being rebuilt.</p>
          </div>
        )}
      </div>
    </div>
  );
}
