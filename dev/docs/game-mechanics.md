# Game Rules and Formulas

## Pricing Systems

### Commodity Pricing

Commodity prices are calculated dynamically based on supply and demand:

- **Formula**: `Base Price × Scarcity Factor`
- **Scarcity Factor**: `Demand / Supply` (unlimited, no cap)
- **Demand Calculation**: Sum of production units requiring the resource × `PRODUCTION_RESOURCE_CONSUMPTION`
- **Supply Calculation**: Sum of extraction units producing the resource × `EXTRACTION_OUTPUT_RATE`

#### Base Commodity Prices

| Commodity | Base Price |
|-----------|------------|
| Oil | 75 |
| Steel | 850 |
| Rare Earth | 9000 |
| Copper | 8500 |
| Fertile Land | 3500 |
| Lumber | 450 |
| Chemical Compounds | 2200 |

### Product Pricing

Product prices are calculated using reference values and scarcity:

- **Formula**: `Reference Value × Scarcity Factor`
- **Scarcity Factor**: `Demand / Supply` (unlimited, no cap)
- **Price Floor**: `PRODUCT_MIN_PRICE` (currently 10)

#### Reference Product Values

| Product | Reference Value |
|---------|-----------------|
| Technology Products | 5000 |
| Manufactured Goods | 1500 |
| Electricity | 200 |
| Food Products | 500 |
| Construction Capacity | 2500 |
| Pharmaceutical Products | 8000 |
| Defense Equipment | 15000 |
| Logistics Capacity | 1000 |

## Unit Economics

### Base Hourly Revenue and Cost (Reference)

These are baseline reference values before dynamic pricing:

| Unit Type | Base Revenue | Base Cost |
|-----------|--------------|-----------|
| Retail | 500 | 300 |
| Production | 800 | 600 |
| Service | 400 | 200 |
| Extraction | 1000 | 700 |

**Display Period Scaling**: Hourly values are multiplied by 96 for display purposes.

### Dynamic Production Unit Economics

Production units have dynamic economics based on current market prices:

- **Revenue**: `PRODUCTION_OUTPUT_RATE × current(product price)`
- **Cost**: `PRODUCTION_LABOR_COST + PRODUCTION_ELECTRICITY_CONSUMPTION × current(Electricity price) + PRODUCTION_RESOURCE_CONSUMPTION × current(required resource price)`
- **Profit**: `Revenue − Cost`

### Dynamic Extraction Unit Economics

Extraction units have simpler economics:

- **Revenue**: `EXTRACTION_OUTPUT_RATE × current(resource price)`
- **Cost**: `UNIT_ECONOMICS.extraction.baseCost` (fixed labor cost)
- **Profit**: `Revenue − Cost`

## Consumption and Output Rates

### Production Constants

- `PRODUCTION_OUTPUT_RATE = 1.0`
- `PRODUCTION_RESOURCE_CONSUMPTION = 0.5`
- `PRODUCTION_ELECTRICITY_CONSUMPTION = 0.5`

### Extraction Constants

- `EXTRACTION_OUTPUT_RATE = 2.0`
- `EXTRACTION_ELECTRICITY_CONSUMPTION = 0.25`

### Retail/Service Constants

- `RETAIL_PRODUCT_CONSUMPTION = 2.0`
- `SERVICE_PRODUCT_CONSUMPTION = 1.5`
- `SERVICE_ELECTRICITY_CONSUMPTION` (separate treatment in metadata)

## Sector Flows

### Production Unit Flows

**Inputs**:
- Required resource (commodity)
- Electricity
- Any demanded products (sector-specific)

**Outputs**:
- Produced product at `PRODUCTION_OUTPUT_RATE`

### Extraction Unit Flows

**Inputs**:
- Electricity at `EXTRACTION_ELECTRICITY_CONSUMPTION`

**Outputs**:
- Extractable resources at `EXTRACTION_OUTPUT_RATE`

### Retail Unit Flows

**Inputs**:
- Demanded products at `RETAIL_PRODUCT_CONSUMPTION`

**Outputs**:
- Consumer revenue (fixed)

### Service Unit Flows

**Inputs**:
- Electricity at `SERVICE_ELECTRICITY_CONSUMPTION`
- Other demanded products at `SERVICE_PRODUCT_CONSUMPTION`

