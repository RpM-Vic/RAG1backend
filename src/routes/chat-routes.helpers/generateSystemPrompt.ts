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
    content: `Respond to the user with this info from a vector search: 
  ${ JSON.stringify({data2},null,2) }

  if you feel like the info was not meaningful then:
  Inform the user.
  Try to infer the answer but make sure you tell the user that this is what you THINK.
  Also, suggest other words to the user so the vector search could give better results.

  `,
  };
}
