const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Load env vars manually
function loadEnv() {
  try {
    const envPath = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim().replace(/^["']|["']$/g, '');
          process.env[key] = value;
        }
      });
      console.log('Loaded .env.local');
    } else {
      console.log('No .env.local found');
    }
  } catch (e) {
    console.error('Error loading .env.local:', e);
  }
}

loadEnv();

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('ERROR: MONGODB_URI is not set');
  process.exit(1);
}

// Data definitions
const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
  { value: 'DC', label: 'District of Columbia' }
];

const US_REGIONS = {
  'Northeast': ['CT', 'ME', 'MA', 'NH', 'RI', 'VT', 'NJ', 'NY', 'PA', 'DE', 'MD', 'DC'], // Moved DE, MD, DC to Northeast/Mid-Atlantic typically, or keep consistent with app logic
  // App logic in sectors.ts:
  // 'South': ['DE', 'FL', 'GA', 'MD', 'NC', 'SC', 'VA', 'WV', 'KY', 'TN', 'AL', 'MS', 'AR', 'LA', 'OK', 'TX'],
  // 'Northeast': ['CT', 'ME', 'MA', 'NH', 'RI', 'VT', 'NJ', 'NY', 'PA'],
  // 'Midwest': ['IL', 'IN', 'MI', 'OH', 'WI', 'IA', 'KS', 'MN', 'MO', 'NE', 'ND', 'SD'],
  // 'West': ['AZ', 'CO', 'ID', 'MT', 'NV', 'NM', 'UT', 'WY', 'AK', 'CA', 'HI', 'OR', 'WA'],
};

// Reconstructing the exact mapping from sectors.ts
const REGION_MAPPING = {};
const REGIONS_SOURCE = {
  'Northeast': ['CT', 'ME', 'MA', 'NH', 'RI', 'VT', 'NJ', 'NY', 'PA'],
  'Midwest': ['IL', 'IN', 'MI', 'OH', 'WI', 'IA', 'KS', 'MN', 'MO', 'NE', 'ND', 'SD'],
  'South': ['DE', 'FL', 'GA', 'MD', 'NC', 'SC', 'VA', 'WV', 'KY', 'TN', 'AL', 'MS', 'AR', 'LA', 'OK', 'TX', 'DC'], // Added DC to South as it's missing in source but needed
  'West': ['AZ', 'CO', 'ID', 'MT', 'NV', 'NM', 'UT', 'WY', 'AK', 'CA', 'HI', 'OR', 'WA'],
};

// Build reverse map
Object.entries(REGIONS_SOURCE).forEach(([region, states]) => {
  states.forEach(state => {
    REGION_MAPPING[state] = region;
  });
});

