import { aiRequest } from './aiClient';
import type { MeetingInsights, MeetingChunk } from '../types';
export const processMeetingTranscript = (transcript: string) => aiRequest<MeetingInsights>('process', { transcript });
export const createMeetingChunks = (meetingId: string, meetingTitle: string, date: string, transcript: string) =>
  aiRequest<MeetingChunk[]>('chunks', { meetingId, meetingTitle, date, transcript });
export const getEmbedding = (text: string) => aiRequest<number[]>('embedding', { text });
export const queryPastMeetings = (query: string, context: string) => aiRequest<string>('query', { query, context });
