import { Router } from "express";
import type { Response } from 'express';
import z from "zod";


import { llmCall } from "../models/llmCall.js";
import { text2vectors } from "../embeding/text2vectors.js";
import { Logger } from "../DB/queries/Logger.js";
import { generateSystemPrompt } from "./chat-routes.helpers/generateSystemPrompt.js";
import { responseWhenNoVectorsWereFound } from "./chat-routes.helpers/responseWhenNoVectorsWereFound.js";
import { chatRequestSchema, IchatRequest} from "../interfaces.js";
import { type AuthRequest } from "../middlewares/cookies.js";
import { getUserById } from "../DB/queries/users.js";
import { countTokens } from "../embeding/countTokens.js";
import { CustomError } from "../utils/CustomError.js";
import { getSimilarChunkFromMultipleBooks, getSimilarChunkFromUserBooks } from "../DB/queries/chunks.js";
import { reduceCredits } from "../DB/queries/payments.js";
import { calculateLllmCallPriceInCredits, llmCentsPerMillionTokens } from "../models/pricesLLMs.js";

export const chatRoutes=Router()

chatRoutes.post('/chat-with-vectors',async(req:AuthRequest,res)=>{
  const user_id=req.user?.user_id
  if(!user_id){
    const message=`We couldn't recognize the user`
    res.status(401).json({
      ok:false,
      message
    })
    return
  }
  
  try{

  const messages= req.body.messages as IchatRequest

  const strippedMessages = messages.map(({ role, content }) => ({
    role,
    content
  })) as IchatRequest;
  //metadata didn't got stripped

  const userMessagesValidation = chatRequestSchema.safeParse(strippedMessages);
  
  if (!userMessagesValidation.success||strippedMessages.length<1) {
    const message='The messages are malformed'
    res.status(400).json({
      ok:false,
      message
    })
    Logger.error(user_id,message,userMessagesValidation)
    return
  }

  const {books}=req.body
  const booksSchema=z.array(
    z.string()
  )
  const booksValidation=booksSchema.safeParse(books)
  if(!booksValidation.success||books.length<1){
    const message=`We didn't receive the books `
    res.status(400).json({
      message
    })
    Logger.error(user_id,message,booksValidation)
  }
  const messagesStringifyed=JSON.stringify(strippedMessages)

    const user= await getUserById(user_id)
    const tokensForAsking=await countTokens(messagesStringifyed)
    const temptativePriceInCredits=calculateLllmCallPriceInCredits(
      tokensForAsking,
      llmCentsPerMillionTokens["Llama-4-Scout-(17Bx16E)"].input
    )

    if(user?.credits<temptativePriceInCredits){
      const message=`Not enough credits`
      res.status(402).json({
        message
      })
      Logger.error(user_id,message,user)
      return
    }


    const vectorMessage=await text2vectors(messagesStringifyed)
    
    if (vectorMessage.data[0]?.embedding.length !== 1536) {
      const message='Server error, try again later'
      res.status(500).json({
        message
      })
      Logger.error(user_id,message,vectorMessage)
      return
    }

    const similarChunks=await getSimilarChunkFromUserBooks(
      vectorMessage.data[0]?.embedding,
      user_id,
      books
    )

    const pages=similarChunks.map(chunk=>{
      return chunk.page_number
    })

    const systemPrompt=generateSystemPrompt(similarChunks)
    const newMessages=[systemPrompt,...messages]

    //If the user has enough credits to make the vector search but not for the llmCall
    //the function will be executed anyways so no need for extra validations here
    const LLMResponse=await llmCall(newMessages)

    if(!LLMResponse.tokens){
      const message=`Internal error`
      res.status(500).json({
        message
      })
      Logger.error(user_id,message,LLMResponse,llmCall.name)
      return
    }

    const priceForAsking=calculateLllmCallPriceInCredits(
      tokensForAsking,
      llmCentsPerMillionTokens["Llama-4-Scout-(17Bx16E)"].input
    )
    const priceForAnswering=calculateLllmCallPriceInCredits(
      LLMResponse.tokens,
      llmCentsPerMillionTokens["Llama-4-Scout-(17Bx16E)"].output
    )
    const priceForEmbeding=calculateLllmCallPriceInCredits(
      vectorMessage.usage.total_tokens,
      llmCentsPerMillionTokens["text-embedding-3-small"].input
    )

    const newBalance=await reduceCredits(priceForAsking+priceForAnswering+priceForEmbeding,user_id)
    
    res.json({
      systemPrompt,
      LLMResponse:LLMResponse.message,
      credits:newBalance,
      pages
    })
  }catch(e){
    if(e instanceof CustomError){ 
      const message=`The server is busy, try again later`
        res.status(500).json({
          ok:false,
          message
        })
      Logger.error(user_id,message,e,e.functionName)
      return
    }
    const message=`Unknown error`
    res.status(500).json({
      message
    })
    Logger.error(user_id, message,e)
    return
  }
})

