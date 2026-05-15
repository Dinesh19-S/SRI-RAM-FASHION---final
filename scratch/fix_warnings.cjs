const fs = require('fs');
const path = require('path');

const srcDir = path.join(process.cwd(), 'frontend-new', 'src');
const componentsDir = path.join(srcDir, 'components');
const pagesDir = path.join(srcDir, 'pages');

const walkSync = function(dir, filelist) {
  const files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      filelist = walkSync(path.join(dir, file), filelist);
    }
    else {
      filelist.push(path.join(dir, file));
    }
  });
  return filelist;
};

const allFiles = [...walkSync(pagesDir), ...walkSync(componentsDir)].filter(f => f.endsWith('.jsx'));

allFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    // Fix IDE warnings
    if (content.includes('z-[9999]')) { content = content.replace(/z-\[9999\]/g, 'z-9999'); changed = true; }
    if (content.includes('w-[1px]')) { content = content.replace(/w-\[1px\]/g, 'w-px'); changed = true; }
    if (content.includes('rounded-[1.5rem]')) { content = content.replace(/rounded-\[1\.5rem\]/g, 'rounded-3xl'); changed = true; }
    if (content.includes('rounded-l-[1.5rem]')) { content = content.replace(/rounded-l-\[1\.5rem\]/g, 'rounded-l-3xl'); changed = true; }
    if (content.includes('rounded-r-[1.5rem]')) { content = content.replace(/rounded-r-\[1\.5rem\]/g, 'rounded-r-3xl'); changed = true; }
    if (content.includes('rounded-[2rem]')) { content = content.replace(/rounded-\[2rem\]/g, 'rounded-4xl'); changed = true; }
    if (content.includes('rounded-l-[2rem]')) { content = content.replace(/rounded-l-\[2rem\]/g, 'rounded-l-4xl'); changed = true; }
    if (content.includes('rounded-r-[2rem]')) { content = content.replace(/rounded-r-\[2rem\]/g, 'rounded-r-4xl'); changed = true; }

    if (changed) {
        fs.writeFileSync(file, content);
        console.log('Fixed warnings in', path.basename(file));
    }
});
