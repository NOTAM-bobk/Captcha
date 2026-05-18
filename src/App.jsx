import React, { useState, useEffect, useRef } from 'react';

export default function App() {
  // --- Local Storage Keys ---
  const STORAGE_KEY_URL = 'captcha_redirect_url';
  const STORAGE_KEY_CODE = 'captcha_current_code';
  const STORAGE_KEY_TIMER = 'captcha_timer_seconds';
  const STORAGE_KEY_VERIFIED = 'captcha_is_verified';

  // --- React State ---
  const [redirectTargetUrl, setRedirectTargetUrl] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_URL) || 'https://example.com';
  });
  
  const [currentCode, setCurrentCode] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_CODE) || '';
  });

  const [timeLeft, setTimeLeft] = useState(() => {
    const savedTime = localStorage.getItem(STORAGE_KEY_TIMER);
    return savedTime !== null ? parseInt(savedTime, 10) : 300; // 5 minutes default
  });

  const [isVerified, setIsVerified] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_VERIFIED) === 'true';
  });

  const [userInput, setUserInput] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsUrlInput, setSettingsUrlInput] = useState(redirectTargetUrl);
  
  // Visual Loading and Feedback States
  const [isVerifying, setIsVerifying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [feedback, setFeedback] = useState({ show: false, type: '', message: '' });
  const [successCountdown, setSuccessCountdown] = useState(3);

  const canvasRef = useRef(null);
  const timerRef = useRef(null);

  // --- Initial Mount & Canvas Drawing ---
  useEffect(() => {
    if (!isVerified) {
      if (!currentCode) {
        generateNewCaptcha();
      } else {
        // Draw the cached CAPTCHA code from local storage
        setTimeout(() => drawCaptchaOnCanvas(currentCode), 50);
      }
    }
  }, [isVerified]);

  // --- Persist Redirect URL Changes ---
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_URL, redirectTargetUrl);
  }, [redirectTargetUrl]);

  // --- Persist Verification Status ---
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_VERIFIED, isVerified.toString());
    if (isVerified) {
      // Begin redirect countdown timer
      const redirectInterval = setInterval(() => {
        setSuccessCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(redirectInterval);
            executeRedirect();
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(redirectInterval);
    }
  }, [isVerified]);

  // --- 5-Minute Countdown Timer logic ---
  useEffect(() => {
    if (isVerified) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const nextTime = prev - 1;
        if (nextTime <= 0) {
          clearInterval(timerRef.current);
          localStorage.setItem(STORAGE_KEY_TIMER, '0');
          setFeedback({
            show: true,
            type: 'error',
            message: 'Verification window expired. Please generate a new code.'
          });
          return 0;
        }
        localStorage.setItem(STORAGE_KEY_TIMER, nextTime.toString());
        return nextTime;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isVerified, currentCode]);

  // --- Format Timer Display (MM:SS) ---
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // --- CAPTCHA Generator Logic ---
  const generateNewCaptcha = () => {
    setIsGenerating(true);
    setFeedback({ show: false, type: '', message: '' });
    setUserInput('');

    // Simulate standard secure compilation lag
    setTimeout(() => {
      const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // High-legibility set
      let result = '';
      for (let i = 0; i < 6; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
      }

      setCurrentCode(result);
      localStorage.setItem(STORAGE_KEY_CODE, result);
      
      // Reset 5 min timer back to 300
      setTimeLeft(300);
      localStorage.setItem(STORAGE_KEY_TIMER, '300');

      drawCaptchaOnCanvas(result);
      setIsGenerating(false);
    }, 400);
  };

  // --- Draw Text to Canvas with Distortions & Noise ---
  const drawCaptchaOnCanvas = (code) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Fill deep dark background
    ctx.fillStyle = '#0f172a'; // slate-900
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw random safety background grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    const gridSpacing = 20;
    for (let i = 0; i < canvas.width; i += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }

    // Draw interference lines to block text reader bots
    for (let i = 0; i < 6; i++) {
      ctx.strokeStyle = `rgba(${120 + Math.random() * 135}, ${120 + Math.random() * 135}, 255, 0.25)`;
      ctx.lineWidth = 1.5 + Math.random() * 1.5;
      ctx.beginPath();
      ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.bezierCurveTo(
        Math.random() * canvas.width, Math.random() * canvas.height,
        Math.random() * canvas.width, Math.random() * canvas.height,
        Math.random() * canvas.width, Math.random() * canvas.height
      );
      ctx.stroke();
    }

    // Draw noise dot interference pattern
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(${180 + Math.random() * 75}, ${180 + Math.random() * 75}, 255, 0.2)`;
      ctx.beginPath();
      ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, 1 + Math.random() * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw randomized text characters
    const segmentSpace = canvas.width / (code.length + 1);
    ctx.textBaseline = 'middle';

    for (let i = 0; i < code.length; i++) {
      const singleChar = code[i];
      const fontSize = 28 + Math.floor(Math.random() * 6);
      const tiltAngle = (-18 + Math.random() * 36) * Math.PI / 180;
      const verticalOffset = -5 + Math.random() * 10;
      
      ctx.save();
      ctx.font = `bold ${fontSize}px "Courier New", Courier, monospace`;
      
      // Select accessible random neon color
      ctx.fillStyle = `hsl(${190 + Math.random() * 50}, 85%, 75%)`;
      
      ctx.translate(segmentSpace * (i + 1), (canvas.height / 2) + verticalOffset);
      ctx.rotate(tiltAngle);
      
      // Shadow layer
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 4;
      
      ctx.fillText(singleChar, 0, 0);
      ctx.restore();
    }
  };

  // --- Accessibility Audio Helper ---
  const playAudioCaptcha = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const speechPrompt = `Security verification. Please type these six characters: ${currentCode.split('').join('. ')}. Repeating: ${currentCode.split('').join('. ')}.`;
      const utterance = new SpeechSynthesisUtterance(speechPrompt);
      utterance.rate = 0.85; 
      window.speechSynthesis.speak(utterance);
    } else {
      setFeedback({
        show: true,
        type: 'error',
        message: 'Your browser does not support audio speech assistive synthesis.'
      });
    }
  };

  // --- Submit Verification Form ---
  const handleVerifySubmit = (event) => {
    event.preventDefault();
    if (timeLeft <= 0) {
      setFeedback({
        show: true,
        type: 'error',
        message: 'Timer expired! Please refresh for a new code.'
      });
      return;
    }

    setIsVerifying(true);
    setFeedback({ show: false, type: '', message: '' });

    // Simulate cloud check verification latency
    setTimeout(() => {
      const cleanedInput = userInput.trim().toUpperCase();
      if (cleanedInput === currentCode) {
        setIsVerified(true);
      } else {
        setIsVerifying(false);
        setFeedback({
          show: true,
          type: 'error',
          message: 'Incorrect code. Check the characters and try again.'
        });
        generateNewCaptcha();
      }
    }, 1200);
  };

  // --- Execute Final Redirect Action ---
  const executeRedirect = () => {
    // Clean up local storage states for a fresh future session
    localStorage.removeItem(STORAGE_KEY_CODE);
    localStorage.removeItem(STORAGE_KEY_TIMER);
    localStorage.removeItem(STORAGE_KEY_VERIFIED);
    window.location.href = redirectTargetUrl;
  };

  // --- Open / Save Settings Drawer ---
  const handleSaveSettings = () => {
    let rawUrl = settingsUrlInput.trim();
    if (rawUrl) {
      if (!/^https?:\/\//i.test(rawUrl)) {
        rawUrl = 'https://' + rawUrl;
      }
      setRedirectTargetUrl(rawUrl);
      setIsSettingsOpen(false);
      generateNewCaptcha();
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col items-center justify-center p-4 selection:bg-blue-500 selection:text-white">
      
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-md relative flex flex-col">
        
        {/* Sleek, Tiny Corner Countdown Timer */}
        {!isVerified && (
          <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-mono font-bold" title="Time remaining to solve">
            <span className={`w-1.5 h-1.5 rounded-full ${timeLeft > 60 ? 'bg-emerald-500' : 'bg-rose-500 animate-ping'}`}></span>
            <span>{formatTime(timeLeft)}</span>
          </div>
        )}

        {/* Google Identity Header */}
        <div className="flex justify-center mb-4">
          <svg className="w-10 h-10 select-none" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.1-.3-.19-.63-.19-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-normal text-slate-800 tracking-tight">Security verification</h2>
          <p className="text-sm text-slate-500 mt-1.5">Please confirm that you're not an automated program.</p>
        </div>

        {/* --- SOLVING AREA WINDOW --- */}
        {!isVerified ? (
          <div className="space-y-6">
            
            {/* Core Visual CAPTCHA Display Canvas */}
            <div className="flex flex-col items-center">
              <div className="relative bg-slate-950 p-2.5 rounded-xl border border-slate-200 shadow-inner overflow-hidden">
                
                <canvas 
                  ref={canvasRef} 
                  width="310" 
                  height="90" 
                  className={`rounded-lg max-w-full bg-slate-950 cursor-pointer transition-opacity ${isGenerating ? 'opacity-30' : 'hover:opacity-90'}`}
                  title="Click image to refresh verification code"
                  onClick={generateNewCaptcha}
                />

                {/* Loader overlay during code generation */}
                {isGenerating && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40">
                    <div className="w-8 h-8 border-4 border-slate-600 border-t-white rounded-full animate-spin"></div>
                  </div>
                )}
              </div>

              {/* External Controls */}
              <div className="w-full max-w-[310px] flex items-center justify-between mt-3 text-xs border-b border-slate-100 pb-3">
                <button 
                  type="button" 
                  onClick={playAudioCaptcha} 
                  className="text-google-blue font-semibold hover:bg-blue-50 px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all"
                  disabled={isGenerating || timeLeft <= 0}
                >
                  <i className="fa-solid fa-volume-high text-sm"></i>
                  <span>Audio Assistance</span>
                </button>

                <button 
                  type="button" 
                  onClick={generateNewCaptcha} 
                  className="text-slate-600 font-semibold hover:bg-slate-100 px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all"
                  disabled={isGenerating}
                >
                  <i className={`fa-solid fa-arrows-rotate text-sm ${isGenerating ? 'animate-spin' : ''}`}></i>
                  <span>New Code</span>
                </button>
              </div>
            </div>

            {/* Form wrapper */}
            <form onSubmit={handleVerifySubmit} className="space-y-4">
              <div>
                <label htmlFor="captchaInput" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Enter characters below
                </label>
                <input 
                  type="text" 
                  id="captchaInput"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  required 
                  disabled={isVerifying || timeLeft <= 0}
                  autoComplete="off" 
                  autoCapitalize="off" 
                  spellCheck="false"
                  placeholder={timeLeft <= 0 ? "Session expired - click New Code" : "Type verification code"} 
                  className="block w-full px-4 py-3 border border-slate-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-google-blue text-slate-950 placeholder-slate-400 font-medium tracking-widest text-center text-xl uppercase transition-all disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>

              {/* Alerts & Errors */}
              {feedback.show && (
                <div className={`flex items-start p-3 text-sm rounded-lg border ${
                  feedback.type === 'error' ? 'bg-red-50 border-red-100 text-red-800' : 'bg-blue-50 border-blue-100 text-blue-800'
                }`}>
                  <i className="fa-solid fa-circle-exclamation mr-2.5 mt-0.5 shrink-0 text-base"></i>
                  <div className="font-normal">{feedback.message}</div>
                </div>
              )}

              {/* Verification action options */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={generateNewCaptcha} 
                  className="w-full sm:w-1/3 border border-slate-300 text-slate-700 font-semibold py-2.5 px-4 rounded-lg hover:bg-slate-50 transition-colors text-sm"
                >
                  Reset
                </button>
                
                {/* Bold, Accessible, High Legibility Submission Button */}
                <button 
                  type="submit" 
                  disabled={isVerifying || timeLeft <= 0}
                  className="w-full sm:w-2/3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold tracking-wide py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
                >
                  {isVerifying ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span className="text-white text-sm font-bold tracking-wider uppercase">Verify Code</span>
                      <i className="fa-solid fa-shield-halved text-xs text-white"></i>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Subtle, Hidden Redirect Destination Link Trigger */}
            <div className="pt-4 border-t border-slate-100 text-center">
              <button 
                type="button"
                onClick={() => { setSettingsUrlInput(redirectTargetUrl); setIsSettingsOpen(true); }}
                className="text-[11px] text-slate-400 hover:text-slate-600 hover:underline transition-colors inline-flex items-center gap-1.5"
              >
                <i className="fa-solid fa-link opacity-60"></i>
                <span className="max-w-[200px] truncate">Target: {redirectTargetUrl}</span>
                <span className="text-google-blue font-semibold">(Modify)</span>
              </button>
            </div>
          </div>
        ) : (
          /* --- SUCCESS REDIRECTION WINDOW --- */
          <div className="text-center py-6 space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 text-google-green border border-emerald-200 shadow-sm success-pulse">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-2xl font-medium text-slate-800">Verification complete</h3>
              <p className="text-slate-500 text-sm">Thank you, you are confirmed to be human.</p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-xs mx-auto">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Redirecting safely in</p>
              <div className="text-4xl font-extrabold text-slate-800 my-1 font-mono">{successCountdown}</div>
              <p className="text-xs text-google-blue truncate font-mono font-medium">{redirectTargetUrl}</p>
            </div>

            <div className="pt-2">
              <button 
                onClick={executeRedirect} 
                className="text-xs font-semibold text-google-blue hover:underline flex items-center justify-center gap-1.5 mx-auto py-2"
              >
                Skip countdown and proceed <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
              </button>
            </div>
          </div>
        )}

        {/* Google Standard Disclaimers */}
        <div className="mt-8 pt-4 border-t border-slate-200 text-left text-[11px] text-slate-400 space-y-2">
          <p>This verification helps block malicious scrapers and preserves cloud server performance.</p>
          <div className="flex gap-3 justify-between font-medium">
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="hover:underline text-google-blue">Privacy Policy</a>
            <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="hover:underline text-google-blue">Terms of Service</a>
          </div>
        </div>

        {/* --- SETTINGS EDIT MODAL DIALOG --- */}
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 max-w-sm w-full rounded-2xl p-6 shadow-2xl relative">
              
              <button 
                onClick={() => setIsSettingsOpen(false)} 
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-lg transition-colors"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
              
              <div className="mb-4">
                <h4 className="text-lg font-semibold text-slate-800">Edit Redirect Link</h4>
                <p className="text-xs text-slate-500">Adjust where the user is sent upon successful verification.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="modalUrlInput" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Destination URL</label>
                  <input 
                    type="url" 
                    id="modalUrlInput" 
                    value={settingsUrlInput}
                    onChange={(e) => setSettingsUrlInput(e.target.value)}
                    className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-google-blue text-slate-800 font-mono"
                  />
                </div>
                
                <button 
                  onClick={handleSaveSettings} 
                  className="w-full bg-google-blue hover:bg-google-blueHover text-white font-medium py-2.5 rounded-xl text-sm transition-colors"
                >
                  Save Destination Settings
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
