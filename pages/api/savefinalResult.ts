import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import db from '@/utils/db';


// 定义数据模型
const historySchema = new mongoose.Schema({
    history: String,
    rating: String,
    username: String,
    starttime: String,
    embeddingmodel: String,
    gptmodel: String,
    knowageVersion: String,
    promptTmplFile: String,
    timestamp: Date
});

// 创建数据模型
const HistoryRate = mongoose.models.SocProjectRate || mongoose.model('SocProjectRate', historySchema);

db.connect();

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
  ) {
    const { username, history, rating, filetime, konwledgebaseName} = req.body;    

    console.log(`save start final ------------------------------ username:${username}`);

    //only accept post requests
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try
    {
        if (process.env.CHAT_LOG_STORAGE_METHOD == 'DataBase')
        {
          type HistoryItem = [string, string][]; // [question, answer][]

          let output = "";

          history.forEach((item : HistoryItem) => {
            output += `${username}:${item[0]}\n\n`;
            output += `AI:${item[1]}\n`;
            output += `------------------------------------------------\n`;
          });
        
          output.trim(); // 去除末尾的换行符

            const historyfinal = new HistoryRate({
                history:output,
                rating:rating,
                username:username,
                starttime:filetime,
                embeddingmodel:process.env.EMBEDDING_MODEL,
                gptmodel:process.env.GPT_MODEL,
                knowageVersion:konwledgebaseName,
                promptTmplFile:process.env.PROMPT_VERSION,
                timestamp: new Date(),
            });

            await historyfinal.save();

            res.status(200).json({ message: 'Database saved successfully' });
        }
    }catch (error) {
        console.error(error);
        res.status(500).json({ error: error });
    }
  }