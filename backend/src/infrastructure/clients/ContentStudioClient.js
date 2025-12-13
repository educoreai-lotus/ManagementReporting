import { postToCoordinator } from "../coordinatorClient/coordinatorClient.js";
import { verifyCoordinatorResponse } from "../../utils/coordinatorVerification.js";

/**
 * PostgreSQL Schema Rules Map
 * Defines valid values for each field type according to the actual DB schema
 */
const SCHEMA_RULES = {
  // ENUM: course_status (courses table)
  course_status: {
    allowed: ['active', 'archived', 'deleted'],
    default: 'active',
    mapping: {
      'draft': 'active',
      'published': 'active',
      'active': 'active',
      'unpublished': 'archived',
      'hidden': 'archived',
      'archived': 'archived',
      'deleted': 'deleted'
    }
  },
  // ENUM: topic_status (topics table)
  topic_status: {
    allowed: ['active', 'archived', 'deleted'],
    default: 'active',
    mapping: {
      'draft': 'active',
      'published': 'active',
      'active': 'active',
      'unpublished': 'archived',
      'hidden': 'archived',
      'archived': 'archived',
      'deleted': 'deleted'
    }
  },
  // ENUM: content_type (contents table)
  content_type: {
    allowed: ['avatar_video', 'text_audio', 'mind_map', 'presentation', 'code'],
    default: 'text_audio',
    mapping: {
      'avatar_video': 'avatar_video',
      'text_audio': 'text_audio',
      'audio_text': 'text_audio',
      'slides': 'presentation',
      'presentation': 'presentation',
      'mind_map': 'mind_map',
      'code': 'code'
    }
  },
  // ENUM: generation_method (contents table)
  generation_method: {
    allowed: ['manual', 'ai_assisted', 'mixed', 'full_ai'],
    default: 'manual',
    mapping: {
      'manual': 'manual',
      'ai': 'ai_assisted',
      'ai_assisted': 'ai_assisted',
      'auto': 'full_ai',
      'generated': 'full_ai',
      'mixed': 'mixed',
      'full_ai': 'full_ai'
    }
  }
};

/**
 * Sanitize ENUM field according to PostgreSQL schema rules
 * @param {string|null|undefined} value - Value to sanitize
 * @param {string} fieldType - One of: 'course_status', 'topic_status', 'content_type', 'generation_method'
 * @returns {string} Valid ENUM value
 */
function sanitizeEnum(value, fieldType) {
  const rules = SCHEMA_RULES[fieldType];
  if (!rules) {
    throw new Error(`Unknown field type: ${fieldType}`);
  }

  // Handle null, undefined, or empty string
  if (value === null || value === undefined || 
      (typeof value === 'string' && value.trim() === '')) {
    return rules.default;
  }

  const trimmed = typeof value === 'string' ? value.trim().toLowerCase() : String(value).trim().toLowerCase();

  // Check if already a valid enum value
  if (rules.allowed.includes(trimmed)) {
    return trimmed;
  }

  // Map business value to DB value
  if (rules.mapping[trimmed]) {
    return rules.mapping[trimmed];
  }

  // Fallback to default
  return rules.default;
}

/**
 * Sanitize UUID field: convert empty/invalid values to NULL
 * @param {string|null|undefined} value - UUID value to sanitize
 * @returns {string|null} Valid UUID string or null
 */
function sanitizeUUID(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = typeof value === 'string' ? value.trim() : String(value).trim();

  // Empty string or invalid UUID format → null
  if (trimmed === '' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
    return null;
  }

  return trimmed;
}

/**
 * Fetches content metrics from the Content Studio microservice.
 *
 * NEW REQUEST FORMAT (similar to Assessment / CourseBuilder):
 *
 * {
 *   requester_name: "ManagementReporting",
 *   payload: {},
 *   response: {
 *     courses: [],
 *     topics_stand_alone: []
 *   }
 * }
 *
 * The Content Studio service fills the "response" structure and returns
 * a nested legacy payload that we still parse in two levels:
 * - response.data.payload -> stringified level1
 * - level1.payload -> stringified inner { courses, topics_stand_alone }
 */
