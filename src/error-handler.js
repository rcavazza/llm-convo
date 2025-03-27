/**
 * Handles errors that occur during API calls
 */
class ErrorHandler {
  /**
   * Create a new error handler
   * @param {Object} config - The error handling configuration
   */
  constructor(config) {
    this.config = config;
    this.strategy = config.strategy || 'retry';
    this.maxRetries = config.maxRetries || 3;
    this.initialDelay = config.initialDelay || 1000;
    this.fallbackProvider = config.fallbackProvider;
  }

  /**
   * Handle an error
   * @param {Error} error - The error that occurred
   * @param {Object} context - The context in which the error occurred
   * @returns {Promise<*>} The result of the error handling strategy
   */
  async handleError(error, context) {
    this.logError(error, context);
    
    switch (this.strategy) {
      case 'retry':
        return this.retryWithBackoff(context.operation, this.maxRetries, this.initialDelay);
      
      case 'fallback':
        return this.switchProvider(context.currentProvider, context);
      
      case 'abort':
        throw error;
      
      case 'continue':
        console.warn('Continuing despite error');
        return null;
      
      default:
        throw error;
    }
  }

  /**
   * Retry an operation with exponential backoff
   * @param {Function} operation - The operation to retry
   * @param {number} maxRetries - The maximum number of retries
   * @param {number} initialDelay - The initial delay in milliseconds
   * @returns {Promise<*>} The result of the operation
   */
  async retryWithBackoff(operation, maxRetries, initialDelay) {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Wait for the backoff delay
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(`Retrying after ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Try the operation again
        return await operation();
      } catch (error) {
        console.error(`Retry attempt ${attempt + 1} failed:`, error.message);
        lastError = error;
      }
    }
    
    throw new Error(`All ${maxRetries} retry attempts failed. Last error: ${lastError.message}`);
  }

  /**
   * Switch to a fallback provider
   * @param {Object} currentProvider - The current provider
   * @param {Object} context - The context in which the error occurred
   * @returns {Promise<*>} The result of the fallback operation
   */
  async switchProvider(currentProvider, context) {
    if (!this.fallbackProvider) {
      throw new Error('No fallback provider configured');
    }
    
    if (!context.providerFactory) {
      throw new Error('Provider factory not provided in context');
    }
    
    if (!context.providerConfig) {
      throw new Error('Provider configuration not provided in context');
    }
    
    console.log(`Switching from ${currentProvider.getProviderName()} to fallback provider ${this.fallbackProvider}`);
    
    // Create a new configuration with the fallback provider
    const fallbackConfig = {
      ...context.providerConfig,
      provider: this.fallbackProvider
    };
    
    // Create the fallback provider
    const fallbackProvider = context.providerFactory.createProvider(fallbackConfig);
    
    // Try the operation with the fallback provider
    return await context.operation(fallbackProvider);
  }

  /**
   * Log an error
   * @param {Error} error - The error to log
   * @param {Object} context - The context in which the error occurred
   */
  logError(error, context) {
    console.error('Error occurred:', {
      message: error.message,
      stack: error.stack,
      context: {
        provider: context.currentProvider?.getProviderName(),
        model: context.currentProvider?.getModelName(),
        operation: context.operationName
      }
    });
  }
}

module.exports = ErrorHandler;