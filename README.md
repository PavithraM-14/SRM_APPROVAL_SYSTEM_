# SRM-RMP Institutional Approval System

A comprehensive digital approval workflow system built with Next.js, TypeScript, MongoDB, and Tailwind CSS. This system streamlines institutional request approvals through a sophisticated role-based workflow with real-time tracking, enhanced UI/UX, and comprehensive audit capabilities.



## ✨ Features Implemented

### Core Features
- ✅ **Next.js App Router** with TypeScript and Tailwind CSS
- ✅ **MongoDB Integration** with Mongoose ODM
- ✅ **Role-Based Authentication** (dev mode with 12 roles)
- ✅ **Multi-Stage Approval Workflow** with state machine logic
- ✅ **Real-Time Dashboard** with statistics and recent requests
- ✅ **Request Management** (create, track, approve/reject)
- ✅ **Budget Integration** with availability checks
- ✅ **SOP Reference System** with compliance tracking
- ✅ **Audit Trail** with comprehensive logging
- ✅ **Responsive Design** with modern UI components

### Advanced Features
- ✅ **Enhanced Approval Engine** - Parallel verification with smart routing
- ✅ **Indian Number System** - Real-time formatting with lakhs/crores
- ✅ **Department Clarification System** - Targeted clarifications with visibility control
- ✅ **Sophisticated Role-Based Visibility** - Users see only relevant requests
- ✅ **Timeline Tracking** - Visual progress indicators with enhanced status display
- ✅ **Advanced Search & Filtering** - Role-based request filtering
- ✅ **Enhanced Dashboards** - Improved navigation and stats cards
- ✅ **Password Security** - Visibility toggle with eye icons
- ✅ **Mobile-First Design** - Responsive across all devices
- ✅ **Comprehensive Data Seeding** - Complete sample data with proper validation

### Technical Features
- ✅ **Server-Side API Routes** - No separate backend needed
- ✅ **Input Validation** with Zod schemas
- ✅ **Optimistic Updates** with SWR
- ✅ **Security** - Role guards and server-side data access
- ✅ **Scalable Architecture** - Clean separation of concerns

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (Serverless)
- **Database**: MongoDB with Mongoose ODM
- **State Management**: SWR for data fetching
- **UI Components**: Headless UI, Heroicons
- **Forms**: React Hook Form with Zod validation

### Project Structure
```
├── app/
│   ├── api/                 # API routes
│   ├── dashboard/           # Dashboard pages
│   ├── login/              # Authentication
│   └── globals.css         # Global styles
├── components/             # Reusable UI components
├── lib/
│   ├── auth.ts            # Authentication utilities
│   ├── approval-engine.ts  # Workflow logic
│   ├── mongodb.ts         # Database connection
│   └── types.ts           # TypeScript definitions
├── models/                # Mongoose schemas
├── scripts/
│   └── seed.ts            # Database seeding
└── public/                # Static assets
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB Atlas account (or local MongoDB)
- npm or yarn

### Installation

1. **Clone and install dependencies**
```bash
git clone <repository-url>
cd srmp-approval
npm install
```

2. **Environment Setup**
```bash
cp .env.example .env.local
```

Edit `.env.local` with your MongoDB connection string:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/srmp-approval
NEXT_PUBLIC_APP_NAME=SRM-RMP Institutional Approval
NEXT_PUBLIC_BASE_URL=http://localhost:3000
JWT_SECRET=your-super-secret-jwt-key-here
UPLOAD_DIR=./public/uploads
```

3. **Database Seeding**
```bash
npm run seed
```

