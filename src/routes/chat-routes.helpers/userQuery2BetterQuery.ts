import type { ChatCompletionSystemMessageParam } from 'groq-sdk/resources/chat.mjs';
import type { IDBChunk } from '../../interfaces.js';

export function generateSystemPrompt(vectorSearch: IDBChunk[])
  :ChatCompletionSystemMessageParam {
  const data2 = vectorSearch.map((chunk) => {
    return {
      textOnly: chunk.content,
      page_number: chunk.page_number,
    };
  });

  return {
    role: 'system',
    content: `You convert the user query, in some text that will 
    be more friendly with the vector search. The infor fetched from the vector search
    will be analized later

    user query:
  ${ JSON.stringify({data2},null,2) }

  `,
  };
}
