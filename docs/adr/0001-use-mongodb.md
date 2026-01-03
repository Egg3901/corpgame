# ADR-0001: Use MongoDB as Primary Database

**Status:** Accepted  
**Date:** 2025-01-15  
**Deciders:** Project Lead, Backend Team  
**Tags:** database, architecture, backend

---

## Context

The Corporate Game Platform needs a database to store:
- User accounts and authentication data
- Corporation information and financials
- Share ownership and trading history
- Game state and time progression
- Product chains and commodity pricing

**Requirements:**
- Handle complex nested data structures (corporations with products, shareholders, etc.)
- Support flexible schema (game mechanics may evolve)
- Scale to thousands of users and millions of transactions
- Fast queries for real-time game updates
- Simple development setup (no complex migrations)

**Constraints:**
- Small team with limited database administration expertise
- Budget constraints (prefer free tier options)
- Need to deploy quickly (MVP in weeks, not months)
- Must work well with Next.js ecosystem

---

## Decision

**We will use MongoDB as our primary database.**

Implementation:
- Use MongoDB Node.js driver (not Mongoose initially, added later)
- Deploy on MongoDB Atlas (managed cloud service)
- Use environment variable for connection string
- Implement manual schema validation in application code
- Add indexes for frequently queried fields

---

## Rationale

**MongoDB fits our needs because:**

1. **Schema Flexibility**
   - NoSQL document model allows nested structures (perfect for corporations with products, shareholders, etc.)
   - Easy to add new fields without migrations
   - JSON-like documents match JavaScript/TypeScript objects naturally

2. **Developer Experience**
   - Simple setup (connection string + driver)
   - No ORM required (though Mongoose added later for validation)
   - Excellent Node.js ecosystem support
   - Fast iteration during development

3. **Hosting Options**
   - MongoDB Atlas offers generous free tier (512MB)
   - Managed service eliminates server administration
   - Automatic backups and monitoring
   - Easy scaling path as game grows

4. **Query Capabilities**
   - Rich query language for complex filters
   - Aggregation pipeline for analytics
   - Indexing for fast lookups
   - Full-text search built-in

5. **Community & Support**
   - Large community and extensive documentation
   - Mature, battle-tested technology
   - Many developers already familiar with MongoDB
   - Good integration with Vercel, Netlify, etc.

---

## Consequences

### Positive

- **Fast Development:** No schema migrations means rapid iteration on game mechanics
- **Simple Setup:** Single connection string, no complex configuration
- **Good DX:** JavaScript developers feel at home with document model
- **Free Tier:** MongoDB Atlas free tier covers development and initial launch
- **Flexible Schema:** Easy to add new features without database changes

### Negative

- **No ACID Transactions (Initially):** Complex multi-document operations require careful handling
  - *Mitigation:* MongoDB 4.0+ supports multi-document transactions, available on Atlas
- **Schema Validation Manual:** Application must validate data (no database-level enforcement)
  - *Mitigation:* Added Mongoose with Zod schemas in Phase 1 for validation
- **Relational Queries:** Joins are not natural (aggregation pipeline or manual)
  - *Mitigation:* Design documents to minimize need for joins (embed related data)
- **Storage Size:** Documents can be larger than normalized relational rows
  - *Acceptable:* Storage is cheap, performance matters more

### Neutral

- **NoSQL Learning Curve:** Team must learn NoSQL patterns (denormalization, embedding vs. referencing)
- **Vendor Lock-in:** Switching from MongoDB later would require significant work
- **Atlas Dependency:** Using Atlas ties us to MongoDB's cloud platform (but local dev still works)

---

## Alternatives Considered

### Alternative 1: PostgreSQL

**Description:** Popular relational database with JSON support

**Pros:**
- ACID transactions out of the box
- Strong consistency guarantees
- JSON/JSONB columns for flexibility
- Free tier on Supabase, Neon, Railway
- Excellent performance for relational queries

**Cons:**
- Requires schema migrations for changes
- More complex setup (tables, relationships, foreign keys)
- ORM typically required (Prisma, TypeORM)
- Less flexible for rapidly evolving game mechanics

**Why Rejected:** 
Schema migrations would slow iteration during early development. While PostgreSQL is excellent for well-defined schemas, our game mechanics are still evolving. The migration overhead outweighs benefits for our use case.

