# Issue: Implement Content Export and Download Functionality

## 🏷️ Labels
`enhancement`, `frontend`, `backend`, `export`, `medium-priority`

## 📋 Summary
Content cards show "Download" menu items that are non-functional. Users need the ability to export their generated content in various formats for use in external platforms and applications.

## 🔍 Problem Description
**Current State:**
- `ReportCard` and `FlashcardSetCard` components show download options that do nothing
- No way to export content for use outside the application
- Users cannot backup their generated content
- Missing integration with external platforms (Medium, LinkedIn, etc.)

**User Need:**
- Export reports to Markdown, PDF, or HTML for publishing
- Download flashcards as CSV or text files for external study tools
- Copy content to clipboard for quick sharing
- Bulk export multiple pieces of content

## ✅ Acceptance Criteria

### Individual Content Export

#### Report Export Options
- [ ] **Copy to Clipboard** - Plain text and formatted HTML
- [ ] **Download as Markdown** - `.md` file with proper formatting
- [ ] **Download as PDF** - Professional formatting with metadata
- [ ] **Download as HTML** - Standalone HTML file
- [ ] **Export to Medium** - Direct posting or draft creation (future)
- [ ] **Export to LinkedIn** - Pre-formatted for platform requirements

#### Flashcard Export Options  
- [ ] **Download as CSV** - Question, Answer columns for import to Anki/Quizlet
- [ ] **Download as Text** - Plain text format for studying
- [ ] **Print-friendly format** - Clean layout for physical study cards
- [ ] **Export as JSON** - For programmatic use or backup
- [ ] **Anki deck format** - Direct import to Anki (.apkg file)

#### Ideas Export Options
- [ ] **Copy individual ideas** - One-click clipboard copy
- [ ] **Download as text list** - All ideas in categorized text file
- [ ] **Download as CSV** - Structured format with categories
- [ ] **Export to social media** - Pre-formatted for different platforms

### Bulk Export Operations
- [ ] **Select multiple items** - Checkbox interface for bulk selection
- [ ] **Export selected content** - Combine multiple items into single file
- [ ] **Full library export** - Download all user content as archive
- [ ] **Filtered export** - Export based on search/filter criteria

### Export UI Components
- [ ] **Export dropdown menu** - Replace current non-functional download buttons
- [ ] **Export progress dialog** - Show progress for large exports
- [ ] **Export history** - Track recent exports with re-download option
- [ ] **Export settings** - User preferences for default formats

## 🛠️ Technical Requirements

### Frontend Implementation
```typescript
// Export service
interface ExportOptions {
  format: 'pdf' | 'markdown' | 'html' | 'csv' | 'txt' | 'json';
  includeMetadata?: boolean;
  styling?: 'default' | 'minimal' | 'professional';
}

interface ExportService {
  exportReport(reportId: number, options: ExportOptions): Promise<Blob>;
  exportFlashcards(setId: number, options: ExportOptions): Promise<Blob>;
  exportIdeas(setId: number, options: ExportOptions): Promise<Blob>;
  bulkExport(items: ExportItem[], options: ExportOptions): Promise<Blob>;
}
```

### Backend API Endpoints
```typescript
// Export endpoints
GET /api/reports/:id/export?format=pdf&options={}
GET /api/flashcard-sets/:id/export?format=csv
GET /api/idea-sets/:id/export?format=txt
POST /api/export/bulk - { items: [], format: 'pdf', options: {} }
```

### File Generation Libraries
```typescript
// PDF generation - use jsPDF or Puppeteer
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// CSV generation - use simple string formatting
const generateCSV = (data: any[]) => {
  const headers = Object.keys(data[0]);
  const csvContent = [headers.join(','), 
    ...data.map(row => headers.map(h => row[h]).join(','))
  ].join('\n');
  return new Blob([csvContent], { type: 'text/csv' });
};
```

### Client-side File Handling
```typescript
// Download utility
const downloadFile = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Clipboard utility
const copyToClipboard = async (text: string) => {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
  } else {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
};
```

