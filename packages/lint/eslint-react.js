const baseConfig = require('./eslint');

const reactRules = {
  'react/jsx-boolean-value': ['error', 'never'],
  'react/jsx-no-duplicate-props': 'error',
  'react/jsx-no-target-blank': 'error',
  'react/jsx-no-undef': 'error',
  'react/jsx-uses-react': 'error',
  'react/jsx-uses-vars': 'error',
  'react/jsx-wrap-multilines': 'error',
  'react/no-deprecated': 'error',
  'react/no-did-mount-set-state': 'error',
  'react/no-did-update-set-state': 'error',
  'react/no-string-refs': 'error',
  'react/no-unknown-property': 'error',
  'react/self-closing-comp': 'off',
  'react/sort-prop-types': 'error',
};

const option = { ...baseConfig };

option.plugins = ['@typescript-eslint', 'import', 'react', 'prettier'];

option.settings.react = {
  version: 'detect',
};

option.rules = {
  ...option.rules,
  ...reactRules,
};

module.exports = option;
