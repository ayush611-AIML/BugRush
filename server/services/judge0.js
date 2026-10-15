const axios = require('axios');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const JUDGE0_URL = process.env.JUDGE0_URL || 'http://localhost:2358';
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY || '';
const JUDGE0_API_HOST = process.env.JUDGE0_API_HOST || 'judge0-ce.p.rapidapi.com';

/**
 * Builds the Node.js test harness injecting user code, visible tests, and hidden tests.
 */
function buildHarness(userCode, functionName, visibleTests = [], hiddenTests = []) {
  const serializedVisible = JSON.stringify(visibleTests);
  const serializedHidden = JSON.stringify(hiddenTests);

  return `
// ==========================================
// BugRush Authoritative Node.js Test Harness
// ==========================================

const util = require('util');

// Intercept stdout logs to keep test output isolated
const capturedLogs = [];
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

console.log = (...args) => {
  capturedLogs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
};
console.error = (...args) => {
  capturedLogs.push('[ERR] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
};
console.warn = (...args) => {
  capturedLogs.push('[WARN] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
};

// Deep equality helper
function deepEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return a === b;
  if (Array.isArray(a) !== Array.isArray(b)) return false;


  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  return true;
}

// User submission code
${userCode}

// Test suites
const visibleTests = ${serializedVisible};
const hiddenTests = ${serializedHidden};
const results = {
  visibleResults: [],
  hiddenResults: [],
  logs: capturedLogs,
  runtimeError: null
};

async function executeTest(testCase, isHidden = false) {
  const start = process.hrtime.bigint();
  let received = undefined;
  let passed = false;
  let errorMsg = null;

  try {
    const fn = (typeof ${functionName} === 'function') ? ${functionName} : (typeof global['${functionName}'] === 'function' ? global['${functionName}'] : null);
    if (!fn) {
      throw new ReferenceError("Function '${functionName}' is not defined. Ensure you defined '${functionName}'.");
    }

    // Clone input to prevent accidental mutation between tests
    let inputArgs;
    if (Array.isArray(testCase.input)) {
      inputArgs = JSON.parse(JSON.stringify(testCase.input));
    } else {
      inputArgs = [JSON.parse(JSON.stringify(testCase.input))];
    }

    // Convert special serialized functional arguments if any
    inputArgs = inputArgs.map(arg => {
      if (arg === 'function:parity') return (n) => (n % 2 === 0 ? 'even' : 'odd');
      if (arg === 'function:len') return (s) => String(s.length);
      return arg;
    });

    let output;
    if ('${functionName}' === 'createLRUCache' && Array.isArray(inputArgs[1])) {
      const cache = fn(inputArgs[0]);
      const getResults = [];
      for (const op of inputArgs[1]) {
        if (op[0] === 'put') cache.put(op[1], op[2]);
        else if (op[0] === 'get') getResults.push(cache.get(op[1]));
      }
      output = getResults;
    } else {
      output = await fn(...inputArgs);
    }

    received = output;
    passed = deepEqual(output, testCase.expected);

  } catch (err) {
    passed = false;
    errorMsg = err.message || String(err);
  }

  const end = process.hrtime.bigint();
  const executionTimeMs = Number((end - start) / 1000000n);

  return {
    id: testCase.id,
    name: testCase.name,
    passed,
    input: testCase.input,
    expected: testCase.expected,
    received,
    executionTimeMs,
    error: errorMsg,
    isHidden
  };
}

async function runAll() {
  try {
    for (const test of visibleTests) {
      const res = await executeTest(test, false);
      results.visibleResults.push(res);
    }

    for (const test of hiddenTests) {
      const res = await executeTest(test, true);
      results.hiddenResults.push(res);
    }
  } catch (globalErr) {
    results.runtimeError = globalErr.message || String(globalErr);
  }

  // Restore console to emit results delimiter
  console.log = originalLog;
  console.error = originalError;

  const outputPayload = JSON.stringify(results);
  process.stdout.write('\\n__BUGRUSH_RESULTS_START__\\n' + outputPayload + '\\n__BUGRUSH_RESULTS_END__\\n');
}

runAll().then(() => process.exit(0)).catch((err) => {
  originalError(err);
  process.exit(1);
});
`;
}

