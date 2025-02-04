import type { NextApiRequest, NextApiResponse } from 'next';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { PineconeStore } from 'langchain/vectorstores/pinecone';
import { makeChain } from '@/utils/makechain';
import { pinecone } from '@/utils/pinecone-client';
import { PINECONE_INDEX_NAME, PINECONE_NAME_SPACE } from '@/config/pinecone';
import { dataEmitter } from 'utils/eventEmitter';


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { question, history, username, filetime, konwledgebaseName } = req.body;

  console.log('question', question);

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

  const dataEventHandler = (data : { finalquestion: string }) => {
    console.log(`LLM-Question: ${data.finalquestion}`);
    // 更新内容
    finalquestion = data.finalquestion;
  };
  
  dataEmitter.on('dataEvent', dataEventHandler);

  try {
    const index = pinecone.Index(PINECONE_INDEX_NAME);

    const embeddings = new OpenAIEmbeddings({modelName: process.env.EMBEDDING_MODEL});

    console.log('namespace', konwledgebaseName);

    /* create vectorstore*/
    const vectorStore = await PineconeStore.fromExistingIndex(
      embeddings,
      {
        pineconeIndex: index,
        textKey: 'text',
        namespace: konwledgebaseName, //namespace comes from your config folder
      },
    );

    //create chain
    const chain = makeChain(vectorStore);

    //Ask a question using chat history
    const response = await chain.call({
      question: sanitizedQuestion,
      chat_history: history || [],
      verbose : true
    });

    console.log('response', response);
    response.finalquestion = finalquestion;

    // 在需要卸载该监听器的时候，使用 dataEventHandler 变量调用 off() 方法
    dataEmitter.off('dataEvent', dataEventHandler);

    res.status(200).json(response);

    //save chat history
    const payload = {
      question:question,
      history:history || [], 
      username:username,
      filetime:filetime,
      response:{text:response.text, sourceDocuments:response.sourceDocuments, finalquestion:finalquestion},
      embeddingmodel:process.env.EMBEDDING_MODEL,
      gptmodel:process.env.GPT_MODEL,
      knowageVersion:konwledgebaseName,
      promptTmplFile:process.env.PROMPT_VERSION,
    }

    const forwardUrl = `http://${req.headers.host}/api/save`;
    const headers = { 'Content-Type': 'application/json' };
    const saveResult = await fetch(forwardUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload),
    });

    const saveRst = await saveResult.json(); // 解析响应结果为JSON格式

    console.log(saveRst.message); // 打印保存的结果
  } catch (error: any) {
    console.log('error', error);
    res.status(500).json({ error: error.message || 'Something went wrong' });
  }
}
