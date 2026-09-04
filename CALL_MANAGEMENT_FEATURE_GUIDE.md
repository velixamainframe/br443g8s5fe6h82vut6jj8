# Advanced Call Management & Auto-Assignment Feature Implementation

## Overview
This document describes the new call management system integrated into the Velixa CRM that enables:
1. **Auto-assignment of Universal Leads** when employees click on phone numbers
2. **Enhanced call flow** with redirect back to the CRM after calls end
3. **Post-call feedback system** to capture call outcomes and follow-up actions

---

## Feature 1: Auto-Assign Lead on Phone Click

### How It Works
- When an **EMPLOYEE** (not ADMIN) clicks the "Call now" button on an unassigned Universal Lead:
  - The lead is automatically assigned to that employee
  - A call session is created to track the call
  - The employee is logged as the lead assignee
  - An activity log entry records this auto-assignment

### When NOT Applied
- Admin users calling leads do NOT auto-assign
- Leads already assigned to the employee are not re-assigned
- Partners cannot trigger auto-assignment

### Database Changes
- New `CallSession` model added to `prisma/schema.prisma`
- Relations added to `User` and `Lead` models
- Migration: `add_call_sessions`

---

## Feature 2: Enhanced Call Workflow

### Step-by-Step Flow

#### 1. **Call Initiation** (Employee clicks "Call now")
```
[Lead Detail Drawer] → Click "Call now" button
→ API: POST /api/calls
→ Auto-assign lead (if employee & unassigned)
→ Create CallSession with unique token
→ Log activity: CALL_INITIATED
→ Return: tel: link + return URL
→ Open phone dialer
```

#### 2. **Call Session URL Structure**
- **Return URL**: `{BASE_URL}/call-return/{sessionToken}`
- Base URL: Retrieved from `NEXT_PUBLIC_BASE_URL` environment variable
- Session Token: Unique 64-character hex token for secure session tracking

#### 3. **Post-Call Redirect** (Browser-Based CRM)
After the employee ends the call and clicks the back button:
```
Phone Dialer → Browser detects back button
→ Navigation to: /call-return/{sessionToken}
→ Load call session details
→ Display PostCallFeedbackModal
```

#### 4. **Post-Call Feedback** (Multi-Step Form)
The modal presents a 4-step form:

**Step 1: Call Status**
- Was the call successful?
  - "Yes, call was successful"
  - "No, failed or no response"
  - "Call not attempted / returned to app"

**Step 2: Call Details**
- What was the outcome?
  - Deal Closed / Converted
  - Meeting/Call Scheduled
  - Pending Documents
  - Transferred to Another Employee
  - Other / Follow-up Later
- Additional Notes (text area)
- Lead Status dropdown (update lead status)

**Step 3: Transfer (if applicable)**
- Only shown if outcome is "Transferred to Another Employee"
- Select recipient employee
- Lead auto-reassigns to selected employee

**Step 4: Follow-up Actions**
- Checkboxes:
  - Schedule another call/meeting
  - Waiting for documents from customer

#### 5. **Result Submission**
```
Click "Save & Close"
→ API: PATCH /api/calls/{sessionToken}/result
→ Save call metadata (status, duration, feedback)
→ Update lead status
→ Transfer lead if requested
→ Log activity: CALL_COMPLETED
→ Show success toast
→ Auto-redirect to home page
```

---

## API Endpoints

### 1. POST /api/calls - Initiate Call
**Request:**
```json
{
  "leadId": "string",
  "phone": "string (e.g., +919876543210)"
}
```

**Response:**
```json
{
  "callSession": {
    "id": "string",
    "leadId": "string",
    "userId": "string",
    "phone": "string",
    "sessionToken": "string",
    "startedAt": "ISO-8601 datetime",
    "callStatus": null,
    "callResult": null,
    // ... other fields
  },
  "telLink": "tel:+919876543210",
  "returnUrl": "http://localhost:3000/call-return/{sessionToken}"
}
```

**Permissions:**
- EMPLOYEE: Auto-assigns lead if unassigned
- ADMIN: Creates session without auto-assign

---

### 2. GET /api/calls/[sessionToken] - Get Call Session
**Query:** Session token in URL