/**
 * Fallback execution in isolated Node.js subprocess with 2s timeout & 128MB memory limit
 */
function runInNodeSubprocess(harnessCode) {
  return new Promise((resolve) => {
    const tempFile = path.join(os.tmpdir(), `bugrush_${Date.now()}_${Math.random().toString(36).slice(2)}.js`);
    fs.writeFileSync(tempFile, harnessCode, 'utf8');

    const proc = spawn(
      process.execPath,
      ['--max-old-space-size=128', tempFile],
      {
        timeout: 2200 // 2.2s guard
      }
    );

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', (code, signal) => {
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {
        // ignore cleanup error
      }

      if (signal === 'SIGTERM' || signal === 'SIGKILL' || code === null) {
        return resolve({
          status: { id: 5, description: 'Time Limit Exceeded' },
          stdout: '',
          stderr: 'Execution timed out (> 2000ms CPU limit)',
          time: '2.000',
          memory: 128000
        });
      }

      resolve({
        status: { id: code === 0 ? 3 : 11, description: code === 0 ? 'Accepted' : 'Runtime Error' },
        stdout,
        stderr,
        time: '0.040',
        memory: 32000
      });
    });

    proc.on('error', (err) => {
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {}
      resolve({
        status: { id: 11, description: 'Runtime Error' },
        stdout: '',
        stderr: err.message,
        time: '0.000',
        memory: 0
      });
    });
  });
}

/**
 * Builds the Python test harness injecting user code, visible tests, and hidden tests.
 * Used when challenge.language === 'python'.
 */
function buildPythonHarness(userCode, functionName, visibleTests = [], hiddenTests = []) {
  const serializedVisible = JSON.stringify(JSON.stringify(visibleTests));
  const serializedHidden = JSON.stringify(JSON.stringify(hiddenTests));

  return `# ==========================================
# BugRush Authoritative Python Test Harness
# ==========================================

import sys
import json
import time
import copy
import traceback

captured_logs = []
class LogCapturer:
    def write(self, s):
        if s.strip():
            captured_logs.append(s.strip())
        return len(s)
    def flush(self):
        pass

def deep_equal(a, b):
    if a is b:
        return True
    if a is None or b is None:
        return a is b
    if type(a) != type(b):
        if (isinstance(a, (int, float)) and isinstance(b, (int, float))) and not (isinstance(a, bool) or isinstance(b, bool)):
            return a == b
        return False
    if isinstance(a, list):
        if len(a) != len(b):
            return False
        return all(deep_equal(x, y) for x, y in zip(a, b))
    if isinstance(a, dict):
        if len(a) != len(b):
            return False
        for k, v in a.items():
            if k not in b or not deep_equal(v, b[k]):
                return False
        return True
    return a == b

# User submission code
${userCode}

visible_tests = json.loads(${serializedVisible})
hidden_tests = json.loads(${serializedHidden})

results = {
    'visibleResults': [],
    'hiddenResults': [],
    'logs': captured_logs,
    'runtimeError': None
}

def execute_test(test_case, is_hidden=False):
    start = time.perf_counter()
    received = None
    passed = False
    error_msg = None

    try:
        fn = globals().get('${functionName}')
        if not callable(fn):
            raise NameError("Function '${functionName}' is not defined. Ensure you defined '${functionName}'.")

        raw_input = test_case.get('input', [])
        if isinstance(raw_input, list):
            input_args = [copy.deepcopy(x) for x in raw_input]
        else:
            input_args = [copy.deepcopy(raw_input)]

        output = fn(*input_args)
        received = output
        passed = deep_equal(output, test_case.get('expected'))
    except Exception as err:
        passed = False
        error_msg = str(err)

    execution_time_ms = round((time.perf_counter() - start) * 1000, 2)

    return {
        'id': test_case.get('id'),
        'name': test_case.get('name'),
        'passed': passed,
        'input': test_case.get('input'),
        'expected': test_case.get('expected'),
        'received': received,
        'executionTimeMs': execution_time_ms,
        'error': error_msg,
        'isHidden': is_hidden
    }

def run_all():
    orig_stdout = sys.stdout
    sys.stdout = LogCapturer()

    try:
        for t in visible_tests:
            results['visibleResults'].append(execute_test(t, False))
        for t in hidden_tests:
            results['hiddenResults'].append(execute_test(t, True))
    except Exception as g_err:
        results['runtimeError'] = str(g_err)
    finally:
        sys.stdout = orig_stdout

    payload = json.dumps(results, default=str)
    sys.stdout.write('\\n__BUGRUSH_RESULTS_START__\\n' + payload + '\\n__BUGRUSH_RESULTS_END__\\n')

if __name__ == '__main__':
    run_all()
`;
}