**Outputs**:
- Service revenue (fixed)

## Demand Level Categorization

Demand levels help players understand market conditions:

- **Coverage Ratio**: `Supply / Demand`

### Categorization Rules

| Category | Conditions |
|----------|-----------|
| **Low Demand** | Coverage > 1.1 (oversupply) |
| **High Demand** | Coverage < 0.8 OR Sales Velocity ≥ 0.7 |
| **Medium Demand** | All other cases |

## Localization and Rounding

### Price Display

- **Rounding**: All prices rounded to 2 decimal places before display
- **Currency Format**: Determined by locale setting

### Supported Locales

| Locale | Currency |
|--------|----------|
| USD | US Dollar |
| EUR | Euro |
| GBP | British Pound |
| JPY | Japanese Yen |
| CNY | Chinese Yuan |
| Default | USD |

### Number Formatting

- Numeric values formatted according to locale conventions
- Thousands separators and decimal points follow locale rules

## Data Refresh and Error States

### Auto-Refresh Behavior

- **Commodity Pages**: Refresh supply/demand and prices every 30 seconds
- **Product Pages**: Refresh supply/demand and prices every 30 seconds
- **Visual Indicator**: "Refreshing data…" shown during refresh

### Error Handling

- Clear error states displayed when data cannot be retrieved
- Fallback messaging for network or server errors
- Graceful degradation when services unavailable

## Game Mechanics

### Supply Chain Flow

```
Extraction Units
    ↓ Extract
Commodities (Oil, Steel, Copper, Rare Earth, Lumber, Fertile Land, Chemical Compounds)
    ↓ Consumed by
Production Units
    ↓ Produce
Products (Tech Products, Manufactured Goods, Electricity, Food Products, Defense Equipment, etc.)
    ↓ Demanded by
Retail & Service Units + Other Production Units
    ↓ Generate
Revenue & Profit
```

### Unit Types

#### 1. Extraction Units
- Extract raw commodities from state resource pools
- Revenue from selling commodities at market prices
- Cost: Labor only
- Limited by resource availability in each state

#### 2. Production Units
- Convert commodities into products
- Revenue from selling products
- Cost: Labor + commodity inputs
- Require resources (e.g., Tech production needs Rare Earth)

#### 3. Retail Units
- Sell products to consumers
- Revenue from consumer sales (fixed)
- Cost: Labor + product inputs (e.g., Defense retail needs Defense Equipment)
- **Disabled** in Technology and Manufacturing sectors

#### 4. Service Units
- Provide services using products
- Revenue from service fees (fixed)
- Cost: Labor + product inputs (e.g., Defense service needs Tech + Defense Equipment)
- **Disabled** in Technology and Manufacturing sectors

### Sector Examples

#### Defense Sector
- **Production**: Needs Steel → produces Defense Equipment
- **Retail/Service**: Consume Defense Equipment

#### Technology Sector
- **Production**: Needs Rare Earth → produces Tech Products
- **Usage**: Other sectors consume Tech Products

#### Energy Sector
- **Production**: Needs Oil → produces Electricity
- **Usage**: Retail/service units consume Electricity

#### Agriculture Sector
- **Extraction**: Produces Food Products
- **Retail/Service**: Consume Food Products

## Strategic Elements

### Vertical Integration
- Control your supply chain from extraction to retail
- Reduces dependency on market prices
- Ensures supply of critical inputs

### Horizontal Expansion
- Build market presence across multiple states
- Diversify geographic risk
- Access different resource pools

### Sector Restrictions
- Some sectors can only build certain unit types
- Technology/Manufacturing: Cannot build retail/service units
- Other sectors: Can build all unit types

### Capital Management
- Balance investment in expansion vs. operational costs
- Monitor profitability of each unit type
- Optimize portfolio based on market conditions

## Hourly Turn-Based Gameplay

### Turn Processing
- Strategic decisions update every hour via cron jobs
- Turn processing handled by job queue
- All players' turns processed in parallel

### Turn Cycle
1. Market prices recalculated based on supply/demand
2. Production/extraction units generate output
3. Retail/service units consume inputs and generate revenue
4. Corporation finances updated
5. State resource pools adjusted
6. Next turn scheduled
