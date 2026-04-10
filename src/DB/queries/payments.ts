import z from "zod";
import { pool } from "../dbConnection";
import { CustomError } from "../../utils/CustomError";
import { Logger } from "./Logger";
import type { IPurchaseOption } from "../../interfaces";

/* 
Usage is priced per input token. 
Below is an example of pricing pages of text per US dollar 
(assuming ~800 tokens per page):

Model	~ Pages per dollar ~	Performance on MTEB eval ~Max input
text-embedding-3-small	62,500	62.3%	8192

text-embedding-3-large	9,615	64.6%	8192

openAI price
62'500 pages/dollar  (800 tokens/page)

50'000'000 tokens/dollar

My price
*/

export async function getPurchaseOptions():Promise<IPurchaseOption[]>
{
  const {rows}= await pool.query(/* sql */`
    SELECT * FROM products`
  )
  return rows as IPurchaseOption[]

}


enum EStatus{
    processing='processing',
    completed='completed',
    failed='failed',
    other='other',
}

const registerPurchaseArgsSchema=z.object({
  provider:z.string(),
  provider_payment_id:z.string(),
  user_id:z.string(),
  product_id:z.string()
})

type IRegisterPurchaseArgs=z.infer<typeof registerPurchaseArgsSchema>

interface IPaymentDB extends IRegisterPurchaseArgs{
  id:string,
  status:EStatus
  metadata:{},
  created_at:string,
  updated_at:string,
  completed_at:string|null
}

//TO DO test this
export async function registerPurchase(args:IRegisterPurchaseArgs){
  const query=`INSERT INTO payments(
    provider,
    provider_payment_id,
    user_id,
    product_id
  )
  VALUES ($1,$2,$3,$4)
  RETURNING *
  `;
  const values=[...Object(args).values]
  try{
    const result = await pool.query(query, values);
    return result.rows[0] as IPaymentDB
  }catch(e){
    throw e
  }
}


export async function addCredits(credits: number, user_id: string, payment_id: string) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    await client.query(
      'UPDATE payments SET status = $1 WHERE id = $2',
      ['completed', payment_id]
    );
    
    await client.query(
      'UPDATE users SET credits = credits + $1 WHERE id = $2',
      [credits, user_id]
    );
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw new CustomError('Failed to modify credits',addCredits.name,error)
  } finally {
    client.release();
  }
}

export async function reduceCredits(credits: number, user_id: string) {
  const roundedCredits = Math.round(credits)*-1;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const result = await client.query(
      'UPDATE users SET credits = credits + $1 WHERE id = $2 RETURNING credits',
      [roundedCredits, user_id]
    );
    
    await client.query('COMMIT');
    
    if (result.rows.length === 0) {
      throw new CustomError('User not found', reduceCredits.name);
    }
    Logger.info(user_id,`User spend credits`,roundedCredits)
    return result.rows[0].credits; 
  } catch (error) {
    await client.query('ROLLBACK');
    throw new CustomError('Failed to modify credits', reduceCredits.name, error);
  } finally {
    client.release();
  }
}