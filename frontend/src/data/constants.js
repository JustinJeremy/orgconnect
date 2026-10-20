// Fixed option lists used by forms and filters (not sample data).
// If these end up in database tables, load them from the API instead.

export const EVENT_CATEGORIES = ["Workshop", "Seminar", "Community Service", "Social"];

// How people attend an event (value saved in the database -> label shown)
export const EVENT_MODES = { F2F: "Face-to-face", Online: "Online", Hybrid: "Hybrid" };

// Meeting apps in the location dropdown for Online and Hybrid (rooms are set per org: org.rooms)
export const PLATFORMS = ["Google Meet", "Zoom", "Microsoft Teams"];

export const ANNOUNCEMENT_CATEGORIES = ["General", "Event", "Deadline", "Urgent"];

// Tutoring areas are set per org (org.tutoringAreas from the API)

export const RESOURCE_TYPES = ["PDF", "Link", "Video", "Document"];

export const POSITIONS = ["Member", "President", "VP Academics", "VP Externals", "Secretary", "Treasurer"];

export const COURSES = ["BSIT", "BSCS", "BSIS", "BSEMC", "Other"];

export const YEAR_LEVELS = ["1st year", "2nd year", "3rd year", "4th year"];