---

### Alternative 2: Firebase Firestore

**Description:** Google's NoSQL cloud database with real-time capabilities

**Pros:**
- Real-time updates built-in (perfect for live game)
- Generous free tier
- Automatic scaling
- Good developer experience
- Client SDKs for web and mobile

**Cons:**
- Query limitations (no compound queries on multiple inequality fields)
- Vendor lock-in (Google Cloud only)
- Pricing can escalate with reads/writes
- Less control over data structure
- Offline development requires Firebase emulator

**Why Rejected:** 
Query limitations would restrict our game mechanics design. The pricing model based on reads/writes is unpredictable for a game with frequent updates. MongoDB offers more control and flexibility.

---

### Alternative 3: SQLite

**Description:** Lightweight embedded SQL database

**Pros:**
- Zero configuration (single file)
- No server required
- Fast for small datasets
- Perfect for development
- ACID transactions

**Cons:**
- Not designed for concurrent writes
- Scaling challenges (single file)
- No built-in replication
- Deployment complexity (where to store file?)
- Not suitable for multi-user production environment

**Why Rejected:** 
SQLite is excellent for local development but unsuitable for production multi-user game. No clear deployment story for managed hosting (Vercel, Netlify).

---

## Implementation Notes

**Setup Steps:**
1. Create MongoDB Atlas account (https://cloud.mongodb.com)
2. Create cluster (M0 free tier sufficient for start)
3. Create database user with read/write permissions
4. Whitelist IP addresses (or use 0.0.0.0/0 for development)
5. Get connection string and add to .env.local

**Environment Configuration:**
```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/corpgame
MONGODB_DB=corpgame
```

**Connection Code:**
```typescript
// lib/db/mongo.ts
import { MongoClient } from 'mongodb';

let cachedClient: MongoClient;

export async function connectMongo(): Promise<MongoClient> {
  if (cachedClient) return cachedClient;
  
  const client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();
  
  cachedClient = client;
  return client;
}
```

**Key Collections:**
- `users` - User accounts and authentication
- `corporations` - Corporation data and financials
- `shareholders` - Share ownership records
- `products` - Product definitions and pricing
- `sectors` - Sector configurations (seeded)
- `states` - US states data (seeded)

---

## Validation

**Success Criteria:**
- ✅ Database handles 1000+ concurrent users without performance degradation
- ✅ Query response times < 100ms for 95% of requests
- ✅ Zero data loss incidents
- ✅ Development team comfortable with MongoDB queries
- ✅ Free tier sufficient through first 6 months

**Review Schedule:**
- 3 months: Assess query performance and schema design
- 6 months: Review Atlas costs and scaling needs
- 12 months: Consider if alternative databases would serve better

**Triggers for Reconsidering:**
- Atlas costs exceed $200/month
- Query performance consistently > 500ms
- Need for complex multi-document transactions becomes common
- Team struggles with NoSQL patterns after 6 months

---

## References

- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [MongoDB Node.js Driver](https://docs.mongodb.com/drivers/node/)
- [Next.js MongoDB Integration Guide](https://nextjs.org/docs/app/building-your-application/data-fetching/data-fetching-patterns)
- [When to Use MongoDB vs PostgreSQL](https://www.mongodb.com/compare/mongodb-postgresql)
- [MongoDB Schema Design Best Practices](https://www.mongodb.com/developer/products/mongodb/schema-design-anti-pattern-summary/)

---

## Notes

**Post-Implementation Insights:**

After 3 months of development:
- MongoDB's flexibility proved invaluable during game mechanics iteration
- Added Mongoose in Phase 1 for better schema validation (complementary to MongoDB)
- Aggregation pipeline more powerful than initially expected (excellent for analytics)
- No regrets about database choice - would make same decision again

**Technical Debt:**
- Some queries could benefit from better indexing (to be added in Phase 6)
- Connection pooling could be optimized for Vercel serverless (future improvement)
- Consider Read Replicas if read traffic becomes bottleneck

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-01-15 | Project Lead | Initial decision documented |
| 2025-04-20 | Backend Team | Added post-implementation insights after 3 months |
| 2025-12-31 | Project Lead | Moved to ADR system, updated validation results |

---

**ADR Version:** 1.0  
**Status:** Accepted and validated in production
