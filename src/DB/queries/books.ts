import { CustomError } from "../../utils/CustomError.js";
import { pool } from "../dbConnection.js";

interface IBook{
  title:string
  user_id:string
  path:string
}

interface IBookDB extends IBook{
  id:string
  created_at:string
  embedded_pages:number
}

export async function createBook(book_data:IBook){
  const query=/* sql */`
  INSERT into books(
    title,
    user_id,
    path
  )
  VALUES ($1, $2, $3)
  RETURNING *
  `
  const values=[
    book_data.title,
    book_data.user_id,
    book_data.path
  ]

  try {
    const result = await pool.query(query, values);
    return result.rows[0]
  } catch (error) {
    throw new CustomError(`Failed to create user ${error}`,createBook.name,error);
  }

}

interface IUpdateBookByIdInput{
  title?:string
  user_id?:string
  path?:string
  embedded_pages?:number
}
  
export async function updateBookById(id: string, input: IUpdateBookByIdInput) {
  // Filter out undefined values
  const updates = Object.entries(input)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value], index) => `${key} = $${index + 1}`);
  
  const values = Object.values(input).filter(v => v !== undefined);

  if (updates.length === 0) {
    throw new Error('No fields provided for update');
  }

  const query = `
    UPDATE books 
    SET ${updates.join(', ')}
    WHERE id = $${values.length + 1}
    RETURNING *
  `;
  
  values.push(id);

  try {
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error(`Book with id ${id} not found`);
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('Error updating book:', error);
    throw error;
  }
}

export async function getBooksByUserID(userId:string){
  const query=/* sql */`
    SELECT * FROM books
    WHERE user_id = $1;
  `
  try{
    const { rows } = await pool.query(query, [userId]);
    return rows;
  }catch(e){
    throw new CustomError("Internal error",getBooksByUserID.name,e)
  }
}

export async function getBookByPath(path:string):Promise<IBookDB[]>{
  const query=/* sql */`
    SELECT * FROM books
    WHERE path = $1;
  `
  try{
    const { rows } = await pool.query(query, [path]);
    return rows as IBookDB[];
  }catch(e){
    throw new CustomError("Internal error",getBookByPath.name,e)
  }
}

export async function getBookById(id:string):Promise<IBookDB>{
  const query=/* sql */`
    SELECT * FROM books
    WHERE id = $1;
  `
  try{
    const { rows } = await pool.query(query, [id]);
    return rows[0] as IBookDB;
  }catch(e){
    throw new CustomError("Internal error",getBookById.name,e)
  }
}


export async function deleteBookById(book_id:string){
  
}