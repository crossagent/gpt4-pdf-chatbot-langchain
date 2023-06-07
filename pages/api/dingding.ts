import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  console.log("钉钉转发进入");
  const { text, userId, webhook } = req.body;

  const name = userId;
  const question = text;

  console.log('name', name);
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
  
  try {
    //转发给http://172.31.6.56:9140/dingForwardRobot/common/sendMessage
    const payload = {
      webhookUrl: webhook,
      content: `你好[ @${name} ](http://),欢迎使用智能助手`,
      atData: `{"isAtAll":false,"atMobiles":[],"atUserIds":[${name}]}`,
      title: `${name}`,
      btnOrientation: '0', 
      btns: [{ title: '新的提问', actionURL: `http://${req.headers.host}/?id=${userId}` },], 
    };

    const forwardUrl = 'http://172.31.6.56:9140/dingForwardRobot/common/sendMessage';
    const headers = { 'Content-Type': 'application/json' };
    const forwardRes = await fetch(forwardUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload),
    });

    console.log("钉钉返回", await forwardRes.text());
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error });
  }
}
