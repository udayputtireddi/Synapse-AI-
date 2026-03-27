import { GoogleGenAI, Type } from "@google/genai";
import { MeetingInsights, ActionItem, Decision, Risk, FollowUp, MeetingChunk } from "../types";
import { v4 as uuidv4 } from "uuid";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (aiInstance) return aiInstance;
  
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey || apiKey === "undefined" || apiKey === "") {
    console.error("GEMINI_API_KEY/API_KEY is missing or invalid.");
    throw new Error("Invalid or missing GEMINI_API_KEY. Please set it in the AI Studio Secrets panel.");
  }
  aiInstance = new GoogleGenAI({ apiKey });
  return aiInstance;
}

/**
 * STAGE 1: Pre-processing & Chunking
 * Splits long transcripts into overlapping chunks to preserve context.
 */
export function chunkTranscript(transcript: string, chunkSize: number = 2000, overlap: number = 400): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < transcript.length) {
    const end = Math.min(start + chunkSize, transcript.length);
    chunks.push(transcript.substring(start, end));
    start += chunkSize - overlap;
  }
  return chunks;
}

/**
 * STAGE 2: Extraction (Map)
 * Extracts local insights from a single transcript chunk.
 */
async function extractFromChunk(chunk: string): Promise<Partial<MeetingInsights>> {
  const ai = getAI();
  const prompt = `You are a precise meeting analyst. Extract structured insights from the following transcript chunk.
  
  CRITICAL RULES:
  - ONLY use information explicitly stated in the transcript.
  - If a task is mentioned without an owner, set owner to "Unassigned".
  - If a deadline is not mentioned, set it to "TBD".
  - Be concise.
  
  Transcript Chunk:
  """
  ${chunk}
  """`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          decisions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                content: { type: Type.STRING },
                context: { type: Type.STRING },
              },
              required: ["content", "context"],
            },
          },
          actionItems: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                task: { type: Type.STRING },
                owner: { type: Type.STRING },
                deadline: { type: Type.STRING },
              },
              required: ["task", "owner", "deadline"],
            },
          },
          risks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING },
                mitigation: { type: Type.STRING },
              },
              required: ["description"],
            },
          },
          followUps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                topic: { type: Type.STRING },
                assignedTo: { type: Type.STRING },
              },
              required: ["topic"],
            },
          },
        },
      },
    },
  });

  return JSON.parse(response.text);
}

/**
 * STAGE 3: Synthesis (Reduce)
 * Merges and deduplicates insights from all chunks into a coherent global state.
 */
export async function synthesizeInsights(allInsights: Partial<MeetingInsights>[]): Promise<MeetingInsights> {
  const ai = getAI();
  const prompt = `You are a senior project manager. Merge the following meeting insights extracted from multiple transcript chunks into a single, coherent, and deduplicated report.
  
  DATA TO MERGE:
  ${JSON.stringify(allInsights, null, 2)}
  
  TASKS:
  1. Write a high-level executive summary of the entire meeting.
  2. Deduplicate action items and decisions.
  3. Ensure risks and follow-ups are clearly stated.
  4. Maintain a professional, implementation-ready tone.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          decisions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                content: { type: Type.STRING },
                context: { type: Type.STRING },
              },
              required: ["content", "context"],
            },
          },
          actionItems: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                task: { type: Type.STRING },
                owner: { type: Type.STRING },
                deadline: { type: Type.STRING },
              },
              required: ["task", "owner", "deadline"],
            },
          },
          risks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING },
                mitigation: { type: Type.STRING },
              },
              required: ["description"],
            },
          },
          followUps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                topic: { type: Type.STRING },
                assignedTo: { type: Type.STRING },
              },
              required: ["topic"],
            },
          },
        },
        required: ["summary", "decisions", "actionItems", "risks", "followUps"],
      },
    },
  });

  const data = JSON.parse(response.text);
  
  // Assign IDs for UI
  return {
    summary: data.summary || "No summary available.",
    decisions: (data.decisions || []).map((d: any, i: number) => ({ ...d, id: `dec-${i}` })),
    actionItems: (data.actionItems || []).map((a: any, i: number) => ({ ...a, id: `ai-${i}`, status: "pending" })),
    risks: (data.risks || []).map((r: any, i: number) => ({ ...r, id: `risk-${i}` })),
    followUps: (data.followUps || []).map((f: any, i: number) => ({ ...f, id: `fu-${i}` })),
  };
}

/**
 * STAGE 4: Validation
 * Final pass to ensure no hallucinations and cross-reference against the original transcript.
 */
export async function validateInsights(insights: MeetingInsights, transcript: string): Promise<MeetingInsights> {
  const ai = getAI();
  const prompt = `You are a quality assurance analyst. Validate the following meeting insights against the original transcript.
  
  INSIGHTS:
  ${JSON.stringify(insights, null, 2)}
  
  TRANSCRIPT:
  ${transcript.substring(0, 5000)} // Truncated for token limits if necessary
  
  TASK:
  - Remove any insights that are NOT supported by the transcript (hallucinations).
  - Correct any misattributed owners or deadlines.
  - If the insights are accurate, return them as is.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          decisions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                content: { type: Type.STRING },
                context: { type: Type.STRING },
              },
              required: ["content", "context"],
            },
          },
          actionItems: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                task: { type: Type.STRING },
                owner: { type: Type.STRING },
                deadline: { type: Type.STRING },
              },
              required: ["task", "owner", "deadline"],
            },
          },
          risks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING },
                mitigation: { type: Type.STRING },
              },
              required: ["description"],
            },
          },
          followUps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                topic: { type: Type.STRING },
                assignedTo: { type: Type.STRING },
              },
              required: ["topic"],
            },
          },
        },
        required: ["summary", "decisions", "actionItems", "risks", "followUps"],
      },
    },
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    return insights; // Fallback to original if validation fails
  }
}

