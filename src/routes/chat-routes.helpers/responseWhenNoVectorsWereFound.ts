import { ChatCompletionMessageParam } from "openai/resources";

export const responseWhenNoVectorsWereFound:ChatCompletionMessageParam[] = [
  {
    role: "assistant",
    content: "Sorry, I couldn't find any information, try with different words",
  },
];