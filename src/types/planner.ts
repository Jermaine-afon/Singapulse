// Shared between the browser (AiPlanner) and the server (server/planner.ts)

export type PlannerPace = 'relaxed' | 'balanced' | 'packed';

export interface PlannerPreferences {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  interests: string[];
  pace: PlannerPace;
  startPoint: string;
  mustVisitIds: string[]; // landmark IDs the plan should include (e.g. from My Trail)
  weatherSummary: string;
}

export interface PlannerChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface PlanStop {
  time: string; // HH:MM
  durationMinutes: number;
  type: 'landmark' | 'meal' | 'break';
  landmarkId?: string; // set only when type === 'landmark'
  title: string;
  note: string;
}

export interface ItineraryPlan {
  title: string;
  summary: string;
  stops: PlanStop[];
}

export interface PlanRequest {
  preferences: PlannerPreferences;
  messages: PlannerChatMessage[]; // chat so far; the last one is the new request
  currentPlan: ItineraryPlan | null;
}

export interface PlanResponse {
  reply: string;
  plan: ItineraryPlan;
  droppedStops: number; // stops removed because the AI referenced an unknown landmark
}