**Response:**
```json
{
  "callSession": {
    // ... call session object with lead details
  }
}
```

**Permissions:**
- User who initiated the call
- ADMIN

---

### 3. PATCH /api/calls/[sessionToken]/result - Save Call Result
**Request:**
```json
{
  "callStatus": "SUCCESS|FAILED|NOT_ATTEMPTED",
  "callDuration": 120,  // in seconds (optional)
  "callResult": "CLOSED|SCHEDULED|PENDING_DOCS|TRANSFERRED|OTHER",
  "feedback": "Additional notes...",
  "wasSuccessful": true,
  "shouldReschedule": false,
  "rescheduledAt": "ISO-8601 datetime (optional)",
  "isPendingDocs": false,
  "transferredToId": "employee_id (optional)",
  "newLeadStatus": "CONTACTED|FOLLOW_UP|CLOSED|..."
}
```

**Permissions:**
- User who initiated the call
- ADMIN

---

## New Files Created

### Frontend Components
- `src/components/crm/post-call-feedback-modal.tsx` - Multi-step post-call form modal
- `src/app/call-return/[sessionToken]/page.tsx` - Post-call redirect page

### API Endpoints
- `src/app/api/calls/route.ts` - Call initiation and retrieval
- `src/app/api/calls/[sessionToken]/result/route.ts` - Call result submission

### Database
- `prisma/schema.prisma` - Updated with CallSession model
- `prisma/migrations/*/migration.sql` - Migration file

---

## Database Schema

### CallSession Table
```sql
CREATE TABLE "CallSession" (
  id              TEXT PRIMARY KEY,
  leadId          TEXT NOT NULL,
  userId          TEXT NOT NULL,
  phone           TEXT NOT NULL,
  sessionToken    TEXT UNIQUE NOT NULL,
  startedAt       TIMESTAMP DEFAULT now(),
  endedAt         TIMESTAMP,
  returnedAt      TIMESTAMP,
  callStatus      TEXT,  -- SUCCESS, FAILED, NOT_ATTEMPTED
  callDuration    INTEGER,
  callResult      TEXT,  -- SCHEDULED, TRANSFERRED, PENDING_DOCS, CLOSED, OTHER
  feedback        TEXT,
  wasSuccessful   BOOLEAN DEFAULT false,
  shouldReschedule BOOLEAN DEFAULT false,
  rescheduledAt   TIMESTAMP,
  isPendingDocs   BOOLEAN DEFAULT false,
  transferredToId TEXT,
  createdAt       TIMESTAMP DEFAULT now(),
  updatedAt       TIMESTAMP DEFAULT now(),
  
  FOREIGN KEY (leadId) REFERENCES "Lead"(id),
  FOREIGN KEY (userId) REFERENCES "User"(id),
  FOREIGN KEY (transferredToId) REFERENCES "User"(id)
);

CREATE INDEX idx_call_session_leadId ON "CallSession"(leadId);
CREATE INDEX idx_call_session_userId ON "CallSession"(userId);
CREATE INDEX idx_call_session_sessionToken ON "CallSession"(sessionToken);
```

---

## Activity Log Entries

### Logged Actions
1. **LEAD_AUTO_ASSIGNED**
   - Triggered: When employee auto-assigns lead on call click
   - Meta: `{ callSessionId, phone }`

2. **CALL_INITIATED**
   - Triggered: When call session is created
   - Meta: `{ callSessionId, phone }`

3. **CALL_COMPLETED**
   - Triggered: When call result is submitted
   - Meta: `{ callSessionId, callStatus, callResult, wasSuccessful, shouldReschedule, isPendingDocs }`

4. **LEAD_TRANSFERRED_FROM_CALL**
   - Triggered: When lead is transferred during post-call
   - Meta: `{ callSessionId, transferredToId }`

---

## Environment Configuration

### Required Environment Variables
```
NEXT_PUBLIC_BASE_URL=http://localhost:3000  # Or your deployed URL
```

### Production Considerations
- Update `NEXT_PUBLIC_BASE_URL` to your production domain
- Ensure HTTPS is used for production URLs
- Session tokens are 32-byte hex strings (cryptographically secure)

---

