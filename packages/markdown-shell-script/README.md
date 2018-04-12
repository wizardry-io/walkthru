# markdown-shell-script

Transforms shell commands and code snippets from a markdown file into a shell script

## Installation

`yarn add markdown-shell-script` or `npm install markdown-shell-script`

## Usage

```js
const markdownShellScript = require("markdown-shell-script");

markdownShellScript(`
# Markdown example

\`\`\`bash
# Go to root folder
cd ~
# Create hello-world directory
mkdir hello-world
\`\`\`

\`\`\`js {hello-world/greeting.js}
console.log("Hello world")
\`\`\`

\`\`\`bash
node hello-world/greeting.js
\`\`\`
`).then(console.log)

/*
#! /bin/sh

# Go to root folder
cd ~
# Create hello-world directory
mkdir hello-world

cat > hello-world/greeting.js << 'EOF'
console.log("Hello world")
EOF

node hello-world/greeting.js
*/
```