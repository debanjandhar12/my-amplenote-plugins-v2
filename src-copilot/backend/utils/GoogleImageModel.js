// Custom implementation of Google Image Model for AI SDK
// Since Google AI SDK doesn't support image models natively, we're implementing a compatible interface

export function createGoogleImageModel(apiKey, modelId = 'imagen-3.0-generate-002', maxImagesPerCall = 4) {
  return {
    specificationVersion: "v1",
    provider: "google",
    modelId,
    maxImagesPerCall,

    async doGenerate(options) {
      const { prompt, size } = options;

      // Prepare parameters for the API request
      const parameters = {
        sampleCount: this.maxImagesPerCall
      };

      // Calculate aspectRatio from size if provided
      if (size) {
        const [width, height] = size.split('x').map(Number);
        if (width && height) {
          // Google API expects aspectRatio as a string like "1:1", "16:9", etc.
          // We'll calculate the closest standard aspect ratio
          if (width === height) {
            parameters.aspectRatio = "1:1";
          } else if (width > height) {
            const ratio = width / height;
            if (ratio >= 1.7 && ratio <= 1.8) {
              parameters.aspectRatio = "16:9";
            } else if (ratio >= 1.3 && ratio <= 1.4) {
              parameters.aspectRatio = "4:3";
            }
          } else {
            const ratio = height / width;
            if (ratio >= 1.7 && ratio <= 1.8) {
              parameters.aspectRatio = "9:16";
            } else if (ratio >= 1.3 && ratio <= 1.4) {
              parameters.aspectRatio = "3:4";
            }
          }
        }
      }

      // Make the API request
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.modelId}:predict?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            instances: [
              {
                prompt
              }
            ],
            parameters
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Google API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();

      // Extract images from the response
      const images = data.predictions?.[0]?.candidates?.map(candidate => 
        candidate.output
      ) || [];

      // Return in the format expected by the AI SDK
      return {
        images,
        warnings: [],
        response: {
          timestamp: new Date(),
          modelId: this.modelId,
          headers: Object.fromEntries(response.headers)
        }
      };
    }
  };
}
