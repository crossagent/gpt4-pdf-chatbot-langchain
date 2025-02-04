import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) 
{
  const { webhookUrl, history, id, rating, username } = req.body;

  console.log('id', id, 'webhookUrl', webhookUrl, 'history', history, 'rate', rating);


  //only accept post requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  //处理一下换行
  const historyString = history
  .map(([question, answer]:[string, string]) => `Q：${question}\n\n A：${answer}`)
  .join('\n\n-----------------------------------\n\n');


  try {
    //转发给http://172.31.6.56:9140/dingForwardRobot/common/sendMessage
    const payload = {
      webhookUrl: webhookUrl,
      content: `[ @609055430 ](http://) ${username}的对话历史 \n\n` + historyString + `\n\n-----------最终得分:${rating}-------------`,
      atData: `{"isAtAll":false,"atMobiles":[],"atUserIds":[${id}]}`,
      title: `${id}`,
    };

    const forwardUrl = 'http://172.31.6.56:9140/dingForwardRobot/common/sendMessage';
    const headers = { 'Content-Type': 'application/json' };
    const forwardRes = await fetch(forwardUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload),
    });

    console.log("钉钉返回", await forwardRes.text());
    res.status(200).json(await forwardRes.text());
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error });
  }
}
