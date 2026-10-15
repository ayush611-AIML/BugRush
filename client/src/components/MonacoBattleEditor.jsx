import React, { useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Play, RotateCcw, Loader2, Code2 } from 'lucide-react';

export function MonacoBattleEditor({
  code,
  onChange,
  onRun,
  onReset,
  isRunning,
  originalCode
}) {
  const editorRef = useRef(null);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    // Define Warm Brown & Amber editorial theme for Monaco
    monaco.editor.defineTheme('bugrush-warm-amber', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: 'A08870', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'C06520', fontStyle: 'bold' },
        { token: 'identifier', foreground: '3B1E10' },
        { token: 'string', foreground: 'A8541A' },
        { token: 'number', foreground: '3B1E10', fontStyle: 'bold' }
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#3B1E10',
        'editorCursor.foreground': '#C06520',
        'editor.lineHighlightBackground': '#FBF4EC',
        'editorLineNumber.foreground': '#E8DDD2',
        'editorLineNumber.activeForeground': '#3B1E10',
        'editor.selectionBackground': '#F5E6D8'
      }
    });

    monaco.editor.setTheme('bugrush-warm-amber');

    // Add Ctrl+Enter / Cmd+Enter hotkey to run code
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      if (!isRunning && onRun) {
        onRun();
      }
    });
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-[#E8DDD2]/60 overflow-hidden shadow-xs">
      {/* Editor Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#FBF4EC] border-b border-[#E8DDD2]/60">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-[#C06520]" />
          <span className="text-xs font-mono font-bold text-[#3B1E10]">solution.js</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#C06520]/10 text-[#C06520] border border-[#C06520]/25 font-semibold">
            Node.js (CE 63)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-[11px] font-mono text-[#8A7560] mr-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white border border-[#E8DDD2]/60 text-[#3B1E10] text-[10px]">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-white border border-[#E8DDD2]/60 text-[#3B1E10] text-[10px]">Enter</kbd>
          </span>

          <button
            onClick={onReset}
            disabled={isRunning || code === originalCode}
            title="Reset code to original buggy code"
            className="p-1.5 rounded-lg bg-white hover:bg-[#F0E5D8] border border-[#E8DDD2]/60 text-[#3B1E10] disabled:opacity-40 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onRun}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-[#C06520] hover:bg-[#A8541A] text-white font-bold text-xs shadow-xs disabled:opacity-50 transition-colors"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Running Sandbox...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run Tests</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Monaco Editor Container */}
      <div className="flex-1 min-h-[350px]">
        <Editor
          height="100%"
          language="javascript"
          value={code}
          onChange={onChange}
          onMount={handleEditorDidMount}
          options={{
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
            minimap: { enabled: false },
            lineHeight: 22,
            scrollBeyondLastLine: false,
            padding: { top: 12, bottom: 12 },
            renderLineHighlight: 'all',
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            folding: true,
            wordWrap: 'on',
            automaticLayout: true,
            tabSize: 2,
            bracketPairColorization: { enabled: true }
          }}
        />
      </div>
    </div>
  );
}