chatRoutes.get('/resources', async(req:AuthRequest,res)=>{
  const user_id=req.user?.user_id
  if(!user_id){
    res.json({
      credits:0,
      user_id:"",
      user_name:""
    })
    return
  }
  try{
    const user=await getUserById(user_id)
    if(!user){
      const message="User not found"
      res.status(404).json({
        message
      })
      Logger.warning(user_id,message,user,getUserById.name)
    }
    res.json({
      credits:user.credits,
      user_name:user.name
    })

  }catch(e){
    const message="Internal server error, try again later"
    if(e instanceof CustomError){
      res.status(500).json({
        message
      })
      Logger.error(user_id,message,e,e.functionName)
    }
    else{
      res.status(500).json({
        message
      })
      Logger.error(user_id,message,e)
    }

  }
})

chatRoutes.post('/',async(req:AuthRequest,res:Response)=>{
  const user_id=req.user?.user_id
  if(!user_id){
    const message=`You need to log in first`
    res.status(401).json({
      ok:false,
      message
    })
    Logger.error(null,message,user_id)
    return
  }

  const messages= req.body.messages as IchatRequest

  const strippedMessages = messages.map(({ role, content }) => ({
    role,
    content
  })) as IchatRequest;
  const result = chatRequestSchema.safeParse(strippedMessages);
  if (!result.success||!strippedMessages.length) {
    const message='The messages are malformed'
    res.status(400).json({
      ok:false,
      message
    })
    Logger.error(user_id,message,result)
    return
  }

  try{
    const user= await getUserById(user_id)
    const amountOfTokens=await countTokens(JSON.stringify(strippedMessages))

    const creditsForTheQuestion=calculateLllmCallPriceInCredits(
      amountOfTokens,
      llmCentsPerMillionTokens["Llama-4-Scout-(17Bx16E)"].input
    )

    if(user?.credits<creditsForTheQuestion){
      const message=`Not enough credits`
      res.status(402).json({
        message
      })
      Logger.warning(user_id,message,user)
      return
    }

    const LLMResponse=await llmCall(strippedMessages)
    
    if(!LLMResponse.tokens){
      const message=`Internal Error`
      res.status(500).json({
        message
      })
      Logger.error(user_id,message,LLMResponse,llmCall.name)
      return
    }

    const creditsForTheAnswer=calculateLllmCallPriceInCredits(
      LLMResponse.tokens,
      llmCentsPerMillionTokens["Llama-4-Scout-(17Bx16E)"].output
    )

    const newBalance=await reduceCredits(creditsForTheAnswer,user_id)

    res.json({
      ok:true,
      LLMResponse:LLMResponse.message,
      credits:newBalance,
    })
  }catch(e){
    if(e !instanceof CustomError){
      if (e.functionName == 'getUserById') {
        const message = `We counldn't find the user`;
        res.status(401).json({
          ok: false,
          message,
        });
        Logger.error(user_id, message, e.data);
        return
      }
      if(e.functionName=='countTokens'){
        const message=`There was an error on our side`
        res.status(500).json({
          message
        })
        Logger.error(user_id,message,e.data)
        return
      }
      if(e.functionName=='llama3call'){
        const message=`We couldn't contact the LLM provider`
        res.status(500).json({
          message
        })
        Logger.error(user_id,message,e.data)
        return
      }
    }
    const message="The server is busy"
    res.status(500).json({
      ok:false,
      message
    })
    Logger.error(user_id,message,e)
  }
})



