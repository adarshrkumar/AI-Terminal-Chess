import 'dotenv/config';

import config from './config.js';

import { OpenAI } from 'openai';

// --- OpenAI Setup ---
const openai = new OpenAI();

const model = config.model || 'gpt-4.1';

let color = 'white'
let moveQueue = []
let isProcessing = false

// --- Conversation History ---
let convoHistory = { white: [], black: [] };

// --- Board ---
let capturedPieces = { white: [], black: [] };

let board = [
    ['bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR'],
    ['bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP'],
    ['  ', '  ', '  ', '  ', '  ', '  ', '  ', '  '],
    ['  ', '  ', '  ', '  ', '  ', '  ', '  ', '  '],
    ['  ', '  ', '  ', '  ', '  ', '  ', '  ', '  '],
    ['  ', '  ', '  ', '  ', '  ', '  ', '  ', '  '],
    ['wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP'],
    ['wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR'],
];

let lastMove = { color: null, args: { from: null, to: null } };

// --- Piece Symbols ---
const black = {
    'R': '♖',
    'N': '♘',
    'B': '♗',
    'K': '♔',
    'Q': '♕',
    'P': '♙',
};

const white = {
    'R': '♜',
    'N': '♞',
    'B': '♝',
    'K': '♚',
    'Q': '♛',
    'P': '♟',
};

// --- Nothing See ---
const nothingsee = '☐';

// --- Board Display Functions ---
function convertBoard(boardArray) {
    // boardArray is expected to be an 8x8 array of strings:
    // 'wP', 'bK', '', etc.
    const files = 'A  B  C  D  E  F  G  H';
    const topBorder = `  ╭${'─'.repeat(25)}╮`;
    const botBorder = `  ╰${'─'.repeat(25)}╯`;

    const rows = boardArray.map((row, i) => {
        const rank = config.boardSize - i;
        const pieces = row.map(cell => {
            if (!cell) return nothingsee;
            cell = cell.trim()
            if (cell[0] === 'w') return white[cell[1]] || nothingsee;
            if (cell[0] === 'b') return black[cell[1]] || nothingsee;
            return nothingsee;
        }).join('  ');
        return `${rank} │ ${pieces}  │`;
    });

    const board = [
        `    ${files}`,
        topBorder,
        ...rows,
        botBorder,
    ];

    const boardString = board.join('\n');
    return boardString;
}

function convertPiece(piece) {
    if (piece[0] === 'w') return white[piece[1]] || nothingsee;
    if (piece[0] === 'b') return black[piece[1]] || nothingsee;
    return nothingsee;
}

async function DisplayBoard(boardArray, mode='normal') {
    console.clear();

    const boardString = convertBoard(boardArray);

    const fullBoard = [
        capturedPieces.white.length > 0 ? capturedPieces.white.join(' ') : null,
        boardString,
        capturedPieces.black.length > 0 ? capturedPieces.black.join(' ') : null,
    ].join('\n');

    console.log(fullBoard);
}

