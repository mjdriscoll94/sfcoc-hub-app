export type LeadershipLessonStatus = 'draft' | 'published';

export type LeadershipLesson = {
  id: string;
  title: string;
  description: string;
  order: number;
  youtubeVideoId: string;
  pdfUrl: string;
  pdfFileName: string;
  status: LeadershipLessonStatus;
  captionsReviewed: boolean;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
};

export type LeadershipLessonInput = Pick<
  LeadershipLesson,
  'title' | 'description' | 'youtubeVideoId' | 'pdfUrl' | 'pdfFileName' | 'status' | 'captionsReviewed'
>;
