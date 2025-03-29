const fs = require('fs');
const path = require('path');

// Directories to search for components
const directories = [
  path.join(__dirname, 'src/app'),
  path.join(__dirname, 'src/components')
];

// File extensions to process
const extensions = ['.tsx', '.jsx'];

// Function to check if a file needs the 'use client' directive
function needsUseClient(content) {
  // Check if file already has 'use client'
  if (content.trim().startsWith("'use client'") || content.trim().startsWith('"use client"')) {
    return false;
  }
  
  // Check for patterns that indicate client component usage
  const clientPatterns = [
    'useState', 'useEffect', 'useContext', 'useReducer', 'useCallback', 'useMemo', 'useRef',
    'onClick', 'onChange', 'onSubmit', 'addEventListener',
    'window.', 'document.', 'localStorage', 'sessionStorage',
    '<Button', '<Input', '<Textarea', '<Select', '<Checkbox', '<Switch', '<Card',
    '<Alert', '<Label', '<Form', '<Popover', '<DropdownMenu'
  ];
  
  return clientPatterns.some(pattern => content.includes(pattern));
}

// Function to add 'use client' directive to a file
function addUseClientDirective(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    if (needsUseClient(content)) {
      console.log(`Adding 'use client' to ${filePath}`);
      const updatedContent = "'use client'\n\n" + content;
      fs.writeFileSync(filePath, updatedContent, 'utf8');
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
}

// Function to recursively process directories
function processDirectory(directory) {
  const files = fs.readdirSync(directory, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(directory, file.name);
    
    if (file.isDirectory()) {
      processDirectory(fullPath);
    } else if (extensions.includes(path.extname(file.name))) {
      addUseClientDirective(fullPath);
    }
  }
}

// Process all directories
directories.forEach(processDirectory);

console.log('Finished adding use client directives');