// --- Move Validation Functions ---
function availibleMoves(pColor, piece, fromRow, fromCol, board) {
    // Determine available moves for a piece on an empty board, not going out of bounds
    // piece: e.g. 'wP', 'bK', etc.
    // board: 8x8 array (not used for this simple version)
    // All moves are returned in algebraic notation (e.g., 'e4')
    
    
    
    if (!piece || piece.length < 2) return [];
    const color = piece[0] === 'w' ? 'white' : 'black';
    if (color !== pColor) return [];
    const type = piece[1];
    const boardSize = config.boardSize || 8;
    
    if (fromRow === -1 || fromCol === -1) return [];

    // Helper to check if a square is on the board
    function onBoard(row, col) {
        return row >= 0 && row < boardSize && col >= 0 && col < boardSize;
    }
    // Helper to convert indices to algebraic notation
    function indicesToAlgebraic(row, col) {
        const file = String.fromCharCode('a'.charCodeAt(0) + col);
        const rank = (boardSize - row).toString();
        return file + rank;
    }

    const resultMoves = [];

    // Pawn moves
    if (type === 'P') {
        const dir = color === 'white' ? -1 : 1;
        // One forward
        if (onBoard(fromRow + 1*dir, fromCol)) resultMoves.push(indicesToAlgebraic(fromRow + 1*dir, fromCol));
        // Two forward
        if (onBoard(fromRow + 2*dir, fromCol)) resultMoves.push(indicesToAlgebraic(fromRow + 2*dir, fromCol));

        // Captures (diagonals)
        if (onBoard(fromRow + 1*dir, fromCol - 1)) resultMoves.push(indicesToAlgebraic(fromRow + 1*dir, fromCol - 1));
        if (onBoard(fromRow + 1*dir, fromCol + 1)) resultMoves.push(indicesToAlgebraic(fromRow + 1*dir, fromCol + 1));
        // En passant (for empty board, just add the theoretical squares)
        // White en passant possible from rank 5 (row boardSize-5), black from rank 4 (row 3)
        if (color === 'white' && fromRow === boardSize - 5) {
            if (onBoard(fromRow + dir, fromCol - 1)) resultMoves.push(indicesToAlgebraic(fromRow + dir, fromCol - 1) + 'e.p.');
            if (onBoard(fromRow + dir, fromCol + 1)) resultMoves.push(indicesToAlgebraic(fromRow + dir, fromCol + 1) + 'e.p.');
        }
        if (color === 'black' && fromRow === 3) {
            if (onBoard(fromRow + dir, fromCol - 1)) resultMoves.push(indicesToAlgebraic(fromRow + dir, fromCol - 1) + 'e.p.');
            if (onBoard(fromRow + dir, fromCol + 1)) resultMoves.push(indicesToAlgebraic(fromRow + dir, fromCol + 1) + 'e.p.');
        }
        // Pawn promotion (to queen, for simplicity)
        if ((color === 'white' && fromRow + dir === 0) || (color === 'black' && fromRow + dir === boardSize - 1)) {
            if (onBoard(fromRow + dir, fromCol)) resultMoves.push(indicesToAlgebraic(fromRow + dir, fromCol) + '=Q');
            if (onBoard(fromRow + dir, fromCol - 1)) resultMoves.push(indicesToAlgebraic(fromRow + dir, fromCol - 1) + '=Q');
            if (onBoard(fromRow + dir, fromCol + 1)) resultMoves.push(indicesToAlgebraic(fromRow + dir, fromCol + 1) + '=Q');
        }
    }
    // Knight moves
    else if (type === 'N') {
        const knightMoves = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        for (const [dr, dc] of knightMoves) {
            const nr = fromRow + dr, nc = fromCol + dc;
            if (onBoard(nr, nc)) resultMoves.push(indicesToAlgebraic(nr, nc));
        }
    }
    // Bishop moves
    else if (type === 'B') {
        for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
            for (let k = 1; k < boardSize; k++) {
                const nr = fromRow + dr * k, nc = fromCol + dc * k;
                if (onBoard(nr, nc)) resultMoves.push(indicesToAlgebraic(nr, nc));
                else break;
            }
        }
    }
    // Rook moves
    else if (type === 'R') {
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
            for (let k = 1; k < boardSize; k++) {
                const nr = fromRow + dr * k, nc = fromCol + dc * k;
                if (onBoard(nr, nc)) resultMoves.push(indicesToAlgebraic(nr, nc));
                else break;
            }
        }
    }
    // Queen moves
    else if (type === 'Q') {
        for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]]) {
            for (let k = 1; k < boardSize; k++) {
                const nr = fromRow + dr * k, nc = fromCol + dc * k;
                if (onBoard(nr, nc)) resultMoves.push(indicesToAlgebraic(nr, nc));
                else break;
            }
        }
    }
    // King moves
    else if (type === 'K') {
        for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]]) {
            const nr = fromRow + dr, nc = fromCol + dc;
            if (onBoard(nr, nc)) resultMoves.push(indicesToAlgebraic(nr, nc));
        }
        // Add castling moves (kingside and queenside)
        // For white king on e1 (row boardSize-1, col 4)
        if (color === 'white' && fromRow === boardSize - 1 && fromCol === 4) {
            // Kingside castle: g1 (col 6)
            if (boardSize > 6) resultMoves.push(indicesToAlgebraic(boardSize - 1, 6) + ' (O-O)');
            // Queenside castle: c1 (col 2)
            if (boardSize > 2) resultMoves.push(indicesToAlgebraic(boardSize - 1, 2) + ' (O-O-O)');
        }
        // For black king on e8 (row 0, col 4)
        if (color === 'black' && fromRow === 0 && fromCol === 4) {
            // Kingside castle: g8 (col 6)
            if (boardSize > 6) resultMoves.push(indicesToAlgebraic(0, 6) + ' (O-O)');
            // Queenside castle: c8 (col 2)
            if (boardSize > 2) resultMoves.push(indicesToAlgebraic(0, 2) + ' (O-O-O)');
        }
    }
    return resultMoves;
}

