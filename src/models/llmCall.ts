import Groq from "groq-sdk";
import { z } from "zod";
import { CustomError } from "../utils/CustomError.js";
import { chatRequestSchema } from "../interfaces.js";

const groq=new Groq({apiKey:process.env.GROQ_API_KEY})

type IchatRequest =z.infer<typeof chatRequestSchema>

export async function llmCall(messages: IchatRequest) {
  try{
    const completion = await groq.chat.completions.create({
      // model:'llama-3.3-70b-versatile', $0.59/1M tokens
      model:"meta-llama/llama-4-scout-17b-16e-instruct",//$0.11/1M tokens
      messages
    });
    const LLMresponse = {
      message:completion.choices[0]?.message,
      tokens:completion.usage?.total_tokens
    }
    return LLMresponse;
  }catch(e){
    throw new CustomError(`We cound't call the LLM`, llmCall.name,JSON.stringify(e,null,2))
  }
}