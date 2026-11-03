// Minimal browser test runner: describe / it / expect.
(function () {
  'use strict';
  const suites = [];
  let current = null;

  window.describe = (name, fn) => { current = { name, tests: [] }; suites.push(current); fn(); current = null; };
  window.it = (name, fn) => current.tests.push({ name, fn });
  window.report = (text) => { window.__reports = (window.__reports || []).concat(text); };

  function fmt(v) { try { return JSON.stringify(v); } catch (e) { return String(v); } }
  window.expect = (actual) => ({
    toBe: (exp) => { if (actual !== exp) throw new Error('expected ' + fmt(exp) + ', got ' + fmt(actual)); },
    toEqual: (exp) => { if (fmt(actual) !== fmt(exp)) throw new Error('expected ' + fmt(exp) + ', got ' + fmt(actual)); },
    toBeTruthy: () => { if (!actual) throw new Error('expected truthy, got ' + fmt(actual)); },
    toBeFalsy: () => { if (actual) throw new Error('expected falsy, got ' + fmt(actual)); },
    toBeLessThan: (n) => { if (!(actual < n)) throw new Error('expected < ' + n + ', got ' + fmt(actual)); },
    toBeGreaterThan: (n) => { if (!(actual > n)) throw new Error('expected > ' + n + ', got ' + fmt(actual)); },
    toThrow: () => { let threw = false; try { actual(); } catch (e) { threw = true; } if (!threw) throw new Error('expected to throw'); },
  });

  window.runTests = () => {
    const out = document.getElementById('out');
    let pass = 0;
    let fail = 0;
    for (const s of suites) {
      const h = document.createElement('h2');
      h.textContent = s.name;
      out.appendChild(h);
      for (const t of s.tests) {
        const li = document.createElement('div');
        try { t.fn(); li.className = 'pass'; li.textContent = '✓ ' + t.name; pass++; } catch (e) {
          li.className = 'fail'; li.textContent = '✗ ' + t.name + ' — ' + e.message; fail++;
        }
        out.appendChild(li);
      }
    }
    for (const r of window.__reports || []) {
      const pre = document.createElement('pre');
      pre.textContent = r;
      out.appendChild(pre);
    }
    const sum = document.getElementById('summary');
    sum.textContent = pass + ' passed, ' + fail + ' failed';
    sum.className = fail ? 'fail' : 'pass';
    window.__results = { pass, fail };
  };
})();
