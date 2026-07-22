const fs = require('fs')
const path = require('path')
const { parse } = require('csv-parse/sync')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function fixPhone(raw) {
  if (!raw) return null
  let str = raw.toString().trim()
  if (!str) return null
  str = str.split('.')[0].replace(/[^0-9]/g, '')
  if (!str) return null
  return str.startsWith('0') ? str : '0' + str
}

function normalizeRow(row) {
  const clean = {}
  for (const key in row) {
    clean[key.trim().replace(/\s+/g, ' ')] = row[key]
  }
  return clean
}

async function run() {
  const csvContent = fs.readFileSync(
    path.join(__dirname, 'import-data/PETNA_2_0_-_Patients.csv'),
    'utf-8'
  )
  const rawRows = parse(csvContent, { columns: true, skip_empty_lines: true })
  const rows = rawRows.map(normalizeRow)

  let clientCount = 0
  let patientCount = 0
  let skippedNoOwner = 0

  for (const row of rows) {
    const ownerName = row['Owner Name']?.trim()
    if (!ownerName) {
      skippedNoOwner++
      continue
    }

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert({ name: ownerName })
      .select()
      .single()

    if (clientError) {
      console.error('Failed client:', ownerName, clientError.message)
      continue
    }
    clientCount++

    const phone = fixPhone(row['Phone'])
    if (phone) {
      const { error: phoneError } = await supabase
        .from('client_phones')
        .insert({ client_id: client.id, phone_number: phone, type: 'call' })
      if (phoneError) console.error('Failed phone for', ownerName, phoneError.message)
    }

    const petName = row['Pet Name']?.trim()
    if (petName) {
      const { error: patientError } = await supabase
        .from('patients')
        .insert({
          client_id: client.id,
          name: petName,
          species: row['Species']?.trim() || null,
        })
      if (!patientError) patientCount++
      else console.error('Failed patient for', ownerName, patientError.message)
    }
  }

  console.log(`Done. Clients: ${clientCount}, Patients: ${patientCount}, Skipped (no owner name): ${skippedNoOwner}`)
}

run()