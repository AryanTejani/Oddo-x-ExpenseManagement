# Email Service Setup Guide

This guide explains how to configure and use the Nodemailer email service in the Expense Management System.

## Email Service Features

- ✅ **Nodemailer Integration** - Professional email service
- ✅ **Multiple Email Providers** - Gmail, Outlook, Yahoo, etc.
- ✅ **Development Testing** - Ethereal Email for testing
- ✅ **Email Templates** - Pre-built HTML templates
- ✅ **Bulk Notifications** - Send to multiple users
- ✅ **Automated Notifications** - Expense approvals, rejections, etc.

## Email Templates Included

1. **Welcome Email** - New user registration
2. **Expense Submitted** - Notification to approvers
3. **Expense Approved** - Notification to employee
4. **Expense Rejected** - Notification to employee
5. **Password Reset** - Password reset links
6. **Bulk Notifications** - Company-wide announcements

## Configuration Options

### Production Email Services

#### Gmail Configuration
```env
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@yourcompany.com
```

#### Outlook/Hotmail Configuration
```env
EMAIL_SERVICE=hotmail
EMAIL_USER=your-email@outlook.com
EMAIL_PASS=your-password
EMAIL_FROM=noreply@yourcompany.com
```

#### Yahoo Configuration
```env
EMAIL_SERVICE=yahoo
EMAIL_USER=your-email@yahoo.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@yourcompany.com
```

#### Custom SMTP Configuration
```env
EMAIL_SERVICE=custom
EMAIL_HOST=smtp.your-provider.com
EMAIL_PORT=587
EMAIL_USER=your-email@yourcompany.com
EMAIL_PASS=your-password
EMAIL_FROM=noreply@yourcompany.com
```

### Development Testing (Ethereal Email)

For development and testing, use Ethereal Email (free testing service):

```env
# Development settings
NODE_ENV=development
ETHEREAL_USER=ethereal.user@ethereal.email
ETHEREAL_PASS=ethereal.pass
```

## Setup Instructions

### 1. Gmail Setup (Recommended for Production)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password:**
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
3. **Configure Environment:**
   ```env
   EMAIL_SERVICE=gmail
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-16-character-app-password
   EMAIL_FROM=noreply@yourcompany.com
   ```

### 2. Outlook Setup

1. **Enable App Passwords** in your Microsoft account
2. **Configure Environment:**
   ```env
   EMAIL_SERVICE=hotmail
   EMAIL_USER=your-email@outlook.com
   EMAIL_PASS=your-app-password
   EMAIL_FROM=noreply@yourcompany.com
   ```

### 3. Development Testing

1. **Use Ethereal Email for testing:**
   ```env
   NODE_ENV=development
   ETHEREAL_USER=ethereal.user@ethereal.email
   ETHEREAL_PASS=ethereal.pass
   ```

2. **Check console for preview URLs** when sending emails

## API Endpoints

### Email Management Endpoints

#### Test Email
```http
POST /api/email/test
Authorization: Bearer <token>
Content-Type: application/json

{
  "to": "test@example.com",
  "subject": "Test Email",
  "message": "This is a test email"
}
```

#### Send Welcome Email
```http
POST /api/email/welcome/:userId
Authorization: Bearer <admin-token>
```

#### Bulk Notification
```http
POST /api/email/bulk-notification
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "subject": "Company Announcement",
  "message": "<h1>Important Update</h1><p>Please read this announcement.</p>",
  "recipients": ["user1@company.com", "user2@company.com"]
}
```

#### Company Notification
```http
POST /api/email/company-notification
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "subject": "Policy Update",
  "message": "<h1>New Expense Policy</h1><p>Please review the updated policy.</p>",
  "roles": ["employee", "manager"],
  "departments": ["IT", "Finance"]
}
```

#### Password Reset
```http
POST /api/email/password-reset
Content-Type: application/json

{
  "email": "user@company.com"
}
```

#### Email Status
```http
GET /api/email/status
Authorization: Bearer <token>
```

## Automated Email Triggers

