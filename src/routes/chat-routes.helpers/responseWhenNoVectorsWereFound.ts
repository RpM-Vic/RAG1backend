import type { ChatCompletionMessageParam } from "groq-sdk/src/resources/chat.js";

export const responseWhenNoVectorsWereFound:ChatCompletionMessageParam[] = [
  {
    role: "assistant",
    content: "Sorry, I couldn't find any information, try with different words",
  },
];