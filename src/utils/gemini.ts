import { GoogleGenAI, createPartFromUri } from '@google/genai';
import type { GeminiModel, ThinkingBudget } from '../types/chat';
import { GEMINI_MODELS } from '../types/chat';

let genAI: GoogleGenAI | null = null;

export const initializeGemini = (apiKey: string) => {
  genAI = new GoogleGenAI({ apiKey });
};

// Helper function to check if file is PDF
const isPDF = (file: File): boolean => {
  return file.type === 'application/pdf';
};

// Helper function to check if file is an image
const isImage = (file: File): boolean => {
  return (
    file.type.startsWith('image/') &&
    [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
      'image/heic',
      'image/heif',
    ].includes(file.type)
  );
};

// Helper function to convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data:image/type;base64, prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

// Helper function to convert thinking budget to token count
const getThinkingBudgetValue = (
  budget: ThinkingBudget,
  model: GeminiModel
): number => {
  const modelInfo = GEMINI_MODELS[model];
  const { max } = modelInfo.thinkingRange;

  switch (budget) {
    case 'dynamic':
      return -1;
    case 'none':
      return 0;
    case 'low':
      return Math.floor(max / 3);
    case 'medium':
      return Math.floor((max * 2) / 3);
    case 'high':
      return max;
    default:
      return -1; // Default to dynamic
  }
};

export const sendMessageToGemini = async (
  message: string,
  conversationHistory: any[] = [],
  attachments: File[] = [],
  modelName: GeminiModel = 'gemini-2.5-flash'
) => {
  if (!genAI) {
    throw new Error('Gemini API not initialized');
  }

  console.log('GenAI object:', genAI);
  console.log('Available methods:', Object.getOwnPropertyNames(genAI));
  console.log('Conversation history length:', conversationHistory.length);

  try {
    // Build the contents array starting with conversation history
    let contents: any[] = [];

    // Add conversation history if it exists
    if (conversationHistory.length > 0) {
      contents = [...conversationHistory];
      console.log('Added conversation history:', conversationHistory);
    }

    // Prepare the current message content parts
    const currentMessageParts: any[] = [{ text: message }];

    // Process attachments
    if (attachments.length > 0) {
      console.log('Processing attachments...');

      for (const file of attachments) {
        if (isPDF(file)) {
          console.log(`Uploading PDF: ${file.name}`);

          // Upload PDF using File API
          const uploadedFile = await genAI.files.upload({
            file: file,
            config: {
              displayName: file.name,
            },
          });

          console.log('Uploaded PDF file:', uploadedFile);

          if (!uploadedFile.name) {
            throw new Error(`File upload failed for ${file.name}`);
          }

          // Wait for processing
          let getFile = await genAI.files.get({ name: uploadedFile.name });
          console.log('Initial PDF file state:', getFile);

          while (getFile.state === 'PROCESSING') {
            console.log(`PDF ${file.name} is processing...`);
            await new Promise((resolve) => setTimeout(resolve, 2000));
            getFile = await genAI.files.get({ name: uploadedFile.name });
          }

          console.log('Final PDF file state:', getFile);

          if (getFile.state === 'FAILED') {
            throw new Error(`PDF processing failed for ${file.name}`);
          }

          // Add file to current message parts
          if (getFile.uri && getFile.mimeType) {
            const fileContent = createPartFromUri(
              getFile.uri,
              getFile.mimeType
            );
            currentMessageParts.push(fileContent);
            console.log('Added PDF to content:', fileContent);
          }
        } else if (isImage(file)) {
          console.log(`Processing image: ${file.name}`);

          const fileSizeMB = file.size / (1024 * 1024);

          // Use File API for large images (>10MB) or inline data for smaller images
          if (fileSizeMB > 10) {
            console.log(`Using File API for large image: ${file.name}`);

            const uploadedFile = await genAI.files.upload({
              file: file,
              config: {
                displayName: file.name,
                mimeType: file.type,
              },
            });

            console.log('Uploaded image file:', uploadedFile);

            if (!uploadedFile.name) {
              throw new Error(`Image upload failed for ${file.name}`);
            }

            // Wait for processing (images usually process quickly)
            let getFile = await genAI.files.get({ name: uploadedFile.name });
            let attempts = 0;

            while (getFile.state === 'PROCESSING' && attempts < 10) {
              console.log(`Image ${file.name} is processing...`);
              await new Promise((resolve) => setTimeout(resolve, 1000));
              getFile = await genAI.files.get({ name: uploadedFile.name });
              attempts++;
            }

            if (getFile.state === 'FAILED') {
              throw new Error(`Image processing failed for ${file.name}`);
            }

            // Add file to current message parts
            if (getFile.uri && getFile.mimeType) {
              const fileContent = createPartFromUri(
                getFile.uri,
                getFile.mimeType
              );
              currentMessageParts.push(fileContent);
              console.log('Added image via File API to content:', fileContent);
            }
          } else {
            console.log(`Using inline data for image: ${file.name}`);

            // Use inline data for smaller images
            const base64Data = await fileToBase64(file);
            const imageContent = {
              inlineData: {
                mimeType: file.type,
                data: base64Data,
              },
            };
            currentMessageParts.push(imageContent);
            console.log('Added image via inline data to content');
          }
        }
      }
    }

    // Add the current user message (with any attachments) to contents
    contents.push({
      role: 'user',
      parts: currentMessageParts,
    });

    console.log('Final contents for API:', contents);

    // Make the API call with the complete conversation
    const response = await genAI.models.generateContent({
      model: modelName,
      contents: contents,
    });

    console.log('API Response received:', response);
    return response.text || "Sorry, I couldn't generate a response.";
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw error;
  }
};