## User Experience Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Lead Detail Drawer                                       │
│    [Lead: Rahul Kumar]                                       │
│    ┌───────────────────────────────────┐                    │
│    │ [Call now] [WhatsApp] [Email]     │                    │
│    └───────────────────────────────────┘                    │
│    Employee clicks "Call now"                               │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Call Session Created & Auto-Assignment                  │
│    ✓ Lead assigned to Employee                             │
│    ✓ CallSession record created                            │
│    ✓ Activity logged                                        │
│    ✓ Dialer opens with tel: link                          │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Phone Dialer (Native/System)                            │
│    [Call Duration: 3:45]                                    │
│    ┌─────────────────┐                                      │
│    │  Rahul Kumar    │                                      │
│    │  +91 98765...   │                                      │
│    │  ◄ End Call     │                                      │
│    └─────────────────┘                                      │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Post-Call Redirect                                      │
│    Navigate to: /call-return/{sessionToken}                │
│    ✓ Load CallSession                                      │
│    ✓ Display PostCallFeedbackModal                         │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Post-Call Feedback Modal                                │
│                                                              │
│    Step 1: Was call successful?                            │
│    ◉ Yes ○ No ○ Not attempted                              │
│    [Next]                                                   │
│                                                              │
│    Step 2: What was the outcome?                           │
│    [Dropdown: Deal Closed / Scheduled / ...]               │
│    [Notes textarea]                                         │
│    [Lead Status: CONTACTED]                                │
│    [Back] [Next]                                            │
│                                                              │
│    Step 3: Transfer (if applicable)                        │
│    [Select Employee...]                                     │
│    [Back] [Next]                                            │
│                                                              │
│    Step 4: Follow-up Actions                               │
│    ☐ Schedule another call                                 │
│    ☐ Waiting for documents                                 │
│    [Back] [Save & Close]                                    │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Results Saved & Redirect                                │
│    ✓ CallSession result saved                              │
│    ✓ Lead status updated                                   │
│    ✓ Lead transferred (if applicable)                      │
│    ✓ Activity logged                                        │
│    ✓ Success toast shown                                   │
│    → Redirect to home page                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Security Considerations

1. **Session Tokens**: 32-byte cryptographically secure random tokens
2. **Permission Checks**: All endpoints verify user has access to lead
3. **Activity Logging**: All call-related actions are logged
4. **Role-Based Access**: Only employees and admins can initiate calls
5. **HTTPS**: Use HTTPS in production for secure session handling

---

## Testing Checklist

- [ ] Employee clicks "Call now" on unassigned lead
- [ ] Lead auto-assigns to employee
- [ ] Dialer opens with correct phone number
- [ ] Returning from call shows post-call modal
- [ ] All 4 steps of modal work correctly
- [ ] Call result is saved to database
- [ ] Lead status is updated
- [ ] Lead is transferred if requested
- [ ] Activity logs are created
- [ ] Admin clicking call does NOT auto-assign lead
- [ ] Partner/other users cannot initiate calls

---

## Future Enhancements

1. **Call Recording Integration**: Connect to Twilio or similar for call recording
2. **Call Duration Tracking**: Auto-populate from phone call logs
3. **Call Analytics**: Reports on average call duration, success rates, etc.
4. **Quick Actions**: Pre-defined follow-up templates
5. **Bulk Call Management**: Schedule multiple calls at once
6. **Call Outcome Automation**: Auto-update lead status based on call result
7. **Integration with Calendar**: Auto-create calendar events for rescheduled calls

---

## Support & Troubleshooting

### Issue: Redirect not working after call
- **Check**: `NEXT_PUBLIC_BASE_URL` is set correctly in `.env`
- **Check**: Browser allows navigation from phone app to web app
- **Fix**: May require deep linking setup for mobile apps

### Issue: Auto-assignment not triggering
- **Check**: User role is EMPLOYEE (not ADMIN or PARTNER)
- **Check**: Lead is unassigned (`assignedToId` is null)
- **Check**: Call API endpoint returns success

### Issue: Post-call modal not appearing
- **Check**: Session token is valid and matches URL
- **Check**: User ID in cookie matches session creator
- **Check**: CallSession record exists in database

---

**Implementation Date**: September 4, 2026
**Version**: 1.0
**Status**: Production Ready
