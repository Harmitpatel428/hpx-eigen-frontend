import { useState, type FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Eye, EyeOff, Command, Users, Lock, Globe, Check
} from 'lucide-react';

const LivingBlueprintExperience = () => {
  return (
    <div className="blueprint-container blueprint-entrance">
      <svg width="100%" height="100%" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice" className="blueprint-svg">
        
        {/* Base Grid Pattern */}
        <defs>
          <pattern id="blueprint-grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#ffffff" strokeWidth="0.5" opacity="0.02" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#blueprint-grid)" />

        {/* Alignment Markers (+) */}
        <g className="blueprint-markers" opacity="0.1">
          <path d="M 200,195 L 200,205 M 195,200 L 205,200" stroke="#ffffff" strokeWidth="1" />
          <path d="M 800,195 L 800,205 M 795,200 L 805,200" stroke="#ffffff" strokeWidth="1" />
          <path d="M 200,795 L 200,805 M 195,800 L 205,800" stroke="#ffffff" strokeWidth="1" />
          <path d="M 800,795 L 800,805 M 795,800 L 805,800" stroke="#ffffff" strokeWidth="1" />
          <path d="M 500,495 L 500,505 M 495,500 L 505,500" stroke="#ffffff" strokeWidth="1" />
        </g>

        {/* Frame Assembly Layer */}
        <g className="blueprint-frames">
          <rect x="240" y="240" width="200" height="120" className="bp-frame bp-frame-1" />
          <rect x="460" y="240" width="300" height="320" className="bp-frame bp-frame-2" />
          <rect x="240" y="380" width="200" height="180" className="bp-frame bp-frame-3" />
          <rect x="240" y="580" width="520" height="180" className="bp-frame bp-frame-4" />
        </g>

        {/* Guide Lines Extending */}
        <g className="blueprint-guides">
          <line x1="100" y1="240" x2="900" y2="240" className="bp-guide bp-guide-x1" />
          <line x1="100" y1="560" x2="900" y2="560" className="bp-guide bp-guide-x2" />
          <line x1="240" y1="100" x2="240" y2="900" className="bp-guide bp-guide-y1" />
          <line x1="760" y1="100" x2="760" y2="900" className="bp-guide bp-guide-y2" />
        </g>

        {/* Accent Marker */}
        <rect x="760" y="240" width="3" height="3" className="bp-accent" />
      </svg>
    </div>
  );
};

const featureList = [
  "Lead Intelligence",
  "Relationship Intelligence",
  "Pipeline Analytics",
  "Workflow Automation",
  "AI Recommendations",
  "Enterprise Security"
];

const FeatureSequence = () => {
  const [index, setIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isHovered) return;
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % featureList.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isHovered]);

  return (
    <div 
      className="feature-sequence-container"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {featureList.map((feature, i) => (
        <div 
          key={feature} 
          className={`feature-card ${i === index ? 'active' : ''}`}
        >
          <div className="feature-icon-wrapper">
            <Command size={16} />
          </div>
          <span>{feature}</span>
        </div>
      ))}
    </div>
  )
};