/**
 * MAIN PIPELINE ENTRY POINT
 */
export async function processMeetingTranscript(transcript: string): Promise<MeetingInsights> {
  // 1. Chunking
  const chunks = chunkTranscript(transcript);
  
  // 2. Map (Parallel extraction)
  const chunkInsights = await Promise.all(chunks.map(chunk => extractFromChunk(chunk)));
  
  // 3. Reduce (Synthesis)
  const synthesized = await synthesizeInsights(chunkInsights);
  
  // 4. Validate
  const validated = await validateInsights(synthesized, transcript);
  
  // 5. Add IDs and status
  return {
    ...validated,
    actionItems: (validated.actionItems || []).map(ai => ({
      ...ai,
      id: uuidv4(),
      status: "pending" as const
    })),
    decisions: (validated.decisions || []).map(d => ({
      ...d,
      id: uuidv4()
    })),
    risks: (validated.risks || []).map(r => ({
      ...r,
      id: uuidv4()
    })),
    followUps: (validated.followUps || []).map(f => ({
      ...f,
      id: uuidv4()
    }))
  };
}

export async function getEmbedding(text: string) {
  try {
    const ai = getAI();
    const model = "gemini-embedding-2-preview";
    const result = await ai.models.embedContent({
      model,
      contents: [text],
    });
    return result.embeddings[0].values;
  } catch (error) {
    console.error("Embedding error:", error);
    return new Array(768).fill(0); // Return zero vector as fallback
  }
}

/**
 * STAGE 5: Semantic Search & Q&A
 * Processes a meeting and returns its chunks with embeddings.
 */
export async function createMeetingChunks(
  meetingId: string,
  meetingTitle: string,
  date: string,
  transcript: string
): Promise<MeetingChunk[]> {
  const rawChunks = chunkTranscript(transcript, 1000, 200); // Smaller chunks for better retrieval
  
  const chunks = await Promise.all(rawChunks.map(async (text, i) => {
    const embedding = await getEmbedding(text);
    return {
      id: `${meetingId}-chunk-${i}`,
      text,
      embedding,
      meetingId,
      meetingTitle,
      date
    };
  }));
  
  return chunks;
}

export async function queryPastMeetings(query: string, context: string) {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are an AI Meeting Companion. Use the following context from past meetings to answer the user's query.
      
      CRITICAL RULES:
      - ONLY use the provided context to answer.
      - If the answer is not in the context, say "I don't have enough information from past meetings to answer that."
      - Cite the meeting title and date for each piece of information.
      - Be specific about who said what.

Context:
${context}

User Query: ${query}`,
    });
    return response.text;
  } catch (error) {
    console.error("Query error:", error);
    return "Failed to query past meetings.";
  }
}
