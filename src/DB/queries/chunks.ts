import type { IChunk, IDBChunk } from "../../interfaces.js";
import { generateId } from "../../services/generateId.js";
import { CustomError } from "../../utils/CustomError.js";
import { pool } from "../dbConnection.js";



export async function saveChunk(chunkData:IChunk):Promise<IDBChunk>{
  const embeddingVector = `[${chunkData.embedding.join(',')}]`;
  const query=/* sql */`
  INSERT INTO chunks (
    book_id, 
    content, 
    hash_version, 
    embedding, 
    page_number, 
    chunk_index, 
    metadata, 
    token_count
  )
  VALUES ($1, $2, $3, $4::vector, $5, $6, $7, $8)
  RETURNING *
  `;
  const hash_version=generateId()
  const values=[       
    chunkData.book_id, 
    chunkData.content, 
    hash_version, 
    embeddingVector, 
    chunkData.page_number, 
    chunkData.chunk_index, 
    chunkData.metadata, 
    chunkData.token_count]

  try{
    const result = await pool.query(query, values);
    console.log('chunk saved')
    return result.rows[0] 
  }catch(e){
    throw e
  }
}
//only one chunk
export async function getChunkByBookId(book_id: string,page_number?:number): Promise<IDBChunk> {
  const usable_page_number=page_number||1
  if(usable_page_number<1){
    throw new CustomError("invalid input",getChunkByBookId.name,page_number)
  }

  const { rows } = await pool.query(/* sql */`
    SELECT * FROM chunks
    WHERE book_id = $1 AND page_number= $2
    LIMIT 1;
  `, [book_id,usable_page_number]);
  return rows[0] as IDBChunk;
}

export async function getSimilarChunkFromUserBooks(
  userQueryEmbedded: Array<number>,
  user_id: string,
  book_ids: string[], 
  limit: number = 5,
): Promise<IDBChunk[]> {
  
  // Convert the embedding array to PostgreSQL vector string format
  const queryVector = `[${userQueryEmbedded.join(',')}]`;
  
  const query = /* sql */`
    SELECT 
      c.*,
      1 - (c.embedding <=> $1::vector) as similarity_score
    FROM chunks c
    JOIN books b ON b.id = c.book_id
    WHERE c.book_id = ANY($3::uuid[])
      AND (b.visibility = 'public' OR b.user_id = $2)
    ORDER BY c.embedding <=> $1::vector
    LIMIT $4
  `;
  
  try {
    const result = await pool.query(query, [
      queryVector,
      user_id,
      book_ids,
      limit
    ]);
    
    return result.rows;
  } catch (error) {
    throw new CustomError('Failed to find similar chunks', getSimilarChunkFromUserBooks.name, error);
  }
}

export async function getSimilarChunkFromMultipleBooks(
  userQueryEmbedded: Array<number>,
  book_ids: string[], 
  limit: number = 5,
  similarityThreshold: number = 1 //0.7
): Promise<IDBChunk[]> {
  
  // Convert the embedding array to PostgreSQL vector string format
  const queryVector = `[${userQueryEmbedded.join(',')}]`;
  
  const query = /* sql */`
    SELECT 
      *,
      1 - (embedding <=> $1::vector) as similarity_score
    FROM chunks
    WHERE book_id = ANY($2::uuid[])
      AND 1 - (embedding <=> $1::vector) > $3
    ORDER BY embedding <=> $1::vector
    LIMIT $4
  `;
  
  try {
    const result = await pool.query(query, [
      queryVector,
      book_ids, 
      similarityThreshold,
      limit
    ]);
    
    return result.rows;
  } catch (error) {
    throw new CustomError('Failed to find similar chunks',getSimilarChunkFromMultipleBooks.name,error)
  }
}

export async function deleteAllChunksFromBook(book_id:string): Promise<number|null> {
    const query = 'DELETE FROM chunks WHERE book_id = $1 RETURNING id';
    
    try {
      const result = await pool.query(query, [book_id]);
      return result.rowCount;
    } catch (error) {
      throw new Error(`Failed to delete chunks for book: ${error}`);
    }
  }