const HPXLoader = () => (
  <div className="hpx-loader-wrapper">
    <div className="hpx-logo-container">
      <Command size={24} strokeWidth={2.5} />
    </div>
    <div className="hpx-progress-bar">
      <div className="hpx-progress-fill"></div>
    </div>
    <div className="hpx-loader-text">Preparing your workspace...</div>
  </div>
);

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [tenantId, setTenantId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [osShortcut, setOsShortcut] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => {
      setLoaded(true);
    });

    const userAgent = window.navigator.userAgent.toLowerCase();
    if (userAgent.indexOf('mac') !== -1) {
      setOsShortcut('⌘');
    } else if (userAgent.indexOf('win') !== -1 || userAgent.indexOf('linux') !== -1) {
      setOsShortcut('Ctrl');
    } else {
      setOsShortcut('');
    }
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        const form = document.getElementById('login-form') as HTMLFormElement;
        if (form) form.requestSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(tenantId.trim() || 'HPX-EIGEN', email.trim(), password);
      setSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 1500); // Wait for the progress line animation
    } catch (err: unknown) {
      let msg = 'Login failed. Check your credentials.';
      if (err instanceof Error && 'code' in err && err.code === 'ERR_NETWORK') {
        msg = 'Cannot connect to server. Is the backend running?';
      } else {
        msg = (err as { response?: { data?: { message?: string } } })
          ?.response?.data?.message ?? msg;
      }
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className={`login-page-root ${loaded ? 'is-loaded' : ''} ${success ? 'is-success' : ''}`}>
      <div className="handcrafted-background">
        <div className="bg-layer bg-gradient"></div>
        <div className="bg-layer bg-lighting"></div>
      </div>

      <div className="auth-left-panel">
        <LivingBlueprintExperience />
        <div className="left-panel-content">
          <div className="brand-header entrance-stagger-1">
            <div className="brand-logo">
              <Command size={20} strokeWidth={2.5} />
            </div>
            <span className="brand-name">HPX Eigen</span>
          </div>

          <h1 className="hero-title entrance-stagger-2">
            Relationship intelligence for the modern enterprise.
          </h1>
          <p className="hero-subtitle entrance-stagger-3">
            The most powerful CRM built to capture, analyze, and leverage your organizational network.
          </p>
          
          <div className="entrance-stagger-4">
            <FeatureSequence />
          </div>
        </div>

        <div className="left-panel-footer entrance-stagger-5">
          <div className="stat-block">
            <div className="stat-label">Customers</div>
            <div className="stat-value">
              <Users size={14} className="stat-icon" /> 10,000+ Teams
            </div>
          </div>
          <div className="stat-block">
            <div className="stat-label">Uptime</div>
            <div className="stat-value">
              <div className="status-dot" /> 99.99% SLA
            </div>
          </div>
          <div className="stat-block">
            <div className="stat-label">Security</div>
            <div className="stat-value">
              <Lock size={14} className="stat-icon" /> SOC-2 Type II
            </div>
          </div>
        </div>
      </div>

      <div className="auth-right-panel">
        <div className="secure-indicator">
          <Globe size={14} /> Secure Login
        </div>

        <div className="auth-card-container">
          <div className={`auth-form-wrapper ${loading || success ? 'is-hidden' : ''}`}>
            <div className="auth-header">
              <h2>Welcome back</h2>
              <p>Enter your details to access your workspace.</p>
            </div>

            {error && (
              <div className="error-banner">
                <div className="error-dot" />
                {error}
              </div>
            )}

            <form id="login-form" onSubmit={handleSubmit} className="auth-form">
              <div className="input-group auth-stagger-1">
                <label htmlFor="tenant-id">Organization ID</label>
                <div className="input-wrapper">
                  <input
                    id="tenant-id"
                    type="text"
                    className={`premium-input ${error ? 'input-error' : ''}`}
                    placeholder="HPX-EIGEN"
                    value={tenantId}
                    onChange={e => setTenantId(e.target.value)}
                    autoComplete="organization"
                    spellCheck={false}
                    required
                  />
                </div>
              </div>

              <div className="input-group auth-stagger-2">
                <label htmlFor="email">Email Address</label>
                <div className="input-wrapper">
                  <input
                    id="email"
                    type="email"
                    className={`premium-input ${error ? 'input-error' : ''}`}
                    placeholder="name@company.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="email"
                    spellCheck={false}
                    required
                  />
                </div>
              </div>

              <div className="input-group auth-stagger-3">
                <div className="password-header">
                  <label htmlFor="password">Password</label>
                  <a href="#" className="forgot-link">Forgot password?</a>
                </div>
                <div className="input-wrapper">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className={`premium-input pr-10 ${error ? 'input-error' : ''}`}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="password-toggle"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
                  </button>
                </div>
              </div>

              <div className="remember-me-wrapper auth-stagger-4">
                <label className="checkbox-container">
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                  />
                  <span className="checkmark">
                    <Check size={12} strokeWidth={3} />
                  </span>
                  <span className="checkbox-label">Keep me signed in for 30 days</span>
                </label>
              </div>

              <button type="submit" className={`premium-button auth-stagger-5 ${success ? 'btn-success' : ''}`}>
                <span className="btn-text">{success ? 'Authenticated' : 'Sign In'}</span>
                {success ? (
                  <Check size={16} className="btn-icon" style={{ opacity: 0, animation: 'minimalFadeIn 300ms forwards' }} />
                ) : (
                  osShortcut && (
                    <div className="shortcut-hint">
                      <span className="os-key">{osShortcut}</span> Enter
                    </div>
                  )
                )}
              </button>
            </form>

            <div className="text-center mt-6 auth-stagger-5" style={{ marginTop: '24px', textAlign: 'center' }}>
              <p style={{ color: 'var(--color-auth-muted)', fontSize: '14px' }}>
                Don't have an account? <a href="/signup" style={{ color: 'var(--color-auth-text)', fontWeight: 500, textDecoration: 'none' }}>Sign up</a>
              </p>
            </div>
          </div>

          {loading && (
            <div className={`loader-overlay ${success ? 'loader-finishing' : ''}`}>
              <HPXLoader />
            </div>
          )}
        </div>
      </div>

      <style>{`
        /* GLOBAL RESET & CSS VARIABLES */
        :root {
          --ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
          --ease-out: cubic-bezier(0.0, 0, 0.2, 1);
          
          --color-bg: #000000;
          --color-surface: #0a0a0a;
          --color-text: #ffffff;
          
          --color-auth-bg: #ffffff;
          --color-auth-text: #09090b;
          --color-auth-muted: #52525b;
          --color-auth-border: #e4e4e7;
          
          --radius-md: 12px;
          --radius-sm: 8px;
        }

        * { box-sizing: border-box; }

        .login-page-root {
          display: flex;
          min-height: 100vh;
          width: 100vw;
          background-color: var(--color-bg);
          overflow: hidden;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          position: relative;
        }

        /* BACKGROUND LAYERS */
        .handcrafted-background {
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          opacity: 0;
          transition: opacity 800ms var(--ease-smooth);
        }
        .is-loaded .handcrafted-background {
          opacity: 1;
        }
        
        .bg-layer {
          position: absolute;
          inset: -20%;
          width: 140%;
          height: 140%;
        }
        
        /* Layer 1: Radial Lighting */
        .bg-lighting {
          background: radial-gradient(circle at 30% 50%, rgba(255,255,255,0.04) 0%, transparent 60%);
          transform: translate3d(0, 0, 0);
        }

        /* Layer 2: Subtle Gradients drifting */
        .bg-gradient {
          background: linear-gradient(120deg, rgba(15,15,15,1) 0%, rgba(0,0,0,1) 100%);
          animation: drift 30s linear infinite alternate;
          transform: translate3d(0, 0, 0);
        }
        
        @keyframes drift {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-5%, -5%, 0); }
        }

        /* LEFT PANEL */
        .auth-left-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 60px;
          position: relative;
          z-index: 1;
        }

        /* LIVING BLUEPRINT EXPERIENCE */
        .blueprint-container {
          position: absolute;
          inset: 0;
          z-index: 0; /* Behind left panel content */
          pointer-events: none;
          opacity: 0;
        }
        .is-loaded .blueprint-entrance {
          animation: minimalFadeIn 2s var(--ease-smooth) 100ms forwards;
        }
        .blueprint-svg {
          width: 100%;
          height: 100%;
          opacity: 0.8;
          transition: opacity 1.5s var(--ease-smooth);
        }
        
        .auth-left-panel:hover .blueprint-svg {
          opacity: 1;
        }

        @media (prefers-reduced-motion: reduce) {
          .bp-frame, .bp-guide, .bp-accent {
            animation: none !important;
            opacity: 0.1 !important;
            transform: none !important;
          }
        }

        /* Frames Assembly */
        .bp-frame {
          fill: none;
          stroke: #ffffff;
          stroke-width: 0.5;
          opacity: 0;
        }
        .bp-frame-1 { animation: assembleFrame 21s var(--ease-smooth) infinite; }
        .bp-frame-2 { animation: assembleFrame 27s var(--ease-smooth) infinite; animation-delay: -5s; }
        .bp-frame-3 { animation: assembleFrame 19s var(--ease-smooth) infinite; animation-delay: -11s; }
        .bp-frame-4 { animation: assembleFrame 29s var(--ease-smooth) infinite; animation-delay: -17s; }

        @keyframes assembleFrame {
          0%, 100% { opacity: 0; transform: translate3d(4px, 4px, 0); }
          10% { opacity: 0; }
          15%, 35% { opacity: 0.1; transform: translate3d(0, 0, 0); }
          40% { opacity: 0; }
        }

        /* Guide Lines Extending */
        .bp-guide {
          stroke: #ffffff;
          stroke-width: 0.5;
          opacity: 0;
          transform-box: fill-box;
        }
        .bp-guide-x1 { transform-origin: left; animation: extendGuideX 23s var(--ease-smooth) infinite; }
        .bp-guide-x2 { transform-origin: right; animation: extendGuideX 31s var(--ease-smooth) infinite; animation-delay: -7s; }
        .bp-guide-y1 { transform-origin: top; animation: extendGuideY 17s var(--ease-smooth) infinite; animation-delay: -13s; }
        .bp-guide-y2 { transform-origin: bottom; animation: extendGuideY 29s var(--ease-smooth) infinite; animation-delay: -19s; }

        @keyframes extendGuideX {
          0%, 100% { opacity: 0; transform: scaleX(0); }
          10% { opacity: 0; transform: scaleX(0); }
          15%, 30% { opacity: 0.15; transform: scaleX(1); }
          40% { opacity: 0; transform: scaleX(1); }
        }
        
        @keyframes extendGuideY {
          0%, 100% { opacity: 0; transform: scaleY(0); }
          10% { opacity: 0; transform: scaleY(0); }
          15%, 30% { opacity: 0.15; transform: scaleY(1); }
          40% { opacity: 0; transform: scaleY(1); }
        }

        /* Accent */
        .bp-accent {
          fill: #3b82f6; /* HPX Blue Accent */
          opacity: 0;
          animation: pulseAccent 19s var(--ease-smooth) infinite;
          animation-delay: -3s;
        }
        @keyframes pulseAccent {
          0%, 100% { opacity: 0; }
          45% { opacity: 0; }
          50%, 55% { opacity: 0.8; }
          60% { opacity: 0; }
        }

        /* Hover Interactivity */
        .auth-left-panel:hover .bp-frame-2 {
          opacity: 0.15 !important;
          transform: translate3d(0, 0, 0) !important;
          transition: all 1.5s var(--ease-smooth);
        }
        .auth-left-panel:hover .bp-guide-x1 {
          opacity: 0.25 !important;
          transform: scaleX(1) !important;
          transition: all 1.5s var(--ease-smooth);
        }

        /* Login Success Resolution */
        .is-success .bp-frame,
        .is-success .bp-guide,
        .is-success .bp-accent {
          animation: none !important;
          opacity: 0.15 !important;
          transform: scale(1) translate3d(0,0,0) !important;
          transition: all 1s var(--ease-out);
        }
        .is-success .blueprint-svg {
          opacity: 0.3;
        }

        /* STAGGERED ENTRANCES (Left Panel) */
        .entrance-stagger-1, .entrance-stagger-2, .entrance-stagger-3, .entrance-stagger-4, .entrance-stagger-5 {
          opacity: 0;
        }
        .is-loaded .entrance-stagger-1 { animation: minimalFadeIn 600ms var(--ease-out) forwards; animation-delay: 50ms; }
        .is-loaded .entrance-stagger-2 { animation: minimalFadeIn 600ms var(--ease-out) forwards; animation-delay: 100ms; }
        .is-loaded .entrance-stagger-3 { animation: minimalFadeIn 600ms var(--ease-out) forwards; animation-delay: 150ms; }
        .is-loaded .entrance-stagger-4 { animation: minimalFadeIn 600ms var(--ease-out) forwards; animation-delay: 200ms; }
        .is-loaded .entrance-stagger-5 { animation: minimalFadeIn 600ms var(--ease-out) forwards; animation-delay: 250ms; }

        @keyframes minimalFadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        /* LEFT CONTENT */
        .left-panel-content {
          max-width: 520px;
          margin-top: 40px;
        }
        .brand-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 80px;
        }
        .brand-logo {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-sm);
          background: rgba(255,255,255,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        .brand-name {
          color: white;
          font-weight: 600;
          font-size: 18px;
          letter-spacing: -0.02em;
        }
        .hero-title {
          color: white;
          font-size: 44px;
          font-weight: 500;
          line-height: 1.15;
          letter-spacing: -0.03em;
          margin: 0 0 24px 0;
        }
        .hero-subtitle {
          color: #a3a3a3;
          font-size: 18px;
          line-height: 1.5;
          margin: 0 0 48px 0;
        }

        /* FEATURE SEQUENCE */
        .feature-sequence-container {
          position: relative;
          height: 60px;
        }
        .feature-card {
          position: absolute;
          top: 0;
          left: 0;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 20px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 100px;
          color: white;
          font-size: 15px;
          font-weight: 500;
          opacity: 0;
          transform: translateY(8px);
          transition: opacity 600ms var(--ease-out), transform 600ms var(--ease-out);
          pointer-events: none;
        }
        .feature-card.active {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }
        .feature-icon-wrapper {
          color: #a3a3a3;
          display: flex;
        }

        /* LEFT FOOTER */
        .left-panel-footer {
          display: flex;
          gap: 48px;
          padding-top: 32px;
        }
        .stat-label {
          color: #737373;
          font-size: 12px;
          font-weight: 500;
          text-transform: uppercase;
          margin-bottom: 6px;
        }
        .stat-value {
          color: #ffffff;
          font-size: 14px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .stat-icon { color: #a3a3a3; }
        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: #10b981;
        }

        /* RIGHT PANEL */
        .auth-right-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          position: relative;
          background-color: var(--color-auth-bg);
          z-index: 2;
        }
        .secure-indicator {
          position: absolute;
          top: 32px;
          right: 40px;
          display: flex;
          align-items: center;
          gap: 6px;
          color: #737373;
          font-size: 13px;
          font-weight: 500;
        }
        .auth-card-container {
          width: 100%;
          max-width: 400px;
          position: relative;
        }
        
        .auth-form-wrapper {
          width: 100%;
          opacity: 0;
          transform: translateY(10px);
          transition: opacity 600ms var(--ease-out), transform 600ms var(--ease-out);
        }
        .is-loaded .auth-form-wrapper {
          opacity: 1;
          transform: translateY(0);
        }
        .auth-form-wrapper.is-hidden {
          opacity: 0;
          pointer-events: none;
          transform: translateY(-10px);
        }
        
        /* AUTH STAGGERING */
        .auth-stagger-1, .auth-stagger-2, .auth-stagger-3, .auth-stagger-4, .auth-stagger-5 {
          opacity: 0;
        }
        .is-loaded .auth-stagger-1 { animation: minimalFadeIn 600ms var(--ease-out) forwards; animation-delay: 200ms; }
        .is-loaded .auth-stagger-2 { animation: minimalFadeIn 600ms var(--ease-out) forwards; animation-delay: 240ms; }
        .is-loaded .auth-stagger-3 { animation: minimalFadeIn 600ms var(--ease-out) forwards; animation-delay: 280ms; }
        .is-loaded .auth-stagger-4 { animation: minimalFadeIn 600ms var(--ease-out) forwards; animation-delay: 320ms; }
        .is-loaded .auth-stagger-5 { animation: minimalFadeIn 600ms var(--ease-out) forwards; animation-delay: 360ms; }
        
        .auth-header { margin-bottom: 40px; }
        .auth-header h2 {
          font-size: 30px;
          font-weight: 600;
          letter-spacing: -0.03em;
          color: var(--color-auth-text);
          margin-bottom: 8px;
        }
        .auth-header p {
          color: var(--color-auth-muted);
          font-size: 16px;
        }

        /* Error Banner & Shake */
        .error-banner {
          padding: 14px 16px;
          background-color: #fef2f2;
          color: #b91c1c;
          border-radius: var(--radius-md);
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 28px;
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid #fee2e2;
          animation: singleShake 0.3s var(--ease-out) forwards;
        }
        .error-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: #ef4444;
        }
        @keyframes singleShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }

        /* Form Inputs */
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 22px;
        }
        .input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .input-group label {
          font-size: 14px;
          font-weight: 500;
          color: var(--color-auth-text);
        }
        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .premium-input {
          width: 100%;
          height: 48px;
          padding: 0 16px;
          background-color: #ffffff;
          border: 1px solid var(--color-auth-border);
          border-radius: var(--radius-md);
          color: var(--color-auth-text);
          font-size: 15px;
          outline: none;
          transition: border-color 200ms var(--ease-out), transform 200ms var(--ease-out), background-color 200ms var(--ease-out);
        }
        .pr-10 { padding-right: 44px; }
        .premium-input::placeholder { color: #a1a1aa; }
        
        .premium-input:focus {
          border-color: #a1a1aa;
          background-color: #fafafa;
          transform: translateY(-1px);
        }
        
        .premium-input.input-error {
          border-color: #fca5a5;
          animation: singleShake 0.3s var(--ease-out) forwards;
        }

        .password-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .forgot-link {
          font-size: 13px;
          color: var(--color-auth-muted);
          text-decoration: none;
        }
        .forgot-link:hover { color: #18181b; }
        .password-toggle {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          color: #a1a1aa;
          cursor: pointer;
        }

        /* Remember Me Checkbox */
        .remember-me-wrapper { margin-top: 4px; }
        .checkbox-container {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          user-select: none;
        }
        .checkbox-container input { display: none; }
        .checkmark {
          width: 18px;
          height: 18px;
          border: 1px solid var(--color-auth-border);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          transition: background-color 200ms, border-color 200ms;
        }
        .checkbox-container input:checked + .checkmark {
          background-color: #18181b;
          border-color: #18181b;
        }
        .checkbox-container input:checked + .checkmark svg {
          animation: minimalFadeIn 200ms forwards;
        }
        .checkbox-label {
          font-size: 14px;
          color: var(--color-auth-muted);
        }

        /* Button */
        .premium-button {
          margin-top: 8px;
          height: 48px;
          background-color: #18181b;
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: transform 120ms var(--ease-out), filter 120ms var(--ease-out), box-shadow 120ms var(--ease-out);
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .premium-button:hover {
          filter: brightness(1.04);
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }
        .premium-button:active {
          transform: translateY(1px);
        }
        
        .shortcut-hint {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: rgba(255,255,255,0.5);
        }
        .os-key { font-family: monospace; }

        /* LOADING EXPERIENCE */
        .loader-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.9);
          backdrop-filter: blur(8px);
          opacity: 0;
          animation: minimalFadeIn 400ms var(--ease-out) forwards;
          z-index: 10;
        }
        
        .hpx-loader-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }
        
        .hpx-logo-container {
          color: #000;
          transition: transform 300ms var(--ease-out);
        }
        
        .loader-finishing .hpx-logo-container {
          transform: scale(0.9);
        }
        
        .hpx-progress-bar {
          width: 120px;
          height: 1px;
          background: #e4e4e7;
          overflow: hidden;
        }
        
        .hpx-progress-fill {
          height: 100%;
          background: #000;
          width: 0%;
          animation: progressFill 1.2s var(--ease-out) forwards;
        }
        
        @keyframes progressFill {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        
        .hpx-loader-text {
          font-size: 13px;
          color: #52525b;
          font-weight: 500;
          opacity: 0;
          animation: minimalFadeIn 400ms var(--ease-out) 200ms forwards;
        }
      `}</style>
    </div>
  );
}
