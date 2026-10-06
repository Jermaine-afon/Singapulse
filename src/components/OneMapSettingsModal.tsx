import React, { useState, useEffect } from 'react';
import {
  X,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Lock,
  Loader2,
  ExternalLink,
  HelpCircle,
  Copy
} from 'lucide-react';
import {
  getStoredOneMapToken,
  setStoredOneMapToken,
  removeStoredOneMapToken,
  mintOneMapToken
} from '../services/oneMapService';

interface OneMapSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OneMapSettingsModal: React.FC<OneMapSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [tokenInput, setTokenInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [hasToken, setHasToken] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const existing = getStoredOneMapToken();
      if (existing) {
        setHasToken(true);
        setTokenInput(existing);
      } else {
        setHasToken(false);
        setTokenInput('');
      }
      setMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveToken = () => {
    if (!tokenInput.trim()) return;
    setStoredOneMapToken(tokenInput.trim());
    setHasToken(true);
    setMessage({
      text: 'OneMap token saved successfully! Your routing requests will now use official OneMap routing.',
      type: 'success'
    });
  };

  const handleClearToken = () => {
    removeStoredOneMapToken();
    setHasToken(false);
    setTokenInput('');
    setMessage({
      text: 'Token cleared. Kaki Trails will use its built-in Singapore geodetic routing model.',
      type: 'info'
    });
  };

  const handleMintToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !passwordInput) return;
    setIsMinting(true);
    setMessage(null);
    try {
      const token = await mintOneMapToken(emailInput.trim(), passwordInput);
      setHasToken(true);
      setTokenInput(token);
      setEmailInput('');
      setPasswordInput('');
      setMessage({
        text: 'New OneMap token successfully minted via API! It is now active and valid for 72 hours (3 days).',
        type: 'success'
      });
    } catch (err: any) {
      setMessage({
        text: err.message || 'Failed to mint token. Please verify your email and password.',
        type: 'error'
      });
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      <div
        className="bg-white rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-base font-bold font-display text-white">
                OneMap Credentials & Token Manager
              </h3>
              <p className="text-xs text-slate-400">
                Official Singapore Land Authority (SLA) Routing & Spatial APIs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
          
          {/* Important Guide on "Confirmation Code" */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-900 text-xs">
              <HelpCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Where does the OneMap Confirmation Code go?</span>
            </div>
            <p className="text-amber-950 leading-relaxed text-[11px]">
              If OneMap sent a <strong>verification / confirmation code or link</strong> to your email during registration:
            </p>
            <ol className="list-decimal pl-4 space-y-1 text-amber-900 text-[11px]">
              <li>
                That code must be entered on the <strong>OneMap website</strong> (or by clicking the confirmation link in the email) at{' '}
                <a
                  href="https://www.onemap.gov.sg/apidocs/"
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold underline text-amber-800 inline-flex items-center gap-0.5"
                >
                  onemap.gov.sg <ExternalLink className="w-2.5 h-2.5" />
                </a>{' '}
                to activate your account.
              </li>
              <li>
                Once confirmed on OneMap, you can either mint a 3-day token below using your email and password, or paste your token directly into this app.
              </li>
            </ol>
          </div>

          {/* Feedback message banner */}
          {message && (
            <div
              className={`p-3 rounded-xl border flex items-start gap-2 ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : message.type === 'error'
                  ? 'bg-rose-50 text-rose-900 border-rose-200'
                  : 'bg-slate-50 text-slate-800 border-slate-200'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span className="leading-snug">{message.text}</span>
            </div>
          )}

          {/* Token Status Badge */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <span className="font-semibold text-slate-700">Current OneMap Routing Status:</span>
            <span
              className={`px-2.5 py-1 rounded-md font-semibold text-[11px] flex items-center gap-1.5 ${
                hasToken
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  hasToken ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                }`}
              />
              <span>{hasToken ? 'Token Active (3-Day JWT)' : 'Using Built-in Geodetic Engine'}</span>
            </span>
          </div>

          {/* Option 1: Mint Token Automatically using OneMap Account */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div>
              <h4 className="font-bold text-slate-800 text-xs">
                Option 1: Mint Token Automatically (Recommended)
              </h4>
              <p className="text-[11px] text-slate-500">
                Enter your verified OneMap credentials to call <code className="text-emerald-700 font-mono">/api/auth/post/getToken</code>:
              </p>
            </div>

            <form onSubmit={handleMintToken} className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">
                    OneMap Registered Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">
                    OneMap Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isMinting || !emailInput || !passwordInput}
                className="cursor-pointer px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg font-semibold text-xs flex items-center gap-2 transition"
              >
                {isMinting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5 text-emerald-400" />}
                <span>{isMinting ? 'Connecting to OneMap...' : 'Mint 3-Day Access Token'}</span>
              </button>
            </form>
          </div>

          {/* Option 2: Paste 3-day Token Directly */}
          <div className="space-y-2 pt-4 border-t border-slate-100">
            <div>
              <h4 className="font-bold text-slate-800 text-xs">
                Option 2: Paste Existing 3-Day Token Directly
              </h4>
              <p className="text-[11px] text-slate-500">
                If you already minted an access token from the OneMap developer portal or curl:
              </p>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-slate-800"
              />
              <button
                onClick={handleSaveToken}
                className="cursor-pointer px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs whitespace-nowrap"
              >
                Save
              </button>
              {hasToken && (
                <button
                  onClick={handleClearToken}
                  className="cursor-pointer px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-lg text-xs"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Option 3: Vercel Environment Variable */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="font-bold text-slate-800 block text-[11px]">
              Optional: For Vercel Deployment (Permanent)
            </span>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              In Vercel, go to <strong>Project Settings &gt; Environment Variables</strong> and add{' '}
              <code className="bg-slate-200 text-slate-800 px-1 py-0.5 rounded font-mono">VITE_ONEMAP_TOKEN</code> with your access token.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tokens are saved safely in your browser session.</span>
          </span>
          <button
            onClick={onClose}
            className="cursor-pointer px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