export async function fetchContentMetricsFromContentStudio() {
  // 1. New unified request format
  const requestObject = {
    requester_service: "ManagementReporting",
    payload: {
      action: "Collecting information about content creation, content types, and content creators."
    },
    response: {
      courses: [
        {
          course_id: "",
          course_name: "",
          course_language: "",
          trainer_id: "",
          trainer_name: "",
          permission: "",
          total_usage_count: 0,
          created_at: "",
          status: "",
          topics: [
            {
              topic_id: "",
              topic_name: "",
              topic_language: "",
              skills: [],
              contents: [
                {
                  content_id: "",
                  content_type: "",
                  content_data: {},
                  generation_methods: "",
                  generation_method_id: ""
                }
              ]
            }
          ]
        }
      ],
      topics_stand_alone: [
        {
          topic_id: "",
          topic_name: "",
          topic_language: "",
          skills: [],
          total_usage_count: 0,
          created_at: "",
          status: "",
          contents: [
            {
              content_id: "",
              content_type: "",
              content_data: {},
              generation_methods: "",
              generation_method_id: ""
            }
          ]
        }
      ]
    }
  };

  try {
    // 2. Send envelope via Coordinator
    const coordinatorResponse = await postToCoordinator(requestObject, { timeout: 60000 });

    if (!coordinatorResponse) {
      throw new Error("Empty response from Content Studio service");
    }

    // Verify Coordinator response
    const isValid = await verifyCoordinatorResponse(coordinatorResponse.rawResponse, coordinatorResponse.data);

    if (!isValid) {
      throw new Error("Coordinator response verification failed");
    }

    // 4. Handle both old and new response formats
    const response = coordinatorResponse.data;
    let data;

    // Check if it's the new format (Format B): { success: true, data: { courses: [], topics_stand_alone: [] } }
    if (response && typeof response === "object" && response.data && 
        (response.data.courses !== undefined || response.data.topics_stand_alone !== undefined)) {
      // Format B: New direct format
      const courses = response.data.courses ?? [];
      const topics_stand_alone = response.data.topics_stand_alone ?? [];
      
      data = {
        courses,
        topics_stand_alone
      };
    } else {
      // Format A: Old nested string-based format
      const { payload } = response || {};

      if (!payload || typeof payload !== "string") {
        throw new Error("Invalid payload returned from Content Studio");
      }

      // First level: { serviceName: "...", payload: "<stringified inner JSON>" }
      const level1 = JSON.parse(payload);

      if (!level1.payload || typeof level1.payload !== "string") {
        throw new Error("Invalid inner payload structure from Content Studio");
      }

      // Second level: { courses: [...], topics_stand_alone: [...] }
      data = JSON.parse(level1.payload);
    }

    // Validate both arrays exist and are arrays
    if (!data.courses || !Array.isArray(data.courses)) {
      throw new Error("Content Studio payload does not contain 'courses' array");
    }

    if (!data.topics_stand_alone || !Array.isArray(data.topics_stand_alone)) {
      throw new Error("Content Studio payload does not contain 'topics_stand_alone' array");
    }

    // Sanitize all fields according to PostgreSQL schema rules
    // Courses: status (course_status ENUM)
    data.courses.forEach((course) => {
      if (course) {
        course.status = sanitizeEnum(course.status, 'course_status');
        
        // Topics within course: status (topic_status ENUM)
        if (course.topics && Array.isArray(course.topics)) {
          course.topics.forEach((topic) => {
            if (topic) {
              if (topic.status !== undefined) {
                topic.status = sanitizeEnum(topic.status, 'topic_status');
              }
              
              // Contents within topic: content_type, generation_method (ENUMs), generation_method_id (UUID)
              if (topic.contents && Array.isArray(topic.contents)) {
                topic.contents.forEach((content) => {
                  if (content) {
                    if (content.content_type !== undefined) {
                      content.content_type = sanitizeEnum(content.content_type, 'content_type');
                    }
                    if (content.generation_methods !== undefined) {
                      content.generation_methods = sanitizeEnum(content.generation_methods, 'generation_method');
                    }
                    if (content.generation_method_id !== undefined) {
                      content.generation_method_id = sanitizeUUID(content.generation_method_id);
                    }
                  }
                });
              }
            }
          });
        }
      }
    });

    // Standalone topics: status (topic_status ENUM)
    data.topics_stand_alone.forEach((topic) => {
      if (topic) {
        if (topic.status !== undefined) {
          topic.status = sanitizeEnum(topic.status, 'topic_status');
        }
        
        // Contents within standalone topic: content_type, generation_method (ENUMs), generation_method_id (UUID)
        if (topic.contents && Array.isArray(topic.contents)) {
          topic.contents.forEach((content) => {
            if (content) {
              if (content.content_type !== undefined) {
                content.content_type = sanitizeEnum(content.content_type, 'content_type');
              }
              if (content.generation_methods !== undefined) {
                content.generation_methods = sanitizeEnum(content.generation_methods, 'generation_method');
              }
              if (content.generation_method_id !== undefined) {
                content.generation_method_id = sanitizeUUID(content.generation_method_id);
              }
            }
          });
        }
      }
    });

    return data;
  } catch (err) {
    console.error("Error calling Content Studio:", err.message);
    throw err;
  }
}
