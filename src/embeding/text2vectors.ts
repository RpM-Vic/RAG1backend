import OpenAI from "openai";
import { CustomError } from "../utils/CustomError";
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY 
});

export async function text2vectors(chunk:string[]|string){

  try{
    const embedding=await openai.embeddings.create({
      model:"text-embedding-3-small",
      input: chunk,
      encoding_format: "float",
    });
    return embedding
  }catch(e){
    throw new CustomError(`Failed to convert vectors into chucks`,text2vectors.name,e)
  }
  
}

/* 

Usage is priced per input token. 
Below is an example of pricing pages of text per US dollar 
(assuming ~800 tokens per page):

Model	~ Pages per dollar ~	Performance on MTEB eval ~Max input
text-embedding-3-small	62,500	62.3%	8192

text-embedding-3-large	9,615	64.6%	8192

openAI price
62500page/dollar  (800 tokens/page)

50'000'000 tokens/dollar

My price

1 page= 800tokens= 1 credit

3 dollars            7 dollars           15 dollars
60'000 credits      160'000 credits      350'000 credits

*/