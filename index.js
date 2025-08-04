
import boxen from 'boxen';

const white = {
    'R': '♖',
    'N': '♘',
    'B': '♗',
    'K': '♔',
    'Q': '♕',
    'P': '♙',
};

const black = {
    'R': '♜',
    'N': '♞',
    'B': '♝',
    'K': '♚',
    'Q': '♛',
    'P': '♟',
};

const nothingsee = '☐';

async function DisplayBoard(boardArray, isStarting) {
    if (!isStarting) {
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    console.clear();
    
    // boardArray is expected to be an 8x8 array of strings:
    // 'wP', 'bK', '', etc.
    const files = 'A  B  C  D  E  F  G  H';
    const topBorder = `  ╭${'─'.repeat(25)}╮`;
    const botBorder = `  ╰${'─'.repeat(25)}╯`;

    const rows = boardArray.map((row, i) => {
        const rank = 8 - i;
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
    console.log(boardString);
}

const startingBoard = [
    ['bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR'],
    ['bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP'],
    ['  ', '  ', '  ', '  ', '  ', '  ', '  ', '  '],
    ['  ', '  ', '  ', '  ', '  ', '  ', '  ', '  '],
    ['  ', '  ', '  ', '  ', '  ', '  ', '  ', '  '],
    ['  ', '  ', '  ', '  ', '  ', '  ', '  ', '  '],
    ['wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP'],
    ['wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR'],
];

await DisplayBoard(startingBoard, true);


// Function to move a piece from one square to another
async function movePiece(board, from, to) {
    // from and to are in algebraic notation, e.g., 'e2', 'e4'
    // board is an 8x8 array

    // Helper to convert algebraic notation to array indices
    function algebraicToIndices(square) {
        const file = square[0].toLowerCase();
        const rank = parseInt(square[1], 10);
        const col = file.charCodeAt(0) - 'a'.charCodeAt(0);
        const row = 8 - rank;
        return [row, col];
    }

    const [fromRow, fromCol] = algebraicToIndices(from);
    const [toRow, toCol] = algebraicToIndices(to);

    // Deep copy the board to avoid mutating the original
    const newBoard = board.map(row => row.slice());

    // Move the piece
    newBoard[toRow][toCol] = newBoard[fromRow][fromCol];
    newBoard[fromRow][fromCol] = '  ';

    await DisplayBoard(newBoard);
    return newBoard;
}

const newBoard = await movePiece(startingBoard, 'e2', 'e4');