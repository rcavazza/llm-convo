# LLM Conversation System

A modular Node.js system that enables two LLMs from different providers to have a turn-based conversation on a specified topic.

## Features

- **Modular LLM Provider Interface**: Easy to add new LLM providers
- **Turn-based Conversation Flow**: Fixed number of exchanges with configurable delay between turns
- **Character Definitions**: Separate files for LLM personalities
- **Conversation Templates**: Reusable structures for different types of dialogues
- **Multiple Export Formats**: JSON, Markdown, HTML, Plain text
- **Flexible Output Options**: Save to file, display in console, and API endpoint
- **Configurable Error Handling**: Different strategies based on needs
- **Web Interface**: For viewing and managing conversations (coming soon)

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

3. Configure your API keys:
   - Open `config/config.json`
   - Replace `YOUR_OPENAI_API_KEY` with your actual OpenAI API key
   - Replace `YOUR_ANTHROPIC_API_KEY` with your actual Anthropic API key

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

### API Server

Start the API server:

```
node api/server.js
```

This will start an Express server on port 3000 (or the port specified in your config) with the following endpoints:

- `GET /`: API information
- `GET /conversations`: Get all conversations
- `GET /conversations/current`: Get the current conversation
- `POST /conversations`: Start a new conversation
- `GET /conversations/:id/export?format=json|text|markdown`: Export a conversation

## Configuration

### Main Configuration (config/config.json)

```json
{
  "llmProviders": [
    {
      "id": "philosopher",
      "provider": "openai",
      "model": "gpt-4",
      "apiKey": "YOUR_OPENAI_API_KEY",
      "characterDefinition": "philosopher.json"
    },
    {
      "id": "scientist",
      "provider": "anthropic",
      "model": "claude-2",
      "apiKey": "YOUR_ANTHROPIC_API_KEY",
      "characterDefinition": "scientist.json"
    }
  ],
  "conversation": {
    "topic": "The ethical implications of artificial intelligence",
    "firstSpeaker": "philosopher",
    "numTurns": 6,
    "delayBetweenTurns": 2000
  },
  "output": {
    "saveToFile": true,
    "filePath": "./output/conversation.json",
    "displayInConsole": true,
    "api": {
      "enabled": true,
      "port": 3000
    }
  },
  "errorHandling": {
    "strategy": "retry",
    "maxRetries": 3,
    "initialDelay": 1000,
    "fallbackProvider": "openai"
  }
}
```

### Character Definitions

Character definitions are stored in `config/characters/` and define the personality and parameters for each LLM:

```json
{
  "name": "Philosopher",
  "systemPrompt": "You are a thoughtful philosopher...",
  "parameters": {
    "temperature": 0.7,
    "maxTokens": 500
  }
}
```

### Conversation Templates

Templates are stored in `config/templates/` and define structured conversation flows:

```json
{
  "id": "philosophical-debate",
  "name": "Philosophical Debate",
  "description": "A structured philosophical debate on a given topic",
  "llmRoles": ["proposer", "critic"],
  "structure": [
    {"role": "proposer", "type": "opening", "instructions": "Present the main argument about {topic}"},
    {"role": "critic", "type": "rebuttal", "instructions": "Challenge the main argument about {topic}"}
  ],
  "initialPrompts": {
    "proposer": "You are presenting a philosophical argument about {topic}...",
    "critic": "You are critically examining arguments about {topic}..."
  }
}
```

## Adding New LLM Providers

To add a new LLM provider:

1. Create a new file in `src/providers/` (e.g., `my-provider.js`)
2. Implement the `LLMProviderInterface` class
3. Register the provider in `src/providers/provider-factory.js`

Example:

```javascript
const LLMProviderInterface = require('./provider-interface');

class MyProvider extends LLMProviderInterface {
  constructor(config) {
    super(config);
    // Initialize your provider
  }

  async generateResponse(prompt, parameters, systemPrompt) {
    // Implement API call to your provider
    return response;
  }
}

module.exports = MyProvider;
```

Then register it in the factory:

```javascript
// In provider-factory.js
const MyProvider = require('./my-provider');
providerFactory.registerProvider('myprovider', MyProvider);
```

## Error Handling Strategies

The system supports multiple error handling strategies:

- **retry**: Automatically retry failed API calls with exponential backoff
- **fallback**: Switch to an alternative provider if the primary one fails
- **abort**: Stop the conversation if an error occurs
- **continue**: Log the error and continue the conversation

## License

MIT