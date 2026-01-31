# URL Shortener Engine Architecture

## Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Web Application                          │
│              (applications/web/app/routes)                   │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ Uses
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Use Cases Layer                           │
│              (libs/engine/src/use-cases)                     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  ShortenUrlUseCase                                   │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │ 1. Validate URL (HTTPS only)                   │  │   │
│  │  │ 2. Normalize URL                               │  │   │
│  │  │ 3. Check for existing URL (deduplication)      │  │   │
│  │  │ 4. Update generator length (dynamic scaling)   │  │   │
│  │  │ 5. Generate unique short code (collision check)│  │   │
│  │  │ 6. Save to repository                          │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ Uses
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Domain Layer                              │
│              (libs/engine/src/domain)                        │
│                                                              │
│  ┌──────────────────────┐  ┌──────────────────────────┐     │
│  │  URL Validation      │  │  Short Code Generator    │     │
│  │                      │  │                          │     │
│  │  • validateUrl()     │  │  • generate()            │     │
│  │  • normalizeUrl()    │  │  • updateLength()        │     │
│  │  • HTTPS check       │  │  • getStats()            │     │
│  │  • Security filters  │  │  • Dynamic scaling       │     │
│  │  • IP blocking       │  │  • Utilization calc      │     │
│  └──────────────────────┘  └──────────────────────────┘     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Url (Domain Entity)                                 │   │
│  │  • originalUrl: string                               │   │
│  │  • shortCode: string                                 │   │
│  │  • createdAt: Date                                   │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ Implements
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Ports Layer                               │
│              (libs/engine/src/ports)                         │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  UrlRepository (Interface)                           │   │
│  │  • save(url): Promise<Url>                           │   │
│  │  • findByShortCode(code): Promise<Url | null>        │   │
│  │  • findAll(): Promise<Url[]>                         │   │
│  │  • findAllWithStats(): Promise<(Url & Stats)[]>      │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ Implemented by
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Adapters Layer                             │
│              (libs/engine/src/adapters)                      │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  PrismaUrlRepository                                 │   │
│  │  • Implements UrlRepository                          │   │
│  │  • Uses Prisma Client                                │   │
│  │  • SQLite database                                   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow: Creating a Short URL

```
1. User Input
   └─> "https://example.com/very/long/path"

2. Web Route Handler
   └─> Calls shortenUrlUseCase.execute(url)

3. Use Case: Validate
   └─> validateUrl(url)
       ├─> Check: Is HTTPS? ✓
       ├─> Check: Not localhost? ✓
       ├─> Check: Not private IP? ✓
       └─> Valid ✓

4. Use Case: Normalize
   └─> normalizeUrl(url)
       ├─> Trim whitespace
       ├─> Remove trailing slashes
       └─> "https://example.com/very/long/path"

5. Use Case: Check Existing
   └─> repository.findAll()
       └─> Search for normalized URL
           ├─> Found? Return existing short code
           └─> Not found? Continue...

6. Use Case: Update Generator
   └─> shortCodeGenerator.updateLength(totalUrls)
       ├─> Calculate utilization: totalUrls / 62^8
       ├─> If ≥ 50%: Increase length to 9
       └─> Current length: 8 ✓

7. Use Case: Generate Code (with collision check)
   └─> Loop (max 10 attempts):
       ├─> shortCodeGenerator.generate() → "aB3xY9Zk"
       ├─> repository.findByShortCode("aB3xY9Zk")
       ├─> Exists? Try again
       └─> Not exists? Use this code ✓

8. Use Case: Save
   └─> repository.save({
         originalUrl: "https://example.com/very/long/path",
         shortCode: "aB3xY9Zk",
         createdAt: new Date()
       })

9. Response
   └─> Return to user: "https://short.url/aB3xY9Zk"
```

## Short Code Generation Algorithm

