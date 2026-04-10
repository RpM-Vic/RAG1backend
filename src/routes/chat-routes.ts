import { Router } from "express";
import type { Response } from 'express';
import { llmCall } from "../models/llmCall";
import { text2vectors } from "../embeding/text2vectors";
import { Logger } from "../DB/queries/Logger";
import { generateSystemPrompt } from "./chat-routes.helpers/generateSystemPrompt";
import { responseWhenNoVectorsWereFound } from "./chat-routes.helpers/responseWhenNoVectorsWereFound";
import { chatRequestSchema} from "../interfaces";
import { type AuthRequest } from "../middlewares/cookies";
import { getUserById } from "../DB/queries/users";
import { countTokens } from "../embeding/countTokens";
import { CustomError } from "../utils/CustomError";
import { getSimilarChunkFromMultipleBooks, getSimilarChunkFromOneBook } from "../DB/queries/chunks";
import z from "zod";
import { reduceCredits } from "../DB/queries/payments";
import { calculateLllmCallPriceInCredits, llmCentsPerMillionTokens } from "../models/pricesLLMs";

export const chatRoutes=Router()

chatRoutes.post('/chat-with-vectors',async(req:AuthRequest,res)=>{
  const user_id=req.user?.user_id
  if(!user_id){
    const message=`We couldn't recognize the user`
    res.status(401).json({
      ok:false,
      message
    })
    Logger.error('Unknown user_id',message,user_id)
    return
  }

  const {messages}= req.body
  const userMessagesValidation = chatRequestSchema.safeParse(messages);

  if (!userMessagesValidation.success||messages.length<1) {
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
  const messagesStringifyed=JSON.stringify(messages)

  try{
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

    const similarChunks=await getSimilarChunkFromMultipleBooks(
      vectorMessage.data[0]?.embedding,
      books
    )


    const pages=[similarChunks[0]?.page_number]

    if(similarChunks.length<1){
      const LLMResponse=responseWhenNoVectorsWereFound
      res.json({
        LLMResponse,
      })
      return
    }

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
    Logger.error('unknown user_id',message,user_id)
    return
  }

  const {messages}= req.body

  console.log(messages)
  const result = chatRequestSchema.safeParse(messages);
  if (!result.success||!messages.length) {
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
    const amountOfTokens=await countTokens(JSON.stringify(messages))

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

    const LLMResponse=await llmCall(messages)
    
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
      credits:newBalance
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
    const message="Interal unkown error"
    res.status(500).json({
      ok:false,
      message
    })
    Logger.error(user_id,message,e)
  }
})