/**
 * Fallback execution in isolated Python subprocess with 2s timeout
 */
function runInPythonSubprocess(harnessCode) {
  return new Promise((resolve) => {
    const tempFile = path.join(os.tmpdir(), `bugrush_${Date.now()}_${Math.random().toString(36).slice(2)}.py`);
    fs.writeFileSync(tempFile, harnessCode, 'utf8');

    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const proc = spawn(
      pythonCmd,
      [tempFile],
      {
        timeout: 2200 // 2.2s guard
      }
    );

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', (code, signal) => {
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {}

      if (signal === 'SIGTERM' || signal === 'SIGKILL' || code === null) {
        return resolve({
          status: { id: 5, description: 'Time Limit Exceeded' },
          stdout: '',
          stderr: 'Execution timed out (> 2000ms CPU limit)',
          time: '2.000',
          memory: 128000
        });
      }

      resolve({
        status: { id: code === 0 ? 3 : 11, description: code === 0 ? 'Accepted' : 'Runtime Error' },
        stdout,
        stderr,
        time: '0.040',
        memory: 32000
      });
    });

    proc.on('error', (err) => {
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {}
      resolve({
        status: { id: 11, description: 'Runtime Error' },
        stdout: '',
        stderr: err.message,
        time: '0.000',
        memory: 0
      });
    });
  });
}

/**
 * Runs code against Judge0 CE (language_id: 63 for JavaScript, 71 for Python; CPU limit: 2s, memory limit: 128MB)
 * Falls back to subprocess runner if Judge0 server is unavailable.
 */
async function executeOnJudge0(harnessCode, languageId = 63) {
  const headers = {
    'Content-Type': 'application/json'
  };

  if (JUDGE0_API_KEY) {
    headers['X-RapidAPI-Key'] = JUDGE0_API_KEY;
    headers['X-RapidAPI-Host'] = JUDGE0_API_HOST;
  }

  const payload = {
    source_code: harnessCode,
    language_id: languageId, // 63: JavaScript, 71: Python
    cpu_time_limit: 2.0, // 2 seconds
    memory_limit: 128000, // 128 MB in KB
    redirect_stderr_to_stdout: false
  };

  try {
    // Attempt Judge0 CE API submission with wait=true for synchronous result
    const url = `${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`;
    const response = await axios.post(url, payload, {
      headers,
      timeout: 4500
    });

    if (response.data && response.data.status) {
      return response.data;
    }
  } catch (err) {
    // Judge0 CE unavailable; seamlessly use isolated subprocess runner
  }

  // Fallback subprocess runner
  if (languageId === 71) {
    return await runInPythonSubprocess(harnessCode);
  }
  return await runInNodeSubprocess(harnessCode);
}

/**
 * Main Service Function:
 * Injects visibleTests and hiddenTests into test harness (Node.js or Python),
 * executes via Judge0 CE (language_id: 63 for JS, 71 for Python, or fallback runner),
 * and strictly STRIPS hidden test outputs before returning to client.
 */
