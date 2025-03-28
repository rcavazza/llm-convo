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
- **Individual Conversation Files**: Each conversation is saved in a separate file for better organization
- **Terminal UI**: Modern terminal-based interface for viewing and managing conversations
- **Web Interface**: Cyberpunk-themed web UI with black/green/glitch aesthetic for viewing all conversations

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
   - Copy `.env.example` to `.env`
   - Open `.env` and add your API keys:
     ```
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

This provides a modern terminal UI with the following features:
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

Access the web interface at http://localhost:8080 (or the port specified in your config).

The web interface features:
- Black/green/glitch cyberpunk theme
- List of all conversations
- Detailed view of each conversation
- Start new conversations
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

### Main Configuration (config/config.json)

```json
{
  "llmProviders": [
    {
      "id": "philosopher",
      "provider": "anthropic",
      "model": "claude-3-7-sonnet-20250219",
      "characterDefinition": "philosopher.json"
    },
    {
      "id": "scientist",
      "provider": "anthropic",
      "model": "claude-3-7-sonnet-20250219",
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
      "port": 3000
    },
    "web": {
      "enabled": true,
      "port": 8080
    },
    "terminal": {
      "enabled": true,
      "theme": "modern-dark",
      "colors": {
        "primary": "#36c5f0",
        "secondary": "#2eb67d",
        "accent": "#e01e5a",
        "background": "#1a1d21",
        "text": "#f2f3f5"
      }
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

### Environment Variables (.env)

The system uses environment variables for sensitive configuration like API keys. Create a `.env` file in the root directory with the following variables:

```
# LLM API Keys
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Server Configuration
PORT=3000
NODE_ENV=development

# Output Configuration
SAVE_TO_FILE=true
OUTPUT_DIRECTORY=./output/conversations
DISPLAY_IN_CONSOLE=true

# Error Handling
ERROR_STRATEGY=retry
MAX_RETRIES=3
INITIAL_DELAY=1000
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
    // Use environment variables for API keys
    this.apiKey = process.env.MY_PROVIDER_API_KEY;
    if (!this.apiKey) {
      throw new Error('MY_PROVIDER_API_KEY environment variable is not set');
    }
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