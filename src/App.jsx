import React, { useState, useEffect, useRef } from 'react';

export default function App() {
  // --- Local Storage Keys ---
  const STORAGE_KEY_URL = 'captcha_redirect_url';
  const STORAGE_KEY_VERIFIED = 'captcha_is_verified';

  // --- React State ---
  const [redirectTargetUrl, setRedirectTargetUrl] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_URL) || 'https://example.com';
  });
  
  const [isVerified, setIsVerified] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_VERIFIED) === 'true';
  });

  // Checkbox Widget States
  const [isChecked, setIsChecked] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [showChallenge, setShowChallenge] = useState(false);

  // Active CAPTCHA Challenge Types
  const [challengeType, setChallengeType] = useState('text');
  const [funnySuccessMsg, setFunnySuccessMsg] = useState('');

  // Input States
  const [textValue, setTextValue] = useState('');
  const [mathValue, setMathValue] = useState('');
  
  // Custom Settings Drawer
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsUrlInput, setSettingsUrlInput] = useState(redirectTargetUrl);

  // Challenge Generators State
  const [currentCode, setCurrentCode] = useState('');
  const [mathQuestion, setMathQuestion] = useState({ num1: 0, num2: 0, operator: '+', answer: 0 });
  const [matchChallenge, setMatchChallenge] = useState({ target: '', list: [], targetIndex: -1 });

  // Visual/Feedback States
  const [isGenerating, setIsGenerating] = useState(false);
  const [feedback, setFeedback] = useState({ show: false, type: '', message: '' });
  const [successCountdown, setSuccessCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(300); // 5-minute session timer

  const canvasRef = useRef(null);
  const timerRef = useRef(null);

  // --- Initial Setup & Challenge Randomization ---
  useEffect(() => {
    if (!isVerified) {
      generateChallenges();
    }
  }, [isVerified, challengeType]);

  // Redraw text canvas if we switch to 'text' mode and it's active
  useEffect(() => {
    if (challengeType === 'text' && currentCode && !isVerified) {
      setTimeout(() => drawCaptchaOnCanvas(currentCode), 50);
    }
  }, [challengeType, currentCode, isVerified, showChallenge]);

  // Save changes to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_URL, redirectTargetUrl);
  }, [redirectTargetUrl]);

  // Safe redirect countdown timer
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_VERIFIED, isVerified.toString());
    if (isVerified) {
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

  // 5-Minute Safety Session Timer
  useEffect(() => {
    if (isVerified || !showChallenge) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const nextTime = prev - 1;
        if (nextTime <= 0) {
          clearInterval(timerRef.current);
          setFeedback({
            show: true,
            type: 'error',
            message: 'Session expired. Please close and recheck the box.'
          });
          resetCheckboxWidget();
          return 0;
        }
        return nextTime;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isVerified, showChallenge]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // --- Reset checkbox status on failure/expiry ---
  const resetCheckboxWidget = () => {
    setIsChecked(false);
    setIsChecking(false);
    setShowChallenge(false);
    setTextValue('');
    setMathValue('');
  };

  const SUCCESS_MESSAGES = [
    "Welcome to the human club! We have snacks.",
    "You're definitely human! Probably.",
    "Beep boop... wait, you're not a robot! Access granted.",
    "Wow, a real flesh-and-blood user! Come on in.",
    "I'll let you in, but I'm keeping my robotic eye on you."
  ];

  const FAILURE_MESSAGES = [
    "Nice try, toaster! Try again.",
    "Are you sure you aren't a microwave? Let's retry.",
    "My calculator could do better than that.",
    "Error 404: Human intelligence not found. Try again!",
    "Even my smart fridge got that one right."
  ];

  // --- Trigger All Challenges Simultaneously ---
  const generateChallenges = () => {
    setIsGenerating(true);
    setFeedback({ show: false, type: '', message: '' });

    // Pick a random challenge type
    const types = ['text', 'math', 'match'];
    const randomType = types[Math.floor(Math.random() * types.length)];
    setChallengeType(randomType);

    // 1. Text CAPTCHA Generation
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let codeResult = '';
    for (let i = 0; i < 6; i++) {
      codeResult += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    setCurrentCode(codeResult);

    // 2. Math CAPTCHA Generation
    const n1 = Math.floor(Math.random() * 12) + 1;
    const n2 = Math.floor(Math.random() * 10) + 1;
    const isAddition = Math.random() > 0.5;
    setMathQuestion({
      num1: n1,
      num2: n2,
      operator: isAddition ? '+' : '-',
      answer: isAddition ? (n1 + n2) : (n1 - n2)
    });

    // 3. Match CAPTCHA Generation (Safe Icons instead of Emojis)
    const iconPool = [
      { name: 'Star', char: 'fa-star' },
      { name: 'Heart', char: 'fa-heart' },
      { name: 'Moon', char: 'fa-moon' },
      { name: 'Cloud', char: 'fa-cloud' },
      { name: 'Bolt', char: 'fa-bolt' },
      { name: 'Leaf', char: 'fa-leaf' },
      { name: 'Bell', char: 'fa-bell' },
      { name: 'Music Note', char: 'fa-music' }
    ];
    // Pick target
    const targetItem = iconPool[Math.floor(Math.random() * iconPool.length)];
    // Shuffle pool for options
    const shuffledList = [...iconPool].sort(() => Math.random() - 0.5).slice(0, 6);
    // Ensure target is in the list
    if (!shuffledList.some(item => item.name === targetItem.name)) {
      shuffledList[Math.floor(Math.random() * shuffledList.length)] = targetItem;
    }
    const finalTargetIndex = shuffledList.findIndex(item => item.name === targetItem.name);

    setMatchChallenge({
      target: targetItem.name,
      list: shuffledList,
      targetIndex: finalTargetIndex
    });

    setTimeLeft(300); // Reset timer
    setIsGenerating(false);
  };

  // --- Draw Canvas Helper ---
  const drawCaptchaOnCanvas = (code) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1e293b'; // slate-800 background
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines noise
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 20) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }

    // Bezier curve distractors
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = `rgba(${150 + Math.random() * 100}, ${150 + Math.random() * 100}, 255, 0.3)`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.bezierCurveTo(
        Math.random() * canvas.width, Math.random() * canvas.height,
        Math.random() * canvas.width, Math.random() * canvas.height,
        Math.random() * canvas.width, Math.random() * canvas.height
      );
      ctx.stroke();
    }

    // Characters render
    const spacing = canvas.width / (code.length + 1);
    ctx.textBaseline = 'middle';
    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      const size = 26 + Math.floor(Math.random() * 6);
      const angle = (-15 + Math.random() * 30) * Math.PI / 180;
      ctx.save();
      ctx.font = `bold ${size}px monospace`;
      ctx.fillStyle = `hsl(${200 + Math.random() * 40}, 90%, 75%)`;
      ctx.translate(spacing * (i + 1), canvas.height / 2);
      ctx.rotate(angle);
      ctx.fillText(char, -10, 0);
      ctx.restore();
    }
  };

  // --- Handle Click on the "I'm not a robot" Anchor checkbox ---
  const handleCheckboxClick = () => {
    if (isChecked || isChecking || isVerified) return;

    setIsChecking(true);
    setFeedback({ show: false, type: '', message: '' });

    // Simulate standard authentic network pre-check delay
    setTimeout(() => {
      setIsChecking(false);
      setIsChecked(true);
      setShowChallenge(true); // Open the challenge popover container
      generateChallenges();
    }, 1200);
  };

  // --- Play Audio Challenge Helper ---
  const playAudioCaptcha = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      let promptText = '';
      if (challengeType === 'text') {
        promptText = `Type these six letters: ${currentCode.split('').join('. ')}.`;
      } else if (challengeType === 'math') {
        promptText = `Solve simple math. What is ${mathQuestion.num1} ${mathQuestion.operator === '+' ? 'plus' : 'minus'} ${mathQuestion.num2}?`;
      } else {
        promptText = `Interactive Match. Click on the item named ${matchChallenge.target}.`;
      }
      const utterance = new SpeechSynthesisUtterance(promptText);
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  };

  // --- Validate Selected Emoji Match ---
  const handleEmojiClick = (index) => {
    if (index === matchChallenge.targetIndex) {
      triggerSuccess();
    } else {
      const randomFail = FAILURE_MESSAGES[Math.floor(Math.random() * FAILURE_MESSAGES.length)];
      setFeedback({
        show: true,
        type: 'error',
        message: randomFail
      });
      generateChallenges();
    }
  };

  // --- Submit Text or Math verification ---
  const handleChallengeSubmit = (e) => {
    e.preventDefault();
    setFeedback({ show: false, type: '', message: '' });

    if (challengeType === 'text') {
      if (textValue.trim().toUpperCase() === currentCode) {
        triggerSuccess();
      } else {
        const randomFail = FAILURE_MESSAGES[Math.floor(Math.random() * FAILURE_MESSAGES.length)];
        setFeedback({ show: true, type: 'error', message: randomFail });
        generateChallenges();
      }
    } else if (challengeType === 'math') {
      if (parseInt(mathValue, 10) === mathQuestion.answer) {
        triggerSuccess();
      } else {
        const randomFail = FAILURE_MESSAGES[Math.floor(Math.random() * FAILURE_MESSAGES.length)];
        setFeedback({ show: true, type: 'error', message: randomFail });
        generateChallenges();
      }
    }
  };

  // --- Trigger Successful Human Verification ---
  const triggerSuccess = () => {
    const randomSuccess = SUCCESS_MESSAGES[Math.floor(Math.random() * SUCCESS_MESSAGES.length)];
    setFunnySuccessMsg(randomSuccess);
    setShowChallenge(false);
    setIsVerified(true);
  };

  const executeRedirect = () => {
    localStorage.removeItem(STORAGE_KEY_VERIFIED);
    window.location.href = redirectTargetUrl;
  };

  const handleSaveSettings = () => {
    let rawUrl = settingsUrlInput.trim();
    if (rawUrl) {
      if (!/^https?:\/\//i.test(rawUrl)) {
        rawUrl = 'https://' + rawUrl;
      }
      setRedirectTargetUrl(rawUrl);
      setIsSettingsOpen(false);
      resetCheckboxWidget();
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-100 flex flex-col items-center justify-center p-4 selection:bg-blue-500 selection:text-white">
      
      {/* Centered Premium Google Form Card */}
      <div className="w-full max-w-md bg-white rounded-xl border border-slate-200/80 p-6 sm:p-8 shadow-md relative flex flex-col transition-all">
        
        {/* Google Security Shield Icon */}
        <div className="flex justify-center mb-4">
          <svg className="w-12 h-12 select-none" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.1-.3-.19-.63-.19-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-normal text-slate-800 tracking-tight">Security verification</h2>
          <p className="text-sm text-slate-500 mt-1.5">Please confirm your browser environment is secure.</p>
        </div>

        {/* --- MAIN WIDGET / VERIFIED FLOW AREA --- */}
        {!isVerified ? (
          <div className="space-y-4">
            
            {/* GOOGLE-STYLE "I'M NOT A ROBOT" REPLICA CHECKBOX WIDGET */}
            <div className="bg-slate-50 border border-slate-300 rounded-lg p-4 flex items-center justify-between shadow-sm select-none">
              
              {/* Checkbox + Label Zone */}
              <div className="flex items-center gap-4">
                <button 
                  type="button"
                  onClick={handleCheckboxClick}
                  disabled={isChecking || isChecked}
                  className={`w-7 h-7 rounded border-2 flex items-center justify-center transition-all bg-white relative outline-none focus:ring-2 focus:ring-blue-500/30 ${
                    isChecked ? 'border-blue-500' : 'border-slate-300 hover:border-slate-400'
                  }`}
                >
                  {isChecking && (
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  )}
                  {isChecked && !isChecking && (
                    <svg className="w-5 h-5 text-google-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <span className="text-slate-800 text-sm font-normal">
                  I'm not a robot
                </span>
              </div>

              {/* reCAPTCHA Brand Logo Zone */}
              <div className="flex flex-col items-center justify-center text-center">
                <svg className="w-8 h-8 opacity-90" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M12 2A10 10 0 002 12a9.9 9.9 0 002.3 6.3l1.4-1.4A8 8 0 1112 20v2a10 10 0 0010-10A10 10 0 0012 2z" />
                  <path fill="#34A853" d="M12 4a8 8 0 00-5.7 2.3L4.9 4.9A10 10 0 0112 2v2z" />
                  <path fill="#FBBC05" d="M4.9 4.9a10 10 0 011.4 1.4L4.9 7.7a8 8 0 00-1.4-1.4z" />
                  <path fill="#EA4335" d="M12 2v2a8 8 0 00-8 8H2a10 10 0 0110-10z" />
                </svg>
                <span className="text-[9px] text-slate-400 mt-1 font-medium leading-none">reCAPTCHA</span>
                <span className="text-[7px] text-slate-400 font-medium leading-none">Privacy - Terms</span>
              </div>

            </div>

            {/* Global alerts for outside the popup (like timeout) */}
            {feedback.show && !showChallenge && (
              <div className="mt-2 p-2 text-xs border border-red-200 bg-red-50 text-red-800 rounded-lg flex items-center gap-1.5 animate-in fade-in">
                <i className="fa-solid fa-circle-exclamation text-sm"></i>
                <span>{feedback.message}</span>
              </div>
            )}

            {/* --- CHALLENGE BOX POPOVER (Appears when box is checked) --- */}
            {showChallenge && (
              <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl p-5 relative max-w-sm w-full animate-in zoom-in-95 duration-200">
                  
                  {/* Embedded Mini-Timer */}
                  <div className="absolute top-4 right-12 text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    Time left: {formatTime(timeLeft)}
                  </div>

                  {/* Close button */}
                  <button 
                    type="button" 
                    onClick={resetCheckboxWidget}
                    className="absolute top-3 right-4 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <i className="fa-solid fa-xmark text-lg"></i>
                  </button>

                  <div className="mb-4 text-center mt-2">
                    <h3 className="text-lg font-semibold text-slate-800">Security Check</h3>
                  </div>

                  {/* Dynamic Content Views */}
                  {challengeType === 'text' && (
                    <div className="space-y-4">
                      <p className="text-xs text-slate-500 text-center">Type the characters you see in the warped graphic box:</p>
                      <div className="relative bg-slate-950 p-1.5 rounded-lg overflow-hidden flex justify-center border border-slate-200">
                        <canvas ref={canvasRef} width="290" height="85" className="rounded max-w-full" />
                      </div>
                      <form onSubmit={handleChallengeSubmit} className="space-y-3">
                        <input 
                          type="text" 
                          value={textValue}
                          onChange={(e) => setTextValue(e.target.value)}
                          required
                          placeholder="Type standard security code"
                          className="w-full text-center px-3 py-2 border border-slate-300 rounded-lg text-lg uppercase tracking-widest font-mono font-semibold focus:ring-2 focus:ring-google-blue outline-none"
                        />
                        <button 
                          type="submit" 
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm tracking-wider uppercase py-2.5 rounded-lg shadow-sm"
                        >
                          Verify Human Code
                        </button>
                      </form>
                    </div>
                  )}

                  {challengeType === 'math' && (
                    <div className="space-y-4">
                      <p className="text-xs text-slate-500 text-center">Solve the simple math equation below:</p>
                      <div className="bg-slate-50 border border-slate-200 py-4 rounded-lg text-center font-mono text-2xl font-bold text-slate-800 tracking-wider">
                        {mathQuestion.num1} {mathQuestion.operator} {mathQuestion.num2} = ?
                      </div>
                      <form onSubmit={handleChallengeSubmit} className="space-y-3">
                        <input 
                          type="number" 
                          value={mathValue}
                          onChange={(e) => setMathValue(e.target.value)}
                          required
                          placeholder="Your math result"
                          className="w-full text-center px-3 py-2 border border-slate-300 rounded-lg text-lg font-semibold focus:ring-2 focus:ring-google-blue outline-none"
                        />
                        <button 
                          type="submit" 
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm tracking-wider uppercase py-2.5 rounded-lg shadow-sm"
                        >
                          Verify Math Result
                        </button>
                      </form>
                    </div>
                  )}

                  {challengeType === 'match' && (
                    <div className="space-y-4">
                      <div className="text-center">
                        <p className="text-xs text-slate-500">Interactive Image Match Challenge:</p>
                        <h4 className="text-sm font-bold text-slate-800 mt-1">
                          Select the <span className="text-google-blue underline font-extrabold">{matchChallenge.target}</span>
                        </h4>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2.5">
                        {matchChallenge.list.map((item, index) => (
                          <button 
                            key={index} 
                            type="button"
                            onClick={() => handleEmojiClick(index)}
                            className="aspect-square bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl flex items-center justify-center text-3xl text-slate-600 hover:text-blue-500 transition-all transform active:scale-95"
                            title={item.name}
                          >
                            <i className={`fa-solid ${item.char}`}></i>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Interactive Auxiliary Footer */}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3.5 mt-4 text-xs">
                    <button 
                      type="button" 
                      onClick={playAudioCaptcha} 
                      className="text-google-blue font-semibold hover:underline flex items-center gap-1"
                    >
                      <i className="fa-solid fa-volume-high"></i> Audio Assist
                    </button>
                    <button 
                      type="button" 
                      onClick={generateChallenges} 
                      className="text-slate-500 font-semibold hover:text-slate-800 flex items-center gap-1"
                    >
                      <i className="fa-solid fa-arrows-rotate"></i> Refresh Prompt
                    </button>
                  </div>

                  {/* User alerts */}
                  {feedback.show && showChallenge && (
                    <div className="mt-3 p-2 text-xs border border-red-200 bg-red-50 text-red-800 rounded-lg flex items-center gap-1.5 animate-in fade-in slide-in-from-top-2">
                      <i className="fa-solid fa-circle-exclamation text-sm"></i>
                      <span>{feedback.message}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

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
              <p className="text-slate-500 text-sm font-medium px-2">{funnySuccessMsg || "You have verified your session successfully."}</p>
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
          <p>This verification is child-safe, simple, and ensures maximum compliance against automated spam tools.</p>
          <div className="flex gap-3 justify-between font-medium">
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="hover:underline text-google-blue">Privacy Policy</a>
            <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="hover:underline text-google-blue">Terms of Service</a>
          </div>
        </div>

        {/* Subtle, Hidden Redirect Destination Link Trigger */}
        <div className="pt-4 border-t border-slate-100 text-center mt-4">
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
  );
}
