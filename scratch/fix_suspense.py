import re
import sys

with open('pages/CategoryChatPage.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# Replace self-closing tags with Suspense wrappers
c = re.sub(r'(<FeedbackModal\b[^>]*\/>)', r'<React.Suspense fallback={null}>\1</React.Suspense>', c)
c = re.sub(r'(<DeleteSessionModal\b[^>]*\/>)', r'<React.Suspense fallback={null}>\1</React.Suspense>', c)
c = re.sub(r'(<RenameSessionModal\b[^>]*\/>)', r'<React.Suspense fallback={null}>\1</React.Suspense>', c)
c = re.sub(r'(<ClearWorkspaceModal\b[^>]*\/>)', r'<React.Suspense fallback={null}>\1</React.Suspense>', c)
c = re.sub(r'(<ShareModal\b[^>]*\/>)', r'<React.Suspense fallback={null}>\1</React.Suspense>', c)
c = re.sub(r'(<ImagePreviewModal\b[^>]*\/>)', r'<React.Suspense fallback={null}>\1</React.Suspense>', c)
c = re.sub(r'(<FilePreview\b[^>]*\/>)', r'<React.Suspense fallback={null}>\1</React.Suspense>', c)
c = re.sub(r'(<OrgUserManager\b[^>]*\/>)', r'<React.Suspense fallback={null}>\1</React.Suspense>', c)
c = re.sub(r'(<BannedUserModal\b[^>]*\/>)', r'<React.Suspense fallback={null}>\1</React.Suspense>', c)
c = re.sub(r'(<WarningUserModal\b[^>]*\/>)', r'<React.Suspense fallback={null}>\1</React.Suspense>', c)
c = re.sub(r'(<UserProfileModal\b[^>]*\/>)', r'<React.Suspense fallback={null}>\1</React.Suspense>', c)
c = re.sub(r'(<ChatSummaryPanel\b[^>]*\/>)', r'<React.Suspense fallback={null}>\1</React.Suspense>', c)
c = re.sub(r'(<InputModal\b[^>]*\/>)', r'<React.Suspense fallback={null}>\1</React.Suspense>', c)

# GlobalWorkspaceView might be used multiple times? Actually it's just once
c = re.sub(r'(<GlobalWorkspaceView\b[^>]*\/>)', r'<React.Suspense fallback={<div className="w-full h-full flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin"/></div>}>\1</React.Suspense>', c)

# AITrainingManager
c = re.sub(r'(<AITrainingManager\b[^>]*\/>)', r'<React.Suspense fallback={<div className="w-full h-full flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin"/></div>}>\1</React.Suspense>', c)

with open('pages/CategoryChatPage.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

print('Done')
