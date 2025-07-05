import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router } from 'wouter';
import VideoDetailPage from '../pages/video-detail';
import { apiRequest } from '../lib/queryClient';

// Mock the apiRequest function
vi.mock('../lib/queryClient', () => ({
  apiRequest: vi.fn(),
}));

// Mock toast
vi.mock('../hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockApiRequest = apiRequest as any;

const mockVideo = {
  id: 1,
  userId: 'test-user-1',
  youtubeId: 'test-video-123',
  title: 'Test Video: AI and Machine Learning',
  channelTitle: 'Test Channel',
  description: 'Test video description',
  thumbnail: 'test-thumbnail.jpg',
  transcript: 'This is a test transcript about artificial intelligence.',
  createdAt: new Date().toISOString(),
};

const mockSummary = {
  id: 1,
  videoId: 1,
  summary: 'This video discusses artificial intelligence and machine learning concepts.',
  keyTopics: ['AI', 'Machine Learning', 'Technology'],
  createdAt: new Date().toISOString(),
};

const mockReports = [
  {
    id: 1,
    videoId: 1,
    title: 'AI Revolution in Modern Technology',
    content: 'This is a comprehensive report about AI and its impact...',
    type: 'medium',
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    videoId: 1,
    title: 'LinkedIn Post: AI Insights',
    content: 'Quick insights about AI for professionals...',
    type: 'linkedin',
    createdAt: new Date().toISOString(),
  },
];

const mockFlashcardSets = [
  {
    id: 1,
    videoId: 1,
    title: 'AI Fundamentals Flashcards',
    description: 'Key concepts in artificial intelligence',
    createdAt: new Date().toISOString(),
  },
];

const mockIdeaSets = [
  {
    id: 1,
    videoId: 1,
    type: 'blog_titles',
    createdAt: new Date().toISOString(),
  },
];

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <Router base="/videos/1">{children}</Router>
    </QueryClientProvider>
  );
};

