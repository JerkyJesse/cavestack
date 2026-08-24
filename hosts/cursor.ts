import { defineHost } from './define-host';

const cursor = defineHost({
  name: 'cursor',
  displayName: 'Cursor',
  frontmatter: {
    mode: 'allowlist',
    keepFields: ['name', 'description'],
    descriptionLimit: 1024,
    descriptionLimitBehavior: 'truncate',
  },
  install: {
    linkingStrategy: 'symlink-generated',
    prefixable: true,
  },
});

export default cursor;
