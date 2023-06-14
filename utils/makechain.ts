import { OpenAI } from 'langchain/llms/openai';
import { PineconeStore } from 'langchain/vectorstores/pinecone';
import { ConversationalRetrievalQAChain } from 'langchain/chains';
import {MyCallbackHandler} from 'utils/mycallback'

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

export const makeChain = (vectorstore: PineconeStore) => {
  const model = new OpenAI({
    temperature: 0, // increase temepreature to get more creative answers
    modelName: 'gpt-3.5-turbo-16k-0613', //change this to gpt-4 if you have access
  });

  var handler = new MyCallbackHandler() 

  const chain = ConversationalRetrievalQAChain.fromLLM(
    model,
    vectorstore.asRetriever(),
    {
      qaTemplate: QA_PROMPT,
      questionGeneratorTemplate: CONDENSE_PROMPT,
      returnSourceDocuments: true, //The number of source documents returned is 4 by default
    },
  );

  chain.questionGeneratorChain.callbacks = [handler];

  return chain;
};
