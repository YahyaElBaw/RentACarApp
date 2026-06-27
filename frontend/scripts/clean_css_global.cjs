const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

let modifiedFiles = 0;

walkDir('d:/Projects/RentCarApp/frontend/src', function(filePath) {
  if (filePath.endsWith('.vue')) {
    let original = fs.readFileSync(filePath, 'utf8');
    let content = original;
    
    // Check if there are dark mode classes
    if (/dark:[a-zA-Z0-9\-\/]+/g.test(content)) {
      // Strip all dark mode classes
      content = content.replace(/dark:[a-zA-Z0-9\-\/]+/g, '');

      // Clean up any double spaces inside class definitions left by regex
      content = content.replace(/class="([^"]*)"/g, (match, p1) => {
        return `class="${p1.replace(/\s+/g, ' ').trim()}"`;
      });
      
      // Clean up any double spaces inside dynamic class bindings
      content = content.replace(/:class="([^"]*)"/g, (match, p1) => {
        // Only strip duplicate spaces carefully in dynamic strings (we assume standard arrays/strings inside)
        // A safer generic cleanup just replacing multiple spaces inside the whole text node might be risky for strings, 
        // but for class structures it's generally fine. Let's stick to a basic space trimmer.
        return `:class="${p1.replace(/ {2,}/g, ' ')}"`;
      });

      fs.writeFileSync(filePath, content);
      console.log('Cleaned:', filePath);
      modifiedFiles++;
    }
  }
});

console.log('Total files cleaned:', modifiedFiles);
