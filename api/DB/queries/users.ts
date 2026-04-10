import { hashSync } from "@node-rs/bcrypt";

import { pool } from "../dbConnection.js";
import { CustomError } from "../../utils/CustomError.js";

interface IUser{
  name:string
  email:string
  password:string
}

enum EUserRoles{
  visitor='visitor',
  user='user',
  admin= 'admin'

}

interface IDBUser extends IUser{
  id:string
  credits:number
  active:boolean
  created_at:string
  updated_at:string
  expiration_date:string
  role:EUserRoles
  otp:string
  password_buffer:string
}

export async function createUserAndHashPassword(user_data:IUser){
  const query=/* sql */`
  INSERT INTO users (
    name,
    email,
    password,
    credits,
    role
  )
  VALUES ($1, $2, $3, $4, $5)
  RETURNING *
  `
  const paswordHashed=hashSync(user_data.password)

  const values=[
    user_data.name,
    user_data.email,
    paswordHashed,
    0,
    'user'
  ]

  try {
    const result = await pool.query(query, values);
    return result.rows[0]
  } catch (e) {
    throw new CustomError("We couldn't create the user",createUserAndHashPassword.name,e)
  }
}

export async function getUserByEmail(email: string): Promise<IDBUser | null> {
  const query = 'SELECT * FROM users WHERE email = $1';
  try{
    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
  }catch(e){
    throw new CustomError("We couldn't find the user",getUserByEmail.name,e)
  }
}

export async function getUserById(user_id: string): Promise<IDBUser> {
  const query = 'SELECT * FROM users WHERE id = $1';
  try{
    const result = await pool.query(query, [user_id]);
    return result.rows[0];
  }catch(e){
    throw new CustomError("We cound't find the user",'getUserById',JSON.stringify(e,null,2))
  }
}

export async function setOTPAndPasswordBuffer(user_id:string,OTP:string,newPassHashed:string){

  const query=/* sql */` 
    UPDATE users SET OTP = $1, password_buffer =$2 WHERE id = $3
  `
  const values=[OTP,newPassHashed,user_id]
  try{
    await pool.query(query,values);
  }catch(e){
    throw new CustomError("The server is busy",setOTPAndPasswordBuffer.name,e)
  }
}

export async function getUserByOTP(otp: string): Promise<IDBUser> {
  const query = 'SELECT * FROM users WHERE id = $1';
  try{
    const result = await pool.query(query, [otp]);
    return result.rows[0];
  }catch(e){
    throw new CustomError("We cound't find the user",getUserByOTP.name,e)
  }
}

export async function swapPasswordBufferedAndPassword(user_id:string,password_buffer:string){
  const query=/* sql */` 
    UPDATE users SET OTP = $1, password_buffer =$2, password= $3 WHERE id = $4
  `
  try{
    await pool.query(query,[null,null,password_buffer,user_id]);
  }catch(e){
    throw new CustomError("The server is busy",setOTPAndPasswordBuffer.name,e)
  }
}

export async function empytOTPandPasswordBuffer(user_id:string){
  const query=/* sql */` 
    UPDATE users SET OTP = $1, password_buffer =$2 WHERE id = $3
  `
  try{
    await pool.query(query,[null,null,user_id]);
  }catch(e){
    throw new CustomError("The server is busy",setOTPAndPasswordBuffer.name,e)
  }
}