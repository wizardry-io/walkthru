const fs = require("fs");
const promisify = require("pify");
const commandLineArgs = require("command-line-args");
const markdownShellScript = require("markdown-shell-script");

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

const optionDefinitions = [
  { name: "src", type: String, multiple: true, defaultOption: true }
];
const options = commandLineArgs(optionDefinitions);

const markdownFilename = options.src[0];
const shellScriptFilename = options.src[1];

module.exports = async () => {
  try {
    const markdown = await readFile(markdownFilename, "utf8");
    const shellScript = await markdownShellScript(markdown);
    await writeFile(shellScriptFilename, shellScript);
    console.log(`Success! Created ${shellScriptFilename}`);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};