```
┌─────────────────────────────────────────────────────────────┐
│              Short Code Generator State                      │
├─────────────────────────────────────────────────────────────┤
│  Alphabet: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgh..." │
│  Size: 62 characters                                         │
│  Current Length: 8 (initially)                               │
│  Threshold: 50% utilization                                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Generation Process                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Calculate Capacity                                       │
│     ├─> Possible = 62^length                                │
│     └─> Example: 62^8 = 218,340,105,584,896                 │
│                                                              │
│  2. Check Utilization                                        │
│     ├─> Utilization = totalUrls / Possible                  │
│     ├─> Example: 1,000,000 / 218T = 0.0000046%              │
│     └─> If ≥ 50%: Increase length                           │
│                                                              │
│  3. Generate Random Code                                     │
│     ├─> Use nanoid with custom alphabet                     │
│     ├─> Length = current length                             │
│     └─> Example: "aB3xY9Zk" (8 chars)                       │
│                                                              │
│  4. Verify Uniqueness                                        │
│     ├─> Check repository                                    │
│     ├─> If collision: Retry (max 10 times)                  │
│     └─> If unique: Return code                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Collision Prevention Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                 Multi-Layer Protection                       │
└─────────────────────────────────────────────────────────────┘

Layer 1: Large Alphabet (62 characters)
├─> More characters = more combinations
└─> 62 vs 36 (alphanumeric) = 72% more combinations

Layer 2: Sufficient Initial Length (8 characters)
├─> 62^8 = 218+ trillion combinations
├─> At 1M URLs/day: ~600,000 years to 50%
└─> Extremely low collision probability

Layer 3: Collision Detection
├─> Check repository before saving
├─> Retry with new code if collision
└─> Up to 10 retry attempts

Layer 4: Dynamic Length Scaling
├─> Monitor utilization continuously
├─> Increase length at 50% threshold
├─> Prevents birthday paradox
└─> Scales indefinitely (8→9→10→11...)

Layer 5: URL Deduplication
├─> Normalize URLs before comparison
├─> Return existing code for same URL
└─> Reduces total URLs in system

Result: Collision probability < 0.000001%
```

## Test Coverage Map

```
┌─────────────────────────────────────────────────────────────┐
│                    Test Coverage                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  URL Validation (20 tests)                                   │
│  ├─> Valid HTTPS URLs ✓                                     │
│  ├─> Invalid protocols (HTTP, FTP) ✓                        │
│  ├─> Security (localhost, private IPs) ✓                    │
│  ├─> Format validation ✓                                    │
│  └─> Normalization ✓                                        │
│                                                              │
│  Short Code Generator (28 tests)                             │
│  ├─> Combination calculations ✓                             │
│  ├─> Utilization tracking ✓                                 │
│  ├─> Length scaling logic ✓                                 │
│  ├─> Code generation ✓                                      │
│  ├─> Collision resistance ✓                                 │
│  └─> Extensibility ✓                                        │
│                                                              │
│  Use Case Integration (23 tests)                             │
│  ├─> Basic functionality ✓                                  │
│  ├─> Same URL = same code ✓                                 │
│  ├─> No collisions ✓                                        │
│  ├─> No override ✓                                          │
│  ├─> Retry mechanism ✓                                      │
│  ├─> Input validation ✓                                     │
│  └─> Edge cases ✓                                           │
│                                                              │
│  Total: 71 tests (142 with dist) - 100% passing             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Scaling Timeline Example

```
Timeline of Short Code Length Scaling
(Assuming 1 million URLs created per day)

Year 0: Start
├─> Length: 8 characters
├─> Capacity: 218 trillion
└─> URLs: 0

Year 300,000: First Scale
├─> Length: 9 characters
├─> Capacity: 13.5 quadrillion
├─> URLs: 109 trillion (50% of 8-char capacity)
└─> Trigger: Automatic scaling

Year 18,000,000: Second Scale
├─> Length: 10 characters
├─> Capacity: 839 quadrillion
├─> URLs: 6.7 quadrillion (50% of 9-char capacity)
└─> Trigger: Automatic scaling

Conclusion: System scales proactively, preventing
collisions for millions of years of operation.
```

## SOLID Principles Applied

```
Single Responsibility Principle
├─> url-validation.ts: Only validates and normalizes URLs
├─> short-code-generator.ts: Only generates short codes
└─> shorten-url.ts: Only orchestrates the shortening process

Open/Closed Principle
├─> UrlRepository interface: Open for extension
├─> ShortCodeGenerator: Can add new strategies
└─> Validation rules: Can add new validators

Liskov Substitution Principle
├─> Any UrlRepository implementation works
└─> PrismaUrlRepository, InMemoryRepository, etc.

Interface Segregation Principle
├─> UrlRepository: Focused interface
└─> AnalyticsRepository: Separate concerns

Dependency Inversion Principle
├─> Use cases depend on interfaces (ports)
└─> Not on concrete implementations (adapters)
```
