const remark = require("remark");
const filter = require("unist-util-filter");

const blankFirst = (match, offset) => {
  if (offset === 0) {
    return "";
  }
  return match;
};

const blankLast = (match, offset, string) => {
  if (offset === string.length - 1) {
    return "";
  }
  return match;
};

const processDiff = value => {
  let [_, ...filename] = value
    .slice()
    .split("\n")[0]
    .split(" ");
  filename = filename.join(" ");
  return `patch ${filename} << 'EOF'
${value}
EOF`;
};

const processCode = (file, extension, value) => {
  file = file.join(" ");
  if (extension && extension.charAt(0) === "{") {
    // There is no extension if the first part has "{"
    file = extension;
  }
  if (!file) {
    return null;
  }
  // Remove first "{" and last "}"
  file = file.replace(/{/, blankFirst).replace(/}/, blankLast);
  return `cat > ${file.trim()} << 'EOF'
${value}
EOF`;
};

const codeToCommand = ({ value, type, lang }) => {
  let [extension, ...file] = lang ? lang.split(" ") : [];
  if (extension === "bash") {
    return value;
  }
  if (extension === "diff") {
    return processDiff(value);
  }
  return processCode(file, extension, value);
};

const remarkGetCommands = callback => () => {
  const transformer = (tree, file) => {
    const codeBlocks = filter(tree, node => {
      return node.type === "root" || node.type === "code";
    });
    callback(
      codeBlocks.children
        .map(codeToCommand)
        .filter(code => code !== null)
        .join("\n\n")
    );
  };
  return transformer;
};

module.exports = async input => {
  await remark()
    .use(
      remarkGetCommands(parsedCommands => {
        commands = parsedCommands;
      })
    )
    .process(input);
  return commands;
};
