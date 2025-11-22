import { GoogleGenAI, Type } from "@google/genai";

// Interface for raw Gemini response
interface GeminiProductItem {
  name: string;
  originalPrice: number;
  boundingBox: number[]; // [ymin, xmin, ymax, xmax]
}

export const parsePageWithGemini = async (imageBase64: string): Promise<GeminiProductItem[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key missing");
  }

  // Basic validation for base64 string
  if (!imageBase64 || !imageBase64.includes(',')) {
    console.warn("Invalid image data provided to Gemini");
    return [];
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const base64Data = imageBase64.split(',')[1]; // Remove data:image/jpeg;base64, prefix

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Data
            }
          },
          {
            text: `Analyze this image of a Paraguayan perfume catalog.
            Identify all products listed.
            For each product, extract:
            1. Name
            2. Price in Guaraníes (convert "120.000" to integer 120000).
            3. The bounding box of the PERFUME BOTTLE image associated with that price. 
               If there are multiple products, be precise matching the photo to the text.
            
            Format: Return a JSON array. Bounding box must be [ymin, xmin, ymax, xmax] normalized 0-1.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              originalPrice: { type: Type.INTEGER },
              boundingBox: {
                type: Type.ARRAY,
                items: { type: Type.NUMBER },
                description: "ymin, xmin, ymax, xmax"
              }
            },
            required: ["name", "originalPrice", "boundingBox"],
          },
        },
      },
    });

    let jsonText = response.text;
    if (!jsonText) return [];
    
    // Clean potential markdown code blocks which Gemini sometimes adds despite JSON config
    jsonText = jsonText.replace(/```json|```/g, '').trim();
    
    const parsedData = JSON.parse(jsonText) as GeminiProductItem[];
    return parsedData;
  } catch (error) {
    console.error("Gemini Page Analysis Error:", error);
    return []; // Return empty on error to allow other pages to continue
  }
};