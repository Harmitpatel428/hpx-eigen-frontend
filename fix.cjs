const fs = require('fs');
const glob = require('fs').readdirSync('src/pages/crm').filter(f => f.endsWith('.tsx'));
glob.forEach(f => {
  const path = 'src/pages/crm/' + f;
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(/from '\.\.\/hooks/g, "from '../../hooks");
  content = content.replace(/from '\.\.\/components/g, "from '../../components");
  content = content.replace(/from '\.\.\/types/g, "from '../../types");
  content = content.replace(/from '\.\.\/utils/g, "from '../../utils");
  fs.writeFileSync(path, content);
});
console.log('Fixed import paths');