describe('VideoDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default API responses
    mockApiRequest.mockImplementation((method: string, url: string) => {
      if (url.includes('/videos/1') && method === 'GET') {
        if (url.endsWith('/videos/1')) {
          return Promise.resolve({ json: () => Promise.resolve(mockVideo) });
        }
        if (url.endsWith('/summary')) {
          return Promise.resolve({ json: () => Promise.resolve(mockSummary) });
        }
        if (url.endsWith('/reports')) {
          return Promise.resolve({ json: () => Promise.resolve(mockReports) });
        }
        if (url.endsWith('/flashcard-sets')) {
          return Promise.resolve({ json: () => Promise.resolve(mockFlashcardSets) });
        }
        if (url.endsWith('/idea-sets')) {
          return Promise.resolve({ json: () => Promise.resolve(mockIdeaSets) });
        }
        if (url.endsWith('/transcript')) {
          return Promise.resolve({
            json: () => Promise.resolve({
              format: 'text-stored',
              data: { transcript: mockVideo.transcript }
            })
          });
        }
        if (url.endsWith('/additional-text')) {
          return Promise.resolve({
            json: () => Promise.resolve({
              success: true,
              data: { videoId: 1, entries: [] }
            })
          });
        }
      }
      return Promise.reject(new Error('Not found'));
    });
  });

  describe('Tab Navigation', () => {
    it('should render all content generation tabs', async () => {
      render(
        <TestWrapper>
          <VideoDetailPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Transcript')).toBeInTheDocument();
        expect(screen.getByText('Summary')).toBeInTheDocument();
        expect(screen.getByText('Reports')).toBeInTheDocument();
        expect(screen.getByText('Flashcards')).toBeInTheDocument();
        expect(screen.getByText('Ideas')).toBeInTheDocument();
      });
    });

    it('should switch between tabs correctly', async () => {
      render(
        <TestWrapper>
          <VideoDetailPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Transcript')).toBeInTheDocument();
      });

      // Click on Reports tab
      fireEvent.click(screen.getByText('Reports'));
      await waitFor(() => {
        expect(screen.getByText('Generated Reports')).toBeInTheDocument();
      });

      // Click on Flashcards tab
      fireEvent.click(screen.getByText('Flashcards'));
      await waitFor(() => {
        expect(screen.getByText('Generated Flashcard Sets')).toBeInTheDocument();
      });
    });
  });

  describe('Reports Tab', () => {
    it('should display generated reports correctly', async () => {
      render(
        <TestWrapper>
          <VideoDetailPage />
        </TestWrapper>
      );

      // Switch to Reports tab
      fireEvent.click(screen.getByText('Reports'));

      await waitFor(() => {
        expect(screen.getByText('Generated Reports')).toBeInTheDocument();
        expect(screen.getByText('AI Revolution in Modern Technology')).toBeInTheDocument();
        expect(screen.getByText('LinkedIn Post: AI Insights')).toBeInTheDocument();
        expect(screen.getByText('Medium Report')).toBeInTheDocument();
        expect(screen.getByText('Linkedin Report')).toBeInTheDocument();
      });
    });

    it('should handle Medium report generation', async () => {
      mockApiRequest.mockImplementation((method: string, url: string) => {
        if (method === 'POST' && url.includes('generate-report?type=medium')) {
          return Promise.resolve({
            json: () => Promise.resolve({
              success: true,
              data: { id: 3, title: 'New Medium Report', content: 'Generated content...', type: 'medium' }
            })
          });
        }
        return Promise.resolve({ json: () => Promise.resolve([]) });
      });

      render(
        <TestWrapper>
          <VideoDetailPage />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Reports'));

      await waitFor(() => {
        const generateButton = screen.getByText('Generate Medium-Style Article');
        expect(generateButton).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Generate Medium-Style Article'));

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('POST', '/api/videos/1/generate-report?type=medium');
      });
    });

    it('should handle LinkedIn post generation', async () => {
      mockApiRequest.mockImplementation((method: string, url: string) => {
        if (method === 'POST' && url.includes('generate-report?type=linkedin')) {
          return Promise.resolve({
            json: () => Promise.resolve({
              success: true,
              data: { id: 4, title: 'New LinkedIn Post', content: 'Generated content...', type: 'linkedin' }
            })
          });
        }
        return Promise.resolve({ json: () => Promise.resolve([]) });
      });

      render(
        <TestWrapper>
          <VideoDetailPage />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Reports'));

      await waitFor(() => {
        const generateButton = screen.getByText('Generate LinkedIn Post');
        expect(generateButton).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Generate LinkedIn Post'));

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('POST', '/api/videos/1/generate-report?type=linkedin');
      });
    });
  });

  describe('Flashcards Tab', () => {
    it('should display generated flashcard sets', async () => {
      render(
        <TestWrapper>
          <VideoDetailPage />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Flashcards'));

      await waitFor(() => {
        expect(screen.getByText('Generated Flashcard Sets')).toBeInTheDocument();
        expect(screen.getByText('AI Fundamentals Flashcards')).toBeInTheDocument();
        expect(screen.getByText('Key concepts in artificial intelligence')).toBeInTheDocument();
      });
    });

    it('should handle flashcard generation', async () => {
      mockApiRequest.mockImplementation((method: string, url: string) => {
        if (method === 'POST' && url.includes('generate-flashcards')) {
          return Promise.resolve({
            json: () => Promise.resolve({
              success: true,
              data: { id: 2, title: 'New Flashcard Set', description: 'Generated flashcards...' }
            })
          });
        }
        return Promise.resolve({ json: () => Promise.resolve([]) });
      });

      render(
        <TestWrapper>
          <VideoDetailPage />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Flashcards'));

      await waitFor(() => {
        const generateButton = screen.getByText('Generate Flashcard Set');
        expect(generateButton).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Generate Flashcard Set'));

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('POST', '/api/videos/1/generate-flashcards');
      });
    });
  });

  describe('Ideas Tab', () => {
    it('should display generated idea sets', async () => {
      render(
        <TestWrapper>
          <VideoDetailPage />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Ideas'));

      await waitFor(() => {
        expect(screen.getByText('Generated Ideas')).toBeInTheDocument();
        expect(screen.getByText('Blog titles')).toBeInTheDocument();
      });
    });

    it('should handle blog ideas generation', async () => {
      mockApiRequest.mockImplementation((method: string, url: string) => {
        if (method === 'POST' && url.includes('generate-ideas?type=blog_titles')) {
          return Promise.resolve({
            json: () => Promise.resolve({
              success: true,
              data: { id: 2, type: 'blog_titles' }
            })
          });
        }
        return Promise.resolve({ json: () => Promise.resolve([]) });
      });

      render(
        <TestWrapper>
          <VideoDetailPage />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Ideas'));

      await waitFor(() => {
        const generateButton = screen.getByText('Generate Blog Title Ideas');
        expect(generateButton).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Generate Blog Title Ideas'));

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('POST', '/api/videos/1/generate-ideas?type=blog_titles');
      });
    });

    it('should handle social hooks generation', async () => {
      mockApiRequest.mockImplementation((method: string, url: string) => {
        if (method === 'POST' && url.includes('generate-ideas?type=social_media_hooks')) {
          return Promise.resolve({
            json: () => Promise.resolve({
              success: true,
              data: { id: 3, type: 'social_media_hooks' }
            })
          });
        }
        return Promise.resolve({ json: () => Promise.resolve([]) });
      });

      render(
        <TestWrapper>
          <VideoDetailPage />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Ideas'));

      await waitFor(() => {
        const generateButton = screen.getByText('Generate Social Media Hooks');
        expect(generateButton).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Generate Social Media Hooks'));

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('POST', '/api/videos/1/generate-ideas?type=social_media_hooks');
      });
    });
  });

  describe('Summary Tab', () => {
    it('should display generated summary', async () => {
      render(
        <TestWrapper>
          <VideoDetailPage />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Summary'));

      await waitFor(() => {
        expect(screen.getByText('This video discusses artificial intelligence and machine learning concepts.')).toBeInTheDocument();
        expect(screen.getByText('AI')).toBeInTheDocument();
        expect(screen.getByText('Machine Learning')).toBeInTheDocument();
      });
    });

    it('should handle summary generation', async () => {
      mockApiRequest.mockImplementation((method: string, url: string) => {
        if (method === 'POST' && url.includes('generate-enhanced-summary')) {
          return Promise.resolve({
            json: () => Promise.resolve({
              success: true,
              data: { id: 2, summary: 'New generated summary...', keyTopics: ['AI', 'ML'] }
            })
          });
        }
        if (url.endsWith('/summary')) {
          return Promise.resolve({ json: () => Promise.resolve(null) }); // No existing summary
        }
        return Promise.resolve({ json: () => Promise.resolve([]) });
      });

      render(
        <TestWrapper>
          <VideoDetailPage />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Summary'));

      await waitFor(() => {
        const generateButton = screen.getByText('Generate Summary');
        expect(generateButton).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Generate Summary'));

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('POST', '/api/videos/1/generate-enhanced-summary', expect.any(Object));
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockApiRequest.mockImplementation(() => {
        return Promise.reject(new Error('Network error'));
      });

      render(
        <TestWrapper>
          <VideoDetailPage />
        </TestWrapper>
      );

      // The component should still render even if API calls fail
      await waitFor(() => {
        expect(screen.getByText('Transcript')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state during generation', async () => {
      let resolvePromise: (value: any) => void;
      const generationPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockApiRequest.mockImplementation((method: string, url: string) => {
        if (method === 'POST' && url.includes('generate-report')) {
          return generationPromise;
        }
        return Promise.resolve({ json: () => Promise.resolve([]) });
      });

      render(
        <TestWrapper>
          <VideoDetailPage />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Reports'));

      await waitFor(() => {
        const generateButton = screen.getByText('Generate Medium-Style Article');
        expect(generateButton).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Generate Medium-Style Article'));

      // Button should be disabled during generation
      await waitFor(() => {
        const generateButton = screen.getByText('Generate Medium-Style Article');
        expect(generateButton).toBeDisabled();
      });

      // Resolve the promise
      resolvePromise!({
        json: () => Promise.resolve({
          success: true,
          data: { id: 3, title: 'Generated Report', content: 'Content...', type: 'medium' }
        })
      });
    });
  });
});