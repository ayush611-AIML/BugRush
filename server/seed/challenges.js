const challenges = [
  {
    title: 'Fix Buggy Deep Clone',
    slug: 'fix-buggy-deep-clone',
    difficulty: 'Medium',
    functionName: 'deepClone',
    description: `### Bug Report: Deep Clone Mutation
The junior developer attempted to implement \`deepClone(obj)\`, but users are reporting that modifying properties on cloned objects still mutates the original object!

#### Symptoms:
- Nested properties remain linked to the original object.
- Arrays inside objects are not properly cloned as arrays.
- \`null\` values cause runtime errors.

#### Objective:
Fix the \`deepClone(obj)\` function so that it returns a completely independent deep clone of primitives, objects, arrays, and \`null\` values without altering prototype properties.`,
    buggyCode: `function deepClone(obj) {
  // BUG: Shallow clone via spread operator
  // Fails on nested objects and mutates originals!
  if (typeof obj !== 'object') {
    return obj;
  }
  
  // BUG: null is typeof 'object', causing crash on Object.assign
  const copy = Object.assign({}, obj);
  return copy;
}`,
    visibleTests: [
      {
        id: 'v1',
        name: 'Clones primitive values directly',
        input: [42],
        expected: 42,
        description: 'Primitives (numbers, strings, booleans) should be returned as-is.'
      },
      {
        id: 'v2',
        name: 'Clones flat object without reference',
        input: [{ name: 'Neo', rating: 1337 }],
        expected: { name: 'Neo', rating: 1337 },
        description: 'Should return equivalent flat object.'
      },
      {
        id: 'v3',
        name: 'Clones nested objects independently',
        input: [{ user: { profile: { theme: 'dark' } }, active: true }],
        expected: { user: { profile: { theme: 'dark' } }, active: true },
        description: 'Nested objects must be cloned recursively.'
      }
    ],
    hiddenTests: [
      {
        id: 'h1',
        name: 'Handles arrays and nested arrays',
        input: [[1, [2, 3], { id: 4 }]],
        expected: [1, [2, 3], { id: 4 }],
        description: 'Arrays must remain Array instances with cloned nested items.'
      },
      {
        id: 'h2',
        name: 'Properly handles null and mixed falsy values',
        input: [{ a: null, b: false, c: 0, d: '' }],
        expected: { a: null, b: false, c: 0, d: '' },
        description: 'Null and falsy properties must not break typeof checks.'
      }
    ],
    hints: [
      'Remember that typeof null === "object", so check if obj === null first.',
      'Check if Array.isArray(obj) to initialize an array [] instead of an object {}.',
      'Recursively call deepClone on each property.'
    ],
    tags: ['Objects', 'Recursion', 'Memory']
  },
  {
    title: 'Fix Buggy Binary Search',
    slug: 'fix-buggy-binary-search',
    difficulty: 'Easy',
    functionName: 'binarySearch',
    description: `### Bug Report: Binary Search Boundary Bug
Our search service is failing QA tests. When searching for elements located at the boundaries of a sorted array, \`binarySearch\` returns \`-1\` instead of the actual index!

#### Symptoms:
- Fails when the target is the very last element in the array.
- Fails on single-element arrays where target exists.

#### Objective:
Fix \`binarySearch(arr, target)\` to return the 0-based index of \`target\` if present in the sorted array \`arr\`, or \`-1\` if not found.`,
    buggyCode: `function binarySearch(arr, target) {
  let low = 0;
  // BUG: high is arr.length, but loop condition low < high misses boundary
  let high = arr.length - 1;

  while (low < high) { // BUG: skips when low === high!
    const mid = Math.floor((low + high) / 2);
    if (arr[mid] === target) {
      return mid;
    } else if (arr[mid] < target) {
      low = mid; // BUG: off-by-one, can loop infinitely
    } else {
      high = mid; // BUG: off-by-one
    }
  }

  return -1;
}`,
    visibleTests: [
      {
        id: 'v1',
        name: 'Finds target in middle of array',
        input: [[1, 3, 5, 7, 9, 11], 5],
        expected: 2,
        description: 'Should find element at index 2.'
      },
      {
        id: 'v2',
        name: 'Returns -1 when target is absent',
        input: [[2, 4, 6, 8, 10], 5],
        expected: -1,
        description: 'Should return -1 when not found.'
      }
    ],
    hiddenTests: [
      {
        id: 'h1',
        name: 'Finds target at the upper boundary (last element)',
        input: [[10, 20, 30, 40, 50], 50],
        expected: 4,
        description: 'Last element must be reachable.'
      },
      {
        id: 'h2',
        name: 'Finds target in single element array',
        input: [[99], 99],
        expected: 0,
        description: 'Array with length 1 where target exists.'
      },
      {
        id: 'h3',
        name: 'Handles empty array gracefully',
        input: [[], 7],
        expected: -1,
        description: 'Empty array should return -1 without error.'
      }
    ],
    hints: [
      'The while loop condition should be low <= high.',
      'When arr[mid] < target, advance low = mid + 1.',
      'When arr[mid] > target, retreat high = mid - 1.'
    ],
    tags: ['Algorithms', 'Binary Search', 'Arrays']
  },
  {
    title: 'Fix Buggy Flatten Array with Depth',
    slug: 'fix-buggy-flatten-array',
    difficulty: 'Medium',
    functionName: 'flattenArray',
    description: `### Bug Report: Infinite Recursion in Array Flattening
The \`flattenArray(arr, depth)\` utility crashes with \`Maximum call stack size exceeded\` when \`depth\` is 0 or negative, and fails to flatten up to the specified \`depth\` limit!

#### Symptoms:
- Calling \`flattenArray(arr, 0)\` causes infinite recursion.
- Does not preserve non-array elements correctly.

#### Objective:
Fix \`flattenArray(arr, depth = 1)\` to recursively flatten array elements up to the specified positive integer \`depth\`. If depth <= 0, return a shallow clone of the array.`,
    buggyCode: `function flattenArray(arr, depth = 1) {
  // BUG: Does not check if depth <= 0 before recursing!
  const result = [];
  
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    if (Array.isArray(item)) {
      // BUG: Passes same depth without decrementing!
      result.push(...flattenArray(item, depth));
    } else {
      result.push(item);
    }
  }

  return result;
}`,
    visibleTests: [
      {
        id: 'v1',
        name: 'Flattens 1 level deep by default',
        input: [[1, [2, [3, [4]]]]],
        expected: [1, 2, [3, [4]]],
        description: 'Default depth 1 should only flatten outermost nested arrays.'
      },
      {
        id: 'v2',
        name: 'Flattens 2 levels deep',
        input: [[1, [2, [3, [4]]]], 2],
        expected: [1, 2, 3, [4]],
        description: 'Depth 2 flattens two levels.'
      }
    ],
    hiddenTests: [
      {
        id: 'h1',
        name: 'Depth 0 returns array unflattened',
        input: [[[1, 2], [3, 4]], 0],
        expected: [[1, 2], [3, 4]],
        description: 'Zero depth should not flatten inner arrays.'
      },
      {
        id: 'h2',
        name: 'Handles already flat arrays and mixed types',
        input: [['a', 'b', ['c', ['d']]], 3],
        expected: ['a', 'b', 'c', 'd'],
        description: 'Complete flattening with depth 3.'
      }
    ],
    hints: [
      'Add a base condition: if (depth <= 0) return arr.slice();',
      'When recursing on an inner array, pass depth - 1.'
    ],
    tags: ['Recursion', 'Arrays', 'Functional']
  },
  {
    title: 'Fix Buggy Group By Utility',
    slug: 'fix-buggy-group-by',
    difficulty: 'Easy',
    functionName: 'groupBy',
    description: `### Bug Report: GroupBy Overwriting Records
Our analytics dashboard is losing data. The \`groupBy(items, keySelector)\` helper only preserves the LAST element in each group instead of collecting all matching elements into an array!

#### Objective:
Fix \`groupBy(items, keySelector)\` so that it returns an object where keys are the return values of \`keySelector(item)\` (or property name), and values are arrays of all matching items.`,
    buggyCode: `function groupBy(items, keySelector) {
  const result = {};

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const key = typeof keySelector === 'function' ? keySelector(item) : item[keySelector];
    
    // BUG: Assigns item directly instead of pushing to an array!
    result[key] = item;
  }

  return result;
}`,
    visibleTests: [
      {
        id: 'v1',
        name: 'Groups numbers by parity (even/odd)',
        input: [
          [1, 2, 3, 4, 5, 6],
          'function:parity' // Special tag handled in test runner or inline
        ],
        expected: {
          odd: [1, 3, 5],
          even: [2, 4, 6]
        },
        description: 'Groups odd and even integers into separate arrays.'
      },
      {
        id: 'v2',
        name: 'Groups objects by property name',
        input: [
          [{ role: 'admin', name: 'Alice' }, { role: 'user', name: 'Bob' }, { role: 'admin', name: 'Charlie' }],
          'role'
        ],
        expected: {
          admin: [{ role: 'admin', name: 'Alice' }, { role: 'admin', name: 'Charlie' }],
          user: [{ role: 'user', name: 'Bob' }]
        },
        description: 'Groups user records by role.'
      }
    ],
    hiddenTests: [
      {
        id: 'h1',
        name: 'Empty array returns empty object',
        input: [[], 'category'],
        expected: {},
        description: 'Should return {} without errors.'
      },
      {
        id: 'h2',
        name: 'Groups words by length',
        input: [['one', 'two', 'three', 'four', 'six'], 'function:len'],
        expected: {
          '3': ['one', 'two', 'six'],
          '4': ['four'],
          '5': ['three']
        },
        description: 'Should group strings by length.'
      }
    ],
    hints: [
      'Initialize result[key] = [] if it does not exist yet: result[key] = result[key] || [];',
      'Push the current item into result[key].push(item).'
    ],
    tags: ['Data Structures', 'Objects', 'Collections']
  },
  {
    title: 'Fix Buggy LRU Cache Eviction',
    slug: 'fix-buggy-lru-cache',
    difficulty: 'Hard',
    functionName: 'createLRUCache',
    description: `### Bug Report: LRU Cache Evicts Fresh Keys
Our in-memory caching engine is evicting frequently accessed keys while stale keys persist in memory!

#### Symptoms:
- Reading a key with \`get(key)\` does not refresh its recency.
- The cache exceeds its maximum \`capacity\` or evicts the wrong key.

#### Objective:
Fix \`createLRUCache(capacity)\` to return an object with:
- \`get(key)\`: returns value if key exists and marks it as most recently used; returns \`-1\` if not found.
- \`put(key, value)\`: updates value if exists or inserts new key. If capacity is exceeded, evict the LEAST recently used key.`,
    buggyCode: `function createLRUCache(capacity) {
  const map = new Map();

  return {
    get(key) {
      if (!map.has(key)) return -1;
      // BUG: Does not refresh key recency in Map!
      return map.get(key);
    },
    put(key, value) {
      if (map.has(key)) {
        map.set(key, value);
        return;
      }
      
      // BUG: Checks >= capacity before deleting, but deletes newest entry!
      if (map.size >= capacity) {
        // BUG: map.keys().next().value is oldest, but buggy code deletes last key!
        const keys = Array.from(map.keys());
        map.delete(keys[keys.length - 1]); // Wrong! Deletes most recent!
      }
      
      map.set(key, value);
    }
  };
}`,
    visibleTests: [
      {
        id: 'v1',
        name: 'Basic Put and Get',
        input: [
          2, // capacity
          [
            ['put', 1, 10],
            ['put', 2, 20],
            ['get', 1]
          ]
        ],
        expected: [10],
        description: 'Should retrieve stored values correctly.'
      },
      {
        id: 'v2',
        name: 'Evicts LRU key when capacity exceeded',
        input: [
          2,
          [
            ['put', 1, 10],
            ['put', 2, 20],
            ['get', 1], // key 1 is now most recent, key 2 is LRU
            ['put', 3, 30], // should evict key 2!
            ['get', 2], // should be -1
            ['get', 1], // should be 10
            ['get', 3]  // should be 30
          ]
        ],
        expected: [-1, 10, 30],
        description: 'Key 2 should be evicted because key 1 was refreshed by get().'
      }
    ],
    hiddenTests: [
      {
        id: 'h1',
        name: 'Updating existing key updates recency',
        input: [
          2,
          [
            ['put', 1, 1],
            ['put', 2, 2],
            ['put', 1, 100], // updates 1 and marks it most recent
            ['put', 3, 3],   // should evict 2!
            ['get', 2],      // -1
            ['get', 1],      // 100
            ['get', 3]       // 3
          ]
        ],
        expected: [-1, 100, 3],
        description: 'Updating a key must refresh its order in the LRU queue.'
      }
    ],
    hints: [
      'In JavaScript Map, insertion order is preserved.',
      'To refresh a key: delete it and re-insert it (map.delete(key); map.set(key, val);).',
      'The least recently used key is map.keys().next().value.'
    ],
    tags: ['Data Structures', 'LRU Cache', 'System Design']
  }
];

module.exports = challenges;