async function runChallengeTests({ userCode, functionName, visibleTests = [], hiddenTests = [], challenge, language }) {
  const isPython = (challenge && challenge.language === 'python') || language === 'python';
  const languageId = isPython ? 71 : 63;
  const harness = isPython
    ? buildPythonHarness(userCode, functionName, visibleTests, hiddenTests)
    : buildHarness(userCode, functionName, visibleTests, hiddenTests);
  const rawResult = await executeOnJudge0(harness, languageId);

  const stdout = rawResult.stdout || '';
  const stderr = rawResult.stderr || rawResult.compile_output || '';
  const status = rawResult.status || { id: 3, description: 'Accepted' };

  let parsed = null;
  const startIdx = stdout.indexOf('__BUGRUSH_RESULTS_START__');
  const endIdx = stdout.indexOf('__BUGRUSH_RESULTS_END__');

  if (startIdx !== -1 && endIdx !== -1) {
    const jsonStr = stdout.substring(startIdx + '__BUGRUSH_RESULTS_START__'.length, endIdx).trim();
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      // JSON parse error
    }
  }

  // Handle compilation or runtime error before tests finished
  if (!parsed) {
    const isTimeout = status.id === 5 || stderr.includes('timed out');
    return {
      status: isTimeout ? 'TIME_LIMIT_EXCEEDED' : 'RUNTIME_ERROR',
      message: isTimeout ? 'Execution timed out (CPU limit 2s exceeded)' : (stderr || 'Runtime error during execution'),
      visibleResults: visibleTests.map((t) => ({
        id: t.id,
        name: t.name,
        passed: false,
        input: t.input,
        expected: t.expected,
        received: null,
        error: stderr || 'Execution halted',
        isHidden: false
      })),
      hiddenResults: hiddenTests.map((t, idx) => ({
        id: t.id,
        name: `Hidden Test #${idx + 1}`,
        passed: false,
        isHidden: true
      })),
      passedTests: 0,
      totalTests: visibleTests.length + hiddenTests.length,
      allPassed: false,
      logs: []
    };
  }

  // Process visible tests (keep input, expected, received for user debugging)
  const visibleResults = (parsed.visibleResults || []).map((t) => ({
    id: t.id,
    name: t.name,
    passed: Boolean(t.passed),
    input: t.input,
    expected: t.expected,
    received: t.received,
    executionTimeMs: t.executionTimeMs || 0,
    error: t.error || null,
    isHidden: false
  }));

  // Process hidden tests: STRIP INPUT, EXPECTED, RECEIVED & ERROR DETAILS!
  const hiddenResults = (parsed.hiddenResults || []).map((t, idx) => ({
    id: t.id,
    name: `Hidden Test #${idx + 1}`,
    passed: Boolean(t.passed),
    executionTimeMs: t.executionTimeMs || 0,
    isHidden: true
    // Explicitly omitted: input, expected, received, error
  }));

  const visiblePassed = visibleResults.filter((r) => r.passed).length;
  const hiddenPassed = hiddenResults.filter((r) => r.passed).length;
  const passedTests = visiblePassed + hiddenPassed;
  const totalTests = visibleResults.length + hiddenResults.length;
  const allPassed = passedTests === totalTests && totalTests > 0;

  let verdict = 'WRONG_ANSWER';
  if (allPassed) {
    verdict = 'ACCEPTED';
  } else if (parsed.runtimeError) {
    verdict = 'RUNTIME_ERROR';
  }

  return {
    status: verdict,
    message: allPassed
      ? 'All visible and hidden test cases passed!'
      : `${passedTests}/${totalTests} tests passed (${visiblePassed}/${visibleResults.length} visible, ${hiddenPassed}/${hiddenResults.length} hidden).`,
    visibleResults,
    hiddenResults,
    passedTests,
    totalTests,
    allPassed,
    logs: parsed.logs || []
  };
}

module.exports = {
  buildHarness,
  buildPythonHarness,
  executeOnJudge0,
  runChallengeTests,
  runInPythonSubprocess,
  runInNodeSubprocess
};
