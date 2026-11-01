'use client';

export { EditorShell } from './EditorShell';
export type { EditorShellProps, TermActivation } from './EditorShell';
export { LegalTerm, legalTermSlug } from './legal-term';
export { Callout } from './callout';
export type { CalloutVariant } from './callout';
export { Flowchart } from './flowchart';
export { CourseImage } from './image';

/** TOC / 分页 / 统计与 @ln/utils 共用同一实现，此处仅做转发，避免客户端多引一份。 */
export {
  collectHeadings,
  paginateDoc,
  pagesWithTitles,
  countTerms,
  textOf,
} from '@ln/utils';
export type { HeadingEntry, PresentationPage } from '@ln/utils';
