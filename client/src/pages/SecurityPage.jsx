import React from 'react';
import { Shield, Lock, Cpu, Server, Database, Zap, Terminal, CheckCircle2 } from 'lucide-react';

export function SecurityPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-8 py-8 space-y-10">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C06520]/10 border border-[#C06520]/30 text-[#C06520] text-xs font-mono mb-2">
          <Shield className="w-3.5 h-3.5 text-[#C06520]" />
          SYSTEM DESIGN & SECURITY SPECIFICATION
        </div>
        <h1 className="text-3xl font-black text-[#3B1E10] tracking-tight">
          BugRush Architecture & Sandboxing Design
        </h1>
        <p className="text-xs text-[#8A7560] mt-1">
          Detailed technical blueprint of real-time multi-tier multiplayer code execution.
        </p>
      </div>

      {/* Architecture Flow Diagram */}
      <div className="p-6 rounded-3xl bg-white border border-[#E8DDD2] shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-[#3B1E10] flex items-center gap-2">
          <Server className="w-4 h-4 text-[#C06520]" />
          Component Architecture Diagram
        </h2>

        <div className="p-4 rounded-2xl bg-[#3B1E10] border border-[#3B1E10] font-mono text-xs text-[#FBF4EC] leading-relaxed overflow-x-auto shadow-inner">
          <pre>{`
  +-----------------------------------------------------------------------+
  |              React + Monaco Editor (Vite + TailwindCSS)              |
  +-----------------------------------+-----------------------------------+
                                      |
              +-----------------------+-----------------------+
              | REST (Auth, Profile,  | WebSocket (Authoritative
              | Leaderboard, Catalog) | Real-Time Live Duel)
              v                       v
  +-----------------------------------------------------------------------+
  |                   Node.js + Express + Socket.IO                       |
  +-------------------+-------------------+-------------------------------+
                      |                   |
      +---------------+                   +---------------+
      v                                   v               v
+------------+                      +------------+  +---------------------+
|  MongoDB   |                      |   Redis    |  |  Judge0 CE Sandbox  |
| Permanent  |                      | Ephemeral  |  | 2s CPU limit        |
| Users,     |                      | queue:1v1  |  | 128MB RAM limit     |
| Challenges,|                      | room:{id}  |  | Network disabled    |
| Matches    |                      | user:room  |  | Server-side harness |
+------------+                      +------------+  +---------------------+
          `}</pre>
        </div>
      </div>

      {/* Sandbox Defenses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-white border border-[#E8DDD2] shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-[#C06520] font-bold text-sm">
            <Cpu className="w-5 h-5" />
            1. CPU & Memory Resource Boundaries
          </div>
          <p className="text-xs text-[#8A7560] leading-relaxed">
            Every submission is restricted to <strong className="text-[#3B1E10]">2.0 seconds CPU time</strong> and <strong className="text-[#3B1E10]">128 MB RAM</strong>. Infinite loops, recursive stack overflows, and memory bombs are terminated with <code className="px-1.5 py-0.5 rounded bg-[#FBF4EC] text-[#C06520] font-mono border border-[#E8DDD2]">TIME_LIMIT_EXCEEDED</code> without degrading server stability.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-[#E8DDD2] shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-[#C06520] font-bold text-sm">
            <Lock className="w-5 h-5" />
            2. Hidden Test Injection & Sanitization
          </div>
          <p className="text-xs text-[#8A7560] leading-relaxed">
            Clients only receive visible test cases. Hidden test inputs, expected outputs, and raw traces are <strong className="text-[#3B1E10]">injected strictly server-side</strong>. The server strips all hidden test details before returning <code className="px-1.5 py-0.5 rounded bg-[#FBF4EC] text-[#C06520] font-mono border border-[#E8DDD2]">run:result</code>.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-[#E8DDD2] shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-[#C06520] font-bold text-sm">
            <Zap className="w-5 h-5" />
            3. Rate Limiting & Input Validation
          </div>
          <p className="text-xs text-[#8A7560] leading-relaxed">
            Players can submit at most <strong className="text-[#3B1E10]">1 run per 3 seconds</strong>. Submissions exceeding <strong className="text-[#3B1E10]">10 KB</strong> are rejected immediately by middleware to prevent payload flooding.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-[#E8DDD2] shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-[#C06520] font-bold text-sm">
            <Shield className="w-5 h-5" />
            4. Argon2id Password Encryption
          </div>
          <p className="text-xs text-[#8A7560] leading-relaxed">
            User credentials are encrypted using <strong className="text-[#3B1E10]">Argon2id</strong> (winner of the Password Hashing Competition), configured with high memory cost and multi-pass validation for bulletproof resistance against GPU/ASIC attacks.
          </p>
        </div>
      </div>
    </div>
  );
}
