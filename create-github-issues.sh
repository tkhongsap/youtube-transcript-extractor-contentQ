#!/bin/bash

# GitHub Issues Creation Script for Content Spark AI
# Repository: https://github.com/tkhongsap/youtube-transcript-extractor-contentQ

echo "🚀 Creating GitHub Issues for Content Spark AI"
echo "=============================================="
echo ""
echo "This script will help you create all 10 GitHub issues."
echo "You'll need to run this manually or use GitHub CLI if available."
echo ""

# Check if GitHub CLI is available
if command -v gh &> /dev/null; then
    echo "✅ GitHub CLI detected! Creating issues automatically..."
    
    # Issue #1
    echo "Creating Issue #1: Missing CRUD Operations..."
    gh issue create \
        --title "Implement Missing CRUD Operations for Content Management" \
        --body-file "./github-issues/01-missing-crud-endpoints.md" \
        --label "enhancement,backend,api,high-priority" \
        --milestone "Phase 1: Core CRUD Foundation"
    
    # Issue #2
    echo "Creating Issue #2: Content Regeneration Endpoints..."
    gh issue create \
        --title "Implement Individual Content Regeneration API Endpoints" \
        --body-file "./github-issues/02-content-regeneration-endpoints.md" \
        --label "enhancement,backend,api,ai-integration,high-priority" \
        --milestone "Phase 1: Core CRUD Foundation"
    
    # Issue #3
    echo "Creating Issue #3: Video Management..."
    gh issue create \
        --title "Implement Video Management and User Profile CRUD Operations" \
        --body-file "./github-issues/03-video-management-endpoints.md" \
        --label "enhancement,backend,api,user-management,high-priority" \
        --milestone "Phase 1: Core CRUD Foundation"
    
    # Issue #4
    echo "Creating Issue #4: Frontend Pages..."
    gh issue create \
        --title "Implement Missing Frontend Pages and Fix Broken Navigation" \
        --body-file "./github-issues/04-missing-frontend-pages.md" \
        --label "enhancement,frontend,ui/ux,navigation,high-priority" \
        --milestone "Phase 2: Frontend Foundation"
    
    # Issue #5
    echo "Creating Issue #5: Content Editing Interface..."
    gh issue create \
        --title "Implement Content Editing and Management Interface" \
        --body-file "./github-issues/05-content-editing-interface.md" \
        --label "enhancement,frontend,ui/ux,content-management,high-priority" \
        --milestone "Phase 2: Frontend Foundation"
    
    # Issue #6
    echo "Creating Issue #6: Export Functionality..."
    gh issue create \
        --title "Implement Content Export and Download Functionality" \
        --body-file "./github-issues/06-export-download-functionality.md" \
        --label "enhancement,frontend,backend,export,medium-priority" \
        --milestone "Phase 3: Content Management"
    
    # Issue #7
    echo "Creating Issue #7: Search System..."
    gh issue create \
        --title "Implement Global Search and Filtering System" \
        --body-file "./github-issues/07-search-filter-system.md" \
        --label "enhancement,frontend,backend,search,filtering,medium-priority" \
        --milestone "Phase 3: Content Management"
    
    # Issue #8
    echo "Creating Issue #8: Organization System..."
    gh issue create \
        --title "Implement Content Organization and Tagging System" \
        --body-file "./github-issues/08-content-organization-system.md" \
        --label "enhancement,frontend,backend,organization,tagging,medium-priority" \
        --milestone "Phase 3: Content Management"
    
    # Issue #9
    echo "Creating Issue #9: User Settings..."
    gh issue create \
        --title "Implement User Profile and Settings Management" \
        --body-file "./github-issues/09-user-preferences-settings.md" \
        --label "enhancement,frontend,backend,user-management,settings,medium-priority" \
        --milestone "Phase 4: User Experience"
    
    # Issue #10
    echo "Creating Issue #10: Mobile Improvements..."
    gh issue create \
        --title "Improve Mobile Responsiveness and Touch Interface" \
        --body-file "./github-issues/10-mobile-responsiveness-improvements.md" \
        --label "enhancement,frontend,mobile,ui/ux,accessibility,medium-priority" \
        --milestone "Phase 4: User Experience"
    
    echo ""
    echo "✅ All 10 GitHub issues have been created successfully!"
    echo "📋 View them at: https://github.com/tkhongsap/youtube-transcript-extractor-contentQ/issues"
    
else
    echo "❌ GitHub CLI not found."
    echo ""
    echo "📋 Manual Issue Creation Instructions:"
    echo "====================================="
    echo ""
    echo "Go to: https://github.com/tkhongsap/youtube-transcript-extractor-contentQ/issues"
    echo "Click 'New Issue' for each of the following:"
    echo ""
    
    echo "1. Issue #1: Implement Missing CRUD Operations for Content Management"
    echo "   - Copy content from: ./github-issues/01-missing-crud-endpoints.md"
    echo "   - Labels: enhancement, backend, api, high-priority"
    echo ""
    
    echo "2. Issue #2: Implement Individual Content Regeneration API Endpoints"
    echo "   - Copy content from: ./github-issues/02-content-regeneration-endpoints.md"
    echo "   - Labels: enhancement, backend, api, ai-integration, high-priority"
    echo ""
    
    echo "3. Issue #3: Implement Video Management and User Profile CRUD Operations"
    echo "   - Copy content from: ./github-issues/03-video-management-endpoints.md"
    echo "   - Labels: enhancement, backend, api, user-management, high-priority"
    echo ""
    
    echo "4. Issue #4: Implement Missing Frontend Pages and Fix Broken Navigation"
    echo "   - Copy content from: ./github-issues/04-missing-frontend-pages.md"
    echo "   - Labels: enhancement, frontend, ui/ux, navigation, high-priority"
    echo ""
    
    echo "5. Issue #5: Implement Content Editing and Management Interface"
    echo "   - Copy content from: ./github-issues/05-content-editing-interface.md"
    echo "   - Labels: enhancement, frontend, ui/ux, content-management, high-priority"
    echo ""
    
    echo "6. Issue #6: Implement Content Export and Download Functionality"
    echo "   - Copy content from: ./github-issues/06-export-download-functionality.md"
    echo "   - Labels: enhancement, frontend, backend, export, medium-priority"
    echo ""
    
    echo "7. Issue #7: Implement Global Search and Filtering System"
    echo "   - Copy content from: ./github-issues/07-search-filter-system.md"
    echo "   - Labels: enhancement, frontend, backend, search, filtering, medium-priority"
    echo ""
    
    echo "8. Issue #8: Implement Content Organization and Tagging System"
    echo "   - Copy content from: ./github-issues/08-content-organization-system.md"
    echo "   - Labels: enhancement, frontend, backend, organization, tagging, medium-priority"
    echo ""
    
    echo "9. Issue #9: Implement User Profile and Settings Management"
    echo "   - Copy content from: ./github-issues/09-user-preferences-settings.md"
    echo "   - Labels: enhancement, frontend, backend, user-management, settings, medium-priority"
    echo ""
    
    echo "10. Issue #10: Improve Mobile Responsiveness and Touch Interface"
    echo "    - Copy content from: ./github-issues/10-mobile-responsiveness-improvements.md"
    echo "    - Labels: enhancement, frontend, mobile, ui/ux, accessibility, medium-priority"
    echo ""
    
    echo "📋 For easy copy-paste, check the ISSUE_INDEX.md file for quick titles!"
fi