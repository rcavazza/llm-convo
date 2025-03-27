const fs = require('fs-extra');
const path = require('path');

/**
 * Manages conversation templates
 */
class TemplateManager {
  /**
   * Create a new template manager
   * @param {string} templatesDir - Path to the templates directory
   */
  constructor(templatesDir) {
    this.templatesDir = templatesDir;
    this.templates = {};
  }

  /**
   * Load a template from a file
   * @param {string} templateId - The ID of the template to load
   * @returns {Promise<Object>} The loaded template
   * @throws {Error} If the template file cannot be loaded or is invalid
   */
  async loadTemplate(templateId) {
    const templatePath = path.join(this.templatesDir, `${templateId}.json`);
    
    try {
      const templateData = await fs.readFile(templatePath, 'utf8');
      const template = JSON.parse(templateData);
      this.templates[templateId] = template;
      return template;
    } catch (error) {
      throw new Error(`Failed to load template ${templateId}: ${error.message}`);
    }
  }

  /**
   * Apply a template to a topic
   * @param {Object} template - The template to apply
   * @param {string} topic - The topic to apply the template to
   * @returns {Object} The applied template
   */
  applyTemplate(template, topic) {
    const appliedTemplate = JSON.parse(JSON.stringify(template)); // Deep clone
    
    // Replace {topic} placeholders in the template
    if (appliedTemplate.structure) {
      appliedTemplate.structure = appliedTemplate.structure.map(step => {
        return {
          ...step,
          instructions: step.instructions.replace(/\{topic\}/g, topic)
        };
      });
    }
    
    if (appliedTemplate.initialPrompts) {
      for (const role in appliedTemplate.initialPrompts) {
        appliedTemplate.initialPrompts[role] = appliedTemplate.initialPrompts[role].replace(/\{topic\}/g, topic);
      }
    }
    
    return appliedTemplate;
  }

  /**
   * Save a template to a file
   * @param {Object} template - The template to save
   * @param {string} templateId - The ID of the template
   * @returns {Promise<string>} The path the template was saved to
   * @throws {Error} If the template cannot be saved
   */
  async saveTemplate(template, templateId) {
    const templatePath = path.join(this.templatesDir, `${templateId}.json`);
    
    try {
      await fs.writeFile(templatePath, JSON.stringify(template, null, 2), 'utf8');
      this.templates[templateId] = template;
      return templatePath;
    } catch (error) {
      throw new Error(`Failed to save template ${templateId}: ${error.message}`);
    }
  }

  /**
   * List all available templates
   * @returns {Promise<Array<Object>>} The list of available templates
   */
  async listTemplates() {
    try {
      const files = await fs.readdir(this.templatesDir);
      const templateFiles = files.filter(file => file.endsWith('.json'));
      
      const templates = [];
      for (const file of templateFiles) {
        const templateId = path.basename(file, '.json');
        const template = await this.loadTemplate(templateId);
        templates.push({
          id: templateId,
          name: template.name,
          description: template.description
        });
      }
      
      return templates;
    } catch (error) {
      throw new Error(`Failed to list templates: ${error.message}`);
    }
  }

  /**
   * Get a template by ID
   * @param {string} templateId - The ID of the template
   * @returns {Object} The template
   * @throws {Error} If the template is not loaded
   */
  getTemplate(templateId) {
    if (!this.templates[templateId]) {
      throw new Error(`Template ${templateId} not loaded`);
    }
    
    return this.templates[templateId];
  }
}

module.exports = TemplateManager;