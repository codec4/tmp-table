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
  importOrder: [
    '@angular/',
    '@ngxs/',
    'rxjs',
    '@ngneat/',
    '<THIRD_PARTY_MODULES>',
    '@lead-platform/',
    '^./(.*)',
    '^../(.*)',
    '^../../(.*)',
    '^../../../(.*)',
    '^../../../../(.*)'
  ],
  importOrderSeparation: false,
  importOrderSortSpecifiers: true,
  importOrderGroupNamespaceSpecifiers: false,
  importOrderParserPlugins: ['typescript', 'decorators-legacy'],
  plugins: [
    // https://github.com/prettier/prettier-vscode/issues/2259#issuecomment-952950119
    require.resolve('prettier-plugin-organize-attributes'),
    '@trivago/prettier-plugin-sort-imports'
  ],
  attributeGroups: [
    // prettier-plugin-organize-attribute
    '$CLASS',
    '$ID',
    '$ANGULAR_STRUCTURAL_DIRECTIVE',
    '$ANGULAR_ELEMENT_REF',
    '$ANGULAR_INPUT',
    '$ANGULAR_TWO_WAY_BINDING',
    '$ANGULAR_OUTPUT',
    '$DEFAULT'
  ],
  overrides: [
    {
      files: ['*.js'],
      options: { parser: 'babel' }
    },
    {
      files: ['*.ts'],
      options: { parser: 'typescript' }
    },
    {
      files: ['*.json', '.prettierrc', '.stylelintrc'],
      options: { parser: 'json' }
    },
    {
      files: ['package.json', 'ng-package.json'],
      options: {
        parser: 'json-stringify'
      }
    },
    {
      files: ['*.less'],
      options: { parser: 'less' }
    },
    {
      files: ['*.scss'],
      options: { parser: 'scss' }
    },
    {
      files: ['*.svg'],
      options: { parser: 'html' }
    },
    {
      files: ['*.html'],
      options: { parser: 'html' }
    },
    {
      files: ['*.component.html', '*.template.html'],
      options: { parser: 'angular' }
    },
    {
      files: ['*.yml', '*.yaml'],
      options: { parser: 'yaml', tabWidth: 2 }
    },
    {
      files: ['*.md'],
      options: { parser: 'markdown', tabWidth: 2 }
    }
  ]
};
