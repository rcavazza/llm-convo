# LLM Conversation System

A modular Node.js system that enables two LLMs to have a turn-based conversation on a specified topic.

## Features

- **Modular LLM Provider Interface**: Easy to add new LLM providers (GitHub Copilot, OpenAI, Anthropic)
- **Turn-based Conversation Flow**: Fixed number of exchanges with configurable delay between turns
- **Character Definitions**: Separate JSON files for LLM personalities and reasoning parameters
- **Multiple Export Formats**: JSON, Markdown, HTML, Plain text
- **Flexible Output Options**: Save to file, display in console, and API endpoint
- **Configurable Error Handling**: Different strategies based on needs
- **Individual Conversation Files**: Each conversation saved as a separate file for better organization
- **Terminal UI**: Terminal-based interface for viewing and managing conversations
- **Web Interface**: Cyberpunk-themed web UI (black/green/glitch aesthetic) for viewing and managing conversations and characters

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/llm-conversation-system.git
   cd llm-conversation-system
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Configure your API keys in a `.env` file:
   ```
   GITHUB_TOKEN=your_github_token_here
   OPENAI_API_KEY=your_openai_api_key_here
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   ```

## Usage

### Basic Usage

Run a conversation using the default configuration:

```
npm start
```

Or specify a custom configuration file:

```
npm start -- path/to/your/config.json
```

### Terminal UI

Launch the terminal-based user interface:

```
node terminal-ui.js
```

Features:
- List all saved conversations
- View conversation details
- Export conversations in different formats
- Search conversations
- Delete conversations

Navigate using arrow keys, Enter to select, and 'q' to quit.

### Web Interface

Start the web server:

```
node web/server.js
```

Access the web interface at http://localhost:8080

The web interface features:
- Black/green/glitch cyberpunk theme
- List of all conversations with search
- Detailed view of each conversation
- Start new conversations
- Full CRUD management of character definitions
- Export conversations in different formats

### API Server

Start the API server:

```
node api/server.js
```

This will start an Express server on port 3000 (or the port specified in your config) with the following endpoints:

- `GET /api/conversations`: Get all conversations
- `GET /api/conversations/current`: Get the current conversation
- `GET /api/conversations/:id`: Get a specific conversation
- `POST /api/conversations`: Start a new conversation
- `DELETE /api/conversations/:id`: Delete a conversation
- `GET /api/conversations/search?q=query`: Search conversations
- `GET /api/export/:id?format=json|text|markdown|html`: Export a conversation

## Configuration

### Main Configuration (`config/config.json`)

```json
{
  "llmProviders": [
    {
      "id": "philosopher",
      "provider": "copilot",
      "model": "gpt-4.1",
      "characterDefinition": "philosopher.json"
    },
    {
      "id": "scientist",
      "provider": "copilot",
      "model": "gpt-4.1",
      "characterDefinition": "scientist.json"
    }
  ],
  "conversation": {
    "topic": "The ethical implications of artificial intelligence",
    "firstSpeaker": "philosopher",
    "numTurns": 6,
    "delayBetweenTurns": 5000
  },
  "output": {
    "saveToFile": true,
    "directory": "./output/conversations",
    "filenameFormat": "{timestamp}_{topic}",
    "displayInConsole": true,
    "api": {
      "enabled": true,
      "port": 3001
    },
    "web": {
      "enabled": true,
      "port": 8080
    }
  },
  "errorHandling": {
    "strategy": "retry",
    "maxRetries": 3,
    "initialDelay": 1000,
    "fallbackProvider": "copilot"
  }
}
```

### Environment Variables (`.env`)

```
# GitHub Copilot (primary provider)
GITHUB_TOKEN=your_github_token_here

# Optional additional providers
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### Character Definitions

Character definitions are stored in `config/characters/` and define the personality and parameters for each LLM:

```json
{
  "name": "Philosopher",
  "systemPrompt": "You are a thoughtful philosopher...",
  "parameters": {
    "reasoningEffort": "high"
  }
}
```

The `parameters` object supports the following field:

| Field | Values | Description |
|---|---|---|
| `reasoningEffort` | `"low"`, `"medium"`, `"high"` | Controls reasoning depth (Copilot provider only) |

> **Note**: Parameters like `temperature` and `maxTokens` are not supported by the GitHub Copilot provider and are ignored.

## LLM Providers

### GitHub Copilot (default)

Uses `@github/copilot-sdk`. Requires `GITHUB_TOKEN` environment variable.

```json
{ "provider": "copilot", "model": "gpt-4.1" }
```

### OpenAI

Requires `OPENAI_API_KEY` environment variable.

```json
{ "provider": "openai", "model": "gpt-4o" }
```

### Anthropic

Requires `ANTHROPIC_API_KEY` environment variable.

```json
{ "provider": "anthropic", "model": "claude-3-7-sonnet-20250219" }
```

## Adding New LLM Providers

1. Create a new file in `src/providers/` (e.g., `my-provider.js`)
2. Extend `LLMProviderInterface`
3. Register it in `src/providers/provider-factory.js`

```javascript
const LLMProviderInterface = require('./provider-interface');

class MyProvider extends LLMProviderInterface {
  constructor(config) {
    super(config);
    this.apiKey = process.env.MY_PROVIDER_API_KEY;
  }

  async generateResponse(prompt, parameters, systemPrompt) {
    // call your API and return a string
  }
}

module.exports = MyProvider;
```

## Web API

The web server (`node web/server.js`) exposes the following endpoints on port 8080:

### Conversations

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/conversations` | List all conversations |
| `GET` | `/api/conversations/current` | Get the current conversation |
| `GET` | `/api/conversations/:id` | Get a specific conversation |
| `POST` | `/api/conversations` | Start a new conversation |
| `DELETE` | `/api/conversations/:id` | Delete a conversation |
| `GET` | `/api/conversations/search?q=query` | Search conversations |

### Characters

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/characters` | List all character definitions |
| `GET` | `/api/characters/:id` | Get a specific character |
| `POST` | `/api/characters` | Create a new character |
| `PUT` | `/api/characters/:id` | Update a character |
| `DELETE` | `/api/characters/:id` | Delete a character |

## Error Handling Strategies

Configured via `errorHandling.strategy` in `config.json`:

- **`retry`**: Retry failed API calls with exponential backoff
- **`fallback`**: Switch to `fallbackProvider` on failure
- **`abort`**: Stop the conversation on error
- **`continue`**: Log the error and keep going

## License

MIT