const STATE_RESOURCES = {
  // ---- WEST ----
  'CA': { 'Rare Earth': 2000, 'Oil': 200, 'Fertile Land': 4000, 'Lumber': 1500, 'Chemical Compounds': 1500 },
  'WA': { 'Lumber': 6000, 'Fertile Land': 1800 },
  'OR': { 'Lumber': 8000, 'Fertile Land': 1200 },
  'NV': { 'Copper': 1500, 'Rare Earth': 100 },
  'AZ': { 'Copper': 10000 },
  'UT': { 'Copper': 3000, 'Oil': 100 },
  'CO': { 'Oil': 700, 'Fertile Land': 800, 'Coal': 500 },
  'NM': { 'Oil': 1200, 'Copper': 2000, 'Chemical Compounds': 200 },
  'HI': { 'Fertile Land': 300 },
  'AK': { 'Oil': 600, 'Lumber': 400 },
  'ID': { 'Lumber': 2000, 'Rare Earth': 200, 'Fertile Land': 1500 },
  'MT': { 'Copper': 1000, 'Lumber': 1500, 'Oil': 80, 'Rare Earth': 150, 'Fertile Land': 1000, 'Coal': 1500 },
  'WY': { 'Oil': 500, 'Chemical Compounds': 2000, 'Rare Earth': 500, 'Fertile Land': 400, 'Coal': 8000 },
  // ---- SOUTHWEST ----
  'TX': { 'Oil': 5000, 'Chemical Compounds': 8000, 'Fertile Land': 3500, 'Rare Earth': 300, 'Iron Ore': 100, 'Coal': 600 },
  'OK': { 'Oil': 800, 'Fertile Land': 1000, 'Chemical Compounds': 300 },
  // ---- MIDWEST ----
  'IL': { 'Fertile Land': 7000, 'Chemical Compounds': 500, 'Iron Ore': 50, 'Coal': 2500 },
  'OH': { 'Iron Ore': 50, 'Fertile Land': 3000, 'Chemical Compounds': 800, 'Oil': 50 },
  'MI': { 'Iron Ore': 2000, 'Copper': 500, 'Lumber': 600, 'Fertile Land': 1200 },
  'IN': { 'Fertile Land': 4000, 'Iron Ore': 30, 'Chemical Compounds': 200, 'Coal': 1000 },
  'WI': { 'Iron Ore': 500, 'Lumber': 800, 'Fertile Land': 1500 },
  'MN': { 'Iron Ore': 5000, 'Fertile Land': 5000, 'Lumber': 400 },
  'MO': { 'Fertile Land': 2500, 'Chemical Compounds': 150 },
  'IA': { 'Fertile Land': 8000 },
  'KS': { 'Fertile Land': 6000, 'Oil': 150, 'Chemical Compounds': 100 },
  'NE': { 'Fertile Land': 5500 },
  'SD': { 'Fertile Land': 2000, 'Rare Earth': 50 },
  'ND': { 'Oil': 1500, 'Fertile Land': 2000, 'Coal': 800 },
  // ---- SOUTHEAST ----
  'FL': { 'Chemical Compounds': 3000, 'Fertile Land': 1000, 'Lumber': 500 },
  'GA': { 'Lumber': 4000, 'Fertile Land': 400 },
  'NC': { 'Lumber': 2500, 'Fertile Land': 500 },
  'VA': { 'Lumber': 700, 'Fertile Land': 400, 'Chemical Compounds': 100 },
  'TN': { 'Lumber': 600, 'Fertile Land': 500, 'Chemical Compounds': 200 },
  'SC': { 'Lumber': 800, 'Fertile Land': 300 },
  'AL': { 'Iron Ore': 300, 'Lumber': 3500, 'Chemical Compounds': 200 },
  'KY': { 'Fertile Land': 600, 'Lumber': 400, 'Chemical Compounds': 150, 'Coal': 2000 },
  'LA': { 'Oil': 400, 'Chemical Compounds': 6000, 'Lumber': 1000, 'Fertile Land': 500 },
  'MS': { 'Lumber': 3000, 'Fertile Land': 400, 'Oil': 30 },
  'AR': { 'Lumber': 1200, 'Fertile Land': 800 },
  'WV': { 'Lumber': 500, 'Chemical Compounds': 300, 'Coal': 4000 },
  // ---- NORTHEAST ----
  'NY': { 'Fertile Land': 600, 'Lumber': 300 },
  'PA': { 'Iron Ore': 200, 'Lumber': 400, 'Chemical Compounds': 600, 'Oil': 20, 'Coal': 3000 },
  'NJ': { 'Chemical Compounds': 1000 },
  'MA': {},
  'MD': { 'Fertile Land': 200 },
  'CT': {},
  'NH': { 'Lumber': 300 },
  'ME': { 'Lumber': 2500 },
  'RI': {},
  'VT': { 'Lumber': 200, 'Fertile Land': 100 },
  'DE': { 'Chemical Compounds': 200 },
  'DC': {}, // Default empty
};

async function seedStates() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();
    const collection = db.collection('state_metadata');

    // Prepare documents
    const documents = US_STATES.map(state => {
      const region = REGION_MAPPING[state.value] || 'Other'; // Fallback
      const resources = STATE_RESOURCES[state.value] || {};
      
      return {
        state_code: state.value,
        name: state.label,
        region: region,
        description: `${state.label} is located in the ${region} region.`,
        resource_modifiers: resources,
        image_url: `/images/states/${state.value.toLowerCase()}.jpg` // Placeholder
      };
    });

    // Clear existing
    await collection.deleteMany({});
    console.log('Cleared existing state metadata');

    // Insert new
    const result = await collection.insertMany(documents);
    console.log(`Inserted ${result.insertedCount} states`);

    // Verify
    const count = await collection.countDocuments();
    console.log(`Total states in DB: ${count}`);

  } catch (err) {
    console.error('Error seeding states:', err);
  } finally {
    await client.close();
  }
}

seedStates();
