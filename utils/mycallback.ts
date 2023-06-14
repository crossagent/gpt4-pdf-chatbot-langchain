import { BaseCallbackHandler } from "langchain/callbacks";
import { AgentAction, AgentFinish, ChainValues } from "langchain/schema";
import { dataEmitter } from "utils/eventEmitter";

export class MyCallbackHandler extends BaseCallbackHandler {
  name = "MyCallbackHandler";

  async handleChainStart(chain: { name: string }) {
    console.log(`Entering new ${chain.name} chain...`);
  }

  async handleChainEnd(_output: ChainValues) {
    const data = { finalquestion: _output.text };
    dataEmitter.emit('dataEvent', data);
  }

  async handleAgentAction(action: AgentAction) {
    console.log(action.log);
  }

  async handleToolEnd(output: string) {
    console.log(output);
  }

  async handleText(text: string) {
    console.log(text);
  }

  async handleAgentEnd(action: AgentFinish) {
    console.log(action.log);
  }
}
