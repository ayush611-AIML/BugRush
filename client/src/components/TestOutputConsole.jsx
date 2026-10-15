import React, { useState } from 'react';
import { CheckCircle2, XCircle, Clock, AlertTriangle, ShieldCheck, Terminal, HelpCircle, FileText, ChevronDown, ChevronRight } from 'lucide-react';

export function TestOutputConsole({
  challenge,
  runResult,
  isRunning
}) {
  const [activeTab, setActiveTab] = useState('tests'); // 'tests' | 'description' | 'logs'
  const [openHints, setOpenHints] = useState({});

  const toggleHint = (idx) => {
    setOpenHints((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const status = runResult?.status;
  const isAccepted = status === 'ACCEPTED';
  const isFailed = status === 'WRONG_ANSWER';
  const isTimeout = status === 'TIME_LIMIT_EXCEEDED';
  const isRuntimeError = status === 'RUNTIME_ERROR';

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-[#E8DDD2]/60 overflow-hidden shadow-xs">
      {/* Console Header Tabs */}
      <div className="flex items-center justify-between px-3 bg-[#FBF4EC] border-b border-[#E8DDD2]/60">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('description')}
            className={`px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'description'
                ? 'border-[#C06520] text-[#C06520] bg-white font-bold'
                : 'border-transparent text-[#8A7560] hover:text-[#3B1E10]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Bug Report
          </button>

          <button
            onClick={() => setActiveTab('tests')}
            className={`px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'tests'
                ? 'border-[#C06520] text-[#C06520] bg-white font-bold'
                : 'border-transparent text-[#8A7560] hover:text-[#3B1E10]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Test Results
            {runResult && (
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                isAccepted ? 'bg-[#C06520]/15 text-[#C06520]' : 'bg-rose-100 text-rose-800'
              }`}>
                {runResult.passed}/{runResult.total}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'logs'
                ? 'border-[#C06520] text-[#C06520] bg-white font-bold'
                : 'border-transparent text-[#8A7560] hover:text-[#3B1E10]'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Console
            {runResult?.logs?.length ? (
              <span className="w-1.5 h-1.5 rounded-full bg-[#C06520]" />
            ) : null}
          </button>
        </div>

        {/* Status Pill */}
        {runResult && (
          <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono font-bold">
            {isAccepted && (
              <span className="text-[#C06520] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> ACCEPTED
              </span>
            )}
            {isFailed && (
              <span className="text-rose-700 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> WRONG ANSWER
              </span>
            )}
            {isTimeout && (
              <span className="text-[#3B1E10] flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#8A7560]" /> TIME LIMIT EXCEEDED
              </span>
            )}
            {isRuntimeError && (
              <span className="text-rose-700 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> RUNTIME ERROR
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Panel Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 1: DESCRIPTION & BUG REPORT */}
        {activeTab === 'description' && (
          <div className="space-y-4 text-xs leading-relaxed text-[#3B1E10]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8DDD2]/30">
              <div>
                <h3 className="text-sm font-bold text-[#3B1E10] mb-0.5">{challenge?.title}</h3>
                <p className="text-[11px] text-[#8A7560]">
                  Target function: <code className="text-[#C06520] font-mono font-semibold">{challenge?.functionName}()</code>
                </p>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                challenge?.difficulty === 'Easy'
                  ? 'bg-[#C06520]/10 text-[#C06520] border border-[#C06520]/25'
                  : challenge?.difficulty === 'Hard'
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : 'bg-[#3B1E10]/10 text-[#3B1E10] border border-[#3B1E10]/20'
              }`}>
                {challenge?.difficulty || 'Medium'}
              </span>
            </div>

            <div className="space-y-2 text-[#6B5040]">
              <p className="whitespace-pre-line">{challenge?.description}</p>
            </div>

            {challenge?.hints?.length > 0 && (
              <div className="mt-6 pt-4 border-t border-[#E8DDD2]/30">
                <div className="text-[11px] font-mono text-[#8A7560] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-[#C06520]" />
                  Debugging Hints
                </div>
                <div className="space-y-2">
                  {challenge.hints.map((hint, idx) => (
                    <div
                      key={idx}
                      className="border border-[#E8DDD2]/50 rounded-xl overflow-hidden bg-[#FBF4EC]/70"
                    >
                      <button
                        onClick={() => toggleHint(idx)}
                        className="w-full px-3 py-2 text-left text-xs font-semibold text-[#3B1E10] hover:text-[#C06520] flex items-center justify-between transition-colors"
                      >
                        <span>Hint #{idx + 1}</span>
                        {openHints[idx] ? <ChevronDown className="w-3.5 h-3.5 text-[#C06520]" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </button>
                      {openHints[idx] && (
                        <div className="px-3 pb-2.5 pt-1 text-[#6B5040] text-xs border-t border-[#E8DDD2]/40 bg-white">
                          {hint}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TEST RESULTS */}
        {activeTab === 'tests' && (
          <div className="space-y-4">
            {!runResult && !isRunning ? (
              <div className="py-12 text-center text-[#8A7560]">
                <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-[#C06520] opacity-60" />
                <p className="text-xs text-[#3B1E10] font-medium">No execution results yet.</p>
                <p className="text-[11px] text-[#8A7560] mt-1">Press "Run Tests" or Ctrl+Enter to test your solution in the Judge0 sandbox.</p>
              </div>
            ) : null}

            {/* Verdict Banner */}
            {runResult && (
              <div className={`p-4 rounded-2xl border ${
                isAccepted
                  ? 'bg-[#C06520]/10 border-[#C06520]/30 text-[#3B1E10]'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {isAccepted ? (
                      <CheckCircle2 className="w-5 h-5 text-[#C06520]" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-600" />
                    )}
                    <div>
                      <h4 className="text-xs font-bold tracking-wide">
                        {isAccepted ? 'ALL TEST CASES PASSED' : runResult.status}
                      </h4>
                      <p className="text-[11px] opacity-80">{runResult.message}</p>
                    </div>
                  </div>
                  <div className="text-right font-mono text-xs">
                    <span className="font-bold">{runResult.passed}</span>
                    <span className="opacity-70"> / {runResult.total} Passed</span>
                  </div>
                </div>
              </div>
            )}

            {/* Visible Test Cases */}
            {runResult?.visibleResults && runResult.visibleResults.length > 0 && (
              <div className="space-y-2.5">
                <div className="text-[11px] font-mono text-[#8A7560] uppercase tracking-wider font-semibold">
                  Visible Test Cases
                </div>
                {runResult.visibleResults.map((t, idx) => (
                  <div
                    key={t.id || idx}
                    className={`p-3.5 rounded-xl border text-xs ${
                      t.passed
                        ? 'bg-[#C06520]/5 border-[#C06520]/25'
                        : 'bg-rose-50/40 border-rose-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 font-semibold text-[#3B1E10]">
                        {t.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-[#C06520]" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-600" />
                        )}
                        <span>{t.name || `Test Case #${idx + 1}`}</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#8A7560]">
                        {t.executionTimeMs || 0}ms
                      </span>
                    </div>

                    <div className="space-y-1.5 font-mono text-[11px]">
                      <div className="bg-white p-2 rounded-lg border border-[#E8DDD2]/40">
                        <span className="text-[#8A7560] mr-2">Input:</span>
                        <span className="text-[#3B1E10] font-semibold">{JSON.stringify(t.input)}</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-[#E8DDD2]/40">
                        <span className="text-[#8A7560] mr-2">Expected:</span>
                        <span className="text-[#C06520] font-semibold">{JSON.stringify(t.expected)}</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-[#E8DDD2]/40">
                        <span className="text-[#8A7560] mr-2">Received:</span>
                        <span className={t.passed ? 'text-[#C06520] font-semibold' : 'text-rose-700 font-bold'}>
                          {t.received !== undefined ? JSON.stringify(t.received) : 'undefined'}
                        </span>
                      </div>
                      {t.error && (
                        <div className="p-2 rounded-lg bg-rose-100/60 border border-rose-200 text-rose-800 text-[10px]">
                          {t.error}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Hidden Test Cases Security Banner */}
            {runResult && (
              <div className="p-3.5 rounded-xl bg-[#FBF4EC] border border-[#E8DDD2]/50 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#C06520]" />
                    <span className="text-xs font-semibold text-[#3B1E10]">Hidden Tests Verification</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#C06520]">
                    {runResult.hiddenPassed || 0} / {runResult.hiddenCount || 0} Passed
                  </span>
                </div>
                <p className="text-[11px] text-[#8A7560]">
                  Hidden test inputs and expected outputs are stripped by the Judge0 security harness and never leave the server to prevent solution leakage.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CONSOLE LOGS */}
        {activeTab === 'logs' && (
          <div>
            <div className="text-[11px] font-mono text-[#8A7560] mb-2 font-semibold">
              Captured Execution Output (stdout)
            </div>
            {runResult?.logs && runResult.logs.length > 0 ? (
              <div className="p-3 rounded-xl bg-[#2D150A] text-[#F0E5D8] border border-[#3B2818] font-mono text-[11px] space-y-1">
                {runResult.logs.map((log, i) => (
                  <div key={i} className="leading-tight">{log}</div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-[#8A7560] text-xs border border-dashed border-[#E8DDD2]/60 rounded-xl">
                No logs captured. Use <code className="text-[#C06520] font-mono">console.log()</code> in your code to debug.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
