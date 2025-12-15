
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Robustly cleans and attempts to extract JSON from AI output.
 */
const safeJsonParse = (text: string): any => {
    if (!text) throw new Error("Empty response from AI");

    // Attempt to find the outermost JSON object
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');

    if (start === -1 || end === -1 || start >= end) {
        // Fallback: If no brackets found, maybe it's just raw text that looks like JSON? 
        // Try parsing the whole thing if it doesn't look like markdown
        try {
            return JSON.parse(text);
        } catch (e) {
            console.warn("Raw JSON Parse Failed:", text.substring(0, 100) + "...");
            throw new Error("Response does not contain a valid JSON object structure.");
        }
    }

    const jsonStr = text.substring(start, end + 1);

    try {
        return JSON.parse(jsonStr);
    } catch (e) {
        console.warn("JSON Parse Failed on extracted string:", jsonStr.substring(0, 100) + "...");
        throw new Error("Failed to parse AI response. The plan might be malformed.");
    }
};

/**
 * Uses Gemini with Google Maps grounding to find a location's coordinates.
 */
export const searchLocation = async (query: string, apiKey: string): Promise<{ name: string; lat: number; lng: number; address: string } | null> => {
  if (!apiKey) {
      console.warn("No API Key provided for search");
      return null;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    // Use simple prompt-based JSON for search as well to be consistent
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `I need coordinates for "${query}". Return ONLY a raw JSON object (no markdown) with keys: name (string), lat (number), lng (number), address (string).`,
      config: {
        responseMimeType: "application/json",
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
    
    return { name: query, lat: 0, lng: 0, address: '' };

  } catch (error) {
    console.error("Gemini Search Error:", error);
    return { name: query, lat: 0, lng: 0, address: '' };
  }
};

/**
 * Generates a full itinerary based on a prompt.
 */
export const generateItinerary = async (prompt: string, startDate: string, apiKey: string) => {
  if (!apiKey) {
      throw new Error("API Key is missing. Please add it in Settings.");
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const systemInstruction = `You are an expert travel planner. 
    Create a detailed multi-destination trip plan.
    
    REQUIRED OUTPUT FORMAT (JSON ONLY):
    {
      "title": "A catchy title for the trip",
      "stops": [
        {
          "locationName": "City or Place Name",
          "lat": 0.0,
          "lng": 0.0,
          "description": "Brief description of why we are stopping here",
          "stayDuration": 2,
          "activities": [
             { "name": "Activity Name", "type": "Activity", "cost": 0, "description": "Short note" },
             { "name": "Hotel Name", "type": "Stay", "cost": 0, "description": "Short note" },
             { "name": "Restaurant Name", "type": "Food", "cost": 0, "description": "Short note" }
          ],
          "transportToNext": {
             "mode": "Flight", 
             "duration": "2h 30m",
             "cost": 150
          }
        }
      ]
    }
    
    RULES:
    1. "transportToNext" describes how to get to the *next* stop in the list. For the last stop, set mode to "None".
    2. Transport modes must be one of: Flight, Train, Car, Bus, Ferry, Walk.
    3. Activity types must be one of: Activity, Food, Stay.
    4. Coordinates (lat/lng) must be accurate for the location.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Plan a detailed trip based on this request: "${prompt}". The start date is ${startDate}.`,
      config: {
        responseMimeType: "application/json",
        systemInstruction: systemInstruction,
        // Remove explicit responseSchema to prevent validation failures on complex nested objects
      }
    });

    const text = response.text;
    console.log("Raw AI Response:", text); // Keep debug log

    if (text) {
      const parsed = safeJsonParse(text);
      if (!parsed.stops || !Array.isArray(parsed.stops)) {
          throw new Error("Invalid response format: 'stops' array is missing.");
      }
      return parsed;
    }
    throw new Error("No data returned from AI service.");

  } catch (error) {
    console.error("Gemini Itinerary Generation Error:", error);
    throw error;
  }
};
