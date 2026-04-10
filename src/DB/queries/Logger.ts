import { pool } from '../dbConnection';

enum levelEnum {
  warning = 'warning',
  info = 'info',
  error = 'error',
}

export class Logger {
  static async dbLog(user_id:string,level: levelEnum, message: string, data?: any,function_name?:string) {
    const happened_at = new Date().toISOString();
    const thisdata = data || '';
    const thisfunction_name=function_name||''

    const query = `INSERT INTO logs(
      user_id,
      level,
      message,
      data,
      function_name,
      happened_at
    ) VALUES ($1, $2, $3, $4,$5)`;

    try {
      await pool.query(query, [
        user_id,
        level, 
        message, 
        thisdata,
        thisfunction_name,
        happened_at
      ]);
    } catch (error) {
      console.error('Error inserting log:', error);
      throw error;
    }
  }

  static mylog(level: levelEnum, user_id: string, message: string, data?: any,function_name?:string) {
    const dataString=JSON.stringify(data,null,2)
    if (process.env.environment == 'development') {
      if (data == undefined) {
        console.log(level, message);
      } else {
        console.log(level, message, dataString,function_name);
      }
    }else{
      this.dbLog(user_id,level,message,dataString,function_name)
    }
  }

  static warning(user_id: string, message: string, data?: any,function_name?:string) {
    this.mylog(levelEnum.warning, user_id, message, data,function_name);
  }
  static info(user_id: string, message: string, data?: any,function_name?:string) {
    this.mylog(levelEnum.info, user_id, message, data,function_name);
  }
  static error(user_id: string, message: string, data?: any,function_name?:string) {
    this.mylog(levelEnum.error, user_id, message, data,function_name);
  }
}
