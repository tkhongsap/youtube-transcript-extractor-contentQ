import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { type Video, type Report, type FlashcardSet } from "@shared/schema";
import VideoUrlInput from "@/components/video/VideoUrlInput";
import VideoCard from "@/components/video/VideoCard";
import ContentTypeTabs from "@/components/content/ContentTypeTabs";
// ReportCard component removed
import FlashcardSetCard from "@/components/content/FlashcardSetCard";
import IdeaList from "@/components/content/IdeaList";
import { Skeleton } from "@/components/ui/skeleton";

const Dashboard = () => {
  const { user } = useAuth();
  const firstName = user?.firstName || "there";

  // Fetch recent videos
  const { data: recentVideos, isLoading: isLoadingVideos } = useQuery<Video[]>({
    queryKey: ["/api/videos?limit=6"],
    refetchInterval: false,
  });

  // Fetch recent reports
  const { data: recentReports, isLoading: isLoadingReports } = useQuery<Report[]>({
    queryKey: ["/api/reports?limit=4"],
    refetchInterval: false,
  });

  // Fetch recent flashcard sets
  const { data: recentFlashcardSets, isLoading: isLoadingFlashcards } = useQuery<FlashcardSet[]>({
    queryKey: ["/api/flashcard-sets?limit=6"],
    refetchInterval: false,
  });

  // Fetch recent blog idea sets
  const { data: recentBlogIdeas, isLoading: isLoadingBlogIdeas } = useQuery({
    queryKey: ["/api/idea-sets?type=blog_titles&limit=1"],
    refetchInterval: false,
  });

  // Fetch recent social media hook sets
  const { data: recentSocialHooks, isLoading: isLoadingSocialHooks } = useQuery({
    queryKey: ["/api/idea-sets?type=social_media_hooks&limit=1"],
    refetchInterval: false,
  });

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        {/* Welcome Section */}
        <section className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Welcome back, {firstName}!</h1>
          <p className="text-gray-600">Transform YouTube videos into valuable content assets with AI</p>
        </section>

        {/* Input Video URL Card */}
        <div className="bg-white rounded-lg shadow-md p-5 mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Process a YouTube Video</h2>
          <VideoUrlInput />
        </div>

        {/* Recently Processed */}
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recently Processed</h2>
        
        {/* Video Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {isLoadingVideos ? (
            // Loading skeletons
            Array(3).fill(0).map((_, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
                <Skeleton className="w-full h-40" />
                <div className="p-4">
                  <Skeleton className="h-5 w-2/3 mb-1" />
                  <Skeleton className="h-4 w-full mb-3" />
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                </div>
              </div>
            ))
          ) : (
            recentVideos?.length ? (
              recentVideos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))
            ) : (
              <div className="col-span-full text-center py-10">
                <span className="material-icons text-4xl text-gray-300 mb-2">videocam_off</span>
                <p className="text-gray-500">No videos processed yet. Try adding one above!</p>
              </div>
            )
          )}
        </div>
        
        {/* Recently Created Content */}
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Recent Content</h2>
        
        {/* Content Type Tabs */}
        <ContentTypeTabs
          reportsContent={
            isLoadingReports ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array(2).fill(0).map((_, index) => (
                  <div key={index} className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-2/3 mb-3" />
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-3 w-36" />
                      <div className="flex space-x-2">
                        <Skeleton className="h-5 w-5 rounded-full" />
                        <Skeleton className="h-5 w-5 rounded-full" />
                        <Skeleton className="h-5 w-5 rounded-full" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {recentReports?.length ? (
                  recentReports.map((report) => (
                    <div key={report.id} className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">{report.title}</h4>
                      <p className="text-gray-600 text-sm">Report content preview...</p>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-10">
                    <span className="material-icons text-4xl text-gray-300 mb-2">description</span>
                    <p className="text-gray-500">No reports generated yet. Process a video to create content!</p>
                  </div>
                )}
              </div>
            )
          }
          flashcardsContent={
            isLoadingFlashcards ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Array(3).fill(0).map((_, index) => (
                  <div key={index} className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full mb-3" />
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-5 w-16" />
                      <div className="flex space-x-2">
                        <Skeleton className="h-5 w-5 rounded-full" />
                        <Skeleton className="h-5 w-5 rounded-full" />
                        <Skeleton className="h-5 w-5 rounded-full" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {recentFlashcardSets?.length ? (
                  recentFlashcardSets.map((set) => (
                    <FlashcardSetCard key={set.id} flashcardSet={set} />
                  ))
                ) : (
                  <div className="col-span-full text-center py-10">
                    <span className="material-icons text-4xl text-gray-300 mb-2">style</span>
                    <p className="text-gray-500">No flashcard sets created yet. Process a video to generate flashcards!</p>
                  </div>
                )}
              </div>
            )
          }
          ideasContent={
            isLoadingBlogIdeas || isLoadingSocialHooks ? (
              <div className="space-y-4">
                {Array(2).fill(0).map((_, index) => (
                  <div key={index} className="bg-white rounded-lg shadow-md border border-gray-200">
                    <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-36" />
                    </div>
                    <ul className="divide-y divide-gray-200">
                      {Array(3).fill(0).map((_, i) => (
                        <li key={i} className="px-4 py-3">
                          <Skeleton className="h-5 w-full mb-1" />
                          <div className="mt-1 flex justify-between items-center">
                            <Skeleton className="h-3 w-36" />
                            <Skeleton className="h-5 w-5 rounded-full" />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4 mb-8">
                {recentBlogIdeas?.length || recentSocialHooks?.length ? (
                  <>
                    {recentBlogIdeas?.length > 0 && (
                      <IdeaList
                        title="Blog Title Ideas"
                        ideaSetId={recentBlogIdeas[0].id}
                        source={recentBlogIdeas[0].videoTitle}
                        date={new Date(recentBlogIdeas[0].createdAt)}
                      />
                    )}
                    {recentSocialHooks?.length > 0 && (
                      <IdeaList
                        title="Social Media Hooks"
                        ideaSetId={recentSocialHooks[0].id}
                        source={recentSocialHooks[0].videoTitle}
                        date={new Date(recentSocialHooks[0].createdAt)}
                      />
                    )}
                  </>
                ) : (
                  <div className="text-center py-10">
                    <span className="material-icons text-4xl text-gray-300 mb-2">lightbulb</span>
                    <p className="text-gray-500">No content ideas generated yet. Process a video to mine ideas!</p>
                  </div>
                )}
              </div>
            )
          }
        />
      </div>
    </main>
  );
};

export default Dashboard;
