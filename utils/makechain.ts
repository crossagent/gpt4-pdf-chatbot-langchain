import { OpenAI } from 'langchain/llms/openai';
import { PineconeStore } from 'langchain/vectorstores/pinecone';
import { ConversationalRetrievalQAChain } from 'langchain/chains';
import {MyCallbackHandler} from 'utils/mycallback'
import fs from 'fs';
import path from 'path';

const CONDENSE_PROMPT = `Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question in chinese.

Chat History:
{chat_history}
Follow Up Input: {question}
Standalone question:`;

const QA_PROMPT = `You are the SOC project assistant. SOC is a survival shooting game. I am a developer in the project team.Please provide support based on the following pieces of context and answer the question at the end in chinese.
If you don't know the answer, just say you don't know. DO NOT try to make up an answer.
If the question is not related to the context, politely respond that you are tuned to only answer questions that are related to the Knowledge Base.

{context}

Question: {question}
Helpful answer in markdown:`;

// 读取prompt目录下的json文件
function readJSONFile(version: string): { CONDENSE_PROMPT: string, QA_PROMPT: string } {
  const fileName = path.join("prompts", version, `CONDENSE_PROMPT.txt`);
  
  if (!fs.existsSync(fileName)) {
    throw new Error(`File ${fileName} does not exist.`);
  }
  
  const fileContent = fs.readFileSync(fileName, 'utf-8');
  const CONDENSE_PROMPT : string =  fileContent.trim(); // 去除首尾空白字符

  const fileName2 = path.join("prompts", version, `QA_PROMPT.txt`);

  if (!fs.existsSync(fileName2)) {
    throw new Error(`File ${fileName2} does not exist.`);
  }
  
  const fileContent2 = fs.readFileSync(fileName2, 'utf-8');
  const QA_PROMPT : string =  fileContent2.trim(); // 去除首尾空白字符

  return {CONDENSE_PROMPT, QA_PROMPT}
}

// Example usage
const result = readJSONFile(process.env.PROMPT_VERSION as string);

export const makeChain = (vectorstore: PineconeStore) => {
  const model = new OpenAI({
    temperature: 0, // increase temepreature to get more creative answers
    modelName: process.env.GPT_MODEL, //change this to gpt-4 if you have access
  });

  var handler = new MyCallbackHandler() 

  const chain = ConversationalRetrievalQAChain.fromLLM(
    model,
    vectorstore.asRetriever(),
    {
      qaTemplate: result.QA_PROMPT,
      questionGeneratorTemplate: result.CONDENSE_PROMPT,
      returnSourceDocuments: true, //The number of source documents returned is 4 by default
    },
  );

  chain.questionGeneratorChain.callbacks = [handler];

  return chain;
};
