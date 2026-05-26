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

/**
 * Stage 2: Enriches a single prospect with website, email address, and key contact details
 * using Google Search grounding. This is extremely fast, highly targeted, and avoids proxy timeout limits.
 */
export const enrichSingleProspect = async (
  prospectName: string,
  location: string
): Promise<{ email: string; website: string; notes: string; sourceUrls: GroundingSource[] }> => {
  const modelName = 'gemini-3.5-flash';
  const sourceUrls: GroundingSource[] = [];

  const systemInstruction = `You are an expert Lead Generation Researcher for State Industrial Products.
Your mission is to look up high-quality B2B contact details on a specific prospect using Google Search.

DATA GOALS:
Find the official website URL, any public business contact email address (info@, sales@, contact@, or a key person's email), and find the name of a Key Decision Maker (Owner, General Manager, President, Facilities Director, Property Manager, or Maintenance Chief) and brief operational notes.

CRITICAL INSTRUCTIONS:
1. Use the Google Search tool for this exact business: "${prospectName}" in "${location}".
2. Synthesize a clean JSON object containing 'email', 'website', and 'notes'.
3. Do not invent fake details. If email or website are not found, return empty strings ("").
4. For notes: write a brief, professional note highlighting the Key Decision Maker/Contact name if found, and their likely facility maintenance areas.

OUTPUT FORMAT:
Return ONLY a valid JSON object matching the schema below. No markdown block wrapper, no extra conversation.
{
  "email": "...",
  "website": "...",
  "notes": "..."
}`;

  const userPrompt = `Find contact email, website, and Key Decision Maker notes for: ${prospectName} located in ${location}.`;

  try {
    const config: any = {
      systemInstruction,
      tools: [{ googleSearch: {} }],
      temperature: 0.1,
    };

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

    if (candidate?.groundingMetadata?.groundingChunks) {
      candidate.groundingMetadata.groundingChunks.forEach((chunk: any) => {
        if (chunk.web) {
          sourceUrls.push({ title: chunk.web.title || "Web Source", uri: chunk.web.uri });
        }
      });
    }

    const firstBrace = responseText.indexOf('{');
    const lastBrace = responseText.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error("Could not parse enrichment response JSON.");
    }

    const jsonString = responseText.substring(firstBrace, lastBrace + 1);
    const enriched = JSON.parse(jsonString);

    const cleanEmail = (enriched.email || "").toString().trim();
    const cleanWebsite = (enriched.website || "").toString().trim();
    const cleanNotes = (enriched.notes || "").toString().trim();

    const placeholders = ["n/a", "none", "unknown", "null", "pending", "no phone", "no email", "not found", "contact via web"];
    const emailVal = placeholders.includes(cleanEmail.toLowerCase()) ? "" : cleanEmail;
    const websiteVal = placeholders.includes(cleanWebsite.toLowerCase()) ? "" : cleanWebsite;

    return {
      email: emailVal,
      website: websiteVal,
      notes: cleanNotes,
      sourceUrls
    };
  } catch (error) {
    throw mapGeminiError(error);
  }
};

