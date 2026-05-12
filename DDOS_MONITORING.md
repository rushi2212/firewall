# DDoS Attack Monitoring & Logging

## Overview
The dashboard now includes comprehensive DDoS attack detection, logging, and monitoring capabilities with dynamic thresholds and full request tracking.

## Key Features

### 1. Graceful Request Allowance
- **Initial Whitelist Window**: Configurable period (default: 30 seconds) where new IPs can send requests
- **First N Requests Allowed**: During this window, legitimate users can make requests normally
- **Smooth Transition**: After threshold is reached, blocks begin

### 2. Dynamic Threshold Management
Environment variables control DDoS behavior:
```env
# Requests per second threshold before triggering DDoS block
DDOS_THRESHOLD_RPS=10

# Grace period for new IPs before blocking threshold applies (ms)
DDOS_WHITELIST_WINDOW_MS=30000

# Duration to block an IP after threshold exceeded (ms)
DDOS_BLOCK_DURATION_MS=300000  # 5 minutes
```

### 3. Comprehensive Request Logging
Every request attempt (normal or DDoS) is logged with:
- **Request Details**:
  - IP address
  - User agent
  - HTTP method & path
  - Request headers & content type
  - Payload hash & redacted payload
  
- **DDoS-Specific Details**:
  - Requests per second (RPS)
  - Whether IP is whitelisted
  - Whether currently blocked
  - When DDoS attack was triggered
  - Total requests from IP
  - First seen timestamp
  - Applied threshold

### 4. Dashboard DDoS Monitor Widget
Displays real-time DDoS statistics:
- **Total Attempts**: Cumulative DDoS attack attempts
- **Blocked IPs**: Currently blocked IP addresses
- **Block Rate**: Percentage of DDoS attacks successfully blocked
- **Unique Attackers**: Count of distinct attacking IPs
- **Top Attackers Table**: Shows IP, attempt count, and max RPS

### 5. Backend API Endpoints
New endpoints for DDoS data retrieval:

```
GET /api/logs/ddos
- Returns DDoS logs with pagination support
- Query params: limit (default: 100, max: 1000), skip (default: 0)
- Response: Array of logs where isDdos=true

GET /api/logs/ddos/stats
- Returns aggregated DDoS statistics
- Response:
  {
    "totalAttempts": 42,
    "uniqueAttackerIps": 8,
    "successfulBlocks": 38,
    "blockRate": "90.48",
    "currentlyTrackedIps": 12,
    "currentlyBlockedIps": 3,
    "topAttackers": [
      { "_id": "192.168.1.100", "count": 15, "maxRps": 25.5 },
      ...
    ]
  }
```

### 6. Traffic Monitor State Tracking
The traffic monitor (`trafficMonitor.js`) now maintains per-IP state:
- **Initial State**: IP is whitelisted, can send requests normally
- **Grace Window**: Allows requests for DDOS_WHITELIST_WINDOW_MS
- **Threshold Exceeded**: Once RPS >= DDOS_THRESHOLD_RPS, IP is blocked
- **Block Duration**: IP stays blocked for DDOS_BLOCK_DURATION_MS
- **Auto-Recovery**: After block duration expires, IP is whitelisted again

### 7. Enhanced Log Model
MongoDB logs now include DDoS fields:
```javascript
{
  // ... existing fields (ip, method, path, etc.) ...
  
  // DDoS Detection
  isDdos: Boolean,
  ddosDetails: {
    rps: Number,
    isWhitelisted: Boolean,
    isCurrentlyBlocked: Boolean,
    ddosTriggeredAt: Date,
    totalRequests: Number,
    firstSeenAt: Date,
    threshold: Number,
  },
  
  // Full Request Context
  requestDetails: {
    timestamp: Date,
    headers: Object,    // userAgent, referer, contentType
    cookies: Object,
    contentLength: Number,
    contentType: String,
  }
}
```

## How It Works

