# Expense Management System

A comprehensive expense management system with Google OAuth authentication, role-based access control, and multi-level approval workflows.

## Features

### Authentication & Authorization
- ✅ Google OAuth integration
- ✅ Role-based access control (Admin, Manager, Employee)
- ✅ JWT token-based authentication
- ✅ Session management

### Company & Currency Management
- ✅ Company setup with country-based currency
- ✅ External API integration for countries and currencies
- ✅ Exchange rate management
- ✅ Multi-currency support

### User Management
- ✅ Admin user creation and management
- ✅ Role assignment and hierarchy
- ✅ Manager-employee relationships

### Expense Management
- ✅ Expense submission with categories
- ✅ Receipt upload with OCR processing
- ✅ Multi-currency expense support
- ✅ Expense status tracking

### Approval Workflow
- ✅ Multi-level approval chains
- ✅ Role-based approval permissions
- ✅ Approval history and comments
- ✅ Admin override capabilities

### Frontend Features
- ✅ Modern React UI with Material-UI
- ✅ Responsive design
- ✅ Role-specific dashboards
- ✅ Real-time notifications

### Email Notifications
- ✅ Nodemailer integration for reliable email delivery
- ✅ Automated expense approval notifications
- ✅ Welcome emails for new users
- ✅ Bulk company notifications
- ✅ Email templates with HTML and plain text
- ✅ Development testing with Ethereal Email

## Tech Stack

### Backend
- Node.js with Express.js
- MongoDB with Mongoose
- Passport.js for authentication
- Google OAuth 2.0
- JWT for token management
- Cloudinary for file storage
- Nodemailer for email notifications
- External API integrations

### Frontend
- React 19 with Vite
- Material-UI (MUI) for components
- React Router for navigation
- React Query for data fetching
- Axios for API calls

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud)
- Google Cloud Console account
- Cloudinary account (for file storage)

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file:**
   ```bash
   cp config.example.js .env
   ```

4. **Configure environment variables:**
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:5173

   # Database
   MONGODB_URI=mongodb://localhost:27017/expense-management

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-here
   SESSION_SECRET=your-session-secret-key-here

   # Google OAuth Configuration
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

   # Cloudinary Configuration
   CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
   CLOUDINARY_API_KEY=your-cloudinary-api-key
   CLOUDINARY_API_SECRET=your-cloudinary-api-secret

   # Email Configuration (Nodemailer)
   EMAIL_SERVICE=gmail
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   EMAIL_FROM=noreply@expensemanager.com
   ```

5. **Start the backend server:**
   ```bash
   npm run dev
   ```

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file:**
   ```bash
   touch .env
   ```

4. **Configure environment variables:**
   ```env
   VITE_API_URL=http://localhost:5000
   VITE_GOOGLE_CLIENT_ID=your-google-client-id
   ```

5. **Start the frontend development server:**
   ```bash
   npm run dev
   ```

### Google OAuth Setup

1. **Go to Google Cloud Console:**
   - Visit [Google Cloud Console](https://console.cloud.google.com/)

2. **Create a new project or select existing one**

3. **Enable Google+ API:**
   - Go to APIs & Services > Library
   - Search for "Google+ API" and enable it

4. **Create OAuth 2.0 credentials:**
   - Go to APIs & Services > Credentials
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:5000/api/auth/google/callback`

5. **Copy Client ID and Secret:**
   - Add them to your backend `.env` file

### Cloudinary Setup

1. **Sign up for Cloudinary:**
   - Visit [Cloudinary](https://cloudinary.com/)

2. **Get your credentials:**
   - Cloud name, API Key, and API Secret from dashboard

3. **Add to backend `.env` file**

### MongoDB Setup

1. **Local MongoDB:**
   ```bash
   # Install MongoDB locally
   # Start MongoDB service
   mongod
   ```

2. **MongoDB Atlas (Cloud):**
   - Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Create cluster
   - Get connection string
   - Add to backend `.env` file

## API Endpoints

### Authentication
- `GET /api/auth/google` - Google OAuth login
- `GET /api/auth/google/callback` - OAuth callback
- `POST /api/auth/complete-registration` - Complete user registration
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Refresh token

### Companies
- `GET /api/companies/:id` - Get company details
- `PUT /api/companies/:id` - Update company
- `GET /api/companies/:id/users` - Get company users
- `GET /api/companies/:id/stats` - Get company statistics
- `GET /api/companies/data/countries` - Get countries data
- `GET /api/companies/data/exchange-rates/:currency` - Get exchange rates

### Users
- `GET /api/users` - Get users (Admin/Manager)
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create user (Admin)
- `PUT /api/users/:id` - Update user (Admin)
- `DELETE /api/users/:id` - Delete user (Admin)
- `GET /api/users/team/members` - Get team members (Manager)

### Expenses
- `GET /api/expenses` - Get expenses
- `GET /api/expenses/:id` - Get expense by ID
- `POST /api/expenses` - Create expense
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense
- `POST /api/expenses/:id/receipt` - Upload receipt
- `POST /api/expenses/:id/submit` - Submit for approval

### Approvals
- `GET /api/approvals/pending` - Get pending approvals
- `GET /api/approvals/history` - Get approval history
- `POST /api/approvals/:id/approve` - Approve expense
- `POST /api/approvals/:id/reject` - Reject expense
- `POST /api/approvals/:id/override` - Admin override
- `GET /api/approvals/stats` - Get approval statistics

### Currencies
- `GET /api/currencies` - Get currencies
- `GET /api/currencies/rates/:base` - Get exchange rates
- `POST /api/currencies/convert` - Convert currency
- `GET /api/currencies/countries` - Get countries
- `POST /api/currencies/update-rates` - Update rates

### Email Notifications
- `POST /api/email/test` - Send test email (Admin)
- `POST /api/email/welcome/:userId` - Send welcome email (Admin)
- `POST /api/email/bulk-notification` - Send bulk notification (Admin)
- `POST /api/email/company-notification` - Send company notification (Admin)
- `POST /api/email/password-reset` - Send password reset email
- `GET /api/email/status` - Get email service status

## Database Schema

### Companies
- Company information
- Default currency and country
- Approval settings
- Company preferences

### Users
- User profile and authentication
- Role and permissions
- Manager relationships
- Company association

### Expenses
- Expense details and amounts
- Receipt attachments with OCR data
- Approval chain and status
- Currency and category information

### Approval Workflows
- Customizable approval rules
- Multi-level approval chains
- Escalation settings
- Company-specific configurations

## Development

### Running the Application

1. **Start MongoDB** (if using local instance)

2. **Start Backend:**
   ```bash
   cd backend
   npm run dev
   ```

3. **Start Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

4. **Access the application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000

### Testing

1. **Backend tests:**
   ```bash
   cd backend
   npm test
   ```

2. **Frontend tests:**
   ```bash
   cd frontend
   npm test
   ```

## Deployment

### Backend Deployment
- Deploy to platforms like Heroku, Railway, or AWS
- Set up MongoDB Atlas for production database
- Configure environment variables
- Set up SSL certificates

### Frontend Deployment
- Deploy to Vercel, Netlify, or AWS S3
- Configure build settings
- Set up environment variables
- Configure domain and SSL

## Security Considerations

- JWT token expiration and refresh
- Rate limiting on API endpoints
- Input validation and sanitization
- File upload security
- CORS configuration
- Environment variable protection

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team or create an issue in the repository.
