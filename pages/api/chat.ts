import type { NextApiRequest, NextApiResponse } from 'next';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { PineconeStore } from 'langchain/vectorstores/pinecone';
import { makeChain } from '@/utils/makechain';
import { pinecone } from '@/utils/pinecone-client';
import { PINECONE_INDEX_NAME, PINECONE_NAME_SPACE } from '@/config/pinecone';
import { cwd } from 'process';
import { join } from 'path';
import fs from 'fs';
import { dataEmitter } from 'utils/eventEmitter';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { question, history, id, filetime } = req.body;

  console.log('question', question, 'id', id, 'filetime', filetime);

  //only accept post requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!question) {
    return res.status(400).json({ message: 'No question in the request' });
  }
  // OpenAI recommends replacing newlines with spaces for best results
  const sanitizedQuestion = question.trim().replaceAll('\n', ' ');

  let finalquestion = '';

  dataEmitter.on('dataEvent', (data) => {
    console.log(`Received message: ${data.finalquestion}`);
    // 更新内容
    finalquestion = data.finalquestion;
  });

  try {
    const index = pinecone.Index(PINECONE_INDEX_NAME);

    /* create vectorstore*/
    const vectorStore = await PineconeStore.fromExistingIndex(
      new OpenAIEmbeddings({}),
      {
        pineconeIndex: index,
        textKey: 'text',
        namespace: PINECONE_NAME_SPACE, //namespace comes from your config folder
      },
    );

    //create chain
    const chain = makeChain(vectorStore);

    //Ask a question using chat history
    const response = await chain.call({
      question: sanitizedQuestion,
      chat_history: history || []
    });

    //console.log('response', response);
    response.finalquestion = finalquestion;
    res.status(200).json(response);

    // 获取当前工作目录
    const currentDir = cwd();

    // 创建 logs 目录
    const logsDir = join(currentDir, 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir);
    }

    // 创建 id 目录
    const idDir = join(logsDir, id);
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
  } catch (error: any) {
    console.log('error', error);
    res.status(500).json({ error: error.message || 'Something went wrong' });
  }
}
