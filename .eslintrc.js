const baseConfig = require('./packages/lint/eslint-react');

module.exports = {
  ...baseConfig,
  rules: {
    ...baseConfig.rules,
    'import/no-extraneous-dependencies': 'off',
  },
};
