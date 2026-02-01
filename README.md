# AI-Terminal-Chess

A terminal-based chess game where AI plays against itself using OpenAI's GPT models.

## Features

- Unicode chess piece display in the terminal
- Full chess move support including:
  - Standard moves for all pieces
  - Castling (kingside and queenside)
  - En passant
  - Pawn promotion
- Move validation
- Captured pieces tracking
- Conversation history per color for AI context

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file with your OpenAI API key:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```

3. Run the game:
   ```bash
   node index.js
   ```

## Configuration

Edit `config.js` to customize:
- AI model (default: gpt-4.1)
- Board size
- Move delay
- System prompts

## Tech Stack

- Node.js
- OpenAI API with function calling
- dotenv for environment configuration
