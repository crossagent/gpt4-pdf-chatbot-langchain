import { BaseCallbackHandler } from "langchain/callbacks";
import { AgentAction, AgentFinish, ChainValues } from "langchain/schema";
import { dataEmitter } from "utils/eventEmitter";

export class MyCallbackHandler extends BaseCallbackHandler {
  name = "MyCallbackHandler";

  async handleChainStart(chain: { name: string }) {
    console.log(`Entering new ${chain.name} chain...`);
  }

  async handleChainEnd(_output: ChainValues) {
    console.log(_output.text);

    console.log(process.env);

    const data = { finalquestion: _output.text };
    var rest = dataEmitter.emit('dataEvent', data);
    console.log("send dataevent", data, "rst", rest);
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