4. **Start Development Server**
```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

### Default Login Credentials

After running `npm run seed`, use these credentials to test different roles:

| Role | Email | Password | Access Level |
|------|-------|----------|-------------|
| Requester | requester@srmrmp.edu.in | password123 | Create and track requests |
| Institution Manager | institution_manager@srmrmp.edu.in | password123 | Review requests, parallel verification |
| SOP Verifier | sop_verifier@srmrmp.edu.in | password123 | SOP compliance verification |
| Accountant | accountant@srmrmp.edu.in | password123 | Budget verification |
| VP | vp@srmrmp.edu.in | password123 | Vice President approval |
| Head of Institution | head_of_institution@srmrmp.edu.in | password123 | HOI approval |
| Dean | dean@srmrmp.edu.in | password123 | Dean review and department clarifications |
| MMA | mma@srmrmp.edu.in | password123 | MMA department verification |
| HR | hr@srmrmp.edu.in | password123 | HR department verification |
| Audit | audit@srmrmp.edu.in | password123 | Audit department verification |
| IT | it@srmrmp.edu.in | password123 | IT department verification |
| Chief Director | chief_director@srmrmp.edu.in | password123 | Senior management approval |
| Chairman | chairman@srmrmp.edu.in | password123 | Final board approval |

**Note**: All users have Employee IDs (EMP + ROLE) and contact numbers for complete profiles.

## 📊 Enhanced Approval Workflow

### New Parallel Verification System
```
Request Created → Manager Review → Parallel Verification (SOP + Budget) → Manager Routing Decision
                                                                        ↓
Budget Available: → VP → HOI → Dean → Department Checks → Chief Director → Chairman → Approved
Budget Not Available: → Dean Review → Department Checks → Chief Director → Chairman → Approved/Rejected
```

### Key Workflow Features
- **Parallel Processing**: SOP and Budget verification happen simultaneously
- **Smart Routing**: Manager decides routing based on budget availability after verifications
- **Department Targeting**: Dean can send clarifications to specific departments (MMA/HR/Audit/IT)
- **Role-Based Visibility**: Users only see requests relevant to their role and approval level

### Workflow States
- **Manager Review** - Initial review and routing to parallel verification
- **Parallel Verification** - Simultaneous SOP and Budget verification
- **SOP Completed** - SOP verification finished, waiting for budget
- **Budget Completed** - Budget verification finished, waiting for SOP
- **VP Approval** - Vice President review (budget available path)
- **HOI Approval** - Head of Institution approval
- **Dean Review** - Dean assessment and department clarification management
- **Department Checks** - Targeted department verification (MMA/HR/Audit/IT)
- **Chief Director Approval** - Senior management approval
- **Chairman Approval** - Final board approval
- **Approved/Rejected** - Final status

## 🔌 API Endpoints

### Authentication
```bash
POST /api/auth/login       # User login with email/password
POST /api/auth/signup      # User registration (restricted to @srmrmp.edu.in)
GET  /api/auth/me          # Get current user
POST /api/auth/logout      # Logout
```

### Requests
```bash
GET  /api/requests         # List requests (with role-based visibility)
POST /api/requests         # Create request (requesters only)
GET  /api/requests/[id]    # Get single request
POST /api/requests/[id]/approve  # Approve/reject/clarify with enhanced workflow
```

### Enhanced APIs
```bash
GET  /api/approvals        # Role-based pending approvals
GET  /api/in-progress      # User's involvement in ongoing requests
GET  /api/dashboard/stats  # Enhanced dashboard statistics
```

### Dashboard & Data
```bash
GET  /api/dashboard/stats  # Dashboard statistics
GET  /api/budgets         # Budget records
POST /api/budgets/check   # Check budget availability
GET  /api/sop            # SOP records
GET  /api/audit          # Audit logs
```

### Example API Calls

**Create a Request**
```bash
curl -X POST http://localhost:3000/api/requests \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Equipment Request",
    "purpose": "Need new laptops for development team",
    "college": "Engineering",
    "department": "Computer Science", 
    "costEstimate": 50000,
    "expenseCategory": "Equipment",
    "sopReference": "SOP-001"
  }'
```

**Approve a Request**
```bash
curl -X POST http://localhost:3000/api/requests/[id]/actions \
  -H "Content-Type: application/json" \
  -d '{
    "action": "approve",
    "notes": "Approved for immediate procurement"
  }'
