import { postToCoordinator } from "../coordinatorClient/coordinatorClient.js";
import { verifyCoordinatorResponse } from "../../utils/coordinatorVerification.js";

/**
 * Normalize course/topic status to valid PostgreSQL ENUM value
 * Maps business statuses to DB-safe values: 'active', 'archived', or 'deleted'
 * @param {string|null|undefined} status - Status value to normalize
 * @returns {string} Valid status: "active", "archived", or "deleted"
 */
function normalizeCourseStatus(status) {
  // Handle null, undefined, or empty string
  if (status === null || status === undefined || 
      (typeof status === 'string' && status.trim() === '')) {
    return 'active';
  }
  
  const trimmed = typeof status === 'string' ? status.trim().toLowerCase() : String(status).trim().toLowerCase();
  
  // Map business statuses to PostgreSQL ENUM values
  const statusMap = {
    'draft': 'active',
    'published': 'active',
    'active': 'active',
    'unpublished': 'archived',
    'hidden': 'archived',
    'archived': 'archived',
    'deleted': 'deleted'
  };
  
  // Return mapped value if exists, otherwise default to 'active'
  return statusMap[trimmed] || 'active';
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

    // Normalize status fields for all courses and topics
    data.courses.forEach((course) => {
      if (course) {
        course.status = normalizeCourseStatus(course.status);
        
        // Normalize status for topics inside course
        if (course.topics && Array.isArray(course.topics)) {
          course.topics.forEach((topic) => {
            if (topic && topic.status !== undefined) {
              topic.status = normalizeCourseStatus(topic.status);
            }
          });
        }
      }
    });

    // Normalize status for standalone topics
    data.topics_stand_alone.forEach((topic) => {
      if (topic && topic.status !== undefined) {
        topic.status = normalizeCourseStatus(topic.status);
      }
    });

    return data;
  } catch (err) {
    console.error("Error calling Content Studio:", err.message);
    throw err;
  }
}
