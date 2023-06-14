import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import { cwd } from 'process';
import { join } from 'path';
import fs from 'fs';

// 连接 MongoDB 数据库
mongoose.connect(String(process.env.MONGODB_PATH));

// 获取数据库连接对象
const db = mongoose.connection;

// 定义数据模型
const historySchema = new mongoose.Schema({
    question: String,
    answer: String,
    transquestion: String,
    username: String,
    starttime: String,
    pageContent1: {content:String,sourcepath:String},
    pageContent2: {content:String,sourcepath:String},
    pageContent3: {content:String,sourcepath:String},
    pageContent4: {content:String,sourcepath:String},
    timestamp: Date
});

// 创建数据模型
const History = mongoose.models.SocProject || mongoose.model('SocProject', historySchema);

// 检测连接是否成功
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', function() {
  console.log('MongoDB connected!');
});

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
  ) {
    const { username, history, question, filetime, response } = req.body;    

    console.log(`save start ------------------------------ username:${username}`);

    //only accept post requests
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try
    {
        if (process.env.CHAT_LOG_STORAGE_METHOD == 'DataBase')
        {
            const pageContent = response.sourceDocuments.map((doc: { pageContent: String; metadata: { source: String; }; }) => ({
                content: doc.pageContent,
                sourcepath: doc.metadata.source
              }));
    
            const newHistory = new History({
                question: question,
                answer: response.text,
                transquestion: response.finalquestion || "no data",
                username:username,
                starttime:filetime,
                pageContent1: pageContent[0],
                pageContent2: pageContent[1],
                pageContent3: pageContent[2],
                pageContent4: pageContent[3],
                timestamp: new Date(),
            });

            await newHistory.save();

            res.status(200).json({ message: 'Database saved successfully' });
        }
        else if (process.env.CHAT_LOG_STORAGE_METHOD == 'File')
        {
          // 获取当前工作目录
          const currentDir = cwd();
    
          // 创建 logs 目录
          const logsDir = join(currentDir, 'logs');
          if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir);
          }
    
          // 创建 id 目录
          const idDir = join(logsDir, username);
          if (!fs.existsSync(idDir)) {
            fs.mkdirSync(idDir);
          }
    
          const filePath = join(idDir, `${filetime}.log`);
    
          const text = response.text;
    
          history.push([question as string, response.text]);
    
          const logContent = JSON.stringify({ ...history});
    
          if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, logContent, 'utf8');
          } else {
            fs.truncateSync(filePath); // 清空文件内容
            fs.appendFileSync(filePath, `\n${logContent}`, 'utf8');
          }

          res.status(200).json({ message: 'Datafile saved successfully' });
        }
    }catch (error) {
        console.error(error);
        res.status(500).json({ error: error });
    }
  }