// --- Chess Move Functions ---
async function movePiece(args, color, mode='normal') {
    // from and to are in algebraic notation, e.g., 'e2', 'e4'
    // board is an 8x8 array

    if (lastMove?.color === color && lastMove?.args?.from === args?.from && lastMove?.args?.to === args?.to) return;
    lastMove = { color, args };

    // Helper to convert algebraic notation to array indices
    function algebraicToIndices(square) {
        const file = (square[0]).toLowerCase();
        const rank = parseInt(square[1], 10);
        const col = file.charCodeAt(0) - 'a'.charCodeAt(0);
        const row = config.boardSize - rank;
        return [row, col];
    }

    const [fromRow, fromCol] = algebraicToIndices(args.from);
    const [toRow, toCol] = algebraicToIndices(args.to);

    
    const oldFromPiece = board[fromRow][fromCol];
    const moves = availibleMoves(color, oldFromPiece, fromRow, fromCol, board);
    if (moves.includes(args.to)) {

        const oldToPiece = convertPiece(board[toRow][toCol]);

        // Deep copy the board to avoid mutating the original
        const newBoard = board.map(row => row.slice());

        // Move the piece
        newBoard[toRow][toCol] = newBoard[fromRow][fromCol];
        newBoard[fromRow][fromCol] = '  ';

        await DisplayBoard(newBoard, mode);
        board = newBoard;
        // Switch color only when a valid move is made
        color = color === 'white' ? 'black' : 'white';
        return { oldToPiece };
    } else {
        convoHistory[color].push({ role: 'user', content: `Invalid move: ${args.to}` });
        convoHistory[color].push({ role: 'user', content: `The current board is:` || '' });
        convoHistory[color].push({ role: 'user', content: convertBoard(board) || '' });
        convoHistory[color].push({ role: 'user', content: `Try again.` });
        isProcessing = true;
        await new Promise(resolve => setTimeout(resolve, config.moveDelayMs));
        addToQueue(() => callAI(color));
        isProcessing = false;
    }
}

async function movePieceAndCapture(args, color) {
    const { from, to } = args;
    let { capture } = args;
    if (capture === to || !capture) capture = to
    args.capture = capture;
    
    const move = await movePiece(args, color, 'capture');
    if (!move) return
    if (move?.oldToPiece) capturedPieces[color].push(move.oldToPiece);

    return move;
}

const boardFunctions = {
    movePiece,
    movePieceAndCapture,
};

