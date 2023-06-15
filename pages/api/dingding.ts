import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  console.log("进入转发");
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
  
  try {

    const forwardUrl1 = `http://172.31.6.56:9134/commonNotice/common/getUserInfo?ding_id=${name}`;

    const response = await fetch(forwardUrl1, {
      method: 'GET',
    });

    const data = await response.json();
    const username = data.name;
    const email = data.email;

    if (data.error) {
      console.error(data.error);
      res.status(500).json({ error: data.error });
    } else
    {
      console.log('username', username);
      console.log('email', email);
    }

    //转发给http://172.31.6.56:9140/dingForwardRobot/common/sendMessage
    const payload = {
      webhookUrl: webhook,
      content: `你好[ @${name} ](http://),欢迎使用智能助手`,
      atData: `{"isAtAll":false,"atMobiles":[],"atUserIds":[${name}]}`,
      title: `${name}`,
      btnOrientation: '0', 
      btns: [{ title: '新的提问', actionURL: `http://${req.headers.host}/?id=${userId}&webhookUrl=${webhook}&username=${username}&konwledgebaseName=${process.env.PINECONE_NAME_SPACE_SEARCH}` },], 
    };

    const forwardUrl = 'http://172.31.6.56:9140/dingForwardRobot/common/sendMessage';
    const headers = { 'Content-Type': 'application/json' };
    const forwardRes = await fetch(forwardUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload),
    });

    res.status(200).json({ message: '钉钉返回' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error });
  }
}
