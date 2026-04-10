import path from 'path';
import mime from 'mime-types';
import express, { type Request, type Response } from 'express';

const __dirname=process.cwd();

export const pages=express.Router();

pages.use(express.static(path.join(__dirname, 'public/browser'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      // No cache for HTML files
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    res.setHeader(
      'Content-Type',
      mime.lookup(path) || 'application/octet-stream'
    );
  },
})); 

pages.get('/',(req:Request,res:Response)=>{
  res.sendFile(path.join(__dirname, "public", "browser", "index.html"));
})

pages.get("/*foo",(req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "public", "browser", "index.html"));
});