const mapGeminiError = (error: any): Error => {
  console.error("Original Gemini Service Error:", error);
  
  const errStr = typeof error === 'string' 
    ? error 
    : (error?.message || JSON.stringify(error) || "");
  
  if (
    errStr.includes("429") || 
    errStr.includes("RESOURCE_EXHAUSTED") || 
    errStr.includes("quota") ||
    errStr.includes("rate-limits") ||
    error?.code === 429 ||
    error?.status === "RESOURCE_EXHAUSTED" ||
    (error?.error && (error.error.code === 429 || error.error.status === "RESOURCE_EXHAUSTED"))
  ) {
    return new Error(
      "Gemini API Quota Limit Reached (Error 429): You have exceeded your developer free tier rate limits or your AI Studio key has no billing details enabled. Please wait a minute before retrying, or configure a pay-as-you-go billing plan in your Google AI Studio settings."
    );
  }

  if (errStr.includes("Rpc failed") || errStr.includes("xhr error") || errStr.includes("error code: 6")) {
    return new Error("The AI service is temporarily unavailable (Error 500). Please try again in a moment.");
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error(error?.message || "An unexpected error occurred in the Gemini Service.");
};

export const searchProspects = async (params: SearchParams): Promise<ProspectResult> => {
  const modelName = 'gemini-3.5-flash';
  
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
Your mission is to find high-value B2B prospects using maps-based lookup.

DATA SOURCING:
- Phone Numbers: Retrieve primarily from Google Maps data.
- Addresses: Use verified Google Maps locations.
- Websites: Retrieve the official business website from Google Maps if available.
- Notes: Identify or infer likely facility needs based on the business category (e.g. cooling systems, commercial kitchen drains, or institutional floor care).

CRITICAL INSTRUCTIONS:
1. Use the Google Maps tool for "${locationQuery}".
2. Even if the tools return "residential" areas, look for the COMMERCIAL entities managing them (e.g., "Dundalk Village Apartments").
3. You MUST synthesize a JSON response. Do not say "I couldn't find anything" if there are any map results.

DATA PURITY POLICY (CRITICAL FOR CSV):
- If a phone number or website is not found, leave the field as an empty string ("").
- DO NOT provide placeholders like "N/A", "Unknown", "None", "No Phone".
- Fields MUST be blank if data is missing.

OUTPUT FORMAT:
You MUST return ONLY a valid JSON array of objects. Do not include any markdown formatting, code blocks, or conversational text.
[
  { "name": "...", "phone": "...", "email": "...", "address": "...", "city": "...", "state": "...", "zip": "...", "notes": "...", "website": "..." }
]`;

  const userPrompt = `Find 15-20 prospects for State Industrial Products in ${cleanLoc}. 
Focus: ${categoryQuery}. 
Provide a list of entities with their contact details. 
If phone or website is not found, leave the field blank.
Provide the website URL from the maps details if available. Write notes summarizing likely facility needs for State Chemical (such as drain care, odor control, floor maintenance, or heating/cooling chemical treatment).`;

  try {
    const config: any = {
      systemInstruction,
      tools: [{ googleMaps: {} }],
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
        }
      });
    }

    const firstBracket = responseText.indexOf('[');
    const lastBracket = responseText.lastIndexOf(']');

    if (firstBracket === -1 || lastBracket === -1) {
      if (sourceUrls.length > 0) {
        throw new Error(`The system found ${sourceUrls.length} locations in ${cleanLoc} but hit a processing error during synthesis. Model response was: ${responseText ? responseText.substring(0, 150) + '...' : 'empty'}`);
      }
      throw new Error(`No specific ${categoryQuery} were identified. The Search Engine couldn't find valid contact data for this criteria.`);
    }

    const jsonString = responseText.substring(firstBracket, lastBracket + 1);

    try {
      const prospects = JSON.parse(jsonString);
      if (Array.isArray(prospects) && prospects.length > 0) {
        const mappedProspects = prospects.map(p => {
          const placeholders = ["n/a", "none", "unknown", "null", "pending", "no phone", "no email", "not found", "contact via web"];
          let cleanPhone = (p.phone || "").toString().trim();
          if (placeholders.includes(cleanPhone.toLowerCase())) cleanPhone = "";
          let cleanEmail = (p.email || "").toString().trim();
          if (placeholders.includes(cleanEmail.toLowerCase())) cleanEmail = "";
          let cleanWebsite = (p.website || "").toString().trim();
          if (placeholders.includes(cleanWebsite.toLowerCase())) cleanWebsite = "";
          
          return {
            name: p.name || "Business Name Unknown",
            phone: cleanPhone,
            email: cleanEmail,
            address: p.address || "Local Area",
            city: p.city || cleanLoc,
            state: p.state || "",
            zip: p.zip || cleanLoc,
            notes: p.notes || "",
            website: cleanWebsite
          };
        });

        return {
          prospects: mappedProspects,
          sourceUrls
        };
      }
      throw new Error("Lead Synthesis failed: No actionable data points were extracted from the sources.");
    } catch (parseError) {
      throw new Error("Lead Synthesis error: The model response was formatted incorrectly. Please retry.");
    }
  } catch (error: any) {
    if (error.message?.includes('Maps')) {
      throw new Error(`Google Maps Tool: ${error.message}`);
    }
    throw mapGeminiError(error);
  }
};