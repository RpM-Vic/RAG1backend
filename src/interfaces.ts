import { z } from "zod";
import type { ChatCompletionMessageParam } from "groq-sdk/resources/chat.mjs";

const chatCompletionMessageParamSchema: z.ZodType<ChatCompletionMessageParam> = z.union([
  z.object({
    role: z.literal("system"),
    content: z.string(),
  }),
  z.object({
    role: z.literal("user"),
    content: z.string(),
  }),
  z.object({
    role: z.literal("assistant"),
    content: z.string(),
  }),
]);

export const chatRequestSchema = z.array(chatCompletionMessageParamSchema);

export type IchatRequest =z.infer<typeof chatRequestSchema>

interface IChunkMetadata{
  [key: string]: any; 
}

export interface IChunk{
  user_id:string
  book_id:string
  content:string
  embedding:Array<number>
  page_number:number
  chunk_index:number
  token_count:number
  metadata?:IChunkMetadata
}

export interface IDBChunk extends IChunk{
  id:string
  created_at:string
  updated_at:string
}


export const productSchema=z.object({
  id:z.string(),
  price:z.number(),
  currency:z.string(),
  credits:z.number(),
  description:z.string()
})

export type IPurchaseOption=z.infer<typeof productSchema>

export const IPurchaseMetadataSchema=z.object({
  id: z.string().min(1, "ID is required"),
  product_id:z.string(),
  user_id: z.string().min(1, "User ID is required"),
  provider: z.enum(["stripe", "paypal", "other"]) 
})


type IPrePurchaseMetadata=z.infer<typeof IPurchaseMetadataSchema>

export type IPurchaseMetadata=IPrePurchaseMetadata & Record<string, string>;