import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

/**
 * Robustly cleans and attempts to extract JSON from AI output.
 */
const safeJsonParse = (text: string): any => {
    if (!text) throw new Error("Empty response from AI");

    // 1. Try cleaning markdown wrapper
    let clean = text.replace(/^```(json)?\s*/, '').replace(/\s*```$/, '').trim();
    
    // 2. Try to find the first '{' and last '}' to extract the object
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    
    if (start !== -1 && end !== -1 && end > start) {
        clean = clean.substring(start, end + 1);
    }

    try {
        return JSON.parse(clean);
    } catch (e) {
        // 3. Fallback: If truncation occurred (unexpected end of input), we might want to fail gracefully
        // or attempt to close it? For now, we just log and re-throw, as a partial plan is dangerous.
        console.warn("JSON Parse Failed:", e);
        throw new Error("Failed to parse AI response. The plan might be too large or malformed.");
    }
};

/**
 * Uses Gemini with Google Maps grounding to find a location's coordinates.
 */
export const searchLocation = async (query: string): Promise<{ name: string; lat: number; lng: number; address: string } | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `I need coordinates for "${query}". Return ONLY a JSON object with keys: name (string), lat (number), lng (number), address (string).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            lat: { type: Type.NUMBER },
            lng: { type: Type.NUMBER },
            address: { type: Type.STRING }
          }
        }
      }
    });
    
    const text = response.text;
    if (text) {
        try {
          return safeJsonParse(text);
        } catch (e) {
           console.warn("Location search parse failed", e);
        }
    }
    
    // Fallback if AI returns nothing or invalid JSON, but we have a query
    return {
        name: query,
        lat: 0, 
        lng: 0,
        address: ''
    };

  } catch (error) {
    console.error("Gemini Search Error:", error);
    return {
        name: query,
        lat: 0,
        lng: 0,
        address: ''
    };
  }
};

/**
 * Generates a full itinerary based on a prompt.
 */
export const generateItinerary = async (prompt: string, startDate: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Plan a detailed multi-destination trip based on this request: "${prompt}". The start date is ${startDate}.

      RULES:
      1. Organize the trip by MAJOR STOPS.
      2. For each Major Stop, list specific activities.
      3. Suggest Transport Mode to *next* stop.
      
      Return a JSON structure matching the schema provided.`,
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            stops: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  locationName: { type: Type.STRING },
                  lat: { type: Type.NUMBER },
                  lng: { type: Type.NUMBER },
                  description: { type: Type.STRING },
                  stayDuration: { type: Type.INTEGER },
                  activities: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            type: { type: Type.STRING, enum: ['Activity', 'Food', 'Stay'] },
                            cost: { type: Type.NUMBER },
                            description: { type: Type.STRING }
                        }
                    }
                  },
                  transportToNext: {
                      type: Type.OBJECT,
                      properties: {
                          mode: { type: Type.STRING, enum: ['Flight', 'Train', 'Car', 'Bus', 'Ferry', 'Walk'] },
                          duration: { type: Type.STRING },
                          cost: { type: Type.NUMBER }
                      }
                  }
                },
                required: ['locationName', 'lat', 'lng', 'stayDuration', 'activities']
              }
            }
          }
        }
      }
    });

    const text = response.text;
    if (text) {
      return safeJsonParse(text);
    }
    throw new Error("No data returned");

  } catch (error) {
    console.error("Gemini Itinerary Generation Error:", error);
    throw error;
  }
};
