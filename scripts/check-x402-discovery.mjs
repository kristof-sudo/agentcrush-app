#!/usr/bin/env node
/**
 * Validates x402 discovery routes for Bazaar / Agentic.Market / x402scan compatibility.
 * Usage: node scripts/check-x402-discovery.mjs [base-url]
 * Default base URL: http://localhost:3000
 */

const BASE_URL = process.argv[2] || 'http://localhost:3000'

const REQUIRED_FIELDS = ['x402Version', 'service', 'resources']
const REQUIRED_SERVICE_FIELDS = ['name', 'url', 'seller', 'network']
const REQUIRED_RESOURCE_FIELDS = ['url', 'method', 'accepts']

let allPassed = true

function pass(msg) {
  console.log(`  ✓ ${msg}`)
}

function fail(msg) {
  console.log(`  ✗ ${msg}`)
  allPassed = false
}

function checkDiscovery(label, data) {
  console.log(`\n[${label}]`)

  for (const field of REQUIRED_FIELDS) {
    if (field in data) {
      pass(`has "${field}"`)
    } else {
      fail(`missing "${field}"`)
    }
  }

  if (data.x402Version !== 2) {
    fail(`x402Version should be 2, got: ${data.x402Version}`)
  } else {
    pass(`x402Version is 2`)
  }

  if (data.service) {
    for (const f of REQUIRED_SERVICE_FIELDS) {
      if (data.service[f]) {
        pass(`service.${f} = ${data.service[f]}`)
      } else {
        fail(`service.${f} missing`)
      }
    }
  }

  if (!Array.isArray(data.resources) || data.resources.length === 0) {
    fail('resources array is empty or missing')
  } else {
    pass(`resources: ${data.resources.length} endpoint(s)`)
    data.resources.forEach((r, i) => {
      for (const f of REQUIRED_RESOURCE_FIELDS) {
        if (!r[f]) fail(`resources[${i}].${f} missing`)
      }
      if (r.accepts?.length > 0) {
        const a = r.accepts[0]
        if (!a.payTo) fail(`resources[${i}].accepts[0].payTo missing`)
        if (!a.network) fail(`resources[${i}].accepts[0].network missing`)
        if (!a.price) fail(`resources[${i}].accepts[0].price missing`)
      }
    })
  }
}

async function fetchAndCheck(path, expectedContentType) {
  const url = `${BASE_URL}${path}`
  console.log(`\nChecking: ${url}`)
  try {
    const res = await fetch(url)
    if (!res.ok) {
      fail(`HTTP ${res.status} ${res.statusText}`)
      return null
    }
    pass(`HTTP ${res.status}`)

    const ct = res.headers.get('content-type') || ''
    if (ct.includes('application/json')) {
      pass(`Content-Type: ${ct}`)
    } else {
      fail(`Content-Type should be application/json, got: ${ct}`)
    }

    const data = await res.json()
    checkDiscovery(path, data)
    return data
  } catch (err) {
    fail(`Fetch failed: ${err.message}`)
    return null
  }
}

async function main() {
  console.log(`x402 discovery check — base: ${BASE_URL}`)

  const d1 = await fetchAndCheck('/.well-known/x402')
  const d2 = await fetchAndCheck('/.well-known/x402.json')

  if (d1 && d2) {
    const s1 = JSON.stringify(d1)
    const s2 = JSON.stringify(d2)
    if (s1 === s2) {
      pass('\nBoth routes return identical content ✓')
    } else {
      fail('\nRoutes return different content — they must match')
    }
  }

  console.log(`\n${allPassed ? '✓ All checks passed' : '✗ Some checks failed'}`)
  process.exit(allPassed ? 0 : 1)
}

main()
