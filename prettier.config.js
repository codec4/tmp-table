module.exports = {
  $schema: 'https://json.schemastore.org/prettierrc',
  htmlWhitespaceSensitivity: 'ignore',
  printWidth: 120,
  tabWidth: 2,
  proseWrap: 'always',
  useTabs: false,
  semi: true,
  singleQuote: true,
  trailingComma: 'none',
  bracketSpacing: true,
  arrowParens: 'avoid',
  overrides: [
    { files: ['*.js', '*.mjs'], options: { parser: 'babel' } },
    { files: ['*.ts', '*.mts'], options: { parser: 'typescript' } },
    { files: ['*.json', '.stylelintrc'], options: { parser: 'json' } },
    { files: ['package.json', 'ng-package.json'], options: { parser: 'json-stringify' } },
    { files: ['*.css'], options: { parser: 'css' } },
    { files: ['*.html'], options: { parser: 'html' } },
    { files: ['*.component.html', '*.template.html'], options: { parser: 'angular' } },
    { files: ['*.md'], options: { parser: 'markdown', tabWidth: 2 } }
  ]
};