### 1. User Registration
- **Trigger:** New user created by admin
- **Recipients:** New user
- **Template:** Welcome email with company info

### 2. Expense Submission
- **Trigger:** Employee submits expense for approval
- **Recipients:** Assigned approvers (managers)
- **Template:** Expense details and approval link

### 3. Expense Approval
- **Trigger:** Manager approves expense
- **Recipients:** Employee who submitted
- **Template:** Approval confirmation with amount

### 4. Expense Rejection
- **Trigger:** Manager rejects expense
- **Recipients:** Employee who submitted
- **Template:** Rejection with reason and feedback

## Email Templates Customization

### Template Structure
All email templates are located in `backend/services/emailService.js`:

```javascript
getWelcomeEmailTemplate(user, company) {
  return {
    subject: `Welcome to ${company.name} Expense Management System`,
    html: `<!-- HTML template -->`,
    text: `<!-- Plain text template -->`
  };
}
```

### Customizing Templates

1. **Modify HTML Templates:**
   - Update the `html` property in template methods
   - Use inline CSS for email compatibility
   - Include company branding and colors

2. **Add New Templates:**
   ```javascript
   getCustomTemplate(data) {
     return {
       subject: 'Custom Subject',
       html: '<div>Custom HTML</div>',
       text: 'Custom plain text'
     };
   }
   ```

3. **Template Variables:**
   - `user.firstName`, `user.lastName`, `user.email`
   - `company.name`, `company.currency`
   - `expense.amount`, `expense.description`
   - Dynamic content based on context

## Testing Email Service

### 1. Development Testing
```bash
# Start the server
npm run dev

# Send test email via API
curl -X POST http://localhost:5000/api/email/test \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"to": "test@example.com", "subject": "Test", "message": "Hello World"}'
```

### 2. Check Console Output
In development mode, you'll see:
```
Preview URL: https://ethereal.email/message/...
```

### 3. Production Testing
- Use real email addresses
- Check spam folders
- Verify email delivery
- Test with different email providers

## Troubleshooting

### Common Issues

1. **Authentication Failed:**
   - Check email credentials
   - Verify app passwords (Gmail)
   - Enable "Less secure apps" (if applicable)

2. **Emails Not Sending:**
   - Check network connectivity
   - Verify SMTP settings
   - Check email provider limits

3. **Emails Going to Spam:**
   - Use proper "From" address
   - Include unsubscribe links
   - Avoid spam trigger words

4. **Template Issues:**
   - Check HTML syntax
   - Test with different email clients
   - Use inline CSS

### Debug Mode
Enable detailed logging:
```env
DEBUG=nodemailer:*
```

### Email Limits
- **Gmail:** 500 emails/day (free), 2000/day (paid)
- **Outlook:** 300 emails/day
- **Yahoo:** 500 emails/day

## Security Considerations

1. **Environment Variables:**
   - Never commit email credentials
   - Use secure environment files
   - Rotate passwords regularly

2. **Email Content:**
   - Sanitize user input
   - Avoid XSS vulnerabilities
   - Use HTTPS for links

3. **Rate Limiting:**
   - Implement email rate limits
   - Prevent spam/abuse
   - Monitor email usage

## Production Deployment

### Environment Variables
```env
# Production email configuration
NODE_ENV=production
EMAIL_SERVICE=gmail
EMAIL_USER=your-production-email@gmail.com
EMAIL_PASS=your-production-app-password
EMAIL_FROM=noreply@yourcompany.com
```

### Email Service Providers
For high-volume applications, consider:
- **SendGrid** - Professional email service
- **Mailgun** - Developer-friendly API
- **Amazon SES** - AWS email service
- **Postmark** - Transactional email

### Monitoring
- Set up email delivery monitoring
- Track bounce rates
- Monitor spam complaints
- Implement email analytics

## Support

For email service issues:
1. Check the console logs
2. Verify environment configuration
3. Test with different email providers
4. Contact the development team

The email service is designed to be robust and handle failures gracefully without affecting the main application functionality.

