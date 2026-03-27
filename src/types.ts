export interface Speaker {
  id: string;
  name: string;
  avatar?: string;
}

export interface Utterance {
  speakerId: string;
  text: string;
  timestamp: string;
}

export interface ActionItem {
  id: string;
  task: string;
  owner: string;
  deadline: string;
  status: "pending" | "completed";
}

export interface Decision {
  id: string;
  content: string;
  context: string;
}

export interface Risk {
  id: string;
  description: string;
  mitigation?: string;
}

export interface FollowUp {
  id: string;
  topic: string;
  assignedTo?: string;
}

export interface MeetingInsights {
  summary: string;
  decisions: Decision[];
  actionItems: ActionItem[];
  risks: Risk[];
  followUps: FollowUp[];
}

export interface MeetingChunk {
  id: string;
  text: string;
  embedding: number[];
  meetingId: string;
  meetingTitle: string;
  date: string;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  duration: string;
  transcript: Utterance[];
  insights: MeetingInsights;
  chunks: MeetingChunk[];
}

export interface ProjectMemory {
  projectId: string;
  meetings: Meeting[];
}
