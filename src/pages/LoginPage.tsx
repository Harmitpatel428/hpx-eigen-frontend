import { useState, type FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/public';
import { VerificationModal } from './VerificationModal';
import {
  Eye, EyeOff, Users, Lock, Check,
  Target, Share2, BarChart3, Workflow, Lightbulb, ShieldCheck
} from 'lucide-react';
import { HpxMark, HpxLockup } from '../components/brand/HpxLogo';

/**
 * The organization's relationship graph, drawn in blueprint ink: entities as
 * nodes, relationships as edges, one live connection. This is the product —
 * relationship intelligence — made visible behind the sign-in.
 */
const GRAPH_NODES: Record<string, { x: number; y: number; r: number }> = {
  n1: { x: 540, y: 486, r: 7 }, // structural hub, behind the headline
  n2: { x: 360, y: 326, r: 5 },
  n3: { x: 724, y: 320, r: 5 },
  n4: { x: 300, y: 582, r: 5 },
  n5: { x: 788, y: 548, r: 6 }, // the live node, in open space

  n6: { x: 476, y: 672, r: 4 },
  n7: { x: 624, y: 676, r: 4 },
  n8: { x: 196, y: 436, r: 4 },
  n9: { x: 848, y: 430, r: 4 },
  n10: { x: 452, y: 206, r: 4 },
  n11: { x: 636, y: 196, r: 4 },
  n12: { x: 540, y: 806, r: 4 },
};
const GRAPH_EDGES: [string, string][] = [
  ['n1', 'n2'], ['n1', 'n3'], ['n1', 'n4'], ['n1', 'n5'], ['n1', 'n6'], ['n1', 'n7'],
  ['n2', 'n8'], ['n2', 'n10'], ['n3', 'n9'], ['n3', 'n11'], ['n4', 'n8'], ['n5', 'n9'],
  ['n6', 'n12'], ['n7', 'n12'], ['n10', 'n11'],
];

const RelationshipGraph = () => {
  const live = GRAPH_NODES.n5;
  return (
    <div className="blueprint-container blueprint-entrance">
      <svg width="100%" height="100%" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice" className="blueprint-svg">
        <defs>
          <pattern id="blueprint-grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#ffffff" strokeWidth="0.5" opacity="0.02" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#blueprint-grid)" />

        <g className="bp-edges">
          {GRAPH_EDGES.map(([a, b], i) => (
            <line
              key={`${a}-${b}`}
              className="bp-edge"
              x1={GRAPH_NODES[a].x} y1={GRAPH_NODES[a].y}
              x2={GRAPH_NODES[b].x} y2={GRAPH_NODES[b].y}
              pathLength={1}
              style={{ animationDelay: `${300 + i * 70}ms` }}
            />
          ))}
        </g>

        <g className="bp-nodes">
          {Object.entries(GRAPH_NODES).map(([id, n], i) => (
            <circle
              key={id}
              className={`bp-node ${id === 'n5' ? 'bp-node-accent' : ''}`}
              cx={n.x} cy={n.y} r={n.r}
              style={{ animationDelay: `${640 + i * 50}ms` }}
            />
          ))}
        </g>

        <circle className="bp-pulse" cx={live.x} cy={live.y} r={live.r} />
      </svg>
    </div>
  );
};

const featureList = [
  { label: 'Lead intelligence', Icon: Target },
  { label: 'Relationship intelligence', Icon: Share2 },
  { label: 'Pipeline analytics', Icon: BarChart3 },
  { label: 'Workflow automation', Icon: Workflow },
  { label: 'AI recommendations', Icon: Lightbulb },
  { label: 'Enterprise security', Icon: ShieldCheck },
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
      {featureList.map(({ label, Icon }, i) => (
        <div
          key={label}
          className={`feature-card ${i === index ? 'active' : ''}`}
        >
          <div className="feature-icon-wrapper">
            <Icon size={16} strokeWidth={1.5} />
          </div>
          <span>{label}</span>
        </div>
      ))}
    </div>
  )
};

