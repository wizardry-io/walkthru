const getCommands = require("./get-commands");

const markdownShellScript = async input => {
  const commands = await getCommands(input);
  return `#! /bin/sh

${commands}`;
};

module.exports = markdownShellScript;
