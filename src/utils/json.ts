import logger from './logger';

/**
 * Safely parse JSON data with fallback handling
 * @param jsonData - The data to parse (can be string, object, or null)
 * @param fallback - The fallback value if parsing fails (default: null)
 * @returns Parsed JSON data or fallback value
 */
export const safeJsonParse = (jsonData: any, fallback: any = null): any => {
  try {
    // If it's already an object/array, return it as-is
    if (typeof jsonData === 'object' && jsonData !== null) {
      return jsonData;
    }
    // If it's a string, try to parse it
    if (typeof jsonData === 'string' && jsonData.trim()) {
      return JSON.parse(jsonData);
    }
    return fallback;
  } catch (error) {
    logger.warn('Failed to parse JSON:', { jsonData, error: (error as Error).message });
    return fallback;
  }
};

/**
 * Reaction data structure for the new format
 */
export interface ReactionData {
  count: number;
  users: string[];
}

/**
 * Migrate old reaction format to new format
 * Old format: { "👍": 5 }
 * New format: { "👍": { count: 5, users: [] } }
 * @param reactions - The reactions object to migrate
 * @returns Migrated reactions in new format
 */
export const migrateReactions = (reactions: any): Record<string, ReactionData> => {
  if (!reactions || typeof reactions !== 'object') return {};
  
  const migratedReactions: Record<string, ReactionData> = {};
  
  for (const [emoji, value] of Object.entries(reactions)) {
    if (typeof value === 'number') {
      // Old format: { "👍": 5 } -> New format: { "👍": { count: 5, users: [] } }
      migratedReactions[emoji] = {
        count: value,
        users: [] // We can't recover the user data from old format
      };
    } else if (value && typeof value === 'object' && typeof (value as any).count === 'number') {
      // Already new format
      migratedReactions[emoji] = value as ReactionData;
    }
  }
  
  return migratedReactions;
};

/**
 * Safely stringify JSON data with error handling
 * @param data - The data to stringify
 * @param fallback - The fallback value if stringification fails (default: '{}')
 * @returns JSON string or fallback value
 */
export const safeJsonStringify = (data: any, fallback: string = '{}'): string => {
  try {
    return JSON.stringify(data);
  } catch (error) {
    logger.warn('Failed to stringify JSON:', { data, error: (error as Error).message });
    return fallback;
  }
}; 