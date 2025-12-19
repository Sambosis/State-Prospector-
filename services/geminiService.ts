import { GoogleGenAI } from "@google/genai";
import { SearchParams, ProspectResult } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const searchProspects = async (params: SearchParams): Promise<ProspectResult> => {
  // Enhanced context with specific product lines for "Likely Services Needed" inference
  const baseContext = `You are a sales prospecting assistant for State Industrial Products (Chemical Division). 
  Your goal is to find valid business prospects in the target location: "${params.location}".
  
  Focus on businesses that would benefit from State Chemical's primary product lines:
  - Air Care (odor control, scenting)
  - Drain Care (maintenance, blockage prevention)
  - Wastewater (treatment solutions)
  - Water Treatment (cooling towers, boilers, closed loops)
  `;

  let prompt = '';
  const locationContext = `Search in and around ${params.location}.`;

  if (params.segment) {
    // Targeted Search
    const target = params.subSegment ? `${params.subSegment} (${params.segment})` : params.segment;
    prompt = `${baseContext} ${locationContext} Search specifically for ${target} businesses. List 15-20 relevant results.`;
  } else {
    // Broad Search
    prompt = `${baseContext} ${locationContext} Search broadly for high-potential commercial, institutional, or industrial prospects (e.g. Healthcare, Manufacturing, Education, Hospitality). List 15-20 diverse businesses.`;
  }

  prompt += `
  
  IMPORTANT:
  1. Return the results as a raw JSON array. Do NOT use Markdown code blocks (like \`\`\`json). Just return the raw JSON string.
  2. The JSON array must contain objects with the following properties: "name", "phone", "email", "address", "city", "state", "zip", "notes".
  3. "address" should be the street address only (e.g., 123 Main St).
  4. "city", "state", and "zip" should be extracted from the full address.
  5. "email": Leave as an empty string "" if not available.
  6. "notes": This field MUST contain the Market Segment (Category), Likely Services Needed (Air Care, Drain Care, etc.), and any other notable details found. Format it clearly.
  7. Ensure the businesses are currently active.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
        // responseMimeType and responseSchema are NOT supported when using googleMaps tool.
        // We handle JSON parsing manually from the text response.
      },
    });

    let jsonString = response.text || "[]";
    
    // Clean up if the model includes markdown code blocks despite instructions
    jsonString = jsonString.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/```\s*$/, '');

    let prospects = [];
    try {
        prospects = JSON.parse(jsonString);
    } catch (e) {
        console.warn("Failed to parse JSON directly, attempting to extract array.", jsonString);
        // Fallback: try to find the first '[' and last ']'
        const start = jsonString.indexOf('[');
        const end = jsonString.lastIndexOf(']');
        if (start !== -1 && end !== -1) {
            try {
                prospects = JSON.parse(jsonString.substring(start, end + 1));
            } catch (innerE) {
                console.error("JSON parsing completely failed", innerE);
                throw new Error("Could not parse the data returned by AI.");
            }
        }
    }

    return {
      prospects
    };
  } catch (error) {
    console.error("Error fetching prospects:", error);
    throw new Error("Failed to fetch prospects. Please check your API key and try again.");
  }
};