export interface FCMContent {
  title: string;
  body: string;
  action_url?: string;
  action_data?: Record<string, any>;
}

/**
 * Truncate text to a max length with a unicode ellipsis if needed.
 */
export function truncateText(input: string, maxLength: number): string {
  if (!input) return '';
  if (input.length <= maxLength) return input;
  const trimmed = input.slice(0, maxLength).trimEnd();
  return `${trimmed}\u2026`;
}

/**
 * Build standardized FCM content for a Class Update notification.
 * - title: "{class_name} - {class_update_title}"
 * - body: first N characters of the update content (default 120)
 */
export function buildClassUpdateFCMContent(input: {
  className: string;
  updateTitle: string;
  updateContent: string;
  classId: string;
  updateId: string;
  updateType?: string;
  bodyMaxLength?: number; // Suggest 120 for better mobile readability
}): FCMContent {
  const {
    className,
    updateTitle,
    updateContent,
    classId,
    updateId,
    updateType,
    bodyMaxLength = 120,
  } = input;

  const title = `${className} - ${updateTitle || 'New update'}`;
  const body = truncateText(updateContent || 'A new update was posted.', bodyMaxLength);

  return {
    title,
    body,
    action_url: `class/${classId}`,
    action_data: {
      class_id: classId,
      update_id: updateId,
      ...(updateType ? { update_type: updateType } : {}),
    },
  };
}

/**
 * Generic entry for future modules if needed.
 */
export function buildFCMContentFor(
  module: 'class_update',
  params: any
): FCMContent {
  switch (module) {
    case 'class_update':
      return buildClassUpdateFCMContent(params);
    default:
      throw new Error(`Unsupported module: ${module}`);
  }
}


