
import { Router } from "express";
import { countTokens } from "../embeding/countTokens";
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { text2vectors } from "../embeding/text2vectors";
import { Logger } from "../DB/queries/Logger";
import { loadBookFromCloud } from "./embed.helpers/loadPDFformCould";
import type { AuthRequest } from "../middlewares/cookies";
import { z } from 'zod';
import { getBookById, getBookByPath, updateBookById } from "../DB/queries/books";
import { getChunkByBookId, saveChunk } from "../DB/queries/chunks";
import { getUserById } from "../DB/queries/users";
import { calculateLllmCallPriceInCredits, llmCentsPerMillionTokens } from "../models/pricesLLMs";
import { reduceCredits } from "../DB/queries/payments";

export const embedBook = Router();

embedBook.post('/', async (req:AuthRequest, res) => {
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

  const {book_id,startFromPage}=req.body
  const inputSchema=z.object({
    book_id:z.string(),
    startFromPage:z.number().min(1).int()
  })
  const inputValidation=inputSchema.safeParse({book_id,startFromPage})
  if(!inputValidation.success){
    const message="Bad request"
    res.status(400).json({
      message
    })
    Logger.warning(user_id,message,{book_id})
    return    
  }

  try {
    const book=await getBookById(book_id)
    const user=await getUserById(user_id)

    //make it idempotent
    const existingchunks=await getChunkByBookId(book_id,startFromPage)
    if(existingchunks){
      const message='this manual has been embedded already'
      res.json({
        message
      })
      Logger.warning(user_id,message,existingchunks)
      return
    }

    const arrayBuffer=await loadBookFromCloud(book.path)
    const loadingTask = getDocument({data:arrayBuffer});
    const pdf = await loadingTask.promise;
    const totalPages = pdf.numPages;
    if(totalPages<startFromPage){
      const message="There is an error in the number of pages"
      res.status(400).json({
        message
      })
      Logger.info(user_id,message,{totalPages,startFromPage})
      return
    }
    
    let userCreditsBuffer=user.credits
    for (let currentPageNum = startFromPage;currentPageNum<=totalPages;currentPageNum++) {
      const pageGotten = await pdf.getPage(currentPageNum);
      const textContent = await pageGotten.getTextContent();

      console.log('flag 1')
      const pageText = textContent.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ');

      //asuming blank pages have at least the page number
      if(pageText.length<6){
        continue
      }
      console.log('flag 2')

      const amountOfTokens = await countTokens(pageText);

      const creditsForTheQuestion=calculateLllmCallPriceInCredits(
        amountOfTokens,
        llmCentsPerMillionTokens["text-embedding-3-small"].input
      )

      if(userCreditsBuffer<creditsForTheQuestion){
        await reduceCredits(user.credits-userCreditsBuffer,user_id)
        await updateBookById(book_id,{embedded_pages:currentPageNum})
        const message=`Not enough credits`
        res.status(402).json({
          message
        })
        Logger.warning(user_id,message,user)
        return
      }

      console.log('flag 3')
      const vector=await text2vectors(pageText)
      if (vector.data[0]?.embedding.length !== 1536) {
        await reduceCredits(user.credits-userCreditsBuffer,user_id)
        await updateBookById(book_id,{embedded_pages:currentPageNum})
        const message='The data from openAI is not what we expected'
        res.json({
          message
        })
        return
      }
      const creditsForEmbeding=calculateLllmCallPriceInCredits(
        vector.usage.total_tokens,
        llmCentsPerMillionTokens["text-embedding-3-small"].input
      )

      userCreditsBuffer-=creditsForEmbeding

      console.log('flag 4')

      await saveChunk({
        user_id,
        book_id,
        content: pageText,
        embedding: vector.data[0]?.embedding,
        page_number: currentPageNum,
        chunk_index: currentPageNum,
        token_count: vector.usage.total_tokens,
        metadata: undefined
      })
    }

    const bookUpdated=await updateBookById(book_id,{embedded_pages:totalPages})
    const newBalance=await reduceCredits(user.credits-userCreditsBuffer,user_id)
    const message='Book embeded succesfully'
    res.json({
      ok:true,
      message,
      bookUpdated,
      credits:newBalance
    })
  } catch (e) {
    const message = `We couldn't embed the pdf`;
    res.json({
      message,
    });
    Logger.error(user_id,message,e)
  }

});

