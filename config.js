function systemPrompt(color) {
    return `You are playing as ${color} in a game of chess. Use the available tool calls to make your move (e.g., call movePiece with from and to squares). Provide minimal commentary or explanation.`;
}

// Model config
const config = {
    gameName: "AI Chess",
    boardSize: 8,
    whitePlayer: "AI",
    blackPlayer: "AI",
    moveDelayMs: 1000,
    systemPrompt: systemPrompt,
    model: "gpt-4.1",
};    

export default config
