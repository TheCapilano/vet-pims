const fs = require('fs')
const path = require('path')
const { parse } = require('csv-parse/sync')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const MONTHLY_FILES = [
  'PETNA_-_January.csv',
  'PETNA_-_February.csv',
  'PETNA_-_March.csv',
  'PETNA_-_April.csv',
  'PETNA_-_May.csv',
  'PETNA_-_June.csv',
]

// --- Manual overrides decided during data review, see handoff doc ---

// Confirmed typo: Hala Ghasan's real number is 01119464020, the other is a one-digit typo. Ignore it entirely.
const EXCLUDED_PHONES = new Set(['01119864020'])

// Confirmed: this is a common name shared by different people, not one person with 3 numbers.
// Keep them as separate clients instead of merging under one name.
const SPLIT_INTO_SEPARATE_CLIENTS = new Set(['hassan mohammed'])

// Confirmed: a known one-off malformed number, keep it exactly as captured so front desk can
// ask her to correct it in person next visit, rather than guessing or dropping it.
const KEEP_MALFORMED_AS_IS = { 'ghufran': '011542209665' }

// Confirmed (via pet-name cross-check + builder's direct knowledge) these ARE already in the
// system from the original Patients 2.0 import, just under a slightly different phone/spelling
// that the automated phone-match couldn't catch. Skip creating a new client for these names.
const SKIP_NAME_ONLY_MATCHES = new Set([
  'ehab', 'mohammed alqasas', 'mai ragab', 'adel samy', 'eman', 'nadine',
])

// Confirmed junk / one-time clients not worth adding: one is a placeholder ("pharmacy" in
// Arabic, not a real client name), the other two were one-time visitors unlikely to return.
const EXCLUDE_ENTIRELY = new Set(['صيدلية', 'doha khaled', 'walaa faisal'])

function cleanDigits(val) {
  if (val === null || val === undefined) return ''
  let s = String(val).split('.')[0]
  return s.replace(/[^0-9]/g, '')
}

function classifyPhone(rawVal) {
  const digits = cleanDigits(rawVal)
  if (!digits) return []

  const normalized = digits.startsWith('0') ? digits : '0' + digits

  if (normalized.length >= 10 && normalized.length <= 11) {
    return [normalized]
  }

  // Likely two numbers concatenated together with no separator
  if (normalized.length >= 20 && normalized.length <= 23) {
    const first = normalized.slice(0, 11)
    const second = normalized.slice(11)
    const validFirst = first.length >= 10 && first.length <= 11
    const validSecond = second.length >= 10 && second.length <= 11
    if (validFirst && validSecond) {
      return [first, second]
    }
  }

  return []
}

function findColumn(headers, keyword) {
  return headers.find((h) => h.toLowerCase().includes(keyword.toLowerCase()))
}

async function run() {
  // Step 1: parse all 6 files, extract owner/pet/phone with flexible column matching
  const rawRows = []

  for (const filename of MONTHLY_FILES) {
    const filePath = path.join(__dirname, 'import-data', filename)
    if (!fs.existsSync(filePath)) {
      console.log(`Skipping ${filename} — not found in import-data/`)
      continue
    }

    const csvContent = fs.readFileSync(filePath, 'utf-8')
    const rows = parse(csvContent, { columns: true, skip_empty_lines: true })
    if (rows.length === 0) continue

    const headers = Object.keys(rows[0]).map((h) => h.trim())
    const ownerCol = findColumn(headers, 'owner')
    const petCol = findColumn(headers, 'pet')
    const phoneCol = findColumn(headers, 'phone')

    for (const row of rows) {
      const owner = (row[ownerCol] || '').toString().trim()
      const pet = (row[petCol] || '').toString().trim()
      const phoneRaw = row[phoneCol]

      if (!owner || owner === '-') continue
      if (EXCLUDE_ENTIRELY.has(owner.toLowerCase().trim())) continue
      if (EXCLUDE_ENTIRELY.has(owner.trim())) continue // handles non-Latin script names

      rawRows.push({ owner, pet, phoneRaw })
    }

    console.log(`Parsed ${filename}: ${rows.length} rows`)
  }

  // Step 2: group by normalized owner name, collecting all known phones + pets for that person
  const groups = new Map()

  for (const row of rawRows) {
    const normName = row.owner.toLowerCase().trim()

    const groupKey = SPLIT_INTO_SEPARATE_CLIENTS.has(normName)
      ? `${normName}|${classifyPhone(row.phoneRaw)[0] || 'unknown'}`
      : normName

    if (!groups.has(groupKey)) {
      groups.set(groupKey, { displayName: row.owner, normName, phones: new Set(), pets: new Set() })
    }
    const group = groups.get(groupKey)

    let phones = classifyPhone(row.phoneRaw)
    phones = phones.filter((p) => !EXCLUDED_PHONES.has(p))
    phones.forEach((p) => group.phones.add(p))

    if (row.pet) group.pets.add(row.pet)

    if (KEEP_MALFORMED_AS_IS[normName] && group.phones.size === 0) {
      group.phones.add(KEEP_MALFORMED_AS_IS[normName])
    }
  }

  console.log(`\nGrouped into ${groups.size} candidate clients`)

  // Step 3: cross-check against already-imported clients by phone number
  const { data: existingPhones } = await supabase
    .from('client_phones')
    .select('phone_number')

  const existingPhoneSet = new Set((existingPhones || []).map((p) => p.phone_number))

  let clientsCreated = 0
  let patientsCreated = 0
  let phonesAdded = 0
  let skippedExistingPhone = 0
  let skippedNameOverride = 0

  for (const [, group] of groups) {
    // Confirmed name-only match to an existing client — skip regardless of phone
    if (SKIP_NAME_ONLY_MATCHES.has(group.normName)) {
      skippedNameOverride++
      continue
    }

    const phoneList = Array.from(group.phones)
    const alreadyExists = phoneList.some((p) => existingPhoneSet.has(p))
    if (alreadyExists) {
      skippedExistingPhone++
      continue
    }

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert({ name: group.displayName })
      .select()
      .single()

    if (clientError) {
      console.error('Failed client:', group.displayName, clientError.message)
      continue
    }
    clientsCreated++

    for (const phone of phoneList) {
      await supabase.from('client_phones').insert({
        client_id: client.id,
        phone_number: phone,
        type: 'call',
      })
      existingPhoneSet.add(phone)
      phonesAdded++
    }

    for (const pet of group.pets) {
      const { error: patientError } = await supabase.from('patients').insert({
        client_id: client.id,
        name: pet,
      })
      if (!patientError) patientsCreated++
    }
  }

  console.log(`\nDone.`)
  console.log(`Clients created: ${clientsCreated}`)
  console.log(`Phones added: ${phonesAdded}`)
  console.log(`Patients created: ${patientsCreated}`)
  console.log(`Skipped (existing phone match): ${skippedExistingPhone}`)
  console.log(`Skipped (confirmed name-only match): ${skippedNameOverride}`)
}

run()