export const sendMessageToGeminiStream = async (
  message: string,
  conversationHistory: any[] = [],
  attachments: File[] = [],
  modelName: GeminiModel = 'gemini-2.5-flash',
  thinkingBudget: ThinkingBudget = 'dynamic',
  temperature: number = 0.7,
  onChunk: (chunk: string) => void
) => {
  if (!genAI) {
    throw new Error('Gemini API not initialized');
  }

  try {
    // Build the contents array
    let contents: any[] = [];

    if (conversationHistory.length > 0) {
      contents = [...conversationHistory];
    }

    const currentMessageParts: any[] = [{ text: message }];

    // Process attachments (same logic as before)
    if (attachments.length > 0) {
      for (const file of attachments) {
        if (isPDF(file)) {
          const uploadedFile = await genAI.files.upload({
            file: file,
            config: {
              displayName: file.name,
            },
          });

          if (!uploadedFile.name) {
            throw new Error(`PDF upload failed for ${file.name}`);
          }

          let getFile = await genAI.files.get({ name: uploadedFile.name });
          while (getFile.state === 'PROCESSING') {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            getFile = await genAI.files.get({ name: uploadedFile.name });
          }

          if (getFile.state === 'FAILED') {
            throw new Error(`PDF processing failed for ${file.name}`);
          }

          if (getFile.uri && getFile.mimeType) {
            const fileContent = createPartFromUri(
              getFile.uri,
              getFile.mimeType
            );
            currentMessageParts.push(fileContent);
          }
        } else if (isImage(file)) {
          const fileSizeMB = file.size / (1024 * 1024);

          if (fileSizeMB > 10) {
            // Use File API for large images
            const uploadedFile = await genAI.files.upload({
              file: file,
              config: {
                displayName: file.name,
                mimeType: file.type,
              },
            });

            if (!uploadedFile.name) {
              throw new Error(`Image upload failed for ${file.name}`);
            }

            let getFile = await genAI.files.get({ name: uploadedFile.name });
            let attempts = 0;

            while (getFile.state === 'PROCESSING' && attempts < 10) {
              await new Promise((resolve) => setTimeout(resolve, 1000));
              getFile = await genAI.files.get({ name: uploadedFile.name });
              attempts++;
            }

            if (getFile.state === 'FAILED') {
              throw new Error(`Image processing failed for ${file.name}`);
            }

            if (getFile.uri && getFile.mimeType) {
              const fileContent = createPartFromUri(
                getFile.uri,
                getFile.mimeType
              );
              currentMessageParts.push(fileContent);
            }
          } else {
            // Use inline data for smaller images
            const base64Data = await fileToBase64(file);
            const imageContent = {
              inlineData: {
                mimeType: file.type,
                data: base64Data,
              },
            };
            currentMessageParts.push(imageContent);
          }
        }
      }
    }

    contents.push({
      role: 'user',
      parts: currentMessageParts,
    });

    // Create config with thinking budget and temperature
    const thinkingBudgetValue = getThinkingBudgetValue(
      thinkingBudget,
      modelName
    );
    const config: any = {
      temperature: temperature, // Add temperature to config
    };

    // Only add thinking config if the model supports it and budget is not default
    if (
      thinkingBudgetValue !== -1 ||
      thinkingBudget !== GEMINI_MODELS[modelName].defaultThinking
    ) {
      config.thinkingConfig = {
        thinkingBudget: thinkingBudgetValue,
      };
    }

    console.log(
      'Using thinking budget:',
      thinkingBudget,
      '->',
      thinkingBudgetValue,
      'and temperature:',
      temperature
    );

    // Use streaming API with config
    const response = await genAI.models.generateContentStream({
      model: modelName,
      contents: contents,
      config: config,
    });

    let fullResponse = '';
    for await (const chunk of response) {
      const chunkText = chunk.text || '';
      fullResponse += chunkText;
      onChunk(chunkText);
    }

    return fullResponse;
  } catch (error) {
    console.error('Error calling Gemini streaming API:', error);
    throw error;
  }
};

export const isGeminiInitialized = () => genAI !== null;