```

## 🧪 Testing

The project includes Jest and React Testing Library setup for testing:

```bash
npm test        # Run tests in watch mode
npm run test:ci # Run tests once
```

## 🚀 Deployment

### Vercel Deployment (Recommended)

1. **Install Vercel CLI**
```bash
npm i -g vercel
```

2. **Deploy**
```bash
vercel --prod
```

3. **Environment Variables**
Set these in Vercel dashboard:
- `MONGODB_URI`
- `NEXT_PUBLIC_APP_NAME`  
- `NEXT_PUBLIC_BASE_URL`
- `JWT_SECRET`

### Other Platforms
The app can be deployed to any platform supporting Next.js:
- Netlify
- AWS Amplify  
- Railway
- Render

## 📈 Future Enhancements

### Ready-to-Implement Features
- **NextAuth Integration** - Replace dev auth with production-ready auth
- **Email Notifications** - SMTP integration for email alerts
- **File Uploads** - Complete file attachment system  
- **PDF Generation** - Server-side PDF export
- **Push Notifications** - Real-time browser notifications
- **Advanced Analytics** - Detailed reporting dashboard
- **Mobile App** - React Native companion app

### Webhook Integration
The system includes webhook stubs:
```javascript
// Ready for external integrations
POST /api/webhooks/notify  // External notification system
POST /api/webhooks/budget  // ERP budget sync
```

## 🛠️ Development

### Database Schema
The system uses 6 main collections:
- **Users** - User profiles and roles
- **Requests** - Approval requests with full history
- **BudgetRecords** - Financial allocations and spending
- **SOPRecords** - Standard Operating Procedures  
- **AuditLogs** - Complete audit trail
- **ApprovalHistory** - Embedded request timeline

### Enhanced Components & Utilities
- `CostEstimateInput` - Indian number system formatting with real-time commas
- `PasswordInput` - Password field with visibility toggle
- `FormattedAmount` - Display component for Indian currency formatting
- `approvalEngine` - Enhanced workflow state machine with parallel verification
- `request-visibility` - Sophisticated role-based request filtering
- `indian-number-format` - Utility functions for Indian number system
- Role guards and permission checks with department targeting

### Code Quality
- TypeScript for type safety
- ESLint for code consistency  
- Tailwind for styling consistency
- Modular component architecture

## 📝 Changelog

### v2.0.0 - Enhanced UI/UX & Workflow Improvements
- ✅ **Indian Number Formatting** - Real-time comma formatting for cost estimates
- ✅ **Password Visibility Toggle** - Enhanced login/signup experience
- ✅ **Parallel Verification System** - Simultaneous SOP and Budget verification
- ✅ **Department Clarification Targeting** - Specific department routing
- ✅ **Enhanced Role-Based Visibility** - Sophisticated request filtering
- ✅ **Simplified Workflows** - Removed unnecessary clarification steps
- ✅ **Mobile Responsiveness** - Improved mobile experience
- ✅ **Dashboard Navigation Fixes** - Proper stats card routing
- ✅ **Email Domain Validation** - Restricted to @srmrmp.edu.in
- ✅ **Comprehensive Debugging** - Enhanced error handling

### v1.0.0 - Initial Release
- ✅ Complete approval workflow system
- ✅ Role-based authentication and authorization
- ✅ MongoDB integration with comprehensive schemas
- ✅ Modern UI with Tailwind CSS
- ✅ Real-time dashboards and statistics
- ✅ Audit logging and compliance tracking
- ✅ Budget management integration
- ✅ SOP reference system
- ✅ Responsive design for all devices
- ✅ Development tools and seeding scripts

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit changes (`git commit -am 'Add new feature'`)
4. Push to branch (`git push origin feature/new-feature`)  
5. Create Pull Request

## 📄 License

This project is licensed under the MIT License. See LICENSE file for details.

---

**Built with ❤️ for SRM-RMP Institutional Approval System**