// --- AI Functions ---
const functions = [
    {
        name: 'movePiece',
        description: 'Move a chess piece from one square to another on the board. PLEASE DO NOT CALL THIS TOOL IF movePieceAndCapture HAS BEEN CALLED.',
        parameters: {
            type: 'object',
            properties: {
                from: {
                    type: 'string',
                    description: 'The square of the piece to move in algebraic notation (e.g., "e2").'
                },
                to: {
                    type: 'string',
                    description: 'The square to move the piece to in algebraic notation (e.g., "e4").'
                }
            },
            required: ['from', 'to']
        }
    },
    {
        name: 'movePieceAndCapture',
        description: 'Move a chess piece from one square to another on the board and capture an opponent piece. PLEASE DO NOT CALL movePiece ON TOP OF THIS TOOL.',
        parameters: {
            type: 'object',
            properties: {
                from: {
                    type: 'string',
                    description: 'The square of the piece to move in algebraic notation (e.g., "e2").'
                },
                to: {
                    type: 'string',
                    description: 'The square to move the piece to in algebraic notation (e.g., "e4"). THIS IS THE SAME AS THE SQUARE OF THE PIECE THAT IS BEING CAPTURED UNLESS USING EN PASSANT.'
                },
                capture: {
                    type: 'string',
                    description: 'The square of the piece to capture in algebraic notation (e.g., "e4"). ONLY PROVIDE IF USING EN PASSANT.'
                }
            },
            required: ['from', 'to']
        }
    },
];

async function callAI(color) {
    let generatedText;
    try {
        const messages = [
            {
                role: 'system',
                content: config.systemPrompt(color),
            },
            ...convoHistory[color],
        ];

        // OpenAI function calling support

        const response = await openai.chat.completions.create({
            model: model,
            messages: messages,
            functions: functions,
        });

        // OpenAI returns choices[0].message
        const message = response.choices[0].message;
        if (message.content) {
                generatedText = message.content;
            } else if (message.function_call) {
                const functionName = message.function_call.name;
                const functionArgs = message.function_call.arguments
                ? JSON.parse(message.function_call.arguments)
                : {};

                if (
                    typeof boardFunctions[functionName] === 'function' &&
                    (
                        // If function expects arguments, ensure functionArgs is not empty
                        functions.find(f => f.name === functionName).parameters?.required?.length === 0 ||
                        (
                            functions.find(f => f.name === functionName).parameters?.required?.length > 0 && functionArgs && Object.keys(functionArgs).length > 0
                        ) || 
                        Array.from(functionArgs).length < 1
                    )
                ) {
                    boardFunctions[functionName](functionArgs, color).then(() => {
                        addToQueue(() => aiMoves());
                    });
                }
            }
            return generatedText;
        } catch (error) {
            console.error('Error generating AI response:', error);
            return `Error: Failed to generate AI response: ${error.message}`;
        }
}

async function aiMoves() {
    // --- Prepare prompt for AI ---
    convoHistory[color].push({ role: 'user', content: `The current board is:` || '' });
    convoHistory[color].push({ role: 'user', content: convertBoard(board) || '' });
    convoHistory[color].push({ role: 'user', content: `Go for the next move.` });
    // --- AI Generation ---
    const generatedText = await callAI(color);
    
    // --- Append AI response to history ---
    convoHistory[color].push({ role: 'assistant', content: generatedText || '' });
    // Color will be switched in movePiece function when a valid move is made
}

// --- Queue System ---
function addToQueue(moveFunction, addFunction='push') {
    moveQueue[addFunction](moveFunction);
    if (!isProcessing) {
        processQueue();
    }
}

async function processQueue() {
    if (moveQueue.length === 0 || isProcessing) return;
    
    isProcessing = true;
    
    while (moveQueue.length > 0) {
        isProcessing = true;
        const moveFunction = moveQueue.shift();
        await moveFunction();
        
        // This is not quite right. The setTimeout should call resolve after the delay, and then set isProcessing = false after the await.
        await new Promise(resolve => setTimeout(resolve, config.moveDelayMs));
        isProcessing = false;
    }
}

// --- Display Starting Board ---
await DisplayBoard(board, 'starting');

// --- Start the Game ---
addToQueue(() => aiMoves())