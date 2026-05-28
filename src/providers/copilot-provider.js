const LLMProviderInterface = require('./provider-interface');

/**
 * GitHub Copilot SDK provider implementation.
 * Uses @github/copilot-sdk which spawns the Copilot CLI runtime via JSON-RPC.
 * Requires COPILOT_GITHUB_TOKEN, GH_TOKEN, or GITHUB_TOKEN environment variable.
 * Requires a GitHub Copilot subscription.
 */
class CopilotProvider extends LLMProviderInterface {
  constructor(config) {
    super(config);

    const token =
      process.env.COPILOT_GITHUB_TOKEN ||
      process.env.GH_TOKEN ||
      process.env.GITHUB_TOKEN;

    if (!token) {
      throw new Error(
        'No GitHub token found. Set COPILOT_GITHUB_TOKEN, GH_TOKEN, or GITHUB_TOKEN.'
      );
    }

    // Lazily required so the module can be loaded without crashing if the
    // package is not installed yet.
    const { CopilotClient } = require('@github/copilot-sdk');

    this._client = new CopilotClient({ gitHubToken: token, useLoggedInUser: false });
    this._clientStarted = false;

    // Ensure the CLI runtime is stopped on process exit.
    const stop = () => {
      if (this._clientStarted) {
        this._clientStarted = false;
        this._client.stop().catch(() => {});
      }
    };
    process.once('exit', stop);
    process.once('SIGINT', () => { stop(); process.exit(0); });
    process.once('SIGTERM', () => { stop(); process.exit(0); });
  }

  /**
   * Lazily start the Copilot CLI runtime on first use.
   */
  async _ensureStarted() {
    if (!this._clientStarted) {
      await this._client.start();
      this._clientStarted = true;
    }
  }

  /**
   * Generate a response using the Copilot SDK.
   * A new session is created for every call so that the system prompt (character
   * definition) is applied cleanly on each conversation turn.
   *
   * @param {string} prompt - The user message for this turn.
   * @param {Object} parameters - Provider parameters (reasoningEffort).
   * @param {string} systemPrompt - The character system prompt.
   * @returns {Promise<string>} The assistant response text.
   */
  async generateResponse(prompt, parameters = {}, systemPrompt = '') {
    await this._ensureStarted();

    const sessionConfig = {
      model: this.model,
      // Disable tool execution — not needed for a conversation system.
      onPermissionRequest: () => ({ kind: 'reject' }),
    };

    if (systemPrompt) {
      sessionConfig.systemMessage = {
        mode: 'replace',
        content: systemPrompt,
      };
    }

    if (parameters.reasoningEffort) {
      sessionConfig.reasoningEffort = parameters.reasoningEffort;
    }

    let session;
    try {
      session = await this._client.createSession(sessionConfig);

      const response = await session.sendAndWait({ prompt });

      if (!response || !response.data || !response.data.content) {
        throw new Error('Copilot SDK returned an empty response');
      }

      return response.data.content.trim();
    } catch (error) {
      throw new Error(`Copilot SDK error: ${error.message}`);
    } finally {
      if (session) {
        await session.disconnect().catch(() => {});
      }
    }
  }

  /**
   * Get provider-specific parameters from a character definition.
   * Note: temperature and maxTokens are not exposed by the Copilot SDK —
   * only reasoningEffort is supported for models that accept it.
   *
   * @param {Object} characterDefinition - The character definition object.
   * @returns {Object} Provider-specific parameters.
   */
  getProviderParameters(characterDefinition) {
    const params = {};
    if (characterDefinition.parameters?.reasoningEffort) {
      params.reasoningEffort = characterDefinition.parameters.reasoningEffort;
    }
    return params;
  }
}

module.exports = CopilotProvider;
