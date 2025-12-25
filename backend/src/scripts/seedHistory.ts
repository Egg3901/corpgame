import { CommodityPriceHistoryModel } from '../models/CommodityPriceHistory';
import { ProductPriceHistoryModel } from '../models/ProductPriceHistory';
import { RESOURCES, PRODUCTS, RESOURCE_BASE_PRICES, PRODUCT_REFERENCE_VALUES } from '../constants/sectors';
import pool from '../db/connection';

async function seedHistory() {
  console.log('Starting history seeding...');

  try {
    // Clear existing history (optional, but good for testing)
    // await pool.query('DELETE FROM commodity_price_history');
    // await pool.query('DELETE FROM product_price_history');

    const now = new Date();
    const points = 48; // 48 points (e.g., every hour for 2 days)
    
    // Seed Commodities
    for (const resource of RESOURCES) {
      console.log(`Seeding history for commodity: ${resource}`);
      const basePrice = RESOURCE_BASE_PRICES[resource];
      let lastPrice = basePrice;

      for (let i = points; i >= 0; i--) {
        const recorded_at = new Date(now.getTime() - i * 3600000);
        
        // Random walk for price
        const change = (Math.random() - 0.45) * 0.1; // Bias slightly upward
        const price = Math.round(lastPrice * (1 + change) * 100) / 100;
        lastPrice = price;

        // Simulated supply/demand
        const supply = 1000 + Math.random() * 500;
        const demand = 800 + Math.random() * 800;

        await pool.query(
          `INSERT INTO commodity_price_history (resource_name, price, supply, demand, recorded_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [resource, price, supply, demand, recorded_at]
        );
      }
    }

    // Seed Products
    for (const product of PRODUCTS) {
      console.log(`Seeding history for product: ${product}`);
      const basePrice = PRODUCT_REFERENCE_VALUES[product];
      let lastPrice = basePrice;

      for (let i = points; i >= 0; i--) {
        const recorded_at = new Date(now.getTime() - i * 3600000);
        
        // Random walk for price
        const change = (Math.random() - 0.45) * 0.12; // More volatile
        const price = Math.round(lastPrice * (1 + change) * 100) / 100;
        lastPrice = price;

        // Simulated supply/demand
        const supply = 500 + Math.random() * 200;
        const demand = 400 + Math.random() * 400;

        await pool.query(
          `INSERT INTO product_price_history (product_name, price, supply, demand, recorded_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [product, price, supply, demand, recorded_at]
        );
      }
    }

    console.log('Seeding completed successfully.');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    process.exit();
  }
}

seedHistory();
