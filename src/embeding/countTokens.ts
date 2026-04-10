import { encoding_for_model } from "tiktoken";
/**
Gives an aproximation

Maybe later will count for multiple providers
Default:"text-embedding-3-small
*/
export async function countTokens(chunk: string,model?:string): Promise<number> {

  if(!model){
    const enc2=encoding_for_model("gpt-4.1-nano")
  }
  const enc2 = encoding_for_model("text-embedding-3-small");
  
  try {
    const enc3 = enc2.encode(chunk);
    return enc3.length;
  } finally {
    // Always free the encoder, even if an error occurs
    enc2.free();
  }
}