## 📁 Files to Create/Modify

### New Services
- `/client/src/services/exportService.ts` - Client-side export logic
- `/server/services/exportService.ts` - Server-side export generation
- `/client/src/utils/fileUtils.ts` - File download and clipboard utilities

### New Components
- `/client/src/components/export/ExportDropdown.tsx`
- `/client/src/components/export/ExportDialog.tsx`
- `/client/src/components/export/BulkExportDialog.tsx`
- `/client/src/components/export/ExportProgress.tsx`

### API Routes
- `/server/routers/export.router.ts` - Export endpoints

### Modified Components
- `/client/src/components/ReportCard.tsx` - Connect export functionality
- `/client/src/components/FlashcardSetCard.tsx` - Connect export functionality
- `/client/src/components/IdeaSetCard.tsx` - Connect export functionality

## 🔗 Related Issues
- Depends on: Content editing interface for metadata
- Enables: Content sharing and external platform integration
- Related to: Bulk operations and content management
- Future: Direct platform publishing (Medium, LinkedIn)

## 💡 Implementation Notes

### PDF Generation Strategy
```typescript
// Option 1: Client-side with jsPDF (faster, no server load)
const generatePDF = (content: string, metadata: any) => {
  const pdf = new jsPDF();
  pdf.setFontSize(16);
  pdf.text(metadata.title, 10, 20);
  pdf.setFontSize(12);
  pdf.text(content, 10, 40, { maxWidth: 180 });
  return pdf.output('blob');
};

// Option 2: Server-side with Puppeteer (better formatting)
app.get('/api/reports/:id/export', async (req, res) => {
  const html = generateReportHTML(report);
  const pdf = await page.pdf({ html, format: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.send(pdf);
});
```

### Format-Specific Considerations

#### Markdown Export
- Preserve formatting (bold, italic, lists)
- Include metadata as front matter
- Handle embedded links and images
- Support for code blocks and quotes

#### CSV Export for Flashcards
```csv
Question,Answer,Category,Difficulty,Tags
"What is React?","A JavaScript library for building user interfaces","Technology","Easy","web,frontend"
```

#### Anki Deck Export
- Generate .apkg file format
- Include card templates and styling
- Handle multimedia content
- Set up proper scheduling intervals

### Performance Considerations
- Generate exports client-side when possible to reduce server load
- Implement streaming for large bulk exports
- Cache generated exports for re-download
- Show progress indicators for large operations
- Limit concurrent export operations per user

## 🧪 Testing Checklist
- [ ] Test all export formats for each content type
- [ ] Test bulk export with large datasets
- [ ] Test file download in different browsers
- [ ] Test clipboard functionality across platforms
- [ ] Test export with special characters and formatting
- [ ] Test concurrent export operations
- [ ] Test export cancellation
- [ ] Test export with offline/poor connectivity

## 🎨 User Experience Requirements

### Export UI Flow
1. User clicks export button on content card
2. Dropdown shows available export formats
3. User selects format and options (if applicable)
4. Progress indicator shows during generation
5. File downloads automatically or clipboard confirmation shows
6. Success notification with option to re-download

### Visual Design
- Clear icons for different export formats
- Progress bars for long operations
- Consistent styling with app design system
- Tooltips explaining format differences
- Mobile-friendly export interface

### Error Handling
- Clear error messages for failed exports
- Retry functionality for network failures
- Graceful degradation for unsupported formats
- Help text for format-specific requirements

## 📱 Mobile Considerations
- Touch-optimized export menus
- Handle mobile file download limitations
- Optimize for mobile share sheet integration
- Consider mobile app deep links for external platforms
- Ensure export files are mobile-friendly

## 🔒 Security Considerations
- Validate export requests to prevent abuse
- Rate limit export operations
- Sanitize content before export generation
- Ensure exported files don't contain sensitive metadata
- Implement proper authentication for export endpoints

## 📈 Success Metrics
- User adoption rate of export features
- Most popular export formats
- Reduced support requests about content sharing
- Increased user retention through content portability
- Integration usage with external platforms