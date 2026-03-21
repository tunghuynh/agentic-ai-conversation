
1. Bổ sung thêm logic này trong lúc điều phối để các AI luôn debate nhau trước khi đồng thuận. Sau tối đa MAX_TURNS thì phải tìm được điểm đồng thuận chung

```js
let currentTurn = 0;
const MAX_TURNS = 4;

function prepareNextMessage(previousAiMessage) {
    currentTurn++;
    
    if (currentTurn <= MAX_TURNS) {
        // Trạng thái Debate
        return `[Instruction: Act as a critical debater. Identify flaws and counter the following argument strictly concisely.]\n\n${previousAiMessage}`;
    } else {
        // Trạng thái Consensus
        return `[Instruction: Stop debating. Synthesize the above arguments and provide the final unified solution strictly concisely.]\n\n${previousAiMessage}`;
    }
}
```

2. đưa các tham số prompt instruction và max turn ra ngoài UI config