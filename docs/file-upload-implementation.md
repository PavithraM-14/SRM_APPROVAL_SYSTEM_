# File Upload Implementation for Clarification Workflow

## Overview
This document describes the complete file upload functionality implemented for the SRM Approval System's query workflow. The implementation provides secure file upload, validation, and download capabilities specifically for query responses.

## Recent Updates

### Leave Request Workflow Enhancement
- **Leave Detection**: Requests with "leave" in the title (case-insensitive) now bypass Institution Manager
- **Direct Routing**: Leave requests go directly to VP Admin for approval
- **Workflow Optimization**: Streamlined approval process for time-sensitive leave requests

### File Upload Restrictions for Queries
- **PDF Only**: Clarification file uploads now restricted to PDF format only
- **Enhanced Security**: Stricter validation for query documents
- **Context-Aware Validation**: Different file type rules for regular vs query uploads

## Features Implemented

### 1. Secure File Upload API (`/api/upload`)
- **Endpoint**: `POST /api/upload`
- **Purpose**: Handle file uploads during query responses
- **Security**: File type validation, size limits, secure filename generation
- **Storage**: Files stored in `/public/uploads/queries/`
- **Context-Aware**: Supports `isQuery` parameter for PDF-only validation

### 2. Secure File Download API (`/api/download`)
- **Endpoint**: `GET /api/download?file={filepath}`
- **Purpose**: Secure file downloads with path validation
- **Security**: Only allows downloads from `/uploads/` directory
- **Features**: Proper MIME type detection, secure headers

### 3. FileUpload Component
- **Location**: `components/FileUpload.tsx`
- **Features**: 
  - Drag & drop interface
  - Multiple file selection
  - Real-time upload progress
  - Context-aware file type validation (PDF-only for queries)
  - File management (add/remove)
  - Visual feedback and error handling

### 4. File Validation Library
- **Location**: `lib/file-validation.ts`
- **Features**:
  - File size validation (10MB limit)
  - Context-aware MIME type validation
  - File extension validation
  - Filename sanitization
  - Secure filename generation
  - Separate validation rules for queries (PDF-only)

## File Upload Restrictions

### Regular Uploads
- **Documents**: PDF, DOC, DOCX, XLS, XLSX, TXT
- **Images**: JPG, JPEG, PNG, GIF

### Clarification Uploads (NEW)
- **Documents**: PDF ONLY
- **Rationale**: Standardized format for official query documents

### Size Limits
- **Per File**: 10MB maximum
- **Per Upload**: 5 files maximum

### Security Features
- Filename sanitization to prevent path traversal
- Context-aware MIME type validation
- File extension validation
- Secure random filename generation
- Upload directory isolation

## Leave Request Workflow (NEW)

### Detection Logic
```javascript
const isLeaveRequest = validatedData.title.toLowerCase().includes('leave');
```

### Routing Changes
- **Regular Requests**: Requester → Institution Manager → Parallel Verification → ...
- **Leave Requests**: Requester → VP Admin → HOI → Dean → Approved

### Benefits
- Faster processing for time-sensitive leave requests
- Reduced bureaucratic overhead
- Direct access to decision makers

## Integration Points

### 1. Request Creation API
- **Enhanced Logic**: Automatic detection of leave requests
- **Smart Routing**: Context-aware initial status assignment
- **Audit Trail**: Proper logging of routing decisions

### 2. QueryModal Component
- Integrated FileUpload component with PDF-only restriction
- Only requesters can upload files during query responses
- Clear messaging about PDF-only requirement

### 3. ApprovalHistory Component
- Updated to use secure download links
- Displays both original attachments and query attachments
- Proper file type icons and download buttons

### 4. DeanQueryModal Component
- Updated download links for secure file access
- Maintains existing functionality with enhanced security

## API Usage Examples

### Upload Files (Clarification Context)
```javascript
const formData = new FormData();
files.forEach(file => formData.append('files', file));
formData.append('isQuery', 'true'); // PDF-only validation

const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData
});
```

### Create Leave Request
```javascript
const requestData = {
  title: 'Annual Leave Request - 5 Days', // Will be detected as leave
  purpose: 'Family vacation',
  // ... other fields
};
// Will automatically route to VP_APPROVAL status
```

## File Storage Structure
```
public/
└── uploads/
    └── queries/
        ├── .gitkeep
        └── [uploaded PDF files with secure names]
```

## Security Considerations

### 1. File Validation
- Context-aware validation (PDF-only for queries)
- MIME type and extension checking
- Size limit enforcement

### 2. Leave Request Security
- Case-insensitive detection prevents bypass attempts
- Proper audit logging of routing decisions
- Maintains all existing security checks

### 3. Secure Storage
- Files stored with randomized names
- Original filenames sanitized
- Upload directory isolated from application code

### 4. Access Control
- Download API validates file paths
- Only allows access to uploads directory
- Proper error handling for unauthorized access

## Testing

### Leave Request Testing
1. Create requests with titles containing "leave", "LEAVE", "Leave"
2. Verify they bypass Institution Manager
3. Check they appear in VP's pending approvals
4. Test mixed case scenarios

### PDF-Only Upload Testing
1. Test query uploads with PDF files (should work)
2. Test query uploads with DOC/XLS files (should fail)
3. Verify error messages are clear and helpful
4. Test regular uploads still accept all file types

## Future Enhancements

### Leave Request Improvements
1. **Leave Type Detection**: Detect specific leave types (medical, annual, emergency)
2. **Calendar Integration**: Check for conflicts and availability
3. **Delegation Rules**: Automatic delegation during leave periods
4. **Leave Balance**: Integration with HR systems for balance checking

### File Upload Improvements
1. **Digital Signatures**: PDF signature validation for official documents
2. **OCR Integration**: Text extraction from uploaded PDFs
3. **Version Control**: Track document versions and changes
4. **Compliance Checking**: Automatic compliance validation for uploaded documents

This implementation provides enhanced workflow efficiency for leave requests while maintaining strict security standards for query document uploads.