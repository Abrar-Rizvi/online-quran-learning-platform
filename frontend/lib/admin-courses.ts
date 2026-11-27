export interface AdminCourseSummary {
  id: number;
  name: string;
  slug: string;
  category: string | null;
  image_path: string | null;
  meta_title: string | null;
  meta_description: string | null;
  has_seo_content: boolean;
}

export interface AdminCourseDetail extends Omit<AdminCourseSummary, "has_seo_content"> {
  description: string | null;
  seo_content: string | null;
}

export const COURSE_FIELDS = ["name", "description", "slug", "image_path", "meta_title", "meta_description", "seo_content"] as const;
export type CourseField = (typeof COURSE_FIELDS)[number];
export type CoursePatch = Partial<Pick<AdminCourseDetail, CourseField>>;