const HPXLoader = () => (
  <div className="hpx-loader-wrapper">
    <div className="hpx-logo-container">
      <HpxMark size={44} />
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [osShortcut, setOsShortcut] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);

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
      await login(email.trim(), password);
      setSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 1500); // Wait for the progress line animation
    } catch (err: any) {
      if (err?.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
        setVerificationPending(true);
        setLoading(false);
        return;
      }
      
      let msg = 'Login failed. Check your credentials.';
      if (err instanceof Error && 'code' in err && err.code === 'ERR_NETWORK') {
        msg = 'Cannot connect to server. Is the backend running?';
      } else {
        msg = err?.response?.data?.message ?? msg;
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
        <RelationshipGraph />
        <div className="left-panel-content">
          <div className="brand-header entrance-stagger-1">
            <span style={{ display: 'inline-flex', background: '#fff', padding: '9px 14px', borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.18)' }}>
              <HpxLockup height={26} />
            </span>
          </div>

          <h1 className="hero-title entrance-stagger-2">
            Relationship intelligence for the modern enterprise.
          </h1>
          <p className="hero-subtitle entrance-stagger-3">
            Capture, analyze, and act on your organization's network of relationships — in one place your whole team shares.
          </p>

          <div className="entrance-stagger-4">
            <FeatureSequence />
          </div>
        </div>

        <div className="left-panel-footer entrance-stagger-5">
          <div className="stat-block">
            <div className="stat-label">Customers</div>
            <div className="stat-value">
              <Users size={14} strokeWidth={1.5} className="stat-icon" /> 10,000+ Teams
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
              <Lock size={14} strokeWidth={1.5} className="stat-icon" /> SOC-2 Type II
            </div>
          </div>
        </div>
      </div>

      {/* Verification Modal - Overlays everything */}
      <VerificationModal
        email={email}
        isOpen={verificationPending}
        onClose={() => setVerificationPending(false)}
      />

      <div className="auth-right-panel">
        <div className="secure-indicator">
          <ShieldCheck size={14} strokeWidth={1.5} /> Secure login
        </div>

        <div className="auth-card-container">
          <div className={`auth-form-wrapper ${loading || success || verificationPending ? 'is-hidden' : ''}`}>
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
                    {showPassword ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
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
                      <kbd className="key-cap">{osShortcut}</kbd>
                      <kbd className="key-cap">Enter</kbd>
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
          .bp-edge { animation: none !important; stroke-dashoffset: 0 !important; opacity: 0.1 !important; }
          .bp-node { animation: none !important; opacity: 0.22 !important; transform: none !important; }
          .bp-node-accent { opacity: 0.9 !important; }
          .bp-pulse { animation: none !important; opacity: 0 !important; }
        }

        /* Relationship edges — drawn once on entry */
        .bp-edge {
          stroke: #ffffff;
          stroke-width: 1;
          opacity: 0.1;
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
        }
        .is-loaded .bp-edge {
          animation: drawEdge 1100ms var(--ease-out) forwards;
        }
        @keyframes drawEdge {
          to { stroke-dashoffset: 0; }
        }

        /* Relationship nodes — entities */
        .bp-node {
          fill: #0a0a0a;
          stroke: #ffffff;
          stroke-width: 1;
          opacity: 0;
          transform-box: fill-box;
          transform-origin: center;
        }
        .is-loaded .bp-node {
          animation: nodeIn 500ms var(--ease-out) forwards;
        }
        @keyframes nodeIn {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 0.22; transform: scale(1); }
        }

        /* The one live hub carries the accent */
        .bp-node-accent {
          fill: #2563EB;
          stroke: none;
        }
        .is-loaded .bp-node-accent {
          animation: nodeInAccent 600ms var(--ease-out) forwards;
        }
        @keyframes nodeInAccent {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 0.85; transform: scale(1); }
        }

        /* A single live connection, slow and quiet */
        .bp-pulse {
          fill: none;
          stroke: #2563EB;
          stroke-width: 1;
          opacity: 0;
          transform-box: fill-box;
          transform-origin: center;
        }
        .is-loaded .bp-pulse {
          animation: livePulse 4.5s var(--ease-smooth) 1500ms infinite;
        }
        @keyframes livePulse {
          0% { opacity: 0.45; transform: scale(1); }
          70%, 100% { opacity: 0; transform: scale(2.6); }
        }

        /* Login success settles the graph */
        .is-success .bp-edge { opacity: 0.08; }
        .is-success .bp-node { opacity: 0.18; }
        .is-success .bp-pulse { animation: none; opacity: 0; }
        .is-success .blueprint-svg { opacity: 0.3; }

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
          margin-bottom: 6px;
        }
        .stat-value {
          color: #ffffff;
          font-size: 14px;
          font-weight: 500;
          font-variant-numeric: tabular-nums;
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
          gap: 24px;
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
          transition: border-color 200ms var(--ease-out), box-shadow 200ms var(--ease-out), background-color 200ms var(--ease-out);
        }
        .pr-10 { padding-right: 44px; }
        .premium-input::placeholder { color: #a1a1aa; }
        
        .premium-input:focus {
          border-color: #18181b;
          background-color: #ffffff;
          box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.07);
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
        .premium-button:focus-visible {
          outline: 2px solid #18181b;
          outline-offset: 2px;
        }
        .forgot-link:focus-visible,
        .password-toggle:focus-visible {
          outline: 2px solid #18181b;
          outline-offset: 2px;
          border-radius: 4px;
        }
        
        .shortcut-hint {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .key-cap {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          font-family: inherit;
          font-size: 11px;
          font-weight: 500;
          line-height: 1;
          color: rgba(255,255,255,0.72);
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 4px;
        }

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