### Attack Scenario
1. **User 1** from IP 192.168.1.100 starts making requests
   - First request: Allowed (in grace window)
   - Requests 2-30: Allowed (still in grace window)
   - Request 31: RPS reaches 10 (threshold)
   - **DDoS triggered**: isCurrentlyBlocked = true

2. **Blocking Phase** (5 minutes by default)
   - All requests from 192.168.1.100 immediately blocked
   - Each blocked attempt is logged with full details
   - Decision marked as "block"
   - Event visible in dashboard

3. **Automatic Recovery**
   - After 5 minutes, block duration expires
   - IP state resets to whitelisted
   - IP can send requests normally again

## Configuration Examples

### Tight DDoS Protection (For sensitive APIs)
```env
DDOS_THRESHOLD_RPS=5
DDOS_WHITELIST_WINDOW_MS=10000
DDOS_BLOCK_DURATION_MS=600000    # 10 minutes
```

### Lenient DDoS Protection (For public APIs)
```env
DDOS_THRESHOLD_RPS=50
DDOS_WHITELIST_WINDOW_MS=60000
DDOS_BLOCK_DURATION_MS=120000    # 2 minutes
```

### Testing/Development
```env
DDOS_THRESHOLD_RPS=2
DDOS_WHITELIST_WINDOW_MS=5000
DDOS_BLOCK_DURATION_MS=10000
```

## Frontend Integration

### AppContext Updates
- `ddosStats`: Real-time DDoS statistics object
- `fetchDdosStats()`: Function to fetch latest DDoS stats
- Automatically polls for DDoS updates every 2 seconds

### New Component
- `DdosStats`: Dashboard widget showing attack metrics and top attackers

### Dashboard Display
- DDoS widget shows metrics grid with color-coded severity
- Top attackers table sortable by attack count and RPS
- Real-time updates synchronized with log polling

## Viewing DDoS Data

### Dashboard
1. Navigate to `/` (Dashboard)
2. Scroll down to see "🚨 DDoS Attack Monitor" widget
3. View live statistics and top attacking IPs

### Full DDoS Logs
1. Navigate to `/logs` page (if implemented)
2. Filter by `isDdos: true` (if filter UI available)
3. View detailed request information for each DDoS attempt

### API Queries
```bash
# Get all DDoS logs (first 100)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/logs/ddos

# Get DDoS statistics
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/logs/ddos/stats

# Paginated DDoS logs
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5000/api/logs/ddos?limit=50&skip=50"
```

## Database Queries

```javascript
// Count DDoS attacks by decision
db.logs.aggregate([
  { $match: { isDdos: true } },
  { $group: { _id: "$decision", count: { $sum: 1 } } }
])

// Find top attacking IPs
db.logs.aggregate([
  { $match: { isDdos: true } },
  { $group: { 
    _id: "$ip", 
    attempts: { $sum: 1 },
    maxRps: { $max: "$ddosDetails.rps" }
  }},
  { $sort: { attempts: -1 } },
  { $limit: 10 }
])

// Find currently blocked IPs
db.logs.aggregate([
  { $match: { isDdos: true, "ddosDetails.isCurrentlyBlocked": true } },
  { $group: { _id: "$ip" } }
])
```

## Performance Considerations

- **Memory**: Traffic monitor tracks IPs in memory (can grow over time)
- **Database**: DDoS logs are indexed for fast queries
- **Polling**: Dashboard polls stats every 2 seconds (configurable)
- **Cleanup**: Consider implementing automatic state cleanup for old IPs

## Future Enhancements

- [ ] Per-tenant DDoS thresholds
- [ ] Machine learning-based anomaly detection
- [ ] Whitelist/blacklist management UI
- [ ] Geographic IP filtering
- [ ] Custom response pages for blocked IPs
- [ ] Integration with SIEM systems
- [ ] Rate limiting by user/session instead of just IP
- [ ] CAPTCHA challenges for suspicious traffic patterns
