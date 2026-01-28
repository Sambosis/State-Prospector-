import { GoogleGenAI } from "@google/genai";
import { SearchParams, ProspectResult, GroundingSource } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Maps common regional context to help the AI understand the specific market dynamics.
 */
const getRegionalContext = (location: string): string => {
  const clean = location.trim();
  if (clean.toLowerCase() === 'current location') return 'nearby the current GPS coordinates';
  if (clean === '21222') return 'Dundalk/Baltimore, MD (Strong industrial and residential housing market)';
  if (clean.startsWith('212')) return 'Baltimore Metro Area, MD';
  return '';
};

export const searchProspects = async (params: SearchParams): Promise<ProspectResult> => {
  // Using gemini-2.5-flash for optimized grounding performance
  const modelName = 'gemini-2.5-flash';
  
  const cleanLoc = params.location.trim();
  const regionalContext = getRegionalContext(cleanLoc);
  
  // Construct a query that forces the grounding tools to look for the right things
  let categoryQuery = "commercial businesses and industrial facilities";
  
  if (params.segment === 'Residential/Housing') {
    categoryQuery = "apartment complexes, multi-family housing, and property management offices";
  } else if (params.segment) {
    categoryQuery = `${params.subSegment || params.segment} businesses`;
  }

  const locationQuery = `${categoryQuery} in ${cleanLoc} ${regionalContext}`;

  const systemInstruction = `You are an expert Lead Generation Agent for State Industrial Products.
Your mission is to find high-value B2B prospects.

DATA SOURCING:
- Phone Numbers: Retrieve primarily from Google Maps data.
- Email Addresses: Search for official business websites via Google Search snippets.
- Addresses: Use verified Google Maps locations.

CRITICAL INSTRUCTIONS:
1. Use the Google Maps and Google Search tools for "${locationQuery}".
2. Even if the tools return "residential" areas, look for the COMMERCIAL entities managing them (e.g., "Dundalk Village Apartments").
3. You MUST synthesize a JSON response. Do not say "I couldn't find anything" if there are any map results or search snippets.
4. For housing/apartments (especially in 21222), suggest "Air Care" for hallways/lobbies and "Drain Care" for maintenance.

DATA PURITY POLICY (CRITICAL FOR CSV):
- If a phone number OR email address is not found, leave the field as an empty string ("").
- DO NOT provide placeholders like "N/A", "Unknown", "None", "No Phone", "No Email", or "Contact via web".
- Fields MUST be blank if data is missing.

OUTPUT FORMAT:
Return ONLY a JSON array:
[
  { "name": "...", "phone": "...", "email": "...", "address": "...", "city": "...", "state": "...", "zip": "...", "notes": "..." }
]`;

  const userPrompt = `Find 15-20 prospects for State Industrial Products in ${cleanLoc}. 
Focus: ${categoryQuery}. 
Provide a list of entities with their contact details. If phone or email is not found, leave the field blank.`;

  try {
    const config: any = {
      systemInstruction,
      tools: [{ googleMaps: {} }, { googleSearch: {} }],
      temperature: 0.1,
    };

    if (params.latLng) {
      config.toolConfig = {
        retrievalConfig: {
          latLng: params.latLng
        }
      };
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: userPrompt,
      config,
    });

    let responseText = "";
    const candidate = response.candidates?.[0];
    
    if (candidate?.content?.parts) {
      responseText = candidate.content.parts
        .filter(part => part.text)
        .map(part => part.text)
        .join("\n")
        .trim();
    }

    const sourceUrls: GroundingSource[] = [];
    if (candidate?.groundingMetadata?.groundingChunks) {
      candidate.groundingMetadata.groundingChunks.forEach((chunk: any) => {
        if (chunk.maps) {
          sourceUrls.push({ title: chunk.maps.title || "Maps Location", uri: chunk.maps.uri });
        } else if (chunk.web) {
          sourceUrls.push({ title: chunk.web.title || "Web Source", uri: chunk.web.uri });
        }
      });
    }

    const firstBracket = responseText.indexOf('[');
    const lastBracket = responseText.lastIndexOf(']');

    if (firstBracket === -1 || lastBracket === -1) {
      if (sourceUrls.length > 0) {
        throw new Error(`The system found ${sourceUrls.length} locations in ${cleanLoc} but hit a processing error during synthesis.`);
      }
      throw new Error(`No specific ${categoryQuery} were identified. The Search Engine couldn't find valid contact data for this criteria.`);
    }

    const jsonString = responseText.substring(firstBracket, lastBracket + 1);

    try {
      const prospects = JSON.parse(jsonString);
      if (Array.isArray(prospects) && prospects.length > 0) {
        return {
          prospects: prospects.map(p => {
            const placeholders = ["n/a", "none", "unknown", "null", "pending", "no phone", "no email", "not found", "contact via web"];
            let cleanEmail = (p.email || "").toString().trim();
            if (placeholders.includes(cleanEmail.toLowerCase())) cleanEmail = "";
            let cleanPhone = (p.phone || "").toString().trim();
            if (placeholders.includes(cleanPhone.toLowerCase())) cleanPhone = "";
            
            return {
              name: p.name || "Business Name Unknown",
              phone: cleanPhone,
              email: cleanEmail,
              address: p.address || "Local Area",
              city: p.city || cleanLoc,
              state: p.state || "",
              zip: p.zip || cleanLoc,
              notes: p.notes || "Identified as a facility requiring maintenance services."
            };
          }),
          sourceUrls
        };
      }
      throw new Error("Lead Synthesis failed: No actionable data points were extracted from the sources.");
    } catch (parseError) {
      throw new Error("Lead Synthesis error: The model response was formatted incorrectly. Please retry.");
    }
  } catch (error: any) {
    console.error("Search Engine Error:", error);
    // Categorize error for diagnostic UI
    if (error.message?.includes('Maps')) throw new Error(`Google Maps Tool: ${error.message}`);
    if (error.message?.includes('Search')) throw new Error(`Web Search Tool: ${error.message}`);
    throw error;
  }
};