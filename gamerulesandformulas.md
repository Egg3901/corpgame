# Game Rules and Formulas

## Pricing Systems

- Commodity price:
  - Base price × Scarcity factor
  - Scarcity = Demand / Supply, clamped between 0.5 and 3.0
  - Demand = Sum of production units requiring the resource × `PRODUCTION_RESOURCE_CONSUMPTION`
  - Supply = Sum of extraction units producing the resource × `EXTRACTION_OUTPUT_RATE`
  - Base prices:
    - Oil 75, Steel 850, Rare Earth 125000, Copper 8500, Fertile Land 3500, Lumber 450, Chemical Compounds 2200

- Product price:
  - Reference value × Scarcity factor, clamped between 0.1 and 3.0, floored by `PRODUCT_MIN_PRICE`
  - Scarcity = Demand / Supply
  - Reference values:
    - Technology Products 5000, Manufactured Goods 1500, Electricity 200, Food Products 500, Construction Capacity 2500, Pharmaceutical Products 8000, Defense Equipment 15000, Logistics Capacity 1000

## Unit Economics

- Base hourly revenue and cost (reference):
  - Retail revenue 500, cost 300
  - Production revenue 800, cost 600
  - Service revenue 400, cost 200
  - Extraction revenue 1000, cost 700
  - Display period scaling multiplies hourly values by 96

- Dynamic production unit economics:
  - Revenue = `PRODUCTION_OUTPUT_RATE × current(product price)`
  - Cost = `PRODUCTION_LABOR_COST + PRODUCTION_ELECTRICITY_CONSUMPTION × current(Electricity price) + PRODUCTION_RESOURCE_CONSUMPTION × current(required resource price)`
  - Profit = Revenue − Cost

- Dynamic extraction unit economics:
  - Revenue = `EXTRACTION_OUTPUT_RATE × current(resource price)`
  - Cost = `UNIT_ECONOMICS.extraction.baseCost`
  - Profit = Revenue − Cost

## Consumption and Output Rates

- `PRODUCTION_OUTPUT_RATE = 1.0`
- `PRODUCTION_RESOURCE_CONSUMPTION = 0.5`
- `PRODUCTION_ELECTRICITY_CONSUMPTION = 0.5`
- `EXTRACTION_OUTPUT_RATE = 2.0`
- `EXTRACTION_ELECTRICITY_CONSUMPTION = 0.25`
- `RETAIL_PRODUCT_CONSUMPTION = 2.0`
- `SERVICE_PRODUCT_CONSUMPTION = 1.5`
- Service electricity demand is treated separately at `SERVICE_ELECTRICITY_CONSUMPTION` in metadata

## Sector Flows

- Sector unit flows:
  - Production inputs: required resource + Electricity + any demanded products
  - Production outputs: produced product at `PRODUCTION_OUTPUT_RATE`
  - Retail inputs: demanded products at `RETAIL_PRODUCT_CONSUMPTION`
  - Service inputs: demanded products (Electricity at `SERVICE_ELECTRICITY_CONSUMPTION`, others at `SERVICE_PRODUCT_CONSUMPTION`)
  - Extraction inputs: Electricity at `EXTRACTION_ELECTRICITY_CONSUMPTION`
  - Extraction outputs: extractable resources at `EXTRACTION_OUTPUT_RATE`

## Demand Level Categorization

- Coverage = `Supply / Demand`
- Level:
  - Low: `coverage > 1.1`
  - High: `coverage < 0.8` or `salesVelocity ≥ 0.7`
  - Medium: otherwise

## Localization and Rounding

- Prices are rounded to two decimals before display
- Currency format determined by locale (`USD`, `EUR`, `GBP`, `JPY`, `CNY`, fallback `USD`)
- Numeric values formatted according to locale conventions

## Data Refresh and Error States

- Commodity and product pages refresh supply/demand and prices every 30 seconds
- While refreshing, a visual “Refreshing data…” indicator is shown
- If data cannot be retrieved, pages present clear error states and fallback messaging
