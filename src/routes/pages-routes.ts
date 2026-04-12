import {Router} from 'express'
import path from 'path';
import mime from 'mime-types';
import express from 'express';

const __dirname=process.cwd()

export const pages=Router()

pages.use(express.static(path.join(__dirname,
  'public',"browser"), {
  setHeaders: (res, path) => {
    res.setHeader('Content-Type', mime.lookup(path) || 'application/octet-stream');
  }
}));


pages.get('/*foo',
  async(req, res) => {
    const filePath = path.join(__dirname, 'public',"browser", `index.html`);
    res.sendFile(filePath) 
  }
);