import { useRef, useState, useEffect } from 'react';
import Layout from '@/components/layout';
import styles from '@/styles/Home.module.css';
import { Message } from '@/types/chat';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import LoadingDots from '@/components/ui/LoadingDots';
import { Document } from 'langchain/document';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export default function Home() {
  const [query, setQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [messageState, setMessageState] = useState<{
    messages: Message[];
    pending?: string;
    history: [string, string][];
    pendingSourceDocs?: Document[];
  }>({
    messages: [
      {
        message: '你好，我是SOC助手',
        type: 'apiMessage',
      },
    ],
    history: [],
  });

  const { messages, history } = messageState;

  const messageListRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const [username, setUserName] = useState<string|null>(null);
  const [webhookUrl, setWebhookUrl] = useState<string|null>(null);
  
  const [filetime, setFileTime] = useState<string|null>(null);


  useEffect(() => {
    textAreaRef.current?.focus();
    const url = window.location.href;
    const idMatch = url.match(/id=(\d+)/);
    const webhookUrlMatch = url.match(/webhookUrl=(.*)/);
    
    const url_id = idMatch ? idMatch[1] : null;
    const url_webhookUrl = webhookUrlMatch ? webhookUrlMatch[1] : null;
    
    var id = '';
    var webhookUrl = '';

    console.log("url_id", url_id);

    if (url_id && url_webhookUrl) {
      localStorage.setItem('id', url_id);
      localStorage.setItem('webhookUrl', url_webhookUrl);
    } else {
      id = localStorage.getItem('id') || '';
      webhookUrl = localStorage.getItem('webhookUrl') || '';
    }

    setWebhookUrl(webhookUrl);

    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const day = currentDate.getDate().toString().padStart(2, '0');
    const hour = currentDate.getHours().toString().padStart(2, '0');
    const minute = currentDate.getMinutes().toString().padStart(2, '0');
    const second = currentDate.getSeconds().toString().padStart(2, '0');

    const fileName = `${year}-${month}-${day}_${hour}-${minute}-${second}`;

    setFileTime(fileName);

    getUserName();
  }, []);

  async function getUserName() {
    setUserName('白鼠001');
    return;
      try {
        const response = await fetch(`http://172.31.6.56:9134/commonNotice/common/getUserInfo?ding_id=${localStorage.getItem('id')}`, {
          method: 'Get',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        const data = await response.json();
        const username = data.name;
        const email = data.email;
        console.log('get name', username);

        if (data.error) {
          setError(data.error);
        } else
        {
          setUserName(username);
        }
      } catch (error) {
      }
  }

  //handle form submission
  async function handleSubmit(e: any) {
    e.preventDefault();

    setError(null);

    if (!query) {
      alert('请输入一个问题');
      return;
    }

    const question = query.trim();

    setMessageState((state) => ({
      ...state,
      messages: [
        ...state.messages,
        {
          type: 'userMessage',
          message: question,
        },
      ],
    }));

    setLoading(true);
    setQuery('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          history,
          username,
          filetime,
        }),
      });
      const data = await response.json();
      console.log('data', data.response1);

      if (data.error) {
        setError(data.error);
      } else {
        setMessageState((state) => {
          const newMessages: Message[] = [
            {
              type: 'apiMessage',
              message: data.text,
              sourceDocs: data.sourceDocuments,
            },
          ];
        
          if (data.finalquestion) {
              console.log("根据对话，您的提问修正为：---" + data.finalquestion + "---");
          }
        
          return {
            ...state,
            messages: [...state.messages, ...newMessages],
            history: [...state.history, [question, data.text]],
          };
        });
      }
      console.log('messageState', messageState);

      setLoading(false);

      //scroll to bottom
      messageListRef.current?.scrollTo(0, messageListRef.current.scrollHeight);
    } catch (error) {
      setLoading(false);
      setError('An error occurred while fetching the data. Please try again.');
      console.log('error', error);
    }
  }

  //prevent empty submissions
  const handleEnter = (e: any) => {
    if (e.key === 'Enter' && query) {
      handleSubmit(e);
    } else if (e.key == 'Enter') {
      e.preventDefault();
    }
  };

  //完成提问
  async function handleComplete(e: any) {
    //e.preventDefault();

    const isDingdingChecked = e.target.dingding.checked;
    console.log('isDingdingChecked:', isDingdingChecked);

    if (isDingdingChecked)
    {
      try {
        const response = await fetch('/api/finishchat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            history,
            id:localStorage.getItem('id') || '',
            webhookUrl:localStorage.getItem('webhookUrl') || '',
          }),
        });
        const data = await response.json();
        console.log('data', data);
      }catch (error) {
        setLoading(false);
        setError('An error occurred while fetching the data. Please try again.');
        console.log('error', error);
      }
    }
  }
  return (
    <>
      <Layout>
        <div className="mx-auto flex flex-col gap-4">
          <h1 className="text-2xl font-bold leading-[1.1] tracking-tighter text-center">
            基于文档的知识库系统
          </h1>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <p style={{ marginRight: '1em' }}>用户: {username}</p>
            <p>开始时间: {filetime}</p>
          </div>
          <main className={styles.main}>
            <div className={styles.cloud}>
              <div ref={messageListRef} className={styles.messagelist}>
                {messages.map((message, index) => {
                  let icon;
                  let className;
                  if (message.type === 'apiMessage') {
                    icon = (
                      <Image
                        key={index}
                        src="/bot-image.png"
                        alt="AI"
                        width="40"
                        height="40"
                        className={styles.boticon}
                        priority
                      />
                    );
                    className = styles.apimessage;
                  } else {
                    icon = (
                      <Image
                        key={index}
                        src="/usericon.png"
                        alt="Me"
                        width="30"
                        height="30"
                        className={styles.usericon}
                        priority
                      />
                    );
                    // The latest message sent by the user will be animated while waiting for a response
                    className =
                      loading && index === messages.length - 1
                        ? styles.usermessagewaiting
                        : styles.usermessage;
                  }
                  return (
                    <>
                      <div key={`chatMessage-${index}`} className={className}>
                        {icon}
                        <div className={styles.markdownanswer}>
                          <ReactMarkdown linkTarget="_blank">
                            {message.message}
                          </ReactMarkdown>
                        </div>
                      </div>
                      {message.sourceDocs && (
                        <div
                          className="p-5"
                          key={`sourceDocsAccordion-${index}`}
                        >
                          <Accordion
                            type="single"
                            collapsible
                            className="flex-col"
                          >
                            {message.sourceDocs.map((doc, index) => (
                              <div key={`messageSourceDocs-${index}`}>
                                <AccordionItem value={`item-${index}`}>
                                  <AccordionTrigger>
                                    <h3>信息来源 {index + 1}</h3>
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <ReactMarkdown linkTarget="_blank">
                                      {doc.pageContent}
                                    </ReactMarkdown>
                                    <p className="mt-2">
                                      <b>来源:</b> {doc.metadata.source}
                                    </p>
                                  </AccordionContent>
                                </AccordionItem>
                              </div>
                            ))}
                          </Accordion>
                        </div>
                      )}
                    </>
                  );
                })}
              </div>
            </div>
            <div className={styles.center}>
              <div className={styles.cloudform}>
                <form onSubmit={handleSubmit}>
                  <textarea
                    disabled={loading}
                    onKeyDown={handleEnter}
                    ref={textAreaRef}
                    autoFocus={false}
                    rows={1}
                    maxLength={512}
                    id="userInput"
                    name="userInput"
                    placeholder={
                      loading
                        ? '等待响应中...'
                        : '想问什么?'
                    }
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className={styles.textarea}
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className={styles.generatebutton}
                  >
                    {loading ? (
                      <div className={styles.loadingwheel}>
                        <LoadingDots color="#000" />
                      </div>
                    ) : (
                      // Send icon SVG in input field
                      <svg
                        viewBox="0 0 20 20"
                        className={styles.svgicon}
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path>
                      </svg>
                    )}
                  </button>
                </form>
              </div>
              <form onSubmit={handleComplete}>
                <label>
                  <input type="checkbox" name="dingding" defaultChecked/>
                  同时转发到钉钉
                </label>
                <br />
                <button type="submit" disabled={loading} className={styles.completebutton} >完成提问</button>
              </form>    
            </div>
            {error && (
              <div className="border border-red-400 rounded-md p-4">
                <p className="text-red-500">{error}</p>
              </div>
            )}
          </main>
        </div>
        <footer className="m-auto p-4">
            注意基于上下文的提问会关注之前的问题，如果2个问题相互不关联，请明确关闭窗口，再打开新窗口提问.
        </footer>
      </Layout>
    </>
  );
}
